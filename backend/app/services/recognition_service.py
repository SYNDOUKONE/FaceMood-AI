"""
Recognition Service for FaceMood AI
Handles face recognition using embeddings
"""
import numpy as np
from typing import List, Dict, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from ..core.database import Profile, DatabaseManager
from ..core.config import settings
from .embedding_service import EmbeddingService
import logging

logger = logging.getLogger(__name__)


class RecognitionService:
    """
    Service for face recognition
    Compares embeddings against stored profiles
    """
    
    def __init__(self, embedding_service: EmbeddingService):
        """
        Initialize the recognition service
        
        Args:
            embedding_service: EmbeddingService instance
        """
        self.embedding_service = embedding_service
        self.threshold = settings.recognition_threshold
    
    async def recognize(
        self, 
        session: AsyncSession,
        image: np.ndarray,
        threshold: Optional[float] = None
    ) -> Dict:
        """
        Recognize a face in an image
        
        Args:
            session: Database session
            image: Input image as numpy array
            threshold: Recognition threshold (overrides default)
        
        Returns:
            Dictionary containing recognition result
        """
        use_threshold = threshold if threshold is not None else self.threshold
        
        # Generate embeddings for all detected faces
        detected_faces = self.embedding_service.generate_all_embeddings(image)
        
        if not detected_faces:
            return {
                "success": False,
                "recognized": False,
                "results": [],
                "message": "No face detected in image"
            }
        
        # Get all profiles from database
        profiles = await DatabaseManager.get_all_profiles(session)
        
        if not profiles:
            return {
                "success": True,
                "recognized": False,
                "results": [
                    {
                        "recognized": False,
                        "profile": None,
                        "confidence": 0.0,
                        "bbox": face["bbox"],
                    }
                    for face in detected_faces
                ],
                "message": "No profiles in database"
            }
        
        # Pre-decrypt stored embeddings once for all detected faces
        decrypted_profiles = []
        for profile in profiles:
            decrypted_embedding = self.embedding_service.decrypt_embedding(profile.embedding)
            if decrypted_embedding is None:
                logger.warning(f"Failed to decrypt embedding for profile {profile.id}")
                continue
            decrypted_profiles.append((profile, decrypted_embedding))
        
        face_results = []
        primary_profile = None
        any_recognized = False

        for face in detected_faces:
            emb = face["embedding"]
            best_match = None
            best_score = 0.0

            for profile, stored_emb in decrypted_profiles:
                similarity = self.embedding_service.compare_embeddings(
                    emb,
                    stored_emb,
                    method="cosine"
                )
                if similarity > best_score:
                    best_score = similarity
                    best_match = profile

            is_match = bool(best_match and best_score >= use_threshold)
            matched_profile = None
            if is_match:
                matched_profile = {
                    "id": best_match.id,
                    "name": best_match.name,
                    "confidence": float(best_score),
                }
                any_recognized = True
                if primary_profile is None:
                    primary_profile = matched_profile

            face_results.append({
                "recognized": is_match,
                "profile": matched_profile,
                "confidence": float(best_score) if best_match else 0.0,
                "bbox": face["bbox"],
            })

        if any_recognized:
            names = ", ".join(r["profile"]["name"] for r in face_results if r["recognized"])
            return {
                "success": True,
                "recognized": True,
                "profile": primary_profile,
                "results": face_results,
                "threshold": use_threshold,
                "message": f"Recognized: {names}"
            }
        else:
            return {
                "success": True,
                "recognized": False,
                "profile": None,
                "results": face_results,
                "confidence": max((r["confidence"] for r in face_results), default=0.0),
                "threshold": use_threshold,
                "message": "No matching profile found"
            }
    
    async def recognize_from_bytes(
        self,
        session: AsyncSession,
        image_bytes: bytes,
        threshold: Optional[float] = None
    ) -> Dict:
        """
        Recognize a face from image bytes
        
        Args:
            session: Database session
            image_bytes: Image data as bytes
            threshold: Recognition threshold
        
        Returns:
            Dictionary containing recognition result
        """
        try:
            import cv2
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            return await self.recognize(session, image, threshold)
        except Exception as e:
            logger.error(f"Error decoding image: {e}")
            return {
                "success": False,
                "recognized": False,
                "message": f"Error decoding image: {e}"
            }
    
    async def find_similar_faces(
        self,
        session: AsyncSession,
        image: np.ndarray,
        top_k: int = 5,
        threshold: Optional[float] = None
    ) -> List[Dict]:
        """
        Find similar faces in the database
        
        Args:
            session: Database session
            image: Input image as numpy array
            top_k: Number of similar faces to return
            threshold: Minimum similarity threshold
        
        Returns:
            List of similar profiles with scores
        """
        use_threshold = threshold if threshold is not None else 0.0
        
        # Generate embedding
        embedding = self.embedding_service.generate_embedding(image)
        
        if embedding is None:
            return []
        
        # Get all profiles
        profiles = await DatabaseManager.get_all_profiles(session)
        
        # Calculate similarities
        similarities = []
        for profile in profiles:
            decrypted_embedding = self.embedding_service.decrypt_embedding(profile.embedding)
            if decrypted_embedding is None:
                continue
            
            similarity = self.embedding_service.compare_embeddings(
                embedding,
                decrypted_embedding,
                method="cosine"
            )
            
            if similarity >= use_threshold:
                similarities.append({
                    "profile_id": profile.id,
                    "name": profile.name,
                    "similarity": similarity
                })
        
        # Sort by similarity (descending)
        similarities.sort(key=lambda x: x["similarity"], reverse=True)
        
        # Return top k
        return similarities[:top_k]
    
    async def verify_identity(
        self,
        session: AsyncSession,
        profile_id: int,
        image: np.ndarray,
        threshold: Optional[float] = None
    ) -> Dict:
        """
        Verify if an image matches a specific profile
        
        Args:
            session: Database session
            profile_id: Profile ID to verify against
            image: Input image as numpy array
            threshold: Verification threshold
        
        Returns:
            Dictionary containing verification result
        """
        use_threshold = threshold if threshold is not None else self.threshold
        
        # Get the profile
        profile = await DatabaseManager.get_profile_by_id(session, profile_id)
        
        if profile is None:
            return {
                "success": False,
                "verified": False,
                "message": f"Profile {profile_id} not found"
            }
        
        # Generate embedding for input image
        embedding = self.embedding_service.generate_embedding(image)
        
        if embedding is None:
            return {
                "success": False,
                "verified": False,
                "message": "No face detected in image"
            }
        
        # Decrypt stored embedding
        decrypted_embedding = self.embedding_service.decrypt_embedding(profile.embedding)
        
        if decrypted_embedding is None:
            return {
                "success": False,
                "verified": False,
                "message": "Failed to decrypt stored embedding"
            }
        
        # Compare embeddings
        similarity = self.embedding_service.compare_embeddings(
            embedding,
            decrypted_embedding,
            method="cosine"
        )
        
        # Check threshold
        if similarity >= use_threshold:
            return {
                "success": True,
                "verified": True,
                "profile_id": profile_id,
                "profile_name": profile.name,
                "confidence": float(similarity),
                "threshold": use_threshold,
                "message": f"Identity verified with confidence {similarity:.2f}"
            }
        else:
            return {
                "success": True,
                "verified": False,
                "profile_id": profile_id,
                "profile_name": profile.name,
                "confidence": float(similarity),
                "threshold": use_threshold,
                "message": f"Identity not verified (confidence {similarity:.2f} < {use_threshold:.2f})"
            }
    
    def set_threshold(self, threshold: float):
        """Set the recognition threshold"""
        if 0.0 <= threshold <= 1.0:
            self.threshold = threshold
        else:
            raise ValueError("Threshold must be between 0.0 and 1.0")
    
    def get_threshold(self) -> float:
        """Get the current recognition threshold"""
        return self.threshold
