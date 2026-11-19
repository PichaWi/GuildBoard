from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.config import settings
from src.controllers.auth import UserRole
from src.controllers.google_auth import is_allowed_domain
from src.models.user import User


class RoleAssignmentError(ValueError):
    """Raised when a role cannot be assigned to a user."""


def normalize_email(email: str) -> str:
    return email.strip().lower()


def find_user(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == normalize_email(email)))


def get_or_provision_user(db: Session, *, email: str, name: str = "") -> User:
    email = normalize_email(email)
    user = find_user(db, email)
    if user is not None:
        # A row made by the role script or the seed data has no name, or a placeholder one.
        if name and user.name != name:
            user.name = name
            db.commit()
        return user

    user = User(email=email, name=name, role=UserRole.STUDENT.value)
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        existing = find_user(db, email)
        if existing is None:
            raise
        return existing
    return user


def assign_role(db: Session, email: str, role: UserRole) -> tuple[User, bool]:
    # Set a person's role, creating their row if they have not signed in yet.
    email = normalize_email(email)
    if not is_allowed_domain(email):
        raise RoleAssignmentError(
            f"{email!r} is not an @{settings.allowed_email_domain} address."
        )

    user = find_user(db, email)
    created = user is None
    if user is None:
        user = User(email=email, name="", role=role.value)
        db.add(user)
    else:
        user.role = role.value
    db.commit()
    return user, created


def revoke_all_sessions(db: Session, email: str) -> None:
    """Sign Out Everywhere: every session made before now stops working."""
    user = find_user(db, email)
    if user is not None:
        user.sessions_revoked_at = datetime.now(timezone.utc)
        db.commit()


def session_was_revoked(user: User, issued_at: float | None) -> bool:
    """True if this session started before the user's last Sign Out Everywhere."""
    if user.sessions_revoked_at is None:
        return False
    revoked = user.sessions_revoked_at
    if revoked.tzinfo is None:  # SQLite returns naive datetimes; they are UTC
        revoked = revoked.replace(tzinfo=timezone.utc)
    return (issued_at or 0) < revoked.timestamp()