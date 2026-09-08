from fastapi import APIRouter
from backend.app.api.v1.cameras import router as cameras_router
from backend.app.api.v1.events import router as events_router
from backend.app.api.v1.zones import router as zones_router
from backend.app.api.v1.anpr import router as anpr_router
from backend.app.api.v1.websocket import router as ws_router, ws_manager

api_v1_router = APIRouter(prefix="/v1")
api_v1_router.include_router(cameras_router)
api_v1_router.include_router(events_router)
api_v1_router.include_router(zones_router)
api_v1_router.include_router(anpr_router)
api_v1_router.include_router(ws_router)

__all__ = ["api_v1_router", "ws_manager"]
