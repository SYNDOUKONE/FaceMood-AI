"""
Expression Analysis Routes for FaceMood AI
Handles facial expression analysis
"""
from fastapi import APIRouter, Depends, UploadFile, File
from fastapi.responses import JSONResponse
from typing import Optional
import numpy as np
import cv2

from ..core.config import settings
from ..services.landmark_extractor import LandmarkExtractor
from ..services.expression_analyzer import ExpressionAnalyzer
from ..models.face_model import (
    ExpressionAnalyzeRequest,
    ExpressionAnalyzeResponse,
    ExpressionType
)
import logging

logger = logging.getLogger(__name__)

# Initialize services
landmark_extractor = LandmarkExtractor()
expression_analyzer = ExpressionAnalyzer(landmark_extractor)

router = APIRouter(prefix="/api/expressions", tags=["Expression Analysis"])


@router.post("/analyze", response_model=ExpressionAnalyzeResponse)
async def analyze_expression(
    file: UploadFile = File(..., description="Image file (JPEG/PNG)")
) -> ExpressionAnalyzeResponse:
    """
    Analyze facial expression in an image
    
    Uses MediaPipe blendshapes and geometric features to determine the expression
    
    Parameters:
        - file: Image file containing a face
    
    Returns:
        Detected expression with confidence score
    """
    try:
        # Read image
        image_bytes = await file.read()
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Extract landmarks and blendshapes
        landmark_result = landmark_extractor.extract(image)
        
        if landmark_result is None or not landmark_result.get("landmarks"):
            return ExpressionAnalyzeResponse(
                success=False,
                message="No face detected in image"
            )
        
        # Analyze expression — blendshapes is now a list-of-lists (one per face).
        # We pick the first face for single-shot expression analysis.
        landmarks = landmark_result.get("landmarks", [{}])[0].get("landmarks_3d", [])
        all_blendshapes = landmark_result.get("blendshapes", [])
        blendshapes = all_blendshapes[0] if all_blendshapes else []
        
        result = expression_analyzer.analyze(landmarks, blendshapes)
        
        # Format response
        expression_result = {
            "expression": result.get("expression", ExpressionType.UNKNOWN),
            "confidence": result.get("confidence", 0.0),
            "blendshapes": result.get("blendshapes", {})
        }
        
        return ExpressionAnalyzeResponse(
            success=True,
            result=expression_result,
            message=f"Expression: {expression_analyzer.get_expression_description(expression_result['expression'])}"
        )
        
    except Exception as e:
        logger.error(f"Error in expression analysis: {e}")
        return ExpressionAnalyzeResponse(
            success=False,
            message=f"Error analyzing expression: {str(e)}"
        )


@router.get("/list")
async def list_expressions():
    """
    List all possible expressions
    
    Returns:
        List of all supported expressions with descriptions
    """
    expressions = expression_analyzer.get_all_expressions()
    return {
        "success": True,
        "expressions": expressions,
        "count": len(expressions)
    }


@router.get("/analyze-live")
async def get_live_analysis_info():
    """
    Get information about live expression analysis
    
    Returns:
        Information about the analysis process
    """
    return {
        "success": True,
        "method": "MediaPipe Blendshapes + Geometric Features",
        "supported_expressions": [e.value for e in ExpressionType],
        "description": "Analyzes facial expressions using 52 blendshapes and geometric features"
    }
