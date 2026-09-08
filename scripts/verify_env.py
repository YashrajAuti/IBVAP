#!/usr/bin/env python3
"""
IBVAP - Environment & Dependencies Verification Script
Verifies system architecture, Python version, hardware acceleration (PyTorch MPS/CUDA/CPU),
OpenCV installation, and project directory structure.
"""

import os
import sys
import platform
from pathlib import Path

def print_header(title: str):
    print(f"\n{'=' * 60}")
    print(f" {title}")
    print(f"{'=' * 60}")

def verify_system():
    print_header("1. System & Environment Audit")
    print(f"OS: {platform.system()} ({platform.machine()})")
    print(f"Platform Detail: {platform.platform()}")
    print(f"Python Version: {sys.version.split()[0]}")
    print(f"Executable Path: {sys.executable}")
    
    if sys.version_info < (3, 10):
        print("❌ Warning: Python 3.10+ is recommended.")
    else:
        print("✅ Python runtime meets requirements.")

def verify_directories():
    print_header("2. Directory Structure Verification")
    root_dir = Path(__file__).resolve().parent.parent
    
    required_dirs = [
        "backend/app/api",
        "backend/app/core",
        "backend/app/database",
        "backend/app/models",
        "backend/app/schemas",
        "backend/app/services",
        "ai/detection",
        "ai/tracking",
        "ai/zones",
        "ai/anpr",
        "ai/ocr",
        "ai/events",
        "ai/pipelines",
        "frontend/src/components",
        "frontend/src/pages",
        "data/models",
        "data/videos",
        "data/evidence",
        "docs",
        "scripts",
    ]
    
    missing_dirs = []
    for rel_path in required_dirs:
        full_path = root_dir / rel_path
        if full_path.exists() and full_path.is_dir():
            print(f"  ✅ Directory present: {rel_path}")
        else:
            print(f"  ❌ Missing directory: {rel_path}")
            missing_dirs.append(rel_path)
            
    if not missing_dirs:
        print("✅ All required directories are present.")
    else:
        print(f"❌ {len(missing_dirs)} directories missing.")

def verify_packages():
    print_header("3. Essential Packages & Hardware Acceleration")
    
    # 1. OpenCV
    try:
        import cv2
        print(f"  ✅ OpenCV version: {cv2.__version__}")
    except ImportError:
        print("  ⚠️ OpenCV not installed in current env (will be installed via pip install -r requirements.txt)")
        
    # 2. NumPy
    try:
        import numpy as np
        print(f"  ✅ NumPy version: {np.__version__}")
    except ImportError:
        print("  ⚠️ NumPy not installed in current env")

    # 3. PyTorch & Hardware Acceleration
    try:
        import torch
        print(f"  ✅ PyTorch version: {torch.__version__}")
        
        if torch.cuda.is_available():
            print(f"  🚀 GPU Hardware Acceleration: CUDA Enabled ({torch.cuda.get_device_name(0)})")
        elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            print("  🚀 GPU Hardware Acceleration: Apple Silicon Metal (MPS) Enabled")
        else:
            print("  ℹ️ Running on CPU (No GPU/MPS acceleration detected)")
    except ImportError:
        print("  ⚠️ PyTorch not installed in current env")

    # 4. Ultralytics
    try:
        import ultralytics
        print(f"  ✅ Ultralytics YOLO version: {ultralytics.__version__}")
    except ImportError:
        print("  ⚠️ Ultralytics not installed in current env")

    # 5. FastAPI
    try:
        import fastapi
        print(f"  ✅ FastAPI version: {fastapi.__version__}")
    except ImportError:
        print("  ⚠️ FastAPI not installed in current env")

def main():
    print_header("IBVAP Environment Verification")
    verify_system()
    verify_directories()
    verify_packages()
    print(f"\n{'=' * 60}")
    print(" Verification complete!")
    print(f"{'=' * 60}\n")

if __name__ == "__main__":
    main()
