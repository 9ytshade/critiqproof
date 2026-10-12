# CritiqProof

**CritiqProof** is a decentralized, staked consumer review marketplace and AI verification oracle powered by GenLayer Intelligent Contracts.

In traditional e-commerce and review aggregators, reviews suffer from fake consumer spam, paid bot astroturfing, and unverified complaints. CritiqProof solves this by requiring reviewers to lock an anti-Sybil economic stake alongside authentic digital purchase evidence (receipts, booking confirmations, invoice IDs, or transaction proofs).

GenLayer validators run an autonomous **AI Magistrate** under the Equivalence Principle to fetch and inspect the evidence URL against merchant-defined criteria:
- **Verified Authentic:** Stake is 100% returned, review becomes on-chain immutable, reviewer earns a merchant reward bounty in native GEN, and merchant Trust Score is updated.
- **Fraudulent / Dead Proof:** Review is rejected, review text is discarded, and the reviewer stake is permanently slashed into the merchant reward pool to compensate the merchant.
- **Undetermined / Inconclusive:** Stake is safely refunded with zero bounty, and no score alteration occurs.

---

## Live Studionet Deployment & Toolchain

- **Contract Version:** `1.1.0` (Production Security Hardened)
- **Network:** GenLayer Studionet (Chain ID: `61999`, RPC: `https://studio.genlayer.com/api`)
- **Contract Address:** [`0x888371B010c3A012A4c60e61b90c4EEC4Aa8304C`](https://studio.genlayer.com/address/0x888371B010c3A012A4c60e61b90c4EEC4Aa8304C)
- **Deployment Transaction:** [`0x79b46620222e61e34e15bc7a91e899ceabeb487f61fc92b37ae48e00ba1091cb`](https://studio.genlayer.com/tx/0x79b46620222e61e34e15bc7a91e899ceabeb487f61fc92b37ae48e00ba1091cb)
- **Deployment Consensus Status:** `ACCEPTED` (Round 0, Finalized)
- **CLI Toolchain:** `genlayer` 0.39.1, `genlayer-py` 0.16.3, `gltest` 0.29.2, `genvm-linter` 0.7.1
- **Live Run Report:** [STUDIONET_LIVE_RUN_REPORT.md](docs/STUDIONET_LIVE_RUN_REPORT.md)
- **Stress Test Report:** [STRESSTEST_RUN_REPORT.md](docs/STRESSTEST_RUN_REPORT.md)
- **Web App Stack:** Next.js 16.3.6 (Turbopack), React 19.2.8, Tailwind CSS 4, TypeScript, `genlayer-js` 1.1.8
- **Design System:** Dovetail Design Language (Carbon `#0a0a0a`, Graphite `#141414`, Iron `#1e1e1e`, Soft Indigo `#6798ff`)

---

## Key Features & Invariant Defenses

1. **Anti-SSRF URL Validation:**
   - Strict hostname verification blocks private IPs, loopback interfaces (`127.0.0.1`), metadata endpoints (`169.254.169.254`), and non-standard ports.

2. **Substantive Validator Consensus:**
   - Validators independently evaluate and agree on each individual acceptance criterion. 100% criterion pass rate required for authentic status.

3. **Prompt Injection Quarantine:**
   - External evidence and user-supplied descriptions are isolated in XML enclosures with sanitization to prevent AI prompt hijacking.

4. **Committed Escrow Liability Protection:**
   - Merchants cannot front-run or drain reward pools while reviews are pending adjudication (`pending_review_count * reward_per_review` locked).

5. **Multi-Select Expected Proof Evidence:**
   - Listing creators can accept multiple evidence types simultaneously: `receipt`, `order_id`, `invoice`, `booking`, `subscription`, `contract`, `delivery_note`, and `other`.

6. **12-Industry Taxonomy & Multi-Category Tagging:**
   - Comprehensive tagging across 12 sectors (SaaS, E-Commerce, Web3, AI/ML, Travel, Electronics, Agencies, EdTech, Logistics, FinTech, Health, Gaming).

7. **Advanced Marketplace Filters:**
   - Real-time filtering by Reward Pool range, Reward per Review range, and Required Stake range in native GEN.

8. **Unified Web3 Wallet Provider & Hard Reset:**
   - Centralized `WalletProvider` automatically purges in-memory state and triggers clean page refreshes on account switching or wallet disconnection.

---

## On-Chain Lifecycle Architecture

```
[Merchant: create_listing]
  | (Deposit initial reward pool, define multi-proof types, categories & criteria)
  v
[Active Listing in Marketplace]
  |
  +--> [Merchant: fund_reward_pool] (Top up reward pool in native GEN)
  +--> [Merchant: archive_listing]  (Deactivate listing & refund 100% remaining pool)
  |
  +--> [Reviewer: submit_critique]
        | (Locks economic stake >= min_stake, provides proof_url + rating)
        v
      [Critique Status: SUBMITTED]
        |
        +--> [Anyone: verify_critique]
              | (AI Magistrate executes Equivalence Principle consensus)
              |
              +--> [VERIFIED]
              |     +-- Stake returned to Reviewer
              |     +-- Reward bounty paid to Reviewer
              |     +-- Listing Trust Score updated
              |     +-- Critique status -> verified
              |
              +--> [REJECTED]
              |     +-- Stake slashed into Merchant Reward Pool
              |     +-- Critique status -> rejected
              |
              +--> [UNDETERMINED]
                    +-- Stake preserved in contract (no slashing)
                    +-- 300s retry cooldown enforced
                    +-- Critique status -> undetermined
```

---

## Studionet Verified Live Scenarios

The live deployment was verified on GenLayer Studionet:

| Scenario | Tx Hash | Result | Details |
|---|---|---|---|
| **Contract Deployment** | `0x79b46620222e61e34e15bc7a91e899ceabeb487f61fc92b37ae48e00ba1091cb` | ACCEPTED | Deployed contract `0x888371B010c3A012A4c60e61b90c4EEC4Aa8304C` |
| **Listing Creation #1** | `0xf90205f41bb2df6a0b2d6a782bca8a649646b97b0a701a52ba936a7ee793315a` | Finalized | Created Listing #1 with multi-category and multi-proof configuration |
| **Archival & Refund** | `0x6582321dfdd94b9aa1ef7cb9983995eb04b40fbbd0c5a31bdf7e3355097feef0` | Finalized | Created & archived Listing #2, 100% of 0.05 GEN escrow refunded |
| **Authentic Review** | `0x664677d1ce54f3b53aee25c7e3f886f671bb4884c7ef39088616194ddb6564e9` | Finalized | AI Magistrate verified live GitHub proof; 0.01 GEN stake returned + 0.02 GEN bounty paid |
| **Fraudulent 404 Slashing** | `0xa2ca19463990664e1c20c0ddfc3fe10f6350ffddce3b4eef26f30d0728c89163` | Finalized | AI Magistrate detected HTTP 404 on dead URL; 0.015 GEN stake slashed into merchant pool |

---

## Directory Structure

```
critiqproof/
├── contracts/
│   └── critiqproof.py          # Intelligent Contract (14 methods, equivalence principle, SSRF defenses)
├── tests/
│   ├── conftest.py             # Pytest configuration & DirectContract fixtures
│   └── direct/
│       ├── test_critiqproof.py # Core direct mode test suite (17 tests)
│       └── test_stresstest.py  # Adversarial multi-category stress test suite (9 tests)
├── scripts/
│   ├── deploy-studionet.py     # Deploys contract to GenLayer Studionet
│   ├── broadcast-scenarios.py  # 3-wallet multi-scenario live runner
│   └── studionet-execution-results.json # Full receipt records from Studionet
├── docs/
│   ├── STUDIONET_LIVE_RUN_REPORT.md    # Complete deployment and consensus audit log
│   └── STRESSTEST_RUN_REPORT.md        # Adversarial stress test documentation
├── web/
│   ├── src/
│   │   ├── app/                # Next.js 16 App Router pages
│   │   │   ├── page.tsx        # Marketplace directory, KPI stats & range filters
│   │   │   ├── listings/
│   │   │   │   ├── create/     # Register merchant listing with multi-category & proof chips
│   │   │   │   └── [id]/       # Listing detail, critiques, staking, verification
│   │   │   ├── portfolio/      # Reviewer stakes & Merchant listings management
│   │   │   └── protocol/       # Protocol architecture & AI magistrate documentation
│   │   ├── components/         # Production UI components (modal, cards, wallet, header)
│   │   ├── lib/
│   │   │   ├── genlayer.ts     # genlayer-js client, contract calls, and fallback logic
│   │   │   ├── safety.ts       # Input validation, sanitization, and fallback datasets
│   │   │   ├── tx-waiter.ts    # Polling transaction waiter verifying confirmed finality
│   │   │   ├── use-wallet.tsx  # Centralized WalletProvider and useWallet hook
│   │   │   ├── critical-flows.test.ts # Vitest critical flow tests
│   │   │   ├── safety.test.ts  # Vitest safety and validation tests
│   │   │   └── wallet.test.ts  # Vitest wallet state and account switching tests
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
# Run all 26 direct mode unit and stress tests
pytest tests/direct -v
```
