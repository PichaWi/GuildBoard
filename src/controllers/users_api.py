"""Admin user management controller (US-5)."""
from typing import Any
from dataclasses import dataclass

from fastapi import status
from pydantic import ValidationError
from sqlalchemy import select, or_, func
from sqlalchemy.orm import Session

from src.controllers.access import Action, ensure_permission
from src.controllers.auth import AuthenticatedUser, UserRole
from src.controllers.users import assign_role, RoleAssignmentError, normalize_email, find_user
from src.models.user import User


ERROR_INVALID_ROLE = "INVALID_ROLE"
ERROR_SELF_DEMOTION = "SELF_DEMOTION"
ERROR_USER_NOT_FOUND = "USER_NOT_FOUND"


@dataclass
class UserListItem:
    id: int
    email: str
    name: str
    role: str
    created_at: str


class UsersValidationError(Exception):
    def __init__(self, error: str, detail: str, status_code: int, **extra: Any) -> None:
        super().__init__(detail)
        self.error = error
        self.detail = detail
        self.status_code = status_code
        self.extra = extra

    def to_response(self) -> dict[str, Any]:
        return {"detail": self.detail, "error": self.error, **self.extra}


def list_users(db: Session, user: AuthenticatedUser, q: str | None = None, role: str | None = None) -> list[UserListItem]:
    ensure_permission(user, Action.VIEW_USERS)

    stmt = select(User)
    if q:
        like_pattern = f"%{q}%"
        stmt = stmt.where(or_(
            User.email.ilike(like_pattern),
            User.name.ilike(like_pattern),
        ))
    if role:
        stmt = stmt.where(User.role == role)
    stmt = stmt.order_by(User.created_at.desc())

    users = db.scalars(stmt).all()
    return [
        UserListItem(
            id=u.id,
            email=u.email,
            name=u.name,
            role=u.role,
            created_at=u.created_at.isoformat() if u.created_at else "",
        )
        for u in users
    ]


def update_user_role(db: Session, user: AuthenticatedUser, target_id: int, new_role: str) -> User:
    ensure_permission(user, Action.ASSIGN_ROLE)

    # Prevent self-demotion from Admin
    if user.role == UserRole.ADMIN and user.email:
        target = db.get(User, target_id)
        if target and target.email == user.email and new_role != "Admin":
            raise UsersValidationError(
                ERROR_SELF_DEMOTION,
                "Admins cannot remove their own Admin role.",
                status.HTTP_400_BAD_REQUEST,
            )

    # Validate role
    try:
        role_enum = UserRole(new_role)
    except ValueError:
        raise UsersValidationError(
            ERROR_INVALID_ROLE,
            f"Invalid role: {new_role}. Valid roles: Student, TA, Lecturer, Admin.",
            status.HTTP_422_UNPROCESSABLE_ENTITY,
        )

    # Find target user
    target = db.get(User, target_id)
    if target is None:
        raise UsersValidationError(
            ERROR_USER_NOT_FOUND,
            f"User {target_id} not found.",
            status.HTTP_404_NOT_FOUND,
        )

    # Assign new role
    target.role = role_enum.value
    db.commit()
    db.refresh(target)
    return target