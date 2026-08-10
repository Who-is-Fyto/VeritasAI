import { Link } from "react-router";
import {
  Shield, Scan, CheckCircle2, Globe, FileText, MessageSquare,
  Newspaper, TrendingUp, Brain, Search, Layers, ArrowRight,
  BarChart2, BookOpen, Zap
} from "lucide-react";
import { motion } from "motion/react";

const CLIP_STYLES = `
  .clip-corner {
    clip-path: polygon(0 8px, 8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%);
  }
  .clip-corner-lg {
    clip-path: polygon(0 14px, 14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%);
  }
  .clip-corner-icon {
    clip-path: polygon(0 6px, 6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%);
  }
`;

export function Home() {
  const dimensions = [
    {
      icon: Brain,
      title: "Linguistic Analysis",
      description: "Detects stylometric patterns, writing cadence anomalies, and AI-generation signatures across syntax and semantics.",
      color: "from-blue-700 to-blue-500"
    },
    {
      icon: Globe,
      title: "Source Authority",
      description: "Verifies publisher credibility, domain history, editorial standards, and authority rankings against curated trust databases.",
      color: "from-blue-600 to-blue-400"
    },
    {
      icon: Search,
      title: "Cross-Reference Engine",
      description: "Automatically checks claims against authoritative news agencies, academic sources, and fact-checking organisations.",
      color: "from-blue-500 to-sky-400"
    },
    {
      icon: BarChart2,
      title: "Credibility Index",
      description: "A nuanced, multi-dimensional score — not a binary True/False verdict — empowering informed judgement rather than blind trust.",
      color: "from-blue-800 to-blue-600"
    }
  ];

  const contentTypes = [
    { icon: Newspaper, label: "News Articles" },
    { icon: MessageSquare, label: "Social Posts" },
    { icon: FileText, label: "Research Papers" },
    { icon: Globe, label: "Web Content" }
  ];

  const steps = [
    {
      step: "01",
      icon: Layers,
      title: "Submit Content",
      description: "Paste text, enter a URL, or upload a document. VeritasAI accepts news articles, tweets, research papers, and more."
    },
    {
      step: "02",
      icon: Zap,
      title: "Multi-Dimensional Analysis",
      description: "Our engine runs linguistic, source authority, and cross-referencing checks simultaneously in seconds."
    },
    {
      step: "03",
      icon: BarChart2,
      title: "Receive Your Credibility Index",
      description: "Get a transparent, explainable score across all analytical dimensions — with full reasoning, not just a number."
    },
    {
      step: "04",
      icon: BookOpen,
      title: "Make Informed Decisions",
      description: "Use the detailed breakdown to understand exactly why content scores the way it does and act accordingly."
    }
  ];

  const stats = [
    { value: "99.2%", label: "Detection Accuracy" },
    { value: "4.2s", label: "Avg. Analysis Time" },
    { value: "500K+", label: "Sources Indexed" },
    { value: "12M+", label: "Analyses Completed" }
  ];

  return (
    <div className="min-h-screen">

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/60 to-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_0%,rgba(59,130,246,0.12)_0%,transparent_70%)]" />
        <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-blue-400/8 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 lg:pt-32 lg:pb-32">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65 }}
            className="max-w-4xl"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-full mb-8 border border-blue-200/60">
              <Shield className="w-4 h-4 text-blue-700" />
              <span className="text-sm text-blue-700">AI-powered credibility assessment for news &amp; research</span>
            </div>

            <h1 className="text-5xl lg:text-7xl mb-6 tracking-tight leading-none">
              Beyond Fact-Checking.{" "}
              <span className="block bg-gradient-to-r from-blue-800 via-blue-600 to-blue-400 bg-clip-text text-transparent">
                A Credibility Index.
              </span>
            </h1>

            <p className="text-xl text-muted-foreground mb-4 max-w-2xl leading-relaxed">
              VeritasAI automates the initial credibility assessment of any article, URL, or text. Instead of a binary True/False verdict,
              we produce a <span className="text-blue-700 font-medium">nuanced Credibility Index</span> across multiple analytical dimensions.
            </p>
            <p className="text-base text-muted-foreground mb-10 max-w-xl leading-relaxed">
              Transparent. Explainable. Designed so you can make informed judgements — not blind ones.
            </p>

            <div className="flex flex-col sm:flex-row items-start gap-4">
              <Link
                to="/verify"
                className="group inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-700 to-blue-500 text-white rounded-xl hover:from-blue-800 hover:to-blue-600 transition-all shadow-lg hover:shadow-xl clip-corner"
              >
                <span>Analyse Content Now</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white border-2 border-blue-200 text-blue-700 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all shadow-sm"
              >
                How it works
              </a>
            </div>
          </motion.div>

          {/* Stats bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6"
          >
            {stats.map((stat, i) => (
              <div key={i} className="bg-white/80 backdrop-blur-sm border border-blue-200/50 rounded-xl px-6 py-5 clip-corner">
                <div className="text-3xl text-blue-700 mb-1" style={{ fontWeight: 700 }}>{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </motion.div>

          {/* Content type pills */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-10 flex flex-wrap gap-3"
          >
            {contentTypes.map((type, i) => (
              <div key={i} className="flex items-center gap-2 px-4 py-2 bg-white border border-blue-200/60 rounded-full text-sm text-blue-700 shadow-sm">
                <type.icon className="w-4 h-4 text-blue-500" />
                {type.label}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Analytical Dimensions */}
      <section id="features" className="py-24 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-16 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-full mb-6 border border-blue-200/60">
              <Scan className="w-4 h-4 text-blue-700" />
              <span className="text-sm text-blue-700">Analytical Dimensions</span>
            </div>
            <h2 className="text-4xl lg:text-5xl mb-4 tracking-tight">
              Four lenses. One transparent score.
            </h2>
            <p className="text-xl text-muted-foreground leading-relaxed">
              The Credibility Index synthesises independent analyses into a single, interpretable rating —
              each dimension is exposed so you understand exactly how the score was reached.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {dimensions.map((dim, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="group"
              >
                <div className="h-full bg-gradient-to-br from-blue-50/80 to-white border border-blue-200/50 rounded-2xl p-7 hover:border-blue-300 hover:shadow-lg transition-all clip-corner-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-28 h-28 bg-blue-500/5 rounded-full blur-2xl" />
                  <div className={`inline-flex p-3 bg-gradient-to-br ${dim.color} rounded-xl mb-5 group-hover:scale-110 transition-transform clip-corner-icon`}>
                    <dim.icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="mb-3">{dim.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{dim.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 lg:py-32 bg-gradient-to-b from-blue-50/40 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-full mb-6 border border-blue-200/60">
              <Zap className="w-4 h-4 text-blue-700" />
              <span className="text-sm text-blue-700">How VeritasAI Works</span>
            </div>
            <h2 className="text-4xl lg:text-5xl mb-4 tracking-tight">
              From submission to insight in seconds
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              A streamlined pipeline designed for researchers, journalists, and anyone who cares about truth
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="relative"
              >
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-blue-200 to-blue-100 -translate-x-4 z-0" />
                )}
                <div className="relative bg-white border border-blue-200/50 rounded-2xl p-7 hover:border-blue-300 hover:shadow-md transition-all clip-corner-lg">
                  <div className="flex items-start gap-4 mb-4">
                    <span className="text-sm text-blue-400/70 tabular-nums" style={{ fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.05em' }}>{step.step}</span>
                    <div className="p-2 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg clip-corner-icon">
                      <step.icon className="w-4 h-4 text-blue-700" />
                    </div>
                  </div>
                  <h3 className="mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why VeritasAI */}
      <section className="py-24 lg:py-32 bg-white border-t border-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-full mb-6 border border-blue-200/60">
                <TrendingUp className="w-4 h-4 text-blue-700" />
                <span className="text-sm text-blue-700">The VeritasAI Philosophy</span>
              </div>
              <h2 className="text-4xl lg:text-5xl mb-6 tracking-tight">
                Not True or False.{" "}
                <span className="bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">
                  A spectrum of credibility.
                </span>
              </h2>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                Binary fact-checking fails to capture the complexity of modern information. A story can be
                partially accurate, from a credible source but with AI-assisted writing, or well-reported
                but missing crucial context.
              </p>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                VeritasAI's Credibility Index quantifies exactly where content sits across each analytical
                dimension — giving you the full picture, not just a verdict.
              </p>
              <Link
                to="/verify"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-700 to-blue-500 text-white rounded-xl hover:from-blue-800 hover:to-blue-600 transition-all shadow-md hover:shadow-lg clip-corner"
              >
                <span>Try it Free</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              {[
                { label: "Linguistic Integrity", value: 88, color: "from-blue-700 to-blue-500" },
                { label: "Source Authority", value: 76, color: "from-blue-600 to-blue-400" },
                { label: "Cross-Reference Score", value: 91, color: "from-blue-500 to-sky-400" },
                { label: "Overall Credibility Index", value: 85, color: "from-blue-800 to-blue-600" }
              ].map((item, i) => (
                <div key={i} className="bg-white border border-blue-200/50 rounded-xl p-5 clip-corner">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm">{item.label}</span>
                    <span className="text-blue-700" style={{ fontWeight: 600 }}>{item.value}</span>
                  </div>
                  <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${item.value}%` }}
                      transition={{ duration: 0.8, delay: i * 0.1 }}
                      viewport={{ once: true }}
                      className={`h-full bg-gradient-to-r ${item.color} rounded-full`}
                    />
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 lg:py-32 bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/3 w-96 h-96 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/3 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.05)_0%,transparent_50%,rgba(255,255,255,0.05)_100%)]" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex p-4 bg-white/15 rounded-2xl mb-8 backdrop-blur-sm clip-corner-lg">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-4xl lg:text-5xl text-white mb-6 tracking-tight">
            Ready to verify your information?
          </h2>
          <p className="text-xl text-blue-100 mb-10 max-w-xl mx-auto leading-relaxed">
            Join researchers, journalists, and fact-checkers who rely on VeritasAI for transparent, explainable credibility assessment.
          </p>
          <Link
            to="/verify"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-700 rounded-xl hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl clip-corner"
            style={{ fontWeight: 600 }}
          >
            <span>Start Free Analysis</span>
            <CheckCircle2 className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <style>{CLIP_STYLES}</style>
    </div>
  );
}
