"""
Unit and integration tests for Deep AI Text Detection & Forensic Stylometrics Engine (Phase 15).
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from main import app
from app.db.mongodb import connect_db, close_db, get_db
from app.services.linguistic import linguistic_service


@pytest_asyncio.fixture(autouse=True)
async def setup_mongodb():
    await connect_db()
    yield
    await close_db()


@pytest.mark.asyncio
async def test_forensic_stylometrics_human_prose():
    """
    Test that organic human writing with high burstiness, irregular cadence,
    and no formulaic LLM transitional clichés scores low in AI probability.
    """
    human_text = (
        "We set off at dawn. The engine sputtered twice, cough-wheezing into the cold morning air, "
        "before finally catching hold with a guttural roar that rattled the rusted floorboards beneath our boots. "
        "Miles went by in total silence. Nobody spoke; nobody dared break the spell. "
        "By noon, thunderclouds were gathering above the ridge line like bruised knuckles, "
        "and that was when we realized the spare tire was missing."
    )

    ai_prob, forensics = linguistic_service.calculate_forensic_stylometrics(human_text)

    assert ai_prob < 35.0
    assert forensics.burstiness_classification in ["high_burstiness", "moderate"]
    assert forensics.synthetic_marker_count == 0
    assert len(forensics.sentence_analyses) >= 4
    # Majority of sentences should be classified as human
    human_sentences = [s for s in forensics.sentence_analyses if s.classification == "human"]
    assert len(human_sentences) >= len(forensics.sentence_analyses) - 1


@pytest.mark.asyncio
async def test_forensic_stylometrics_synthetic_prose():
    """
    Test that formulaic LLM generated text with classic structural signposts,
    hedging, uniform sentence lengths, and buzzwords receives a high AI probability.
    """
    synthetic_text = (
        "In this article, we delve into the rich tapestry of modern artificial intelligence. "
        "It is important to remember that navigating the complexities of digital transformation requires a multifaceted approach. "
        "Furthermore, it is a testament to human ingenuity that we stand at the forefront of this ever-evolving landscape. "
        "Moreover, the synergistic effect of algorithmic automation serves as a reminder of our collective progress. "
        "In conclusion, the journey ahead will unlock the true potential of our global community."
    )

    ai_prob, forensics = linguistic_service.calculate_forensic_stylometrics(synthetic_text)

    assert ai_prob >= 65.0
    assert forensics.synthetic_marker_count >= 4
    assert len(forensics.synthetic_markers_found) >= 3
    # Verify that synthetic markers like 'delve into', 'tapestry of', 'testament to' were found
    assert any("delve" in m for m in forensics.synthetic_markers_found)
    assert any("tapestry" in m for m in forensics.synthetic_markers_found)
    # Verify sentence analyses contain synthetic classifications
    synthetic_sentences = [s for s in forensics.sentence_analyses if s.classification == "synthetic"]
    assert len(synthetic_sentences) >= 2


@pytest.mark.asyncio
async def test_forensic_stylometrics_api_payload():
    """
    Verify that POST /api/v1/analyse includes the complete ai_forensics object
    with sentence heatmap records and information entropy metrics.
    """
    payload = {
        "content": "In today's fast-paced world, it is worth noting that technology is a game-changer for society.",
        "type": "text"
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/v1/analyse", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert "ai_probability" in data
    assert "ai_forensics" in data
    forensics = data["ai_forensics"]
    assert forensics is not None
    assert "burstiness_score" in forensics
    assert "perplexity_estimate" in forensics
    assert "lexical_diversity" in forensics
    assert "synthetic_marker_count" in forensics
    assert "sentence_analyses" in forensics
    assert len(forensics["sentence_analyses"]) > 0
