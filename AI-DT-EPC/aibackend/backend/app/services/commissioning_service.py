"""
app.services.commissioning_service
--------------------------------------
Wraps ai_core's CommissioningQAAgent. Supports running a readiness
assessment over either freshly generated mock equipment/NCR data (fast
demo path with no upload needed) or an uploaded CSV.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import UPLOADS_DIR
from app.models.db_models import CommissioningQARun


@lru_cache(maxsize=1)
def _get_commissioning_qa_agent():
    from ai_core.agents.commissioning_qa import CommissioningQAAgent

    return CommissioningQAAgent()


def get_mock_commissioning_records() -> list[dict]:
    from ai_core.utils.mock_data_gen import generate_mock_commissioning_records

    return generate_mock_commissioning_records()


def get_commissioning_records_from_csv(filepath: Path) -> list[dict]:
    from ai_core.agents.commissioning_qa import load_commissioning_csv

    return load_commissioning_csv(filepath)


def run_commissioning_qa_assessment(db: Session, records: list[dict], source: str) -> CommissioningQARun:
    agent = _get_commissioning_qa_agent()
    result = agent.assess(records)

    record = CommissioningQARun(
        source=source,
        overall_readiness_percentage=result.get("overall_readiness_percentage", 0.0),
        go_no_go_recommendation=result.get("go_no_go_recommendation", ""),
        equipment_assessments=result.get("equipment_assessments", []),
        critical_blockers=result.get("critical_blockers", []),
        assumptions=result.get("assumptions", []),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def save_commissioning_csv(filename: str, content: bytes) -> Path:
    dest = UPLOADS_DIR / filename
    dest.write_bytes(content)
    return dest


def list_commissioning_qa_runs(db: Session, limit: int = 20) -> list[CommissioningQARun]:
    return db.query(CommissioningQARun).order_by(CommissioningQARun.created_at.desc()).limit(limit).all()
