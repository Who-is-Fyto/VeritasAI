"""
Source Authority Service
────────────────────────
Scores the credibility of the publisher/domain associated with the
submitted content and returns a list of SourceResult objects.
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


# A comprehensive dict of known publishers, domains, and their ratings
KNOWN_SOURCES = {
    "reuters.com": {"name": "Reuters", "credibility": 95.0, "status": "verified"},
    "apnews.com": {"name": "Associated Press", "credibility": 95.0, "status": "verified"},
    "ap.org": {"name": "Associated Press", "credibility": 95.0, "status": "verified"},
    "bbc.com": {"name": "BBC News", "credibility": 92.0, "status": "verified"},
    "bbc.co.uk": {"name": "BBC News", "credibility": 92.0, "status": "verified"},
    "nytimes.com": {"name": "The New York Times", "credibility": 90.0, "status": "verified"},
    "washingtonpost.com": {"name": "The Washington Post", "credibility": 88.0, "status": "verified"},
    "wsj.com": {"name": "The Wall Street Journal", "credibility": 90.0, "status": "verified"},
    "theguardian.com": {"name": "The Guardian", "credibility": 88.0, "status": "verified"},
    "npr.org": {"name": "NPR", "credibility": 90.0, "status": "verified"},
    "bloomberg.com": {"name": "Bloomberg News", "credibility": 92.0, "status": "verified"},
    "reuters": {"name": "Reuters", "credibility": 95.0, "status": "verified"},
    "associated press": {"name": "Associated Press", "credibility": 95.0, "status": "verified"},
    "bbc news": {"name": "BBC News", "credibility": 92.0, "status": "verified"},
    "new york times": {"name": "The New York Times", "credibility": 90.0, "status": "verified"},
    "washington post": {"name": "The Washington Post", "credibility": 88.0, "status": "verified"},
    "wall street journal": {"name": "The Wall Street Journal", "credibility": 90.0, "status": "verified"},
    "the guardian": {"name": "The Guardian", "credibility": 88.0, "status": "verified"},
    
    # Questionable / Low Credibility / Satire
    "breitbart.com": {"name": "Breitbart News", "credibility": 30.0, "status": "questionable"},
    "breitbart": {"name": "Breitbart News", "credibility": 30.0, "status": "questionable"},
    "infowars.com": {"name": "InfoWars", "credibility": 10.0, "status": "questionable"},
    "infowars": {"name": "InfoWars", "credibility": 10.0, "status": "questionable"},
    "naturalnews.com": {"name": "Natural News", "credibility": 15.0, "status": "questionable"},
    "natural news": {"name": "Natural News", "credibility": 15.0, "status": "questionable"},
    "theonion.com": {"name": "The Onion", "credibility": 20.0, "status": "questionable"},
    "the onion": {"name": "The Onion", "credibility": 20.0, "status": "questionable"},
}


class SourceAuthorityService:

    def __init__(self) -> None:
        logger.info("SourceAuthorityService initialised.")

    async def analyse(self, content: str, input_type: str) -> SourceAuthorityResult:
        """
        For URL submissions: extract domain and score it.
        For text submissions: attempt to extract publication names from the text.
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

        # 1. Check known domains
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

        # 2. Dynamic check for unknown domains
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
        """Scan text to find mentions of known media organisations."""
        found_sources = []
        
        # Check mentions of known sources
        for key, src_info in KNOWN_SOURCES.items():
            # Only match text keywords, avoid matching full domain names unless present
            if ".com" in key or ".org" in key or ".net" in key or ".co.uk" in key:
                continue
            
            # Case-insensitive word boundary check
            pattern = rf"\b{re.escape(key)}\b"
            matches = len(re.findall(pattern, text, re.IGNORECASE))
            if matches > 0:
                found_sources.append(
                    SourceResult(
                        name=src_info["name"],
                        credibility=src_info["credibility"],
                        status=src_info["status"],
                        matches=matches
                    )
                )

        # If no sources mentioned, return default moderate score (e.g. 70) and empty list
        if not found_sources:
            return SourceAuthorityResult(score=70.0, sources=[])

        # Weighted average score based on credibility and number of mentions
        total_matches = sum(s.matches for s in found_sources)
        avg_score = sum(s.credibility * s.matches for s in found_sources) / total_matches
        return SourceAuthorityResult(score=round(avg_score, 1), sources=found_sources)

    async def _fallback_score(self, domain: str) -> float:
        """For domains not in KNOWN_SOURCES, dynamically probe their accessibility."""
        from app.utils.security import is_safe_url
        url = f"https://{domain}"
        if not is_safe_url(url):
            logger.warning("SSRF block: domain fallback probe for %s was rejected", domain)
            return 30.0  # Safe default fallback score

        score = 30.0  # Start low for completely unknown domains
        
        # Probe site using httpx
        async with httpx.AsyncClient(timeout=5) as client:
            try:
                r = await client.get(url, follow_redirects=True)
                if r.status_code == 200:
                    score += 15.0  # SSL active and responsive
                
                content_lower = r.text.lower()
                # Check for standard transparency signals: "about", "contact", "editorial policy"
                if "about" in content_lower or "about-us" in content_lower:
                    score += 10.0
                if "contact" in content_lower or "contact-us" in content_lower:
                    score += 10.0
                if "editorial" in content_lower or "terms of service" in content_lower:
                    score += 5.0
            except Exception as e:
                logger.debug("Failed fallback probe for domain %s: %s", domain, e)
                
        return min(score, 60.0)  # Cap unknown domains at 60.0 to prevent false high trust



source_service = SourceAuthorityService()
