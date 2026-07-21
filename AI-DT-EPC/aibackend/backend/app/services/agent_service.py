"""
app.services.agent_service
------------------------------
Wraps ai_core's SpecComplianceAgent and RFICopilotAgent, lazily
instantiating each as a process-wide singleton (agent construction loads
an embedding model + sets up an LLM client, so we don't want to redo
that on every request) and persisting every call to the database.
"""

from __future__ import annotations

from functools import lru_cache

from sqlalchemy.orm import Session

from app.models.db_models import RFIQuery, SpecComplianceCheck


@lru_cache(maxsize=1)
def _get_spec_compliance_agent():
    from ai_core.agents.spec_compliance import SpecComplianceAgent

    return SpecComplianceAgent()


@lru_cache(maxsize=1)
def _get_rfi_copilot_agent():
    from ai_core.agents.rfi_copilot import RFICopilotAgent

    return RFICopilotAgent()


def run_spec_compliance(db: Session, submittal_text: str, equipment_type: str = "") -> SpecComplianceCheck:
    agent = _get_spec_compliance_agent()
    result = agent.check_submittal(submittal_text, equipment_type=equipment_type)

    record = SpecComplianceCheck(
        equipment_type=equipment_type,
        submittal_excerpt=submittal_text[:1000],
        overall_status=result.get("overall_status", "UNKNOWN"),
        summary=result.get("summary", ""),
        deviations=result.get("deviations", []),
        retrieved_context_sources=result.get("retrieved_context_sources", []),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def list_spec_compliance_checks(db: Session, limit: int = 50) -> list[SpecComplianceCheck]:
    return (
        db.query(SpecComplianceCheck)
        .order_by(SpecComplianceCheck.created_at.desc())
        .limit(limit)
        .all()
    )


def run_rfi_query(db: Session, question: str, chat_history: list[dict] | None = None) -> RFIQuery:
    agent = _get_rfi_copilot_agent()
    result = agent.answer(question, chat_history=chat_history)

    record = RFIQuery(
        question=question,
        answer=result.get("answer", ""),
        confidence=result.get("confidence", "LOW"),
        citations=result.get("citations", []),
        possible_duplicate_rfis=result.get("possible_duplicate_rfis", []),
        context_sufficient=result.get("context_sufficient", True),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def list_rfi_queries(db: Session, limit: int = 50) -> list[RFIQuery]:
    return db.query(RFIQuery).order_by(RFIQuery.created_at.desc()).limit(limit).all()
