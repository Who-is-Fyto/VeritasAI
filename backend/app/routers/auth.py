"""
Authentication Router
POST /api/v1/auth/register
POST /api/v1/auth/login
GET  /api/v1/auth/me
"""
import uuid
import re
import jwt
import bcrypt
import logging
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.config import settings
from app.db.mongodb import get_db
from app.schemas.auth import (
    UserRegister, UserLogin, UserResponse, TokenResponse,
    APIKeyCreate, APIKeyResponse, APIKeyGeneratedResponse,
    UserProfileUpdate, TierUpdateRequest, VerifyOtpRequest,
    ResendOtpRequest, OtpResponse, LoginResponse
)
from app.services.affiliation import resolve_user_affiliation
from app.services.email import send_otp_email


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


def build_user_response(user_doc: dict) -> UserResponse:
    aff = resolve_user_affiliation(user_doc.get("email", ""), user_doc)
    role = user_doc.get("role") or aff["role"]
    account_type = user_doc.get("account_type") or aff["account_type"]

    explicit_tier = user_doc.get("tier")
    if explicit_tier:
        tier = explicit_tier.lower()
    elif user_doc.get("is_superadmin") or role.lower() == "superadmin":
        tier = "superadmin"
    elif user_doc.get("is_admin") or role.lower() == "admin":
        tier = "admin"
    elif account_type == "academic":
        tier = "academic"
    elif account_type == "enterprise":
        tier = "pro"
    else:
        tier = "free"

    daily_limit = 5 if tier == "free" else (100 if tier == "academic" else 999999)

    return UserResponse(
        id=user_doc["_id"],
        email=user_doc["email"],
        name=user_doc.get("name", "User"),
        joined_at=user_doc["joined_at"],
        role=role,
        institution=user_doc.get("institution") or aff["institution"],
        student_id=user_doc.get("student_id") or aff["student_id"],
        account_type=account_type,
        tier=tier,
        daily_limit=daily_limit,
        daily_used=user_doc.get("daily_used", 0),
    )


# ── Password hashing and verification helpers ────────────────────────────
def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception as e:
        logger.error("Failed to verify password: %s", e)
        return False


def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


# ── JWT token generation and validation helpers ─────────────────────────
def create_access_token(user_id: str) -> str:
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {
        "sub": user_id,
        "exp": expire,
        "iat": now
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncIOMotorDatabase = Depends(get_db)
) -> UserResponse:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_418_IM_A_TEAPOT if False else status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Access token missing.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing subject.",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except jwt.PyJWTError as e:
        logger.warning("Token decoding failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_doc = await db["users"].find_one({"_id": user_id})
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user_doc.get("is_suspended"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account suspended by system administrator. Please contact oversight.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return build_user_response(user_doc)


async def get_optional_user_or_api_key(
    token: str | None = Depends(oauth2_scheme),
    x_veritas_api_key: str | None = Header(None, alias="X-Veritas-API-Key"),
    db: AsyncIOMotorDatabase = Depends(get_db)
) -> UserResponse | None:
    """
    Validates either a Bearer JWT or an X-Veritas-API-Key header if provided.
    Returns UserResponse if authenticated, or None if neither credential was provided (guest mode).
    Raises HTTPException(401) if invalid or revoked credentials are provided.
    """
    if not token and not x_veritas_api_key:
        return None

    # 1. Bearer token provided
    if token:
        try:
            return await get_current_user(token, db)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Token validation failed: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"},
            )

    # 2. API Key header provided
    if x_veritas_api_key:
        hashed_key = hashlib.sha256(x_veritas_api_key.encode("utf-8")).hexdigest()
        key_doc = await db["api_keys"].find_one({"hashed_key": hashed_key})
        if key_doc:
            user_doc = await db["users"].find_one({"_id": key_doc["user_id"]})
            if user_doc:
                return build_user_response(user_doc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked API key.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return None


async def get_user_or_api_key(
    token: str | None = Depends(oauth2_scheme),
    x_veritas_api_key: str | None = Header(None, alias="X-Veritas-API-Key"),
    db: AsyncIOMotorDatabase = Depends(get_db)
) -> UserResponse:
    """Strict authentication dependency: requires valid Bearer token or API key."""
    user = await get_optional_user_or_api_key(token, x_veritas_api_key, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Provide a valid Bearer token or X-Veritas-API-Key header.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user



# ── POST /api/v1/auth/signup/request-otp ──────────────────────────────────
@router.post(
    "/signup/request-otp",
    response_model=OtpResponse,
    status_code=status.HTTP_200_OK,
    summary="Request a 6-digit verification PIN to initiate account registration"
)
async def signup_request_otp(
    body: UserRegister,
    db: AsyncIOMotorDatabase = Depends(get_db)
) -> OtpResponse:
    clean_email = body.email.strip().lower()
    existing_user = await db["users"].find_one({"email": {"$regex": f"^{re.escape(clean_email)}$", "$options": "i"}})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    otp = f"{secrets.randbelow(900000) + 100000}"
    otp_hash = hashlib.sha256(otp.encode("utf-8")).hexdigest()
    hashed_password = get_password_hash(body.password)
    aff = resolve_user_affiliation(clean_email)

    requested_role = (body.role or "").strip()
    if requested_role.lower() in {"superadmin", "admin", "administrator"}:
        requested_role = aff["role"]

    await db["verification_otps"].delete_many({"email": clean_email, "purpose": "signup"})

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=10)

    await db["verification_otps"].insert_one({
        "email": clean_email,
        "otp_hash": otp_hash,
        "purpose": "signup",
        "payload": {
            "name": body.name.strip(),
            "password_hash": hashed_password,
            "institution": body.institution.strip() if body.institution else aff["institution"],
            "role": requested_role if requested_role else aff["role"],
            "student_id": body.student_id.strip() if body.student_id else aff["student_id"],
            "account_type": aff["account_type"]
        },
        "created_at": now,
        "expires_at": expires_at,
        "attempts": 0
    })

    await send_otp_email(clean_email, otp, purpose="signup")
    dev_otp = otp if (settings.app_env == "development" or not settings.resend_api_key) else None

    return OtpResponse(
        status="success",
        message=f"Verification code sent to {clean_email}.",
        email=clean_email,
        expires_in_seconds=600,
        dev_otp=dev_otp
    )


# ── POST /api/v1/auth/signup/verify-otp ───────────────────────────────────
@router.post(
    "/signup/verify-otp",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Verify 6-digit PIN and finalize account registration"
)
async def signup_verify_otp(
    body: VerifyOtpRequest,
    db: AsyncIOMotorDatabase = Depends(get_db)
) -> TokenResponse:
    clean_email = body.email.strip().lower()
    now = datetime.now(timezone.utc)

    record = await db["verification_otps"].find_one({
        "email": clean_email,
        "purpose": "signup"
    })

    if not record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No pending registration verification found for this email address. Please initiate registration."
        )

    record_expires = record["expires_at"]
    if record_expires.tzinfo is None:
        record_expires = record_expires.replace(tzinfo=timezone.utc)

    if record_expires < now:
        await db["verification_otps"].delete_one({"_id": record["_id"]})
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired. Please request a new verification code."
        )

    if record.get("attempts", 0) >= 5:
        await db["verification_otps"].delete_one({"_id": record["_id"]})
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum verification attempts exceeded. Please request a new verification code."
        )

    candidate_hash = hashlib.sha256(body.otp.strip().encode("utf-8")).hexdigest()
    if candidate_hash != record["otp_hash"]:
        await db["verification_otps"].update_one(
            {"_id": record["_id"]},
            {"$inc": {"attempts": 1}}
        )
        remaining = 4 - record.get("attempts", 0)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid verification code. {max(0, remaining)} attempts remaining."
        )

    p = record["payload"]
    user_id = str(uuid.uuid4())
    user_doc = {
        "_id": user_id,
        "email": clean_email,
        "password": p["password_hash"],
        "name": p["name"],
        "institution": p["institution"],
        "role": p["role"],
        "student_id": p["student_id"],
        "account_type": p["account_type"],
        "tier": "free",
        "is_superadmin": False,
        "is_admin": False,
        "is_verified": True,
        "joined_at": now
    }

    await db["users"].insert_one(user_doc)
    await db["verification_otps"].delete_many({"email": clean_email})
    logger.info("New verified user registered via OTP: %s (%s)", clean_email, user_id)

    token = create_access_token(user_id)
    user_res = build_user_response(user_doc)
    return TokenResponse(access_token=token, user=user_res)


# ── POST /api/v1/auth/register ───────────────────────────────────────────
@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account"
)
async def register(
    body: UserRegister,
    db: AsyncIOMotorDatabase = Depends(get_db)
) -> TokenResponse:
    try:
        # 1. Check if user already exists (case-insensitive & trimmed)
        clean_email = body.email.strip().lower()
        existing_user = await db["users"].find_one({"email": {"$regex": f"^{re.escape(clean_email)}$", "$options": "i"}})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email address already exists."
            )

        # 2. Hash password and save user
        user_id = str(uuid.uuid4())
        hashed_password = get_password_hash(body.password)
        joined_time = datetime.now(timezone.utc)

        aff = resolve_user_affiliation(clean_email)

        # Public self-registration strictly cannot claim administrative roles
        requested_role = (body.role or "").strip()
        if requested_role.lower() in {"superadmin", "admin", "administrator"}:
            requested_role = aff["role"]

        user_doc = {
            "_id": user_id,
            "email": clean_email,
            "password": hashed_password,
            "name": body.name.strip(),
            "institution": body.institution.strip() if body.institution else aff["institution"],
            "role": requested_role if requested_role else aff["role"],
            "student_id": body.student_id.strip() if body.student_id else aff["student_id"],
            "account_type": aff["account_type"],
            "tier": "free",
            "is_superadmin": False,
            "is_admin": False,
            "is_verified": True,
            "joined_at": joined_time
        }
        await db["users"].insert_one(user_doc)
        logger.info("New user registered: %s (%s)", body.email, user_id)

        # 3. Issue token
        token = create_access_token(user_id)
        user_res = build_user_response(user_doc)
        return TokenResponse(access_token=token, user=user_res)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Registration failed with unexpected error: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration error: {str(e)}"
        )


# ── POST /api/v1/auth/login ──────────────────────────────────────────────
@router.post(
    "/login",
    response_model=LoginResponse,
    status_code=status.HTTP_200_OK,
    summary="Log in to an existing account with credentials and 2FA OTP verification"
)
async def login(
    body: UserLogin,
    db: AsyncIOMotorDatabase = Depends(get_db)
) -> LoginResponse:
    try:
        # 1. Fetch user by email (case-insensitive & trimmed)
        clean_email = body.email.strip().lower()
        user_doc = await db["users"].find_one({"email": {"$regex": f"^{re.escape(clean_email)}$", "$options": "i"}})
        if not user_doc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password."
            )

        # 2. Verify hashed password
        if not verify_password(body.password, user_doc["password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password."
            )

        if user_doc.get("is_suspended"):
            reason = user_doc.get("suspension_reason") or "Administrative safety lock."
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Account suspended by system administrator: {reason}"
            )

        # Check for Superadmin direct access bypass (Break-Glass Root Policy)
        is_superadmin = (
            clean_email in {"superadmin@veritas.ai", "admin@veritas.ai"}
            or user_doc.get("is_superadmin")
            or (user_doc.get("role") or "").lower() == "superadmin"
            or (user_doc.get("tier") or "").lower() == "superadmin"
        )

        if is_superadmin:
            logger.info("Superadmin direct sign-in authorized (OTP bypassed): %s", clean_email)
            token = create_access_token(user_doc["_id"])
            user_res = build_user_response(user_doc)
            return LoginResponse(
                access_token=token,
                token_type="bearer",
                user=user_res,
                requires_otp=False,
                email=clean_email,
                message="Super Administrator access authorized."
            )

        # Standard User: Dispatch 6-digit Sign-in PIN
        otp = f"{secrets.randbelow(900000) + 100000}"
        otp_hash = hashlib.sha256(otp.encode("utf-8")).hexdigest()

        await db["verification_otps"].delete_many({"email": clean_email, "purpose": "login"})

        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(minutes=10)

        await db["verification_otps"].insert_one({
            "email": clean_email,
            "user_id": user_doc["_id"],
            "otp_hash": otp_hash,
            "purpose": "login",
            "created_at": now,
            "expires_at": expires_at,
            "attempts": 0
        })

        await send_otp_email(clean_email, otp, purpose="login")
        dev_otp = otp if (settings.app_env == "development" or not settings.resend_api_key) else None

        logger.info("Dispatched sign-in OTP for user: %s", clean_email)

        return LoginResponse(
            access_token=None,
            token_type="bearer",
            user=None,
            requires_otp=True,
            email=clean_email,
            message=f"A 6-digit verification PIN has been dispatched to {clean_email}.",
            dev_otp=dev_otp
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Login failed with unexpected error: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login error: {str(e)}"
        )


# ── POST /api/v1/auth/login/verify-otp ────────────────────────────────────
@router.post(
    "/login/verify-otp",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Verify 6-digit sign-in PIN and issue authentication session JWT"
)
async def login_verify_otp(
    body: VerifyOtpRequest,
    db: AsyncIOMotorDatabase = Depends(get_db)
) -> TokenResponse:
    clean_email = body.email.strip().lower()
    now = datetime.now(timezone.utc)

    record = await db["verification_otps"].find_one({
        "email": clean_email,
        "purpose": "login"
    })

    if not record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No pending sign-in verification found for this account. Please log in again."
        )

    record_expires = record["expires_at"]
    if record_expires.tzinfo is None:
        record_expires = record_expires.replace(tzinfo=timezone.utc)

    if record_expires < now:
        await db["verification_otps"].delete_one({"_id": record["_id"]})
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired. Please sign in again to receive a fresh PIN."
        )

    if record.get("attempts", 0) >= 5:
        await db["verification_otps"].delete_one({"_id": record["_id"]})
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Too many incorrect attempts. Please initiate login again."
        )

    candidate_hash = hashlib.sha256(body.otp.strip().encode("utf-8")).hexdigest()
    if candidate_hash != record["otp_hash"]:
        await db["verification_otps"].update_one(
            {"_id": record["_id"]},
            {"$inc": {"attempts": 1}}
        )
        remaining = 4 - record.get("attempts", 0)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid verification code. {max(0, remaining)} attempts remaining."
        )

    user_doc = await db["users"].find_one({"_id": record["user_id"]})
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account associated with this verification code was not found."
        )

    if user_doc.get("is_suspended"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account suspended by system administrator."
        )

    await db["verification_otps"].delete_many({"email": clean_email})
    logger.info("User completed OTP verification and logged in: %s (%s)", clean_email, user_doc["_id"])

    token = create_access_token(user_doc["_id"])
    user_res = build_user_response(user_doc)
    return TokenResponse(access_token=token, user=user_res)


# ── POST /api/v1/auth/resend-otp ──────────────────────────────────────────
@router.post(
    "/resend-otp",
    response_model=OtpResponse,
    status_code=status.HTTP_200_OK,
    summary="Resend a fresh 6-digit verification PIN"
)
async def resend_otp(
    body: ResendOtpRequest,
    db: AsyncIOMotorDatabase = Depends(get_db)
) -> OtpResponse:
    clean_email = body.email.strip().lower()
    now = datetime.now(timezone.utc)

    record = await db["verification_otps"].find_one({
        "email": clean_email,
        "purpose": body.purpose
    })

    if not record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No active {body.purpose} verification session found for {clean_email}."
        )

    record_created = record["created_at"]
    if record_created.tzinfo is None:
        record_created = record_created.replace(tzinfo=timezone.utc)

    if (now - record_created).total_seconds() < 30:
        wait_time = int(30 - (now - record_created).total_seconds())
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Please wait {wait_time} seconds before requesting another verification code."
        )

    otp = f"{secrets.randbelow(900000) + 100000}"
    otp_hash = hashlib.sha256(otp.encode("utf-8")).hexdigest()

    await db["verification_otps"].update_one(
        {"_id": record["_id"]},
        {
            "$set": {
                "otp_hash": otp_hash,
                "created_at": now,
                "expires_at": now + timedelta(minutes=10),
                "attempts": 0
            }
        }
    )

    await send_otp_email(clean_email, otp, purpose=body.purpose)
    dev_otp = otp if (settings.app_env == "development" or not settings.resend_api_key) else None

    return OtpResponse(
        status="success",
        message=f"Fresh verification code sent to {clean_email}.",
        email=clean_email,
        expires_in_seconds=600,
        dev_otp=dev_otp
    )


# ── GET /api/v1/auth/me ──────────────────────────────────────────────────
@router.get(
    "/me",
    response_model=UserResponse,
    summary="Retrieve current user account profile"
)
async def me(current_user: UserResponse = Depends(get_current_user)) -> UserResponse:
    return current_user


# ── PUT /api/v1/auth/profile ─────────────────────────────────────────────
@router.put(
    "/profile",
    response_model=UserResponse,
    summary="Update current user account profile"
)
async def update_profile(
    body: UserProfileUpdate,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
) -> UserResponse:
    update_fields = {}
    if body.name is not None and body.name.strip():
        update_fields["name"] = body.name.strip()
    if body.institution is not None:
        update_fields["institution"] = body.institution.strip()
    if body.role is not None:
        update_fields["role"] = body.role.strip()
    if body.student_id is not None:
        update_fields["student_id"] = body.student_id.strip()

    if body.tier is not None:
        update_fields["tier"] = body.tier.strip().lower()
    if body.account_type is not None:
        update_fields["account_type"] = body.account_type.strip().lower()

    if update_fields:
        await db["users"].update_one({"_id": current_user.id}, {"$set": update_fields})

    updated_doc = await db["users"].find_one({"_id": current_user.id})
    return build_user_response(updated_doc)


# ── PUT /api/v1/auth/tier ────────────────────────────────────────────────
@router.put(
    "/tier",
    response_model=UserResponse,
    summary="Update current user account commercial tier"
)
async def update_tier(
    body: TierUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
) -> UserResponse:
    current_tier_lower = (current_user.tier or "").lower()
    current_role_lower = (current_user.role or "").lower()
    if current_tier_lower in {"admin", "superadmin"} or current_role_lower in {"admin", "superadmin"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative accounts cannot be modified via self-service commercial subscriptions."
        )

    target_tier = body.tier.lower()
    account_type = "academic" if target_tier == "academic" else "enterprise" if target_tier == "pro" else "base"

    await db["users"].update_one(
        {"_id": current_user.id},
        {"$set": {"tier": target_tier, "account_type": account_type}}
    )

    updated_doc = await db["users"].find_one({"_id": current_user.id})
    return build_user_response(updated_doc)


# ── API Key Management Endpoints ─────────────────────────────────────────
@router.post(
    "/keys",
    response_model=APIKeyGeneratedResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate a new developer API key"
)
async def create_api_key(
    body: APIKeyCreate,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
) -> APIKeyGeneratedResponse:
    raw_key = f"veritas_{uuid.uuid4().hex}"
    key_prefix = raw_key[:12]  # e.g., "veritas_a1b2..."
    hashed_key = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()
    key_id = str(uuid.uuid4())
    created_time = datetime.now(timezone.utc)

    key_doc = {
        "_id": key_id,
        "user_id": current_user.id,
        "name": body.name,
        "key_prefix": key_prefix,
        "hashed_key": hashed_key,
        "created_at": created_time
    }
    await db["api_keys"].insert_one(key_doc)
    logger.info("Generated API Key '%s' for user %s", body.name, current_user.email)

    return APIKeyGeneratedResponse(
        id=key_id,
        name=body.name,
        key_prefix=key_prefix,
        created_at=created_time,
        api_key=raw_key
    )


@router.get(
    "/keys",
    response_model=list[APIKeyResponse],
    summary="List all active API keys"
)
async def list_api_keys(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
) -> list[APIKeyResponse]:
    cursor = db["api_keys"].find({"user_id": current_user.id})
    keys_docs = await cursor.to_list(length=100)
    return [
        APIKeyResponse(
            id=k["_id"],
            name=k["name"],
            key_prefix=k["key_prefix"],
            created_at=k["created_at"]
        ) for k in keys_docs
    ]


@router.delete(
    "/keys/{key_id}",
    summary="Revoke an active API key"
)
async def revoke_api_key(
    key_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    res = await db["api_keys"].delete_one({"_id": key_id, "user_id": current_user.id})
    if res.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API Key not found or access denied."
        )
    logger.info("Revoked API Key id %s for user %s", key_id, current_user.email)
    return {"status": "success", "message": "API key revoked successfully."}

