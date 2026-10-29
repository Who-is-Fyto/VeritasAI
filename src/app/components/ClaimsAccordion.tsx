"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  Quote,
  ShieldCheck,
  BookOpen,
  Filter,
  Layers,
  Calendar,
  Sparkles
} from "lucide-react";
import { ClaimResult } from "../../types/analysis";

interface ClaimsAccordionProps {
  claims: ClaimResult[];
  className?: string;
}

type FilterStatus = "all" | "verified" | "false" | "unverified";

export function ClaimsAccordion({ claims, className = "" }: ClaimsAccordionProps) {
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [expandedClaims, setExpandedClaims] = useState<Record<number, boolean>>({
    0: true, // Default lead claim expanded
  });

  const verifiedCount = claims.filter((c) => c.status === "verified").length;
  const falseCount = claims.filter((c) => c.status === "false").length;
  const unverifiedCount = claims.filter((c) => c.status === "unverified").length;

  const filteredClaims = claims.filter((claim) => {
    if (filter === "all") return true;
    return claim.status === filter;
  });

  const toggleClaim = (index: number) => {
    setExpandedClaims((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const expandAll = () => {
    const allExpanded: Record<number, boolean> = {};
    claims.forEach((_, idx) => {
      allExpanded[idx] = true;
    });
    setExpandedClaims(allExpanded);
  };

  const collapseAll = () => {
    setExpandedClaims({});
  };

  return (
    <div className={`bg-white border border-blue-200/60 rounded-xl p-6 clip-corner-lg shadow-xs ${className}`}>
      {/* Component Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-gray-900 text-lg tracking-tight">
              Claim Extraction & Verdict Accordion
            </h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Institutional fact-checking methodology inspired by Full Fact standards. Salient claims cross-referenced against wire archives and certified databases.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 flex items-center gap-1">
            <Layers className="w-3 h-3 text-blue-600" />
            Full Fact Standard
          </span>
        </div>
      </div>

      {/* Control Bar: Filter Tabs & Expand/Collapse Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 py-4 border-b border-slate-100">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setFilter("all")}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
              filter === "all"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <span>All Claims</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              filter === "all" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
            }`}>
              {claims.length}
            </span>
          </button>

          <button
            onClick={() => setFilter("verified")}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
              filter === "verified"
                ? "bg-emerald-700 text-white shadow-xs"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60"
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Verified</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              filter === "verified" ? "bg-white/20 text-white" : "bg-emerald-200 text-emerald-800"
            }`}>
              {verifiedCount}
            </span>
          </button>

          {falseCount > 0 && (
            <button
              onClick={() => setFilter("false")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                filter === "false"
                  ? "bg-rose-700 text-white shadow-xs"
                  : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/60"
              }`}
            >
              <XCircle className="w-3 h-3" />
              <span>Debunked</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                filter === "false" ? "bg-white/20 text-white" : "bg-rose-200 text-rose-800"
              }`}>
                {falseCount}
              </span>
            </button>
          )}

          {unverifiedCount > 0 && (
            <button
              onClick={() => setFilter("unverified")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                filter === "unverified"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/60"
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Unverified</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                filter === "unverified" ? "bg-white/20 text-white" : "bg-amber-200 text-amber-800"
              }`}>
                {unverifiedCount}
              </span>
            </button>
          )}
        </div>

        {/* Global Expand/Collapse controls */}
        <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
          <button
            onClick={expandAll}
            className="px-2 py-0.5 rounded hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
          >
            Expand All
          </button>
          <span>•</span>
          <button
            onClick={collapseAll}
            className="px-2 py-0.5 rounded hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Claims List */}
      <div className="space-y-5 pt-4">
        {filteredClaims.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Filter className="w-6 h-6 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No claims match the selected filter</p>
            <p className="text-xs text-slate-500 mt-1">Switch to 'All Claims' to inspect the full report.</p>
          </div>
        ) : (
          filteredClaims.map((claim, idx) => {
            const isVerified = claim.status === "verified";
            const isFalse = claim.status === "false";
            const isUnverified = !isVerified && !isFalse;
            const isExpanded = !!expandedClaims[idx];
            const isLead = idx === 0;

            const verdictTheme = isVerified
              ? {
                  badgeBg: "bg-emerald-700 text-white",
                  pillBorder: "border-emerald-300 bg-emerald-50 text-emerald-800",
                  verdictBox: "bg-emerald-500/10 border-emerald-400/80 text-emerald-950",
                  verdictTitle: "VERIFIED TRUE",
                  icon: CheckCircle2,
                  iconColor: "text-emerald-700",
                  cardBorder: "border-slate-200 hover:border-emerald-300",
                  accentHeader: "bg-emerald-600",
                }
              : isFalse
              ? {
                  badgeBg: "bg-rose-700 text-white",
                  pillBorder: "border-rose-300 bg-rose-50 text-rose-800",
                  verdictBox: "bg-rose-500/10 border-rose-400/80 text-rose-950",
                  verdictTitle: "DEBUNKED / FALSE",
                  icon: XCircle,
                  iconColor: "text-rose-700",
                  cardBorder: "border-slate-200 hover:border-rose-300",
                  accentHeader: "bg-rose-600",
                }
              : {
                  badgeBg: "bg-amber-600 text-white",
                  pillBorder: "border-amber-300 bg-amber-50 text-amber-800",
                  verdictBox: "bg-amber-500/10 border-amber-400/80 text-amber-950",
                  verdictTitle: "UNVERIFIED STATEMENT",
                  icon: AlertTriangle,
                  iconColor: "text-amber-700",
                  cardBorder: "border-slate-200 hover:border-amber-300",
                  accentHeader: "bg-amber-600",
                };

            const VerdictIcon = verdictTheme.icon;

            return (
              <div
                key={idx}
                className={`border rounded-xl transition-all shadow-xs overflow-hidden ${verdictTheme.cardBorder}`}
              >
                {/* Accordion Top Header Bar */}
                <div
                  onClick={() => toggleClaim(idx)}
                  className="p-4 bg-slate-50/70 hover:bg-slate-100/60 border-b border-slate-200/80 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-slate-900 text-white shrink-0">
                      Claim #{idx + 1}
                    </span>
                    {isLead && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-blue-100 text-blue-800 border border-blue-200 shrink-0">
                        Lead Thesis
                      </span>
                    )}
                    <span className="text-xs font-semibold text-slate-800 truncate">
                      "{claim.claim.length > 70 ? `${claim.claim.substring(0, 70)}...` : claim.claim}"
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide flex items-center gap-1 ${verdictTheme.badgeBg}`}>
                      <VerdictIcon className="w-3 h-3" />
                      <span>{verdictTheme.verdictTitle}</span>
                    </span>

                    <span className="text-[11px] font-semibold text-slate-500 hidden sm:inline-block">
                      {claim.confidence}% conf.
                    </span>

                    <motion.div
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-600"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </motion.div>
                  </div>
                </div>

                {/* Expanded Full Fact Callout Body */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="p-4 sm:p-5 space-y-4 bg-white"
                    >
                      {/* Box 1: The Exact Claim Made */}
                      <div className="p-4 rounded-lg bg-slate-50 border-l-4 border-slate-900 border-y border-r border-slate-200/90 relative">
                        <div className="flex items-center gap-2 mb-2">
                          <Quote className="w-4 h-4 text-slate-500" />
                          <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-600">
                            The Claim Made
                          </span>
                        </div>
                        <p className="text-sm sm:text-base font-medium text-slate-900 leading-relaxed italic">
                          "{claim.claim}"
                        </p>
                      </div>

                      {/* Box 2: Paired Verified Conclusion & Corroboration Verdict */}
                      <div className={`p-4 rounded-lg border-2 ${verdictTheme.verdictBox}`}>
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                          <div className="flex items-center gap-2">
                            <VerdictIcon className={`w-4 h-4 ${verdictTheme.iconColor}`} />
                            <span className="text-[11px] font-black uppercase tracking-widest">
                              Verified Conclusion & Verdict
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${verdictTheme.pillBorder}`}>
                              {claim.confidence}% Verified Confidence
                            </span>
                            <span className="text-[10px] text-slate-600 font-medium">
                              {claim.sources} Source{claim.sources === 1 ? "" : "s"} Indexed
                            </span>
                          </div>
                        </div>

                        <p className="text-xs sm:text-sm font-normal text-slate-800 leading-relaxed">
                          {claim.explanation || "Cross-referenced against certified wire services and public knowledge registries."}
                        </p>
                      </div>

                      {/* Box 3: Supporting Source Citations Ledger */}
                      <div className="pt-2">
                        <div className="flex items-center justify-between mb-2.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                            <span>Supporting Evidence & Primary Citations</span>
                          </span>

                          <span className="text-[10px] font-medium text-slate-500">
                            {claim.source_links && claim.source_links.length > 0
                              ? `${claim.source_links.length} corroborating press record${claim.source_links.length > 1 ? "s" : ""}`
                              : "No external records indexed"}
                          </span>
                        </div>

                        {claim.source_links && claim.source_links.length > 0 ? (
                          <div className="space-y-2.5">
                            {claim.source_links.map((src, sIdx) => (
                              <div
                                key={sIdx}
                                className="p-3 rounded-lg bg-slate-50/70 border border-slate-200/90 hover:border-blue-400 hover:bg-blue-50/20 transition-all shadow-2xs"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200 shrink-0">
                                      {src.publisher || "Accredited Wire"}
                                    </span>

                                    <a
                                      href={src.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs font-bold text-slate-900 hover:text-blue-600 truncate hover:underline flex items-center gap-1"
                                      title={src.title}
                                    >
                                      <span className="truncate">{src.title}</span>
                                      <ExternalLink className="w-3 h-3 text-blue-500 shrink-0" />
                                    </a>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    {src.similarity_score && (
                                      <span className="text-[10px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                                        {Math.round(src.similarity_score)}% match
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {src.snippet && (
                                  <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed line-clamp-2 bg-white/80 p-2 rounded border border-slate-100 italic">
                                    "{src.snippet}"
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-3 rounded-lg bg-slate-50 border border-dashed border-slate-200 text-[11px] text-slate-500 text-center">
                            No independent primary news wire or fact-check records were indexed for this specific sentence statement.
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
export default ClaimsAccordion;
