"""Search endpoints (US-7)."""
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from src.controllers.access import Action, require_permission
from src.controllers.auth import AuthenticatedUser
from src.controllers.search import (
    SearchValidationError,
    search_all,
    validate_search_query,
)
from src.database import get_db

router = APIRouter(prefix="/api", tags=["search"])


def _invalid(error: SearchValidationError) -> JSONResponse:
    return JSONResponse(status_code=error.status_code, content=error.to_response())


@router.get(
    "/search",
    summary="Search across tickets, events, and materials (TA, Lecturer, Admin only)",
    responses={
        400: {"description": "EMPTY_QUERY: 'q' parameter is required"},
        401: {"description": "Not signed in"},
        403: {"description": "Signed in as a Student"},
    },
)
def read_search(
    user: Annotated[AuthenticatedUser, Depends(require_permission(Action.VIEW_TICKETS))],
    db: Annotated[Session, Depends(get_db)],
    q: Annotated[str, Query(description="Search query (case-insensitive, min 1 char)")],
    type: Annotated[str | None, Query(description="Filter by type: ticket, event, material")] = None,
    status: Annotated[str | None, Query(description="Filter by status")] = None,
    owner: Annotated[str | None, Query(description="Filter by owner name")] = None,
    date_from: Annotated[str | None, Query(description="Filter by date from (YYYY-MM-DD)")] = None,
    date_to: Annotated[str | None, Query(description="Filter by date to (YYYY-MM-DD)")] = None,
    limit: Annotated[int | None, Query(description="Max results per page", ge=1, le=100)] = 50,
    offset: Annotated[int, Query(description="Results to skip", ge=0)] = 0,
):
    # Validate query
    try:
        query = validate_search_query({"q": q})
    except SearchValidationError as error:
        return _invalid(error)

    total, results = search_all(db, query, user, type, status, owner, date_from, date_to, limit, offset)

    return {
        "count": total,
        "results": [
            {
                "id": r.id,
                "type": r.type,
                "title": r.title,
                "owner": r.owner,
                "status": r.status,
                "date": r.date,
                "url": r.url,
            }
            for r in results
        ],
    }