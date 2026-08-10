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

## 3. The Dual Dependency Gate

We wanted the core analysis endpoint (`POST /api/v1/analyse`) to accept BOTH standard logged-in users and automated script keys.

In `backend/app/routers/auth.py`, we wrote a custom FastAPI dependency called `get_user_or_api_key`:
1.  **Check JWT:** First, it checks if a valid Bearer token is provided in the `Authorization` header. If it's valid, it returns the user.
2.  **Check API Key:** If no JWT is found, it looks for the custom header `X-Veritas-API-Key`.
3.  **Validate Hash:** It takes the incoming header, hashes it with SHA-256, and queries MongoDB for a matching document.
4.  **Allow or Block:** If a match is found, it lets the analysis run. If both checks fail, it raises a `401 Unauthorized` block.

You can manage your API keys, view their creation dates, and revoke (delete) them instantly in the Profile dashboard!

---

*BSc IT Dissertation Notes — Michael Mazhambe*
