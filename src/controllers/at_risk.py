import math
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.models.ticket import Ticket, TicketRead, as_utc

AT_RISK_WINDOW = timedelta(hours=48)
CLOSED = "Closed"

RISK_OVERDUE = "overdue"
RISK_NEARING = "nearing"


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def is_at_risk(ticket: Ticket, now: datetime) -> bool:
    return ticket.status != CLOSED and as_utc(ticket.due_at) < as_utc(now) + AT_RISK_WINDOW


def list_at_risk(db: Session, now: datetime) -> list[Ticket]:
    now = as_utc(now)
    query = (
        select(Ticket)
        .where(Ticket.status != CLOSED, Ticket.due_at < now + AT_RISK_WINDOW)
        .order_by(Ticket.due_at, Ticket.id)
    )
    return list(db.scalars(query))


def to_at_risk_item(ticket: Ticket, now: datetime) -> dict:
    seconds_left = (as_utc(ticket.due_at) - as_utc(now)).total_seconds()
    return {
        **TicketRead.model_validate(ticket).model_dump(mode="json"),
        "risk_type": RISK_OVERDUE if seconds_left <= 0 else RISK_NEARING,
        "hours_until_due": math.floor(seconds_left / 3600),
    }


def at_risk_report(db: Session, now: datetime) -> dict:
    # Imported here to avoid a circular import (reminders uses list_at_risk).
    from src.controllers.reminders import latest_reminders, reminder_to_dict

    tickets = list_at_risk(db, now)
    latest = latest_reminders(db, [ticket.id for ticket in tickets])
    items = []
    for ticket in tickets:
        item = to_at_risk_item(ticket, now)
        reminder = latest.get(ticket.id)
        item["last_reminder"] = reminder_to_dict(
            reminder) if reminder else None
        items.append(item)
    return {
        "count": len(items),
        "overdue": sum(item["risk_type"] == RISK_OVERDUE for item in items),
        "nearing": sum(item["risk_type"] == RISK_NEARING for item in items),
        "items": items,
    }
