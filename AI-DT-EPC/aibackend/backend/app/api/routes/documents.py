"""
app.api.routes.documents
---------------------------
Upload & ingest endpoints — the entry point for getting specs, vendor
submittals, and project docs into the ai_core vector store.
"""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.schemas import CollectionStatus, DocumentUploadResponse
from app.services import document_service

router = APIRouter(prefix="/documents", tags=["documents"])

Collection = Literal["specs_and_standards", "vendor_submittals", "project_docs_rfi"]

ALLOWED_SUFFIXES = {".pdf", ".txt", ".csv"}

# ~15MB — generous for spec sheets/submittals/RFI logs, but keeps a single
# bad upload from stalling the server long enough for a dev-server proxy
# (e.g. Vite) to time the request out and report a generic 502.
MAX_UPLOAD_BYTES = 15 * 1024 * 1024


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    collection: Collection = Form(...),
    doc_type: str = Form(""),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Upload a spec sheet / vendor submittal / project doc (PDF, TXT, or CSV).
    It's saved to disk and immediately chunked + embedded into the
    requested ai_core vector collection.
    """
    suffix = "." + file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if suffix not in ALLOWED_SUFFIXES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{suffix}'. Use PDF, TXT, or CSV.",
        )

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File is too large ({len(content) / 1_048_576:.1f}MB). Max size is "
            f"{MAX_UPLOAD_BYTES / 1_048_576:.0f}MB.",
        )

    # Fail fast and clearly if the local embedding model isn't ready,
    # instead of hanging mid-request while it tries to download — that's
    # what causes a dev-server proxy to eventually give up and report a
    # generic 502 Bad Gateway with no useful detail.
    try:
        from ai_core.tools.vector_search import embeddings_status

        status = embeddings_status()
        if not status["ready"]:
            raise HTTPException(
                status_code=503,
                detail=(
                    "The document embedding model isn't ready yet "
                    f"({status['error'] or 'still loading'}). Check the backend logs — this "
                    "usually means it couldn't reach Hugging Face Hub to download the model, "
                    "or hasn't finished warming up. Try again in a moment, or pre-cache the "
                    "model and restart the backend."
                ),
            )
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"ai_core's document-processing dependencies aren't installed: {exc}",
        ) from exc

    saved_path = document_service.save_upload(file.filename, content)

    try:
        # Ingestion (chunking + embedding) is CPU-bound and blocking — run
        # it off the event loop so one slow/large upload can't stall every
        # other in-flight request on this worker.
        record = await run_in_threadpool(
            document_service.ingest_document, db, saved_path, collection, doc_type
        )
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
