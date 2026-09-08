import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.models.db_models import ZoneModel
from backend.app.schemas.api_schemas import ZoneCreate, ZoneResponse

router = APIRouter(prefix="/zones", tags=["Spatial Zones"])

@router.get("", response_model=List[ZoneResponse])
def get_zones(camera_id: Optional[str] = None, db: Session = Depends(get_db)):
    """Retrieve spatial rules (polygon zones / virtual lines) configured in the system."""
    query = db.query(ZoneModel)
    if camera_id:
        query = query.filter(ZoneModel.camera_id == camera_id)
    return query.all()

@router.post("", response_model=ZoneResponse, status_code=status.HTTP_201_CREATED)
def create_zone(zone_in: ZoneCreate, db: Session = Depends(get_db)):
    """Create a new spatial rule (restricted polygon zone or line-crossing boundary)."""
    if zone_in.zone_type not in {"polygon", "line"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Zone type must be 'polygon' or 'line'."
        )

    coords_str = json.dumps(zone_in.coordinates)

    zone = ZoneModel(
        camera_id=zone_in.camera_id,
        zone_type=zone_in.zone_type,
        zone_name=zone_in.zone_name,
        coordinates_json=coords_str
    )
    db.add(zone)
    db.commit()
    db.refresh(zone)
    return zone

@router.delete("/{zone_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_zone(zone_id: int, db: Session = Depends(get_db)):
    """Remove a configured spatial rule."""
    zone = db.query(ZoneModel).filter(ZoneModel.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Zone not found.")
    db.delete(zone)
    db.commit()
    return None
