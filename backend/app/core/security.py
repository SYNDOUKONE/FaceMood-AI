"""
Security utilities for FaceMood AI
Includes password hashing, token creation, and encryption
"""
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from .config import settings
from cryptography.fernet import Fernet
import logging

logger = logging.getLogger(__name__)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Encryption
try:
    cipher_suite = Fernet(settings.encryption_key.encode())
except Exception as e:
    logger.warning(f"Invalid encryption key: {e}. Generating new key.")
    # Generate a new key if the provided one is invalid
    new_key = Fernet.generate_key().decode()
    logger.warning(f"New encryption key generated. Please add to .env: ENCRYPTION_KEY={new_key}")
    cipher_suite = Fernet(new_key.encode())


def get_password_hash(password: str) -> str:
    """Hash a password for storing."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against the stored hash."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.access_token_expire_minutes
        )
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode,
        settings.secret_key,
        algorithm=settings.algorithm
    )
    return encoded_jwt


def encrypt_data(data: bytes) -> bytes:
    """Encrypt data using Fernet symmetric encryption."""
    return cipher_suite.encrypt(data)


def decrypt_data(encrypted_data: bytes) -> bytes:
    """Decrypt data using Fernet symmetric encryption."""
    return cipher_suite.decrypt(encrypted_data)


async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Get the current user from the JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm]
        )
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        return username
    except JWTError:
        raise credentials_exception
