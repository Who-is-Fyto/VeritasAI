import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { resolveAffiliation } from "../../utils/affiliation";
import { BrandLogo } from "./ui/BrandLogo";
import { User, Mail, Key, Lock, AlertCircle, CheckCircle2, ArrowRight, Check } from "lucide-react";
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
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [touchedName, setTouchedName] = useState(false);
  const [touchedEmail, setTouchedEmail] = useState(false);
  const [touchedPassword, setTouchedPassword] = useState(false);
  const [touchedConfirm, setTouchedConfirm] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
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
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
      });
      navigate("/verify");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Registration failed. Email might already be taken.");
    } finally {
      setLoading(false);
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="w-full max-w-lg bg-white border border-blue-200/50 rounded-2xl shadow-xl p-8 clip-corner-xl"
      >
        {/* Header Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <BrandLogo size="md" variant="full" />
          </div>

          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Create Account</h2>
          <p className="text-xs text-slate-600 mt-1">
            Access the multimodal credibility engine and XAI truth mapping
          </p>
        </div>

        {/* Global Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
                placeholder="Michael Mazhambe"
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
                placeholder="you@student.richfield.ac.za or you@company.com"
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

            {/* Inline Email Error */}
            {touchedEmail && !emailValidation.isValid && (
              <p className="mt-1 text-xs text-red-600 font-medium">{emailValidation.error}</p>
            )}

            {/* Institution Affiliation Detection Preview */}
            {emailValidation.isValid && email.includes("@") && (
              (() => {
                const preview = resolveAffiliation(email);
                return (
                  <div className="mt-2 flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                    <span className="text-muted-foreground text-[11px] font-medium">Affiliation:</span>
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${preview.badgeColor}`}>
                      {preview.badgeLabel}
                    </span>
                    <span className="text-gray-800 font-medium text-[11px] truncate">{preview.institution}</span>
                  </div>
                );
              })()
            )}
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Password
              </label>
              {password && (
                <span
                  className={`text-[11px] font-bold ${
                    passwordValidation.score >= 4
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
                placeholder="Min. 8 characters"
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
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {[0, 1, 2, 3].map((barIndex) => (
                <div
                  key={barIndex}
                  className={`h-1.5 rounded-full transition-colors ${getStrengthBarColor(
                    barIndex,
                    passwordValidation.score
                  )}`}
                />
              ))}
            </div>

            {/* Password Criteria Checklist */}
            <div className="mt-2 grid grid-cols-3 gap-1 text-[11px] text-slate-600">
              <span
                className={`flex items-center gap-1 ${
                  passwordValidation.requirements.minLength ? "text-emerald-700 font-semibold" : "text-slate-500"
                }`}
              >
                <Check
                  className={`w-3 h-3 ${
                    passwordValidation.requirements.minLength ? "text-emerald-600" : "text-slate-300"
                  }`}
                />
                8+ Characters
              </span>
              <span
                className={`flex items-center gap-1 ${
                  passwordValidation.requirements.hasLetter ? "text-emerald-700 font-semibold" : "text-slate-500"
                }`}
              >
                <Check
                  className={`w-3 h-3 ${
                    passwordValidation.requirements.hasLetter ? "text-emerald-600" : "text-slate-300"
                  }`}
                />
                Letters
              </span>
              <span
                className={`flex items-center gap-1 ${
                  passwordValidation.requirements.hasNumber || passwordValidation.requirements.hasSpecial
                    ? "text-emerald-700 font-semibold"
                    : "text-slate-500"
                }`}
              >
                <Check
                  className={`w-3 h-3 ${
                    passwordValidation.requirements.hasNumber || passwordValidation.requirements.hasSpecial
                      ? "text-emerald-600"
                      : "text-slate-300"
                  }`}
                />
                Numbers / Symbols
              </span>
            </div>

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
                  Passwords Match
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
              className="w-full py-3.5 bg-gradient-to-r from-blue-700 to-blue-600 text-white rounded-xl hover:from-blue-800 hover:to-blue-700 font-semibold transition-all shadow-md flex items-center justify-center gap-2 clip-corner text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg active:scale-[0.99]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold transition-colors">
            Log In
          </Link>
        </p>
      </motion.div>
      <style>{CLIP_STYLES}</style>
    </div>
  );
}
