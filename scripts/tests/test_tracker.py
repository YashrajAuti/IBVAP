#!/usr/bin/env python3
"""
IBVAP - Phase 4 ByteTrack Object Tracking Verification Script
Integrates VideoStreamManager (Phase 2) -> ObjectDetector (Phase 3) -> ObjectTracker (Phase 4).
Processes data/videos/sample.mp4, assigns persistent Track IDs, draws trajectory trails,
saves output_tracking.mp4, and reports tracking performance.
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
from backend.app.core.logging import setup_logging

def test_tracker():
    setup_logging()

    sample_video_path = root_dir / "data" / "videos" / "sample.mp4"
    output_video_path = root_dir / "data" / "videos" / "generated" / "output_tracking.mp4"

    if not sample_video_path.exists():
        print(f"❌ Sample video missing at {sample_video_path}. Run scripts/create_sample_video.py first.")
        sys.exit(1)

    print("\n" + "=" * 60)
    print(" Testing IBVAP Phase 4: ByteTrack Multi-Object Tracking")
    print("=" * 60)

    detector = ObjectDetector()
    tracker = ObjectTracker(max_trajectory_points=30, frame_rate=30)

    print(f"  ✅ Device in use:  {detector.device.upper()}")
    print(f"  ✅ Model Path:      {detector.model_path}")
    print(f"  ✅ Tracker Engine:  ByteTrack (max trajectory: {tracker.max_trajectory_points} pts)")

    total_frames = 0
    unique_track_ids = set()
    track_class_map = {}
    writer = None

    start_total_time = time.perf_counter()

    with VideoStreamManager(source=str(sample_video_path), camera_id="CAM-TEST", target_fps=None) as manager:
        for payload in manager.stream():
            total_frames += 1

            # 1. Run YOLO detection
            det_result = detector.detect(payload.frame)

            # 2. Run ByteTrack tracking
            track_result = tracker.update(
                detections=det_result.detections,
                frame=payload.frame,
                timestamp=payload.timestamp,
                frame_idx=payload.frame_idx
            )

            # Collect metrics
            for trk in track_result.tracks:
                unique_track_ids.add(trk.track_id)
                track_class_map[trk.track_id] = trk.class_name

            # Setup VideoWriter for tracking output video
            if writer is None:
                fourcc = cv2.VideoWriter_fourcc(*'mp4v')
                writer = cv2.VideoWriter(
                    str(output_video_path),
                    fourcc,
                    30.0,
                    (payload.width, payload.height)
                )

            writer.write(track_result.annotated_frame)

            if total_frames % 60 == 0:
                print(
                    f"  Progress: {total_frames} frames | "
                    f"Active Tracks: {track_result.active_track_count} | "
                    f"Unique Track IDs So Far: {len(unique_track_ids)}"
                )

    if writer:
        writer.release()

    total_time_sec = time.perf_counter() - start_total_time
    fps = total_frames / max(0.001, total_time_sec)

    # Class breakdown by Track ID
    class_track_counts = {}
    for t_id, c_name in track_class_map.items():
        class_track_counts[c_name] = class_track_counts.get(c_name, 0) + 1

    print("\n" + "=" * 60)
    print(" PHASE 4 TRACKING TEST RESULTS SUMMARY")
    print("=" * 60)
    print(f"  • Total Frames Processed: {total_frames}")
    print(f"  • End-to-End Pipeline FPS:{fps:.1f} FPS")
    print(f"  • Unique Track IDs:       {len(unique_track_ids)}")
    print(f"  • Track IDs by Class:     {class_track_counts}")
    print(f"  • Sample Track IDs:       {sorted(list(unique_track_ids))[:10]}")
    print(f"  • Output Video Saved:     {output_video_path}")
    print("=" * 60 + "\n")

    # Assertions
    assert total_frames > 0, "Frames must be processed"
    assert output_video_path.exists(), "Output tracking video must exist"
    print("✅ All Phase 4 ByteTrack checks passed successfully!")

if __name__ == "__main__":
    test_tracker()
