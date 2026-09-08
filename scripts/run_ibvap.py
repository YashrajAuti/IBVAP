#!/usr/bin/env python3
"""
IBVAP - Intelligent Border Video Analytics Platform
Master System Launcher Script.
Orchestrates:
1. FastAPI Backend API & WebSocket Server (Port 8000)
2. Live AI Video Analytics Pipelines for Cameras 1, 2, and 3
3. React Surveillance Dashboard Frontend (Port 3000)
"""

import sys
import time
import subprocess
import signal
from pathlib import Path

# Add workspace root to sys.path
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from backend.app.core.config import settings
from backend.app.database.session import SessionLocal, create_db_and_tables
from backend.app.models.db_models import CameraModel

def provision_default_cameras():
    """Provisions default Camera 1, Camera 2, and Camera 3 into database if missing."""
    create_db_and_tables()
    db = SessionLocal()
    try:
        # Provision Camera 1
        c1 = db.query(CameraModel).filter(CameraModel.camera_id == settings.CAMERA_1_ID).first()
        if not c1:
            db.add(CameraModel(
                camera_id=settings.CAMERA_1_ID,
                name=settings.CAMERA_1_NAME,
                rtsp_url=settings.CAMERA_1_SOURCE,
                location="North Border Sector 4",
                status="ACTIVE"
            ))
            print(f"  ✅ Provisioned Camera 1: {settings.CAMERA_1_ID} ({settings.CAMERA_1_NAME})")

        # Provision Camera 2
        c2 = db.query(CameraModel).filter(CameraModel.camera_id == settings.CAMERA_2_ID).first()
        if not c2:
            db.add(CameraModel(
                camera_id=settings.CAMERA_2_ID,
                name=settings.CAMERA_2_NAME,
                rtsp_url=settings.CAMERA_2_SOURCE,
                location="West Post Checkpoint Office",
                status="ACTIVE"
            ))
            print(f"  ✅ Provisioned Camera 2: {settings.CAMERA_2_ID} ({settings.CAMERA_2_NAME})")

        # Provision Camera 3
        c3 = db.query(CameraModel).filter(CameraModel.camera_id == settings.CAMERA_3_ID).first()
        if not c3:
            db.add(CameraModel(
                camera_id=settings.CAMERA_3_ID,
                name=settings.CAMERA_3_NAME,
                rtsp_url=settings.CAMERA_3_SOURCE,
                location="Parking Area Outpost",
                status="ACTIVE"
            ))
            print(f"  ✅ Provisioned Camera 3: {settings.CAMERA_3_ID} ({settings.CAMERA_3_NAME})")

        db.commit()
    finally:
        db.close()

def main():
    print("=" * 70)
    print("  IBVAP - Intelligent Border Video Analytics Platform")
    print("  Master System Launcher")
    print("=" * 70)

    python_bin = root_dir / "venv" / "bin" / "python"
    sample_video = root_dir / "data" / "videos" / "sample.mp4"

    if not python_bin.exists():
        print(f"❌ Virtual environment not found at {python_bin}. Please create ./venv first.")
        sys.exit(1)

    if not sample_video.exists():
        print(f"⚠️  Sample video missing. Generating synthetic sample video...")
        subprocess.run([str(python_bin), "scripts/create_sample_video.py"], check=True)

    print("\n📦 Verifying database & provisioning CCTV cameras...")
    provision_default_cameras()

    print("\n🚀 Starting IBVAP Backend Server (Uvicorn on http://0.0.0.0:8000)...")
    backend_proc = subprocess.Popen([
        str(python_bin), "-m", "uvicorn", "backend.app.main:app",
        "--host", "0.0.0.0", "--port", "8000", "--log-level", "info"
    ])

    time.sleep(2)

    print("\n🚀 Starting Frontend Web Dashboard (Vite on http://localhost:3000)...")
    frontend_proc = subprocess.Popen(["npm", "--prefix", "frontend", "run", "dev"])

    print("\n" + "=" * 70)
    print("  ✅ IBVAP System Services Running Successfully!")
    print("  • Backend API & Docs:   http://localhost:8000/docs")
    print("  • Live WebSocket URL:   ws://localhost:8000/ws/live")
    print("  • Surveillance Dashboard: http://localhost:3000")
    print("=" * 70)
    print("Press Ctrl+C to stop all services.\n")

    def signal_handler(sig, frame):
        print("\n\nShutting down IBVAP platform services...")
        backend_proc.terminate()
        frontend_proc.terminate()
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)

    try:
        backend_proc.wait()
        frontend_proc.wait()
    except KeyboardInterrupt:
        signal_handler(None, None)

if __name__ == "__main__":
    main()
