"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Critique, Listing, SubmitCritiqueInput, Verdict, PROOF_TYPES_LIST } from "@/types/critiqproof";
import {
  fetchCritiques,
  fetchListing,
  fetchVerdict,
  executeSubmitCritique,
  executeVerifyCritique,
  executeArchiveListing,
  executeFundRewardPool,
  ensureStudionetNetwork,
} from "@/lib/genlayer";
import { pollTransactionUntilFinalized } from "@/lib/tx-waiter";
import { formatAddress, formatGen, getTrustScoreBadge } from "@/lib/safety";
import { useWallet } from "@/lib/use-wallet";
import { CritiqueCard } from "@/components/critique-card";
import { SubmitCritiqueModal } from "@/components/submit-critique-modal";
import { VerdictModal } from "@/components/verdict-modal";
import { TransactionLifecycleModal, TransactionStep } from "@/components/transaction-lifecycle";
import {
  ShieldIcon,
  PlusIcon,
  RefreshIcon,
  ClockIcon,
  CheckCircleIcon,
} from "@/components/icons";

export default function ListingDetailPage() {
  const params = useParams();
  const listingId = Number(params.id);

  const { account, getSignerClient } = useWallet();

  const [listing, setListing] = useState<Listing | null>(null);
  const [critiques, setCritiques] = useState<Critique[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeVerdict, setActiveVerdict] = useState<Verdict | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [txStep, setTxStep] = useState<TransactionStep | null>(null);
  const [selectedFilter, setSelectedFilter] = useState("all");

  const [fundAmount, setFundAmount] = useState("0.05");
  const [showFundModal, setShowFundModal] = useState(false);

  const loadData = async () => {
    if (!listingId || isNaN(listingId)) return;
    setLoading(true);
    try {
      const [lData, cData] = await Promise.all([
        fetchListing(listingId),
        fetchCritiques(listingId),
      ]);
      setListing(lData);
      setCritiques(cData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    if (listingId && !isNaN(listingId)) {
      Promise.all([fetchListing(listingId), fetchCritiques(listingId)]).then(([l, c]) => {
        if (active) {
          setListing(l);
          setCritiques(c);
          setLoading(false);
        }
      });
    }
    return () => {
      active = false;
    };
  }, [listingId]);

  const isOwner = useMemo(() => {
    if (!account || !listing) return false;
    return account.toLowerCase() === listing.owner.toLowerCase();
  }, [account, listing]);

  const categories = useMemo(() => {
    if (!listing?.category) return [];
    return listing.category
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
  }, [listing]);

  const acceptedProofTypes = useMemo(() => {
    if (!listing?.proof_type) return [];
    const ids = listing.proof_type
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    return ids.map((id) => {
      const match = PROOF_TYPES_LIST.find((p) => p.id === id);
      return { id, label: match ? match.label : id };
    });
  }, [listing]);

  const filteredCritiques = useMemo(() => {
    const sorted = [...critiques].sort((a, b) => b.id - a.id);
    if (selectedFilter === "all") return sorted;
    return sorted.filter((c) => c.status === selectedFilter);
  }, [critiques, selectedFilter]);

  const handleOpenVerdict = async (verdictId: number) => {
    const v = await fetchVerdict(verdictId);
    setActiveVerdict(v);
  };

  const handleCritiqueSubmit = async (input: SubmitCritiqueInput) => {
    try {
      if (window.ethereum) await ensureStudionetNetwork(window.ethereum);
    } catch (netErr: unknown) {
      alert(netErr instanceof Error ? netErr.message : String(netErr));
      return;
    }

    const client = getSignerClient();
    if (!client) {
      alert("Signer client not available. Connect wallet first.");
      return;
    }

    setTxStep({
      name: "Submitting Critique & Locking Stake",
      status: "broadcasting",
    });

    try {
      const hash = await executeSubmitCritique(input, client);
      setTxStep({
        name: "Awaiting Studionet Consensus Finality",
        hash,
        status: "consensus",
      });

      await pollTransactionUntilFinalized(hash, {
        actionName: "Critique Submission",
      });

      setTxStep({
        name: "Critique Successfully Staked",
        hash,
        status: "finalized",
      });
      setIsSubmitModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTxStep({
        name: "Critique Submission Failed",
        status: "error",
        error: msg,
      });
    }
  };

  const handleTriggerVerify = async (critiqueId: number) => {
    try {
      if (window.ethereum) await ensureStudionetNetwork(window.ethereum);
    } catch (netErr: unknown) {
      alert(netErr instanceof Error ? netErr.message : String(netErr));
      return;
    }

    const client = getSignerClient();
    if (!client) {
      alert("Connect wallet to trigger on-chain verification.");
      return;
    }

    setTxStep({
      name: `Verifying Critique #${critiqueId} via AI Magistrate`,
      status: "broadcasting",
    });

    try {
      const hash = await executeVerifyCritique(listingId, critiqueId, client);
      setTxStep({
        name: "AI Magistrate Evaluating Equivalence Consensus",
        hash,
        status: "consensus",
      });

      await pollTransactionUntilFinalized(hash, {
        actionName: "Critique Verification",
      });

      setTxStep({
        name: "Verification Consensus Finalized",
        hash,
        status: "finalized",
      });
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTxStep({
        name: "Verification Consensus Failed",
        status: "error",
        error: msg,
      });
    }
  };

  const handleArchive = async () => {
    if (!confirm("Are you sure you want to archive this listing? 100% of the remaining reward pool will be refunded to your wallet.")) {
      return;
    }

    try {
      if (window.ethereum) await ensureStudionetNetwork(window.ethereum);
    } catch (netErr: unknown) {
      alert(netErr instanceof Error ? netErr.message : String(netErr));
      return;
    }

    const client = getSignerClient();
    if (!client) return;

    setTxStep({
      name: "Archiving Listing & Refunding Escrow Pool",
      status: "broadcasting",
    });

    try {
      const hash = await executeArchiveListing(listingId, client);
      setTxStep({
        name: "Awaiting Archival Consensus Finality",
        hash,
        status: "consensus",
      });

      await pollTransactionUntilFinalized(hash, {
        actionName: "Listing Archival",
      });

      setTxStep({
        name: "Listing Archived & Pool Refunded",
        hash,
        status: "finalized",
      });
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTxStep({
        name: "Archival Failed",
        status: "error",
        error: msg,
      });
    }
  };

  const handleFundPool = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (window.ethereum) await ensureStudionetNetwork(window.ethereum);
    } catch (netErr: unknown) {
      alert(netErr instanceof Error ? netErr.message : String(netErr));
      return;
    }

    const client = getSignerClient();
    if (!client) return;

    setTxStep({
      name: `Depositing ${fundAmount} GEN into Reward Pool`,
      status: "broadcasting",
    });

    try {
      const hash = await executeFundRewardPool(listingId, fundAmount, client);
      setTxStep({
        name: "Awaiting Pool Deposit Consensus Finality",
        hash,
        status: "consensus",
      });

      await pollTransactionUntilFinalized(hash, {
        actionName: "Pool Funding",
      });

      setTxStep({
        name: "Pool Deposit Finalized",
        hash,
        status: "finalized",
      });
      setShowFundModal(false);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTxStep({
        name: "Deposit Failed",
        status: "error",
        error: msg,
      });
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-8 h-8 mx-auto border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-mono text-[var(--color-fog)]">Loading listing details from Studionet...</p>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-[var(--color-paper)]">Listing Not Found</h2>
        <p className="text-xs text-[var(--color-fog)]">The requested listing could not be found on-chain.</p>
        <Link href="/" className="inline-block text-xs text-[var(--color-accent)] font-mono hover:underline">
          Return to Marketplace
        </Link>
      </div>
    );
  }

  const badge = getTrustScoreBadge(listing.trust_score);
  const isArchived = listing.status === "archived";

  return (
    <div className="space-y-10">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-xs font-mono text-[var(--color-ash)]">
        <Link href="/" className="hover:text-[var(--color-fog)] transition-colors">
          Marketplace
        </Link>
        <span>/</span>
        <span className="text-[var(--color-paper)]">Listing #{listing.id}</span>
      </div>

      {/* Main Header Card */}
      <div className="card-box bg-[var(--color-graphite)] p-6 sm:p-10 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {categories.map((cat, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-[6px] text-xs font-medium bg-[var(--color-carbon)] text-[var(--color-paper)] border border-[var(--color-iron)]"
              >
                {cat}
              </span>
            ))}
            <span
              className={`px-2.5 py-1 rounded-[6px] text-xs font-mono uppercase ${
                isArchived
                  ? "bg-[var(--color-carbon)] text-[var(--color-ash)] border border-[var(--color-iron)]"
                  : "bg-[var(--color-carbon)] text-[#27a644] border border-[#27a644]/30"
              }`}
            >
              {listing.status}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono text-[var(--color-ash)]">Merchant:</span>
            <span className="px-2 py-1 rounded-[6px] bg-[var(--color-carbon)] border border-[var(--color-iron)] font-mono text-xs text-[var(--color-paper)]">
              {formatAddress(listing.owner)}
            </span>
          </div>
        </div>

        <div>
          <h1 className="text-2xl sm:text-4xl font-semibold text-[var(--color-paper)] tracking-tight">
            {listing.title}
          </h1>
          <p className="mt-3 text-sm text-[var(--color-fog)] leading-relaxed whitespace-pre-wrap">
            {listing.description}
          </p>
        </div>

        {/* Accepted Proof Types Bar */}
        <div className="p-4 rounded-[8px] bg-[var(--color-carbon)] border border-[var(--color-iron)] space-y-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--color-ash)] block">
            Accepted Proof Evidence Types
          </span>
          <div className="flex flex-wrap gap-2">
            {acceptedProofTypes.map((pt) => (
              <span
                key={pt.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11px] font-mono bg-[var(--color-graphite)] text-[var(--color-paper)] border border-[var(--color-iron)]"
              >
                <CheckCircleIcon className="w-3 h-3 text-[var(--color-accent)]" />
                <span>{pt.label}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Primary Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 font-mono">
          <div className="p-4 rounded-[8px] border border-[var(--color-iron)] bg-[var(--color-carbon)]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[var(--color-ash)]">Trust Score</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${badge.badgeBg} ${badge.badgeText} ${badge.badgeBorder}`}>
                {badge.label}
              </span>
            </div>
            <span className="text-2xl font-bold text-[var(--color-paper)]">{listing.trust_score}%</span>
            <span className="text-xs text-[var(--color-ash)] block mt-1">
              {listing.verified_count} / {listing.review_count} verified reviews
            </span>
          </div>

          <div className="p-4 rounded-[8px] border border-[var(--color-iron)] bg-[var(--color-carbon)]">
            <span className="text-xs text-[var(--color-ash)] block mb-1">Reward Pool</span>
            <span className="text-2xl font-bold text-[var(--color-accent)]">{formatGen(listing.reward_pool)} GEN</span>
            <span className="text-xs text-[var(--color-ash)] block mt-1">
              Available merchant escrow
            </span>
          </div>

          <div className="p-4 rounded-[8px] border border-[var(--color-iron)] bg-[var(--color-carbon)]">
            <span className="text-xs text-[var(--color-ash)] block mb-1">Per-Review Bounty</span>
            <span className="text-2xl font-bold text-[#27a644]">+{formatGen(listing.reward_per_review)} GEN</span>
            <span className="text-xs text-[var(--color-ash)] block mt-1">
              Earned on verified pass
            </span>
          </div>

          <div className="p-4 rounded-[8px] border border-[var(--color-iron)] bg-[var(--color-carbon)]">
            <span className="text-xs text-[var(--color-ash)] block mb-1">Required Stake</span>
            <span className="text-2xl font-bold text-[var(--color-paper)]">{formatGen(listing.min_stake)} GEN</span>
            <span className="text-xs text-[var(--color-ash)] block mt-1">
              Anti-spam skin-in-the-game
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            {!isArchived && (
              <button
                onClick={() => setIsSubmitModalOpen(true)}
                className="btn-primary text-xs"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Submit Staked Critique</span>
              </button>
            )}

            {isOwner && !isArchived && (
              <>
                <button
                  onClick={() => setShowFundModal(true)}
                  className="btn-ghost text-xs"
                >
                  Deposit Pool Funds
                </button>
                <button
                  onClick={handleArchive}
                  className="px-4 py-2 rounded-[8px] border border-rose-900/40 bg-rose-950/20 hover:bg-rose-950/40 text-rose-400 text-xs font-medium transition-colors"
                >
                  Archive Listing &amp; Refund Pool
                </button>
              </>
            )}
          </div>

          <button
            onClick={() => void loadData()}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-[8px] border border-[var(--color-iron)] bg-[var(--color-carbon)] hover:bg-[var(--color-iron)] text-[var(--color-fog)] hover:text-[var(--color-paper)] text-xs font-mono transition-colors"
          >
            <RefreshIcon className="w-3.5 h-3.5" />
            <span>Sync Chain</span>
          </button>
        </div>
      </div>

      {/* Verification Criteria Card */}
      <div className="card-box bg-[var(--color-graphite)] p-6 space-y-3">
        <div className="flex items-center space-x-2 text-[var(--color-paper)]">
          <ShieldIcon className="w-4 h-4 text-[var(--color-accent)]" />
          <h3 className="font-semibold text-sm uppercase tracking-wider">
            Equivalence Verification Criteria
          </h3>
        </div>
        <p className="text-xs text-[var(--color-fog)]">
          Validator magistrates evaluate each critique against these exact rules. All criteria must pass for stake release and bounty disbursement.
        </p>

        <div className="space-y-2 pt-2">
          <div className="p-3 rounded-[6px] border border-[var(--color-iron)] bg-[var(--color-carbon)] text-xs font-mono text-[var(--color-paper)]">
            <span className="text-[var(--color-accent)] font-semibold mr-2">[Rule 1]</span>
            Authenticity: Does the proof evidence verify legitimate access, interaction, documentation, or transaction matching this listing?
          </div>
          <div className="p-3 rounded-[6px] border border-[var(--color-iron)] bg-[var(--color-carbon)] text-xs font-mono text-[var(--color-paper)]">
            <span className="text-[var(--color-accent)] font-semibold mr-2">[Rule 2]</span>
            Quality: Is the review substantive, coherent, and consistent with the claimed experience?
          </div>
          {listing.verification_criteria &&
            listing.verification_criteria.split("\n").filter((l) => l.trim()).map((custom, idx) => (
              <div
                key={idx}
                className="p-3 rounded-[6px] border border-[var(--color-iron)] bg-[var(--color-carbon)] text-xs font-mono text-[var(--color-paper)]"
              >
                <span className="text-[var(--color-accent)] font-semibold mr-2">[Rule {idx + 3}]</span>
                {custom}
              </div>
            ))}
        </div>
      </div>

      {/* Critiques Feed */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[var(--color-iron)]">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-medium text-[var(--color-paper)]">
              Consumer Critiques
            </h2>
            <span className="px-2 py-0.5 rounded text-xs font-mono bg-[var(--color-graphite)] border border-[var(--color-iron)] text-[var(--color-fog)]">
              {critiques.length} total
            </span>
          </div>

          <div className="flex items-center space-x-1.5 overflow-x-auto text-xs font-mono">
            {["all", "verified", "rejected", "submitted", "undetermined"].map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                className={`px-3 py-1.5 rounded-[6px] capitalize transition-colors ${
                  selectedFilter === filter
                    ? "bg-[var(--color-paper)] text-black font-semibold"
                    : "text-[var(--color-fog)] hover:text-[var(--color-paper)] hover:bg-[var(--color-iron)]"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {filteredCritiques.length === 0 ? (
          <div className="py-16 text-center rounded-[8px] border border-[var(--color-iron)] bg-[var(--color-graphite)] p-8 space-y-3">
            <ClockIcon className="w-8 h-8 mx-auto text-[var(--color-ash)]" />
            <p className="text-[var(--color-fog)] text-sm font-medium">No critiques found for this filter.</p>
            {!isArchived && (
              <button
                onClick={() => setIsSubmitModalOpen(true)}
                className="text-xs text-[var(--color-accent)] font-mono hover:underline"
              >
                Be the first to submit a staked review
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCritiques.map((critique) => (
              <CritiqueCard
                key={critique.id}
                critique={critique}
                onViewVerdict={handleOpenVerdict}
                onTriggerVerify={handleTriggerVerify}
              />
            ))}
          </div>
        )}
      </div>

      {/* Submit Critique Modal */}
      <SubmitCritiqueModal
        listing={listing}
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onSubmit={handleCritiqueSubmit}
      />

      {/* AI Magistrate Verdict Modal */}
      <VerdictModal
        verdict={activeVerdict}
        onClose={() => setActiveVerdict(null)}
      />

      {/* Fund Reward Pool Modal */}
      {showFundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-[8px] border border-[var(--color-iron)] bg-[var(--color-graphite)] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--color-iron)]">
              <h3 className="font-medium text-[var(--color-paper)] text-base">Deposit Reward Pool Funds</h3>
              <button onClick={() => setShowFundModal(false)} className="text-[var(--color-ash)] hover:text-[var(--color-paper)] font-mono text-sm">
                [X]
              </button>
            </div>
            <form onSubmit={handleFundPool} className="py-5 space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[var(--color-ash)] mb-1">
                  Amount in GEN
                </label>
                <input
                  type="text"
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  placeholder="0.05"
                  className="w-full px-3 py-2 rounded-[6px] bg-[var(--color-carbon)] border border-[var(--color-iron)] text-[var(--color-paper)] font-mono text-xs focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>
              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFundModal(false)}
                  className="btn-ghost text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary text-xs"
                >
                  Confirm Deposit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction Lifecycle Status Tracker */}
      <TransactionLifecycleModal
        step={txStep}
        onClose={() => setTxStep(null)}
      />
    </div>
  );
}
