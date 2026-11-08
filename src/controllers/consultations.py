from datetime import date, datetime, time, timedelta, timezone
from typing import Any

from fastapi import status
from pydantic import ValidationError
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from src.controllers.access import Action, ensure_permission
from src.controllers.auth import AuthenticatedUser
from src.models.consultation import ConsultationCreate, ConsultationSession

ERROR_REQUIRED_FIELDS_MISSING = "REQUIRED_FIELDS_MISSING"
ERROR_INVALID_FIELD_FORMAT = "INVALID_FIELD_FORMAT"

COURSE_TIMEZONE = timezone(timedelta(hours=7)) #Thailand time zone

class ConsultationValidationError(Exception):
    def __init__(self, error: str, detail: str, status_code: int, **extra: Any) -> None:
        super().__init__(detail)
        self.error = error
        self.detail = detail
        self.status_code = status_code
        self.extra = extra

    def to_response(self) -> dict[str, Any]:
        return {"detail": self.detail, "error": self.error, **self.extra}


def _is_blank(value: Any) -> bool:
    return value is None or (isinstance(value, str) and not value.strip())


def validate_consultation(raw: Any) -> ConsultationCreate:
    data = raw if isinstance(raw, dict) else {}
    cleaned = {key: value.strip() if isinstance(value, str) else value for key, value in data.items()}

    required = [name for name, field in ConsultationCreate.model_fields.items() if field.is_required()]
    missing = [name for name in required if _is_blank(cleaned.get(name))]
    if missing:
        raise ConsultationValidationError(
            ERROR_REQUIRED_FIELDS_MISSING,
            f"Missing required field(s): {', '.join(missing)}.",
            status.HTTP_400_BAD_REQUEST,
            missing_fields=missing,
        )

    try:
        return ConsultationCreate.model_validate(cleaned)
    except ValidationError as exc:
        problems = "; ".join(
            f"{'.'.join(str(part) for part in error['loc'])}: {error['msg']}" for error in exc.errors()
        )
        raise ConsultationValidationError(
            ERROR_INVALID_FIELD_FORMAT,
            f"Invalid consultation field(s): {problems}.",
            status.HTTP_422_UNPROCESSABLE_ENTITY,
        ) from None


def record_consultation(
    db: Session, payload: ConsultationCreate, user: AuthenticatedUser
) -> ConsultationSession:
    ensure_permission(user, Action.RECORD_CONSULTATION)

    session = ConsultationSession(**payload.model_dump(), recorded_by=user.id)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def _day_in_utc(day: date) -> tuple[datetime, datetime]:
    start = datetime.combine(day, time.min, COURSE_TIMEZONE)
    return start.astimezone(timezone.utc), (start + timedelta(days=1)).astimezone(timezone.utc)


def search_consultations(
    db: Session,
    *,
    keyword: str | None = None,
    student: str | None = None,
    on_date: date | None = None,
) -> list[ConsultationSession]:
    query = select(ConsultationSession)
    if keyword and keyword.strip():
        term = keyword.strip()
        query = query.where(
            or_(
                ConsultationSession.topic.icontains(term, autoescape=True),
                ConsultationSession.notes.icontains(term, autoescape=True),
                ConsultationSession.course_code.icontains(term, autoescape=True),
            )
        )
    if student and student.strip():
        term = student.strip()
        query = query.where(
            or_(
                ConsultationSession.student_name.icontains(term, autoescape=True),
                ConsultationSession.student_id.icontains(term, autoescape=True),
            )
        )
    if on_date:
        start, end = _day_in_utc(on_date)
        query = query.where(ConsultationSession.session_at >= start, ConsultationSession.session_at < end)
    return list(db.scalars(query.order_by(ConsultationSession.session_at.desc(), ConsultationSession.id.desc())))
