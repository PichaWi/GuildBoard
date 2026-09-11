import secrets
from enum import Enum

from fastapi import HTTPException, Request, status

from src.config import settings


class UserRole(str, Enum):
    STUDENT = "Student"
    LECTURER = "Lecturer"
    TA = "TA"
    ADMIN = "Admin"


class AuthenticatedUser:
    def __init__(self, user_id: str, name: str, role: UserRole, auth_mode: str) -> None:
        self.id = user_id
        self.name = name
        self.role = role
        self.auth_mode = auth_mode

    def as_session_data(self) -> dict[str, str]:
        return {
            "id": self.id,
            "name": self.name,
            "role": self.role.value,
            "auth_mode": self.auth_mode,
        }


def _credentials_match(
    supplied_email: str,
    supplied_password: str,
    configured_email: str,
    configured_password: str,
) -> bool:
    if not configured_email or not configured_password:
        return False
    email_matches = secrets.compare_digest(
        supplied_email.casefold().encode("utf-8"),
        configured_email.casefold().encode("utf-8"),
    )
    password_matches = secrets.compare_digest(
        supplied_password.encode("utf-8"),
        configured_password.encode("utf-8"),
    )
    return email_matches and password_matches


def authenticate_dev_user(email: str, password: str) -> AuthenticatedUser:
    """Authenticate a server-configured local account; never enabled in production."""

    if not settings.dev_login_enabled or settings.environment.strip().casefold() == "production":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Development login is disabled.",
        )

    normalized_email = email.strip()
    if _credentials_match(
        normalized_email,
        password,
        settings.demo_student_email,
        settings.demo_student_password,
    ):
        return AuthenticatedUser(
            user_id="demo-student",
            name="Demo Student",
            role=UserRole.STUDENT,
            auth_mode="signed-dev-session-not-for-production",
        )
    if _credentials_match(
        normalized_email,
        password,
        settings.demo_lecturer_email,
        settings.demo_lecturer_password,
    ):
        return AuthenticatedUser(
            user_id="demo-lecturer",
            name="Demo Lecturer",
            role=UserRole.LECTURER,
            auth_mode="signed-dev-session-not-for-production",
        )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid development credentials.",
    )


def get_current_user(request: Request) -> AuthenticatedUser:
    session_user = request.session.get("user")
    if not isinstance(session_user, dict):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )

    try:
        user_id = session_user["id"]
        name = session_user["name"]
        role = session_user["role"]
        auth_mode = session_user["auth_mode"]
        if not all(isinstance(value, str) for value in (user_id, name, role, auth_mode)):
            raise TypeError("session identity fields must be strings")
        return AuthenticatedUser(
            user_id=user_id,
            name=name,
            role=UserRole(role),
            auth_mode=auth_mode,
        )
    except (KeyError, TypeError, ValueError):
        request.session.clear()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication session.",
        ) from None
