"""
Admin & Super Admin Schemas
───────────────────────────
Schemas for RBAC user management, database telemetry metrics, and system audit logs.
"""
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any


class AdminUserListItem(BaseModel):
    id: str
    email: str
    name: str
    joined_at: datetime
    role: str = "Base User"
    institution: Optional[str] = "Independent / General Public"
    student_id: Optional[str] = None
    account_type: str = "base"
    tier: str = "free"
    is_suspended: bool = False
    suspension_reason: Optional[str] = None
    daily_limit: int = 5
    daily_used: int = 0
    total_verifications: int = 0
    last_active: Optional[datetime] = None


class AdminUserListResponse(BaseModel):
    users: List[AdminUserListItem]
    total: int
    page: int
    limit: int
    pages: int


class AdminUpdateTierRequest(BaseModel):
    tier: str = Field(..., description="Target tier: free, pro, academic, admin, or superadmin")

    @field_validator("tier")
    @classmethod
    def validate_tier_name(cls, v: str) -> str:
        clean = v.strip().lower()
        allowed = {"free", "pro", "academic", "admin", "superadmin"}
        if clean not in allowed:
            raise ValueError(f"Invalid tier '{clean}'. Allowed tiers: {sorted(list(allowed))}")
        return clean


class AdminSuspendUserRequest(BaseModel):
    is_suspended: bool
    reason: Optional[str] = Field(None, description="Reason for account suspension or reinstatement note")


class DatabaseStorageStats(BaseModel):
    data_size_mb: float
    storage_size_mb: float
    indexes_size_mb: float
    total_allocated_mb: float


class VerificationTelemetrySummary(BaseModel):
    total_analyses: int
    average_credibility_score: float
    credible_count: int
    questionable_count: int
    misinformation_count: int


class DatabaseTelemetryResponse(BaseModel):
    database_name: str
    status: str
    latency_ms: float
    storage: DatabaseStorageStats
    collection_counts: Dict[str, int]
    verifications_summary: VerificationTelemetrySummary
    server_time: datetime
    uptime_seconds: Optional[float] = None


class AuditLogEntry(BaseModel):
    id: str
    timestamp: datetime
    actor_id: str
    actor_email: str
    action: str
    target_id: Optional[str] = None
    target_type: Optional[str] = None
    details: Dict[str, Any] = Field(default_factory=dict)
    ip_address: Optional[str] = None


class AuditLogsResponse(BaseModel):
    logs: List[AuditLogEntry]
    total: int


class BackupMetadata(BaseModel):
    backup_id: str
    filename: str
    created_at: datetime
    size_bytes: int
    size_formatted: str
    collections: Dict[str, int]
    total_documents: int
    checksum_sha256: Optional[str] = None
    status: str = "completed"
    backup_type: str = "manual"  # "manual" | "automated" | "imported"
    mirrored: bool = False


class BackupListResponse(BaseModel):
    backups: List[BackupMetadata]
    total: int
    total_size_bytes: int
    total_size_formatted: str
    auto_backup_enabled: bool = True
    auto_backup_interval_hours: int = 12
    secondary_mirror_active: bool = False
    next_scheduled_backup: Optional[datetime] = None


class RestoreRequest(BaseModel):
    confirmation_text: str = Field(..., description="Confirmation pass-phrase. Must be 'RESTORE'.")
    drop_existing: bool = Field(True, description="Whether to clear existing documents before restore.")


class RestoreResponse(BaseModel):
    status: str = "success"
    backup_filename: str
    restored_at: datetime
    collections_restored: Dict[str, int]
    total_documents_restored: int
    message: str
    details: Dict[str, Any] = Field(default_factory=dict)

