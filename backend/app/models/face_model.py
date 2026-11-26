"""
Pydantic models for FaceMood AI API
Defines request and response schemas for all endpoints
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


# Enums
class ExpressionType(str, Enum):
    NEUTRAL = "Neutre"
    SMILE = "Sourire"
    SURPRISE = "Surprise"
    ANGRY = "Colère"
    SAD = "Triste"
    DISGUST = "Dégoût"
    FEAR = "Peur"
    BROW_RAISE = "Sourcils levés"
    MOUTH_OPEN = "Bouche ouverte"
    EYE_BLINK = "Clignement"
    UNKNOWN = "Inconnu"


class ProfileStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"


# Request Models
class FaceDetectRequest(BaseModel):
    """Request model for face detection"""
    image: bytes = Field(..., description="Image bytes in JPEG format")


class FaceEnrollRequest(BaseModel):
    """Request model for face enrollment"""
    name: str = Field(..., min_length=1, max_length=100, description="Profile name or pseudonym")
    image: bytes = Field(..., description="Image bytes for face enrollment")
    consent: bool = Field(default=True, description="User consent for face data storage")


class FaceRecognizeRequest(BaseModel):
    """Request model for face recognition"""
    image: bytes = Field(..., description="Image bytes for face recognition")
    threshold: Optional[float] = Field(
        default=0.6,
        ge=0.0,
        le=1.0,
        description="Recognition confidence threshold (0.0 to 1.0)"
    )


class ExpressionAnalyzeRequest(BaseModel):
    """Request model for expression analysis"""
    image: bytes = Field(..., description="Image bytes for expression analysis")


class ProfileCreateRequest(BaseModel):
    """Request model for profile creation"""
    name: str = Field(..., min_length=1, max_length=100, description="Profile name")


# Response Models
class Landmark(BaseModel):
    """Single landmark point"""
    x: float = Field(..., description="X coordinate (0.0 to 1.0)")
    y: float = Field(..., description="Y coordinate (0.0 to 1.0)")
    z: Optional[float] = Field(default=None, description="Z coordinate (depth)")


class FaceDetection(BaseModel):
    """Face detection result"""
    landmarks: List[Landmark] = Field(default_factory=list, description="List of face landmarks")
    bounding_box: Dict[str, float] = Field(
        default_factory=dict,
        description="Bounding box coordinates (xmin, ymin, xmax, ymax)"
    )
    confidence: float = Field(..., description="Detection confidence score")


class FaceDetectResponse(BaseModel):
    """Response model for face detection"""
    success: bool = Field(default=True, description="Whether detection was successful")
    faces: List[FaceDetection] = Field(default_factory=list, description="List of detected faces")
    message: Optional[str] = Field(default=None, description="Additional message")


class FaceEnrollResponse(BaseModel):
    """Response model for face enrollment"""
    success: bool = Field(default=True, description="Whether enrollment was successful")
    profile_id: Optional[int] = Field(default=None, description="ID of the created profile")
    name: Optional[str] = Field(default=None, description="Profile name")
    message: Optional[str] = Field(default=None, description="Additional message")


class RecognizedProfile(BaseModel):
    """Recognized profile information"""
    id: int = Field(..., description="Profile ID")
    name: str = Field(..., description="Profile name")
    confidence: float = Field(..., description="Recognition confidence score")


class FaceRecognizeResponse(BaseModel):
    """Response model for face recognition"""
    success: bool = Field(default=True, description="Whether recognition was successful")
    recognized: bool = Field(default=False, description="Whether a face was recognized")
    profile: Optional[RecognizedProfile] = Field(default=None, description="Recognized profile")
    message: Optional[str] = Field(default=None, description="Additional message")


class ExpressionResult(BaseModel):
    """Expression analysis result"""
    expression: ExpressionType = Field(..., description="Detected expression")
    confidence: float = Field(..., description="Expression confidence score")
    blendshapes: Dict[str, float] = Field(
        default_factory=dict,
        description="Raw blendshape scores"
    )


class ExpressionAnalyzeResponse(BaseModel):
    """Response model for expression analysis"""
    success: bool = Field(default=True, description="Whether analysis was successful")
    result: Optional[ExpressionResult] = Field(default=None, description="Expression analysis result")
    message: Optional[str] = Field(default=None, description="Additional message")


class ProfileResponse(BaseModel):
    """Response model for a single profile"""
    id: int = Field(..., description="Profile ID")
    name: str = Field(..., description="Profile name")
    consent_given: bool = Field(..., description="Whether consent was given")
    consent_date: datetime = Field(..., description="Date when consent was given")
    created_at: datetime = Field(..., description="Profile creation date")
    updated_at: datetime = Field(..., description="Last update date")


class ProfileListResponse(BaseModel):
    """Response model for list of profiles"""
    success: bool = Field(default=True, description="Whether the request was successful")
    profiles: List[ProfileResponse] = Field(default_factory=list, description="List of profiles")
    count: int = Field(default=0, description="Total number of profiles")


class HealthResponse(BaseModel):
    """Response model for health check"""
    status: str = Field(default="healthy", description="Health status")
    version: str = Field(..., description="Application version")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Timestamp")


class ErrorResponse(BaseModel):
    """Standard error response model"""
    success: bool = Field(default=False, description="Whether the request was successful")
    error: str = Field(..., description="Error message")
    details: Optional[Dict[str, Any]] = Field(default=None, description="Error details")


# Configure Pydantic models
for model in [
    FaceDetectRequest, FaceDetectResponse,
    FaceEnrollRequest, FaceEnrollResponse,
    FaceRecognizeRequest, FaceRecognizeResponse,
    ExpressionAnalyzeRequest, ExpressionAnalyzeResponse,
    ProfileCreateRequest, ProfileResponse, ProfileListResponse,
    HealthResponse, ErrorResponse
]:
    model.model_config = ConfigDict(
        json_schema_extra={
            "example": model.model_fields
        }
    )
