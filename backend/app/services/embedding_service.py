"""
Embedding Service using InsightFace
Generates face embeddings for recognition
"""
import cv2
import numpy as np
from typing import List, Dict, Optional, Tuple
from insightface.app import FaceAnalysis
from insightface.data import mx_to_numpy
from ..core.config import settings
from ..core.security import encrypt_data, decrypt_data
import logging

logger = logging.getLogger(__name__)


class EmbeddingService:
    """
    Service for generating and managing face embeddings
    Uses InsightFace for high-quality face embeddings
    """
    
    def __init__(self):
        """
        Initialize the embedding service
        """
        self.app = None
        self._initialize_insightface()
    
    def _initialize_insightface(self):
        """Initialize InsightFace model"""
        try:
            # Initialize FaceAnalysis with the specified model
            self.app = FaceAnalysis(
                name=settings.insightface_model_name,
                providers=settings.insightface_providers
            )
            self.app.prepare(
                ctx_id=0,
                det_size=(settings.camera_width, settings.camera_height)
            )
            logger.info(f"InsightFace model '{settings.insightface_model_name}' initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize InsightFace: {e}")
            raise
    
    def generate_embedding(self, image: np.ndarray) -> Optional[np.ndarray]:
        """
        Generate face embedding from an image
        
        Args:
            image: Input image as numpy array (BGR format)
        
        Returns:
            Face embedding as numpy array or None if no face detected
        """
        if self.app is None:
            logger.error("InsightFace not initialized")
            return None
        
        try:
            # Convert to RGB if needed
            if len(image.shape) == 3 and image.shape[2] == 3:
                image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            else:
                image_rgb = image
            
            # Detect faces and get embeddings
            faces = self.app.get(image_rgb)
            
            if not faces:
                logger.warning("No faces detected in image")
                return None
            
            # Use the first face (or the one with highest confidence)
            best_face = faces[0]
            for face in faces[1:]:
                if face.det_score > best_face.det_score:
                    best_face = face
            
            # Get embedding
            embedding = best_face.embedding
            
            # Normalize embedding (L2 normalization)
            if embedding is not None:
                embedding = embedding / np.linalg.norm(embedding)
            
            return embedding
            
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            return None
    
    def generate_embedding_from_bytes(self, image_bytes: bytes) -> Optional[np.ndarray]:
        """
        Generate face embedding from image bytes
        
        Args:
            image_bytes: Image data as bytes
        
        Returns:
            Face embedding as numpy array or None
        """
        try:
            # Decode image
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            return self.generate_embedding(image)
        except Exception as e:
            logger.error(f"Error decoding image: {e}")
            return None
    
    def generate_multiple_embeddings(
        self, 
        images: List[np.ndarray], 
        num_images: int = 5
    ) -> Optional[np.ndarray]:
        """
        Generate average embedding from multiple images
        
        Args:
            images: List of input images
            num_images: Number of images to use (best ones)
        
        Returns:
            Average embedding as numpy array
        """
        if not images:
            return None
        
        embeddings = []
        confidences = []
        
        for image in images:
            embedding = self.generate_embedding(image)
            if embedding is not None:
                # Get confidence from face detection
                faces = self.app.get(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
                if faces:
                    confidence = max(face.det_score for face in faces)
                else:
                    confidence = 0.5
                
                embeddings.append(embedding)
                confidences.append(confidence)
        
        if not embeddings:
            return None
        
        # Sort by confidence and take top num_images
        sorted_indices = np.argsort(confidences)[::-1][:num_images]
        selected_embeddings = [embeddings[i] for i in sorted_indices]
        
        # Calculate average embedding
        average_embedding = np.mean(selected_embeddings, axis=0)
        
        # Normalize the average
        average_embedding = average_embedding / np.linalg.norm(average_embedding)
        
        return average_embedding
    
    def encrypt_embedding(self, embedding: np.ndarray) -> bytes:
        """
        Encrypt a face embedding
        
        Args:
            embedding: Face embedding as numpy array
        
        Returns:
            Encrypted embedding as bytes
        """
        if embedding is None:
            return b""
        
        # Convert to bytes
        embedding_bytes = embedding.tobytes()
        
        # Encrypt
        encrypted = encrypt_data(embedding_bytes)
        
        return encrypted
    
    def decrypt_embedding(self, encrypted_embedding: bytes) -> Optional[np.ndarray]:
        """
        Decrypt a face embedding
        
        Args:
            encrypted_embedding: Encrypted embedding as bytes
        
        Returns:
            Face embedding as numpy array or None
        """
        if not encrypted_embedding or len(encrypted_embedding) == 0:
            return None
        
        try:
            # Decrypt
            decrypted = decrypt_data(encrypted_embedding)
            
            # Convert to numpy array
            embedding = np.frombuffer(decrypted, dtype=np.float32)
            
            return embedding
        except Exception as e:
            logger.error(f"Error decrypting embedding: {e}")
            return None
    
    def compare_embeddings(
        self, 
        embedding1: np.ndarray, 
        embedding2: np.ndarray,
        method: str = "cosine"
    ) -> float:
        """
        Compare two face embeddings
        
        Args:
            embedding1: First face embedding
            embedding2: Second face embedding
            method: Comparison method ('cosine' or 'euclidean')
        
        Returns:
            Similarity score (0.0 to 1.0 for cosine, distance for euclidean)
        """
        if embedding1 is None or embedding2 is None:
            return 0.0
        
        if method == "cosine":
            # Cosine similarity (higher is more similar)
            dot_product = np.dot(embedding1, embedding2)
            norm1 = np.linalg.norm(embedding1)
            norm2 = np.linalg.norm(embedding2)
            similarity = dot_product / (norm1 * norm2)
            return float(similarity)
        
        elif method == "euclidean":
            # Euclidean distance (lower is more similar)
            distance = np.linalg.norm(embedding1 - embedding2)
            return float(distance)
        
        else:
            raise ValueError(f"Unknown comparison method: {method}")
    
    def get_face_info(self, image: np.ndarray) -> Optional[Dict]:
        """
        Get additional face information (bounding box, landmarks, etc.)
        
        Args:
            image: Input image as numpy array
        
        Returns:
            Dictionary containing face information
        """
        if self.app is None:
            return None
        
        try:
            faces = self.app.get(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
            
            if not faces:
                return None
            
            # Get the best face
            best_face = faces[0]
            for face in faces[1:]:
                if face.det_score > best_face.det_score:
                    best_face = face
            
            return {
                "det_score": best_face.det_score,
                "bbox": best_face.bbox.astype(int).tolist(),
                "landmarks": best_face.kps.astype(float).tolist() if hasattr(best_face, 'kps') else None
            }
        except Exception as e:
            logger.error(f"Error getting face info: {e}")
            return None
    
    def close(self):
        """Clean up resources"""
        if self.app:
            del self.app
            self.app = None
