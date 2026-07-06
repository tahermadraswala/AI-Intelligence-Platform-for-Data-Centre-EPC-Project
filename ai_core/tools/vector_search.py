"""
ai_core.tools.vector_search
----------------------------
Thin wrapper around a local Chroma vector store. Kept separate from the
agents so that ingestion (utils/pdf_parser.py) and retrieval (agents/*)
share one consistent interface, and so the embedding model is loaded
once and reused.

Uses a local sentence-transformers embedding model — no external API
key required for embeddings, only the Anthropic key is needed (for the
LLM calls in the agents themselves).
"""

from __future__ import annotations

from functools import lru_cache
from typing import Optional

from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document

from ai_core.config import settings


@lru_cache(maxsize=1)
def get_embedding_function() -> HuggingFaceEmbeddings:
    """Loaded once per process — this model download/init is the slow part."""
    return HuggingFaceEmbeddings(model_name=settings.embedding_model)


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
        self._store.persist()
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
