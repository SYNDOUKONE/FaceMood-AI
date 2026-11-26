"""
Profile Management Routes for FaceMood AI
Handles CRUD operations for face profiles
"""
from fastapi import APIRouter, Depends, UploadFile, File, Query, HTTPException, status
from fastapi.responses import JSONResponse
from typing import List, Optional
import numpy as np
import cv2
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_db, Profile
from ..core.config import settings
from ..services.embedding_service import EmbeddingService
from ..services.face_detector import FaceDetector
from ..services.profile_service import ProfileService
from ..models.face_model import (
    ProfileCreateRequest,
    ProfileResponse,
    ProfileListResponse,
    ErrorResponse
)
import logging

logger = logging.getLogger(__name__)

# Initialize services
embedding_service = EmbeddingService()
face_detector = FaceDetector()
profile_service = ProfileService(embedding_service, face_detector)

router = APIRouter(prefix="/api/profiles", tags=["Profile Management"])


@router.get("/", response_model=ProfileListResponse)
async def list_profiles(
    db: AsyncSession = Depends(get_db)
) -> ProfileListResponse:
    """
    List all enrolled profiles
    
    Returns:
        List of all profiles with basic information
    """
    try:
        result = await profile_service.get_all_profiles(db)
        
        if result.get("success", False):
            profiles = result.get("profiles", [])
            return ProfileListResponse(
                success=True,
                profiles=profiles,
                count=result.get("count", 0)
            )
        else:
            return ProfileListResponse(
                success=False,
                profiles=[],
                count=0,
                message=result.get("message", "Failed to retrieve profiles")
            )
    except Exception as e:
        logger.error(f"Error listing profiles: {e}")
        return ProfileListResponse(
            success=False,
            profiles=[],
            count=0,
            message=f"Error retrieving profiles: {str(e)}"
        )


@router.get("/{profile_id}", response_model=ProfileResponse)
async def get_profile(
    profile_id: int,
    db: AsyncSession = Depends(get_db)
) -> ProfileResponse:
    """
    Get a specific profile by ID
    
    Parameters:
        - profile_id: Profile ID
    
    Returns:
        Profile information
    """
    try:
        result = await profile_service.get_profile(db, profile_id)
        
        if result.get("success", False):
            profile_data = result.get("profile", {})
            return ProfileResponse(**profile_data)
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result.get("message", "Profile not found")
            )
    except Exception as e:
        logger.error(f"Error getting profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving profile: {str(e)}"
        )


@router.post("/", response_model=ProfileResponse)
async def create_profile(
    request: ProfileCreateRequest,
    files: List[UploadFile] = File(..., description="Face images for enrollment")
) -> ProfileResponse:
    """
    Create a new profile
    
    Parameters:
        - request: Profile information (name)
        - files: List of face images
    
    Returns:
        Created profile information
    """
    try:
        if not request.name or len(request.name.strip()) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Profile name is required"
            )
        
        if not files or len(files) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one image is required"
            )
        
        # Read images
        images = []
        for file in files:
            image_bytes = await file.read()
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            images.append(image)
        
        # Create profile
        db = next(get_db())
        try:
            result = await profile_service.create_profile(
                session=db,
                name=request.name.strip(),
                images=images,
                consent=True
            )
            
            if result.get("success", False):
                profile_id = result.get("profile_id")
                profile = await DatabaseManager.get_profile_by_id(db, profile_id)
                if profile:
                    return ProfileResponse(
                        id=profile.id,
                        name=profile.name,
                        consent_given=profile.consent_given,
                        consent_date=profile.consent_date,
                        created_at=profile.created_at,
                        updated_at=profile.updated_at
                    )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=result.get("message", "Failed to create profile")
                )
        finally:
            await db.close()
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating profile: {str(e)}"
        )


@router.put("/{profile_id}", response_model=ProfileResponse)
async def update_profile(
    profile_id: int,
    name: Optional[str] = Query(default=None, description="New profile name"),
    consent: Optional[bool] = Query(default=None, description="New consent status"),
    db: AsyncSession = Depends(get_db)
) -> ProfileResponse:
    """
    Update a profile
    
    Parameters:
        - profile_id: Profile ID
        - name: New name (optional)
        - consent: New consent status (optional)
    
    Returns:
        Updated profile information
    """
    try:
        result = await profile_service.update_profile(
            session=db,
            profile_id=profile_id,
            name=name,
            consent=consent
        )
        
        if result.get("success", False):
            profile_data = result.get("profile", {})
            return ProfileResponse(**profile_data)
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result.get("message", "Profile not found")
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating profile: {str(e)}"
        )


@router.delete("/{profile_id}")
async def delete_profile(
    profile_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a profile
    
    Parameters:
        - profile_id: Profile ID
    
    Returns:
        Confirmation message
    """
    try:
        result = await profile_service.delete_profile(db, profile_id)
        
        if result.get("success", False):
            return {
                "success": True,
                "message": result.get("message", "Profile deleted successfully")
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result.get("message", "Profile not found")
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting profile: {str(e)}"
        )


@router.post("/{profile_id}/update-embedding")
async def update_profile_embedding(
    profile_id: int,
    files: List[UploadFile] = File(..., description="New face images"),
    db: AsyncSession = Depends(get_db)
):
    """
    Update a profile's embedding with new images
    
    Parameters:
        - profile_id: Profile ID
        - files: List of new face images
    
    Returns:
        Confirmation message
    """
    try:
        if not files or len(files) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one image is required"
            )
        
        # Read images
        images = []
        for file in files:
            image_bytes = await file.read()
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            images.append(image)
        
        # Update embedding
        result = await profile_service.update_profile_embedding(
            session=db,
            profile_id=profile_id,
            images=images
        )
        
        if result.get("success", False):
            return {
                "success": True,
                "message": result.get("message", "Profile embedding updated successfully")
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result.get("message", "Profile not found")
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating profile embedding: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating embedding: {str(e)}"
        )


@router.get("/{profile_id}/embedding")
async def get_profile_embedding(
    profile_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get a profile's embedding (decrypted)
    
    Parameters:
        - profile_id: Profile ID
    
    Returns:
        Profile embedding as array
    """
    try:
        result = await profile_service.get_profile_embedding(db, profile_id)
        
        if result.get("success", False):
            return {
                "success": True,
                "embedding": result.get("embedding", []),
                "profile_id": result.get("profile_id")
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result.get("message", "Profile not found")
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting profile embedding: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving embedding: {str(e)}"
        )


@router.get("/count")
async def get_profile_count(
    db: AsyncSession = Depends(get_db)
):
    """
    Get the total number of profiles
    
    Returns:
        Count of enrolled profiles
    """
    try:
        result = await profile_service.get_all_profiles(db)
        return {
            "success": True,
            "count": result.get("count", 0)
        }
    except Exception as e:
        logger.error(f"Error getting profile count: {e}")
        return {
            "success": False,
            "count": 0,
            "message": str(e)
        }


@router.get("/search")
async def search_profiles(
    name: str = Query(..., description="Name to search for"),
    db: AsyncSession = Depends(get_db)
):
    """
    Search for profiles by name
    
    Parameters:
        - name: Name or partial name to search for
    
    Returns:
        List of matching profiles
    """
    try:
        result = await profile_service.get_all_profiles(db)
        
        if not result.get("success", False):
            return {
                "success": False,
                "profiles": [],
                "message": result.get("message", "Failed to search profiles")
            }
        
        # Filter by name
        profiles = result.get("profiles", [])
        matching_profiles = [
            p for p in profiles 
            if name.lower() in p.get("name", "").lower()
        ]
        
        return {
            "success": True,
            "profiles": matching_profiles,
            "count": len(matching_profiles)
        }
    except Exception as e:
        logger.error(f"Error searching profiles: {e}")
        return {
            "success": False,
            "profiles": [],
            "message": str(e)
        }
