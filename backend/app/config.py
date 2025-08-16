# /app/config.py
import os
from dotenv import load_dotenv

load_dotenv() # Load environment variables from .env file if it exists

class Config:
    # Database configuration - Updated to use the new database location

    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./cargo_management.db")

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    # Add other configurations if needed