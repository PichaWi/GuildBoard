from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.config import settings
from src.controllers.auth import UserRole
from src.controllers.google_auth import is_allowed_domain
from src.models.user import User


class RoleAssignmentError(ValueError):
def normalize_email(email: str) -> str:
    return email.strip().lower()


def find_user(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == normalize_email(email)))


def get_or_provision_user(db: Session, *, email: str, name: str = "") -> User:
    email = normalize_email(email)
    user = find_user(db, email)
    if user is not None:
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
