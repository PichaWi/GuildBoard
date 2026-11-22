"""Search controller (US-7)."""
from typing import Any
from dataclasses import dataclass

from fastapi import status
from pydantic import ValidationError
from sqlalchemy import select, or_, and_, func
from sqlalchemy.orm import Session

from src.controllers.access import Action, ensure_permission
from src.controllers.auth import AuthenticatedUser, UserRole
from src.models.ticket import Ticket
from src.models.event import Event
from src.models.material import CourseMaterial


ERROR_EMPTY_QUERY = "EMPTY_QUERY"
ERROR_INVALID_FIELD_FORMAT = "INVALID_FIELD_FORMAT"


@dataclass
class SearchResult:
    id: int
    type: str  # "ticket" | "event" | "material"
    title: str
    owner: str
    status: str
    date: str
    url: str


class SearchValidationError(Exception):
    def __init__(self, error: str, detail: str, status_code: int, **extra: Any) -> None:
        super().__init__(detail)
        self.error = error
        self.detail = detail
        self.status_code = status_code
        self.extra = extra

    def to_response(self) -> dict[str, Any]:
        return {"detail": self.detail, "error": self.error, **self.extra}


def _escape_ilike(value: str) -> str:
    """Escape % and _ for SQLAlchemy ilike."""
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def validate_search_query(raw: Any) -> str:
    data = raw if isinstance(raw, dict) else {}
    q = data.get("q", "").strip() if isinstance(data.get("q"), str) else ""
    if not q:
        raise SearchValidationError(
            ERROR_EMPTY_QUERY,
            "Query parameter 'q' is required and must not be empty.",
            status.HTTP_400_BAD_REQUEST,
        )
    return q


def search_tickets(db: Session, query: str, user: AuthenticatedUser, max_results: int | None = None) -> list[SearchResult]:
    """Search tickets. Students can't see tickets at all."""
    ensure_permission(user, Action.VIEW_TICKETS)
    escaped = _escape_ilike(query)
    like_pattern = f"%{escaped}%"
    stmt = select(Ticket).where(
        or_(
            Ticket.title.ilike(like_pattern, escape="\\"),
            Ticket.description.ilike(like_pattern, escape="\\"),
        )
    ).order_by(Ticket.due_at)
    if max_results:
        stmt = stmt.limit(max_results)
    tickets = db.scalars(stmt).all()
    return [
        SearchResult(
            id=t.id,
            type="ticket",
            title=t.title,
            owner=t.owner,
            status=t.status,
            date=t.due_at.strftime("%Y-%m-%d"),
            url=f"/tickets/{t.id}",
        )
        for t in tickets
    ]


def search_events(db: Session, query: str, user: AuthenticatedUser, max_results: int | None = None) -> list[SearchResult]:
    """Search events. Draft events only visible to staff."""
    escaped = _escape_ilike(query)
    like_pattern = f"%{escaped}%"
    can_see_drafts = user.role in (UserRole.TA, UserRole.LECTURER, UserRole.ADMIN)
    stmt = select(Event).where(
        or_(
            Event.title.ilike(like_pattern, escape="\\"),
            Event.description.ilike(like_pattern, escape="\\"),
        )
    )
    if not can_see_drafts:
        stmt = stmt.where(Event.publish_immediately == True)  # noqa: E712
    stmt = stmt.order_by(Event.event_date)
    if max_results:
        stmt = stmt.limit(max_results)
    events = db.scalars(stmt).all()
    return [
        SearchResult(
            id=e.id,
            type="event",
            title=e.title,
            owner=e.instructor,
            status="Published" if e.publish_immediately else "Draft",
            date=e.event_date.strftime("%Y-%m-%d"),
            url=f"/calendar",
        )
        for e in events
    ]


def search_materials(db: Session, query: str, user: AuthenticatedUser, max_results: int | None = None) -> list[SearchResult]:
    """Search materials. Unpublished only visible to staff."""
    escaped = _escape_ilike(query)
    like_pattern = f"%{escaped}%"
    can_see_unpublished = user.role in (UserRole.TA, UserRole.LECTURER, UserRole.ADMIN)
    stmt = select(CourseMaterial).where(
        CourseMaterial.title.ilike(like_pattern, escape="\\")
    )
    if not can_see_unpublished:
        stmt = stmt.where(CourseMaterial.is_published == True)  # noqa: E712
    stmt = stmt.order_by(CourseMaterial.created_at.desc())
    if max_results:
        stmt = stmt.limit(max_results)
    materials = db.scalars(stmt).all()
    return [
        SearchResult(
            id=m.id,
            type="material",
            title=m.title,
            owner=m.uploaded_by.split("@")[0] if "@" in m.uploaded_by else m.uploaded_by,
            status="Published" if m.is_published else "Draft",
            date=m.created_at.strftime("%Y-%m-%d"),
            url=f"/materials/{m.id}",
        )
        for m in materials
    ]


def search_all(db: Session, query: str, user: AuthenticatedUser, type_filter: str | None = None,
               status_filter: str | None = None, owner_filter: str | None = None,
               date_from: str | None = None, date_to: str | None = None,
               limit: int | None = None, offset: int = 0) -> tuple[int, list[SearchResult]]:
    """Search across all types with filters. Returns (total_count, paginated_results)."""
    # shortcut: fetches 3x limit per type in memory; revisit when >10k records per type
    per_type_limit = (limit * 3) if limit else None
    results = []

    if type_filter is None or type_filter == "ticket":
        results.extend(search_tickets(db, query, user, per_type_limit))
    if type_filter is None or type_filter == "event":
        results.extend(search_events(db, query, user, per_type_limit))
    if type_filter is None or type_filter == "material":
        results.extend(search_materials(db, query, user, per_type_limit))

    # Apply filters
    if status_filter:
        results = [r for r in results if r.status == status_filter]
    if owner_filter:
        results = [r for r in results if owner_filter.lower() in r.owner.lower()]
    if date_from:
        results = [r for r in results if r.date >= date_from]
    if date_to:
        results = [r for r in results if r.date <= date_to]

    # Sort by date desc for consistent pagination
    results.sort(key=lambda r: r.date, reverse=True)

    total = len(results)

    # Apply pagination after merging and filtering
    if limit:
        results = results[offset:offset + limit]
    elif offset:
        results = results[offset:]

    return total, results