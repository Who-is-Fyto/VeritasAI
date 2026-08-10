"""
Request schemas — validated by FastAPI at the API boundary.
"""
from enum import Enum
from pydantic import BaseModel, Field, field_validator


class InputType(str, Enum):
    text   = "text"
    url    = "url"
    upload = "upload"


class AnalyseRequest(BaseModel):
    """Body for POST /api/v1/analyse"""
    content: str = Field(
        ...,
        min_length=10,
        max_length=50_000,
        description="Raw text OR a URL (depending on `type`).",
    )
    type: InputType = Field(InputType.text, description="How to interpret `content`.")

    @field_validator("content")
    @classmethod
    def strip_content(cls, v: str) -> str:
        return v.strip()
