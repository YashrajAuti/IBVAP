import json
import base64
import asyncio
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
import cv2
import numpy as np
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.app.core.config import settings
from backend.app.core.logging import logger
from ai.pipelines.stream_manager import VideoStreamManager
from ai.detection.detector import ObjectDetector
from ai.tracking.tracker import ObjectTracker
from ai.zones.zone_manager import ZoneManager, PolygonZone, VirtualLine
from ai.ocr.ocr_engine import OCREngine

class ConnectionManager:
    """
    WebSocket Connection Manager.
    Maintains active client connections and broadcasts live video frame payloads,
    tracking data, spatial events, and ANPR plate detections in real-time.
    """
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Total active clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Remaining active clients: {len(self.active_connections)}")

    async def broadcast(self, message: Dict[str, Any]):
        """Broadcasts JSON payload to all connected clients concurrently."""
        if not self.active_connections:
            return

        payload = json.dumps(message)
        disconnected_clients = []

        for connection in self.active_connections:
            try:
                await connection.send_text(payload)
            except Exception as e:
                logger.debug(f"Failed to send WS message: {e}")
                disconnected_clients.append(connection)

        for client in disconnected_clients:
            self.disconnect(client)

# Global Manager Instance
ws_manager = ConnectionManager()

router = APIRouter(tags=["Real-time WebSockets"])

@router.websocket("/ws/live")
async def websocket_live_endpoint(websocket: WebSocket):
    """
    Real-time WebSocket endpoint for streaming live video analytics, bounding boxes,
    spatial fence intrusions, line crossings, and ANPR plate recognition events.
    """
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                client_msg = json.loads(data)
                action = client_msg.get("action")
                if action == "ping":
                    await websocket.send_json({"type": "pong", "timestamp": client_msg.get("timestamp")})
            except Exception:
                pass
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket session error: {e}")
        ws_manager.disconnect(websocket)

async def run_camera_stream_worker(camera_id: str, video_source: str, is_vehicle_cam: bool = False, is_parking_cam: bool = False):
    """
    Background worker loop for a single camera stream.
    Reads frames from VideoStreamManager, runs YOLO + ByteTrack + ANPR/Zones,
    calculates real tracking & spatial metrics, encodes video frame to JPEG Base64,
    and broadcasts via WebSockets.
    """
    logger.info(f"🚀 Starting background AI stream worker for {camera_id} ({video_source})...")
    
    stream_mgr = VideoStreamManager(source=video_source, camera_id=camera_id, loop=True)
    if not stream_mgr.connect():
        logger.error(f"Failed to connect stream worker for {camera_id}")
        return

    # Use conf_threshold=0.55 for parking camera to filter out static tree false positives
    conf_thresh = 0.55 if is_parking_cam else 0.25
    detector = ObjectDetector(conf_threshold=conf_thresh)
    tracker = ObjectTracker(max_trajectory_points=30)
    zone_mgr = ZoneManager()
    ocr_engine = OCREngine(min_confidence=0.5) if is_vehicle_cam else None

    parking_poly = None
    # Configure Camera Spatial Rules
    if is_vehicle_cam:
        # Gate Checkpoint Virtual Crossing Line for Camera 1
        gate_line = VirtualLine(
            name="GATE_CHECKPOINT_LINE_A",
            pt1=(350, 100),
            pt2=(350, 800)
        )
        zone_mgr.add_line(gate_line)
    elif is_parking_cam:
        # Restricted Zone for Camera 3 (Tightly bounded near vehicle)
        parking_poly = PolygonZone(
            name="RESTRICTED_ZONE_A",
            polygon_pts=[(1000, 720), (1280, 720), (1280, 1080), (1000, 1080)]
        )
        zone_mgr.add_zone(parking_poly)
    else:
        # Office Camera 2 (Crowd Monitoring): No restricted zones, strictly track people
        pass


    # Cumulative metric counters isolated to this camera instance
    zone_intrusions_count = 0
    line_crossings_count = 0
    unique_recognized_plates = set()

    try:
        while True:
            # Throttle processing loop (~25 FPS)
            await asyncio.sleep(0.038)

            if not ws_manager.active_connections:
                await asyncio.sleep(0.2)
                continue

            frame_data = stream_mgr.read_frame()
            if frame_data is None:
                continue

            # 1. YOLO Object Detection (conf=0.55 for Camera 3, conf=0.25 for Cameras 1&2)
            frame_det = detector.detect(frame_data.frame, conf_threshold=conf_thresh)

            # 2. ByteTrack Tracking
            tracked_payload = tracker.update(
                detections=frame_det.detections,
                frame=frame_data.frame,
                timestamp=frame_data.timestamp,
                frame_idx=frame_data.frame_idx
            )

            active_tracks_data = []
            for track in tracked_payload.tracks:
                plate_txt = None
                if is_vehicle_cam and ocr_engine and track.class_name in ['car', 'bus', 'truck', 'motorcycle']:
                    if frame_data.frame_idx % 15 == 0:
                        plate_txt, _ = ocr_engine.process_vehicle_track(
                            frame=frame_data.frame,
                            bbox=track.bbox,
                            track_id=track.track_id,
                            object_class=track.class_name,
                            timestamp=frame_data.timestamp
                        )
                        if plate_txt:
                            unique_recognized_plates.add(plate_txt)
                
                track_dict = {
                    "id": track.track_id,
                    "class_name": track.class_name,
                    "confidence": track.confidence,
                    "bbox": track.bbox,
                    "bottom_center": track.bottom_center
                }
                if plate_txt:
                    track_dict["plate"] = plate_txt

                active_tracks_data.append(track_dict)

            # Check if any person is currently inside the restricted zone for Camera 3
            is_person_in_restricted_zone = False
            if is_parking_cam and parking_poly:
                for track in tracked_payload.tracks:
                    if track.class_name == 'person' and parking_poly.contains(track.bottom_center):
                        is_person_in_restricted_zone = True
                        break

            # 3. Spatial Zone & Intrusions Evaluation
            zone_res = zone_mgr.process_frame(tracked_payload)
            for spatial_evt in zone_res.events:
                evt_type = spatial_evt.event_type

                if is_parking_cam and spatial_evt.event_type == "RESTRICTED_ZONE_ENTRY":
                    evt_type = "SUSPICIOUS_VEHICLE_ACCESS"
                    zone_intrusions_count += 1
                    logger.warning(f"🚨 [SUSPICIOUS VEHICLE ACCESS] PERSON #{spatial_evt.track_id} entered car-door restricted zone")
                elif spatial_evt.event_type == "RESTRICTED_ZONE_ENTRY":
                    zone_intrusions_count += 1
                elif spatial_evt.event_type == "LINE_CROSSING":
                    line_crossings_count += 1

                evt_payload = {
                    "type": "spatial_event",
                    "event_id": spatial_evt.event_id,
                    "event_type": evt_type,
                    "camera_id": camera_id,
                    "track_id": spatial_evt.track_id,
                    "object_type": spatial_evt.object_class,
                    "severity": "CRITICAL" if evt_type in ["RESTRICTED_ZONE_ENTRY", "SUSPICIOUS_VEHICLE_ACCESS"] else "INFO",
                    "timestamp": spatial_evt.timestamp,
                    "alarm_active": is_person_in_restricted_zone if is_parking_cam else False,
                    "iso_timestamp": asyncio.get_event_loop().time()
                }
                await ws_manager.broadcast(evt_payload)

            # 4. Calculate Current Frame Real Active Tracking Metrics
            active_tracks = tracked_payload.tracks
            active_track_count = len(active_tracks)
            person_count = sum(1 for t in active_tracks if t.class_name == 'person')
            vehicle_count = sum(1 for t in active_tracks if t.class_name in ['car', 'motorcycle', 'bus', 'truck'])

            # 5. Encode Video Frame to JPEG Base64 (75% quality)
            resized_frame = cv2.resize(frame_data.frame, (960, 540))
            success, encoded_img = cv2.imencode(".jpg", resized_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 75])
            
            frame_b64 = ""
            if success:
                frame_b64 = base64.b64encode(encoded_img.tobytes()).decode("utf-8")

            # 6. Broadcast Frame Payload with Real AI Metrics & Alarm State
            frame_msg = {
                "type": "frame_update",
                "camera_id": camera_id,
                "frame_idx": frame_data.frame_idx,
                "timestamp": frame_data.timestamp,
                "frame_width": frame_data.width,
                "frame_height": frame_data.height,
                "frame_b64": frame_b64,
                "active_tracks": active_tracks_data,
                "alarm_active": is_person_in_restricted_zone if is_parking_cam else False,
                "stats": {
                    "active_track_count": active_track_count,
                    "person_count": person_count,
                    "vehicle_count": vehicle_count,
                    "zone_intrusions": zone_intrusions_count,
                    "line_crossings": line_crossings_count,
                    "anpr_hits": len(unique_recognized_plates)
                }
            }
            await ws_manager.broadcast(frame_msg)

    except asyncio.CancelledError:
        logger.info(f"Stopping stream worker for {camera_id}...")
    except Exception as e:
        logger.error(f"Error in stream worker {camera_id}: {e}")
    finally:
        stream_mgr.release()

async def start_all_camera_workers():
    """Starts background streaming workers dynamically for all registered cameras in DB."""
    from backend.app.database.session import SessionLocal
    from backend.app.models.db_models import CameraModel

    db = SessionLocal()
    cams = []
    try:
        cams = db.query(CameraModel).all()
    except Exception as e:
        logger.error(f"Error loading cameras for stream workers: {e}")
    finally:
        db.close()

    tasks = []
    if cams:
        for cam in cams:
            is_veh = ("NORTH" in cam.camera_id or "GATE" in cam.camera_id or "VEHICLE" in cam.camera_id)
            is_park = ("PARKING" in cam.camera_id)
            tasks.append(asyncio.create_task(run_camera_stream_worker(cam.camera_id, cam.rtsp_url, is_vehicle_cam=is_veh, is_parking_cam=is_park)))
    else:
        c1_id, c1_source = settings.CAMERA_1_ID, settings.CAMERA_1_SOURCE
        c2_id, c2_source = settings.CAMERA_2_ID, settings.CAMERA_2_SOURCE
        c3_id, c3_source = settings.CAMERA_3_ID, settings.CAMERA_3_SOURCE

        tasks.append(asyncio.create_task(run_camera_stream_worker(c1_id, c1_source, is_vehicle_cam=True, is_parking_cam=False)))
        tasks.append(asyncio.create_task(run_camera_stream_worker(c2_id, c2_source, is_vehicle_cam=False, is_parking_cam=False)))
        tasks.append(asyncio.create_task(run_camera_stream_worker(c3_id, c3_source, is_vehicle_cam=False, is_parking_cam=True)))

    if tasks:
        await asyncio.gather(*tasks)
