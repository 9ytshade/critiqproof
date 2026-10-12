"use client";

import { STUDIONET_RPC } from "./genlayer";

export interface FinalizedTransactionReceipt {
  hash: string;
  status: "FINALIZED";
  executionStatus: "SUCCESS" | "REVERTED";
  resultCode?: number;
  blockNumber?: number;
  raw?: Record<string, unknown>;
}

const PENDING_STORAGE_KEY = "critiqproof-pending-txs";

interface StoredPendingTx {
  hash: string;
  action: string;
  submittedAt: number;
}

export function savePendingTx(hash: string, action: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(PENDING_STORAGE_KEY);
    const list: StoredPendingTx[] = raw ? JSON.parse(raw) : [];
    if (!list.some((item) => item.hash.toLowerCase() === hash.toLowerCase())) {
      list.push({ hash, action, submittedAt: Date.now() });
      window.localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(list));
    }
  } catch (err) {
    console.warn("Failed saving pending transaction to localStorage:", err);
  }
}

export function removePendingTx(hash: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(PENDING_STORAGE_KEY);
    if (!raw) return;
    const list: StoredPendingTx[] = JSON.parse(raw);
    const filtered = list.filter((item) => item.hash.toLowerCase() !== hash.toLowerCase());
    window.localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.warn("Failed removing pending transaction from localStorage:", err);
  }
}

export function getPendingTxs(): StoredPendingTx[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PENDING_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Robust terminal transaction polling enforcing confirmed finality.
 * Enforces true FINALIZED status from the GenLayer Studionet RPC and checks execution status.
 * Rejects if the transaction reverts, times out, or fails consensus.
 */
export async function pollTransactionUntilFinalized(
  hash: string,
  options: {
    maxAttempts?: number;
    intervalMs?: number;
    actionName?: string;
  } = {}
): Promise<FinalizedTransactionReceipt> {
  const maxAttempts = options.maxAttempts ?? 120; // 120 attempts @ 3000ms = 6 minutes max
  const intervalMs = options.intervalMs ?? 3000;
  const actionName = options.actionName ?? "Transaction";

  savePendingTx(hash, actionName);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(STUDIONET_RPC, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: attempt,
          method: "gen_getTransactionByHash",
          params: [hash],
        }),
      });

      if (response.ok) {
        const payload = (await response.json()) as {
          result?: {
            status?: string;
            result?: number;
            block_number?: number;
            [key: string]: unknown;
          };
          error?: { message?: string; code?: number };
        };

        if (payload.result) {
          const txData = payload.result;
          const statusRaw = String(txData.status || "").toUpperCase();

          // Reject fatal terminal failures immediately
          if (statusRaw === "REVERTED" || statusRaw === "FAILED") {
            removePendingTx(hash);
            throw new Error(`${actionName} transaction was reverted on Studionet.`);
          }

          if (statusRaw === "UNDETERMINED") {
            removePendingTx(hash);
            throw new Error(`${actionName} reached UNDETERMINED consensus state.`);
          }

          // ACCEPTED is NOT finalized. Keep polling!
          if (statusRaw === "FINALIZED") {
            // Check execution status code: result code 6 represents EVM revert
            const resultCode = txData.result !== undefined ? Number(txData.result) : undefined;
            if (resultCode === 6) {
              removePendingTx(hash);
              throw new Error(
                `${actionName} reached consensus finality but the contract execution reverted (code 6).`
              );
            }

            removePendingTx(hash);
            return {
              hash,
              status: "FINALIZED",
              executionStatus: "SUCCESS",
              resultCode,
              blockNumber: txData.block_number ? Number(txData.block_number) : undefined,
              raw: txData,
            };
          }
        }
      }
    } catch (pollErr: unknown) {
      const msg = pollErr instanceof Error ? pollErr.message : String(pollErr);
      if (msg.includes("reverted") || msg.includes("UNDETERMINED")) {
        throw pollErr;
      }
      // Network hiccup during polling is tolerable until maxAttempts
      console.warn(`Polling attempt ${attempt}/${maxAttempts} for ${hash} warning:`, msg);
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  removePendingTx(hash);
  throw new Error(
    `Polling timeout: ${actionName} (${hash.slice(0, 10)}...) did not reach FINALIZED status within ${
      (maxAttempts * intervalMs) / 1000
    }s.`
  );
}
