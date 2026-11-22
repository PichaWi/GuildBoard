"""Teaching-task tickets (US-3): staff log a task with an owner, priority and status."""
from typing import Any

from fastapi import status
from pydantic import BaseModel, ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.controllers.access import Action, ensure_permission
from src.controllers.auth import AuthenticatedUser, UserRole
from src.controllers.validation import (
    APIValidationError,
    _clean,
    _is_blank,
    validate_model,
)
from src.models.ticket import Ticket, TicketCreate, TicketUpdate

ERROR_REQUIRED_FIELDS_MISSING = "REQUIRED_FIELDS_MISSING"
ERROR_INVALID_FIELD_FORMAT = "INVALID_FIELD_FORMAT"

CLEARABLE_FIELDS = {"description", "owner_role"}


class TicketValidationError(APIValidationError):
    pass


def validate_ticket_create(raw: Any) -> TicketCreate:
    cleaned = _clean(raw)
    required = [name for name, field in TicketCreate.model_fields.items()
                if field.is_required()]
    missing = [name for name in required if _is_blank(cleaned.get(name))]
    if missing:
        raise TicketValidationError(
            ERROR_REQUIRED_FIELDS_MISSING,
            f"Missing required field(s): {', '.join(missing)}.",
            status.HTTP_400_BAD_REQUEST,
            missing_fields=missing,
        )
    return validate_model(TicketCreate, cleaned, ERROR_INVALID_FIELD_FORMAT, error_class=TicketValidationError)


def validate_ticket_update(raw: Any) -> TicketUpdate:
    return validate_model(TicketUpdate, _clean(raw), ERROR_INVALID_FIELD_FORMAT, error_class=TicketValidationError)


def list_tickets(db: Session, *, status_filter: str | None = None) -> list[Ticket]:
    query = select(Ticket)
    if status_filter:
        query = query.where(Ticket.status == status_filter)
    return list(db.scalars(query.order_by(Ticket.due_at, Ticket.id)))


def get_ticket(db: Session, ticket_id: int) -> Ticket | None:
    return db.get(Ticket, ticket_id)


def create_ticket(db: Session, payload: TicketCreate, user: AuthenticatedUser) -> Ticket:
    ensure_permission(user, Action.CREATE_TICKET)

    data = payload.model_dump()
    owner_provided = bool(data.get("owner"))
    if not owner_provided:
        data["owner"] = user.name
        data["owner_email"] = user.email

    ticket = Ticket(**data, created_by=user.id)
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
