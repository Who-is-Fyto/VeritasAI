/**
 * VeritasAI Credibility Semantic Theme & Accessibility Utility
 *
 * Provides authoritative visual design tokens and accessibility mappings for
 * Credibility Index scores, XAI annotations, and dimension breakdowns.
 *
 * Complies with WCAG 2.1 AA contrast requirements and guarantees that every
 * score/color is permanently paired with dedicated iconography and text labels.
 */

export type CredibilityTier = 'verified' | 'likely_credible' | 'caution' | 'manipulated';

export interface CredibilityConfig {
  tier: CredibilityTier;
  label: string;
  shortLabel: string;
  verdict: string;
  description: string;
  colorHex: string;
  bgHex: string;
  borderHex: string;
  badgeClass: string;
  barClass: string;
  iconName: 'ShieldCheck' | 'CheckCircle2' | 'AlertTriangle' | 'ShieldAlert';
  ariaLabel: string;
}

export function getCredibilityConfig(score: number): CredibilityConfig {
  const boundedScore = Math.max(0, Math.min(100, Math.round(score)));

  if (boundedScore >= 80) {
    return {
      tier: 'verified',
      label: 'High Credibility',
      shortLabel: 'Verified',
      verdict: 'Factual & Authoritative',
      description: 'Extensively corroborated by primary news agencies with clean, objective stylometry.',
      colorHex: '#059669', // Emerald 600
      bgHex: '#ecfdf5',    // Emerald 50
      borderHex: '#a7f3d0',// Emerald 200
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-sm',
      barClass: 'bg-emerald-500',
      iconName: 'ShieldCheck',
      ariaLabel: `Score ${boundedScore} out of 100: High Credibility, verified and authoritative.`,
    };
  }

  if (boundedScore >= 60) {
    return {
      tier: 'likely_credible',
      label: 'Moderate Credibility',
      shortLabel: 'Likely Factual',
      verdict: 'Mostly Factual / Minor Bias',
      description: 'Core claims align with verified reporting; minor sensationalist or opinion markers detected.',
      colorHex: '#2563eb', // Blue 600
      bgHex: '#eff6ff',    // Blue 50
      borderHex: '#bfdbfe',// Blue 200
      badgeClass: 'bg-blue-50 text-blue-800 border-blue-300 shadow-sm',
      barClass: 'bg-blue-500',
      iconName: 'CheckCircle2',
      ariaLabel: `Score ${boundedScore} out of 100: Moderate Credibility, mostly factual with minor bias.`,
    };
  }

  if (boundedScore >= 40) {
    return {
      tier: 'caution',
      label: 'Unverified / Caution',
      shortLabel: 'Caution',
      verdict: 'Unsubstantiated / Ambiguous',
      description: 'Contains unverified assertions, emotional hyperbole, or domain authority red flags.',
      colorHex: '#d97706', // Amber 600
      bgHex: '#fffbeb',    // Amber 50
      borderHex: '#fde68a',// Amber 200
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 shadow-sm',
      barClass: 'bg-amber-500',
      iconName: 'AlertTriangle',
      ariaLabel: `Score ${boundedScore} out of 100: Caution, unverified or conflicting information detected.`,
    };
  }

  return {
    tier: 'manipulated',
    label: 'High Risk / Manipulated',
    shortLabel: 'Manipulated',
    verdict: 'Debunked / AI Deception Marker',
    description: 'High probability of fabricated claims, synthetic manipulation, or blacklisted disinfo domain.',
    colorHex: '#dc2626', // Red 600
    bgHex: '#fef2f2',    // Red 50
    borderHex: '#fecaca',// Red 200
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-300 shadow-sm',
    barClass: 'bg-rose-600',
    iconName: 'ShieldAlert',
    ariaLabel: `Score ${boundedScore} out of 100: High Risk, manipulated or false claims identified.`,
  };
}

export interface DimensionConfig {
  id: 'linguistic' | 'source' | 'corroboration';
  title: string;
  weightLabel: string;
  weightPct: number;
  engineName: string;
  description: string;
  iconName: 'Cpu' | 'Scale' | 'Search';
}

export const DIMENSION_CONFIGS: Record<string, DimensionConfig> = {
  linguistic: {
    id: 'linguistic',
    title: 'Linguistic Stylometry',
    weightLabel: '40% Model Weight',
    weightPct: 40,
    engineName: 'RoBERTa Transformer NLP',
    description: 'Analyzes syntactic complexity, emotional sentiment, hyperbole, and synthetic text signatures.',
    iconName: 'Cpu',
  },
  source: {
    id: 'source',
    title: 'Source Authority',
    weightLabel: '35% Model Weight',
    weightPct: 35,
    engineName: 'MediaBias & Editorial Audit',
    description: 'Verifies publisher domain credibility, ownership disclosure, and history of journalistic retractions.',
    iconName: 'Scale',
  },
  corroboration: {
    id: 'corroboration',
    title: 'External Corroboration',
    weightLabel: '25% Model Weight',
    weightPct: 25,
    engineName: 'Real-Time NewsAPI & Wire Aggregator',
    description: 'Cross-checks factual assertions against peer-reviewed wires (Reuters, AP, BBC, AFP).',
    iconName: 'Search',
  },
};
