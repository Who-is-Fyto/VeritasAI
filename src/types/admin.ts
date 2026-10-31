/**
 * VeritasAI — Super Admin TypeScript Types
 * Mirrors the Pydantic schemas in backend/app/schemas/admin.py
 */

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  joined_at: string;
  role: string;
  institution?: string;
  student_id?: string;
  account_type: string;
  tier: "free" | "pro" | "academic" | "admin" | "superadmin";
  is_suspended: boolean;
  suspension_reason?: string;
  daily_limit: number;
  daily_used: number;
  total_verifications: number;
  last_active?: string;
}

export interface AdminUserListResponse {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface DatabaseStorageStats {
  data_size_mb: number;
  storage_size_mb: number;
  indexes_size_mb: number;
  total_allocated_mb: number;
}

export interface VerificationTelemetrySummary {
  total_analyses: number;
  average_credibility_score: number;
  credible_count: number;
  questionable_count: number;
  misinformation_count: number;
}

export interface DatabaseTelemetry {
  database_name: string;
  status: "healthy" | "degraded" | "offline";
  latency_ms: number;
  storage: DatabaseStorageStats;
  collection_counts: Record<string, number>;
  verifications_summary: VerificationTelemetrySummary;
  server_time: string;
  uptime_seconds?: number;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor_id: string;
  actor_email: string;
  action: string;
  target_id?: string;
  target_type?: string;
  details: Record<string, any>;
  ip_address?: string;
}

export interface AuditLogsResponse {
  logs: AuditLog[];
  total: number;
}

export interface BackupMetadata {
  backup_id: string;
  filename: string;
  created_at: string;
  size_bytes: number;
  size_formatted: string;
  collections: Record<string, number>;
  total_documents: number;
  checksum_sha256?: string;
  status: "completed" | "in_progress" | "failed";
}

export interface BackupListResponse {
  backups: BackupMetadata[];
  total: number;
  total_size_bytes: number;
  total_size_formatted: string;
}

export interface RestoreResponse {
  status: string;
  backup_filename: string;
  restored_at: string;
  collections_restored: Record<string, number>;
  total_documents_restored: number;
  message: string;
  details?: Record<string, any>;
}

