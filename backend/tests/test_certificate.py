"""
Unit tests for VeritasAI Credibility Audit Certificate Engine.
Tests certificate generation, cryptographic hashing, verdict classifications,
mathematical MCDA score preservation, and 404 responses.
"""
import pytest
from httpx import AsyncClient, ASGITransport
from main import app
from app.db.mongodb import get_db
from datetime import datetime, timezone


class MockCollection:
    def __init__(self, data=None):
        self.data = data or []

    async def find_one(self, query):
        for item in self.data:
            match = True
            for k, v in query.items():
                if k == "_id" and item.get("_id") != v:
                    match = False
                elif k != "_id" and not isinstance(v, dict) and item.get(k) != v:
                    match = False
            if match:
                return item
        return None


class MockDatabase:
    def __init__(self):
        self.collections = {
            "results": MockCollection([
                {
                    "_id": "res-cert-test-1234",
                    "status": "complete",
                    "input_type": "text",
                    "content": "According to Reuters, renewable energy investment grew by 15% globally in 2024.",
                    "content_hash": "a1b2c3d4e5f67890",
                    "overall_score": 88.5,
                    "ai_probability": 14.0,
                    "scores": {
                        "linguistic_score": 90.0,
                        "source_score": 92.0,
                        "corroboration_score": 82.0,
                        "weights": {"linguistic": 0.40, "source": 0.35, "corroboration": 0.25}
                    },
                    "sources": [
                        {"name": "Reuters", "credibility": 98.0, "status": "verified", "matches": 2},
                        {"name": "Associated Press", "credibility": 96.0, "status": "verified", "matches": 1}
                    ],
                    "claims": [
                        {"claim": "Renewable energy investment grew by 15%", "status": "verified", "confidence": 94.0, "sources": 2}
                    ],
                    "linguistic_flags": [
                        {"label": "Sentence structure variance", "rating": "Normal", "ok": True}
                    ],
                    "summary": "Content is highly credible and corroborated by authoritative news wires.",
                    "submitted_at": datetime.now(timezone.utc)
                },
                {
                    "_id": "res-cert-misinfo-5678",
                    "status": "complete",
                    "input_type": "url",
                    "content": "Secret miracle cure discovered by anonymous blogger.",
                    "content_hash": "f9e8d7c6b5a43210",
                    "overall_score": 24.0,
                    "ai_probability": 85.0,
                    "scores": {
                        "linguistic_score": 20.0,
                        "source_score": 15.0,
                        "corroboration_score": 40.0,
                        "weights": {"linguistic": 0.40, "source": 0.35, "corroboration": 0.25}
                    },
                    "sources": [
                        {"name": "Unknown Blog", "credibility": 15.0, "status": "questionable", "matches": 1}
                    ],
                    "claims": [
                        {"claim": "Secret miracle cure discovered", "status": "false", "confidence": 98.0, "sources": 0}
                    ],
                    "linguistic_flags": [
                        {"label": "Sensationalism score", "rating": "Extremely high", "ok": False}
                    ],
                    "summary": "Content is flagged as severe disinformation.",
                    "submitted_at": datetime.now(timezone.utc)
                }
            ])
        }

    def __getitem__(self, name):
        return self.collections[name]


@pytest.fixture(autouse=True)
def override_database():
    mock_db = MockDatabase()
    app.dependency_overrides[get_db] = lambda: mock_db
    yield
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_get_certificate_verified_credible():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/results/res-cert-test-1234/certificate")
    assert res.status_code == 200
    data = res.json()

    assert data["certificate_id"].startswith("CERT-")
    assert data["verification_id"] == "VER-EST-1234"
    assert data["verdict_label"] == "Verified Credible"
    assert data["overall_score"] == 88.5
    assert data["confidence_interval"] == 2.5
    assert data["scores"]["linguistic_score"] == 90.0
    assert data["scores"]["source_score"] == 92.0
    assert data["scores"]["corroboration_score"] == 82.0
    assert data["ai_probability"] == 14.0
    assert data["claims_verified"] == 1
    assert data["claims_total"] == 1
    assert "Reuters" in data["top_sources"]
    assert len(data["digital_signature"]) == 64
    assert "ISO/IEC 23894" in data["standard"]
    assert data["issuer"] == "VeritasAI Credibility & Forensic Attestation Authority"
    assert data["verification_url"] == "https://veritasai.org/results/res-cert-test-1234"


@pytest.mark.asyncio
async def test_get_certificate_flagged_misinformation():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/results/res-cert-misinfo-5678/certificate")
    assert res.status_code == 200
    data = res.json()

    assert data["verification_id"] == "VER-NFO-5678"
    assert data["verdict_label"] == "Flagged Disinformation"
    assert data["overall_score"] == 24.0
    assert data["ai_probability"] == 85.0
    assert data["claims_verified"] == 0
    assert data["claims_total"] == 1


@pytest.mark.asyncio
async def test_get_certificate_not_found():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/results/non-existent-result-id/certificate")
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()
