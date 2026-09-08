import time
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass, field

import cv2
import numpy as np
import supervision as sv

from ai.detection.detector import DetectionResult, CLASS_COLORS, TARGET_CLASSES
from backend.app.core.logging import logger

@dataclass
class TrackedObject:
    """
    Data model for a tracked object maintaining identity across video frames.
    """
    track_id: int
    class_name: str
    class_id: int
    confidence: float
    bbox: List[float]               # [x1, y1, x2, y2]
    center: Tuple[int, int]          # (x_center, y_center)
    bottom_center: Tuple[int, int]   # (x_center, y_bottom)
    first_seen: float                # POSIX timestamp
    last_seen: float                 # POSIX timestamp
    trajectory: List[Tuple[int, int]] = field(default_factory=list) # Historical bottom-center points

@dataclass
class TrackedFramePayload:
    """
    Payload containing all active tracks and annotated frame for a single frame.
    """
    tracks: List[TrackedObject]
    annotated_frame: np.ndarray
    active_track_count: int
    frame_idx: int
    timestamp: float

class ObjectTracker:
    """
    ByteTrack Multi-Object Tracker wrapper for IBVAP.
    Assigns stable Track IDs to detected objects across frames, maintains
    bounded trajectory history, tracks object lifespan, and renders visual trails.
    """
    def __init__(self, max_trajectory_points: int = 30, frame_rate: int = 30):
        self.max_trajectory_points = max_trajectory_points
        self.frame_rate = frame_rate

        # Initialize Supervision ByteTrack instance
        self.byte_tracker = sv.ByteTrack(frame_rate=frame_rate)

        # Internal state tracking (bounded memory)
        self.trajectories: Dict[int, List[Tuple[int, int]]] = {}
        self.first_seen_map: Dict[int, float] = {}
        self.last_seen_map: Dict[int, float] = {}

    def update(
        self,
        detections: List[DetectionResult],
        frame: np.ndarray,
        timestamp: float,
        frame_idx: int
    ) -> TrackedFramePayload:
        """
        Updates multi-object tracker with new detection results.

        Args:
            detections: List of DetectionResult objects from ObjectDetector
            frame: OpenCV BGR frame array
            timestamp: Current frame timestamp
            frame_idx: Frame index sequence number

        Returns:
            TrackedFramePayload with updated tracks and annotated overlay frame.
        """
        annotated_frame = frame.copy()
        tracked_objects: List[TrackedObject] = []

        if not detections:
            # Pass empty detections to ByteTrack to maintain internal tracker state
            empty_sv = sv.Detections.empty()
            self.byte_tracker.update_with_detections(empty_sv)
            return TrackedFramePayload(
                tracks=[],
                annotated_frame=annotated_frame,
                active_track_count=0,
                frame_idx=frame_idx,
                timestamp=timestamp
            )

        # Convert IBVAP DetectionResult list to Supervision Detections
        xyxy_list = [d.bbox for d in detections]
        conf_list = [d.confidence for d in detections]
        class_id_list = [d.class_id for d in detections]

        sv_detections = sv.Detections(
            xyxy=np.array(xyxy_list, dtype=np.float32),
            confidence=np.array(conf_list, dtype=np.float32),
            class_id=np.array(class_id_list, dtype=int)
        )

        # Update ByteTrack tracker
        tracked_sv = self.byte_tracker.update_with_detections(sv_detections)

        # Parse ByteTrack results
        if tracked_sv is not None and len(tracked_sv) > 0:
            for idx in range(len(tracked_sv)):
                bbox = tracked_sv.xyxy[idx].tolist()
                conf = float(tracked_sv.confidence[idx]) if tracked_sv.confidence is not None else 1.0
                cls_id = int(tracked_sv.class_id[idx]) if tracked_sv.class_id is not None else 0
                
                # Check tracker_id availability
                if tracked_sv.tracker_id is None or idx >= len(tracked_sv.tracker_id):
                    continue
                
                track_id = int(tracked_sv.tracker_id[idx])
                class_name = TARGET_CLASSES.get(cls_id, f"object_{cls_id}")

                # Calculate center and bottom-center
                x1, y1, x2, y2 = bbox
                center_x = int((x1 + x2) / 2.0)
                center_y = int((y1 + y2) / 2.0)
                bottom_x = center_x
                bottom_y = int(y2)
                bottom_pt = (bottom_x, bottom_y)

                # Manage lifespan timestamps
                if track_id not in self.first_seen_map:
                    self.first_seen_map[track_id] = timestamp
                self.last_seen_map[track_id] = timestamp

                # Manage trajectory history (bounded queue)
                if track_id not in self.trajectories:
                    self.trajectories[track_id] = []
                self.trajectories[track_id].append(bottom_pt)

                # Enforce max trajectory history constraint (Prevents memory growth)
                if len(self.trajectories[track_id]) > self.max_trajectory_points:
                    self.trajectories[track_id].pop(0)

                tracked_obj = TrackedObject(
                    track_id=track_id,
                    class_name=class_name,
                    class_id=cls_id,
                    confidence=round(conf, 4),
                    bbox=[round(x1, 1), round(y1, 1), round(x2, 1), round(y2, 1)],
                    center=(center_x, center_y),
                    bottom_center=bottom_pt,
                    first_seen=self.first_seen_map[track_id],
                    last_seen=self.last_seen_map[track_id],
                    trajectory=list(self.trajectories[track_id])
                )
                tracked_objects.append(tracked_obj)

                # Draw track overlay & trajectory trail
                self._draw_track_overlay(annotated_frame, tracked_obj)

        # Cleanup stagnant trajectories not seen for > 15 seconds
        self._cleanup_stale_tracks(current_timestamp=timestamp, timeout_sec=15.0)

        # Draw summary overlay
        cv2.putText(
            annotated_frame,
            f"Active Track IDs: {len(tracked_objects)}",
            (20, 40),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (0, 255, 0),
            2
        )

        return TrackedFramePayload(
            tracks=tracked_objects,
            annotated_frame=annotated_frame,
            active_track_count=len(tracked_objects),
            frame_idx=frame_idx,
            timestamp=timestamp
        )

    def _draw_track_overlay(self, image: np.ndarray, track: TrackedObject):
        """Draws bounding box, Track ID tag (e.g. Person #17), and trajectory trail."""
        x1, y1, x2, y2 = map(int, track.bbox)
        color = CLASS_COLORS.get(track.class_name, (0, 255, 255))

        # 1. Trajectory trail line
        if len(track.trajectory) > 1:
            pts = np.array(track.trajectory, dtype=np.int32).reshape((-1, 1, 2))
            cv2.polylines(image, [pts], isClosed=False, color=color, thickness=2)

        # 2. Bounding box
        cv2.rectangle(image, (x1, y1), (x2, y2), color, 2)

        # 3. Bottom-center reference point
        cv2.circle(image, track.bottom_center, 5, (0, 0, 255), -1)
        cv2.circle(image, track.bottom_center, 7, (255, 255, 255), 1)

        # 4. Track ID Label Tag (e.g., "PERSON #17")
        label = f"{track.class_name.upper()} #{track.track_id}"
        (text_w, text_h), baseline = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 2)

        tag_y1 = max(0, y1 - text_h - 8)
        cv2.rectangle(image, (x1, tag_y1), (x1 + text_w + 10, tag_y1 + text_h + 8), color, -1)
        cv2.putText(
            image,
            label,
            (x1 + 5, tag_y1 + text_h + 3),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.55,
            (0, 0, 0),
            2,
            cv2.LINE_AA
        )

    def _cleanup_stale_tracks(self, current_timestamp: float, timeout_sec: float = 15.0):
        """Removes track trajectories and timestamps for objects missing for > timeout_sec."""
        stale_ids = [
            t_id for t_id, last_time in self.last_seen_map.items()
            if (current_timestamp - last_time) > timeout_sec
        ]
        for t_id in stale_ids:
            self.trajectories.pop(t_id, None)
            self.first_seen_map.pop(t_id, None)
            self.last_seen_map.pop(t_id, None)
