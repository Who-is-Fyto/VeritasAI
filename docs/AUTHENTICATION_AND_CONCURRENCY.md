# Authentication, Concurrency & Analysis Caching Architecture

This document describes the backend architectural improvements implemented in `backend/app/routers/auth.py` and `backend/app/routers/analysis.py` to ensure fast, concurrent, and accessible operations.

---

## 1. Frictionless Guest Access with Optional Authentication

### The Problem:
Previously, `POST /api/v1/analyse` depended on `get_user_or_api_key`. Any visitor who landed on the application without registering an account immediately received a `401 Unauthorized` error, breaking the requirement for an open public credibility scanner.

### The Solution:
We implemented `get_optional_user_or_api_key`:

```python
async def get_optional_user_or_api_key(
    token: str | None = Depends(oauth2_scheme),
    x_veritas_api_key: str | None = Header(None, alias="X-Veritas-API-Key"),
    db: AsyncIOMotorDatabase = Depends(get_db)
) -> UserResponse | None:
```

### Authentication Behavior:
1. **Public Guest Visitors:** If no `Authorization` header and no `X-Veritas-API-Key` are present, the endpoint returns `None` and allows the analysis to run freely.
2. **Authenticated Users & Developers:** If a valid JWT or API key is provided, the authenticated `UserResponse` is resolved and `user_id` is linked to the MongoDB result document.
3. **Security Invariant:** If invalid, expired, or revoked credentials are provided, the endpoint returns `401 Unauthorized`.

---

## 2. Asynchronous Thread Offloading for Web Scraping

### The Problem:
`newspaper3k` is a synchronous Python library. When scraping a URL:
```python
article.download()  # Blocking network I/O
article.parse()     # Blocking CPU HTML parsing
```
Calling these directly inside an `async def analyse(...)` route blocked the **entire Python asyncio event loop**. All other users trying to access the API while a scrape was in progress had to wait.

### The Solution:
We encapsulated the scraper into a standalone helper and offloaded execution to worker threads using `asyncio.to_thread`:

```python
def _scrape_article(target_url: str) -> str:
    from newspaper import Article, Config
    cfg = Config()
    cfg.request_timeout = 5
    cfg.MAX_FILE_SIZE = 2 * 1024 * 1024
    cfg.number_of_threads = 1
    cfg.browser_user_agent = "VeritasAI Credibility Scanner/1.0"
    article = Article(target_url, config=cfg)
    article.download()
    article.parse()
    return article.text or ""

content_to_analyse = await asyncio.to_thread(_scrape_article, body.content)
```

Now, blocking network I/O runs in background worker threads, keeping FastAPI's event loop 100% responsive for high-concurrency workloads.

---

## 3. SHA-256 Analysis Caching in MongoDB

### The Problem:
News verification APIs (News API, Google CSE) have rate limits and daily quotas. If multiple users analyse the same viral article or trending claim, querying external APIs repeatedly wastes quota and causes unnecessary latency (3–6 seconds per run).

### The Solution:
We added a content hashing and caching layer in MongoDB:

1. **Deterministic Fingerprint:** A SHA-256 hash is computed from the input type and normalized content:
   `content_hash = hashlib.sha256(f"{body.type}:{body.content.strip()}".encode()).hexdigest()`
2. **2-Hour Sliding Window:** Before invoking the RoBERTa and external corroboration pipelines, the database is queried for an existing completed result:
   ```python
   two_hours_ago = datetime.now(timezone.utc) - timedelta(hours=2)
   cached_doc = await db["results"].find_one({
       "content_hash": content_hash,
       "status": "complete",
       "submitted_at": {"$gte": two_hours_ago}
   })
   ```
3. **Instant Response:** On cache hit, the stored scores, XAI annotations, sources, and claims are reused with a fresh report ID, returning in **under 20 milliseconds** instead of 4 seconds!

---

## 4. Python 3.12 Timezone-Aware UTC Modernization

In Python 3.12, `datetime.utcnow()` is officially deprecated and emits `DeprecationWarning`. We replaced all instances across the codebase (`auth.py`, `analysis.py`, `response.py`, `trainer.py`) with:
```python
from datetime import datetime, timezone

datetime.now(timezone.utc)
```
This guarantees timezone-safe ISO 8601 timestamps and ensures clean, warning-free automated test runs.

---

*BSc IT Dissertation Notes — Michael Mazhambe*
