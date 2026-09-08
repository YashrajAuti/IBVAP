import time
import logging
from typing import Generator, Optional, Union
from dataclasses import dataclass
import cv2
import numpy as np

from backend.app.core.config import settings
from backend.app.core.logging import logger

@dataclass
class FrameData:
    """
    Standardized payload emitted by VideoStreamManager.
    Guarantees consistent data interface regardless of source (MP4, RTSP, Webcam).
    """
    frame: np.ndarray
    frame_idx: int
    timestamp: float
    fps: float
    camera_id: str
    width: int
    height: int
    is_last: bool = False

class VideoStreamManager:
    """
    Unified Video Stream Manager supporting MP4 files, Local Webcams, and RTSP Streams.
    Handles stream connection, frame retrieval, real-time FPS calculation,
    RTSP auto-reconnection logic, and graceful shutdown.
    """
    def __init__(
        self,
        source: Optional[Union[str, int]] = None,
        camera_id: str = "CAM-001",
        target_fps: Optional[float] = None,
        reconnect_attempts: int = 5,
        reconnect_delay: float = 2.0,
        loop: bool = True,
    ):
        self.source = source if source is not None else settings.DEFAULT_VIDEO_SOURCE
        self.camera_id = camera_id
        self.target_fps = target_fps
        self.reconnect_attempts = reconnect_attempts
        self.reconnect_delay = reconnect_delay
        self.loop = loop

        self.cap: Optional[cv2.VideoCapture] = None
        self.is_running: bool = False
        self.frame_count: int = 0
        self.width: int = 0
        self.height: int = 0
        self.source_fps: float = 30.0

        # FPS calculation state
        self._fps_start_time: float = 0.0
        self._fps_frame_count: int = 0
        self._current_fps: float = 0.0

        # Determine if source is live (RTSP/Webcam) or static file
        self.is_live: bool = isinstance(self.source, int) or (
            isinstance(self.source, str) and self.source.startswith(("rtsp://", "http://", "https://"))
        )

    def connect(self) -> bool:
        """Initializes the VideoCapture connection."""
        logger.info(f"[{self.camera_id}] Connecting to video source: {self.source}")
        
        # Convert numeric string source to integer for webcams (e.g. "0" -> 0)
        source_param = self.source
        if isinstance(source_param, str) and source_param.isdigit():
            source_param = int(source_param)

        self.cap = cv2.VideoCapture(source_param)
        
        if not self.cap.isOpened():
            logger.error(f"[{self.camera_id}] Failed to open video source: {self.source}")
            return False

        self.width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        self.height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps_val = self.cap.get(cv2.CAP_PROP_FPS)
        self.source_fps = fps_val if fps_val > 0 else 30.0
        
        self.is_running = True
        self.frame_count = 0
        self._fps_start_time = time.time()
        self._fps_frame_count = 0
        
        logger.info(
            f"[{self.camera_id}] Connected successfully. Resolution: {self.width}x{self.height}, "
            f"Source FPS: {self.source_fps:.2f}, Live Stream: {self.is_live}"
        )
        return True

    def reconnect(self) -> bool:
        """Attempts to reconnect if an RTSP or live stream disconnects unexpectedly."""
        logger.warning(f"[{self.camera_id}] Connection lost. Attempting reconnection...")
        self.release()

        for attempt in range(1, self.reconnect_attempts + 1):
            logger.info(f"[{self.camera_id}] Reconnection attempt {attempt}/{self.reconnect_attempts}...")
            time.sleep(self.reconnect_delay)
            if self.connect():
                logger.info(f"[{self.camera_id}] Reconnected successfully on attempt {attempt}.")
                return True

        logger.error(f"[{self.camera_id}] All {self.reconnect_attempts} reconnection attempts failed.")
        return False

    def read_frame(self) -> Optional[FrameData]:
        """
        Reads a single frame from the stream.
        Handles FPS throttling for MP4 files and RTSP auto-reconnects.
        """
        if not self.is_running or self.cap is None:
            if not self.connect():
                return None

        start_read_time = time.time()
        ret, frame = self.cap.read()

        if not ret or frame is None:
            if self.is_live:
                logger.warning(f"[{self.camera_id}] Stream read empty frame. Triggering reconnect...")
                if self.reconnect():
                    return self.read_frame()
                return None
            elif self.loop:
                # Seek back to frame 0 for continuous looping of test videos
                logger.info(f"[{self.camera_id}] Reached end of video file. Looping back to frame 0...")
                self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                ret, frame = self.cap.read()
                if not ret or frame is None:
                    self.is_running = False
                    return None
            else:
                # End of file reached for MP4
                logger.info(f"[{self.camera_id}] Reached end of video file.")
                self.is_running = False
                return None

        self.frame_count += 1
        self._fps_frame_count += 1
        current_time = time.time()

        # Update FPS calculation every 0.5 seconds
        elapsed_fps_time = current_time - self._fps_start_time
        if elapsed_fps_time >= 0.5:
            self._current_fps = self._fps_frame_count / elapsed_fps_time
            self._fps_frame_count = 0
            self._fps_start_time = current_time

        # Target FPS throttling for local file playback to simulate real-time stream
        if not self.is_live and self.target_fps:
            desired_frame_time = 1.0 / self.target_fps
            processing_time = current_time - start_read_time
            sleep_time = desired_frame_time - processing_time
            if sleep_time > 0:
                time.sleep(sleep_time)

        return FrameData(
            frame=frame,
            frame_idx=self.frame_count,
            timestamp=current_time,
            fps=round(self._current_fps if self._current_fps > 0 else self.source_fps, 2),
            camera_id=self.camera_id,
            width=self.width,
            height=self.height,
            is_last=False,
        )

    def stream(self) -> Generator[FrameData, None, None]:
        """Generator yielding FrameData payloads frame by frame until stopped."""
        if not self.is_running and not self.connect():
            return

        try:
            while self.is_running:
                frame_data = self.read_frame()
                if frame_data is None:
                    break
                yield frame_data
        finally:
            self.release()

    def release(self):
        """Gracefully closes video stream resources."""
        self.is_running = False
        if self.cap is not None:
            self.cap.release()
            self.cap = None
        logger.info(f"[{self.camera_id}] Video stream released cleanly.")

    def __enter__(self):
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.release()
