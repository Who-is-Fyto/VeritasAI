import { useState, useMemo } from "react";
import { BrandLogo } from "./ui/BrandLogo";
import { Link, useNavigate, useLocation } from "react-router";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { Key, Mail, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
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
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [touchedEmail, setTouchedEmail] = useState(false);
  const [touchedPassword, setTouchedPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Redirect to redirectUrl state, or default to /verify
  const redirectUrl = (location.state as any)?.from || "/verify";

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
      await login({ email: email.trim(), password });
      toast.success("Welcome back! Authentication successful.");
      navigate(redirectUrl);
    } catch (err: any) {
      console.error(err);
      const msg = err.message || "Failed to log in. Please check your credentials.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-16 flex items-center justify-center bg-gradient-to-b from-blue-50/30 via-white to-blue-50/20 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="w-full max-w-md bg-white border border-blue-200/50 rounded-2xl shadow-xl p-8 clip-corner-xl"
      >
        {/* Header Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <BrandLogo size="md" variant="full" />
          </div>

          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Welcome Back</h2>
          <p className="text-xs text-slate-600 mt-1">
            Authenticate to verify news credibility and review audit trails
          </p>
        </div>

        {/* Global Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

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
                  Valid Format
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
                placeholder="you@student.richfield.ac.za"
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
            className="w-full py-3.5 bg-gradient-to-r from-blue-700 to-blue-600 text-white rounded-xl hover:from-blue-800 hover:to-blue-700 font-semibold transition-all shadow-md flex items-center justify-center gap-2 clip-corner text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg active:scale-[0.99]"
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

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          Don't have an account?{" "}
          <Link to="/signup" className="text-blue-600 hover:text-blue-700 font-semibold transition-colors">
            Sign Up Free
          </Link>
        </p>
      </motion.div>
      <style>{CLIP_STYLES}</style>
    </div>
  );
}
