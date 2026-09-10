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
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.config import settings
from app.db.mongodb import get_db
from app.schemas.auth import (
    UserRegister, UserLogin, UserResponse, TokenResponse,
    APIKeyCreate, APIKeyResponse, APIKeyGeneratedResponse,
    UserProfileUpdate
)
from app.services.affiliation import resolve_user_affiliation


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


def build_user_response(user_doc: dict) -> UserResponse:
    aff = resolve_user_affiliation(user_doc.get("email", ""), user_doc)
    return UserResponse(
        id=user_doc["_id"],
        email=user_doc["email"],
        name=user_doc.get("name", "User"),
        joined_at=user_doc["joined_at"],
        role=user_doc.get("role") or aff["role"],
        institution=user_doc.get("institution") or aff["institution"],
        student_id=user_doc.get("student_id") or aff["student_id"],
        account_type=user_doc.get("account_type") or aff["account_type"],
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
    user_doc = {
        "_id": user_id,
        "email": clean_email,
        "password": hashed_password,
        "name": body.name.strip(),
        "institution": body.institution.strip() if body.institution else aff["institution"],
        "role": body.role.strip() if body.role else aff["role"],
        "student_id": body.student_id.strip() if body.student_id else aff["student_id"],
        "account_type": aff["account_type"],
        "joined_at": joined_time
    }
    await db["users"].insert_one(user_doc)
    logger.info("New user registered: %s (%s)", body.email, user_id)

    # 3. Issue token
    token = create_access_token(user_id)
    user_res = build_user_response(user_doc)
    return TokenResponse(access_token=token, user=user_res)


# ── POST /api/v1/auth/login ──────────────────────────────────────────────
@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Log in to an existing account"
)
async def login(
    body: UserLogin,
    db: AsyncIOMotorDatabase = Depends(get_db)
) -> TokenResponse:
    # 1. Fetch user by email (case-insensitive & trimmed)
    clean_email = body.email.strip()
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

    logger.info("User logged in successfully: %s", body.email)

    # 3. Issue token
    token = create_access_token(user_doc["_id"])
    user_res = build_user_response(user_doc)
    return TokenResponse(access_token=token, user=user_res)


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

    if update_fields:
        await db["users"].update_one({"_id": current_user.id}, {"$set": update_fields})

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

