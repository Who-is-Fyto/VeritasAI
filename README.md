<div align="center">

```
 ██╗   ██╗███████╗██████╗ ██╗████████╗ █████╗ ███████╗ █████╗ ██╗
 ██║   ██║██╔════╝██╔══██╗██║╚══██╔══╝██╔══██╗██╔════╝██╔══██╗██║
 ██║   ██║█████╗  ██████╔╝██║   ██║   ███████║███████╗███████║██║
 ╚██╗ ██╔╝██╔══╝  ██╔══██╗██║   ██║   ██╔══██║╚════██║██╔══██║██║
  ╚████╔╝ ███████╗██║  ██║██║   ██║   ██║  ██║███████║██║  ██║██║
   ╚═══╝  ╚══════╝╚═╝  ╚═╝╚═╝   ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝
```

**A Multimodal Credibility Engine for Real-Time Disinformation Detection**

*BSc Information Technology Dissertation — Michael Mazhambe (402100810)*
*Supervisor: Isaac · 2026*

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-7.0-47A248?logo=mongodb&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)

</div>

---

## Overview

VeritasAI is a web-based AI platform that evaluates the authenticity of English-language digital news articles. Rather than producing a binary True/False verdict, it generates a nuanced **Credibility Index** across three analytical dimensions:

| Dimension | Weight | Description |
|---|---|---|
| **Linguistic Analysis** | 40% | RoBERTa transformer inference ensembled with forensic stylometrics (cadence burstiness, Type-Token Ratio, Shannon entropy, 120+ synthetic transition markers) and sentence-level XAI |
| **Source Authority** | 35% | Publisher domain credibility scored against a 100+ media organization registry (MBFC, NewsGuard-style criteria, Wikipedia, Britannica), anti-spoofing attribution framing, and discovered source bridging |
| **External Corroboration** | 25% | Claims cross-referenced concurrently across Google Fact Check Tools API, Google News RSS, DuckDuckGo organic search, News API, and Wikipedia Action API with refutation stance detection |

The platform also includes an **Explainable AI (XAI) output layer** — the "Truth Map" — which highlights the specific phrases in the submitted text that most influenced the Credibility Index score.

**Target users:** Journalists, researchers, students, and general public. Free and publicly accessible, no login required.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                             React Frontend                              │
│  Home.tsx → Verify.tsx ───── POST /api/v1/analyse ────► Results.tsx     │
│                 │                                                       │
│         src/services/api.ts (typed HTTP client, mock/live parity)       │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTP (Vite proxy / direct)
┌────────────────────────────────────▼────────────────────────────────────┐
│                        FastAPI Backend (Uvicorn)                        │
│                                                                         │
│  POST /api/v1/analyse                                                   │
│    │                                                                    │
│    ├── LinguisticService ──► RoBERTa + Stylometrics (Burstiness / TTR)  │
│    │      └── XAI annotations (manipulative, verified, neutral)         │
│    │                                                                    │
│    ├── SourceAuthorityService ──► 100+ Publisher Registry + Bridging    │
│    │      └── Anti-spoofing attribution verification                    │
│    │                                                                    │
│    └── CorroborationService ──► Multi-Source Fact Checking & Press      │
│           ├── Google Fact Check Tools API (IFCN Signatories)            │
│           ├── Google News RSS live feeds & DuckDuckGo organic search    │
│           ├── Wikipedia Knowledge Engine (Action API intro extracts)    │
│           └── News API + Stance / Refutation Detection                  │
│                                                                         │
│    asyncio.gather() runs all three concurrently                         │
│    → Discovered source authority bridging for pasted text               │
│    → Compute weighted ensemble MCDA score (40/35/25)                    │
│    → Persist AnalysisResult to MongoDB (2-hour SHA-256 cache)           │
│    → Return AnalysisResult JSON to frontend                             │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│                      MongoDB (Motor async driver)                       │
│   Collections: results, users, api_keys, feedback, audit_logs           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18 + Vite 6 | UI framework and build tool |
| **Styling** | TailwindCSS v4 | Utility-first CSS |
| **Animations** | Motion (Framer) | Page transitions and micro-interactions |
| **Charts** | Recharts | Credibility dimension visualisations |
| **Routing** | React Router v7 | Client-side navigation |
| **Backend** | Python 3.11 + FastAPI | Async REST API |
| **ASGI server** | Uvicorn | Production ASGI server |
| **AI/NLP** | HuggingFace Transformers | RoBERTa-base fine-tuned for fake news detection |
| **Deep Learning** | PyTorch | Model inference backend |
| **Database** | MongoDB 7 + Motor | Async document storage for analysis results |
| **HTTP client** | httpx | Async requests to News API and Google CSE |
| **Article scraping** | newspaper3k | Extract text from URL submissions |
| **Containerisation** | Docker + Compose | Local dev and production deployment |
| **Frontend hosting** | Vercel | CDN-hosted static frontend |
| **Testing** | pytest + pytest-asyncio | Backend unit and integration tests |

---

## Project Structure

```
VeritasAI/
│
├── src/                            # React frontend (Vite 6 + TailwindCSS v4)
│   ├── app/
│   │   ├── App.tsx                 # Root application & routing
│   │   └── components/
│   │       ├── Home.tsx            # Landing page
│   │       ├── Verify.tsx          # Multi-input submission (Text, URL, Upload)
│   │       ├── Results.tsx         # Comprehensive Credibility Index report
│   │       ├── CredibilityGauge.tsx # Institutional Truth-O-Meter gauge
│   │       ├── SourceNutritionLabel.tsx # Publisher transparency scorecard
│   │       ├── CorroborationGraph.tsx # Dynamic SVG claim relationship graph
│   │       ├── ForensicStylometrics.tsx # Sentence heatmap & perplexity panel
│   │       ├── AuditCertificateModal.tsx # Verifiable PDF audit certificate
│   │       ├── AdminDashboard.tsx  # RBAC system management & backup recovery
│   │       ├── Header.tsx          # Brand header & navigation
│   │       └── ui/                 # Accessible UI component library
│   ├── services/
│   │   └── api.ts                  # Typed HTTP client with full mock/live parity
│   ├── types/
│   │   └── analysis.ts             # Shared TypeScript data models
│   └── styles/
│       └── theme.css               # Design tokens, color themes & CSS variables
│
├── backend/
│   ├── main.py                     # FastAPI application entry point
│   ├── requirements.txt
│   ├── .env.example                # Configuration template
│   ├── Dockerfile
│   └── app/
│       ├── config.py               # Pydantic BaseSettings (reads .env)
│       ├── schemas/
│       │   ├── request.py          # AnalyseRequest schema & validators
│       │   ├── response.py         # AnalysisResult, XAI, Claims, Sources schemas
│       │   └── auth.py             # User models, token schemas, tier validation
│       ├── db/
│       │   └── mongodb.py          # Async Motor client & index lifecycle
│       ├── routers/
│       │   ├── health.py           # GET /api/v1/health (readiness probe)
│       │   ├── analysis.py         # POST /api/v1/analyse & GET /api/v1/results/:id
│       │   ├── auth.py             # JWT login, registration, developer API keys
│       │   └── admin.py            # RBAC user management, telemetry & backup APIs
│       └── services/
│           ├── linguistic.py       # RoBERTa transformer + forensic stylometrics
│           ├── source.py           # 100+ domain registry + anti-spoofing
│           ├── corroboration.py    # Multi-source fact-checker & stance engine
│           ├── backup.py           # BSON compressed backup & restore engine
│           ├── trainer.py          # Active learning continuous retraining
│           └── affiliation.py      # Institutional transparency profiling
│
├── docker-compose.yml              # Full stack orchestration (React + FastAPI + MongoDB)
├── vite.config.ts                  # Vite config with backend proxy
└── README.md                       # Master project documentation
```

---

## Getting Started

### Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | ≥ 20 | https://nodejs.org |
| pnpm | ≥ 9 | `npm install -g pnpm` |
| Python | 3.11 | https://python.org |
| MongoDB | 7.0 | https://www.mongodb.com/docs/manual/installation/ |
| Docker | ≥ 24 | https://docs.docker.com/get-docker/ |

---

### Option A — Frontend Only (Quick Sandbox / Mock Mode)

The frontend runs in **mock mode** by default. All API interactions (including JWT login sessions, user registrations, Truth Map corrections, active learning training status polls, and developer API key management) are fully simulated in the browser — no Python server or local MongoDB installation is required.

```bash
# 1. Install dependencies from the project root
pnpm install

# 2. Start the Vite local development server
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser. You can register any mock user email and password (e.g. `demo@student.richfield.ac.za` / `password123`) to explore all dashboard functionalities.

---

### Option B — Frontend + Backend (Local Native Development)

This option runs the real Python classification backend and connects natively to your local MongoDB instance.

```bash
# ── Terminal 1: MongoDB Daemon ──────────────────────────────────────────
# Ensure MongoDB is installed and running locally
mongod --dbpath ./data/db

# ── Terminal 2: FastAPI Uvicorn Server ──────────────────────────────────
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env              # Edit .env with your News API and Google CSE keys
uvicorn main:app --reload --port 8000

# ── Terminal 3: React Frontend (with API calls enabled) ────────────────
# Back in the project root:
# 1. Instruct Vite to forward API requests to port 8000 instead of mock-simulating
echo "VITE_USE_MOCK_API=false" > .env.local

# 2. Start dev server
pnpm install
pnpm dev
```

*   **React Frontend:** [http://localhost:5173](http://localhost:5173)
*   **FastAPI Local Server:** [http://localhost:8000](http://localhost:8000)
*   **Interactive Swagger API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)


---

### Option C — Full Stack with Docker Compose (Recommended for Demo & Supervisors)

This is the most reliable way to run the entire application for supervisor presentations and final testing. Docker guarantees that MongoDB, the Python FastAPI server, and the React frontend start in isolated, perfectly configured environments without any package or database installation conflicts on the host machine.

#### Step 1: Install Docker Desktop
Make sure Docker and Docker Compose are installed and running:
*   **Windows / macOS:** Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) and ensure it is running in the background.
*   **Linux:** Install via standard package managers (`sudo apt install docker-compose-plugin docker-ce`) and ensure the service is active (`sudo systemctl start docker`).

#### Step 2: Set up the Backend Environment Variables
The backend needs a `.env` file to communicate with MongoDB and external verification APIs:
1.  Copy the environment template in the `backend` directory:
    ```bash
    cp backend/.env.example backend/.env
    ```
2.  Open the newly created `backend/.env` file in your editor and configure the keys:
    *   `NEWS_API_KEY`: Get a free key from [News API](https://newsapi.org/register) (required for real-time article cross-referencing).
    *   `GOOGLE_API_KEY` & `GOOGLE_CSE_ID`: (Optional) Used for advanced web queries. If left blank, the system automatically uses fallback URL probing.
    *   `JWT_SECRET`: Leave as the default or write a random string to secure login tokens.

#### Step 3: Run the Containers
In your terminal, navigate to the root directory `VeritasAI/` (where `docker-compose.yml` is located) and execute:
```bash
docker compose up --build
```
This single command automatically pulls images, compiles the FastAPI Dockerfile, resolves Node dependencies for Vite, and sets up network links.

#### Step 4: Verify the Services
Once the terminal logs stabilize, you can access the application services at:
*   **React Frontend Dashboard:** [http://localhost:5173](http://localhost:5173) (Open in browser to interact with the UI).
*   **FastAPI Interactive Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs) (Perfect for showing backend API endpoints to your supervisor).
*   **MongoDB Instance:** Running locally on port `27017`.

#### Supervisor Presentation Checklist (Demo Flow)
1.  **Create Account:** Go to [http://localhost:5173/signup](http://localhost:5173/signup) and create a test user profile.
2.  **Run Content Verification:** Paste a news article or submit a URL in [http://localhost:5173/verify](http://localhost:5173/verify).
3.  **Interactive Graph:** On the results page, go to the "Claims & Source Corroboration" card and click **Relationship Graph** to show the interactive SVG network mappings.
4.  **XAI Highlighting Corrections:** Click on highlighted words in the Truth Map, and submit a feedback correction.
5.  **Export PDF Factsheet:** Click **Export Full Report** to show the professional print-styled PDF citation.
6.  **Trigger Self-Training:** Go to the Profile page, click **Execute Training Loop Now**, and show the real-time progress bar.

#### Stopping the Application
To stop all services:
```bash
docker compose down
```
To also wipe the database volumes and start with a completely fresh MongoDB instance:
```bash
docker compose down -v
```


---

## Environment Variables

All backend configuration lives in `backend/.env`. Copy `.env.example` and fill in values.

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `MONGODB_DB_NAME` | Yes | Database name (default: `veritasai`) |
| `MODEL_PATH` | Yes | Path to fine-tuned RoBERTa checkpoint, or `roberta-base` |
| `NEWS_API_KEY` | Yes* | From https://newsapi.org/register |
| `GOOGLE_API_KEY` | Yes* | For Google Custom Search API |
| `GOOGLE_CSE_ID` | Yes* | Your Custom Search Engine ID |
| `CORS_ORIGINS` | No | Comma-separated allowed origins (default: `http://localhost:5173`) |
| `DEVICE` | No | `cpu` or `cuda` (default: `cpu`) |

*Required for the real analysis pipeline. Without them, the service falls back to mock responses.

Frontend environment variables (create `.env.local` at project root):

| Variable | Default | Description |
|---|---|---|
| `VITE_USE_MOCK_API` | `true` | Set to `false` to call the real backend |
| `VITE_API_URL` | `""` | Backend URL. Empty = use Vite proxy. Set for production. |

---

## API Reference

### `POST /api/v1/analyse`

Submit content for credibility analysis.

**Request body:**
```json
{
  "content": "Your article text or URL here",
  "type": "text"
}
```

`type` options: `"text"` | `"url"` | `"upload"`

**Response:** `AnalysisResult` — see `backend/app/schemas/response.py` for the full schema.

```json
{
  "id": "uuid",
  "status": "complete",
  "overall_score": 74.0,
  "ai_probability": 23.0,
  "scores": {
    "linguistic_score": 74.0,
    "source_score": 68.0,
    "corroboration_score": 82.0,
    "weights": { "linguistic": 0.4, "source": 0.35, "corroboration": 0.25 }
  },
  "xai_annotations": [...],
  "sources": [...],
  "claims": [...],
  "linguistic_flags": [...]
}
```

### `GET /api/v1/results/:id`

Retrieve a previously stored result by its ID.

### `GET /api/v1/health`

Returns backend health status, model load state, and DB connectivity.

---

## Backend Implementation Guide

The three services in `backend/app/services/` are fully implemented. This section provides the high-level roadmap.

---

### 1. Linguistic Analysis & Forensic Stylometrics — `services/linguistic.py`

**Goal:** Combine fine-tuned transformer inference with deterministic forensic stylometrics and sentence-level explainable AI (XAI) annotations.

**Core Capabilities:**
1. **Sequence Classification Inference:** Evaluates text through `roberta-base` (or fine-tuned sequence classification checkpoints), mapping logits to calibrated credibility and AI probabilities.
2. **Sentence-Level XAI Annotations:** Every sentence is classified into an explainable category:
   - `manipulative`: Sensationalist clickbait tropes, emotional hyperbole, and absolutist words.
   - `verified`: Attributed to accredited news institutions, recognized research bodies, or empirical data.
   - `unverified`: Ambiguous or anonymous attribution (*"sources say"*, *"reports claim"*).
   - `neutral`: Objective factual statements delivered in balanced journalistic prose.
3. **Forensic Stylometric Metrics:**
   - **Sentence Burstiness (Cadence):** Computes sentence length Coefficient of Variation ($CV = \frac{\sigma}{\mu}$). Documents with $CV \ge 0.30$ exhibit natural human variation. Samples with $\le 3$ sentences are calibrated as natural concise cadence to prevent false-positive penalties.
   - **Vocabulary Richness (TTR):** Type-Token Ratio measuring lexical diversity ($TTR \ge 0.50$ indicates high diversity).
   - **Factual Realism Check:** Scans against known pseudoscientific, satirical, and absurdity tropes (e.g., flat earth, moon cheese).
   - **AI Stylometric Buzzwords:** Detects over 120 structural generative AI transition markers.
4. **Ensemble Scoring:** For passages exhibiting high factual realism and rich vocabulary ($\ge 70.0$), an intelligent ensemble ($70\% \text{ heuristic} + 30\% \text{ transformer}$) ensures unusual or historical terminology is not penalized. When absurdity or deceptive clickbait is flagged ($\le 30.0$), a strict cap is enforced.

---

### 2. Source Authority Scoring & Anti-Spoofing — `services/source.py`

**Goal:** Evaluate publisher credibility, institutional transparency, and prevent text attribution spoofing.

**Core Capabilities:**
1. **100+ Publisher & Domain Registry (`KNOWN_SOURCES`):**
   - **Primary Wire Services (94–98%):** Reuters, Associated Press, Agence France-Presse, Bloomberg News, Dow Jones.
   - **Global Quality Press (88–94%):** BBC News, The New York Times, The Washington Post, Wall Street Journal, Financial Times, The Guardian, NPR, PBS NewsHour, Deutsche Welle, France 24.
   - **South African & African Media (85–92%):** Daily Maverick, News24, Mail & Guardian, Business Day, Sunday Times, SABC News, Eyewitness News (EWN), TechCentral, AllAfrica.
   - **Certified Fact-Checkers (94–98%):** Africa Check, Snopes, PolitiFact, FactCheck.org, Full Fact, Lead Stories.
   - **Authoritative Scientific Journals (92–98%):** Nature Journal, Science Magazine, MIT Technology Review, Scientific American, Ars Technica.
   - **Encyclopedic Knowledge Bases (90–95%):** Wikipedia Knowledge Base (`wikipedia.org`, `en.wikipedia.org` = 90.0), Encyclopaedia Britannica (`britannica.com` = 95.0).
   - **Questionable & Satirical Outlets (10–35%):** InfoWars, Natural News, The Gateway Pundit, Breitbart, RT, Sputnik, The Onion, The Babylon Bee.
2. **Anti-Spoofing Attribution Framing:** Prevents authors of fake news from inflating credibility by incidental name-dropping. The engine requires verified reporting syntax (e.g., `"according to Reuters"`, `"BBC confirmed"`, `"spokesperson for Associated Press"`). Incidental mentions default to a neutral 65.0 cap.
3. **Discovered Source Authority Bridging:** When pasted text or document uploads lack an explicit byline, authoritative sources discovered through claim corroboration (e.g. Wikipedia Knowledge Base, Encyclopaedia Britannica, major wire services) are automatically bridged into the source authority evaluation, raising the source score from a generic baseline to 89–95%.
4. **Dynamic Fallback Domain Probing:** Unknown URLs are safely probed (after SSRF validation) for SSL certificates, editorial mastheads, corrections policies, and contact transparency, capped at a maximum of 58.0.

---

### 3. Multi-Source Corroboration & Stance Detection — `services/corroboration.py`

**Goal:** Extract declarative claims from text and cross-reference them in real time across external fact-checkers, news feeds, search indexes, and encyclopedias.

**Core Capabilities:**
1. **Smart Topic Query Formulation (`_extract_queries`):**
   - Extracts numeric and date anchors (e.g. `1932`).
   - Extracts deduplicated proper actor entities (e.g. `Australian`, `Western Australia`, `Lewis`).
   - Extracts substantive topic nouns (e.g. `emus`, `machine guns`, `wheat crops`) without restrictive double quotation marks that limit search recall.
   - Generates high-recall keyword bags (e.g. `1932 Australian emus Lewis machine guns`).
2. **Multi-Source Concurrent Verification (`asyncio.gather`):**
   - **Google Fact Check Tools API:** Directly queries ratings from International Fact-Checking Network (IFCN) signatories.
   - **Google News RSS Feed:** Live index of accredited international press coverage.
   - **DuckDuckGo Organic Search:** Live web search with browser headers for organic press archives.
   - **News API Everything Endpoint:** Live news coverage with entity fallback.
   - **Wikipedia Knowledge Base:** Queries Wikipedia Action API with `prop=extracts&exintro=1&explaintext=1` to retrieve complete introductory sections.
3. **Stance & Refutation Detection:**
   - Detects refutation markers (`"false"`, `"debunked"`, `"hoax"`, `"unfounded"`, `"pants on fire"`) to classify debunked viral rumors as `false` with 85–96% confidence, attaching direct citations to the debunking articles.
   - Recognizes affirmative reporting and marks corroborated assertions as `verified` (78–96% confidence).
4. **Semantic Overlap & Subject/Actor Anchoring (`_is_claim_relevant`):**
   - Enforces morphological stemming and non-entity substantive overlap.
   - Validates subject/actor anchoring: candidate press reports must contain the primary actor or key topic nouns (e.g. matching `Australia` + `emu`), preventing third-party news or unrelated hoaxes from contaminating the verification verdict.
5. **Intra-Document Context Propagation:**
   - Extracts document-level context terms. If a lead sentence matches an authoritative encyclopedic record (e.g. `Emu War`), the introductory context is cached and evaluated against subsequent sentences in the same passage.

---

### 4. MongoDB Integration — `db/mongodb.py`

**Goal:** Persist every analysis result so it can be retrieved via a shareable link.

The `get_db()` function is a FastAPI dependency injection provider. Use it in any router:

```python
from fastapi import Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.db.mongodb import get_db

@router.get("/results/{id}")
async def get_result(id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    doc = await db["results"].find_one({"_id": id})
```

**Creating indexes at startup** (add to the lifespan in `main.py`):

```python
db = get_db()
await db["results"].create_index("submitted_at", expireAfterSeconds=2_592_000)  # 30-day TTL
await db["results"].create_index("overall_score")
```

---

### 5. URL Submission — Scraping with newspaper3k

When `type == "url"`, the backend needs to fetch and extract article text before analysis:

```python
# In analysis.py router, before calling the services:
if body.type == "url":
    from newspaper import Article
    article = Article(body.content)
    article.download()
    article.parse()
    content = article.text
    if not content:
        raise HTTPException(status_code=422, detail="Could not extract text from the provided URL.")
else:
    content = body.content
```

---

## Testing

```bash
cd backend
pytest tests/ -v
```

**Writing a test for the analysis endpoint:**

```python
# tests/test_analysis.py
import pytest
from httpx import AsyncClient, ASGITransport
from main import app

@pytest.mark.asyncio
async def test_analyse_text():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/v1/analyse", json={
            "content": "According to Reuters, global temperatures rose by 1.2°C in 2024.",
            "type": "text"
        })
    assert response.status_code == 200
    data = response.json()
    assert "overall_score" in data
    assert 0 <= data["overall_score"] <= 100
    assert data["status"] == "complete"
```

---

## Deployment

### Frontend — Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from project root
vercel --prod

# Set environment variables in Vercel dashboard:
# VITE_API_URL  = https://your-backend-domain.com
# VITE_USE_MOCK_API = false
```

### Backend — Any cloud with Docker

```bash
# Build and push image
docker build -t veritasai-backend ./backend
docker tag veritasai-backend your-registry/veritasai-backend:latest
docker push your-registry/veritasai-backend:latest
```

The image runs on port 8000. Set `CORS_ORIGINS` to your deployed Vercel URL.

---

## Dissertation Notes

This project fulfils the following academic requirements:

- **Implementation contribution:** The XAI output layer (Truth Map) surfaces phrase-level explanations, not just a final score — this is the core academic contribution beyond standard fake-news classifiers.
- **Ensemble scoring:** The weighted combination (40/35/25) of three independent analytical dimensions is the system's architectural novelty.
- **Reproducibility:** All model training code and dataset references are documented in `services/linguistic.py`. The LIAR dataset is publicly available via HuggingFace Datasets.
- **Ethical considerations:** The platform deliberately avoids binary labelling. The Credibility Index is presented as a spectrum to discourage over-reliance on automated verdicts.

---

## Advanced Dissertation Extensions (Implemented)

To elevate this dissertation beyond standard fake-news research, several production-grade systems have been integrated:

### 1. Interactive Claim-Corroboration SVG Graph
An interactive SVG visualization maps extracted claims directly to corroborating news publishers. It renders dynamic relationships without heavy external canvas libraries, supporting smooth hover highlights and showing paths of source authority.

### 2. Fine-Grained XAI Highlight Feedback
Fact-checkers can click highlighted text phrases in the Truth Map to pin detail cards and submit token-level corrections. This active feedback is saved in MongoDB to train the classifier.

### 3. Professional Branded PDF Export
A professional `@media print` style layout converts analysis reports into clean, two-column PDF fact sheets when the user clicks **Export Full Report**, perfect for academic citations.

### 4. API Key Generator & Researcher Dashboard
Allows developers and researchers to query the credibility engine programmatically using the `X-Veritas-API-Key` header. Includes an API key manager in the Profile page with cryptographically secure SHA-256 validation.

### 5. Active Learning & Self-Training Pipeline
An asynchronous background task fine-tunes RoBERTa classification weights (or fallbacks) every 2 weeks using gathered feedback. Built-in concurrency locks prevent race conditions during training.

### 6. Multi-Source Corroboration & Stance Detection
Cross-references claims across Google Fact Check Tools API (certified fact-checkers), live News API with entity query fallback, Google Custom Search (CSE), and the Wikipedia Knowledge Engine. Detects refutation markers to classify debunked viral claims accurately as `false` rather than misclassifying them as verified.

### 7. Comprehensive Source Registry & Anti-Spoofing
Registry of 100+ global, South African, and African publishers, certified fact-checkers, and questionable domains. Enforces journalistic attribution framing to prevent source authority spoofing via incidental name-dropping.

### 8. Two-Tier Role-Based Access Control (PoLP RBAC) & Disaster Recovery
Implements strict Principle of Least Privilege role separation distinguishing Operational Administrators (`admin`) from Super Administrators (`superadmin`). Operational admins manage commercial user tiers, perform account moderation, and inspect telemetry and audit logs, while root actions (destructive database snapshot restorations, active learning model retraining triggers, and administrator promotion/demotion) are strictly gated under `require_superadmin`. Administrative accounts are safeguarded with lockout prevention against commercial self-service subscription modifications.

### 9. Resend Transactional Email & Two-Factor OTP Authentication
Integrates the Resend transactional email API with single-use 6-digit cryptographic OTP verification. Mandates pre-account verification during signup so unverified emails never persist in MongoDB, and enforces 2FA challenges during sign-in. Incorporates a Break-Glass Root Access Policy granting `superadmin@veritas.ai` direct password sign-in without external email dependencies, paired with automatic development environment console logging for offline examiner defense sessions.

---

## Technical Documentation

Detailed, easy-to-understand technical guides for all subsystems are available in the [`docs/`](./docs) directory:

- [Fact-Checking & Corroboration Engine Upgrade](./docs/CORROBORATION_ENGINE_UPGRADE.md) — Multi-source pipeline, query construction, and debunking stance detection.
- [Source Authority Registry & Anti-Spoofing Engine](./docs/SOURCE_AUTHORITY_DATABASE.md) — 100+ publisher registry, attribution checks, and dynamic domain probing.
- [Authentication, Concurrency & Caching Architecture](./docs/AUTHENTICATION_AND_CONCURRENCY.md) — Guest access, async scraping thread offloading, and SHA-256 analysis caching.
- [Linguistic Analysis & AI Text Detection](./docs/LINGUISTIC_AND_AI_DETECTION.md) — Sentence-level XAI, attribution precedence, and Shannon entropy AI detection.
- [Cyber Security: SSRF & Input Sanitisation](./docs/SSRF_AND_INPUT_SECURITY.md) — Subnet filtering, DNS resolution checks, and XSS prevention.
- [API Key Management System](./docs/API_KEY_MANAGEMENT.md) — SHA-256 developer key generation and authentication headers.
- [Active Learning & Continuous Retraining](./docs/ACTIVE_LEARNING_PIPELINE.md) — Feedback loop, data curation, and model re-tuning.
- [Interactive Corroboration Graph Visualization](./docs/GRAPH_VISUALIZATION.md) — Dynamic SVG claim-to-source mapping.
- [Machine Learning Training Pipeline](./docs/ML_PIPELINE.md) — RoBERTa fine-tuning on the LIAR dataset.

---

*VeritasAI — Beyond fact-checking. A Credibility Index.*
*BSc IT Dissertation — Michael Mazhambe (402100810)*


