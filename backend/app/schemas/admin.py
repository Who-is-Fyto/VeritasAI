"""
Admin & Super Admin Schemas
───────────────────────────
Schemas for RBAC user management, database telemetry metrics, and system audit logs.
"""
from datetime import datetime
from pydantic import BaseModel, Field
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
    tier: str = Field(..., description="Target tier: free, pro, academic, or superadmin")


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
