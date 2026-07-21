    # `backend/` — FastAPI Application

Wraps the `ai_core/` agents behind a REST API for the Next.js frontend.

```
backend/
├── app/
│   ├── main.py                    # FastAPI app instance, CORS, router registration
│   ├── api/routes/
│   │   ├── documents.py           # Upload & ingest specs/submittals/project docs
│   │   ├── agents.py              # Trigger Spec Compliance + RFI Copilot agents
│   │   └── schedule.py            # Trigger Schedule Risk Engine (mock or CSV upload)
│   ├── core/
│   │   ├── config.py              # Settings (.env), adds project root to sys.path for ai_core
│   │   └── database.py            # SQLAlchemy engine/session (SQLite by default)
│   ├── models/
│   │   ├── db_models.py           # SQLAlchemy ORM tables (audit trail of every agent run)
│   │   └── schemas.py             # Pydantic request/response models
│   └── services/
│       ├── document_service.py    # Save upload -> ai_core ingestion -> DB log
│       ├── agent_service.py       # Call ai_core agents (singleton, lazy-loaded) -> DB log
│       └── schedule_service.py    # Mock/CSV schedule loading -> risk agent -> DB log
├── data/uploads/                  # Uploaded PDFs/CSVs land here (gitignored)
├── requirements.txt
└── .env.example
```

## Setup

This backend expects to sit **next to** `ai_core/` inside the same project
root (as in the tree in the main README):

```
epc-intelligence-platform/
├── frontend/
├── backend/      <- you are here
├── ai_core/
└── .env          <- shared by both backend and ai_core
```

```bash
# from the project root
cp backend/.env.example .env
# edit .env and add your GROQ_API_KEY

pip install -r backend/requirements.txt --break-system-packages
pip install -r ai_core/requirements.txt --break-system-packages
```

## Run it

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

Then open **http://localhost:8000/docs** for interactive Swagger docs —
every endpoint below is exercisable straight from the browser, no
frontend required.

To verify the backend can see the AI brain and its configuration, open:

```bash
GET http://localhost:8000/api/v1/ai-brain/status
```

## Fastest demo path (no file uploads needed)

1. Generate + ingest mock data once:
   ```bash
   # from project root
   python -m ai_core.utils.mock_data_gen --out data/mock_schedules --docs-out data/raw_documents
   python -m ai_core.utils.pdf_parser --path data/raw_documents --collection specs_and_standards
   ```
   (the mock spec/submittal are `.txt` — `POST /api/v1/documents/upload` also accepts `.txt` for this reason)

2. Start the server, then hit:
   - `POST /api/v1/schedule/risk-analysis/mock` — instant schedule risk demo, no upload needed
   - `POST /api/v1/agents/spec-compliance` with the mock submittal text — compliance check demo
   - `POST /api/v1/agents/rfi-copilot` with a question like *"What's the required UPS battery autonomy?"*

## Endpoint reference

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/ai-brain/status` | Check backend connectivity to `ai_core`, required AI dependencies, and API key configuration |
| `POST` | `/api/v1/documents/upload` | Upload a PDF/TXT into a vector collection (`specs_and_standards`, `vendor_submittals`, `project_docs_rfi`) |
| `GET` | `/api/v1/documents` | List ingested documents (optionally filter by `collection`) |
| `GET` | `/api/v1/documents/{collection}/status` | Chunk count + source files currently indexed |
| `POST` | `/api/v1/agents/spec-compliance` | Run compliance check on submitted text |
| `GET` | `/api/v1/agents/spec-compliance/history` | Past compliance checks |
| `POST` | `/api/v1/agents/rfi-copilot` | Ask a question, get a cited answer |
| `GET` | `/api/v1/agents/rfi-copilot/history` | Past Q&A |
| `GET` | `/api/v1/schedule/mock-tasks` | Raw mock schedule JSON (for a Gantt/table view) |
| `POST` | `/api/v1/schedule/risk-analysis/mock` | Run risk engine on mock data |
| `POST` | `/api/v1/schedule/risk-analysis/upload` | Run risk engine on an uploaded CSV |
| `GET` | `/api/v1/schedule/risk-analysis/history` | Past risk-analysis runs |

## Design notes

- **`ai_core` is imported lazily**, inside service functions rather than
  at module import time. That means the API server boots and `/docs`
  works even before `langchain`/`chromadb`/`sentence-transformers` are
  installed — only the specific agent endpoint you call needs those
  deps ready. Useful when two teammates are setting up in parallel.
- **Every agent call is persisted** (`SpecComplianceCheck`, `ScheduleRiskRun`,
  `RFIQuery` tables) so the frontend's history views and the judges' demo
  don't depend on keeping one browser tab open — reload and the audit
  trail is still there.
- **SQLite by default** — zero setup for the hackathon. Swap
  `DATABASE_URL` in `.env` for a Postgres URL later; no route or service
  code needs to change since everything goes through SQLAlchemy's ORM.
- **CORS is pre-configured** for `http://localhost:3000` (Next.js dev
  default) — update `cors_origins` in `app/core/config.py` if your
  frontend runs elsewhere.
