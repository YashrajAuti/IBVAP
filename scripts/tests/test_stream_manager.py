#!/usr/bin/env python3
"""
IBVAP - Phase 2 VideoStreamManager Verification Script
Tests reading from local MP4 video file using VideoStreamManager generator,
validating resolution, frame count, timestamps, and graceful shutdown.
"""

import os
import sys
from pathlib import Path

# Add workspace root to sys.path
root_dir = Path(__file__).resolve().parent.parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from ai.pipelines.stream_manager import VideoStreamManager, FrameData
from backend.app.core.logging import setup_logging

def test_stream_manager():
    setup_logging()
    sample_video_path = root_dir / "data" / "videos" / "sample.mp4"

    if not sample_video_path.exists():
        print(f"❌ Sample video missing at {sample_video_path}. Run scripts/create_sample_video.py first.")
        sys.exit(1)

    print("\n" + "=" * 60)
    print(" Testing VideoStreamManager")
    print("=" * 60)

    processed_frames = 0
    start_time = None
    last_timestamp = 0.0

    with VideoStreamManager(source=str(sample_video_path), camera_id="CAM-TEST", target_fps=30) as manager:
        for frame_payload in manager.stream():
            processed_frames += 1
            
            if processed_frames == 1:
                start_time = frame_payload.timestamp
                print(f"  ✅ First Frame Read: #{frame_payload.frame_idx}")
                print(f"  ✅ Frame Shape: {frame_payload.frame.shape} (Width: {frame_payload.width}, Height: {frame_payload.height})")
                print(f"  ✅ Camera ID: {frame_payload.camera_id}")

            assert frame_payload.frame is not None, "Frame array must not be None"
            assert frame_payload.width == 1280, f"Expected width 1280, got {frame_payload.width}"
            assert frame_payload.height == 720, f"Expected height 720, got {frame_payload.height}"
            assert frame_payload.timestamp >= last_timestamp, "Timestamps must be monotonically non-decreasing"

            last_timestamp = frame_payload.timestamp

            if processed_frames % 60 == 0:
                print(f"  Status: Processed {processed_frames} frames | Measured FPS: {frame_payload.fps}")

    print("\n" + "=" * 60)
    print(f" ✅ Test Complete! Processed {processed_frames} total frames cleanly.")
    print("=" * 60 + "\n")

if __name__ == "__main__":
    test_stream_manager()
