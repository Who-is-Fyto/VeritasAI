"""
Health check router — GET /api/v1/health
Used by Docker health checks, load balancers, and the frontend status indicator.
"""
from fastapi import APIRouter
from app.config import settings
from app.db.mongodb import is_connected
from app.services.linguistic import linguistic_service
from app.schemas.response import HealthResponse

router = APIRouter(prefix="/api/v1", tags=["health"])


@router.get("/health", response_model=HealthResponse, summary="Backend health check")
async def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        version=settings.app_version,
        model_loaded=linguistic_service.model_loaded,
        db_connected=await is_connected(),
    )
