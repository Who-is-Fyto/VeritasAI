"""
VeritasAI — FastAPI Application Entry Point

Run locally:
    uvicorn main:app --reload --port 8000

The lifespan context manager handles startup/shutdown tasks:
  - MongoDB connection pool
  - AI model pre-loading (slow — done once at startup, not per request)
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db.mongodb import connect_db, close_db, get_db
from app.routers import health, analysis, auth, admin



logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


# ── Lifespan: runs on startup and shutdown ───────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── STARTUP ──────────────────────────────────────────────────────────
    logger.info("VeritasAI v%s starting up…", settings.app_version)
    await connect_db()
    try:
        await admin.ensure_superadmin_seeded(get_db())
    except Exception as e:
        logger.warning("Could not run superadmin bootstrap: %s", e)
    # Model is already instantiated as a module-level singleton in
    # linguistic.py — no additional loading needed here unless you want
    # to pre-warm it with a dummy inference pass.
    yield
    # ── SHUTDOWN ─────────────────────────────────────────────────────────
    await close_db()
    logger.info("VeritasAI shut down cleanly.")


# ── FastAPI app ──────────────────────────────────────────────────────────
app = FastAPI(
    title="VeritasAI API",
    description="Multi-dimensional credibility engine for real-time disinformation detection.",
    version=settings.app_version,
    docs_url="/api/docs",        # Swagger UI at http://localhost:8000/api/docs
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────────────
# In development, allow the Vite dev server.
# In production, tighten this to your deployed frontend domain.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────────────
app.include_router(health.router)
app.include_router(analysis.router)
app.include_router(auth.router)
app.include_router(admin.router)




# ── Root redirect ─────────────────────────────────────────────────────────
@app.get("/", include_in_schema=False)
async def root():
    return {"message": "VeritasAI API is running.", "docs": "/api/docs"}
