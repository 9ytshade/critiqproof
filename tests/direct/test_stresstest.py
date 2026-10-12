"""Comprehensive Multi-Category Stress Test Suite for CritiqProof v1.0.0.

Tests all possible scenarios that can go right (happy paths) and go wrong (adversarial,
reversions, slashing, and network faults) across 6 distinct taxonomy categories:
1. SaaS & Developer Tools, Web3 & DeFi Protocols
2. Consumer Electronics & Hardware, E-Commerce & Retail
3. AI & Machine Learning
4. Travel & Hospitality
5. EdTech & Professional Courses, Freelance & Digital Agencies
6. FinTech & Financial Services, Logistics & Delivery
"""

import pytest

CONTRACT = "contracts/critiqproof.py"


def deploy_contract(direct_deploy):
    return direct_deploy(CONTRACT)


# ==============================================================================
# 1. MULTI-CATEGORY HAPPY PATH DEPLOYMENTS & ESCROW MANAGEMENT
# ==============================================================================


def test_stress_happy_path_across_6_categories(direct_vm, direct_deploy, direct_alice):
    """Stress test creating listings across 6 diverse industry categories with custom configurations."""
    contract = deploy_contract(direct_deploy)

    categories_to_test = [
        {
            "cat": "SaaS & Developer Tools, Web3 & DeFi Protocols",
            "title": "Decentralized RPC Gateway",
            "desc": "High-throughput node gateway for EVM and GenVM with sub-5ms latency routing.",
            "proof": "subscription,invoice,contract",
            "pool": 100_000,
            "bounty": 10_000,
            "stake": 2_000,
        },
        {
            "cat": "Consumer Electronics & Hardware, E-Commerce & Retail",
            "title": "Wireless Studio Reference Monitors",
            "desc": "Precision dual-driver acoustic speakers with balanced TRS and Bluetooth 5.4.",
            "proof": "receipt,order_id",
            "pool": 80_000,
            "bounty": 8_000,
            "stake": 3_000,
        },
        {
            "cat": "AI & Machine Learning",
            "title": "Neural Tensor Inference Accelerator",
            "desc": "Quantized LLM execution cluster supporting deep model sharding across GPUs.",
            "proof": "invoice,subscription",
            "pool": 150_000,
            "bounty": 15_000,
            "stake": 5_000,
        },
        {
            "cat": "Travel & Hospitality",
            "title": "Nordic Fjords Eco Retreat",
            "desc": "Zero-carbon geothermal lodge featuring guided glacier excursions and arctic sauna.",
            "proof": "booking,receipt",
            "pool": 120_000,
            "bounty": 12_000,
            "stake": 4_000,
        },
        {
            "cat": "EdTech & Professional Courses, Freelance & Digital Agencies",
            "title": "Smart Contract Security Auditing Intensive",
            "desc": "8-week immersive training in formal verification, invariant testing, and vulnerability triage.",
            "proof": "contract,invoice,other",
            "pool": 90_000,
            "bounty": 9_000,
            "stake": 3_000,
        },
        {
            "cat": "FinTech & Financial Services, Logistics & Delivery",
            "title": "Autonomous Trade Invoice Settlement",
            "desc": "Automated cross-border trade finance rail linking bills of lading to escrow releases.",
            "proof": "delivery_note,invoice,contract",
            "pool": 200_000,
            "bounty": 20_000,
            "stake": 10_000,
        },
    ]

    direct_vm.sender = direct_alice

    for idx, item in enumerate(categories_to_test, 1):
        direct_vm.value = item["pool"]
        listing_id = contract.create_listing(
            title=item["title"],
            description=item["desc"],
            category=item["cat"],
            verification_criteria="Proof must match merchant billing reference and date range",
            proof_type=item["proof"],
            reward_per_review=item["bounty"],
            min_stake=item["stake"],
        )
        direct_vm.value = 0

        assert listing_id == idx
        listing = contract.get_listing(listing_id)
        assert listing["category"] == item["cat"]
        assert listing["reward_pool"] == item["pool"]
        assert listing["reward_per_review"] == item["bounty"]
        assert listing["min_stake"] == item["stake"]
        assert listing["status"] == "active"

    assert contract.get_listing_count() == 6


def test_stress_pool_topup_and_partial_withdraw(direct_vm, direct_deploy, direct_alice):
    """Stress test depositing additional funds into reward pool and withdrawing excess while maintaining solvency."""
    contract = deploy_contract(direct_deploy)
    direct_vm.sender = direct_alice
    direct_vm.value = 50_000
    listing_id = contract.create_listing(
        title="AI Neural Cache Platform",
        description="Low latency semantic caching layer for large language model completions.",
        category="AI & Machine Learning",
        verification_criteria="Active subscription token count exceeds 500k",
        proof_type="subscription",
        reward_per_review=5_000,
        min_stake=1_000,
    )
    direct_vm.value = 0

    # 1. Top up reward pool with +30,000
    direct_vm.value = 30_000
    contract.fund_reward_pool(listing_id)
    direct_vm.value = 0

    listing = contract.get_listing(listing_id)
    assert listing["reward_pool"] == 80_000

    # 2. Withdraw 25,000 excess funds
    contract.withdraw_reward_pool(listing_id, 25_000)
    listing = contract.get_listing(listing_id)
    assert listing["reward_pool"] == 55_000


# ==============================================================================
# 2. AUTHENTIC CRITIQUES & TRUST SCORE COMPOUNDING (HAPPY PATH)
# ==============================================================================


def test_stress_multiple_honest_reviews_and_dynamic_trust_score(
    direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie
):
    """Multiple reviewers submit reviews on Travel & Hospitality listing, testing compounding trust score."""
    contract = deploy_contract(direct_deploy)

    # 1. Create Travel listing
    direct_vm.sender = direct_alice
    direct_vm.value = 100_000
    listing_id = contract.create_listing(
        title="Grand Alpine Sanctuary & Spa",
        description="Boutique mountain wellness retreat offering thermal pools and ski-in accommodations.",
        category="Travel & Hospitality",
        verification_criteria="Reservation voucher must show SH- prefix and confirmed 2026 dates",
        proof_type="booking,receipt",
        reward_per_review=10_000,
        min_stake=2_000,
    )
    direct_vm.value = 0

    # 2. Bob submits 5-star review
    direct_vm.sender = direct_bob
    direct_vm.value = 2_000
    critique_1 = contract.submit_critique(
        listing_id=listing_id,
        rating=5,
        review_text="Exceptional stay. The geothermal springs and mountain vistas were immaculate.",
        proof_url="https://reservations.grand-alpine.com/voucher-SH-10294.html",
        proof_description="Official reservation voucher with confirmed stay dates in October 2026.",
    )
    direct_vm.value = 0

    direct_vm.mock_web(
        r"reservations\.grand-alpine\.com/.*",
        {
            "status": 200,
            "body": "<html><body>Booking #SH-10294 Confirmed. Guest: Bob. Status: Completed.</body></html>",
        },
    )
    direct_vm.mock_llm(
        r"auditing a consumer critique and purchase evidence",
        (
            '{"criterion_results": ["PASS", "PASS", "PASS"], '
            '"reasoning": "Voucher reference matches SH- prefix and confirmed completed reservation."}'
        ),
    )

    verdict_1 = contract.verify_critique(listing_id, critique_1)
    assert verdict_1["outcome"] == "VERIFIED"

    listing = contract.get_listing(listing_id)
    assert listing["verified_count"] == 1
    assert listing["review_count"] == 1
    assert listing["trust_score"] == 100
    assert listing["total_rating_points"] == 5
    assert listing["reward_pool"] == 90_000

    # 3. Charlie submits 4-star review
    direct_vm.sender = direct_charlie
    direct_vm.value = 2_000
    critique_2 = contract.submit_critique(
        listing_id=listing_id,
        rating=4,
        review_text="Great sauna and staff service, though evening dining reservations booked up quickly.",
        proof_url="https://reservations.grand-alpine.com/voucher-SH-88412.html",
        proof_description="Verified reservation receipt reference SH-88412.",
    )
    direct_vm.value = 0

    direct_vm.mock_web(
        r"reservations\.grand-alpine\.com/.*",
        {
            "status": 200,
            "body": "<html><body>Booking #SH-88412 Confirmed. Guest: Charlie. Status: Completed.</body></html>",
        },
    )
    direct_vm.mock_llm(
        r"auditing a consumer critique and purchase evidence",
        (
            '{"criterion_results": ["PASS", "PASS", "PASS"], '
            '"reasoning": "Voucher confirms valid stay and substantive feedback."}'
        ),
    )

    verdict_2 = contract.verify_critique(listing_id, critique_2)
    assert verdict_2["outcome"] == "VERIFIED"

    listing = contract.get_listing(listing_id)
    assert listing["verified_count"] == 2
    assert listing["review_count"] == 2
    assert listing["trust_score"] == 100
    assert listing["total_rating_points"] == 9
    assert listing["reward_pool"] == 80_000


def test_stress_archival_and_100_percent_refund(direct_vm, direct_deploy, direct_alice, direct_bob):
    """Archiving an active listing refunds remaining pool and blocks new reviews."""
    contract = deploy_contract(direct_deploy)
    direct_vm.sender = direct_alice
    direct_vm.value = 60_000
    listing_id = contract.create_listing(
        title="FinTech Cross-Border Payment Rail",
        description="Instant fiat to stablecoin settlement for B2B exporters.",
        category="FinTech & Financial Services",
        verification_criteria="Invoice ID format INV-FX- and verifiable swift reference",
        proof_type="invoice,contract",
        reward_per_review=6_000,
        min_stake=1_500,
    )
    direct_vm.value = 0

    # Archive listing
    contract.archive_listing(listing_id)
    listing = contract.get_listing(listing_id)
    assert listing["status"] == "archived"
    assert listing["reward_pool"] == 0  # 100% refunded to owner

    # Attempting to submit critique to archived listing reverts
    direct_vm.sender = direct_bob
    direct_vm.value = 1_500
    with direct_vm.expect_revert("Listing is not active"):
        contract.submit_critique(
            listing_id=listing_id,
            rating=5,
            review_text="Attempting to review an archived listing should fail.",
            proof_url="https://invoices.example.com/inv-123.html",
            proof_description="Invoice reference",
        )
    direct_vm.value = 0


# ==============================================================================
# 3. SCENARIOS THAT GO WRONG (ADVERSARIAL ATTACKS, REVERSIONS, SLASHING)
# ==============================================================================


def test_stress_sybil_fraudulent_review_slashed_into_pool(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    """Adversarial fake invoice review fails criteria -> stake slashed into merchant pool."""
    contract = deploy_contract(direct_deploy)
    initial_pool = 40_000
    stake_amount = 5_000

    direct_vm.sender = direct_alice
    direct_vm.value = initial_pool
    listing_id = contract.create_listing(
        title="EdTech Smart Contract Bootcamp",
        description="Developer bootcamp for Web3 engineering.",
        category="EdTech & Professional Courses",
        verification_criteria="Certificate ID must start with CERT-2026",
        proof_type="contract,invoice",
        reward_per_review=4_000,
        min_stake=2_000,
    )
    direct_vm.value = 0

    # Attacker stakes 5,000 with fake proof
    direct_vm.sender = direct_bob
    direct_vm.value = stake_amount
    critique_id = contract.submit_critique(
        listing_id=listing_id,
        rating=1,
        review_text="Scam bootcamp, didn't teach anything useful.",
        proof_url="https://proofs.attacker.com/receipt-404.html",
        proof_description="Claimed certificate purchase invoice.",
    )
    direct_vm.value = 0

    direct_vm.mock_web(
        r"proofs\.attacker\.com/.*",
        {
            "status": 200,
            "body": "<html><body>Receipt for unrelated grocery items at supermarket.</body></html>",
        },
    )
    direct_vm.mock_llm(
        r"auditing a consumer critique and purchase evidence",
        (
            '{"criterion_results": ["FAIL", "PASS", "FAIL"], '
            '"reasoning": "Receipt is for groceries and does not match bootcamp certificate criteria."}'
        ),
    )

    verdict = contract.verify_critique(listing_id, critique_id)
    assert verdict["outcome"] == "REJECTED"
    assert verdict["authenticity_result"] == "FAIL"

    critique = contract.get_critique(listing_id, critique_id)
    assert critique["status"] == "rejected"

    # Solvency check: stake was permanently slashed into merchant pool!
    listing = contract.get_listing(listing_id)
    assert listing["reward_pool"] == initial_pool + stake_amount  # 45,000
    assert listing["verified_count"] == 0
    assert listing["review_count"] == 1
    assert listing["trust_score"] == 0  # 0% because 0 of 1 verified


def test_stress_dead_link_http_404_slashing(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    """Dead link returning HTTP 404 slashes stake into pool."""
    contract = deploy_contract(direct_deploy)
    initial_pool = 30_000
    stake_amount = 3_000

    direct_vm.sender = direct_alice
    direct_vm.value = initial_pool
    listing_id = contract.create_listing(
        title="Hardware IoT Microcontroller",
        description="Edge IoT sensor board with LoRaWAN connectivity.",
        category="Consumer Electronics & Hardware",
        verification_criteria="Order number must verify on store invoice",
        proof_type="receipt,order_id",
        reward_per_review=3_000,
        min_stake=1_000,
    )
    direct_vm.value = 0

    direct_vm.sender = direct_bob
    direct_vm.value = stake_amount
    critique_id = contract.submit_critique(
        listing_id=listing_id,
        rating=5,
        review_text="Works as expected, sensor readings are accurate.",
        proof_url="https://hardware-store.example.com/order-404.html",
        proof_description="Order confirmation",
    )
    direct_vm.value = 0

    direct_vm.mock_web(
        r"hardware-store\.example\.com/.*",
        {"status": 404, "body": "404 Not Found"},
    )

    verdict = contract.verify_critique(listing_id, critique_id)
    assert verdict["outcome"] == "REJECTED"
    assert "HTTP 404" in verdict["evidence_note"]

    listing = contract.get_listing(listing_id)
    assert listing["reward_pool"] == initial_pool + stake_amount


def test_stress_transient_http_503_preserves_stake(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    """Transient server outage 503 preserves reviewer stake safely without slashing."""
    contract = deploy_contract(direct_deploy)
    initial_pool = 25_000
    stake_amount = 2_000

    direct_vm.sender = direct_alice
    direct_vm.value = initial_pool
    listing_id = contract.create_listing(
        title="FinTech Micro-Lending Protocol",
        description="P2P micro-credit facility with automated risk scores.",
        category="FinTech & Financial Services",
        verification_criteria="Loan transaction hash verifies on explorer",
        proof_type="contract,invoice",
        reward_per_review=2_500,
        min_stake=1_000,
    )
    direct_vm.value = 0

    direct_vm.sender = direct_bob
    direct_vm.value = stake_amount
    critique_id = contract.submit_critique(
        listing_id=listing_id,
        rating=4,
        review_text="Loan funded within 12 seconds with low fee overhead.",
        proof_url="https://gateway.fintech.example.com/status.html",
        proof_description="Transaction summary",
    )
    direct_vm.value = 0

    # 503 Server Unavailable
    direct_vm.mock_web(
        r"gateway\.fintech\.example\.com/.*",
        {"status": 503, "body": "503 Service Unavailable"},
    )

    verdict = contract.verify_critique(listing_id, critique_id)
    assert verdict["outcome"] == "UNDETERMINED"
    assert "HTTP 503" in verdict["evidence_note"]

    # Stake was NOT slashed! Pool remains unchanged
    listing = contract.get_listing(listing_id)
    assert listing["reward_pool"] == initial_pool


def test_stress_all_reversion_defenses(
    direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie
):
    """Test all input validation and security reversion defenses."""
    contract = deploy_contract(direct_deploy)
    direct_vm.sender = direct_alice
    direct_vm.value = 50_000
    listing_id = contract.create_listing(
        title="Developer CI/CD Test Pipeline",
        description="Automated continuous integration pipeline testing runner.",
        category="SaaS & Developer Tools",
        verification_criteria="Build artifact must match sha256 checksum",
        proof_type="receipt,invoice",
        reward_per_review=5_000,
        min_stake=2_000,
    )
    direct_vm.value = 0

    # Defense 1: Owner self-review prevention
    direct_vm.sender = direct_alice
    direct_vm.value = 2_000
    with direct_vm.expect_revert("Listing owner cannot review own listing"):
        contract.submit_critique(
            listing_id=listing_id,
            rating=5,
            review_text="Self review attempt should be blocked.",
            proof_url="https://proofs.example.com/test.html",
            proof_description="Proof description",
        )

    # Defense 2: Insufficient stake
    direct_vm.sender = direct_bob
    direct_vm.value = 1_000  # min is 2,000
    with direct_vm.expect_revert("Stake amount is below required minimum stake"):
        contract.submit_critique(
            listing_id=listing_id,
            rating=5,
            review_text="Staking below minimum must revert.",
            proof_url="https://proofs.example.com/test.html",
            proof_description="Proof description",
        )

    # Defense 3: Rating out of bounds (0 and 6)
    direct_vm.value = 2_000
    with direct_vm.expect_revert("Rating must be between 1 and 5"):
        contract.submit_critique(
            listing_id=listing_id,
            rating=0,
            review_text="Rating 0 must revert.",
            proof_url="https://proofs.example.com/test.html",
            proof_description="Proof description",
        )
    with direct_vm.expect_revert("Rating must be between 1 and 5"):
        contract.submit_critique(
            listing_id=listing_id,
            rating=6,
            review_text="Rating 6 must revert.",
            proof_url="https://proofs.example.com/test.html",
            proof_description="Proof description",
        )

    # Defense 4: Short review text (< 10 chars)
    with direct_vm.expect_revert("Critique review text is too short"):
        contract.submit_critique(
            listing_id=listing_id,
            rating=5,
            review_text="Short",
            proof_url="https://proofs.example.com/test.html",
            proof_description="Proof description",
        )

    # Defense 5: Insecure HTTP URL
    with direct_vm.expect_revert("Proof URL must use public HTTPS"):
        contract.submit_critique(
            listing_id=listing_id,
            rating=5,
            review_text="Legitimate review length but insecure URL.",
            proof_url="http://insecure-domain.com/proof.html",
            proof_description="Proof description",
        )

    # Defense 6: Whitespace in URL
    with direct_vm.expect_revert("Proof URL contains invalid whitespace"):
        contract.submit_critique(
            listing_id=listing_id,
            rating=5,
            review_text="Legitimate review length but spaced URL.",
            proof_url="https://domain.com/spaced path.html",
            proof_description="Proof description",
        )

    # Defense 7: Non-owner cannot archive
    direct_vm.sender = direct_bob
    direct_vm.value = 0
    with direct_vm.expect_revert("Only listing owner can archive listing"):
        contract.archive_listing(listing_id)

    # Defense 8: Non-owner cannot withdraw pool
    with direct_vm.expect_revert("Only listing owner can withdraw from reward pool"):
        contract.withdraw_reward_pool(listing_id, 10_000)

    # Defense 9: Over-withdrawal exceeds available pool
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("Insufficient reward pool balance"):
        contract.withdraw_reward_pool(listing_id, 100_000)  # available is 50,000


def test_stress_double_verification_prevention(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    """Attempting to re-verify an already verified critique must revert."""
    contract = deploy_contract(direct_deploy)
    direct_vm.sender = direct_alice
    direct_vm.value = 30_000
    listing_id = contract.create_listing(
        title="Double Verification Prevention Test",
        description="Ensuring terminal critique status prevents double disbursements.",
        category="SaaS & Developer Tools",
        verification_criteria="Proof verifies",
        proof_type="receipt",
        reward_per_review=3_000,
        min_stake=1_000,
    )
    direct_vm.value = 0

    direct_vm.sender = direct_bob
    direct_vm.value = 1_000
    critique_id = contract.submit_critique(
        listing_id=listing_id,
        rating=5,
        review_text="Valid critique submitted for double verification prevention check.",
        proof_url="https://proofs.example.com/receipt-001.html",
        proof_description="Receipt document",
    )
    direct_vm.value = 0

    direct_vm.mock_web(
        r"proofs\.example\.com/.*",
        {"status": 200, "body": "<html><body>Receipt confirmed</body></html>"},
    )
    direct_vm.mock_llm(
        r"auditing a consumer critique and purchase evidence",
        '{"criterion_results": ["PASS", "PASS", "PASS"], "reasoning": "Criteria verified"}',
    )

    # First verification passes
    contract.verify_critique(listing_id, critique_id)

    # Second verification attempt must revert
    with direct_vm.expect_revert("Critique is already verified or rejected"):
        contract.verify_critique(listing_id, critique_id)

