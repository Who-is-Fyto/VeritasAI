import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from datetime import datetime, timezone
from main import app
from app.db.mongodb import connect_db, close_db, get_db
from app.routers.auth import get_password_hash

@pytest_asyncio.fixture(autouse=True)
async def setup_mongodb():
    await connect_db()
    db = get_db()
    await db["users"].delete_many({})
    await db["verification_otps"].delete_many({})
    # Pre-seed superadmin for bypass testing
    await db["users"].insert_one({
        "_id": "superadmin-root",
        "email": "superadmin@veritas.ai",
        "password": get_password_hash("Admin1234!"),
        "name": "VeritasAI Super Administrator",
        "role": "superadmin",
        "tier": "superadmin",
        "is_superadmin": True,
        "is_admin": True,
        "is_suspended": False,
        "joined_at": datetime.now(timezone.utc)
    })
    yield
    await close_db()


@pytest.mark.asyncio
async def test_full_otp_signup_and_login_lifecycle():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Initiate Signup: Request OTP
        signup_payload = {
            "name": "Jane Doe",
            "email": "jane@university.ac.za",
            "password": "Password123!"
        }
        req_res = await client.post("/api/v1/auth/signup/request-otp", json=signup_payload)
        assert req_res.status_code == 200
        req_data = req_res.json()
        assert req_data["status"] == "success"
        assert req_data["email"] == "jane@university.ac.za"
        dev_otp = req_data.get("dev_otp")
        assert dev_otp is not None
        assert len(dev_otp) == 6

        # Verify user is NOT in the database yet
        db = get_db()
        user_before = await db["users"].find_one({"email": "jane@university.ac.za"})
        assert user_before is None

        # 2. Attempt verify with wrong OTP -> Rejected
        wrong_verify = await client.post("/api/v1/auth/signup/verify-otp", json={
            "email": "jane@university.ac.za",
            "otp": "000000"
        })
        assert wrong_verify.status_code == 400
        assert "Invalid verification code" in wrong_verify.json()["detail"]

        # 3. Verify with correct OTP -> Account Created and Token Issued
        correct_verify = await client.post("/api/v1/auth/signup/verify-otp", json={
            "email": "jane@university.ac.za",
            "otp": dev_otp
        })
        assert correct_verify.status_code == 201
        created_data = correct_verify.json()
        assert "access_token" in created_data
        assert created_data["user"]["email"] == "jane@university.ac.za"

        # Verify user now exists in MongoDB
        user_after = await db["users"].find_one({"email": "jane@university.ac.za"})
        assert user_after is not None

        # 4. Try re-using same OTP -> Should be rejected (already consumed)
        reused_verify = await client.post("/api/v1/auth/signup/verify-otp", json={
            "email": "jane@university.ac.za",
            "otp": dev_otp
        })
        assert reused_verify.status_code == 400

        # 5. Sign-in for standard user: Password verified, OTP dispatched
        login_res = await client.post("/api/v1/auth/login", json={
            "email": "jane@university.ac.za",
            "password": "Password123!"
        })
        assert login_res.status_code == 200
        login_data = login_res.json()
        assert login_data["requires_otp"] is True
        assert login_data["access_token"] is None
        login_otp = login_data.get("dev_otp")
        assert login_otp is not None
        assert len(login_otp) == 6

        # 6. Verify sign-in OTP with wrong PIN -> Rejected
        wrong_login_verify = await client.post("/api/v1/auth/login/verify-otp", json={
            "email": "jane@university.ac.za",
            "otp": "999999"
        })
        assert wrong_login_verify.status_code == 400

        # 7. Verify sign-in OTP with correct PIN -> Session Token issued
        correct_login_verify = await client.post("/api/v1/auth/login/verify-otp", json={
            "email": "jane@university.ac.za",
            "otp": login_otp
        })
        assert correct_login_verify.status_code == 200
        session_data = correct_login_verify.json()
        assert "access_token" in session_data
        assert session_data["user"]["email"] == "jane@university.ac.za"

        # 8. Superadmin Sign-in: Bypasses OTP directly (Break-Glass Root Policy)
        super_res = await client.post("/api/v1/auth/login", json={
            "email": "superadmin@veritas.ai",
            "password": "Admin1234!"
        })
        assert super_res.status_code == 200
        super_data = super_res.json()
        assert super_data["requires_otp"] is False
        assert super_data["access_token"] is not None
        assert super_data["user"]["tier"] == "superadmin"
