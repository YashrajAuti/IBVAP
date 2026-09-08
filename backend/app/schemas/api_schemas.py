from typing import Optional, Any, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

# --- Camera Schemas ---
class CameraCreate(BaseModel):
    camera_id: str = Field(..., example="CAM-01")
    name: str = Field(..., example="North Gate Camera")
    rtsp_url: str = Field(..., example="rtsp://192.168.1.100:554/stream")
    location: Optional[str] = Field("Border Gate Main", example="Sector 4")

class CameraResponse(CameraCreate):
    id: int
    status: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# --- Event Schemas ---
class EventCreate(BaseModel):
    event_id: str
    event_type: str
    camera_id: str
    track_id: Optional[int] = None
    object_type: str
    confidence: float
    severity: str
    timestamp: float
    iso_timestamp: str
    details: Optional[dict[str, Any]] = None

class EventResponse(BaseModel):
    id: int
    event_id: str
    event_type: str
    camera_id: str
    track_id: Optional[int]
    object_type: str
    confidence: float
    severity: str
    timestamp: float
    iso_timestamp: str
    details_json: Optional[str]
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# --- Zone Schemas ---
class ZoneCreate(BaseModel):
    camera_id: str
    zone_type: str = Field(..., example="polygon")  # "polygon" or "line"
    zone_name: str = Field(..., example="Restricted Outpost Zone")
    coordinates: List[Any] = Field(..., example=[[100, 100], [400, 100], [400, 400], [100, 400]])

class ZoneResponse(BaseModel):
    id: int
    camera_id: str
    zone_type: str
    zone_name: str
    coordinates_json: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# --- ANPR Schemas ---
class ANPRRecordCreate(BaseModel):
    camera_id: str
    track_id: int
    plate_number: str
    confidence: float
    timestamp: float
    crop_path: Optional[str] = None

class ANPRRecordResponse(BaseModel):
    id: int
    camera_id: str
    track_id: int
    plate_number: str
    confidence: float
    timestamp: float
    crop_path: Optional[str]
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
