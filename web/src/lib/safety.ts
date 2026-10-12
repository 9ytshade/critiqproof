import {
  CreateListingInput,
  Critique,
  Listing,
  SubmitCritiqueInput,
  Verdict,
} from "@/types/critiqproof";

export const WEI_PER_GEN = 1_000_000_000_000_000_000n;

export function formatAddress(address: string | null | undefined): string {
  if (!address) return "0x0000...0000";
  const clean = address.trim();
  if (clean.length < 10) return clean;
  return `${clean.slice(0, 6)}...${clean.slice(-4)}`;
}

export function formatGen(weiVal: bigint | string | number | undefined | null): string {
  if (weiVal === undefined || weiVal === null) return "0.00";
  const wei = typeof weiVal === "bigint" ? weiVal : BigInt(weiVal.toString());
  const whole = wei / WEI_PER_GEN;
  const remainder = wei % WEI_PER_GEN;
  const fractionStr = remainder.toString().padStart(18, "0").slice(0, 4);
  const trimmedFraction = fractionStr.replace(/0+$/, "");
  if (!trimmedFraction) {
    return whole.toString();
  }
  return `${whole}.${trimmedFraction}`;
}

export function parseGenToWei(genStr: string | number): bigint {
  const str = genStr.toString().trim();
  if (!str || isNaN(Number(str)) || Number(str) < 0) return 0n;

  const parts = str.split(".");
  const whole = BigInt(parts[0] || "0");
  if (parts.length === 1) {
    return whole * WEI_PER_GEN;
  }

  const fractionPart = parts[1].slice(0, 18).padEnd(18, "0");
  const fraction = BigInt(fractionPart);
  return whole * WEI_PER_GEN + fraction;
}

export function isValidHttpsUrl(url: string): { valid: boolean; error?: string } {
  const clean = url.trim();
  if (!clean) {
    return { valid: false, error: "URL is required" };
  }
  if (!clean.startsWith("https://")) {
    return { valid: false, error: "URL must use public HTTPS" };
  }
  if (clean.length > 2048) {
    return { valid: false, error: "URL is too long (maximum 2048 characters)" };
  }
  if (/[\s\r\n\t]/.test(clean)) {
    return { valid: false, error: "URL contains invalid whitespace" };
  }
  try {
    const parsed = new URL(clean);
    if (!parsed.hostname.includes(".")) {
      return { valid: false, error: "Invalid domain name" };
    }
  } catch {
    return { valid: false, error: "Malformed URL format" };
  }
  return { valid: true };
}

export function calculateTrustScore(verifiedCount: number, totalReviews: number): number {
  if (totalReviews <= 0 || verifiedCount <= 0) return 0;
  const calculated = Math.floor((verifiedCount * 100) / totalReviews);
  return Math.min(100, Math.max(0, calculated));
}

export function getTrustScoreBadge(score: number): {
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
} {
  if (score >= 80) {
    return {
      label: "Verified Elite",
      badgeBg: "bg-[#141414]",
      badgeText: "text-[#6798ff]",
      badgeBorder: "border-[#6798ff]/50",
    };
  }
  if (score >= 50) {
    return {
      label: "Moderate Trust",
      badgeBg: "bg-[#141414]",
      badgeText: "text-[#ffffff]",
      badgeBorder: "border-[#454545]",
    };
  }
  if (score > 0) {
    return {
      label: "Unproven / Mixed",
      badgeBg: "bg-[#141414]",
      badgeText: "text-[#a7a7a7]",
      badgeBorder: "border-[#313131]",
    };
  }
  return {
    label: "No Verified Reviews",
    badgeBg: "bg-[#0a0a0a]",
    badgeText: "text-[#7c7c7c]",
    badgeBorder: "border-[#1e1e1e]",
  };
}

export function clampString(str: string, maxLength: number): string {
  if (!str) return "";
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength)}...`;
}

export function formatTimestamp(timestamp: number): string {
  if (!timestamp || timestamp <= 0) return "Recent";
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function validateListingInput(input: CreateListingInput): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  const title = input.title.trim();
  if (title.length < 3) errors.title = "Title must be at least 3 characters";
  else if (title.length > 120) errors.title = "Title cannot exceed 120 characters";

  const description = input.description.trim();
  if (description.length < 20) errors.description = "Description must be at least 20 characters";
  else if (description.length > 5000) errors.description = "Description cannot exceed 5000 characters";

  const category = input.category.trim();
  if (category.length < 2) errors.category = "Please select at least one category";
  else if (category.length > 200) errors.category = "Category list cannot exceed 200 characters";

  const proofType = input.proof_type.trim();
  if (!proofType) errors.proof_type = "Please select at least one accepted proof type";

  const criteria = input.verification_criteria.trim();
  if (criteria) {
    const lines = criteria.split("\n").filter((l) => l.trim().length > 0);
    if (lines.length > 5) errors.verification_criteria = "Maximum 5 custom criteria permitted";
    for (const line of lines) {
      if (line.trim().length > 300) {
        errors.verification_criteria = "Each criterion cannot exceed 300 characters";
        break;
      }
    }
  }

  const minStakeWei = parseGenToWei(input.min_stake_gen);
  if (minStakeWei <= 0n) {
    errors.min_stake_gen = "Minimum stake must be greater than zero";
  }

  const rewardPerReviewWei = parseGenToWei(input.reward_per_review_gen);
  if (rewardPerReviewWei < 0n) {
    errors.reward_per_review_gen = "Reward per review cannot be negative";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateCritiqueInput(
  input: SubmitCritiqueInput,
  minStakeWei: bigint
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!input.rating || input.rating < 1 || input.rating > 5) {
    errors.rating = "Rating must be between 1 and 5 stars";
  }

  const text = input.review_text.trim();
  if (text.length < 20) {
    errors.review_text = "Review must be at least 20 characters";
  } else if (text.length > 3000) {
    errors.review_text = "Review cannot exceed 3000 characters";
  }

  const urlValidation = isValidHttpsUrl(input.proof_url);
  if (!urlValidation.valid) {
    errors.proof_url = urlValidation.error || "Invalid proof URL";
  }

  const proofDesc = input.proof_description.trim();
  if (proofDesc.length < 10) {
    errors.proof_description = "Proof description must be at least 10 characters";
  } else if (proofDesc.length > 500) {
    errors.proof_description = "Proof description cannot exceed 500 characters";
  }

  const stakeWei = parseGenToWei(input.stake_gen);
  if (stakeWei < minStakeWei) {
    errors.stake_gen = `Staked amount must be at least ${formatGen(minStakeWei)} GEN`;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export const FALLBACK_LISTINGS: Listing[] = [
  {
    id: 1,
    owner: "0x42960E62f1a41c61426F133c5e5412dd732F9303",
    title: "ProofPay Software Escrow Platform",
    description:
      "AI-native escrow marketplace for public software bounties built on GenLayer with Next.js frontend and Python intelligent contracts.",
    category: "SaaS & Developer Tools, Web3 & DeFi Protocols",
    verification_criteria:
      "Documentation must confirm GenLayer Intelligent Contract integration\nPublic deployment link must reference proofpay-gamma.vercel.app",
    proof_type: "receipt,invoice,contract",
    reward_pool: 95_000_000_000_000_000n, // 0.095 GEN
    reward_per_review: 20_000_000_000_000_000n, // 0.02 GEN
    min_stake: 10_000_000_000_000_000n, // 0.01 GEN
    status: "active",
    review_count: 2,
    verified_count: 1,
    pending_review_count: 0,
    total_rating_points: 5,
    trust_score: 100,
    created_at: 1791503600,
  },
  {
    id: 2,
    owner: "0x42960E62f1a41c61426F133c5e5412dd732F9303",
    title: "ProAudio Wireless Noise-Cancelling Headphones",
    description:
      "Flagship wireless over-ear headphones with active noise cancellation, lossless Bluetooth codec, and 40-hour battery life.",
    category: "Consumer Electronics & Hardware, E-Commerce & Retail",
    verification_criteria:
      "Order receipt must display merchant prefix ACME-\nPurchase date must be within 2026\nItem line must state ProAudio Wireless",
    proof_type: "receipt,order_id",
    reward_pool: 120_000_000_000_000_000n, // 0.12 GEN
    reward_per_review: 30_000_000_000_000_000n, // 0.03 GEN
    min_stake: 15_000_000_000_000_000n, // 0.015 GEN
    status: "active",
    review_count: 1,
    verified_count: 1,
    pending_review_count: 0,
    total_rating_points: 5,
    trust_score: 100,
    created_at: 1791503620,
  },
  {
    id: 3,
    owner: "0x8a92f4c3917de04294b29bb88ff21a8a3014e7a2",
    title: "CloudScale Global Vector Embedding API",
    description:
      "High-throughput vector indexing and hybrid search inference platform with sub-10ms p99 latency guarantees.",
    category: "AI & Machine Learning, SaaS & Developer Tools",
    verification_criteria:
      "API usage dashboard must show active billing tier\nMonthly token volume exceeds 100k tokens",
    proof_type: "subscription,invoice",
    reward_pool: 250_000_000_000_000_000n, // 0.25 GEN
    reward_per_review: 50_000_000_000_000_000n, // 0.05 GEN
    min_stake: 25_000_000_000_000_000n, // 0.025 GEN
    status: "active",
    review_count: 4,
    verified_count: 3,
    pending_review_count: 0,
    total_rating_points: 17,
    trust_score: 75,
    created_at: 1791503650,
  },
  {
    id: 4,
    owner: "0x36728d2a123aB444E603EE5b2ad17d18Bb193557",
    title: "Summit Horizon Alpine Lodge & Spa",
    description:
      "Eco-certified mountain lodge retreat with Nordic spa facilities, ski-in access, and organic culinary experiences.",
    category: "Travel & Hospitality",
    verification_criteria:
      "Booking confirmation reference must start with SH-\nDates must match verified reservation period",
    proof_type: "booking,receipt",
    reward_pool: 180_000_000_000_000_000n, // 0.18 GEN
    reward_per_review: 40_000_000_000_000_000n, // 0.04 GEN
    min_stake: 20_000_000_000_000_000n, // 0.02 GEN
    status: "active",
    review_count: 5,
    verified_count: 5,
    pending_review_count: 0,
    total_rating_points: 24,
    trust_score: 100,
    created_at: 1791503700,
  },
  {
    id: 5,
    owner: "0x4EDbE1FC9EAeC7b0EBA849b0C76AE73Eb0ad5C47",
    title: "CodeCraft Full-Stack Web3 Engineering Bootcamp",
    description:
      "12-week intensive developer cohort covering Solidity, GenLayer intelligent contracts, cryptography, and frontend engineering.",
    category: "EdTech & Professional Courses, Freelance & Digital Agencies",
    verification_criteria:
      "Certificate credential ID must verify on certificate authority\nCompletion date must be verifiable",
    proof_type: "contract,certificate,invoice",
    reward_pool: 80_000_000_000_000_000n, // 0.08 GEN
    reward_per_review: 20_000_000_000_000_000n, // 0.02 GEN
    min_stake: 10_000_000_000_000_000n, // 0.01 GEN
    status: "active",
    review_count: 2,
    verified_count: 1,
    pending_review_count: 0,
    total_rating_points: 8,
    trust_score: 50,
    created_at: 1791503750,
  },
  {
    id: 6,
    owner: "0x42960E62f1a41c61426F133c5e5412dd732F9303",
    title: "Archival Lifecycle Test Product",
    description:
      "Temporary listing created specifically to verify merchant pool archival and refund mechanics on GenLayer Studionet.",
    category: "E-Commerce & Retail",
    verification_criteria: "Criterion verified on-chain",
    proof_type: "receipt,order_id",
    reward_pool: 0n,
    reward_per_review: 10_000_000_000_000_000n,
    min_stake: 10_000_000_000_000_000n,
    status: "archived",
    review_count: 0,
    verified_count: 0,
    pending_review_count: 0,
    total_rating_points: 0,
    trust_score: 0,
    created_at: 1791503620,
  },
];

export const FALLBACK_CRITIQUES: Record<number, Critique[]> = {
  1: [
    {
      id: 2,
      listing_id: 1,
      reviewer: "0x46C036cdDde47392734E1E9d1F355d7F048FE2d8",
      rating: 1,
      review_text:
        "Claimed invoice link is completely broken and returns 404 error from the server.",
      proof_url:
        "https://raw.githubusercontent.com/9ytshade/proofpay/master/nonexistent_fake_invoice_404.json",
      proof_description: "Digital invoice link that fails to load and returns HTTP 404.",
      evidence_hash: "a4c28109d94f27beea928f6e80df0a4cb284910cf98a287126eb39d1b098192a",
      stake_amount: 15_000_000_000_000_000n,
      status: "rejected",
      attempt_count: 1,
      verdict_id: 2,
      submitted_at: 1791503750,
      verified_at: 1791503770,
    },
    {
      id: 1,
      listing_id: 1,
      reviewer: "0x46C036cdDde47392734E1E9d1F355d7F048FE2d8",
      rating: 5,
      review_text:
        "Extensively deployed and verified ProofPay on Studionet. The validator consensus and escrow release mechanics worked as documented.",
      proof_url: "https://raw.githubusercontent.com/9ytshade/proofpay/master/README.md",
      proof_description:
        "Official repository README confirming GenLayer Intelligent Contract integration and live Vercel deployment.",
      evidence_hash: "f67b901e9a34bcda0927da810b19f07a218d6e91024bbca912048b0a9415c0e1",
      stake_amount: 10_000_000_000_000_000n,
      status: "verified",
      attempt_count: 1,
      verdict_id: 1,
      submitted_at: 1791503716,
      verified_at: 1791503740,
    },
  ],
};

export const FALLBACK_VERDICTS: Record<number, Verdict> = {
  1: {
    id: 1,
    listing_id: 1,
    critique_id: 1,
    outcome: "VERIFIED",
    authenticity_result: "PASS",
    quality_result: "PASS",
    criteria_results: "PASS|PASS|PASS|PASS",
    criteria_report:
      "Criterion 1: PASS\nCriterion 2: PASS\nCriterion 3: PASS\nCriterion 4: PASS",
    reasoning:
      "1. Authenticity: The proof evidence includes the official repository README with a live Vercel deployment link, contract address, and detailed documentation confirming interaction with the ProofPay platform on GenLayer Studionet. 2. Quality: The review is substantive, coherent, and consistent with the claimed experience. 3. Custom Rule: The documentation explicitly confirms GenLayer Intelligent Contract integration. 4. Custom Rule: The public deployment link references proofpay-gamma.vercel.app.",
    evidence_note: "",
    ruled_at: 1791503740,
  },
  2: {
    id: 2,
    listing_id: 1,
    critique_id: 2,
    outcome: "REJECTED",
    authenticity_result: "FAIL",
    quality_result: "FAIL",
    criteria_results: "FAIL|FAIL|FAIL|FAIL",
    criteria_report:
      "Criterion 1: FAIL\nCriterion 2: FAIL\nCriterion 3: FAIL\nCriterion 4: FAIL",
    reasoning: "Proof evidence was not found: HTTP 404.",
    evidence_note: "Proof evidence was not found: HTTP 404.",
    ruled_at: 1791503770,
  },
};
