"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  CRITIQPROOF_CONTRACT_ADDRESS,
  STUDIONET_CHAIN_ID,
  STUDIONET_RPC,
} from "@/lib/genlayer";
import {
  CheckCircleIcon,
  XCircleIcon,
} from "@/components/icons";

const protocolSections = [
  { id: "model", label: "01. Staked Consumer Oracle & Anti-Sybil Model" },
  { id: "lifecycle", label: "02. Critique Lifecycle State Machine" },
  { id: "math", label: "03. Dynamic Trust Score & Settlement Math" },
  { id: "consensus", label: "04. Validator Consensus & Equivalence Principle" },
  { id: "evidence", label: "05. Evidence Fault Tolerance & HTTP Errors" },
  { id: "invariants", label: "06. Cryptographic Security Invariants" },
  { id: "deployment", label: "07. Live Studionet Deployment & Specs" },
  { id: "roadmap", label: "08. Future Protocol Roadmap & Photo Evidence" },
];

export default function ProtocolArchitecturePage() {
  const [activeSection, setActiveSection] = useState<string>("model");

  useEffect(() => {
    const sectionIds = protocolSections.map((s) => s.id);
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 160;
      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const element = document.getElementById(sectionIds[i]);
        if (element) {
          const top = element.offsetTop;
          if (scrollPosition >= top) {
            setActiveSection(sectionIds[i]);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="max-w-[1300px] mx-auto space-y-12 pb-16">
      {/* Protocol Header */}
      <header className="border-b border-[var(--color-iron)] pb-12 pt-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-carbon)] border border-[var(--color-iron)] text-[11px] font-mono text-[var(--color-fog)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
              <span>CRITIQPROOF / STAKED CONSUMER ORACLE &amp; EQUIVALENCE CONSENSUS</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-medium text-[var(--color-paper)] tracking-[-0.022em] leading-tight">
              Decentralized consumer critique verification, purchase authenticity enforcement, and cryptographic review economics.
            </h1>
            <p className="text-[16px] text-[var(--color-fog)] leading-relaxed max-w-3xl">
              The complete on-chain specification, mathematical formulation, and validator consensus mechanisms governing CritiqProof v1.2.0 on GenLayer: how merchants post criteria-governed listings, how reviewers lock anti-sybil stakes, how validator magistrates fetch public HTTPS proof nondeterministically, and how truth-aligned financial settlements execute under the Equivalence Principle.
            </p>
          </div>

          <aside className="lg:col-span-4 p-5 rounded-[12px] bg-[var(--color-graphite)] border border-[var(--color-iron)] space-y-3.5 shadow-sm">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-ash)] block">
              Protocol In One Sentence
            </span>
            <p className="text-[15px] text-[var(--color-paper)] font-medium leading-snug">
              Skin-in-the-game consumer critique verification where GenLayer AI magistrates audit public purchase evidence and settle reward bounties autonomously.
            </p>
            <div className="pt-2 border-t border-[var(--color-iron)] font-mono text-[11px] text-[var(--color-fog)] space-y-1.5">
              <div className="flex justify-between">
                <span>Contract Version:</span>
                <span className="text-[var(--color-accent)] font-semibold">1.2.0 (GenVM Intelligent Contract)</span>
              </div>
              <div className="flex justify-between">
                <span>Consensus Engine:</span>
                <span className="text-[var(--color-paper)] font-semibold">Equivalence Principle</span>
              </div>
              <div className="flex justify-between">
                <span>Target Network:</span>
                <span className="text-[var(--color-accent)] font-semibold">GenLayer Studionet (61999)</span>
              </div>
              <div className="flex justify-between">
                <span>Architect &amp; Creator:</span>
                <span className="text-[var(--color-accent)] font-semibold">9ytshade</span>
              </div>
            </div>
          </aside>
        </div>
      </header>

      {/* Main Content Layout with Sticky Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Navigation Table of Contents (3 cols, sticky) */}
        <aside className="hidden lg:block lg:col-span-3 sticky top-24 space-y-4">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--color-ash)] block">
            Table of Contents
          </span>
          <nav className="flex flex-col space-y-1 text-[13px] border-l border-[var(--color-iron)] pl-3.5">
            {protocolSections.map((s) => {
              const isActive = activeSection === s.id;
              return (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className={`text-[13px] py-1.5 leading-snug transition-all flex items-center ${
                    isActive
                      ? "text-[#6798ff] font-medium border-l-2 border-[#6798ff] pl-3 -ml-[15px] bg-[#6798ff]/10 rounded-r"
                      : "text-[var(--color-fog)] hover:text-[#ffffff] pl-0"
                  }`}
                >
                  <span>{s.label}</span>
                </a>
              );
            })}
          </nav>
        </aside>

        {/* Deep Dive Content Sections (9 cols) */}
        <div className="lg:col-span-9 space-y-16">
          {/* Section 01: The Model */}
          <section id="model" className="space-y-6 scroll-mt-24">
            <div className="border-b border-[var(--color-iron)] pb-3">
              <span className="text-[11px] font-mono text-[var(--color-accent)] block mb-1">01 / ARCHITECTURE</span>
              <h2 className="text-2xl font-medium text-[var(--color-paper)] tracking-tight">
                The Staked Consumer Oracle &amp; Anti-Sybil Economic Model
              </h2>
            </div>
            <p className="text-[14px] text-[var(--color-fog)] leading-relaxed">
              Traditional online commerce reviews are fundamentally broken. Centralized platforms suffer from astroturfing, incentivized 5-star farming, and zero-cost competitor sabotage. Because submitting a review carries zero economic friction and zero verifiable accountability, spam dominates. CritiqProof solves this by transforming subjective consumer reviews into an on-chain, staked oracle mechanism.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="card-box bg-[var(--color-graphite)] p-5 space-y-3 border-l-2 border-l-[#eb5757]">
                <div className="flex items-center gap-2">
                  <XCircleIcon className="w-4 h-4 text-[#eb5757]" />
                  <h3 className="text-[16px] font-medium text-[var(--color-paper)]">Legacy Review Platforms</h3>
                </div>
                <p className="text-[13px] text-[var(--color-fog)] leading-relaxed">
                  Zero economic commitment required. Anyone can generate thousands of bot reviews or paid competitor attacks. Platform gatekeepers secretly censor negative feedback for paying advertisers, destroying consumer confidence.
                </p>
              </div>

              <div className="card-box bg-[var(--color-graphite)] p-5 space-y-3 border-l-2 border-l-[var(--color-accent)]">
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-[var(--color-accent)]" />
                  <h3 className="text-[16px] font-medium text-[var(--color-paper)]">CritiqProof Staked Oracle</h3>
                </div>
                <p className="text-[13px] text-[var(--color-fog)] leading-relaxed">
                  Reviewers must stake native GEN collateral. GenLayer validator magistrates fetch the public purchase evidence nondeterministically and verify authenticity. Authentic reviews earn merchant bounties and full stake returns; fraudulent reviews are slashed.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="card-box bg-[var(--color-graphite)] p-5 space-y-2">
                <span className="text-[11px] font-mono text-[var(--color-accent)]">PARTY A</span>
                <h3 className="text-[15px] font-medium text-[var(--color-paper)]">The Merchant / Creator</h3>
                <p className="text-[12px] text-[var(--color-fog)] leading-relaxed">
                  Publishes a listing with specific accepted proof evidence types (receipts, invoices, orders), multi-category tags, custom criteria, and locks a GEN reward pool to incentivize authentic reviews.
                </p>
              </div>

              <div className="card-box bg-[var(--color-graphite)] p-5 space-y-2">
                <span className="text-[11px] font-mono text-[#27a644]">PARTY B</span>
                <h3 className="text-[15px] font-medium text-[var(--color-paper)]">The Consumer Reviewer</h3>
                <p className="text-[12px] text-[var(--color-fog)] leading-relaxed">
                  Stakes native GEN to prove skin-in-the-game, submits detailed critique text and rating, and provides a public HTTPS evidence URL matching the listing&apos;s accepted proof types.
                </p>
              </div>

              <div className="card-box bg-[var(--color-graphite)] p-5 space-y-2">
                <span className="text-[11px] font-mono text-[#6798ff]">PARTY C</span>
                <h3 className="text-[15px] font-medium text-[var(--color-paper)]">Validator Jury</h3>
                <p className="text-[12px] text-[var(--color-fog)] leading-relaxed">
                  Independent GenLayer nodes execute non-deterministic HTTP requests to fetch external proof, audit evidence against merchant criteria, and execute trust score updates and token transfers under the Equivalence Principle.
                </p>
              </div>
            </div>
          </section>

          {/* Section 02: Critique Lifecycle State Machine */}
          <section id="lifecycle" className="space-y-6 scroll-mt-24">
            <div className="border-b border-[var(--color-iron)] pb-3">
              <span className="text-[11px] font-mono text-[var(--color-accent)] block mb-1">02 / PROTOCOL FLOW</span>
              <h2 className="text-2xl font-medium text-[var(--color-paper)] tracking-tight">
                Critique Lifecycle State Machine
              </h2>
            </div>

            <p className="text-[14px] text-[var(--color-fog)] leading-relaxed">
              Every critique progresses through a strict, deterministic on-chain lifecycle. State transitions are governed by cryptographic assertions and multi-validator consensus:
            </p>

            {/* ASCII State Machine Diagram with Mobile Horizontal Scroll Support */}
            <div className="card-box bg-[var(--color-carbon)] p-4 sm:p-6 font-mono text-[11px] sm:text-[12px] text-[var(--color-paper)] border border-[var(--color-iron)] overflow-x-auto">
              <div className="block sm:hidden text-[10px] font-mono text-[var(--color-accent)] mb-2">
                &larr; Scroll horizontally to inspect full lifecycle flow &rarr;
              </div>
              <div className="min-w-[700px]">
                <pre className="leading-relaxed select-all">
{`+-----------------------------------------------------------------------------------+
|                           CRITIQPROOF LIFECYCLE FLOW                              |
+-----------------------------------------------------------------------------------+

 [ MERCHANT ]                                              [ REVIEWER ]
      |                                                         |
      | 1. create_listing(bounty, stake, proof_types, criteria) |
      |    Lock initial GEN reward pool in contract             |
      v                                                         |
+--------------------------+                                    |
|   LISTING: active        |                                    |
+--------------------------+                                    |
      |                                                         |
      |                                2. submit_critique()     |
      |                                   Lock required stake   |
      |                                   Provide HTTPS proof   |
      |                                                         v
      |                                            +---------------------------+
      |                                            | CRITIQUE: submitted       |
      |                                            +---------------------------+
      |                                                         |
      |             3. verify_critique(listing_id, critique_id) |
      |                Triggered on-chain via GenVM             |
      |                                                         v
      |                                            +---------------------------+
      |                                            | GENLAYER VALIDATOR JURY   |
      |                                            | gl.nondet.web.get(proof)  |
      |                                            | AI Multi-Node Audit       |
      |                                            +---------------------------+
      |                                                         |
      +----------------------------+----------------------------+
                                   |
                +------------------+------------------+
                |                                     |
       [ 100% PASS CRITERIA ]               [ FAIL OR 404 FRAUD ]
                |                                     |
                v                                     v
+-------------------------------+   +-------------------------------+
| CRITIQUE: verified            |   | CRITIQUE: rejected            |
| - Stake returned to reviewer  |   | - Reviewer stake slashed      |
| - Bounty paid from pool       |   | - Slashed stake added to pool |
| - Trust score updated         |   | - Zero bounty paid            |
+-------------------------------+   +-------------------------------+
                                                      |
                                            [ HTTP 5xx SERVER ERROR ]
                                                      |
                                                      v
                                    +-------------------------------+
                                    | CRITIQUE: undetermined        |
                                    | - Stake safely preserved      |
                                    | - Re-evaluation permitted     |
                                    +-------------------------------+`}
                </pre>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div className="card-box p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded bg-[var(--color-carbon)] border border-[var(--color-iron)] font-mono text-[11px] text-[var(--color-accent)]">
                    PHASE 1
                  </span>
                  <h4 className="font-medium text-[15px] text-[var(--color-paper)]">
                    Listing Creation &amp; Escrow Deposit (`create_listing`)
                  </h4>
                </div>
                <p className="text-[13px] text-[var(--color-fog)] leading-relaxed">
                  The merchant publishes their product or service profile, setting the per-review bounty, required reviewer stake, multi-choice categories (from 12 taxonomy domains), multi-choice accepted proof types (receipts, orders, invoices, bookings, contracts), and custom verification rules. The merchant deposits an initial GEN reward pool into escrow.
                </p>
              </div>

              <div className="card-box p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded bg-[var(--color-carbon)] border border-[var(--color-iron)] font-mono text-[11px] text-[#27a644]">
                    PHASE 2
                  </span>
                  <h4 className="font-medium text-[15px] text-[var(--color-paper)]">
                    Staked Submission &amp; Evidence Ingestion (`submit_critique`)
                  </h4>
                </div>
                <p className="text-[13px] text-[var(--color-fog)] leading-relaxed">
                  Any consumer can submit a critique by staking native GEN equal to or greater than <code className="font-mono">min_stake</code>. The reviewer provides rating (1-5), substantive review text, and a public HTTPS proof URL (e.g. receipt photo, order confirmation, invoice permalink). The stake is locked into contract custody, creating economic deterrence against spam.
                </p>
              </div>

              <div className="card-box p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded bg-[var(--color-carbon)] border border-[var(--color-iron)] font-mono text-[11px] text-[#6798ff]">
                    PHASE 3
                  </span>
                  <h4 className="font-medium text-[15px] text-[var(--color-paper)]">
                    AI Magistrate Consensus &amp; Settlement (`verify_critique`)
                  </h4>
                </div>
                <p className="text-[13px] text-[var(--color-fog)] leading-relaxed">
                  GenLayer validator nodes independently fetch the proof URL, parse raw evidence body, and audit against both universal rules (authenticity, coherence) and merchant custom criteria.
                  <br />
                  &bull; <strong>VERIFIED (100% Pass):</strong> The reviewer receives their full stake back plus the merchant reward bounty (<code className="font-mono text-[#27a644]">reward_per_review</code>). The evidence is permanently indexed to prevent duplicate claims, and the merchant trust score recalculates dynamically.
                  <br />
                  &bull; <strong>REJECTED (Fraud / Fake Proof):</strong> The reviewer stake is slashed and forfeited into the merchant reward pool only when authenticity fails. Zero bounty is paid.
                  <br />
                  &bull; <strong>REJECTED (Subjective Quality / Custom Rule Failure Only):</strong> When purchase evidence is authentic but review quality or custom criteria fail, the bounty is denied, but 100% of the reviewer stake is refunded (Slashing Safeguard).
                  <br />
                  &bull; <strong>UNDETERMINED (Server Outage / Timeout):</strong> No slashing occurs; funds remain safe in contract escrow for re-verification once the host recovers.
                </p>
              </div>

              <div className="card-box p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded bg-[var(--color-carbon)] border border-[var(--color-iron)] font-mono text-[11px] text-[#f59e0b]">
                    PHASE 4
                  </span>
                  <h4 className="font-medium text-[15px] text-[var(--color-paper)]">
                    Terminal Recovery &amp; Economic Liveness (`resolve_exhausted_critique`)
                  </h4>
                </div>
                <p className="text-[13px] text-[var(--color-fog)] leading-relaxed">
                  If upstream networks or hosts experience persistent outages exceeding 5 retries or 3600 seconds, anyone can trigger terminal recovery. The reviewer receives 100% of their locked stake back, the critique transitions to terminal status `exhausted`, and pending liability is released, immediately unblocking merchant archival and recovery of uncommitted escrow funds.
                </p>
              </div>
            </div>
          </section>

          {/* Section 03: Mathematical Formulation */}
          <section id="math" className="space-y-6 scroll-mt-24">
            <div className="border-b border-[var(--color-iron)] pb-3">
              <span className="text-[11px] font-mono text-[var(--color-accent)] block mb-1">03 / MATHEMATICAL FORMULATION</span>
              <h2 className="text-2xl font-medium text-[var(--color-paper)] tracking-tight">
                Dynamic Trust Score &amp; Continuous Settlement Mathematics
              </h2>
            </div>

            <p className="text-[14px] text-[var(--color-fog)] leading-relaxed">
              Unlike static star averages that can be manipulated by high-volume 5-star spam, CritiqProof computes an on-chain Dynamic Trust Score and enforces strict mathematical solvency across all token transfers:
            </p>

            {/* Formula Block 1 */}
            <div className="card-box bg-[var(--color-carbon)] p-6 space-y-3 border border-[var(--color-iron)]">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-ash)] block">
                Formula 1: Verified Reviewer Payout Execution
              </span>
              <div className="p-4 rounded-[6px] bg-[var(--color-graphite)] border border-[var(--color-iron)] font-mono text-[13px] text-[var(--color-paper)] space-y-2">
                <div>reviewer_disbursement = critique.stake_amount + listing.reward_per_review</div>
                <div>listing.reward_pool_next = listing.reward_pool - listing.reward_per_review</div>
                <div className="text-[11px] text-[var(--color-fog)] pt-1">
                  Condition: Requires outcome == VERIFIED and listing.reward_pool &ge; listing.reward_per_review.
                </div>
              </div>
            </div>

            {/* Formula Block 2 */}
            <div className="card-box bg-[var(--color-carbon)] p-6 space-y-3 border border-[var(--color-iron)]">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-ash)] block">
                Formula 2: Sybil Slashing &amp; Pool Restitution
              </span>
              <div className="p-4 rounded-[6px] bg-[var(--color-graphite)] border border-[var(--color-iron)] font-mono text-[13px] text-[var(--color-paper)] space-y-2">
                <div>slashed_amount = critique.stake_amount</div>
                <div>listing.reward_pool_next = listing.reward_pool + slashed_amount</div>
                <div>reviewer_disbursement = 0 (Total forfeiture of dishonest stake)</div>
                <div className="text-[11px] text-[var(--color-fog)] pt-1">
                  Invariant: Slashed collateral directly recapitalizes the merchant pool, funding future legitimate audits.
                </div>
              </div>
            </div>

            {/* Formula Block 3 */}
            <div className="card-box bg-[var(--color-carbon)] p-6 space-y-3 border border-[var(--color-iron)]">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-ash)] block">
                Formula 3: Dynamic Trust Score Calculation
              </span>
              <div className="p-4 rounded-[6px] bg-[var(--color-graphite)] border border-[var(--color-iron)] font-mono text-[13px] text-[var(--color-paper)] space-y-2">
                <div>trust_score = ⌊ (verified_count &times; 100) / review_count ⌋</div>
                <div>average_rating = (total_rating_points / verified_count)</div>
                <div className="text-[11px] text-[var(--color-fog)] pt-1">
                  Range: 0% to 100%. Fraudulent submissions increase review_count without increasing verified_count, driving down merchant trust score.
                </div>
              </div>
            </div>

            {/* Practical Numerical Examples */}
            <div className="card-box space-y-4">
              <h3 className="font-medium text-[15px] text-[var(--color-paper)]">
                Concrete Settlement Examples in Production
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                <div className="p-4 rounded-[8px] bg-[var(--color-carbon)] border border-[var(--color-iron)] space-y-2">
                  <span className="text-[#27a644] font-semibold block text-[11px]">CASE A: VERIFIED HONEST CRITIQUE</span>
                  <p className="text-[var(--color-fog)] font-sans">
                    Consumer staked 0.01 GEN with genuine order invoice receipt. All criteria PASS.
                  </p>
                  <div className="pt-2 border-t border-[var(--color-iron)] space-y-1">
                    <div>Stake Returned: <span className="text-[var(--color-paper)]">0.010 GEN</span></div>
                    <div>Review Bounty: <span className="text-[#27a644]">+0.020 GEN</span></div>
                    <div>Total Payout: <span className="text-[#27a644]">0.030 GEN</span></div>
                    <div>Pool Deducted: <span className="text-[var(--color-fog)]">-0.020 GEN</span></div>
                  </div>
                </div>

                <div className="p-4 rounded-[8px] bg-[var(--color-carbon)] border border-[var(--color-iron)] space-y-2">
                  <span className="text-[#eb5757] font-semibold block text-[11px]">CASE B: FAKE INVOICE / 404 URL</span>
                  <p className="text-[var(--color-fog)] font-sans">
                    Sybil bot staked 0.015 GEN with broken link or fabricated PDF receipt. Criteria FAIL.
                  </p>
                  <div className="pt-2 border-t border-[var(--color-iron)] space-y-1">
                    <div>Stake Returned: <span className="text-[#eb5757]">0.000 GEN</span></div>
                    <div>Review Bounty: <span className="text-[#eb5757]">0.000 GEN</span></div>
                    <div>Slashed to Pool: <span className="text-[#27a644]">+0.015 GEN</span></div>
                    <div>Outcome: <span className="text-[#eb5757]">REJECTED &amp; Slashed</span></div>
                  </div>
                </div>

                <div className="p-4 rounded-[8px] bg-[var(--color-carbon)] border border-[var(--color-iron)] space-y-2">
                  <span className="text-[var(--color-accent)] font-semibold block text-[11px]">CASE C: TRANSIENT SERVER OUTAGE</span>
                  <p className="text-[var(--color-fog)] font-sans">
                    Host returns HTTP 503 Service Unavailable during validator audit round.
                  </p>
                  <div className="pt-2 border-t border-[var(--color-iron)] space-y-1">
                    <div>Stake Returned: <span className="text-[var(--color-paper)]">Preserved in Escrow</span></div>
                    <div>Review Bounty: <span className="text-[var(--color-fog)]">0.000 GEN</span></div>
                    <div>Slashed to Pool: <span className="text-[var(--color-fog)]">0.000 GEN</span></div>
                    <div>Status: <span className="text-[var(--color-accent)]">UNDETERMINED (Safe)</span></div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 04: Validators & Equivalence Principle */}
          <section id="consensus" className="space-y-6 scroll-mt-24">
            <div className="border-b border-[var(--color-iron)] pb-3">
              <span className="text-[11px] font-mono text-[var(--color-accent)] block mb-1">04 / CONSENSUS ENGINE</span>
              <h2 className="text-2xl font-medium text-[var(--color-paper)] tracking-tight">
                Validator Consensus &amp; The Equivalence Principle
              </h2>
            </div>

            <p className="text-[14px] text-[var(--color-fog)] leading-relaxed">
              CritiqProof operates natively on GenLayer. It does not rely on centralized off-chain server cron jobs or trusted third-party oracle bridges. The verification logic executes directly inside GenVM Intelligent Contracts under the <strong>Equivalence Principle</strong>:
            </p>

            <div className="space-y-4">
              <div className="card-box space-y-2">
                <h4 className="font-medium text-[15px] text-[var(--color-paper)]">
                  1. Non-Deterministic Evidence Fetching (`gl.nondet.web.get`)
                </h4>
                <p className="text-[13px] text-[var(--color-fog)] leading-relaxed">
                  During critique verification, the validator leader executes an on-chain web request to retrieve the public evidence body. The response text is bounded safely (up to 40,000 characters) to prevent memory exhaustion and denial-of-service vectors.
                </p>
              </div>

              <div className="card-box space-y-2">
                <h4 className="font-medium text-[15px] text-[var(--color-paper)]">
                  2. Prompt Injection Hardening &amp; Strict XML Data Fencing
                </h4>
                <p className="text-[13px] text-[var(--color-fog)] leading-relaxed">
                  External web evidence and reviewer inputs are treated strictly as untrusted data. Content is enclosed in robust quotation delimiters (<code className="font-mono">&lt;evidence_document&gt;</code> and <code className="font-mono">&lt;review_submission&gt;</code>). The magistrate prompt explicitly commands validator LLMs to ignore any embedded directives, role alterations, or instructions attempting to force a PASS outcome.
                </p>
              </div>

              <div className="card-box space-y-2">
                <h4 className="font-medium text-[15px] text-[var(--color-paper)]">
                  3. Multi-Validator Equivalence Consensus
                </h4>
                <p className="text-[13px] text-[var(--color-fog)] leading-relaxed">
                  Independent validator nodes re-run the verification process and compare outcomes against the leader&apos;s proposed verdict. If the majority of nodes agree on the categorical verdict (VERIFIED vs REJECTED) and itemized criteria rulings, the state update and token transfers are confirmed on-chain.
                </p>
              </div>
            </div>
          </section>

          {/* Section 05: Evidence Fault Tolerance & HTTP Error Handling */}
          <section id="evidence" className="space-y-6 scroll-mt-24">
            <div className="border-b border-[var(--color-iron)] pb-3">
              <span className="text-[11px] font-mono text-[var(--color-accent)] block mb-1">05 / SAFEGUARDS &amp; ERROR HANDLING</span>
              <h2 className="text-2xl font-medium text-[var(--color-paper)] tracking-tight">
                Evidence Fault Tolerance &amp; HTTP Error Handling
              </h2>
            </div>

            <p className="text-[14px] text-[var(--color-fog)] leading-relaxed">
              Because external web hosts can fail, go offline, or return deceptive responses, CritiqProof implements rigorous fault classification:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="card-box space-y-3 border border-[#eb5757]/30">
                <span className="text-[10px] font-mono uppercase text-[#eb5757] font-semibold">
                  Deterministic Evidence Failure (HTTP 404 / 410)
                </span>
                <p className="text-[13px] text-[var(--color-fog)] leading-relaxed">
                  If an evidence link returns HTTP 404 (Not Found), HTTP 410 (Gone), or serves empty body text, the deliverable is verified defective or fraudulent. The validator issues <strong className="text-[var(--color-paper)]">REJECTED</strong>, slashing the reviewer&apos;s stake into the merchant pool.
                </p>
              </div>

              <div className="card-box space-y-3 border border-[var(--color-accent)]/30">
                <span className="text-[10px] font-mono uppercase text-[var(--color-accent)] font-semibold">
                  Transient Network Outages (HTTP 429 / 5xx)
                </span>
                <p className="text-[13px] text-[var(--color-fog)] leading-relaxed">
                  If evidence servers experience rate limits (HTTP 429) or temporary server downtime (HTTP 500, 502, 503, 504), the verdict records <strong className="text-[var(--color-paper)]">UNDETERMINED</strong>. No stake is slashed, protecting honest reviewers from third-party server instability.
                </p>
              </div>

              <div className="card-box space-y-3 border border-[var(--color-iron)] sm:col-span-2">
                <span className="text-[10px] font-mono uppercase text-[var(--color-fog)] font-semibold">
                  Multi-Evidence Proof Type Taxonomy (8 Categories) &amp; Multi-Modal Vision Roadmap
                </span>
                <p className="text-[13px] text-[var(--color-fog)] leading-relaxed">
                  Merchants specify any combination of accepted proof types during listing creation: Receipt / POS Voucher, Digital Order Confirmation, Commercial Invoice, Booking / Reservation, SaaS Subscription / License, Digital Contract / Agreement, Delivery Tracking / Bill of Lading, or Other Public Evidence. In future upgrades, physical photos of paper receipts and deliveries will be analyzed by multi-modal LLM vision magistrates directly on GenLayer.
                </p>
              </div>
            </div>
          </section>

          {/* Section 06: Security Invariants */}
          <section id="invariants" className="space-y-6 scroll-mt-24">
            <div className="border-b border-[var(--color-iron)] pb-3">
              <span className="text-[11px] font-mono text-[var(--color-accent)] block mb-1">06 / FORMAL INVARIANTS</span>
              <h2 className="text-2xl font-medium text-[var(--color-paper)] tracking-tight">
                Cryptographic Security Invariants &amp; Solvency Guarantees
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px]">
              {[
                "Minimum stake enforcement: msg.value >= min_stake validated deterministically on submission.",
                "Zero merchant self-review: listing owner cannot submit critiques to their own listings.",
                "Pool solvency invariant: listing.reward_pool >= reward_per_review enforced prior to reward payouts.",
                "Single disbursement guarantee: critique status transitions from submitted to terminal state prevent double payouts.",
                "Reentrancy defense: state mutations execute before external value transfers.",
                "Permanent on-chain audit trail: itemized criteria reports and magistrate reasoning recorded forever.",
                "Archival refund safety: archiving a listing refunds 100% of remaining pool to creator and locks new critiques.",
                "Native transfer safety: value movements execute via GenVM native transfer primitives.",
              ].map((text, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-[8px] bg-[var(--color-graphite)] border border-[var(--color-iron)] flex items-start gap-2.5"
                >
                  <CheckCircleIcon className="w-4 h-4 text-[#27a644] shrink-0 mt-0.5" />
                  <span className="text-[var(--color-fog)]">{text}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Section 07: Live Deployment & Toolchain */}
          <section id="deployment" className="space-y-6 scroll-mt-24">
            <div className="border-b border-[var(--color-iron)] pb-3">
              <span className="text-[11px] font-mono text-[var(--color-accent)] block mb-1">07 / LIVE DEPLOYMENT</span>
              <h2 className="text-2xl font-medium text-[var(--color-paper)] tracking-tight">
                Live Deployment &amp; Network Specifications
              </h2>
            </div>

            <div className="card-box bg-[var(--color-graphite)] p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-[12px]">
                <div>
                  <span className="text-[10px] text-[var(--color-ash)] uppercase block mb-0.5">Network</span>
                  <span className="text-[var(--color-paper)] font-medium">GenLayer Studionet</span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--color-ash)] uppercase block mb-0.5">Chain ID</span>
                  <span className="text-[var(--color-paper)] font-medium">{STUDIONET_CHAIN_ID}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--color-ash)] uppercase block mb-0.5">RPC Endpoint</span>
                  <span className="text-[var(--color-fog)] font-medium break-all">{STUDIONET_RPC}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--color-ash)] uppercase block mb-0.5">Contract Framework</span>
                  <span className="text-[var(--color-accent)] font-medium">Python 3.14 + GenVM Intelligent Contracts</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-[10px] text-[var(--color-ash)] uppercase block mb-0.5">Deployed Intelligent Contract Address</span>
                  <a
                    href="https://studio.genlayer.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[var(--color-accent)] hover:underline break-all"
                  >
                    {CRITIQPROOF_CONTRACT_ADDRESS}
                  </a>
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--color-iron)] flex flex-col sm:flex-row items-center justify-between gap-4">
                <span className="text-[12px] text-[var(--color-fog)]">
                  Ready to post a criteria-governed listing or submit a staked review?
                </span>
                <div className="flex items-center gap-3">
                  <Link href="/listings/create" className="btn-primary text-[13px]">
                    <span>+ Create Listing</span>
                  </Link>
                  <Link href="/" className="btn-ghost text-[13px]">
                    <span>Explore Marketplace</span>
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Section 08: Future Protocol Roadmap */}
          <section id="roadmap" className="space-y-6 scroll-mt-24">
            <div className="border-b border-[var(--color-iron)] pb-3">
              <span className="text-[11px] font-mono text-[var(--color-accent)] block mb-1">08 / EVOLUTION</span>
              <h2 className="text-2xl font-medium text-[var(--color-paper)] tracking-tight">
                Future Protocol Roadmap &amp; Photo Evidence
              </h2>
            </div>

            <p className="text-[14px] text-[var(--color-fog)] leading-relaxed">
              CritiqProof is architected for extensible decentralization. The following capabilities are planned for upcoming releases:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="card-box space-y-2.5 border-l-2 border-l-[var(--color-accent)]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />
                  <h4 className="font-medium text-[15px] text-[var(--color-paper)]">
                    Multi-Modal Vision Magistrates (Photo Evidence)
                  </h4>
                </div>
                <p className="text-[13px] text-[var(--color-fog)] leading-relaxed">
                  Support for consumer-uploaded photograph evidence (e.g. paper grocery receipts, POS till printouts, physical product unboxing pictures) analyzed by multi-modal vision LLMs running in consensus once GenLayer activates decentralized OCR and image fetching pipelines.
                </p>
              </div>

              <div className="card-box space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#27a644]" />
                  <h4 className="font-medium text-[15px] text-[var(--color-paper)]">
                    Zero-Knowledge Purchase Proofs (zk-SNARKs)
                  </h4>
                </div>
                <p className="text-[13px] text-[var(--color-fog)] leading-relaxed">
                  Cryptographic privacy preserving purchase verification where reviewers prove authentic commercial transactions without exposing customer names, credit card numbers, or physical delivery addresses.
                </p>
              </div>

              <div className="card-box space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#6798ff]" />
                  <h4 className="font-medium text-[15px] text-[var(--color-paper)]">
                    Reviewer Credibility NFTs &amp; Soulbound Badges
                  </h4>
                </div>
                <p className="text-[13px] text-[var(--color-fog)] leading-relaxed">
                  Non-transferable on-chain credibility scores rewarding consistent, verified top reviewers with lower staking requirements, higher multiplier bounties, and specialized validator jury eligibility.
                </p>
              </div>

              <div className="card-box space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#eb5757]" />
                  <h4 className="font-medium text-[15px] text-[var(--color-paper)]">
                    Merchant Dispute &amp; Slashed Stake Appeals Court
                  </h4>
                </div>
                <p className="text-[13px] text-[var(--color-fog)] leading-relaxed">
                  A secondary arbitration court tier allowing reviewers who believe their stake was improperly slashed due to OCR parsing errors to appeal to an extended GenLayer validator jury.
                </p>
              </div>
            </div>
          </section>

          {/* Footer Attribution Banner */}
          <div className="pt-8 border-t border-[var(--color-iron)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-[var(--color-fog)]">
            <span>CRITIQPROOF PROTOCOL SPECIFICATION GUIDE</span>
            <span className="text-[var(--color-paper)]">
              &copy; 2026 CRITIQPROOF &middot; ARCHITECTED &amp; BUILT BY{" "}
              <strong className="text-[var(--color-accent)]">9YTSHADE</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
