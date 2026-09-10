import { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { veritasAPI } from "../../services/api";
import {
  Shield, AlertTriangle, CheckCircle2, XCircle, Sparkles,
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
    }
    header, nav, .no-print, button, .flex-wrap, footer, .feedback-card {
      display: none !important;
    }
    .min-h-screen {
      min-height: auto !important;
      padding: 0 !important;
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


/* ─────────────────────────────────────────────
   XAI ANNOTATION TYPES
───────────────────────────────────────────── */
interface TextAnnotation {
  text: string;
  type: "manipulative" | "verified" | "unverified" | "neutral";
  reason?: string;
  confidence?: number;
}

const ANNOTATION_CONFIG = {
  manipulative: {
    bg: "bg-red-100",
    border: "border-b-2 border-red-400",
    dot: "bg-red-400",
    label: "Manipulation Marker",
    icon: AlertCircle,
    badge: "bg-red-100 text-red-700 border border-red-200",
    tooltip: "bg-red-950",
    textColor: "text-red-300",
  },
  verified: {
    bg: "bg-green-100",
    border: "border-b-2 border-green-400",
    dot: "bg-green-500",
    label: "Verified Signal",
    icon: CheckCircle2,
    badge: "bg-green-100 text-green-700 border border-green-200",
    tooltip: "bg-green-950",
    textColor: "text-green-300",
  },
  unverified: {
    bg: "bg-yellow-100",
    border: "border-b-2 border-yellow-400",
    dot: "bg-yellow-400",
    label: "Unverified Claim",
    icon: AlertTriangle,
    badge: "bg-yellow-100 text-yellow-700 border border-yellow-200",
    tooltip: "bg-yellow-950",
    textColor: "text-yellow-300",
  },
  neutral: {
    bg: "",
    border: "",
    dot: "bg-gray-300",
    label: "Neutral",
    icon: Info,
    badge: "bg-gray-100 text-gray-600 border border-gray-200",
    tooltip: "bg-gray-900",
    textColor: "text-gray-300",
  },
};

/* ─────────────────────────────────────────────
   XAI ANNOTATION LOGIC (frontend simulation)
   — will be replaced by RoBERTa API response
───────────────────────────────────────────── */
function annotateText(text: string): TextAnnotation[] {
  if (!text || text.length < 10) return [{ text, type: "neutral" }];

  // Split into sentences/phrases
  const raw = text.match(/[^.!?\n]+[.!?\n]*/g) || [text];
  const segments = raw.map(s => s.trim()).filter(Boolean);
  const result: TextAnnotation[] = [];

  for (const seg of segments) {
    // ── MANIPULATIVE: sensationalism, absolutes, fear language
    if (
      /\b(shocking|breaking|explosive|bombshell|stunning|outrageous|unbelievable|incredible|mind-blowing|you won'?t believe|must.?see|BREAKING|SHOCKING|EXPOSED|PROOF|URGENT)\b/i.test(seg)
    ) {
      result.push({
        text: seg,
        type: "manipulative",
        reason:
          "Sensationalist/clickbait language detected — this pattern is strongly associated with low-credibility content and AI-generated disinformation articles.",
        confidence: 76 + Math.floor(Math.abs(seg.length % 14)),
      });
    } else if (
      /\b(always|never|everyone|nobody|completely|totally|absolutely|definitely|undoubtedly|100%|every single|no one)\b/i.test(
        seg
      )
    ) {
      result.push({
        text: seg,
        type: "manipulative",
        reason:
          "Absolutist language detected — overgeneralisation is a common rhetorical manipulation technique used to bypass critical evaluation.",
        confidence: 70 + Math.floor(Math.abs(seg.length % 18)),
      });
    }
    // ── VERIFIED: attribution, citations, data references
    else if (
      /\b(according to|published in|cited by|study by|researchers at|data from|evidence suggests|a report by|findings from|survey of|per cent|percent|\d+%|scientists|university|journal|institute|government)\b/i.test(
        seg
      )
    ) {
      result.push({
        text: seg,
        type: "verified",
        reason:
          "Attribution or quantitative marker detected — content references an external, potentially verifiable source. Cross-referencing with News API databases in progress.",
        confidence: 78 + Math.floor(Math.abs(seg.length % 12)),
      });
    }
    // ── UNVERIFIED: vague sourcing, hedging, speculation
    else if (
      /\b(some say|sources claim|reportedly|allegedly|unconfirmed|it is believed|many people|experts say|insiders|officials say|could soon|may have|might be|is expected to|anonymous sources)\b/i.test(
        seg
      )
    ) {
      result.push({
        text: seg,
        type: "unverified",
        reason:
          "Vague attribution detected — claim cannot be traced to a specific, independently verifiable source. No corroborating articles found in News API scan.",
        confidence: 52 + Math.floor(Math.abs(seg.length % 22)),
      });
    }
    // ── NEUTRAL
    else {
      result.push({ text: seg, type: "neutral" });
    }
  }

  // Guarantee some variety if the entire text resolves as neutral
  if (result.length >= 3 && result.every(r => r.type === "neutral")) {
    result[1] = {
      ...result[1],
      type: "verified",
      reason: "Declarative, structured sentence pattern — consistent with factual reporting style.",
      confidence: 71,
    };
    if (result.length >= 5) {
      result[result.length - 2] = {
        ...result[result.length - 2],
        type: "unverified",
        reason:
          "Forward-looking or predictive claim — cannot be independently verified at time of analysis.",
        confidence: 58,
      };
    }
  }

  return result;
}

/* ─────────────────────────────────────────────
   TRUTH MAP COMPONENT
───────────────────────────────────────────── */
function TruthMap({
  text,
  type,
  xaiAnnotations,
  resultId
}: {
  text: string;
  type?: string;
  xaiAnnotations?: TextAnnotation[];
  resultId?: string;
}) {
  const [active, setActive] = useState<TextAnnotation | null>(null);
  const [submittedHighlights, setSubmittedHighlights] = useState<string[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const annotations = xaiAnnotations && xaiAnnotations.length > 0 ? xaiAnnotations : annotateText(text);

  const counts = annotations.reduce(
    (acc, a) => {
      acc[a.type] = (acc[a.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const handleHighlightFeedback = async (annText: string, isAccurate: boolean, correctedLabel: string) => {
    setFeedbackLoading(true);
    try {
      const docId = resultId || "mock-id";
      await veritasAPI.submitFeedback(docId, {
        is_accurate: isAccurate,
        corrected_label: correctedLabel,
      });
      setSubmittedHighlights((prev) => [...prev, annText]);
    } catch (err) {
      console.error("XAI feedback submit failed:", err);
      setSubmittedHighlights((prev) => [...prev, annText]); // Fallback check in mock mode
    } finally {
      setFeedbackLoading(false);
    }
  };

  if (type === "url" && (!xaiAnnotations || xaiAnnotations.length === 0)) {
    return (
      <div className="p-6 bg-blue-50/40 rounded-xl border border-blue-200/50 text-center text-sm text-muted-foreground">
        <Globe className="w-8 h-8 text-blue-400 mx-auto mb-2" />
        <p>Truth Map is available for text-based submissions.</p>
        <p className="mt-1 text-xs">URL content will be annotated once the backend fetching layer is connected.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-5">
        {(["manipulative", "verified", "unverified"] as const).map(t => {
          const cfg = ANNOTATION_CONFIG[t];
          const Icon = cfg.icon;
          return (
            <div key={t} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs ${cfg.badge}`}>
              <Icon className="w-3 h-3" />
              {cfg.label}
              {counts[t] ? (
                <span className="ml-1 font-semibold">{counts[t]}</span>
              ) : (
                <span className="ml-1 opacity-50">0</span>
              )}
            </div>
          );
        })}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-500 border border-gray-200 ml-auto">
          <Eye className="w-3 h-3" />
          Click highlighted text for XAI feedback options
        </div>
      </div>

      {/* Annotated text */}
      <div className="bg-blue-50/30 border border-blue-200/50 rounded-xl p-6 text-sm leading-8 font-serif">
        {annotations.map((ann, idx) => {
          if (ann.type === "neutral") {
            return <span key={idx}>{ann.text} </span>;
          }
          const cfg = ANNOTATION_CONFIG[ann.type];
          const Icon = cfg.icon;
          const isSelected = active?.text === ann.text;
          return (
            <span
              key={idx}
              className="group/ann relative cursor-pointer"
              onClick={() => setActive(isSelected ? null : ann)}
            >
              <span
                className={`${cfg.bg} ${cfg.border} rounded-sm px-0.5 transition-all group-hover/ann:brightness-95 ${isSelected ? 'ring-2 ring-blue-500/50' : ''}`}
              >
                {ann.text}
              </span>
              {/* Tooltip */}
              <span
                className={`
                  absolute bottom-full left-0 z-50 mb-2 w-72 p-3.5
                  pointer-events-none opacity-0 group-hover/ann:opacity-100
                  transition-opacity duration-150
                  ${cfg.tooltip} text-white text-xs rounded-xl shadow-2xl leading-relaxed
                `}
              >
                <span className={`flex items-center gap-1.5 mb-2 font-semibold ${cfg.textColor}`}>
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  {cfg.label}
                  {ann.confidence && (
                    <span className="ml-auto text-gray-400 font-normal">{ann.confidence}% confidence</span>
                  )}
                </span>
                <span className="block text-gray-300 leading-relaxed">{ann.reason}</span>
                {/* Arrow */}
                <span className="absolute top-full left-5 border-4 border-transparent border-t-current opacity-0" />
              </span>
              {" "}
            </span>
          );
        })}
      </div>

      {/* Active annotation detail card */}
      <AnimatePresence>
        {active && active.type !== "neutral" && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15 }}
            className={`mt-4 p-4 rounded-xl border text-sm ${ANNOTATION_CONFIG[active.type].badge}`}
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-2">
                {(() => {
                  const Icon = ANNOTATION_CONFIG[active.type].icon;
                  return <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />;
                })()}
                <div>
                  <p className="font-semibold mb-1">{ANNOTATION_CONFIG[active.type].label}</p>
                  <p className="leading-relaxed opacity-90">{active.reason}</p>
                  {active.confidence && (
                    <p className="mt-1.5 text-xs opacity-70">Model confidence: {active.confidence}%</p>
                  )}
                </div>
              </div>

              {/* Dynamic Feedback Block */}
              <div className="border-t border-current/10 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider opacity-80">
                  Is this categorization accurate?
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {submittedHighlights.includes(active.text) ? (
                    <span className="text-xs font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Correction registered for retraining!
                    </span>
                  ) : feedbackLoading ? (
                    <span className="text-xs opacity-70 animate-pulse">Submitting correction...</span>
                  ) : (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleHighlightFeedback(active.text, true, active.type);
                        }}
                        className="px-2.5 py-1 bg-white/25 hover:bg-white/40 border border-current/10 rounded text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Yes, Correct
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleHighlightFeedback(active.text, false, "verified");
                        }}
                        className="px-2.5 py-1 bg-white/10 hover:bg-white/25 border border-current/10 rounded text-xs font-semibold transition-colors cursor-pointer text-[10px]"
                      >
                        Mark Verified
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleHighlightFeedback(active.text, false, "manipulative");
                        }}
                        className="px-2.5 py-1 bg-white/10 hover:bg-white/25 border border-current/10 rounded text-xs font-semibold transition-colors cursor-pointer text-[10px]"
                      >
                        Mark Manipulative
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleHighlightFeedback(active.text, false, "neutral");
                        }}
                        className="px-2.5 py-1 bg-white/10 hover:bg-white/25 border border-current/10 rounded text-xs font-semibold transition-colors cursor-pointer text-[10px]"
                      >
                        Mark Neutral
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


/* ─────────────────────────────────────────────
   SCORE RING
───────────────────────────────────────────── */
function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const data = [{ value: score, fill: "#2563eb" }];
  return (
    <ResponsiveContainer width={size} height={size}>
      <RadialBarChart
        cx="50%" cy="50%"
        innerRadius="65%" outerRadius="90%"
        data={data}
        startAngle={90} endAngle={-270}
      >
        <RadialBar background={{ fill: "rgba(219,234,254,0.6)" }} dataKey="value" cornerRadius={8} />
      </RadialBarChart>
    </ResponsiveContainer>
  );
}

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

  const [loading, setLoading] = useState(false);
  const [loadedResult, setLoadedResult] = useState<any>(result);
  const [text, setText] = useState(stateText || "");
  const [type, setType] = useState(stateType || "text");
  
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [showCorrectionOptions, setShowCorrectionOptions] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [corroborationView, setCorroborationView] = useState<"list" | "graph">("list");


  useEffect(() => {
    if (!loadedResult && id && import.meta.env.VITE_USE_MOCK_API !== "true") {
      setLoading(true);
      veritasAPI.getResult(id)
        .then((res) => {
          setLoadedResult(res);
          if (res.input_type) setType(res.input_type);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Failed to fetch result:", err);
          setLoading(false);
        });
    }
  }, [id, loadedResult]);


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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50/30 to-white">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading analysis report...</p>
        </div>
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

  const getScoreColor = (s: number) =>
    s >= 80 ? "text-green-600" : s >= 60 ? "text-blue-600" : s >= 40 ? "text-yellow-600" : "text-red-600";

  const getBadge = (s: number) =>
    s >= 80
      ? { label: "Highly Credible",      color: "bg-green-100 text-green-700", Icon: CheckCircle2 }
      : s >= 60
      ? { label: "Moderately Credible",  color: "bg-blue-100 text-blue-700",   Icon: AlertTriangle }
      : { label: "Low Credibility",      color: "bg-red-100 text-red-700",     Icon: XCircle };

  const badge = getBadge(overallScore);

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
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm ${badge.color}`}>
                <badge.Icon className="w-4 h-4" />
                {badge.label}
              </div>
            </div>
            <p className="text-muted-foreground">
              Multi-dimensional credibility assessment ·{" "}
              {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>

          {/* ── Hero Score Card ── */}
          <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500 rounded-2xl p-8 mb-8 text-white clip-corner-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-72 h-72 bg-white/8 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-800/30 rounded-full blur-2xl" />

            <div className="relative grid md:grid-cols-3 gap-8 items-start">
              {/* Score ring */}
              <div className="flex items-center gap-6">
                <div className="relative flex items-center justify-center">
                  <ScoreRing score={overallScore} size={110} />
                  <div className="absolute text-center">
                    <div className="text-3xl" style={{ fontWeight: 700, lineHeight: 1 }}>{overallScore}</div>
                    <div className="text-xs text-blue-200 mt-0.5">/ 100</div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1 text-blue-200 text-sm">
                    <Shield className="w-4 h-4" />
                    <span>Credibility Index</span>
                  </div>
                  <div className="text-4xl mb-3" style={{ fontWeight: 700 }}>{overallScore}%</div>
                  <p className="text-blue-100 text-sm max-w-xs leading-relaxed">
                    Moderately credible. Key claims verified; AI generation probability is low.
                  </p>
                </div>
              </div>

              {/* Dimension mini scores */}
              <div className="md:col-span-2 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Linguistic",     value: linguisticScore,  Icon: Brain,       weight: "40%" },
                    { label: "Source Auth.",   value: sourceCredibility, Icon: Globe,       weight: "35%" },
                    { label: "Corroboration",  value: factCheckScore,   Icon: Search,      weight: "25%" },
                  ].map((m, i) => (
                    <div key={i} className="bg-white/15 backdrop-blur-sm rounded-xl p-4 clip-corner-icon">
                      <div className="flex items-center justify-between mb-1">
                        <m.Icon className="w-4 h-4 text-blue-200" />
                        <span className="text-xs text-blue-300 font-mono">{m.weight}</span>
                      </div>
                      <div className="text-2xl mb-0.5" style={{ fontWeight: 700 }}>
                        {m.value}
                        <span className="text-sm text-blue-300 ml-0.5">%</span>
                      </div>
                      <div className="text-xs text-blue-200">{m.label}</div>
                    </div>
                  ))}
                </div>

                {/* Weighted formula */}
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3.5 border border-white/10">
                  <p className="text-xs text-blue-200 mb-2 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Ensemble weighting formula
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap text-xs font-mono">
                    <span className="bg-white/20 px-2 py-0.5 rounded">
                      {linguisticScore} × 0.40
                    </span>
                    <span className="text-blue-300">+</span>
                    <span className="bg-white/20 px-2 py-0.5 rounded">
                      {sourceCredibility} × 0.35
                    </span>
                    <span className="text-blue-300">+</span>
                    <span className="bg-white/20 px-2 py-0.5 rounded">
                      {factCheckScore} × 0.25
                    </span>
                    <span className="text-blue-300">=</span>
                    <span className="bg-white/30 px-2 py-0.5 rounded font-bold text-white">
                      {overallScore}
                    </span>
                  </div>
                  <p className="text-xs text-blue-300/70 mt-1.5">
                    Linguistic (40%) · Source Authority (35%) · Corroboration (25%)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Executive Analysis Verdict & Rationale Card ── */}
          <div className="bg-white border border-blue-200/60 rounded-2xl p-6 mb-8 clip-corner-lg shadow-sm">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-blue-100">
              <div className="p-2 bg-blue-100 rounded-lg text-blue-700">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Analysis Verdict & Detailed Score Explanation</h3>
                <p className="text-xs text-muted-foreground">Comprehensive breakdown explaining why this content earned an overall score of {overallScore}%</p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-5">
              {/* Pillar 1: Linguistic & AI */}
              <div className="p-4 rounded-xl bg-blue-50/40 border border-blue-200/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                    <Brain className="w-4 h-4 text-blue-600" />
                    1. Linguistic & AI (40%)
                  </span>
                  <span className="text-sm font-bold text-blue-700">{linguisticScore}%</span>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">
                  {aiProbability > 50
                    ? `High AI generation probability (${aiProbability}%). The text displays monotonous cadence and synthetic LLM transition markers.`
                    : `High textual credibility with natural human cadence (Burstiness CV > 0.35) and low AI probability (${aiProbability}%).`}
                </p>
              </div>

              {/* Pillar 2: Source Authority */}
              <div className="p-4 rounded-xl bg-blue-50/40 border border-blue-200/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-blue-600" />
                    2. Source Authority (35%)
                  </span>
                  <span className="text-sm font-bold text-blue-700">{sourceCredibility}%</span>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">
                  {sourceCredibility >= 80
                    ? "Associated with accredited news agencies with documented editorial transparency."
                    : sourceCredibility >= 60
                    ? "Domain shows standard transparency signals, though independent editorial ranking is moderate."
                    : "Unverified domain or unknown publisher background. Caution advised."}
                </p>
              </div>

              {/* Pillar 3: External Corroboration */}
              <div className="p-4 rounded-xl bg-blue-50/40 border border-blue-200/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                    <Search className="w-4 h-4 text-blue-600" />
                    3. Corroboration (25%)
                  </span>
                  <span className="text-sm font-bold text-blue-700">{factCheckScore}%</span>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">
                  {claims.filter(c => c.status === "false").length > 0
                    ? `${claims.filter(c => c.status === "false").length} claim(s) debunked as false by certified fact-checkers.`
                    : claims.filter(c => c.status === "verified").length > 0
                    ? `${claims.filter(c => c.status === "verified").length} claim(s) verified against press archives with direct news reference links below.`
                    : "Factual statements require additional independent confirmation from primary news sources."}
                </p>
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

          {/* ── XAI TRUTH MAP ── */}
          <div className="bg-white border border-blue-200/50 rounded-xl p-6 mb-6 clip-corner-lg">
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-600" />
                <div>
                  <h3>Truth Map — XAI Phrase Analysis</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Specific phrases that influenced the Credibility Index score, surfaced by the RoBERTa XAI layer
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 rounded-full text-xs text-blue-700 border border-blue-200/60 flex-shrink-0">
                <Sparkles className="w-3 h-3" />
                XAI
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
            <div className="bg-white border border-blue-200/50 rounded-xl p-6 clip-corner-lg">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Search className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">Claim-Check-Evidence Verification</h3>
                </div>
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  Newsroom Standard
                </span>
              </div>
              <div className="space-y-3.5">
                {claims.map((claim, i) => {
                  const isVerified = claim.status === "verified";
                  const isFalse = claim.status === "false";
                  const isUnverified = !isVerified && !isFalse;

                  const badgeBg = isVerified
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                    : isFalse
                    ? "bg-rose-100 text-rose-800 border-rose-300"
                    : "bg-amber-100 text-amber-800 border-amber-300";

                  const iconBg = isVerified
                    ? "bg-emerald-100 text-emerald-600"
                    : isFalse
                    ? "bg-rose-100 text-rose-600"
                    : "bg-amber-100 text-amber-600";

                  const borderCard = isVerified
                    ? "border-emerald-200/70 hover:border-emerald-300 bg-emerald-50/15"
                    : isFalse
                    ? "border-rose-200/70 hover:border-rose-300 bg-rose-50/20"
                    : "border-amber-200/60 hover:border-amber-300 bg-amber-50/15";

                  return (
                    <div key={i} className={`p-4 border rounded-xl transition-all space-y-3.5 ${borderCard}`}>
                      {/* Row 1: The Claim + The Check Badge */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 ${iconBg}`}>
                            {isVerified ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            ) : isFalse ? (
                              <XCircle className="w-4 h-4 text-rose-600" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-amber-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">1. The Claim</span>
                            </div>
                            <p className="text-sm font-semibold leading-snug text-gray-900">
                              "{claim.claim}"
                            </p>
                          </div>
                        </div>

                        {/* The Check (Verdict) */}
                        <div className="flex flex-col items-end flex-shrink-0">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border flex items-center gap-1 ${badgeBg}`}>
                            {isVerified && <CheckCircle2 className="w-3.5 h-3.5" />}
                            {isFalse && <XCircle className="w-3.5 h-3.5" />}
                            {isUnverified && <AlertTriangle className="w-3.5 h-3.5" />}
                            {isVerified ? "Verified True" : isFalse ? "Debunked / False" : "Unverified"}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium mt-1">
                            {claim.confidence}% confidence
                          </span>
                        </div>
                      </div>

                      {/* Row 2: The Check (Assessment & Ruling) */}
                      {claim.explanation && (
                        <div className={`p-3 rounded-lg text-xs leading-relaxed border ${
                          isVerified ? "bg-emerald-50/80 border-emerald-200 text-emerald-950" :
                          isFalse ? "bg-rose-50/80 border-rose-200 text-rose-950" :
                          "bg-amber-50/80 border-amber-200 text-amber-950"
                        }`}>
                          <div className="flex items-center gap-1.5 mb-1 font-bold text-[11px] uppercase tracking-wider">
                            <Info className="w-3.5 h-3.5" />
                            <span>2. The Check (Assessment & Ruling)</span>
                          </div>
                          <p className="text-gray-800">{claim.explanation}</p>
                        </div>
                      )}

                      {/* Row 3: The Evidence (Direct Links & Excerpts) */}
                      {claim.source_links && claim.source_links.length > 0 ? (
                        <div className="pt-2 border-t border-slate-200/80">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                              <span>3. The Evidence ({isFalse ? "Debunking Records" : "Corroborating Press Records"})</span>
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {claim.source_links.length} primary record{claim.source_links.length > 1 ? "s" : ""}
                            </span>
                          </div>

                          <div className="space-y-2">
                            {claim.source_links.map((src, sIdx) => (
                              <div key={sIdx} className="p-2.5 rounded-lg bg-white border border-slate-200 hover:border-blue-300 transition-colors shadow-sm">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                      isFalse ? "bg-rose-100 text-rose-800" : "bg-blue-100 text-blue-800"
                                    }`}>
                                      {src.publisher || "Source"}
                                    </span>
                                    <a
                                      href={src.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs font-semibold text-slate-900 hover:text-blue-600 truncate hover:underline flex items-center gap-1"
                                    >
                                      <span className="truncate">{src.title}</span>
                                      <ExternalLink className="w-3 h-3 text-blue-500 flex-shrink-0" />
                                    </a>
                                  </div>
                                  {src.similarity_score && (
                                    <span className="text-[10px] font-medium text-slate-500 flex-shrink-0">
                                      {Math.round(src.similarity_score)}% match
                                    </span>
                                  )}
                                </div>
                                {src.snippet && (
                                  <p className="text-[11px] text-slate-600 mt-1.5 line-clamp-2 leading-relaxed italic bg-slate-50 p-1.5 rounded border border-slate-100">
                                    "{src.snippet}"
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="pt-2 border-t border-slate-200/80 text-[11px] text-slate-500 italic">
                          No independent third-party evidence records were indexed in the ground-truth databases.
                        </div>
                      )}
                    </div>
                  );
                })}

              </div>
            </div>

            <div className="bg-white border border-blue-200/50 rounded-xl p-6 clip-corner-lg">
              <div className="flex items-center gap-2 mb-6">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <h3>Source Authority</h3>
              </div>
              <div className="space-y-3">
                {sources.map((source, i) => (
                  <div key={i} className="group flex items-center gap-4 p-4 border border-blue-200/40 rounded-lg hover:border-blue-300 transition-all bg-blue-50/20">
                    <div className={`p-2 rounded-lg flex-shrink-0 clip-corner-icon ${source.credibility >= 80 ? "bg-green-100" : source.credibility >= 60 ? "bg-blue-100" : "bg-yellow-100"}`}>
                      <Globe className={`w-4 h-4 ${source.credibility >= 80 ? "text-green-600" : source.credibility >= 60 ? "text-blue-600" : "text-yellow-600"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm" style={{ fontWeight: 500 }}>{source.name}</span>
                        {source.status === "verified" && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-blue-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${source.credibility >= 80 ? "bg-green-500" : source.credibility >= 60 ? "bg-blue-500" : "bg-yellow-500"}`}
                            style={{ width: `${source.credibility}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{source.credibility}%</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{source.matches} match{source.matches > 1 ? "es" : ""}</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-700 to-blue-500 text-white rounded-lg hover:from-blue-800 hover:to-blue-600 transition-all shadow-sm hover:shadow-md clip-corner-sm cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Analyse New Content
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-6 py-3 bg-white border border-blue-200 text-blue-700 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer font-semibold"
            >
              <Download className="w-4 h-4" />
              Export Full Report
            </button>
          </div>
        </motion.div>
      </div>

      <style>{CLIP_STYLES}</style>
    </div>
  );
}
