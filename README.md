# AI Intelligence Platform for Data Centre EPC Project

> **ET AI Hackathon 2026 submission**  
> An AI-powered EPC intelligence platform that unifies project documents, specifications, schedules, procurement data, supply chain signals, and commissioning records into one decision layer for data centre delivery teams.

## Overview

The **AI Intelligence Platform for Data Centre EPC Project** is a full-stack web application built to support the complex workflows of data centre EPC delivery. It combines a modern React frontend with a FastAPI backend and a modular AI core to help teams:

- upload and organize project documents,
- check vendor submittals against specifications,
- ask technical questions over project documents,
- analyze schedule risk,
- track supply chain risk,
- assess commissioning readiness,
- review persisted history of AI runs.

The project is designed as a hackathon-ready prototype with a clear demo flow, mock-data fallbacks, and real backend persistence so it can still present well even when live AI calls are unavailable.

## Why this project matters

Data centre EPC projects involve thousands of documents, multiple disciplines, long procurement cycles, and strict commissioning requirements. In practice, teams often struggle with fragmented information spread across PDFs, spreadsheets, RFIs, schedules, submittals, and email threads.

This platform solves that by turning project data into an interactive intelligence layer with five practical outcomes:

- fewer specification misses,
- earlier schedule risk detection,
- better visibility into procurement and shipping delays,
- faster answers to project questions,
- improved commissioning readiness review.

## Key Features

### 1. Project Command Center
A dashboard-style home screen that shows project KPIs, risk summaries, timeline signals, and live status indicators.

### 2. Specification & Quality Compliance Checker
Upload a specification document and a vendor submittal, then run an AI compliance check to identify deviations, warnings, and pass/fail findings.

### 3. Document Q&A / RFI Copilot
Query project documents in natural language and get grounded responses with citations and supporting context.

### 4. Predictive Schedule Risk Engine
Analyze project schedule data to highlight critical-path risks, delay impact, and mitigation suggestions.

### 5. Supply Chain Risk Intelligence
Track procurement and shipment risks such as manufacturing delays, customs holds, route disruptions, and value-at-risk.

### 6. Commissioning QA Copilot
Assess equipment and NCR records to estimate commissioning readiness and generate go/no-go recommendations.

### 7. Persistent History
Runs are stored in the backend database so the frontend can show the latest AI result and past analysis history.



## Hackathon Alignment

This repository is built around the **AI Intelligence Platform for Data Centre EPC Project Delivery** challenge. The project directly addresses the need to unify project documents, specifications, schedules, procurement data, and quality records into a living intelligence layer.

The implementation covers the main hackathon themes:

- specification compliance checking,
- predictive schedule risk analysis,
- supply chain visibility,
- commissioning support,
- conversational project knowledge intelligence.

## Tech Stack

### Frontend
- React 19
- Vite
- React Router DOM
- Lucide React
- Tailwind CSS

### Backend
- FastAPI
- Uvicorn
- SQLAlchemy
- Pydantic
- Pydantic Settings
- python-multipart
- python-dotenv

### AI / Core Layer
- LangChain
- LangChain Community
- LangChain Core
- LangChain Text Splitters
- ChromaDB
- Sentence Transformers
- Google GenAI
- PyPDF
- Pandas
- Faker

## Repository Structure

```text
AI-Intelligence-Platform-for-Data-Centre-EPC-Project-main/
└── AI-DT-EPC/
    ├── frontend/
    │   ├── src/
    │   │   ├── pages/
    │   │   ├── services/
    │   │   ├── data/
    │   │   └── components/
    │   ├── package.json
    │   └── vite.config.js
    └── aibackend/
        ├── ai_core/
        │   ├── agents/
        │   ├── tools/
        │   ├── prompts/
        │   ├── utils/
        │   └── config.py
        └── backend/
            ├── app/
            │   ├── api/routes/
            │   ├── core/
            │   ├── models/
            │   └── services/
            ├── data/
            ├── app.py
            └── requirements.txt
```

## Frontend Pages

The app includes the following routes:

- `/dashboard` — project command center
- `/spec-checker` — specification and submittal compliance
- `/document-qa` — RFI and document question answering
- `/schedule-risk` — predictive schedule risk analysis
- `/supply-chain` — procurement and shipment risk intelligence
- `/commissioning` — commissioning quality assurance

## Backend Capabilities

The backend exposes a versioned API under `/api/v1` and includes:

- document ingestion and indexing,
- AI brain status checks,
- spec compliance analysis,
- RFI copilot queries,
- schedule risk analysis,
- supply chain risk analysis,
- commissioning QA assessments.

## API Endpoints

### AI Brain
- `GET /api/v1/ai-brain/status`

### Documents
- `POST /api/v1/documents/upload`
- `GET /api/v1/documents`
- `GET /api/v1/documents/{collection}/status`

### Agents
- `POST /api/v1/agents/spec-compliance`
- `GET /api/v1/agents/spec-compliance/history`
- `POST /api/v1/agents/rfi-copilot`
- `GET /api/v1/agents/rfi-copilot/history`

### Schedule Risk
- `GET /api/v1/schedule/mock-tasks`
- `POST /api/v1/schedule/risk-analysis/mock`
- `POST /api/v1/schedule/risk-analysis/upload`
- `GET /api/v1/schedule/risk-analysis/history`

### Supply Chain
- `GET /api/v1/supply-chain/mock-shipments`
- `POST /api/v1/supply-chain/risk-analysis/mock`
- `POST /api/v1/supply-chain/risk-analysis/upload`
- `GET /api/v1/supply-chain/risk-analysis/history`

### Commissioning
- `GET /api/v1/commissioning/mock-records`
- `POST /api/v1/commissioning/qa-assessment/mock`
- `POST /api/v1/commissioning/qa-assessment/upload`
- `GET /api/v1/commissioning/qa-assessment/history`

## How It Works

### Document Intelligence Flow
1. Upload PDFs, TXT files, or CSVs.
2. The backend saves them and indexes content into the AI core vector store.
3. The UI can retrieve document status and use the indexed corpus for analysis.

### Spec Compliance Flow
1. Upload a specification document.
2. Upload a vendor submittal.
3. Run compliance analysis.
4. Review deviations, severity, and retrieved context sources.

### RFI Copilot Flow
1. Ask a project question in natural language.
2. The system searches the relevant project knowledge base.
3. The answer is returned with citations and confidence.

### Schedule Risk Flow
1. upload a CSV.
2. Run the risk engine.
3. Review delay impact, risk items, assumptions, and history.

### Supply Chain Flow
1. upload a logistics CSV.
2. Run supply chain analysis.
3. Review shipment risks, on-time percentage, and value-at-risk.

### Commissioning Flow
1. upload a CSV.
2. Run the commissioning QA copilot.
3. Review readiness percentage, blockers, and go/no-go guidance.

## Setup Instructions

### 1. Clone the repository
```bash
git clone https://github.com/tahermadraswala/AI-Intelligence-Platform-for-Data-Centre-EPC-Project.git
cd AI-Intelligence-Platform-for-Data-Centre-EPC-Project/AI-DT-EPC
```

### 2. Install frontend dependencies
```bash
cd frontend
npm install
```

### 3. Install backend dependencies
From the `AI-DT-EPC` directory:

```bash
cd aibackend/backend
pip install -r requirements.txt
cd ../ai_core
pip install -r requirements.txt
```

### 4. Configure environment variables
Create a `.env` file in the `AI-DT-EPC` root directory.

```env
GEMINI_API_KEY=your_api_key_here
DATABASE_URL=sqlite:///./aibackend/backend/data/epc_platform.db
AI_CORE_LLM_MODEL=gemini-3.5-flash
AI_CORE_LLM_TEMPERATURE=0.2
AI_CORE_EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
```

## Run the Project

### Start the backend
From `AI-DT-EPC/aibackend/backend`:

```bash
uvicorn app.main:app --reload --port 8000
```

The API docs will be available at:

```text
http://localhost:8000/docs
```

### Start the frontend
In a new terminal from `AI-DT-EPC/frontend`:

```bash
npm run dev
```

The frontend will typically run on:

```text
http://localhost:5173
```


## Design Notes

- The backend is organized to keep API, services, schemas, and database models separate.
- AI agents are loaded lazily to avoid blocking app startup.
- The frontend is built to keep working with mock fallbacks when live services are unavailable.
- Historical results are persisted so the UI can display previous runs.
- The system is intentionally modular so more agents can be added later.

## Future Improvements

- role-based access control
- multi-project workspace support
- richer citation highlighting
- PDF highlight overlays
- real-time upload progress
- deployment-ready authentication
- analytics dashboards for risk trends
- multi-user collaboration features

## License

Add your preferred license before publishing the repository.

## Credits

Built by **Taher Madraswala** and **Mustafa Bhagat** for the **ET AI Hackathon 2026**.
