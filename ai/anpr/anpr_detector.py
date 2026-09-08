import cv2
import numpy as np
from typing import Optional, Tuple

class ANPRDetector:
    """
    License Plate Region Detector & Preprocessor.
    Extracts candidate license plate regions from vehicle image crops using
    morphological edge detection, aspect-ratio filtering, and CLAHE contrast enhancement.
    """
    def __init__(self, min_aspect_ratio: float = 2.0, max_aspect_ratio: float = 6.0):
        self.min_aspect_ratio = min_aspect_ratio
        self.max_aspect_ratio = max_aspect_ratio

    def extract_plate_crop(self, vehicle_crop: np.ndarray) -> Tuple[Optional[np.ndarray], Optional[Tuple[int, int, int, int]]]:
        """
        Locates and extracts preprocessed license plate crop from a vehicle image.

        Args:
            vehicle_crop: BGR image array of detected vehicle

        Returns:
            Tuple of (preprocessed_plate_crop, plate_bbox_xywh)
        """
        if vehicle_crop is None or vehicle_crop.size == 0:
            return None, None

        h, w, _ = vehicle_crop.shape
        if h < 20 or w < 20:
            return None, None

        # Focus analysis on lower 65% of vehicle crop (where number plates reside)
        roi_y1 = int(h * 0.35)
        roi = vehicle_crop[roi_y1:h, 0:w]
        roi_h, roi_w, _ = roi.shape

        # Convert ROI to grayscale
        gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)

        # Apply Bilateral Filter to reduce noise while preserving edges
        filtered = cv2.bilateralFilter(gray, 11, 17, 17)

        # Edge detection using Sobel operator along X-axis
        sobel_x = cv2.Sobel(filtered, cv2.CV_8U, 1, 0, ksize=3)
        _, thresh = cv2.threshold(sobel_x, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

        # Morphological Closing to connect text character regions
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (17, 3))
        closed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)

        # Find contours
        contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        best_crop = None
        best_bbox = None
        max_area = 0

        for cnt in contours:
            x, y, bw, bh = cv2.boundingRect(cnt)
            area = bw * bh
            aspect_ratio = float(bw) / float(bh) if bh > 0 else 0.0

            # Filter by size and plate aspect ratio
            if self.min_aspect_ratio <= aspect_ratio <= self.max_aspect_ratio and area > 400:
                if area > max_area:
                    max_area = area
                    best_bbox = (x, roi_y1 + y, bw, bh)
                    plate_raw = roi[y:y + bh, x:x + bw]

                    # Preprocess plate crop for OCR
                    best_crop = self._preprocess_for_ocr(plate_raw)

        # Fallback: If heuristic plate detector finds no contour, return preprocessed lower ROI center
        if best_crop is None:
            center_crop = roi[int(roi_h * 0.2):int(roi_h * 0.9), int(roi_w * 0.15):int(roi_w * 0.85)]
            if center_crop.size > 0:
                best_crop = self._preprocess_for_ocr(center_crop)
                best_bbox = (int(roi_w * 0.15), roi_y1 + int(roi_h * 0.2), int(roi_w * 0.7), int(roi_h * 0.7))

        return best_crop, best_bbox

    def _preprocess_for_ocr(self, plate_img: np.ndarray) -> np.ndarray:
        """Applies grayscale conversion, CLAHE, and resizing for OCR engine input."""
        if plate_img is None or plate_img.size == 0:
            return plate_img

        # Resize to standard height 64px for OCR stability
        ph, pw, _ = plate_img.shape
        target_h = 64
        target_w = int(pw * (target_h / float(ph))) if ph > 0 else 200
        resized = cv2.resize(plate_img, (max(100, target_w), target_h))

        gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)

        # Contrast Limited Adaptive Histogram Equalization (CLAHE)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)

        return cv2.cvtColor(enhanced, cv2.COLOR_GRAY2BGR)
