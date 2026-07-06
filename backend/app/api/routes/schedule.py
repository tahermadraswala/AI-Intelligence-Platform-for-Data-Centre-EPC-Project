"""
app.api.routes.schedule
--------------------------
Endpoints for the Predictive Schedule Risk Engine: run it against demo
mock data (fastest path for a live demo) or an uploaded CSV.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.schemas import ScheduleRiskResponse
from app.services import schedule_service

router = APIRouter(prefix="/schedule", tags=["schedule"])


@router.get("/mock-tasks")
def get_mock_tasks():
    """Returns the generated demo schedule as raw task JSON (for the frontend Gantt/table view)."""
    return schedule_service.get_mock_tasks()


@router.post("/risk-analysis/mock", response_model=ScheduleRiskResponse)
def run_risk_analysis_on_mock_data(db: Session = Depends(get_db)):
    """Runs the Schedule Risk Engine against freshly generated mock data — no upload needed."""
    tasks = schedule_service.get_mock_tasks()
    try:
        return schedule_service.run_schedule_risk_analysis(db, tasks, source="mock_data")
    except EnvironmentError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Schedule risk analysis failed: {exc}") from exc


@router.post("/risk-analysis/upload", response_model=ScheduleRiskResponse)
async def run_risk_analysis_on_upload(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload a project schedule CSV (see ai_core/utils/mock_data_gen.py for the expected columns) and analyze it."""
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a .csv file.")

    content = await file.read()
    saved_path = schedule_service.save_schedule_csv(file.filename, content)

    try:
        tasks = schedule_service.get_tasks_from_csv(saved_path)
        return schedule_service.run_schedule_risk_analysis(db, tasks, source=file.filename)
    except EnvironmentError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Schedule risk analysis failed: {exc}") from exc


@router.get("/risk-analysis/history", response_model=list[ScheduleRiskResponse])
def risk_analysis_history(limit: int = 20, db: Session = Depends(get_db)):
    return schedule_service.list_schedule_risk_runs(db, limit=limit)
