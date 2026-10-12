import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import {
  CreateListingInput,
  Critique,
  Listing,
  SubmitCritiqueInput,
  Verdict,
} from "@/types/critiqproof";
import {
  FALLBACK_CRITIQUES,
  FALLBACK_LISTINGS,
  FALLBACK_VERDICTS,
  parseGenToWei,
} from "./safety";
import { pollTransactionUntilFinalized, FinalizedTransactionReceipt } from "./tx-waiter";

export { pollTransactionUntilFinalized };
export type { FinalizedTransactionReceipt };

export const CRITIQPROOF_CONTRACT_ADDRESS: `0x${string}` =
  (process.env.NEXT_PUBLIC_CRITIQPROOF_CONTRACT_ADDRESS as `0x${string}`) ||
  "0x888371B010c3A012A4c60e61b90c4EEC4Aa8304C";

export const STUDIONET_RPC = "https://studio.genlayer.com/api";
export const STUDIONET_CHAIN_ID = 61999;

export function getPublicClient() {
  return createClient({
    chain: studionet,
    endpoint: STUDIONET_RPC,
  });
}

export type TxHash = Parameters<ReturnType<typeof getPublicClient>["waitForTransactionReceipt"]>[0]["hash"];

export interface FetchListingsResult {
  listings: Listing[];
  isRpcError: boolean;
  errorMessage?: string;
  isFallback: boolean;
}

function parseListingRecord(raw: Record<string, unknown>): Listing {
  return {
    id: Number(raw.id),
    owner: String(raw.owner || ""),
    title: String(raw.title || ""),
    description: String(raw.description || ""),
    category: String(raw.category || "General"),
    verification_criteria: String(raw.verification_criteria || ""),
    proof_type: String(raw.proof_type || "other"),
    reward_pool: BigInt(raw.reward_pool?.toString() || "0"),
    reward_per_review: BigInt(raw.reward_per_review?.toString() || "0"),
    min_stake: BigInt(raw.min_stake?.toString() || "0"),
    status: (raw.status as Listing["status"]) || "active",
    review_count: Number(raw.review_count || 0),
    verified_count: Number(raw.verified_count || 0),
    pending_review_count: Number(raw.pending_review_count || 0),
    total_rating_points: Number(raw.total_rating_points || 0),
    trust_score: Number(raw.trust_score || 0),
    created_at: Number(raw.created_at || 0),
  };
}

function parseCritiqueRecord(raw: Record<string, unknown>): Critique {
  return {
    id: Number(raw.id),
    listing_id: Number(raw.listing_id),
    reviewer: String(raw.reviewer || ""),
    rating: Number(raw.rating || 5),
    review_text: String(raw.review_text || ""),
    proof_url: String(raw.proof_url || ""),
    proof_description: String(raw.proof_description || ""),
    evidence_hash: String(raw.evidence_hash || ""),
    stake_amount: BigInt(raw.stake_amount?.toString() || "0"),
    status: (raw.status as Critique["status"]) || "submitted",
    attempt_count: Number(raw.attempt_count || 0),
    verdict_id: Number(raw.verdict_id || 0),
    submitted_at: Number(raw.submitted_at || 0),
    verified_at: Number(raw.verified_at || 0),
  };
}

function parseVerdictRecord(raw: Record<string, unknown>): Verdict {
  return {
    id: Number(raw.id),
    listing_id: Number(raw.listing_id),
    critique_id: Number(raw.critique_id),
    outcome: (raw.outcome as Verdict["outcome"]) || "UNDETERMINED",
    authenticity_result: (raw.authenticity_result as Verdict["authenticity_result"]) || "UNDETERMINED",
    quality_result: (raw.quality_result as Verdict["quality_result"]) || "UNDETERMINED",
    criteria_results: String(raw.criteria_results || ""),
    criteria_report: String(raw.criteria_report || ""),
    reasoning: String(raw.reasoning || ""),
    evidence_note: String(raw.evidence_note || ""),
    ruled_at: Number(raw.ruled_at || 0),
  };
}

/**
 * Ensures connected Web3 provider is strictly on Studionet (Chain ID 61999)
 * before issuing any write transaction.
 */
export async function ensureStudionetNetwork(ethereum: unknown): Promise<void> {
  if (!ethereum || typeof ethereum !== "object") {
    throw new Error("MetaMask or compatible Web3 provider not found.");
  }
  const eth = ethereum as {
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  };
  const chainIdHex = (await eth.request({ method: "eth_chainId" })) as string;
  const currentId = parseInt(chainIdHex, 16);
  if (currentId !== STUDIONET_CHAIN_ID) {
    const targetChainHex = `0x${STUDIONET_CHAIN_ID.toString(16)}`;
    try {
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: targetChainHex }],
      });
    } catch (switchErr: unknown) {
      const err = switchErr as { code?: number };
      if (err.code === 4902) {
        await eth.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: targetChainHex,
              chainName: "GenLayer Studionet",
              nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
              rpcUrls: [STUDIONET_RPC],
              blockExplorerUrls: ["https://explorer-studio.genlayer.com"],
            },
          ],
        });
      } else {
        throw new Error("Transaction aborted: Please switch network to GenLayer Studionet (Chain ID 61999).");
      }
    }
  }
}

export async function fetchListingsDetailed(): Promise<FetchListingsResult> {
  try {
    const client = getPublicClient();
    const countRaw = await client.readContract({
      address: CRITIQPROOF_CONTRACT_ADDRESS,
      functionName: "get_listing_count",
      args: [],
    });
    const count = Number(countRaw);
    if (count <= 0) {
      return {
        listings: [],
        isRpcError: false,
        isFallback: false,
      };
    }

    const listings: Listing[] = [];
    // Read reverse-chronological (newest-first)
    for (let id = count; id >= 1; id--) {
      try {
        const itemRaw = (await client.readContract({
          address: CRITIQPROOF_CONTRACT_ADDRESS,
          functionName: "get_listing",
          args: [BigInt(id)],
        })) as Record<string, unknown>;
        listings.push(parseListingRecord(itemRaw));
      } catch (innerErr) {
        console.warn(`Failed reading listing #${id}:`, innerErr);
      }
    }
    return {
      listings,
      isRpcError: false,
      isFallback: false,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("fetchListings RPC failure, returning fallback cache:", msg);
    return {
      listings: FALLBACK_LISTINGS,
      isRpcError: true,
      errorMessage: msg,
      isFallback: true,
    };
  }
}

export async function fetchListings(): Promise<Listing[]> {
  const result = await fetchListingsDetailed();
  return result.listings;
}

export async function fetchListing(id: number): Promise<Listing | null> {
  try {
    const client = getPublicClient();
    const itemRaw = (await client.readContract({
      address: CRITIQPROOF_CONTRACT_ADDRESS,
      functionName: "get_listing",
      args: [BigInt(id)],
    })) as Record<string, unknown>;
    return parseListingRecord(itemRaw);
  } catch (err) {
    console.warn(`fetchListing #${id} RPC error, falling back:`, err);
    const fallback = FALLBACK_LISTINGS.find((l) => l.id === id);
    return fallback || null;
  }
}

export async function fetchCritiques(listingId: number): Promise<Critique[]> {
  try {
    const client = getPublicClient();
    const pageData = (await client.readContract({
      address: CRITIQPROOF_CONTRACT_ADDRESS,
      functionName: "get_listing_critiques",
      args: [BigInt(listingId), 0, 50],
    })) as { items: Array<Record<string, unknown>> };

    if (pageData && Array.isArray(pageData.items) && pageData.items.length > 0) {
      return pageData.items.map(parseCritiqueRecord);
    }
    return FALLBACK_CRITIQUES[listingId] || [];
  } catch (err) {
    console.warn(`fetchCritiques for listing #${listingId} error, falling back:`, err);
    return FALLBACK_CRITIQUES[listingId] || [];
  }
}

export async function fetchVerdict(verdictId: number): Promise<Verdict | null> {
  if (verdictId <= 0) return null;
  try {
    const client = getPublicClient();
    const raw = (await client.readContract({
      address: CRITIQPROOF_CONTRACT_ADDRESS,
      functionName: "get_verdict",
      args: [verdictId],
    })) as Record<string, unknown>;
    return parseVerdictRecord(raw);
  } catch (err) {
    console.warn(`fetchVerdict #${verdictId} error, falling back:`, err);
    return FALLBACK_VERDICTS[verdictId] || null;
  }
}

export async function executeCreateListing(
  input: CreateListingInput,
  client: ReturnType<typeof getPublicClient>
): Promise<TxHash> {
  const initialPoolWei = parseGenToWei(input.initial_reward_pool_gen || "0");
  const rewardPerReviewWei = parseGenToWei(input.reward_per_review_gen || "0");
  const minStakeWei = parseGenToWei(input.min_stake_gen || "0.01");

  const hash = await client.writeContract({
    address: CRITIQPROOF_CONTRACT_ADDRESS,
    functionName: "create_listing",
    args: [
      input.title.trim(),
      input.description.trim(),
      input.category.trim(),
      input.verification_criteria.trim(),
      input.proof_type,
      rewardPerReviewWei,
      minStakeWei,
    ],
    value: initialPoolWei,
  });

  return hash as unknown as TxHash;
}

export async function executeSubmitCritique(
  input: SubmitCritiqueInput,
  client: ReturnType<typeof getPublicClient>
): Promise<TxHash> {
  const stakeWei = parseGenToWei(input.stake_gen);

  const hash = await client.writeContract({
    address: CRITIQPROOF_CONTRACT_ADDRESS,
    functionName: "submit_critique",
    args: [
      BigInt(input.listing_id),
      input.rating,
      input.review_text.trim(),
      input.proof_url.trim(),
      input.proof_description.trim(),
    ],
    value: stakeWei,
  });

  return hash as unknown as TxHash;
}

export async function executeVerifyCritique(
  listingId: number,
  critiqueId: number,
  client: ReturnType<typeof getPublicClient>
): Promise<TxHash> {
  const hash = await client.writeContract({
    address: CRITIQPROOF_CONTRACT_ADDRESS,
    functionName: "verify_critique",
    args: [BigInt(listingId), critiqueId],
    value: 0n,
  });

  return hash as unknown as TxHash;
}

export async function executeFundRewardPool(
  listingId: number,
  amountGen: string,
  client: ReturnType<typeof getPublicClient>
): Promise<TxHash> {
  const depositWei = parseGenToWei(amountGen);

  const hash = await client.writeContract({
    address: CRITIQPROOF_CONTRACT_ADDRESS,
    functionName: "fund_reward_pool",
    args: [BigInt(listingId)],
    value: depositWei,
  });

  return hash as unknown as TxHash;
}

export async function executeArchiveListing(
  listingId: number,
  client: ReturnType<typeof getPublicClient>
): Promise<TxHash> {
  const hash = await client.writeContract({
    address: CRITIQPROOF_CONTRACT_ADDRESS,
    functionName: "archive_listing",
    args: [BigInt(listingId)],
    value: 0n,
  });

  return hash as unknown as TxHash;
}
