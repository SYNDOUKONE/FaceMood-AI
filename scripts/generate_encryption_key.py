#!/usr/bin/env python3
"""
Script to generate a Fernet encryption key for FaceMood AI
"""
from cryptography.fernet import Fernet

if __name__ == "__main__":
    key = Fernet.generate_key()
    print("Generated Fernet Encryption Key:")
    print(key.decode())
    print("\nAdd this to your .env file:")
    print(f"ENCRYPTION_KEY={key.decode()}")
