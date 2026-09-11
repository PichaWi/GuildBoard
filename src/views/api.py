from typing import Annotated

from fastapi import APIRouter, Depends, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from src.controllers.auth import (
    AuthenticatedUser,
    UserRole,
    authenticate_dev_user,
    get_current_user,
)
from src.controllers.events import create_event
from src.database import get_db
from src.models.event import EventCreate, EventRead

router = APIRouter(prefix="/api")


class CurrentUserRead(BaseModel):
    id: str
    name: str
    role: UserRole
    auth_mode: str


class DevLoginRequest(BaseModel):
    email: str = Field(min_length=1, max_length=320)
    password: str = Field(min_length=1, max_length=256)


def _user_response(user: AuthenticatedUser) -> CurrentUserRead:
    return CurrentUserRead(
        id=user.id,
        name=user.name,
        role=user.role,
        auth_mode=user.auth_mode,
    )


@router.post(
    "/auth/dev-login",
    response_model=CurrentUserRead,
    summary="Create a signed development-only session",
    description=(
        "LOCAL/QA ONLY. Exchanges server-configured demo credentials for a signed "
        "session cookie. Disabled when DEV_LOGIN_ENABLED is false and always disabled "
        "when ENVIRONMENT is production."
    ),
)
def dev_login(payload: DevLoginRequest, request: Request) -> CurrentUserRead:
    user = authenticate_dev_user(payload.email, payload.password)
    request.session.clear()
    request.session["user"] = user.as_session_data()
    return _user_response(user)


@router.get(
    "/auth/me",
    response_model=CurrentUserRead,
    summary="Return the authenticated session identity",
)
def get_me(user: Annotated[AuthenticatedUser, Depends(get_current_user)]) -> CurrentUserRead:
    return _user_response(user)


@router.post(
    "/events",
    response_model=EventRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create an event (Lecturer, TA, or Admin only)",
)
def post_event(
    payload: EventCreate,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> EventRead:
    return create_event(db, payload, user)
