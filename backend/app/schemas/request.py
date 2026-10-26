"""
Request schemas — validated by FastAPI at the API boundary.
Enforces text character minimums for transformer inference and URL structural verification.
"""
from enum import Enum
from urllib.parse import urlparse
import re
from pydantic import BaseModel, Field, model_validator


class InputType(str, Enum):
    text   = "text"
    url    = "url"
    upload = "upload"


MIN_ARTICLE_TEXT_LENGTH = 50
MAX_ARTICLE_TEXT_LENGTH = 50_000


class AnalyseRequest(BaseModel):
    """Body for POST /api/v1/analyse"""
    content: str = Field(
        ...,
        description="Raw text (min 50 chars) OR a valid web URL (depending on `type`).",
    )
    type: InputType = Field(InputType.text, description="How to interpret `content`.")

    @model_validator(mode="after")
    def validate_content_payload(self) -> "AnalyseRequest":
        clean_content = self.content.strip()
        self.content = clean_content

        if not clean_content:
            raise ValueError("Submission content cannot be empty.")

        if self.type == InputType.text:
            if len(clean_content) < MIN_ARTICLE_TEXT_LENGTH:
                raise ValueError(
                    f"Text content too short for multi-dimensional AI inference ({len(clean_content)}/{MIN_ARTICLE_TEXT_LENGTH} chars). "
                    f"Please submit at least {MIN_ARTICLE_TEXT_LENGTH} characters."
                )
            if len(clean_content) > MAX_ARTICLE_TEXT_LENGTH:
                raise ValueError(
                    f"Text content exceeds maximum limit of {MAX_ARTICLE_TEXT_LENGTH:,} characters."
                )

        elif self.type == InputType.url:
            if not clean_content.startswith("http://") and not clean_content.startswith("https://"):
                raise ValueError("URL must include the protocol (e.g. 'https://example.com/article').")

            try:
                parsed = urlparse(clean_content)
            except Exception:
                raise ValueError("Malformed URL syntax.")

            hostname = (parsed.hostname or "").lower()
            if not hostname:
                raise ValueError("URL is missing a valid hostname.")

            if hostname in {"localhost", "127.0.0.1", "::1"} or hostname.endswith(".local") or hostname.endswith(".internal"):
                raise ValueError("Localhost and internal network addresses cannot be analyzed.")

            if "." not in hostname:
                raise ValueError("URL domain must contain a valid top-level domain (e.g. .com, .org).")

            parts = hostname.split(".")
            primary_label = parts[0]
            tld = parts[-1]

            if len(primary_label) < 2:
                raise ValueError(f"Domain name '{primary_label}' is too short.")

            if not re.match(r"^[a-z]{2,24}$", tld):
                raise ValueError(f"Invalid top-level domain '.{tld}'.")

        return self
