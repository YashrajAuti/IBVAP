#!/usr/bin/env python3
"""
IBVAP - Synthetic Sample Video Generator
Creates a 1280x720 30fps MP4 video with real traffic features AND dynamic moving targets
for testing VideoStreamManager, ObjectDetector, ByteTrack, ZoneManager, and Event Engine.
"""

import cv2
import numpy as np
from pathlib import Path
import requests

def download_background_if_missing(bg_path: Path):
    if not bg_path.exists():
        bg_path.parent.mkdir(parents=True, exist_ok=True)
        print("Downloading sample traffic background...")
        url = "https://images.pexels.com/photos/210182/pexels-photo-210182.jpeg?auto=compress&cs=tinysrgb&w=1280"
        headers = {"User-Agent": "Mozilla/5.0"}
        try:
            resp = requests.get(url, headers=headers, timeout=10)
            if resp.status_code == 200:
                with open(bg_path, "wb") as f:
                    f.write(resp.content)
                print("✅ Traffic background downloaded successfully.")
                return
        except Exception as e:
            print(f"⚠️ Failed to download background image: {e}")

def create_sample_video(output_path: str, duration_sec: int = 10, fps: int = 30):
    output_file = Path(output_path)
    output_file.parent.mkdir(parents=True, exist_ok=True)

    bg_file = output_file.parent / "sample_traffic.jpg"
    download_background_if_missing(bg_file)

    width, height = 1280, 720
    total_frames = duration_sec * fps

    base_bg = None
    if bg_file.exists():
        base_bg = cv2.imread(str(bg_file))
        if base_bg is not None:
            base_bg = cv2.resize(base_bg, (width, height))

    # Extract a real car crop from background to move across screen
    car_crop = None
    if base_bg is not None:
        # Crop real car from background [y: 319..355, x: 327..364]
        car_crop = base_bg[315:358, 325:366].copy()

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    writer = cv2.VideoWriter(str(output_file), fourcc, fps, (width, height))

    print(f"Generating sample CCTV video: {output_file} ({duration_sec}s, {fps}fps)")

    for frame_idx in range(total_frames):
        if base_bg is not None:
            frame = base_bg.copy()
        else:
            frame = np.zeros((height, width, 3), dtype=np.uint8)
            frame[:] = (40, 40, 40)

        # Move cropped vehicle across the frame (x: 200 -> 1200)
        # Line A->B is at x=400. Restricted Zone is x=700..1150.
        if car_crop is not None:
            progress = frame_idx / total_frames
            move_x = int(200 + progress * 950) # Moves from x=200 to x=1150
            move_y = 330
            c_h, c_w, _ = car_crop.shape

            # Overlay moving car
            if move_y + c_h < height and move_x + c_w < width:
                frame[move_y:move_y + c_h, move_x:move_x + c_w] = car_crop

        # Draw simulated restricted zone polygon outline (Red box)
        zone_pts = np.array([[700, 200], [1150, 200], [1150, 550], [700, 550]], np.int32)
        cv2.polylines(frame, [zone_pts], isClosed=True, color=(0, 0, 255), thickness=3)
        cv2.putText(frame, "RESTRICTED ZONE (TEST)", (710, 230), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)

        # Draw simulated virtual line (Yellow crossing line)
        cv2.line(frame, (400, 100), (400, 650), (0, 255, 255), 3)
        cv2.putText(frame, "VIRTUAL LINE A | B", (310, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)

        # Frame overlay timestamp
        cv2.putText(frame, f"CAM-001 LIVE CCTV | Frame {frame_idx + 1}/{total_frames}", (30, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)

        writer.write(frame)

    writer.release()
    print(f"✅ Video created successfully at: {output_file}")

if __name__ == "__main__":
    create_sample_video("./data/videos/sample.mp4", duration_sec=10, fps=30)
