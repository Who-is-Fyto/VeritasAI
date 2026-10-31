import { Outlet, Link } from "react-router";
import { Header } from "./Header";
import { BrandLogo } from "./ui/BrandLogo";
import { ShieldCheck, Cpu, Scale, Search, ExternalLink } from "lucide-react";

export function Root() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white">
      {/* Background Newsroom Grid Texture */}
      <div className="fixed inset-0 bg-grid-slate pointer-events-none opacity-40 z-0" />
      
      {/* Top Header */}
      <Header />

      {/* Main Routed Content */}
      <main className="flex-1 relative z-10 min-h-0">
        <Outlet />
      </main>

      {/* Authoritative Newsroom Footer */}
      <footer className="relative z-10 border-t border-slate-200/80 bg-white/90 backdrop-blur-md pt-10 pb-8 text-xs text-slate-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Brand Column */}
            <div className="md:col-span-2 space-y-3">
              <BrandLogo size="sm" showBadge={true} badgeText="v1.5 Flagship" />
              <p className="text-slate-500 max-w-md leading-relaxed">
                VeritasAI is an explainable multimodal credibility engine evaluating digital news authenticity across linguistic stylometry, publisher domain authority, and real-time wire corroboration.
              </p>
              <div className="flex items-center gap-4 pt-1">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  RoBERTa Transformer Online
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                  MBFC Domain Audit Active
                </span>
              </div>
            </div>

            {/* Architecture Tri-Pillar */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Analysis Dimensions</h4>
              <ul className="space-y-2 text-slate-500">
                <li className="flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5 text-blue-600" />
                  <span>40% Linguistic Stylometry</span>
                </li>
                <li className="flex items-center gap-2">
                  <Scale className="w-3.5 h-3.5 text-indigo-600" />
                  <span>35% Source Authority</span>
                </li>
                <li className="flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-emerald-600" />
                  <span>25% Wire Corroboration</span>
                </li>
              </ul>
            </div>

            {/* Navigation & Research */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Platform Resources</h4>
              <ul className="space-y-1.5 text-slate-500">
                <li>
                  <Link to="/verify" className="hover:text-blue-600 transition-colors">
                    Verify Article or URL
                  </Link>
                </li>
                <li>
                  <Link to="/profile" className="hover:text-blue-600 transition-colors">
                    Developer API Keys
                  </Link>
                </li>
                <li>
                  <a
                    href="https://github.com/facebookresearch/fairseq/tree/main/examples/roberta"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 hover:text-blue-600 transition-colors"
                  >
                    <span>RoBERTa Architecture</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  <a
                    href="https://mediabiasfactcheck.com"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 hover:text-blue-600 transition-colors"
                  >
                    <span>MediaBias/FactCheck API</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between text-slate-400 gap-4">
            <p>
              &copy; {new Date().getFullYear()} VeritasAI Intelligence. Developed by Michael Mazhambe.
            </p>
            <p className="text-[11px] text-slate-400 italic">
              Probabilistic intelligence engine. Final editorial discretion rests with human analysts.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
