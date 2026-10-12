"use client";

import React from "react";
import { Listing, PROOF_TYPES_LIST } from "@/types/critiqproof";
import { formatAddress, formatGen, getTrustScoreBadge } from "@/lib/safety";
import { ArrowRightIcon } from "./icons";

export function ListingCard({
  listing,
  onSelect,
}: {
  listing: Listing;
  onSelect?: (listing: Listing) => void;
}) {
  const badge = getTrustScoreBadge(listing.trust_score);
  const isArchived = listing.status === "archived";

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

  const handleClick = (e: React.MouseEvent) => {
    if (onSelect) {
      e.preventDefault();
      onSelect(listing);
    }
  };

  return (
    <div
      onClick={handleClick}
      className="card-dovetail flex flex-col justify-between cursor-pointer group transition-all"
    >
      <div>
        {/* Category & Status */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex flex-wrap gap-1">
            {categories.slice(0, 2).map((cat, idx) => (
              <span key={idx} className="tag-badge text-[#ffffff] border-[#313131]">
                {cat}
              </span>
            ))}
            {categories.length > 2 && (
              <span className="tag-badge text-[#a7a7a7]">+{categories.length - 2}</span>
            )}
          </div>

          <span
            className={`tag-badge ${
              isArchived
                ? "bg-[#1e1e1e] text-[#7c7c7c] border-[#313131]"
                : "bg-emerald-950/20 text-emerald-400 border-emerald-800/40"
            }`}
          >
            {listing.status.toUpperCase()}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-medium text-[#ffffff] text-lg group-hover:text-[#6798ff] transition-colors line-clamp-1">
          {listing.title}
        </h3>

        {/* Description */}
        <p className="mt-2 text-xs text-[#a7a7a7] line-clamp-2 leading-relaxed">
          {listing.description}
        </p>

        {/* Accepted Proof Types */}
        <div className="mt-3 flex flex-wrap gap-1">
          {proofTypes.slice(0, 3).map((pt, idx) => (
            <span
              key={idx}
              className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#0a0a0a] text-[#a7a7a7] border border-[#1e1e1e]"
            >
              {getProofLabel(pt)}
            </span>
          ))}
          {proofTypes.length > 3 && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#0a0a0a] text-[#7c7c7c] border border-[#1e1e1e]">
              +{proofTypes.length - 3}
            </span>
          )}
        </div>

        {/* Trust Score Box */}
        <div className="mt-4 p-3 rounded-lg border border-[#1e1e1e] bg-[#0a0a0a]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="section-eyebrow">TRUST SCORE</span>
            <span className={`tag-badge ${badge.badgeBg} ${badge.badgeText} ${badge.badgeBorder}`}>
              {badge.label}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xl font-medium font-mono text-[#ffffff]">
              {listing.trust_score}%
            </span>
            <span className="text-xs text-[#a7a7a7] font-mono">
              {listing.verified_count} / {listing.review_count} verified
            </span>
          </div>
          <div className="w-full h-1 mt-2 rounded-full bg-[#1e1e1e] overflow-hidden">
            <div
              className="h-full bg-[#6798ff] rounded-full transition-all"
              style={{ width: `${listing.trust_score}%` }}
            />
          </div>
        </div>
      </div>

      {/* Economics Footer */}
      <div className="mt-5 pt-3.5 border-t border-[#1e1e1e] space-y-3">
        <div className="grid grid-cols-3 gap-2 text-xs font-mono">
          <div>
            <span className="text-[#7c7c7c] block text-[10px]">Reward Pool</span>
            <span className="text-[#ffffff] font-medium">{formatGen(listing.reward_pool)} GEN</span>
          </div>
          <div>
            <span className="text-[#7c7c7c] block text-[10px]">Bounty</span>
            <span className="text-[#6798ff] font-medium">+{formatGen(listing.reward_per_review)}</span>
          </div>
          <div>
            <span className="text-[#7c7c7c] block text-[10px]">Min Stake</span>
            <span className="text-[#a7a7a7] font-medium">{formatGen(listing.min_stake)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs pt-1">
          <span className="text-[#7c7c7c] font-mono text-[11px]">
            {formatAddress(listing.owner)}
          </span>
          <button
            onClick={handleClick}
            className="flex items-center gap-1 text-[#6798ff] hover:text-[#ffffff] font-medium text-xs transition-colors cursor-pointer"
          >
            <span>Preview Details</span>
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
