"""
VeritasAI — FastAPI Application Entry Point

Run locally:
    uvicorn main:app --reload --port 8000

The lifespan context manager handles startup/shutdown tasks:
  - MongoDB connection pool
  - AI model pre-loading (slow — done once at startup, not per request)
"""
import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone

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


async def automated_backup_loop():
    """
    Background worker that runs periodically to trigger automated MongoDB snapshots.
    Guarded against concurrent execution and silent failures.
    """
    logger.info("Automated backup supervisor started.")
    while True:
        try:
            # Poll every 60 minutes
            await asyncio.sleep(3600)
            if not settings.backup_auto_enabled:
                continue

            from app.services.backup import backup_service
            listing = await backup_service.list_backups()
            now = datetime.now(timezone.utc)
            should_run = True
            for b in listing.backups:
                if b.backup_type == "automated":
                    elapsed_hours = (now - b.created_at).total_seconds() / 3600.0
                    if elapsed_hours < settings.backup_auto_interval_hours:
                        should_run = False
                        break

            if should_run:
                db = get_db()
                logger.info("Automated backup interval reached (%dh). Creating snapshot...", settings.backup_auto_interval_hours)
                await backup_service.create_backup(db, backup_type="automated")
        except asyncio.CancelledError:
            logger.info("Automated database backup supervisor shut down.")
            break
        except Exception as e:
            logger.error("Error in automated backup supervisor loop: %s", e)


# ── Lifespan: runs on startup and shutdown ───────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── STARTUP ──────────────────────────────────────────────────────────
    logger.info("VeritasAI v%s starting up…", settings.app_version)
    await connect_db()
    try:
        db = get_db()
        await admin.ensure_superadmin_seeded(db)
        await db["verification_otps"].create_index("expires_at", expireAfterSeconds=0)
        await db["verification_otps"].create_index([("email", 1), ("purpose", 1)])
    except Exception as e:
        logger.warning("Could not run superadmin bootstrap / index setup: %s", e)
    # Model is already instantiated as a module-level singleton in
    # linguistic.py — no additional loading needed here unless you want
    # to pre-warm it with a dummy inference pass.
    backup_task = asyncio.create_task(automated_backup_loop())
    yield
    # ── SHUTDOWN ─────────────────────────────────────────────────────────
    backup_task.cancel()
    try:
        await backup_task
    except asyncio.CancelledError:
        pass
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
