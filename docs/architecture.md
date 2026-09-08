# IBVAP Architecture & System Design Document

**IBVAP — Intelligent Border Video Analytics Platform** is a software platform designed to convert existing IP-based CCTV cameras into an intelligent surveillance system via RTSP stream processing, YOLO object detection, ByteTrack multi-object tracking, Shapely-based virtual fence & line crossing analysis, EasyOCR Automatic Number Plate Recognition (ANPR), and real-time WebSockets streaming.

---

## 1. Modular High-Level System Architecture

```mermaid
flowcard
[IP CCTV Cameras / RTSP Video] --> StreamManager[VideoStreamManager]
StreamManager --> Detector[YOLOv8 Object Detector (MPS/CUDA/CPU)]
Detector --> Tracker[ByteTrack Multi-Object Tracker]
Tracker --> Spatial[ZoneManager (Polygon & Line Analysis)]
Tracker --> ANPR[ANPR Detector & EasyOCR Engine (Track ID Cache)]
Spatial --> EventEngine[Centralized Event Engine]
ANPR --> EventEngine
EventEngine --> SQLite[SQLite Database (data/ibvap.db)]
EventEngine --> WS[WebSocket ConnectionManager (/ws/live)]
WS --> Frontend[React + Vite Surveillance Dashboard]
```

---

## 2. Key Modules & Responsibilities

### `ai/pipelines/stream_manager.py` — `VideoStreamManager`
- Connects to RTSP IP CCTV feeds, webcam video streams, or MP4 files via OpenCV `VideoCapture`.
- Measures real-time FPS throughput and maintains reconnection resilience for RTSP stream drops.
- Yields structured `FrameData` payloads with frame index, timestamp, and dimensions.

### `ai/detection/detector.py` — `ObjectDetector`
- Runs lightweight **YOLOv8n** model stored locally in `data/models/yolov8n.pt`.
- Automatically selects Apple Silicon **MPS (Metal Performance Shaders)** or CUDA when available.
- Detects target classes (`person`, `car`, `motorcycle`, `bus`, `truck`) and calculates bounding boxes + **bottom-center reference points**.

### `ai/tracking/tracker.py` — `ObjectTracker`
- Integrates `supervision.ByteTrack` to assign persistent **Track IDs** to detected targets.
- Maintains a 30-frame bottom-center trajectory history for each tracked object.
- Automatically purges stale trajectories when targets leave the field of view.

### `ai/zones/zone_manager.py` — `ZoneManager`
- Evaluates object trajectories against:
  - **Restricted Polygon Zones**: Uses `Shapely.Polygon.contains()` to detect `RESTRICTED_ZONE_ENTRY` and `RESTRICTED_ZONE_EXIT`.
  - **Virtual Fence Lines**: Uses 2D cross-product calculation to detect line crossing direction (`A_to_B` vs `B_to_A`).
- State machine prevents duplicate alert spamming for active tracks.

### `ai/anpr/anpr_detector.py` & `ai/ocr/ocr_engine.py` — `ANPRDetector` & `OCREngine`
- Crops vehicle ROIs and isolates license plate regions via OpenCV morphological edge filtering and CLAHE contrast enhancement.
- Runs **EasyOCR** text extraction with alphanumeric normalization (`[A-Z0-9]`).
- Implements **Track ID OCR Caching** to avoid running expensive OCR on every frame for active vehicle tracks.

### `ai/events/event_engine.py` — `EventEngine`
- Centralizes event generation into standardized JSON structures with unique `event_id`, `camera_id`, `track_id`, `severity` (`INFO`, `WARNING`, `CRITICAL`), and ISO 8601 timestamps.

### `backend/app/` — FastAPI REST API & Database
- **SQLite ORM** (`backend/app/database/session.py` & `backend/app/models/db_models.py`).
- **REST Endpoints**:
  - `GET/POST /api/v1/cameras`
  - `GET/POST /api/v1/events`
  - `GET/POST /api/v1/zones`
  - `GET/POST /api/v1/anpr`
- **Real-time WebSockets** (`/ws/live`): Broadcasts live tracking frames and spatial events.

### `frontend/` — React Surveillance Dashboard
- High-density dark-mode surveillance UI built with React 18, Vite 5, TypeScript, and Glassmorphism CSS.
- Features live camera viewport with canvas bounding box overlays, metric stat cards, real-time alert feed sidebar, and searchable ANPR plate log table.

---

## 3. Directory Layout

```
IBVAP/
├── ai/
│   ├── detection/detector.py
│   ├── tracking/tracker.py
│   ├── zones/zone_manager.py
│   ├── anpr/anpr_detector.py
│   ├── ocr/ocr_engine.py
│   ├── events/event_engine.py
│   └── pipelines/stream_manager.py
├── backend/app/
│   ├── api/v1/ (cameras.py, events.py, zones.py, anpr.py, websocket.py)
│   ├── core/ (config.py, logging.py)
│   ├── database/ (session.py)
│   ├── models/ (db_models.py)
│   ├── schemas/ (api_schemas.py)
│   └── main.py
├── frontend/
│   ├── src/ (components/, services/, App.tsx, index.css)
│   └── dist/
├── data/ (ibvap.db, models/, videos/, evidence/)
├── docs/ (architecture.md)
└── scripts/
    ├── run_ibvap.py (Master Launcher)
    ├── test_e2e_pipeline.py (E2E Test)
    ├── test_websocket_stream.py
    ├── test_backend_api.py
    └── test_*.py
```
