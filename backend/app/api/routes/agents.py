"""
app.api.routes.agents
------------------------
Endpoints that trigger the AI agents: Spec Compliance and RFI Copilot.
(Schedule Risk has its own router — see schedule.py — since it also
handles CSV upload.)
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.schemas import (
    RFIQueryRequest,
    RFIQueryResponse,
    SpecComplianceRequest,
    SpecComplianceResponse,
)
from app.services import agent_service

router = APIRouter(prefix="/agents", tags=["agents"])


@router.post("/spec-compliance", response_model=SpecComplianceResponse)
def check_spec_compliance(payload: SpecComplianceRequest, db: Session = Depends(get_db)):
    """
    Runs the Specification & Quality Compliance Agent against submitted
    text. Requires specs to already be ingested into the
    'specs_and_standards' collection via POST /documents/upload.
    """
    try:
        record = agent_service.run_spec_compliance(
            db, submittal_text=payload.submittal_text, equipment_type=payload.equipment_type
        )
    except EnvironmentError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Spec compliance check failed: {exc}") from exc
    return record


@router.get("/spec-compliance/history", response_model=list[SpecComplianceResponse])
def spec_compliance_history(limit: int = 50, db: Session = Depends(get_db)):
    return agent_service.list_spec_compliance_checks(db, limit=limit)


@router.post("/rfi-copilot", response_model=RFIQueryResponse)
def ask_rfi_copilot(payload: RFIQueryRequest, db: Session = Depends(get_db)):
    """
    Asks the Project Knowledge & RFI Intelligence Agent a question over
    the ingested 'project_docs_rfi' collection.
    """
    try:
        record = agent_service.run_rfi_query(db, question=payload.question, chat_history=payload.chat_history)
    except EnvironmentError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"RFI query failed: {exc}") from exc
    return record


@router.get("/rfi-copilot/history", response_model=list[RFIQueryResponse])
def rfi_copilot_history(limit: int = 50, db: Session = Depends(get_db)):
    return agent_service.list_rfi_queries(db, limit=limit)
