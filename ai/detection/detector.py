import time
import logging
from pathlib import Path
from typing import List, Tuple, Optional
from dataclasses import dataclass

import cv2
import numpy as np
import torch
from ultralytics import YOLO

from backend.app.core.config import settings
from backend.app.core.logging import logger

# COCO Target Class Mappings for IBVAP Phase 3
# 0: person, 2: car, 3: motorcycle, 5: bus, 7: truck
TARGET_CLASSES = {
    0: "person",
    2: "car",
    3: "motorcycle",
    5: "bus",
    7: "truck",
}
TARGET_CLASS_IDS = list(TARGET_CLASSES.keys())

# Color Palette for Visualization (BGR format)
CLASS_COLORS = {
    "person": (255, 178, 50),     # Bright Cyan/Orange
    "car": (50, 220, 50),         # Lime Green
    "motorcycle": (220, 50, 220), # Magenta
    "bus": (50, 180, 220),        # Amber
    "truck": (220, 180, 50),      # Deep Teal
}

@dataclass
class DetectionResult:
    """
    Structured output for an individual detected object.
    Includes bounding box coordinates, class metadata, confidence score,
    center point, and bottom-center point (used for spatial zone calculations).
    """
    class_name: str
    class_id: int
    confidence: float
    bbox: List[float]               # [x1, y1, x2, y2]
    center: Tuple[int, int]          # (x_center, y_center)
    bottom_center: Tuple[int, int]   # (x_center, y_bottom)

@dataclass
class FrameDetections:
    """
    Payload containing all object detections for a single video frame.
    Includes the annotated visual frame and inference latency metrics.
    """
    detections: List[DetectionResult]
    annotated_frame: np.ndarray
    inference_time_ms: float
    device_used: str

class ObjectDetector:
    """
    YOLOv8 Real-Time Object Detector for IBVAP.
    Loads lightweight YOLO weights, utilizes Apple Silicon MPS / CUDA hardware
    acceleration, filters target classes, and produces structured detection output.
    """
    def __init__(self, model_name: Optional[str] = None, conf_threshold: Optional[float] = None):
        self.model_name = model_name or settings.YOLO_MODEL_NAME
        self.conf_threshold = conf_threshold if conf_threshold is not None else settings.YOLO_CONFIDENCE_THRESHOLD

        # Setup model weights directory inside data/models/
        models_dir = Path(settings.MODELS_DIR)
        models_dir.mkdir(parents=True, exist_ok=True)
        self.model_path = models_dir / self.model_name

        # Determine Hardware Device (MPS -> CUDA -> CPU)
        self.device = self._resolve_device()

        # Load YOLO Model
        logger.info(f"Loading YOLO model '{self.model_name}' on device '{self.device}'...")
        self.model = self._load_model()
        logger.info(f"YOLO model loaded successfully on '{self.device}'. Target classes: {list(TARGET_CLASSES.values())}")

    def _resolve_device(self) -> str:
        """Determines hardware acceleration backend based on config & hardware capabilities."""
        preferred = settings.PREFERRED_DEVICE.lower()
        if preferred != "auto":
            return preferred

        if torch.backends.mps.is_available():
            return "mps"
        elif torch.cuda.is_available():
            return "cuda"
        else:
            return "cpu"

    def _load_model(self) -> YOLO:
        """Loads YOLO weights from data/models/, downloading automatically if not present."""
        if not self.model_path.exists():
            logger.info(f"Model weights not found at {self.model_path}. Downloading {self.model_name}...")
            temp_model = YOLO(self.model_name)
            temp_path = Path(self.model_name)
            if temp_path.exists():
                temp_path.rename(self.model_path)

        model = YOLO(str(self.model_path))
        model.to(self.device)
        return model

    def detect(self, frame: np.ndarray, conf_threshold: Optional[float] = None) -> FrameDetections:
        """
        Performs object detection on an input BGR frame.

        Args:
            frame: OpenCV image array (BGR)
            conf_threshold: Optional override for confidence threshold

        Returns:
            FrameDetections payload containing structured detections and annotated frame.
        """
        threshold = conf_threshold if conf_threshold is not None else self.conf_threshold
        start_time = time.perf_counter()

        # Run inference filtering by target classes & confidence threshold
        results = self.model.predict(
            source=frame,
            conf=threshold,
            classes=TARGET_CLASS_IDS,
            device=self.device,
            verbose=False,
        )

        inference_time_ms = (time.perf_counter() - start_time) * 1000.0
        detections: List[DetectionResult] = []
        annotated_frame = frame.copy()

        if results and len(results) > 0:
            boxes = results[0].boxes
            if boxes is not None and len(boxes) > 0:
                for box in boxes:
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().tolist()
                    cls_id = int(box.cls[0].cpu().item())
                    conf = float(box.conf[0].cpu().item())

                    class_name = TARGET_CLASSES.get(cls_id, f"class_{cls_id}")

                    # Calculate key geometric points
                    center_x = int((x1 + x2) / 2.0)
                    center_y = int((y1 + y2) / 2.0)
                    bottom_x = center_x
                    bottom_y = int(y2)

                    det = DetectionResult(
                        class_name=class_name,
                        class_id=cls_id,
                        confidence=round(conf, 4),
                        bbox=[round(x1, 1), round(y1, 1), round(x2, 1), round(y2, 1)],
                        center=(center_x, center_y),
                        bottom_center=(bottom_x, bottom_y),
                    )
                    detections.append(det)

                    # Draw Bounding Box & Annotation Overlay
                    self._draw_detection(annotated_frame, det)

        # Draw overlay info bar (Inference MS, Device, Object Count)
        cv2.putText(
            annotated_frame,
            f"Device: {self.device.upper()} | Latency: {inference_time_ms:.1f}ms | Detections: {len(detections)}",
            (20, annotated_frame.shape[0] - 20),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (0, 255, 0),
            2,
        )

        return FrameDetections(
            detections=detections,
            annotated_frame=annotated_frame,
            inference_time_ms=round(inference_time_ms, 2),
            device_used=self.device,
        )

    def _draw_detection(self, image: np.ndarray, det: DetectionResult):
        """Draws bounding box, label tag, and bottom-center reference dot on the frame."""
        x1, y1, x2, y2 = map(int, det.bbox)
        color = CLASS_COLORS.get(det.class_name, (0, 255, 255))

        # 1. Bounding box rectangle
        cv2.rectangle(image, (x1, y1), (x2, y2), color, 2)

        # 2. Bottom-center reference dot (Used for zone containment & line crossing)
        cv2.circle(image, det.bottom_center, 5, (0, 0, 255), -1)
        cv2.circle(image, det.bottom_center, 7, (255, 255, 255), 1)

        # 3. Label tag box & text
        label = f"{det.class_name.upper()} {det.confidence:.2f}"
        (text_w, text_h), baseline = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)

        # Label background pill
        tag_y1 = max(0, y1 - text_h - 6)
        cv2.rectangle(image, (x1, tag_y1), (x1 + text_w + 8, tag_y1 + text_h + 6), color, -1)
        cv2.putText(
            image,
            label,
            (x1 + 4, tag_y1 + text_h + 2),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            (0, 0, 0),
            1,
            cv2.LINE_AA,
        )
