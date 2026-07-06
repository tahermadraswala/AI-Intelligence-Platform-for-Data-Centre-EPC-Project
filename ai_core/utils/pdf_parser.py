"""
ai_core.utils.pdf_parser
--------------------------
Loads PDFs (spec sheets, TIA-942 summaries, vendor submittals, RFI logs
saved as PDF, etc.), chunks them, and embeds them into the appropriate
Chroma collection.

CLI usage (from project root, with ai_core on PYTHONPATH):

    python -m ai_core.utils.pdf_parser \\
        --path data/raw_documents/tia942_summary.pdf \\
        --collection specs_and_standards

Or import and call `ingest_pdf(...)` directly from a FastAPI upload
endpoint (backend/app/api/routes/documents.py) after saving the
uploaded file to disk.
"""

from __future__ import annotations

import argparse
import logging
from pathlib import Path

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

from ai_core.config import settings
from ai_core.tools.vector_search import VectorStore

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai_core.pdf_parser")


def ingest_pdf(path: str | Path, collection: str, extra_metadata: dict | None = None) -> int:
    """
    Load a single PDF, split it into overlapping chunks, tag each chunk
    with source metadata (filename, page number, plus any extra_metadata
    e.g. {"doc_type": "vendor_submittal", "vendor": "Acme UPS Co."}),
    and upsert into the given vector collection.

    Returns the number of chunks written.
    """
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"PDF not found: {path}")

    logger.info("Loading %s", path.name)
    loader = PyPDFLoader(str(path))
    pages = loader.load()

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks = splitter.split_documents(pages)

    for chunk in chunks:
        chunk.metadata["source"] = path.name
        chunk.metadata.setdefault("section", f"page_{chunk.metadata.get('page', '?')}")
        if extra_metadata:
            chunk.metadata.update(extra_metadata)

    store = VectorStore(collection_name=collection)
    store.add_documents(chunks)
    logger.info("Ingested %d chunks from %s into '%s'", len(chunks), path.name, collection)
    return len(chunks)


def ingest_directory(directory: str | Path, collection: str, extra_metadata: dict | None = None) -> int:
    """Ingest every .pdf file found directly inside `directory`."""
    directory = Path(directory)
    total = 0
    for pdf_path in sorted(directory.glob("*.pdf")):
        total += ingest_pdf(pdf_path, collection=collection, extra_metadata=extra_metadata)
    logger.info("Ingested %d total chunks from %s", total, directory)
    return total


def _cli() -> None:
    parser = argparse.ArgumentParser(description="Ingest a PDF (or directory of PDFs) into the vector store.")
    parser.add_argument("--path", required=True, help="Path to a PDF file or a directory of PDFs")
    parser.add_argument(
        "--collection",
        required=True,
        choices=["specs_and_standards", "vendor_submittals", "project_docs_rfi"],
    )
    args = parser.parse_args()

    target = Path(args.path)
    if target.is_dir():
        ingest_directory(target, collection=args.collection)
    else:
        ingest_pdf(target, collection=args.collection)


if __name__ == "__main__":
    _cli()
