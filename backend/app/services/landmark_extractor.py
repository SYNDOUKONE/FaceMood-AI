"""
Landmark Extraction Service using MediaPipe Face Landmarker
Extracts 478 face landmarks and blendshapes from images
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


class LandmarkExtractor:
    """
    Service for extracting face landmarks using MediaPipe Face Landmarker
    """
    
    # MediaPipe Face Landmarker constants
    FACE_LANDMARKS = [
        'FACE_OVAL', 'LIPS', 'LEFT_EYE', 'RIGHT_EYE', 'LEFT_EYEBROW', 
        'RIGHT_EYEBROW', 'LEFT_IRIS', 'RIGHT_IRIS', 'FACE_OVAL',
        'NOSE', 'MOUTH', 'CHIN', 'FOREHEAD'
    ]
    
    # Landmark indices for specific features
    LANDMARK_INDICES = {
        'nose_tip': 1,
        'left_eye': list(range(22, 30)) + list(range(240, 249)),
        'right_eye': list(range(112, 120)) + list(range(370, 379)),
        'mouth': list(range(60, 80)) + list(range(300, 320)),
        'left_eyebrow': list(range(44, 60)),
        'right_eyebrow': list(range(275, 291)),
        'face_oval': list(range(0, 468))[::10],  # Sample every 10th point
    }
    
    def __init__(self, model_path: Optional[str] = None):
        """
        Initialize the landmark extractor
        
        Args:
            model_path: Path to the MediaPipe face landmarker model
                        If None, uses the default from settings
        """
        self.model_path = model_path or settings.mediapipe_model_path
        self.landmarker = None
        self._initialize_landmarker()
    
    def _initialize_landmarker(self):
        """Initialize the MediaPipe face landmarker"""
        try:
            # Check if model file exists
            model_abs_path = Path(self.model_path).absolute()
            if not model_abs_path.exists():
                logger.warning(f"Model file not found at {model_abs_path}. Downloading...")
                self._download_model()
            
            # Create landmarker options
            base_options = python.BaseOptions(model_asset_path=str(model_abs_path))
            options = vision.FaceLandmarkerOptions(
                base_options=base_options,
                output_face_blendshapes=True,
                output_facial_transformation_matrixes=True,
                num_faces=5,
                min_face_detection_confidence=0.5,
                min_tracking_confidence=0.5
            )
            
            # Create landmarker
            self.landmarker = vision.FaceLandmarker.create_from_options(options)
            logger.info("Face landmarker initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize face landmarker: {e}")
            raise
    
    def _download_model(self):
        """Download the MediaPipe face landmarker model"""
        logger.error("Model download not implemented. Please download face_landmarker.task manually")
        logger.error("Download from: https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task")
        raise FileNotFoundError("MediaPipe face landmarker model not found.")
    
    def extract(self, image: np.ndarray) -> Optional[Dict]:
        """
        Extract landmarks from an image
        
        Args:
            image: Input image as numpy array (BGR or RGB)
        
        Returns:
            Dictionary containing landmark results or None if no faces detected
        """
        if self.landmarker is None:
            logger.error("Face landmarker not initialized")
            return None
        
        try:
            # Convert to RGB if needed
            if len(image.shape) == 3 and image.shape[2] == 3:
                image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            else:
                image_rgb = image
            
            # Create MediaPipe image
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)
            
            # Extract landmarks
            detection_result = self.landmarker.detect(mp_image)
            
            if not detection_result or not detection_result.face_landmarks:
                return None
            
            # Process results
            results = {
                "landmarks": [],
                "blendshapes": [],
                "num_faces": len(detection_result.face_landmarks)
            }
            
            for face_idx, face_landmarks in enumerate(detection_result.face_landmarks):
                # Extract landmarks
                landmarks_2d = []
                landmarks_3d = []
                
                for landmark in face_landmarks:
                    landmarks_2d.append({
                        "x": landmark.x,
                        "y": landmark.y
                    })
                    landmarks_3d.append({
                        "x": landmark.x,
                        "y": landmark.y,
                        "z": landmark.z
                    })
                
                results["landmarks"].append({
                    "landmarks_2d": landmarks_2d,
                    "landmarks_3d": landmarks_3d
                })
            
            # Extract blendshapes if available — one list per detected face
            if detection_result.face_blendshapes:
                for blendshapes in detection_result.face_blendshapes:
                    results["blendshapes"].append([
                        {
                            "category_name": bs.category_name,
                            "score": bs.score
                        }
                        for bs in blendshapes
                    ])
            
            return results
            
        except Exception as e:
            logger.error(f"Error during landmark extraction: {e}")
            return None
    
    def extract_from_bytes(self, image_bytes: bytes) -> Optional[Dict]:
        """
        Extract landmarks from image bytes
        
        Args:
            image_bytes: Image data as bytes
        
        Returns:
            Dictionary containing landmark results or None
        """
        try:
            # Decode image
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            return self.extract(image)
        except Exception as e:
            logger.error(f"Error decoding image: {e}")
            return None
    
    def get_feature_landmarks(self, landmarks: List[Dict], feature: str) -> List[Dict]:
        """
        Get landmarks for a specific facial feature
        
        Args:
            landmarks: List of all landmarks
            feature: Feature name (e.g., 'left_eye', 'mouth')
        
        Returns:
            List of landmarks for the specified feature
        """
        if feature not in self.LANDMARK_INDICES:
            return []
        
        indices = self.LANDMARK_INDICES[feature]
        if isinstance(indices, list):
            return [landmarks[i] for i in indices if i < len(landmarks)]
        else:
            return [landmarks[indices]]
    
    def calculate_geometric_features(self, landmarks: List[Dict]) -> Dict:
        """
        Calculate geometric features from landmarks
        Useful for expression analysis
        
        Args:
            landmarks: List of 478 landmarks
        
        Returns:
            Dictionary containing geometric features
        """
        if not landmarks or len(landmarks) < 478:
            return {}
        
        features = {}
        
        # Get specific landmark indices
        def get_point(idx):
            return (landmarks[idx]["x"], landmarks[idx]["y"])
        
        # Eye features
        left_eye_outer = get_point(22)
        left_eye_inner = get_point(26)
        left_eye_vertical = abs(left_eye_outer[1] - left_eye_inner[1])
        
        right_eye_outer = get_point(112)
        right_eye_inner = get_point(116)
        right_eye_vertical = abs(right_eye_outer[1] - right_eye_inner[1])
        
        features["eye_openness"] = (left_eye_vertical + right_eye_vertical) / 2
        
        # Mouth features
        mouth_top = get_point(13)
        mouth_bottom = get_point(14)
        mouth_vertical = abs(mouth_top[1] - mouth_bottom[1])
        features["mouth_openness"] = mouth_vertical
        
        # Eyebrow height
        left_eyebrow = get_point(52)
        right_eyebrow = get_point(272)
        features["eyebrow_height"] = (left_eyebrow[1] + right_eyebrow[1]) / 2
        
        # Face width (cheekbones)
        left_cheek = get_point(10)
        right_cheek = get_point(340)
        features["face_width"] = abs(left_cheek[0] - right_cheek[0])
        
        # Nose to mouth distance
        nose_tip = get_point(1)
        mouth_center = get_point(0)
        features["nose_mouth_distance"] = np.sqrt(
            (nose_tip[0] - mouth_center[0])**2 + 
            (nose_tip[1] - mouth_center[1])**2
        )
        
        return features
    
    def close(self):
        """Clean up resources"""
        if self.landmarker:
            del self.landmarker
            self.landmarker = None
