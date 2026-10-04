"""GET /api/events: the calendar feed (SRS-1, SRS-2)."""
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from src.controllers.access import Action, ensure_permission, optional_actor
from src.controllers.auth import AuthenticatedUser
from src.controllers.event_feed import can_view_drafts, get_event, list_events, to_calendar_item
from src.database import get_db

router = APIRouter(prefix="/api", tags=["events"])


@router.get("/events", summary="List calendar events")
def read_events(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[AuthenticatedUser | None, Depends(optional_actor)],
    course: Annotated[str | None, Query(description="Course code, e.g. ISP")] = None,
    event_type: Annotated[str | None, Query(alias="type", description="Event type, e.g. Lab")] = None,
    include_drafts: Annotated[
        bool, Query(description="Include unpublished events (Lecturer, TA or Admin only)")
    ] = False,
):
    if include_drafts:
        ensure_permission(user, Action.VIEW_DRAFT_EVENTS)

    events = list_events(db, include_drafts=include_drafts, course_code=course, event_type=event_type)
    return {"count": len(events), "events": [to_calendar_item(event) for event in events]}


@router.get("/events/{event_id}", summary="Get one calendar event")
def read_event(
    event_id: int,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[AuthenticatedUser | None, Depends(optional_actor)],
):
    # A draft is reported as missing rather than forbidden, so its existence
    # is not revealed to Students.
    event = get_event(db, event_id, include_drafts=can_view_drafts(user))
    if event is None:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"detail": f"Event {event_id} was not found."},
        )
    return to_calendar_item(event)
