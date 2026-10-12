"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CATEGORIES_LIST, CreateListingInput, PROOF_TYPES_LIST } from "@/types/critiqproof";
import { validateListingInput } from "@/lib/safety";
import { useWallet } from "@/lib/use-wallet";
import { executeCreateListing, ensureStudionetNetwork } from "@/lib/genlayer";
import { pollTransactionUntilFinalized } from "@/lib/tx-waiter";
import { TransactionLifecycleModal, TransactionStep } from "@/components/transaction-lifecycle";
import { ShieldIcon, CheckIcon, ScaleIcon } from "@/components/icons";

export default function CreateListingPage() {
  const router = useRouter();
  const { isConnected, account, getSignerClient } = useWallet();

  const [title, setTitle] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    "SaaS & Developer Tools",
  ]);
  const [description, setDescription] = useState("");
  const [verificationCriteria, setVerificationCriteria] = useState(
    "Order confirmation must verify official product or subscription\nDocumentation or proof link must match the merchant vendor domain"
  );
  const [selectedProofTypes, setSelectedProofTypes] = useState<string[]>([
    "receipt",
    "order_id",
  ]);
  const [rewardPerReview, setRewardPerReview] = useState("0.02");
  const [minStake, setMinStake] = useState("0.01");
  const [initialPool, setInitialPool] = useState("0.1");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [txStep, setTxStep] = useState<TransactionStep | null>(null);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(cat)) {
        if (prev.length === 1) return prev; // keep at least one
        return prev.filter((c) => c !== cat);
      } else {
        return [...prev, cat];
      }
    });
  };

  const toggleProofType = (id: string) => {
    setSelectedProofTypes((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev; // keep at least one
        return prev.filter((p) => p !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Real-time economic computations
  const estimatedReviewsFunded = useMemo(() => {
    const pool = parseFloat(initialPool) || 0;
    const bounty = parseFloat(rewardPerReview) || 0;
    if (bounty <= 0) return 0;
    return Math.floor(pool / bounty);
  }, [initialPool, rewardPerReview]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected) {
      alert("Please connect your Web3 wallet first to sign the transaction.");
      return;
    }

    const input: CreateListingInput = {
      title,
      description,
      category: selectedCategories.join(", "),
      verification_criteria: verificationCriteria,
      proof_type: selectedProofTypes.join(","),
      reward_per_review_gen: rewardPerReview,
      min_stake_gen: minStake,
      initial_reward_pool_gen: initialPool,
    };

    const validation = validateListingInput(input);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});

    try {
      if (window.ethereum) {
        await ensureStudionetNetwork(window.ethereum);
      }
    } catch (netErr: unknown) {
      const msg = netErr instanceof Error ? netErr.message : String(netErr);
      alert(msg);
      return;
    }

    const client = getSignerClient();
    if (!client) {
      alert("Signer client unavailable. Please ensure MetaMask is connected.");
      return;
    }

    setTxStep({
      name: "Broadcasting Listing to GenLayer Studionet",
      status: "broadcasting",
    });

    try {
      const hash = await executeCreateListing(input, client);
      setTxStep({
        name: "Awaiting Validator Consensus Finality",
        hash,
        status: "consensus",
      });

      await pollTransactionUntilFinalized(hash, {
        actionName: "Listing Registration",
      });

      setTxStep({
        name: "Listing Finalized on Studionet",
        hash,
        status: "finalized",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTxStep({
        name: "Listing Registration Failed",
        status: "error",
        error: msg,
      });
    }
  };

  return (
    <div className="max-w-[1200px] w-full mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2 border-b border-[#1e1e1e] pb-6">
        <div className="flex items-center gap-2">
          <span className="section-eyebrow text-[#6798ff]">
            MERCHANT ONBOARDING / ESCROW REGISTRATION
          </span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-medium tracking-tight text-[#ffffff]">
          Register Product or Service Listing
        </h1>
        <p className="text-sm text-[#a7a7a7] leading-relaxed max-w-3xl">
          Establish an on-chain staking incentive pool for authentic critiques. Set clear criteria for GenLayer AI Magistrate verification and deposit a native GEN reward pool.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Product Info, Categories, Proof Types, Criteria (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Basic Details Card */}
            <div className="card-dovetail space-y-4">
              <div className="flex items-center gap-2 text-[#ffffff]">
                <ShieldIcon className="w-4 h-4 text-[#6798ff]" />
                <h2 className="text-base font-medium">Product &amp; Category Information</h2>
              </div>

              <div className="space-y-1.5">
                <label className="section-eyebrow block">PRODUCT / SERVICE TITLE</label>
                <input
                  type="text"
                  placeholder="e.g. CloudScale Distributed Vector API"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#0a0a0a] border border-[#1e1e1e] focus:border-[#6798ff] focus:outline-none text-sm text-[#ffffff] placeholder-[#7c7c7c]"
                />
                {errors.title && <p className="text-xs text-rose-400 font-mono">{errors.title}</p>}
              </div>

              {/* Multi-Select Categories */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="section-eyebrow block">
                    SELECT CATEGORIES (MULTI-CHOICE)
                  </label>
                  <span className="text-xs font-mono text-[#6798ff]">
                    {selectedCategories.length} selected
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {CATEGORIES_LIST.map((cat) => {
                    const isSelected = selectedCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCategory(cat)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono border cursor-pointer transition ${
                          isSelected
                            ? "bg-[#6798ff]/20 text-white border-[#6798ff] font-medium shadow-[0_0_10px_rgba(103,152,255,0.25)]"
                            : "bg-[#141414] text-[#a7a7a7] border-[#1e1e1e] hover:border-[#454545] hover:text-white"
                        }`}
                      >
                        {isSelected && <CheckIcon className="w-3.5 h-3.5 text-[#6798ff]" />}
                        <span>{cat}</span>
                      </button>
                    );
                  })}
                </div>
                {errors.category && <p className="text-xs text-rose-400 font-mono">{errors.category}</p>}
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="section-eyebrow block">PRODUCT DESCRIPTION</label>
                <textarea
                  rows={3}
                  placeholder="Provide context regarding the product, platform capabilities, or customer service experience..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#0a0a0a] border border-[#1e1e1e] focus:border-[#6798ff] focus:outline-none text-sm text-[#ffffff] placeholder-[#7c7c7c]"
                />
                {errors.description && (
                  <p className="text-xs text-rose-400 font-mono">{errors.description}</p>
                )}
              </div>
            </div>

            {/* Verification Criteria & Proof Types */}
            <div className="card-dovetail space-y-4">
              <h2 className="text-base font-medium text-[#ffffff]">
                Proof Evidence &amp; AI Magistrate Criteria
              </h2>

              {/* Multi-Select Expected Proof Evidence */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="section-eyebrow block">
                    ACCEPTED PROOF EVIDENCE TYPES (MULTI-CHOICE)
                  </label>
                  <span className="text-xs font-mono text-[#6798ff]">
                    {selectedProofTypes.length} selected
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PROOF_TYPES_LIST.map((pt) => {
                    const isSelected = selectedProofTypes.includes(pt.id);
                    return (
                      <div
                        key={pt.id}
                        onClick={() => toggleProofType(pt.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition flex items-start gap-2.5 ${
                          isSelected
                            ? "bg-[#6798ff]/10 border-[#6798ff] text-[#ffffff]"
                            : "bg-[#0a0a0a] border-[#1e1e1e] text-[#a7a7a7] hover:border-[#313131]"
                        }`}
                      >
                        <div
                          className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border transition ${
                            isSelected
                              ? "bg-[#6798ff] border-[#6798ff] text-[#0a0a0a]"
                              : "border-[#454545]"
                          }`}
                        >
                          {isSelected && <CheckIcon className="w-3 h-3 text-[#0a0a0a]" />}
                        </div>
                        <div>
                          <span className="text-xs font-medium block">{pt.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {errors.proof_type && (
                  <p className="text-xs text-rose-400 font-mono">{errors.proof_type}</p>
                )}
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="section-eyebrow block">
                  CUSTOM VERIFICATION ACCEPTANCE CRITERIA (MAX 5 RULES, ONE PER LINE)
                </label>
                <textarea
                  rows={4}
                  placeholder="Order ID must start with PREFIX-&#10;Invoice date must be within current calendar quarter&#10;Subscriber tier must indicate active Pro plan"
                  value={verificationCriteria}
                  onChange={(e) => setVerificationCriteria(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#0a0a0a] border border-[#1e1e1e] focus:border-[#6798ff] focus:outline-none text-xs font-mono text-[#ffffff] placeholder-[#7c7c7c]"
                />
                {errors.verification_criteria && (
                  <p className="text-xs text-rose-400 font-mono">
                    {errors.verification_criteria}
                  </p>
                )}
              </div>

              {/* Photo Evidence Protocol Callout */}
              <div className="p-3.5 rounded-lg bg-[#0a0a0a] border border-[#1e1e1e] space-y-1 text-xs">
                <div className="flex items-center gap-1.5 text-[#6798ff] font-mono text-[11px]">
                  <span>NOTE: PHOTO &amp; MULTI-MODAL EVIDENCE</span>
                </div>
                <p className="text-[#a7a7a7] leading-relaxed">
                  Current Studionet validator nodes audit live web documents, HTML confirmations, and API permalinks via <code className="font-mono text-white">gl.nondet.web.get</code>. Multi-modal vision magistrates for receipt photos and physical deliveries are slated for upcoming protocol releases.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Escrow Financials & Live Economic Preview (5 cols) */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
            {/* Financial Escrow Parameters */}
            <div className="card-dovetail space-y-4">
              <div className="flex items-center gap-2 text-[#ffffff]">
                <ScaleIcon className="w-4 h-4 text-[#6798ff]" />
                <h2 className="text-base font-medium">Reward Pool &amp; Staking Economics</h2>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="section-eyebrow block">INITIAL POOL DEPOSIT</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={initialPool}
                      onChange={(e) => setInitialPool(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg bg-[#0a0a0a] border border-[#1e1e1e] focus:border-[#6798ff] focus:outline-none font-mono text-sm text-[#ffffff]"
                    />
                    <span className="absolute right-3 top-3 text-xs font-mono text-[#6798ff]">
                      GEN
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="section-eyebrow block">BOUNTY PER VERIFIED REVIEW</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={rewardPerReview}
                      onChange={(e) => setRewardPerReview(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg bg-[#0a0a0a] border border-[#1e1e1e] focus:border-[#6798ff] focus:outline-none font-mono text-sm text-[#ffffff]"
                    />
                    <span className="absolute right-3 top-3 text-xs font-mono text-[#6798ff]">
                      GEN
                    </span>
                  </div>
                  {errors.reward_per_review_gen && (
                    <p className="text-xs text-rose-400 font-mono">
                      {errors.reward_per_review_gen}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="section-eyebrow block">REQUIRED REVIEWER STAKE</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={minStake}
                      onChange={(e) => setMinStake(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg bg-[#0a0a0a] border border-[#1e1e1e] focus:border-[#6798ff] focus:outline-none font-mono text-sm text-[#ffffff]"
                    />
                    <span className="absolute right-3 top-3 text-xs font-mono text-[#6798ff]">
                      GEN
                    </span>
                  </div>
                  {errors.min_stake_gen && (
                    <p className="text-xs text-rose-400 font-mono">{errors.min_stake_gen}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Live Reviewer Economics Preview Card */}
            <div className="card-dovetail bg-[#101010] border border-[#1e1e1e] space-y-4">
              <span className="section-eyebrow text-[#a7a7a7] block">
                LIVE ECONOMIC AUDIT PREVIEW
              </span>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded bg-[#0a0a0a] border border-[#1e1e1e] space-y-1">
                  <span className="text-[#7c7c7c] text-[10px] block">REVIEWS FUNDED</span>
                  <span className="text-lg font-bold text-white">~{estimatedReviewsFunded}</span>
                </div>

                <div className="p-3 rounded bg-[#0a0a0a] border border-[#1e1e1e] space-y-1">
                  <span className="text-[#7c7c7c] text-[10px] block">REVIEWER SKIN-IN-GAME</span>
                  <span className="text-lg font-bold text-[#6798ff]">{minStake} GEN</span>
                </div>
              </div>

              <div className="p-3 rounded bg-[#0a0a0a] border border-[#1e1e1e] text-[11px] font-mono text-[#a7a7a7] space-y-1.5">
                <div className="flex justify-between">
                  <span>Merchant Deposit:</span>
                  <span className="text-white font-medium">{initialPool} GEN</span>
                </div>
                <div className="flex justify-between">
                  <span>Bounty Payout:</span>
                  <span className="text-[#27a644]">+{rewardPerReview} GEN / pass</span>
                </div>
                <div className="flex justify-between">
                  <span>Slashing Restitution:</span>
                  <span className="text-[#6798ff]">+{minStake} GEN to pool</span>
                </div>
                <div className="flex justify-between">
                  <span>Signer Wallet:</span>
                  <span className="text-white truncate max-w-[150px]">
                    {account || "Not connected"}
                  </span>
                </div>
              </div>

              {/* Submit Actions */}
              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  disabled={!isConnected}
                  className="w-full btn-primary text-xs py-3 justify-center disabled:opacity-50"
                >
                  Broadcast &amp; Register Listing ({initialPool} GEN Deposit) &rarr;
                </button>

                <div className="flex justify-center">
                  <Link
                    href="/"
                    className="text-xs font-mono text-[#7c7c7c] hover:text-white transition-colors"
                  >
                    Cancel and Return to Marketplace
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Lifecycle Transaction Feedback Modal */}
      <TransactionLifecycleModal
        step={txStep}
        onClose={() => {
          if (txStep?.status === "finalized") {
            router.push("/");
          }
          setTxStep(null);
        }}
      />
    </div>
  );
}
