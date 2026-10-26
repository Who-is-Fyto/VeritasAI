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
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  const Mark = (
    <div
      className={`relative flex items-center justify-center shrink-0 rounded-xl bg-slate-950 p-1 shadow-md shadow-slate-900/30 ring-1 ring-slate-800 transition-transform group-hover:scale-105 ${iconSizes[size]}`}
    >
      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        aria-hidden="true"
      >
        {/* Shield Background */}
        <path
          d="M60 10L18 24V54C18 78 36 99.5 60 106C84 99.5 102 78 102 54V24L60 10Z"
          fill="url(#brandObsidian)"
          stroke="url(#brandBorder)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Radar / Sub-structure Grid */}
        <path
          d="M32 46C32 63.5 44 79 60 84C76 79 88 63.5 88 46"
          stroke="#1E293B"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />

        {/* The Veritas 'V' Multi-Dimensional Prism */}
        {/* Left Wing: Electric Azure to Royal Blue */}
        <path d="M34 32L60 76V56L44 30L34 32Z" fill="url(#brandBlueWing)" />
        <path d="M34 32L44 30L60 56V64L34 32Z" fill="#60A5FA" fillOpacity="0.9" />

        {/* Right Wing: Emerald to Cyan */}
        <path d="M86 32L60 76V56L76 30L86 32Z" fill="url(#brandEmeraldWing)" />
        <path d="M86 32L76 30L60 56V64L86 32Z" fill="#34D399" fillOpacity="0.9" />

        {/* Central Truth Lens / Diamond */}
        <polygon points="60,20 69,33 60,44 51,33" fill="#FFFFFF" />
        <polygon points="60,24 65,33 60,40 55,33" fill="#0284C7" />
        <circle cx="60" cy="33" r="2" fill="#FFFFFF" />

        <defs>
          <linearGradient id="brandObsidian" x1="60" y1="10" x2="60" y2="106" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0B0F19" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>
          <linearGradient id="brandBorder" x1="18" y1="10" x2="102" y2="106" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="35%" stopColor="#2563EB" />
            <stop offset="70%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#1E293B" />
          </linearGradient>
          <linearGradient id="brandBlueWing" x1="34" y1="30" x2="60" y2="76" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
          <linearGradient id="brandEmeraldWing" x1="86" y1="30" x2="60" y2="76" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#06B6D4" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>
      </svg>

      {/* Live Core Engine Active Indicator */}
      <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border-2 border-white"></span>
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
          className={`font-black tracking-tight text-slate-950 dark:text-white ${textSizes[size]}`}
          style={{ letterSpacing: '-0.03em' }}
        >
          VERITAS
        </span>
        <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md bg-gradient-to-r from-blue-700 to-blue-600 text-white font-extrabold text-xs tracking-wider shadow-xs">
          AI
        </span>
        {showBadge && (
          <span className="ml-1 inline-flex items-center rounded-md bg-slate-900/5 dark:bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-300 ring-1 ring-inset ring-slate-900/10 uppercase tracking-wider">
            {badgeText}
          </span>
        )}
      </div>
      <span className="text-[10px] font-bold tracking-widest text-slate-600 uppercase mt-0.5">
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
