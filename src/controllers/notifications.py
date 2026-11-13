from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.controllers.access import Action, can
from src.controllers.at_risk import RISK_NEARING, RISK_OVERDUE, list_at_risk
from src.controllers.auth import AuthenticatedUser
from src.controllers.consultations import COURSE_TIMEZONE
from src.models.event import Event
from src.models.ticket import Ticket, as_utc

UPCOMING_EVENT_DAYS = 7

KIND_EVENT = "event"


def _ticket_item(ticket: Ticket, now: datetime) -> dict:
    due_at = as_utc(ticket.due_at)
    kind = RISK_OVERDUE if due_at <= now else RISK_NEARING
    return {
        # The kind is part of the id, so a ticket that becomes overdue counts as new.
        "id": f"ticket-{ticket.id}-{kind}",
        "kind": kind,
        "title": ticket.title,
        "detail": f"Owner: {ticket.owner}",
        "at": due_at.isoformat(),
        "link": f"/tasks/{ticket.id}",
    }


def _event_item(event: Event) -> dict:
    starts_at = datetime.combine(event.event_date, event.start_time, COURSE_TIMEZONE)
    return {
        "id": f"event-{event.id}",
        "kind": KIND_EVENT,
        "title": event.title,
        "detail": f"{event.course_code} · {event.event_type}",
        "at": starts_at.isoformat(),
        "link": "/calendar",
    }


def upcoming_events(db: Session, now: datetime) -> list[Event]:
    today = now.astimezone(COURSE_TIMEZONE).date()
    query = (
        select(Event)
        .where(
            Event.publish_immediately.is_(True),
            Event.event_date >= today,
            Event.event_date <= today + timedelta(days=UPCOMING_EVENT_DAYS),
        )
        .order_by(Event.event_date, Event.start_time, Event.id)
    )
    return list(db.scalars(query))


def list_notifications(db: Session, user: AuthenticatedUser, now: datetime) -> list[dict]:
    now = as_utc(now)
    items = []
    if can(user, Action.VIEW_AT_RISK):
        items += [_ticket_item(ticket, now) for ticket in list_at_risk(db, now)]
    items += [_event_item(event) for event in upcoming_events(db, now)]
    return items
