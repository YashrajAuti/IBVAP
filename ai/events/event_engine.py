import time
import logging
from datetime import datetime, timezone
from typing import List, Dict, Tuple, Optional, Callable, Any
from dataclasses import dataclass, field, asdict

from ai.zones.zone_manager import SpatialEvent
from ai.tracking.tracker import TrackedObject
from backend.app.core.logging import logger

# Severity Mapping for Supported IBVAP Events
EVENT_SEVERITIES = {
    "RESTRICTED_ZONE_ENTRY": "CRITICAL",
    "RESTRICTED_ZONE_EXIT": "INFO",
    "LINE_CROSSING": "WARNING",
    "PERSON_DETECTED": "INFO",
    "VEHICLE_DETECTED": "INFO",
}

@dataclass
class SystemEvent:
    """
    Unified Event Payload Model for IBVAP.
    Follows a standardized schema across the entire application stack.
    """
    event_id: str
    event_type: str               # "RESTRICTED_ZONE_ENTRY", "RESTRICTED_ZONE_EXIT", "LINE_CROSSING"
    camera_id: str
    track_id: int
    object_type: str
    confidence: float
    severity: str                 # "INFO", "WARNING", "CRITICAL"
    timestamp: float              # POSIX timestamp
    iso_timestamp: str            # ISO 8601 formatted timestamp string
    position: Tuple[int, int]      # Bottom-center (x, y)
    zone_or_line_name: str
    direction: Optional[str] = None
    status: str = "active"        # "active", "acknowledged", "resolved"
    evidence_path: Optional[str] = None
    details: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Converts SystemEvent into a clean JSON-serializable dictionary."""
        data = asdict(self)
        data["position"] = list(self.position)
        return data

class EventEngine:
    """
    Centralized Event Engine for IBVAP.
    Receives raw spatial and detection events, standardizes event payloads,
    assigns severity ratings, manages event history, and dispatches events
    to registered subscribers (e.g., Alert System, WebSockets, DB Logger).
    """
    def __init__(self, camera_id: str = "CAM-001", dedup_window_sec: float = 3.0):
        self.camera_id = camera_id
        self.dedup_window_sec = dedup_window_sec

        self.event_history: List[SystemEvent] = []
        self.subscribers: List[Callable[[SystemEvent], None]] = []

        # Deduplication cache: (event_type, zone_name, track_id) -> last_event_time
        self.dedup_cache: Dict[Tuple[str, str, int], float] = {}
        self.event_counter: int = 0

    def register_subscriber(self, callback: Callable[[SystemEvent], None]):
        """Registers a subscriber callback to receive real-time system events."""
        if callback not in self.subscribers:
            self.subscribers.append(callback)
            logger.info(f"Registered new event subscriber: {callback.__name__}")

    def process_spatial_events(
        self,
        spatial_events: List[SpatialEvent],
        tracks: List[TrackedObject],
        camera_id: Optional[str] = None
    ) -> List[SystemEvent]:
        """
        Translates raw SpatialEvent objects into standardized SystemEvent payloads.

        Args:
            spatial_events: List of SpatialEvent objects from ZoneManager
            tracks: List of active TrackedObject instances
            camera_id: Optional camera ID override

        Returns:
            List of generated SystemEvent payloads.
        """
        cam_id = camera_id or self.camera_id
        generated_events: List[SystemEvent] = []
        track_map = {t.track_id: t for t in tracks}

        for s_evt in spatial_events:
            # 1. Deduplication check
            dedup_key = (s_evt.event_type, s_evt.zone_name, s_evt.track_id)
            last_time = self.dedup_cache.get(dedup_key, 0.0)

            if (s_evt.timestamp - last_time) < self.dedup_window_sec:
                logger.debug(f"Suppressing duplicate event {dedup_key} within {self.dedup_window_sec}s window")
                continue

            # Update deduplication cache timestamp
            self.dedup_cache[dedup_key] = s_evt.timestamp

            # 2. Extract confidence & object metadata
            tracked_obj = track_map.get(s_evt.track_id)
            confidence = tracked_obj.confidence if tracked_obj else 0.90
            obj_type = s_evt.object_class

            # 3. Determine severity
            severity = EVENT_SEVERITIES.get(s_evt.event_type, "WARNING")

            # 4. Generate ISO 8601 Timestamp
            iso_str = datetime.fromtimestamp(s_evt.timestamp, tz=timezone.utc).isoformat()

            self.event_counter += 1
            sys_event = SystemEvent(
                event_id=f"EVT-{self.event_counter:06d}",
                event_type=s_evt.event_type.lower(),
                camera_id=cam_id,
                track_id=s_evt.track_id,
                object_type=obj_type,
                confidence=confidence,
                severity=severity,
                timestamp=s_evt.timestamp,
                iso_timestamp=iso_str,
                position=s_evt.position,
                zone_or_line_name=s_evt.zone_name,
                direction=s_evt.direction,
                status="active",
                details={
                    "zone_name": s_evt.zone_name,
                    "direction": s_evt.direction,
                    "raw_spatial_id": s_evt.event_id
                }
            )

            # Store in internal event history
            self.event_history.append(sys_event)
            generated_events.append(sys_event)

            logger.info(
                f"📢 [EVENT ENGINE] {sys_event.severity} | {sys_event.event_type.upper()} "
                f"on {sys_event.camera_id} | Object: {sys_event.object_type.upper()} #{sys_event.track_id}"
            )

            # Dispatch to subscribers
            self._notify_subscribers(sys_event)

        return generated_events

    def _notify_subscribers(self, event: SystemEvent):
        """Notifies all registered subscribers of a new system event."""
        for callback in self.subscribers:
            try:
                callback(event)
            except Exception as e:
                logger.error(f"Error executing event subscriber {callback.__name__}: {e}")

    def get_recent_events(
        self,
        limit: int = 50,
        event_type: Optional[str] = None,
        severity: Optional[str] = None
    ) -> List[SystemEvent]:
        """Queries recent events with optional filtering by event_type or severity."""
        filtered = self.event_history

        if event_type:
            filtered = [e for e in filtered if e.event_type.lower() == event_type.lower()]
        if severity:
            filtered = [e for e in filtered if e.severity.upper() == severity.upper()]

        return filtered[-limit:]
