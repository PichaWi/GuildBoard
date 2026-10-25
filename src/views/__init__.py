# Views / API Routers Layer
from fastapi import APIRouter

from src.views.api import router as api_router
from src.views.event_feed import router as event_feed_router
from src.views.tickets import router as tickets_router

router = APIRouter()
router.include_router(api_router)
router.include_router(event_feed_router)
router.include_router(tickets_router)

__all__ = ["router"]
