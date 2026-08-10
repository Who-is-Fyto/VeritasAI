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

import type { AnalysisResult, AnalyseRequest } from "../types/analysis";

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
    if (path.startsWith("/api/v1/auth/me")) {
      const savedUser = localStorage.getItem("veritas_user");
      return (savedUser ? JSON.parse(savedUser) : { id: "mock-user-123", email: "mock@veritas.ai", name: "Mock User", joined_at: new Date().toISOString() }) as T;
    }
    if (path.startsWith("/api/v1/auth/keys")) {
      if (options?.method === "POST") {
        const body = JSON.parse(options.body as string);
        return {
          id: Math.random().toString(36).substring(7),
          name: body.name,
          key_prefix: "veritas_mock",
          created_at: new Date().toISOString(),
          api_key: "veritas_mock_key_" + Math.random().toString(36).substring(7)
        } as T;
      }
      if (options?.method === "DELETE") {
        return { status: "success" } as T;
      }
      // GET list keys
      return [
        { id: "mock-key-1", name: "Research Script Key", key_prefix: "veritas_abcd", created_at: new Date().toISOString() }
      ] as T;
    }
    if (path.startsWith("/api/v1/admin/train/status")) {
      return {
        status: "idle",
        samples_trained: 142,
        epoch: 3,
        loss: 0.042,
        last_run: new Date().toISOString(),
        weights_file_exists: true
      } as T;
    }
    if (path.startsWith("/api/v1/admin/train/trigger")) {
      return { status: "success", message: "Training initiated" } as T;
    }
    if (path.startsWith("/api/v1/results/") && path.endsWith("/feedback")) {
      return { status: "success" } as T;
    }
    if (path.startsWith("/api/v1/results/")) {
      // Mock result retrieval
      return {
        id: path.split("/").pop() ?? "mock-id",
        status: "complete",
        overall_score: 84.0,
        ai_probability: 12.0,
        scores: {
          linguistic_score: 88.0,
          source_score: 82.0,
          corroboration_score: 80.0,
          weights: { linguistic: 0.4, source: 0.35, corroboration: 0.25 }
        },
        xai_annotations: [
          { text: "Reuters reported that", type: "verified", reason: "Factual statement matching verified source", confidence: 94 },
          { text: "sensational clickbait headline", type: "manipulative", reason: "Hyperbolic emotional phrasing", confidence: 85 }
        ],
        sources: [
          { name: "Reuters", credibility: 98, matches: 3, status: "verified" },
          { name: "Associated Press", credibility: 96, matches: 2, status: "verified" }
        ],
        claims: [
          { claim: "Global temperatures rose by 1.2 degrees in 2024", status: "verified", confidence: 91, sources: 3 }
        ],
        linguistic_flags: [
          { label: "Sentence structure variance", rating: "Normal", ok: true },
          { label: "AI stylometric markers", rating: "Low presence", ok: true }
        ],
        submitted_at: new Date().toISOString()
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
};



