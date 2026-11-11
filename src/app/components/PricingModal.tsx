import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import { Check, ShieldCheck, Zap, Sparkles, Building2, HelpCircle, CheckCircle2 } from 'lucide-react';
import { AccountTier, TIER_CONFIGS } from '../../utils/tierLimits';

interface PricingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTier?: AccountTier | string;
  onSelectTier?: (tier: AccountTier) => Promise<void> | void;
}

export function PricingModal({
  open,
  onOpenChange,
  currentTier = 'free',
  onSelectTier,
}: PricingModalProps) {
  const [upgradingTo, setUpgradingTo] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const normalizedCurrentTier = (currentTier || 'free').toLowerCase();
  const isPrivilegedAdmin = normalizedCurrentTier === 'admin' || normalizedCurrentTier === 'superadmin';

  const handleTierClick = async (tierId: AccountTier) => {
    if (isPrivilegedAdmin || tierId === normalizedCurrentTier) return;
    setUpgradingTo(tierId);
    try {
      if (onSelectTier) {
        await onSelectTier(tierId);
      }
      const tierName = TIER_CONFIGS[tierId]?.name || tierId;
      setSuccessMessage(`Successfully switched account to ${tierName}!`);
      setTimeout(() => {
        setSuccessMessage(null);
        setUpgradingTo(null);
        onOpenChange(false);
      }, 1200);
    } catch (err) {
      console.error(err);
      setUpgradingTo(null);
    }
  };

  const tiers = [
    {
      id: 'free' as AccountTier,
      name: 'Community / Free',
      badge: 'Public Tier',
      price: '$0',
      period: 'forever',
      description: 'Ideal for casual readers, students, and basic fact-checking inquiries.',
      icon: ShieldCheck,
      iconColor: 'text-slate-600 bg-slate-100',
      buttonText: normalizedCurrentTier === 'free' ? 'Current Plan' : 'Downgrade to Free',
      buttonVariant: 'outline' as const,
      isCurrent: normalizedCurrentTier === 'free',
      features: [
        '5 daily credibility scans',
        'RoBERTa linguistic NLP analysis',
        'Standard domain authority check',
        'Public news API corroboration',
        'Basic Truth Map highlight view',
      ],
      limitations: [
        'No PDF Audit Certificate export',
        'Standard queue processing (~10s)',
        'No batch analysis or API keys',
      ],
    },
    {
      id: 'pro' as AccountTier,
      name: 'Journalist & Pro',
      badge: 'Most Popular',
      price: '$19',
      period: 'per month',
      description: 'For investigative journalists, newsrooms, and professional fact-checkers.',
      icon: Zap,
      iconColor: 'text-blue-600 bg-blue-100',
      buttonText: normalizedCurrentTier === 'pro' ? 'Current Plan' : 'Upgrade to Pro',
      buttonVariant: 'default' as const,
      isCurrent: normalizedCurrentTier === 'pro',
      highlighted: true,
      features: [
        'Unlimited daily credibility verifications',
        'Priority queue (< 3s inference)',
        'Exportable PDF Audit Certificates with unique ID',
        'Deep multi-hop wire corroboration (Reuters, AP, AFP)',
        'Claim-by-claim verdict breakdowns',
        'Developer REST API keys (up to 5 active keys)',
      ],
    },
    {
      id: 'academic' as AccountTier,
      name: 'Academic / Enterprise',
      badge: 'Institutional',
      price: '$49',
      period: 'per seat / mo',
      description: 'For universities, research institutes, and intelligence organizations.',
      icon: Building2,
      iconColor: 'text-indigo-600 bg-indigo-100',
      buttonText: normalizedCurrentTier === 'academic' ? 'Current Plan' : 'Activate Academic Seat',
      buttonVariant: 'outline' as const,
      isCurrent: normalizedCurrentTier === 'academic',
      features: [
        'All Pro tier capabilities included',
        'Active learning self-training loop triggers',
        'Institutional domain auto-affiliation (.edu / .ac.za)',
        'Unlimited developer API keys with high limits',
        'Team workspaces and audit trail inspection',
        'Methodology report and weight telemetry export',
      ],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-6 md:p-8">
        <DialogHeader className="text-center sm:text-left mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold uppercase tracking-wider mb-2 self-start">
            <Sparkles className="w-3.5 h-3.5" /> Commercial Architecture
          </div>
          <DialogTitle className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            VeritasAI Account Tiers & Capabilities
          </DialogTitle>
          <DialogDescription className="text-slate-600 text-sm sm:text-base">
            Select the verification tier calibrated for your workflow. Designed for both individual readers and enterprise newsrooms.
          </DialogDescription>
        </DialogHeader>

        {successMessage && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {isPrivilegedAdmin && (
          <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-xl text-xs flex items-center gap-3 font-medium">
            <ShieldCheck className="w-5 h-5 text-indigo-600 flex-shrink-0" />
            <span>
              You are signed in with an Administrative Account. Consumer subscription modifications are restricted for administrators. Manage accounts and permissions via the Admin Console.
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tiers.map((tier) => {
            const Icon = tier.icon;
            const isTarget = upgradingTo === tier.id;
            return (
              <div
                key={tier.id}
                className={`relative flex flex-col rounded-2xl border p-5 sm:p-6 transition-all ${
                  tier.highlighted
                    ? 'border-blue-600 bg-gradient-to-b from-blue-50/40 via-white to-white shadow-lg shadow-blue-500/10 ring-2 ring-blue-600/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 shadow-sm'
                }`}
              >
                {tier.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-0.5 text-xs font-bold text-white shadow-sm uppercase tracking-wider">
                    {tier.badge}
                  </span>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-xl ${tier.iconColor}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{tier.name}</h3>
                    <span className="text-xs text-slate-500">{tier.badge}</span>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-slate-900 tracking-tight">{tier.price}</span>
                    <span className="text-xs text-slate-500 font-medium">/{tier.period}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-2 min-h-[32px]">{tier.description}</p>
                </div>

                <Button
                  variant={tier.buttonVariant}
                  className={`w-full mb-6 text-xs font-semibold py-2.5 rounded-xl cursor-pointer ${
                    tier.highlighted ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md' : ''
                  }`}
                  disabled={isPrivilegedAdmin || tier.isCurrent || isTarget}
                  onClick={() => handleTierClick(tier.id)}
                >
                  {isPrivilegedAdmin ? 'Managed via Console' : isTarget ? 'Updating Plan...' : tier.buttonText}
                </Button>

                <div className="space-y-2.5 text-xs text-slate-700 flex-1">
                  <p className="font-semibold text-slate-900 uppercase tracking-wider text-[11px] mb-2">
                    Included Capabilities:
                  </p>
                  {tier.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </div>
                  ))}
                  {tier.limitations?.map((lim, idx) => (
                    <div key={`lim-${idx}`} className="flex items-start gap-2 text-slate-400">
                      <HelpCircle className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
                      <span>{lim}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>
            Academic institutions automatically qualify for subsidized access through accredited institutional domains (.ac / .edu).
          </p>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-slate-600 cursor-pointer">
            Close Overview
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
