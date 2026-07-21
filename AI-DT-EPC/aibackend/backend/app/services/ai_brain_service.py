"""
app.services.ai_brain_service
--------------------------------
Lightweight readiness checks for the ai_core package used by the backend.

This deliberately avoids constructing agents or vector stores because those
can load large embedding models. The actual agent services instantiate the
AI brain lazily when their endpoints are called.
"""

from __future__ import annotations

import importlib.util
import sys

from app.core.config import PROJECT_ROOT

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


REQUIRED_AI_PACKAGES = [
    "google.genai",
    "langchain_community",
    "langchain_core",
    "langchain_text_splitters",
    "chromadb",
    "sentence_transformers",
]

AGENT_IMPORTS = {
    "spec_compliance": "ai_core.agents.spec_compliance",
    "schedule_risk": "ai_core.agents.schedule_risk",
    "rfi_copilot": "ai_core.agents.rfi_copilot",
    "supply_chain_risk": "ai_core.agents.supply_chain_risk",
    "commissioning_qa": "ai_core.agents.commissioning_qa",
}


def get_ai_brain_status() -> dict:
    missing_dependencies = [
        package for package in REQUIRED_AI_PACKAGES if importlib.util.find_spec(package) is None
    ]

    try:
        from ai_core.config import settings as ai_settings
    except Exception as exc:  # noqa: BLE001
        return {
            "connected": False,
            "ai_core_importable": False,
            "api_key_configured": False,
            "llm_model": "",
            "embedding_model": "",
            "available_agents": [],
            "missing_dependencies": missing_dependencies,
            "message": f"Backend cannot import ai_core: {exc}",
        }

    available_agents = [
        name for name, module_path in AGENT_IMPORTS.items() if importlib.util.find_spec(module_path) is not None
    ]
    api_key_configured = bool(ai_settings.gemini_api_key)

    embeddings_ready = False
    embeddings_error = None
    try:
        from ai_core.tools.vector_search import embeddings_status

        status = embeddings_status()
        embeddings_ready = status["ready"]
        embeddings_error = status["error"]
    except Exception as exc:  # noqa: BLE001
        embeddings_error = str(exc)

    connected = (
        len(available_agents) == len(AGENT_IMPORTS)
        and not missing_dependencies
        and api_key_configured
    )

    if connected and not embeddings_ready:
        message = (
            "Backend is connected to ai_core and ready to run AI agents, but the local "
            f"embedding model is not ready ({embeddings_error or 'not yet warmed up'}). "
            "Document upload (Spec Checker / RFI Copilot ingestion) will fail until this "
            "is resolved — check network access to Hugging Face Hub, or pre-cache the model."
        )
    elif connected:
        message = "Backend is connected to ai_core and ready to run AI agents."
    elif not api_key_configured:
        message = "ai_core is importable, but GROQ_API_KEY is not configured in the project-root .env."
    elif missing_dependencies:
        message = "ai_core is importable, but one or more AI dependencies are not installed."
    else:
        message = "ai_core is importable, but not all agent modules are available."

    return {
        "connected": connected,
        "ai_core_importable": True,
        "api_key_configured": api_key_configured,
        "llm_model": ai_settings.llm_model,
        "embedding_model": ai_settings.embedding_model,
        "available_agents": available_agents,
        "missing_dependencies": missing_dependencies,
        "embeddings_ready": embeddings_ready,
        "embeddings_error": embeddings_error,
        "message": message,
    }
