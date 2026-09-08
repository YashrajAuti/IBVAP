#!/usr/bin/env python3
"""
IBVAP - Phase 9 Backend API & Database Verification Script
Tests FastAPI routes, SQLite ORM models, Pydantic schemas, and CRUD persistence
using FastAPI TestClient with lifespan context manager.
"""

import sys
import time
from pathlib import Path
from fastapi.testclient import TestClient

# Add workspace root to sys.path
root_dir = Path(__file__).resolve().parent.parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from backend.app.main import app

def test_backend_api():
    print("\n" + "=" * 60)
    print(" Testing IBVAP Phase 9: Backend API & Database Models")
    print("=" * 60)

    timestamp_suffix = int(time.time())
    camera_id = f"CAM-NORTH-{timestamp_suffix}"

    # Wrap TestClient in context manager to execute lifespan startup (DB creation)
    with TestClient(app) as client:
        # 1. Health Check
        print("  1. Testing Health Check Endpoints...")
        res_root = client.get("/")
        assert res_root.status_code == 200, f"Root endpoint failed: {res_root.text}"
        assert res_root.json()["status"] == "online"

        res_health = client.get("/health")
        assert res_health.status_code == 200, f"Health endpoint failed: {res_health.text}"
        assert res_health.json()["status"] == "healthy"
        print("  ✅ Health checks passed.")

        # 2. Camera Management CRUD
        print("  2. Testing Camera Registration & Retrieval...")
        cam_payload = {
            "camera_id": camera_id,
            "name": "North Border Checkpoint Camera",
            "rtsp_url": "rtsp://192.168.1.100:554/stream1",
            "location": "Sector 4 North"
        }
        res_cam_create = client.post("/api/v1/cameras", json=cam_payload)
        assert res_cam_create.status_code == 201, f"Camera creation failed: {res_cam_create.text}"
        cam_data = res_cam_create.json()
        assert cam_data["camera_id"] == camera_id
        assert cam_data["status"] == "ACTIVE"

        res_cam_list = client.get("/api/v1/cameras")
        assert res_cam_list.status_code == 200
        assert len(res_cam_list.json()) >= 1
        print("  ✅ Camera registration CRUD passed.")

        # 3. Spatial Zone Management CRUD
        print("  3. Testing Spatial Zone Configuration...")
        zone_polygon = {
            "camera_id": camera_id,
            "zone_type": "polygon",
            "zone_name": "Restricted Bunker Polygon",
            "coordinates": [[100, 100], [500, 100], [500, 500], [100, 500]]
        }
        res_zone_create = client.post("/api/v1/zones", json=zone_polygon)
        assert res_zone_create.status_code == 201, f"Zone creation failed: {res_zone_create.text}"
        zone_data = res_zone_create.json()
        assert zone_data["zone_name"] == "Restricted Bunker Polygon"

        res_zone_list = client.get(f"/api/v1/zones?camera_id={camera_id}")
        assert res_zone_list.status_code == 200
        assert len(res_zone_list.json()) == 1
        print("  ✅ Spatial zone configuration passed.")

        # 4. Detection Event Ingestion & Querying
        print("  4. Testing Detection Event Recording & Filtering...")
        event_payload = {
            "event_id": f"EVT-TEST-{int(time.time())}",
            "event_type": "RESTRICTED_ZONE_ENTRY",
            "camera_id": camera_id,
            "track_id": 101,
            "object_type": "person",
            "confidence": 0.92,
            "severity": "CRITICAL",
            "timestamp": time.time(),
            "iso_timestamp": "2026-08-26T19:45:00Z",
            "details": {"zone_name": "Restricted Bunker Polygon", "position": [300, 300]}
        }
        res_evt_create = client.post("/api/v1/events", json=event_payload)
        assert res_evt_create.status_code == 201, f"Event creation failed: {res_evt_create.text}"

        res_evt_query = client.get(f"/api/v1/events?severity=CRITICAL&camera_id={camera_id}")
        assert res_evt_query.status_code == 200
        events_found = res_evt_query.json()
        assert len(events_found) >= 1
        assert events_found[0]["event_type"] == "RESTRICTED_ZONE_ENTRY"
        print("  ✅ Detection event ingestion & querying passed.")

        # 5. ANPR License Plate Logging & Search
        print("  5. Testing ANPR Record Ingestion & Search...")
        anpr_payload = {
            "camera_id": camera_id,
            "track_id": 105,
            "plate_number": "MH12AB1234",
            "confidence": 0.94,
            "timestamp": time.time(),
            "crop_path": "data/evidence/plate_105.jpg"
        }
        res_anpr_create = client.post("/api/v1/anpr", json=anpr_payload)
        assert res_anpr_create.status_code == 201, f"ANPR record creation failed: {res_anpr_create.text}"

        res_anpr_query = client.get("/api/v1/anpr?plate_number=MH12")
        assert res_anpr_query.status_code == 200
        plates_found = res_anpr_query.json()
        assert len(plates_found) >= 1
        assert plates_found[0]["plate_number"] == "MH12AB1234"
        print("  ✅ ANPR license plate logging & search passed.")

    print("\n" + "=" * 60)
    print(" PHASE 9 BACKEND API & DATABASE TEST SUMMARY")
    print("=" * 60)
    print("  • Database Engine:    SQLite (data/ibvap.db)")
    print("  • ORM Models:         CameraModel, EventModel, ZoneModel, ANPRRecordModel")
    print("  • API Endpoints:      /health, /cameras, /zones, /events, /anpr")
    print("=" * 60 + "\n")
    print("✅ All Phase 9 Backend API & Database checks passed successfully!")

if __name__ == "__main__":
    test_backend_api()
