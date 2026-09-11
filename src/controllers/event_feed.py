from datetime import time

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.controllers.auth import AuthenticatedUser
from src.controllers.events import EVENT_CREATOR_ROLES
from src.models.event import Event

COURSE_COLOR_CLASSES = {
    "ISP": "bg-primary-container",
    "KE": "bg-secondary",
    "SCS": "bg-secondary-container",
    "FM": "bg-outline-variant",
}
DEFAULT_COLOR_CLASS = "bg-primary-container"


def can_view_drafts(user: AuthenticatedUser | None) -> bool:
    return user is not None and user.role in EVENT_CREATOR_ROLES


def list_events(
    db: Session,
    *,
    include_drafts: bool = False,
    course_code: str | None = None,
    event_type: str | None = None,
) -> list[Event]:
    query = select(Event)
    if not include_drafts:
        query = query.where(Event.publish_immediately.is_(True))
    if course_code:
        query = query.where(func.upper(Event.course_code) == course_code.strip().upper())
    if event_type:
        query = query.where(Event.event_type == event_type.strip())
    query = query.order_by(Event.event_date, Event.start_time, Event.id)
    return list(db.scalars(query))


def get_event(db: Session, event_id: int, *, include_drafts: bool = False) -> Event | None:
    event = db.get(Event, event_id)
    if event is None or (not event.publish_immediately and not include_drafts):
        return None
    return event


def _clock(value: time) -> str:
    return value.strftime("%I:%M %p").lstrip("0")


def to_calendar_item(event: Event) -> dict:
    return {
        "id": event.id,
        "title": event.title,
        "course": event.course_code,
        "date": event.event_date.isoformat(),
        "type": event.event_type,
        "time": f"{_clock(event.start_time)} - {_clock(event.end_time)}",
        "location": event.location,
        "instructor": event.instructor,
        "description": event.description,
        "colorClass": COURSE_COLOR_CLASSES.get(event.course_code.upper(), DEFAULT_COLOR_CLASS),
        # Only the rich card shows type, time and instructor,
        # requires for every calendar event.
        "isRich": True,
        "isPublished": event.publish_immediately,
    }
