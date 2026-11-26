"""
Database configuration and utilities for FaceMood AI
Uses SQLAlchemy with async support (aiosqlite)
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, LargeBinary, Text, select
from sqlalchemy.sql import func
from datetime import datetime
from typing import AsyncGenerator
from .config import settings
import logging

logger = logging.getLogger(__name__)

# SQLAlchemy Base
Base = declarative_base()


# Database models
class Profile(Base):
    """Profile model for storing face profiles"""
    __tablename__ = "profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    consent_given = Column(Boolean, default=True, nullable=False)
    consent_date = Column(DateTime, default=func.now())
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Encrypted embedding (Fernet encrypted)
    embedding = Column(LargeBinary, nullable=False)
    
    # Metadata (optional)
    extra_metadata = Column("metadata", Text, nullable=True)


class DetectionLog(Base):
    """Log for face detections"""
    __tablename__ = "detection_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, nullable=True)  # Foreign key to Profile
    timestamp = Column(DateTime, default=func.now())
    confidence = Column(Float, nullable=True)
    is_recognized = Column(Boolean, default=False)
    expression = Column(String(50), nullable=True)


# Database engine and session
engine = create_async_engine(settings.database_url, echo=settings.debug)
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency to get database session"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception as e:
            await session.rollback()
            logger.error(f"Database error: {e}")
            raise
        finally:
            await session.close()


async def init_db():
    """Initialize database tables"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables created successfully")


# Database utilities
class DatabaseManager:
    """Manager for database operations"""
    
    @staticmethod
    async def get_profile_by_id(session: AsyncSession, profile_id: int) -> Profile:
        """Get a profile by ID"""
        result = await session.execute(
            select(Profile).where(Profile.id == profile_id)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_profile_by_name(session: AsyncSession, name: str) -> Profile:
        """Get a profile by name"""
        result = await session.execute(
            select(Profile).where(Profile.name == name)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_all_profiles(session: AsyncSession) -> list[Profile]:
        """Get all profiles"""
        result = await session.execute(select(Profile))
        return result.scalars().all()
    
    @staticmethod
    async def create_profile(
        session: AsyncSession,
        name: str,
        embedding: bytes,
        consent: bool = True,
        metadata: dict = None
    ) -> Profile:
        """Create a new profile"""
        profile = Profile(
            name=name,
            embedding=embedding,
            consent_given=consent,
            extra_metadata=str(metadata) if metadata else None
        )
        session.add(profile)
        await session.flush()
        await session.refresh(profile)
        return profile
    
    @staticmethod
    async def delete_profile(session: AsyncSession, profile_id: int) -> bool:
        """Delete a profile by ID"""
        profile = await DatabaseManager.get_profile_by_id(session, profile_id)
        if profile:
            await session.delete(profile)
            return True
        return False
    
    @staticmethod
    async def update_profile(
        session: AsyncSession,
        profile_id: int,
        name: str = None,
        consent: bool = None,
        embedding: bytes = None
    ) -> Profile:
        """Update a profile"""
        profile = await DatabaseManager.get_profile_by_id(session, profile_id)
        if profile:
            if name:
                profile.name = name
            if consent is not None:
                profile.consent_given = consent
            if embedding:
                profile.embedding = embedding
            profile.updated_at = datetime.utcnow()
            await session.flush()
            await session.refresh(profile)
        return profile


# Export models
__all__ = [
    "Base",
    "Profile",
    "DetectionLog",
    "get_db",
    "init_db",
    "DatabaseManager",
]
