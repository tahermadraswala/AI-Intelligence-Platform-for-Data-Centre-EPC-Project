"""
ai_core.tools.vector_search
----------------------------
Thin wrapper around a local Chroma vector store. Kept separate from the
agents so that ingestion (utils/pdf_parser.py) and retrieval (agents/*)
share one consistent interface, and so the embedding model is loaded
once and reused.

Uses a local sentence-transformers embedding model — no external API
key required for embeddings, only the Groq key is needed (for the
LLM calls in the agents themselves).
"""

from __future__ import annotations

import logging
from functools import lru_cache
from typing import Optional

from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document

from ai_core.config import settings

logger = logging.getLogger("ai_core.vector_search")

# Set by warm_up_embeddings() at FastAPI startup. Checked by the document
# upload route before attempting ingestion so a broken/unreachable model
# download fails fast with a clear error instead of hanging a request
# until a reverse proxy (e.g. Vite's dev proxy) gives up and returns a
# 502 Bad Gateway.
_embeddings_ready = False
_embeddings_error: str | None = None


@lru_cache(maxsize=1)
def get_embedding_function() -> HuggingFaceEmbeddings:
    """Loaded once per process — this model download/init is the slow part."""
    return HuggingFaceEmbeddings(model_name=settings.embedding_model)


def warm_up_embeddings() -> bool:
    """
    Eagerly loads the embedding model once, at server startup, instead of
    lazily on the first document upload. Call this from FastAPI's startup
    event. Never raises — on failure it logs a clear message and leaves
    the model to be retried lazily on first use.
    """
    global _embeddings_ready, _embeddings_error
    try:
        get_embedding_function().embed_query("startup warm-up")
        _embeddings_ready = True
        _embeddings_error = None
        logger.info("Embedding model '%s' loaded and ready.", settings.embedding_model)
    except Exception as exc:  # noqa: BLE001
        _embeddings_ready = False
        _embeddings_error = str(exc)
        logger.warning(
            "Embedding model '%s' failed to load at startup (%s). Document "
            "upload/ingestion will fail until this is resolved — check network "
            "access to Hugging Face Hub, or pre-cache the model locally.",
            settings.embedding_model,
            exc,
        )
    return _embeddings_ready


def embeddings_status() -> dict:
    return {"ready": _embeddings_ready, "error": _embeddings_error}


class VectorStore:
    """
    Wraps a single named Chroma collection (e.g. "specs_and_standards",
    "vendor_submittals", "project_docs_rfi"). Keeping collections separate
    per document domain avoids cross-contamination between, say, a spec
    compliance check and an RFI answer.
    """

    def __init__(self, collection_name: str, persist_directory: Optional[str] = None):
        self.collection_name = collection_name
        self.persist_directory = persist_directory or settings.vector_store_dir
        self._store = Chroma(
            collection_name=self.collection_name,
            embedding_function=get_embedding_function(),
            persist_directory=self.persist_directory,
        )

    def add_documents(self, documents: list[Document]) -> list[str]:
        """Add pre-chunked LangChain Documents (see utils/pdf_parser.py)."""
        if not documents:
            return []
        ids = self._store.add_documents(documents)
        # `.persist()` was removed/no-op'd in some langchain-community
        # versions (Chroma now auto-persists when a persist_directory is
        # set) — guard it so an API mismatch doesn't turn a successful
        # ingestion into a 500/502 for the caller.
        persist = getattr(self._store, "persist", None)
        if callable(persist):
            try:
                persist()
            except Exception as exc:  # noqa: BLE001
                logger.warning("Chroma .persist() call failed (documents were still added): %s", exc)
        return ids

    def similarity_search(self, query: str, k: int = 5, filter: Optional[dict] = None) -> list[Document]:
        return self._store.similarity_search(query, k=k, filter=filter)

    def similarity_search_with_score(self, query: str, k: int = 5, filter: Optional[dict] = None):
        return self._store.similarity_search_with_score(query, k=k, filter=filter)

    def as_retriever(self, k: int = 5):
        return self._store.as_retriever(search_kwargs={"k": k})

    def count(self) -> int:
        return self._store._collection.count()  # noqa: SLF001 (Chroma has no public count())


def format_docs_for_prompt(docs: list[Document]) -> str:
    """Turns retrieved Documents into a citation-friendly context block."""
    blocks = []
    for i, doc in enumerate(docs, start=1):
        source = doc.metadata.get("source", "unknown_source")
        section = doc.metadata.get("section", "")
        header = f"[Doc {i}] source={source}" + (f" section={section}" if section else "")
        blocks.append(f"{header}\n{doc.page_content}")
    return "\n\n---\n\n".join(blocks)
