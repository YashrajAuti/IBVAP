#!/usr/bin/env python3
"""
Multi-Camera Integration Test Suite for IBVAP.
Validates concurrent execution of Camera 1 (CAM-NORTH-01 - Vehicle Monitoring)
and Camera 2 (CAM-WEST-02 - Crowd Monitoring).
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

def test_multi_camera_pipeline():
    print("=" * 70)
    print("  IBVAP MULTI-CAMERA INTEGRATION TEST SUITE")
    print("=" * 70)

    c1_source = settings.CAMERA_1_SOURCE
    c2_source = settings.CAMERA_2_SOURCE

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

    detector = ObjectDetector(conf_threshold=0.25)
    tracker1 = ObjectTracker()
    tracker2 = ObjectTracker()
    zone_mgr2 = ZoneManager()

    poly = PolygonZone(name="RESTRICTED_OFFICE_A", polygon_pts=[(0, 0), (600, 0), (600, 400), (0, 400)])
    zone_mgr2.add_zone(poly)

    print("\n⚡ Running concurrent multi-camera inference test (30 frames)...")
    start_t = time.time()

    c1_tracks_total = 0
    c2_tracks_total = 0
    c2_intrusions_total = 0

    for i in range(30):
        # Process Camera 1 Frame
        f1 = stream1.read_frame()
        if f1 is not None:
            det1 = detector.detect(f1.frame)
            tr1 = tracker1.update(det1.detections, f1.frame, f1.timestamp, f1.frame_idx)
            c1_tracks_total += len(tr1.tracks)

        # Process Camera 2 Frame
        f2 = stream2.read_frame()
        if f2 is not None:
            det2 = detector.detect(f2.frame)
            tr2 = tracker2.update(det2.detections, f2.frame, f2.timestamp, f2.frame_idx)
            c2_tracks_total += len(tr2.tracks)

            res2 = zone_mgr2.process_frame(tr2)
            c2_intrusions_total += len(res2.events)

    elapsed = time.time() - start_t
    total_processed_frames = 60
    fps = round(total_processed_frames / elapsed, 1)

    print("\n" + "=" * 70)
    print("  TEST RESULTS SUMMARY")
    print("=" * 70)
    print(f"  • Total Multi-Camera Frames Processed: {total_processed_frames}")
    print(f"  • Concurrent Multi-Camera FPS:         {fps} FPS")
    print(f"  • Camera 1 (CAM-NORTH-01) Tracks Recorded:  {c1_tracks_total}")
    print(f"  • Camera 2 (CAM-WEST-02) Tracks Recorded:   {c2_tracks_total}")
    print(f"  • Camera 2 Spatial Intrusions Detected: {c2_intrusions_total}")
    print("=" * 70)

    stream1.release()
    stream2.release()

    assert c1_tracks_total > 0, "Camera 1 produced 0 tracks!"
    assert c2_tracks_total > 0, "Camera 2 produced 0 tracks!"
    print("\n✅ MULTI-CAMERA INTEGRATION TEST PASSED SUCCESSFULLY!\n")

if __name__ == "__main__":
    test_multi_camera_pipeline()
