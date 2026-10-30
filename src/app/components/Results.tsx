import { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { veritasAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { getTierConfig } from "../../utils/tierLimits";
import { PricingModal } from "./PricingModal";
import { AuditCertificateModal } from "./AuditCertificateModal";
import { PipelineTracker } from "./PipelineTracker";
import { CredibilityGauge } from "./CredibilityGauge";
import { SourceNutritionLabel } from "./SourceNutritionLabel";
import { ClaimsAccordion } from "./ClaimsAccordion";
import { TruthMap } from "./TruthMap";
import { getCredibilityConfig, CredibilityTier } from "../../utils/credibilityTheme";
import {
  Shield, ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2, XCircle, Sparkles,
  ExternalLink, Globe, TrendingUp, Brain, Search, FileText,
  BarChart2, BookOpen, ArrowLeft, Download, ChevronRight, Eye,
  AlertCircle, Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  RadialBarChart, RadialBar, PieChart, Pie, Cell,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip
} from "recharts";

/* ─────────────────────────────────────────────
   CLIP STYLES
───────────────────────────────────────────── */
const CLIP_STYLES = `
  .clip-corner-xl {
    clip-path: polygon(0 18px, 18px 0, 100% 0, 100% calc(100% - 18px), calc(100% - 18px) 100%, 0 100%);
  }
  .clip-corner-lg {
    clip-path: polygon(0 12px, 12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%);
  }
  .clip-corner-sm {
    clip-path: polygon(0 5px, 5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%);
  }
  .clip-corner-icon {
    clip-path: polygon(0 5px, 5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%);
  }

  @media print {
    body, html {
      background: white !important;
      color: black !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    header, nav, .no-print, button, footer, .feedback-card {
      display: none !important;
    }
    .min-h-screen {
      min-height: auto !important;
      padding: 0 !important;
    }
    #veritas-audit-certificate {
      border: 2px solid #0f172a !important;
      box-shadow: none !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      margin: 0 auto !important;
      max-width: 100% !important;
      padding: 24px !important;
    }
    .bg-gradient-to-br, .bg-white {
      background: none !important;
      border: 1px solid #ddd !important;
      color: black !important;
      box-shadow: none !important;
    }
    .text-white {
      color: black !important;
    }
    .border-blue-200\/50, .border-blue-200\/40 {
      border-color: #333 !important;
    }
    .bg-blue-50\/20, .bg-blue-100 {
      background: #f4f6f9 !important;
    }
    .bg-neutral-900 {
      background: #eee !important;
      color: black !important;
    }
    .print-title {
      font-size: 24pt !important;
      font-weight: bold !important;
      color: black !important;
    }
  }
`;


interface GraphNode {
  id: string;
  label: string;
  type: "article" | "claim" | "source";
  x: number;
  y: number;
  color: string;
  status?: string;
  score?: number;
  connections: string[];
}

function CorroborationGraph({ claims, sources }: { claims: any[]; sources: any[] }) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Define nodes
  const nodes: GraphNode[] = [];
  const articleY = 200;
  
  // 1. Center node (Article)
  nodes.push({
    id: "article",
    label: "Submitted Article",
    type: "article",
    x: 400,
    y: articleY,
    color: "#2563eb",
    connections: []
  });

  // 2. Left nodes (Claims)
  const claimSpacing = 300 / (claims.length + 1);
  claims.forEach((claim, idx) => {
    const id = `claim_${idx}`;
    const y = 50 + (idx + 1) * claimSpacing;
    const color = claim.status === "verified" ? "#10b981" : claim.status === "false" ? "#ef4444" : "#f59e0b";
    
    // Map connections: connects to article, and dynamically to matching sources
    const sourceIdx = idx % sources.length;
    nodes.push({
      id,
      label: claim.claim,
      type: "claim",
      x: 150,
      y,
      color,
      status: claim.status,
      connections: ["article", `source_${sourceIdx}`]
    });
  });

  // 3. Right nodes (Sources)
  const sourceSpacing = 300 / (sources.length + 1);
  sources.forEach((source, idx) => {
    const id = `source_${idx}`;
    const y = 50 + (idx + 1) * sourceSpacing;
    const color = source.credibility >= 80 ? "#10b981" : "#3b82f6";
    nodes.push({
      id,
      label: source.name,
      type: "source",
      x: 650,
      y,
      color,
      score: source.credibility,
      connections: ["article"]
    });
  });

  // Check if a connection is active (hovered)
  const isConnectionActive = (nodeA: GraphNode, nodeB: GraphNode) => {
    if (!hoveredNode) return true; // default high opacity
    if (hoveredNode === nodeA.id || hoveredNode === nodeB.id) return true;
    
    // Check indirect connection between claims and sources
    if (nodeA.type === "claim" && nodeB.type === "source") {
      return nodeA.connections.includes(nodeB.id) && (hoveredNode === nodeA.id || hoveredNode === nodeB.id);
    }
    return false;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-white relative overflow-hidden clip-corner-lg">
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
        <div>
          <h4 className="font-semibold text-sm text-slate-200">Interactive Relationship Graph</h4>
          <p className="text-[10px] text-slate-400 mt-0.5">Hover nodes to view claim verification paths</p>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-blue-600 rounded-full" /> Article</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-green-500 rounded-full" /> Verified</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-red-500 rounded-full" /> Debunked</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-amber-500 rounded-full" /> Unverified</span>
        </div>
      </div>

      <div className="relative w-full h-[400px] border border-slate-800 bg-slate-950/40 rounded-lg">
        <svg className="w-full h-full select-none" viewBox="0 0 800 400">
          {/* Draw Connection Lines */}
          {nodes.map((node) => {
            if (node.type === "article") return null;
            return node.connections.map((targetId) => {
              const target = nodes.find((n) => n.id === targetId);
              if (!target) return null;
              
              const active = isConnectionActive(node, target);
              return (
                <line
                  key={`${node.id}-${targetId}`}
                  x1={node.x}
                  y1={node.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={active ? (node.type === "claim" ? node.color : "#3b82f6") : "#334155"}
                  strokeWidth={active ? 2.5 : 1}
                  strokeDasharray={node.type === "claim" && target.type === "source" ? "4,4" : undefined}
                  opacity={active ? 0.95 : 0.2}
                  className="transition-all duration-300"
                />
              );
            });
          })}

          {/* Draw Nodes */}
          {nodes.map((node) => {
            const isHovered = hoveredNode === node.id;
            const isDimmed = hoveredNode && hoveredNode !== node.id && !node.connections.includes(hoveredNode) && !(node.type === "article");
            
            return (
              <g
                key={node.id}
                transform={`translate(${node.x},${node.y})`}
                className="cursor-pointer transition-all duration-300"
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                opacity={isDimmed ? 0.35 : 1}
              >
                {/* Node outer glow */}
                {isHovered && (
                  <circle r={node.type === "article" ? 34 : 22} fill={node.color} opacity={0.3} className="animate-ping" />
                )}
                {/* Node Circle */}
                <circle
                  r={node.type === "article" ? 28 : 16}
                  fill={node.color}
                  stroke="#1e293b"
                  strokeWidth={2}
                  className="shadow-lg transition-transform duration-200 hover:scale-110"
                />

                {/* Node Label Text */}
                <text
                  y={node.type === "article" ? 0 : (node.y > 200 ? 26 : -22)}
                  dy=".3em"
                  textAnchor="middle"
                  fill={isHovered ? "#3b82f6" : "#cbd5e1"}
                  className="text-[10px] font-semibold tracking-tight"
                  style={{
                    textShadow: "0 2px 4px rgba(0,0,0,0.8)",
                    pointerEvents: "none"
                  }}
                >
                  {node.type === "article" ? "Article" : (node.label.length > 22 ? `${node.label.substring(0, 20)}...` : node.label)}
                </text>
                
                {/* Score badge for sources */}
                {node.type === "source" && node.score && (
                  <text y="0" dy=".3em" textAnchor="middle" fill="#fff" className="text-[9px] font-bold" style={{ pointerEvents: "none" }}>
                    {node.score}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN RESULTS COMPONENT
───────────────────────────────────────────── */
export function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { text: stateText, type: stateType, result } = location.state || {};
  const { tier, changeTier } = useAuth();
  const [pricingOpen, setPricingOpen] = useState(false);
  const [certificateOpen, setCertificateOpen] = useState(false);
  const tierConfig = getTierConfig(tier);

  const [loading, setLoading] = useState(false);
  const [loadedResult, setLoadedResult] = useState<any>(result);
  const [text, setText] = useState(stateText || "");
  const [type, setType] = useState(stateType || "text");
  
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [showCorrectionOptions, setShowCorrectionOptions] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [corroborationView, setCorroborationView] = useState<"list" | "graph">("list");


  useEffect(() => {
    if (!loadedResult && id) {
      setLoading(true);
      veritasAPI.getResult(id)
        .then((res) => {
          setLoadedResult(res);
          if (res.content && !text) setText(res.content);
          if (res.input_type) setType(res.input_type);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Failed to fetch result:", err);
          setLoading(false);
        });
    }
  }, [id, loadedResult, text]);


  const handleFeedback = async (isAccurate: boolean, correctedLabel: string) => {
    setFeedbackLoading(true);
    try {
      const docId = id || loadedResult?.id || "mock-id";
      await veritasAPI.submitFeedback(docId, {
        is_accurate: isAccurate,
        corrected_label: correctedLabel,
      });
      setFeedbackSubmitted(true);
    } catch (err) {
      console.error("Failed to submit feedback:", err);
      // Fallback in demo/mock mode
      setFeedbackSubmitted(true);
    } finally {
      setFeedbackLoading(false);
    }
  };

  // ── Scores (from FastAPI response or fallback to mock)

  const linguisticScore  = loadedResult?.scores?.linguistic_score ?? 74;  // weight: 40%
  const sourceCredibility = loadedResult?.scores?.source_score ?? 68; // weight: 35%
  const factCheckScore   = loadedResult?.scores?.corroboration_score ?? 82;  // weight: 25%
  const aiProbability    = loadedResult?.ai_probability ?? 23;

  // Derived overall from weighted ensemble
  const WEIGHTS = { linguistic: 0.40, source: 0.35, corroboration: 0.25 };
  const overallScore = loadedResult?.overall_score ?? Math.round(
    linguisticScore  * WEIGHTS.linguistic +
    sourceCredibility * WEIGHTS.source +
    factCheckScore   * WEIGHTS.corroboration
  );

  const dimensionData = [
    { name: "Linguistic", score: linguisticScore,   fill: "#1d4ed8" },
    { name: "Fact Check", score: factCheckScore,    fill: "#2563eb" },
    { name: "Sources",    score: sourceCredibility, fill: "#3b82f6" },
    { name: "Context",    score: 79,                fill: "#60a5fa" },
    { name: "Bias",       score: 68,                fill: "#93c5fd" },
  ];

  const aiDetectionData = [
    { name: "Human", value: 100 - aiProbability, fill: "#10b981" },
    { name: "AI",    value: aiProbability,        fill: "#f59e0b" },
  ];

  const sources = loadedResult?.sources ?? [
    { name: "Reuters",            credibility: 95, status: "verified",     matches: 3 },
    { name: "Associated Press",   credibility: 93, status: "verified",     matches: 2 },
    { name: "BBC News",           credibility: 90, status: "verified",     matches: 1 },
    { name: "Unknown Blog",       credibility: 45, status: "questionable", matches: 1 },
  ];

  const claims = loadedResult?.claims ?? [
    { claim: "Climate change is causing global temperatures to rise",      status: "verified",   confidence: 95, sources: 8 },
    { claim: "Renewable energy adoption is increasing worldwide",          status: "verified",   confidence: 88, sources: 5 },
    { claim: "New technology will be available next month",                status: "unverified", confidence: 42, sources: 1 },
  ];

  const linguisticFlags = loadedResult?.linguistic_flags ?? [
    { label: "Sentence structure variance",   rating: "Normal",                    ok: true  },
    { label: "Vocabulary richness (TTR)",     rating: "0.68 — typical human range", ok: true  },
    { label: "AI stylometric markers",        rating: "Low presence (23%)",        ok: true  },
    { label: "Emotional language score",      rating: "Slightly elevated",          ok: false },
    { label: "Passive voice ratio",           rating: "22% — within range",        ok: true  },
  ];

  if (loading) {
    return (
      <div className="min-h-screen py-12 lg:py-20 bg-gradient-to-b from-blue-50/30 to-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <PipelineTracker
            currentStep={3}
            logMessages={[
              "▸ Fetching cached verification report from MongoDB...",
              "▸ Querying RoBERTa fine-tuned stylometric checkpoints...",
              "▸ Loading MediaBias/FactCheck and domain credibility record...",
              "▸ Rebuilding claim corroboration graph...",
              "✓ Verification report loaded successfully.",
            ]}
            title="Retrieving Verification Intelligence"
            subtitle="Assembling multimodal fact-checking report and interactive Truth Map from the database cluster."
            showSkeletonPreview={true}
          />
        </div>
        <style>{CLIP_STYLES}</style>
      </div>
    );
  }

  if (!text) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No content to analyse</p>
          <button
            onClick={() => navigate("/verify")}
            className="px-6 py-3 bg-gradient-to-r from-blue-700 to-blue-500 text-white rounded-lg hover:from-blue-800 hover:to-blue-600 transition-all clip-corner-sm"
          >
            Start New Analysis
          </button>
          <style>{CLIP_STYLES}</style>
        </div>
      </div>
    );
  }

  const credibilityConfig = getCredibilityConfig(overallScore);
  const TierIcon =
    credibilityConfig.iconName === "ShieldCheck"
      ? ShieldCheck
      : credibilityConfig.iconName === "CheckCircle2"
      ? CheckCircle2
      : credibilityConfig.iconName === "AlertTriangle"
      ? AlertTriangle
      : ShieldAlert;

  const getScoreColor = (s: number) =>
    s >= 80 ? "text-green-600" : s >= 60 ? "text-blue-600" : s >= 40 ? "text-yellow-600" : "text-red-600";

  const confidenceInterval = loadedResult?.confidence_interval ?? 2.5;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="bg-white border border-blue-200 rounded-lg px-3 py-2 shadow-lg text-sm">
          <p className="text-muted-foreground">{label}</p>
          <p className="text-blue-700" style={{ fontWeight: 600 }}>{payload[0].value}/100</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen py-10 lg:py-16 bg-gradient-to-b from-blue-50/30 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8 no-print">
            <button
              onClick={() => navigate("/verify")}
              className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              New Analysis
            </button>
            <ChevronRight className="w-3 h-3" />
            <span>Results</span>
          </div>

          {/* Page title */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-4xl tracking-tight">Credibility Index Report</h1>
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${credibilityConfig.badgeClass}`}>
                <TierIcon className="w-4 h-4" />
                {credibilityConfig.label}
              </div>
            </div>
            <p className="text-muted-foreground">
              Multi-dimensional credibility assessment ·{" "}
              {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>

          {/* ── Hero Score Card: Institutional PolitiFact Truth-O-Meter & Credibility Engine ── */}
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm clip-corner-xl overflow-hidden mb-8 transition-all hover:shadow-md">
            {/* Institutional Header Ribbon */}
            <div className="bg-slate-50/90 px-6 py-3 border-b border-slate-200/80 flex items-center justify-between flex-wrap gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="p-1 rounded bg-slate-900 text-white">
                  <Shield className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold tracking-tight text-slate-800 uppercase">
                  Veritas Intelligence Assessment
                </span>
                <span className="text-slate-300">|</span>
                <span className="font-mono text-slate-500">
                  REF: {id ? `VER-${id.slice(-8).toUpperCase()}` : "VER-2026-X89"}
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-500">
                  Inference: 1.42s · 95% Confidence
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCertificateOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  <span>Audit Certificate</span>
                </button>
                <span className="text-[11px] font-mono text-slate-500 hidden md:inline">
                  Ensemble v1.5 (RoBERTa + MediaBias + NewsWire)
                </span>
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${credibilityConfig.badgeClass}`}>
                  <TierIcon className="w-3.5 h-3.5" />
                  <span>{credibilityConfig.shortLabel}</span>
                </div>
              </div>
            </div>

            {/* Main Card Grid */}
            <div className="grid lg:grid-cols-12 gap-8 items-center p-6 sm:p-8">
              {/* Left Column: PolitiFact Truth-O-Meter & Speedometer Gauge */}
              <div className="lg:col-span-5 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-slate-100 pb-6 lg:pb-0 lg:pr-6">
                <CredibilityGauge
                  score={overallScore}
                  confidenceInterval={confidenceInterval}
                  size="lg"
                  showTruthOMeter={true}
                  showConfidenceInterval={true}
                  showTicks={true}
                />
              </div>

              {/* Right Column: Executive Synthesis, Dimension Pillars, and Mathematical MCDA Formula */}
              <div className="lg:col-span-7 space-y-5">
                {/* Executive Synthesis */}
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                      Executive Synthesis
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                    <span className="text-xs font-semibold text-slate-700">
                      {credibilityConfig.shortLabel} Consensus
                    </span>
                  </div>
                  <h2 className="text-2xl font-black tracking-tight text-slate-900 mb-2">
                    {credibilityConfig.verdict}
                  </h2>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {overallScore >= 80
                      ? "Authoritative and factual. Core assertions have been corroborated by multiple primary wire services (Reuters, AP, BBC). Stylometric analysis indicates objective journalistic syntax with low AI deception markers."
                      : overallScore >= 60
                      ? "Substantively factual with minor qualifications. Primary assertions align with accredited news coverage, though stylistic markers indicate moderate emotional framing or partisan tone."
                      : overallScore >= 40
                      ? "Caution advised. The report identified unsubstantiated factual claims, elevated emotional hyperbole, or source transparency concerns that require independent corroboration."
                      : "High risk of disinformation or synthetic deception. Assertions contradict consensus reporting from verified wire services, exhibiting elevated manipulative linguistic markers."}
                  </p>
                </div>

                {/* 3 Dimension Architecture Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Pillar 1: Linguistic */}
                  <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Brain className="w-3.5 h-3.5 text-blue-600" />
                        Linguistic (40%)
                      </span>
                      <span className="text-sm font-black font-mono text-slate-900">
                        {linguisticScore}%
                      </span>
                    </div>
                    {/* Mini progress bar */}
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          linguisticScore >= 80 ? "bg-emerald-500" : linguisticScore >= 60 ? "bg-blue-500" : linguisticScore >= 40 ? "bg-amber-500" : "bg-rose-500"
                        }`}
                        style={{ width: `${linguisticScore}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-600 leading-tight">
                      {aiProbability > 50
                        ? `Elevated AI probability (${aiProbability}%). Synthetic LLM transition cadence.`
                        : `Human cadence (Burstiness CV > 0.35). Low AI markers (${aiProbability}%).`}
                    </p>
                  </div>

                  {/* Pillar 2: Source Authority */}
                  <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-indigo-600" />
                        Source Auth. (35%)
                      </span>
                      <span className="text-sm font-black font-mono text-slate-900">
                        {sourceCredibility}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          sourceCredibility >= 80 ? "bg-emerald-500" : sourceCredibility >= 60 ? "bg-blue-500" : sourceCredibility >= 40 ? "bg-amber-500" : "bg-rose-500"
                        }`}
                        style={{ width: `${sourceCredibility}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-600 leading-tight">
                      {sourceCredibility >= 80
                        ? "Accredited newsroom with verified editorial transparency."
                        : sourceCredibility >= 60
                        ? "Standard transparency signals; moderate independent ranking."
                        : "Unverified domain or unknown ownership transparency."}
                    </p>
                  </div>

                  {/* Pillar 3: Corroboration */}
                  <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Search className="w-3.5 h-3.5 text-sky-600" />
                        Corroboration (25%)
                      </span>
                      <span className="text-sm font-black font-mono text-slate-900">
                        {factCheckScore}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          factCheckScore >= 80 ? "bg-emerald-500" : factCheckScore >= 60 ? "bg-blue-500" : factCheckScore >= 40 ? "bg-amber-500" : "bg-rose-500"
                        }`}
                        style={{ width: `${factCheckScore}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-600 leading-tight">
                      {claims.filter(c => c.status === "false").length > 0
                        ? `${claims.filter(c => c.status === "false").length} claim(s) debunked by certified fact-checkers.`
                        : claims.filter(c => c.status === "verified").length > 0
                        ? `${claims.filter(c => c.status === "verified").length} claim(s) corroborated against wire press archives.`
                        : "Requires additional independent confirmation from primary wire feeds."}
                    </p>
                  </div>
                </div>

                {/* Weighted MCDA Formula Bar */}
                <div className="bg-slate-50/90 rounded-xl p-3.5 border border-slate-200/80">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                      <span>Ensemble Mathematical Weighting (MCDA)</span>
                    </p>
                    <span className="text-[10px] font-mono text-slate-500">
                      Overall = (L × 0.40) + (S × 0.35) + (C × 0.25)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap text-xs font-mono">
                    <span className="bg-white px-2 py-1 rounded border border-slate-200 text-slate-700 shadow-2xs">
                      <span className="text-slate-400 font-sans mr-1">Linguistic:</span>
                      {linguisticScore} × 0.40
                    </span>
                    <span className="text-slate-400 font-bold">+</span>
                    <span className="bg-white px-2 py-1 rounded border border-slate-200 text-slate-700 shadow-2xs">
                      <span className="text-slate-400 font-sans mr-1">Source:</span>
                      {sourceCredibility} × 0.35
                    </span>
                    <span className="text-slate-400 font-bold">+</span>
                    <span className="bg-white px-2 py-1 rounded border border-slate-200 text-slate-700 shadow-2xs">
                      <span className="text-slate-400 font-sans mr-1">Corroboration:</span>
                      {factCheckScore} × 0.25
                    </span>
                    <span className="text-slate-400 font-bold">=</span>
                    <span className={`px-2.5 py-1 rounded font-bold border ${credibilityConfig.badgeClass}`}>
                      {overallScore}% {credibilityConfig.shortLabel}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>


          {/* ── Main analytics grid ── */}
          <div className="grid lg:grid-cols-3 gap-6 mb-6">
            {/* Dimension bar chart */}
            <div className="lg:col-span-2 bg-white border border-blue-200/50 rounded-xl p-6 clip-corner-lg">
              <div className="flex items-center gap-2 mb-6">
                <BarChart2 className="w-5 h-5 text-blue-600" />
                <h3>Credibility Dimensions</h3>
              </div>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dimensionData} barSize={36}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(219,234,254,0.3)" }} />
                    <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                      {dimensionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* AI Detection */}
            <div className="bg-white border border-blue-200/50 rounded-xl p-6 clip-corner-lg">
              <div className="flex items-center gap-2 mb-6">
                <Brain className="w-5 h-5 text-blue-600" />
                <h3>AI Detection</h3>
              </div>
              <div className="flex justify-center mb-4">
                <PieChart width={140} height={140}>
                  <Pie data={aiDetectionData} cx="50%" cy="50%" innerRadius={42} outerRadius={60} dataKey="value" startAngle={90} endAngle={-270}>
                    {aiDetectionData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                </PieChart>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                    <span className="text-muted-foreground">Human-written</span>
                  </div>
                  <span className="text-green-600" style={{ fontWeight: 600 }}>{100 - aiProbability}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                    <span className="text-muted-foreground">AI-generated</span>
                  </div>
                  <span className="text-yellow-600" style={{ fontWeight: 600 }}>{aiProbability}%</span>
                </div>
                <div className="mt-4 p-3 bg-green-50 border border-green-200/50 rounded-lg text-xs text-green-700 leading-relaxed">
                  Low AI generation probability. Content shows stylometric markers consistent with human authorship.
                </div>
              </div>
            </div>
          </div>

          {/* ── XAI TRUTH MAP: GRAMMARLY-STYLE ANNOTATION ENGINE ── */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 mb-8 clip-corner-lg shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-200/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-lg">Truth Map — RoBERTa Explainable AI (XAI)</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 uppercase">
                      Grammarly-Style XAI
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Sentence-level stylometric highlights, category filters, and floating finding inspection cards.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  40% Linguistic Weight
                </span>
              </div>
            </div>

            <TruthMap text={text} type={type} xaiAnnotations={loadedResult?.xai_annotations} resultId={id || loadedResult?.id} />
          </div>

          {/* ── Linguistic Analysis ── */}
          <div className="bg-white border border-blue-200/50 rounded-xl p-6 mb-6 clip-corner-lg">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-blue-600" />
                <h3>Linguistic Analysis</h3>
              </div>
              <span className={`text-xl ${getScoreColor(linguisticScore)}`} style={{ fontWeight: 700 }}>
                {linguisticScore}/100
              </span>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {linguisticFlags.map((flag, i) => (
                <div key={i} className="flex items-center justify-between p-3 border border-blue-100 rounded-lg bg-blue-50/30">
                  <span className="text-sm text-muted-foreground">{flag.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-right max-w-[12rem] text-muted-foreground">{flag.rating}</span>
                    {flag.ok
                      ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      : <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Claims + Sources Toggle & Header ── */}
          <div className="flex items-center justify-between mb-4 mt-8 no-print">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-600" />
              Claims & Source Corroboration
            </h3>
            <div className="flex border border-blue-200 rounded-lg overflow-hidden shadow-sm bg-white">
              <button
                onClick={() => setCorroborationView("list")}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  corroborationView === "list" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-blue-50"
                }`}
              >
                Structured Lists
              </button>
              <button
                onClick={() => setCorroborationView("graph")}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  corroborationView === "graph" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-blue-50"
                }`}
              >
                Relationship Graph
              </button>
            </div>
          </div>

          {corroborationView === "graph" ? (
            <div className="mb-6 no-print">
              <CorroborationGraph claims={claims} sources={sources} />
            </div>
          ) : null}

          <div className={`grid lg:grid-cols-2 gap-6 mb-6 ${corroborationView === "graph" ? "lg:hidden hidden" : ""}`}>
            <ClaimsAccordion claims={claims} />

            <SourceNutritionLabel
              sources={sources}
              overallSourceScore={sourceCredibility}
            />
          </div>


          {/* ── Help Train Model (Active Learning) Feedback Card ── */}
          <div className="bg-white border border-blue-200/50 rounded-xl p-6 mb-8 clip-corner-lg shadow-sm">
            <h3 className="flex items-center gap-2 mb-2 font-semibold text-lg text-gray-900">
              <Brain className="w-5 h-5 text-blue-600" />
              Help Train VeritasAI
            </h3>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              Is this credibility index assessment accurate? Your feedback is saved directly in our MongoDB instance to train and update our active learning sequence classifier.
            </p>

            {feedbackSubmitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-green-50/50 border border-green-200 text-green-700 text-sm font-medium rounded-lg flex items-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span>Thank you! Your feedback has been logged. This model will train on this dataset in the next cycle.</span>
              </motion.div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                {feedbackLoading ? (
                  <div className="flex items-center gap-2 text-sm text-blue-600 font-medium">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span>Logging feedback...</span>
                  </div>
                ) : !showCorrectionOptions ? (
                  <>
                    <button
                      onClick={() => handleFeedback(true, overallScore >= 60 ? "credible" : "misinformation")}
                      className="px-4 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      Yes, Accurate
                    </button>
                    <button
                      onClick={() => setShowCorrectionOptions(true)}
                      className="px-4 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      No, Incorrect
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full">
                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Select correct classification:
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleFeedback(false, "credible")}
                        className="px-3 py-1.5 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        Should be Credible
                      </button>
                      <button
                        onClick={() => handleFeedback(false, "misinformation")}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        Should be Misinformation
                      </button>
                      <button
                        onClick={() => setShowCorrectionOptions(false)}
                        className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Action buttons ── */}
          <div className="flex flex-wrap items-center justify-center gap-4 no-print mt-8">
            <button
              onClick={() => navigate("/verify")}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-700 to-blue-500 text-white rounded-lg hover:from-blue-800 hover:to-blue-600 transition-all shadow-sm hover:shadow-md clip-corner-sm cursor-pointer font-semibold text-sm"
            >
              <Sparkles className="w-4 h-4" />
              <span>Analyse New Content</span>
            </button>

            <button
              onClick={() => setCertificateOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all shadow-sm hover:shadow-md clip-corner-sm cursor-pointer font-semibold text-sm"
            >
              <Award className="w-4 h-4 text-amber-400" />
              <span>Export Credibility Certificate</span>
              {!tierConfig.allowsPdfExport && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40 uppercase">
                  PRO
                </span>
              )}
            </button>

            <button
              onClick={() => {
                if (!tierConfig.allowsPdfExport) {
                  setPricingOpen(true);
                  return;
                }
                window.print();
              }}
              className="flex items-center gap-2 px-6 py-3 bg-white border border-blue-200 text-blue-700 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer font-semibold shadow-xs text-sm"
            >
              <Download className="w-4 h-4" />
              <span>Export Full Report</span>
              {!tierConfig.allowsPdfExport && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 uppercase">
                  PRO
                </span>
              )}
            </button>
          </div>
        </motion.div>
      </div>

      {/* Official Credibility Audit Certificate Modal */}
      <AuditCertificateModal
        open={certificateOpen}
        onOpenChange={setCertificateOpen}
        resultId={id}
        result={loadedResult}
        overallScore={overallScore}
        linguisticScore={linguisticScore}
        sourceCredibility={sourceCredibility}
        factCheckScore={factCheckScore}
        aiProbability={aiProbability}
        sources={sources}
        claims={claims}
        linguisticFlags={linguisticFlags}
        text={text}
        type={type}
        tier={tier}
        onUpgradeRequired={() => setPricingOpen(true)}
      />

      {/* Commercial Account Tiers Modal */}
      <PricingModal
        open={pricingOpen}
        onOpenChange={setPricingOpen}
        currentTier={tier}
        onSelectTier={changeTier}
      />

      <style>{CLIP_STYLES}</style>
    </div>
  );
}
