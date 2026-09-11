"""GET /api/events: the calendar feed (SRS-1, SRS-2)."""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from src.controllers.auth import AuthenticatedUser, get_current_user
from src.controllers.event_feed import can_view_drafts, get_event, list_events, to_calendar_item
from src.database import get_db

router = APIRouter(prefix="/api", tags=["events"])


def optional_current_user(request: Request) -> AuthenticatedUser | None:
    """The signed-in user, or None. The published calendar needs no sign-in."""
    if "user" not in request.session:
        return None
    try:
        return get_current_user(request)
    except HTTPException:
        return None


@router.get("/events", summary="List calendar events")
def read_events(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[AuthenticatedUser | None, Depends(optional_current_user)],
    course: Annotated[str | None, Query(description="Course code, e.g. ISP")] = None,
    event_type: Annotated[str | None, Query(alias="type", description="Event type, e.g. Lab")] = None,
    include_drafts: Annotated[
        bool, Query(description="Include unpublished events (Lecturer, TA or Admin only)")
    ] = False,
):
    if include_drafts and user is None:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"detail": "Authentication required."},
        )
    if include_drafts and not can_view_drafts(user):
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={"detail": "Only Lecturers, TAs and Admins can view unpublished events."},
        )

    events = list_events(db, include_drafts=include_drafts, course_code=course, event_type=event_type)
    return {"count": len(events), "events": [to_calendar_item(event) for event in events]}


@router.get("/events/{event_id}", summary="Get one calendar event")
def read_event(
    event_id: int,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[AuthenticatedUser | None, Depends(optional_current_user)],
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
