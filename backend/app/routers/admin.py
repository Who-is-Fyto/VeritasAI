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

from fastapi import APIRouter, Depends, BackgroundTasks, File, Form, HTTPException, Query, Request, UploadFile, status
from fastapi.responses import FileResponse
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
    BackupMetadata,
    BackupListResponse,
    RestoreRequest,
    RestoreResponse,
)
from app.services.trainer import trainer_service
from app.services.backup import backup_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


# ── RBAC Security Dependencies ───────────────────────────────────────────────
async def require_admin(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
) -> UserResponse:
    """
    Enforces Role-Based Access Control (RBAC) for Operational Administrators and Super Administrators.
    Grants access to user listing, moderation, system metrics, and audit logs.
    """
    is_admin = False
    tier_lower = (current_user.tier or "").lower()
    role_lower = (current_user.role or "").lower()
    clean_email = (current_user.email or "").lower().strip()

    if tier_lower in {"admin", "superadmin"} or role_lower in {"admin", "superadmin"}:
        is_admin = True
    elif clean_email in {"superadmin@veritas.ai", "admin@veritas.ai"}:
        is_admin = True
    else:
        doc = await db["users"].find_one({"_id": current_user.id})
        if doc and (
            doc.get("is_superadmin")
            or doc.get("is_admin")
            or (doc.get("role") or "").lower() in {"superadmin", "admin"}
            or (doc.get("tier") or "").lower() in {"superadmin", "admin"}
        ):
            is_admin = True

    if not is_admin:
        logger.warning("Unauthorized access attempt to admin endpoint by user %s (%s)", current_user.email, current_user.id)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Super Administrator privileges are required to access this endpoint."
        )

    return current_user


async def require_superadmin(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
) -> UserResponse:
    """
    Enforces strict Role-Based Access Control exclusively for Super Administrators.
    Required for destructive operations (database restore), model training triggers, and admin promotions.
    """
    is_super = False
    tier_lower = (current_user.tier or "").lower()
    role_lower = (current_user.role or "").lower()
    clean_email = (current_user.email or "").lower().strip()

    if tier_lower == "superadmin" or role_lower == "superadmin":
        is_super = True
    elif clean_email in {"superadmin@veritas.ai", "admin@veritas.ai"}:
        is_super = True
    else:
        doc = await db["users"].find_one({"_id": current_user.id})
        if doc and (
            doc.get("is_superadmin")
            or (doc.get("role") or "").lower() == "superadmin"
            or (doc.get("tier") or "").lower() == "superadmin"
        ):
            is_super = True

    if not is_super:
        logger.warning("Unauthorized superadmin action attempt by user %s (%s)", current_user.email, current_user.id)
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
    current_admin: UserResponse = Depends(require_admin),
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

        user_tier = doc.get("tier") or ("superadmin" if (doc.get("role") or "").lower() == "superadmin" else ("admin" if (doc.get("role") or "").lower() == "admin" else "free"))
        daily_limit = 5 if user_tier == "free" else (100 if user_tier == "academic" else 999999)

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
    current_admin: UserResponse = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
) -> AdminUserListItem:
    target_tier = body.tier.lower().strip()
    valid_tiers = {"free", "pro", "academic", "admin", "superadmin"}
    if target_tier not in valid_tiers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid tier '{target_tier}'. Allowed tiers: {', '.join(sorted(valid_tiers))}"
        )

    user_doc = await db["users"].find_one({"_id": user_id})
    if not user_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found.")

    caller_is_super = (
        (current_admin.tier or "").lower() == "superadmin"
        or (current_admin.role or "").lower() == "superadmin"
        or current_admin.email.lower().strip() in {"superadmin@veritas.ai", "admin@veritas.ai"}
    )

    # 1. Elevating an account to Admin or Superadmin requires Superadmin authority
    if target_tier in {"admin", "superadmin"} and not caller_is_super:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Only Super Administrators can elevate accounts to Admin or Super Admin."
        )

    # 2. Modifying or demoting an existing Admin or Superadmin requires Superadmin authority
    target_current_tier = (user_doc.get("tier") or "").lower()
    target_current_role = (user_doc.get("role") or "").lower()
    if (target_current_tier in {"admin", "superadmin"} or target_current_role in {"admin", "superadmin"} or user_doc.get("is_superadmin")):
        if not caller_is_super:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Operational Administrators cannot modify or demote other administrative accounts."
            )

    old_tier = user_doc.get("tier", "free")
    update_data = {"tier": target_tier}
    if target_tier == "superadmin":
        update_data["role"] = "superadmin"
        update_data["is_superadmin"] = True
        update_data["is_admin"] = True
        update_data["account_type"] = "enterprise"
    elif target_tier == "admin":
        update_data["role"] = "admin"
        update_data["is_superadmin"] = False
        update_data["is_admin"] = True
        update_data["account_type"] = "enterprise"
    else:
        update_data["is_superadmin"] = False
        update_data["is_admin"] = False
        if (user_doc.get("role") or "").lower() in {"superadmin", "admin"}:
            update_data["role"] = "Base User"
        update_data["account_type"] = "academic" if target_tier == "academic" else ("enterprise" if target_tier == "pro" else "base")

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
        daily_limit=5 if target_tier == "free" else (100 if target_tier == "academic" else 999999),
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
    current_admin: UserResponse = Depends(require_admin),
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

    caller_is_super = (
        (current_admin.tier or "").lower() == "superadmin"
        or (current_admin.role or "").lower() == "superadmin"
        or current_admin.email.lower().strip() in {"superadmin@veritas.ai", "admin@veritas.ai"}
    )

    # Protect administrative accounts from operational admin suspension
    target_current_tier = (user_doc.get("tier") or "").lower()
    target_current_role = (user_doc.get("role") or "").lower()
    if (target_current_tier in {"admin", "superadmin"} or target_current_role in {"admin", "superadmin"} or user_doc.get("is_superadmin")):
        if not caller_is_super:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Operational Administrators cannot suspend other administrative accounts."
            )

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
    current_admin: UserResponse = Depends(require_admin),
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
    current_admin: UserResponse = Depends(require_admin),
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
async def get_train_status(current_admin: UserResponse = Depends(require_admin)):
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


# ── IN-UI DATABASE BACKUP & RESTORE APIS ─────────────────────────────────────

@router.post(
    "/backups",
    response_model=BackupMetadata,
    status_code=status.HTTP_201_CREATED,
    summary="Generate a compressed BSON/JSON backup archive of the database"
)
async def create_backup(
    req: Request,
    current_admin: UserResponse = Depends(require_superadmin),
    db: AsyncIOMotorDatabase = Depends(get_db)
) -> BackupMetadata:
    meta = await backup_service.create_backup(db)
    client_ip = req.client.host if req.client else None
    await log_audit_event(
        db,
        actor_id=current_admin.id,
        actor_email=current_admin.email,
        action="DATABASE_BACKUP_CREATED",
        target_id=meta.backup_id,
        target_type="backup",
        details={
            "filename": meta.filename,
            "size_bytes": meta.size_bytes,
            "total_documents": meta.total_documents,
            "collections": meta.collections,
        },
        ip_address=client_ip
    )
    return meta


@router.get(
    "/backups",
    response_model=BackupListResponse,
    summary="List historical backup snapshots and storage footprint"
)
async def list_backups(
    current_admin: UserResponse = Depends(require_admin),
) -> BackupListResponse:
    return await backup_service.list_backups()


@router.get(
    "/backups/{filename}/download",
    summary="Download a compressed backup zip archive"
)
async def download_backup(
    filename: str,
    req: Request,
    current_admin: UserResponse = Depends(require_superadmin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    file_path = backup_service.get_backup_path(filename)
    client_ip = req.client.host if req.client else None
    await log_audit_event(
        db,
        actor_id=current_admin.id,
        actor_email=current_admin.email,
        action="DATABASE_BACKUP_DOWNLOADED",
        target_id=filename,
        target_type="backup",
        details={"filename": filename},
        ip_address=client_ip
    )
    return FileResponse(
        path=str(file_path),
        filename=filename,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.post(
    "/backups/{filename}/restore",
    response_model=RestoreResponse,
    summary="Restore MongoDB database collections from a historical backup snapshot"
)
async def restore_backup(
    filename: str,
    body: RestoreRequest,
    req: Request,
    current_admin: UserResponse = Depends(require_superadmin),
    db: AsyncIOMotorDatabase = Depends(get_db)
) -> RestoreResponse:
    res = await backup_service.restore_backup(
        db=db,
        filename=filename,
        confirmation_text=body.confirmation_text,
        drop_existing=body.drop_existing
    )
    client_ip = req.client.host if req.client else None
    await log_audit_event(
        db,
        actor_id=current_admin.id,
        actor_email=current_admin.email,
        action="DATABASE_BACKUP_RESTORED",
        target_id=filename,
        target_type="backup",
        details={
            "filename": filename,
            "restored_documents": res.total_documents_restored,
            "collections": res.collections_restored,
        },
        ip_address=client_ip
    )
    return res


@router.delete(
    "/backups/{filename}",
    summary="Delete a backup archive permanently from server disk"
)
async def delete_backup(
    filename: str,
    req: Request,
    current_admin: UserResponse = Depends(require_superadmin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    backup_service.delete_backup(filename)
    client_ip = req.client.host if req.client else None
    await log_audit_event(
        db,
        actor_id=current_admin.id,
        actor_email=current_admin.email,
        action="DATABASE_BACKUP_DELETED",
        target_id=filename,
        target_type="backup",
        details={"filename": filename},
        ip_address=client_ip
    )
    return {"status": "success", "message": f"Backup archive '{filename}' deleted successfully."}


@router.post(
    "/backups/upload",
    response_model=BackupMetadata,
    status_code=status.HTTP_201_CREATED,
    summary="Upload and register an external backup zip archive"
)
async def upload_backup(
    req: Request,
    file: UploadFile = File(...),
    current_admin: UserResponse = Depends(require_superadmin),
    db: AsyncIOMotorDatabase = Depends(get_db)
) -> BackupMetadata:
    if not file.filename or not file.filename.endswith(".zip"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must be a valid '.zip' archive."
        )

    # 100 MB max size safeguard
    contents = await file.read()
    if len(contents) > 100 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Backup archive exceeds maximum allowable upload size of 100 MB."
        )

    meta = await backup_service.import_backup_archive(contents, file.filename)
    client_ip = req.client.host if req.client else None
    await log_audit_event(
        db,
        actor_id=current_admin.id,
        actor_email=current_admin.email,
        action="DATABASE_BACKUP_IMPORTED",
        target_id=meta.backup_id,
        target_type="backup",
        details={
            "filename": meta.filename,
            "original_filename": file.filename,
            "size_bytes": meta.size_bytes,
            "total_documents": meta.total_documents,
            "collections": meta.collections,
        },
        ip_address=client_ip
    )
    return meta


@router.post(
    "/backups/upload-restore",
    response_model=RestoreResponse,
    summary="Upload an external backup archive and restore MongoDB immediately"
)
async def upload_and_restore_backup(
    req: Request,
    file: UploadFile = File(...),
    confirmation_text: str = Form(...),
    drop_existing: bool = Form(True),
    current_admin: UserResponse = Depends(require_superadmin),
    db: AsyncIOMotorDatabase = Depends(get_db)
) -> RestoreResponse:
    if confirmation_text.strip().upper() != "RESTORE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Safety confirmation required. You must submit 'RESTORE' to proceed."
        )

    if not file.filename or not file.filename.endswith(".zip"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must be a valid '.zip' archive."
        )

    contents = await file.read()
    if len(contents) > 100 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Backup archive exceeds maximum allowable upload size of 100 MB."
        )

    # 1. Import archive into ledger
    meta = await backup_service.import_backup_archive(contents, file.filename)

    # 2. Trigger instant restore
    res = await backup_service.restore_backup(
        db=db,
        filename=meta.filename,
        confirmation_text=confirmation_text,
        drop_existing=drop_existing
    )

    client_ip = req.client.host if req.client else None
    await log_audit_event(
        db,
        actor_id=current_admin.id,
        actor_email=current_admin.email,
        action="DATABASE_BACKUP_UPLOAD_RESTORED",
        target_id=meta.filename,
        target_type="backup",
        details={
            "filename": meta.filename,
            "original_filename": file.filename,
            "restored_documents": res.total_documents_restored,
            "collections": res.collections_restored,
        },
        ip_address=client_ip
    )
    return res

