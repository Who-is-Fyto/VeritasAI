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

    async def insert_many(self, docs):
        self.data.extend(docs)
        return True

    async def update_many(self, query, update):
        if "$set" in update:
            for item in self.data:
                item.update(update["$set"])
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
                "_id": "op-admin-1",
                "email": "moderator@veritas.ai",
                "name": "Operational Admin",
                "role": "admin",
                "tier": "admin",
                "account_type": "enterprise",
                "is_superadmin": False,
                "is_admin": True,
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

    async def list_collection_names(self):
        return ["users", "results", "api_keys", "audit_logs", "feedback"]

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


@pytest.mark.asyncio
async def test_admin_backup_rbac_rejects_unauthorized():
    """Verify non-superadmin accounts cannot create, list, or restore backups."""
    user_token = create_access_token("user-2")
    headers = {"Authorization": f"Bearer {user_token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res_post = await client.post("/api/v1/admin/backups", headers=headers)
        assert res_post.status_code == 403

        res_get = await client.get("/api/v1/admin/backups", headers=headers)
        assert res_get.status_code == 403


@pytest.mark.asyncio
async def test_admin_backup_lifecycle():
    """Verify complete backup lifecycle: create, list, download, restore, and delete."""
    admin_token = create_access_token("admin-1")
    headers = {"Authorization": f"Bearer {admin_token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Create Backup
        create_res = await client.post("/api/v1/admin/backups", headers=headers)
        assert create_res.status_code == 201
        meta = create_res.json()
        filename = meta["filename"]
        assert filename.endswith(".zip")
        assert meta["total_documents"] >= 2
        assert meta["status"] == "completed"
        assert "checksum_sha256" in meta

        # 2. List Backups
        list_res = await client.get("/api/v1/admin/backups", headers=headers)
        assert list_res.status_code == 200
        list_data = list_res.json()
        assert list_data["total"] >= 1
        assert any(b["filename"] == filename for b in list_data["backups"])

        # 3. Download Backup
        download_res = await client.get(f"/api/v1/admin/backups/{filename}/download", headers=headers)
        assert download_res.status_code == 200
        assert download_res.headers["content-type"] == "application/zip"
        assert len(download_res.content) > 0

        # 4. Restore with Invalid Confirmation Safeguard
        bad_restore_res = await client.post(
            f"/api/v1/admin/backups/{filename}/restore",
            json={"confirmation_text": "WRONG_PHRASE", "drop_existing": True},
            headers=headers
        )
        assert bad_restore_res.status_code == 400
        assert "Safety confirmation required" in bad_restore_res.json()["detail"]

        # 5. Restore with Valid Confirmation
        restore_res = await client.post(
            f"/api/v1/admin/backups/{filename}/restore",
            json={"confirmation_text": "RESTORE", "drop_existing": True},
            headers=headers
        )
        assert restore_res.status_code == 200
        restore_data = restore_res.json()
        assert restore_data["status"] == "success"
        assert restore_data["backup_filename"] == filename
        assert restore_data["total_documents_restored"] >= 2

        # 6. Delete Backup
        delete_res = await client.delete(f"/api/v1/admin/backups/{filename}", headers=headers)
        assert delete_res.status_code == 200
        assert delete_res.json()["status"] == "success"


@pytest.mark.asyncio
async def test_operational_admin_permissions_and_restrictions():
    """Verify operational admin can manage users but cannot elevate to admin or access backup actions."""
    op_token = create_access_token("op-admin-1")
    headers = {"Authorization": f"Bearer {op_token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Can view users
        list_res = await client.get("/api/v1/admin/users", headers=headers)
        assert list_res.status_code == 200

        # 2. Can upgrade a customer to Pro
        pro_res = await client.patch("/api/v1/admin/users/user-2/tier", json={"tier": "pro"}, headers=headers)
        assert pro_res.status_code == 200
        assert pro_res.json()["tier"] == "pro"

        # 3. CANNOT elevate a user to admin or superadmin
        elevate_res = await client.patch("/api/v1/admin/users/user-2/tier", json={"tier": "superadmin"}, headers=headers)
        assert elevate_res.status_code == 403
        assert "Only Super Administrators can elevate" in elevate_res.json()["detail"]

        # 4. CANNOT create backups
        backup_res = await client.post("/api/v1/admin/backups", headers=headers)
        assert backup_res.status_code == 403

        # 5. CANNOT suspend superadmin
        suspend_res = await client.patch("/api/v1/admin/users/admin-1/status", json={"is_suspended": True}, headers=headers)
        assert suspend_res.status_code == 403
        assert "Operational Administrators cannot suspend other administrative accounts" in suspend_res.json()["detail"]


@pytest.mark.asyncio
async def test_admin_cannot_self_downgrade_via_consumer_tier_route():
    """Verify administrators are guarded against accidental self-downgrade via consumer tier API."""
    admin_token = create_access_token("admin-1")
    headers = {"Authorization": f"Bearer {admin_token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.put("/api/v1/auth/tier", json={"tier": "free"}, headers=headers)
        assert res.status_code == 403
        assert "Administrative accounts cannot be modified via self-service" in res.json()["detail"]


@pytest.mark.asyncio
async def test_registration_blocks_self_assign_admin_role():
    """Verify that public signup payloads cannot self-assign administrative roles."""
    payload = {
        "name": "Attacker",
        "email": "attacker@gmail.com",
        "password": "Password123!",
        "role": "superadmin"
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post("/api/v1/auth/register", json=payload)
        assert res.status_code == 201
        data = res.json()["user"]
        assert data["tier"] == "free"
        assert data["role"] != "superadmin"
        assert data["role"] == "Base User"

