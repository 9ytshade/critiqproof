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
- **Contract Address:** [`0x2a83a70B4427240b0C56ec7F07A98bFba67eB704`](https://studio.genlayer.com/address/0x2a83a70B4427240b0C56ec7F07A98bFba67eB704)
- **Deployment Transaction:** [`0xcb59729627d983455197fffd388d4e0a795519687b8146384e862beaf34314e1`](https://studio.genlayer.com/tx/0xcb59729627d983455197fffd388d4e0a795519687b8146384e862beaf34314e1)
- **Deployment Consensus Status:** `ACCEPTED` (Round 0, Finalized)
- **CLI Toolchain:** `genlayer` 0.39.1, `genlayer-py` 0.16.3, `gltest` 0.29.2, `genvm-linter` 0.7.1
- **Live Studionet Results:** [studionet-execution-results.json](file:///c:/Users/9ytshade/Desktop/Genlayer%20Intelligent%20Contracts/critiqproof/scripts/studionet-execution-results.json)
- **Web App Stack:** Next.js 16.3.6 (Turbopack), React 19.2.8, Tailwind CSS 4, TypeScript, `genlayer-js` 1.1.8
- **Design System:** Dovetail Design Language (Carbon `#0a0a0a`, Graphite `#141414`, Iron `#1e1e1e`, Soft Indigo `#6798ff`)

---

## Core Issue Resolutions (v1.2.0 Upgrades)

### 1. Restoring Economic Liveness & Replay-Safe Terminal Recovery
- **Problem:** Critiques stuck in `undetermined` state due to persistent upstream network failures or deadlocks permanently locked reviewer stakes and prevented merchants from archiving listings or recovering uncommitted funds.
- **Solution:**
  - Added terminal states `STATUS_EXHAUSTED` and `OUTCOME_EXHAUSTED`.
  - Implemented `resolve_exhausted_critique(listing_id, critique_id)` callable by anyone after 5 retry attempts (`MAX_VERIFICATION_ATTEMPTS`) or 3600 seconds (`EXHAUSTION_TIMEOUT_SECS`).
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
| **Contract Deployment** | `0xcb59729627d983455197fffd388d4e0a795519687b8146384e862beaf34314e1` | ACCEPTED | Deployed contract `0x2a83a70B4427240b0C56ec7F07A98bFba67eB704` (v1.2.0) |
| **Listing Creation #1** | `0x7228257307dcd79aa8320ca130a11ebb066362435782a91913d6f8bdf3b28984` | Finalized | Created Listing #1 (ProofPay Software Escrow Platform) with 0.1 GEN pool |
| **Authentic Receipt Submission** | `0xe7310fb34e63c663bf0093949305ac246399e12bb9bf5337159f62f7d7bbdc63` | Finalized | Submitted Critique #5 with invoice INV-2026-98124 and 0.01 GEN stake |
| **AI Magistrate Consensus** | `0x02e9406336329a135ad2188f25d91103dbd3ac1bdceca27371a1f3f5eaac4c5b` | Finalized | Verdict #4: VERIFIED. All 4 criteria passed. 0.02 GEN bounty paid, stake refunded |
| **Duplicate Claim Rejection** | Reverted (On-Chain RPC Simulation) | Blocked | Attempted resubmission with rewarded invoice URL reverted; critique count unchanged |
| **Archival Test Listing #2** | `0x899eddcc7a9cfdc5e1f4cf889d720948d308f0957245e96b586caa29fd7b9cab` | Finalized | Created Listing #2 with 0.05 GEN pool |
| **Listing Archival & Full Refund** | `0x7d3bf1048f4a0369c59c2570e4e7f36c7370f33c95283fe4c5d973320053ca82` | Finalized | Archived Listing #2; 100% of 0.05 GEN (50000000000000000 wei) escrow refunded |

---

## Directory Structure

```
critiqproof/
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
│   ├── src/
│   │   ├── app/                # Next.js 16 App Router pages
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
