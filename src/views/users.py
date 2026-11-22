"""Admin user management endpoints (US-5)."""
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from src.controllers.access import Action, require_permission
from src.controllers.auth import AuthenticatedUser
from src.controllers.users_api import (
    UsersValidationError,
    list_users,
    update_user_role,
)
from src.database import get_db

router = APIRouter(prefix="/api", tags=["users"])


async def read_json_payload(request: Request) -> Any:
    try:
        return await request.json()
    except ValueError:
        return {}


def _invalid(error: UsersValidationError) -> JSONResponse:
    return JSONResponse(status_code=error.status_code, content=error.to_response())


@router.get(
    "/users",
    summary="List users with optional search and role filter (Admin only)",
    responses={
        401: {"description": "Not signed in"},
        403: {"description": "Signed in as non-Admin"},
    },
)
def read_users(
    user: Annotated[AuthenticatedUser, Depends(require_permission(Action.VIEW_USERS))],
    db: Annotated[Session, Depends(get_db)],
    q: Annotated[str | None, Query(description="Search by email or name")] = None,
    role: Annotated[str | None, Query(description="Filter by role: Student, TA, Lecturer, Admin")] = None,
):
    users = list_users(db, user, q, role)
    return [
        {
            "id": u.id,
            "email": u.email,
            "name": u.name,
            "role": u.role,
            "created_at": u.created_at,
        }
        for u in users
    ]


@router.patch(
    "/users/{user_id}/role",
    summary="Update a user's role (Admin only)",
    responses={
        400: {"description": "SELF_DEMOTION: Admins cannot remove their own Admin role"},
        401: {"description": "Not signed in"},
        403: {"description": "Signed in as non-Admin"},
        404: {"description": "User not found"},
        422: {"description": "INVALID_ROLE: Unknown role value"},
    },
)
def patch_user_role(
    user_id: int,
    user: Annotated[AuthenticatedUser, Depends(require_permission(Action.ASSIGN_ROLE))],
    raw_payload: Annotated[Any, Depends(read_json_payload)],
    db: Annotated[Session, Depends(get_db)],
):
    role = raw_payload.get("role") if isinstance(raw_payload, dict) else None
    if not role:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": "Missing required field: role", "error": "INVALID_ROLE"},
        )
    try:
        target = update_user_role(db, user, user_id, role)
    except UsersValidationError as error:
        return _invalid(error)
    return {
        "id": target.id,
        "email": target.email,
        "name": target.name,
        "role": target.role,
        "created_at": target.created_at.isoformat() if target.created_at else "",
    }