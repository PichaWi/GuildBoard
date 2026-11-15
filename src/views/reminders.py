from datetime import datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from src.controllers.access import Action, require_permission
from src.controllers.at_risk import utcnow
from src.controllers.auth import AuthenticatedUser
from src.controllers.mailer import EMAIL_SENT, Mailer, get_mailer, send_reminder_email
from src.controllers.reminders import (
    ReminderError,
    create_reminder,
    list_reminders,
    remind_all_at_risk,
    reminder_to_dict,
)
from src.database import get_db
from src.models.ticket import Ticket
from src.views.tickets import read_json_payload

router = APIRouter(prefix="/api", tags=["reminders"])

STAFF_RESPONSES = {401: {"description": "Not signed in"},
                   403: {"description": "Signed in as a Student"}}


@router.post(
    "/tickets/{ticket_id}/reminders",
    status_code=status.HTTP_201_CREATED,
    summary="Save a reminder or TA flag on a ticket (Lecturer, TA or Admin only)",
    responses={**STAFF_RESPONSES,
               404: {"description": "No ticket with this id"}},
)
def post_reminder(
    ticket_id: int,
    user: Annotated[AuthenticatedUser, Depends(require_permission(Action.UPDATE_TICKET))],
    raw_payload: Annotated[Any, Depends(read_json_payload)],
    db: Annotated[Session, Depends(get_db)],
    mailer: Annotated[Mailer | None, Depends(get_mailer)],
    now: Annotated[datetime, Depends(utcnow)],
):
    kind = raw_payload.get("kind", "reminder") if isinstance(
        raw_payload, dict) else None
    try:
        reminder = create_reminder(db, ticket_id, kind, user)
    except ReminderError as error:
        return JSONResponse(status_code=error.status_code, content={"detail": error.detail})
    # The reminder is saved first, so a failed email never loses it.
    email = send_reminder_email(mailer, db.get(
        Ticket, ticket_id), kind, user.name, now)
    return {**reminder_to_dict(reminder), "email": email}


@router.get(
    "/tickets/{ticket_id}/reminders",
    summary="Reminders sent about a ticket, newest first (Lecturer, TA or Admin only)",
    responses=STAFF_RESPONSES,
)
def read_reminders(
    ticket_id: int,
    user: Annotated[AuthenticatedUser, Depends(require_permission(Action.VIEW_TICKETS))],
    db: Annotated[Session, Depends(get_db)],
):
    return [reminder_to_dict(reminder) for reminder in list_reminders(db, ticket_id)]


@router.post(
    "/at-risk/remind",
    summary="Batch Ping: save a reminder for every at-risk ticket (Lecturer, TA or Admin only)",
    responses=STAFF_RESPONSES,
)
def post_remind_all(
    user: Annotated[AuthenticatedUser, Depends(require_permission(Action.UPDATE_TICKET))],
    db: Annotated[Session, Depends(get_db)],
    mailer: Annotated[Mailer | None, Depends(get_mailer)],
    now: Annotated[datetime, Depends(utcnow)],
):
    tickets = remind_all_at_risk(db, now, user)
    results = [send_reminder_email(
        mailer, ticket, "reminder", user.name, now) for ticket in tickets]
    return {"count": len(tickets), "emailed": results.count(EMAIL_SENT)}
