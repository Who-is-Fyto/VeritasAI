"""
Authentication Router
POST /api/v1/auth/register
POST /api/v1/auth/login
GET  /api/v1/auth/me
"""
import uuid
import jwt
import bcrypt
import logging
import hashlib
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.config import settings
from app.db.mongodb import get_db
from app.schemas.auth import (
    UserRegister, UserLogin, UserResponse, TokenResponse,
    APIKeyCreate, APIKeyResponse, APIKeyGeneratedResponse
)



logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


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
    expire = datetime.utcnow() + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {
        "sub": user_id,
        "exp": expire,
        "iat": datetime.utcnow()
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

    return UserResponse(
        id=user_doc["_id"],
        email=user_doc["email"],
        name=user_doc["name"],
        joined_at=user_doc["joined_at"]
    )


async def get_user_or_api_key(
    token: str | None = Depends(oauth2_scheme),
    x_veritas_api_key: str | None = Header(None, alias="X-Veritas-API-Key"),
    db: AsyncIOMotorDatabase = Depends(get_db)
) -> UserResponse:
    # 1. Try token first
    if token:
        try:
            return await get_current_user(token, db)
        except Exception:
            pass

    # 2. Try API key
    if x_veritas_api_key:
        hashed_key = hashlib.sha256(x_veritas_api_key.encode("utf-8")).hexdigest()
        key_doc = await db["api_keys"].find_one({"hashed_key": hashed_key})
        if key_doc:
            user_doc = await db["users"].find_one({"_id": key_doc["user_id"]})
            if user_doc:
                return UserResponse(
                    id=user_doc["_id"],
                    email=user_doc["email"],
                    name=user_doc["name"],
                    joined_at=user_doc["joined_at"]
                )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated. Provide a valid Bearer token or X-Veritas-API-Key header.",
        headers={"WWW-Authenticate": "Bearer"},
    )



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
    # 1. Check if user already exists
    existing_user = await db["users"].find_one({"email": body.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    # 2. Hash password and save user
    user_id = str(uuid.uuid4())
    hashed_password = get_password_hash(body.password)
    joined_time = datetime.utcnow()

    user_doc = {
        "_id": user_id,
        "email": body.email,
        "password": hashed_password,
        "name": body.name,
        "joined_at": joined_time
    }
    await db["users"].insert_one(user_doc)
    logger.info("New user registered: %s (%s)", body.email, user_id)

    # 3. Issue token
    token = create_access_token(user_id)
    user_res = UserResponse(
        id=user_id,
        email=body.email,
        name=body.name,
        joined_at=joined_time
    )
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
    # 1. Fetch user by email
    user_doc = await db["users"].find_one({"email": body.email})
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
    user_res = UserResponse(
        id=user_doc["_id"],
        email=user_doc["email"],
        name=user_doc["name"],
        joined_at=user_doc["joined_at"]
    )
    return TokenResponse(access_token=token, user=user_res)


# ── GET /api/v1/auth/me ──────────────────────────────────────────────────
@router.get(
    "/me",
    response_model=UserResponse,
    summary="Retrieve current user account profile"
)
async def me(current_user: UserResponse = Depends(get_current_user)) -> UserResponse:
    return current_user


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
    created_time = datetime.utcnow()

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

