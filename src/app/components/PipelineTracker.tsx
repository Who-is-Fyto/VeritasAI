import React, { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FileText, Brain, Globe, Search, Shield, Sparkles, CheckCircle2,
  Terminal, Activity, Cpu, Layers
} from "lucide-react";
import { Skeleton } from "./ui/skeleton";

export interface PipelineStep {
  id: number;
  label: string;
  shortName: string;
  description: string;
  icon: React.ElementType;
  techBadge: string;
  telemetry: string;
}

export const PIPELINE_STEPS: PipelineStep[] = [
  {
    id: 0,
    label: "Content Ingestion & Cleansing",
    shortName: "Ingestion",
    description: "Cleansing raw text markup, parsing URL DOM structure, and segmenting core claims.",
    icon: FileText,
    techBadge: "BeautifulSoup4 / Trafilatura",
    telemetry: "Stripping boilerplate · Segmenting sentence tokens · Sanitizing inputs",
  },
  {
    id: 1,
    label: "RoBERTa Transformer Inference",
    shortName: "Linguistics",
    description: "Running 12-layer attention heads across fine-tuned LIAR and FakeNewsNet weights.",
    icon: Brain,
    techBadge: "RoBERTa-base (125M params)",
    telemetry: "Stylometric tokenization · Perplexity calculation · Emotional valence scoring",
  },
  {
    id: 2,
    label: "Source Authority Verification",
    shortName: "Authority",
    description: "Resolving publisher domain credibility, ownership masthead, and MediaBias whitelist records.",
    icon: Globe,
    techBadge: "MediaBias/FactCheck & Registry",
    telemetry: "Querying publisher registries · Transparency index check · Bias classification",
  },
  {
    id: 3,
    label: "News Wire Corroboration Scan",
    shortName: "Corroboration",
    description: "Cross-referencing claims across Reuters, Associated Press, AFP, and BBC News archives.",
    icon: Search,
    techBadge: "NewsAPI & Semantic Cross-Check",
    telemetry: "Clustering corroborating wire reports · Computing agreement ratio",
  },
  {
    id: 4,
    label: "Truth Map Synthesis & Ensemble Scoring",
    shortName: "Synthesis",
    description: "Compounding 40/35/25 weighted scores, generating XAI phrase highlights, and sealing audit record.",
    icon: Shield,
    techBadge: "Tri-Factor Ensemble (40/35/25)",
    telemetry: "Computing weighted Credibility Index · Sealing cryptographic audit trail",
  },
];

export const PIPELINE_STEP_LOGS: Record<number, string[]> = {
  0: [
    "▸ Initializing ingestion pipeline for input content...",
    "▸ Stripping boilerplate, tracking scripts, and HTML markup...",
    "▸ Extracting clean textual paragraphs and metadata...",
    "▸ Segmenting factual propositions for downstream evaluation...",
    "✓ Text pre-processing and claim extraction complete.",
  ],
  1: [
    "▸ Loading fine-tuned RoBERTa-base classifier (125M parameters)...",
    "▸ Computing byte-pair encoding (BPE) token embeddings...",
    "▸ Running 12 transformer encoder layers across sentence tokens...",
    "▸ Evaluating stylometric markers: emotional valence, sensationalism, hyperbole...",
    "✓ Linguistic credibility score computed: 88.0 / 100.",
  ],
  2: [
    "▸ Querying publisher domain authority and ownership masthead...",
    "▸ Cross-checking against MediaBias/FactCheck & NewsGuard registries...",
    "▸ Evaluating retraction history, editorial independence, and corrections policy...",
    "✓ Domain authority verified: high journalistic transparency record.",
  ],
  3: [
    "▸ Querying live global news wire databases (Reuters, AP, BBC, AFP)...",
    "▸ Running semantic similarity search against recent wire dispatches...",
    "▸ Found 3 matching corroborating reports from verified newsrooms...",
    "✓ Wire cross-reference confirmed: claims match verified reporting.",
  ],
  4: [
    "▸ Synthesizing tri-factor ensemble weights (40% NLP, 35% Source, 25% Wire)...",
    "▸ Generating explainable AI (XAI) phrase-level attention highlights...",
    "▸ Formatting claim extraction accordion and domain nutrition label...",
    "✓ Final Credibility Index compiled — rendering report...",
  ],
};

interface PipelineTrackerProps {
  currentStep: number;
  logMessages: string[];
  title?: string;
  subtitle?: string;
  showSkeletonPreview?: boolean;
}

export function PipelineTracker({
  currentStep,
  logMessages,
  title = "Analyzing Content Credibility",
  subtitle = "VeritasAI multi-dimensional inference engine is processing your submission across stylometric, publisher, and wire corroboration layers.",
  showSkeletonPreview = true,
}: PipelineTrackerProps) {
  const logEndRef = useRef<HTMLDivElement>(null);
  const activeStep = Math.max(0, Math.min(currentStep, PIPELINE_STEPS.length - 1));
  const currentStepData = PIPELINE_STEPS[activeStep];
  const StepIcon = currentStepData.icon;

  const progressPercent = Math.min(
    100,
    Math.round(((currentStep + 1) / PIPELINE_STEPS.length) * 100)
  );

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logMessages]);

  return (
    <div className="w-full space-y-8">
      {/* Tracker Card */}
      <div className="bg-white rounded-2xl border border-blue-200/80 shadow-xl p-6 sm:p-8 overflow-hidden relative animate-in fade-in duration-300">
        {/* Subtle background glow */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-blue-100/50 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-indigo-100/40 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold uppercase tracking-wider mb-2">
              <Activity className="w-3.5 h-3.5 animate-pulse text-blue-600" />
              <span>Real-Time Inference Pipeline</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
              {subtitle}
            </p>
          </div>

          {/* Progress Percent Badge */}
          <div className="flex md:flex-col items-center md:items-end justify-between gap-2 shrink-0">
            <div className="text-right">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-500 block">
                Pipeline Progress
              </span>
              <span className="text-3xl font-black text-blue-700 tracking-tight">
                {progressPercent}%
              </span>
            </div>
            <span className="text-[11px] font-medium text-slate-500">
              Stage {activeStep + 1} of {PIPELINE_STEPS.length}
            </span>
          </div>
        </div>

        {/* Multi-Step Animated Stepper */}
        <div className="my-8 relative">
          {/* Progress Bar Background */}
          <div className="hidden sm:block absolute top-5 left-8 right-8 h-1 bg-slate-100 rounded-full z-0" />
          <motion.div
            className="hidden sm:block absolute top-5 left-8 h-1 bg-gradient-to-r from-blue-700 via-blue-500 to-emerald-500 rounded-full z-0"
            initial={{ width: "0%" }}
            animate={{
              width: `${(activeStep / (PIPELINE_STEPS.length - 1)) * 100}%`,
            }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 relative z-10">
            {PIPELINE_STEPS.map((step) => {
              const IconComponent = step.icon;
              const isPast = currentStep > step.id;
              const isCurrent = currentStep === step.id;

              return (
                <div
                  key={step.id}
                  className={`flex flex-col items-center text-center p-3 sm:p-2 rounded-xl transition-all ${
                    isCurrent
                      ? "bg-blue-50/80 border border-blue-300 shadow-sm ring-2 ring-blue-500/10"
                      : isPast
                      ? "bg-slate-50/60 border border-slate-200"
                      : "bg-white border border-slate-100 opacity-60"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-xs mb-2 ${
                      isPast
                        ? "bg-emerald-600 text-white"
                        : isCurrent
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/20 ring-4 ring-blue-100"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {isPast ? (
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    ) : isCurrent ? (
                      <Sparkles className="w-5 h-5 animate-spin" />
                    ) : (
                      <IconComponent className="w-4 h-4" />
                    )}
                  </div>
                  <span
                    className={`text-xs font-bold leading-tight ${
                      isCurrent
                        ? "text-blue-900"
                        : isPast
                        ? "text-emerald-800"
                        : "text-slate-500"
                    }`}
                  >
                    {step.shortName}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5 hidden sm:block">
                    {isPast ? "Complete" : isCurrent ? "Processing" : "Queued"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Stage Highlight Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStep}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="p-5 rounded-2xl bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white border border-blue-200/80 mb-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-sm">
                  <StepIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase font-bold tracking-wider text-blue-700">
                      Active Stage {activeStep + 1}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-semibold">
                      <Cpu className="w-3 h-3 text-blue-600" />
                      {currentStepData.techBadge}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    {currentStepData.label}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                <span className="text-xs font-semibold text-blue-800 uppercase tracking-wider">
                  In Progress
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed pl-0 sm:pl-12">
              {currentStepData.description}
            </p>

            <div className="mt-3 pt-3 border-t border-blue-200/40 flex items-center gap-2 text-xs font-mono text-slate-600 pl-0 sm:pl-12">
              <Layers className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="truncate">{currentStepData.telemetry}</span>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Live Terminal Stream */}
        <div className="rounded-2xl overflow-hidden border border-slate-800 shadow-xl bg-slate-950 font-mono text-xs">
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
              </div>
              <div className="flex items-center gap-1.5 ml-2">
                <Terminal className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-400 font-semibold text-[11px]">
                  veritas-inference.log
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Live Pipe</span>
            </div>
          </div>

          <div className="p-4 space-y-1.5 max-h-48 overflow-y-auto scroll-smooth">
            {logMessages.map((msg, i) => {
              if (!msg) return null;
              const isSuccess = msg.startsWith("✓");
              const isFailure = msg.startsWith("✗");
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15 }}
                  className={`flex items-start gap-2 leading-relaxed ${
                    isSuccess
                      ? "text-emerald-400 font-medium"
                      : isFailure
                      ? "text-red-400 font-medium"
                      : "text-blue-300"
                  }`}
                >
                  <span className="text-slate-600 select-none text-[10px] pt-0.5">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>{msg}</span>
                </motion.div>
              );
            })}
            <div className="flex items-center gap-1 text-slate-500 pt-1 text-[11px]">
              <span className="inline-block w-2 h-3 bg-blue-400 animate-pulse" />
              <span>Awaiting model step completion...</span>
            </div>
            <div ref={logEndRef} />
          </div>
        </div>
      </div>

      {/* Shimmering Skeleton Layout Preview */}
      {showSkeletonPreview && (
        <div className="space-y-6 pointer-events-none opacity-70 animate-in fade-in duration-300">
          <div className="text-center mb-2">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-500">
              Report Layout Preparing in Background...
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Gauge Skeleton */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col items-center justify-center space-y-4">
              <Skeleton className="w-32 h-32 rounded-full" />
              <Skeleton className="h-6 w-3/4 rounded-lg" />
              <Skeleton className="h-4 w-1/2 rounded-md" />
            </div>

            {/* Tri-factor Breakdown Skeleton */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 md:col-span-2">
              <Skeleton className="h-5 w-1/3 rounded-md" />
              <div className="space-y-3">
                <div className="space-y-1">
                  <Skeleton className="h-3 w-1/4 rounded" />
                  <Skeleton className="h-3 w-full rounded-full" />
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-3 w-1/4 rounded" />
                  <Skeleton className="h-3 w-full rounded-full" />
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-3 w-1/4 rounded" />
                  <Skeleton className="h-3 w-full rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Truth Map Skeleton */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
            <Skeleton className="h-5 w-1/4 rounded-md" />
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-5/6 rounded" />
            <Skeleton className="h-4 w-4/6 rounded" />
          </div>
        </div>
      )}
    </div>
  );
}
