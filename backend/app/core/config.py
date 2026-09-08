import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent

class Settings(BaseSettings):
    # Application Setup
    PROJECT_NAME: str = "IBVAP"
    VERSION: str = "1.0.0"
    APP_ENV: str = "development"
    LOG_LEVEL: str = "INFO"
    SECRET_KEY: str = "ibvap-default-secret-key"
    CORS_ORIGINS: list[str] = ["*"]

    # Server Settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WEBSOCKET_PATH: str = "/ws/live"

    # Database Configuration
    DATABASE_URL: str = "sqlite:///./data/ibvap.db"

    # AI & Computer Vision Settings
    YOLO_MODEL_NAME: str = "yolov8n.pt"
    YOLO_CONFIDENCE_THRESHOLD: float = 0.25
    YOLO_IOU_THRESHOLD: float = 0.45
    PREFERRED_DEVICE: str = "auto"

    # ANPR / OCR Settings
    ANPR_MIN_CONFIDENCE: float = 0.60
    OCR_LANGUAGES: str = "en"

    # Storage Paths & Centralized Camera Mapping
    EVIDENCE_DIR: str = str(BASE_DIR / "data" / "evidence")
    MODELS_DIR: str = str(BASE_DIR / "data" / "models")
    VIDEOS_DIR: str = str(BASE_DIR / "data" / "videos")
    DEFAULT_VIDEO_SOURCE: str = str(BASE_DIR / "data" / "videos" / "sample.mp4")
    
    CAMERA_1_ID: str = "CAM-NORTH-01"
    CAMERA_1_NAME: str = "North Sector Gate 4"
    CAMERA_1_SOURCE: str = str(BASE_DIR / "data" / "videos" / "Vehicle Dataset Sample.mp4")
    
    CAMERA_2_ID: str = "CAM-WEST-02"
    CAMERA_2_NAME: str = "West Post Checkpoint"
    CAMERA_2_SOURCE: str = str(BASE_DIR / "data" / "videos" / "Crowd Dataset Sample.mp4")

    CAMERA_3_ID: str = "CAM-PARKING-03"
    CAMERA_3_NAME: str = "Parking Area"
    CAMERA_3_SOURCE: str = str(BASE_DIR / "data" / "videos" / "person.mp4")
    ALARM_AUDIO_PATH: str = str(BASE_DIR / "data" / "audios" / "alarm.mp3")

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
