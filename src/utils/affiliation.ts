/**
 * Dynamic User Affiliation & Role Resolver
 * ─────────────────────────────────────────
 * Automatically deduces institution, role, account tier, and student/corporate ID
 * from the user's email address domain, supporting custom overrides.
 */

export interface AffiliationInfo {
  institution: string;
  role: string;
  studentId: string | null;
  accountType: "academic" | "enterprise" | "base";
  tierLabel: string;
  badgeLabel: string;
  badgeColor: string;
}

const FREEMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "ymail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "proton.me",
  "protonmail.com",
  "zoho.com",
  "mail.com",
  "gmx.com",
  "aol.com",
  "fastmail.com",
  "yandex.com",
]);

const KNOWN_ACADEMIC: Record<string, { institution: string; role: string; studentId?: string }> = {
  "richfield.ac.za": {
    institution: "Richfield Faculty of ICT",
    role: "BSc Information Technology Student",
    studentId: "402100810",
  },
  "student.richfield.ac.za": {
    institution: "Richfield Faculty of ICT",
    role: "BSc Information Technology Student",
    studentId: "402100810",
  },
  "uct.ac.za": {
    institution: "University of Cape Town (UCT)",
    role: "Academic Scholar / Researcher",
  },
  "wits.ac.za": {
    institution: "University of the Witwatersrand",
    role: "Academic Scholar / Researcher",
  },
  "up.ac.za": {
    institution: "University of Pretoria",
    role: "Academic Scholar / Researcher",
  },
  "sun.ac.za": {
    institution: "Stellenbosch University",
    role: "Academic Scholar / Researcher",
  },
  "uj.ac.za": {
    institution: "University of Johannesburg",
    role: "Academic Scholar / Researcher",
  },
  "unisa.ac.za": {
    institution: "University of South Africa (UNISA)",
    role: "Academic Scholar / Researcher",
  },
  "harvard.edu": {
    institution: "Harvard University",
    role: "Academic Scholar / Researcher",
  },
  "mit.edu": {
    institution: "MIT (Massachusetts Institute of Technology)",
    role: "Academic Scholar / Researcher",
  },
  "stanford.edu": {
    institution: "Stanford University",
    role: "Academic Scholar / Researcher",
  },
  "ox.ac.uk": {
    institution: "University of Oxford",
    role: "Academic Scholar / Researcher",
  },
  "cam.ac.uk": {
    institution: "University of Cambridge",
    role: "Academic Scholar / Researcher",
  },
};

const KNOWN_CORPORATE: Record<string, { institution: string; role: string }> = {
  "google.com": { institution: "Google LLC", role: "Enterprise Member" },
  "microsoft.com": { institution: "Microsoft Corporation", role: "Enterprise Member" },
  "apple.com": { institution: "Apple Inc.", role: "Enterprise Member" },
  "amazon.com": { institution: "Amazon", role: "Enterprise Member" },
  "meta.com": { institution: "Meta Platforms", role: "Enterprise Member" },
  "reuters.com": { institution: "Reuters Newsroom", role: "Verified Journalist" },
  "apnews.com": { institution: "Associated Press", role: "Verified Journalist" },
  "ap.org": { institution: "Associated Press", role: "Verified Journalist" },
  "bloomberg.com": { institution: "Bloomberg News", role: "Financial Analyst / Journalist" },
  "rand.org": { institution: "RAND Corporation", role: "Policy Analyst / Researcher" },
  "bbc.co.uk": { institution: "BBC Media", role: "Media Analyst / Journalist" },
  "bbc.com": { institution: "BBC Media", role: "Media Analyst / Journalist" },
  "dailymaverick.co.za": { institution: "Daily Maverick", role: "Investigative Journalist" },
  "news24.com": { institution: "News24 Media", role: "Journalist / Newsroom" },
};

export function resolveAffiliation(
  email?: string | null,
  overrides?: {
    institution?: string | null;
    role?: string | null;
    student_id?: string | null;
    account_type?: string | null;
  }
): AffiliationInfo {
  const cleanEmail = (email || "").toLowerCase().trim();
  const [prefix = "", domain = ""] = cleanEmail.split("@");

  // If manual overrides are stored, prioritize them
  if (overrides?.institution || overrides?.role || overrides?.student_id) {
    const accountType = (overrides?.account_type as any) || (domain && !FREEMAIL_DOMAINS.has(domain) ? "enterprise" : "base");
    return {
      institution: overrides.institution || "Independent / General Public",
      role: overrides.role || "Base User",
      studentId: overrides.student_id || null,
      accountType: accountType,
      tierLabel: accountType === "academic" ? "Academic Research Tier" : accountType === "enterprise" ? "Enterprise Corporate Tier" : "Base User Tier",
      badgeLabel: accountType === "academic" ? "Academic Scholar" : accountType === "enterprise" ? "Enterprise Verified" : "Base User",
      badgeColor: accountType === "academic" ? "bg-indigo-50 text-indigo-700 border-indigo-200" : accountType === "enterprise" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-blue-50 text-blue-700 border-blue-200",
    };
  }

  // 1. Personal / Freemail Domains (e.g. mtmazhambe@gmail.com)
  if (!domain || FREEMAIL_DOMAINS.has(domain)) {
    return {
      institution: "Independent / General Public",
      role: "Base User",
      studentId: null,
      accountType: "base",
      tierLabel: "Base User (Standard Access)",
      badgeLabel: "Base User",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    };
  }

  // 2. Known Academic Institution
  for (const [key, val] of Object.entries(KNOWN_ACADEMIC)) {
    if (domain === key || domain.endsWith("." + key)) {
      const extractedDigits = prefix.match(/\d{6,12}/);
      const studentId = overrides?.student_id || extractedDigits?.[0] || val.studentId || null;
      return {
        institution: val.institution,
        role: val.role,
        studentId: studentId,
        accountType: "academic",
        tierLabel: "Academic Scholar Tier",
        badgeLabel: "Academic Scholar",
        badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
      };
    }
  }

  // 3. Generic Academic TLD (.edu, .ac.za, .ac.uk, .edu.za, etc.)
  const isAcademicTld = [".edu", ".ac.za", ".edu.za", ".ac.uk", ".edu.au", ".ac.in", ".ac.nz"].some((tld) =>
    domain.endsWith(tld)
  );
  if (isAcademicTld) {
    const parts = domain.split(".");
    const mainPart =
      parts.length >= 3 && ["za", "uk", "au", "in", "nz"].includes(parts[parts.length - 1])
        ? parts[parts.length - 3]
        : parts[parts.length - 2];
    const institutionName = mainPart.charAt(0).toUpperCase() + mainPart.slice(1) + " Academic Institution";
    const extractedDigits = prefix.match(/\d{6,12}/);

    return {
      institution: institutionName,
      role: "Academic Researcher / Student",
      studentId: overrides?.student_id || extractedDigits?.[0] || "Verified Academic",
      accountType: "academic",
      tierLabel: "Academic Scholar Tier",
      badgeLabel: "Academic Scholar",
      badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
    };
  }

  // 4. Known Corporate / Newsroom
  for (const [key, val] of Object.entries(KNOWN_CORPORATE)) {
    if (domain === key || domain.endsWith("." + key)) {
      return {
        institution: val.institution,
        role: val.role,
        studentId: overrides?.student_id || null,
        accountType: "enterprise",
        tierLabel: "Enterprise Professional Tier",
        badgeLabel: "Enterprise Member",
        badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    }
  }

  // 5. Generic Corporate / Company Domain
  const parts = domain.split(".");
  const basePart =
    parts.length >= 3 &&
    ["za", "uk", "au"].includes(parts[parts.length - 1]) &&
    ["co", "com", "org", "net"].includes(parts[parts.length - 2])
      ? parts[parts.length - 3]
      : parts[parts.length - 2];

  const formattedName = basePart
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return {
    institution: formattedName,
    role: "Corporate Member",
    studentId: overrides?.student_id || null,
    accountType: "enterprise",
    tierLabel: "Corporate / Institutional Member",
    badgeLabel: "Verified Organization",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
}
