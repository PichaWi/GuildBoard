from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from src.controllers.auth import AuthenticatedUser, UserRole
from src.models.event import Event, EventCreate


EVENT_CREATOR_ROLES = {UserRole.LECTURER, UserRole.TA, UserRole.ADMIN}


def create_event(db: Session, payload: EventCreate, user: AuthenticatedUser) -> Event:
    if user.role not in EVENT_CREATOR_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Students are not permitted to create events.",
        )

    event = Event(**payload.model_dump(), created_by_role=user.role.value)
    db.add(event)
    db.commit()
    db.refresh(event)
    return event
