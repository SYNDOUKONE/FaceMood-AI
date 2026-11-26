"""
Profile Service for FaceMood AI
Manages face profiles and their associated data
"""
import numpy as np
from typing import List, Dict, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from ..core.database import Profile, DatabaseManager
from ..services.embedding_service import EmbeddingService
from ..services.face_detector import FaceDetector
from ..core.config import settings
import logging
import cv2

logger = logging.getLogger(__name__)


class ProfileService:
    """
    Service for managing face profiles
    Handles creation, retrieval, update, and deletion of profiles
    """
    
    def __init__(
        self,
        embedding_service: EmbeddingService,
        face_detector: FaceDetector
    ):
        """
        Initialize the profile service
        
        Args:
            embedding_service: EmbeddingService instance
            face_detector: FaceDetector instance
        """
        self.embedding_service = embedding_service
        self.face_detector = face_detector
    
    async def create_profile(
        self,
        session: AsyncSession,
        name: str,
        images: List[np.ndarray],
        consent: bool = True,
        num_captures: int = 5
    ) -> Dict:
        """
        Create a new face profile from multiple images
        
        Args:
            session: Database session
            name: Profile name
            images: List of face images
            consent: Whether consent was given
            num_captures: Number of images to use for embedding
        
        Returns:
            Dictionary containing the created profile information
        """
        if not images:
            return {
                "success": False,
                "message": "No images provided"
            }
        
        # Filter out invalid images
        valid_images = []
        for image in images:
            if image is not None and len(image.shape) == 3:
                valid_images.append(image)
        
        if len(valid_images) < 1:
            return {
                "success": False,
                "message": "No valid images provided"
            }
        
        # Generate embeddings from all valid images
        embeddings = []
        for image in valid_images:
            embedding = self.embedding_service.generate_embedding(image)
            if embedding is not None:
                embeddings.append(embedding)
        
        if not embeddings:
            return {
                "success": False,
                "message": "No faces detected in provided images"
            }
        
        # Calculate average embedding
        num_to_use = min(num_captures, len(embeddings))
        selected_embeddings = embeddings[:num_to_use]
        average_embedding = np.mean(selected_embeddings, axis=0)
        
        # Normalize
        average_embedding = average_embedding / np.linalg.norm(average_embedding)
        
        # Encrypt the embedding
        encrypted_embedding = self.embedding_service.encrypt_embedding(average_embedding)
        
        # Create profile in database
        try:
            profile = await DatabaseManager.create_profile(
                session=session,
                name=name,
                embedding=encrypted_embedding,
                consent=consent,
                metadata={
                    "num_images": len(valid_images),
                    "num_embeddings": len(embeddings),
                    "model": settings.insightface_model_name
                }
            )
            
            return {
                "success": True,
                "profile_id": profile.id,
                "name": profile.name,
                "message": f"Profile '{name}' created successfully"
            }
            
        except Exception as e:
            logger.error(f"Error creating profile: {e}")
            return {
                "success": False,
                "message": f"Error creating profile: {e}"
            }
    
    async def create_profile_from_bytes(
        self,
        session: AsyncSession,
        name: str,
        image_bytes_list: List[bytes],
        consent: bool = True
    ) -> Dict:
        """
        Create a profile from image bytes
        
        Args:
            session: Database session
            name: Profile name
            image_bytes_list: List of image bytes
            consent: Whether consent was given
        
        Returns:
            Dictionary containing the created profile information
        """
        try:
            images = []
            for img_bytes in image_bytes_list:
                nparr = np.frombuffer(img_bytes, np.uint8)
                image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                images.append(image)
            
            return await self.create_profile(session, name, images, consent)
            
        except Exception as e:
            logger.error(f"Error decoding images: {e}")
            return {
                "success": False,
                "message": f"Error decoding images: {e}"
            }
    
    async def get_profile(self, session: AsyncSession, profile_id: int) -> Dict:
        """
        Get a profile by ID
        
        Args:
            session: Database session
            profile_id: Profile ID
        
        Returns:
            Dictionary containing profile information
        """
        profile = await DatabaseManager.get_profile_by_id(session, profile_id)
        
        if profile is None:
            return {
                "success": False,
                "message": f"Profile {profile_id} not found"
            }
        
        return {
            "success": True,
            "profile": {
                "id": profile.id,
                "name": profile.name,
                "consent_given": profile.consent_given,
                "consent_date": profile.consent_date.isoformat() if profile.consent_date else None,
                "created_at": profile.created_at.isoformat() if profile.created_at else None,
                "updated_at": profile.updated_at.isoformat() if profile.updated_at else None
            }
        }
    
    async def get_all_profiles(self, session: AsyncSession) -> Dict:
        """
        Get all profiles
        
        Args:
            session: Database session
        
        Returns:
            Dictionary containing list of profiles
        """
        profiles = await DatabaseManager.get_all_profiles(session)
        
        return {
            "success": True,
            "profiles": [
                {
                    "id": p.id,
                    "name": p.name,
                    "consent_given": p.consent_given,
                    "created_at": p.created_at.isoformat() if p.created_at else None
                }
                for p in profiles
            ],
            "count": len(profiles)
        }
    
    async def update_profile(
        self,
        session: AsyncSession,
        profile_id: int,
        name: Optional[str] = None,
        consent: Optional[bool] = None
    ) -> Dict:
        """
        Update a profile
        
        Args:
            session: Database session
            profile_id: Profile ID
            name: New name (optional)
            consent: New consent status (optional)
        
        Returns:
            Dictionary containing update result
        """
        profile = await DatabaseManager.get_profile_by_id(session, profile_id)
        
        if profile is None:
            return {
                "success": False,
                "message": f"Profile {profile_id} not found"
            }
        
        try:
            updated_profile = await DatabaseManager.update_profile(
                session=session,
                profile_id=profile_id,
                name=name,
                consent=consent
            )
            
            return {
                "success": True,
                "profile": {
                    "id": updated_profile.id,
                    "name": updated_profile.name,
                    "consent_given": updated_profile.consent_given
                },
                "message": "Profile updated successfully"
            }
            
        except Exception as e:
            logger.error(f"Error updating profile: {e}")
            return {
                "success": False,
                "message": f"Error updating profile: {e}"
            }
    
    async def delete_profile(self, session: AsyncSession, profile_id: int) -> Dict:
        """
        Delete a profile
        
        Args:
            session: Database session
            profile_id: Profile ID
        
        Returns:
            Dictionary containing deletion result
        """
        try:
            success = await DatabaseManager.delete_profile(session, profile_id)
            
            if success:
                return {
                    "success": True,
                    "message": f"Profile {profile_id} deleted successfully"
                }
            else:
                return {
                    "success": False,
                    "message": f"Profile {profile_id} not found"
                }
                
        except Exception as e:
            logger.error(f"Error deleting profile: {e}")
            return {
                "success": False,
                "message": f"Error deleting profile: {e}"
            }
    
    async def get_profile_embedding(self, session: AsyncSession, profile_id: int) -> Dict:
        """
        Get a profile's embedding (decrypted)
        
        Args:
            session: Database session
            profile_id: Profile ID
        
        Returns:
            Dictionary containing the embedding
        """
        profile = await DatabaseManager.get_profile_by_id(session, profile_id)
        
        if profile is None:
            return {
                "success": False,
                "message": f"Profile {profile_id} not found"
            }
        
        try:
            decrypted_embedding = self.embedding_service.decrypt_embedding(profile.embedding)
            
            if decrypted_embedding is None:
                return {
                    "success": False,
                    "message": "Failed to decrypt embedding"
                }
            
            return {
                "success": True,
                "embedding": decrypted_embedding.tolist(),
                "profile_id": profile_id
            }
            
        except Exception as e:
            logger.error(f"Error getting embedding: {e}")
            return {
                "success": False,
                "message": f"Error getting embedding: {e}"
            }
    
    async def update_profile_embedding(
        self,
        session: AsyncSession,
        profile_id: int,
        images: List[np.ndarray]
    ) -> Dict:
        """
        Update a profile's embedding with new images
        
        Args:
            session: Database session
            profile_id: Profile ID
            images: List of new images
        
        Returns:
            Dictionary containing update result
        """
        profile = await DatabaseManager.get_profile_by_id(session, profile_id)
        
        if profile is None:
            return {
                "success": False,
                "message": f"Profile {profile_id} not found"
            }
        
        # Generate new embedding
        embeddings = []
        for image in images:
            embedding = self.embedding_service.generate_embedding(image)
            if embedding is not None:
                embeddings.append(embedding)
        
        if not embeddings:
            return {
                "success": False,
                "message": "No valid faces detected in new images"
            }
        
        # Calculate average embedding
        average_embedding = np.mean(embeddings, axis=0)
        average_embedding = average_embedding / np.linalg.norm(average_embedding)
        
        # Encrypt
        encrypted_embedding = self.embedding_service.encrypt_embedding(average_embedding)
        
        # Update profile
        try:
            updated_profile = await DatabaseManager.update_profile(
                session=session,
                profile_id=profile_id,
                embedding=encrypted_embedding
            )
            
            return {
                "success": True,
                "profile_id": profile_id,
                "message": "Profile embedding updated successfully"
            }
            
        except Exception as e:
            logger.error(f"Error updating embedding: {e}")
            return {
                "success": False,
                "message": f"Error updating embedding: {e}"
            }
