"""
Expression Analysis Service for FaceMood AI
Analyzes facial expressions using MediaPipe blendshapes and geometric features
"""
import numpy as np
from typing import List, Dict, Optional, Tuple
from enum import Enum
from ..models.face_model import ExpressionType
from ..core.config import settings
import logging

logger = logging.getLogger(__name__)


class ExpressionAnalyzer:
    """
    Service for analyzing facial expressions
    Uses MediaPipe blendshapes and geometric features
    """
    
    # Expression thresholds for real MediaPipe FaceLandmarker (ARKit-52) blendshapes
    BLENDSHAPE_THRESHOLDS = {
        "mouthSmileLeft": 0.35,
        "mouthSmileRight": 0.35,
        "browInnerUp": 0.40,
        "browOuterUpLeft": 0.40,
        "browOuterUpRight": 0.40,
        "browDownLeft": 0.35,
        "browDownRight": 0.35,
        "jawOpen": 0.35,
        "mouthFrownLeft": 0.30,
        "mouthFrownRight": 0.30,
        "eyeBlinkLeft": 0.55,
        "eyeBlinkRight": 0.55,
        "eyeWideLeft": 0.40,
        "eyeWideRight": 0.40,
        "cheekSquintLeft": 0.40,
        "cheekSquintRight": 0.40,
        "noseSneerLeft": 0.30,
        "noseSneerRight": 0.30,
    }
    
    # Expression mapping from blendshapes to ExpressionType
    BLENDSHAPE_TO_EXPRESSION = {
        "mouthSmileLeft": ExpressionType.SMILE,
        "mouthSmileRight": ExpressionType.SMILE,
        "cheekSquintLeft": ExpressionType.SMILE,
        "cheekSquintRight": ExpressionType.SMILE,
        "browInnerUp": ExpressionType.BROW_RAISE,
        "browOuterUpLeft": ExpressionType.BROW_RAISE,
        "browOuterUpRight": ExpressionType.BROW_RAISE,
        "eyeWideLeft": ExpressionType.SURPRISE,
        "eyeWideRight": ExpressionType.SURPRISE,
        "browDownLeft": ExpressionType.ANGRY,
        "browDownRight": ExpressionType.ANGRY,
        "mouthFrownLeft": ExpressionType.SAD,
        "mouthFrownRight": ExpressionType.SAD,
        "noseSneerLeft": ExpressionType.DISGUST,
        "noseSneerRight": ExpressionType.DISGUST,
        "jawOpen": ExpressionType.MOUTH_OPEN,
        "eyeBlinkLeft": ExpressionType.EYE_BLINK,
        "eyeBlinkRight": ExpressionType.EYE_BLINK,
    }
    
    # Geometric feature thresholds
    GEOMETRIC_THRESHOLDS = {
        "smile": {
            "mouth_width": 0.3,
            "mouth_height": 0.1
        },
        "surprise": {
            "eye_openness": 0.3,
            "eyebrow_height": -0.1  # Eyebrows raised
        },
        "angry": {
            "eyebrow_height": 0.1,  # Eyebrows lowered
            "mouth_height": 0.05
        }
    }
    
    def __init__(self, landmark_extractor=None):
        """
        Initialize the expression analyzer
        
        Args:
            landmark_extractor: Optional LandmarkExtractor instance
        """
        self.landmark_extractor = landmark_extractor
    
    def analyze_from_blendshapes(self, blendshapes: List[Dict]) -> Dict:
        """
        Analyze expression from MediaPipe blendshapes
        
        Args:
            blendshapes: List of blendshape dictionaries with 'category_name' and 'score'
        
        Returns:
            Dictionary containing expression analysis result
        """
        if not blendshapes:
            return {
                "expression": ExpressionType.NEUTRAL,
                "confidence": 0.0,
                "blendshapes": {}
            }
        
        # Create blendshape dictionary for easy access
        blendshape_dict = {
            bs["category_name"]: bs["score"]
            for bs in blendshapes
            if bs.get("category_name") != "_neutral"
        }

        def avg(*keys: str) -> float:
            vals = [blendshape_dict.get(k, 0.0) for k in keys]
            return sum(vals) / len(vals) if vals else 0.0

        # Compute composite scores for each expression from real MediaPipe blendshapes
        smile_score = avg("mouthSmileLeft", "mouthSmileRight")
        brow_raise_score = max(blendshape_dict.get("browInnerUp", 0.0), avg("browOuterUpLeft", "browOuterUpRight"))
        eye_wide_score = avg("eyeWideLeft", "eyeWideRight")
        jaw_open_score = blendshape_dict.get("jawOpen", 0.0)
        brow_down_score = avg("browDownLeft", "browDownRight")
        frown_score = avg("mouthFrownLeft", "mouthFrownRight")
        disgust_score = avg("noseSneerLeft", "noseSneerRight")
        blink_score = avg("eyeBlinkLeft", "eyeBlinkRight")
        mouth_stretch_score = avg("mouthStretchLeft", "mouthStretchRight")

        candidates: List[Tuple[ExpressionType, float, float]] = [
            (ExpressionType.SMILE, smile_score, 0.30),
            (ExpressionType.SURPRISE, min(1.0, (eye_wide_score + jaw_open_score + brow_raise_score) / 2.0) if (eye_wide_score > 0.30 and brow_raise_score > 0.25) else 0.0, 0.35),
            (ExpressionType.FEAR, (eye_wide_score + mouth_stretch_score) / 2.0 if eye_wide_score > 0.35 and mouth_stretch_score > 0.20 else 0.0, 0.30),
            (ExpressionType.ANGRY, brow_down_score, 0.30),
            (ExpressionType.SAD, frown_score, 0.25),
            (ExpressionType.DISGUST, disgust_score, 0.25),
            (ExpressionType.MOUTH_OPEN, jaw_open_score, 0.30),
            (ExpressionType.BROW_RAISE, brow_raise_score, 0.35),
            (ExpressionType.EYE_BLINK, blink_score, 0.50),
        ]

        best_expression = ExpressionType.NEUTRAL
        best_confidence = 0.0

        for expr_type, score, threshold in candidates:
            if score >= threshold and score > best_confidence:
                best_expression = expr_type
                best_confidence = score

        # If no active expression exceeded its threshold, classify as Neutral
        if best_expression == ExpressionType.NEUTRAL:
            peak_expr = max(s for _, s, _ in candidates) if candidates else 0.0
            best_confidence = max(0.5, min(0.99, 1.0 - peak_expr))

        return {
            "expression": best_expression,
            "confidence": float(min(1.0, best_confidence)),
            "blendshapes": blendshape_dict
        }
    
    def analyze_from_landmarks(self, landmarks: List[Dict]) -> Dict:
        """
        Analyze expression from face landmarks
        
        Args:
            landmarks: List of 478 landmarks
        
        Returns:
            Dictionary containing expression analysis result
        """
        if not landmarks or len(landmarks) < 478:
            return {
                "expression": ExpressionType.NEUTRAL,
                "confidence": 0.0,
                "features": {}
            }
        
        # Calculate geometric features
        features = self._calculate_geometric_features(landmarks)
        
        # Determine expression based on features
        expression, confidence = self._determine_expression_from_features(features)
        
        return {
            "expression": expression,
            "confidence": confidence,
            "features": features
        }
    
    def analyze(self, landmarks: List[Dict], blendshapes: List[Dict]) -> Dict:
        """
        Analyze expression using both landmarks and blendshapes
        
        Args:
            landmarks: List of 478 landmarks
            blendshapes: List of blendshape dictionaries
        
        Returns:
            Dictionary containing comprehensive expression analysis
        """
        # Analyze from both sources
        landmark_result = self.analyze_from_landmarks(landmarks)
        blendshape_result = self.analyze_from_blendshapes(blendshapes)
        
        # Prioritize blendshapes whenever available (far more accurate than raw geometry)
        if blendshapes:
            return {
                **blendshape_result,
                "features": landmark_result.get("features", {})
            }
        return {
            **landmark_result,
            "blendshapes": blendshape_result.get("blendshapes", {})
        }
    
    def _calculate_geometric_features(self, landmarks: List[Dict]) -> Dict:
        """
        Calculate geometric features from landmarks
        
        Args:
            landmarks: List of 478 landmarks
        
        Returns:
            Dictionary containing geometric features
        """
        def get_point(idx):
            if idx < len(landmarks):
                return (landmarks[idx]["x"], landmarks[idx]["y"])
            return (0.0, 0.0)
        
        features = {}
        
        # Eye features
        left_eye_outer = get_point(22)
        left_eye_inner = get_point(26)
        left_eye_vertical = abs(left_eye_outer[1] - left_eye_inner[1])
        
        right_eye_outer = get_point(112)
        right_eye_inner = get_point(116)
        right_eye_vertical = abs(right_eye_outer[1] - right_eye_inner[1])
        
        features["eye_openness"] = (left_eye_vertical + right_eye_vertical) / 2
        
        # Mouth features
        mouth_left = get_point(60)
        mouth_right = get_point(300)
        mouth_top = get_point(13)
        mouth_bottom = get_point(14)
        
        mouth_width = abs(mouth_left[0] - mouth_right[0])
        mouth_height = abs(mouth_top[1] - mouth_bottom[1])
        
        features["mouth_width"] = mouth_width
        features["mouth_height"] = mouth_height
        features["mouth_aspect_ratio"] = mouth_height / mouth_width if mouth_width > 0 else 0
        
        # Eyebrow height (relative to eyes)
        left_eyebrow = get_point(52)
        right_eyebrow = get_point(272)
        
        left_eye_center_y = (left_eye_outer[1] + left_eye_inner[1]) / 2
        right_eye_center_y = (right_eye_outer[1] + right_eye_inner[1]) / 2
        
        features["left_eyebrow_height"] = left_eyebrow[1] - left_eye_center_y
        features["right_eyebrow_height"] = right_eyebrow[1] - right_eye_center_y
        features["eyebrow_height"] = (features["left_eyebrow_height"] + features["right_eyebrow_height"]) / 2
        
        # Nose to mouth distance
        nose_tip = get_point(1)
        mouth_center = get_point(0)
        features["nose_mouth_distance"] = np.sqrt(
            (nose_tip[0] - mouth_center[0])**2 + 
            (nose_tip[1] - mouth_center[1])**2
        )
        
        # Face width (cheekbones)
        left_cheek = get_point(10)
        right_cheek = get_point(340)
        features["face_width"] = abs(left_cheek[0] - right_cheek[0])
        
        return features
    
    def _determine_expression_from_features(self, features: Dict) -> Tuple[ExpressionType, float]:
        """
        Determine expression from geometric features
        
        Args:
            features: Dictionary of geometric features
        
        Returns:
            Tuple of (expression, confidence)
        """
        if not features:
            return ExpressionType.NEUTRAL, 1.0
        
        # Check for smile (wide mouth, raised cheeks)
        if (features.get("mouth_width", 0) > 0.3 and 
            features.get("mouth_height", 0) > 0.1 and
            features.get("eyebrow_height", 0) < -0.05):
            return ExpressionType.SMILE, 0.8
        
        # Check for surprise (wide eyes, raised eyebrows)
        if (features.get("eye_openness", 0) > 0.3 and
            features.get("eyebrow_height", 0) < -0.1):
            return ExpressionType.SURPRISE, 0.7
        
        # Check for angry (lowered eyebrows, tight mouth)
        if (features.get("eyebrow_height", 0) > 0.05 and
            features.get("mouth_height", 0) < 0.05):
            return ExpressionType.ANGRY, 0.6
        
        # Default to neutral
        return ExpressionType.NEUTRAL, 0.9
    
    def get_expression_description(self, expression: ExpressionType) -> str:
        """
        Get a human-readable description of an expression
        
        Args:
            expression: ExpressionType enum
        
        Returns:
            Human-readable description
        """
        descriptions = {
            ExpressionType.NEUTRAL: "Visage neutre",
            ExpressionType.SMILE: "Sourire",
            ExpressionType.SURPRISE: "Surprise",
            ExpressionType.ANGRY: "Colère",
            ExpressionType.SAD: "Tristesse",
            ExpressionType.DISGUST: "Dégoût",
            ExpressionType.FEAR: "Peur",
            ExpressionType.BROW_RAISE: "Sourcils levés",
            ExpressionType.MOUTH_OPEN: "Bouche ouverte",
            ExpressionType.EYE_BLINK: "Clignement des yeux",
            ExpressionType.UNKNOWN: "Expression inconnue"
        }
        return descriptions.get(expression, "Expression inconnue")
    
    def get_all_expressions(self) -> List[Dict]:
        """
        Get list of all possible expressions
        
        Returns:
            List of expression dictionaries
        """
        return [
            {"type": expr.value, "name": expr.name, "description": self.get_expression_description(expr)}
            for expr in ExpressionType
        ]
