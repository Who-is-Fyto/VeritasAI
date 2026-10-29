import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Globe,
  ExternalLink,
  Lock,
  Calendar,
  Building2,
  Scale,
  FileText,
  ChevronDown,
  ChevronUp,
  Info,
  Layers,
} from "lucide-react";
import {
  PublisherNutritionProfile,
  NutritionStandard,
  getSourceNutritionProfile,
} from "../../utils/sourceNutrition";

export interface SourceItem {
  name: string;
  credibility: number;
  status?: string;
  url?: string;
  matches?: number;
}

export interface SourceNutritionLabelProps {
  sources: SourceItem[];
  overallSourceScore?: number;
  className?: string;
}

export function SourceNutritionLabel({
  sources,
  overallSourceScore,
  className = "",
}: SourceNutritionLabelProps) {
  // Default to first source or fallback
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [activeCategory, setActiveCategory] = useState<"all" | "credibility" | "transparency">("all");
  const [expandedStandardId, setExpandedStandardId] = useState<string | null>(null);

  // If no sources provided, fallback to default
  const activeSourceItem =
    sources && sources.length > 0
      ? sources[selectedIdx] || sources[0]
      : { name: "Primary Publisher", credibility: overallSourceScore ?? 75 };

  const profile: PublisherNutritionProfile = getSourceNutritionProfile(activeSourceItem);

  // Filter standards by active tab
  const filteredStandards = profile.standards.filter((s) => {
    if (activeCategory === "all") return true;
    return s.category === activeCategory;
  });

  const passedCount = profile.standards.filter((s) => s.passed).length;
  const totalCount = profile.standards.length;

  return (
    <div className={`bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm clip-corner-lg ${className}`}>
      {/* Header with Title and Model Weight */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-200/80">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-lg">Source Authority Nutrition Label</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 uppercase">
                35% Model Weight
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              NewsGuard-inspired journalistic accountability checklist and publisher audit.
            </p>
          </div>
        </div>

        {/* Aggregate Score Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase font-mono font-bold text-slate-400">
              Composite Source Rating
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black font-mono text-slate-900">
                {overallSourceScore ?? Math.round(profile.trustScore)}
              </span>
              <span className="text-xs font-semibold text-slate-400">/ 100</span>
            </div>
          </div>
        </div>
      </div>

      {/* Publisher Selector Tabs (if multiple publishers detected) */}
      {sources && sources.length > 1 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Evaluated Publishers ({sources.length})
            </span>
            <span className="text-[10px] text-slate-400">
              Select publisher to inspect individual nutrition label
            </span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {sources.map((src, idx) => {
              const isSelected = idx === selectedIdx;
              const isHighTrust = src.credibility >= 80;
              const isMedTrust = src.credibility >= 60;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedIdx(idx)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap border ${
                    isSelected
                      ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  <Globe className={`w-3.5 h-3.5 ${isSelected ? "text-indigo-300" : "text-slate-400"}`} />
                  <span className="font-semibold">{src.name}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : isHighTrust
                        ? "bg-emerald-100 text-emerald-800"
                        : isMedTrust
                        ? "bg-blue-100 text-blue-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {Math.round(src.credibility)}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── NewsGuard Nutrition Label Physical Card Container ── */}
      <div className="border-2 border-slate-900 rounded-xl overflow-hidden shadow-xs">
        {/* Iconic Heavy Black Header Bar */}
        <div className="bg-slate-900 text-white px-5 py-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                Official Credibility Standard
              </div>
              <h4 className="text-xl sm:text-2xl font-black tracking-tight leading-none text-white uppercase font-sans">
                Publisher Nutrition Facts
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-300">
                Audit Standard: IFCN & NewsGuard 9-Point
              </span>
            </div>
          </div>
        </div>

        {/* Primary Meta & Overall Trust Rating */}
        <div className="p-5 bg-slate-50/70 border-b-2 border-slate-900">
          <div className="grid sm:grid-cols-12 gap-5 items-center">
            {/* Publisher Info */}
            <div className="sm:col-span-7 space-y-1.5">
              <div className="flex items-center gap-2">
                <h5 className="text-lg font-black text-slate-900">{profile.name}</h5>
                <a
                  href={`https://${profile.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-0.5"
                >
                  <span>{profile.domain}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong className="text-slate-800">Ownership:</strong> {profile.ownership}
              </p>
              <div className="flex items-center flex-wrap gap-2 pt-1 text-[11px]">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-medium">
                  <Building2 className="w-3 h-3 text-slate-400" />
                  {profile.headquarters}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-medium">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  Est. {profile.foundedYear} ({profile.domainAgeYears} yrs online)
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-medium">
                  <Scale className="w-3 h-3 text-slate-400" />
                  {profile.bias}
                </span>
              </div>
            </div>

            {/* Score & Verdict Stamp */}
            <div className="sm:col-span-5 flex flex-col items-start sm:items-end sm:border-l sm:border-slate-300/80 sm:pl-5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Credibility Nutrition Score
              </span>
              <div className="flex items-baseline gap-1.5 mb-2">
                <span className="text-4xl font-black font-mono tracking-tight text-slate-900">
                  {profile.trustScore}
                </span>
                <span className="text-sm font-bold text-slate-400">/ 100</span>
              </div>

              {/* Status Pill */}
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                  profile.trustScore >= 80
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                    : profile.trustScore >= 60
                    ? "bg-blue-50 text-blue-800 border-blue-300"
                    : "bg-rose-50 text-rose-800 border-rose-300"
                }`}
              >
                {profile.trustScore >= 80 ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                ) : profile.trustScore >= 60 ? (
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                )}
                <span>{profile.trustStatus}</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono mt-1">
                Passes {passedCount} of {totalCount} journalistic criteria
              </span>
            </div>
          </div>
        </div>

        {/* ── Technical Infrastructure & Security Bar ── */}
        <div className="bg-slate-100/90 px-5 py-2.5 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1 text-slate-700">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-semibold">Security:</span>
              <span className="font-mono text-[11px] text-slate-600">{profile.sslSecurity}</span>
            </div>
            <div className="flex items-center gap-1 text-slate-700">
              <span className="font-semibold">DNSSEC:</span>
              <span className="font-mono text-[11px] text-slate-600">
                {profile.dnssec ? "Active & Signed" : "Unsigned / Standard"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-600 font-medium">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>Fact-Check Record: {profile.factCheckRecord}</span>
          </div>
        </div>

        {/* ── Category Filter Tabs ── */}
        <div className="px-5 pt-4 pb-2 bg-white flex items-center justify-between flex-wrap gap-2 border-b border-slate-100">
          <div className="flex items-center gap-1.5">
            {[
              { id: "all", label: "All Standards (9)" },
              { id: "credibility", label: "Credibility & Content (5)" },
              { id: "transparency", label: "Transparency & Governance (4)" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategory(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  activeCategory === tab.id
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <span className="text-[11px] text-slate-400 font-mono">
            Click criterion to view detailed AI audit rationale
          </span>
        </div>

        {/* ── 9 NewsGuard Standards Checklist ── */}
        <div className="divide-y divide-slate-100 bg-white">
          {filteredStandards.map((std) => {
            const isExpanded = expandedStandardId === std.id;
            return (
              <div
                key={std.id}
                className="transition-colors hover:bg-slate-50/70"
              >
                <div
                  onClick={() => setExpandedStandardId(isExpanded ? null : std.id)}
                  className="px-5 py-3.5 flex items-start justify-between gap-4 cursor-pointer select-none"
                >
                  {/* Left: Status Icon and Title */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="mt-0.5 shrink-0">
                      {std.passed ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center">
                          <XCircle className="w-4 h-4 text-rose-600" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900">
                          {std.title}
                        </span>
                        <span
                          className={`px-2 py-0.2 rounded text-[10px] font-mono font-bold ${
                            std.passed
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {std.passed ? `+${std.points} pts` : `0 / ${std.points} pts`}
                        </span>
                        <span className="text-[10px] font-mono uppercase text-slate-400">
                          {std.category === "credibility" ? "Content Integrity" : "Governance"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                        {std.description}
                      </p>
                    </div>
                  </div>

                  {/* Right: Expand Toggle */}
                  <div className="flex items-center gap-1.5 text-slate-400 shrink-0 mt-1">
                    <span className="text-[11px] font-mono hidden sm:inline">
                      {isExpanded ? "Collapse" : "Rationale"}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </div>

                {/* Expanded Inspection Rationale Box */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-4 pt-1 bg-slate-50/90 border-t border-slate-100 text-xs">
                        <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-indigo-600" />
                              VeritasAI Audit Finding & Evidence
                            </span>
                            <span
                              className={`text-[11px] font-bold ${
                                std.passed ? "text-emerald-700" : "text-rose-700"
                              }`}
                            >
                              {std.passed ? "STANDARD COMPLIANT" : "STANDARD NON-COMPLIANT"}
                            </span>
                          </div>
                          <p className="text-slate-700 leading-relaxed font-sans">
                            {std.evaluationNote}
                          </p>
                          <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                            <span>Standard Weighting: {std.points} points</span>
                            <span>Scored via MediaBias/FactCheck & WHOIS Registry Probes</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Footer Note */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <span>
            Scored by VeritasAI Source Authority Ensemble · Corroborated with MediaBias/FactCheck records
          </span>
          <span className="font-mono font-bold text-slate-700">
            Total Points: {profile.trustScore} / 100
          </span>
        </div>
      </div>
    </div>
  );
}
