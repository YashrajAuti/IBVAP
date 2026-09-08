import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.app.core.config import settings

# Ensure data directory exists for SQLite database file
db_path = settings.DATABASE_URL.replace("sqlite:///", "")
if db_path.startswith("./"):
    db_path = db_path[2:]
Path(db_path).parent.mkdir(parents=True, exist_ok=True)

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {},
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """Dependency that yields a database session and closes it on request completion."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_db_and_tables():
    """Creates all database tables defined in ORM models and seeds default cameras if needed."""
    Base.metadata.create_all(bind=engine)
    seed_default_cameras()

def seed_default_cameras():
    """Seed initial default cameras into database if empty."""
    from backend.app.models.db_models import CameraModel
    db = SessionLocal()
    try:
        if db.query(CameraModel).count() == 0:
            default_cams = [
                CameraModel(
                    camera_id=settings.CAMERA_1_ID,
                    name=settings.CAMERA_1_NAME,
                    rtsp_url=settings.CAMERA_1_SOURCE,
                    location="North Sector Gate 4",
                    status="ACTIVE"
                ),
                CameraModel(
                    camera_id=settings.CAMERA_2_ID,
                    name=settings.CAMERA_2_NAME,
                    rtsp_url=settings.CAMERA_2_SOURCE,
                    location="West Post Checkpoint",
                    status="ACTIVE"
                ),
                CameraModel(
                    camera_id=settings.CAMERA_3_ID,
                    name=settings.CAMERA_3_NAME,
                    rtsp_url=settings.CAMERA_3_SOURCE,
                    location="Parking Area",
                    status="ACTIVE"
                )
            ]
            db.add_all(default_cams)
            db.commit()
    except Exception as e:
        db.rollback()
    finally:
        db.close()
