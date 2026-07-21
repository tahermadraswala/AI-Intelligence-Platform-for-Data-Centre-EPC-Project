"""
ai_core.tools.document_tools
------------------------------
Custom LangChain tools that agents can call. These are deliberately
small and composable — each one does one retrieval/lookup job and
returns structured data, so an agent (or a future tool-calling loop)
can chain them.
"""

from __future__ import annotations

import json

from langchain_core.tools import tool

from ai_core.config import settings
from ai_core.tools.vector_search import VectorStore, format_docs_for_prompt


@tool
def search_vector_db(query: str, collection: str = "project_docs_rfi", k: int = 5) -> str:
    """
    Search a project knowledge collection for text relevant to `query`.

    `collection` must be one of: "specs_and_standards", "vendor_submittals",
    "project_docs_rfi". Returns a formatted string of the top-k matching
    chunks with their source metadata, ready to drop into an LLM prompt.
    """
    store = VectorStore(collection_name=collection)
    if store.count() == 0:
        return f"No documents have been ingested into the '{collection}' collection yet."
    docs = store.similarity_search(query, k=k)
    return format_docs_for_prompt(docs)


@tool
def get_document_metadata(collection: str = "project_docs_rfi") -> str:
    """
    Return a JSON summary of what's currently ingested in a given collection
    (document count and distinct source filenames), useful for the RFI
    copilot to sanity-check what knowledge it actually has access to.
    """
    store = VectorStore(collection_name=collection)
    count = store.count()
    # Chroma doesn't expose "distinct sources" directly without scanning;
    # pull a broad sample to summarize sources for the demo-scale corpus.
    sample = store.similarity_search(" ", k=min(count, 50)) if count else []
    sources = sorted({d.metadata.get("source", "unknown") for d in sample})
    return json.dumps({"collection": collection, "document_chunks": count, "sources": sources})


@tool
def flag_deviation(
    clause_reference: str,
    description: str,
    severity: str,
    submittal_excerpt: str,
) -> str:
    """
    Record a single spec-compliance deviation in a structured, loggable
    format. `severity` must be one of CRITICAL, MAJOR, MINOR, INFORMATIONAL.
    This is the "write" side that pairs with search_vector_db's "read"
    side — the backend's documents.py endpoint persists what this returns
    into the quality-audit trail (Postgres/SQLite via SQLAlchemy).
    """
    severity_upper = severity.upper()
    valid = {"CRITICAL", "MAJOR", "MINOR", "INFORMATIONAL"}
    if severity_upper not in valid:
        severity_upper = "INFORMATIONAL"
    return json.dumps(
        {
            "clause_reference": clause_reference,
            "description": description,
            "severity": severity_upper,
            "submittal_excerpt": submittal_excerpt[:500],
        }
    )


ALL_TOOLS = [search_vector_db, get_document_metadata, flag_deviation]
