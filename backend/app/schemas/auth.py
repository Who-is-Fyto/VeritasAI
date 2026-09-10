"""
Authentication Schemas
"""
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
import re


class UserRegister(BaseModel):
    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=6, max_length=100)
    name: str = Field(..., min_length=2, max_length=100)
    institution: str | None = None
    role: str | None = None
    student_id: str | None = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v_clean = v.strip().lower()
        if not re.match(r"^[^@]+@[^@]+\.[^@]+$", v_clean):
            raise ValueError("Invalid email format")
        return v_clean


class UserProfileUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=100)
    institution: str | None = Field(None, max_length=150)
    role: str | None = Field(None, max_length=100)
    student_id: str | None = Field(None, max_length=50)


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

