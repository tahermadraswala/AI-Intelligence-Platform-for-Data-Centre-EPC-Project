"""
app.core.config
-----------------
Central settings for the FastAPI backend. Reads from the project-root
`.env` file (shared with ai_core — GROQ_API_KEY lives here).
"""

from __future__ import annotations

import sys
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/app/core/config.py -> backend/app/core -> backend/app -> backend -> aibackend -> project root
PROJECT_ROOT = Path(__file__).resolve().parents[4]
BACKEND_DIR = PROJECT_ROOT / "aibackend" / "backend"
DATA_DIR = BACKEND_DIR / "data"
UPLOADS_DIR = DATA_DIR / "uploads"

# Make the ai_core package importable: it lives at aibackend/ai_core.
AIBACKEND_DIR = PROJECT_ROOT / "aibackend"
if str(AIBACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(AIBACKEND_DIR))


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(PROJECT_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "EPC Intelligence Platform API"
    api_v1_prefix: str = "/api/v1"

    # SQLite is enough for a hackathon demo; swap DATABASE_URL for Postgres
    # in production without touching any route/service code.
    database_url: str = f"sqlite:///{DATA_DIR / 'epc_platform.db'}"

    # CORS — allow both Next.js (3000) and Vite (5173) dev servers.
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
    ]

    gemini_api_key: str = ""


settings = Settings()
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
