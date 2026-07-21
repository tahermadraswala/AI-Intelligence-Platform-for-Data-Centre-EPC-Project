"""
app.main
----------
FastAPI application instance & entry point.

Run with:
    uvicorn app.main:app --reload --port 8000

(from the `backend/` directory, with the project root's .env populated
with GEMINI_API_KEY — see backend/.env.example)
"""

from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import agents, ai_brain, commissioning, documents, schedule, supply_chain
from app.core.config import settings
from app.core.database import init_db

logger = logging.getLogger("app.main")

app = FastAPI(
    title=settings.app_name,
    description=(
        "AI Intelligence Platform for Data Centre EPC Project Delivery — "
        "backend API wrapping the ai_core agents (Spec Compliance, "
        "Schedule Risk, RFI Copilot, Supply Chain Risk, Commissioning QA)."
    ),
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """
    Defense-in-depth: any exception that escapes a route handler still gets
    turned into a clean JSON 500 response here instead of the connection
    being dropped/reset — which is what makes a dev-server proxy (e.g.
    Vite) report a generic 502 Bad Gateway to the browser with no detail.
    """
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": f"Internal server error: {exc}"})


@app.on_event("startup")
def on_startup() -> None:
    init_db()

    # Warm up the local embedding model used by document ingestion (Spec
    # Checker / RFI Copilot uploads) at boot rather than lazily on the
    # first upload request. Document upload is the only feature that
    # needs this model (every agent's own reasoning uses the Groq API,
    # not this local model) — loading it lazily meant the very first
    # upload could hang for as long as the model took to download, which
    # is exactly the kind of slow first request a dev-server proxy times
    # out on and reports back as "502 Bad Gateway". Warming it up here
    # moves that cost to server startup, where a failure is visible in
    # the logs immediately instead of surfacing as a mysterious upload
    # failure. This is safe to skip if ai_core's ML dependencies aren't
    # installed yet — the rest of the API still starts normally.
    try:
        from ai_core.tools.vector_search import warm_up_embeddings

        warm_up_embeddings()
    except Exception as exc:  # noqa: BLE001
        logger.warning("Skipping embedding warm-up (ai_core not fully installed yet): %s", exc)


@app.get("/", tags=["health"])
def root():
    return {"status": "ok", "service": settings.app_name}


@app.get("/health", tags=["health"])
def health():
    return {"status": "healthy"}


app.include_router(documents.router, prefix=settings.api_v1_prefix)
app.include_router(ai_brain.router, prefix=settings.api_v1_prefix)
app.include_router(agents.router, prefix=settings.api_v1_prefix)
app.include_router(schedule.router, prefix=settings.api_v1_prefix)
app.include_router(supply_chain.router, prefix=settings.api_v1_prefix)
app.include_router(commissioning.router, prefix=settings.api_v1_prefix)
