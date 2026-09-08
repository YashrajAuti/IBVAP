from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.models.db_models import ANPRRecordModel
from backend.app.schemas.api_schemas import ANPRRecordCreate, ANPRRecordResponse

router = APIRouter(prefix="/anpr", tags=["ANPR License Plate Logs"])

@router.get("", response_model=List[ANPRRecordResponse])
def query_anpr_records(
    camera_id: Optional[str] = Query(None, description="Filter by camera ID"),
    plate_number: Optional[str] = Query(None, description="Search plate number (partial match supported)"),
    limit: int = Query(50, ge=1, le=500, description="Max results to return"),
    db: Session = Depends(get_db)
):
    """Query ANPR license plate recognition logs."""
    query = db.query(ANPRRecordModel)
    if camera_id:
        query = query.filter(ANPRRecordModel.camera_id == camera_id)
    if plate_number:
        query = query.filter(ANPRRecordModel.plate_number.ilike(f"%{plate_number.upper()}%"))

    return query.order_by(ANPRRecordModel.created_at.desc()).limit(limit).all()

@router.post("", response_model=ANPRRecordResponse, status_code=status.HTTP_201_CREATED)
def record_plate_log(record_in: ANPRRecordCreate, db: Session = Depends(get_db)):
    """Save an ANPR plate recognition result into the database."""
    record = ANPRRecordModel(
        camera_id=record_in.camera_id,
        track_id=record_in.track_id,
        plate_number=record_in.plate_number.upper(),
        confidence=record_in.confidence,
        timestamp=record_in.timestamp,
        crop_path=record_in.crop_path
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
