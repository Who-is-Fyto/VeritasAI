import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from main import app
from app.db.mongodb import connect_db, close_db, get_db

@pytest_asyncio.fixture(autouse=True)
async def setup_mongodb():
    await connect_db()
    db = get_db()
    await db["users"].delete_many({})
    await db["api_keys"].delete_many({})
    yield
    await close_db()

@pytest.mark.asyncio
async def test_analyse_text():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Register user to get authorization token
        reg_res = await client.post("/api/v1/auth/register", json={
            "email": "analysetest@student.richfield.ac.za",
            "password": "securepassword123",
            "name": "Analyse Tester"
        })
        assert reg_res.status_code == 201
        token = reg_res.json()["access_token"]

        headers = {"Authorization": f"Bearer {token}"}
        response = await client.post("/api/v1/analyse", json={
            "content": "According to Reuters, global temperatures rose by 1.2 degrees in 2024.",
            "type": "text"
        }, headers=headers)

    assert response.status_code == 200
    data = response.json()
    assert "overall_score" in data
    assert 0 <= data["overall_score"] <= 100
    assert data["status"] == "complete"
    assert len(data["xai_annotations"]) > 0

@pytest.mark.asyncio
async def test_health():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["db_connected"] is True

