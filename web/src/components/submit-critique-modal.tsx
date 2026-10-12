"use client";

import React, { useEffect, useState } from "react";
import { Listing, PROOF_TYPES_LIST, SubmitCritiqueInput } from "@/types/critiqproof";
import { formatGen, validateCritiqueInput } from "@/lib/safety";
import { StarIcon, ShieldIcon } from "./icons";

export function SubmitCritiqueModal({
  listing,
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
}: {
  listing: Listing;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: SubmitCritiqueInput) => Promise<void>;
  isSubmitting?: boolean;
}) {
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [proofDescription, setProofDescription] = useState("");
  const [stakeGen, setStakeGen] = useState(formatGen(listing.min_stake));
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isSubmitting) onClose();
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const proofTypes = listing.proof_type
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  const getProofLabel = (id: string) => {
    const found = PROOF_TYPES_LIST.find((item) => item.id === id);
    return found ? found.label : id;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const input: SubmitCritiqueInput = {
      listing_id: listing.id,
      rating,
      review_text: reviewText,
      proof_url: proofUrl,
      proof_description: proofDescription,
      stake_gen: stakeGen,
    };

    const validation = validateCritiqueInput(input, listing.min_stake);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});
    await onSubmit(input);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="submit-critique-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="w-full max-w-xl rounded-lg border border-[#313131] bg-[#141414] p-6 shadow-2xl my-8 text-left">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1e1e1e]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-[#0a0a0a] border border-[#1e1e1e] text-[#6798ff]">
              <ShieldIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 id="submit-critique-title" className="font-medium text-[#ffffff] text-base">
                Submit Staked Critique
              </h3>
              <p className="text-xs text-[#a7a7a7] line-clamp-1">{listing.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#a7a7a7] hover:text-[#ffffff] text-sm font-mono cursor-pointer"
            aria-label="Close modal"
          >
            [X]
          </button>
        </div>

        <form onSubmit={handleSubmit} className="py-4 space-y-4">
          {/* Staking Banner */}
          <div className="p-3.5 rounded-lg border border-[#1e1e1e] bg-[#0a0a0a] text-xs space-y-1.5">
            <div className="flex items-center justify-between font-mono">
              <span className="text-[#6798ff] font-medium">Minimum Required Stake:</span>
              <span className="text-[#ffffff] font-medium">{formatGen(listing.min_stake)} GEN</span>
            </div>
            <div className="flex items-center justify-between font-mono text-[11px] text-[#a7a7a7]">
              <span>Potential Review Reward Bounty:</span>
              <span className="text-emerald-400 font-medium">+{formatGen(listing.reward_per_review)} GEN</span>
            </div>
            <p className="text-[11px] text-[#7c7c7c] pt-1 leading-relaxed">
              Your stake is locked in escrow. If GenLayer validators verify your purchase proof, your stake is returned plus the reward bounty. If fraudulent or dead link, your stake is slashed into the merchant pool.
            </p>
          </div>

          {/* Accepted Proof Types Reminder */}
          <div className="space-y-1">
            <span className="section-eyebrow">ACCEPTED PROOF TYPES FOR THIS LISTING</span>
            <div className="flex flex-wrap gap-1 pt-1">
              {proofTypes.map((pt, idx) => (
                <span key={idx} className="tag-badge text-[#6798ff] border-[#6798ff]/30">
                  {getProofLabel(pt)}
                </span>
              ))}
            </div>
          </div>

          {/* Rating */}
          <div className="space-y-1">
            <label className="section-eyebrow block">CONSUMER RATING (1 TO 5 STARS)</label>
            <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Consumer Rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  role="radio"
                  aria-checked={star === rating}
                  aria-label={`${star} star${star > 1 ? "s" : ""}`}
                  onClick={() => setRating(star)}
                  className="p-1 hover:scale-110 transition cursor-pointer"
                >
                  <StarIcon
                    filled={star <= rating}
                    className={`w-5 h-5 ${star <= rating ? "text-[#6798ff]" : "text-[#313131]"}`}
                  />
                </button>
              ))}
              <span className="text-xs font-mono text-[#a7a7a7] ml-2">{rating} / 5</span>
            </div>
            {errors.rating && <p className="text-xs text-rose-400 font-mono mt-1">{errors.rating}</p>}
          </div>

          {/* Review Text */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="critique-review-text" className="section-eyebrow block">
                DETAILED REVIEW TEXT
              </label>
              <span className="text-[10px] font-mono text-[#7c7c7c]">
                {reviewText.length} / 3000 (min 20)
              </span>
            </div>
            <textarea
              id="critique-review-text"
              rows={3}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Describe your authentic experience with the product or service in detail..."
              aria-invalid={Boolean(errors.review_text)}
              className="w-full px-3 py-2 rounded-lg bg-[#0a0a0a] border border-[#1e1e1e] focus:border-[#6798ff] focus:outline-none text-xs text-[#ffffff] placeholder-[#7c7c7c]"
            />
            {errors.review_text && (
              <p className="text-xs text-rose-400 font-mono">{errors.review_text}</p>
            )}
          </div>

          {/* Proof URL */}
          <div className="space-y-1">
            <label htmlFor="critique-proof-url" className="section-eyebrow block">
              PUBLIC EVIDENCE URL (PUBLIC HTTPS ONLY)
            </label>
            <input
              id="critique-proof-url"
              type="text"
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
              placeholder="https://... (publicly reachable receipt or confirmation link)"
              aria-invalid={Boolean(errors.proof_url)}
              className="w-full px-3 py-2 rounded-lg bg-[#0a0a0a] border border-[#1e1e1e] focus:border-[#6798ff] focus:outline-none text-xs font-mono text-[#ffffff] placeholder-[#7c7c7c]"
            />
            {errors.proof_url && (
              <p className="text-xs text-rose-400 font-mono">{errors.proof_url}</p>
            )}
          </div>

          {/* Proof Description */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="critique-proof-desc" className="section-eyebrow block">
                EVIDENCE SUMMARY / DESCRIPTION
              </label>
              <span className="text-[10px] font-mono text-[#7c7c7c]">
                {proofDescription.length} / 500 (min 10)
              </span>
            </div>
            <input
              id="critique-proof-desc"
              type="text"
              value={proofDescription}
              onChange={(e) => setProofDescription(e.target.value)}
              placeholder="e.g. Official order invoice with transaction ID and product confirmation"
              aria-invalid={Boolean(errors.proof_description)}
              className="w-full px-3 py-2 rounded-lg bg-[#0a0a0a] border border-[#1e1e1e] focus:border-[#6798ff] focus:outline-none text-xs text-[#ffffff] placeholder-[#7c7c7c]"
            />
            {errors.proof_description && (
              <p className="text-xs text-rose-400 font-mono">{errors.proof_description}</p>
            )}
          </div>

          {/* Stake Amount */}
          <div className="space-y-1">
            <label htmlFor="critique-stake-gen" className="section-eyebrow block">
              STAKE AMOUNT (GEN)
            </label>
            <div className="relative">
              <input
                id="critique-stake-gen"
                type="text"
                value={stakeGen}
                onChange={(e) => setStakeGen(e.target.value)}
                placeholder="0.01"
                aria-invalid={Boolean(errors.stake_gen)}
                className="w-full px-3 py-2 rounded-lg bg-[#0a0a0a] border border-[#1e1e1e] focus:border-[#6798ff] focus:outline-none font-mono text-xs text-[#ffffff]"
              />
              <span className="absolute right-3 top-2 text-xs font-mono text-[#6798ff]">
                GEN
              </span>
            </div>
            {errors.stake_gen && (
              <p className="text-xs text-rose-400 font-mono">{errors.stake_gen}</p>
            )}
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-[#1e1e1e] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary text-xs"
            >
              {isSubmitting ? "Locking Stake & Broadcasting..." : `Lock ${stakeGen} GEN Stake & Submit`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
