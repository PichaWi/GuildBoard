"""Save follow-up reminders on tickets and read the latest one per ticket."""
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.controllers.at_risk import list_at_risk
from src.controllers.auth import AuthenticatedUser
from src.models.reminder import REMINDER_KINDS, TicketReminder
from src.models.ticket import Ticket


class ReminderError(ValueError):
    def __init__(self, status_code: int, detail: str) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


def create_reminder(db: Session, ticket_id: int, kind: str, user: AuthenticatedUser) -> TicketReminder:
    if kind not in REMINDER_KINDS:
        raise ReminderError(
            422, f"kind must be one of: {', '.join(REMINDER_KINDS)}.")
    if db.get(Ticket, ticket_id) is None:
        raise ReminderError(404, f"Ticket {ticket_id} was not found.")
    reminder = TicketReminder(
        ticket_id=ticket_id, kind=kind, sent_by=user.name)
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return reminder


def list_reminders(db: Session, ticket_id: int) -> list[TicketReminder]:
    query = (
        select(TicketReminder)
        .where(TicketReminder.ticket_id == ticket_id)
        .order_by(TicketReminder.created_at.desc(), TicketReminder.id.desc())
    )
    return list(db.scalars(query))


def latest_reminders(db: Session, ticket_ids: list[int]) -> dict[int, TicketReminder]:
    """The most recent reminder for each ticket id that has one."""
    if not ticket_ids:
        return {}
    query = (
        select(TicketReminder)
        .where(TicketReminder.ticket_id.in_(ticket_ids))
        .order_by(TicketReminder.created_at, TicketReminder.id)
    )
    latest: dict[int, TicketReminder] = {}
    for reminder in db.scalars(query):
        # later rows overwrite earlier ones
        latest[reminder.ticket_id] = reminder
    return latest


def remind_all_at_risk(db: Session, now: datetime, user: AuthenticatedUser) -> int:
    """Batch Ping: one reminder for every ticket that is at risk right now."""
    tickets = list_at_risk(db, now)
    for ticket in tickets:
        db.add(TicketReminder(ticket_id=ticket.id,
               kind="reminder", sent_by=user.name))
    db.commit()
    return len(tickets)


def reminder_to_dict(reminder: TicketReminder) -> dict:
    return {
        "id": reminder.id,
        "ticket_id": reminder.ticket_id,
        "kind": reminder.kind,
        "sent_by": reminder.sent_by,
        "at": reminder.created_at.isoformat(),
    }
