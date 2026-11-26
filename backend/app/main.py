"""
FaceMood AI - Main Application
Intelligent Face Detection, Recognition, and Expression Analysis System

This is the main entry point for the FastAPI backend server.
"""
import uvicorn
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import logging
from typing import AsyncGenerator

# Import local modules
from .core.config import settings
from .core.database import init_db, Base
from .routes import (
    face_router,
    recognition_router,
    expression_router,
    profiles_router
)
from .services.face_detector import FaceDetector
from .services.landmark_extractor import LandmarkExtractor
from .services.embedding_service import EmbeddingService
from .services.recognition_service import RecognitionService
from .services.expression_analyzer import ExpressionAnalyzer
from .services.profile_service import ProfileService

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.debug else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


# Lifespan management
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan manager
    Handles startup and shutdown events
    """
    # Startup
    logger.info("Starting FaceMood AI backend...")
    logger.info(f"Application: {settings.app_name} v{settings.app_version}")
    logger.info(f"Debug mode: {settings.debug}")
    logger.info(f"Host: {settings.host}:{settings.port}")
    
    # Initialize database
    try:
        await init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise
    
    # Initialize services (they will be initialized on first use)
    logger.info("Services ready")
    
    yield
    
    # Shutdown
    logger.info("Shutting down FaceMood AI backend...")
    logger.info("Cleanup complete")


# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="""
    # FaceMood AI - Intelligent Face Analysis System
    
    **FaceMood AI** is an advanced Computer Vision system that provides:
    
    * **Face Detection**: Detect faces in images with high accuracy
    * **Face Recognition**: Recognize enrolled faces with embeddings
    * **Expression Analysis**: Analyze facial expressions using blendshapes
    * **Profile Management**: Manage face profiles with consent tracking
    
    ## Features
    
    * 🔍 **Face Detection**: Uses MediaPipe for accurate face detection
    * 👤 **Face Recognition**: Uses InsightFace for high-quality embeddings
    * 😊 **Expression Analysis**: Analyzes 12+ different facial expressions
    * 🔒 **Privacy Focused**: Encrypts all face embeddings for security
    * 📊 **Real-time**: Processes images quickly for real-time applications
    
    ## Authentication
    
    Currently, no authentication is required for local development.
    For production, consider adding API key authentication.
    
    ## Endpoints
    
    * `/api/faces/detect` - Detect faces in an image
    * `/api/faces/enroll` - Enroll a new face profile
    * `/api/recognize/` - Recognize a face in an image
    * `/api/expressions/analyze` - Analyze facial expression
    * `/api/profiles/` - Manage face profiles
    """,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)


# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite default
        "http://localhost:3000",  # React default
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*"  # For development only - restrict in production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Mount static files (for model storage)
app.mount("/models", StaticFiles(directory="models"), name="models")


# Include routers
app.include_router(face_router)
app.include_router(recognition_router)
app.include_router(expression_router)
app.include_router(profiles_router)


# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint
    Returns the current status of the API
    """
    return {
        "status": "healthy",
        "application": settings.app_name,
        "version": settings.app_version,
        "timestamp": "2024-01-01T00:00:00Z",  # Will be updated in a real implementation
        "services": {
            "face_detection": "available",
            "face_recognition": "available",
            "expression_analysis": "available",
            "profile_management": "available"
        }
    }


# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """
    Root endpoint
    Returns basic API information
    """
    return {
        "application": settings.app_name,
        "version": settings.app_version,
        "description": "FaceMood AI - Intelligent Face Analysis System",
        "docs": "/docs",
        "health": "/health"
    }


# Global exception handler
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """
    Global HTTP exception handler
    """
    logger.error(f"HTTP Error: {exc.status_code} - {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": exc.detail,
            "status_code": exc.status_code
        }
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Global exception handler
    """
    logger.error(f"Unexpected error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal server error",
            "details": str(exc) if settings.debug else None
        }
    )


# Initialize services (lazy initialization)
_face_detector = None
_landmark_extractor = None
_embedding_service = None
_recognition_service = None
_expression_analyzer = None
_profile_service = None


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    global _face_detector, _landmark_extractor, _embedding_service
    global _recognition_service, _expression_analyzer, _profile_service
    
    # Initialize services
    _face_detector = FaceDetector()
    _landmark_extractor = LandmarkExtractor()
    _embedding_service = EmbeddingService()
    _recognition_service = RecognitionService(_embedding_service)
    _expression_analyzer = ExpressionAnalyzer(_landmark_extractor)
    _profile_service = ProfileService(_embedding_service, _face_detector)
    
    logger.info("All services initialized")


@app.on_event("shutdown")
async def shutdown_event():
    """Clean up services on shutdown"""
    global _face_detector, _landmark_extractor, _embedding_service
    global _recognition_service, _expression_analyzer, _profile_service
    
    # Clean up services
    if _face_detector:
        _face_detector.close()
    if _landmark_extractor:
        _landmark_extractor.close()
    if _embedding_service:
        _embedding_service.close()
    
    logger.info("Services cleaned up")


# For running with uvicorn directly
if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level="debug" if settings.debug else "info"
    )
