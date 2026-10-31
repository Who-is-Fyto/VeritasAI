/**
 * VeritasAI Account Tier Architecture and Feature Gating
 * ────────────────────────────────────────────────────────
 * Formalizes commercial and academic account tiers for examiner defense:
 * 1. Community Free Tier: 5 daily verifications, standard RoBERTa inference.
 * 2. Pro Journalist Tier: Unlimited verifications, PDF export, priority queue, developer API keys.
 * 3. Academic & Enterprise Tier: Unlimited verifications, team workspaces, self-training fine-tuning loop.
 * 4. Super Administrator: Full system governance, telemetry, and in-UI backup/restore.
 */

export type AccountTier = "free" | "pro" | "academic" | "admin" | "superadmin";

export interface TierConfig {
  id: AccountTier;
  name: string;
  badgeLabel: string;
  badgeClass: string;
  price: string;
  period: string;
  dailyLimit: number;
  allowsPdfExport: boolean;
  allowsDeepCorroboration: boolean;
  allowsModelRetraining: boolean;
  allowsDeveloperApiKeys: boolean;
  allowsPriorityQueue: boolean;
  allowsTeamWorkspaces: boolean;
  description: string;
  features: string[];
}

export const TIER_CONFIGS: Record<AccountTier, TierConfig> = {
  free: {
    id: "free",
    name: "Community / Free",
    badgeLabel: "Free Tier",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    price: "$0",
    period: "forever",
    dailyLimit: 5,
    allowsPdfExport: false,
    allowsDeepCorroboration: false,
    allowsModelRetraining: false,
    allowsDeveloperApiKeys: false,
    allowsPriorityQueue: false,
    allowsTeamWorkspaces: false,
    description: "Designed for everyday media consumers and students performing basic fact checks.",
    features: [
      "5 daily credibility verifications",
      "RoBERTa stylometric NLP analysis",
      "Standard domain authority scoring",
      "Public news wire corroboration (AP, Reuters, BBC)",
      "Sentence-level Truth Map highlights",
    ],
  },
  pro: {
    id: "pro",
    name: "Journalist & Pro",
    badgeLabel: "Pro Journalist",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-500/20",
    price: "$19",
    period: "per month",
    dailyLimit: Infinity,
    allowsPdfExport: true,
    allowsDeepCorroboration: true,
    allowsModelRetraining: false,
    allowsDeveloperApiKeys: true,
    allowsPriorityQueue: true,
    allowsTeamWorkspaces: false,
    description: "Built for newsroom editors, investigative reporters, and media analysts.",
    features: [
      "Unlimited daily credibility verifications",
      "Priority queue inference (< 3s response)",
      "Exportable PDF Audit Certificates with unique Verification IDs",
      "Deep cross-reference news corroboration",
      "Full claim-by-claim verdict breakdown accordions",
      "Developer REST API keys (up to 5 active keys)",
    ],
  },
  academic: {
    id: "academic",
    name: "Academic / Research Seat",
    badgeLabel: "Academic Seat",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200 ring-1 ring-indigo-500/20",
    price: "$49",
    period: "per seat / mo",
    dailyLimit: Infinity,
    allowsPdfExport: true,
    allowsDeepCorroboration: true,
    allowsModelRetraining: true,
    allowsDeveloperApiKeys: true,
    allowsPriorityQueue: true,
    allowsTeamWorkspaces: true,
    description: "For university research labs, intelligence analysts, and academic institutions.",
    features: [
      "All Pro Journalist tier capabilities included",
      "Active learning self-training feedback loop trigger",
      "Automatic domain affiliation (.edu, .ac.za, .ac.uk)",
      "Unlimited developer API keys with high rate limits",
      "Institutional team workspaces and audit logging",
      "Research methodology and weights export",
    ],
  },
  admin: {
    id: "admin",
    name: "System Administrator",
    badgeLabel: "Admin",
    badgeClass: "bg-indigo-50 text-indigo-800 border-indigo-300 ring-1 ring-indigo-500/30",
    price: "Operational",
    period: "system role",
    dailyLimit: Infinity,
    allowsPdfExport: true,
    allowsDeepCorroboration: true,
    allowsModelRetraining: false,
    allowsDeveloperApiKeys: true,
    allowsPriorityQueue: true,
    allowsTeamWorkspaces: true,
    description: "Operational management: customer account tiers, user moderation, telemetry, and audit logs.",
    features: [
      "User moderation and account status controls",
      "Customer tier elevation and quota management",
      "Real-time database health and query latency telemetry",
      "Comprehensive system audit logs review",
      "Unlimited daily credibility verifications",
      "Exportable PDF Audit Certificates",
    ],
  },
  superadmin: {
    id: "superadmin",
    name: "Super Administrator",
    badgeLabel: "Super Admin",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-500/30",
    price: "Institutional",
    period: "system role",
    dailyLimit: Infinity,
    allowsPdfExport: true,
    allowsDeepCorroboration: true,
    allowsModelRetraining: true,
    allowsDeveloperApiKeys: true,
    allowsPriorityQueue: true,
    allowsTeamWorkspaces: true,
    description: "Complete administrative governance, database telemetry, and in-UI system recovery.",
    features: [
      "All platform capabilities unlocked",
      "User account administration and tier modification",
      "In-UI database snapshot and one-click restore engine",
      "Server health and query latency telemetry",
      "Model fine-tuning execution and loss tracking",
      "Comprehensive system audit logs",
    ],
  },
};

/**
 * Resolves normalized AccountTier from user metadata.
 */
export function resolveTier(user?: {
  tier?: string;
  account_type?: string;
  role?: string;
  email?: string;
} | null): AccountTier {
  if (!user) return "free";

  // Check explicit tier property first
  const explicitTier = (user.tier || "").toLowerCase();
  if (explicitTier === "superadmin") return "superadmin";
  if (explicitTier === "admin") return "admin";
  if (explicitTier === "pro" || explicitTier === "paid") return "pro";
  if (explicitTier === "academic") return "academic";
  if (explicitTier === "free") return "free";

  // Check role
  const roleLower = (user.role || "").toLowerCase();
  if (roleLower === "superadmin") return "superadmin";
  if (roleLower === "admin") return "admin";

  // Canonical admin seed accounts
  const emailLower = (user.email || "").toLowerCase().trim();
  if (emailLower === "superadmin@veritas.ai" || emailLower === "admin@veritas.ai") {
    return "superadmin";
  }

  // Check legacy account_type
  const accType = (user.account_type || "").toLowerCase();
  if (accType === "academic") return "academic";
  if (accType === "enterprise") return "pro";

  return "free";
}

/**
 * Gets tier configuration for a given tier.
 */
export function getTierConfig(tier: AccountTier): TierConfig {
  return TIER_CONFIGS[tier] || TIER_CONFIGS.free;
}

/**
 * Retrieves daily quota usage and limits for the user.
 */
export function getDailyQuotaStatus(tier: AccountTier, userId?: string): {
  used: number;
  limit: number;
  remaining: number;
  hasQuota: boolean;
  isUnlimited: boolean;
} {
  const config = getTierConfig(tier);
  if (config.dailyLimit === Infinity) {
    return {
      used: 0,
      limit: Infinity,
      remaining: Infinity,
      hasQuota: true,
      isUnlimited: true,
    };
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const storageKey = `veritas_scans_${todayStr}_${userId || "guest"}`;
  const used = parseInt(localStorage.getItem(storageKey) || "0", 10);
  const remaining = Math.max(0, config.dailyLimit - used);

  return {
    used,
    limit: config.dailyLimit,
    remaining,
    hasQuota: remaining > 0,
    isUnlimited: false,
  };
}

/**
 * Records an analysis execution against the user's daily quota.
 */
export function recordScanUsage(userId?: string): number {
  const todayStr = new Date().toISOString().split("T")[0];
  const storageKey = `veritas_scans_${todayStr}_${userId || "guest"}`;
  const current = parseInt(localStorage.getItem(storageKey) || "0", 10);
  const next = current + 1;
  localStorage.setItem(storageKey, next.toString());
  return next;
}

/**
 * Resets daily quota (useful for testing or examiners).
 */
export function resetDailyQuota(userId?: string): void {
  const todayStr = new Date().toISOString().split("T")[0];
  const storageKey = `veritas_scans_${todayStr}_${userId || "guest"}`;
  localStorage.setItem(storageKey, "0");
}
