"""
ai_core.config
--------------
Central configuration for the AI Core layer. Reads from environment
variables (populated via the root `.env` file, loaded by backend/app/core
on startup, or loaded here directly for standalone testing).

Team Member 2 (FastAPI) should import `settings` and pass it (or the
relevant fields) into agent constructors rather than hardcoding values.
"""

import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
DATA_DIR = BASE_DIR / "data"
VECTOR_STORE_DIR = DATA_DIR / "vector_store"
RAW_DOCS_DIR = PROJECT_ROOT / "data" / "raw_documents"
MOCK_SCHEDULES_DIR = PROJECT_ROOT / "data" / "mock_schedules"

# Load the shared project-root .env regardless of whether the process is
# launched from the repository root or from backend/.
load_dotenv(PROJECT_ROOT / ".env")


@dataclass
class Settings:
    # --- LLM ---
    gemini_api_key: str = field(default_factory=lambda: os.getenv("GEMINI_API_KEY", ""))
    llm_model: str = os.getenv("AI_CORE_LLM_MODEL", "gemini-3.5-flash")
    llm_temperature: float = float(os.getenv("AI_CORE_LLM_TEMPERATURE", "0.1"))
    max_tokens: int = int(os.getenv("AI_CORE_MAX_TOKENS", "2048"))

    # --- Embeddings (local, so no extra API key needed) ---
    embedding_model: str = os.getenv(
        "AI_CORE_EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2"
    )

    # --- Vector store ---
    vector_store_dir: str = str(VECTOR_STORE_DIR)
    chunk_size: int = int(os.getenv("AI_CORE_CHUNK_SIZE", "1000"))
    chunk_overlap: int = int(os.getenv("AI_CORE_CHUNK_OVERLAP", "150"))

    # --- Collections (one per document domain, kept separate so agents
    # don't accidentally retrieve schedule data when answering a spec
    # question, etc.) ---
    collection_specs: str = "specs_and_standards"
    collection_submittals: str = "vendor_submittals"
    collection_project_docs: str = "project_docs_rfi"

    def validate(self) -> None:
        if not self.gemini_api_key:
            raise EnvironmentError(
                "GEMINI_API_KEY is not set. Add it to your .env file at the "
                "project root, e.g. GEMINI_API_KEY=your-key-here"
            )


settings = Settings()
