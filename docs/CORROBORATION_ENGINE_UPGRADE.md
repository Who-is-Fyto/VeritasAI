# Fact-Checking & External Corroboration Engine Upgrade

One of the central promises of VeritasAI is that it doesn't just guess whether text is true based on tone—it cross-references claims against live news archives, certified fact-checkers, and knowledge registries. This document explains the major overhaul implemented to turn our corroboration service from a prototype into an accurate, production-grade fact-checking engine.

---

## 1. The Core Problems with Naive Fact Checking

During our audit of the initial prototype, we discovered three critical flaws in claim verification:

1. **The "Word Overlap" Disinformation Trap:**
   A debunking article titled *"Fact Check: False claims that Pope Francis was arrested"* shares over 85% of its vocabulary with the fake claim *"Pope Francis was arrested"*. Using naive Jaccard word similarity without stance detection meant VeritasAI would find the debunking article and **falsely mark the fake claim as "Verified" (92% confidence)**!
2. **Naive Query Slicing:**
   The old code took the first 4 words of a claim arbitrarily. For a claim like *"Former President Donald Trump was convicted of 34 felony counts in New York"*, it searched `"former president donald trump"`, completely dropping *"convicted"*, *"felony"*, and *"New York"*.
3. **Mock Data Fallback:**
   When the News API quota was exceeded or rate-limited, the old code alternated between fabricating 92% "verified" Reuters claims and 45% unverified claims, which compromises academic and research integrity.

---

## 2. How the New Engine Works

```mermaid
flowchart TD
    A["Raw Article / Statement Input"] --> B["Claim & Salient Entity Extraction"]
    B --> C["Generate Focused Query & Entity Term"]
    C --> D{"Multi-Source Concurrent Verification"}
    
    D --> E["Google Fact Check Tools API<br/>(Snopes, PolitiFact, Reuters Fact Check)"]
    D --> F["Live News API<br/>(Query + Fallback Entity Search)"]
    D --> G["Google Custom Search (CSE)<br/>(Global Web Indexing)"]
    D --> H["Wikipedia REST & OpenSearch<br/>(Encyclopedic Ground Truth)"]
    
    E --> I{"Stance & Refutation Analysis"}
    F --> I
    G --> I
    H --> I
    
    I -->|"Refutation Markers Detected<br/>('false', 'debunked', 'hoax', etc.)"| J["Verdict: FALSE (85-96% Confidence)<br/>Attaches Debunking Source Link"]
    I -->|"Affirmative Press Coverage Found"| K["Verdict: VERIFIED (72-98% Confidence)<br/>Attaches Corroborating Source Links"]
    I -->|"No Press / Fact Check Records"| L["Verdict: UNVERIFIED (40% Confidence)<br/>Transparent Academic Integrity"]
```

---

## 3. Stance & Refutation Detection (The Crucial Accuracy Fix)

To prevent debunking articles from falsely confirming fake news, we implemented **Stance and Refutation Detection**. Every search result's headline, snippet, and fact-check rating is scanned for explicit refutation markers:

- Refutation keywords: `"fact check"`, `"false"`, `"debunk"`, `"debunked"`, `"hoax"`, `"unfounded"`, `"no evidence"`, `"denies"`, `"fake news"`, `"misleading"`, `"myth"`, `"not true"`, `"incorrect"`, `"fabricated"`, `"bogus"`, `"disproven"`, `"pants on fire"`.

### Decision Matrix:
- **If refutation markers are present:** VeritasAI recognizes the press is refuting the rumor. The claim status is set to `"false"`, the confidence is computed from the refuting outlets (85–96%), and the explanation directly quotes the debunking article:
  > *"Debunked by press and fact-checkers: 'Fact check: False claim that Pope Francis was arrested'. Published reports refute this claim as false, a hoax, or lacking factual basis."*
- **If no refutation markers and high semantic overlap:** VeritasAI recognizes affirmative news coverage. The claim status is set to `"verified"` with direct links to the reporting news agencies.
- **If no matching records exist:** VeritasAI returns an honest `"unverified"` rating. **No mock data is ever fabricated.**

---

## 4. Multi-Source Verification Pipeline

Instead of relying on a single news feed, the engine queries five independent services concurrently using `asyncio.gather`:

1. **Google Fact Check Tools API (`factchecktools.googleapis.com`):**
   Directly accesses ratings submitted by International Fact-Checking Network (IFCN) signatories including Snopes, PolitiFact, Associated Press Fact Check, and Africa Check.
2. **Google News RSS (`news.google.com/rss/search`):**
   Live indexed press coverage across accredited international news wires and regional broadcasters.
3. **DuckDuckGo Organic Search (`html.duckduckgo.com`):**
   Live organic press search with browser headers for historical archives, long-form journalism, and niche regional reporting.
4. **News API (`newsapi.org/v2/everything`):**
   Searches live international news coverage with automatic entity query fallback.
5. **Wikipedia Knowledge Base (`en.wikipedia.org`):**
   Provides fast, reliable encyclopedic ground truth. Uses the Wikipedia Action API with `prop=extracts&exintro=1&explaintext=1` to retrieve full, comprehensive introductory sections rather than single-sentence summaries.

---

## 5. Salient Entity, Numeric Anchor & Topic Noun Query Construction

In historical events and niche news reports, naive entity extractors often miss common-noun subjects (e.g., *"emus"*, *"machine guns"*, *"crops"*). The enhanced `_extract_queries()` algorithm:
1. Strips passive attribution preambles (e.g., *"According to Reuters, ..."*).
2. Extracts numeric and year anchors (e.g., `1932`, `2024`, `$50B`).
3. Extracts primary capitalized proper actors and roles (`_extract_primary_actors`).
4. Extracts substantive topic nouns (e.g., words ending with `'s'`, direct objects, concrete nouns) while filtering out generic reporting fillers (*"government"*, *"deployed"*, *"official"*, *"reported"*).
5. Assembles search queries without restrictive quotation marks that previously limited search recall, producing high-precision keyword bags (e.g. `1932 Australian emus Lewis machine guns`).

---

## 6. Intra-Document Context Propagation & Continuation Claims

When analyzing multi-sentence paragraphs, secondary sentences often use pronouns or anaphoric references without explicitly repeating named entities (e.g., *"The flightless birds proved incredibly resilient, scattering rapidly to outmaneuver the soldiers..."*).

To solve this:
1. **Document-Level Context Extraction:** The engine extracts global context terms (years, primary entities, topic nouns) across the entire text.
2. **Context Enrichment:** When a secondary claim lacks strong actor entities, the query generator supplements the search terms with the document's primary context.
3. **Shared Encyclopedic Cache:** If a lead claim matches an authoritative Wikipedia article (e.g., `Emu War`), the full introductory text is cached and evaluated against the remaining claims in the document. In empirical testing, this allowed continuation sentences to achieve 80%+ stem overlap and verified credibility without redundant outbound API roundtrips.

---

## 7. How to Enable Google APIs on Google Cloud Console

The project's Google API key is configured in `backend/.env`. To enable the Google Fact Check Tools API and Google Custom Search:
1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Select your project (`468496636741`).
3. Navigate to **APIs & Services > Library**.
4. Search for and click **Enable** on:
   - **Fact Check Tools API** (`factchecktools.googleapis.com`)
   - **Custom Search API** (`customsearch.googleapis.com`)
5. If disabled or rate-limited, VeritasAI automatically falls back to News API and Wikipedia without throwing errors.

---

## 8. Semantic Overlap & Predicate Alignment Safeguards

### The "Entity Overlap Contamination" Vulnerability
When querying external registries for public figures (e.g., *"Pope Francis"* or *"Elon Musk"*), broad search queries return numerous past debunked hoaxes (e.g., child trafficking hoaxes, fake quotes). Without strict predicate alignment:
- A benign headline like *"Pope Francis delivered a Sunday sermon on peace in Rome"* would return a Snopes fact check debunking *"Pope Francis was arrested during a blackout"*.
- Because both share the words `"Pope"` and `"Francis"`, a naive overlap check would find a match and mistakenly mark benign news as **FALSE**.

### The Multi-Stage Alignment Safeguard (`_is_claim_relevant`):
1. **Query Restraint:** Google Fact Check is queried exclusively using `concise_query` (entity + action root) and `salient_query` (top 6 salient claim tokens). Bare entity names are never used for fact-checking queries.
2. **Morphological Stemming:** Suffixes (`-ed`, `-ing`, `-es`, `-s`, `-tion`, `-ly`) are stripped to ensure inflectional equivalence (e.g., `arrested` matches `arrest`).
3. **Non-Entity Overlap Requirement:** If word similarity is below 0.50, the candidate match **must** contain content words outside the named entities. Matching only on proper names is immediately rejected.
4. **Calibrated Snippet Overlap Thresholds:** Search engine snippets are concise (15–25 words). While full article bodies have high overlap, concise snippets typically exhibit 15–20% Jaccard stem overlap against longer claims. The system dynamically respects the caller's precision bounds (`min_sim=0.16` for search snippets, `0.18` for headlines), preventing false rejection of authentic Encyclopaedia Britannica and Wikipedia results.

### The "Third-Party Predicate Mismatch" Vulnerability & Subject Anchoring
The inverse vulnerability occurs when an article shares a specific predicate/action with a claim, but is about a completely different person or entity.
- Example: The claim *"The pope has been diagnosed with a rare cancer..."* shares words (`"diagnosed"`, `"rare"`, `"cancer"`) with an article reporting that BBC presenter Maryam Moshiri was diagnosed with polycythaemia vera.
- Without **Subject/Actor Anchoring**, naive token overlap yielded a 44% match, mistakenly verifying the Pope rumor using a BBC presenter's health report.
- **The Solution (`_extract_primary_actors` & Actor Containment):**
  The system extracts primary subjects/actors (`TITLES_AND_ROLES` + capitalized proper nouns). If the candidate article does not contain any of the primary actors specified in the claim (e.g. Maryam Moshiri article never mentions *"Pope"*, *"Francis"*, or *"Vatican"*), the candidate is **immediately rejected**.
  Furthermore, candidate texts can satisfy relevance through explicit actor and key topic noun co-occurrence (e.g., `Australia` + `emu`), ensuring authentic historical reports and breaking news are verified accurately.

---

## 9. Semantic Pillar Binding & Target Landmark Safeguards

### The "Spurious Entity Colocation" Failure Mode
A known vulnerability in automated NLP fact-checking occurs when an absurd or fabricated claim mentions a high-profile entity or kinetic action alongside an institutional landmark—for example:
- *"Aliens are real, a ufo was attacking the white house"*
- *"French military aircraft conducted a bombing raid on the White House yesterday"*

Without tripartite semantic binding:
1. **Bag-of-Words Fallacy:** Search engines return pop-culture articles (e.g., a satire review in *Samoa Observer* mentioning "aliens" and "attack", or a military briefing mentioning "White House" and "bombing").
2. **Actor Pollution:** Verbs such as `"attacking"` can mistakenly match substrings (e.g. `"king"` in `"attacking"`), sending spurious royalty queries to news APIs.
3. **Artificial Floor Inflation:** Early prototypes forced minimum similarity scores of 78–84%, automatically escalating weak incidental matches into verified assertions.

### The Tripartite Semantic Pillar Solution:
1. **Tripartite Pillar Binding (Subject + Action + Target):**
   The engine extracts the subject actor (`Aliens`, `French military`), key action predicate (`attacking`, `bombing`), and target institution or landmark (`White House`, `Pentagon`, `Capitol`, `Kremlin`, `Vatican`).
2. **Mandatory Landmark Containment:**
   If a claim targets a recognized landmark or institution, candidate sources **must** explicitly contain that target landmark. If an article mentions the actor but lacks the target institution, it is immediately discarded.
3. **Strict Subject Actor Enforcement:**
   When a claim asserts an event involving a proper noun actor or role, the candidate report must explicitly include that actor. A report on US military briefings at the White House cannot corroborate an allegation that the French military bombed the White House.
4. **Wikipedia Catalog & Pop-Culture Gating:**
   Wikipedia articles categorised under catalog lists (`List of...`, `Category:...`, `Conspiracy theories regarding...`, `Folklore...`) are barred from corroborating active kinetic breaking events.
5. **Score Floor Removal:**
   Removed artificial similarity floors (`78.0` and `84.0`), ensuring that weak keyword overlap accurately reflects low confidence and falls through to `unverified` or `false`.

---

*BSc IT Dissertation Notes — Michael Mazhambe*
