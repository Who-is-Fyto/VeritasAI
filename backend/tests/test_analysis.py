import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from main import app
from app.db.mongodb import connect_db, close_db, get_db

@pytest_asyncio.fixture(autouse=True)
async def setup_mongodb():
    await connect_db()
    db = get_db()
    await db["users"].delete_many({})
    await db["api_keys"].delete_many({})
    yield
    await close_db()

@pytest.mark.asyncio
async def test_analyse_text():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Register user to get authorization token
        reg_res = await client.post("/api/v1/auth/register", json={
            "email": "analysetest@student.richfield.ac.za",
            "password": "securepassword123",
            "name": "Analyse Tester"
        })
        assert reg_res.status_code == 201
        token = reg_res.json()["access_token"]

        headers = {"Authorization": f"Bearer {token}"}
        response = await client.post("/api/v1/analyse", json={
            "content": "According to Reuters, global temperatures rose by 1.2 degrees in 2024.",
            "type": "text"
        }, headers=headers)

    assert response.status_code == 200
    data = response.json()
    assert "overall_score" in data
    assert 0 <= data["overall_score"] <= 100
    assert data["status"] == "complete"
    assert len(data["xai_annotations"]) > 0

@pytest.mark.asyncio
async def test_health():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["db_connected"] is True


@pytest.mark.asyncio
async def test_guest_analyse_text():
    """Verify that guests can submit content without Bearer token or API key."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/v1/analyse", json={
            "content": "According to official reports, the reserve bank kept interest rates steady.",
            "type": "text"
        })
    assert response.status_code == 200
    data = response.json()
    assert "overall_score" in data
    assert data["status"] == "complete"


@pytest.mark.asyncio
async def test_analyse_caching():
    """Verify that repeated analyses within 2 hours hit the MongoDB cache."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        payload = {
            "content": "Researchers at Oxford University published findings on renewable grid storage.",
            "type": "text"
        }
        res1 = await client.post("/api/v1/analyse", json=payload)
        assert res1.status_code == 200
        data1 = res1.json()

        # Immediate repeat submission
        res2 = await client.post("/api/v1/analyse", json=payload)
        assert res2.status_code == 200
        data2 = res2.json()

        assert data1["overall_score"] == data2["overall_score"]
        assert data1["scores"]["linguistic_score"] == data2["scores"]["linguistic_score"]


@pytest.mark.asyncio
async def test_source_authority_and_anti_spoofing():
    """Verify source scoring: URL registry lookups and anti-spoofing in text."""
    from app.services.source import source_service

    # 1. URL lookup on registered South African publication
    res_sa = await source_service.analyse("https://www.dailymaverick.co.za/article/2026", "url")
    assert res_sa.score >= 90.0
    assert res_sa.sources[0].name == "Daily Maverick"

    # 2. URL lookup on registered questionable source
    res_q = await source_service.analyse("https://www.infowars.com/post/123", "url")
    assert res_q.score <= 20.0
    assert res_q.sources[0].status == "questionable"

    # 3. Anti-spoofing: Attributed Reuters vs incidental mention
    res_attr = await source_service.analyse("According to Reuters, the merger was approved.", "text")
    assert res_attr.score >= 94.0

    res_incidental = await source_service.analyse("Protesters gathered outside the Reuters headquarters.", "text")
    assert res_incidental.score <= 70.0  # Damped due to lack of attribution framing


@pytest.mark.asyncio
async def test_corroboration_satire_and_absurdity():
    """Verify that satirical / absurd claims are identified and marked as false."""
    from app.services.corroboration import corroboration_service

    res = await corroboration_service.analyse("Astronauts reported that the moon is made of fondue and cheese.")
    assert res.score <= 25.0
    assert len(res.claims) > 0
    assert res.claims[0].status == "false"
    assert res.claims[0].confidence >= 90.0


@pytest.mark.asyncio
async def test_corroboration_safeguard_predicate_alignment():
    """Verify that the semantic overlap & predicate alignment safeguard prevents entity contamination."""
    from app.services.corroboration import corroboration_service

    # 1. Matching claim with action predicate aligned
    is_rel_hoax = corroboration_service._is_claim_relevant(
        "Pope Francis was arrested during an unexpected Vatican blackout.",
        "Pope Francis was arrested at the Vatican. Fact check: Did police arrest Pope Francis during blackout?"
    )
    assert is_rel_hoax is True

    # 2. Benign claim sharing ONLY the entity name (Pope Francis), but differing predicates
    is_rel_benign = corroboration_service._is_claim_relevant(
        "Pope Francis delivered a peaceful Sunday sermon in Rome.",
        "Pope Francis was arrested at the Vatican. Fact check: Did police arrest Pope Francis during blackout?"
    )
    assert is_rel_benign is False

    # 3. Matching non-entity content
    is_rel_climate = corroboration_service._is_claim_relevant(
        "According to Reuters, global temperatures rose by 1.2 degrees in 2024.",
        "Global average temperatures rose 1.2C above pre-industrial levels in 2024, climate report shows"
    )
    assert is_rel_climate is True


@pytest.mark.asyncio
async def test_corroboration_live_fact_check_debunk_and_safeguard():
    """Verify live fact checking debunks viral hoaxes without falsely penalising benign news."""
    from app.services.corroboration import corroboration_service

    # Debunking a viral hoax via live Google Fact Check / Snopes
    res_hoax = await corroboration_service.analyse("Pope Francis was arrested during an unexpected Vatican blackout.")
    assert res_hoax.score <= 20.0
    assert len(res_hoax.claims) > 0
    assert res_hoax.claims[0].status == "false"
    assert res_hoax.claims[0].confidence >= 90.0

    # Benign claim with the same high-profile entity must NOT be falsely debunked
    res_benign = await corroboration_service.analyse("Pope Francis delivered a peaceful Sunday sermon in Rome.")
    assert len(res_benign.claims) > 0
    assert res_benign.claims[0].status != "false"


@pytest.mark.asyncio
async def test_corroboration_subject_actor_anchoring_safeguard():
    """Verify that claims about one entity (the Pope) cannot be corroborated by articles about an unrelated third party."""
    from app.services.corroboration import corroboration_service

    claim = "The pope has been diagnosed with a rare cancer and could have as little as one year left to live"
    unrelated_candidate = (
        "BBC presenter Maryam Moshiri determined to 'get on with it' despite feeling like her 'battery has been taken out' "
        "amid battle with incurable blood cancer. Moshiri was diagnosed with polycythaemia vera, a rare cancer."
    )

    # 1. Relevance check MUST reject the third-party article
    is_rel = corroboration_service._is_claim_relevant(claim, unrelated_candidate)
    assert is_rel is False

    # 2. Live verification must NOT falsely verify the Pope cancer rumor
    res = await corroboration_service.analyse(claim)
    assert len(res.claims) > 0
    assert res.claims[0].status != "verified"




