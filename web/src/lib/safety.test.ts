import { describe, it, expect } from "vitest";
import {
  formatAddress,
  formatGen,
  parseGenToWei,
  isValidHttpsUrl,
  calculateTrustScore,
  getTrustScoreBadge,
  clampString,
  validateListingInput,
  validateCritiqueInput,
  WEI_PER_GEN,
} from "./safety";

describe("Safety & Formatting Utilities", () => {
  it("formats ethereum addresses correctly", () => {
    expect(formatAddress(null)).toBe("0x0000...0000");
    expect(formatAddress("0x42960E62f1a41c61426F133c5e5412dd732F9303")).toBe("0x4296...9303");
    expect(formatAddress("short")).toBe("short");
  });

  it("converts between GEN and wei accurately", () => {
    expect(formatGen(0n)).toBe("0");
    expect(formatGen(WEI_PER_GEN)).toBe("1");
    expect(formatGen(WEI_PER_GEN / 2n)).toBe("0.5");
    expect(formatGen(10_000_000_000_000_000n)).toBe("0.01");

    expect(parseGenToWei("1")).toBe(WEI_PER_GEN);
    expect(parseGenToWei("0.5")).toBe(500_000_000_000_000_000n);
    expect(parseGenToWei("0.01")).toBe(10_000_000_000_000_000n);
    expect(parseGenToWei("0")).toBe(0n);
    expect(parseGenToWei("invalid")).toBe(0n);
  });

  it("strictly validates HTTPS URLs", () => {
    expect(isValidHttpsUrl("https://example.com/receipt.pdf").valid).toBe(true);
    expect(isValidHttpsUrl("https://raw.githubusercontent.com/9ytshade/proofpay/master/README.md").valid).toBe(true);

    expect(isValidHttpsUrl("http://insecure.com/proof").valid).toBe(false);
    expect(isValidHttpsUrl("ftp://file.com").valid).toBe(false);
    expect(isValidHttpsUrl("").valid).toBe(false);
    expect(isValidHttpsUrl("https://example .com").valid).toBe(false);
  });

  it("calculates trust score percentage reliably", () => {
    expect(calculateTrustScore(0, 0)).toBe(0);
    expect(calculateTrustScore(1, 1)).toBe(100);
    expect(calculateTrustScore(1, 2)).toBe(50);
    expect(calculateTrustScore(3, 4)).toBe(75);
    expect(calculateTrustScore(0, 5)).toBe(0);
  });

  it("assigns appropriate badge labels and styles", () => {
    expect(getTrustScoreBadge(100).label).toBe("Verified Elite");
    expect(getTrustScoreBadge(80).label).toBe("Verified Elite");
    expect(getTrustScoreBadge(65).label).toBe("Moderate Trust");
    expect(getTrustScoreBadge(20).label).toBe("Unproven / Mixed");
    expect(getTrustScoreBadge(0).label).toBe("No Verified Reviews");
  });

  it("clamps strings safely without breaking words", () => {
    expect(clampString("short text", 20)).toBe("short text");
    expect(clampString("This is a much longer description exceeding length", 15)).toBe("This is a much ...");
  });

  it("validates listing inputs according to protocol constraints", () => {
    const valid = validateListingInput({
      title: "Valid Title",
      description: "This is a legitimate description exceeding twenty chars",
      category: "SaaS & Developer Tools, Web3 & DeFi Protocols",
      verification_criteria: "Criterion 1\nCriterion 2",
      proof_type: "receipt,invoice,contract",
      reward_per_review_gen: "0.02",
      min_stake_gen: "0.01",
      initial_reward_pool_gen: "0.1",
    });
    expect(valid.valid).toBe(true);

    const invalid = validateListingInput({
      title: "Hi",
      description: "Too short",
      category: "",
      verification_criteria: "1\n2\n3\n4\n5\n6",
      proof_type: "",
      reward_per_review_gen: "0.02",
      min_stake_gen: "0",
      initial_reward_pool_gen: "0.1",
    });
    expect(invalid.valid).toBe(false);
    expect(invalid.errors.title).toBeDefined();
    expect(invalid.errors.description).toBeDefined();
    expect(invalid.errors.category).toBeDefined();
    expect(invalid.errors.proof_type).toBeDefined();
    expect(invalid.errors.min_stake_gen).toBeDefined();
  });

  it("validates critique inputs and required stake", () => {
    const minStake = 10_000_000_000_000_000n; // 0.01 GEN
    const valid = validateCritiqueInput(
      {
        listing_id: 1,
        rating: 5,
        review_text: "Thorough review of the product experience with valid details.",
        proof_url: "https://example.com/receipt.pdf",
        proof_description: "Confirmed invoice receipt PDF",
        stake_gen: "0.01",
      },
      minStake
    );
    expect(valid.valid).toBe(true);

    const underStaked = validateCritiqueInput(
      {
        listing_id: 1,
        rating: 5,
        review_text: "Thorough review of the product experience with valid details.",
        proof_url: "https://example.com/receipt.pdf",
        proof_description: "Confirmed invoice receipt PDF",
        stake_gen: "0.005",
      },
      minStake
    );
    expect(underStaked.valid).toBe(false);
    expect(underStaked.errors.stake_gen).toBeDefined();
  });
});
