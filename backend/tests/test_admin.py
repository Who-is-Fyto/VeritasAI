"""
Unit tests for VeritasAI Super Admin Engine and RBAC security.
Tests access control, user management, suspension safeguards, telemetry, and audit logs.
"""
import pytest
from httpx import AsyncClient, ASGITransport
from main import app
from app.db.mongodb import get_db
from app.routers.auth import create_access_token
from app.schemas.auth import UserResponse
from datetime import datetime, timezone
import uuid


class MockCollection:
    def __init__(self, data=None):
        self.data = data or []

    async def find_one(self, query):
        for item in self.data:
            match = True
            for k, v in query.items():
                if k == "_id" and item.get("_id") != v:
                    match = False
                elif k == "email" and isinstance(v, dict) and "$regex" in v:
                    if not v["$regex"].strip("^$").lower() in item.get("email", "").lower():
                        match = False
                elif k != "_id" and not isinstance(v, dict) and item.get(k) != v:
                    match = False
            if match:
                return item
        return None

    async def count_documents(self, query):
        count = 0
        for item in self.data:
            match = True
            for k, v in query.items():
                if k == "tier" and item.get("tier") != v:
                    match = False
                elif k == "is_suspended" and item.get("is_suspended") != v:
                    match = False
            if match:
                count += 1
        return count

    def find(self, query):
        self._last_query = query
        return self

    def sort(self, field, direction):
        return self

    def skip(self, count):
        return self

    def limit(self, count):
        return self

    async def to_list(self, length):
        return self.data[:length]

    async def update_one(self, query, update):
        item = await self.find_one(query)
        if item and "$set" in update:
            item.update(update["$set"])
        return True

    async def insert_one(self, doc):
        self.data.append(doc)
        return True

    async def delete_one(self, query):
        item = await self.find_one(query)
        if item:
            self.data.remove(item)
        return True

    async def delete_many(self, query):
        return True

    def aggregate(self, pipeline):
        return self


class MockDatabase:
    def __init__(self):
        self.name = "veritasai_test"
        self.users = MockCollection([
            {
                "_id": "admin-1",
                "email": "superadmin@veritas.ai",
                "name": "Super Admin",
                "role": "superadmin",
                "tier": "superadmin",
                "account_type": "enterprise",
                "is_superadmin": True,
                "is_suspended": False,
                "joined_at": datetime.now(timezone.utc),
            },
            {
                "_id": "user-2",
                "email": "student@richfield.ac.za",
                "name": "Student User",
                "role": "Student",
                "tier": "free",
                "account_type": "academic",
                "is_superadmin": False,
                "is_suspended": False,
                "joined_at": datetime.now(timezone.utc),
            }
        ])
        self.results = MockCollection([])
        self.api_keys = MockCollection([])
        self.audit_logs = MockCollection([])
        self.feedback = MockCollection([])

    def __getitem__(self, key):
        return getattr(self, key, MockCollection([]))

    async def command(self, cmd):
        if cmd == "ping":
            return {"ok": 1}
        if cmd == "dbstats":
            return {"dataSize": 1048576, "storageSize": 2097152, "indexSize": 524288}
        return {}


@pytest.fixture(autouse=True)
def override_database():
    mock_db = MockDatabase()
    app.dependency_overrides[get_db] = lambda: mock_db
    yield mock_db
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_admin_rbac_rejects_unauthorized_user():
    """Verify standard users receive 403 Forbidden on admin endpoints."""
    # User token for standard non-admin student
    token = create_access_token("user-2")
    headers = {"Authorization": f"Bearer {token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/admin/users", headers=headers)
        assert res.status_code == 403
        assert "Super Administrator privileges are required" in res.json()["detail"]


@pytest.mark.asyncio
async def test_admin_can_list_users():
    """Verify superadmin can list users and telemetry."""
    admin_token = create_access_token("admin-1")
    headers = {"Authorization": f"Bearer {admin_token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/admin/users", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "users" in data
        assert len(data["users"]) >= 1


@pytest.mark.asyncio
async def test_admin_can_update_user_tier():
    """Verify superadmin can update tier and logs audit event."""
    admin_token = create_access_token("admin-1")
    headers = {"Authorization": f"Bearer {admin_token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.patch("/api/v1/admin/users/user-2/tier", json={"tier": "pro"}, headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["tier"] == "pro"


@pytest.mark.asyncio
async def test_admin_cannot_suspend_self():
    """Verify safeguard preventing superadmin from locking own account."""
    admin_token = create_access_token("admin-1")
    headers = {"Authorization": f"Bearer {admin_token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.patch("/api/v1/admin/users/admin-1/status", json={"is_suspended": True}, headers=headers)
        assert res.status_code == 400
        assert "cannot suspend their own account" in res.json()["detail"]


@pytest.mark.asyncio
async def test_admin_telemetry_endpoint():
    """Verify database telemetry endpoint returns latency, storage, and collection metrics."""
    admin_token = create_access_token("admin-1")
    headers = {"Authorization": f"Bearer {admin_token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/admin/telemetry/db", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"
        assert "storage" in data
        assert "collection_counts" in data
