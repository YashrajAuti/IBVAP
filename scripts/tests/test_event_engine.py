#!/usr/bin/env python3
"""
IBVAP - Phase 7 Event Engine Verification Script
Complete AI Processing Pipeline:
VideoStreamManager -> ObjectDetector -> ObjectTracker -> ZoneManager -> EventEngine
Validates standardized SystemEvent generation, JSON serialization, subscriber callbacks, and severity levels.
"""

import sys
import time
import json
from pathlib import Path

# Add workspace root to sys.path
root_dir = Path(__file__).resolve().parent.parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from ai.pipelines.stream_manager import VideoStreamManager
from ai.detection.detector import ObjectDetector
from ai.tracking.tracker import ObjectTracker
from ai.zones.zone_manager import ZoneManager, PolygonZone, VirtualLine, SpatialEvent
from ai.events.event_engine import EventEngine, SystemEvent
from backend.app.core.logging import setup_logging

def subscriber_callback(event: SystemEvent):
    """Sample subscriber callback simulating alert manager or WebSocket pusher."""
    print(
        f"  [SUBSCRIBER RECEIVED] ID: {event.event_id} | Type: {event.event_type.upper()} | "
        f"Severity: {event.severity} | Target: {event.object_type.upper()} #{event.track_id} | ISO Time: {event.iso_timestamp}"
    )

def test_event_engine_unit_logic():
    """Unit test for EventEngine standardization, severity mapping, and subscriber notification."""
    print("  Testing EventEngine Unit Logic...")

    engine = EventEngine(camera_id="CAM-001", dedup_window_sec=1.0)
    received_events = []

    def test_cb(evt: SystemEvent):
        received_events.append(evt)

    engine.register_subscriber(test_cb)

    # Simulated Spatial Event from ZoneManager
    spatial_evt = SpatialEvent(
        event_id="evt_001",
        event_type="RESTRICTED_ZONE_ENTRY",
        track_id=17,
        object_class="person",
        zone_name="BORDER_ZONE_ALPHA",
        timestamp=time.time(),
        position=(850, 420)
    )

    sys_events = engine.process_spatial_events([spatial_evt], [], camera_id="CAM-001")

    assert len(sys_events) == 1, "Should generate 1 SystemEvent"
    evt = sys_events[0]
    assert evt.event_type == "restricted_zone_entry", "Event type should be lowercased"
    assert evt.severity == "CRITICAL", "RESTRICTED_ZONE_ENTRY severity must be CRITICAL"
    assert evt.camera_id == "CAM-001", "Camera ID must match"
    assert evt.track_id == 17, "Track ID must match"
    assert len(received_events) == 1, "Subscriber callback must receive event"
    
    # Test JSON serialization
    evt_dict = evt.to_dict()
    assert evt_dict["event_id"] == evt.event_id, "Dictionary must contain event_id"
    assert evt_dict["position"] == [850, 420], "Position must be converted to list"
    
    print("  ✅ EventEngine unit logic checks passed (Schema + Severity + Subscribers + JSON Serialization).")

def test_event_engine():
    setup_logging()

    sample_video_path = root_dir / "data" / "videos" / "sample.mp4"
    if not sample_video_path.exists():
        print(f"❌ Sample video missing at {sample_video_path}. Run scripts/create_sample_video.py first.")
        sys.exit(1)

    print("\n" + "=" * 60)
    print(" Testing IBVAP Phase 7: Centralized Event Engine")
    print("=" * 60)

    # Run unit logic verification first
    test_event_engine_unit_logic()

    # 1. Initialize Complete AI Pipeline
    detector = ObjectDetector()
    tracker = ObjectTracker(max_trajectory_points=30, frame_rate=30)
    
    restricted_polygon = PolygonZone(
        name="RESTRICTED_ZONE_ALPHA",
        polygon_pts=[(300, 250), (500, 250), (500, 400), (300, 400)]
    )
    crossing_line = VirtualLine(
        name="CHECKPOINT_ALPHA",
        pt1=(350, 100),
        pt2=(350, 650)
    )

    zone_manager = ZoneManager(zones=[restricted_polygon], lines=[crossing_line])
    event_engine = EventEngine(camera_id="CAM-001", dedup_window_sec=3.0)

    # Register subscriber callback
    event_engine.register_subscriber(subscriber_callback)

    total_frames = 0
    all_system_events: list[SystemEvent] = []

    start_total_time = time.perf_counter()

    with VideoStreamManager(source=str(sample_video_path), camera_id="CAM-001", target_fps=None) as manager:
        for payload in manager.stream():
            total_frames += 1

            # Step 1: YOLO Object Detection
            det_result = detector.detect(payload.frame)

            # Step 2: ByteTrack Multi-Object Tracking
            track_result = tracker.update(
                detections=det_result.detections,
                frame=payload.frame,
                timestamp=payload.timestamp,
                frame_idx=payload.frame_idx
            )

            # Step 3: Spatial Zone Analysis
            zone_result = zone_manager.process_frame(track_result)

            # Step 4: Centralized Event Engine Processing
            if zone_result.events:
                sys_events = event_engine.process_spatial_events(
                    spatial_events=zone_result.events,
                    tracks=track_result.tracks,
                    camera_id="CAM-001"
                )
                all_system_events.extend(sys_events)

            if total_frames % 60 == 0:
                print(f"  Progress: {total_frames} frames | Total System Events Generated: {len(all_system_events)}")

    total_time_sec = time.perf_counter() - start_total_time
    fps = total_frames / max(0.001, total_time_sec)

    print("\n" + "=" * 60)
    print(" PHASE 7 EVENT ENGINE TEST RESULTS SUMMARY")
    print("=" * 60)
    print(f"  • Total Frames Processed: {total_frames}")
    print(f"  • Pipeline Throughput:    {fps:.1f} FPS")
    print(f"  • Total System Events:    {len(event_engine.event_history)}")
    
    if all_system_events:
        sample_evt = all_system_events[0]
        json_sample = json.dumps(sample_evt.to_dict(), indent=2)
        print(f"\n  • Sample Standardized JSON Payload:\n{json_sample}")

    print("\n" + "=" * 60)
    print(" ✅ Phase 7 Event Engine verification complete!")
    print("=" * 60 + "\n")

    assert total_frames > 0, "Frames must be processed"
    assert hasattr(event_engine, "event_history"), "Event engine must maintain event history"

if __name__ == "__main__":
    test_event_engine()
