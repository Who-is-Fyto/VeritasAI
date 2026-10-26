/**
 * VeritasAI Form and Input Validation Utility
 * Comprehensive client-side validation engine enforcing academic defense criteria:
 * - Rejection of malformed / nonsense email addresses (e.g. yd@g.com, single-character domains, disposable domains).
 * - Password strength scoring and requirement checks.
 * - Minimum content length validation for transformer NLP inference.
 * - RFC-compliant URL structure validation.
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface PasswordValidationResult extends ValidationResult {
  score: number; // 0 (weak) to 4 (very strong)
  strengthLabel: "Too Weak" | "Weak" | "Fair" | "Strong" | "Very Strong";
  requirements: {
    minLength: boolean;
    hasLetter: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
}

export interface TextValidationResult extends ValidationResult {
  charCount: number;
  wordCount: number;
  minCharsRequired: number;
  charsRemaining: number;
  isReadyForInference: boolean;
}

export interface UrlValidationResult extends ValidationResult {
  hostname?: string;
  protocol?: string;
}

/**
 * Known disposable, temporary, and test domain blocklist.
 */
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
  "trashmail.com",
  "throwawaymail.com",
  "sharklasers.com",
  "yopmail.com",
  "fake.com",
  "test.com",
  "example.com",
  "invalid.com",
  "dispostable.com",
  "getairmail.com",
]);

/**
 * Validates email addresses with strict structural and nonsense-prevention checks.
 * Rejects addresses like "yd@g.com", addresses with single-character domains,
 * invalid TLDs, and consecutive dots.
 */
export function validateEmail(email: string): ValidationResult {
  const clean = email.trim();

  if (!clean) {
    return { isValid: false, error: "Email address is required." };
  }

  // Length boundaries
  if (clean.length < 6 || clean.length > 254) {
    return { isValid: false, error: "Email address must be between 6 and 254 characters." };
  }

  // Must have exactly one @ symbol
  const atParts = clean.split("@");
  if (atParts.length !== 2) {
    return { isValid: false, error: "Email must contain exactly one '@' separator." };
  }

  const [localPart, domainPart] = atParts;

  // Local part (username) validation
  if (!localPart || localPart.length < 2) {
    return { isValid: false, error: "Email username before '@' must be at least 2 characters long." };
  }

  if (localPart.length > 64) {
    return { isValid: false, error: "Email username cannot exceed 64 characters." };
  }

  if (localPart.startsWith(".") || localPart.endsWith(".")) {
    return { isValid: false, error: "Email username cannot start or end with a period." };
  }

  if (localPart.includes("..")) {
    return { isValid: false, error: "Email username cannot contain consecutive periods." };
  }

  // Allow standard RFC characters in local part
  const localRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/;
  if (!localRegex.test(localPart)) {
    return { isValid: false, error: "Email username contains unsupported special characters." };
  }

  // Domain part validation
  if (!domainPart || !domainPart.includes(".")) {
    return { isValid: false, error: "Email domain must contain a valid dot-separated extension (e.g. gmail.com)." };
  }

  if (domainPart.startsWith(".") || domainPart.endsWith(".")) {
    return { isValid: false, error: "Email domain cannot start or end with a period." };
  }

  if (domainPart.includes("..")) {
    return { isValid: false, error: "Email domain cannot contain consecutive periods." };
  }

  const domainSegments = domainPart.toLowerCase().split(".");
  const tld = domainSegments[domainSegments.length - 1];
  const primaryDomain = domainSegments[0];

  // Specific check: Disallow single-character domain names like "g.com" (e.g. yd@g.com)
  if (primaryDomain.length < 2) {
    return {
      isValid: false,
      error: `Invalid domain '${primaryDomain}.${tld}'. Domain names must be at least 2 characters long (e.g. gmail.com).`,
    };
  }

  // Validate all domain labels (must be alphanumeric or hyphen, cannot start/end with hyphen)
  for (const seg of domainSegments) {
    if (seg.length === 0) {
      return { isValid: false, error: "Email domain contains empty segment." };
    }
    if (!/^[a-z0-9-]+$/.test(seg)) {
      return { isValid: false, error: `Domain label '${seg}' contains invalid characters.` };
    }
    if (seg.startsWith("-") || seg.endsWith("-")) {
      return { isValid: false, error: `Domain label '${seg}' cannot start or end with a hyphen.` };
    }
  }

  // TLD validation: must be purely alphabetical and at least 2 characters
  if (!/^[a-z]{2,24}$/.test(tld)) {
    return { isValid: false, error: `Invalid top-level domain '.${tld}'. TLDs must be at least 2 alphabetic characters.` };
  }

  // Check against disposable / test domain blocklist
  const fullDomain = domainSegments.slice(-2).join(".");
  if (DISPOSABLE_DOMAINS.has(domainPart.toLowerCase()) || DISPOSABLE_DOMAINS.has(fullDomain)) {
    return {
      isValid: false,
      error: `Domain '${domainPart}' is an untrusted or disposable email provider. Please use an institutional or corporate email.`,
    };
  }

  return { isValid: true };
}

/**
 * Validates password strength, requiring minimum 8 characters with letters and numbers/symbols.
 */
export function validatePassword(password: string): PasswordValidationResult {
  const reqs = {
    minLength: password.length >= 8,
    hasLetter: /[a-zA-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^a-zA-Z0-9]/.test(password),
  };

  let score = 0;
  if (reqs.minLength) score += 1;
  if (reqs.hasLetter) score += 1;
  if (reqs.hasNumber) score += 1;
  if (reqs.hasSpecial) score += 1;
  if (password.length >= 12) score += 1;

  let strengthLabel: PasswordValidationResult["strengthLabel"] = "Too Weak";
  if (score >= 4) strengthLabel = "Very Strong";
  else if (score === 3) strengthLabel = "Strong";
  else if (score === 2) strengthLabel = "Fair";
  else if (score === 1) strengthLabel = "Weak";

  if (!password) {
    return {
      isValid: false,
      error: "Password is required.",
      score: 0,
      strengthLabel: "Too Weak",
      requirements: reqs,
    };
  }

  if (password.length < 8) {
    return {
      isValid: false,
      error: "Password must be at least 8 characters long.",
      score,
      strengthLabel,
      requirements: reqs,
    };
  }

  if (!reqs.hasLetter) {
    return {
      isValid: false,
      error: "Password must contain at least one letter.",
      score,
      strengthLabel,
      requirements: reqs,
    };
  }

  if (!reqs.hasNumber && !reqs.hasSpecial) {
    return {
      isValid: false,
      error: "Password must contain at least one number or special character.",
      score,
      strengthLabel,
      requirements: reqs,
    };
  }

  return {
    isValid: true,
    score,
    strengthLabel,
    requirements: reqs,
  };
}

/**
 * Validates password confirmation match.
 */
export function validateConfirmPassword(password: string, confirmPassword: string): ValidationResult {
  if (!confirmPassword) {
    return { isValid: false, error: "Please confirm your password." };
  }
  if (password !== confirmPassword) {
    return { isValid: false, error: "Passwords do not match." };
  }
  return { isValid: true };
}

/**
 * Validates user full name (minimum 2 chars, letters and common name separators only).
 */
export function validateName(name: string): ValidationResult {
  const clean = name.trim();
  if (!clean) {
    return { isValid: false, error: "Full name is required." };
  }
  if (clean.length < 2) {
    return { isValid: false, error: "Full name must be at least 2 characters long." };
  }
  if (clean.length > 100) {
    return { isValid: false, error: "Full name cannot exceed 100 characters." };
  }
  // Allow letters (including international accents), spaces, hyphens, and apostrophes
  if (!/^[\p{L}\s'-]+$/u.test(clean)) {
    return { isValid: false, error: "Full name may only contain letters, spaces, hyphens, and apostrophes." };
  }
  return { isValid: true };
}

/**
 * Validates article or content text for verification analysis.
 * Enforces a 50-character minimum for meaningful RoBERTa transformer inference.
 */
export const MIN_ARTICLE_CHARS = 50;
export const MAX_ARTICLE_CHARS = 50_000;

export function validateArticleText(text: string): TextValidationResult {
  const clean = text.trim();
  const charCount = clean.length;
  const words = clean.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const charsRemaining = Math.max(0, MIN_ARTICLE_CHARS - charCount);
  const isReady = charCount >= MIN_ARTICLE_CHARS && charCount <= MAX_ARTICLE_CHARS;

  if (charCount === 0) {
    return {
      isValid: false,
      error: "Please enter or paste content to verify.",
      charCount: 0,
      wordCount: 0,
      minCharsRequired: MIN_ARTICLE_CHARS,
      charsRemaining: MIN_ARTICLE_CHARS,
      isReadyForInference: false,
    };
  }

  if (charCount < MIN_ARTICLE_CHARS) {
    return {
      isValid: false,
      error: `Content too short for NLP inference (${charCount}/${MIN_ARTICLE_CHARS} chars). Enter at least ${charsRemaining} more characters.`,
      charCount,
      wordCount,
      minCharsRequired: MIN_ARTICLE_CHARS,
      charsRemaining,
      isReadyForInference: false,
    };
  }

  if (charCount > MAX_ARTICLE_CHARS) {
    return {
      isValid: false,
      error: `Content exceeds maximum limit of ${MAX_ARTICLE_CHARS.toLocaleString()} characters.`,
      charCount,
      wordCount,
      minCharsRequired: MIN_ARTICLE_CHARS,
      charsRemaining: 0,
      isReadyForInference: false,
    };
  }

  return {
    isValid: true,
    charCount,
    wordCount,
    minCharsRequired: MIN_ARTICLE_CHARS,
    charsRemaining: 0,
    isReadyForInference: true,
  };
}

/**
 * Validates URLs submitted for web scraping and verification.
 * Enforces http/https protocols and valid domain structure while blocking loopback addresses.
 */
export function validateUrl(rawUrl: string): UrlValidationResult {
  const clean = rawUrl.trim();

  if (!clean) {
    return { isValid: false, error: "URL is required." };
  }

  // Must explicitly state protocol
  if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
    return {
      isValid: false,
      error: "URL must include the protocol (e.g. 'https://example.com/article').",
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(clean);
  } catch {
    return { isValid: false, error: "Malformed URL syntax. Please enter a valid web address." };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { isValid: false, error: "Only HTTP and HTTPS web protocols are supported." };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block localhost and loopback IP addresses
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    return { isValid: false, error: "Localhost and internal network addresses cannot be analyzed." };
  }

  // Hostname must contain at least one dot
  if (!hostname.includes(".")) {
    return { isValid: false, error: "URL domain must contain a valid top-level domain (e.g. .com, .org)." };
  }

  const domainSegments = hostname.split(".");
  const primaryDomain = domainSegments[0];
  const tld = domainSegments[domainSegments.length - 1];

  if (primaryDomain.length < 2) {
    return { isValid: false, error: "URL domain name is too short to be a valid public source." };
  }

  if (!/^[a-z]{2,24}$/.test(tld)) {
    return { isValid: false, error: "URL top-level domain is invalid." };
  }

  return {
    isValid: true,
    hostname,
    protocol: parsed.protocol,
  };
}
