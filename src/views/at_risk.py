from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.controllers.access import Action, require_permission
from src.controllers.at_risk import at_risk_report, utcnow
from src.controllers.auth import AuthenticatedUser
from src.database import get_db

router = APIRouter(prefix="/api", tags=["at-risk"])


@router.get(
    "/at-risk",
    summary="Tickets that are overdue or due within 48 hours (Lecturer, TA or Admin only)",
    responses={
        401: {"description": "Not signed in"},
        403: {"description": "Signed in as a Student"},
    },
)
def read_at_risk(
    user: Annotated[AuthenticatedUser, Depends(require_permission(Action.VIEW_AT_RISK))],
    db: Annotated[Session, Depends(get_db)],
    now: Annotated[datetime, Depends(utcnow)],
):
    return at_risk_report(db, now)
