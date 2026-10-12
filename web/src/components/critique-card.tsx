import React from "react";
import { Critique } from "@/types/critiqproof";
import { formatAddress, formatGen, formatTimestamp } from "@/lib/safety";
import { StarIcon, ExternalLinkIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from "./icons";

export function CritiqueCard({
  critique,
  onViewVerdict,
  onTriggerVerify,
  isVerifying = false,
}: {
  critique: Critique;
  onViewVerdict?: (verdictId: number) => void;
  onTriggerVerify?: (critiqueId: number) => void;
  isVerifying?: boolean;
}) {
  const isVerified = critique.status === "verified";
  const isRejected = critique.status === "rejected";
  const isPending = critique.status === "submitted" || critique.status === "undetermined";

  return (
    <div className="card-box bg-[var(--color-graphite)] p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--color-iron)]">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 text-amber-400">
            {[1, 2, 3, 4, 5].map((star) => (
              <StarIcon key={star} filled={star <= critique.rating} className="w-4 h-4" />
            ))}
          </div>
          <span className="text-xs font-mono text-[var(--color-ash)]">
            By {formatAddress(critique.reviewer)}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {isVerified && (
            <span className="flex items-center space-x-1 px-2.5 py-1 rounded-[6px] text-xs font-mono bg-[var(--color-carbon)] text-[#27a644] border border-[#27a644]/30">
              <CheckCircleIcon className="w-3.5 h-3.5" />
              <span>Verified Authentic</span>
            </span>
          )}
          {isRejected && (
            <span className="flex items-center space-x-1 px-2.5 py-1 rounded-[6px] text-xs font-mono bg-[var(--color-carbon)] text-[#eb5757] border border-[#eb5757]/30">
              <XCircleIcon className="w-3.5 h-3.5" />
              <span>Fraudulent / Slashed</span>
            </span>
          )}
          {isPending && (
            <span className="flex items-center space-x-1 px-2.5 py-1 rounded-[6px] text-xs font-mono bg-[var(--color-carbon)] text-[var(--color-accent)] border border-[var(--color-accent)]/30">
              <ClockIcon className="w-3.5 h-3.5" />
              <span>Pending Consensus</span>
            </span>
          )}
          <span className="text-[11px] font-mono text-[var(--color-ash)]">
            {formatTimestamp(critique.submitted_at)}
          </span>
        </div>
      </div>

      <p className="text-[var(--color-paper)] text-sm leading-relaxed whitespace-pre-wrap">
        {critique.review_text}
      </p>

      <div className="p-3.5 rounded-[8px] border border-[var(--color-iron)] bg-[var(--color-carbon)] space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-medium text-[var(--color-paper)]">Public Purchase Proof</span>
          <span className="font-mono text-[var(--color-ash)]">
            Staked: <strong className="text-[var(--color-paper)]">{formatGen(critique.stake_amount)} GEN</strong>
          </span>
        </div>
        <p className="text-[var(--color-fog)] text-xs">{critique.proof_description}</p>
        <div className="pt-1">
          <a
            href={critique.proof_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1.5 text-[var(--color-accent)] hover:underline font-mono text-xs break-all transition-colors"
          >
            <span>{critique.proof_url}</span>
            <ExternalLinkIcon className="w-3.5 h-3.5 flex-shrink-0" />
          </a>
        </div>
      </div>

      <div className="flex items-center justify-end pt-2 space-x-3">
        {critique.verdict_id > 0 && onViewVerdict && (
          <button
            onClick={() => onViewVerdict(critique.verdict_id)}
            className="btn-ghost text-xs"
          >
            View AI Verdict #{critique.verdict_id}
          </button>
        )}

        {isPending && onTriggerVerify && (
          <button
            onClick={() => onTriggerVerify(critique.id)}
            disabled={isVerifying}
            className="btn-primary text-xs disabled:opacity-50"
          >
            {isVerifying ? "Verifying On-Chain..." : "Audit via AI Magistrate"}
          </button>
        )}
      </div>
    </div>
  );
}
