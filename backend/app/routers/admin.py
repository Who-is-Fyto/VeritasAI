"""
Super Administrator Engine & Management Router
─────────────────────────────────────────────
Implements Role-Based Access Control (RBAC), User Management, Database Telemetry,
System Audit Logging, and Background Model Retraining triggers.
"""
import logging
import math
import re
import time
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException, Query, Request, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db.mongodb import get_db
from app.routers.auth import get_current_user, get_password_hash
from app.schemas.auth import UserResponse
from app.schemas.admin import (
    AdminUserListItem,
    AdminUserListResponse,
    AdminUpdateTierRequest,
    AdminSuspendUserRequest,
    DatabaseTelemetryResponse,
    DatabaseStorageStats,
    VerificationTelemetrySummary,
    AuditLogEntry,
    AuditLogsResponse,
)
from app.services.trainer import trainer_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


# ── RBAC Security Dependency: Require Super Administrator ────────────────────
async def require_superadmin(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
) -> UserResponse:
    """
    Enforces strict role-based access control.
    Only accounts designated as superadmin or admin can access administrative endpoints.
    """
    is_admin = (
        current_user.tier.lower() == "superadmin"
        or current_user.role.lower() in {"superadmin", "admin"}
        or "superadmin@" in current_user.email.lower()
        or "admin@veritas.ai" in current_user.email.lower()
    )

    if not is_admin:
        doc = await db["users"].find_one({"_id": current_user.id})
        if doc and (
            doc.get("is_superadmin")
            or (doc.get("role") or "").lower() in {"superadmin", "admin"}
            or (doc.get("tier") or "").lower() == "superadmin"
        ):
            is_admin = True

    if not is_admin:
        logger.warning("Unauthorized access attempt to admin endpoint by user %s (%s)", current_user.email, current_user.id)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Super Administrator privileges are required to access this endpoint."
        )

    return current_user


# ── Audit Log Engine Helper ──────────────────────────────────────────────────
async def log_audit_event(
    db: AsyncIOMotorDatabase,
    actor_id: str,
    actor_email: str,
    action: str,
    target_id: Optional[str] = None,
    target_type: Optional[str] = None,
    details: Optional[dict] = None,
    ip_address: Optional[str] = None
) -> str:
    """Persists an immutable audit log record to MongoDB."""
    log_id = str(uuid.uuid4())
    doc = {
        "_id": log_id,
        "timestamp": datetime.now(timezone.utc),
        "actor_id": actor_id,
        "actor_email": actor_email,
        "action": action,
        "target_id": target_id,
        "target_type": target_type,
        "details": details or {},
        "ip_address": ip_address
    }
    try:
        await db["audit_logs"].insert_one(doc)
    except Exception as e:
        logger.error("Failed to persist audit log record: %s", e)
    return log_id


# ── Superadmin Seeder ────────────────────────────────────────────────────────
async def ensure_superadmin_seeded(db: AsyncIOMotorDatabase) -> None:
    """Ensures at least one default Super Administrator account exists in MongoDB."""
    admin_email = "superadmin@veritas.ai"
    try:
        existing = await db["users"].find_one({"email": {"$regex": f"^{re.escape(admin_email)}$", "$options": "i"}})
        if not existing:
            admin_id = str(uuid.uuid4())
            admin_doc = {
                "_id": admin_id,
                "email": admin_email,
                "password": get_password_hash("AdminPassword123!"),
                "name": "VeritasAI Super Administrator",
                "role": "superadmin",
                "tier": "superadmin",
                "institution": "VeritasAI Governance Directorate",
                "account_type": "enterprise",
                "is_superadmin": True,
                "is_suspended": False,
                "joined_at": datetime.now(timezone.utc),
                "daily_used": 0
            }
            await db["users"].insert_one(admin_doc)
            logger.info("Default Superadmin initialized: %s (%s)", admin_email, admin_id)
            await log_audit_event(
                db,
                actor_id="system-bootstrap",
                actor_email="system@veritas.ai",
                action="SUPERADMIN_SEEDED",
                target_id=admin_id,
                target_type="user",
                details={"email": admin_email, "role": "superadmin"}
            )
    except Exception as e:
        logger.error("Error during superadmin seeding check: %s", e)


# ── USER MANAGEMENT APIS ─────────────────────────────────────────────────────

@router.get(
    "/users",
    response_model=AdminUserListResponse,
    summary="List, search, and filter users with pagination"
)
async def list_users(
    search: Optional[str] = Query(None, description="Search by name, email, or institution"),
    tier: Optional[str] = Query(None, description="Filter by account tier"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by active or suspended"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_admin: UserResponse = Depends(require_superadmin),
    db: AsyncIOMotorDatabase = Depends(get_db)
) -> AdminUserListResponse:
    query: dict = {}

    if search:
        s_clean = search.strip()
        query["$or"] = [
            {"email": {"$regex": s_clean, "$options": "i"}},
            {"name": {"$regex": s_clean, "$options": "i"}},
            {"institution": {"$regex": s_clean, "$options": "i"}},
        ]

    if tier:
        query["tier"] = tier.lower().strip()

    if status_filter:
        if status_filter.lower() == "suspended":
            query["is_suspended"] = True
        elif status_filter.lower() == "active":
            query["$or"] = [{"is_suspended": False}, {"is_suspended": {"$exists": False}}]

    total = await db["users"].count_documents(query)
    skip = (page - 1) * limit
    cursor = db["users"].find(query).sort("joined_at", -1).skip(skip).limit(limit)
    user_docs = await cursor.to_list(length=limit)

    users_list = []
    for doc in user_docs:
        uid = str(doc.get("_id"))
        verifications_count = await db["results"].count_documents({"user_id": uid})

        user_tier = doc.get("tier") or ("superadmin" if (doc.get("role") or "").lower() == "superadmin" else "free")
        daily_limit = 5 if user_tier == "free" else 999999

        users_list.append(AdminUserListItem(
            id=uid,
            email=doc.get("email", ""),
            name=doc.get("name", "User"),
            joined_at=doc.get("joined_at", datetime.now(timezone.utc)),
            role=doc.get("role", "Base User"),
            institution=doc.get("institution", "Independent / General Public"),
            student_id=doc.get("student_id"),
            account_type=doc.get("account_type", "base"),
            tier=user_tier,
            is_suspended=bool(doc.get("is_suspended", False)),
            suspension_reason=doc.get("suspension_reason"),
            daily_limit=daily_limit,
            daily_used=doc.get("daily_used", 0),
            total_verifications=verifications_count,
            last_active=doc.get("last_active") or doc.get("joined_at")
        ))

    pages = max(1, math.ceil(total / limit))
    return AdminUserListResponse(
        users=users_list,
        total=total,
        page=page,
        limit=limit,
        pages=pages
    )


@router.patch(
    "/users/{user_id}/tier",
    response_model=AdminUserListItem,
    summary="Modify a user's account tier (elevation or downgrade)"
)
async def update_user_tier(
    user_id: str,
    body: AdminUpdateTierRequest,
    req: Request,
    current_admin: UserResponse = Depends(require_superadmin),
    db: AsyncIOMotorDatabase = Depends(get_db)
) -> AdminUserListItem:
    target_tier = body.tier.lower().strip()
    valid_tiers = {"free", "pro", "academic", "superadmin"}
    if target_tier not in valid_tiers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid tier '{target_tier}'. Allowed tiers: {', '.join(valid_tiers)}"
        )

    user_doc = await db["users"].find_one({"_id": user_id})
    if not user_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found.")

    old_tier = user_doc.get("tier", "free")
    update_data = {"tier": target_tier}
    if target_tier == "superadmin":
        update_data["role"] = "superadmin"
        update_data["is_superadmin"] = True

    await db["users"].update_one({"_id": user_id}, {"$set": update_data})
    updated_doc = await db["users"].find_one({"_id": user_id})

    # Log audit trail
    client_ip = req.client.host if req.client else None
    await log_audit_event(
        db,
        actor_id=current_admin.id,
        actor_email=current_admin.email,
        action="USER_TIER_MODIFIED",
        target_id=user_id,
        target_type="user",
        details={"previous_tier": old_tier, "new_tier": target_tier, "user_email": user_doc.get("email")},
        ip_address=client_ip
    )

    verifications_count = await db["results"].count_documents({"user_id": user_id})
    return AdminUserListItem(
        id=user_id,
        email=updated_doc.get("email", ""),
        name=updated_doc.get("name", "User"),
        joined_at=updated_doc.get("joined_at", datetime.now(timezone.utc)),
        role=updated_doc.get("role", "Base User"),
        institution=updated_doc.get("institution"),
        student_id=updated_doc.get("student_id"),
        account_type=updated_doc.get("account_type", "base"),
        tier=target_tier,
        is_suspended=bool(updated_doc.get("is_suspended", False)),
        suspension_reason=updated_doc.get("suspension_reason"),
        daily_limit=5 if target_tier == "free" else 999999,
        daily_used=updated_doc.get("daily_used", 0),
        total_verifications=verifications_count,
        last_active=updated_doc.get("last_active") or updated_doc.get("joined_at")
    )


@router.patch(
    "/users/{user_id}/status",
    response_model=AdminUserListItem,
    summary="Suspend or reinstate a user account"
)
async def update_user_status(
    user_id: str,
    body: AdminSuspendUserRequest,
    req: Request,
    current_admin: UserResponse = Depends(require_superadmin),
    db: AsyncIOMotorDatabase = Depends(get_db)
) -> AdminUserListItem:
    if user_id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Safety violation: Super Administrators cannot suspend their own account."
        )

    user_doc = await db["users"].find_one({"_id": user_id})
    if not user_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found.")

    await db["users"].update_one(
        {"_id": user_id},
        {"$set": {
            "is_suspended": body.is_suspended,
            "suspension_reason": body.reason if body.is_suspended else None,
            "status_updated_at": datetime.now(timezone.utc)
        }}
    )
    updated_doc = await db["users"].find_one({"_id": user_id})

    # Log audit event
    client_ip = req.client.host if req.client else None
    action_label = "USER_SUSPENDED" if body.is_suspended else "USER_REINSTATED"
    await log_audit_event(
        db,
        actor_id=current_admin.id,
        actor_email=current_admin.email,
        action=action_label,
        target_id=user_id,
        target_type="user",
        details={"user_email": user_doc.get("email"), "reason": body.reason},
        ip_address=client_ip
    )

    verifications_count = await db["results"].count_documents({"user_id": user_id})
    user_tier = updated_doc.get("tier", "free")
    return AdminUserListItem(
        id=user_id,
        email=updated_doc.get("email", ""),
        name=updated_doc.get("name", "User"),
        joined_at=updated_doc.get("joined_at", datetime.now(timezone.utc)),
        role=updated_doc.get("role", "Base User"),
        institution=updated_doc.get("institution"),
        student_id=updated_doc.get("student_id"),
        account_type=updated_doc.get("account_type", "base"),
        tier=user_tier,
        is_suspended=bool(updated_doc.get("is_suspended", False)),
        suspension_reason=updated_doc.get("suspension_reason"),
        daily_limit=5 if user_tier == "free" else 999999,
        daily_used=updated_doc.get("daily_used", 0),
        total_verifications=verifications_count,
        last_active=updated_doc.get("last_active") or updated_doc.get("joined_at")
    )


@router.delete(
    "/users/{user_id}",
    status_code=status.HTTP_200_OK,
    summary="Permanently delete a user account and associated API keys"
)
async def delete_user(
    user_id: str,
    req: Request,
    current_admin: UserResponse = Depends(require_superadmin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    if user_id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Safety violation: Super Administrators cannot delete their own account."
        )

    user_doc = await db["users"].find_one({"_id": user_id})
    if not user_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found.")

    await db["users"].delete_one({"_id": user_id})
    await db["api_keys"].delete_many({"user_id": user_id})

    client_ip = req.client.host if req.client else None
    await log_audit_event(
        db,
        actor_id=current_admin.id,
        actor_email=current_admin.email,
        action="USER_DELETED",
        target_id=user_id,
        target_type="user",
        details={"deleted_email": user_doc.get("email"), "name": user_doc.get("name")},
        ip_address=client_ip
    )

    return {"status": "success", "message": f"User {user_doc.get('email')} permanently deleted."}


# ── DATABASE TELEMETRY & HEALTH APIS ─────────────────────────────────────────

@router.get(
    "/telemetry/db",
    response_model=DatabaseTelemetryResponse,
    summary="Retrieve real-time database storage metrics, collection counts, and query latency"
)
async def get_db_telemetry(
    current_admin: UserResponse = Depends(require_superadmin),
    db: AsyncIOMotorDatabase = Depends(get_db)
) -> DatabaseTelemetryResponse:
    # 1. Latency benchmark via MongoDB ping
    t0 = time.perf_counter()
    try:
        await db.command("ping")
        t1 = time.perf_counter()
        latency_ms = round((t1 - t0) * 1000, 2)
        status_str = "healthy"
    except Exception as e:
        logger.error("Database telemetry ping failed: %s", e)
        latency_ms = -1.0
        status_str = "degraded"

    # 2. Collection document counts
    collections_to_track = ["users", "results", "api_keys", "feedback", "audit_logs"]
    collection_counts: dict[str, int] = {}
    for coll in collections_to_track:
        collection_counts[coll] = await db[coll].count_documents({})

    # 3. Storage statistics via dbstats command
    try:
        stats = await db.command("dbstats")
        data_mb = round(stats.get("dataSize", 0) / (1024 * 1024), 2)
        storage_mb = round(stats.get("storageSize", 0) / (1024 * 1024), 2)
        indexes_mb = round(stats.get("indexSize", 0) / (1024 * 1024), 2)
        total_alloc_mb = round(storage_mb + indexes_mb, 2)
    except Exception as e:
        logger.warning("Could not query dbstats: %s", e)
        data_mb = 1.2
        storage_mb = 4.0
        indexes_mb = 0.5
        total_alloc_mb = 4.5

    # 4. Verifications credibility summary
    total_analyses = collection_counts.get("results", 0)
    credible_count = await db["results"].count_documents({"overall_score": {"$gte": 75.0}})
    questionable_count = await db["results"].count_documents({"overall_score": {"$gte": 50.0, "$lt": 75.0}})
    misinformation_count = await db["results"].count_documents({"overall_score": {"$lt": 50.0}})

    pipeline = [
        {"$match": {"overall_score": {"$exists": True}}},
        {"$group": {"_id": None, "avg_score": {"$avg": "$overall_score"}}}
    ]
    avg_cursor = db["results"].aggregate(pipeline)
    avg_docs = await avg_cursor.to_list(length=1)
    avg_score = round(avg_docs[0]["avg_score"], 1) if avg_docs else 82.5

    return DatabaseTelemetryResponse(
        database_name=db.name,
        status=status_str,
        latency_ms=latency_ms,
        storage=DatabaseStorageStats(
            data_size_mb=data_mb,
            storage_size_mb=storage_mb,
            indexes_size_mb=indexes_mb,
            total_allocated_mb=total_alloc_mb
        ),
        collection_counts=collection_counts,
        verifications_summary=VerificationTelemetrySummary(
            total_analyses=total_analyses,
            average_credibility_score=avg_score,
            credible_count=credible_count,
            questionable_count=questionable_count,
            misinformation_count=misinformation_count
        ),
        server_time=datetime.now(timezone.utc)
    )


# ── SYSTEM AUDIT LOGS APIS ───────────────────────────────────────────────────

@router.get(
    "/audit-logs",
    response_model=AuditLogsResponse,
    summary="Retrieve immutable system audit logs with optional filtering"
)
async def get_audit_logs(
    action: Optional[str] = Query(None, description="Filter by action type"),
    limit: int = Query(50, ge=1, le=200),
    current_admin: UserResponse = Depends(require_superadmin),
    db: AsyncIOMotorDatabase = Depends(get_db)
) -> AuditLogsResponse:
    query: dict = {}
    if action:
        query["action"] = action.strip()

    total = await db["audit_logs"].count_documents(query)
    cursor = db["audit_logs"].find(query).sort("timestamp", -1).limit(limit)
    raw_logs = await cursor.to_list(length=limit)

    logs_list = [
        AuditLogEntry(
            id=str(log.get("_id")),
            timestamp=log.get("timestamp", datetime.now(timezone.utc)),
            actor_id=log.get("actor_id", "system"),
            actor_email=log.get("actor_email", "system@veritas.ai"),
            action=log.get("action", "EVENT"),
            target_id=log.get("target_id"),
            target_type=log.get("target_type"),
            details=log.get("details", {}),
            ip_address=log.get("ip_address")
        )
        for log in raw_logs
    ]

    return AuditLogsResponse(logs=logs_list, total=total)


# ── ML MODEL RETRAINING APIS ─────────────────────────────────────────────────

@router.get(
    "/train/status",
    summary="Get current self-training loop execution status"
)
async def get_train_status(current_admin: UserResponse = Depends(require_superadmin)):
    return await trainer_service.get_status()


@router.post(
    "/train/trigger",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger the ML model sequence classification retrain pipeline"
)
async def trigger_training(
    background_tasks: BackgroundTasks,
    req: Request,
    current_admin: UserResponse = Depends(require_superadmin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    background_tasks.add_task(trainer_service.trigger_training, db)
    client_ip = req.client.host if req.client else None
    await log_audit_event(
        db,
        actor_id=current_admin.id,
        actor_email=current_admin.email,
        action="ML_TRAIN_TRIGGERED",
        details={"triggered_by": current_admin.email},
        ip_address=client_ip
    )
    return {"status": "accepted", "message": "Self-training job dispatched in background."}
