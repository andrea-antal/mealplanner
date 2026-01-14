"""Application configuration using Pydantic Settings"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.

    These settings can be overridden by creating a .env file in the backend directory.
    """
    # Anthropic API
    ANTHROPIC_API_KEY: str
    MODEL_NAME: str = "claude-sonnet-4-5-20250929"  # Sonnet 4.5: 70% cost reduction, 2-3x faster than Opus 4
    HIGH_ACCURACY_MODEL_NAME: str = "claude-opus-4-5-20251101"  # Opus 4.5: Used for receipt OCR and voice parsing (higher accuracy)

    # Supabase
    SUPABASE_URL: str = ""  # e.g., https://xxxxx.supabase.co
    SUPABASE_PUBLISHABLE_KEY: str = ""  # Frontend-safe key (respects RLS)
    SUPABASE_SECRET_KEY: str = ""  # Backend-only key (bypasses RLS)

    # OpenAI (for embeddings)
    OPENAI_API_KEY: str = ""

    # CORS origins (comma-separated string)
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://localhost:8080,http://localhost:8081,http://localhost:8082"

    # Logging
    LOG_LEVEL: str = "INFO"

    # Linear API for feedback issues
    LINEAR_API_KEY: str = ""
    LINEAR_TEAM_ID: str = ""
    LINEAR_PROJECT_ID: str = ""
    LINEAR_LABEL_ID: str = ""
    LINEAR_ASSIGNEE_ID: str = ""

    # Admin API protection
    ADMIN_SECRET: str = ""  # Set via ADMIN_SECRET env var to protect admin endpoints

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS_ORIGINS string into list"""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"  # Allow unused env vars like DATA_DIR


# Global settings instance
settings = Settings()
