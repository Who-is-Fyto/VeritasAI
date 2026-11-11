import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { resolveAffiliation } from "../../utils/affiliation";
import { BrandLogo } from "./ui/BrandLogo";
import { User, Mail, Key, Lock, AlertCircle, CheckCircle2, ArrowRight, ArrowLeft, RefreshCw, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import {
  validateName,
  validateEmail,
  validatePassword,
  validateConfirmPassword,
} from "../../utils/validation";

const CLIP_STYLES = `
  .clip-corner-xl {
    clip-path: polygon(0 18px, 18px 0, 100% 0, 100% calc(100% - 18px), calc(100% - 18px) 100%, 0 100%);
  }
  .clip-corner-sm {
    clip-path: polygon(0 5px, 5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%);
  }
`;

export function Signup() {
  const { signupRequestOtp, signupVerifyOtp, resendOtp } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<"form" | "otp">("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [resending, setResending] = useState(false);

  const [touchedName, setTouchedName] = useState(false);
  const [touchedEmail, setTouchedEmail] = useState(false);
  const [touchedPassword, setTouchedPassword] = useState(false);
  const [touchedConfirm, setTouchedConfirm] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Countdown timer for OTP resend rate-limit
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Real-time validations
  const nameValidation = useMemo(() => validateName(name), [name]);
  const emailValidation = useMemo(() => validateEmail(email), [email]);
  const passwordValidation = useMemo(() => validatePassword(password), [password]);
  const confirmValidation = useMemo(
    () => validateConfirmPassword(password, confirmPassword),
    [password, confirmPassword]
  );

  const isFormValid =
    nameValidation.isValid &&
    emailValidation.isValid &&
    passwordValidation.isValid &&
    confirmValidation.isValid;

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouchedName(true);
    setTouchedEmail(true);
    setTouchedPassword(true);
    setTouchedConfirm(true);

    if (!isFormValid) {
      setError(
        nameValidation.error ||
        emailValidation.error ||
        passwordValidation.error ||
        confirmValidation.error ||
        "Please complete all required fields correctly."
      );
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await signupRequestOtp({
        name: name.trim(),
        email: email.trim(),
        password,
      });
      setStep("otp");
      setCountdown(30);
      if (res.dev_otp) {
        setDevOtp(res.dev_otp);
      }
      toast.success(`Verification code dispatched to ${email.trim()}`);
    } catch (err: any) {
      console.error(err);
      const msg = err.message || "Registration failed. Email might already be taken.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await signupVerifyOtp(email.trim(), cleanOtp);
      toast.success("Account verified and created successfully! Welcome to VeritasAI.");
      navigate("/verify");
    } catch (err: any) {
      console.error(err);
      const msg = err.message || "Invalid or expired verification PIN.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || resending) return;
    setResending(true);
    setError(null);
    try {
      const res = await resendOtp(email.trim(), "signup");
      setCountdown(30);
      if (res.dev_otp) {
        setDevOtp(res.dev_otp);
      }
      toast.success("A fresh 6-digit PIN has been dispatched to your email.");
    } catch (err: any) {
      toast.error(err.message || "Could not resend code. Please wait a moment.");
    } finally {
      setResending(false);
    }
  };

  // Password strength styling helpers
  const getStrengthBarColor = (index: number, score: number) => {
    if (score === 0) return "bg-slate-200";
    if (index >= score) return "bg-slate-200";
    if (score === 1) return "bg-red-500";
    if (score === 2) return "bg-amber-500";
    if (score === 3) return "bg-blue-600";
    return "bg-emerald-500";
  };

  return (
    <div className="min-h-screen py-16 flex items-center justify-center bg-gradient-to-b from-blue-50/30 via-white to-blue-50/20 px-4">
      <div className="w-full max-w-lg bg-white border border-blue-200/50 rounded-2xl shadow-xl p-8 clip-corner-xl animate-in fade-in duration-200">
        {/* Header Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <BrandLogo size="md" variant="full" />
          </div>

          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {step === "form" ? "Create Account" : "Verify Email Address"}
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            {step === "form"
              ? "Access the multimodal credibility engine and XAI truth mapping"
              : `Enter the 6-digit confirmation code dispatched to ${email}`}
          </p>
        </div>

        {/* Global Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {/* STEP 1: Registration Form */}
        {step === "form" ? (
          <form onSubmit={handleRequestOtp} className="space-y-4" noValidate>
            {/* Full Name */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Full Name
                </label>
                {touchedName && nameValidation.isValid && (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Valid
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError(null);
                  }}
                  onBlur={() => setTouchedName(true)}
                  placeholder="e.g. Sarah Jenkins"
                  className={`w-full pl-10 pr-9 py-2.5 text-sm rounded-xl outline-none transition-all ${
                    touchedName && !nameValidation.isValid
                      ? "bg-red-50/20 border-2 border-red-500 focus:border-red-600 focus:ring-1 focus:ring-red-600 text-slate-900"
                      : touchedName && nameValidation.isValid
                      ? "bg-emerald-50/20 border border-emerald-500/70 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 text-slate-900"
                      : "bg-blue-50/20 border border-blue-200/50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-900"
                  }`}
                />
                {touchedName && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    {nameValidation.isValid ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                )}
              </div>
              {touchedName && !nameValidation.isValid && (
                <p className="mt-1 text-xs text-red-600 font-medium">{nameValidation.error}</p>
              )}
            </div>

            {/* Email Address */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Email Address
                </label>
                {touchedEmail && emailValidation.isValid && (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Valid format
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  onBlur={() => setTouchedEmail(true)}
                  placeholder="name@university.ac.za or work@domain.com"
                  className={`w-full pl-10 pr-9 py-2.5 text-sm rounded-xl outline-none transition-all ${
                    touchedEmail && !emailValidation.isValid
                      ? "bg-red-50/20 border-2 border-red-500 focus:border-red-600 focus:ring-1 focus:ring-red-600 text-slate-900"
                      : touchedEmail && emailValidation.isValid
                      ? "bg-emerald-50/20 border border-emerald-500/70 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 text-slate-900"
                      : "bg-blue-50/20 border border-blue-200/50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-900"
                  }`}
                />
                {touchedEmail && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    {emailValidation.isValid ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                )}
              </div>
              {touchedEmail && !emailValidation.isValid && (
                <p className="mt-1 text-xs text-red-600 font-medium">{emailValidation.error}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Password
                </label>
                {touchedPassword && (
                  <span
                    className={`text-[11px] font-semibold ${
                      passwordValidation.score === 4
                        ? "text-emerald-600"
                        : passwordValidation.score === 3
                        ? "text-blue-600"
                        : passwordValidation.score === 2
                        ? "text-amber-600"
                        : "text-red-500"
                    }`}
                  >
                    {passwordValidation.strengthLabel}
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground">
                  <Key className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  onBlur={() => setTouchedPassword(true)}
                  placeholder="Min. 8 chars with letter & number/symbol"
                  className={`w-full pl-10 pr-9 py-2.5 text-sm rounded-xl outline-none transition-all ${
                    touchedPassword && !passwordValidation.isValid
                      ? "bg-red-50/20 border-2 border-red-500 focus:border-red-600 focus:ring-1 focus:ring-red-600 text-slate-900"
                      : touchedPassword && passwordValidation.isValid
                      ? "bg-emerald-50/20 border border-emerald-500/70 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 text-slate-900"
                      : "bg-blue-50/20 border border-blue-200/50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-900"
                  }`}
                />
                {touchedPassword && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    {passwordValidation.isValid ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                )}
              </div>

              {/* Password Strength Meter */}
              {password.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex gap-1.5 h-1.5">
                    {[0, 1, 2, 3].map((idx) => (
                      <div
                        key={idx}
                        className={`flex-1 rounded-full transition-all duration-300 ${getStrengthBarColor(
                          idx,
                          passwordValidation.score
                        )}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {touchedPassword && !passwordValidation.isValid && (
                <p className="mt-1 text-xs text-red-600 font-medium">{passwordValidation.error}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Confirm Password
                </label>
                {touchedConfirm && confirmValidation.isValid && (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Matches
                  </span>
                )}
              </div>

              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  onBlur={() => setTouchedConfirm(true)}
                  placeholder="Re-enter your password"
                  className={`w-full pl-10 pr-9 py-2.5 text-sm rounded-xl outline-none transition-all ${
                    touchedConfirm && !confirmValidation.isValid
                      ? "bg-red-50/20 border-2 border-red-500 focus:border-red-600 focus:ring-1 focus:ring-red-600 text-slate-900"
                      : touchedConfirm && confirmValidation.isValid
                      ? "bg-emerald-50/20 border border-emerald-500/70 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 text-slate-900"
                      : "bg-blue-50/20 border border-blue-200/50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-900"
                  }`}
                />
                {touchedConfirm && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    {confirmValidation.isValid ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                )}
              </div>
              {touchedConfirm && !confirmValidation.isValid && (
                <p className="mt-1 text-xs text-red-600 font-medium">{confirmValidation.error}</p>
              )}
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={
                  loading ||
                  (!isFormValid && (touchedName || touchedEmail || touchedPassword || touchedConfirm))
                }
                className="w-full py-3.5 bg-gradient-to-r from-blue-700 to-blue-600 text-white rounded-xl hover:from-blue-800 hover:to-blue-700 font-semibold transition-all shadow-md flex items-center justify-center gap-2 clip-corner text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg active:scale-[0.99] cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Continue to Verification</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* STEP 2: 6-Digit PIN Verification */
          <form onSubmit={handleVerifyOtp} className="space-y-6" noValidate>
            <div className="p-4 bg-blue-50/50 border border-blue-200/60 rounded-xl text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                A 6-digit confirmation PIN has been sent via email to:
                <strong className="block text-slate-900 font-bold text-sm mt-0.5">{email}</strong>
              </p>
            </div>

            {/* Dev Mode Banner (for testing without internet / during presentation) */}
            {devOtp && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 text-center font-medium">
                Development Environment PIN: <span className="font-mono font-bold text-sm tracking-wider text-emerald-700">{devOtp}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider text-center mb-2">
                Enter 6-Digit Verification PIN
              </label>
              <input
                type="text"
                autoFocus
                required
                maxLength={6}
                value={otp}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setOtp(val);
                  if (error) setError(null);
                }}
                placeholder="------"
                className="w-full text-center py-3.5 text-2xl font-mono font-black tracking-[0.5em] rounded-xl border-2 border-blue-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 outline-none transition-all text-slate-900 bg-slate-50/40"
              />
              <p className="text-[11px] text-slate-500 text-center mt-2 font-medium">
                Single-use PIN valid for 10 minutes
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                type="submit"
                disabled={loading || otp.trim().length !== 6}
                className="w-full py-3.5 bg-gradient-to-r from-blue-700 to-blue-600 text-white rounded-xl hover:from-blue-800 hover:to-blue-700 font-bold transition-all shadow-md flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg active:scale-[0.99] cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Verify & Create Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setStep("form");
                    setOtp("");
                    setError(null);
                  }}
                  className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Edit details
                </button>

                <button
                  type="button"
                  onClick={handleResend}
                  disabled={countdown > 0 || resending}
                  className="text-blue-600 hover:text-blue-700 disabled:text-slate-400 disabled:cursor-not-allowed font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${resending ? "animate-spin" : ""}`} />
                  {countdown > 0 ? `Resend code (${countdown}s)` : "Resend code"}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold transition-colors">
            Log In
          </Link>
        </p>
      </div>
      <style>{CLIP_STYLES}</style>
    </div>
  );
}
