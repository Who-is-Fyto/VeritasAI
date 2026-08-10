import pytest
import pytest_asyncio
import asyncio
from httpx import AsyncClient, ASGITransport
from main import app
from app.db.mongodb import connect_db, close_db, get_db

@pytest_asyncio.fixture(autouse=True)
async def setup_mongodb():
    await connect_db()
    db = get_db()
    # Mock analysis report with feedback to trigger training
    await db["results"].delete_many({})
    await db["results"].insert_one({
        "_id": "mock_report_id",
        "content": "This is an official research report about temperature changes in ice sheets.",
        "input_type": "text",
        "overall_score": 85.0,
        "ai_probability": 10.0,
        "scores": {
            "linguistic_score": 80.0,
            "source_score": 90.0,
            "corroboration_score": 85.0,
            "weights": {"linguistic": 0.40, "source": 0.35, "corroboration": 0.25}
        },
        "feedback": {
            "is_accurate": True,
            "corrected_label": "credible",
            "corrected_score": 90.0,
            "submitted_at": "2026-06-29T16:00:00Z"
        }
    })
    yield
    await close_db()

@pytest.mark.asyncio
async def test_training_flow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Fetch training status
        status_res = await client.get("/api/v1/admin/train/status")
        assert status_res.status_code == 200
        data = status_res.json()
        assert data["status"] == "idle"

        # 2. Trigger training loop
        trigger_res = await client.post("/api/v1/admin/train/trigger")
        assert trigger_res.status_code == 202
        assert trigger_res.json()["status"] == "accepted"

        # 3. Wait for training task to finish
        for _ in range(15):
            await asyncio.sleep(0.5)
            status_res = await client.get("/api/v1/admin/train/status")
            data = status_res.json()
            if data["status"] in ["completed", "failed"]:
                break
        
        assert data["status"] == "completed"
        assert data["samples_trained"] >= 1
