# IBVAP — Intelligent Border Video Analytics Platform

> **Smart Software Layer converting existing IP CCTV cameras into an AI-powered Border Surveillance System.**

---

## 🌟 Key Features & Capabilities

1. **RTSP IP Camera Input**: Connects to existing CCTV feeds without replacing hardware.
2. **YOLOv8 Object Detection**: Detects persons, cars, buses, trucks, and motorcycles using Apple Silicon **MPS Hardware Acceleration**.
3. **ByteTrack Multi-Object Tracking**: Assigns persistent Track IDs and tracks 30-point movement trajectories.
4. **Restricted Zone Detection**: Detects polygon zone entry and exit events (`RESTRICTED_ZONE_ENTRY`).
5. **Virtual Line Crossing**: Detects directional boundary crossings (`A_to_B` vs `B_to_A`).
6. **Automatic Number Plate Recognition (ANPR)**: Morphological plate crop extraction + EasyOCR text recognition with **Track ID Caching**.
7. **FastAPI REST API & Database**: Persists detection logs and camera configurations in SQLite (`data/ibvap.db`).
8. **Real-time WebSockets (`/ws/live`)**: Streams live tracking coordinates and alert events to clients.
9. **React Surveillance Dashboard**: Modern Glassmorphism dark-mode UI with live canvas viewport, alert sidebar, and ANPR lookup.

---

## 🚀 Quickstart & Setup

### Prerequisites
- macOS (Apple Silicon MPS hardware acceleration supported) or Linux/Windows
- Python 3.12
- Node.js & npm

### Installation & Launch

```bash
# 1. Clone repository & enter workspace
git clone <repository_url>
cd IBVAP

# 2. Setup Python Virtual Environment & Install Dependencies
python3.12 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 3. Setup & Build Frontend Dashboard
npm --prefix frontend install
npm --prefix frontend run build

# 4. Generate Synthetic Sample Video (if required)
python scripts/create_sample_video.py

# 5. Launch Full IBVAP Platform (Backend + AI + Frontend)
python scripts/run_ibvap.py
```

---

## 🌐 Access Points

| Service | Access URL | Description |
| :--- | :--- | :--- |
| **Surveillance Dashboard** | `http://localhost:3000` | React + Vite Glassmorphism Dashboard UI |
| **FastAPI REST API Docs** | `http://localhost:8000/docs` | Interactive Swagger API Documentation |
| **Live WebSocket Endpoint** | `ws://localhost:8000/ws/live` | Real-time Stream & Event Broadcast |

---

## 🧪 Verification & Test Suite

You can execute independent verification scripts for each phase:

```bash
# Test Video Stream Manager
python scripts/test_stream_manager.py

# Test YOLO Object Detector (MPS)
python scripts/test_detector.py

# Test ByteTrack Object Tracker
python scripts/test_tracker.py

# Test Virtual Fence & Line Crossing
python scripts/test_zones.py

# Test Centralized Event Engine
python scripts/test_event_engine.py

# Test ANPR & EasyOCR Integration
python scripts/test_anpr.py

# Test Backend REST API & Database
python scripts/test_backend_api.py

# Test Real-time WebSockets
python scripts/test_websocket_stream.py

# Run Full E2E Integration Suite
python scripts/test_e2e_pipeline.py
```
