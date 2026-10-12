import React, { useEffect } from "react";
import { Verdict } from "@/types/critiqproof";
import { formatTimestamp } from "@/lib/safety";
import { CheckCircleIcon, XCircleIcon, ClockIcon, ScaleIcon } from "./icons";

export function VerdictModal({
  verdict,
  onClose,
}: {
  verdict: Verdict | null;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (verdict) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [verdict, onClose]);

  if (!verdict) return null;

  const isVerified = verdict.outcome === "VERIFIED";
  const isRejected = verdict.outcome === "REJECTED";

  const rawLines = verdict.criteria_report
    ? verdict.criteria_report.split("\n").filter((l) => l.trim())
    : [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="verdict-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="w-full max-w-xl rounded-[8px] border border-[var(--color-iron)] bg-[var(--color-graphite)] p-6 shadow-2xl my-8">
        <div className="flex items-center justify-between pb-4 border-b border-[var(--color-iron)]">
          <div className="flex items-center space-x-2.5 text-[var(--color-paper)]">
            <ScaleIcon className="w-5 h-5 text-[var(--color-accent)]" />
            <h3 id="verdict-modal-title" className="font-medium text-base">AI Magistrate Verdict #{verdict.id}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--color-ash)] hover:text-[var(--color-paper)] text-sm font-mono cursor-pointer"
            aria-label="Close verdict modal"
          >
            [CLOSE]
          </button>
        </div>

        <div className="py-5 space-y-5">
          <div className="flex items-center justify-between p-4 rounded-[6px] border border-[var(--color-iron)] bg-[var(--color-carbon)]">
            <div>
              <span className="text-xs text-[var(--color-ash)] font-mono block">Equivalence Consensus Outcome</span>
              <span
                className={`text-lg font-bold font-mono ${
                  isVerified ? "text-[#27a644]" : isRejected ? "text-[#eb5757]" : "text-[var(--color-accent)]"
                }`}
              >
                {verdict.outcome}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs text-[var(--color-ash)] font-mono block">Ruled At</span>
              <span className="text-xs font-mono text-[var(--color-paper)]">
                {formatTimestamp(verdict.ruled_at)}
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-[var(--color-ash)] mb-2">
              Itemized Acceptance Criteria
            </h4>
            <div className="space-y-2">
              {rawLines.map((line, idx) => {
                const passed = line.includes("PASS");
                const failed = line.includes("FAIL");
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-[6px] border border-[var(--color-iron)] bg-[var(--color-carbon)] text-xs font-mono"
                  >
                    <span className="text-[var(--color-paper)]">{line.split(":")[0]}</span>
                    {passed && (
                      <span className="flex items-center space-x-1 text-[#27a644] font-semibold">
                        <CheckCircleIcon className="w-3.5 h-3.5" />
                        <span>PASS</span>
                      </span>
                    )}
                    {failed && (
                      <span className="flex items-center space-x-1 text-[#eb5757] font-semibold">
                        <XCircleIcon className="w-3.5 h-3.5" />
                        <span>FAIL</span>
                      </span>
                    )}
                    {!passed && !failed && (
                      <span className="flex items-center space-x-1 text-[var(--color-accent)] font-semibold">
                        <ClockIcon className="w-3.5 h-3.5" />
                        <span>UNDETERMINED</span>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-[var(--color-ash)] mb-2">
              Validator Consensus Reasoning
            </h4>
            <div className="p-3.5 rounded-[6px] border border-[var(--color-iron)] bg-[var(--color-carbon)] text-xs text-[var(--color-fog)] leading-relaxed font-sans whitespace-pre-wrap">
              {verdict.reasoning || "Consensus established under Equivalence Principle."}
            </div>
          </div>

          {verdict.evidence_note && (
            <div>
              <h4 className="text-xs font-mono uppercase tracking-wider text-[var(--color-ash)] mb-2">
                Evidence Technical Note
              </h4>
              <div className="p-3 rounded-[6px] border border-amber-900/30 bg-amber-950/20 text-xs text-amber-300 font-mono">
                {verdict.evidence_note}
              </div>
            </div>
          )}
        </div>

        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full btn-primary text-xs"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
