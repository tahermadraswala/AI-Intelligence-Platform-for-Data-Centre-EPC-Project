"""
app.api.routes.commissioning
--------------------------------
Endpoints for the Commissioning QA Copilot: run it against demo mock
equipment/NCR data (fastest path for a live demo) or an uploaded CSV.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.schemas import CommissioningQAResponse
from app.services import commissioning_service

router = APIRouter(prefix="/commissioning", tags=["commissioning"])


@router.get("/mock-records")
def get_mock_records():
    """Returns the generated demo equipment/NCR list as raw JSON (for the frontend readiness matrix view)."""
    return commissioning_service.get_mock_commissioning_records()


@router.post("/qa-assessment/mock", response_model=CommissioningQAResponse)
def run_qa_assessment_on_mock_data(db: Session = Depends(get_db)):
    """Runs the Commissioning QA Copilot against freshly generated mock data — no upload needed."""
    records = commissioning_service.get_mock_commissioning_records()
    try:
        return commissioning_service.run_commissioning_qa_assessment(db, records, source="mock_data")
    except EnvironmentError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Commissioning QA assessment failed: {exc}") from exc


@router.post("/qa-assessment/upload", response_model=CommissioningQAResponse)
async def run_qa_assessment_on_upload(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload an equipment/NCR tracking CSV (see ai_core/utils/mock_data_gen.py for the expected columns) and assess it."""
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a .csv file.")

    content = await file.read()
    saved_path = commissioning_service.save_commissioning_csv(file.filename, content)

    try:
        records = commissioning_service.get_commissioning_records_from_csv(saved_path)
        return commissioning_service.run_commissioning_qa_assessment(db, records, source=file.filename)
    except EnvironmentError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Commissioning QA assessment failed: {exc}") from exc


@router.get("/qa-assessment/history", response_model=list[CommissioningQAResponse])
def qa_assessment_history(limit: int = 20, db: Session = Depends(get_db)):
    return commissioning_service.list_commissioning_qa_runs(db, limit=limit)
