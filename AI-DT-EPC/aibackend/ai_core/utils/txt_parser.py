"""
ai_core.utils.txt_parser
--------------------------
Loads text files (like the generated mock data) and embeds them into the
appropriate Chroma collection.

CLI usage:
    python -m ai_core.utils.txt_parser --path backend/data/raw_documents --collection specs_and_standards
"""

from __future__ import annotations

import argparse
import logging
from pathlib import Path

from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

from ai_core.config import settings
from ai_core.tools.vector_search import VectorStore

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai_core.txt_parser")


def ingest_txt(path: str | Path, collection: str, extra_metadata: dict | None = None) -> int:
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"TXT not found: {path}")

    logger.info("Loading %s", path.name)
    loader = TextLoader(str(path))
    pages = loader.load()

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks = splitter.split_documents(pages)

    for chunk in chunks:
        chunk.metadata["source"] = path.name
        chunk.metadata.setdefault("section", "page_1")
        if extra_metadata:
            chunk.metadata.update(extra_metadata)

    store = VectorStore(collection_name=collection)
    store.add_documents(chunks)
    logger.info("Ingested %d chunks from %s into '%s'", len(chunks), path.name, collection)
    return len(chunks)


def ingest_directory(directory: str | Path, collection: str, extra_metadata: dict | None = None) -> int:
    directory = Path(directory)
    total = 0
    for txt_path in sorted(directory.glob("*.txt")):
        total += ingest_txt(txt_path, collection=collection, extra_metadata=extra_metadata)
    logger.info("Ingested %d total chunks from %s", total, directory)
    return total


def _cli() -> None:
    parser = argparse.ArgumentParser(description="Ingest a TXT (or directory of TXTs) into the vector store.")
    parser.add_argument("--path", required=True, help="Path to a TXT file or a directory of TXTs")
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
        ingest_txt(target, collection=args.collection)


if __name__ == "__main__":
    _cli()
