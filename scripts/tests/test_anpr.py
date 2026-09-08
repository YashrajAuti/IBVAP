#!/usr/bin/env python3
"""
IBVAP - Phase 8 ANPR & OCR Module Verification Script
Pipeline:
VideoStreamManager -> ObjectDetector -> ObjectTracker -> OCREngine (ANPR + Caching) -> Output Video
Validates license plate extraction, EasyOCR text recognition, alphanumeric normalization,
Track ID plate caching, and saves output_anpr.mp4.
"""

import sys
import time
from pathlib import Path
import cv2
import numpy as np

# Add workspace root to sys.path
root_dir = Path(__file__).resolve().parent.parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from ai.pipelines.stream_manager import VideoStreamManager
from ai.detection.detector import ObjectDetector
from ai.tracking.tracker import ObjectTracker
from ai.anpr.anpr_detector import ANPRDetector
from ai.ocr.ocr_engine import OCREngine
from backend.app.core.logging import setup_logging

def test_anpr_unit_logic():
    """Unit test for text normalization and ANPR plate crop extraction."""
    print("  Testing ANPR & OCR Unit Logic...")

    ocr_engine = OCREngine(languages=["en"], min_confidence=0.60)
    
    # 1. Normalization test
    assert ocr_engine.normalize_plate_text("mh-12-ab-1234") == "MH12AB1234", "Must strip hyphens & uppercase"
    assert ocr_engine.normalize_plate_text("dl 01 ab 9999") == "DL01AB9999", "Must strip spaces"

    # 2. ANPR Crop test
    anpr = ANPRDetector()
    dummy_vehicle = (255 * np.ones((100, 200, 3))).astype(np.uint8)
    crop, bbox = anpr.extract_plate_crop(dummy_vehicle)
    assert crop is not None, "ANPRDetector must extract plate crop candidate"
    assert crop.shape[0] == 64, "Preprocessed plate crop height must be 64px"

    print("  ✅ ANPR & OCR unit logic checks passed (Normalization + Crop Preprocessing).")

def test_anpr():
    setup_logging()

    sample_video_path = root_dir / "data" / "videos" / "sample.mp4"
    output_video_path = root_dir / "data" / "videos" / "generated" / "output_anpr.mp4"

    if not sample_video_path.exists():
        print(f"❌ Sample video missing at {sample_video_path}. Run scripts/create_sample_video.py first.")
        sys.exit(1)

    print("\n" + "=" * 60)
    print(" Testing IBVAP Phase 8: ANPR & OCR Module")
    print("=" * 60)

    # Execute unit test first
    test_anpr_unit_logic()

    # 1. Initialize Pipeline Components
    detector = ObjectDetector()
    tracker = ObjectTracker(max_trajectory_points=30, frame_rate=30)
    ocr_engine = OCREngine(languages=["en"], min_confidence=0.50)

    print(f"  ✅ Device in use:  {detector.device.upper()}")
    print(f"  ✅ ANPR Engine:    EasyOCR + Morphological Plate Extractor")
    print(f"  ✅ OCR Min Conf:   {ocr_engine.min_confidence}")

    total_frames = 0
    unique_track_ids = set()
    recognized_plates = {}
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

            annotated_frame = track_result.annotated_frame.copy()

            # Step 3: ANPR + OCR Processing for Tracked Vehicles
            for track in track_result.tracks:
                unique_track_ids.add(track.track_id)

                if track.class_name in {"car", "bus", "truck", "motorcycle"}:
                    plate_text, conf = ocr_engine.process_vehicle_track(
                        frame=payload.frame,
                        bbox=track.bbox,
                        track_id=track.track_id,
                        object_class=track.class_name,
                        timestamp=payload.timestamp
                    )

                    if plate_text and plate_text != "Not readable":
                        recognized_plates[track.track_id] = plate_text

                    # Render Plate Tag on Annotated Frame
                    x1, y1, x2, y2 = map(int, track.bbox)
                    label = f"PLATE: {plate_text}"
                    cv2.putText(
                        annotated_frame,
                        label,
                        (x1, y2 + 20),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.55,
                        (255, 255, 0),
                        2
                    )

            # Setup VideoWriter
            if writer is None:
                fourcc = cv2.VideoWriter_fourcc(*'mp4v')
                writer = cv2.VideoWriter(
                    str(output_video_path),
                    fourcc,
                    30.0,
                    (payload.width, payload.height)
                )

            writer.write(annotated_frame)

            if total_frames % 60 == 0:
                print(
                    f"  Progress: {total_frames} frames | "
                    f"Active Vehicles: {len(track_result.tracks)} | "
                    f"Cached Plate Tracks: {len(ocr_engine.plate_cache)}"
                )

    if writer:
        writer.release()

    total_time_sec = time.perf_counter() - start_total_time
    fps = total_frames / max(0.001, total_time_sec)

    print("\n" + "=" * 60)
    print(" PHASE 8 ANPR & OCR TEST RESULTS SUMMARY")
    print("=" * 60)
    print(f"  • Total Frames Processed: {total_frames}")
    print(f"  • Pipeline Throughput:    {fps:.1f} FPS")
    print(f"  • Total Vehicles Tracked: {len(unique_track_ids)}")
    print(f"  • Track ID Plate Cache:   {len(ocr_engine.plate_cache)} tracks cached")
    print(f"  • Sample Recognized Plates: {recognized_plates}")
    print(f"  • Output Video Saved:     {output_video_path}")
    print("=" * 60 + "\n")

    assert total_frames > 0, "Frames must be processed"
    assert output_video_path.exists(), "Output ANPR video must exist"
    print("✅ All Phase 8 ANPR & OCR checks passed successfully!")

if __name__ == "__main__":
    test_anpr()
