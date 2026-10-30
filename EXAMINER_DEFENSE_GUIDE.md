# VeritasAI Version 1.5 — Examiner Defense & Architectural Verification Guide

> **Candidate / Researcher:** Michael Mazhambe  
> **Degree Program:** Postgraduate Research / BSc Information Technology (Honours)  
> **Faculty:** Richfield Graduate Institute of Technology — Faculty of Information Technology  
> **Target Version:** v1.5.0 (Commercial Flagship & Academic Defense Edition)  
> **Repository:** `/home/michael/Downloads/VeritasAI`  
> **Active Branch:** `pending-updates`  
> **System Status:** Fully Integrated, Tested, and Verified

---

## 1. Executive Summary & Defense Abstract

VeritasAI v1.5 transforms digital media verification from single-signal heuristic classification into an explainable, multi-agent disinformation detection platform. The system operates on an ensemble Multi-Criteria Decision Analysis (MCDA) mathematical framework combining:

1. **Linguistic Stylometry & Transformer Inference (40% Weight):** 12-layer RoBERTa transformer checkpoints evaluating syntactic burstiness, lexical richness (Type-Token Ratio), passive voice distribution, and manipulation markers.
2. **Publisher Domain Authority & Nutrition Labeling (35% Weight):** MediaBias/FactCheck and NewsGuard-inspired publisher accountability evaluating masthead disclosure, correction regularities, ownership transparency, and domain registration age.
3. **Multi-Source News Corroboration & Fact-Checking (25% Weight):** Ordered entity extraction, live Google News RSS indexing, DuckDuckGo organic search fallback, Snopes / AFP Fact Check review aggregation, and semantic predicate alignment safeguards.

This guide provides academic examiners with a structured roadmap demonstrating how each explicit defense requirement is implemented in code, validated via automated test suites, and guarded by enterprise architectural principles.

---

## 2. Master Examiner Defense Verification Matrix

| Examiner Requirement | Technical Implementation | Core Source Files | Verification Test Suites |
|---|---|---|---|
| **Strict Form Validation** | Client-side schema checks; real-time field borders; disabled submit buttons; inline error rendering | `src/app/components/Login.tsx`<br>`src/app/components/Signup.tsx`<br>`src/app/components/Verify.tsx` | `tests/test_validation.py` |
| **Nonsense Email Blocking** | RFC 5322 regex + explicit rejection of single-character domain labels (`yd@g.com`, `a@b.c`) + disposable email blacklist | `src/utils/validation.ts`<br>`backend/app/schemas/auth.py` | `tests/test_validation.py::test_validate_strict_email_*` |
| **Multi-Tier Account Modeling** | 4-tier model (Free Community, Pro Journalist, Academic Seat, Super Admin); daily scan quotas; feature gating; upgrade comparison modal | `src/utils/tierLimits.ts`<br>`src/context/AuthContext.tsx`<br>`src/app/components/PricingModal.tsx`<br>`backend/app/schemas/auth.py` | `tests/test_validation.py::test_account_tier_validation` |
| **Super Admin Governance & RBAC** | Role-gated management portal (`/admin`); user search/filter; tier elevation; account suspension safeguards (admin cannot suspend self); telemetry; audit ledger | `src/app/components/AdminDashboard.tsx`<br>`backend/app/routers/admin.py` | `tests/test_admin.py::test_admin_rbac_*`<br>`tests/test_admin.py::test_admin_can_*` |
| **In-UI Database Backup & Recovery** | Browser-initiated compressed BSON `.zip` snapshots via API; manifest SHA-256 verification; downloadable archives; double-confirmation restore (`"RESTORE"`); superadmin lockout auto-preservation | `backend/app/services/backup.py`<br>`backend/app/routers/admin.py`<br>`src/app/components/AdminDashboard.tsx` | `tests/test_admin.py::test_admin_backup_*` |
| **Audit Certificate & Export Engine** | ISO/IEC 23894 and IEEE 7001 compliant Credibility Audit Certificate; verification ID (`VER-XXXXXXXX`); cryptographic attestation hash; print-optimized stylesheet; JSON dossier export | `src/app/components/AuditCertificateModal.tsx`<br>`src/app/components/Results.tsx`<br>`backend/app/routers/analysis.py` | `tests/test_certificate.py` |
| **Mock & Real API Parity** | 100% operational parity between offline demo mode (`VITE_USE_MOCK_API=true`) and live backend (`VITE_USE_MOCK_API=false`); localStorage persistence; Sonner toast feedback across all viewports | `src/services/api.ts`<br>`src/app/App.tsx`<br>`src/context/AuthContext.tsx` | `tests/test_analysis.py`<br>`npm run build` |
| **Predicate Alignment Safeguards** | Semantic overlap and subject anchoring preventing unrelated hoaxes from contaminating legitimate news claims | `backend/app/services/corroboration.py` | `tests/test_analysis.py::test_corroboration_*` |

---

## 3. Detailed Architectural Workflows

### 3.1 Strict Email & Form Validation Workflow
Examiners frequently test edge cases with nonsense email addresses such as `yd@g.com`, `user@c.o`, or disposable addresses (`tempmail.com`). VeritasAI blocks these at both client and server boundaries:

1. **Client Tier (`src/utils/validation.ts`):**
   - Syntax validation requires domain segments to contain at least 2 characters before and after dots (e.g. `domain.tld`).
   - Disposable email blacklist checks against over 40 known temporary domains.
   - Real-time visual feedback updates inputs with emerald borders on valid inputs and amber/rose borders with descriptive helper text on invalid inputs.
2. **Server Tier (`backend/app/schemas/auth.py`):**
   - Pydantic `@field_validator("email")` applies identical rules. If an invalid email bypasses the client, the API returns HTTP 422 Unprocessable Entity with a clear error payload.

### 3.2 In-UI Database Backup & Disaster Recovery Architecture
The VeritasAI backup engine guarantees point-in-time state recovery without shell or terminal intervention:

1. **Snapshot Creation (`backend/app/services/backup.py`):**
   - Ingests all core MongoDB collections: `users`, `results`, `api_keys`, `feedback`, `audit_logs`.
   - Serializes documents using `bson.json_util` to guarantee lossless preservation of BSON datatypes (`ObjectId`, `ISODate`, binary hashes).
   - Writes compressed `.zip` archive using `zipfile.ZIP_DEFLATED`.
   - Generates an internal `manifest.json` containing collection document tallies, creation timestamp, and SHA-256 archive checksum.
   - Atomic rename (`.tmp_*.zip` -> `*.zip`) prevents partial archive corruption.
2. **One-Click Double-Confirmation Restore:**
   - Safety modal in `src/app/components/AdminDashboard.tsx` requires the administrator to explicitly type `"RESTORE"` in capital letters.
   - Clears existing documents (optional toggle) and imports collection data.
   - **Superadmin Preservation Guarantee:** The restore service automatically seeds or updates the primary superadmin account post-restore, ensuring administrators are never locked out even when restoring historical snapshots from prior to account creation.

### 3.3 Multi-Criteria Decision Analysis (MCDA) Ensemble Formula
The overall Credibility Index is calculated through weighted multi-attribute aggregation:

$$\text{Credibility Index} = (S_{\text{linguistic}} \times 0.40) + (S_{\text{source}} \times 0.35) + (S_{\text{corroboration}} \times 0.25)$$

- **$S_{\text{linguistic}}$ (40%):** RoBERTa sequence classification probability paired with stylometric variance analysis.
- **$S_{\text{source}}$ (35%):** Aggregated MediaBias/FactCheck and domain credibility record.
- **$S_{\text{corroboration}}$ (25%):** Ratio of verified vs refuted claims corroborated across indexed global press sources.

---

## 4. Automated Test Suite Execution & Results

The system maintains 100% automated test pass rates across both Python backend and TypeScript frontend components.

### 4.1 Backend Pytest Execution
To execute the complete 27-test suite against the backend virtual environment:

```bash
cd /home/michael/Downloads/VeritasAI/backend
./venv/bin/python -m pytest tests/ -v
```

**Results:**
- `tests/test_validation.py`: 6 passed (strict email blocking, nonsense domains, registration schemas, scan payloads, tier limits)
- `tests/test_admin.py`: 7 passed (RBAC access gating, user listing, tier elevation, suspension self-guard, telemetry, backup creation, backup lifecycle)
- `tests/test_certificate.py`: 3 passed (audit certificate generation, cryptographic hashing, 404 handling)
- `tests/test_auth.py`: 1 passed (full registration, duplicate prevention, login, JWT verification, developer API keys)
- `tests/test_trainer.py`: 1 passed (active learning ML loop, model training task queue, status polling)
- `tests/test_analysis.py`: 9 passed (text analysis, health endpoint, guest scans, analysis caching, anti-spoofing, satire detection, predicate alignment, live fact check debunking, subject actor anchoring)

**Overall:** 27 passed, 0 failed in 28.75s.

### 4.2 Frontend Production Build Verification
To execute production TypeScript compilation and asset bundling:

```bash
cd /home/michael/Downloads/VeritasAI
npm run build
```

**Results:**
- Transformed 2,729 modules with zero TypeScript compilation warnings or errors.
- Built clean production distribution bundle in `dist/`.

---

## 5. Demonstration Quick Reference for Examiners

When conducting an interactive examination demonstration, follow this step-by-step procedure:

1. **Demonstrating Form Validation & Strict Email Integrity:**
   - Navigate to `/signup` or `/login`.
   - Enter `yd@g.com`. Observe immediate client-side block: *"Domain label 'g' is too short"*. Submit button remains disabled.
   - Enter `student@tempmail.com`. Observe block: *"Disposable and temporary email domains are not allowed"*.
   - Enter `michael@student.richfield.ac.za`. Observe immediate green checkmark and dynamic institutional badge rendering (*"Richfield Faculty of ICT · BSc Information Technology Student"*).
2. **Demonstrating Commercial Tiers & Verification Limits:**
   - Log in as Free Community user.
   - Navigate to `/verify`. Note daily scan quota badge (5 scans/day).
   - Click *"Upgrade / Compare Tiers"* to inspect the commercial plan comparison modal.
3. **Demonstrating the Credibility Index & Audit Certificate:**
   - Submit a test article on `/verify`.
   - On the results page, inspect the PolitiFact-style Truth-O-Meter gauge, NewsGuard-style Source Authority nutrition label, and claim accordion.
   - Click *"Export Credibility Certificate"* in the action bar or top ribbon.
   - Inspect the formal certificate with unique verification reference ID (`VER-XXXXXXXX`), issue timestamp, cryptographic SHA-256 attestation hash, and MCDA formula.
   - Click *"Print / Save PDF"* to view the clean, border-aligned A4 print layout.
4. **Demonstrating Super Admin Governance & In-UI Database Backup:**
   - Log in as `superadmin@veritas.ai`.
   - Navigate to `/admin`.
   - View real-time database telemetry and security audit ledger.
   - Switch to the *"Backup & Restore Center"* tab.
   - Click *"Create System Backup"*. Observe instant snapshot archive generation with SHA-256 hash.
   - Click *"Download"* to stream the `.zip` archive.
   - Click *"Restore"*. Note the double-confirmation modal requiring the user to type `"RESTORE"`. Explain the superadmin auto-preservation safeguard that prevents administrator lockout.
