"""
app.models.db_models
-----------------------
SQLAlchemy ORM models. Every AI agent call gets persisted here so the
frontend can show history/audit trails, not just the latest result.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class DocumentRecord(Base):
    """A document ingested into the ai_core vector store."""

    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    filename: Mapped[str] = mapped_column(String, nullable=False)
    collection: Mapped[str] = mapped_column(String, nullable=False)
    doc_type: Mapped[str] = mapped_column(String, default="")
    chunks_indexed: Mapped[int] = mapped_column(Integer, default=0)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class SpecComplianceCheck(Base):
    """A single spec-compliance run against a vendor submittal."""

    __tablename__ = "spec_compliance_checks"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    equipment_type: Mapped[str] = mapped_column(String, default="")
    submittal_excerpt: Mapped[str] = mapped_column(Text, default="")
    overall_status: Mapped[str] = mapped_column(String, default="")
    summary: Mapped[str] = mapped_column(Text, default="")
    deviations: Mapped[list] = mapped_column(JSON, default=list)
    retrieved_context_sources: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ScheduleRiskRun(Base):
    """A single schedule-risk-engine run over a project schedule."""

    __tablename__ = "schedule_risk_runs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    source: Mapped[str] = mapped_column(String, default="")  # e.g. filename or "mock"
    project_forecast_completion_impact_days: Mapped[int] = mapped_column(Integer, default=0)
    risks: Mapped[list] = mapped_column(JSON, default=list)
    assumptions: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class RFIQuery(Base):
    """A single question asked to the RFI copilot, with its answer."""

    __tablename__ = "rfi_queries"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[str] = mapped_column(Text, default="")
    confidence: Mapped[str] = mapped_column(String, default="")
    citations: Mapped[list] = mapped_column(JSON, default=list)
    possible_duplicate_rfis: Mapped[list] = mapped_column(JSON, default=list)
    context_sufficient: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
