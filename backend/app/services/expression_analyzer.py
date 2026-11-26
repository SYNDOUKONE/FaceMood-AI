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
    
    # Expression thresholds for blendshapes
    BLENDSHAPE_THRESHOLDS = {
        "smile": 0.7,
        "browRaise": 0.6,
        "browFrown": 0.5,
        "mouthOpen": 0.5,
        "mouthSmile": 0.6,
        "mouthFrown": 0.5,
        "eyeBlink": 0.8,
        "eyeWiden": 0.6,
        "cheekRaise": 0.5,
        "noseWrinkle": 0.5
    }
    
    # Expression mapping from blendshapes to ExpressionType
    BLENDSHAPE_TO_EXPRESSION = {
        "smile": ExpressionType.SMILE,
        "mouthSmile": ExpressionType.SMILE,
        "browRaise": ExpressionType.SURPRISE,
        "eyeWiden": ExpressionType.SURPRISE,
        "browFrown": ExpressionType.ANGRY,
        "mouthFrown": ExpressionType.ANGRY,
        "noseWrinkle": ExpressionType.DISGUST,
        "mouthOpen": ExpressionType.MOUTH_OPEN,
        "eyeBlink": ExpressionType.EYE_BLINK,
        "cheekRaise": ExpressionType.SMILE
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
        blendshape_dict = {bs["category_name"]: bs["score"] for bs in blendshapes}
        
        # Find the most prominent expression
        best_expression = ExpressionType.NEUTRAL
        best_confidence = 0.0
        
        for category, threshold in self.BLENDSHAPE_THRESHOLDS.items():
            if category in blendshape_dict:
                score = blendshape_dict[category]
                if score > threshold and score > best_confidence:
                    # Map to ExpressionType
                    expression_type = self.BLENDSHAPE_TO_EXPRESSION.get(
                        category, ExpressionType.UNKNOWN
                    )
                    best_expression = expression_type
                    best_confidence = score
        
        # If no expression detected, check for neutral
        if best_expression == ExpressionType.NEUTRAL and best_confidence == 0.0:
            # Check if all scores are low
            max_score = max(blendshape_dict.values()) if blendshape_dict else 0.0
            if max_score < 0.3:
                best_expression = ExpressionType.NEUTRAL
                best_confidence = 1.0 - max_score
        
        return {
            "expression": best_expression,
            "confidence": float(best_confidence),
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
        
        # Combine results (prioritize blendshapes as they're more reliable)
        if blendshape_result["confidence"] > landmark_result["confidence"]:
            return {
                **blendshape_result,
                "features": landmark_result.get("features", {})
            }
        else:
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
