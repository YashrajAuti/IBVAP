import time
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass, field
import cv2
import numpy as np
from shapely.geometry import Point, Polygon, LineString

from ai.tracking.tracker import TrackedObject, TrackedFramePayload
from backend.app.core.logging import logger

@dataclass
class SpatialEvent:
    """
    Structured spatial event emitted when an object enters/exits a restricted zone
    or crosses a virtual boundary line.
    """
    event_id: str
    event_type: str               # "RESTRICTED_ZONE_ENTRY", "RESTRICTED_ZONE_EXIT", "LINE_CROSSING"
    track_id: int
    object_class: str
    zone_name: str
    timestamp: float
    position: Tuple[int, int]      # Bottom-center coordinate (x, y)
    direction: Optional[str] = None# "A_to_B" or "B_to_A" (for line crossings)

class PolygonZone:
    """
    Represents a polygon-based restricted zone.
    """
    def __init__(self, name: str, polygon_pts: List[Tuple[int, int]], target_classes: Optional[List[str]] = None):
        self.name = name
        self.polygon_pts = polygon_pts
        self.target_classes = target_classes  # None means all classes
        self.shapely_polygon = Polygon(polygon_pts)
        self.np_points = np.array(polygon_pts, np.int32).reshape((-1, 1, 2))

    def contains(self, point: Tuple[int, int]) -> bool:
        """Tests whether point (x, y) is inside the polygon."""
        p = Point(point)
        return self.shapely_polygon.contains(p) or self.shapely_polygon.touches(p)

class VirtualLine:
    """
    Represents a directional virtual boundary line between Point A and Point B.
    """
    def __init__(self, name: str, pt1: Tuple[int, int], pt2: Tuple[int, int]):
        self.name = name
        self.pt1 = pt1 # Point A
        self.pt2 = pt2 # Point B
        self.shapely_line = LineString([pt1, pt2])

    def check_crossing(
        self, prev_pt: Tuple[int, int], curr_pt: Tuple[int, int]
    ) -> Tuple[bool, Optional[str]]:
        """
        Checks if movement vector from prev_pt to curr_pt intersects line AB.
        Returns (is_crossed, direction).
        """
        if prev_pt == curr_pt:
            return False, None

        move_line = LineString([prev_pt, curr_pt])
        if not self.shapely_line.intersects(move_line):
            return False, None

        # Determine direction using 2D Cross Product (in OpenCV screen coordinates where Y increases downwards)
        ax, ay = self.pt1
        bx, by = self.pt2
        v_ab = (bx - ax, by - ay)

        cx, cy = curr_pt
        v_ac = (cx - ax, cy - ay)

        # Cross product: (Ax * Cy) - (Ay * Cx)
        cross_prod = (v_ab[0] * v_ac[1]) - (v_ab[1] * v_ac[0])

        direction = "A_to_B" if cross_prod <= 0 else "B_to_A"
        return True, direction

@dataclass
class ZoneAnalysisResult:
    """
    Output payload containing detected spatial events and annotated frame.
    """
    events: List[SpatialEvent]
    annotated_frame: np.ndarray

class ZoneManager:
    """
    Spatial Analysis Engine for IBVAP.
    Evaluates tracked objects against defined Restricted Polygon Zones and Virtual Lines
    using Shapely geometry. Manages state to prevent duplicate alert spamming.
    """
    def __init__(
        self,
        zones: Optional[List[PolygonZone]] = None,
        lines: Optional[List[VirtualLine]] = None,
        line_cooldown_sec: float = 3.0
    ):
        self.zones: List[PolygonZone] = zones if zones is not None else []
        self.lines: List[VirtualLine] = lines if lines is not None else []
        self.line_cooldown_sec = line_cooldown_sec

        # State tracking: zone_name -> (track_id -> is_inside)
        self.zone_states: Dict[str, Dict[int, bool]] = {z.name: {} for z in self.zones}

        # Line crossing history: line_name -> (track_id -> last_crossing_time)
        self.line_history: Dict[str, Dict[int, float]] = {l.name: {} for l in self.lines}

        # Track last known bottom_center position per track_id
        self.prev_positions: Dict[int, Tuple[int, int]] = {}

        self.event_counter: int = 0

    def add_zone(self, zone: PolygonZone):
        self.zones.append(zone)
        if zone.name not in self.zone_states:
            self.zone_states[zone.name] = {}

    def add_line(self, line: VirtualLine):
        self.lines.append(line)
        if line.name not in self.line_history:
            self.line_history[line.name] = {}

    def process_frame(self, track_payload: TrackedFramePayload) -> ZoneAnalysisResult:
        """
        Analyzes bottom_center positions of all tracked objects against zones and lines.

        Args:
            track_payload: TrackedFramePayload from ObjectTracker

        Returns:
            ZoneAnalysisResult containing generated events and annotated frame.
        """
        events: List[SpatialEvent] = []
        annotated_frame = track_payload.annotated_frame.copy()

        # 1. Draw Zones & Lines on Annotated Frame
        self._render_zones_and_lines(annotated_frame)

        current_track_ids = set()

        for track in track_payload.tracks:
            t_id = track.track_id
            current_track_ids.add(t_id)
            curr_pos = track.bottom_center
            prev_pos = self.prev_positions.get(t_id, curr_pos)

            # --- A. RESTRICTED ZONE CHECKS ---
            for zone in self.zones:
                if zone.target_classes and track.class_name not in zone.target_classes:
                    continue

                is_inside = zone.contains(curr_pos)
                was_inside = self.zone_states[zone.name].get(t_id, False)

                if is_inside and not was_inside:
                    # State transition: OUTSIDE -> INSIDE
                    self.event_counter += 1
                    evt = SpatialEvent(
                        event_id=f"evt_zone_{self.event_counter:04d}",
                        event_type="RESTRICTED_ZONE_ENTRY",
                        track_id=t_id,
                        object_class=track.class_name,
                        zone_name=zone.name,
                        timestamp=track_payload.timestamp,
                        position=curr_pos,
                    )
                    events.append(evt)
                    logger.warning(
                        f"🚨 [EVENT] RESTRICTED_ZONE_ENTRY | {track.class_name.upper()} #{t_id} entered '{zone.name}'"
                    )

                elif not is_inside and was_inside:
                    # State transition: INSIDE -> OUTSIDE
                    self.event_counter += 1
                    evt = SpatialEvent(
                        event_id=f"evt_zone_{self.event_counter:04d}",
                        event_type="RESTRICTED_ZONE_EXIT",
                        track_id=t_id,
                        object_class=track.class_name,
                        zone_name=zone.name,
                        timestamp=track_payload.timestamp,
                        position=curr_pos,
                    )
                    events.append(evt)
                    logger.info(
                        f"ℹ️ [EVENT] RESTRICTED_ZONE_EXIT | {track.class_name.upper()} #{t_id} exited '{zone.name}'"
                    )

                # Update zone state
                self.zone_states[zone.name][t_id] = is_inside

            # --- B. VIRTUAL LINE CROSSING CHECKS ---
            if prev_pos != curr_pos:
                for line in self.lines:
                    last_crossed = self.line_history[line.name].get(t_id, 0.0)
                    if (track_payload.timestamp - last_crossed) < self.line_cooldown_sec:
                        continue # Cooldown active to prevent duplicate events near line

                    is_crossed, direction = line.check_crossing(prev_pos, curr_pos)
                    if is_crossed and direction:
                        self.event_counter += 1
                        self.line_history[line.name][t_id] = track_payload.timestamp
                        evt = SpatialEvent(
                            event_id=f"evt_line_{self.event_counter:04d}",
                            event_type="LINE_CROSSING",
                            track_id=t_id,
                            object_class=track.class_name,
                            zone_name=line.name,
                            timestamp=track_payload.timestamp,
                            position=curr_pos,
                            direction=direction,
                        )
                        events.append(evt)
                        logger.warning(
                            f"⚡ [EVENT] LINE_CROSSING | {track.class_name.upper()} #{t_id} crossed '{line.name}' [{direction}]"
                        )

            # Update previous position
            self.prev_positions[t_id] = curr_pos

        # Cleanup positions of tracks that disappeared
        stale_positions = set(self.prev_positions.keys()) - current_track_ids
        for s_id in stale_positions:
            self.prev_positions.pop(s_id, None)

        # Draw Active Event Notifications on Frame
        if events:
            self._render_events_banner(annotated_frame, events)

        return ZoneAnalysisResult(events=events, annotated_frame=annotated_frame)

    def _render_zones_and_lines(self, frame: np.ndarray):
        """Overlay transparent polygons and lines on video frame."""
        # 1. Render Restricted Polygon Zones
        for zone in self.zones:
            overlay = frame.copy()
            cv2.fillPoly(overlay, [zone.np_points], color=(0, 0, 200))
            cv2.addWeighted(overlay, 0.25, frame, 0.75, 0, frame)
            cv2.polylines(frame, [zone.np_points], isClosed=True, color=(0, 0, 255), thickness=2)

            # Zone label
            centroid_x = int(np.mean([p[0] for p in zone.polygon_pts]))
            centroid_y = int(np.mean([p[1] for p in zone.polygon_pts]))
            cv2.putText(
                frame,
                f"ZONE: {zone.name.upper()}",
                (centroid_x - 60, centroid_y),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (0, 0, 255),
                2,
            )

        # 2. Render Virtual Crossing Lines
        for line in self.lines:
            cv2.line(frame, line.pt1, line.pt2, (0, 255, 255), 3)
            # Draw endpoints A and B
            cv2.circle(frame, line.pt1, 6, (0, 255, 255), -1)
            cv2.circle(frame, line.pt2, 6, (0, 255, 255), -1)
            cv2.putText(frame, "A", (line.pt1[0] - 15, line.pt1[1] - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
            cv2.putText(frame, "B", (line.pt2[0] + 10, line.pt2[1] - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
            
            mid_x = (line.pt1[0] + line.pt2[0]) // 2
            mid_y = (line.pt1[1] + line.pt2[1]) // 2
            cv2.putText(
                frame,
                f"LINE: {line.name.upper()}",
                (mid_x - 50, mid_y - 15),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.55,
                (0, 255, 255),
                2,
            )

    def _render_events_banner(self, frame: np.ndarray, events: List[SpatialEvent]):
        """Render banner for newly triggered events on frame."""
        for idx, evt in enumerate(events):
            color = (0, 0, 255) if "ENTRY" in evt.event_type else (0, 255, 255)
            text = f"EVENT: {evt.event_type} | {evt.object_class.upper()} #{evt.track_id}"
            if evt.direction:
                text += f" [{evt.direction}]"

            y_pos = 80 + (idx * 30)
            cv2.rectangle(frame, (20, y_pos - 20), (550, y_pos + 8), (0, 0, 0), -1)
            cv2.putText(frame, text, (25, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
