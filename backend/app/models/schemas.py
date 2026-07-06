"""
app.models.schemas
---------------------
Pydantic schemas for API request/response bodies. Kept separate from the
SQLAlchemy models (db_models.py) on purpose — request/response shapes
and storage shapes evolve independently.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


# ---------- Documents ----------

class DocumentUploadResponse(BaseModel):
    id: str
    filename: str
    collection: str
    doc_type: str
    chunks_indexed: int
    uploaded_at: datetime

    model_config = {"from_attributes": True}


class CollectionStatus(BaseModel):
    collection: str
    document_chunks: int
    sources: list[str]


# ---------- Spec Compliance ----------

class SpecComplianceRequest(BaseModel):
    submittal_text: str = Field(..., description="Raw text of the vendor submittal to check")
    equipment_type: str = Field("", description="e.g. 'UPS system', 'generator' — focuses retrieval")


class DeviationItem(BaseModel):
    clause_reference: str = ""
    description: str = ""
    severity: str = "INFORMATIONAL"
    submittal_excerpt: str = ""


class SpecComplianceResponse(BaseModel):
    id: str
    overall_status: str
    summary: str
    deviations: list[dict] = Field(default_factory=list)
    retrieved_context_sources: list[str] = Field(default_factory=list)
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------- Schedule Risk ----------

class ScheduleRiskResponse(BaseModel):
    id: str
    source: str
    project_forecast_completion_impact_days: int
    risks: list[dict] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------- RFI Copilot ----------

class RFIQueryRequest(BaseModel):
    question: str
    chat_history: list[dict] | None = None


class RFIQueryResponse(BaseModel):
    id: str
    question: str
    answer: str
    confidence: str
    citations: list[dict] = Field(default_factory=list)
    possible_duplicate_rfis: list[str] = Field(default_factory=list)
    context_sufficient: bool
    created_at: datetime

    model_config = {"from_attributes": True}
