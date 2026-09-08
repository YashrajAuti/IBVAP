#!/usr/bin/env python3
"""
IBVAP - Phase 11 Real-time WebSockets Verification Script
Pipeline:
VideoStreamManager -> YOLO -> ByteTrack -> ZoneManager -> EventEngine -> ws_manager.broadcast() -> WS Client
Validates WebSocket client connection, bi-directional messaging, and real-time frame/event streaming.
"""

import sys
import time
import json
import asyncio
from pathlib import Path
from fastapi.testclient import TestClient

# Add workspace root to sys.path
root_dir = Path(__file__).resolve().parent.parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from backend.app.main import app
from backend.app.api.v1.websocket import ws_manager

def test_websocket_stream():
    print("\n" + "=" * 60)
    print(" Testing IBVAP Phase 11: Real-time WebSockets & Live Pipeline")
    print("=" * 60)

    with TestClient(app) as client:
        print("  1. Testing WebSocket Client Connection & Ping/Pong...")
        with client.websocket_connect("/ws/live") as websocket:
            # Send Ping
            ping_msg = {"action": "ping", "timestamp": time.time()}
            websocket.send_json(ping_msg)

            pong_response = websocket.receive_json()
            assert pong_response["type"] == "pong", f"Expected pong type, got {pong_response}"
            print("  ✅ Ping/Pong round-trip successful.")

        print("  2. Testing Live Frame & Event Broadcast over WebSocket...")
        with client.websocket_connect("/ws/live") as websocket:
            # Simulate broadcasting a live frame update from the AI Pipeline
            frame_payload = {
                "type": "frame_update",
                "camera_id": "CAM-NORTH-01",
                "frame_idx": 45,
                "timestamp": time.time(),
                "active_tracks": [
                    {
                        "id": 101,
                        "class_name": "person",
                        "confidence": 0.94,
                        "bbox": [200, 200, 250, 320],
                        "bottom_center": [225, 320]
                    },
                    {
                        "id": 105,
                        "class_name": "car",
                        "confidence": 0.96,
                        "bbox": [600, 300, 760, 390],
                        "bottom_center": [680, 390]
                    }
                ]
            }

            # Run async broadcast in background event loop
            asyncio.run(ws_manager.broadcast(frame_payload))

            received_msg = websocket.receive_json()
            assert received_msg["type"] == "frame_update", f"Unexpected WS message: {received_msg}"
            assert received_msg["camera_id"] == "CAM-NORTH-01"
            assert len(received_msg["active_tracks"]) == 2
            print("  ✅ Live frame & tracking payload broadcast verified.")

            # Simulate broadcasting a real-time Spatial Event Alert
            event_payload = {
                "type": "spatial_event",
                "event_id": f"EVT-WS-{int(time.time())}",
                "event_type": "RESTRICTED_ZONE_ENTRY",
                "camera_id": "CAM-NORTH-01",
                "track_id": 101,
                "object_type": "person",
                "severity": "CRITICAL",
                "timestamp": time.time()
            }

            asyncio.run(ws_manager.broadcast(event_payload))

            received_event = websocket.receive_json()
            assert received_event["type"] == "spatial_event", f"Unexpected WS event: {received_event}"
            assert received_event["severity"] == "CRITICAL"
            print("  ✅ Real-time spatial event alert broadcast verified.")

    print("\n" + "=" * 60)
    print(" PHASE 11 REAL-TIME WEBSOCKET TEST SUMMARY")
    print("=" * 60)
    print("  • WS Endpoint:       /ws/live")
    print("  • Manager Class:     ConnectionManager")
    print("  • Broadcast Modes:   frame_update, spatial_event")
    print("=" * 60 + "\n")
    print("✅ All Phase 11 Real-time WebSocket checks passed successfully!")

if __name__ == "__main__":
    test_websocket_stream()
