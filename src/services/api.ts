/**
 * VeritasAI API Service
 *
 * Typed client for the FastAPI backend. All component-level API calls
 * should go through this module — never fetch() directly from a component.
 *
 * Base URL is read from VITE_API_URL (defaults to http://localhost:8000).
 * In development, Vite proxies /api/* to the backend — see vite.config.ts.
 *
 * ─── Switching between mock and real API ────────────────────────────────
 * Set VITE_USE_MOCK_API=false in your .env to enable real backend calls.
 * Leave it unset or set to "true" during frontend-only development.
 * ────────────────────────────────────────────────────────────────────────
 */

import type { AnalysisResult, AnalyseRequest, AuditCertificateResponse } from "../types/analysis";
import type {
  AdminUser,
  AdminUserListResponse,
  DatabaseTelemetry,
  AuditLogsResponse,
  BackupMetadata,
  BackupListResponse,
  RestoreResponse,
} from "../types/admin";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

// ── Custom error class ──────────────────────────────────────────────────
export class VeritasAPIError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly detail?: unknown
  ) {
    super(message);
    this.name = "VeritasAPIError";
  }
}

// ── Base fetch wrapper ──────────────────────────────────────────────────
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  if (import.meta.env.VITE_USE_MOCK_API !== "false") {
    // Return mock responses for mock mode so we don't call fetch and fail proxy
    if (path.startsWith("/api/v1/health")) {
      return {
        status: "ok",
        version: "1.5.0",
        model_loaded: true,
        db_connected: true,
      } as T;
    }
    if (path.startsWith("/api/v1/auth/register") || path.startsWith("/api/v1/auth/login")) {
      const body = options?.body ? JSON.parse(options.body as string) : {};
      const email = (body.email || "demo@veritas.ai").trim();
      const isSuperAdmin =
        email.toLowerCase().includes("superadmin") || email.toLowerCase() === "admin@veritas.ai";
      const name = isSuperAdmin ? "VeritasAI Super Administrator" : (body.name || email.split("@")[0]);
      const mockUser = {
        id: isSuperAdmin ? "admin-1" : "mock-user-123",
        email,
        name,
        joined_at: new Date().toISOString(),
        role: isSuperAdmin ? "superadmin" : "Research Analyst",
        institution: isSuperAdmin ? "VeritasAI Governance Directorate" : "Richfield Faculty of ICT",
        account_type: isSuperAdmin ? "enterprise" : "academic",
        tier: isSuperAdmin ? "superadmin" : "academic",
      };
      localStorage.setItem("veritas_token", "mock-token-abc");
      localStorage.setItem("veritas_user", JSON.stringify(mockUser));
      return {
        access_token: "mock-token-abc",
        token_type: "bearer",
        user: mockUser,
      } as T;
    }
    if (path.startsWith("/api/v1/auth/profile")) {
      const body = options?.body ? JSON.parse(options.body as string) : {};
      const savedUserStr = localStorage.getItem("veritas_user");
      const current = savedUserStr ? JSON.parse(savedUserStr) : {};
      const updated = { ...current, ...body };
      localStorage.setItem("veritas_user", JSON.stringify(updated));
      return updated as T;
    }
    if (path.startsWith("/api/v1/auth/me")) {
      const savedUser = localStorage.getItem("veritas_user");
      return (savedUser ? JSON.parse(savedUser) : { id: "mock-user-123", email: "mock@veritas.ai", name: "Mock User", joined_at: new Date().toISOString() }) as T;
    }
    if (path.startsWith("/api/v1/auth/tier")) {
      const body = options?.body ? JSON.parse(options.body as string) : {};
      const savedUserStr = localStorage.getItem("veritas_user");
      const current = savedUserStr ? JSON.parse(savedUserStr) : {};
      const updated = { ...current, tier: body.tier, account_type: body.tier === "academic" ? "academic" : body.tier === "pro" ? "enterprise" : "base" };
      localStorage.setItem("veritas_user", JSON.stringify(updated));
      return updated as T;
    }
    if (path.startsWith("/api/v1/auth/keys")) {
      const getStoredKeys = () => {
        try {
          const raw = localStorage.getItem("veritas_mock_keys");
          return raw ? JSON.parse(raw) : [
            { id: "mock-key-1", name: "Research Script Key", key_prefix: "veritas_abcd", created_at: new Date().toISOString() }
          ];
        } catch {
          return [];
        }
      };
      if (options?.method === "POST") {
        const body = JSON.parse(options.body as string);
        const newKey = {
          id: Math.random().toString(36).substring(7),
          name: body.name,
          key_prefix: "veritas_mock",
          created_at: new Date().toISOString(),
          api_key: "veritas_mock_key_" + Math.random().toString(36).substring(7),
        };
        const currentKeys = getStoredKeys();
        const updated = [...currentKeys, newKey];
        localStorage.setItem("veritas_mock_keys", JSON.stringify(updated));
        return newKey as T;
      }
      if (options?.method === "DELETE") {
        const keyId = path.split("/").pop();
        const currentKeys = getStoredKeys();
        const updated = currentKeys.filter((k: any) => k.id !== keyId);
        localStorage.setItem("veritas_mock_keys", JSON.stringify(updated));
        return { status: "success" } as T;
      }
      // GET list keys
      return getStoredKeys() as T;
    }
    if (path.startsWith("/api/v1/admin/train/status")) {
      const raw = localStorage.getItem("veritas_mock_train");
      let trainObj = {
        status: "idle",
        samples_trained: 142,
        epoch: 3,
        loss: 0.042,
        last_run: new Date().toISOString(),
        weights_file_exists: true,
      };
      if (raw) {
        try {
          trainObj = JSON.parse(raw);
        } catch {
          // ignore
        }
      }
      return trainObj as T;
    }
    if (path.startsWith("/api/v1/admin/train/trigger")) {
      const trainObj = {
        status: "training",
        samples_trained: 142,
        epoch: 4,
        loss: 0.038,
        last_run: new Date().toISOString(),
        weights_file_exists: true,
      };
      localStorage.setItem("veritas_mock_train", JSON.stringify(trainObj));
      setTimeout(() => {
        localStorage.setItem(
          "veritas_mock_train",
          JSON.stringify({ ...trainObj, status: "idle", samples_trained: 178 })
        );
      }, 3000);
      return { status: "success", message: "Training initiated" } as T;
    }
    if (path.startsWith("/api/v1/admin/telemetry/db")) {
      return {
        database_name: "veritasai",
        status: "healthy",
        latency_ms: 1.4,
        storage: {
          data_size_mb: 2.8,
          storage_size_mb: 8.5,
          indexes_size_mb: 1.2,
          total_allocated_mb: 9.7,
        },
        collection_counts: {
          users: 18,
          results: 164,
          api_keys: 12,
          feedback: 42,
          audit_logs: 89,
        },
        verifications_summary: {
          total_analyses: 164,
          average_credibility_score: 84.6,
          credible_count: 122,
          questionable_count: 28,
          misinformation_count: 14,
        },
        server_time: new Date().toISOString(),
        uptime_seconds: 86420,
      } as T;
    }
    if (path.startsWith("/api/v1/admin/audit-logs")) {
      return {
        logs: [
          {
            id: "audit-1",
            timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
            actor_id: "admin-1",
            actor_email: "superadmin@veritas.ai",
            action: "USER_TIER_MODIFIED",
            target_id: "usr-2",
            target_type: "user",
            details: { previous_tier: "free", new_tier: "pro", user_email: "sarah.jenkins@reuters.com" },
            ip_address: "127.0.0.1",
          },
          {
            id: "audit-2",
            timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
            actor_id: "admin-1",
            actor_email: "superadmin@veritas.ai",
            action: "ML_TRAIN_TRIGGERED",
            target_type: "trainer",
            details: { triggered_by: "superadmin@veritas.ai", samples_queued: 142 },
            ip_address: "127.0.0.1",
          },
          {
            id: "audit-3",
            timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
            actor_id: "admin-1",
            actor_email: "superadmin@veritas.ai",
            action: "USER_SUSPENDED",
            target_id: "usr-spam",
            target_type: "user",
            details: { user_email: "spammer@suspicious.net", reason: "Automated scraping abuse" },
            ip_address: "192.168.1.15",
          },
          {
            id: "audit-4",
            timestamp: new Date(Date.now() - 1000 * 60 * 400).toISOString(),
            actor_id: "system-bootstrap",
            actor_email: "system@veritas.ai",
            action: "SUPERADMIN_SEEDED",
            target_id: "admin-1",
            target_type: "user",
            details: { email: "superadmin@veritas.ai", role: "superadmin" },
            ip_address: "127.0.0.1",
          },
        ],
        total: 4,
      } as T;
    }
    if (path.startsWith("/api/v1/admin/users")) {
      const mockUsers: AdminUser[] = [
        {
          id: "admin-1",
          email: "superadmin@veritas.ai",
          name: "VeritasAI Super Administrator",
          joined_at: "2026-01-15T08:00:00Z",
          role: "superadmin",
          institution: "VeritasAI Governance Directorate",
          account_type: "enterprise",
          tier: "superadmin",
          is_suspended: false,
          daily_limit: 999999,
          daily_used: 12,
          total_verifications: 384,
          last_active: new Date().toISOString(),
        },
        {
          id: "usr-2",
          email: "sarah.jenkins@reuters.com",
          name: "Sarah Jenkins",
          joined_at: "2026-03-10T14:22:00Z",
          role: "Investigative Journalist",
          institution: "Reuters News Agency",
          account_type: "enterprise",
          tier: "pro",
          is_suspended: false,
          daily_limit: 999999,
          daily_used: 28,
          total_verifications: 215,
          last_active: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        },
        {
          id: "usr-3",
          email: "michael@student.richfield.ac.za",
          name: "Michael Mazhambe",
          joined_at: "2026-04-02T11:05:00Z",
          role: "Postgraduate Researcher",
          institution: "Richfield Graduate Institute of Technology",
          student_id: "2023-RF-90412",
          account_type: "academic",
          tier: "academic",
          is_suspended: false,
          daily_limit: 999999,
          daily_used: 8,
          total_verifications: 147,
          last_active: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        },
        {
          id: "usr-4",
          email: "david.m@theguardian.com",
          name: "David Miller",
          joined_at: "2026-06-18T09:30:00Z",
          role: "Fact-Check Editor",
          institution: "The Guardian",
          account_type: "enterprise",
          tier: "pro",
          is_suspended: false,
          daily_limit: 999999,
          daily_used: 14,
          total_verifications: 89,
          last_active: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        },
        {
          id: "usr-5",
          email: "guest.demo@veritas.ai",
          name: "Guest Demo Account",
          joined_at: "2026-09-01T16:00:00Z",
          role: "Base User",
          institution: "Independent / General Public",
          account_type: "base",
          tier: "free",
          is_suspended: false,
          daily_limit: 5,
          daily_used: 3,
          total_verifications: 12,
          last_active: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
        },
        {
          id: "usr-spam",
          email: "spammer@suspicious.net",
          name: "Automated Bot Probe",
          joined_at: "2026-10-12T02:14:00Z",
          role: "Base User",
          institution: "Unknown Proxy",
          account_type: "base",
          tier: "free",
          is_suspended: true,
          suspension_reason: "Automated scraping abuse and high-frequency token generation",
          daily_limit: 5,
          daily_used: 5,
          total_verifications: 62,
          last_active: new Date(Date.now() - 1000 * 60 * 1440).toISOString(),
        },
      ];

      // Handle PATCH tier
      if (options?.method === "PATCH" && path.includes("/tier")) {
        const body = options.body ? JSON.parse(options.body as string) : {};
        const uid = path.split("/")[5];
        const user = mockUsers.find((u) => u.id === uid) || mockUsers[1];
        user.tier = body.tier;
        return user as T;
      }

      // Handle PATCH status (suspend)
      if (options?.method === "PATCH" && path.includes("/status")) {
        const body = options.body ? JSON.parse(options.body as string) : {};
        const uid = path.split("/")[5];
        const user = mockUsers.find((u) => u.id === uid) || mockUsers[1];
        user.is_suspended = body.is_suspended;
        user.suspension_reason = body.reason;
        return user as T;
      }

      // Handle DELETE
      if (options?.method === "DELETE") {
        return { status: "success", message: "User permanently deleted." } as T;
      }

      // Handle GET list
      const url = new URL(`http://dummy${path}`);
      const search = url.searchParams.get("search")?.toLowerCase();
      const tierFilter = url.searchParams.get("tier");
      const statusFilter = url.searchParams.get("status");

      let filtered = [...mockUsers];
      if (search) {
        filtered = filtered.filter(
          (u) =>
            u.name.toLowerCase().includes(search) ||
            u.email.toLowerCase().includes(search) ||
            (u.institution && u.institution.toLowerCase().includes(search))
        );
      }
      if (tierFilter) {
        filtered = filtered.filter((u) => u.tier === tierFilter);
      }
      if (statusFilter) {
        if (statusFilter === "suspended") filtered = filtered.filter((u) => u.is_suspended);
        if (statusFilter === "active") filtered = filtered.filter((u) => !u.is_suspended);
      }

      return {
        users: filtered,
        total: filtered.length,
        page: 1,
        limit: 20,
        pages: 1,
      } as T;
    }
    if (path.startsWith("/api/v1/admin/backups")) {
      const getStoredBackups = (): BackupMetadata[] => {
        const stored = localStorage.getItem("veritas_mock_backups");
        if (stored) {
          try {
            return JSON.parse(stored);
          } catch {
            // fallback
          }
        }
        const initial: BackupMetadata[] = [
          {
            backup_id: "bkp-seed-01",
            filename: "veritas_backup_20261029_180000.zip",
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 15).toISOString(),
            size_bytes: 348160,
            size_formatted: "340.0 KB",
            collections: { users: 18, results: 164, api_keys: 12, feedback: 42, audit_logs: 89 },
            total_documents: 325,
            checksum_sha256: "7a8f9c1b2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a",
            status: "completed",
          },
          {
            backup_id: "bkp-seed-02",
            filename: "veritas_backup_20261028_093000.zip",
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
            size_bytes: 286720,
            size_formatted: "280.0 KB",
            collections: { users: 14, results: 120, api_keys: 8, feedback: 30, audit_logs: 45 },
            total_documents: 217,
            checksum_sha256: "3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e",
            status: "completed",
          },
        ];
        localStorage.setItem("veritas_mock_backups", JSON.stringify(initial));
        return initial;
      };

      // 1. POST /api/v1/admin/backups (create)
      if (options?.method === "POST" && !path.includes("/restore")) {
        const currentList = getStoredBackups();
        const now = new Date();
        const dateStr = now.toISOString().replace(/[-:T]/g, "").slice(0, 14);
        const newBackup: BackupMetadata = {
          backup_id: `bkp-${Math.random().toString(36).substring(2, 9)}`,
          filename: `veritas_backup_${dateStr}.zip`,
          created_at: now.toISOString(),
          size_bytes: 368640,
          size_formatted: "360.0 KB",
          collections: { users: 18, results: 164, api_keys: 12, feedback: 42, audit_logs: 94 },
          total_documents: 330,
          checksum_sha256: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
          status: "completed",
        };
        const updated = [newBackup, ...currentList];
        localStorage.setItem("veritas_mock_backups", JSON.stringify(updated));
        return newBackup as T;
      }

      // 2. POST /api/v1/admin/backups/{filename}/restore
      if (options?.method === "POST" && path.includes("/restore")) {
        const parts = path.split("/");
        const filename = parts[parts.indexOf("backups") + 1];
        const body = options.body ? JSON.parse(options.body as string) : {};
        if (body.confirmation_text?.trim().toUpperCase() !== "RESTORE") {
          throw new VeritasAPIError(400, "Safety confirmation required. You must submit 'RESTORE' to proceed.");
        }
        return {
          status: "success",
          backup_filename: filename,
          restored_at: new Date().toISOString(),
          collections_restored: { users: 18, results: 164, api_keys: 12, feedback: 42, audit_logs: 94 },
          total_documents_restored: 330,
          message: `Database restored successfully from snapshot '${filename}'.`,
          details: { original_created_at: new Date().toISOString() },
        } as T;
      }

      // 3. DELETE /api/v1/admin/backups/{filename}
      if (options?.method === "DELETE") {
        const parts = path.split("/");
        const filename = parts[parts.indexOf("backups") + 1];
        const currentList = getStoredBackups();
        const updated = currentList.filter((b) => b.filename !== filename);
        localStorage.setItem("veritas_mock_backups", JSON.stringify(updated));
        return { status: "success", message: `Backup archive '${filename}' deleted successfully.` } as T;
      }

      // 4. GET /api/v1/admin/backups
      const list = getStoredBackups();
      const totalBytes = list.reduce((acc, b) => acc + b.size_bytes, 0);
      return {
        backups: list,
        total: list.length,
        total_size_bytes: totalBytes,
        total_size_formatted: `${(totalBytes / 1024).toFixed(1)} KB`,
      } as T;
    }
    if (path.startsWith("/api/v1/analyse")) {
      const body = options?.body ? JSON.parse(options.body as string) : {};
      const content = body.content || "";
      const inputType = body.type || "text";
      const docId = `res-${Math.random().toString(36).substring(2, 10)}`;

      const lower = content.toLowerCase();
      const isSuspect =
        lower.includes("miracle") ||
        lower.includes("5g") ||
        lower.includes("shocking") ||
        lower.includes("conspiracy") ||
        lower.includes("secret cure");

      const overall = isSuspect ? 32.0 : 84.0;
      const lingScore = isSuspect ? 35.0 : 88.0;
      const srcScore = isSuspect ? 25.0 : 82.0;
      const corrobScore = isSuspect ? 36.0 : 80.0;
      const aiProb = isSuspect ? 78.0 : 14.0;

      const sentences = content.split(/(?<=[.!?])\s+/).filter(Boolean);
      const sentenceAnalyses = sentences.map((s, idx) => {
        const isSynthetic = isSuspect && idx % 2 === 0;
        const sProb = isSynthetic ? 84.0 : (isSuspect ? 55.0 : 12.0);
        return {
          sentence_index: idx,
          text: s,
          ai_probability: sProb,
          classification: (sProb >= 65 ? "synthetic" : sProb >= 35 ? "mixed" : "human") as "synthetic" | "mixed" | "human",
          burstiness: 0.28,
          perplexity_score: isSynthetic ? 82.0 : 24.0,
          detected_markers: isSynthetic ? ["delve into", "testament to"] : [],
        };
      });

      const mockAnalysisResult: AnalysisResult = {
        id: docId,
        status: "complete",
        input_type: inputType,
        submitted_at: new Date().toISOString(),
        overall_score: overall,
        ai_probability: aiProb,
        scores: {
          linguistic_score: lingScore,
          source_score: srcScore,
          corroboration_score: corrobScore,
          weights: { linguistic: 0.4, source: 0.35, corroboration: 0.25 },
        },
        xai_annotations: isSuspect
          ? [
              { text: "Shocking new discovery", type: "manipulative", reason: "Hyperbolic emotional phrasing", confidence: 92 },
              { text: "They do not want you to know this", type: "manipulative", reason: "Conspiratorial urgency marker", confidence: 96 },
            ]
          : [
              { text: "According to official reports", type: "verified", reason: "Factual attribution to institutional sources", confidence: 95 },
              { text: "peer-reviewed research confirms", type: "verified", reason: "Academic corroboration marker", confidence: 91 },
            ],
        sources: isSuspect
          ? [
              { name: "Unverified Forum", credibility: 24, status: "questionable", matches: 1 },
              { name: "Social Media Wire", credibility: 30, status: "questionable", matches: 2 },
            ]
          : [
              { name: "Reuters", credibility: 98, status: "verified", matches: 3 },
              { name: "Associated Press", credibility: 96, status: "verified", matches: 2 },
              { name: "BBC News", credibility: 94, status: "verified", matches: 1 },
            ],
        claims: isSuspect
          ? [
              {
                claim: content.slice(0, 80) || "Unsubstantiated viral claim",
                status: "false",
                confidence: 94,
                sources: 0,
                explanation: "Debunked by institutional fact-checking bodies and public news wires.",
              },
            ]
          : [
              {
                claim: content.slice(0, 80) || "Documented global trend statement",
                status: "verified",
                confidence: 92,
                sources: 3,
                explanation: "Confirmed across multiple independent international news wires.",
              },
            ],
        linguistic_flags: [
          { label: "Sentence structure variance", rating: "Normal", ok: !isSuspect },
          { label: "Vocabulary richness (TTR)", rating: "0.68 — typical human range", ok: true },
          { label: "AI stylometric markers", rating: isSuspect ? "Elevated presence (78%)" : "Low presence (14%)", ok: !isSuspect },
        ],
        summary: isSuspect
          ? "Content contains severe manipulation markers and unverified assertions."
          : "Content is highly credible and corroborated by authoritative news wires.",
        content: content,
        ai_forensics: {
          burstiness_score: isSuspect ? 18.5 : 56.4,
          burstiness_classification: isSuspect ? "low_burstiness" : "high_burstiness",
          perplexity_estimate: isSuspect ? 78.0 : 26.0,
          perplexity_classification: isSuspect ? "highly_predictable" : "natural_unpredictable",
          lexical_diversity: isSuspect ? 0.44 : 0.69,
          shannon_entropy: isSuspect ? 3.5 : 5.9,
          synthetic_marker_count: isSuspect ? 4 : 0,
          synthetic_markers_found: isSuspect ? ["delve into", "rich tapestry", "testament to", "it is worth noting"] : [],
          sentence_analyses: sentenceAnalyses.length > 0 ? sentenceAnalyses : [
            {
              sentence_index: 0,
              text: content || "Sample statement",
              ai_probability: aiProb,
              classification: aiProb >= 65 ? "synthetic" : aiProb >= 35 ? "mixed" : "human",
              burstiness: 0.3,
              perplexity_score: isSuspect ? 75.0 : 22.0,
              detected_markers: isSuspect ? ["delve into"] : []
            }
          ]
        }
      };

      try {
        const stored = localStorage.getItem("veritas_mock_analyses") || "{}";
        const analysesMap = JSON.parse(stored);
        analysesMap[docId] = mockAnalysisResult;
        localStorage.setItem("veritas_mock_analyses", JSON.stringify(analysesMap));
      } catch {
        // ignore localstorage errors
      }

      return mockAnalysisResult as T;
    }
    if (path.startsWith("/api/v1/results/") && path.endsWith("/feedback")) {
      return { status: "success", message: "Feedback recorded successfully." } as T;
    }
    if (path.startsWith("/api/v1/results/") && path.endsWith("/certificate")) {
      const parts = path.split("/");
      const id = parts[parts.length - 2] || "mock-id";
      let resData: any = null;
      try {
        const stored = localStorage.getItem("veritas_mock_analyses") || "{}";
        const analysesMap = JSON.parse(stored);
        resData = analysesMap[id];
      } catch {
        // ignore
      }

      const overall = resData ? resData.overall_score : 84.0;
      const verdict =
        overall >= 80 ? "Verified Credible" : overall >= 60 ? "Mostly Factual" : overall >= 40 ? "Caution Required" : "Flagged Disinformation";

      return {
        certificate_id: `CERT-B94A${id.slice(-6).toUpperCase()}`,
        verification_id: `VER-${id.slice(-8).toUpperCase()}`,
        issued_at: new Date().toISOString(),
        content_hash: "a4f89d309be04f478a2cb45582f3ef7e9b2311893116e0",
        target_summary:
          resData?.summary || "Multi-dimensional credibility assessment and algorithmic disinformation forensic evaluation.",
        input_type: resData?.input_type || "text",
        overall_score: overall,
        verdict_label: verdict,
        confidence_interval: 2.5,
        scores: resData?.scores || {
          linguistic_score: 88.0,
          source_score: 82.0,
          corroboration_score: 80.0,
          weights: { linguistic: 0.4, source: 0.35, corroboration: 0.25 },
        },
        ai_probability: resData?.ai_probability || 14.0,
        claims_verified: resData ? resData.claims.filter((c: any) => c.status === "verified").length : 3,
        claims_total: resData ? resData.claims.length : 4,
        top_sources: resData ? resData.sources.map((s: any) => s.name) : ["Reuters", "Associated Press", "BBC News"],
        digital_signature: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        issuer: "VeritasAI Credibility & Forensic Attestation Authority",
        standard: "ISO/IEC 23894 AI Risk Management & IEEE 7001 Algorithmic Transparency",
        verification_url: `https://veritasai.org/results/${id}`,
      } as T;
    }
    if (path.startsWith("/api/v1/results/")) {
      const id = path.split("/").pop() ?? "mock-id";
      try {
        const stored = localStorage.getItem("veritas_mock_analyses") || "{}";
        const analysesMap = JSON.parse(stored);
        if (analysesMap[id]) {
          return analysesMap[id] as T;
        }
      } catch {
        // ignore
      }

      // Mock result fallback
      return {
        id,
        status: "complete",
        input_type: "text",
        overall_score: 84.0,
        ai_probability: 14.0,
        scores: {
          linguistic_score: 88.0,
          source_score: 82.0,
          corroboration_score: 80.0,
          weights: { linguistic: 0.4, source: 0.35, corroboration: 0.25 },
        },
        xai_annotations: [
          { text: "Reuters reported that", type: "verified", reason: "Factual statement matching verified source", confidence: 94 },
          { text: "sensational clickbait headline", type: "manipulative", reason: "Hyperbolic emotional phrasing", confidence: 85 },
        ],
        sources: [
          { name: "Reuters", credibility: 98, matches: 3, status: "verified" },
          { name: "Associated Press", credibility: 96, matches: 2, status: "verified" },
        ],
        claims: [
          { claim: "Global temperatures rose by 1.2 degrees in 2024", status: "verified", confidence: 91, sources: 3 },
        ],
        linguistic_flags: [
          { label: "Sentence structure variance", rating: "Normal", ok: true },
          { label: "AI stylometric markers", rating: "Low presence (14%)", ok: true },
        ],
        summary: "Content is highly credible and corroborated by authoritative news wires.",
        content: "According to Reuters, renewable energy investment grew by 15% globally in 2024.",
        submitted_at: new Date().toISOString(),
      } as T;
    }
    return {} as T;
  }

  const token = localStorage.getItem("veritas_token");
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    headers,
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new VeritasAPIError(
      res.status,
      body.detail ?? `Request to ${path} failed with status ${res.status}`,
      body
    );
  }

  return res.json() as Promise<T>;
}


// ── API methods ─────────────────────────────────────────────────────────
export const veritasAPI = {
  /**
   * POST /api/v1/analyse
   * Submit text or a URL for multi-dimensional credibility analysis.
   * Returns a full AnalysisResult including scores, XAI annotations,
   * source authority data, and claim verification results.
   */
  analyse: (payload: AnalyseRequest): Promise<AnalysisResult> =>
    request<AnalysisResult>("/api/v1/analyse", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  /**
   * GET /api/v1/results/:id
   * Retrieve a previously stored analysis result by its MongoDB document ID.
   * Useful for shareable report links.
   */
  getResult: (id: string): Promise<AnalysisResult> =>
    request<AnalysisResult>(`/api/v1/results/${id}`),

  /**
   * GET /api/v1/results/:id/certificate
   * Retrieve or generate official Credibility Audit Certificate.
   */
  getCertificate: (id: string): Promise<AuditCertificateResponse> =>
    request<AuditCertificateResponse>(`/api/v1/results/${id}/certificate`),

  /**
   * GET /api/v1/health
   * Check that the backend is reachable and all services are initialised.
   */
  health: (): Promise<{ status: string; version: string; model_loaded: boolean; db_connected: boolean }> =>
    request("/api/v1/health"),

  /**
   * POST /api/v1/auth/register
   * Create a new user account. Returns token and user profile.
   */
  register: (payload: any): Promise<any> =>
    request("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  /**
   * POST /api/v1/auth/login
   * Authentic user credentials and returns access token.
   */
  login: (payload: any): Promise<any> =>
    request("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  /**
   * GET /api/v1/auth/me
   * Retrieve active user account profile.
   */
  getMe: (): Promise<any> =>
    request("/api/v1/auth/me"),

  /**
   * PUT /api/v1/auth/profile
   * Update active user account profile.
   */
  updateProfile: (payload: { name?: string; institution?: string; role?: string; student_id?: string; tier?: string }): Promise<any> =>
    request("/api/v1/auth/profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  /**
   * PUT /api/v1/auth/tier
   * Update user account commercial tier.
   */
  updateTier: (tier: string): Promise<any> =>
    request("/api/v1/auth/tier", {
      method: "PUT",
      body: JSON.stringify({ tier }),
    }),

  /**
   * POST /api/v1/results/:id/feedback
   * Submit user feedback on analysis accuracy for active learning.
   */
  submitFeedback: (id: string, payload: { is_accurate: boolean; corrected_label: string; corrected_score?: number }): Promise<any> =>
    request(`/api/v1/results/${id}/feedback`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  /**
   * GET /api/v1/admin/train/status
   * Query the status of the background active learning training process.
   */
  getTrainStatus: (): Promise<any> =>
    request("/api/v1/admin/train/status"),

  /**
   * POST /api/v1/admin/train/trigger
   * Trigger the self-training loop to run in the background.
   */
  triggerTraining: (): Promise<any> =>
    request("/api/v1/admin/train/trigger", {
      method: "POST",
    }),

  /**
   * GET /api/v1/auth/keys
   * Retrieve list of active developer API keys.
   */
  listKeys: (): Promise<any[]> =>
    request("/api/v1/auth/keys"),

  /**
   * POST /api/v1/auth/keys
   * Generate a new developer API key.
   */
  createKey: (name: string): Promise<any> =>
    request("/api/v1/auth/keys", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  /**
   * DELETE /api/v1/auth/keys/:id
   * Revoke an active developer API key.
   */
  deleteKey: (id: string): Promise<any> =>
    request(`/api/v1/auth/keys/${id}`, {
      method: "DELETE",
    }),

  /**
   * GET /api/v1/admin/users
   * List, search, and filter users with pagination.
   */
  adminGetUsers: (params?: { search?: string; tier?: string; status?: string; page?: number; limit?: number }): Promise<AdminUserListResponse> => {
    const q = new URLSearchParams();
    if (params?.search) q.set("search", params.search);
    if (params?.tier) q.set("tier", params.tier);
    if (params?.status) q.set("status", params.status);
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit));
    const qs = q.toString();
    return request(`/api/v1/admin/users${qs ? `?${qs}` : ""}`);
  },

  /**
   * PATCH /api/v1/admin/users/:id/tier
   * Promote or downgrade user account tier.
   */
  adminUpdateUserTier: (userId: string, tier: string): Promise<AdminUser> =>
    request(`/api/v1/admin/users/${userId}/tier`, {
      method: "PATCH",
      body: JSON.stringify({ tier }),
    }),

  /**
   * PATCH /api/v1/admin/users/:id/status
   * Suspend or reinstate user account.
   */
  adminUpdateUserStatus: (userId: string, isSuspended: boolean, reason?: string): Promise<AdminUser> =>
    request(`/api/v1/admin/users/${userId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ is_suspended: isSuspended, reason }),
    }),

  /**
   * DELETE /api/v1/admin/users/:id
   * Permanently purge user account and keys.
   */
  adminDeleteUser: (userId: string): Promise<{ status: string; message: string }> =>
    request(`/api/v1/admin/users/${userId}`, {
      method: "DELETE",
    }),

  /**
   * GET /api/v1/admin/telemetry/db
   * Retrieve live database storage, latency, and verification metrics.
   */
  adminGetDbTelemetry: (): Promise<DatabaseTelemetry> =>
    request("/api/v1/admin/telemetry/db"),

  /**
   * GET /api/v1/admin/audit-logs
   * Retrieve immutable administrative audit event records.
   */
  adminGetAuditLogs: (params?: { action?: string; limit?: number }): Promise<AuditLogsResponse> => {
    const q = new URLSearchParams();
    if (params?.action) q.set("action", params.action);
    if (params?.limit) q.set("limit", String(params.limit));
    const qs = q.toString();
    return request(`/api/v1/admin/audit-logs${qs ? `?${qs}` : ""}`);
  },

  /**
   * POST /api/v1/admin/backups
   * Create an immediate compressed BSON/JSON database backup.
   */
  adminCreateBackup: (): Promise<BackupMetadata> =>
    request("/api/v1/admin/backups", {
      method: "POST",
    }),

  /**
   * GET /api/v1/admin/backups
   * Retrieve historical backup archives ledger.
   */
  adminListBackups: (): Promise<BackupListResponse> =>
    request("/api/v1/admin/backups"),

  /**
   * GET /api/v1/admin/backups/:filename/download
   * Trigger browser file download of the backup archive zip.
   */
  adminDownloadBackup: async (filename: string): Promise<void> => {
    if (import.meta.env.VITE_USE_MOCK_API !== "false") {
      const blob = new Blob(["PK\x05\x06" + "\x00".repeat(18)], { type: "application/zip" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      return;
    }
    const token = localStorage.getItem("veritas_token");
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const response = await fetch(`${API_BASE}/api/v1/admin/backups/${encodeURIComponent(filename)}/download`, {
      headers,
    });
    if (!response.ok) {
      throw new VeritasAPIError(response.status, "Failed to download backup archive.");
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  /**
   * POST /api/v1/admin/backups/:filename/restore
   * Restore database from snapshot with safety confirmation.
   */
  adminRestoreBackup: (filename: string, confirmationText: string, dropExisting: boolean = true): Promise<RestoreResponse> =>
    request(`/api/v1/admin/backups/${encodeURIComponent(filename)}/restore`, {
      method: "POST",
      body: JSON.stringify({ confirmation_text: confirmationText, drop_existing: dropExisting }),
    }),

  /**
   * DELETE /api/v1/admin/backups/:filename
   * Permanently delete a backup snapshot from server storage.
   */
  adminDeleteBackup: (filename: string): Promise<{ status: string; message: string }> =>
    request(`/api/v1/admin/backups/${encodeURIComponent(filename)}`, {
      method: "DELETE",
    }),
};



