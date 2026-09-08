import re
import time
import logging
from pathlib import Path
from typing import Dict, Tuple, Optional, Any
import numpy as np
import torch
import easyocr

from ai.anpr.anpr_detector import ANPRDetector
from backend.app.core.config import settings
from backend.app.core.logging import logger

VEHICLE_CLASSES = {"car", "bus", "truck", "motorcycle"}

class OCREngine:
    """
    OCR Engine & License Plate Recognition Manager.
    Integrates ANPR plate region extraction with EasyOCR text recognition.
    Implements Track ID OCR caching to avoid running expensive OCR every frame on the same vehicle.
    """
    def __init__(self, languages: Optional[list[str]] = None, min_confidence: Optional[float] = None):
        self.min_confidence = min_confidence if min_confidence is not None else settings.ANPR_MIN_CONFIDENCE
        lang_list = languages if languages is not None else [settings.OCR_LANGUAGES]

        # Setup model storage directory inside data/models/easyocr
        ocr_model_dir = Path(settings.MODELS_DIR) / "easyocr"
        ocr_model_dir.mkdir(parents=True, exist_ok=True)

        # Use PyTorch MPS or CUDA if available
        use_gpu = torch.backends.mps.is_available() or torch.cuda.is_available()
        logger.info(f"Initializing EasyOCR Reader (languages: {lang_list}, storage: {ocr_model_dir}, GPU: {use_gpu})...")
        
        self.reader = easyocr.Reader(
            lang_list,
            gpu=use_gpu,
            model_storage_directory=str(ocr_model_dir),
            verbose=False
        )
        self.anpr_detector = ANPRDetector()

        # Track ID OCR Cache: track_id -> {"plate_number": str, "confidence": float, "last_updated": float}
        self.plate_cache: Dict[int, Dict[str, Any]] = {}

    def normalize_plate_text(self, text: str) -> str:
        """
        Cleans and normalizes OCR output string.
        Filters non-alphanumeric characters, converts to uppercase,
        and applies OCR error corrections (e.g. 'O' -> '0' in digit positions).
        """
        cleaned = re.sub(r'[^A-Z0-9]', '', text.upper())
        
        # Heuristic replacements for common OCR misreads
        if len(cleaned) >= 4:
            cleaned = re.sub(r'(?<=\d)O(?=\d)', '0', cleaned)
            cleaned = re.sub(r'(?<=\d)I(?=\d)', '1', cleaned)

        return cleaned

    def process_vehicle_track(
        self,
        frame: np.ndarray,
        bbox: list[float],
        track_id: int,
        object_class: str,
        timestamp: float
    ) -> Tuple[str, float]:
        """
        Processes a tracked vehicle to extract and recognize license plate text.
        Reuses cached result for active track ID if confidence threshold is met.

        Args:
            frame: Full video frame array
            bbox: Vehicle bounding box [x1, y1, x2, y2]
            track_id: Persistent Track ID from ByteTrack
            object_class: Class label ("car", "bus", "truck", "motorcycle")
            timestamp: Frame timestamp

        Returns:
            Tuple of (plate_number, ocr_confidence)
        """
        if object_class not in VEHICLE_CLASSES:
            return "", 0.0

        # Check Cache: Reuse existing high-confidence plate result for this Track ID
        if track_id in self.plate_cache:
            cached = self.plate_cache[track_id]
            if cached["confidence"] >= self.min_confidence and (timestamp - cached["last_updated"]) < 10.0:
                return cached["plate_number"], cached["confidence"]

        # Crop vehicle ROI from frame
        h, w, _ = frame.shape
        x1, y1, x2, y2 = map(int, bbox)
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w, x2), min(h, y2)

        if (x2 - x1) < 30 or (y2 - y1) < 30:
            return "Not readable", 0.0

        vehicle_crop = frame[y1:y2, x1:x2]

        # Extract preprocessed plate region crop using ANPRDetector
        plate_crop, _ = self.anpr_detector.extract_plate_crop(vehicle_crop)
        if plate_crop is None:
            return "Not readable", 0.0

        # Run EasyOCR text extraction
        try:
            results = self.reader.readtext(plate_crop, detail=1)
        except Exception as e:
            logger.debug(f"OCR execution failed on Track #{track_id}: {e}")
            return "Not readable", 0.0

        best_text = ""
        best_conf = 0.0

        for bbox_pts, raw_text, conf in results:
            cleaned = self.normalize_plate_text(raw_text)
            if len(cleaned) >= 3 and conf > best_conf:
                best_text = cleaned
                best_conf = float(conf)

        if best_conf >= self.min_confidence and best_text:
            plate_number = best_text
            ocr_conf = round(best_conf, 4)
        else:
            plate_number = "Not readable"
            ocr_conf = round(best_conf, 4)

        # Update Track ID OCR Cache
        self.plate_cache[track_id] = {
            "plate_number": plate_number,
            "confidence": ocr_conf,
            "last_updated": timestamp
        }

        return plate_number, ocr_conf
