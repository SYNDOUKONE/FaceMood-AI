"""
Configuration settings for FaceMood AI
Uses Pydantic Settings for type-safe environment variables
"""
from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List, Optional
import os


class Settings(BaseSettings):
    # Application
    app_name: str = Field(default="FaceMood AI", env="APP_NAME")
    app_version: str = Field(default="2.0.0", env="APP_VERSION")
    debug: bool = Field(default=False, env="DEBUG")
    
    # Server
    host: str = Field(default="0.0.0.0", env="HOST")
    port: int = Field(default=8000, env="PORT")
    
    # Database
    database_url: str = Field(
        default="sqlite+aiosqlite:///./data/face_database.db",
        env="DATABASE_URL"
    )
    
    # Security
    secret_key: str = Field(
        default="your-secret-key-here-change-in-production",
        env="SECRET_KEY"
    )
    algorithm: str = Field(default="HS256", env="ALGORITHM")
    access_token_expire_minutes: int = Field(
        default=30,
        env="ACCESS_TOKEN_EXPIRE_MINUTES"
    )
    
    # Encryption
    encryption_key: str = Field(
        default="your-fernet-encryption-key-here",
        env="ENCRYPTION_KEY"
    )
    
    # MediaPipe
    mediapipe_model_path: str = Field(
        default="./models/face_landmarker.task",
        env="MEDIAPIPE_MODEL_PATH"
    )
    
    # InsightFace
    insightface_model_name: str = Field(
        default="antelopev2",
        env="INSIGHTFACE_MODEL_NAME"
    )
    insightface_providers: List[str] = Field(
        default=["CPUExecutionProvider"],
        env="INSIGHTFACE_PROVIDERS"
    )
    
    # Recognition
    recognition_threshold: float = Field(
        default=0.6,
        env="RECOGNITION_THRESHOLD"
    )
    
    # Camera
    camera_width: int = Field(default=640, env="CAMERA_WIDTH")
    camera_height: int = Field(default=480, env="CAMERA_HEIGHT")
    
    # Model paths
    @property
    def mediapipe_model_abs_path(self) -> str:
        """Absolute path to MediaPipe model"""
        return os.path.abspath(self.mediapipe_model_path)
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


# Initialize settings
settings = Settings()
