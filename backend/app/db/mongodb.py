"""
MongoDB connection using Motor (async driver).

Usage
-----
Import `get_db` in a router and use FastAPI dependency injection:

    from app.db.mongodb import get_db
    from motor.motor_asyncio import AsyncIOMotorDatabase

    @router.get("/example")
    async def example(db: AsyncIOMotorDatabase = Depends(get_db)):
        doc = await db["results"].find_one({"_id": some_id})
"""
import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config import settings

logger = logging.getLogger(__name__)

# Module-level client — created once during app startup (see main.py lifespan)
_client: AsyncIOMotorClient | None = None


async def connect_db() -> None:
    """Open the Motor connection pool. Called in the FastAPI lifespan."""
    global _client
    _client = AsyncIOMotorClient(settings.mongodb_uri)
    # Force a ping to validate the connection before the app starts serving
    await _client.admin.command("ping")
    logger.info("MongoDB connected — %s / %s", settings.mongodb_uri, settings.mongodb_db_name)


async def close_db() -> None:
    """Close the Motor connection pool. Called in the FastAPI lifespan."""
    global _client
    if _client:
        _client.close()
        logger.info("MongoDB connection closed.")


def get_client() -> AsyncIOMotorClient:
    if _client is None:
        raise RuntimeError("MongoDB client is not initialised. Did app startup run?")
    return _client


def get_db() -> AsyncIOMotorDatabase:
    """FastAPI dependency — returns the active database handle."""
    return get_client()[settings.mongodb_db_name]


async def is_connected() -> bool:
    """Health-check helper — returns True if the DB is reachable."""
    try:
        await get_client().admin.command("ping")
        return True
    except Exception:
        return False
