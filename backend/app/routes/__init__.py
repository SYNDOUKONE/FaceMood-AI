"""API routes for FaceMood AI"""
from .face import router as face_router
from .recognition import router as recognition_router
from .expression import router as expression_router
from .profiles import router as profiles_router

__all__ = [
    "face_router",
    "recognition_router",
    "expression_router",
    "profiles_router",
]
