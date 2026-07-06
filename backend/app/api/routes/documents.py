"""
app.api.routes.documents
---------------------------
Upload & ingest endpoints — the entry point for getting specs, vendor
submittals, and project docs into the ai_core vector store.
"""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.schemas import CollectionStatus, DocumentUploadResponse
from app.services import document_service

router = APIRouter(prefix="/documents", tags=["documents"])

Collection = Literal["specs_and_standards", "vendor_submittals", "project_docs_rfi"]


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    collection: Collection = Form(...),
    doc_type: str = Form(""),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Upload a spec sheet / vendor submittal / project doc (PDF or .txt).
    It's saved to disk and immediately chunked + embedded into the
    requested ai_core vector collection.
    """
    allowed_suffixes = {".pdf", ".txt"}
    suffix = "." + file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if suffix not in allowed_suffixes:
        raise HTTPException(status_code=400, detail=f"Unsupported file type '{suffix}'. Use PDF or TXT.")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    saved_path = document_service.save_upload(file.filename, content)

    try:
        record = document_service.ingest_document(db, saved_path, collection=collection, doc_type=doc_type)
    except Exception as exc:  # noqa: BLE001 — surface ingestion failures clearly to the client
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {exc}") from exc

    return record


@router.get("", response_model=list[DocumentUploadResponse])
def list_documents(collection: Collection | None = None, db: Session = Depends(get_db)):
    return document_service.list_documents(db, collection=collection)


@router.get("/{collection}/status", response_model=CollectionStatus)
def collection_status(collection: Collection):
    """Quick sanity check: how many chunks are indexed, from which files."""
    try:
        return document_service.get_collection_status(collection)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc
