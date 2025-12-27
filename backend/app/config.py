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
    MODEL_NAME: str = "claude-opus-4-20250514"  # Default to Opus 4, can override with cheaper models for testing

    # Data directories
    # In production (Railway), set DATA_DIR=/app/data to use persistent volume
    # In development, defaults to ./data (relative to project root)
    DATA_DIR: str = "./data"

    # CORS origins (comma-separated string)
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://localhost:8080,http://localhost:8081,http://localhost:8082"

    # Logging
    LOG_LEVEL: str = "INFO"

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
