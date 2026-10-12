"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Listing, PROOF_TYPES_LIST } from "@/types/critiqproof";
import { formatAddress, formatGen, getTrustScoreBadge } from "@/lib/safety";
import { CopyIcon, CheckIcon, ShieldCheckIcon } from "./icons";

export function ListingPreviewModal({
  listing,
  onClose,
}: {
  listing: Listing | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (listing) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [listing, onClose]);

  if (!listing) return null;

  const trustBadge = getTrustScoreBadge(listing.trust_score);
  const categories = listing.category
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  const proofTypes = listing.proof_type
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  const getProofLabel = (id: string) => {
    const found = PROOF_TYPES_LIST.find((item) => item.id === id);
    return found ? found.label : id;
  };

  const criteriaList = listing.verification_criteria
    ? listing.verification_criteria.split("\n").filter((l) => l.trim().length > 0)
    : [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="listing-preview-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-[#313131] bg-[#141414] p-6 shadow-2xl text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[#1e1e1e]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="section-eyebrow">
                LISTING #{listing.id}
              </span>
              <span
                className={`tag-badge ${
                  listing.status === "active"
                    ? "text-emerald-400 border-emerald-800/40 bg-emerald-950/20"
                    : "text-zinc-500 border-zinc-800 bg-zinc-900"
                }`}
              >
                {listing.status.toUpperCase()}
              </span>
            </div>
            <h2 id="listing-preview-title" className="text-xl sm:text-2xl font-medium text-[#ffffff] tracking-tight">
              {listing.title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="text-[#a7a7a7] hover:text-[#ffffff] text-sm font-mono p-1 rounded hover:bg-[#1e1e1e] transition cursor-pointer"
            aria-label="Close modal"
          >
            [ESC]
          </button>
        </div>

        {/* Content Body */}
        <div className="py-5 space-y-5">
          {/* Categories & Owner */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat, idx) => (
                <span key={idx} className="tag-badge text-[#ffffff] border-[#313131]">
                  {cat}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2 font-mono text-xs text-[#a7a7a7]">
              <span>Merchant:</span>
              <span className="text-[#ffffff]">{formatAddress(listing.owner)}</span>
              <button
                onClick={() => {
                  void navigator.clipboard.writeText(listing.owner);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="hover:text-[#ffffff] transition cursor-pointer"
                title="Copy full merchant address"
              >
                {copied ? (
                  <CheckIcon className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <CopyIcon className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <span className="section-eyebrow">DESCRIPTION</span>
            <p className="text-sm text-[#a7a7a7] leading-relaxed">
              {listing.description}
            </p>
          </div>

          {/* Economics Metrics 3-Column Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-lg bg-[#0a0a0a] border border-[#1e1e1e] space-y-1">
              <span className="section-eyebrow block">REWARD POOL</span>
              <div className="text-lg font-medium text-[#ffffff] font-mono">
                {formatGen(listing.reward_pool)} <span className="text-xs text-[#6798ff]">GEN</span>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-[#0a0a0a] border border-[#1e1e1e] space-y-1">
              <span className="section-eyebrow block">BOUNTY / REVIEW</span>
              <div className="text-lg font-medium text-[#ffffff] font-mono">
                {formatGen(listing.reward_per_review)} <span className="text-xs text-[#6798ff]">GEN</span>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-[#0a0a0a] border border-[#1e1e1e] space-y-1">
              <span className="section-eyebrow block">REQUIRED STAKE</span>
              <div className="text-lg font-medium text-[#ffffff] font-mono">
                {formatGen(listing.min_stake)} <span className="text-xs text-[#6798ff]">GEN</span>
              </div>
            </div>
          </div>

          {/* Verification Criteria */}
          <div className="space-y-2 p-3.5 rounded-lg bg-[#0a0a0a] border border-[#1e1e1e]">
            <span className="section-eyebrow flex items-center gap-1.5">
              <ShieldCheckIcon className="w-3.5 h-3.5 text-[#6798ff]" />
              ACCEPTED PROOF TYPES & VERIFICATION CRITERIA
            </span>

            <div className="flex flex-wrap gap-1.5 pt-1 pb-2 border-b border-[#1e1e1e]">
              {proofTypes.map((pt, idx) => (
                <span
                  key={idx}
                  className="tag-badge bg-[#1e1e1e] text-[#6798ff] border-[#6798ff]/30 font-mono text-[11px]"
                >
                  {getProofLabel(pt)}
                </span>
              ))}
            </div>

            {criteriaList.length > 0 ? (
              <ol className="space-y-1.5 text-xs text-[#a7a7a7] list-decimal list-inside font-mono pt-1">
                {criteriaList.map((crit, idx) => (
                  <li key={idx} className="leading-relaxed">
                    <span className="text-[#ffffff] font-sans">{crit}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-xs text-[#a7a7a7]">
                Standard purchase authenticity check applied by GenLayer AI Magistrate.
              </p>
            )}
          </div>

          {/* Trust Score & Review Stats */}
          <div className="flex items-center justify-between p-3.5 rounded-lg bg-[#0a0a0a] border border-[#1e1e1e]">
            <div className="space-y-0.5">
              <span className="section-eyebrow">TRUST SCORE</span>
              <div className="flex items-center gap-2">
                <span className="text-xl font-medium text-[#ffffff] font-mono">
                  {listing.trust_score}%
                </span>
                <span className={`tag-badge ${trustBadge.badgeBg} ${trustBadge.badgeText} ${trustBadge.badgeBorder}`}>
                  {trustBadge.label}
                </span>
              </div>
            </div>

            <div className="text-right space-y-0.5 font-mono text-xs">
              <span className="section-eyebrow">VERIFIED REVIEWS</span>
              <div className="text-[#ffffff]">
                {listing.verified_count} of {listing.review_count} critiques
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-[#1e1e1e] flex flex-col sm:flex-row items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="btn-secondary w-full sm:w-auto"
          >
            Close Preview
          </button>

          <Link
            href={`/listings/${listing.id}`}
            className="btn-primary w-full sm:w-auto text-center"
          >
            Open Full Listing & Stake Review →
          </Link>
        </div>
      </div>
    </div>
  );
}
