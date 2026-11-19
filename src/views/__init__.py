# Views / API Routers Layer
from fastapi import APIRouter

from src.views.api import router as api_router
from src.views.at_risk import router as at_risk_router
from src.views.consultations import router as consultations_router
from src.views.event_feed import router as event_feed_router
from src.views.materials import router as materials_router
from src.views.notifications import router as notifications_router
from src.views.tickets import router as tickets_router

router = APIRouter()
router.include_router(api_router)
router.include_router(event_feed_router)
router.include_router(tickets_router)
router.include_router(at_risk_router)
router.include_router(consultations_router)
router.include_router(notifications_router)
router.include_router(materials_router)

__all__ = ["router"]
