"""
Face Detection Service using MediaPipe
Detects faces and extracts basic information from images
"""
import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from typing import List, Dict, Optional, Tuple
from pathlib import Path
from ..core.config import settings
import logging

logger = logging.getLogger(__name__)


class FaceDetector:
    """
    Service for detecting faces in images using MediaPipe Face Detector
    """
    
    def __init__(self, model_path: Optional[str] = None):
        """
        Initialize the face detector
        
        Args:
            model_path: Path to the MediaPipe face detection model
                        If None, uses the default from settings
        """
        self.model_path = model_path or settings.mediapipe_model_path
        self.detector = None
        self._initialize_detector()
    
    def _initialize_detector(self):
        """Initialize the MediaPipe face detector"""
        try:
            # Check if model file exists
            model_abs_path = Path(self.model_path).absolute()
            if not model_abs_path.exists():
                logger.warning(f"Model file not found at {model_abs_path}. Downloading...")
                self._download_model()
            
            # Create detector options
            base_options = python.BaseOptions(model_asset_path=str(model_abs_path))
            options = vision.FaceDetectorOptions(
                base_options=base_options,
                min_detection_confidence=0.5,
                min_suppression_threshold=0.5,
                min_tracking_confidence=0.5
            )
            
            # Create detector
            self.detector = vision.FaceDetector.create_from_options(options)
            logger.info("Face detector initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize face detector: {e}")
            raise
    
    def _download_model(self):
        """Download the MediaPipe face detection model"""
        # This is a placeholder - in practice, you would download the model
        # from Google's servers or use a pre-downloaded version
        logger.error("Model download not implemented. Please download face_landmarker.task manually")
        logger.error("Download from: https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task")
        raise FileNotFoundError("MediaPipe model not found. Please download it manually.")
    
    def detect(self, image: np.ndarray) -> Optional[Dict]:
        """
        Detect faces in an image
        
        Args:
            image: Input image as numpy array (BGR or RGB)
        
        Returns:
            Dictionary containing detection results or None if no faces detected
        """
        if self.detector is None:
            logger.error("Face detector not initialized")
            return None
        
        try:
            # Convert to RGB if needed
            if len(image.shape) == 3 and image.shape[2] == 3:
                # Check if image is BGR (OpenCV format)
                if cv2.imread("dummy.jpg") is not None:  # Just to check format
                    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
                else:
                    image_rgb = image
            else:
                image_rgb = image
            
            # Create MediaPipe image
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)
            
            # Detect faces
            detection_result = self.detector.detect(mp_image)
            
            if not detection_result or not detection_result.detections:
                return None
            
            # Process results
            results = {
                "faces": [],
                "num_faces": len(detection_result.detections)
            }
            
            for detection in detection_result.detections:
                # Extract bounding box
                bbox = detection.bounding_box
                results["faces"].append({
                    "bounding_box": {
                        "xmin": bbox.origin_x,
                        "ymin": bbox.origin_y,
                        "width": bbox.width,
                        "height": bbox.height
                    },
                    "confidence": detection.confidence,
                    "keypoints": [
                        {"x": kp.x, "y": kp.y} 
                        for kp in detection.keypoints
                    ] if hasattr(detection, 'keypoints') else []
                })
            
            return results
            
        except Exception as e:
            logger.error(f"Error during face detection: {e}")
            return None
    
    def detect_from_bytes(self, image_bytes: bytes) -> Optional[Dict]:
        """
        Detect faces from image bytes
        
        Args:
            image_bytes: Image data as bytes
        
        Returns:
            Dictionary containing detection results or None
        """
        try:
            # Decode image
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            return self.detect(image)
        except Exception as e:
            logger.error(f"Error decoding image: {e}")
            return None
    
    def get_face_roi(self, image: np.ndarray, detection_result: Dict) -> List[np.ndarray]:
        """
        Extract face regions of interest from an image
        
        Args:
            image: Input image
            detection_result: Result from detect() method
        
        Returns:
            List of face ROIs (cropped images)
        """
        if not detection_result or not detection_result.get("faces"):
            return []
        
        face_rois = []
        for face in detection_result["faces"]:
            bbox = face["bounding_box"]
            x, y, w, h = (
                int(bbox["xmin"]),
                int(bbox["ymin"]),
                int(bbox["width"]),
                int(bbox["height"])
            )
            
            # Add some padding
            padding = 20
            x = max(0, x - padding)
            y = max(0, y - padding)
            w = min(image.shape[1] - x, w + 2 * padding)
            h = min(image.shape[0] - y, h + 2 * padding)
            
            # Crop face region
            face_roi = image[y:y+h, x:x+w]
            face_rois.append(face_roi)
        
        return face_rois
    
    def close(self):
        """Clean up resources"""
        if self.detector:
            # MediaPipe detectors don't have an explicit close method
            # but we can delete the reference
            del self.detector
            self.detector = None
