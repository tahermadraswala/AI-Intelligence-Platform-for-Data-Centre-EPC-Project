"""
app.core.config
-----------------
Central settings for the FastAPI backend. Reads from the project-root
`.env` file (shared with ai_core — ANTHROPIC_API_KEY lives here once).
"""

from __future__ import annotations

import sys
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/app/core/config.py -> backend/app/core -> backend/app -> backend -> project root
PROJECT_ROOT = Path(__file__).resolve().parents[3]
BACKEND_DIR = PROJECT_ROOT / "backend"
DATA_DIR = BACKEND_DIR / "data"
UPLOADS_DIR = DATA_DIR / "uploads"

# Make the sibling `ai_core` package importable without needing it pip-installed.
# (In production you'd `pip install -e ../ai_core` instead, but for hackathon
# speed this keeps the two team members' folders decoupled.)
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


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

    # CORS — Next.js dev server default port.
    cors_origins: list[str] = ["http://localhost:3000"]

    anthropic_api_key: str = ""


settings = Settings()
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
