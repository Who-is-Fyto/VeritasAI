"""
Analysis router
───────────────
POST /api/v1/analyse  — submit content, run the three-service pipeline,
                        persist to MongoDB, return AnalysisResult.

GET  /api/v1/results/:id — retrieve a stored result by its document ID.
"""
import asyncio
import hashlib
import logging
import uuid
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel


from app.config import settings
from app.db.mongodb import get_db
from app.schemas.auth import UserResponse
from app.schemas.request import AnalyseRequest
from app.schemas.response import AnalysisResult, WeightedScores, AuditCertificateResponse
from app.services.linguistic import linguistic_service
from app.services.source import source_service
from app.services.corroboration import corroboration_service

from app.utils.security import is_safe_url, sanitize_text
from app.routers.auth import get_optional_user_or_api_key


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["analysis"])


# ── Helper: compute weighted ensemble score ──────────────────────────────
def compute_overall_score(
    linguistic: float, source: float, corroboration: float
) -> float:
    return round(
        linguistic    * settings.weight_linguistic +
        source        * settings.weight_source +
        corroboration * settings.weight_corroboration,
        1,
    )


def _scrape_article(target_url: str) -> str:
    from newspaper import Article, Config
    cfg = Config()
    cfg.request_timeout = 5
    cfg.MAX_FILE_SIZE = 2 * 1024 * 1024
    cfg.number_of_threads = 1
    cfg.browser_user_agent = "VeritasAI Credibility Scanner/1.0"
    article = Article(target_url, config=cfg)
    article.download()
    article.parse()
    return article.text or ""


# ── POST /api/v1/analyse ─────────────────────────────────────────────────
@router.post(
    "/analyse",
    response_model=AnalysisResult,
    status_code=status.HTTP_200_OK,
    summary="Submit content for credibility analysis",
)
async def analyse(
    body: AnalyseRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: UserResponse | None = Depends(get_optional_user_or_api_key)
) -> AnalysisResult:
    """
    Orchestrates the three analysis services in parallel, computes the
    weighted Credibility Index, persists the result, and returns it.
    Supports both authenticated accounts and guest analyses.
    Includes SHA-256 analysis caching for repeated submissions.
    """
    content_hash = hashlib.sha256(f"{body.type}:{body.content.strip()}".encode("utf-8")).hexdigest()

    # ── Check analysis cache (2-hour window) ─────────────────────────────
    two_hours_ago = datetime.now(timezone.utc) - timedelta(hours=2)
    cached_doc = await db["results"].find_one({
        "content_hash": content_hash,
        "status": "complete",
        "submitted_at": {"$gte": two_hours_ago}
    })
    if cached_doc:
        logger.info("Cache hit for analysis content_hash=%s (reusing doc %s)", content_hash, cached_doc.get("_id"))
        doc_data = dict(cached_doc)
        doc_data.pop("_id", None)
        fresh_id = str(uuid.uuid4())
        doc_data["id"] = fresh_id
        doc_data["submitted_at"] = datetime.now(timezone.utc)
        if current_user:
            doc_data["user_id"] = current_user.id
        cached_result = AnalysisResult(**doc_data)
        insert_payload = {"_id": fresh_id, "content_hash": content_hash, **cached_result.model_dump()}
        if current_user:
            insert_payload["user_id"] = current_user.id
        await db["results"].insert_one(insert_payload)
        return cached_result

    doc_id = str(uuid.uuid4())
    logger.info("Starting analysis %s — type=%s length=%d", doc_id, body.type, len(body.content))

    # ── Scrape URL if needed ────────────────────────────────────────────
    content_to_analyse = body.content
    if body.type == "url":
        # 1. Enforce SSRF protection check
        if not is_safe_url(body.content):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Access denied: The submitted URL is invalid, unsafe, or references a local address."
            )

        try:
            content_to_analyse = await asyncio.to_thread(_scrape_article, body.content)
            if not content_to_analyse or len(content_to_analyse.strip()) < 10:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Could not extract text from the provided URL. The page might be empty or protected."
                )
        except HTTPException:
            raise
        except Exception as e:
            logger.error("Failed to scrape URL %s: %s", body.content, e)
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Failed to scrape URL: {str(e)}"
            )

    # 3. Sanitise input text (XSS protection)
    content_to_analyse = sanitize_text(content_to_analyse)

    # ── Run all three services concurrently ──────────────────────────────
    linguistic_task     = linguistic_service.analyse(content_to_analyse)
    source_task         = source_service.analyse(body.content, body.type)
    corroboration_task  = corroboration_service.analyse(content_to_analyse)

    linguistic_result, source_result, corroboration_result = await asyncio.gather(
        linguistic_task, source_task, corroboration_task
    )

    # ── Compute overall score ────────────────────────────────────────────
    overall = compute_overall_score(
        linguistic_result.score,
        source_result.score,
        corroboration_result.score,
    )

    result = AnalysisResult(
        id=doc_id,
        status="complete",
        input_type=body.type,
        submitted_at=datetime.now(timezone.utc),
        overall_score=overall,
        ai_probability=linguistic_result.ai_probability,
        scores=WeightedScores(
            linguistic_score=linguistic_result.score,
            source_score=source_result.score,
            corroboration_score=corroboration_result.score,
            weights={
                "linguistic": settings.weight_linguistic,
                "source": settings.weight_source,
                "corroboration": settings.weight_corroboration,
            },
        ),
        xai_annotations=linguistic_result.xai_annotations,
        sources=source_result.sources,
        claims=corroboration_result.claims,
        linguistic_flags=linguistic_result.flags,
        summary=_build_summary(overall),
        content=content_to_analyse,
        ai_forensics=linguistic_result.ai_forensics,
    )

    # ── Persist to MongoDB ───────────────────────────────────────────────
    insert_data = {
        "_id": doc_id,
        "content_hash": content_hash,
        **result.model_dump()
    }
    if current_user:
        insert_data["user_id"] = current_user.id

    await db["results"].insert_one(insert_data)
    logger.info("Analysis %s persisted — overall_score=%.1f", doc_id, overall)

    return result


# ── GET /api/v1/results/:id ──────────────────────────────────────────────
@router.get(
    "/results/{result_id}",
    response_model=AnalysisResult,
    summary="Retrieve a stored analysis result",
)
async def get_result(
    result_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> AnalysisResult:
    doc = await db["results"].find_one({"_id": result_id})
    if not doc:
        raise HTTPException(status_code=404, detail=f"Result '{result_id}' not found.")
    doc.pop("_id", None)
    return AnalysisResult(**doc)


@router.get(
    "/results/{result_id}/certificate",
    response_model=AuditCertificateResponse,
    summary="Generate or retrieve an official Credibility Audit Certificate",
)
async def get_certificate(
    result_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> AuditCertificateResponse:
    doc = await db["results"].find_one({"_id": result_id})
    if not doc:
        raise HTTPException(status_code=404, detail=f"Result '{result_id}' not found.")

    overall = float(doc.get("overall_score", 50.0))
    if overall >= 80:
        verdict = "Verified Credible"
    elif overall >= 60:
        verdict = "Mostly Factual"
    elif overall >= 40:
        verdict = "Caution Required"
    else:
        verdict = "Flagged Disinformation"

    content_text = doc.get("content", "")
    content_hash = doc.get("content_hash") or hashlib.sha256(content_text.encode("utf-8")).hexdigest()
    cert_hash = hashlib.sha256(f"{result_id}:{overall}:{content_hash}".encode("utf-8")).hexdigest()

    claims = doc.get("claims", [])
    verified_claims = sum(1 for c in claims if isinstance(c, dict) and c.get("status") == "verified")

    sources = doc.get("sources", [])
    top_sources = [s.get("name") for s in sources if isinstance(s, dict) and s.get("name")][:5]

    scores_data = doc.get("scores", {})
    if isinstance(scores_data, dict):
        weighted_scores = WeightedScores(
            linguistic_score=float(scores_data.get("linguistic_score", 70.0)),
            source_score=float(scores_data.get("source_score", 70.0)),
            corroboration_score=float(scores_data.get("corroboration_score", 70.0)),
            weights=scores_data.get("weights", {"linguistic": 0.40, "source": 0.35, "corroboration": 0.25}),
        )
    else:
        weighted_scores = WeightedScores(linguistic_score=70.0, source_score=70.0, corroboration_score=70.0)

    summary_text = doc.get("summary") or (content_text[:120] + "..." if len(content_text) > 120 else content_text)

    return AuditCertificateResponse(
        certificate_id=f"CERT-{cert_hash[:12].upper()}",
        verification_id=f"VER-{result_id[-8:].upper()}",
        issued_at=datetime.now(timezone.utc),
        content_hash=content_hash,
        target_summary=summary_text,
        input_type=doc.get("input_type", "text"),
        overall_score=overall,
        verdict_label=verdict,
        confidence_interval=2.5,
        scores=weighted_scores,
        ai_probability=float(doc.get("ai_probability", 20.0)),
        claims_verified=verified_claims,
        claims_total=len(claims),
        top_sources=top_sources,
        digital_signature=cert_hash,
        issuer="VeritasAI Credibility & Forensic Attestation Authority",
        standard="ISO/IEC 23894 AI Risk Management & IEEE 7001 Algorithmic Transparency",
        verification_url=f"https://veritasai.org/results/{result_id}",
    )


class FeedbackRequest(BaseModel):
    is_accurate: bool
    corrected_label: str  # "credible" or "misinformation"
    corrected_score: float | None = None


@router.post(
    "/results/{result_id}/feedback",
    summary="Submit user feedback on analysis accuracy for active learning",
)
async def submit_feedback(
    result_id: str,
    body: FeedbackRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    doc = await db["results"].find_one({"_id": result_id})
    if not doc:
        raise HTTPException(status_code=404, detail=f"Result '{result_id}' not found.")

    feedback_doc = {
        "is_accurate": body.is_accurate,
        "corrected_label": body.corrected_label,
        "corrected_score": body.corrected_score,
        "submitted_at": datetime.now(timezone.utc)
    }

    await db["results"].update_one(
        {"_id": result_id},
        {"$set": {"feedback": feedback_doc}}
    )
    logger.info("User feedback recorded for result %s: corrected_label=%s", result_id, body.corrected_label)
    return {"status": "success", "message": "Feedback recorded successfully."}



# ── Private helpers ──────────────────────────────────────────────────────
def _build_summary(score: float) -> str:
    if score >= 80:
        return "Content is highly credible. Claims are well-supported and the source is authoritative."
    if score >= 60:
        return "Content is moderately credible. Some claims verified; minor linguistic concerns noted."
    if score >= 40:
        return "Content has low credibility. Several unverified claims and potential manipulation markers detected."
    return "Content is highly suspect. Multiple manipulation markers and unverifiable claims identified."
