/**
 * VeritasAI — Shared TypeScript types
 *
 * These types mirror the Pydantic schemas in backend/app/schemas/response.py.
 */

/** A single phrase-level annotation produced by the XAI output layer */
export interface XAIAnnotation {
  text: string;
  type: "manipulative" | "verified" | "unverified" | "neutral";
  reason?: string;
  /** Model confidence for this annotation (0–100) */
  confidence?: number;
}

/** A corroborating or conflicting source found by the News API layer */
export interface SourceResult {
  name: string;
  url?: string;
  /** 0–100 credibility score derived from domain authority databases */
  credibility: number;
  status: "verified" | "questionable" | "unknown";
  /** Number of article excerpts that matched the submitted content */
  matches: number;
}

export interface CorroboratingSource {
  title: string;
  url: string;
  publisher?: string;
  similarity_score?: number;
  snippet?: string;
}

/** An individual claim extracted and cross-referenced by the engine */
export interface ClaimResult {
  claim: string;
  status: "verified" | "unverified" | "false";
  /** 0–100 confidence in the verification outcome */
  confidence: number;
  /** Number of corroborating sources found */
  sources: number;
  explanation?: string;
  source_links?: CorroboratingSource[];
}

/** A single stylometric flag from the linguistic analysis */
export interface LinguisticFlag {
  label: string;
  rating: string;
  /** true = normal / passing, false = flagged */
  ok: boolean;
}

/** The three pillar scores and their ensemble weights */
export interface WeightedScores {
  linguistic_score: number;   // weight: 0.40
  source_score: number;       // weight: 0.35
  corroboration_score: number; // weight: 0.25
  weights: {
    linguistic: number;
    source: number;
    corroboration: number;
  };
}

export interface SentenceAIScore {
  sentence_index: number;
  text: string;
  ai_probability: number;
  classification: "human" | "mixed" | "synthetic";
  burstiness: number;
  perplexity_score: number;
  detected_markers: string[];
}

export interface ForensicStylometrics {
  burstiness_score: number;
  burstiness_classification: "low_burstiness" | "moderate" | "high_burstiness";
  perplexity_estimate: number;
  perplexity_classification: "highly_predictable" | "moderate" | "natural_unpredictable";
  lexical_diversity: number;
  shannon_entropy: number;
  synthetic_marker_count: number;
  synthetic_markers_found: string[];
  sentence_analyses: SentenceAIScore[];
}

/** Full analysis result returned by POST /api/v1/analyse */
export interface AnalysisResult {
  id: string;
  status: "complete" | "error";
  input_type: "text" | "url" | "upload";
  submitted_at: string; // ISO 8601
  /** Weighted ensemble score (0–100) */
  overall_score: number;
  /** Probability that the content is AI-generated (0–100) */
  ai_probability: number;
  scores: WeightedScores;
  xai_annotations: XAIAnnotation[];
  sources: SourceResult[];
  claims: ClaimResult[];
  linguistic_flags: LinguisticFlag[];
  /** One-sentence human-readable summary of the result */
  summary: string;
  /** Deep AI Text Detection & Forensic Stylometrics breakdown */
  ai_forensics?: ForensicStylometrics;
}

/** Payload for POST /api/v1/analyse */
export interface AnalyseRequest {
  content: string;
  type: "text" | "url" | "upload";
}

/** Formal Credibility Audit Certificate */
export interface AuditCertificateResponse {
  certificate_id: string;
  verification_id: string;
  issued_at: string;
  content_hash: string;
  target_summary: string;
  input_type: string;
  overall_score: number;
  verdict_label: string;
  confidence_interval: number;
  scores: WeightedScores;
  ai_probability: number;
  claims_verified: number;
  claims_total: number;
  top_sources: string[];
  digital_signature: string;
  issuer: string;
  standard: string;
  verification_url: string;
}
