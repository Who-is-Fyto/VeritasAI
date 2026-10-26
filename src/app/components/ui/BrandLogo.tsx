import React from 'react';

export interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'full' | 'mark-only' | 'wordmark-only';
  showBadge?: boolean;
  badgeText?: string;
  className?: string;
}

export function BrandLogo({
  size = 'md',
  variant = 'full',
  showBadge = true,
  badgeText = 'v1.5 Enterprise',
  className = '',
}: BrandLogoProps) {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  const Mark = (
    <div
      className={`relative flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-800 p-1.5 shadow-md shadow-blue-500/20 ring-1 ring-white/30 ${iconSizes[size]}`}
    >
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full text-white"
        aria-hidden="true"
      >
        {/* Outer Shield Shell */}
        <path
          d="M20 4L7 9V19C7 27.5 12.5 34.5 20 37C27.5 34.5 33 27.5 33 19V9L20 4Z"
          fill="url(#shieldGrad)"
          stroke="#93C5FD"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* Tri-Facet Credibility Aperture */}
        {/* Left Facet: Linguistic NLP */}
        <path
          d="M20 12L12 21H20V32C15 29 11 24.5 11 19V11.5L20 12Z"
          fill="#38BDF8"
          fillOpacity="0.85"
        />
        {/* Right Facet: Source Authority */}
        <path
          d="M20 12L28 21H20V32C25 29 29 24.5 29 19V11.5L20 12Z"
          fill="#818CF8"
          fillOpacity="0.85"
        />
        {/* Core Convergence Prism: External Corroboration */}
        <polygon
          points="20,10 25,18 20,24 15,18"
          fill="#FFFFFF"
          className="drop-shadow-sm"
        />
        <circle cx="20" cy="18" r="2.5" fill="#1E3A8A" />

        <defs>
          <linearGradient id="shieldGrad" x1="7" y1="4" x2="33" y2="37" gradientUnits="userSpaceOnUse">
            <stop stopColor="#1E40AF" />
            <stop offset="0.5" stopColor="#2563EB" />
            <stop offset="1" stopColor="#312E81" />
          </linearGradient>
        </defs>
      </svg>
      {/* Active pulse dot */}
      <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 border border-white"></span>
      </span>
    </div>
  );

  if (variant === 'mark-only') {
    return <div className={`inline-flex items-center ${className}`}>{Mark}</div>;
  }

  const Wordmark = (
    <div className="flex flex-col">
      <div className="flex items-center gap-1.5 leading-none">
        <span
          className={`font-black tracking-tight text-slate-900 dark:text-white ${textSizes[size]}`}
          style={{ letterSpacing: '-0.035em' }}
        >
          VERITAS
        </span>
        <span
          className={`font-black tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent ${textSizes[size]}`}
          style={{ letterSpacing: '-0.02em' }}
        >
          AI
        </span>
        {showBadge && (
          <span className="ml-1.5 inline-flex items-center rounded-md bg-slate-900/5 dark:bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300 ring-1 ring-inset ring-slate-900/10 dark:ring-white/10 uppercase tracking-wider">
            {badgeText}
          </span>
        )}
      </div>
      <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase mt-0.5">
        Multimodal Credibility Engine
      </span>
    </div>
  );

  if (variant === 'wordmark-only') {
    return <div className={`inline-flex items-center ${className}`}>{Wordmark}</div>;
  }

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {Mark}
      {Wordmark}
    </div>
  );
}
