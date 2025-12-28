"""Application configuration using Pydantic Settings"""
from pydantic_settings import BaseSettings
from typing import List
from pathlib import Path


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.

    These settings can be overridden by creating a .env file in the backend directory.
    """
    # Anthropic API
    ANTHROPIC_API_KEY: str
    MODEL_NAME: str = "claude-sonnet-4-5-20250929"  # Sonnet 4.5: 70% cost reduction, 2-3x faster than Opus 4
    HIGH_ACCURACY_MODEL_NAME: str = "claude-opus-4-5-20251101"  # Opus 4.5: Used for receipt OCR and voice parsing (higher accuracy)

    # Data directories
    # In production (Railway), set DATA_DIR=/app/data to use persistent volume
    # In development, defaults to ./data (relative to project root)
    DATA_DIR: str = "./data"

    # CORS origins (comma-separated string)
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://localhost:8080,http://localhost:8081,http://localhost:8082"

    # Logging
    LOG_LEVEL: str = "INFO"

    # Resend API for feedback emails
    RESEND_API_KEY: str = ""
    FEEDBACK_EMAIL_FROM: str = "onboarding@resend.dev"
    FEEDBACK_EMAIL_TO: str = "hi@andrea-antal.com"

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS_ORIGINS string into list"""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    @property
    def chroma_persist_dir(self) -> str:
        """Get Chroma DB persist directory (always relative to DATA_DIR)"""
        return str(Path(self.DATA_DIR) / "chroma_db")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# Global settings instance
settings = Settings()
