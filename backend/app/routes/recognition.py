"""
Face Recognition Routes for FaceMood AI
Handles face recognition and identity verification
"""
from fastapi import APIRouter, Depends, UploadFile, File, Query
from fastapi.responses import JSONResponse
from typing import Optional
import numpy as np
import cv2
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_db
from ..core.config import settings
from ..services.embedding_service import EmbeddingService
from ..services.recognition_service import RecognitionService
from ..models.face_model import (
    FaceRecognizeRequest,
    FaceRecognizeResponse,
    ErrorResponse
)
import logging

logger = logging.getLogger(__name__)

# Initialize services
embedding_service = EmbeddingService()
recognition_service = RecognitionService(embedding_service)

router = APIRouter(prefix="/api/recognize", tags=["Face Recognition"])


@router.post("/", response_model=FaceRecognizeResponse)
async def recognize_face(
    file: UploadFile = File(..., description="Image file (JPEG/PNG)"),
    threshold: Optional[float] = Query(
        default=None,
        ge=0.0,
        le=1.0,
        description="Recognition confidence threshold (0.0 to 1.0)"
    )
) -> FaceRecognizeResponse:
    """
    Recognize a face in an image
    
    Compares the face against all enrolled profiles and returns the best match
    
    Parameters:
        - file: Image file containing a face
        - threshold: Optional confidence threshold (default: 0.6)
    
    Returns:
        Recognition result with profile information if matched
    """
    try:
        # Read image
        image_bytes = await file.read()
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Perform recognition
        db = next(get_db())
        try:
            result = await recognition_service.recognize(
                session=db,
                image=image,
                threshold=threshold
            )
            
            if result.get("success", False):
                if result.get("recognized", False):
                    profile = result.get("profile")
                    return FaceRecognizeResponse(
                        success=True,
                        recognized=True,
                        profile=profile,
                        message=result.get("message", "Face recognized")
                    )
                else:
                    return FaceRecognizeResponse(
                        success=True,
                        recognized=False,
                        message=result.get("message", "No matching profile found")
                    )
            else:
                return FaceRecognizeResponse(
                    success=False,
                    recognized=False,
                    message=result.get("message", "Recognition failed")
                )
        finally:
            await db.close()
        
    except Exception as e:
        logger.error(f"Error in face recognition: {e}")
        return FaceRecognizeResponse(
            success=False,
            recognized=False,
            message=f"Error recognizing face: {str(e)}"
        )


@router.post("/verify/{profile_id}", response_model=FaceRecognizeResponse)
async def verify_identity(
    profile_id: int,
    file: UploadFile = File(..., description="Image file (JPEG/PNG)"),
    threshold: Optional[float] = Query(
        default=None,
        ge=0.0,
        le=1.0,
        description="Verification confidence threshold"
    )
) -> FaceRecognizeResponse:
    """
    Verify if an image matches a specific profile
    
    Parameters:
        - profile_id: ID of the profile to verify against
        - file: Image file containing a face
        - threshold: Optional confidence threshold
    
    Returns:
        Verification result
    """
    try:
        # Read image
        image_bytes = await file.read()
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Perform verification
        db = next(get_db())
        try:
            result = await recognition_service.verify_identity(
                session=db,
                profile_id=profile_id,
                image=image,
                threshold=threshold
            )
            
            if result.get("success", False):
                if result.get("verified", False):
                    return FaceRecognizeResponse(
                        success=True,
                        recognized=True,
                        profile={
                            "id": result.get("profile_id"),
                            "name": result.get("profile_name"),
                            "confidence": result.get("confidence", 0.0)
                        },
                        message=result.get("message", "Identity verified")
                    )
                else:
                    return FaceRecognizeResponse(
                        success=True,
                        recognized=False,
                        message=result.get("message", "Identity not verified")
                    )
            else:
                return FaceRecognizeResponse(
                    success=False,
                    recognized=False,
                    message=result.get("message", "Verification failed")
                )
        finally:
            await db.close()
        
    except Exception as e:
        logger.error(f"Error in identity verification: {e}")
        return FaceRecognizeResponse(
            success=False,
            recognized=False,
            message=f"Error verifying identity: {str(e)}"
        )


@router.get("/similar/{profile_id}")
async def find_similar(
    profile_id: int,
    threshold: Optional[float] = Query(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Minimum similarity threshold"
    ),
    top_k: int = Query(
        default=5,
        ge=1,
        le=20,
        description="Number of similar profiles to return"
    )
):
    """
    Find profiles similar to a given profile
    
    Parameters:
        - profile_id: Reference profile ID
        - threshold: Minimum similarity threshold
        - top_k: Number of similar profiles to return
    
    Returns:
        List of similar profiles with similarity scores
    """
    try:
        db = next(get_db())
        try:
            # Get the reference profile's embedding
            profile_result = await recognition_service.get_profile_embedding(
                session=db,
                profile_id=profile_id
            )
            
            if not profile_result.get("success", False):
                return {
                    "success": False,
                    "message": profile_result.get("message", "Profile not found")
                }
            
            # Find similar profiles
            similar_profiles = await recognition_service.find_similar_faces(
                session=db,
                image=None,  # We'll use the embedding directly
                top_k=top_k,
                threshold=threshold
            )
            
            return {
                "success": True,
                "similar_profiles": similar_profiles
            }
            
        finally:
            await db.close()
        
    except Exception as e:
        logger.error(f"Error finding similar profiles: {e}")
        return {
            "success": False,
            "message": f"Error finding similar profiles: {str(e)}"
        }


@router.get("/threshold")
async def get_recognition_threshold():
    """
    Get the current recognition threshold
    
    Returns:
        Current threshold value
    """
    return {
        "threshold": recognition_service.get_threshold(),
        "default_threshold": settings.recognition_threshold
    }


@router.post("/threshold")
async def set_recognition_threshold(
    threshold: float = Query(..., ge=0.0, le=1.0, description="New threshold value")
):
    """
    Set the recognition threshold
    
    Parameters:
        - threshold: New threshold value (0.0 to 1.0)
    
    Returns:
        Confirmation message
    """
    try:
        recognition_service.set_threshold(threshold)
        return {
            "success": True,
            "message": f"Recognition threshold set to {threshold}",
            "threshold": threshold
        }
    except Exception as e:
        return {
            "success": False,
            "message": str(e)
        }
