# CritiqProof

**CritiqProof** is a decentralized, staked consumer review marketplace and AI verification oracle powered by GenLayer Intelligent Contracts.

In traditional e-commerce and review aggregators, reviews suffer from fake consumer spam, paid bot astroturfing, and unverified complaints. CritiqProof solves this by requiring reviewers to lock an anti-Sybil economic stake alongside authentic digital purchase evidence (receipts, booking confirmations, invoice IDs, or transaction proofs).

GenLayer validators run an autonomous **AI Magistrate** under the Equivalence Principle to fetch and inspect the evidence URL against merchant-defined criteria:
- **Verified Authentic:** Stake is 100% returned, review becomes on-chain immutable, reviewer earns a merchant reward bounty in native GEN, and merchant Trust Score is updated.
- **Fraudulent / Forged Proof:** Review is rejected, review text is discarded, and the reviewer stake is permanently slashed into the merchant reward pool to compensate the merchant.
- **Subjective Quality Failure:** When purchase evidence is authentic but review quality or custom merchant criteria are unsatisfied, the bounty is denied but the reviewer stake is 100% refunded (slashing safeguard).
- **Undetermined / Inconclusive / Transient Outage:** Stake is safely preserved in escrow, retry cooldown is enforced, and the critique can be re-adjudicated or recovered terminally.

---

## Live Studionet Deployment & Toolchain

- **Contract Version:** `1.2.0` (Economic Liveness, Replay Recovery & Slashing Integrity Hardened)
- **Network:** GenLayer Studionet (Chain ID: `61999`, RPC: `https://studio.genlayer.com/api`)
- **Deployer Account (9ytshade):** [`0xB704b624ae5f776b3a3fA7496aDcdA4dB4DCAB56`](https://studio.genlayer.com/address/0xB704b624ae5f776b3a3fA7496aDcdA4dB4DCAB56)
- **Contract Address:** [`0x776773Cb27a43dFb074aB8Bde8bB7F776aBa0fFf`](https://studio.genlayer.com/address/0x776773Cb27a43dFb074aB8Bde8bB7F776aBa0fFf)
- **Deployment Transaction:** [`0x5a12566aefd2bf5e560822ffa77772b11e9c1e8f713fc04e5d1e3f13b91b393e`](https://studio.genlayer.com/tx/0x5a12566aefd2bf5e560822ffa77772b11e9c1e8f713fc04e5d1e3f13b91b393e)
- **Deployment Consensus Status:** `ACCEPTED` (Consensus Finalized / Success, Round 0, 5/5 Validator Agreement)
- **CLI Toolchain:** `genlayer` 0.39.1, `genlayer-py` 0.16.3, `gltest` 0.29.2, `genvm-linter` 0.7.1
- **Live Studionet Results:** [studionet-execution-results.json](file:///c:/Users/9ytshade/Desktop/Genlayer%20Intelligent%20Contracts/critiqproof/scripts/studionet-execution-results.json)
- **Web App Stack:** Next.js 16.3.6 (Turbopack), React 19.2.8, Tailwind CSS 4, TypeScript, `genlayer-js` 1.1.8
- **Design System:** Dovetail Design Language (Carbon `#0a0a0a`, Graphite `#141414`, Iron `#1e1e1e`, Soft Indigo `#6798ff`)

---

## GenLayer Consensus Mechanics: Understanding "ACCEPTED"

In GenLayer's Equivalence Principle architecture, transactions undergo multi-validator Byzantine Fault Tolerant (BFT) voting:
- **`ACCEPTED`:** Represents canonical consensus finality and successful on-chain execution. The validator leader's proposed state change (contract deployment or method execution) passed voting by the independent validator committee (5 out of 5 validators voted `AGREE` in Round 0), committing the contract and state updates to the blockchain ledger.
- **`UNDETERMINED`:** Occurs during non-deterministic executions, network timeouts, or when validators cannot reach agreement. Prompts automated retry or appeal mechanics without slashing stakes.
- **`REJECTED`:** Occurs when execution fails substantive checks, violates security assertions, or provides fraudulent evidence.

---

## Core Issue Resolutions (v1.2.0 Upgrades)

### 1. Restoring Economic Liveness & Replay-Safe Terminal Recovery
- **Problem:** Critiques stuck in `undetermined` state due to persistent upstream network failures or deadlocks permanently locked reviewer stakes and prevented merchants from archiving listings or recovering uncommitted funds.
- **Solution:**
  - Added terminal states `STATUS_EXHAUSTED` and `OUTCOME_EXHAUSTED`.
  - Implemented `resolve_exhausted_critique(listing_id, critique_id)` callable by anyone after 5 retry attempts (`MAX_RETRY_ATTEMPTS`) or 3600 seconds (`EXHAUSTION_TIMEOUT_SECONDS`).
  - Safely returns 100% of reviewer stake without paying bounties and decrements `pending_review_count`, immediately unblocking merchant archival and 100% recovery of uncommitted escrow funds.
  - Fully replay-safe through atomic state transition to `STATUS_EXHAUSTED`.

### 2. Preventing Duplicate Economic Claims & Enforcing Reward Commitments
- **Problem:** Sybil or replay attackers could repeatedly collect bounties using previously verified and rewarded purchase evidence. In addition, listings could accept staked critiques even when the reward pool was depleted.
- **Solution:**
  - Added `rewarded_evidence: TreeMap[str, bool]` to permanently record evidence digests that have received a bounty payout.
  - Added `active_evidence: TreeMap[str, bool]` to block concurrent in-flight submissions with the exact same evidence.
  - Enforced reward pool solvency check in `submit_critique`: requires `available_reward >= reward_per_review`, reverting with `"Insufficient reward pool for advertised bounty"` if the pool cannot guarantee the payout.

### 3. Strengthening Verification & Slashing Integrity
- **Problem:** Reviewers could lose their stakes due to subjective quality disagreements, transient server errors (HTTP 5xx, timeouts), or generic documentation confusion.
- **Solution:**
  - Reviewer stake is slashed into the merchant reward pool **ONLY** upon proven fraud or forgery (`authenticity_result == RESULT_FAIL`).
  - If authenticity passes but subjective quality or custom rules fail, the bounty is withheld but 100% of the reviewer stake is refunded (slashing safeguard).
  - Transient HTTP codes (401, 403, 404, 410, 429, 5xx) and timeouts yield `UNDETERMINED` to prevent wrongful slashing.
  - The AI Magistrate prompt strictly distinguishes actual purchase or direct service-use evidence (e.g. invoices, order IDs, booking confirmations, payment receipts) from generic public documentation (e.g. GitHub READMEs, Wikipedia, marketing homepages).

### 4. Correcting Frontend Contract Integration & Live Precedence
- **Problem:** `get_listing_critiques` response format mismatch between array and object schemas caused parsing errors, and fallback demo data masked genuine on-chain state without indication.
- **Solution:**
  - Updated `genlayer.ts` with polymorphic parsing supporting both flat arrays (`list[dict]`) and enveloped records (`{ items: [...] }`).
  - Genuine on-chain records always take strict precedence over demo datasets. Empty on-chain listings or critiques render accurately as empty.
  - Introduced `isFallback` and `isRpcError` indicators with prominent UI warning banners on listing detail and portfolio views.
  - Added terminal recovery action buttons on exhausted critique cards allowing one-click stake recovery.
  - Created comprehensive Vitest integration suite (`contract-integration.test.ts`) covering all 11 integration requirements.

---

## On-Chain Lifecycle Architecture

```
[Merchant: create_listing]
  | (Deposit initial reward pool, define multi-proof types, categories & criteria)
  v
[Active Listing in Marketplace]
  |
  +--> [Merchant: fund_reward_pool] (Top up reward pool in native GEN)
  +--> [Merchant: archive_listing]  (Deactivate listing & refund 100% remaining uncommitted pool)
  |
  +--> [Reviewer: submit_critique]
        | (Locks economic stake >= min_stake, provides proof_url + rating)
        | (Checks pool solvency & blocks duplicate rewarded / active evidence)
        v
      [Critique Status: SUBMITTED]
        |
        +--> [Anyone: verify_critique]
        |     | (AI Magistrate executes Equivalence Principle consensus)
        |     |
        |     +--> [VERIFIED (100% Pass)]
        |     |     +-- Stake returned to Reviewer
        |     |     +-- Reward bounty paid to Reviewer
        |     |     +-- Evidence marked in rewarded_evidence
        |     |     +-- Listing Trust Score updated
        |     |     +-- Critique status -> verified
        |     |
        |     +--> [REJECTED (Fraud / Fake Proof)]
        |     |     +-- Authenticity FAIL
        |     |     +-- Stake slashed into Merchant Reward Pool
        |     |     +-- Critique status -> rejected
        |     |
        |     +--> [REJECTED (Quality / Custom Rule Fail Only)]
        |     |     +-- Authenticity PASS, Quality/Custom FAIL
        |     |     +-- Stake 100% refunded to Reviewer (Slashing Safeguard)
        |     |     +-- Zero bounty paid
        |     |     +-- Critique status -> rejected
        |     |
        |     +--> [UNDETERMINED (Transient Error / Timeout)]
        |           +-- Stake preserved in escrow
        |           +-- Retry cooldown enforced
        |           +-- Critique status -> undetermined
        |
        +--> [Anyone: resolve_exhausted_critique]
              | (Available after 5 retries or 3600s timeout)
              +-- Stake 100% refunded to Reviewer
              +-- Pending liability unlocked
              +-- Merchant archival unblocked
              +-- Critique status -> exhausted
```

---

## Studionet Verified Live Scenarios (v1.2.0 Lifecycle)

The live deployment was executed and verified on GenLayer Studionet across 4 comprehensive lifecycle scenarios:

| Scenario | Tx Hash | Result | Details |
|---|---|---|---|
| **Contract Deployment** | [`0x5a12566aefd2bf5e560822ffa77772b11e9c1e8f713fc04e5d1e3f13b91b393e`](https://studio.genlayer.com/tx/0x5a12566aefd2bf5e560822ffa77772b11e9c1e8f713fc04e5d1e3f13b91b393e) | ACCEPTED | Deployed contract `0x776773Cb27a43dFb074aB8Bde8bB7F776aBa0fFf` (v1.2.0) by `9ytshade_Deployer` |
| **Listing Creation #1** | [`0x36bdc41f7c7a9e32627d83f20e5d31740274c8f50048cb15dc4e62eff030d142`](https://studio.genlayer.com/tx/0x36bdc41f7c7a9e32627d83f20e5d31740274c8f50048cb15dc4e62eff030d142) | Finalized | Created Listing #1 (ProofPay Software Escrow Platform) with 0.1 GEN pool |
| **Authentic Receipt Submission** | [`0x036c77ea53c3f671f66e0a8ee9eef88d043e42f3b1e6305610adb071f8d9f9f3`](https://studio.genlayer.com/tx/0x036c77ea53c3f671f66e0a8ee9eef88d043e42f3b1e6305610adb071f8d9f9f3) | Finalized | Reviewer 1 submitted Critique #1 with invoice INV-2026-98124 and 0.01 GEN stake |
| **AI Magistrate Consensus** | [`0xbc54cd814e5f8e613779feb078471a353c53b10fe78d0b721cbb4ecfcc5b90d6`](https://studio.genlayer.com/tx/0xbc54cd814e5f8e613779feb078471a353c53b10fe78d0b721cbb4ecfcc5b90d6) | Finalized | Verdict #1: VERIFIED. All criteria passed. 0.02 GEN bounty paid, stake refunded, Trust Score 100% |
| **Duplicate Claim Rejection** | Reverted (On-Chain RPC Simulation) | Blocked | Attempted resubmission with rewarded invoice URL reverted; critique count unchanged (1) |
| **Archival Test Listing #2** | [`0xb7217da1c51571801c69ec93ec752cfe6eff1b26d3936cc6070801c13f763e49`](https://studio.genlayer.com/tx/0xb7217da1c51571801c69ec93ec752cfe6eff1b26d3936cc6070801c13f763e49) | Finalized | Created Listing #2 with 0.05 GEN pool |
| **Listing Archival & Full Refund** | [`0xe337d22f6b6473dea6b18110fe8fb63a3dcf3e737a4eedad66248068901b18bc`](https://studio.genlayer.com/tx/0xe337d22f6b6473dea6b18110fe8fb63a3dcf3e737a4eedad66248068901b18bc) | Finalized | Archived Listing #2; 100% of 0.05 GEN (50000000000000000 wei) escrow refunded |

---

## Directory Structure

```
critiqproof/
├── assets/
│   └── critiqproof-logo.svg    # Official high-resolution vector emblem
├── contracts/
│   └── critiqproof.py          # Intelligent Contract v1.2.0 (15 methods, recovery paths, slashing safeguards)
├── proofs/
│   └── order_receipt_2026.json # Authentic digital purchase invoice fixture
├── tests/
│   ├── conftest.py             # Pytest configuration & DirectContract fixtures
│   └── direct/
│       ├── test_critiqproof.py # Core direct mode test suite (17 tests)
│       ├── test_stresstest.py  # Adversarial multi-category stress test suite (9 tests)
│       └── test_issues_recovery_and_integrity.py # Recovery, duplicates & slashing integrity (9 tests)
├── scripts/
│   ├── run-studionet-v120-lifecycle.mjs # 4-scenario live Studionet runner
│   └── studionet-execution-results.json # Full receipt records from Studionet
├── docs/
│   ├── STUDIONET_LIVE_RUN_REPORT.md     # Deployment and consensus audit log
│   └── STRESSTEST_RUN_REPORT.md         # Adversarial stress test documentation
├── web/
│   ├── public/
│   │   ├── icon.svg            # Favicon emblem asset
│   │   └── logo.svg            # Full project logo asset
│   ├── src/
│   │   ├── app/                # Next.js 16 App Router pages
│   │   │   ├── icon.svg        # App Router icon
│   │   │   ├── page.tsx        # Marketplace directory, KPI stats & range filters
│   │   │   ├── listings/
│   │   │   │   ├── create/     # Register merchant listing with multi-category & proof chips
│   │   │   │   └── [id]/       # Listing detail, critiques, staking, verification, recovery
│   │   │   ├── portfolio/      # Reviewer stakes, recovered stakes & Merchant management
│   │   │   └── protocol/       # Protocol architecture & AI magistrate documentation
│   │   ├── components/         # UI components (modal, cards, wallet, header)
│   │   ├── lib/
│   │   │   ├── genlayer.ts     # genlayer-js client, contract calls, and detailed fetchers
│   │   │   ├── safety.ts       # Input validation, sanitization, and fallback datasets
│   │   │   ├── tx-waiter.ts    # Polling transaction waiter verifying confirmed finality
│   │   │   ├── use-wallet.tsx  # Centralized WalletProvider and useWallet hook
│   │   │   ├── contract-integration.test.ts # Vitest frontend contract integration tests (11 tests)
│   │   │   ├── critical-flows.test.ts       # Vitest critical flow tests (5 tests)
│   │   │   ├── safety.test.ts               # Vitest safety and validation tests (8 tests)
│   │   │   └── wallet.test.ts               # Vitest wallet state tests (4 tests)
│   │   └── types/              # TypeScript schemas for listings, critiques, verdicts
│   ├── package.json
│   ├── tsconfig.json
│   └── next.config.ts
├── package.json
└── README.md
```

---

## Running Verification Checks

### Web Application Suite (`web/`)

```bash
cd web
npm install

# Run complete verification (Vitest tests, ESLint, Next.js build)
npm run check
```

### Contract Direct Mode Suite (`critiqproof/`)

```bash
# Run all 35 direct mode unit, stress, and recovery tests
python -m pytest tests/direct -v
```
