"""Direct Mode test suite for CritiqProof v1.0.0."""

import pytest


CONTRACT = "contracts/critiqproof.py"
DEFAULT_TITLE = "ProAudio Wireless Noise-Cancelling Headphones"
DEFAULT_DESC = (
    "Flagship over-ear wireless headphones with active noise cancellation, "
    "transparency mode, 40-hour battery life, and lossless audio support."
)
DEFAULT_CATEGORY = "Electronics"
DEFAULT_CRITERIA = (
    "Order number must match merchant prefix ACME-\n"
    "Purchase date must be within 2026\n"
    "Item name must explicitly mention ProAudio"
)
DEFAULT_PROOF_TYPE = "receipt"
VALID_PROOF_URL = "https://receipts.example.com/orders/acme-99281.html"
VALID_REVIEW_TEXT = (
    "The noise cancellation performance on these headphones is genuinely top tier. "
    "Battery life lasted four full workdays before needing a recharge."
)
VALID_PROOF_DESC = "Official digital store receipt with order ACME-99281 and payment summary."


def deploy_contract(direct_deploy):
    return direct_deploy(CONTRACT)


def create_sample_listing(
    direct_vm,
    contract,
    owner,
    title=DEFAULT_TITLE,
    description=DEFAULT_DESC,
    category=DEFAULT_CATEGORY,
    criteria=DEFAULT_CRITERIA,
    proof_type=DEFAULT_PROOF_TYPE,
    reward_pool=50_000,
    reward_per_review=5_000,
    min_stake=1_000,
):
    direct_vm.sender = owner
    direct_vm.value = reward_pool
    listing_id = contract.create_listing(
        title=title,
        description=description,
        category=category,
        verification_criteria=criteria,
        proof_type=proof_type,
        reward_per_review=reward_per_review,
        min_stake=min_stake,
    )
    direct_vm.value = 0
    return listing_id


# ==============================================================================
# 1. DEPLOYMENT & BASICS
# ==============================================================================


def test_deploy_and_version(direct_deploy):
    contract = deploy_contract(direct_deploy)
    assert contract.get_contract_version() == "1.1.0"
    assert contract.get_listing_count() == 0
    assert contract.get_verdict_count() == 0


# ==============================================================================
# 2. LISTING CREATION & LIFECYCLE
# ==============================================================================


def test_create_listing_happy_path(direct_vm, direct_deploy, direct_alice):
    contract = deploy_contract(direct_deploy)
    listing_id = create_sample_listing(
        direct_vm,
        contract,
        owner=direct_alice,
        reward_pool=30_000,
        reward_per_review=3_000,
        min_stake=1_500,
    )

    assert listing_id == 1
    assert contract.get_listing_count() == 1

    listing = contract.get_listing(listing_id)
    assert listing["id"] == 1
    assert listing["owner"].as_bytes == direct_alice
    assert listing["title"] == DEFAULT_TITLE
    assert listing["description"] == DEFAULT_DESC
    assert listing["category"] == DEFAULT_CATEGORY
    assert listing["proof_type"] == DEFAULT_PROOF_TYPE
    assert listing["reward_pool"] == 30_000
    assert listing["reward_per_review"] == 3_000
    assert listing["min_stake"] == 1_500
    assert listing["status"] == "active"
    assert listing["review_count"] == 0
    assert listing["verified_count"] == 0
    assert listing["trust_score"] == 0


def test_create_listing_validations(direct_vm, direct_deploy, direct_alice):
    contract = deploy_contract(direct_deploy)
    direct_vm.sender = direct_alice
    direct_vm.value = 10_000

    # Title too short
    with direct_vm.expect_revert("Listing title is too short"):
        contract.create_listing(
            title="ab",
            description=DEFAULT_DESC,
            category=DEFAULT_CATEGORY,
            verification_criteria=DEFAULT_CRITERIA,
            proof_type="receipt",
            reward_per_review=1_000,
            min_stake=500,
        )

    # Description too short
    with direct_vm.expect_revert("Listing description is too short"):
        contract.create_listing(
            title="Valid Title",
            description="Too short",
            category=DEFAULT_CATEGORY,
            verification_criteria=DEFAULT_CRITERIA,
            proof_type="receipt",
            reward_per_review=1_000,
            min_stake=500,
        )

    # Invalid proof type
    with direct_vm.expect_revert("Invalid proof type"):
        contract.create_listing(
            title="Valid Title",
            description=DEFAULT_DESC,
            category=DEFAULT_CATEGORY,
            verification_criteria=DEFAULT_CRITERIA,
            proof_type="unsupported_type",
            reward_per_review=1_000,
            min_stake=500,
        )

    # Zero min stake
    with direct_vm.expect_revert("Minimum stake must be greater than zero"):
        contract.create_listing(
            title="Valid Title",
            description=DEFAULT_DESC,
            category=DEFAULT_CATEGORY,
            verification_criteria=DEFAULT_CRITERIA,
            proof_type="receipt",
            reward_per_review=1_000,
            min_stake=0,
        )

    # Excessive criteria (more than 5)
    too_many_criteria = "Rule 1\nRule 2\nRule 3\nRule 4\nRule 5\nRule 6"
    with direct_vm.expect_revert("Maximum 5 custom criteria permitted"):
        contract.create_listing(
            title="Valid Title",
            description=DEFAULT_DESC,
            category=DEFAULT_CATEGORY,
            verification_criteria=too_many_criteria,
            proof_type="receipt",
            reward_per_review=1_000,
            min_stake=500,
        )


def test_fund_and_withdraw_reward_pool(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = deploy_contract(direct_deploy)
    listing_id = create_sample_listing(
        direct_vm, contract, owner=direct_alice, reward_pool=10_000
    )

    # Owner funds additional 15_000
    direct_vm.sender = direct_alice
    direct_vm.value = 15_000
    contract.fund_reward_pool(listing_id)
    direct_vm.value = 0

    listing = contract.get_listing(listing_id)
    assert listing["reward_pool"] == 25_000

    # Non-owner cannot withdraw
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("Only listing owner can withdraw from reward pool"):
        contract.withdraw_reward_pool(listing_id, 5_000)

    # Owner withdraws 5_000
    direct_vm.sender = direct_alice
    contract.withdraw_reward_pool(listing_id, 5_000)

    listing = contract.get_listing(listing_id)
    assert listing["reward_pool"] == 20_000

    # Owner cannot withdraw more than available
    with direct_vm.expect_revert("Insufficient reward pool balance"):
        contract.withdraw_reward_pool(listing_id, 25_000)


def test_archive_listing_refunds_owner(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = deploy_contract(direct_deploy)
    listing_id = create_sample_listing(
        direct_vm, contract, owner=direct_alice, reward_pool=18_000
    )

    # Non-owner cannot archive
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("Only listing owner can archive listing"):
        contract.archive_listing(listing_id)

    # Owner archives listing
    direct_vm.sender = direct_alice
    contract.archive_listing(listing_id)

    listing = contract.get_listing(listing_id)
    assert listing["status"] == "archived"
    assert listing["reward_pool"] == 0

    # Cannot archive already archived listing
    with direct_vm.expect_revert("Listing is already archived"):
        contract.archive_listing(listing_id)

    # Cannot fund archived listing
    direct_vm.value = 5_000
    with direct_vm.expect_revert("Cannot fund inactive or archived listing"):
        contract.fund_reward_pool(listing_id)
    direct_vm.value = 0

    # Reviewer cannot submit critique on archived listing
    direct_vm.sender = direct_bob
    direct_vm.value = 2_000
    with direct_vm.expect_revert("Listing is not active"):
        contract.submit_critique(
            listing_id=listing_id,
            rating=5,
            review_text=VALID_REVIEW_TEXT,
            proof_url=VALID_PROOF_URL,
            proof_description=VALID_PROOF_DESC,
        )
    direct_vm.value = 0


# ==============================================================================
# 3. CRITIQUE SUBMISSION & STAKING VALIDATIONS
# ==============================================================================


def test_submit_critique_happy_path(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = deploy_contract(direct_deploy)
    listing_id = create_sample_listing(
        direct_vm, contract, owner=direct_alice, min_stake=1_000
    )

    direct_vm.sender = direct_bob
    direct_vm.value = 2_500
    critique_id = contract.submit_critique(
        listing_id=listing_id,
        rating=5,
        review_text=VALID_REVIEW_TEXT,
        proof_url=VALID_PROOF_URL,
        proof_description=VALID_PROOF_DESC,
    )
    direct_vm.value = 0

    assert critique_id == 1
    assert contract.has_active_critique(listing_id, direct_bob) is True

    critique = contract.get_critique(listing_id, critique_id)
    assert critique["id"] == 1
    assert critique["listing_id"] == listing_id
    assert critique["reviewer"].as_bytes == direct_bob
    assert critique["rating"] == 5
    assert critique["review_text"] == VALID_REVIEW_TEXT
    assert critique["proof_url"] == VALID_PROOF_URL
    assert critique["proof_description"] == VALID_PROOF_DESC
    assert critique["stake_amount"] == 2_500
    assert critique["status"] == "submitted"
    assert critique["verdict_id"] == 0

    listing = contract.get_listing(listing_id)
    assert listing["review_count"] == 1


def test_submit_critique_validations(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = deploy_contract(direct_deploy)
    listing_id = create_sample_listing(
        direct_vm, contract, owner=direct_alice, min_stake=1_000
    )

    # Owner cannot review own listing
    direct_vm.sender = direct_alice
    direct_vm.value = 1_000
    with direct_vm.expect_revert("Listing owner cannot review own listing"):
        contract.submit_critique(
            listing_id=listing_id,
            rating=5,
            review_text=VALID_REVIEW_TEXT,
            proof_url=VALID_PROOF_URL,
            proof_description=VALID_PROOF_DESC,
        )

    # Reviewer stakes below min_stake
    direct_vm.sender = direct_bob
    direct_vm.value = 500
    with direct_vm.expect_revert("Stake amount is below required minimum stake"):
        contract.submit_critique(
            listing_id=listing_id,
            rating=5,
            review_text=VALID_REVIEW_TEXT,
            proof_url=VALID_PROOF_URL,
            proof_description=VALID_PROOF_DESC,
        )

    # Rating out of bounds (0 or 6)
    direct_vm.value = 1_000
    with direct_vm.expect_revert("Rating must be between 1 and 5"):
        contract.submit_critique(
            listing_id=listing_id,
            rating=0,
            review_text=VALID_REVIEW_TEXT,
            proof_url=VALID_PROOF_URL,
            proof_description=VALID_PROOF_DESC,
        )

    with direct_vm.expect_revert("Rating must be between 1 and 5"):
        contract.submit_critique(
            listing_id=listing_id,
            rating=6,
            review_text=VALID_REVIEW_TEXT,
            proof_url=VALID_PROOF_URL,
            proof_description=VALID_PROOF_DESC,
        )

    # Non-HTTPS URL
    with direct_vm.expect_revert("Proof URL must use public HTTPS"):
        contract.submit_critique(
            listing_id=listing_id,
            rating=4,
            review_text=VALID_REVIEW_TEXT,
            proof_url="http://insecure.example.com/receipt.html",
            proof_description=VALID_PROOF_DESC,
        )

    # URL with whitespace
    with direct_vm.expect_revert("Proof URL contains invalid whitespace"):
        contract.submit_critique(
            listing_id=listing_id,
            rating=4,
            review_text=VALID_REVIEW_TEXT,
            proof_url="https://receipts.example.com/spaced path.html",
            proof_description=VALID_PROOF_DESC,
        )

    # Review text too short
    with direct_vm.expect_revert("Critique review text is too short"):
        contract.submit_critique(
            listing_id=listing_id,
            rating=4,
            review_text="Too short",
            proof_url=VALID_PROOF_URL,
            proof_description=VALID_PROOF_DESC,
        )

    # Duplicate review lock
    contract.submit_critique(
        listing_id=listing_id,
        rating=5,
        review_text=VALID_REVIEW_TEXT,
        proof_url=VALID_PROOF_URL,
        proof_description=VALID_PROOF_DESC,
    )
    direct_vm.value = 1_000
    with direct_vm.expect_revert("Reviewer already has an unverified critique pending on this listing"):
        contract.submit_critique(
            listing_id=listing_id,
            rating=4,
            review_text=VALID_REVIEW_TEXT,
            proof_url=VALID_PROOF_URL,
            proof_description=VALID_PROOF_DESC,
        )
    direct_vm.value = 0


# ==============================================================================
# 4. EQUIVALENCE PRINCIPLE ORACLE & VERIFICATION
# ==============================================================================


def test_verify_critique_authentic_100_percent_pass(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = deploy_contract(direct_deploy)
    reward_pool = 40_000
    reward_per_review = 4_000
    min_stake = 2_000

    listing_id = create_sample_listing(
        direct_vm,
        contract,
        owner=direct_alice,
        reward_pool=reward_pool,
        reward_per_review=reward_per_review,
        min_stake=min_stake,
    )

    direct_vm.sender = direct_bob
    direct_vm.value = min_stake
    critique_id = contract.submit_critique(
        listing_id=listing_id,
        rating=5,
        review_text=VALID_REVIEW_TEXT,
        proof_url=VALID_PROOF_URL,
        proof_description=VALID_PROOF_DESC,
    )
    direct_vm.value = 0

    # Mock web response and LLM evaluation
    direct_vm.mock_web(
        r"receipts\.example\.com/.*",
        {
            "status": 200,
            "body": (
                "<html><body>"
                "<h1>Order ACME-99281 Confirmed</h1>"
                "<p>Item: ProAudio Wireless Noise-Cancelling Headphones</p>"
                "<p>Date: October 4, 2026</p>"
                "<p>Total: $299.00 PAID</p>"
                "</body></html>"
            ),
        },
    )

    # 5 total criteria: Authenticity + Quality + 3 custom criteria
    direct_vm.mock_llm(
        r"auditing a consumer critique and purchase evidence",
        (
            '{"criterion_results": ["PASS", "PASS", "PASS", "PASS", "PASS"], '
            '"reasoning": "Receipt confirmed matching ACME prefix, 2026 date, and ProAudio product."}'
        ),
    )

    result = contract.verify_critique(listing_id, critique_id)

    assert result["outcome"] == "VERIFIED"
    assert result["authenticity_result"] == "PASS"
    assert result["quality_result"] == "PASS"
    assert result["criteria_results"] == ["PASS", "PASS", "PASS", "PASS", "PASS"]
    assert result["verdict_id"] == 1

    # Check updated critique
    critique = contract.get_critique(listing_id, critique_id)
    assert critique["status"] == "verified"
    assert critique["verdict_id"] == 1
    assert critique["verified_at"] > 0

    # Check updated listing: reward disbursed, pool decremented, trust score 100%
    listing = contract.get_listing(listing_id)
    assert listing["reward_pool"] == reward_pool - reward_per_review
    assert listing["verified_count"] == 1
    assert listing["trust_score"] == 100
    assert listing["total_rating_points"] == 5

    # Check verdict stored
    verdict = contract.get_verdict(1)
    assert verdict["outcome"] == "VERIFIED"
    assert verdict["listing_id"] == listing_id
    assert verdict["critique_id"] == critique_id

    # Reviewer lock released
    assert contract.has_active_critique(listing_id, direct_bob) is False


def test_verify_critique_fraudulent_fails_and_slashes_stake(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = deploy_contract(direct_deploy)
    reward_pool = 20_000
    stake_amount = 3_000

    listing_id = create_sample_listing(
        direct_vm, contract, owner=direct_alice, reward_pool=reward_pool, min_stake=1_000
    )

    direct_vm.sender = direct_bob
    direct_vm.value = stake_amount
    critique_id = contract.submit_critique(
        listing_id=listing_id,
        rating=1,
        review_text=VALID_REVIEW_TEXT,
        proof_url=VALID_PROOF_URL,
        proof_description=VALID_PROOF_DESC,
    )
    direct_vm.value = 0

    direct_vm.mock_web(
        r"receipts\.example\.com/.*",
        {
            "status": 200,
            "body": "<html><body>Invoice #XYZ-001 for unrelated garden tools</body></html>",
        },
    )

    direct_vm.mock_llm(
        r"auditing a consumer critique and purchase evidence",
        (
            '{"criterion_results": ["FAIL", "PASS", "FAIL", "PASS", "FAIL"], '
            '"reasoning": "Receipt is for garden tools, completely unrelated to ProAudio headphones."}'
        ),
    )

    result = contract.verify_critique(listing_id, critique_id)

    assert result["outcome"] == "REJECTED"
    assert result["authenticity_result"] == "FAIL"

    critique = contract.get_critique(listing_id, critique_id)
    assert critique["status"] == "rejected"

    # Stake slashed into merchant reward pool!
    listing = contract.get_listing(listing_id)
    assert listing["reward_pool"] == reward_pool + stake_amount
    assert listing["verified_count"] == 0
    assert listing["trust_score"] == 0

    # Lock is freed after rejection
    assert contract.has_active_critique(listing_id, direct_bob) is False


def test_verify_critique_dead_link_http_404_rejected_and_slashed(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = deploy_contract(direct_deploy)
    reward_pool = 15_000
    stake_amount = 2_000

    listing_id = create_sample_listing(
        direct_vm, contract, owner=direct_alice, reward_pool=reward_pool, min_stake=1_000
    )

    direct_vm.sender = direct_bob
    direct_vm.value = stake_amount
    critique_id = contract.submit_critique(
        listing_id=listing_id,
        rating=4,
        review_text=VALID_REVIEW_TEXT,
        proof_url=VALID_PROOF_URL,
        proof_description=VALID_PROOF_DESC,
    )
    direct_vm.value = 0

    # 404 response triggers immediate precheck rejection
    direct_vm.mock_web(
        r"receipts\.example\.com/.*",
        {"status": 404, "body": "404 Not Found"},
    )

    result = contract.verify_critique(listing_id, critique_id)
    assert result["outcome"] == "REJECTED"
    assert "HTTP 404" in result["evidence_note"]

    # Stake slashed into pool
    listing = contract.get_listing(listing_id)
    assert listing["reward_pool"] == reward_pool + stake_amount


def test_verify_critique_temporary_server_error_undetermined_preserves_stake(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = deploy_contract(direct_deploy)
    reward_pool = 20_000
    stake_amount = 2_000

    listing_id = create_sample_listing(
        direct_vm, contract, owner=direct_alice, reward_pool=reward_pool, min_stake=1_000
    )

    direct_vm.sender = direct_bob
    direct_vm.value = stake_amount
    critique_id = contract.submit_critique(
        listing_id=listing_id,
        rating=4,
        review_text=VALID_REVIEW_TEXT,
        proof_url=VALID_PROOF_URL,
        proof_description=VALID_PROOF_DESC,
    )
    direct_vm.value = 0

    # HTTP 503 Service Unavailable triggers UNDETERMINED
    direct_vm.mock_web(
        r"receipts\.example\.com/.*",
        {"status": 503, "body": "503 Service Unavailable"},
    )

    result = contract.verify_critique(listing_id, critique_id)
    assert result["outcome"] == "UNDETERMINED"
    assert "HTTP 503" in result["evidence_note"]

    critique = contract.get_critique(listing_id, critique_id)
    assert critique["status"] == "undetermined"

    # Stake is NOT slashed into merchant pool
    listing = contract.get_listing(listing_id)
    assert listing["reward_pool"] == reward_pool


# ==============================================================================
# 5. PAGINATION & STATISTICAL AGGREGATION
# ==============================================================================


def test_critique_pagination_reverse_chronological(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = deploy_contract(direct_deploy)
    listing_id = create_sample_listing(
        direct_vm, contract, owner=direct_alice, reward_pool=50_000, min_stake=1_000
    )

    # Bob submits 3 critiques, verifying each in turn so the reviewer lock is freed
    for i in range(1, 4):
        direct_vm.sender = direct_bob
        direct_vm.value = 1_000
        cid = contract.submit_critique(
            listing_id=listing_id,
            rating=4,
            review_text=f"Review number {i} with ample detail and complete clarity.",
            proof_url=f"https://receipts.example.com/order-{i}.html",
            proof_description=f"Valid receipt for order {i}.",
        )
        direct_vm.value = 0

        direct_vm.mock_web(
            rf"receipts\.example\.com/order-{i}\.html",
            {"status": 200, "body": f"Order #{i} verified."},
        )
        direct_vm.mock_llm(
            r"auditing a consumer critique and purchase evidence",
            '{"criterion_results": ["PASS", "PASS", "PASS", "PASS", "PASS"], "reasoning": "Legit."}',
        )
        contract.verify_critique(listing_id, cid)

    # Page 1: offset=0, limit=2 -> should return IDs [3, 2] (newest first)
    page1 = contract.get_listing_critiques(listing_id, offset=0, limit=2)
    assert len(page1) == 2
    assert page1[0]["id"] == 3
    assert page1[1]["id"] == 2

    # Page 2: offset=2, limit=2 -> should return ID [1]
    page2 = contract.get_listing_critiques(listing_id, offset=2, limit=2)
    assert len(page2) == 1
    assert page2[0]["id"] == 1

    # Page 3: offset=5, limit=2 -> should return empty list
    page3 = contract.get_listing_critiques(listing_id, offset=5, limit=2)
    assert len(page3) == 0


def test_trust_score_calculation(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = deploy_contract(direct_deploy)
    listing_id = create_sample_listing(
        direct_vm, contract, owner=direct_alice, reward_pool=50_000, min_stake=1_000
    )

    # Review 1: Verified (PASS)
    direct_vm.clear_mocks()
    direct_vm.sender = direct_bob
    direct_vm.value = 1_000
    c1 = contract.submit_critique(
        listing_id=listing_id,
        rating=5,
        review_text="First genuine review with adequate length and character count.",
        proof_url="https://receipts.example.com/c1.html",
        proof_description="Proof 1 description",
    )
    direct_vm.value = 0
    direct_vm.mock_web(r"receipts\.example\.com/c1\.html", {"status": 200, "body": "Order 1"})
    direct_vm.mock_llm(
        r"auditing a consumer critique and purchase evidence",
        '{"criterion_results": ["PASS", "PASS", "PASS", "PASS", "PASS"], "reasoning": "Pass."}',
    )
    contract.verify_critique(listing_id, c1)

    # Review 2: Rejected (FAIL)
    direct_vm.clear_mocks()
    direct_vm.value = 1_000
    c2 = contract.submit_critique(
        listing_id=listing_id,
        rating=2,
        review_text="Second review that turns out to have completely fake evidence.",
        proof_url="https://receipts.example.com/c2.html",
        proof_description="Proof 2 description",
    )
    direct_vm.value = 0
    direct_vm.mock_web(r"receipts\.example\.com/c2\.html", {"status": 200, "body": "Fake"})
    direct_vm.mock_llm(
        r"auditing a consumer critique and purchase evidence",
        '{"criterion_results": ["FAIL", "PASS", "PASS", "PASS", "PASS"], "reasoning": "Fail."}',
    )
    contract.verify_critique(listing_id, c2)

    # Review 3: Verified (PASS)
    direct_vm.clear_mocks()
    direct_vm.value = 1_000
    c3 = contract.submit_critique(
        listing_id=listing_id,
        rating=4,
        review_text="Third genuine review with adequate length and character count.",
        proof_url="https://receipts.example.com/c3.html",
        proof_description="Proof 3 description",
    )
    direct_vm.value = 0
    direct_vm.mock_web(r"receipts\.example\.com/c3\.html", {"status": 200, "body": "Order 3"})
    direct_vm.mock_llm(
        r"auditing a consumer critique and purchase evidence",
        '{"criterion_results": ["PASS", "PASS", "PASS", "PASS", "PASS"], "reasoning": "Pass."}',
    )
    contract.verify_critique(listing_id, c3)

    listing = contract.get_listing(listing_id)
    assert listing["review_count"] == 3
    assert listing["verified_count"] == 2
    # 2 verified out of 3 total reviews = (2 * 100) // 3 = 66%
    assert listing["trust_score"] == 66


def test_multi_category_and_multi_proof_types(direct_deploy, direct_vm, direct_alice):
    contract = deploy_contract(direct_deploy)
    owner = direct_alice
    direct_vm.sender = owner
    direct_vm.value = 50_000

    listing_id = contract.create_listing(
        title="Enterprise Cloud Analytics Platform",
        description="Comprehensive SaaS observability and distributed log tracing suite with SLA guarantees.",
        category="SaaS & Developer Tools, AI & Machine Learning",
        verification_criteria="Invoice ID must start with INV-\nAccount plan must be Enterprise",
        proof_type="receipt,invoice,contract,subscription",
        reward_per_review=5_000,
        min_stake=1_000,
    )
    direct_vm.value = 0

    listing = contract.get_listing(listing_id)
    assert listing["category"] == "SaaS & Developer Tools, AI & Machine Learning"
    assert listing["proof_type"] == "receipt,invoice,contract,subscription"
    assert listing["status"] == "active"


# ==============================================================================
# 9. PRODUCTION SECURITY INVARIANTS: ADVERSARIAL MATRIX
# ==============================================================================


def test_security_ssrf_url_rejection(direct_deploy, direct_vm, direct_alice, direct_bob):
    contract = deploy_contract(direct_deploy)
    listing_id = create_sample_listing(direct_vm, contract, owner=direct_alice)

    direct_vm.sender = direct_bob
    direct_vm.value = 1_000

    # Localhost URL
    with pytest.raises(Exception, match="Local and private network URLs are prohibited"):
        contract.submit_critique(
            listing_id=listing_id,
            rating=5,
            review_text=VALID_REVIEW_TEXT,
            proof_url="https://localhost/receipt.html",
            proof_description=VALID_PROOF_DESC,
        )

    # 127.0.0.1 Loopback URL
    with pytest.raises(Exception, match="Local and private network URLs are prohibited"):
        contract.submit_critique(
            listing_id=listing_id,
            rating=5,
            review_text=VALID_REVIEW_TEXT,
            proof_url="https://127.0.0.1/orders/123",
            proof_description=VALID_PROOF_DESC,
        )

    # AWS/Cloud Metadata IP
    with pytest.raises(Exception, match="Local and private network URLs are prohibited"):
        contract.submit_critique(
            listing_id=listing_id,
            rating=5,
            review_text=VALID_REVIEW_TEXT,
            proof_url="https://169.254.169.254/latest/meta-data/",
            proof_description=VALID_PROOF_DESC,
        )

    # Non-standard port
    with pytest.raises(Exception, match="Non-standard ports are prohibited"):
        contract.submit_critique(
            listing_id=listing_id,
            rating=5,
            review_text=VALID_REVIEW_TEXT,
            proof_url="https://example.com:8080/receipt.html",
            proof_description=VALID_PROOF_DESC,
        )


def test_security_committed_escrow_liability_protection(direct_deploy, direct_vm, direct_alice, direct_bob):
    contract = deploy_contract(direct_deploy)
    # Reward pool: 10,000, bounty: 5,000 per review
    listing_id = create_sample_listing(
        direct_vm,
        contract,
        owner=direct_alice,
        reward_pool=10_000,
        reward_per_review=5_000,
        min_stake=1_000,
    )

    # Bob submits a critique, locking 1 review liability (5,000)
    direct_vm.sender = direct_bob
    direct_vm.value = 1_000
    critique_id = contract.submit_critique(
        listing_id=listing_id,
        rating=5,
        review_text=VALID_REVIEW_TEXT,
        proof_url=VALID_PROOF_URL,
        proof_description=VALID_PROOF_DESC,
    )

    listing = contract.get_listing(listing_id)
    assert listing["pending_review_count"] == 1

    # Alice tries to withdraw 6,000 (which exceeds available non-committed 5,000)
    direct_vm.sender = direct_alice
    direct_vm.value = 0
    with pytest.raises(Exception, match="Cannot withdraw reward pool funds committed to pending critiques"):
        contract.withdraw_reward_pool(listing_id, 6_000)

    # Alice can only withdraw up to 5,000
    contract.withdraw_reward_pool(listing_id, 5_000)
    listing = contract.get_listing(listing_id)
    assert listing["reward_pool"] == 5_000

    # Alice cannot archive listing while reviews are pending verification
    with pytest.raises(Exception, match="Cannot archive listing while active critiques are pending"):
        contract.archive_listing(listing_id)


def test_security_immutable_evidence_digest_and_attempt_counter(direct_deploy, direct_vm, direct_alice, direct_bob):
    contract = deploy_contract(direct_deploy)
    listing_id = create_sample_listing(direct_vm, contract, owner=direct_alice)

    direct_vm.sender = direct_bob
    direct_vm.value = 1_000
    critique_id = contract.submit_critique(
        listing_id=listing_id,
        rating=5,
        review_text=VALID_REVIEW_TEXT,
        proof_url=VALID_PROOF_URL,
        proof_description=VALID_PROOF_DESC,
    )

    critique = contract.get_critique(listing_id, critique_id)
    assert len(critique["evidence_hash"]) == 64
    assert critique["attempt_count"] == 0


