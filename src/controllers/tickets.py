"""Teaching-task tickets (US-3): staff log a task with an owner, priority and status."""
from typing import Any

from fastapi import status
from pydantic import BaseModel, ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.controllers.access import Action, ensure_permission
from src.controllers.auth import AuthenticatedUser
from src.models.ticket import Ticket, TicketCreate, TicketUpdate

ERROR_REQUIRED_FIELDS_MISSING = "REQUIRED_FIELDS_MISSING"
ERROR_INVALID_FIELD_FORMAT = "INVALID_FIELD_FORMAT"

CLEARABLE_FIELDS = {"description", "owner_role"}


class TicketValidationError(Exception):
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


def _clean(raw: Any) -> dict[str, Any]:
    data = raw if isinstance(raw, dict) else {}
    return {key: value.strip() if isinstance(value, str) else value for key, value in data.items()}


def _validate(model: type[BaseModel], data: dict[str, Any]) -> Any:
    try:
        return model.model_validate(data)
    except ValidationError as exc:
        problems = "; ".join(
            f"{'.'.join(str(part) for part in error['loc'])}: {error['msg']}" for error in exc.errors()
        )
        raise TicketValidationError(
            ERROR_INVALID_FIELD_FORMAT,
            f"Invalid ticket field(s): {problems}.",
            status.HTTP_422_UNPROCESSABLE_ENTITY,
        ) from None


def validate_ticket_create(raw: Any) -> TicketCreate:
    cleaned = _clean(raw)
    required = [name for name, field in TicketCreate.model_fields.items() if field.is_required()]
    missing = [name for name in required if _is_blank(cleaned.get(name))]
    if missing:
        raise TicketValidationError(
            ERROR_REQUIRED_FIELDS_MISSING,
            f"Missing required field(s): {', '.join(missing)}.",
            status.HTTP_400_BAD_REQUEST,
            missing_fields=missing,
        )
    return _validate(TicketCreate, cleaned)


def validate_ticket_update(raw: Any) -> TicketUpdate:
    return _validate(TicketUpdate, _clean(raw))


def list_tickets(db: Session, *, status_filter: str | None = None) -> list[Ticket]:
    query = select(Ticket)
    if status_filter:
        query = query.where(Ticket.status == status_filter)
    return list(db.scalars(query.order_by(Ticket.due_at, Ticket.id)))


def create_ticket(db: Session, payload: TicketCreate, user: AuthenticatedUser) -> Ticket:
    ensure_permission(user, Action.CREATE_TICKET)

    ticket = Ticket(**payload.model_dump(), created_by=user.id)
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket


def update_ticket(
    db: Session, ticket_id: int, payload: TicketUpdate, user: AuthenticatedUser
) -> Ticket | None:
    ensure_permission(user, Action.UPDATE_TICKET)

    ticket = db.get(Ticket, ticket_id)
    if ticket is None:
        return None
    changes = payload.model_dump(exclude_unset=True)
    # Only the free-text extras can be cleared by sending null.
    for field, value in changes.items():
        if value is None and field not in CLEARABLE_FIELDS:
            raise TicketValidationError(
                ERROR_INVALID_FIELD_FORMAT,
                f"Invalid ticket field(s): {field}: cannot be null.",
                status.HTTP_422_UNPROCESSABLE_ENTITY,
            )
        setattr(ticket, field, "" if value is None else value)
    db.commit()
    db.refresh(ticket)
    return ticket
