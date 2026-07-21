"""
app.api.routes.supply_chain
-------------------------------
Endpoints for the Supply Chain Visibility & Risk Agent: run it against
demo mock procurement/shipment data (fastest path for a live demo) or an
uploaded CSV.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.schemas import SupplyChainRiskResponse
from app.services import supply_chain_service

router = APIRouter(prefix="/supply-chain", tags=["supply-chain"])


@router.get("/mock-shipments")
def get_mock_shipments():
    """Returns the generated demo procurement/shipment list as raw JSON (for the frontend logistics view)."""
    return supply_chain_service.get_mock_shipments()


@router.post("/risk-analysis/mock", response_model=SupplyChainRiskResponse)
def run_risk_analysis_on_mock_data(db: Session = Depends(get_db)):
    """Runs the Supply Chain Risk Agent against freshly generated mock data — no upload needed."""
    shipments = supply_chain_service.get_mock_shipments()
    try:
        return supply_chain_service.run_supply_chain_risk_analysis(db, shipments, source="mock_data")
    except EnvironmentError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Supply chain risk analysis failed: {exc}") from exc


@router.post("/risk-analysis/upload", response_model=SupplyChainRiskResponse)
async def run_risk_analysis_on_upload(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload a procurement/shipment tracking CSV (see ai_core/utils/mock_data_gen.py for the expected columns) and analyze it."""
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a .csv file.")

    content = await file.read()
    saved_path = supply_chain_service.save_shipments_csv(file.filename, content)

    try:
        shipments = supply_chain_service.get_shipments_from_csv(saved_path)
        return supply_chain_service.run_supply_chain_risk_analysis(db, shipments, source=file.filename)
    except EnvironmentError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Supply chain risk analysis failed: {exc}") from exc


@router.get("/risk-analysis/history", response_model=list[SupplyChainRiskResponse])
def risk_analysis_history(limit: int = 20, db: Session = Depends(get_db)):
    return supply_chain_service.list_supply_chain_risk_runs(db, limit=limit)
