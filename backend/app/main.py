from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.core.config import settings
from backend.app.core.logging import setup_logging, logger
from backend.app.database.session import create_db_and_tables
from backend.app.api.v1 import api_v1_router
import asyncio
from backend.app.api.v1.websocket import router as ws_router, start_all_camera_workers

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle events: Initialize logger & create DB tables on startup."""
    setup_logging()
    logger.info(f"Starting {settings.PROJECT_NAME} Backend API v{settings.VERSION}")
    create_db_and_tables()
    logger.info("Database tables verified and initialized successfully.")
    
    # Launch background AI multi-camera video streaming task
    stream_task = asyncio.create_task(start_all_camera_workers())
    logger.info("Background AI multi-camera video stream workers launched.")
    
    yield
    
    stream_task.cancel()
    logger.info("Shutting down IBVAP Backend API.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Intelligent Border Video Analytics Platform - Backend API Service",
    lifespan=lifespan
)

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.staticfiles import StaticFiles

# Include Routers & Static File Servers
app.mount("/static/audios", StaticFiles(directory="data/audios"), name="audios")
app.include_router(api_v1_router, prefix="/api")
app.include_router(ws_router)  # /ws/live endpoint

@app.get("/")
def root():
    return {
        "status": "online",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "websocket_endpoint": "/ws/live",
        "docs_url": "/docs"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "database": "connected"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
