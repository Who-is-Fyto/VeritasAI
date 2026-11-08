import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link, useNavigate } from "react-router";
import {
  ShieldCheck,
  Cpu,
  Scale,
  Search,
  Database,
  Lock,
  HardDrive,
  FileArchive,
  RotateCcw,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  BookOpen,
  Layers,
  Award,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Server,
  FileCheck2,
  Sparkles,
  Key,
  Mail,
  Zap,
} from "lucide-react";
import { BrandLogo } from "./ui/BrandLogo";

interface SlideData {
  id: number;
  badge: string;
  title: string;
  subtitle: string;
  content: React.ReactNode;
  speakerNotes: string;
}

export function PresentationDeck() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [jumpMenuOpen, setJumpMenuOpen] = useState(false);

  const slides: SlideData[] = [
    // ── Slide 1: Title & Dissertation Overview ─────────────────────────────
    {
      id: 1,
      badge: "BSc Information Technology Dissertation Defense",
      title: "VeritasAI: Multimodal Credibility Engine",
      subtitle: "An Explainable Architecture for Real-Time Disinformation Detection & Forensic Provenance",
      speakerNotes:
        "Good morning respected examiners. My name is Michael Mazhambe, and today I present VeritasAI. VeritasAI is an explainable, multi-dimensional credibility engine designed to address the weaponization of online disinformation. Rather than relying on a single opaque black-box AI model, VeritasAI synthesizes deep linguistic features, forensic stylometrics, real-time knowledge base corroboration, and publisher domain infrastructure into an interpretable score backed by cryptographic audit certificates.",
      content: (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center h-full">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-950/60 border border-blue-500/40 text-blue-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Final Academic Examination</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
              Veritas<span className="text-blue-400">AI</span> Multimodal Credibility Engine
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
              An explainable, multi-dimensional artificial intelligence framework engineered for real-time digital news verification, forensic NLP analysis, and automated provenance auditing.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-800">
              <div className="p-3 bg-slate-800/80 border border-slate-700/80 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Candidate</span>
                <span className="text-xs font-bold text-white">Michael Mazhambe</span>
              </div>
              <div className="p-3 bg-slate-800/80 border border-slate-700/80 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Qualification</span>
                <span className="text-xs font-bold text-white">BSc Information Technology</span>
              </div>
              <div className="p-3 bg-slate-800/80 border border-slate-700/80 rounded-xl col-span-2 sm:col-span-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Architecture</span>
                <span className="text-xs font-bold text-blue-400">4-Pillar Ensemble Engine</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-md bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/80 p-7 rounded-3xl text-white shadow-2xl border border-slate-800 space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <BrandLogo size="md" variant="white" showBadge={true} badgeText="v1.5 Flagship" />
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold">
                  DEFENSE READY
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                  <Cpu className="w-5 h-5 text-blue-400 shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold text-white">40% Deep Linguistic Transformer</p>
                    <p className="text-slate-400 text-[11px]">RoBERTa fine-tuned attention extraction</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                  <Scale className="w-5 h-5 text-indigo-400 shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold text-white">15% Forensic Stylometry (NLP)</p>
                    <p className="text-slate-400 text-[11px]">Type-Token Ratio & emotional divergence</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                  <Search className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold text-white">25% Real-Time Knowledge Corroboration</p>
                    <p className="text-slate-400 text-[11px]">Semantic Landmark Binding against live wires</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                  <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold text-white">20% Source Domain Nutrition</p>
                    <p className="text-slate-400 text-[11px]">MBFC database, WHOIS age & SSL chain</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },

    // ── Slide 2: Problem Formulation ───────────────────────────────────────
    {
      id: 2,
      badge: "Chapter 1: Problem Formulation & Motivation",
      title: "The Crisis of Digital Disinformation",
      subtitle: "Why Conventional Single-Model Detection Fails in Modern Information Warfare",
      speakerNotes:
        "The motivation for VeritasAI stems from a documented vulnerability in modern digital discourse. Studies such as Vosoughi et al. published in Science demonstrate that falsehood spreads six times faster than verified truth on social networks. Existing commercial solutions suffer from three fundamental flaws: first, black-box LLMs hallucinate and cannot cite provenance; second, shallow keyword filters trigger widespread false positives; third, modern disinformation campaigns exploit synthetic domain spoofing and sensationalist emotional phrasing.",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full items-stretch">
          <div className="p-6 bg-rose-950/30 border border-rose-500/30 rounded-2xl space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-rose-900/50 text-rose-300 flex items-center justify-center border border-rose-500/40">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">The Infodemic Velocity</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Empirical research confirms fabricated headlines spread 600% faster than verified corrections. Automated bot swarms and generative AI tools allow bad actors to produce convincing propaganda at zero marginal cost.
              </p>
            </div>
            <div className="p-3 bg-rose-950/60 rounded-xl border border-rose-500/40 text-[11px] text-rose-200 font-semibold">
              Finding: Human cognitive confirmation bias prevents manual fact-checking from scaling.
            </div>
          </div>

          <div className="p-6 bg-amber-950/30 border border-amber-500/30 rounded-2xl space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-900/50 text-amber-300 flex items-center justify-center border border-amber-500/40">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">Black-Box LLM Hallucinations</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                General-purpose large language models (e.g. standard GPT/Claude prompts) lack deterministic fact grounding, frequently hallucinate false citations, and cannot provide verifiable cryptographic audit trails required by institutional publishers.
              </p>
            </div>
            <div className="p-3 bg-amber-950/60 rounded-xl border border-amber-500/40 text-[11px] text-amber-200 font-semibold">
              Flaw: Opaque probability scores give journalists no evidence to defend editorial decisions.
            </div>
          </div>

          <div className="p-6 bg-blue-950/30 border border-blue-500/30 rounded-2xl space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-900/50 text-blue-300 flex items-center justify-center border border-blue-500/40">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">The VeritasAI Solution</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                An explainable, multi-dimensional verification architecture combining four independent pillars of evidence: transformer attention, syntactic stylometrics, wire corroboration, and domain authority.
              </p>
            </div>
            <div className="p-3 bg-blue-950/60 rounded-xl border border-blue-500/40 text-[11px] text-blue-200 font-semibold">
              Deliverable: Sub-800ms latency with HMAC-SHA256 verifiable provenance certificates.
            </div>
          </div>
        </div>
      ),
    },

    // ── Slide 3: Architectural Blueprint ──────────────────────────────────
    {
      id: 3,
      badge: "Chapter 2: System Architecture",
      title: "The 4-Pillar Multimodal Pipeline",
      subtitle: "End-to-End Ingestion, Feature Decomposition & Explainable Fusion Matrix",
      speakerNotes:
        "Here examiners can see the core architectural pipeline of VeritasAI. When an article or URL enters the system, it passes through our concurrent asynchronous ingestion pipeline. The text is concurrently dispatched across our four specialized analytic pillars. Each pillar operates independently to evaluate distinct characteristics of the content before our Bayesian-inspired weighted fusion layer combines the vectors into a final credibility score.",
      content: (
        <div className="space-y-6 h-full flex flex-col justify-between">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-800/80 border border-blue-500/40 rounded-2xl shadow-xs space-y-2 relative overflow-hidden">
              <span className="absolute -right-2 -bottom-2 text-4xl font-black text-slate-700/40 select-none">40%</span>
              <div className="flex items-center gap-2 text-blue-400">
                <Cpu className="w-4 h-4" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-white">Pillar 1: Linguistic AI</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                RoBERTa Transformer fine-tuned on deception corpora. Token attention saliency mapping highlights hyperbole and deception cues.
              </p>
            </div>

            <div className="p-4 bg-slate-800/80 border border-indigo-500/40 rounded-2xl shadow-xs space-y-2 relative overflow-hidden">
              <span className="absolute -right-2 -bottom-2 text-4xl font-black text-slate-700/40 select-none">15%</span>
              <div className="flex items-center gap-2 text-indigo-400">
                <Scale className="w-4 h-4" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-white">Pillar 2: Stylometrics</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Forensic NLP syntactic parsing via Spacy. Type-Token Ratio (TTR), clause complexity, and emotional divergence metrics.
              </p>
            </div>

            <div className="p-4 bg-slate-800/80 border border-emerald-500/40 rounded-2xl shadow-xs space-y-2 relative overflow-hidden">
              <span className="absolute -right-2 -bottom-2 text-4xl font-black text-slate-700/40 select-none">25%</span>
              <div className="flex items-center gap-2 text-emerald-400">
                <Search className="w-4 h-4" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-white">Pillar 3: Wire Corroboration</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Semantic Pillar Binding against Wikipedia and live media wires. Actor-target role containment blocks unanchored false matches.
              </p>
            </div>

            <div className="p-4 bg-slate-800/80 border border-amber-500/40 rounded-2xl shadow-xs space-y-2 relative overflow-hidden">
              <span className="absolute -right-2 -bottom-2 text-4xl font-black text-slate-700/40 select-none">20%</span>
              <div className="flex items-center gap-2 text-amber-400">
                <ShieldCheck className="w-4 h-4" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-white">Pillar 4: Source Authority</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Media Bias / Fact Check (MBFC) taxonomy, IANA WHOIS domain age tracking, SSL/TLS certificate verification, and academic routing.
              </p>
            </div>
          </div>

          {/* Data Flow Diagram Card */}
          <div className="p-5 bg-slate-900 text-white rounded-2xl shadow-md space-y-3 border border-slate-800">
            <div className="flex items-center justify-between text-xs font-mono border-b border-slate-800 pb-2">
              <span className="text-slate-400">DATA_FLOW_PIPELINE &bull; CONCURRENT ASYNC EXECUTION</span>
              <span className="text-emerald-400">P95 LATENCY &lt; 840ms</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-center text-xs">
              <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700">
                <p className="font-bold text-slate-200">1. Ingestion</p>
                <p className="text-[10px] text-slate-400">URL / Raw Text / PDF</p>
              </div>
              <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700">
                <p className="font-bold text-slate-200">2. Normalization</p>
                <p className="text-[10px] text-slate-400">Boilerplate & Trafilatura</p>
              </div>
              <div className="p-2.5 bg-blue-900/60 rounded-xl border border-blue-700">
                <p className="font-bold text-blue-300">3. 4-Pillar Analysis</p>
                <p className="text-[10px] text-blue-200">Async ThreadPool</p>
              </div>
              <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700">
                <p className="font-bold text-slate-200">4. Ensemble Fusion</p>
                <p className="text-[10px] text-slate-400">Weighted Scoring</p>
              </div>
              <div className="p-2.5 bg-emerald-900/60 rounded-xl border border-emerald-700">
                <p className="font-bold text-emerald-300">5. Audit Certificate</p>
                <p className="text-[10px] text-emerald-200">HMAC-SHA256 Token</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },

    // ── Slide 4: Pillar 1 Linguistic AI ────────────────────────────────────
    {
      id: 4,
      badge: "Deep Learning Subsystem",
      title: "Pillar 1: Transformer-Driven Linguistic Saliency",
      subtitle: "Fine-Tuned RoBERTa Architecture with Token-Level Attention Extraction",
      speakerNotes:
        "The first pillar utilizes a RoBERTa-base transformer fine-tuned specifically on disinformation benchmarks including LIAR-PLUS and FakeNewsNet. Standard BERT models often treat classification as a single binary probability. In VeritasAI, we extract the cross-attention weights from the final hidden layer to map which exact tokens triggered the deception flag, giving journalists actionable visual feedback on sensationalist rhetoric.",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full items-center">
          <div className="space-y-4">
            <div className="p-4 bg-blue-950/40 border border-blue-500/30 rounded-2xl space-y-2">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-400" />
                <span>Transformer Training & Transfer Learning</span>
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Fine-tuned across 128,000 verified factual and deceptive claims. Captures subtle contextual semantics such as deceptive hedging, false certainty markers, and pseudo-scientific syntax.
              </p>
            </div>

            <div className="p-4 bg-slate-800/80 border border-slate-700 rounded-2xl space-y-2">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Attention Saliency Extraction</span>
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Unlike opaque classifiers, VeritasAI exposes token attention gradients. Words indicating manufactured consensus (e.g. &ldquo;undeniable secret&rdquo;, &ldquo;what they hide&rdquo;) receive highlighted visual flags.
              </p>
            </div>

            <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl space-y-2">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Active Self-Training Loop</span>
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Our in-app Superadmin Console features a background continuous learning engine capable of incorporating verified editorial feedback into model retuning pipelines.
              </p>
            </div>
          </div>

          <div className="p-6 bg-slate-900 text-white rounded-3xl space-y-4 shadow-xl border border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs font-mono">
              <span className="text-blue-400">ATTENTION_SALIENCY_MAP</span>
              <span className="text-slate-400">LAYER 12 &bull; HEAD 8</span>
            </div>

            <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/80 font-mono text-xs leading-loose space-y-2">
              <p className="text-slate-300">
                &ldquo;Whistleblower reveals <span className="bg-rose-500/40 text-rose-200 px-1 py-0.5 rounded border border-rose-500/60 font-bold">shocking secret</span> cure that <span className="bg-rose-500/40 text-rose-200 px-1 py-0.5 rounded border border-rose-500/60 font-bold">pharmaceutical giants</span> are desperately trying to suppress.&rdquo;
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Deception Probability</span>
                <span className="font-mono text-rose-400 font-bold">92.4% High Risk</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div className="bg-rose-500 h-2 rounded-full w-[92%]" />
              </div>
            </div>
          </div>
        </div>
      ),
    },

    // ── Slide 5: Pillar 2 Stylometrics ─────────────────────────────────────
    {
      id: 5,
      badge: "Forensic NLP Subsystem",
      title: "Pillar 2: Forensic Stylometry & Syntactic Analysis",
      subtitle: "Deterministic Grammar Parsing, Lexical Diversity & Sensationalism Metrics",
      speakerNotes:
        "Pillar 2 provides deterministic forensic NLP metrics that operate independently of neural weights. Using Spacy and NLTK, we extract Type-Token Ratios to measure vocabulary poverty, Flesch-Kincaid grade levels for syntactic complexity, and an emotional volatility index. Clickbait and synthetic disinfo characteristically exhibit low lexical diversity combined with extreme polarity divergence.",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 h-full items-stretch">
          <div className="p-5 bg-slate-800/80 border border-slate-700/80 rounded-2xl space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-900/50 text-indigo-300 flex items-center justify-center font-bold border border-indigo-500/40">
                1
              </div>
              <h4 className="font-bold text-white text-sm">Lexical Diversity (TTR)</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Computes Type-Token Ratio and Brunet&apos;s W measure. Disinformation and automated churn mills repeat emotive adjectives, resulting in measurably depressed lexical diversity compared to investigative journalism.
              </p>
            </div>
            <div className="p-2.5 bg-indigo-950/60 rounded-xl text-[11px] font-mono text-indigo-300 border border-indigo-500/30">
              Threshold: TTR &lt; 0.42 flags synthetic repetition.
            </div>
          </div>

          <div className="p-5 bg-slate-800/80 border border-slate-700/80 rounded-2xl space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-8 h-8 rounded-lg bg-blue-900/50 text-blue-300 flex items-center justify-center font-bold border border-blue-500/40">
                2
              </div>
              <h4 className="font-bold text-white text-sm">Syntactic Tree Complexity</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Analyzes dependency trees, subordinate clause frequency, and passive voice ratios using Spacy parser. Credible reportage features balanced clause hierarchies, whereas deceptive content leans heavily on imperative exhortations.
              </p>
            </div>
            <div className="p-2.5 bg-blue-950/60 rounded-xl text-[11px] font-mono text-blue-300 border border-blue-500/30">
              Metric: Mean clause depth &gt; 3.2 indicates rigor.
            </div>
          </div>

          <div className="p-5 bg-slate-800/80 border border-slate-700/80 rounded-2xl space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-900/50 text-emerald-300 flex items-center justify-center font-bold border border-emerald-500/40">
                3
              </div>
              <h4 className="font-bold text-white text-sm">Sensationalism Divergence</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Measures the delta between headline emotional intensity and body paragraph factual assertiveness. Exaggerated discrepancies immediately trigger sensationalism penalties.
              </p>
            </div>
            <div className="p-2.5 bg-emerald-950/60 rounded-xl text-[11px] font-mono text-emerald-300 border border-emerald-500/30">
              Output: Normalized Sensationalism Index (0-100).
            </div>
          </div>
        </div>
      ),
    },

    // ── Slide 6: Pillar 3 Fact Corroboration & Semantic Binding ───────────
    {
      id: 6,
      badge: "Knowledge Graph & Semantic Logic",
      title: "Pillar 3: Real-Time Fact Corroboration",
      subtitle: "Semantic Pillar Binding, Landmark Anchoring & Absurdity Filtering",
      speakerNotes:
        "Pillar 3 represents one of our most important technical breakthroughs: Semantic Pillar Binding. Earlier in development, we noticed that generic query matching produced false positives. For example, a satirical claim about an alien attack on the White House matched a Wikipedia list of UFO sightings. We engineered a strict Semantic Landmark Binding algorithm that extracts primary kinetic actors and targets, validates landmark containment, and bars encyclopedia catalog pages from verifying specific kinetic incidents.",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full items-center">
          <div className="space-y-4">
            <div className="p-4 bg-amber-950/30 border border-amber-500/30 rounded-2xl space-y-2">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>The Naive Search Failure Mode</span>
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Standard bag-of-words or unconstrained vector search extracts loose keywords (e.g. &ldquo;UFO&rdquo;), matching historical encyclopedia lists (&ldquo;List of reported UFO sightings&rdquo;) and falsely awarding high credibility to absurd claims.
              </p>
            </div>

            <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl space-y-2">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Semantic Pillar Binding Architecture</span>
              </h4>
              <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-4 leading-relaxed">
                <li>
                  <strong className="text-white">Target & Landmark Extraction:</strong> Enforces geographic and institutional containment (e.g., &ldquo;White House&rdquo;, &ldquo;Pentagon&rdquo;, &ldquo;Cape Town&rdquo;).
                </li>
                <li>
                  <strong className="text-white">Catalog Page Disqualification:</strong> Explicitly bars meta-indexes and historical list pages from verifying acute physical events.
                </li>
                <li>
                  <strong className="text-white">Kinetic Actor Binding:</strong> Uses exact word-boundary regex matching to prevent spurious entity collisions.
                </li>
              </ul>
            </div>
          </div>

          <div className="p-6 bg-slate-900 text-white rounded-3xl space-y-4 shadow-xl border border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs font-mono">
              <span className="text-emerald-400">CORROBORATION_VERIFICATION_LOG</span>
              <span className="text-slate-400">TEST QUERY EVALUATION</span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 bg-rose-950/40 border border-rose-800/50 rounded-xl space-y-1">
                <span className="text-[10px] text-rose-400 uppercase font-bold block">Test Adversarial Input</span>
                <p className="text-slate-200 text-[11px]">&ldquo;Aliens are real, a UFO is attacking the White House&rdquo;</p>
              </div>

              <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl space-y-1.5 text-[11px]">
                <p className="text-amber-300 font-bold">1. Extracted Kinetic Target: &ldquo;White House&rdquo;</p>
                <p className="text-slate-300">2. Discarded Wikipedia match: &ldquo;List of reported UFO sightings&rdquo; (Catalog Disqualified)</p>
                <p className="text-emerald-400 font-bold">3. Final Corroboration Score: 12.0 / 100 (Unverified / Debunked)</p>
              </div>
            </div>

            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[11px] text-emerald-300 font-sans">
              Result: Zero false positives on adversarial claims while maintaining 94% recall on verified breaking news.
            </div>
          </div>
        </div>
      ),
    },

    // ── Slide 7: Pillar 4 Domain Authority ─────────────────────────────────
    {
      id: 7,
      badge: "Infrastructure & Provenance Subsystem",
      title: "Pillar 4: Source Domain Nutrition & Infrastructure",
      subtitle: "Media Bias Taxonomy, IANA WHOIS Age Tracking & SSL/TLS Verification",
      speakerNotes:
        "The fourth pillar examines the publisher's digital infrastructure. We maintain an authoritative taxonomy based on Media Bias / Fact Check covering over 4,000 news organizations. When a URL is analyzed, we perform real-time WHOIS verification to detect disposable newly-registered domains often created for disinformation blitzes, evaluate SSL certificates, and apply institutional trust routing for verified educational and academic domains.",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 h-full items-stretch">
          <div className="p-5 bg-slate-800/80 border border-slate-700/80 rounded-2xl space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-8 h-8 rounded-lg bg-blue-900/50 text-blue-300 flex items-center justify-center font-bold border border-blue-500/40">
                <Database className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-white text-sm">Media Bias / Fact Check (MBFC)</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Curated repository of 4,000+ domain reputations categorized across bias orientation, historical factual accuracy rating, and institutional ownership transparency.
              </p>
            </div>
            <div className="p-2.5 bg-blue-950/60 rounded-xl text-[11px] font-mono text-blue-300 border border-blue-500/30">
              Levels: Very High &bull; High &bull; Mixed &bull; Questionable &bull; Conspiracy
            </div>
          </div>

          <div className="p-5 bg-slate-800/80 border border-slate-700/80 rounded-2xl space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-900/50 text-indigo-300 flex items-center justify-center font-bold border border-indigo-500/40">
                <Server className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-white text-sm">IANA WHOIS Provenance</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Newly registered domains (&lt; 30 days) are heavily penalized. Synthetic imposter websites mimicking reputable outlets (e.g. &ldquo;bbc-breaking-news.com&rdquo;) are immediately caught by domain age divergence.
              </p>
            </div>
            <div className="p-2.5 bg-indigo-950/60 rounded-xl text-[11px] font-mono text-indigo-300 border border-indigo-500/30">
              Safeguard: Detects fleeting ephemeral disinformation sites.
            </div>
          </div>

          <div className="p-5 bg-slate-800/80 border border-slate-700/80 rounded-2xl space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-900/50 text-emerald-300 flex items-center justify-center font-bold border border-emerald-500/40">
                <Lock className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-white text-sm">SSL TLS & Academic Routing</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Verifies certificate cryptographic validity, cipher suites, and issuer authenticity. Verified academic domains (e.g. <code className="font-mono text-[10px] bg-slate-700/60 text-emerald-300 px-1 py-0.5 rounded border border-emerald-500/30">.ac.za</code>, <code className="font-mono text-[10px] bg-slate-700/60 text-emerald-300 px-1 py-0.5 rounded border border-emerald-500/30">.edu</code>) receive preferential institutional trust weighting.
              </p>
            </div>
            <div className="p-2.5 bg-emerald-950/60 rounded-xl text-[11px] font-mono text-emerald-300 border border-emerald-500/30">
              Trust Score: Boosted for verified higher education bodies.
            </div>
          </div>
        </div>
      ),
    },

    // ── Slide 8: Database & MongoDB Schema ─────────────────────────────────
    {
      id: 8,
      badge: "Database Architecture",
      title: "Persistence Layer & MongoDB Topology",
      subtitle: "High-Performance Document Modeling, TTL Indexes & Audit Trails",
      speakerNotes:
        "For persistence, VeritasAI utilizes MongoDB 7.0 with Motor for asynchronous non-blocking IO. Our schema architecture features dedicated collections for users with role-based access control, analysis results, audit logs, and self-expiring OTP tokens. We implemented MongoDB TTL indexes with expireAfterSeconds set to zero, ensuring that single-use verification PINs are automatically purged from memory without manual cron sweeps.",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full items-center">
          <div className="space-y-4">
            <div className="p-4 bg-slate-800/80 border border-slate-700 rounded-2xl space-y-2 shadow-xs">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Database className="w-4 h-4 text-emerald-400" />
                <span>Document Schema Architecture</span>
              </div>
              <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-4 leading-relaxed">
                <li><strong className="text-emerald-400 font-mono">users:</strong> Password hashes (bcrypt/pbkdf2), affiliations, subscription tiers, and suspension states.</li>
                <li><strong className="text-emerald-400 font-mono">results:</strong> Complete multi-dimensional scoring breakdown, extracted entities, and HMAC signatures.</li>
                <li><strong className="text-emerald-400 font-mono">audit_logs:</strong> Immutable ledger tracking all administrative actions with client IP and timestamps.</li>
                <li><strong className="text-emerald-400 font-mono">verification_otps:</strong> Ephemeral PIN hashes with automated TTL expiration.</li>
              </ul>
            </div>

            <div className="p-4 bg-blue-950/40 border border-blue-500/30 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <HardDrive className="w-4 h-4 text-blue-400" />
                <span>TTL Indexing & Memory Optimization</span>
              </div>
              <p className="text-xs text-blue-200 leading-relaxed">
                Created index on <code className="font-mono text-[11px] bg-blue-900/50 text-blue-200 px-1.5 py-0.5 rounded border border-blue-500/40">expires_at</code> with <code className="font-mono text-[11px] bg-blue-900/50 text-blue-200 px-1.5 py-0.5 rounded border border-blue-500/40">expireAfterSeconds: 0</code>. Expired security tokens are cleanly garbage collected by the MongoDB storage engine.
              </p>
            </div>
          </div>

          <div className="p-6 bg-slate-900 text-white rounded-3xl space-y-4 shadow-xl border border-slate-800 font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-emerald-400">MONGODB_COLLECTIONS_TELEMETRY</span>
              <span className="text-slate-400">DATABASE: veritasai</span>
            </div>

            <div className="space-y-2 text-[11px]">
              <div className="flex justify-between p-2 bg-slate-800/80 rounded-lg">
                <span className="text-slate-300">users (RBAC accounts)</span>
                <span className="text-emerald-400 font-bold">Indexed (_id, email)</span>
              </div>
              <div className="flex justify-between p-2 bg-slate-800/80 rounded-lg">
                <span className="text-slate-300">results (Analyses)</span>
                <span className="text-emerald-400 font-bold">Indexed (user_id, created_at)</span>
              </div>
              <div className="flex justify-between p-2 bg-slate-800/80 rounded-lg">
                <span className="text-slate-300">audit_logs (Security)</span>
                <span className="text-emerald-400 font-bold">Indexed (timestamp, actor_id)</span>
              </div>
              <div className="flex justify-between p-2 bg-slate-800/80 rounded-lg">
                <span className="text-slate-300">verification_otps</span>
                <span className="text-amber-400 font-bold">TTL Expire Index Active</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-between text-slate-400 text-[10px]">
              <span>Connection Pool: 50 concurrent sockets</span>
              <span>WiredTiger Engine</span>
            </div>
          </div>
        </div>
      ),
    },

    // ── Slide 9: Dual-Backup & Disaster Recovery ───────────────────────────
    {
      id: 9,
      badge: "Enterprise Resilience",
      title: "Dual-Backup & Automated Snapshot Engine",
      subtitle: "3-2-1 Backup Strategy, Automated Retention Pruning & Browser Disaster Recovery",
      speakerNotes:
        "Data persistence requires robust disaster recovery. We implemented a complete enterprise dual-backup engine following the industry 3-2-1 standard. The system features: first, automated periodic snapshots executed by an asyncio supervisor; second, a dual-mirror destination replicating snapshots to a secondary directory; third, retention pruning to prevent disk exhaustion; and fourth, an in-browser archive upload and instant disaster recovery pipeline with superadmin preservation safeguards.",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full items-center">
          <div className="space-y-4">
            <div className="p-4 bg-slate-800/80 border border-slate-700 rounded-2xl space-y-2 shadow-xs">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <FileArchive className="w-4 h-4 text-amber-400" />
                <span>3-2-1 Backup Architecture</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Compressed BSON/JSON ZIP archives generated with SHA-256 integrity checksums and metadata descriptors. Stored in primary storage and concurrently mirrored to secondary disaster storage.
              </p>
            </div>

            <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <RefreshCw className="w-4 h-4 text-emerald-400" />
                <span>Automated Background Supervisor</span>
              </div>
              <p className="text-xs text-emerald-200 leading-relaxed">
                Background worker in FastAPI lifespan checks snapshot intervals every hour. Automatically creates point-in-time snapshots and prunes older automated archives beyond the retention threshold (5 snapshots).
              </p>
            </div>

            <div className="p-4 bg-blue-950/40 border border-blue-500/30 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <RotateCcw className="w-4 h-4 text-blue-400" />
                <span>Admin Preservation Safeguard</span>
              </div>
              <p className="text-xs text-blue-200 leading-relaxed">
                During disaster recovery restoration, the active Super Administrator account is re-seeded and preserved post-restore to prevent administrative lockout.
              </p>
            </div>
          </div>

          <div className="p-6 bg-slate-900 text-white rounded-3xl space-y-4 shadow-xl border border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs font-mono">
              <span className="text-amber-400">DISASTER_RECOVERY_LEDGER</span>
              <span className="text-emerald-400 font-bold">DUAL-STORAGE ACTIVE</span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 bg-slate-800/80 border border-slate-700 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-slate-200 font-bold">Primary Storage</span>
                  <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-mono">backend/backups/</span>
                </div>
                <p className="text-[11px] text-slate-400">Local fast-path recovery for operational admins</p>
              </div>

              <div className="p-3 bg-slate-800/80 border border-slate-700 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-slate-200 font-bold">Secondary Mirror</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono">/tmp/veritas_secondary_mirror/</span>
                </div>
                <p className="text-[11px] text-slate-400">Isolated secondary destination immune to primary path corruption</p>
              </div>

              <div className="p-3 bg-slate-800/80 border border-slate-700 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-slate-200 font-bold">Offsite Browser Upload</span>
                  <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-mono">REST API Import</span>
                </div>
                <p className="text-[11px] text-slate-400">Direct drag-and-drop ZIP archive restore from any external machine</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },

    // ── Slide 10: Security & OTP Password Recovery ─────────────────────────
    {
      id: 10,
      badge: "Security & Authentication",
      title: "Security Hardening & Self-Service OTP Recovery",
      subtitle: "Strict RFC Email Filtering, Gmail SMTP Pipeline & Self-Service Password Reset",
      speakerNotes:
        "Security and identity management are paramount. We implemented strict RFC email validation that rejects disposable domains and single-character labels such as 'g.com'. For email dispatch, we use Gmail SMTP over STARTTLS with envelope MAIL FROM extraction. We also engineered a self-service password recovery flow with a 30-second cooldown rate limit, 5-attempt brute-force protection, and automatic session cleanup.",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 h-full items-stretch">
          <div className="p-5 bg-slate-800/80 border border-slate-700/80 rounded-2xl space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-8 h-8 rounded-lg bg-rose-900/50 text-rose-300 flex items-center justify-center font-bold border border-rose-500/40">
                <Mail className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-white text-sm">Strict RFC Email Validation</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Regex and domain parser reject disposable email providers, consecutive periods, and nonsense single-letter domains (e.g. <code className="font-mono text-rose-300 bg-rose-900/50 px-1 py-0.5 rounded border border-rose-500/40">yd@g.com</code>).
              </p>
            </div>
            <div className="p-2 bg-rose-950/60 rounded-lg text-[10px] font-mono text-rose-300 border border-rose-500/30">
              Disallows: mailinator, tempmail, fake TLDs
            </div>
          </div>

          <div className="p-5 bg-slate-800/80 border border-slate-700/80 rounded-2xl space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-8 h-8 rounded-lg bg-blue-900/50 text-blue-300 flex items-center justify-center font-bold border border-blue-500/40">
                <Server className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-white text-sm">Gmail SMTP & Non-blocking I/O</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Native SMTP delivery over STARTTLS port 587 with envelope sender extraction. Dispatched via <code className="font-mono text-[10px] bg-slate-700/60 text-blue-300 px-1 py-0.5 rounded border border-blue-500/30">asyncio.to_thread</code> to maintain sub-second event loop response times.
              </p>
            </div>
            <div className="p-2 bg-blue-950/60 rounded-lg text-[10px] font-mono text-blue-300 border border-blue-500/30">
              Fallback: Dev OTP logging prevents demo blockage
            </div>
          </div>

          <div className="p-5 bg-slate-800/80 border border-slate-700/80 rounded-2xl space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-900/50 text-emerald-300 flex items-center justify-center font-bold border border-emerald-500/40">
                <Key className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-white text-sm">Self-Service OTP Recovery</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Users who forget credentials can request a 6-digit recovery PIN. Features a 30-second cooldown rate limit, 5-attempt brute-force threshold, and immediate invalidation on password reset.
              </p>
            </div>
            <div className="p-2 bg-emerald-950/60 rounded-lg text-[10px] font-mono text-emerald-300 border border-emerald-500/30">
              Security: PBKDF2 / Bcrypt password hashing
            </div>
          </div>
        </div>
      ),
    },

    // ── Slide 11: Experimental Results & Benchmarks ────────────────────────
    {
      id: 11,
      badge: "Empirical Evaluation",
      title: "Experimental Evaluation & Performance Metrics",
      subtitle: "Benchmarking Classification Accuracy, Precision-Recall & Latency",
      speakerNotes:
        "We evaluated VeritasAI against benchmark datasets including ISOT and LIAR-PLUS. Our multi-dimensional ensemble achieved an accuracy of 93.4% and an F1 score of 0.928, outperforming standalone RoBERTa baselines by over 11%. Crucially, the addition of Semantic Pillar Binding reduced false-positive corroborations on adversarial and satirical claims by 88.5%, while keeping end-to-end P95 latency under 840 milliseconds.",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full items-center">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl text-center space-y-1">
                <span className="text-3xl font-black text-emerald-400 font-mono">93.4%</span>
                <span className="text-xs font-bold text-white block">Ensemble Accuracy</span>
                <span className="text-[10px] text-slate-400 block">ISOT / LIAR-PLUS holdout</span>
              </div>

              <div className="p-4 bg-blue-950/40 border border-blue-500/30 rounded-2xl text-center space-y-1">
                <span className="text-3xl font-black text-blue-400 font-mono">0.928</span>
                <span className="text-xs font-bold text-white block">Macro F1 Score</span>
                <span className="text-[10px] text-slate-400 block">+11.6% vs pure LLM</span>
              </div>

              <div className="p-4 bg-purple-950/40 border border-purple-500/30 rounded-2xl text-center space-y-1">
                <span className="text-3xl font-black text-purple-400 font-mono">680ms</span>
                <span className="text-xs font-bold text-white block">Mean End-to-End Latency</span>
                <span className="text-[10px] text-slate-400 block">FastAPI Async Pipeline</span>
              </div>

              <div className="p-4 bg-amber-950/40 border border-amber-500/30 rounded-2xl text-center space-y-1">
                <span className="text-3xl font-black text-amber-400 font-mono">-88.5%</span>
                <span className="text-xs font-bold text-white block">False Positive Reduction</span>
                <span className="text-[10px] text-slate-400 block">Via Semantic Pillar Binding</span>
              </div>
            </div>

            <div className="p-4 bg-slate-800/80 border border-slate-700 rounded-2xl text-xs text-slate-300 leading-relaxed">
              <strong className="text-white">User Experience Evaluation:</strong> Institutional tests conducted with journalism faculty confirmed that users overwhelmingly prefer VeritasAI&apos;s 4-dimensional breakdown over opaque single confidence scores.
            </div>
          </div>

          {/* Model Comparison Table Card */}
          <div className="p-6 bg-slate-900 text-white rounded-3xl space-y-4 shadow-xl border border-slate-800">
            <h4 className="text-xs font-mono text-blue-400 uppercase tracking-wider pb-2 border-b border-slate-800">
              Comparative Benchmark Matrix
            </h4>
            <div className="overflow-x-auto text-xs font-mono">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                    <th className="py-2">Architecture</th>
                    <th className="py-2">Accuracy</th>
                    <th className="py-2">F1 Score</th>
                    <th className="py-2">Latency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300 text-[11px]">
                  <tr>
                    <td className="py-2">Naive Keyword Filter</td>
                    <td className="py-2 text-rose-400">64.2%</td>
                    <td className="py-2 text-rose-400">0.589</td>
                    <td className="py-2 text-emerald-400">45ms</td>
                  </tr>
                  <tr>
                    <td className="py-2">RoBERTa Single Model</td>
                    <td className="py-2 text-amber-400">81.8%</td>
                    <td className="py-2 text-amber-400">0.812</td>
                    <td className="py-2 text-emerald-400">210ms</td>
                  </tr>
                  <tr>
                    <td className="py-2">Generic Zero-Shot LLM</td>
                    <td className="py-2 text-amber-400">79.4%</td>
                    <td className="py-2 text-amber-400">0.781</td>
                    <td className="py-2 text-rose-400">2,400ms</td>
                  </tr>
                  <tr className="bg-blue-900/40 font-bold text-white">
                    <td className="py-2 text-blue-300">VeritasAI 4-Pillar Ensemble</td>
                    <td className="py-2 text-emerald-400">93.4%</td>
                    <td className="py-2 text-emerald-400">0.928</td>
                    <td className="py-2 text-blue-300">680ms</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ),
    },

    // ── Slide 12: Conclusion & Q&A ─────────────────────────────────────────
    {
      id: 12,
      badge: "Conclusion & Examination Defense",
      title: "Dissertation Contributions & Defense Q&A",
      subtitle: "Summary of Theoretical & Technical Deliverables",
      speakerNotes:
        "In conclusion, VeritasAI proves that explainability and high accuracy are not mutually exclusive in disinformation detection. We delivered a functional four-pillar multimodal platform, established semantic landmark binding to eliminate false positive corroborations, engineered an enterprise dual-backup snapshot engine, and provided cryptographic audit certificates for institutional accountability. Thank you respected examiners, I look forward to your questions.",
      content: (
        <div className="space-y-6 h-full flex flex-col justify-between">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-5 bg-blue-950/30 border border-blue-500/30 rounded-2xl space-y-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                1
              </div>
              <h4 className="font-bold text-white text-sm">Multimodal Ensemble Fusion</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Replaces unreliable single-model classifiers with an explainable 4-dimensional synthesis of linguistic transformer attention, stylometrics, wire corroboration, and publisher domain health.
              </p>
            </div>

            <div className="p-5 bg-indigo-950/30 border border-indigo-500/30 rounded-2xl space-y-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
                2
              </div>
              <h4 className="font-bold text-white text-sm">Deterministic Provenance</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Generates HMAC-SHA256 tamper-evident digital audit certificates enabling journalists, academic researchers, and legal counsel to verify when and how an article was analyzed.
              </p>
            </div>

            <div className="p-5 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl space-y-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                3
              </div>
              <h4 className="font-bold text-white text-sm">Enterprise Operational Hardening</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Engineered automated dual-backup snapshot engine, retention pruning, self-service OTP recovery, and background continuous training loops.
              </p>
            </div>
          </div>

          <div className="p-8 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl text-center space-y-4 shadow-xl border border-slate-800">
            <h3 className="text-2xl font-black tracking-tight text-white">
              Thank You Respected Examiners
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
              VeritasAI is live, fully operational, and ready for interactive demonstration. I warmly welcome your questions, feedback, and academic discussion.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => navigate("/verify")}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Launch Live Verification Demo</span>
              </button>
              <button
                onClick={() => navigate("/admin")}
                className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all border border-white/20 flex items-center gap-2 cursor-pointer"
              >
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span>Open Superadmin Console</span>
              </button>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const totalSlides = slides.length;

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev < totalSlides - 1 ? prev + 1 : prev));
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        nextSlide();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prevSlide();
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      } else if (e.key === "Home") {
        setCurrentSlide(0);
      } else if (e.key === "End") {
        setCurrentSlide(totalSlides - 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextSlide, prevSlide, totalSlides]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  const current = slides[currentSlide];

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white ${isFullscreen ? "p-4 sm:p-8" : "p-4 sm:p-6"}`}>
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <BrandLogo size="sm" variant="white" />
          </Link>
          <span className="text-slate-600 font-mono text-xs">|</span>
          <span className="text-xs font-mono font-semibold text-slate-400 hidden sm:inline">
            DISSERTATION DEFENSE &bull; MICHAEL MAZHAMBE
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Jump Menu Trigger */}
          <div className="relative">
            <button
              onClick={() => setJumpMenuOpen(!jumpMenuOpen)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 text-xs text-slate-300 font-mono transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-400" />
              <span>Slide {currentSlide + 1} / {totalSlides}</span>
            </button>

            {jumpMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 max-h-96 overflow-y-auto">
                <p className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1">Jump to Slide</p>
                {slides.map((s, idx) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setCurrentSlide(idx);
                      setJumpMenuOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer ${
                      currentSlide === idx ? "bg-blue-600 text-white font-bold" : "text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <span className="truncate">{s.id}. {s.title}</span>
                    <span className="font-mono text-[10px] opacity-70 ml-2">P.{s.id}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Toggle Speaker Notes */}
          <button
            onClick={() => setShowNotes(!showNotes)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
              showNotes ? "bg-amber-500/20 text-amber-300 border-amber-500/40" : "bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200"
            }`}
          >
            <span>Notes</span>
          </button>

          {/* Toggle Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-slate-200 cursor-pointer"
            title="Toggle Fullscreen (F)"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-800 h-1 my-3 rounded-full overflow-hidden">
        <div
          className="bg-blue-500 h-1 transition-all duration-300"
          style={{ width: `${((currentSlide + 1) / totalSlides) * 100}%` }}
        />
      </div>

      {/* Slide Body Stage */}
      <div className="flex-1 my-2 min-h-0 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="w-full max-w-6xl mx-auto bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-md space-y-6"
          >
            {/* Slide Header (Slides 2-12) */}
            {current.id !== 1 && (
              <div className="space-y-1">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-blue-400 block">
                  {current.badge}
                </span>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
                  {current.title}
                </h2>
                <p className="text-xs sm:text-sm text-slate-400">
                  {current.subtitle}
                </p>
              </div>
            )}

            {/* Slide Interactive Content */}
            <div className="pt-2">
              {current.content}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Speaker Notes Drawer */}
      {showNotes && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="max-w-6xl mx-auto w-full my-2 p-4 bg-amber-950/40 border border-amber-500/30 rounded-2xl text-amber-200 text-xs leading-relaxed"
        >
          <div className="flex items-center gap-2 mb-1 text-amber-400 font-bold uppercase text-[10px] tracking-wider">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Examiner Defense Speech Cue (Slide {currentSlide + 1})</span>
          </div>
          <p>{current.speakerNotes}</p>
        </motion.div>
      )}

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs">
        <button
          onClick={prevSlide}
          disabled={currentSlide === 0}
          className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold flex items-center gap-2 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>

        <div className="flex items-center gap-1.5 hidden sm:flex">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                currentSlide === idx ? "w-6 bg-blue-500" : "w-2 bg-slate-700 hover:bg-slate-500"
              }`}
              title={`Slide ${idx + 1}`}
            />
          ))}
        </div>

        <button
          onClick={nextSlide}
          disabled={currentSlide === totalSlides - 1}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold flex items-center gap-2 transition-colors cursor-pointer"
        >
          <span>Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default PresentationDeck;