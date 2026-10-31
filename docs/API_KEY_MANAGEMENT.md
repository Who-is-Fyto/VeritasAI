# Developer API Key Management & Authentication

Hey! If you want to know how we secure user profiles and let third-party developers call our credibility engine programmatically, here is the breakdown. 

---

## 1. User Auth (JWT)

For standard logins (sign up, log in, view profile), we use **JWT (JSON Web Tokens)**:
1.  **Password Hashing:** When you sign up, your password is encrypted using `bcrypt` (we never store plain text passwords in MongoDB, obviously).
2.  **Tokens:** Log in returns a JWT token signed with a secret key (`settings.jwt_secret`). The browser stores this in `localStorage` and appends it as a `Bearer` header to authenticated requests.

---

## 2. Developer API Keys

We wanted researchers to be able to scan articles automatically using Python scripts. To support this without them sharing their login passwords, we built a Developer Key system.

### Safe Key Storage (SHA-256)
API keys should never be stored in plain text in the database. If the database got leaked, attackers could steal everyone's keys!
*   **Generation:** When you click "Generate Key", we generate a unique, cryptographically secure string (e.g. `veritas_a1b2c3d4...`).
*   **Display:** We show it to you **once** in the UI so you can copy it.
*   **Hashing:** We hash the key using `hashlib.sha256()` and save the *hashed* version in MongoDB, alongside a safe public prefix (e.g., `veritas_a1b2...`) for listing metadata.

---

## 3. The Dual Dependency Gate & Public Guest Scans

We wanted our API architecture to handle three distinct access profiles:
1. **Authenticated Users:** Logged-in journalists, researchers, and students using standard JWT Bearer sessions.
2. **Automated Scripts & Developers:** Headless research crawlers and data pipelines supplying `X-Veritas-API-Key` headers.
3. **Public Guest Visitors:** Open web visitors scanning an article or claim on the landing page without an active account.

In `backend/app/routers/auth.py`, we implemented two specialized FastAPI security dependencies:

### Strict Authentication: `get_user_or_api_key`
Used for protected user profile, history, API key generation, and administrative endpoints:
1. **Check JWT:** First, checks for a valid Bearer token in the `Authorization` header. If valid, resolves the user session.
2. **Check API Key:** If no JWT is present, checks for the custom `X-Veritas-API-Key` header.
3. **Validate Hash:** Hashes the incoming key with SHA-256 and queries the `api_keys` collection. If active and matched, resolves the linked user.
4. **Enforce Access:** If both credentials are missing or invalid, raises `401 Unauthorized`.

### Optional Authentication: `get_optional_user_or_api_key`
Used by `POST /api/v1/analyse` to provide an accessible public scanner:
1. **Guest Permitted:** If neither JWT nor API key is passed, returns `None`, allowing the verification pipeline to execute seamlessly.
2. **Quota & Audit Attribution:** If credentials are provided, resolves the user and associates the resulting report with their saved history and account tier limits.
3. **Security Invariant:** If invalid, expired, or malformed credentials are provided, strictly blocks the request with `401 Unauthorized` to prevent spoofed sessions.

You can manage your API keys, view their creation dates, and revoke them instantly in the Profile dashboard!

---

*BSc IT Dissertation Notes — Michael Mazhambe*
