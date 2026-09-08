from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from backend.app.database.session import Base

class CameraModel(Base):
    __tablename__ = "cameras"

    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    rtsp_url = Column(String, nullable=False)
    location = Column(String, default="Border Gate")
    status = Column(String, default="ACTIVE")
    created_at = Column(DateTime, default=datetime.utcnow)

class EventModel(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String, unique=True, index=True, nullable=False)
    event_type = Column(String, index=True, nullable=False)
    camera_id = Column(String, index=True, nullable=False)
    track_id = Column(Integer, nullable=True)
    object_type = Column(String, nullable=False)
    confidence = Column(Float, nullable=False)
    severity = Column(String, index=True, nullable=False)
    timestamp = Column(Float, nullable=False)
    iso_timestamp = Column(String, nullable=False)
    details_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class ZoneModel(Base):
    __tablename__ = "zones"

    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(String, index=True, nullable=False)
    zone_type = Column(String, nullable=False)  # "polygon" or "line"
    zone_name = Column(String, nullable=False)
    coordinates_json = Column(Text, nullable=False)  # JSON string of coordinates
    created_at = Column(DateTime, default=datetime.utcnow)

class ANPRRecordModel(Base):
    __tablename__ = "anpr_records"

    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(String, index=True, nullable=False)
    track_id = Column(Integer, nullable=False)
    plate_number = Column(String, index=True, nullable=False)
    confidence = Column(Float, nullable=False)
    timestamp = Column(Float, nullable=False)
    crop_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
