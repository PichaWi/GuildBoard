from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.controllers.access import current_actor
from src.controllers.at_risk import utcnow
from src.controllers.auth import AuthenticatedUser
from src.controllers.notifications import list_notifications
from src.database import get_db

router = APIRouter(prefix="/api", tags=["notifications"])


@router.get(
    "/notifications",
    summary="What needs the signed-in user's attention: at-risk tickets (staff) and events in the next 7 days",
    responses={401: {"description": "Not signed in"}},
)
def read_notifications(
    user: Annotated[AuthenticatedUser, Depends(current_actor)],
    db: Annotated[Session, Depends(get_db)],
    now: Annotated[datetime, Depends(utcnow)],
):
    items = list_notifications(db, user, now)
    return {"count": len(items), "items": items}
