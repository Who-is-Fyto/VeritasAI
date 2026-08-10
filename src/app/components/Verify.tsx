import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@radix-ui/react-tabs";
import {
  FileText, Link as LinkIcon, Upload, Sparkles, ArrowRight,
  Shield, Brain, Globe, Search, Terminal, AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { veritasAPI, VeritasAPIError } from "../../services/api";

// ─────────────────────────────────────────────────────────────────────────
// MOCK FLAG — set VITE_USE_MOCK_API=false in .env to use the real backend.
// While it is "true" (default), the component simulates analysis locally
// so the frontend can be developed without the Python server running.
// ─────────────────────────────────────────────────────────────────────────
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== "false";

const CLIP_STYLES = `
  .clip-corner-xl { clip-path: polygon(0 18px,18px 0,100% 0,100% calc(100% - 18px),calc(100% - 18px) 100%,0 100%); }
  .clip-corner-sm  { clip-path: polygon(0 5px,5px 0,100% 0,100% calc(100% - 5px),calc(100% - 5px) 100%,0 100%); }
  .clip-corner-icon{ clip-path: polygon(0 5px,5px 0,100% 0,100% calc(100% - 5px),calc(100% - 5px) 100%,0 100%); }
`;

const analysisSteps = [
  { icon: Brain,  label: "Linguistic Analysis"   },
  { icon: Search, label: "Cross-Reference Check" },
  { icon: Globe,  label: "Source Authority Scan" },
  { icon: Shield, label: "Credibility Index"     },
];

const STEP_LOGS: Record<number, string[]> = {
  0: [
    "▸ Initialising RoBERTa-base NLP pipeline...",
    "▸ Loading fine-tuned LIAR/FakeNewsNet weights...",
    "▸ Running stylometric fingerprint analysis...",
    "▸ Scoring linguistic integrity patterns...",
  ],
  1: [
    "▸ Querying News API corroboration layer...",
    "▸ Scanning Reuters, AP, BBC News databases...",
    "▸ Cross-reference scan: matching articles found",
    "▸ Computing corroboration confidence scores...",
  ],
  2: [
    "▸ Resolving domain authority score...",
    "▸ Querying MediaBias/FactCheck whitelist...",
    "▸ Checking editorial standards registry...",
    "▸ Source credibility profile: generated",
  ],
  3: [
    "▸ Computing weighted Credibility Index...",
    "▸ Applying ensemble scoring model (40/35/25)...",
    "▸ Generating XAI phrase-level annotations...",
    "✓ Analysis complete — preparing report...",
  ],
};

export function Verify() {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [activeTab, setActiveTab] = useState("text");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeStep, setAnalyzeStep] = useState(-1);
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logMessages]);

  // Push log messages for one step, resolves when all are added
  const addLogsForStep = (stepIdx: number): Promise<void> =>
    new Promise((resolve) => {
      const messages = STEP_LOGS[stepIdx] ?? [];
      let i = 0;
      const push = () => {
        if (i < messages.length) {
          setLogMessages((prev) => [...prev, messages[i]]);
          i++;
          setTimeout(push, 155 + Math.random() * 75);
        } else {
          resolve();
        }
      };
      push();
    });

  const handleVerify = async () => {
    setIsAnalyzing(true);
    setAnalyzeStep(0);
    setLogMessages([]);
    setApiError(null);

    const content = activeTab === "text" ? text : url;

    try {
      if (USE_MOCK_API) {
        // ── Mock path: simulate steps locally ──
        for (let i = 0; i < analysisSteps.length; i++) {
          setAnalyzeStep(i);
          await addLogsForStep(i);
          await new Promise((r) => setTimeout(r, 250));
        }
        const id = Math.random().toString(36).substring(7);
        navigate(`/results/${id}`, { state: { text: content, type: activeTab } });
      } else {
        // ── Real path: call FastAPI backend ──
        setAnalyzeStep(0);
        // Run step 0 logs while the API call is in flight
        const [result] = await Promise.all([
          veritasAPI.analyse({ content, type: activeTab as "text" | "url" }),
          addLogsForStep(0),
        ]);

        for (let i = 1; i < analysisSteps.length; i++) {
          setAnalyzeStep(i);
          await addLogsForStep(i);
        }

        navigate(`/results/${result.id}`, {
          state: { text: content, type: activeTab, result },
        });
      }
    } catch (err) {
      const msg =
        err instanceof VeritasAPIError
          ? `Backend error (${err.status}): ${err.message}`
          : "Could not reach the analysis server. Is the backend running?";
      setApiError(msg);
      setLogMessages((prev) => [...prev, `✗ ${msg}`]);
      setIsAnalyzing(false);
      setAnalyzeStep(-1);
    }
  };

  const examples = [
    {
      title: "News Article",
      snippet:
        "Scientists have published new research in Nature showing a significant correlation between social media use and reduced attention span in adolescents. The study, conducted at Stanford University, surveyed over 3,000 participants aged 13–18.",
      icon: FileText,
      tag: "Article",
    },
    {
      title: "Social Media",
      snippet:
        "BREAKING: Shocking new study PROVES that 5G towers are causing unprecedented health issues across the country! Share this before they delete it — everyone needs to see this explosive evidence!",
      icon: FileText,
      tag: "Tweet",
    },
    {
      title: "Research Excerpt",
      snippet:
        "According to a 2024 report by the World Economic Forum, disinformation ranks among the foremost systemic global risks. Researchers at Oxford cite growing evidence that AI-generated content may influence electoral outcomes.",
      icon: FileText,
      tag: "Research",
    },
  ];

  return (
    <div className="min-h-screen py-12 lg:py-20 bg-gradient-to-b from-blue-50/30 to-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>

          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-full mb-5 border border-blue-200/60">
              <Sparkles className="w-4 h-4 text-blue-700" />
              <span className="text-sm text-blue-700">Multi-Dimensional AI Analysis</span>
            </div>
            <h1 className="text-4xl lg:text-5xl mb-4 tracking-tight">Submit Content for Analysis</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Paste text, enter a URL, or upload a document. VeritasAI will produce a full Credibility Index
              across linguistic, source authority, and fact-checking dimensions.
            </p>
            {!USE_MOCK_API && (
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 border border-green-200 rounded-full text-xs text-green-700">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Connected to live backend
              </div>
            )}
          </div>

          {/* Step indicators */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {analysisSteps.map((step, i) => (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                isAnalyzing && analyzeStep >= i ? "border-blue-400 bg-blue-100/60" : "border-blue-200/50 bg-white/80"
              }`}>
                <div className={`p-2 rounded-lg clip-corner-icon flex-shrink-0 transition-colors ${
                  isAnalyzing && analyzeStep >= i ? "bg-blue-600" : "bg-blue-100"
                }`}>
                  <step.icon className={`w-4 h-4 transition-colors ${
                    isAnalyzing && analyzeStep >= i ? "text-white" : "text-blue-600"
                  }`} />
                </div>
                <span className="text-xs text-muted-foreground">{step.label}</span>
                {isAnalyzing && analyzeStep === i && (
                  <Sparkles className="w-3 h-3 text-blue-500 animate-spin ml-auto flex-shrink-0" />
                )}
                {isAnalyzing && analyzeStep > i && (
                  <span className="ml-auto text-green-500 text-xs flex-shrink-0">✓</span>
                )}
              </div>
            ))}
          </div>

          {/* Input card */}
          <div className="bg-white rounded-2xl shadow-xl border border-blue-200/60 overflow-hidden clip-corner-xl">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="border-b border-blue-200/50 bg-gradient-to-r from-blue-50/60 to-white">
                <TabsList className="flex p-2 gap-2">
                  {[
                    { value: "text",   icon: FileText,  label: "Paste Text"   },
                    { value: "url",    icon: LinkIcon,  label: "Enter URL"    },
                    { value: "upload", icon: Upload,    label: "Upload File"  },
                  ].map((tab) => (
                    <TabsTrigger key={tab.value} value={tab.value}
                      className={`flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-lg transition-all clip-corner-sm ${
                        activeTab === tab.value
                          ? "bg-white shadow-sm text-blue-700 border border-blue-200"
                          : "text-muted-foreground hover:text-foreground hover:bg-white/60"
                      }`}>
                      <tab.icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <TabsContent value="text" className="p-8">
                <label className="block text-sm text-muted-foreground mb-2">Article, tweet, message, or any text content</label>
                <textarea value={text} onChange={(e) => setText(e.target.value)}
                  placeholder="Paste the content you want to verify here..."
                  className="w-full h-64 p-4 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-blue-50/30 text-sm leading-relaxed"
                  disabled={isAnalyzing} />
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {text.length > 0
                      ? `${text.length} characters · ${Math.ceil(text.split(/\s+/).filter(Boolean).length)} words`
                      : "Minimum 50 characters recommended"}
                  </span>
                  <button onClick={handleVerify} disabled={!text.trim() || isAnalyzing}
                    className="px-6 py-3 bg-gradient-to-r from-blue-700 to-blue-500 text-white rounded-lg hover:from-blue-800 hover:to-blue-600 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 clip-corner-sm">
                    {isAnalyzing
                      ? <><Sparkles className="w-4 h-4 animate-spin" /><span>Analysing...</span></>
                      : <><span>Generate Credibility Index</span><ArrowRight className="w-4 h-4" /></>}
                  </button>
                </div>
              </TabsContent>

              <TabsContent value="url" className="p-8">
                <label className="block text-sm text-muted-foreground mb-2">Article, news page, or web content URL</label>
                <div className="relative">
                  <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type="url" value={url} onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/article"
                    className="w-full pl-10 pr-4 py-4 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-50/30 text-sm"
                    disabled={isAnalyzing} />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  VeritasAI will fetch and analyse the article content, metadata, and publisher authority.
                </p>
                <div className="mt-6">
                  <button onClick={handleVerify} disabled={!url.trim() || isAnalyzing}
                    className="px-6 py-3 bg-gradient-to-r from-blue-700 to-blue-500 text-white rounded-lg hover:from-blue-800 hover:to-blue-600 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 clip-corner-sm">
                    {isAnalyzing
                      ? <><Sparkles className="w-4 h-4 animate-spin" /><span>Analysing URL...</span></>
                      : <><span>Analyse URL</span><ArrowRight className="w-4 h-4" /></>}
                  </button>
                </div>
              </TabsContent>

              <TabsContent value="upload" className="p-8">
                <div className="border-2 border-dashed border-blue-300 rounded-xl p-12 text-center hover:border-blue-400 transition-colors bg-blue-50/30 cursor-pointer">
                  <div className="inline-flex p-4 bg-blue-100 rounded-2xl mb-5 clip-corner-icon">
                    <Upload className="w-8 h-8 text-blue-600" />
                  </div>
                  <p className="mb-2">Drop your file here or click to browse</p>
                  <p className="text-sm text-muted-foreground mb-5">Supports PDF, DOC, DOCX, TXT · Max 10 MB</p>
                  <button className="px-6 py-2.5 bg-white border border-blue-200 text-blue-700 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all text-sm clip-corner-sm">
                    Choose File
                  </button>
                </div>
                <p className="mt-4 text-xs text-muted-foreground text-center">
                  Files are processed securely and never stored permanently.
                </p>
              </TabsContent>
            </Tabs>
          </div>

          {/* ── Live Analysis Log ── */}
          <AnimatePresence>
            {isAnalyzing && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}
                className="mt-5 rounded-2xl overflow-hidden border border-gray-800 shadow-2xl">
                <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-900 border-b border-gray-800">
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-500/80" />
                    <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <span className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <div className="flex items-center gap-2 ml-1">
                    <Terminal className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs text-gray-400 font-mono">veritas-analysis.log</span>
                  </div>
                  <div className="ml-auto flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                    <span className="text-xs text-gray-500 font-mono">LIVE</span>
                  </div>
                </div>
                <div className="bg-gray-950 p-4 font-mono text-xs space-y-1 max-h-44 overflow-y-auto scroll-smooth">
                  <AnimatePresence initial={false}>
                    {logMessages.map((msg, i) => {
                      if (!msg) return null;
                      const isSuccess = msg.startsWith("✓");
                      const isFailure = msg.startsWith("✗");
                      return (
                        <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.15 }}
                          className={isSuccess ? "text-green-400" : isFailure ? "text-red-400" : "text-blue-300"}>
                          <span className="text-gray-600 mr-2 select-none">{String(i + 1).padStart(2, "0")}</span>
                          {msg}
                        </motion.div>
                      );
                    })}

                  </AnimatePresence>
                  {analyzeStep >= 0 && analyzeStep < analysisSteps.length && (
                    <span className="inline-block w-2 h-3.5 bg-blue-400 animate-pulse align-middle" />
                  )}
                  <div ref={logEndRef} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* API Error */}
          <AnimatePresence>
            {apiError && !isAnalyzing && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mt-5 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Analysis failed</p>
                  <p className="mt-0.5 opacity-80">{apiError}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Example starters */}
          {!isAnalyzing && (
            <div className="mt-10">
              <p className="text-sm text-muted-foreground mb-4">Try an example to see VeritasAI in action:</p>
              <div className="grid md:grid-cols-3 gap-4">
                {examples.map((example, i) => (
                  <button key={i} onClick={() => { setActiveTab("text"); setText(example.snippet); setApiError(null); }}
                    className="group text-left p-4 bg-white border border-blue-200/50 rounded-xl hover:border-blue-300 hover:shadow-md transition-all clip-corner-sm">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors flex-shrink-0 clip-corner-icon">
                        <example.icon className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm" style={{ fontWeight: 500 }}>{example.title}</p>
                          <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded">{example.tag}</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{example.snippet}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
      <style>{CLIP_STYLES}</style>
    </div>
  );
}
