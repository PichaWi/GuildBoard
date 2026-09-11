from typing import Annotated, Any

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from src.controllers.auth import (
    AuthenticatedUser,
    UserRole,
    authenticate_dev_user,
    get_current_user,
)
from src.controllers.events import (
    EventValidationError,
    create_event,
    ensure_can_create_events,
    validate_event_payload,
)
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


async def read_event_payload(request: Request) -> Any:
    content_type = request.headers.get("content-type", "")
    if content_type.startswith(("application/x-www-form-urlencoded", "multipart/form-data")):
        return dict(await request.form())
    try:
        return await request.json()
    except ValueError:
        return {}

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
    responses={
        400: {"description": "REQUIRED_FIELDS_MISSING: a required field is absent or blank"},
        401: {"description": "Not signed in"},
        403: {"description": "Signed in as a Student"},
        422: {"description": "INVALID_FIELD_FORMAT: a value could not be parsed"},
    },
    openapi_extra={
        "requestBody": {
            "required": True,
            "content": {"application/json": {"schema": EventCreate.model_json_schema()}},
        }
    },
)
def post_event(
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    raw_payload: Annotated[Any, Depends(read_event_payload)],
    db: Annotated[Session, Depends(get_db)],
):
    ensure_can_create_events(user)
    try:
        payload = validate_event_payload(raw_payload)
    except EventValidationError as error:
        return JSONResponse(status_code=error.status_code, content=error.to_response())
    return create_event(db, payload, user)
