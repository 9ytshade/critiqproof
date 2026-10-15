import { describe, it, expect, vi, beforeEach } from "vitest";

const mockReadContract = vi.fn();
const mockWriteContract = vi.fn();

vi.mock("genlayer-js", () => {
  return {
    createClient: vi.fn(() => ({
      readContract: mockReadContract,
      writeContract: mockWriteContract,
    })),
  };
});

vi.mock("genlayer-js/chains", () => {
  return {
    studionet: { id: 61999, name: "GenLayer Studionet" },
  };
});

import {
  fetchCritiquesDetailed,
  fetchListingDetailed,
  fetchListingsDetailed,
  ensureStudionetNetwork,
  STUDIONET_CHAIN_ID,
} from "./genlayer";

describe("Frontend Contract Integration Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. get_listing_critiques Response Format & Precedence", () => {
    it("handles contract flat array response list[dict] directly", async () => {
      const mockRawCritiques = [
        {
          id: 1,
          listing_id: 10,
          reviewer: "0x1111111111111111111111111111111111111111",
          rating: 5,
          review_text: "Genuine on-chain critique",
          proof_url: "https://proofs.example.com/inv-1.html",
          proof_description: "Paid invoice",
          evidence_hash: "0xabc123",
          stake_amount: "15000000000000000",
          status: "verified",
          attempt_count: 1,
          verdict_id: 1,
          submitted_at: 1776200000,
          verified_at: 1776200050,
        },
      ];

      mockReadContract.mockResolvedValueOnce(mockRawCritiques);

      const result = await fetchCritiquesDetailed(10);
      expect(result.isFallback).toBe(false);
      expect(result.isRpcError).toBe(false);
      expect(result.critiques.length).toBe(1);
      expect(result.critiques[0].id).toBe(1);
      expect(result.critiques[0].status).toBe("verified");
      expect(result.critiques[0].review_text).toBe("Genuine on-chain critique");
    });

    it("ensures genuine empty on-chain listing (0 reviews) takes precedence over fallback demo data", async () => {
      // Contract returns empty list [] for a newly registered listing on-chain
      mockReadContract.mockResolvedValueOnce([]);

      // Even if fallback data exists for listing #1 in mock cache
      const result = await fetchCritiquesDetailed(1);
      expect(result.isFallback).toBe(false);
      expect(result.isRpcError).toBe(false);
      expect(result.critiques).toEqual([]);
      expect(result.critiques.length).toBe(0);
    });

    it("supports legacy { items: [...] } response wrapper gracefully", async () => {
      const mockWrappedCritiques = {
        items: [
          {
            id: 2,
            listing_id: 5,
            reviewer: "0x2222222222222222222222222222222222222222",
            rating: 4,
            review_text: "Wrapped critique structure",
            proof_url: "https://proofs.example.com/rec-2.html",
            proof_description: "Receipt",
            evidence_hash: "0xdef456",
            stake_amount: "20000000000000000",
            status: "exhausted",
            attempt_count: 5,
            verdict_id: 2,
            submitted_at: 1776201000,
            verified_at: 1776201050,
          },
        ],
      };

      mockReadContract.mockResolvedValueOnce(mockWrappedCritiques);

      const result = await fetchCritiquesDetailed(5);
      expect(result.isFallback).toBe(false);
      expect(result.isRpcError).toBe(false);
      expect(result.critiques.length).toBe(1);
      expect(result.critiques[0].status).toBe("exhausted");
      expect(result.critiques[0].attempt_count).toBe(5);
    });
  });

  describe("2. Network Failures & Fallback Records Isolation", () => {
    it("falls back to cached data and sets isFallback and isRpcError when fetchCritiques encounters RPC failure", async () => {
      mockReadContract.mockRejectedValueOnce(new Error("RPC Timeout 504"));

      const result = await fetchCritiquesDetailed(1);
      expect(result.isFallback).toBe(true);
      expect(result.isRpcError).toBe(true);
      expect(result.errorMessage).toContain("RPC Timeout 504");
      expect(result.critiques.length).toBeGreaterThan(0);
    });

    it("falls back to demo listings and sets flags when fetchListings encounters network drop", async () => {
      mockReadContract.mockRejectedValueOnce(new Error("Connection refused"));

      const result = await fetchListingsDetailed();
      expect(result.isFallback).toBe(true);
      expect(result.isRpcError).toBe(true);
      expect(result.errorMessage).toContain("Connection refused");
      expect(result.listings.length).toBeGreaterThan(0);
    });

    it("falls back to demo listing and sets flags when fetchListing encounters network drop", async () => {
      mockReadContract.mockRejectedValueOnce(new Error("Network unreach"));

      const result = await fetchListingDetailed(1);
      expect(result.isFallback).toBe(true);
      expect(result.isRpcError).toBe(true);
      expect(result.listing).not.toBeNull();
      expect(result.listing?.id).toBe(1);
    });
  });

  describe("3. Live Reads & On-Chain Record Parsing", () => {
    it("correctly parses live listing record from on-chain RPC", async () => {
      const liveListing = {
        id: 7,
        owner: "0x4444444444444444444444444444444444444444",
        title: "Live On-Chain Production Listing",
        description: "Verified on Studionet chain directly",
        category: "FinTech & Financial Services",
        verification_criteria: "Order date in 2026",
        proof_type: "invoice",
        reward_pool: "500000000000000000",
        reward_per_review: "50000000000000000",
        min_stake: "20000000000000000",
        status: "active",
        review_count: 3,
        verified_count: 2,
        pending_review_count: 1,
        total_rating_points: 14,
        trust_score: 93,
        created_at: 1776200000,
      };

      mockReadContract.mockResolvedValueOnce(liveListing);

      const result = await fetchListingDetailed(7);
      expect(result.isFallback).toBe(false);
      expect(result.isRpcError).toBe(false);
      expect(result.listing).not.toBeNull();
      expect(result.listing?.id).toBe(7);
      expect(result.listing?.trust_score).toBe(93);
      expect(result.listing?.reward_pool).toBe(500000000000000000n);
    });
  });

  describe("4. Wallet Network Switching & Chain Enforcement", () => {
    it("accepts provider already configured on Studionet (chain 61999)", async () => {
      const mockEth = {
        request: vi.fn().mockImplementation(async ({ method }) => {
          if (method === "eth_chainId") {
            return `0x${STUDIONET_CHAIN_ID.toString(16)}`; // "0xf22f"
          }
          return null;
        }),
      };

      await expect(ensureStudionetNetwork(mockEth)).resolves.not.toThrow();
      expect(mockEth.request).toHaveBeenCalledWith({ method: "eth_chainId" });
    });

    it("triggers wallet_switchEthereumChain when connected on foreign chain", async () => {
      const calls: string[] = [];
      const mockEth = {
        request: vi.fn().mockImplementation(async ({ method }) => {
          calls.push(method);
          if (method === "eth_chainId") {
            return "0x1"; // Ethereum Mainnet
          }
          if (method === "wallet_switchEthereumChain") {
            return null; // Successfully switched
          }
          return null;
        }),
      };

      await ensureStudionetNetwork(mockEth);
      expect(calls).toEqual(["eth_chainId", "wallet_switchEthereumChain"]);
      expect(mockEth.request).toHaveBeenCalledWith({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${STUDIONET_CHAIN_ID.toString(16)}` }],
      });
    });

    it("triggers wallet_addEthereumChain when chain is not yet registered (error 4902)", async () => {
      const calls: string[] = [];
      const mockEth = {
        request: vi.fn().mockImplementation(async ({ method }) => {
          calls.push(method);
          if (method === "eth_chainId") {
            return "0xaa36a7"; // Sepolia
          }
          if (method === "wallet_switchEthereumChain") {
            const err = new Error("Unrecognized chain ID");
            (err as any).code = 4902;
            throw err;
          }
          if (method === "wallet_addEthereumChain") {
            return null; // Added successfully
          }
          return null;
        }),
      };

      await ensureStudionetNetwork(mockEth);
      expect(calls).toEqual(["eth_chainId", "wallet_switchEthereumChain", "wallet_addEthereumChain"]);
    });

    it("rejects immediately when ethereum provider is missing", async () => {
      await expect(ensureStudionetNetwork(null)).rejects.toThrow(
        "MetaMask or compatible Web3 provider not found."
      );
    });
  });
});
