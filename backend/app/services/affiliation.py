"""
Dynamic User Affiliation & Role Resolver (Backend)
───────────────────────────────────────────────────
Automatically deduces institution, role, account tier, and student/corporate ID
from the user's email address domain, supporting custom overrides.
"""
import re

FREEMAIL_DOMAINS = {
    "gmail.com", "googlemail.com", "yahoo.com", "ymail.com", "outlook.com",
    "hotmail.com", "live.com", "msn.com", "icloud.com", "me.com",
    "proton.me", "protonmail.com", "zoho.com", "mail.com", "gmx.com",
    "aol.com", "fastmail.com", "yandex.com"
}

KNOWN_ACADEMIC = {
    "richfield.ac.za": ("Richfield Faculty of ICT", "BSc Information Technology Student", "402100810"),
    "student.richfield.ac.za": ("Richfield Faculty of ICT", "BSc Information Technology Student", "402100810"),
    "uct.ac.za": ("University of Cape Town (UCT)", "Academic Scholar / Researcher", None),
    "wits.ac.za": ("University of the Witwatersrand", "Academic Scholar / Researcher", None),
    "up.ac.za": ("University of Pretoria", "Academic Scholar / Researcher", None),
    "sun.ac.za": ("Stellenbosch University", "Academic Scholar / Researcher", None),
    "uj.ac.za": ("University of Johannesburg", "Academic Scholar / Researcher", None),
    "unisa.ac.za": ("University of South Africa (UNISA)", "Academic Scholar / Researcher", None),
    "harvard.edu": ("Harvard University", "Academic Scholar / Researcher", None),
    "mit.edu": ("MIT (Massachusetts Institute of Technology)", "Academic Scholar / Researcher", None),
    "stanford.edu": ("Stanford University", "Academic Scholar / Researcher", None),
    "ox.ac.uk": ("University of Oxford", "Academic Scholar / Researcher", None),
    "cam.ac.uk": ("University of Cambridge", "Academic Scholar / Researcher", None),
}

KNOWN_CORPORATE = {
    "google.com": ("Google LLC", "Enterprise Analyst"),
    "microsoft.com": ("Microsoft Corporation", "Enterprise Member"),
    "apple.com": ("Apple Inc.", "Enterprise Member"),
    "amazon.com": ("Amazon", "Enterprise Member"),
    "meta.com": ("Meta Platforms", "Enterprise Member"),
    "reuters.com": ("Reuters Newsroom", "Verified Journalist"),
    "apnews.com": ("Associated Press", "Verified Journalist"),
    "ap.org": ("Associated Press", "Verified Journalist"),
    "bloomberg.com": ("Bloomberg News", "Financial Analyst / Journalist"),
    "rand.org": ("RAND Corporation", "Policy Analyst / Researcher"),
    "bbc.co.uk": ("BBC Media", "Media Analyst / Journalist"),
    "bbc.com": ("BBC Media", "Media Analyst / Journalist"),
    "dailymaverick.co.za": ("Daily Maverick", "Investigative Journalist"),
    "news24.com": ("News24 Media", "Journalist / Newsroom"),
}


def resolve_user_affiliation(email: str, user_doc: dict | None = None) -> dict:
    """
    Resolves institution, role, student_id, and account_type from email domain or stored user_doc.
    """
    user_doc = user_doc or {}

    # If explicitly saved in database, respect those values
    saved_inst = user_doc.get("institution")
    saved_role = user_doc.get("role")
    saved_stud_id = user_doc.get("student_id")
    saved_acc_type = user_doc.get("account_type")

    clean_email = (email or "").lower().strip()
    if "@" not in clean_email:
        return {
            "institution": saved_inst or "Independent / General Public",
            "role": saved_role or "Base User",
            "student_id": saved_stud_id or None,
            "account_type": saved_acc_type or "base"
        }

    prefix, domain = clean_email.split("@", 1)

    # If manual overrides exist in user_doc, return them
    if saved_inst and saved_role:
        return {
            "institution": saved_inst,
            "role": saved_role,
            "student_id": saved_stud_id,
            "account_type": saved_acc_type or ("base" if domain in FREEMAIL_DOMAINS else "enterprise")
        }

    # 1. Personal / Freemail
    if domain in FREEMAIL_DOMAINS:
        return {
            "institution": saved_inst or "Independent / General Public",
            "role": saved_role or "Base User",
            "student_id": saved_stud_id or None,
            "account_type": "base"
        }

    # 2. Known Academic Institution
    for key, val in KNOWN_ACADEMIC.items():
        if domain == key or domain.endswith("." + key):
            digits = re.findall(r"\d{6,12}", prefix)
            default_id = val[2]
            return {
                "institution": saved_inst or val[0],
                "role": saved_role or val[1],
                "student_id": saved_stud_id or (digits[0] if digits else default_id),
                "account_type": "academic"
            }

    # 3. Academic TLDs
    academic_suffixes = [".edu", ".ac.za", ".edu.za", ".ac.uk", ".edu.au", ".ac.in", ".ac.nz"]
    if any(domain.endswith(sfx) for sfx in academic_suffixes):
        parts = domain.split(".")
        main_part = parts[-3] if len(parts) >= 3 and parts[-1] in ["za", "uk", "au", "in", "nz"] else parts[-2]
        inst_name = f"{main_part.capitalize()} Academic Institution"
        digits = re.findall(r"\d{6,12}", prefix)
        return {
            "institution": saved_inst or inst_name,
            "role": saved_role or "Academic Scholar / Researcher",
            "student_id": saved_stud_id or (digits[0] if digits else "Verified Academic"),
            "account_type": "academic"
        }

    # 4. Known Corporate
    for key, val in KNOWN_CORPORATE.items():
        if domain == key or domain.endswith("." + key):
            return {
                "institution": saved_inst or val[0],
                "role": saved_role or val[1],
                "student_id": saved_stud_id or None,
                "account_type": "enterprise"
            }

    # 5. Generic Corporate
    parts = domain.split(".")
    base_part = parts[-3] if len(parts) >= 3 and parts[-1] in ["za", "uk", "au"] and parts[-2] in ["co", "com", "org", "net"] else parts[-2]
    clean_name = " ".join(word.capitalize() for word in re.split(r"[-_]", base_part))
    return {
        "institution": saved_inst or clean_name,
        "role": saved_role or "Corporate Member",
        "student_id": saved_stud_id or None,
        "account_type": "enterprise"
    }
