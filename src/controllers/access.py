from dataclasses import dataclass
from enum import Enum
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from src.controllers.auth import AuthenticatedUser, UserRole, get_current_user
from src.controllers.google_auth import GOOGLE_AUTH_MODE, is_allowed_domain
from src.controllers.users import get_or_provision_user
from src.database import get_db


class Action(str, Enum):
    VIEW_DRAFT_EVENTS = "view_draft_events"
    CREATE_EVENT = "create_event"


@dataclass(frozen=True)
class Rule:
    roles: frozenset[UserRole]
    denied_detail: str


_STAFF = frozenset({UserRole.TA, UserRole.LECTURER, UserRole.ADMIN})

PERMISSION_MATRIX: dict[Action, Rule] = {
    Action.VIEW_DRAFT_EVENTS: Rule(
        roles=_STAFF,
        denied_detail="Only Lecturers, TAs and Admins can view unpublished events.",
    ),
    Action.CREATE_EVENT: Rule(
        roles=_STAFF,
        denied_detail="Students are not permitted to create events.",
    ),
}


def can(user: AuthenticatedUser | None, action: Action) -> bool:
    return user is not None and user.role in PERMISSION_MATRIX[action].roles


def ensure_permission(user: AuthenticatedUser | None, action: Action) -> None:
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )
    if not can(user, action):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=PERMISSION_MATRIX[action].denied_detail,
        )


def current_actor(
    request: Request, db: Annotated[Session, Depends(get_db)]
) -> AuthenticatedUser:
    session_user = get_current_user(request)
    if session_user.auth_mode != GOOGLE_AUTH_MODE:
        return session_user

    if not is_allowed_domain(session_user.id):
        request.session.clear()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication session.",
        )

    stored = get_or_provision_user(db, email=session_user.id, name=session_user.name)
    return AuthenticatedUser(
        user_id=session_user.id,
        name=session_user.name,
        role=UserRole(stored.role),
        auth_mode=session_user.auth_mode,
    )


def optional_actor(
    request: Request, db: Annotated[Session, Depends(get_db)]
) -> AuthenticatedUser | None:
    if "user" not in request.session:
        return None
    try:
        return current_actor(request, db)
    except HTTPException:
        return None


def require_permission(action: Action):
    def dependency(
        user: Annotated[AuthenticatedUser, Depends(current_actor)],
    ) -> AuthenticatedUser:
        ensure_permission(user, action)
        return user

    dependency.__name__ = f"require_{action.value}"
    return dependency
