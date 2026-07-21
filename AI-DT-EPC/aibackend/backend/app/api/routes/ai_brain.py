"""
app.api.routes.ai_brain
--------------------------
Status endpoint for the connection between the FastAPI backend and ai_core.
"""

from __future__ import annotations

from fastapi import APIRouter

from app.models.schemas import AIBrainStatusResponse
from app.services.ai_brain_service import get_ai_brain_status

router = APIRouter(prefix="/ai-brain", tags=["ai-brain"])


@router.get("/status", response_model=AIBrainStatusResponse)
def ai_brain_status():
    """Reports whether the backend can see ai_core, its agents, and required AI config."""
    return get_ai_brain_status()
