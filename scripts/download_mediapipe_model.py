#!/usr/bin/env python3
"""
Script to download MediaPipe face landmarker model
"""
import os
import requests
from pathlib import Path

MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
MODEL_PATH = Path(__file__).parent.parent / "backend" / "models" / "face_landmarker.task"

def download_model():
    """Download the MediaPipe face landmarker model"""
    try:
        # Create models directory if it doesn't exist
        MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
        
        print(f"Downloading MediaPipe model from {MODEL_URL}...")
        
        # Download the file
        response = requests.get(MODEL_URL, stream=True)
        response.raise_for_status()
        
        # Save the file
        with open(MODEL_PATH, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        print(f"Model downloaded successfully to {MODEL_PATH}")
        print(f"File size: {os.path.getsize(MODEL_PATH) / 1024 / 1024:.2f} MB")
        
    except Exception as e:
        print(f"Error downloading model: {e}")
        return False
    
    return True

if __name__ == "__main__":
    if download_model():
        print("\nModel ready for use!")
    else:
        print("\nFailed to download model.")
