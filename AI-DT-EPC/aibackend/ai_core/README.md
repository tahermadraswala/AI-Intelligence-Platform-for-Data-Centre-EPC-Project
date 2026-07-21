# `ai_core/` — The AI Brain

This is the AI intelligence layer for the **Data Centre EPC Project Delivery** platform
(ET AI Hackathon 2026, Problem Statement 4). It's a standalone Python package —
no FastAPI or web dependency — so it can be developed, tested, and demoed on its
own, then wired into `backend/app/api/routes/*.py`.

```
ai_core/
├── agents/
│   ├── spec_compliance.py   # Specification & Quality Compliance Agent
│   ├── schedule_risk.py     # Predictive Schedule Risk Engine
│   └── rfi_copilot.py       # Project Knowledge & RFI Intelligence Agent (RAG)
├── tools/
│   ├── vector_search.py     # Chroma vector store wrapper (shared by all agents)
│   └── document_tools.py    # LangChain @tool functions (search, flag_deviation, ...)
├── prompts/
│   └── system_prompts.py    # All system prompts, versioned as constants
├── utils/
│   ├── pdf_parser.py        # Chunk + embed PDFs into the vector store
│   └── mock_data_gen.py     # Synthetic schedule CSV + submittal/spec text for demo
├── data/
│   └── vector_store/        # Local Chroma persistence (gitignored, generated)
├── config.py                 # Settings (reads GROQ_API_KEY from .env)
└── requirements.txt
```

## Why three agents (not all eight ideas from the brief)?

The problem statement lists five illustrative agent ideas. For a hackathon-scale
build in the time available, this implements the three with the clearest
demo path and highest "wow-per-hour-of-work" — and that map directly onto
your `backend/app/api/routes/agents.py` and `schedule.py` stubs:

| Agent | Brief's concept | Demo payoff |
|---|---|---|
| `SpecComplianceAgent` | Specification & Quality Compliance Agent | Upload a vendor submittal → get flagged deviations with clause citations, live |
| `ScheduleRiskAgent` | Predictive Schedule Risk Engine | Upload/generate a schedule CSV → see critical-path risks + mitigation options weeks ahead |
| `RFICopilotAgent` | Project Knowledge & RFI Intelligence Agent | Ask a natural-language question, get a cited answer + duplicate-RFI detection |

`Supply Chain Visibility` and `Commissioning QA Copilot` were left out of this
first pass on purpose — they need live/mocked shipment-tracking and
commissioning-standard data sources that are heavier to stand up than the
demo window justifies. The architecture (agent + shared vector store +
tool layer) extends cleanly to add them later if time allows.

## Setup

```bash
pip install -r ai_core/requirements.txt --break-system-packages
```

Add to your root `.env`:
```
GROQ_API_KEY=your-groq-key-here
```

Embeddings are local (`sentence-transformers/all-MiniLM-L6-v2` via
HuggingFace) — only the LLM calls need the Groq key, so there's no
second API key to manage under hackathon time pressure.

## Quick start (standalone, no FastAPI needed)

```bash
# 1. Generate mock demo data (schedule CSV + a sample spec/submittal pair)
python -m ai_core.utils.mock_data_gen --out data/mock_schedules --docs-out data/raw_documents

# 2. The mock spec/submittal are written as .txt for simplicity — for a real
#    demo, drop your actual PDFs (TIA-942 summary, vendor submittals) into
#    data/raw_documents/ and ingest them:
python -m ai_core.utils.pdf_parser --path data/raw_documents --collection specs_and_standards

# 3. Run each agent's built-in smoke test
python -m ai_core.agents.spec_compliance
python -m ai_core.agents.schedule_risk
python -m ai_core.agents.rfi_copilot
```

## Wiring into FastAPI (Team Member 2)

Each agent is a plain class with one main method that returns a JSON-serializable
dict — perfect for a Pydantic response model:

```python
# backend/app/api/routes/agents.py
from fastapi import APIRouter
from ai_core.agents.spec_compliance import SpecComplianceAgent
from ai_core.agents.rfi_copilot import RFICopilotAgent

router = APIRouter()
spec_agent = SpecComplianceAgent()   # instantiate once, reuse across requests
rfi_agent = RFICopilotAgent()

@router.post("/agents/spec-compliance")
def check_spec(submittal_text: str, equipment_type: str = ""):
    return spec_agent.check_submittal(submittal_text, equipment_type)

@router.post("/agents/rfi-copilot")
def ask_rfi(question: str):
    return rfi_agent.answer(question)
```

```python
# backend/app/api/routes/schedule.py
from ai_core.agents.schedule_risk import ScheduleRiskAgent, load_schedule_csv

risk_agent = ScheduleRiskAgent()

@router.get("/schedule/risk-analysis")
def get_schedule_risk():
    tasks = load_schedule_csv("data/mock_schedules/mock_schedule.csv")
    return risk_agent.analyze(tasks)
```

## Wiring document uploads (Team Member 2)

When a user uploads a spec/submittal PDF through `documents.py`, save it to
disk and call `ingest_pdf`:

```python
from ai_core.utils.pdf_parser import ingest_pdf

@router.post("/documents/upload")
async def upload_document(file: UploadFile, collection: str, doc_type: str):
    save_path = Path("data/raw_documents") / file.filename
    save_path.write_bytes(await file.read())
    chunks_written = ingest_pdf(save_path, collection=collection, extra_metadata={"doc_type": doc_type})
    return {"filename": file.filename, "chunks_indexed": chunks_written}
```

## Design notes for the architecture diagram / pitch

- **Three isolated Chroma collections** (`specs_and_standards`,
  `vendor_submittals`, `project_docs_rfi`) prevent cross-contamination —
  e.g. the RFI copilot won't accidentally answer a compliance question
  using an unrelated vendor's submittal.
- **Every agent returns structured JSON** (not free text) so the frontend
  can render deviations/risks/answers as first-class UI components
  (tables, severity badges, citation chips) instead of parsing prose.
- **Grounding is enforced in the system prompts**: agents are explicitly
  instructed not to fabricate clause references or invent facts not
  present in retrieved context — call this out in the pitch as your
  answer to "how do you handle hallucination risk in a compliance tool."
- **`_safe_parse` fallback**: if the LLM ever returns malformed JSON, the
  agent degrades gracefully into a low-confidence text response instead
  of throwing a 500 — keeps the demo resilient.
