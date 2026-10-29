import React from "react";
import { motion } from "motion/react";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Info,
  HelpCircle,
} from "lucide-react";
import {
  CredibilityTier,
  getCredibilityConfig,
  CredibilityConfig,
} from "../../utils/credibilityTheme";

export interface CredibilityGaugeProps {
  /** The 0-100 Credibility Index score */
  score: number;
  /** 95% Confidence Interval error margin (default: 2.5%) */
  confidenceInterval?: number;
  /** Size variant of the gauge */
  size?: "sm" | "md" | "lg";
  /** Whether to show the PolitiFact-style 4-segment rating strip below */
  showTruthOMeter?: boolean;
  /** Whether to show the outer 95% Confidence Interval arc band */
  showConfidenceInterval?: boolean;
  /** Whether to show numerical tick labels around the dial */
  showTicks?: boolean;
  /** Optional container class name */
  className?: string;
  /** Optional callback when user clicks a tier in the rating strip */
  onTierClick?: (tier: CredibilityTier) => void;
}

export interface TruthTierConfig {
  tier: CredibilityTier;
  name: string;
  shortLabel: string;
  min: number;
  max: number;
  color: string;
  bgLight: string;
  bgActive: string;
  borderActive: string;
  textActive: string;
  iconName: "ShieldAlert" | "AlertTriangle" | "CheckCircle2" | "ShieldCheck";
  description: string;
}

export const TRUTH_TIERS: TruthTierConfig[] = [
  {
    tier: "manipulated",
    name: "High Risk / Manipulated",
    shortLabel: "Manipulated",
    min: 0,
    max: 39,
    color: "#dc2626", // Crimson 600
    bgLight: "#fef2f2",
    bgActive: "bg-rose-50 border-rose-500 text-rose-900",
    borderActive: "#dc2626",
    textActive: "text-rose-700",
    iconName: "ShieldAlert",
    description: "Debunked assertions, high synthetic/deceptive stylometry, or blacklisted disinfo domain.",
  },
  {
    tier: "caution",
    name: "Unverified / Caution",
    shortLabel: "Caution",
    min: 40,
    max: 59,
    color: "#d97706", // Amber 600
    bgLight: "#fffbeb",
    bgActive: "bg-amber-50 border-amber-500 text-amber-900",
    borderActive: "#d97706",
    textActive: "text-amber-700",
    iconName: "AlertTriangle",
    description: "Unverified assertions, emotional hyperbole, or source transparency concerns.",
  },
  {
    tier: "likely_credible",
    name: "Mostly Factual",
    shortLabel: "Likely Factual",
    min: 60,
    max: 79,
    color: "#2563eb", // Blue 600
    bgLight: "#eff6ff",
    bgActive: "bg-blue-50 border-blue-500 text-blue-900",
    borderActive: "#2563eb",
    textActive: "text-blue-700",
    iconName: "CheckCircle2",
    description: "Core claims align with verified reporting; minor stylistic qualifications.",
  },
  {
    tier: "verified",
    name: "Verified Factual",
    shortLabel: "Verified",
    min: 80,
    max: 100,
    color: "#059669", // Emerald 600
    bgLight: "#ecfdf5",
    bgActive: "bg-emerald-50 border-emerald-500 text-emerald-900",
    borderActive: "#059669",
    textActive: "text-emerald-700",
    iconName: "ShieldCheck",
    description: "Extensively corroborated by primary wire services with objective journalistic syntax.",
  },
];

const ICON_MAP = {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
};

/**
 * Polar to Cartesian coordinates for SVG semi-circle gauge.
 * 0 score = 180° (left)
 * 50 score = 90° (top)
 * 100 score = 0° (right)
 */
function polarToCartesian(cx: number, cy: number, radius: number, score: number) {
  const clamped = Math.max(0, Math.min(100, score));
  const deg = 180 * (1 - clamped / 100);
  const rad = (deg * Math.PI) / 180;
  return {
    x: Number((cx + radius * Math.cos(rad)).toFixed(2)),
    y: Number((cy - radius * Math.sin(rad)).toFixed(2)),
  };
}

/**
 * Generate SVG arc path from startScore to endScore.
 * Clockwise sweep (sweep-flag = 1) along top semicircle.
 */
function describeArc(cx: number, cy: number, radius: number, startScore: number, endScore: number) {
  const start = polarToCartesian(cx, cy, radius, startScore);
  const end = polarToCartesian(cx, cy, radius, endScore);
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${end.x} ${end.y}`;
}

export function CredibilityGauge({
  score,
  confidenceInterval = 2.5,
  size = "lg",
  showTruthOMeter = true,
  showConfidenceInterval = true,
  showTicks = true,
  className = "",
  onTierClick,
}: CredibilityGaugeProps) {
  const boundedScore = Math.max(0, Math.min(100, Number(score) || 0));
  const config: CredibilityConfig = getCredibilityConfig(boundedScore);
  const ActiveIcon = ICON_MAP[config.iconName];

  // SVG Geometry constants
  const cx = 160;
  const cy = 145;
  const radius = 95;
  const strokeWidth = 16;

  // Needle target angle: -90° (score 0, far left) to +90° (score 100, far right)
  const targetAngle = -90 + (boundedScore / 100) * 180;

  // Confidence interval bounds
  const ciVal = Math.max(0.5, Math.min(15, confidenceInterval));
  const ciLow = Math.max(0, boundedScore - ciVal);
  const ciHigh = Math.min(100, boundedScore + ciVal);
  const ciArcPath = describeArc(cx, cy, radius + 14, ciLow, ciHigh);

  // Tick markers (Major: 0, 20, 40, 60, 80, 100; Minor: 10, 30, 50, 70, 90)
  const majorTicks = [0, 20, 40, 60, 80, 100];
  const minorTicks = [10, 30, 50, 70, 90];

  // Width sizing
  const containerWidthClass =
    size === "sm" ? "max-w-[220px]" : size === "md" ? "max-w-[280px]" : "max-w-[340px]";

  return (
    <div
      role="meter"
      aria-valuenow={boundedScore}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={config.ariaLabel}
      className={`flex flex-col items-center select-none ${containerWidthClass} ${className}`}
    >
      {/* SVG Dial Container */}
      <div className="relative w-full aspect-[320/195]">
        <svg
          viewBox="0 0 320 195"
          className="w-full h-full overflow-visible"
          aria-hidden="true"
        >
          <defs>
            {/* Subtle drop shadow for needle */}
            <filter id="veritas-needle-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0f172a" floodOpacity="0.35" />
            </filter>

            {/* Glowing confidence interval filter */}
            <filter id="veritas-ci-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Groove / Track */}
          <path
            d={describeArc(cx, cy, radius, 0, 100)}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
          />

          {/* Segment 1: Manipulated (0 - 39) */}
          <path
            d={describeArc(cx, cy, radius, 0, 39)}
            fill="none"
            stroke="#dc2626"
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
            opacity={config.tier === "manipulated" ? 1 : 0.85}
          />

          {/* Segment 2: Caution (40 - 59) */}
          <path
            d={describeArc(cx, cy, radius, 40, 59)}
            fill="none"
            stroke="#d97706"
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
            opacity={config.tier === "caution" ? 1 : 0.85}
          />

          {/* Segment 3: Mostly Factual (60 - 79) */}
          <path
            d={describeArc(cx, cy, radius, 60, 79)}
            fill="none"
            stroke="#2563eb"
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
            opacity={config.tier === "likely_credible" ? 1 : 0.85}
          />

          {/* Segment 4: Verified Factual (80 - 100) */}
          <path
            d={describeArc(cx, cy, radius, 80, 100)}
            fill="none"
            stroke="#059669"
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
            opacity={config.tier === "verified" ? 1 : 0.85}
          />

          {/* Segment Dividers (crisp white division lines between bands) */}
          {[39.5, 59.5, 79.5].map((divScore) => {
            const pInner = polarToCartesian(cx, cy, radius - strokeWidth / 2 - 2, divScore);
            const pOuter = polarToCartesian(cx, cy, radius + strokeWidth / 2 + 2, divScore);
            return (
              <line
                key={`div-${divScore}`}
                x1={pInner.x}
                y1={pInner.y}
                x2={pOuter.x}
                y2={pOuter.y}
                stroke="#ffffff"
                strokeWidth={3}
                strokeLinecap="round"
              />
            );
          })}

          {/* 95% Confidence Interval Arc Overlay */}
          {showConfidenceInterval && (
            <g filter="url(#veritas-ci-glow)">
              <path
                d={ciArcPath}
                fill="none"
                stroke={config.colorHex}
                strokeWidth={4.5}
                strokeOpacity={0.85}
                strokeLinecap="round"
              />
              {/* Left bracket marker */}
              {(() => {
                const p1 = polarToCartesian(cx, cy, radius + 11, ciLow);
                const p2 = polarToCartesian(cx, cy, radius + 17, ciLow);
                return (
                  <line
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke={config.colorHex}
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                );
              })()}
              {/* Right bracket marker */}
              {(() => {
                const p1 = polarToCartesian(cx, cy, radius + 11, ciHigh);
                const p2 = polarToCartesian(cx, cy, radius + 17, ciHigh);
                return (
                  <line
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke={config.colorHex}
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                );
              })()}
            </g>
          )}

          {/* Major Ticks & Numerical Labels */}
          {showTicks && size !== "sm" && (
            <g className="text-slate-400">
              {majorTicks.map((t) => {
                const p1 = polarToCartesian(cx, cy, radius + 5, t);
                const p2 = polarToCartesian(cx, cy, radius + 10, t);
                const textPos = polarToCartesian(cx, cy, radius + 21, t);
                return (
                  <g key={`major-${t}`}>
                    <line
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke="#94a3b8"
                      strokeWidth={1.5}
                      strokeLinecap="round"
                    />
                    <text
                      x={textPos.x}
                      y={textPos.y + 3.5}
                      textAnchor="middle"
                      className="text-[10px] font-mono font-semibold fill-slate-500"
                    >
                      {t}
                    </text>
                  </g>
                );
              })}

              {minorTicks.map((t) => {
                const p1 = polarToCartesian(cx, cy, radius + 5, t);
                const p2 = polarToCartesian(cx, cy, radius + 8, t);
                return (
                  <line
                    key={`minor-${t}`}
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke="#cbd5e1"
                    strokeWidth={1}
                    strokeLinecap="round"
                  />
                );
              })}
            </g>
          )}

          {/* Animated Speedometer Needle */}
          <motion.g
            initial={{ rotate: -90 }}
            animate={{ rotate: targetAngle }}
            transition={{
              type: "spring",
              stiffness: 75,
              damping: 14,
              mass: 0.8,
            }}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
            filter="url(#veritas-needle-shadow)"
          >
            {/* Needle Left Bevel (Highlight) */}
            <polygon
              points={`${cx - 3.5},${cy} ${cx},${cy - 92} ${cx},${cy}`}
              fill="#334155"
            />
            {/* Needle Right Bevel (Shadow) */}
            <polygon
              points={`${cx + 3.5},${cy} ${cx},${cy - 92} ${cx},${cy}`}
              fill="#0f172a"
            />
            {/* Needle Tip Diamond in Tier Color */}
            <polygon
              points={`${cx},${cy - 96} ${cx + 3},${cy - 91} ${cx},${cy - 86} ${cx - 3},${cy - 91}`}
              fill={config.colorHex}
            />
            {/* Hub Bezel Outer Ring */}
            <circle
              cx={cx}
              cy={cy}
              r={12}
              fill="#1e293b"
              stroke="#64748b"
              strokeWidth={1.5}
            />
            {/* Hub Inner Core */}
            <circle cx={cx} cy={cy} r={7} fill="#0b0f19" />
            {/* Hub Center Jewel */}
            <circle cx={cx} cy={cy} r={3} fill={config.colorHex} />
          </motion.g>
        </svg>
      </div>

      {/* Numeric Score Readout & CI Badge */}
      <div className="flex flex-col items-center mt-[-14px] text-center w-full">
        <div className="flex items-baseline gap-1.5">
          <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
            {boundedScore.toFixed(1)}
          </span>
          <span className="text-slate-400 font-bold text-sm">/ 100</span>
        </div>

        {/* Dual-marker verdict pill */}
        <div className="flex items-center flex-wrap justify-center gap-2 mt-2">
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all ${config.badgeClass}`}
          >
            <ActiveIcon className="w-3.5 h-3.5" />
            <span>{config.verdict}</span>
          </div>

          {showConfidenceInterval && (
            <div
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium text-slate-600 bg-slate-100 border border-slate-200 shadow-2xs"
              title={`95% Confidence Interval: [${ciLow.toFixed(1)}% – ${ciHigh.toFixed(1)}%]. Synthesized across RoBERTa NLP inference, publisher credibility records, and multi-source wire cross-examination.`}
            >
              <Info className="w-3 h-3 text-slate-400" />
              <span>±{ciVal.toFixed(1)}% (95% CI)</span>
            </div>
          )}
        </div>
      </div>

      {/* PolitiFact Truth-O-Meter Segmented Rating Strip */}
      {showTruthOMeter && (
        <div className="w-full mt-5 pt-3.5 border-t border-slate-200/80">
          <div className="flex items-center justify-between mb-2 px-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Truth-O-Meter Spectrum
            </span>
            <span className="text-[10px] font-mono font-semibold text-slate-500">
              Zone: <span style={{ color: config.colorHex }}>{config.shortLabel}</span>
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {TRUTH_TIERS.map((t) => {
              const isActive = t.tier === config.tier;
              const TierIcon = ICON_MAP[t.iconName];
              return (
                <button
                  type="button"
                  key={t.tier}
                  onClick={() => onTierClick?.(t.tier)}
                  title={`${t.name} (${t.min}–${t.max}%): ${t.description}`}
                  className={`relative flex flex-col items-center text-center px-1.5 py-2 rounded-lg transition-all border text-left ${
                    isActive
                      ? `${t.bgActive} border-2 shadow-xs ring-1 ring-black/5`
                      : "bg-slate-50/80 border-slate-200 text-slate-500 hover:bg-slate-100/90 cursor-pointer"
                  }`}
                >
                  {/* Active Caret Pointer */}
                  {isActive && (
                    <div
                      className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-b-4"
                      style={{ borderBottomColor: t.color }}
                    />
                  )}
                  <div className="flex items-center gap-1 mb-0.5">
                    <TierIcon
                      className={`w-3 h-3 shrink-0 ${
                        isActive ? t.textActive : "text-slate-400"
                      }`}
                    />
                    <span
                      className={`text-[10px] font-bold truncate ${
                        isActive ? "text-slate-900" : "text-slate-600"
                      }`}
                    >
                      {t.shortLabel}
                    </span>
                  </div>
                  <span
                    className={`text-[9px] font-mono font-medium ${
                      isActive ? t.textActive : "text-slate-400"
                    }`}
                  >
                    {t.min}–{t.max}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
