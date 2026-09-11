from typing import Any

from fastapi import HTTPException, status
from pydantic import ValidationError
from sqlalchemy.orm import Session

from src.controllers.auth import AuthenticatedUser, UserRole
from src.models.event import Event, EventCreate


EVENT_CREATOR_ROLES = {UserRole.LECTURER, UserRole.TA, UserRole.ADMIN}

ERROR_REQUIRED_FIELDS_MISSING = "REQUIRED_FIELDS_MISSING"
ERROR_INVALID_FIELD_FORMAT = "INVALID_FIELD_FORMAT"

FIELD_LABELS = {
    "title": "Event Title",
    "course_code": "Course Code",
    "event_type": "Event Classification",
    "event_date": "Event Date",
    "start_time": "Commencement",
    "end_time": "Conclusion / Deadline",
}


class EventValidationError(Exception):
    def __init__(self, error: str, detail: str, status_code: int, **extra: Any) -> None:
        super().__init__(detail)
        self.error = error
        self.detail = detail
        self.status_code = status_code
        self.extra = extra

    def to_response(self) -> dict[str, Any]:
        return {"detail": self.detail, "error": self.error, **self.extra}


def ensure_can_create_events(user: AuthenticatedUser) -> None:
    if user.role not in EVENT_CREATOR_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Students are not permitted to create events.",
        )


def required_fields() -> list[str]:
    return [name for name, field in EventCreate.model_fields.items() if field.is_required()]


def _is_blank(value: Any) -> bool:
    return value is None or (isinstance(value, str) and not value.strip())


def _describe(error: dict[str, Any]) -> str:
    field = ".".join(str(part) for part in error["loc"])
    message = error["msg"].removeprefix("Value error, ")
    return f"{FIELD_LABELS.get(field, field)}: {message}" if field else message


def validate_event_payload(raw: Any) -> EventCreate:
    data = raw if isinstance(raw, dict) else {}
    cleaned = {key: value.strip() if isinstance(value, str) else value for key, value in data.items()}

    missing = [name for name in required_fields() if _is_blank(cleaned.get(name))]
    if missing:
        labels = ", ".join(FIELD_LABELS.get(name, name) for name in missing)
        raise EventValidationError(
            ERROR_REQUIRED_FIELDS_MISSING,
            f"Missing required field(s): {labels}.",
            status.HTTP_400_BAD_REQUEST,
            missing_fields=missing,
        )

    try:
        return EventCreate.model_validate(cleaned)
    except ValidationError as exc:
        problems = "; ".join(_describe(error) for error in exc.errors())
        raise EventValidationError(
            ERROR_INVALID_FIELD_FORMAT,
            f"Invalid event field(s): {problems}.",
            422,
        ) from None


def create_event(db: Session, payload: EventCreate, user: AuthenticatedUser) -> Event:
    ensure_can_create_events(user)

    event = Event(**payload.model_dump(), created_by_role=user.role.value)
    db.add(event)
    db.commit()
    db.refresh(event)
    return event
