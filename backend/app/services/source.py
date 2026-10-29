"""
Source Authority Service
────────────────────────
Scores the credibility and institutional authority of publishers and web domains.
Features:
  1. Comprehensive 100+ Global, Regional (South African / African), and Certified Fact-Checking Domain Registry.
  2. Questionable, Propaganda, and Satire Domain Detection.
  3. Anti-Spoofing Text Attribution Analysis (distinguishes formal journalistic attribution from incidental name-dropping).
  4. Dynamic Fallback Probing for Unindexed Domains.
"""
import logging
import re
from dataclasses import dataclass, field
from urllib.parse import urlparse
import httpx

from app.config import settings
from app.schemas.response import SourceResult

logger = logging.getLogger(__name__)


@dataclass
class SourceAuthorityResult:
    score: float                        # 0–100 composite score
    sources: list[SourceResult] = field(default_factory=list)


# A comprehensive registry of known publishers, domains, and their baseline credibility ratings
KNOWN_SOURCES = {
    # ── Wire Services & Primary International Agencies (94–98) ──
    "reuters.com": {"name": "Reuters", "credibility": 96.0, "status": "verified"},
    "apnews.com": {"name": "Associated Press", "credibility": 96.0, "status": "verified"},
    "ap.org": {"name": "Associated Press", "credibility": 96.0, "status": "verified"},
    "afp.com": {"name": "Agence France-Presse", "credibility": 95.0, "status": "verified"},
    "bloomberg.com": {"name": "Bloomberg News", "credibility": 93.0, "status": "verified"},
    "dowjones.com": {"name": "Dow Jones Newswires", "credibility": 92.0, "status": "verified"},

    # ── Global Quality Broadcasters & Newspapers (88–94) ──
    "bbc.com": {"name": "BBC News", "credibility": 93.0, "status": "verified"},
    "bbc.co.uk": {"name": "BBC News", "credibility": 93.0, "status": "verified"},
    "nytimes.com": {"name": "The New York Times", "credibility": 91.0, "status": "verified"},
    "washingtonpost.com": {"name": "The Washington Post", "credibility": 89.0, "status": "verified"},
    "wsj.com": {"name": "The Wall Street Journal", "credibility": 91.0, "status": "verified"},
    "theguardian.com": {"name": "The Guardian", "credibility": 89.0, "status": "verified"},
    "ft.com": {"name": "Financial Times", "credibility": 92.0, "status": "verified"},
    "economist.com": {"name": "The Economist", "credibility": 92.0, "status": "verified"},
    "npr.org": {"name": "NPR", "credibility": 90.0, "status": "verified"},
    "pbs.org": {"name": "PBS NewsHour", "credibility": 92.0, "status": "verified"},
    "dw.com": {"name": "Deutsche Welle", "credibility": 90.0, "status": "verified"},
    "france24.com": {"name": "France 24", "credibility": 89.0, "status": "verified"},
    "aljazeera.com": {"name": "Al Jazeera English", "credibility": 86.0, "status": "verified"},
    "time.com": {"name": "Time Magazine", "credibility": 87.0, "status": "verified"},
    "thetimes.co.uk": {"name": "The Times (UK)", "credibility": 88.0, "status": "verified"},
    "lemonde.fr": {"name": "Le Monde", "credibility": 90.0, "status": "verified"},
    "spiegel.de": {"name": "Der Spiegel", "credibility": 89.0, "status": "verified"},
    "elpais.com": {"name": "El País", "credibility": 88.0, "status": "verified"},
    "smh.com.au": {"name": "The Sydney Morning Herald", "credibility": 88.0, "status": "verified"},
    "abc.net.au": {"name": "ABC News Australia", "credibility": 90.0, "status": "verified"},
    "cbc.ca": {"name": "CBC News", "credibility": 89.0, "status": "verified"},

    # ── South African & Regional African Media (85–92) ──
    "enca.com": {"name": "eNCA (e.tv News & Current Affairs)", "credibility": 89.0, "status": "verified"},
    "news24.com": {"name": "News24", "credibility": 89.0, "status": "verified"},
    "dailymaverick.co.za": {"name": "Daily Maverick", "credibility": 91.0, "status": "verified"},
    "mg.co.za": {"name": "Mail & Guardian", "credibility": 90.0, "status": "verified"},
    "businesslive.co.za": {"name": "Business Day", "credibility": 89.0, "status": "verified"},
    "timeslive.co.za": {"name": "Sunday Times / TimesLIVE", "credibility": 87.0, "status": "verified"},
    "sowetanlive.co.za": {"name": "SowetanLIVE", "credibility": 85.0, "status": "verified"},
    "sabcnews.com": {"name": "SABC News", "credibility": 87.0, "status": "verified"},
    "ewn.co.za": {"name": "Eyewitness News (EWN)", "credibility": 88.0, "status": "verified"},
    "techcentral.co.za": {"name": "TechCentral", "credibility": 87.0, "status": "verified"},
    "citizen.co.za": {"name": "The Citizen", "credibility": 82.0, "status": "verified"},
    "iol.co.za": {"name": "Independent Online (IOL)", "credibility": 78.0, "status": "verified"},
    "allafrica.com": {"name": "AllAfrica", "credibility": 85.0, "status": "verified"},

    # ── Certified Fact-Checking Networks (95–99) ──
    "snopes.com": {"name": "Snopes", "credibility": 95.0, "status": "verified"},
    "politifact.com": {"name": "PolitiFact", "credibility": 95.0, "status": "verified"},
    "factcheck.org": {"name": "FactCheck.org", "credibility": 96.0, "status": "verified"},
    "fullfact.org": {"name": "Full Fact", "credibility": 95.0, "status": "verified"},
    "africacheck.org": {"name": "Africa Check", "credibility": 96.0, "status": "verified"},
    "leadstories.com": {"name": "Lead Stories", "credibility": 94.0, "status": "verified"},

    # ── Authoritative Scientific & Technology Publications (92–98) ──
    "nature.com": {"name": "Nature Journal", "credibility": 98.0, "status": "verified"},
    "science.org": {"name": "Science Magazine", "credibility": 98.0, "status": "verified"},
    "technologyreview.com": {"name": "MIT Technology Review", "credibility": 94.0, "status": "verified"},
    "scientificamerican.com": {"name": "Scientific American", "credibility": 94.0, "status": "verified"},
    "arstechnica.com": {"name": "Ars Technica", "credibility": 92.0, "status": "verified"},
    "wired.com": {"name": "Wired", "credibility": 90.0, "status": "verified"},

    # ── Policy Think Tanks & Research Institutes (92–96) ──
    "rand.org": {"name": "RAND Corporation", "credibility": 94.0, "status": "verified"},
    "brookings.edu": {"name": "Brookings Institution", "credibility": 94.0, "status": "verified"},
    "pewresearch.org": {"name": "Pew Research Center", "credibility": 95.0, "status": "verified"},
    "csis.org": {"name": "Center for Strategic and International Studies", "credibility": 93.0, "status": "verified"},
    "chathamhouse.org": {"name": "Chatham House", "credibility": 93.0, "status": "verified"},

    # ── Questionable / Conspiracy / Disinformation Domains (10–35) ──
    "infowars.com": {"name": "InfoWars", "credibility": 10.0, "status": "questionable"},
    "naturalnews.com": {"name": "Natural News", "credibility": 12.0, "status": "questionable"},
    "beforeitsnews.com": {"name": "Before It's News", "credibility": 10.0, "status": "questionable"},
    "thegatewaypundit.com": {"name": "The Gateway Pundit", "credibility": 18.0, "status": "questionable"},
    "wnd.com": {"name": "WorldNetDaily (WND)", "credibility": 20.0, "status": "questionable"},
    "breitbart.com": {"name": "Breitbart News", "credibility": 30.0, "status": "questionable"},
    "rt.com": {"name": "RT (Russia Today)", "credibility": 25.0, "status": "questionable"},
    "sputnikglobe.com": {"name": "Sputnik News", "credibility": 25.0, "status": "questionable"},
    "globalresearch.ca": {"name": "Global Research", "credibility": 15.0, "status": "questionable"},
    "zerohedge.com": {"name": "ZeroHedge", "credibility": 35.0, "status": "questionable"},

    # ── Satirical Outlets (20.0) ──
    "theonion.com": {"name": "The Onion", "credibility": 20.0, "status": "questionable"},
    "babylonbee.com": {"name": "The Babylon Bee", "credibility": 20.0, "status": "questionable"},
    "waterfordwhispersnews.com": {"name": "Waterford Whispers", "credibility": 20.0, "status": "questionable"},

    # ── Text keyword aliases for text attribution ──
    "reuters": {"name": "Reuters", "credibility": 96.0, "status": "verified"},
    "associated press": {"name": "Associated Press", "credibility": 96.0, "status": "verified"},
    "ap news": {"name": "Associated Press", "credibility": 96.0, "status": "verified"},
    "agence france-presse": {"name": "Agence France-Presse", "credibility": 95.0, "status": "verified"},
    "afp": {"name": "Agence France-Presse", "credibility": 95.0, "status": "verified"},
    "bloomberg": {"name": "Bloomberg News", "credibility": 93.0, "status": "verified"},
    "bbc news": {"name": "BBC News", "credibility": 93.0, "status": "verified"},
    "bbc": {"name": "BBC News", "credibility": 93.0, "status": "verified"},
    "new york times": {"name": "The New York Times", "credibility": 91.0, "status": "verified"},
    "washington post": {"name": "The Washington Post", "credibility": 89.0, "status": "verified"},
    "wall street journal": {"name": "The Wall Street Journal", "credibility": 91.0, "status": "verified"},
    "the guardian": {"name": "The Guardian", "credibility": 89.0, "status": "verified"},
    "financial times": {"name": "Financial Times", "credibility": 92.0, "status": "verified"},
    "daily maverick": {"name": "Daily Maverick", "credibility": 91.0, "status": "verified"},
    "enca": {"name": "eNCA", "credibility": 89.0, "status": "verified"},
    "news24": {"name": "News24", "credibility": 89.0, "status": "verified"},
    "mail & guardian": {"name": "Mail & Guardian", "credibility": 90.0, "status": "verified"},
    "business day": {"name": "Business Day", "credibility": 89.0, "status": "verified"},
    "africa check": {"name": "Africa Check", "credibility": 96.0, "status": "verified"},
    "snopes": {"name": "Snopes", "credibility": 95.0, "status": "verified"},
    "politifact": {"name": "PolitiFact", "credibility": 95.0, "status": "verified"},
    "rand corporation": {"name": "RAND Corporation", "credibility": 94.0, "status": "verified"},
    "rand": {"name": "RAND Corporation", "credibility": 94.0, "status": "verified"},
    "brookings institution": {"name": "Brookings Institution", "credibility": 94.0, "status": "verified"},
    "brookings": {"name": "Brookings Institution", "credibility": 94.0, "status": "verified"},
    "pew research": {"name": "Pew Research Center", "credibility": 95.0, "status": "verified"},
    "pew research center": {"name": "Pew Research Center", "credibility": 95.0, "status": "verified"},
    "infowars": {"name": "InfoWars", "credibility": 10.0, "status": "questionable"},
    "breitbart": {"name": "Breitbart News", "credibility": 30.0, "status": "questionable"},
    "natural news": {"name": "Natural News", "credibility": 12.0, "status": "questionable"},
    "the onion": {"name": "The Onion", "credibility": 20.0, "status": "questionable"},
    "babylon bee": {"name": "The Babylon Bee", "credibility": 20.0, "status": "questionable"},
}


class SourceAuthorityService:

    def __init__(self) -> None:
        logger.info("Enhanced SourceAuthorityService initialised with %d registered publishers.", len(KNOWN_SOURCES))

    async def analyse(self, content: str, input_type: str) -> SourceAuthorityResult:
        """
        For URL submissions: extract domain and score against registry or live probe.
        For text submissions: scan for verified journalistic attribution with anti-spoofing verification.
        """
        if input_type == "url":
            return await self._score_url(content)
        return await self._score_text(content)

    async def _score_url(self, url: str) -> SourceAuthorityResult:
        try:
            parsed = urlparse(url)
            domain = parsed.netloc.lower()
            if domain.startswith("www."):
                domain = domain[4:]
        except Exception as e:
            logger.error("Failed to parse URL %s: %s", url, e)
            return SourceAuthorityResult(score=50.0, sources=[])

        # 1. Direct registry lookup
        if domain in KNOWN_SOURCES:
            src_info = KNOWN_SOURCES[domain]
            score = src_info["credibility"]
            sources = [
                SourceResult(
                    name=src_info["name"],
                    url=url,
                    credibility=score,
                    status=src_info["status"],
                    matches=1
                )
            ]
            return SourceAuthorityResult(score=score, sources=sources)

        # Check subdomains (e.g., news.bbc.co.uk -> bbc.co.uk)
        parts = domain.split(".")
        if len(parts) > 2:
            parent_domain = ".".join(parts[-2:])
            if parent_domain in KNOWN_SOURCES:
                src_info = KNOWN_SOURCES[parent_domain]
                score = src_info["credibility"]
                sources = [
                    SourceResult(
                        name=src_info["name"],
                        url=url,
                        credibility=score,
                        status=src_info["status"],
                        matches=1
                    )
                ]
                return SourceAuthorityResult(score=score, sources=sources)

        # 2. Dynamic probe for unknown domains
        fallback_score = await self._fallback_score(domain)
        sources = [
            SourceResult(
                name=domain,
                url=url,
                credibility=fallback_score,
                status="verified" if fallback_score >= 60 else "questionable",
                matches=1
            )
        ]
        return SourceAuthorityResult(score=fallback_score, sources=sources)

    async def _score_text(self, text: str) -> SourceAuthorityResult:
        """
        Scan text to find mentions of media organisations.
        Enforces anti-spoofing: checks whether the publisher is formally attributed
        ('According to Reuters', 'reported by BBC') vs. incidental casual mention.
        """
        found_sources: list[SourceResult] = []
        low_text = text.lower()

        # Attribution framing markers
        attribution_contexts = [
            r"\b(according to|reported by|published by|source:\s*|via|cited by)\s+KEY\b",
            r"\bKEY\s+(reported|confirmed|stated|wrote|revealed|warned|announced|investigated|runs|conducted|published|found|studies|released|initiates|leads)\b",
            r"\b(correspondent|spokesperson|journalists)\s+for\s+KEY\b",
            r"\b(research by|study by|initiative by|report by|organization|organisation|think tank)\s+KEY\b",
        ]

        # Scan text for known keyword aliases
        for key, src_info in KNOWN_SOURCES.items():
            if "." in key:
                continue

            key_pattern = rf"\b{re.escape(key)}\b"
            raw_matches = len(re.findall(key_pattern, low_text))
            if raw_matches == 0:
                continue

            # Check if mentioned within explicit attribution context
            attributed_matches = 0
            for tmpl in attribution_contexts:
                ctx_pat = tmpl.replace("KEY", re.escape(key))
                attributed_matches += len(re.findall(ctx_pat, low_text))

            # Anti-spoofing scoring adjustment
            if attributed_matches > 0:
                # Direct formal journalistic attribution
                credibility = src_info["credibility"]
                matches_count = attributed_matches
            else:
                # Casual incidental mention without attribution framing
                credibility = min(src_info["credibility"], 65.0)
                matches_count = 1

            found_sources.append(
                SourceResult(
                    name=src_info["name"],
                    credibility=credibility,
                    status=src_info["status"] if credibility >= 60.0 else "questionable",
                    matches=matches_count
                )
            )

        # If no recognized publishers found, return neutral baseline score
        if not found_sources:
            return SourceAuthorityResult(score=65.0, sources=[])

        # Deduplicate sources by name (e.g. if 'rand' and 'rand corporation' both match)
        deduped: dict[str, SourceResult] = {}
        for s in found_sources:
            if s.name not in deduped:
                deduped[s.name] = s
            else:
                existing = deduped[s.name]
                deduped[s.name] = SourceResult(
                    name=s.name,
                    credibility=max(existing.credibility, s.credibility),
                    status=existing.status if existing.credibility >= s.credibility else s.status,
                    matches=max(existing.matches, s.matches)
                )
        unique_sources = list(deduped.values())

        total_weight = sum(s.matches for s in unique_sources)
        avg_score = sum(s.credibility * s.matches for s in unique_sources) / total_weight
        return SourceAuthorityResult(score=round(avg_score, 1), sources=unique_sources)

    async def _fallback_score(self, domain: str) -> float:
        """Dynamically probe unknown domains for SSL, accessibility, and transparency pages."""
        from app.utils.security import is_safe_url
        url = f"https://{domain}"
        if not is_safe_url(url):
            logger.warning("SSRF block: domain fallback probe for %s was rejected", domain)
            return 30.0

        score = 30.0
        headers = {"User-Agent": "VeritasAI-Credibility-Scanner/1.0"}

        async with httpx.AsyncClient(timeout=5, headers=headers) as client:
            try:
                r = await client.get(url, follow_redirects=True)
                if r.status_code == 200:
                    score += 15.0  # Reachable over HTTPS

                content_lower = r.text.lower()
                # Transparency & accountability signals
                if "about us" in content_lower or "about-us" in content_lower:
                    score += 5.0
                if "contact" in content_lower or "contact us" in content_lower:
                    score += 5.0
                if "editorial" in content_lower or "corrections policy" in content_lower:
                    score += 5.0
                if "privacy policy" in content_lower or "terms of service" in content_lower:
                    score += 5.0
            except Exception as e:
                logger.debug("Failed fallback probe for domain %s: %s", domain, e)

        # Unknown domain cap: max 58.0 to prevent unvetted sources from receiving high trust
        return min(round(score, 1), 58.0)


source_service = SourceAuthorityService()
