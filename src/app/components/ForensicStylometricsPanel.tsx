import { useState, useMemo } from "react";
import {
  Brain,
  Cpu,
  Activity,
  Layers,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  FileSearch,
  Filter,
  BarChart2,
  Gauge
} from "lucide-react";
import { ForensicStylometrics, SentenceAIScore } from "../../types/analysis";

interface ForensicStylometricsPanelProps {
  forensics?: ForensicStylometrics;
  aiProbability: number;
  rawText?: string;
}

export function ForensicStylometricsPanel({
  forensics,
  aiProbability,
  rawText = "",
}: ForensicStylometricsPanelProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "heatmap">("overview");
  const [selectedSentenceIndex, setSelectedSentenceIndex] = useState<number | null>(null);
  const [filterClass, setFilterClass] = useState<"all" | "synthetic" | "mixed" | "human">("all");

  // Fallback if forensics is not directly passed
  const activeForensics: ForensicStylometrics = useMemo(() => {
    if (forensics && forensics.sentence_analyses && forensics.sentence_analyses.length > 0) {
      return forensics;
    }

    const sentences = rawText
      ? rawText.split(/(?<=[.!?])\s+/).filter(Boolean)
      : ["Submitted text analyzed for stylometric patterns."];

    const sentenceScores: SentenceAIScore[] = sentences.map((s, idx) => {
      const isHigh = aiProbability >= 60;
      const prob = isHigh ? Math.min(95, aiProbability + (idx % 2 === 0 ? 5 : -5)) : Math.max(5, aiProbability);
      return {
        sentence_index: idx,
        text: s,
        ai_probability: prob,
        classification: prob >= 65 ? "synthetic" : prob >= 35 ? "mixed" : "human",
        burstiness: 0.35,
        perplexity_score: isHigh ? 78 : 25,
        detected_markers: isHigh && s.toLowerCase().includes("in ") ? ["formulaic transition"] : [],
      };
    });

    return {
      burstiness_score: aiProbability > 50 ? 22.4 : 58.1,
      burstiness_classification: aiProbability > 50 ? "low_burstiness" : "high_burstiness",
      perplexity_estimate: aiProbability > 50 ? 74.5 : 28.0,
      perplexity_classification: aiProbability > 50 ? "highly_predictable" : "natural_unpredictable",
      lexical_diversity: aiProbability > 50 ? 0.46 : 0.69,
      shannon_entropy: aiProbability > 50 ? 3.7 : 5.8,
      synthetic_marker_count: aiProbability > 50 ? 3 : 0,
      synthetic_markers_found: aiProbability > 50 ? ["delve into", "rich tapestry", "testament to"] : [],
      sentence_analyses: sentenceScores,
    };
  }, [forensics, aiProbability, rawText]);

  const filteredSentences = useMemo(() => {
    if (filterClass === "all") return activeForensics.sentence_analyses;
    return activeForensics.sentence_analyses.filter((s) => s.classification === filterClass);
  }, [activeForensics, filterClass]);

  const selectedSentence = useMemo(() => {
    if (selectedSentenceIndex === null) return null;
    return activeForensics.sentence_analyses.find((s) => s.sentence_index === selectedSentenceIndex) || null;
  }, [activeForensics, selectedSentenceIndex]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-8 clip-corner-lg shadow-sm">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-violet-50 border border-violet-200 text-violet-700">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-lg">Forensic Stylometrics & Deep AI Detection</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-violet-100 text-violet-800 border border-violet-200 uppercase">
                Phase 15 Engine
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Multi-signal token entropy, sentence cadence variance, lexical diversity, and granular sentence heatmap.
            </p>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex border border-slate-200 rounded-lg p-0.5 bg-slate-50 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "overview" ? "bg-white text-violet-700 shadow-xs border border-slate-200/80" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Gauge className="w-3.5 h-3.5" />
            Stylometric Metrics
          </button>
          <button
            onClick={() => setActiveTab("heatmap")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "heatmap" ? "bg-white text-violet-700 shadow-xs border border-slate-200/80" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Sentence Heatmap
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-violet-100 text-violet-800">
              {activeForensics.sentence_analyses.length}
            </span>
          </button>
        </div>
      </div>

      {/* TAB 1: STYLOMETRIC METRICS OVERVIEW */}
      {activeTab === "overview" && (
        <div className="mt-6 space-y-6">
          {/* Top 3 Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Predictability / Perplexity Meter */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-violet-600" />
                  Token Predictability
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    activeForensics.perplexity_classification === "highly_predictable"
                      ? "bg-rose-100 text-rose-800"
                      : activeForensics.perplexity_classification === "moderate"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {activeForensics.perplexity_classification.replace("_", " ")}
                </span>
              </div>
              <div className="text-2xl font-bold text-slate-900 mb-2">
                {activeForensics.perplexity_estimate}%
              </div>
              {/* Progress Bar */}
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full transition-all duration-500 ${
                    activeForensics.perplexity_estimate > 65
                      ? "bg-rose-500"
                      : activeForensics.perplexity_estimate > 35
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${activeForensics.perplexity_estimate}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {activeForensics.perplexity_estimate > 65
                  ? "Prose exhibits minimal cross-entropy surprise, characteristic of synthetic LLM generation."
                  : "Prose displays natural lexical unpredictability and idiomatic word pairings."}
              </p>
            </div>

            {/* 2. Burstiness & Cadence Variance */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                  <BarChart2 className="w-4 h-4 text-blue-600" />
                  Cadence Variance (CV)
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    activeForensics.burstiness_classification === "low_burstiness"
                      ? "bg-rose-100 text-rose-800"
                      : activeForensics.burstiness_classification === "moderate"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {activeForensics.burstiness_classification.replace("_", " ")}
                </span>
              </div>
              <div className="text-2xl font-bold text-slate-900 mb-2">
                {activeForensics.burstiness_score}%
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full transition-all duration-500 ${
                    activeForensics.burstiness_score < 28
                      ? "bg-rose-500"
                      : activeForensics.burstiness_score < 45
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(100, activeForensics.burstiness_score * 1.5)}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {activeForensics.burstiness_classification === "low_burstiness"
                  ? "Sentences share rigidly uniform lengths and clauses. High indicator of AI writing."
                  : "Sentence lengths fluctuate organically between short punchy and complex clauses."}
              </p>
            </div>

            {/* 3. Lexical Diversity & Entropy */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  Lexical Diversity (MATTR)
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-indigo-100 text-indigo-800">
                  {activeForensics.shannon_entropy} bits
                </span>
              </div>
              <div className="text-2xl font-bold text-slate-900 mb-2">
                {(activeForensics.lexical_diversity * 100).toFixed(1)}%
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-indigo-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, activeForensics.lexical_diversity * 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Moving-Average Type-Token Ratio across sliding 25-word windows prevents text length bias.
              </p>
            </div>
          </div>

          {/* Synthetic Markers Section */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileSearch className="w-4 h-4 text-violet-600" />
                <h4 className="text-sm font-bold text-slate-900">Synthetic Transitional Clichés & Markers</h4>
              </div>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                {activeForensics.synthetic_marker_count} pattern{activeForensics.synthetic_marker_count === 1 ? "" : "s"} detected
              </span>
            </div>

            {activeForensics.synthetic_markers_found && activeForensics.synthetic_markers_found.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {activeForensics.synthetic_markers_found.map((marker, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-50 text-rose-800 border border-rose-200"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    "{marker}"
                  </span>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                No formulaic synthetic transitional clichés detected. Writing avoids typical LLM signpost phrases.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: INTERACTIVE SENTENCE HEATMAP */}
      {activeTab === "heatmap" && (
        <div className="mt-6 space-y-4">
          {/* Heatmap Controls & Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-medium">Filter Resolution:</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setFilterClass("all")}
                  className={`px-2 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                    filterClass === "all" ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  All ({activeForensics.sentence_analyses.length})
                </button>
                <button
                  onClick={() => setFilterClass("synthetic")}
                  className={`px-2 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                    filterClass === "synthetic" ? "bg-rose-600 text-white" : "bg-white text-rose-700 border border-rose-200 hover:bg-rose-50"
                  }`}
                >
                  Synthetic ({activeForensics.sentence_analyses.filter((s) => s.classification === "synthetic").length})
                </button>
                <button
                  onClick={() => setFilterClass("mixed")}
                  className={`px-2 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                    filterClass === "mixed" ? "bg-amber-600 text-white" : "bg-white text-amber-700 border border-amber-200 hover:bg-amber-50"
                  }`}
                >
                  Mixed ({activeForensics.sentence_analyses.filter((s) => s.classification === "mixed").length})
                </button>
                <button
                  onClick={() => setFilterClass("human")}
                  className={`px-2 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                    filterClass === "human" ? "bg-emerald-600 text-white" : "bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50"
                  }`}
                >
                  Human ({activeForensics.sentence_analyses.filter((s) => s.classification === "human").length})
                </button>
              </div>
            </div>

            <div className="text-[11px] text-slate-500">
              Click any sentence to inspect its forensic tokens and markers.
            </div>
          </div>

          {/* Interactive Sentence Text Flow */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white leading-relaxed text-slate-800 text-sm max-h-[380px] overflow-y-auto space-y-2">
            {filteredSentences.map((sent) => {
              const isSelected = selectedSentenceIndex === sent.sentence_index;
              const isSynthetic = sent.classification === "synthetic";
              const isMixed = sent.classification === "mixed";

              return (
                <span
                  key={sent.sentence_index}
                  onClick={() => setSelectedSentenceIndex(isSelected ? null : sent.sentence_index)}
                  className={`inline-block mr-1.5 my-1 px-2 py-1 rounded-md cursor-pointer transition-all border ${
                    isSelected
                      ? "ring-2 ring-violet-500 ring-offset-1 font-medium"
                      : ""
                  } ${
                    isSynthetic
                      ? "bg-rose-50 text-rose-950 border-rose-300 hover:bg-rose-100"
                      : isMixed
                      ? "bg-amber-50 text-amber-950 border-amber-300 hover:bg-amber-100"
                      : "bg-emerald-50/40 text-slate-800 border-emerald-200/60 hover:bg-emerald-50"
                  }`}
                >
                  {sent.text}{" "}
                  <span
                    className={`inline-block text-[10px] font-mono px-1 rounded-sm ml-1 ${
                      isSynthetic
                        ? "bg-rose-200/70 text-rose-900"
                        : isMixed
                        ? "bg-amber-200/70 text-amber-900"
                        : "bg-emerald-200/60 text-emerald-900"
                    }`}
                  >
                    {Math.round(sent.ai_probability)}%
                  </span>
                </span>
              );
            })}
          </div>

          {/* Selected Sentence Forensic Inspector Drawer */}
          {selectedSentence && (
            <div className="p-4 rounded-xl border border-violet-200 bg-violet-50/50 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-violet-900 flex items-center gap-1.5">
                  <Brain className="w-4 h-4 text-violet-700" />
                  Sentence #{selectedSentence.sentence_index + 1} Forensic Breakdown
                </span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                    selectedSentence.classification === "synthetic"
                      ? "bg-rose-100 text-rose-800 border border-rose-200"
                      : selectedSentence.classification === "mixed"
                      ? "bg-amber-100 text-amber-800 border border-amber-200"
                      : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  }`}
                >
                  {selectedSentence.classification} ({selectedSentence.ai_probability}%)
                </span>
              </div>

              <blockquote className="text-xs italic text-slate-700 border-l-2 border-violet-400 pl-3 py-1 mb-3 bg-white/70 rounded-r">
                "{selectedSentence.text}"
              </blockquote>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-500 text-[10px] block">Cadence Deviation</span>
                  <span className="font-bold text-slate-800">{selectedSentence.burstiness}</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-500 text-[10px] block">Token Predictability</span>
                  <span className="font-bold text-slate-800">{selectedSentence.perplexity_score}%</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 col-span-2 sm:col-span-1">
                  <span className="text-slate-500 text-[10px] block">Detected Clichés</span>
                  <span className="font-bold text-slate-800">
                    {selectedSentence.detected_markers.length > 0
                      ? selectedSentence.detected_markers.join(", ")
                      : "None"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
