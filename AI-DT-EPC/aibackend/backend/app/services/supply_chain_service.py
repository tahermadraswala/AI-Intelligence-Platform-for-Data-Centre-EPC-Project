"""
app.services.supply_chain_service
------------------------------------
Wraps ai_core's SupplyChainRiskAgent. Supports running risk analysis over
either freshly generated mock procurement/shipment data (fast demo path
with no upload needed) or an uploaded CSV.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import UPLOADS_DIR
from app.models.db_models import SupplyChainRiskRun


@lru_cache(maxsize=1)
def _get_supply_chain_risk_agent():
    from ai_core.agents.supply_chain_risk import SupplyChainRiskAgent

    return SupplyChainRiskAgent()


def get_mock_shipments() -> list[dict]:
    from ai_core.utils.mock_data_gen import generate_mock_shipments

    return generate_mock_shipments()


def get_shipments_from_csv(filepath: Path) -> list[dict]:
    from ai_core.agents.supply_chain_risk import load_shipments_csv

    return load_shipments_csv(filepath)


def run_supply_chain_risk_analysis(db: Session, shipments: list[dict], source: str) -> SupplyChainRiskRun:
    agent = _get_supply_chain_risk_agent()
    result = agent.analyze(shipments)

    record = SupplyChainRiskRun(
        source=source,
        overall_on_time_percentage=result.get("overall_on_time_percentage", 0.0),
        total_value_at_risk_usd=result.get("total_value_at_risk_usd", 0),
        shipment_risks=result.get("shipment_risks", []),
        assumptions=result.get("assumptions", []),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def save_shipments_csv(filename: str, content: bytes) -> Path:
    dest = UPLOADS_DIR / filename
    dest.write_bytes(content)
    return dest


def list_supply_chain_risk_runs(db: Session, limit: int = 20) -> list[SupplyChainRiskRun]:
    return db.query(SupplyChainRiskRun).order_by(SupplyChainRiskRun.created_at.desc()).limit(limit).all()
