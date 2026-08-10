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
| **Linguistic Analysis** | 40% | RoBERTa NLP detects stylometric patterns, AI-generation signatures, and manipulation markers |
| **Source Authority** | 35% | Publisher domain credibility scored against MediaBias/FactCheck and editorial standards databases |
| **External Corroboration** | 25% | Claims cross-referenced in real time against the News API and authoritative news sources |

The platform also includes an **Explainable AI (XAI) output layer** — the "Truth Map" — which highlights the specific phrases in the submitted text that most influenced the Credibility Index score.

**Target users:** Journalists, researchers, students, and general public. Free and publicly accessible, no login required.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Frontend                           │
│  Home.tsx → Verify.tsx ──── POST /api/v1/analyse ──► Results.tsx│
│                 │                                               │
│         src/services/api.ts  (typed HTTP client)               │
└────────────────────┬────────────────────────────────────────────┘
                     │  HTTP (Vite proxy in dev / direct in prod)
┌────────────────────▼────────────────────────────────────────────┐
│                   FastAPI Backend (Uvicorn)                      │
│                                                                 │
│  POST /api/v1/analyse                                           │
│    │                                                            │
│    ├── LinguisticService ──► RoBERTa (HuggingFace)             │
│    │      └── XAI annotations (attention / LIME)               │
│    │                                                            │
│    ├── SourceAuthorityService ──► MBFC database / Google CSE   │
│    │                                                            │
│    └── CorroborationService ──► News API + sentence-transformers│
│                                                                 │
│    asyncio.gather() runs all three concurrently                 │
│    → compute weighted ensemble score                            │
│    → persist AnalysisResult to MongoDB                          │
│    → return JSON to frontend                                    │
└────────────────────┬────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────────┐
│                   MongoDB (Motor async driver)                   │
│   Collection: results  — stores AnalysisResult documents        │
└─────────────────────────────────────────────────────────────────┘
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
├── src/                            # React frontend
│   ├── app/
│   │   └── components/
│   │       ├── Home.tsx            # Landing page
│   │       ├── Verify.tsx          # Content submission page
│   │       ├── Results.tsx         # Credibility Index report + Truth Map
│   │       ├── Header.tsx
│   │       └── ui/                 # shadcn/ui component library
│   ├── services/
│   │   └── api.ts                  # ★ Typed HTTP client (veritasAPI)
│   ├── types/
│   │   └── analysis.ts             # ★ Shared TypeScript interfaces
│   └── styles/
│       └── theme.css               # CSS variables and design tokens
│
├── backend/
│   ├── main.py                     # ★ FastAPI app entry point
│   ├── requirements.txt
│   ├── .env.example                # Copy to .env and fill in keys
│   ├── Dockerfile
│   └── app/
│       ├── config.py               # ★ Pydantic settings (reads .env)
│       ├── schemas/
│       │   ├── request.py          # AnalyseRequest schema
│       │   └── response.py         # ★ AnalysisResult + sub-schemas
│       ├── db/
│       │   └── mongodb.py          # ★ Motor connection + get_db()
│       ├── routers/
│       │   ├── health.py           # GET /api/v1/health
│       │   └── analysis.py         # ★ POST /api/v1/analyse + GET /api/v1/results/:id
│       └── services/
│           ├── linguistic.py       # ★ RoBERTa NLP + XAI (completed)
│           ├── source.py           # ★ Domain authority scoring (completed)
│           └── corroboration.py    # ★ News API cross-reference (completed)
│
├── docker-compose.yml              # ★ Full stack: frontend + backend + MongoDB
├── vite.config.ts                  # Vite config with /api proxy
└── README.md                       # This file

★ = key files to focus on
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

### 1. Linguistic Analysis — `services/linguistic.py`

**Goal:** Use a fine-tuned RoBERTa transformer to score text credibility and produce XAI phrase annotations.

**Step 1 — Fine-tune the model**

The model is `roberta-base` from HuggingFace, fine-tuned as a sequence classifier on the LIAR dataset (6-class: pants-fire, false, barely-true, half-true, mostly-true, true).

```bash
# Install datasets
pip install datasets

# Training script outline:
from transformers import AutoTokenizer, AutoModelForSequenceClassification, Trainer, TrainingArguments
from datasets import load_dataset

dataset = load_dataset("liar")
tokenizer = AutoTokenizer.from_pretrained("roberta-base")

def tokenize(batch):
    return tokenizer(batch["statement"], truncation=True, max_length=512, padding="max_length")

tokenized = dataset.map(tokenize, batched=True)
model = AutoModelForSequenceClassification.from_pretrained("roberta-base", num_labels=6)

args = TrainingArguments(
    output_dir="./models/roberta-fakenews",
    num_train_epochs=3,
    per_device_train_batch_size=16,
    evaluation_strategy="epoch",
    save_strategy="epoch",
    load_best_model_at_end=True,
)
trainer = Trainer(model=model, args=args,
                  train_dataset=tokenized["train"],
                  eval_dataset=tokenized["validation"])
trainer.train()
trainer.save_model("./models/roberta-fakenews")
```

Save the checkpoint to `backend/models/roberta-fakenews/` and update `MODEL_PATH` in `.env`.

**Step 2 — Real-time inference**

```python
# In LinguisticService.__init__:
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

self._tokenizer = AutoTokenizer.from_pretrained(settings.model_path)
self._model = AutoModelForSequenceClassification.from_pretrained(settings.model_path)
self._model.eval()
self._model_loaded = True

# In LinguisticService.analyse:
inputs = self._tokenizer(text, return_tensors="pt", truncation=True, max_length=512)
with torch.no_grad():
    outputs = self._model(**inputs)
probs = torch.softmax(outputs.logits, dim=-1)[0]
# Map class probabilities to a 0-100 credibility score
credibility_score = (probs[3] + probs[4] + probs[5]).item() * 100  # mostly-true + true
ai_prob = (probs[0] + probs[1]).item() * 100  # pants-fire + false
```

**Step 3 — XAI phrase annotations (LIME)**

LIME (Local Interpretable Model-agnostic Explanations) is the recommended approach. It perturbs input words and observes which removals most change the model's output.

```bash
pip install lime
```

```python
from lime.lime_text import LimeTextExplainer

def predict_fn(texts):
    # Batch inference — returns probabilities for each class
    inputs = self._tokenizer(texts, return_tensors="pt", truncation=True,
                              padding=True, max_length=512)
    with torch.no_grad():
        logits = self._model(**inputs).logits
    return torch.softmax(logits, dim=-1).numpy()

explainer = LimeTextExplainer(class_names=["pants-fire","false","barely-true","half-true","mostly-true","true"])
explanation = explainer.explain_instance(text, predict_fn, num_features=10, labels=[0, 1])

# Map LIME features to XAIAnnotation objects
for word, weight in explanation.as_list(label=1):  # label 1 = "false"
    ann_type = "manipulative" if weight > 0.05 else "verified" if weight < -0.05 else "neutral"
    annotations.append(XAIAnnotation(text=word, type=ann_type,
                                     reason=f"LIME weight: {weight:.3f}",
                                     confidence=abs(weight) * 100))
```

---

### 2. Source Authority Scoring — `services/source.py`

**Goal:** Score the credibility of the publisher/domain on a 0–100 scale.

**Step 1 — Domain extraction from URLs**

```python
from urllib.parse import urlparse
domain = urlparse(url).netloc.lower().removeprefix("www.")
# e.g. "bbc.com", "unknownblog.net"
```

**Step 2 — MediaBias/FactCheck database lookup**

Download the community-maintained MBFC dataset from:
https://github.com/ramaboo/mbfc-data

Load it at startup as a pandas DataFrame indexed by domain for O(1) lookups:

```python
import pandas as pd
self._mbfc = pd.read_csv("data/mbfc.csv")
# Columns: domain, bias_rating, factual_reporting, credibility_rating

def _lookup_domain(self, domain: str) -> float:
    row = self._mbfc[self._mbfc["domain"].str.contains(domain, na=False)]
    if row.empty:
        return self._fallback_score(domain)
    factual = row.iloc[0]["factual_reporting"]  # "HIGH", "MIXED", "LOW", etc.
    return {"HIGH": 90, "MOSTLY FACTUAL": 75, "MIXED": 50, "LOW": 25, "VERY LOW": 10}.get(factual, 50)
```

**Step 3 — Fallback domain scoring**

For domains not in MBFC, compute a heuristic score from:
- Domain age (older = more credible): via WHOIS API
- HTTPS presence
- Has an editorial/about/contact page

```python
import httpx

async def _fallback_score(self, domain: str) -> float:
    score = 30  # start low for unknown domains
    async with httpx.AsyncClient(timeout=5) as client:
        try:
            r = await client.get(f"https://{domain}", follow_redirects=True)
            if r.status_code == 200:
                score += 10
            if "contact" in r.text.lower() or "about" in r.text.lower():
                score += 10
        except Exception:
            pass
    return min(score, 60)  # cap unknown domains at 60
```

---

### 3. External Corroboration — `services/corroboration.py`

**Goal:** Extract factual claims from the text and cross-reference each one against the News API.

**Step 1 — Register for a free News API key**

Go to https://newsapi.org/register and add the key to `.env` as `NEWS_API_KEY`.

**Step 2 — Claim extraction**

Use sentence segmentation + a zero-shot NLI model to identify declarative factual claims:

```python
import spacy
nlp = spacy.load("en_core_web_sm")

def _extract_claims(self, text: str) -> list[str]:
    doc = nlp(text)
    claims = []
    for sent in doc.sents:
        # Keep declarative sentences with a subject and main verb
        has_nsubj = any(tok.dep_ == "nsubj" for tok in sent)
        if has_nsubj and len(sent.text.split()) > 5:
            claims.append(sent.text.strip())
    return claims[:5]  # limit to 5 claims per request (API rate limits)
```

**Step 3 — News API query**

```python
import httpx

async def _verify_claim(self, claim: str) -> ClaimResult:
    # Extract 3-5 keywords from the claim (use spaCy NER or simple noun phrases)
    keywords = " ".join([tok.text for tok in nlp(claim) if tok.pos_ in ("NOUN","PROPN")])[:100]

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get("https://newsapi.org/v2/everything", params={
            "q": keywords,
            "language": "en",
            "sortBy": "relevancy",
            "pageSize": 5,
            "apiKey": settings.news_api_key,
        })
    articles = resp.json().get("articles", [])
    confidence = min(len(articles) * 18, 95)  # crude: more articles = higher confidence
    status = "verified" if len(articles) >= 3 else "unverified"
    return ClaimResult(claim=claim, status=status, confidence=confidence, sources=len(articles))
```

**Step 4 — Semantic similarity (optional but improves accuracy)**

```bash
pip install sentence-transformers
```

```python
from sentence_transformers import SentenceTransformer, util

embedder = SentenceTransformer("all-MiniLM-L6-v2")

def _is_semantically_similar(self, claim: str, article_title: str, threshold=0.45) -> bool:
    embs = embedder.encode([claim, article_title], convert_to_tensor=True)
    return util.cos_sim(embs[0], embs[1]).item() > threshold
```

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

---

*VeritasAI — Beyond fact-checking. A Credibility Index.*

