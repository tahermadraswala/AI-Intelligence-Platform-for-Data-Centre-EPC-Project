"""
app.services.schedule_service
--------------------------------
Wraps ai_core's ScheduleRiskAgent. Supports running risk analysis over
either freshly generated mock data (fast demo path with no upload needed)
or an uploaded CSV.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import UPLOADS_DIR
from app.models.db_models import ScheduleRiskRun


@lru_cache(maxsize=1)
def _get_schedule_risk_agent():
    from ai_core.agents.schedule_risk import ScheduleRiskAgent

    return ScheduleRiskAgent()


def get_mock_tasks() -> list[dict]:
    from ai_core.utils.mock_data_gen import generate_mock_schedule

    return generate_mock_schedule()


def get_tasks_from_csv(filepath: Path) -> list[dict]:
    from ai_core.agents.schedule_risk import load_schedule_csv

    return load_schedule_csv(filepath)


def run_schedule_risk_analysis(db: Session, tasks: list[dict], source: str) -> ScheduleRiskRun:
    agent = _get_schedule_risk_agent()
    result = agent.analyze(tasks)

    record = ScheduleRiskRun(
        source=source,
        project_forecast_completion_impact_days=result.get("project_forecast_completion_impact_days", 0),
        risks=result.get("risks", []),
        assumptions=result.get("assumptions", []),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def save_schedule_csv(filename: str, content: bytes) -> Path:
    dest = UPLOADS_DIR / filename
    dest.write_bytes(content)
    return dest


def list_schedule_risk_runs(db: Session, limit: int = 20) -> list[ScheduleRiskRun]:
    return db.query(ScheduleRiskRun).order_by(ScheduleRiskRun.created_at.desc()).limit(limit).all()
