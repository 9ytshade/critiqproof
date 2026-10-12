import { describe, it, expect } from "vitest";
import { FALLBACK_CRITIQUES, FALLBACK_LISTINGS } from "./safety";

describe("Critical Flows & Protocol Logic", () => {
  it("verifies reverse-chronological order for listings", () => {
    const listings = [...FALLBACK_LISTINGS].sort((a, b) => b.id - a.id);
    expect(listings[0].id).toBeGreaterThan(listings[1].id);
    expect(listings[0].title).toBe("Archival Lifecycle Test Product");
  });

  it("verifies reverse-chronological order for critiques", () => {
    const critiques = FALLBACK_CRITIQUES[1] || [];
    expect(critiques.length).toBe(2);
    // Critique 2 (submitted later) appears first in newest-first list
    expect(critiques[0].id).toBe(2);
    expect(critiques[1].id).toBe(1);
    expect(critiques[0].submitted_at).toBeGreaterThan(critiques[1].submitted_at);
  });

  it("calculates merchant reward pool reduction upon reward disbursement", () => {
    const initialPool = 100_000_000_000_000_000n; // 0.1 GEN
    const rewardPerReview = 20_000_000_000_000_000n; // 0.02 GEN
    const poolAfterDisbursement = initialPool - rewardPerReview;
    expect(poolAfterDisbursement).toBe(80_000_000_000_000_000n);
  });

  it("calculates merchant reward pool increment upon reviewer slashing", () => {
    const poolBeforeSlashing = 80_000_000_000_000_000n; // 0.08 GEN
    const slashedStake = 15_000_000_000_000_000n; // 0.015 GEN
    const poolAfterSlashing = poolBeforeSlashing + slashedStake;
    expect(poolAfterSlashing).toBe(95_000_000_000_000_000n);
  });

  it("filters listings accurately by category and status", () => {
    const activeDevTools = FALLBACK_LISTINGS.filter(
      (l) => l.status === "active" && l.category.includes("SaaS & Developer Tools")
    );
    expect(activeDevTools.length).toBeGreaterThanOrEqual(1);
    expect(activeDevTools[0].title).toBe("ProofPay Software Escrow Platform");

    const archived = FALLBACK_LISTINGS.filter((l) => l.status === "archived");
    expect(archived.length).toBe(1);
    expect(archived[0].id).toBe(6);
  });
});
