"use client";

import React, { useEffect, useRef } from "react";
import { CheckCircleIcon, XCircleIcon, ClockIcon } from "./icons";

export interface TransactionStep {
  name: string;
  hash?: string;
  status: "idle" | "signing" | "broadcasting" | "consensus" | "finalized" | "error";
  error?: string;
}

export function TransactionLifecycleModal({
  step,
  onClose,
}: {
  step: TransactionStep | null;
  onClose: () => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && (step?.status === "finalized" || step?.status === "error")) {
        onClose();
      }
    }
    if (step && step.status !== "idle") {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
      if (step.status === "finalized" || step.status === "error") {
        closeButtonRef.current?.focus();
      }
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [step, onClose]);

  if (!step || step.status === "idle") return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tx-lifecycle-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
          <h3 id="tx-lifecycle-title" className="font-semibold text-zinc-100 text-base">
            {step.name}
          </h3>
          {(step.status === "finalized" || step.status === "error") && (
            <button
              onClick={onClose}
              className="text-zinc-500 hover:text-zinc-300 text-sm font-mono cursor-pointer"
              aria-label="Close transaction modal"
            >
              [CLOSE]
            </button>
          )}
        </div>

        <div className="py-6 space-y-4">
          {step.status === "signing" && (
            <div className="flex items-center space-x-3 text-cyan-400">
              <ClockIcon className="w-6 h-6 animate-spin" />
              <div>
                <p className="font-medium text-zinc-200">Awaiting Signature</p>
                <p className="text-xs text-zinc-400">Sign the transaction in your connected wallet.</p>
              </div>
            </div>
          )}

          {step.status === "broadcasting" && (
            <div className="flex items-center space-x-3 text-cyan-400">
              <ClockIcon className="w-6 h-6 animate-pulse" />
              <div>
                <p className="font-medium text-zinc-200">Broadcasting Transaction</p>
                <p className="text-xs text-zinc-400">Relaying to GenLayer Studionet RPC node.</p>
              </div>
            </div>
          )}

          {step.status === "consensus" && (
            <div className="flex items-center space-x-3 text-cyan-400">
              <ClockIcon className="w-6 h-6 animate-spin" />
              <div>
                <p className="font-medium text-zinc-200">Validator Consensus In Progress</p>
                <p className="text-xs text-zinc-400">Validators executing Equivalence Principle consensus.</p>
              </div>
            </div>
          )}

          {step.status === "finalized" && (
            <div className="flex items-center space-x-3 text-emerald-400">
              <CheckCircleIcon className="w-6 h-6" />
              <div>
                <p className="font-medium text-zinc-200">Consensus Finalized</p>
                <p className="text-xs text-zinc-400">Transaction confirmed on Studionet block.</p>
              </div>
            </div>
          )}

          {step.status === "error" && (
            <div className="flex items-center space-x-3 text-rose-400">
              <XCircleIcon className="w-6 h-6" />
              <div>
                <p className="font-medium text-zinc-200">Execution Failed</p>
                <p className="text-xs text-rose-300 font-mono break-all">{step.error || "Transaction reverted"}</p>
              </div>
            </div>
          )}

          {step.hash && (
            <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs font-mono">
              <span className="text-zinc-500">Hash: </span>
              <span className="text-zinc-300 break-all">{step.hash}</span>
            </div>
          )}
        </div>

        {(step.status === "finalized" || step.status === "error") && (
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="w-full py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-medium text-sm transition-colors cursor-pointer"
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
}
