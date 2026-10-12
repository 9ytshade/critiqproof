export const PROOF_TYPES_LIST = [
  { id: "receipt", label: "Receipt / POS Voucher" },
  { id: "order_id", label: "Digital Order Confirmation" },
  { id: "invoice", label: "Commercial Invoice" },
  { id: "booking", label: "Booking / Reservation" },
  { id: "subscription", label: "SaaS Subscription / License" },
  { id: "contract", label: "Digital Contract / Agreement" },
  { id: "delivery_note", label: "Delivery Tracking / Bill of Lading" },
  { id: "other", label: "Other Public Evidence" },
] as const;

export type ProofTypeId = (typeof PROOF_TYPES_LIST)[number]["id"];
export type ProofType = string;

export const CATEGORIES_LIST = [
  "SaaS & Developer Tools",
  "E-Commerce & Retail",
  "Web3 & DeFi Protocols",
  "AI & Machine Learning",
  "Travel & Hospitality",
  "Consumer Electronics & Hardware",
  "Freelance & Digital Agencies",
  "EdTech & Professional Courses",
  "Logistics & Delivery",
  "FinTech & Financial Services",
  "Health, Wellness & Fitness",
  "Gaming, Media & Entertainment",
] as const;

export type CategoryName = (typeof CATEGORIES_LIST)[number];

export type ListingStatus = "active" | "archived";

export type CritiqueStatus = "submitted" | "verified" | "rejected" | "undetermined";

export type VerdictOutcome = "VERIFIED" | "REJECTED" | "UNDETERMINED";

export type CriterionResult = "PASS" | "FAIL" | "UNDETERMINED";

export interface Listing {
  id: number;
  owner: string;
  title: string;
  description: string;
  category: string;
  verification_criteria: string;
  proof_type: string;
  reward_pool: bigint;
  reward_per_review: bigint;
  min_stake: bigint;
  status: ListingStatus;
  review_count: number;
  verified_count: number;
  pending_review_count: number;
  total_rating_points: number;
  trust_score: number;
  created_at: number;
}

export interface Critique {
  id: number;
  listing_id: number;
  reviewer: string;
  rating: number;
  review_text: string;
  proof_url: string;
  proof_description: string;
  evidence_hash: string;
  stake_amount: bigint;
  status: CritiqueStatus;
  attempt_count: number;
  verdict_id: number;
  submitted_at: number;
  verified_at: number;
}

export interface Verdict {
  id: number;
  listing_id: number;
  critique_id: number;
  outcome: VerdictOutcome;
  authenticity_result: CriterionResult;
  quality_result: CriterionResult;
  criteria_results: string;
  criteria_report: string;
  reasoning: string;
  evidence_note: string;
  ruled_at: number;
}

export interface CreateListingInput {
  title: string;
  description: string;
  category: string;
  verification_criteria: string;
  proof_type: string;
  reward_per_review_gen: string;
  min_stake_gen: string;
  initial_reward_pool_gen: string;
}

export interface SubmitCritiqueInput {
  listing_id: number;
  rating: number;
  review_text: string;
  proof_url: string;
  proof_description: string;
  stake_gen: string;
}
