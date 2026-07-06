"""
app.services.document_service
--------------------------------
Handles saving uploaded files to disk, ingesting them into the ai_core
vector store, and logging the ingestion to the database.

ai_core is imported lazily (inside the function, not at module level) so
the FastAPI app can start up and serve /docs even before the heavier
ai_core dependencies (langchain, chromadb, sentence-transformers) are
installed — only document/agent endpoints need them at call time.
"""

from __future__ import annotations

from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import UPLOADS_DIR
from app.models.db_models import DocumentRecord


def save_upload(filename: str, content: bytes) -> Path:
    dest = UPLOADS_DIR / filename
    dest.write_bytes(content)
    return dest


def ingest_document(db: Session, filepath: Path, collection: str, doc_type: str = "") -> DocumentRecord:
    """
    Ingests a PDF (or .txt, handled the same way for the hackathon mock
    docs) into the given ai_core collection and logs the result.
    """
    from ai_core.utils.pdf_parser import ingest_pdf  # lazy import, see module docstring

    extra_metadata = {"doc_type": doc_type} if doc_type else None

    if filepath.suffix.lower() == ".pdf":
        chunks_indexed = ingest_pdf(filepath, collection=collection, extra_metadata=extra_metadata)
    else:
        # Support .txt ingestion too (used by the mock spec/submittal demo
        # data, which is plain text rather than PDF) by wrapping it as a
        # single LangChain Document and reusing the same chunk/embed path.
        chunks_indexed = _ingest_text_file(filepath, collection=collection, extra_metadata=extra_metadata)

    record = DocumentRecord(
        filename=filepath.name,
        collection=collection,
        doc_type=doc_type,
        chunks_indexed=chunks_indexed,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def _ingest_text_file(filepath: Path, collection: str, extra_metadata: dict | None) -> int:
    from langchain_core.documents import Document
    from langchain_text_splitters import RecursiveCharacterTextSplitter

    from ai_core.config import settings as ai_core_settings
    from ai_core.tools.vector_search import VectorStore

    text = filepath.read_text()
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=ai_core_settings.chunk_size,
        chunk_overlap=ai_core_settings.chunk_overlap,
    )
    chunks = splitter.create_documents([text])
    for chunk in chunks:
        chunk.metadata["source"] = filepath.name
        if extra_metadata:
            chunk.metadata.update(extra_metadata)

    store = VectorStore(collection_name=collection)
    store.add_documents(chunks)
    return len(chunks)


def list_documents(db: Session, collection: str | None = None) -> list[DocumentRecord]:
    query = db.query(DocumentRecord)
    if collection:
        query = query.filter(DocumentRecord.collection == collection)
    return query.order_by(DocumentRecord.uploaded_at.desc()).all()


def get_collection_status(collection: str) -> dict:
    from ai_core.tools.vector_search import VectorStore

    store = VectorStore(collection_name=collection)
    count = store.count()
    sample = store.similarity_search(" ", k=min(count, 50)) if count else []
    sources = sorted({d.metadata.get("source", "unknown") for d in sample})
    return {"collection": collection, "document_chunks": count, "sources": sources}
