import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from main import app
from app.db.mongodb import connect_db, close_db, get_db

@pytest_asyncio.fixture(autouse=True)
async def setup_mongodb():
    await connect_db()
    # Clear database collections before testing
    db = get_db()
    await db["users"].delete_many({})
    await db["api_keys"].delete_many({})
    yield
    await close_db()

@pytest.mark.asyncio
async def test_user_flow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Register new user
        reg_payload = {
            "email": "test@student.richfield.ac.za",
            "password": "securepassword123",
            "name": "Michael Test"
        }
        response = await client.post("/api/v1/auth/register", json=reg_payload)
        assert response.status_code == 201
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == "test@student.richfield.ac.za"
        token = data["access_token"]

        # 2. Try registering duplicate email
        dup_response = await client.post("/api/v1/auth/register", json=reg_payload)
        assert dup_response.status_code == 400

        # 3. Login
        login_payload = {
            "email": "test@student.richfield.ac.za",
            "password": "securepassword123"
        }
        login_response = await client.post("/api/v1/auth/login", json=login_payload)
        assert login_response.status_code == 200
        login_data = login_response.json()
        assert "access_token" in login_data
        
        # 4. Fetch current user profile (/me) with valid token
        headers = {"Authorization": f"Bearer {token}"}
        me_response = await client.get("/api/v1/auth/me", headers=headers)
        assert me_response.status_code == 200
        me_data = me_response.json()
        assert me_data["name"] == "Michael Test"

        # 5. Fetch current user profile (/me) with invalid token
        bad_headers = {"Authorization": "Bearer badtoken"}
        bad_response = await client.get("/api/v1/auth/me", headers=bad_headers)
        assert bad_response.status_code == 401

        # 6. Generate a developer API key
        key_res = await client.post("/api/v1/auth/keys", json={"name": "Test Script Key"}, headers=headers)
        assert key_res.status_code == 201
        key_data = key_res.json()
        assert "api_key" in key_data
        assert key_data["name"] == "Test Script Key"
        raw_key = key_data["api_key"]
        key_id = key_data["id"]

        # 7. List developer API keys
        list_res = await client.get("/api/v1/auth/keys", headers=headers)
        assert list_res.status_code == 200
        list_data = list_res.json()
        assert len(list_data) == 1
        assert list_data[0]["id"] == key_id

        # 8. Call protected /analyse using API key header
        key_headers = {"X-Veritas-API-Key": raw_key}
        analyse_res = await client.post("/api/v1/analyse", json={
            "content": "According to official reports, interest rates rose by 0.5% today.",
            "type": "text"
        }, headers=key_headers)
        assert analyse_res.status_code == 200
        assert "overall_score" in analyse_res.json()

        # 9. Revoke the API key
        del_res = await client.delete(f"/api/v1/auth/keys/{key_id}", headers=headers)
        assert del_res.status_code == 200

        # 10. Call protected /analyse using revoked API key (should be unauthorized)
        bad_analyse_res = await client.post("/api/v1/analyse", json={
            "content": "According to official reports, interest rates rose by 0.5% today.",
            "type": "text"
        }, headers=key_headers)
        assert bad_analyse_res.status_code == 401

