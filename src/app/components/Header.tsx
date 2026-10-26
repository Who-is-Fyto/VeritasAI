import React, { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { BrandLogo } from './ui/BrandLogo';
import { PricingModal } from './PricingModal';
import {
  ShieldCheck,
  Search,
  Sparkles,
  LogOut,
  User as UserIcon,
  Crown,
  Menu,
  X,
  LayoutDashboard,
  Zap,
} from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

export function Header() {
  const location = useLocation();
  const { user, isLoggedIn, logout } = useAuth();
  const [pricingOpen, setPricingOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getInitials = (name?: string) => {
    if (!name) return 'VT';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  // Determine user account tier
  const tier = (user as any)?.tier || (user?.account_type === 'academic' ? 'academic' : 'free');
  const isAdmin = user?.role === 'superadmin' || user?.role === 'admin' || user?.email?.includes('admin');

  const tierBadges: Record<string, { label: string; class: string; icon: React.ElementType }> = {
    free: {
      label: 'Free Tier',
      class: 'bg-slate-100 text-slate-700 border-slate-200',
      icon: ShieldCheck,
    },
    pro: {
      label: 'Pro Journalist',
      class: 'bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-500/20',
      icon: Zap,
    },
    academic: {
      label: 'Academic Seat',
      class: 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-1 ring-indigo-500/20',
      icon: Crown,
    },
    superadmin: {
      label: 'Super Admin',
      class: 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-500/30',
      icon: Crown,
    },
  };

  const currentTierBadge = isAdmin ? tierBadges.superadmin : (tierBadges[tier] || tierBadges.free);
  const TierIcon = currentTierBadge.icon;

  return (
    <>
      <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-40 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo & Tagline */}
            <Link to="/" className="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-1">
              <BrandLogo size="md" showBadge={true} badgeText="v1.5" />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <Link
                to="/"
                className={`text-sm font-medium transition-colors hover:text-blue-600 ${
                  location.pathname === '/' ? 'text-blue-600 font-semibold' : 'text-slate-600'
                }`}
              >
                Intelligence Hub
              </Link>

              <Link
                to="/verify"
                className={`inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-blue-600 ${
                  location.pathname === '/verify' ? 'text-blue-600 font-semibold' : 'text-slate-600'
                }`}
              >
                <Search className="w-3.5 h-3.5 text-blue-600" />
                Verify News
              </Link>

              <button
                type="button"
                onClick={() => setPricingOpen(true)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Tiers & Pricing
              </button>

              {isAdmin && (
                <Link
                  to="/admin"
                  className={`inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-emerald-700 ${
                    location.pathname.startsWith('/admin') ? 'text-emerald-700 font-bold' : 'text-slate-600'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-emerald-600" />
                  Super Admin
                </Link>
              )}
            </nav>

            {/* User Profile / Auth Actions */}
            <div className="hidden md:flex items-center gap-4">
              {isLoggedIn ? (
                <div className="flex items-center gap-3">
                  {/* Account Tier Pill */}
                  <button
                    type="button"
                    onClick={() => setPricingOpen(true)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all hover:scale-105 cursor-pointer ${currentTierBadge.class}`}
                  >
                    <TierIcon className="w-3.5 h-3.5" />
                    <span>{currentTierBadge.label}</span>
                  </button>

                  {/* Dropdown Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center gap-2 p-1 pr-3 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-800 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                          {getInitials(user?.name)}
                        </div>
                        <span className="text-xs text-slate-800 font-semibold max-w-[120px] truncate">
                          {user?.name || user?.email?.split('@')[0]}
                        </span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-lg rounded-xl">
                      <DropdownMenuLabel className="font-normal px-2 py-1.5">
                        <div className="flex flex-col space-y-1">
                          <p className="text-xs font-semibold text-slate-900 leading-none">{user?.name || 'Authorized User'}</p>
                          <p className="text-[11px] text-slate-500 leading-none truncate">{user?.email}</p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/profile" className="flex items-center gap-2 cursor-pointer text-xs py-2">
                          <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                          <span>Account & API Keys</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/verify" className="flex items-center gap-2 cursor-pointer text-xs py-2">
                          <Search className="w-3.5 h-3.5 text-slate-500" />
                          <span>New Verification Scan</span>
                        </Link>
                      </DropdownMenuItem>
                      {isAdmin && (
                        <DropdownMenuItem asChild>
                          <Link to="/admin" className="flex items-center gap-2 cursor-pointer text-xs py-2 text-emerald-700 font-medium">
                            <LayoutDashboard className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Super Admin Console</span>
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => setPricingOpen(true)}
                        className="flex items-center gap-2 cursor-pointer text-xs py-2"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>Manage Subscription Tier</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={logout}
                        className="flex items-center gap-2 cursor-pointer text-xs py-2 text-rose-600 focus:text-rose-600 focus:bg-rose-50"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPricingOpen(true)}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-2 py-1 transition-colors cursor-pointer"
                  >
                    Pricing
                  </button>
                  <Link
                    to="/login"
                    className="text-xs font-semibold text-slate-700 hover:text-blue-600 px-3 py-2 transition-colors"
                  >
                    Log In
                  </Link>
                  <Link
                    to="/signup"
                    className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow transition-all"
                  >
                    Get Started Free
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3 shadow-lg">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-slate-700 hover:text-blue-600 py-1.5"
            >
              Intelligence Hub
            </Link>
            <Link
              to="/verify"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-slate-700 hover:text-blue-600 py-1.5"
            >
              Verify News
            </Link>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setPricingOpen(true);
              }}
              className="block text-left w-full text-sm font-medium text-slate-700 hover:text-blue-600 py-1.5"
            >
              Tiers & Pricing
            </button>
            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-sm font-medium text-emerald-700 font-bold py-1.5"
              >
                Super Admin Console
              </Link>
            )}

            <div className="pt-3 border-t border-slate-100">
              {isLoggedIn ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 py-1">
                    <span>Signed in as <strong className="text-slate-800">{user?.name}</strong></span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${currentTierBadge.class}`}>
                      {currentTierBadge.label}
                    </span>
                  </div>
                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-sm text-slate-700 hover:text-blue-600 py-1"
                  >
                    Profile & API Keys
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      logout();
                    }}
                    className="block w-full text-left text-sm text-rose-600 py-1"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 pt-1">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-center text-sm font-semibold text-slate-700 py-2 rounded-lg border border-slate-200"
                  >
                    Log In
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-center text-sm font-semibold text-white py-2 rounded-lg bg-blue-600 hover:bg-blue-700 shadow-sm"
                  >
                    Get Started Free
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Commercial Account Tiers Modal */}
      <PricingModal
        open={pricingOpen}
        onOpenChange={setPricingOpen}
        currentTier={tier}
      />
    </>
  );
}
