import { useState, useMemo, useEffect } from "react";
import { BrandLogo } from "./ui/BrandLogo";
import { Link, useNavigate, useLocation } from "react-router";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { Key, Mail, AlertCircle, CheckCircle2, ArrowRight, ArrowLeft, RefreshCw, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import { validateEmail, validatePassword } from "../../utils/validation";

const CLIP_STYLES = `
  .clip-corner-xl {
    clip-path: polygon(0 18px, 18px 0, 100% 0, 100% calc(100% - 18px), calc(100% - 18px) 100%, 0 100%);
  }
  .clip-corner-sm {
    clip-path: polygon(0 5px, 5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%);
  }
`;

export function Login() {
  const { login, loginVerifyOtp, resendOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [resending, setResending] = useState(false);

  const [touchedEmail, setTouchedEmail] = useState(false);
  const [touchedPassword, setTouchedPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Redirect to redirectUrl state, or default to /verify
  const redirectUrl = (location.state as any)?.from || "/verify";

  // Countdown timer for resend PIN
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Real-time validations
  const emailValidation = useMemo(() => validateEmail(email), [email]);
  const passwordValidation = useMemo(() => validatePassword(password), [password]);

  const isFormValid = emailValidation.isValid && passwordValidation.isValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouchedEmail(true);
    setTouchedPassword(true);

    if (!isFormValid) {
      setError(emailValidation.error || passwordValidation.error || "Please correct form errors before proceeding.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await login({ email: email.trim(), password });
      if (res?.requiresOtp) {
        setStep("otp");
        setCountdown(30);
        if (res.devOtp) {
          setDevOtp(res.devOtp);
        }
        toast.info(`A 6-digit verification code has been dispatched to ${email.trim()}`);
      } else {
        toast.success("Welcome back! Authentication successful.");
        navigate(redirectUrl);
      }
    } catch (err: any) {
      console.error(err);
      const msg = err.message || "Failed to log in. Please check your credentials.";
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
      await loginVerifyOtp(email.trim(), cleanOtp);
      toast.success("Identity verified! Welcome back.");
      navigate(redirectUrl);
    } catch (err: any) {
      console.error(err);
      const msg = err.message || "Invalid or expired sign-in PIN.";
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
      const res = await resendOtp(email.trim(), "login");
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

  return (
    <div className="min-h-screen py-16 flex items-center justify-center bg-gradient-to-b from-blue-50/30 via-white to-blue-50/20 px-4">
      <div className="w-full max-w-md bg-white border border-blue-200/50 rounded-2xl shadow-xl p-8 clip-corner-xl animate-in fade-in duration-200">
        {/* Header Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <BrandLogo size="md" variant="full" />
          </div>

          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {step === "credentials" ? "Welcome Back" : "Sign-in Verification"}
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            {step === "credentials"
              ? "Authenticate to verify news credibility and review audit trails"
              : `Enter the 6-digit security PIN sent to ${email}`}
          </p>
        </div>

        {/* Global Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {step === "credentials" ? (
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Email Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
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
                  className={`w-full pl-10 pr-9 py-3 text-sm rounded-xl outline-none transition-all ${
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

              {/* Inline Email Error */}
              {touchedEmail && !emailValidation.isValid && (
                <p className="mt-1.5 text-xs text-red-600 flex items-start gap-1 font-medium">
                  <span>{emailValidation.error}</span>
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Password
                </label>
                {touchedPassword && passwordValidation.isValid && (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Valid
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
                  placeholder="Min. 8 characters"
                  className={`w-full pl-10 pr-9 py-3 text-sm rounded-xl outline-none transition-all ${
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

              {/* Inline Password Error */}
              {touchedPassword && !passwordValidation.isValid && (
                <p className="mt-1.5 text-xs text-red-600 flex items-start gap-1 font-medium">
                  <span>{passwordValidation.error}</span>
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || (!isFormValid && (touchedEmail || touchedPassword))}
              className="w-full py-3.5 bg-gradient-to-r from-blue-700 to-blue-600 text-white rounded-xl hover:from-blue-800 hover:to-blue-700 font-semibold transition-all shadow-md flex items-center justify-center gap-2 clip-corner text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg active:scale-[0.99] cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Log In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* STEP 2: Sign-in 6-Digit PIN Verification */
          <form onSubmit={handleVerifyOtp} className="space-y-6" noValidate>
            <div className="p-4 bg-blue-50/50 border border-blue-200/60 rounded-xl text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                Enter the 6-digit confirmation PIN sent to:
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
                Enter 6-Digit Sign-In PIN
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
                    <span>Verify & Complete Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setStep("credentials");
                    setOtp("");
                    setError(null);
                  }}
                  className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Login
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
        <p className="text-center text-xs text-muted-foreground mt-8">
          Don't have an account?{" "}
          <Link to="/signup" className="text-blue-600 hover:text-blue-700 font-semibold transition-colors">
            Sign Up Free
          </Link>
        </p>
      </div>
      <style>{CLIP_STYLES}</style>
    </div>
  );
}
