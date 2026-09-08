from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.models.db_models import CameraModel
from backend.app.schemas.api_schemas import CameraCreate, CameraResponse

router = APIRouter(prefix="/cameras", tags=["Cameras"])

@router.get("", response_model=List[CameraResponse])
def get_cameras(db: Session = Depends(get_db)):
    """Retrieve list of registered IP CCTV cameras."""
    return db.query(CameraModel).all()

@router.post("", response_model=CameraResponse, status_code=status.HTTP_201_CREATED)
def register_camera(camera_in: CameraCreate, db: Session = Depends(get_db)):
    """Register a new IP CCTV camera stream."""
    existing = db.query(CameraModel).filter(CameraModel.camera_id == camera_in.camera_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Camera with ID '{camera_in.camera_id}' is already registered."
        )
    
    cam = CameraModel(
        camera_id=camera_in.camera_id,
        name=camera_in.name,
        rtsp_url=camera_in.rtsp_url,
        location=camera_in.location,
        status="ACTIVE"
    )
    db.add(cam)
    db.commit()
    db.refresh(cam)
    return cam

@router.get("/{camera_id}", response_model=CameraResponse)
def get_camera_by_id(camera_id: str, db: Session = Depends(get_db)):
    """Retrieve details for a specific camera ID."""
    cam = db.query(CameraModel).filter(CameraModel.camera_id == camera_id).first()
    if not cam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Camera not found.")
    return cam

@router.delete("/{camera_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_camera(camera_id: str, db: Session = Depends(get_db)):
    """Remove a camera registration."""
    cam = db.query(CameraModel).filter(CameraModel.camera_id == camera_id).first()
    if not cam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Camera not found.")
    db.delete(cam)
    db.commit()
    return None
