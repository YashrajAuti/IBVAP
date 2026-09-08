#!/usr/bin/env python3
"""
IBVAP - Phase 5 & 6 Virtual Fence & Line Crossing Verification Script
Pipeline: VideoStreamManager -> ObjectDetector -> ObjectTracker -> ZoneManager -> Output Video
Verifies polygon containment (ENTRY/EXIT) and directional line crossing (A->B / B->A).
Saves output video to data/videos/output_zones.mp4.
"""

import sys
import time
from pathlib import Path
import cv2

# Add workspace root to sys.path
root_dir = Path(__file__).resolve().parent.parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from ai.pipelines.stream_manager import VideoStreamManager
from ai.detection.detector import ObjectDetector
from ai.tracking.tracker import ObjectTracker
from ai.zones.zone_manager import ZoneManager, PolygonZone, VirtualLine, SpatialEvent
from backend.app.core.logging import setup_logging

def test_spatial_unit_logic():
    """Unit test for Polygon Zone & Virtual Line crossing math."""
    print("  Testing Unit Logic...")
    
    # 1. Test Polygon Containment
    poly = PolygonZone("UNIT_ZONE", [(100, 100), (200, 100), (200, 200), (100, 200)])
    assert poly.contains((150, 150)) == True, "Point (150, 150) must be inside polygon"
    assert poly.contains((50, 50)) == False, "Point (50, 50) must be outside polygon"

    # 2. Test Line Crossing Direction (A -> B vs B -> A)
    line = VirtualLine("UNIT_LINE", pt1=(100, 0), pt2=(100, 200)) # Line at x=100 from y=0 to y=200
    
    # Crossing from left (x=50) to right (x=150)
    is_crossed, direction1 = line.check_crossing(prev_pt=(50, 100), curr_pt=(150, 100))
    assert is_crossed == True, "Line must detect intersection"
    assert direction1 == "A_to_B", f"Expected A_to_B, got {direction1}"

    # Crossing from right (x=150) to left (x=50)
    is_crossed, direction2 = line.check_crossing(prev_pt=(150, 100), curr_pt=(50, 100))
    assert is_crossed == True, "Line must detect intersection"
    assert direction2 == "B_to_A", f"Expected B_to_A, got {direction2}"

    # Non-crossing movement (x=50 to x=80)
    is_crossed, _ = line.check_crossing(prev_pt=(50, 100), curr_pt=(80, 100))
    assert is_crossed == False, "Non-intersecting movement must return False"

    print("  ✅ Unit logic checks passed (Polygon Containment + Directional Line Crossing).")

def test_zones():
    setup_logging()

    sample_video_path = root_dir / "data" / "videos" / "sample.mp4"
    output_video_path = root_dir / "data" / "videos" / "generated" / "output_zones.mp4"

    if not sample_video_path.exists():
        print(f"❌ Sample video missing at {sample_video_path}. Run scripts/create_sample_video.py first.")
        sys.exit(1)

    print("\n" + "=" * 60)
    print(" Testing IBVAP Phase 5 & 6: Virtual Fence & Line Crossing")
    print("=" * 60)

    # Execute unit test first
    test_spatial_unit_logic()

    # 1. Initialize Pipeline Components
    detector = ObjectDetector()
    tracker = ObjectTracker(max_trajectory_points=30, frame_rate=30)

    # Define Restricted Polygon Zone around active traffic area
    restricted_polygon = PolygonZone(
        name="RESTRICTED_ZONE_ALPHA",
        polygon_pts=[(300, 250), (500, 250), (500, 400), (300, 400)]
    )

    # Define Virtual Crossing Line (A -> B) across active traffic lane
    crossing_line = VirtualLine(
        name="CHECKPOINT_ALPHA",
        pt1=(350, 100),
        pt2=(350, 650)
    )

    zone_manager = ZoneManager(zones=[restricted_polygon], lines=[crossing_line], line_cooldown_sec=2.0)

    print(f"  ✅ Device in use:  {detector.device.upper()}")
    print(f"  ✅ Zone Defined:   {restricted_polygon.name} ({len(restricted_polygon.polygon_pts)} vertices)")
    print(f"  ✅ Line Defined:   {crossing_line.name} (A: {crossing_line.pt1} -> B: {crossing_line.pt2})")

    total_frames = 0
    unique_track_ids = set()
    all_events: list[SpatialEvent] = []
    writer = None

    start_total_time = time.perf_counter()

    with VideoStreamManager(source=str(sample_video_path), camera_id="CAM-TEST", target_fps=None) as manager:
        for payload in manager.stream():
            total_frames += 1

            # Step 1: YOLO Detection
            det_result = detector.detect(payload.frame)

            # Step 2: ByteTrack Multi-Object Tracking
            track_result = tracker.update(
                detections=det_result.detections,
                frame=payload.frame,
                timestamp=payload.timestamp,
                frame_idx=payload.frame_idx
            )

            # Step 3: Spatial Zone & Line Analysis
            zone_result = zone_manager.process_frame(track_result)

            # Record events
            if zone_result.events:
                all_events.extend(zone_result.events)

            for trk in track_result.tracks:
                unique_track_ids.add(trk.track_id)

            # Video Writer setup
            if writer is None:
                fourcc = cv2.VideoWriter_fourcc(*'mp4v')
                writer = cv2.VideoWriter(
                    str(output_video_path),
                    fourcc,
                    30.0,
                    (payload.width, payload.height)
                )

            writer.write(zone_result.annotated_frame)

            if total_frames % 60 == 0:
                print(
                    f"  Progress: {total_frames} frames | "
                    f"Active Tracks: {track_result.active_track_count} | "
                    f"Total Events Triggered: {len(all_events)}"
                )

    if writer:
        writer.release()

    total_time_sec = time.perf_counter() - start_total_time
    fps = total_frames / max(0.001, total_time_sec)

    # Event metrics breakdown
    entries = [e for e in all_events if e.event_type == "RESTRICTED_ZONE_ENTRY"]
    exits = [e for e in all_events if e.event_type == "RESTRICTED_ZONE_EXIT"]
    line_crossings = [e for e in all_events if e.event_type == "LINE_CROSSING"]
    directions = [e.direction for e in line_crossings if e.direction]

    print("\n" + "=" * 60)
    print(" PHASE 5 & 6 SPATIAL TEST RESULTS SUMMARY")
    print("=" * 60)
    print(f"  • Total Frames Processed: {total_frames}")
    print(f"  • End-to-End Pipeline FPS:{fps:.1f} FPS")
    print(f"  • Unique Track IDs:       {len(unique_track_ids)}")
    print(f"  • Total Spatial Events:   {len(all_events)}")
    print(f"  • Zone Entries (ENTRY):   {len(entries)}")
    print(f"  • Zone Exits (EXIT):      {len(exits)}")
    print(f"  • Line Crossings (LINE):  {len(line_crossings)}")
    print(f"  • Crossing Directions:    {list(set(directions))}")
    print(f"  • Output Video Saved:     {output_video_path}")
    print("=" * 60 + "\n")

    # Assertions
    assert total_frames > 0, "Frames must be processed"
    assert output_video_path.exists(), "Output video must be saved"
    print("✅ All Phase 5 & 6 Virtual Fence & Line Crossing checks passed!")

if __name__ == "__main__":
    test_zones()
