#!/usr/bin/env python3
"""
IBVAP - Phase 3 YOLO Object Detection Verification Script
Connects VideoStreamManager (Phase 2) to ObjectDetector (Phase 3).
Processes data/videos/sample.mp4, runs YOLO detection on MPS/CPU,
saves annotated output video, and reports performance metrics.
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
from backend.app.core.logging import setup_logging

def test_detector():
    setup_logging()
    
    sample_video_path = root_dir / "data" / "videos" / "sample.mp4"
    output_video_path = root_dir / "data" / "videos" / "generated" / "output_detection.mp4"

    if not sample_video_path.exists():
        print(f"❌ Sample video missing at {sample_video_path}. Run scripts/create_sample_video.py first.")
        sys.exit(1)

    print("\n" + "=" * 60)
    print(" Testing IBVAP Phase 3: YOLO Object Detection")
    print("=" * 60)

    # Initialize ObjectDetector
    detector = ObjectDetector()
    print(f"  ✅ Device in use: {detector.device.upper()}")
    print(f"  ✅ Model Path: {detector.model_path}")
    print(f"  ✅ Confidence Threshold: {detector.conf_threshold}")

    total_frames = 0
    total_detections = 0
    total_inference_ms = 0.0
    class_counts = {}
    writer = None

    start_total_time = time.perf_counter()

    with VideoStreamManager(source=str(sample_video_path), camera_id="CAM-TEST", target_fps=None) as manager:
        for payload in manager.stream():
            total_frames += 1

            # Perform object detection
            det_result = detector.detect(payload.frame)
            
            total_detections += len(det_result.detections)
            total_inference_ms += det_result.inference_time_ms

            # Track class breakdown
            for d in det_result.detections:
                class_counts[d.class_name] = class_counts.get(d.class_name, 0) + 1

            # Setup VideoWriter for annotated output
            if writer is None:
                fourcc = cv2.VideoWriter_fourcc(*'mp4v')
                writer = cv2.VideoWriter(
                    str(output_video_path),
                    fourcc,
                    30.0,
                    (payload.width, payload.height)
                )

            writer.write(det_result.annotated_frame)

            if total_frames % 60 == 0:
                avg_inf_ms = total_inference_ms / total_frames
                print(
                    f"  Progress: {total_frames} frames | "
                    f"Avg Latency: {avg_inf_ms:.1f}ms ({1000.0 / avg_inf_ms:.1f} FPS) | "
                    f"Cumulative Detections: {total_detections}"
                )

    if writer:
        writer.release()

    total_pipeline_sec = time.perf_counter() - start_total_time
    avg_inference_ms = total_inference_ms / max(1, total_frames)
    pipeline_fps = total_frames / max(0.001, total_pipeline_sec)

    print("\n" + "=" * 60)
    print(" PHASE 3 TEST RESULTS SUMMARY")
    print("=" * 60)
    print(f"  • Total Frames Processed: {total_frames}")
    print(f"  • Hardware Backend Used:  {detector.device.upper()}")
    print(f"  • Average Inference Time: {avg_inference_ms:.2f} ms / frame")
    print(f"  • Raw AI Inference FPS:   {1000.0 / max(0.1, avg_inference_ms):.1f} FPS")
    print(f"  • End-to-End Pipeline FPS:{pipeline_fps:.1f} FPS")
    print(f"  • Total Detections:       {total_detections}")
    print(f"  • Detections Breakdown:   {class_counts}")
    print(f"  • Output Video Saved:     {output_video_path}")
    print("=" * 60 + "\n")

    # Assertions for verification
    assert total_frames > 0, "Frames must be processed"
    assert output_video_path.exists(), "Output annotated video file must be saved"
    print("✅ All Phase 3 checks passed successfully!")

if __name__ == "__main__":
    test_detector()
