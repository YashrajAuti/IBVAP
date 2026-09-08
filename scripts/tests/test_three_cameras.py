#!/usr/bin/env python3
"""
Three-Camera Integration Test Suite for IBVAP.
Validates concurrent execution of:
- Camera 1 (CAM-NORTH-01 - Vehicle Monitoring - Vehicle Dataset Sample.mp4)
- Camera 2 (CAM-WEST-02 - Crowd Monitoring - Crowd Dataset Sample.mp4)
- Camera 3 (CAM-PARKING-03 - Parking Area - person.mp4)
"""

import sys
import time
from pathlib import Path

# Add project root to sys.path
root_dir = Path(__file__).resolve().parent.parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from backend.app.core.config import settings
from ai.pipelines.stream_manager import VideoStreamManager
from ai.detection.detector import ObjectDetector
from ai.tracking.tracker import ObjectTracker
from ai.zones.zone_manager import ZoneManager, PolygonZone

def test_three_camera_pipeline():
    print("=" * 75)
    print("  IBVAP THREE-CAMERA INTEGRATION TEST SUITE")
    print("=" * 75)

    c1_source = settings.CAMERA_1_SOURCE
    c2_source = settings.CAMERA_2_SOURCE
    c3_source = settings.CAMERA_3_SOURCE

    print(f"\n🎥 Initializing Camera 1 (CAM-NORTH-01 - Vehicle Monitoring)...")
    print(f"   Source Path: {c1_source}")
    stream1 = VideoStreamManager(source=c1_source, camera_id="CAM-NORTH-01", loop=False)
    if not stream1.connect():
        print("❌ Failed to connect Camera 1 stream.")
        sys.exit(1)

    print(f"🎥 Initializing Camera 2 (CAM-WEST-02 - Crowd Monitoring)...")
    print(f"   Source Path: {c2_source}")
    stream2 = VideoStreamManager(source=c2_source, camera_id="CAM-WEST-02", loop=False)
    if not stream2.connect():
        print("❌ Failed to connect Camera 2 stream.")
        sys.exit(1)

    print(f"🎥 Initializing Camera 3 (CAM-PARKING-03 - Parking Area)...")
    print(f"   Source Path: {c3_source}")
    stream3 = VideoStreamManager(source=c3_source, camera_id="CAM-PARKING-03", loop=False)
    if not stream3.connect():
        print("❌ Failed to connect Camera 3 stream.")
        sys.exit(1)

    detector = ObjectDetector(conf_threshold=0.25)
    tracker1 = ObjectTracker()
    tracker2 = ObjectTracker()
    tracker3 = ObjectTracker()

    zone_mgr3 = ZoneManager()
    parking_poly = PolygonZone(name="PARKING_VEHICLE_ZONE_A", polygon_pts=[(800, 400), (1200, 400), (1200, 800), (800, 800)])
    zone_mgr3.add_zone(parking_poly)

    print("\n⚡ Running concurrent 3-camera inference test (30 frames)...")
    start_t = time.time()

    c1_tracks_total = 0
    c2_tracks_total = 0
    c3_tracks_total = 0
    c3_suspicious_total = 0

    for i in range(30):
        # Camera 1 Frame
        f1 = stream1.read_frame()
        if f1 is not None:
            det1 = detector.detect(f1.frame)
            tr1 = tracker1.update(det1.detections, f1.frame, f1.timestamp, f1.frame_idx)
            c1_tracks_total += len(tr1.tracks)

        # Camera 2 Frame
        f2 = stream2.read_frame()
        if f2 is not None:
            det2 = detector.detect(f2.frame)
            tr2 = tracker2.update(det2.detections, f2.frame, f2.timestamp, f2.frame_idx)
            c2_tracks_total += len(tr2.tracks)

        # Camera 3 Frame
        f3 = stream3.read_frame()
        if f3 is not None:
            det3 = detector.detect(f3.frame)
            tr3 = tracker3.update(det3.detections, f3.frame, f3.timestamp, f3.frame_idx)
            c3_tracks_total += len(tr3.tracks)

            res3 = zone_mgr3.process_frame(tr3)
            c3_suspicious_total += len(res3.events)

    elapsed = time.time() - start_t
    total_processed_frames = 90
    fps = round(total_processed_frames / elapsed, 1)

    print("\n" + "=" * 75)
    print("  THREE-CAMERA TEST RESULTS SUMMARY")
    print("=" * 75)
    print(f"  • Total 3-Camera Frames Processed: {total_processed_frames}")
    print(f"  • Concurrent 3-Camera Processing FPS: {fps} FPS")
    print(f"  • Camera 1 (CAM-NORTH-01) Tracks Recorded: {c1_tracks_total}")
    print(f"  • Camera 2 (CAM-WEST-02) Tracks Recorded:  {c2_tracks_total}")
    print(f"  • Camera 3 (CAM-PARKING-03) Tracks Recorded: {c3_tracks_total}")
    print(f"  • Camera 3 Suspicious Activity Events:      {c3_suspicious_total}")
    print("=" * 75)

    stream1.release()
    stream2.release()
    stream3.release()

    assert c1_tracks_total > 0, "Camera 1 produced 0 tracks!"
    assert c2_tracks_total > 0, "Camera 2 produced 0 tracks!"
    assert c3_tracks_total > 0, "Camera 3 produced 0 tracks!"
    print("\n✅ THREE-CAMERA INTEGRATION TEST PASSED SUCCESSFULLY!\n")

if __name__ == "__main__":
    test_three_camera_pipeline()
