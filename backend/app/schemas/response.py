"""
Response schemas — mirror the TypeScript types in src/types/analysis.ts.
Any change here must be reflected in the frontend types file.
"""
from datetime import datetime, timezone
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field


class AnnotationType(str, Enum):
    manipulative = "manipulative"
    verified     = "verified"
    unverified   = "unverified"
    neutral      = "neutral"


class XAIAnnotation(BaseModel):
    """A single phrase-level annotation from the RoBERTa XAI layer."""
    text: str
    type: AnnotationType
    reason: Optional[str] = None
    confidence: Optional[float] = Field(None, ge=0, le=100)


class SourceResult(BaseModel):
    name: str
    url: Optional[str] = None
    credibility: float = Field(..., ge=0, le=100)
    status: str   # "verified" | "questionable" | "unknown"
    matches: int = 0


class CorroboratingSource(BaseModel):
    title: str
    url: str
    publisher: Optional[str] = None
    similarity_score: Optional[float] = None
    snippet: Optional[str] = None


class ClaimResult(BaseModel):
    claim: str
    status: str   # "verified" | "unverified" | "false"
    confidence: float = Field(..., ge=0, le=100)
    sources: int = 0
    explanation: Optional[str] = None
    source_links: List[CorroboratingSource] = []


class LinguisticFlag(BaseModel):
    label: str
    rating: str
    ok: bool


class WeightedScores(BaseModel):
    linguistic_score: float    = Field(..., ge=0, le=100)
    source_score: float        = Field(..., ge=0, le=100)
    corroboration_score: float = Field(..., ge=0, le=100)
    weights: dict[str, float]  = {"linguistic": 0.40, "source": 0.35, "corroboration": 0.25}


class AnalysisResult(BaseModel):
    """Full response returned by POST /api/v1/analyse and GET /api/v1/results/:id"""
    id: str
    status: str = "complete"
    input_type: str
    submitted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    overall_score: float   = Field(..., ge=0, le=100)
    ai_probability: float  = Field(..., ge=0, le=100)
    scores: WeightedScores
    xai_annotations: list[XAIAnnotation] = []
    sources: list[SourceResult] = []
    claims: list[ClaimResult] = []
    linguistic_flags: list[LinguisticFlag] = []
    summary: str = ""
    content: str = ""


class HealthResponse(BaseModel):
    status: str
    version: str
    model_loaded: bool
    db_connected: bool


class AuditCertificateResponse(BaseModel):
    """
    Formal academic and investigative audit certificate issued for an analysis result.
    Conforms to ISO/IEC 23894 AI Risk Assessment and algorithmic transparency standards.
    """
    certificate_id: str
    verification_id: str
    issued_at: datetime
    content_hash: str
    target_summary: str
    input_type: str
    overall_score: float = Field(..., ge=0, le=100)
    verdict_label: str
    confidence_interval: float = 2.5
    scores: WeightedScores
    ai_probability: float = Field(..., ge=0, le=100)
    claims_verified: int
    claims_total: int
    top_sources: list[str] = []
    digital_signature: str
    issuer: str = "VeritasAI Credibility & Forensic Attestation Authority"
    standard: str = "ISO/IEC 23894 AI Risk Management & IEEE 7001 Algorithmic Transparency"
    verification_url: str = ""
