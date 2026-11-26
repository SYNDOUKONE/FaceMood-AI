"""
Face Detection Routes for FaceMood AI
Handles face detection and landmark extraction
"""
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from fastapi.responses import JSONResponse
from typing import List
import numpy as np
import cv2
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_db
from ..core.config import settings
from ..services.face_detector import FaceDetector
from ..services.landmark_extractor import LandmarkExtractor
from ..models.face_model import (
    FaceDetectRequest,
    FaceDetectResponse,
    FaceEnrollRequest,
    FaceEnrollResponse,
    ErrorResponse
)
from ..services.embedding_service import EmbeddingService
from ..services.profile_service import ProfileService
import logging

logger = logging.getLogger(__name__)

# Initialize services
face_detector = FaceDetector()
landmark_extractor = LandmarkExtractor()
embedding_service = EmbeddingService()
profile_service = ProfileService(embedding_service, face_detector)

router = APIRouter(prefix="/api/faces", tags=["Face Detection"])


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "face_detection",
        "version": settings.app_version
    }


@router.post("/detect", response_model=FaceDetectResponse)
async def detect_faces(
    file: UploadFile = File(..., description="Image file (JPEG/PNG)")
) -> FaceDetectResponse:
    """
    Detect faces in an image
    
    Returns:
        List of detected faces with landmarks and bounding boxes
    """
    try:
        # Read image bytes
        image_bytes = await file.read()
        
        # Detect faces
        detection_result = face_detector.detect_from_bytes(image_bytes)
        
        if detection_result is None:
            return FaceDetectResponse(
                success=False,
                faces=[],
                message="No faces detected"
            )
        
        # Extract landmarks for each face
        faces = []
        for face_data in detection_result.get("faces", []):
            # Get face ROI
            image = face_detector.get_face_roi(
                cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR),
                detection_result
            )
            
            if image:
                # Extract landmarks for this face
                landmark_result = landmark_extractor.extract(image[0])
                
                face_info = {
                    "bounding_box": face_data["bounding_box"],
                    "confidence": face_data.get("confidence", 0.0),
                    "landmarks": landmark_result.get("landmarks", []) if landmark_result else []
                }
                faces.append(face_info)
        
        return FaceDetectResponse(
            success=True,
            faces=faces,
            message=f"Detected {len(faces)} face(s)"
        )
        
    except Exception as e:
        logger.error(f"Error in face detection: {e}")
        return FaceDetectResponse(
            success=False,
            faces=[],
            message=f"Error processing image: {str(e)}"
        )


@router.post("/detect-landmarks", response_model=FaceDetectResponse)
async def detect_landmarks(
    file: UploadFile = File(..., description="Image file (JPEG/PNG)")
) -> FaceDetectResponse:
    """
    Detect faces and extract detailed landmarks
    
    Returns:
        List of faces with 478 landmarks each
    """
    try:
        # Read image
        image_bytes = await file.read()
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Extract landmarks
        landmark_result = landmark_extractor.extract(image)
        
        if landmark_result is None:
            return FaceDetectResponse(
                success=False,
                faces=[],
                message="No faces detected"
            )
        
        # Process results
        faces = []
        for face_idx, face_data in enumerate(landmark_result.get("landmarks", [])):
            face_info = {
                "bounding_box": {},
                "confidence": 1.0,
                "landmarks": face_data.get("landmarks_3d", [])
            }
            faces.append(face_info)
        
        return FaceDetectResponse(
            success=True,
            faces=faces,
            message=f"Extracted landmarks for {len(faces)} face(s)"
        )
        
    except Exception as e:
        logger.error(f"Error in landmark detection: {e}")
        return FaceDetectResponse(
            success=False,
            faces=[],
            message=f"Error processing image: {str(e)}"
        )


@router.post("/enroll", response_model=FaceEnrollResponse)
async def enroll_face(
    name: str = Form(...),
    consent: bool = Form(True),
    files: List[UploadFile] = File(..., description="Multiple face images"),
    db: AsyncSession = Depends(get_db)
) -> FaceEnrollResponse:
    """
    Enroll a new face profile
    
    Requires:
        - name: Profile name or pseudonym
        - consent: User consent (default: True)
        - files: Multiple images of the face (recommended: 5)
    
    Returns:
        Profile ID and confirmation
    """
    try:
        # Validate input
        if not name or len(name.strip()) == 0:
            return FaceEnrollResponse(
                success=False,
                message="Profile name is required"
            )
        
        if not files or len(files) == 0:
            return FaceEnrollResponse(
                success=False,
                message="At least one image is required"
            )
        
        # Read all images
        images = []
        for file in files:
            image_bytes = await file.read()
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            images.append(image)
        
        # Create profile
        result = await profile_service.create_profile(
            session=db,
            name=name.strip(),
            images=images,
            consent=consent
        )
        
        if result.get("success", False):
            return FaceEnrollResponse(
                success=True,
                profile_id=result.get("profile_id"),
                name=result.get("name"),
                message=result.get("message", "Profile enrolled successfully")
            )
        else:
            return FaceEnrollResponse(
                success=False,
                message=result.get("message", "Failed to enroll profile")
            )
        
    except Exception as e:
        logger.error(f"Error in face enrollment: {e}")
        return FaceEnrollResponse(
            success=False,
            message=f"Error enrolling face: {str(e)}"
        )
