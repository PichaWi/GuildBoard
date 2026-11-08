from datetime import date
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from src.controllers.access import Action, require_permission
from src.controllers.auth import AuthenticatedUser
from src.controllers.consultations import (
    ConsultationValidationError,
    record_consultation,
    search_consultations,
    validate_consultation,
)
from src.database import get_db
from src.models.consultation import ConsultationCreate, ConsultationRead
from src.views.tickets import read_json_payload

router = APIRouter(prefix="/api", tags=["consultations"])


@router.get(
    "/consultations",
    response_model=list[ConsultationRead],
    summary="Search consultation sessions, newest first (TA only)",
    responses={
        401: {"description": "Not signed in"},
        403: {"description": "Signed in without the TA role"},
    },
)
def read_consultations(
    user: Annotated[AuthenticatedUser, Depends(require_permission(Action.SEARCH_CONSULTATIONS))],
    db: Annotated[Session, Depends(get_db)],
    keyword: Annotated[str | None, Query(alias="q", max_length=255, description="Topic, notes or course")] = None,
    student: Annotated[str | None, Query(max_length=120, description="Student name or ID")] = None,
    on_date: Annotated[date | None, Query(alias="date", description="Session date, YYYY-MM-DD")] = None,
):
    return search_consultations(db, keyword=keyword, student=student, on_date=on_date)


@router.post(
    "/consultations",
    response_model=ConsultationRead,
    status_code=status.HTTP_201_CREATED,
    summary="Record a consultation session (TA only)",
    responses={
        400: {"description": "REQUIRED_FIELDS_MISSING: a required field is absent or blank"},
        401: {"description": "Not signed in"},
        403: {"description": "Signed in without the TA role"},
        422: {"description": "INVALID_FIELD_FORMAT: a value could not be parsed"},
    },
    openapi_extra={
        "requestBody": {
            "required": True,
            "content": {"application/json": {"schema": ConsultationCreate.model_json_schema()}},
        }
    },
)
def post_consultation(
    user: Annotated[AuthenticatedUser, Depends(require_permission(Action.RECORD_CONSULTATION))],
    raw_payload: Annotated[Any, Depends(read_json_payload)],
    db: Annotated[Session, Depends(get_db)],
):
    try:
        payload = validate_consultation(raw_payload)
    except ConsultationValidationError as error:
        return JSONResponse(status_code=error.status_code, content=error.to_response())
    return record_consultation(db, payload, user)
