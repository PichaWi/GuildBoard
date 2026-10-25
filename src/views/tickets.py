"""Ticket endpoints for the Operations Dashboard (US-3). Staff only."""
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from src.controllers.access import Action, require_permission
from src.controllers.auth import AuthenticatedUser
from src.controllers.tickets import (
    TicketValidationError,
    create_ticket,
    list_tickets,
    update_ticket,
    validate_ticket_create,
    validate_ticket_update,
)
from src.database import get_db
from src.models.ticket import TicketCreate, TicketRead, TicketUpdate

router = APIRouter(prefix="/api", tags=["tickets"])


async def read_json_payload(request: Request) -> Any:
    # Read only after the permission dependency, so a Student gets 403 even for a bad body.
    try:
        return await request.json()
    except ValueError:
        return {}


def _invalid(error: TicketValidationError) -> JSONResponse:
    return JSONResponse(status_code=error.status_code, content=error.to_response())


@router.get(
    "/tickets",
    response_model=list[TicketRead],
    summary="List tickets, soonest due first (Lecturer, TA or Admin only)",
)
def read_tickets(
    user: Annotated[AuthenticatedUser, Depends(require_permission(Action.VIEW_TICKETS))],
    db: Annotated[Session, Depends(get_db)],
    status_filter: Annotated[
        str | None,
        Query(alias="status", pattern="^(Open|In-Progress|Closed)$", description="Only tickets with this status"),
    ] = None,
):
    return list_tickets(db, status_filter=status_filter)


@router.post(
    "/tickets",
    response_model=TicketRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a ticket (Lecturer, TA or Admin only)",
    responses={
        400: {"description": "REQUIRED_FIELDS_MISSING: a required field is absent or blank"},
        401: {"description": "Not signed in"},
        403: {"description": "Signed in as a Student"},
        422: {"description": "INVALID_FIELD_FORMAT: a value could not be parsed"},
    },
    openapi_extra={
        "requestBody": {
            "required": True,
            "content": {"application/json": {"schema": TicketCreate.model_json_schema()}},
        }
    },
)
def post_ticket(
    user: Annotated[AuthenticatedUser, Depends(require_permission(Action.CREATE_TICKET))],
    raw_payload: Annotated[Any, Depends(read_json_payload)],
    db: Annotated[Session, Depends(get_db)],
):
    try:
        payload = validate_ticket_create(raw_payload)
    except TicketValidationError as error:
        return _invalid(error)
    return create_ticket(db, payload, user)


@router.patch(
    "/tickets/{ticket_id}",
    response_model=TicketRead,
    summary="Update a ticket's fields, e.g. its status (Lecturer, TA or Admin only)",
    responses={
        401: {"description": "Not signed in"},
        403: {"description": "Signed in as a Student"},
        404: {"description": "No ticket with this id"},
        422: {"description": "INVALID_FIELD_FORMAT: a value could not be parsed"},
    },
    openapi_extra={
        "requestBody": {
            "required": True,
            "content": {"application/json": {"schema": TicketUpdate.model_json_schema()}},
        }
    },
)
def patch_ticket(
    ticket_id: int,
    user: Annotated[AuthenticatedUser, Depends(require_permission(Action.UPDATE_TICKET))],
    raw_payload: Annotated[Any, Depends(read_json_payload)],
    db: Annotated[Session, Depends(get_db)],
):
    try:
        payload = validate_ticket_update(raw_payload)
        ticket = update_ticket(db, ticket_id, payload, user)
    except TicketValidationError as error:
        return _invalid(error)
    if ticket is None:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"detail": f"Ticket {ticket_id} was not found."},
        )
    return ticket
