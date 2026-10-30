"""
Central settings — loaded from environment variables / .env file.
All other modules import `settings` from here; never read os.environ directly.
"""
from functools import lru_cache
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


    # App
    app_env: str = "development"
    app_version: str = "0.1.0"
    debug: bool = True

    # MongoDB
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "veritasai"

    # Models
    model_path: str = "roberta-base"   # sequence classification / linguistic credibility checkpoint
    ai_detector_model_path: str = "Hello-SimpleAI/chatgpt-detector-roberta"  # fine-tuned AI detection checkpoint
    enable_neural_ai_detector: bool = False  # opt-in neural detector; defaults to zero-storage forensic stylometrics
    device: str = "cpu"

    # JWT Authentication
    jwt_secret: str = "veritas_super_secret_key_123_change_me_in_prod!"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440


    # External APIs
    news_api_key: str = ""
    google_api_key: str = ""
    google_cse_id: str = ""

    # CORS
    cors_origins: str | list[str] = ["http://localhost:5173"]


    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [x.strip() for x in v.split(",") if x.strip()]
        return v

    # Rate limiting
    rate_limit_per_minute: int = 10


    # Scoring weights — must sum to 1.0
    weight_linguistic: float = 0.40
    weight_source: float = 0.35
    weight_corroboration: float = 0.25


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings singleton."""
    return Settings()


settings = get_settings()
