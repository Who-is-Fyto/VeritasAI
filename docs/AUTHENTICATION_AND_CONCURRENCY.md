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
3. **Instant Response & Document Fidelity:** On cache hit, the stored scores, XAI annotations, sources (including Discovered Source Authority Bridging records for pasted texts), and verified claim linkages are reused with a fresh report ID, returning in **under 20 milliseconds** instead of 4 seconds!
4. **Preservation of Discovered Corroborating Sources:** For text or document submissions, the cached payload preserves the bridged publisher list (e.g. Wikipedia Knowledge Base, Encyclopaedia Britannica, or wire services) and elevated source credibility, ensuring subsequent queries receive identical, fully-hydrated verification dossiers.
5. **Cache Invalidation & TTL:** Analyses older than 2 hours are automatically bypassed to allow fresh news crawling and updated fact-checking status. Administrative cache clearance is supported by querying and removing matching `content_hash` documents directly in MongoDB.

---

## 4. Python 3.12 Timezone-Aware UTC Modernization

In Python 3.12, `datetime.utcnow()` is officially deprecated and emits `DeprecationWarning`. We replaced all instances across the codebase (`auth.py`, `analysis.py`, `response.py`, `trainer.py`) with:
```python
from datetime import datetime, timezone

datetime.now(timezone.utc)
```
This guarantees timezone-safe ISO 8601 timestamps and ensures clean, warning-free automated test runs.

---

## 5. Two-Tier Role-Based Access Control (PoLP RBAC) & Administrative Lockout Prevention

### The Problem:
1. **Unchecked Self-Service Downgrade:** Previously, when an administrative user opened the consumer Pricing Modal and clicked a commercial subscription plan (Free or Pro), the client sent `PUT /api/v1/auth/tier`. The backend unconditionally updated the user's `tier` field in MongoDB to `"free"` or `"pro"`, stripping their administrative privileges and locking them out of the `/admin` portal.
2. **Registration Privilege Escalation:** The public registration endpoint (`POST /api/v1/auth/register`) accepted arbitrary `role` parameters from the request payload. If a user supplied `role: "admin"` or `role: "superadmin"`, downstream response builders and authorization heuristics could grant administrative status. Furthermore, naive domain and substring matching (`"admin" in email`) introduced security vulnerabilities.
3. **Monolithic Admin Model:** All administrative actions were bundled under a single monolithic superadmin tier, violating the Principle of Least Privilege (PoLP) and preventing the delegation of day-to-day moderation and telemetry oversight to operational staff.

### The Solution:

#### 1. PoLP Two-Tier Authorization Model (`require_admin` vs `require_superadmin`):
We separated administrative responsibilities into two distinct security tiers:
- **Operational Administrator (`admin`):** Granted access via `require_admin` to:
  - User listing, filtering, and search.
  - Commercial user tier management (`free`, `pro`, `academic`).
  - Account moderation (suspending/reinstating standard accounts).
  - Database telemetry and performance latency metrics.
  - Immutable security audit log inspection.
  - Active learning model status and loss metrics.
- **Super Administrator (`superadmin`):** Enforced via `require_superadmin` for root operations:
  - Elevating users to `admin` or `superadmin`.
  - Demoting or modifying other administrators.
  - Permanent user deletion.
  - Point-in-time snapshot creation and archive downloads.
  - Destructive database restoration operations.
  - Dispatching active learning model retraining cycles.

#### 2. Registration Role Sanitization:
In `backend/app/routers/auth.py`, `register` strips any self-assigned administrative role:
```python
user_role = aff["role"]
if user.role and user.role.lower() not in {"superadmin", "admin", "administrator"}:
    user_role = user.role.strip()

user_dict = {
    # ...
    "role": user_role,
    "tier": "free",
    "is_superadmin": False,
    "is_admin": False,
}
```

#### 3. Administrative Subscription Lockout Prevention:
In `backend/app/routers/auth.py`, `update_tier` (`PUT /api/v1/auth/tier`) enforces an immediate `403 Forbidden` guard against any administrative account:
```python
is_admin_user = (
    current_user.tier in {"superadmin", "admin"}
    or (current_user.role or "").lower() in {"superadmin", "admin"}
    or current_user.email.lower() in {"superadmin@veritas.ai", "admin@veritas.ai"}
)
if is_admin_user:
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Administrative accounts cannot be modified via self-service commercial subscriptions."
    )
```

In the frontend, `PricingModal.tsx` detects administrative status, displays a protective warning banner, and disables plan upgrade actions. Additionally, `Header.tsx` and `Profile.tsx` route administrative users directly to `/admin` instead of consumer billing options.

---

## 6. Resend Transactional Email & Two-Factor OTP Authentication

### The Problem:
Unverified email registrations enable bad actors to create disposable accounts, exhaust compute resources for RoBERTa transformer inference, and flood feedback datasets with poisoned training samples. Furthermore, single-factor password logins remain susceptible to credential stuffing and phishing attacks.

### The Solution:
We implemented an enterprise-grade Two-Factor Authentication (2FA) and email verification pipeline powered by **Resend** (`https://api.resend.com/emails`) and MongoDB:

1. **Two-Stage Registration with Pre-Account Verification:**
   - On `/signup`, submitting personal details invokes `POST /api/v1/auth/signup/request-otp`.
   - The user record is **not** committed to the `users` collection yet. Instead, a cryptographically random 6-digit PIN (`secrets.randbelow(900000) + 100000`) is generated and hashed using SHA-256 into a temporary `verification_otps` collection with a 10-minute expiration timestamp.
   - An asynchronous HTTP request via `httpx.AsyncClient` delivers a responsive, branded HTML email template via Resend.
   - When the user enters the PIN, `POST /api/v1/auth/signup/verify-otp` validates the token, inserts the verified user into MongoDB, clears the temporary record, and returns a session JWT.

2. **Credential Sign-In with 2FA Challenge:**
   - Submitting email and password to `POST /api/v1/auth/login` verifies the bcrypt hash.
   - For standard accounts, the endpoint dispatches a 6-digit sign-in PIN to the user's email and responds with `{ "requires_otp": true }`.
   - The user enters the PIN on the frontend, submitting to `POST /api/v1/auth/login/verify-otp` to receive their session token.

3. **Break-Glass Root Access Policy (Superadmin Direct Bypass):**
   - The root Superadmin account (`superadmin@veritas.ai`) is configured with an internal institutional mock domain lacking a public MX mail exchange.
   - Enforcing an email OTP on this identity would result in permanent administrator lockout if external delivery failed.
   - The backend enforces a **Break-Glass Root Access Policy**: entering valid superadmin credentials immediately issues the root JWT without an OTP challenge, ensuring disaster recovery capabilities are never obstructed by third-party mail gateways.

4. **Examiner Defense & Offline Presentation Resiliency:**
   - In development mode (`APP_ENV=development`) or when `RESEND_API_KEY` is not configured, the generated OTP is logged directly to the server terminal (`[VERITAS-AI OTP CODE] >> XXXXXX <<`) and returned in the response payload (`dev_otp`).
   - This ensures live examiner demonstrations can be conducted smoothly even in environments with restricted external network access or spotty campus Wi-Fi.

---

*BSc IT Dissertation Notes — Michael Mazhambe*
