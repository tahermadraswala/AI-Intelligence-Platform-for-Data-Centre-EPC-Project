"""
app.main
----------
FastAPI application instance & entry point.

Run with:
    uvicorn app.main:app --reload --port 8000

(from the `backend/` directory, with the project root's .env populated
with ANTHROPIC_API_KEY — see backend/.env.example)
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import agents, ai_brain, documents, schedule
from app.core.config import settings
from app.core.database import init_db

app = FastAPI(
    title=settings.app_name,
    description=(
        "AI Intelligence Platform for Data Centre EPC Project Delivery — "
        "backend API wrapping the ai_core agents (Spec Compliance, "
        "Schedule Risk, RFI Copilot)."
    ),
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/", tags=["health"])
def root():
    return {"status": "ok", "service": settings.app_name}


@app.get("/health", tags=["health"])
def health():
    return {"status": "healthy"}


app.include_router(documents.router, prefix=settings.api_v1_prefix)
app.include_router(ai_brain.router, prefix=settings.api_v1_prefix)
app.include_router(agents.router, prefix=settings.api_v1_prefix)
app.include_router(schedule.router, prefix=settings.api_v1_prefix)
