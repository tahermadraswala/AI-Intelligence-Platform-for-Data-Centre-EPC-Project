"""
ai_core
-------
The AI brain of the EPC Intelligence Platform.

This package is intentionally decoupled from FastAPI (`backend/`) and
Next.js (`frontend/`). It exposes plain Python classes/functions that the
backend's `api/routes/agents.py` and `api/routes/schedule.py` import and
call. This keeps the AI logic testable in isolation (pytest, notebooks,
CLI scripts) without needing the web server running.

Quick usage from the backend:

    from ai_core.agents.rfi_copilot import RFICopilotAgent

    agent = RFICopilotAgent()
    answer = agent.answer("What's the required UPS redundancy per TIA-942?")
"""

__version__ = "0.1.0"
