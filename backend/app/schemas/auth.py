"""
Authentication Schemas
Enforces strict RFC-compliant email validation, nonsense domain prevention (e.g. yd@g.com),
password complexity standards, and sanitized user profiles.
"""
from datetime import datetime
from pydantic import BaseModel, Field, field_validator, model_validator
import re

# Blocklist of known disposable, temporary, and test domains
DISPOSABLE_DOMAINS = {
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
}


def validate_strict_email(raw_email: str) -> str:
    """
    Validates email format strictly.
    Rejects addresses like 'yd@g.com', single-character domain labels,
    invalid TLDs, consecutive dots, and disposable domains.
    """
    clean = raw_email.strip().lower()

    if not clean:
        raise ValueError("Email address cannot be empty")

    if len(clean) < 6 or len(clean) > 254:
        raise ValueError("Email address must be between 6 and 254 characters")

    at_parts = clean.split("@")
    if len(at_parts) != 2:
        raise ValueError("Email must contain exactly one '@' separator")

    local_part, domain_part = at_parts

    # Validate local part
    if len(local_part) < 2:
        raise ValueError("Email username before '@' must be at least 2 characters")
    if len(local_part) > 64:
        raise ValueError("Email username cannot exceed 64 characters")
    if local_part.startswith(".") or local_part.endswith("."):
        raise ValueError("Email username cannot start or end with a period")
    if ".." in local_part:
        raise ValueError("Email username cannot contain consecutive periods")
    if not re.match(r"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$", local_part):
        raise ValueError("Email username contains invalid characters")

    # Validate domain part
    if "." not in domain_part:
        raise ValueError("Email domain must contain a valid dot-separated extension")
    if domain_part.startswith(".") or domain_part.endswith("."):
        raise ValueError("Email domain cannot start or end with a period")
    if ".." in domain_part:
        raise ValueError("Email domain cannot contain consecutive periods")

    segments = domain_part.split(".")
    tld = segments[-1]
    primary_domain = segments[0]

    # Specific prevention for nonsense domains like "g.com" (e.g. yd@g.com)
    if len(primary_domain) < 2:
        raise ValueError(
            f"Invalid domain '{domain_part}'. Domain labels must be at least 2 characters long"
        )

    for seg in segments:
        if not seg:
            raise ValueError("Email domain contains empty segment")
        if not re.match(r"^[a-z0-9-]+$", seg):
            raise ValueError(f"Domain segment '{seg}' contains invalid characters")
        if seg.startswith("-") or seg.endswith("-"):
            raise ValueError(f"Domain segment '{seg}' cannot start or end with a hyphen")

    # TLD validation: 2 to 24 alphabetical characters
    if not re.match(r"^[a-z]{2,24}$", tld):
        raise ValueError(f"Invalid top-level domain '.{tld}'")

    # Disposable domain rejection
    full_domain = ".".join(segments[-2:]) if len(segments) >= 2 else domain_part
    if domain_part in DISPOSABLE_DOMAINS or full_domain in DISPOSABLE_DOMAINS:
        raise ValueError(
            f"Domain '{domain_part}' is a disposable or untrusted email provider"
        )

    return clean


class UserRegister(BaseModel):
    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=8, max_length=100)
    name: str = Field(..., min_length=2, max_length=100)
    institution: str | None = None
    role: str | None = None
    student_id: str | None = None

    @field_validator("email")
    @classmethod
    def validate_email_field(cls, v: str) -> str:
        return validate_strict_email(v)

    @field_validator("password")
    @classmethod
    def validate_password_complexity(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[a-zA-Z]", v):
            raise ValueError("Password must contain at least one letter")
        if not re.search(r"[0-9!@#$%^&*()_+\-=\[\]{};':\",.<>/?\\|]", v):
            raise ValueError("Password must contain at least one number or special character")
        return v

    @field_validator("name")
    @classmethod
    def validate_name_field(cls, v: str) -> str:
        clean = v.strip()
        if len(clean) < 2:
            raise ValueError("Name must be at least 2 characters long")
        if not re.match(r"^[a-zA-Z\s'-]+$", clean):
            raise ValueError("Name may only contain letters, spaces, hyphens, and apostrophes")
        return clean


class UserProfileUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=100)
    institution: str | None = Field(None, max_length=150)
    role: str | None = Field(None, max_length=100)
    student_id: str | None = Field(None, max_length=50)

    @field_validator("name")
    @classmethod
    def validate_optional_name(cls, v: str | None) -> str | None:
        if v is None:
            return None
        clean = v.strip()
        if len(clean) < 2:
            raise ValueError("Name must be at least 2 characters long")
        if not re.match(r"^[a-zA-Z\s'-]+$", clean):
            raise ValueError("Name may only contain letters, spaces, hyphens, and apostrophes")
        return clean


class UserLogin(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def clean_email(cls, v: str) -> str:
        return v.strip().lower()


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    joined_at: datetime
    role: str = "Base User"
    institution: str = "Independent / General Public"
    student_id: str | None = None
    account_type: str = "base"


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class APIKeyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)


class APIKeyResponse(BaseModel):
    id: str
    name: str
    key_prefix: str
    created_at: datetime


class APIKeyGeneratedResponse(APIKeyResponse):
    api_key: str
