# Source Authority Registry & Anti-Spoofing Engine

The Source Authority service (`backend/app/services/source.py`) evaluates the credibility, institutional independence, and journalistic reputation of the publisher behind submitted URLs and text claims. This document details the expanded source registry and our anti-spoofing mechanisms.

---

## 1. Expanded 100+ Publisher & Domain Registry

The initial prototype only contained ~15 hardcoded sources. We expanded this registry to over 100 media organizations, categorized by journalistic credibility, geographic relevance, and editorial rigor:

| Category | Typical Score | Example Outlets / Domains |
| :--- | :--- | :--- |
| **Primary Wire Services** | **94 – 98%** | Reuters, Associated Press (`apnews.com`), Agence France-Presse (`afp.com`), Bloomberg News, Dow Jones Newswires |
| **Global Quality Press** | **88 – 94%** | BBC News, The New York Times, The Washington Post, The Wall Street Journal, Financial Times, The Guardian, The Economist, NPR, PBS NewsHour, Deutsche Welle, France 24 |
| **South African & African Media** | **85 – 92%** | Daily Maverick (`dailymaverick.co.za`), News24 (`news24.com`), Mail & Guardian (`mg.co.za`), Business Day (`businesslive.co.za`), Sunday Times / TimesLIVE, SABC News, Eyewitness News (`ewn.co.za`), TechCentral, AllAfrica |
| **Certified Fact-Checkers** | **94 – 98%** | Africa Check (`africacheck.org`), Snopes (`snopes.com`), PolitiFact (`politifact.com`), FactCheck.org, Full Fact, Lead Stories |
| **Authoritative Scientific Journals** | **92 – 98%** | Nature Journal (`nature.com`), Science Magazine (`science.org`), MIT Technology Review, Scientific American, Wired, Ars Technica |
| **Questionable / Conspiracy Outlets** | **10 – 35%** | InfoWars, Natural News, The Gateway Pundit, Before It's News, WorldNetDaily (WND), Breitbart News, RT (Russia Today), Sputnik News, Global Research, ZeroHedge |
| **Satirical Publications** | **20%** | The Onion (`theonion.com`), The Babylon Bee (`babylonbee.com`), Waterford Whispers News |

---

## 2. Anti-Spoofing: Preventing Text Attribution Manipulation

### The Threat:
In the prototype, `_score_text()` performed a simple regex search for words like `"reuters"` or `"bbc"`. If an author of fake news simply wrote:
> *"The president insulted Reuters at the press conference today regarding fake alien signals."*

The old system would see the word `"reuters"`, award it a **95.0 credibility score**, and increase the overall trust of the fake article!

### The Solution:
We implemented **Attribution Framing Verification**. The engine checks if the publisher name appears within valid journalistic reporting templates:

1. **Direct Preceding Attribution:**
   `r"\b(according to|reported by|published by|source:\s*|via|cited by)\s+<publisher>\b"`
2. **Subject Reporting Action:**
   `r"\b<publisher>\s+(reported|confirmed|stated|wrote|revealed|warned|announced|investigated)\b"`
3. **Journalistic Agency:**
   `r"\b(correspondent|spokesperson|journalists)\s+for\s+<publisher>\b"`

#### Scoring Logic:
- **Formal Attribution Verified:** The outlet receives its full registry credibility rating (e.g., Reuters = 96.0).
- **Incidental Name-Dropping:** If the name appears casually without reporting framing, the credibility is capped at **65.0 (neutral)** and does not artificially inflate the credibility index.

---

## 3. Dynamic Fallback Probing for Unknown Domains

When a URL is submitted that is not in our known registry, VeritasAI executes a non-intrusive metadata probe:

1. **SSRF Pre-check:** `is_safe_url()` ensures the domain does not resolve to a local or reserved IP address.
2. **HTTPS Accessibility:** Confirms the site has a valid SSL certificate and returns HTTP 200 (+15 points).
3. **Accountability Markers:** Scans page markup for standard journalistic transparency signals:
   - About Us / Organization Page (+5 points)
   - Contact / Masthead (+5 points)
   - Editorial / Corrections Policy (+5 points)
   - Privacy Policy / Terms of Service (+5 points)
4. **Safety Cap:** Unknown domains are capped at **58.0 maximum score**. This ensures unverified blogs or freshly registered sites can never trick the system into granting a "Verified" rating.

---

*BSc IT Dissertation Notes — Michael Mazhambe*
