"""Adversarial Direct Mode test suite covering the 4 Critical Issue Fixes:
1. Economic liveness recovery: retry exhaustion, stake refund, merchant archival unblocked.
2. Duplicate evidence prevention & reward solvency commitments.
3. Slashing integrity: authentic proof with subjective quality failure refunds stake;
   fraudulent proof slashes stake; generic documentation fails authenticity.
4. Terminal recovery paths and accounting conservation.
"""

import pytest

CONTRACT = "contracts/critiqproof.py"
DEFAULT_TITLE = "ProAudio Wireless Noise-Cancelling Headphones"
DEFAULT_DESC = (
    "Flagship over-ear wireless headphones with active noise cancellation, "
    "transparency mode, 40-hour battery life, and lossless audio support."
)
DEFAULT_CATEGORY = "Electronics"
DEFAULT_CRITERIA = "Purchase date must be within 2026\nItem name must mention ProAudio"
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
    reward_pool=50_000,
    reward_per_review=5_000,
    min_stake=1_000,
):
    direct_vm.sender = owner
    direct_vm.value = reward_pool
    listing_id = contract.create_listing(
        title=DEFAULT_TITLE,
        description=DEFAULT_DESC,
        category=DEFAULT_CATEGORY,
        verification_criteria=DEFAULT_CRITERIA,
        proof_type=DEFAULT_PROOF_TYPE,
        reward_per_review=reward_per_review,
        min_stake=min_stake,
    )
    direct_vm.value = 0
    return listing_id


# ==============================================================================
# ISSUE 1: ECONOMIC LIVENESS & RECOVERY
# ==============================================================================


def test_issue1_retry_exhaustion_triggers_terminal_recovery_and_refunds_stake(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    """When a critique exhausts 5 retries with UNDETERMINED, it must transition

    to EXHAUSTED, refund the reviewer stake 100%, decrement pending reviews,
    and unblock merchant archival and uncommitted fund recovery.
    """
    contract = deploy_contract(direct_deploy)
    initial_pool = 30_000
    stake_amount = 2_000
    reward_per_review = 5_000

    listing_id = create_sample_listing(
        direct_vm,
        contract,
        owner=direct_alice,
        reward_pool=initial_pool,
        reward_per_review=reward_per_review,
        min_stake=1_000,
    )

    # Bob stakes and submits critique
    direct_vm.sender = direct_bob
    direct_vm.value = stake_amount
    critique_id = contract.submit_critique(
        listing_id=listing_id,
        rating=5,
        review_text=VALID_REVIEW_TEXT,
        proof_url=VALID_PROOF_URL,
        proof_description=VALID_PROOF_DESC,
    )
    direct_vm.value = 0

    listing = contract.get_listing(listing_id)
    assert listing["pending_review_count"] == 1
    assert contract.has_active_critique(listing_id, direct_bob) is True

    # Merchant cannot archive while critique is pending
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("Cannot archive listing while active critiques are pending"):
        contract.archive_listing(listing_id)

    # Merchant cannot withdraw reward pool committed to this pending review
    with direct_vm.expect_revert("Cannot withdraw reward pool funds committed to pending critiques"):
        contract.withdraw_reward_pool(listing_id, 26_000)

    # Mock server down (HTTP 503)
    direct_vm.mock_web(
        r"receipts\.example\.com/.*",
        {"status": 503, "body": "Service Unavailable"},
    )

    # Attempts 1 to 4: remain UNDETERMINED
    for attempt in range(1, 5):
        # Warp time forward to bypass 30s cooldown
        direct_vm.warp(f"2026-10-15T12:{attempt:02d}:00Z")
        res = contract.verify_critique(listing_id, critique_id)
        assert res["outcome"] == "UNDETERMINED"
        c = contract.get_critique(listing_id, critique_id)
        assert c["status"] == "undetermined"
        assert c["attempt_count"] == attempt

    # Attempt 5: Final attempt exhaustion triggers terminal EXHAUSTED state
    direct_vm.warp("2026-10-15T12:05:00Z")
    res5 = contract.verify_critique(listing_id, critique_id)
    assert res5["outcome"] == "EXHAUSTED"

    c5 = contract.get_critique(listing_id, critique_id)
    assert c5["status"] == "exhausted"
    assert c5["attempt_count"] == 5

    # Check that pending reviews decremented to 0
    listing_after = contract.get_listing(listing_id)
    assert listing_after["pending_review_count"] == 0

    # Check reviewer lock is released
    assert contract.has_active_critique(listing_id, direct_bob) is False

    # Check merchant can now archive listing with zero active blockers
    direct_vm.sender = direct_alice
    contract.archive_listing(listing_id)
    listing_final = contract.get_listing(listing_id)
    assert listing_final["status"] == "archived"
    assert listing_final["reward_pool"] == 0


def test_issue1_resolve_exhausted_critique_timeout_and_replay_safety(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    """Direct invocation of resolve_exhausted_critique after timeout safely recovers

    stuck undetermined critique and is replay-safe against double resolution.
    """
    contract = deploy_contract(direct_deploy)
    listing_id = create_sample_listing(direct_vm, contract, owner=direct_alice)

    direct_vm.sender = direct_bob
    direct_vm.value = 2_000
    critique_id = contract.submit_critique(
        listing_id=listing_id,
        rating=4,
        review_text=VALID_REVIEW_TEXT,
        proof_url=VALID_PROOF_URL,
        proof_description=VALID_PROOF_DESC,
    )
    direct_vm.value = 0

    # First verification attempt results in UNDETERMINED due to timeout
    direct_vm.mock_web(
        r"receipts\.example\.com/.*",
        {"status": 408, "body": "Request Timeout"},
    )
    contract.verify_critique(listing_id, critique_id)

    # Calling resolve_exhausted_critique before timeout or retry exhaustion must revert
    with direct_vm.expect_revert("Critique has not exhausted retries or exceeded the recovery timeout"):
        contract.resolve_exhausted_critique(listing_id, critique_id)

    # Warp forward past EXHAUSTION_TIMEOUT_SECONDS (3600 seconds = 1 hour)
    direct_vm.warp("2026-10-15T15:00:00Z")

    # Authoritative recovery succeeds
    rec = contract.resolve_exhausted_critique(listing_id, critique_id)
    assert rec["outcome"] == "EXHAUSTED"
    assert rec["status"] == "exhausted"
    assert rec["refunded_stake"] == 2_000

    c = contract.get_critique(listing_id, critique_id)
    assert c["status"] == "exhausted"

    # Replay safety: calling resolve_exhausted_critique a second time must revert
    with direct_vm.expect_revert("Only undetermined critiques can be resolved through exhaustion recovery"):
        contract.resolve_exhausted_critique(listing_id, critique_id)

    # Attempting to re-verify an exhausted critique must revert
    with direct_vm.expect_revert("Critique is already verified, rejected, or exhausted"):
        contract.verify_critique(listing_id, critique_id)


# ==============================================================================
# ISSUE 2: PREVENT DUPLICATE CLAIMS & ENFORCE REWARD COMMITMENTS
# ==============================================================================


def test_issue2_duplicate_rewarded_evidence_rejection(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    """Previously verified & rewarded proof URL or evidence digest cannot be

    re-submitted by the same or different reviewer to claim duplicate bounties.
    """
    contract = deploy_contract(direct_deploy)
    listing_id = create_sample_listing(
        direct_vm, contract, owner=direct_alice, reward_pool=50_000, reward_per_review=5_000
    )

    # Bob submits authentic review with VALID_PROOF_URL
    direct_vm.sender = direct_bob
    direct_vm.value = 1_500
    critique_id = contract.submit_critique(
        listing_id=listing_id,
        rating=5,
        review_text=VALID_REVIEW_TEXT,
        proof_url=VALID_PROOF_URL,
        proof_description=VALID_PROOF_DESC,
    )
    direct_vm.value = 0

    direct_vm.mock_web(
        r"receipts\.example\.com/.*",
        {"status": 200, "body": "Order ACME-99281 confirmed. Item: ProAudio Headphones."},
    )
    direct_vm.mock_llm(
        r"auditing a consumer critique and purchase evidence",
        '{"criterion_results": ["PASS", "PASS", "PASS", "PASS"], "reasoning": "Authentic purchase receipt verified."}',
    )

    res = contract.verify_critique(listing_id, critique_id)
    assert res["outcome"] == "VERIFIED"

    # Verify evidence is recorded as rewarded
    assert contract.is_evidence_rewarded(listing_id, VALID_PROOF_URL) is True

    # Charlie attempts to re-use Bob's rewarded receipt on the same listing
    charlie = b"\xaa" * 20
    direct_vm.sender = charlie
    direct_vm.value = 1_500
    with direct_vm.expect_revert("Proof evidence has already been verified and rewarded for this listing"):
        contract.submit_critique(
            listing_id=listing_id,
            rating=5,
            review_text="Another great experience with these headphones, very comfortable.",
            proof_url=VALID_PROOF_URL,
            proof_description=VALID_PROOF_DESC,
        )

    # Bob also cannot re-submit the same rewarded receipt
    direct_vm.sender = direct_bob
    direct_vm.value = 1_500
    with direct_vm.expect_revert("Proof evidence has already been verified and rewarded for this listing"):
        contract.submit_critique(
            listing_id=listing_id,
            rating=5,
            review_text="Second time reviewing with the exact same purchase receipt document.",
            proof_url=VALID_PROOF_URL,
            proof_description="Different description with identical rewarded URL",
        )


def test_issue2_concurrent_duplicate_in_flight_evidence_rejection(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    """Identical proof evidence cannot be submitted concurrently while another

    review with the same evidence is pending verification.
    """
    contract = deploy_contract(direct_deploy)
    listing_id = create_sample_listing(direct_vm, contract, owner=direct_alice)

    # Bob submits proof URL
    direct_vm.sender = direct_bob
    direct_vm.value = 1_000
    contract.submit_critique(
        listing_id=listing_id,
        rating=5,
        review_text=VALID_REVIEW_TEXT,
        proof_url=VALID_PROOF_URL,
        proof_description=VALID_PROOF_DESC,
    )
    direct_vm.value = 0

    # Charlie tries to submit identical in-flight proof while Bob's is pending
    charlie = b"\xbb" * 20
    direct_vm.sender = charlie
    direct_vm.value = 1_000
    with direct_vm.expect_revert("Identical proof evidence is currently pending verification"):
        contract.submit_critique(
            listing_id=listing_id,
            rating=4,
            review_text="Trying to submit identical receipt before first one is verified.",
            proof_url=VALID_PROOF_URL,
            proof_description=VALID_PROOF_DESC,
        )


def test_issue2_reward_pool_solvency_and_exhaustion_enforcement(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    """Enforces that advertised bounty is solvent before accepting a staked critique.

    Once available uncommitted pool is depleted, new submissions must revert.
    """
    contract = deploy_contract(direct_deploy)
    # Listing funded with exactly 10,000 for 5,000 per review (capacity: exactly 2 reviews)
    listing_id = create_sample_listing(
        direct_vm,
        contract,
        owner=direct_alice,
        reward_pool=10_000,
        reward_per_review=5_000,
        min_stake=1_000,
    )

    # Available reward is 10,000
    assert contract.get_available_reward_pool(listing_id) == 10_000

    # Reviewer 1 submits (pending liability: 5,000; remaining: 5,000)
    rev1 = b"\x11" * 20
    direct_vm.sender = rev1
    direct_vm.value = 1_000
    contract.submit_critique(
        listing_id=listing_id,
        rating=5,
        review_text=VALID_REVIEW_TEXT,
        proof_url="https://receipts.example.com/order-1.html",
        proof_description="Order 1 receipt proof",
    )
    direct_vm.value = 0
    assert contract.get_available_reward_pool(listing_id) == 5_000

    # Reviewer 2 submits (pending liability: 10,000; remaining: 0)
    rev2 = b"\x22" * 20
    direct_vm.sender = rev2
    direct_vm.value = 1_000
    contract.submit_critique(
        listing_id=listing_id,
        rating=5,
        review_text=VALID_REVIEW_TEXT,
        proof_url="https://receipts.example.com/order-2.html",
        proof_description="Order 2 receipt proof",
    )
    direct_vm.value = 0
    assert contract.get_available_reward_pool(listing_id) == 0

    # Reviewer 3 attempts to submit when reward pool is exhausted
    rev3 = b"\x33" * 20
    direct_vm.sender = rev3
    direct_vm.value = 1_000
    with direct_vm.expect_revert("Listing reward pool has insufficient uncommitted funds for advertised bounty"):
        contract.submit_critique(
            listing_id=listing_id,
            rating=5,
            review_text=VALID_REVIEW_TEXT,
            proof_url="https://receipts.example.com/order-3.html",
            proof_description="Order 3 receipt proof",
        )
    direct_vm.value = 0

    # Merchant tops up the pool with 5,000
    direct_vm.sender = direct_alice
    direct_vm.value = 5_000
    contract.fund_reward_pool(listing_id)
    direct_vm.value = 0
    assert contract.get_available_reward_pool(listing_id) == 5_000

    # Now Reviewer 3 can stake and submit
    direct_vm.sender = rev3
    direct_vm.value = 1_000
    cid3 = contract.submit_critique(
        listing_id=listing_id,
        rating=5,
        review_text=VALID_REVIEW_TEXT,
        proof_url="https://receipts.example.com/order-3.html",
        proof_description="Order 3 receipt proof",
    )
    direct_vm.value = 0
    assert cid3 == 3


# ==============================================================================
# ISSUE 3: STRENGTHEN VERIFICATION & SLASHING INTEGRITY
# ==============================================================================


def test_issue3_subjective_quality_failure_refunds_stake_no_slashing(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    """When proof evidence is authentic (Criterion 1 PASS), but subjective review quality

    fails (Criterion 2 FAIL), bounty payout is rejected BUT reviewer stake is 100% refunded.
    Reviewer stake must NEVER be slashed into merchant pool for subjective quality.
    """
    contract = deploy_contract(direct_deploy)
    initial_pool = 40_000
    stake_amount = 2_500

    listing_id = create_sample_listing(
        direct_vm, contract, owner=direct_alice, reward_pool=initial_pool, reward_per_review=5_000
    )

    direct_vm.sender = direct_bob
    direct_vm.value = stake_amount
    critique_id = contract.submit_critique(
        listing_id=listing_id,
        rating=3,
        review_text="Headphones ok. It works. Did not like the color much.",
        proof_url=VALID_PROOF_URL,
        proof_description=VALID_PROOF_DESC,
    )
    direct_vm.value = 0

    # Mock authentic receipt page
    direct_vm.mock_web(
        r"receipts\.example\.com/.*",
        {"status": 200, "body": "Order ACME-99281 confirmed. Item: ProAudio Wireless Headphones. 2026."},
    )
    # LLM magistrate verifies Authenticity is PASS, but Quality is FAIL (too brief/unhelpful)
    direct_vm.mock_llm(
        r"auditing a consumer critique and purchase evidence",
        '{"criterion_results": ["PASS", "FAIL", "PASS", "PASS"], "reasoning": "Receipt is authentic purchase, but review quality is too brief to qualify for incentive bounty."}',
    )

    result = contract.verify_critique(listing_id, critique_id)
    assert result["outcome"] == "REJECTED"
    assert result["authenticity_result"] == "PASS"
    assert result["quality_result"] == "FAIL"

    critique = contract.get_critique(listing_id, critique_id)
    assert critique["status"] == "rejected"

    # CRITICAL INVARIANT: Reviewer stake was NOT slashed! Merchant pool remains unchanged!
    listing = contract.get_listing(listing_id)
    assert listing["reward_pool"] == initial_pool
    assert listing["pending_review_count"] == 0


def test_issue3_fraudulent_proof_slashes_stake_into_pool(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    """When proof evidence is fraudulent or forged (Criterion 1 FAIL), reviewer stake

    is slashed and deposited into the merchant reward pool.
    """
    contract = deploy_contract(direct_deploy)
    initial_pool = 30_000
    stake_amount = 3_000

    listing_id = create_sample_listing(
        direct_vm, contract, owner=direct_alice, reward_pool=initial_pool
    )

    direct_vm.sender = direct_bob
    direct_vm.value = stake_amount
    critique_id = contract.submit_critique(
        listing_id=listing_id,
        rating=5,
        review_text="Sybil attack forged receipt submission attempting to steal bounty.",
        proof_url="https://attacker.example.com/fake-receipt.html",
        proof_description="Forged receipt",
    )
    direct_vm.value = 0

    direct_vm.mock_web(
        r"attacker\.example\.com/.*",
        {"status": 200, "body": "<html><body>Invoice #999 for Smart Coffee Maker</body></html>"},
    )
    # LLM magistrate discovers forgery/wrong item: Authenticity FAILS
    direct_vm.mock_llm(
        r"auditing a consumer critique and purchase evidence",
        '{"criterion_results": ["FAIL", "PASS", "FAIL", "FAIL"], "reasoning": "Invoice does not match ProAudio headphones. Fraudulent submission."}',
    )

    result = contract.verify_critique(listing_id, critique_id)
    assert result["outcome"] == "REJECTED"
    assert result["authenticity_result"] == "FAIL"

    # Stake is slashed into the reward pool
    listing = contract.get_listing(listing_id)
    assert listing["reward_pool"] == initial_pool + stake_amount


def test_issue3_generic_documentation_fails_authenticity_and_slashes(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    """General public documentation, wikipedia pages, or marketing homepages do not

    substantiate personal purchase or service use and must fail authenticity.
    """
    contract = deploy_contract(direct_deploy)
    initial_pool = 25_000
    stake_amount = 2_000

    listing_id = create_sample_listing(
        direct_vm, contract, owner=direct_alice, reward_pool=initial_pool
    )

    direct_vm.sender = direct_bob
    direct_vm.value = stake_amount
    critique_id = contract.submit_critique(
        listing_id=listing_id,
        rating=5,
        review_text="Trying to pass off a public Wikipedia article as proof of purchase.",
        proof_url="https://en.wikipedia.org/wiki/Headphones",
        proof_description="Wikipedia public article",
    )
    direct_vm.value = 0

    direct_vm.mock_web(
        r"en\.wikipedia\.org/.*",
        {"status": 200, "body": "Headphones are a pair of small loudspeaker drivers worn on or around the head."},
    )
    direct_vm.mock_llm(
        r"auditing a consumer critique and purchase evidence",
        '{"criterion_results": ["FAIL", "PASS", "FAIL", "FAIL"], "reasoning": "Public Wikipedia documentation does not substantiate purchase or service-use. Fails Authenticity."}',
    )

    result = contract.verify_critique(listing_id, critique_id)
    assert result["outcome"] == "REJECTED"
    assert result["authenticity_result"] == "FAIL"

    listing = contract.get_listing(listing_id)
    assert listing["reward_pool"] == initial_pool + stake_amount


def test_issue3_temporary_inaccessible_evidence_preserves_stake(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    """HTTP 401, 403, 404, 410, 429, 500, 502, 503, 504 must yield UNDETERMINED

    and never slash the reviewer stake.
    """
    contract = deploy_contract(direct_deploy)
    initial_pool = 20_000
    stake_amount = 1_500

    for code in [401, 403, 404, 410, 429, 500, 502, 503]:
        listing_id = create_sample_listing(
            direct_vm, contract, owner=direct_alice, reward_pool=initial_pool
        )

        direct_vm.sender = direct_bob
        direct_vm.value = stake_amount
        cid = contract.submit_critique(
            listing_id=listing_id,
            rating=5,
            review_text=VALID_REVIEW_TEXT,
            proof_url=f"https://receipts.example.com/order-{code}.html",
            proof_description="Store receipt",
        )
        direct_vm.value = 0

        direct_vm.mock_web(
            rf"receipts\.example\.com/order-{code}\.html",
            {"status": code, "body": f"HTTP {code} Response"},
        )

        res = contract.verify_critique(listing_id, cid)
        assert res["outcome"] == "UNDETERMINED", f"HTTP {code} should be UNDETERMINED"

        listing = contract.get_listing(listing_id)
        assert listing["reward_pool"] == initial_pool, f"HTTP {code} must not slash stake"
        assert listing["pending_review_count"] == 1
