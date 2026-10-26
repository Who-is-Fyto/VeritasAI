"""
Unit tests for VeritasAI strict validation logic.
Tests nonsense email rejection (yd@g.com), password complexity, name checks, and payload schemas.
"""
import pytest
from pydantic import ValidationError
from app.schemas.auth import UserRegister, validate_strict_email
from app.schemas.request import AnalyseRequest, InputType


def test_validate_strict_email_valid():
    valid_emails = [
        "michael@student.richfield.ac.za",
        "journalist@reuters.com",
        "researcher.jane@oxford.ac.uk",
        "alex_dev+filter@company.org",
        "editor@bbc.co.uk",
    ]
    for email in valid_emails:
        cleaned = validate_strict_email(email)
        assert cleaned == email.lower()


def test_validate_strict_email_blocks_nonsense_and_disposable():
    # User's specific example and malformed patterns
    invalid_cases = [
        ("yd@g.com", "Domain labels must be at least 2 characters long"),
        ("user@b.com", "Domain labels must be at least 2 characters long"),
        ("a@domain.com", "at least 2 characters"),
        ("test@test.com", "disposable or untrusted"),
        ("user@mailinator.com", "disposable or untrusted"),
        ("plainaddress", "exactly one '@'"),
        ("@missingusername.com", "at least 2 characters"),
        ("userexample@", "valid dot-separated"),
        ("user@domain..com", "consecutive periods"),
        ("user..name@domain.com", "consecutive periods"),
        ("user@domain.c", "Invalid top-level domain"),
        ("user@domain.123", "Invalid top-level domain"),
    ]

    for email, error_substr in invalid_cases:
        with pytest.raises(ValueError) as exc_info:
            validate_strict_email(email)
        assert error_substr.lower() in str(exc_info.value).lower(), f"Failed for {email}: {exc_info.value}"


def test_user_register_schema_validation():
    # Successful registration payload
    valid_data = {
        "name": "Michael Mazhambe",
        "email": "michael@student.richfield.ac.za",
        "password": "SecurePassword123!",
    }
    user = UserRegister(**valid_data)
    assert user.name == "Michael Mazhambe"
    assert user.email == "michael@student.richfield.ac.za"

    # Blocked because password has no numbers/symbols
    with pytest.raises(ValidationError):
        UserRegister(
            name="Valid Name",
            email="valid@university.edu",
            password="OnlyLettersPassword",
        )

    # Blocked because password is under 8 chars
    with pytest.raises(ValidationError):
        UserRegister(
            name="Valid Name",
            email="valid@university.edu",
            password="short1",
        )

    # Blocked because name contains invalid characters
    with pytest.raises(ValidationError):
        UserRegister(
            name="12345678",
            email="valid@university.edu",
            password="SecurePassword123!",
        )


def test_analyse_request_text_validation():
    # Valid long text
    long_text = "This is a detailed and verifiable factual report investigating the economic impact of clean energy investments in emerging markets."
    req = AnalyseRequest(content=long_text, type=InputType.text)
    assert len(req.content) >= 50

    # Under 50 chars should raise ValidationError
    with pytest.raises(ValidationError):
        AnalyseRequest(content="Too short", type=InputType.text)


def test_analyse_request_url_validation():
    # Valid URL
    req = AnalyseRequest(content="https://www.reuters.com/world/article", type=InputType.url)
    assert req.type == InputType.url

    # Missing protocol
    with pytest.raises(ValidationError):
        AnalyseRequest(content="reuters.com/article", type=InputType.url)

    # Localhost / internal
    with pytest.raises(ValidationError):
        AnalyseRequest(content="http://localhost:8000/test", type=InputType.url)
