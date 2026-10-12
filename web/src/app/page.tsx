"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { CATEGORIES_LIST, Listing, PROOF_TYPES_LIST } from "@/types/critiqproof";
import { fetchListingsDetailed } from "@/lib/genlayer";
import { formatGen } from "@/lib/safety";
import { ListingCard } from "@/components/listing-card";
import { ListingPreviewModal } from "@/components/listing-preview-modal";
import { PlusIcon, RefreshIcon, ShieldCheckIcon, ScaleIcon, CheckIcon, AlertTriangleIcon } from "@/components/icons";

export default function MarketplaceHomePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [rpcError, setRpcError] = useState<string | null>(null);
  const [isFallbackData, setIsFallbackData] = useState(false);

  // Search & Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedProofTypes, setSelectedProofTypes] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("all");

  // Numeric Range Filters (in GEN)
  const [minRewardPool, setMinRewardPool] = useState("");
  const [maxRewardPool, setMaxRewardPool] = useState("");
  const [minRewardPerReview, setMinRewardPerReview] = useState("");
  const [maxRewardPerReview, setMaxRewardPerReview] = useState("");
  const [minStake, setMinStake] = useState("");
  const [maxStake, setMaxStake] = useState("");

  // Sort state
  const [sortBy, setSortBy] = useState<
    "newest" | "pool-desc" | "reward-desc" | "stake-asc" | "trust-desc" | "reviews-desc"
  >("newest");

  // Preview Modal state
  const [previewListing, setPreviewListing] = useState<Listing | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchListingsDetailed();
      setListings(res.listings);
      setRpcError(res.isRpcError ? (res.errorMessage || "Network read error") : null);
      setIsFallbackData(res.isFallback);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetchListingsDetailed().then((res) => {
      if (active) {
        setListings(res.listings);
        setRpcError(res.isRpcError ? (res.errorMessage || "Network read error") : null);
        setIsFallbackData(res.isFallback);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Category toggle helper
  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  // Proof type toggle helper
  const toggleProofType = (pt: string) => {
    setSelectedProofTypes((prev) =>
      prev.includes(pt) ? prev.filter((p) => p !== pt) : [...prev, pt]
    );
  };

  const resetAllFilters = () => {
    setSearchTerm("");
    setSelectedCategories([]);
    setSelectedProofTypes([]);
    setStatusFilter("all");
    setMinRewardPool("");
    setMaxRewardPool("");
    setMinRewardPerReview("");
    setMaxRewardPerReview("");
    setMinStake("");
    setMaxStake("");
    setSortBy("newest");
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchTerm) count++;
    if (selectedCategories.length > 0) count += selectedCategories.length;
    if (selectedProofTypes.length > 0) count += selectedProofTypes.length;
    if (statusFilter !== "all") count++;
    if (minRewardPool || maxRewardPool) count++;
    if (minRewardPerReview || maxRewardPerReview) count++;
    if (minStake || maxStake) count++;
    return count;
  }, [
    searchTerm,
    selectedCategories,
    selectedProofTypes,
    statusFilter,
    minRewardPool,
    maxRewardPool,
    minRewardPerReview,
    maxRewardPerReview,
    minStake,
    maxStake,
  ]);

  const filteredAndSortedListings = useMemo(() => {
    const filtered = listings.filter((item) => {
      // 1. Text Search
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesDesc = item.description.toLowerCase().includes(q);
        const matchesOwner = item.owner.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesOwner) return false;
      }

      // 2. Status
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }

      // 3. Categories (Multi-select: item must match at least one selected category)
      if (selectedCategories.length > 0) {
        const itemCats = item.category.split(",").map((c) => c.trim().toLowerCase());
        const hasMatch = selectedCategories.some((sc) =>
          itemCats.some((ic) => ic.includes(sc.toLowerCase()))
        );
        if (!hasMatch) return false;
      }

      // 4. Proof Types (Multi-select)
      if (selectedProofTypes.length > 0) {
        const itemProofs = item.proof_type.split(",").map((p) => p.trim().toLowerCase());
        const hasMatch = selectedProofTypes.some((sp) =>
          itemProofs.includes(sp.toLowerCase())
        );
        if (!hasMatch) return false;
      }

      // 5. Numeric Range: Reward Pool
      const poolGen = Number(item.reward_pool) / 1e18;
      if (minRewardPool && poolGen < Number(minRewardPool)) return false;
      if (maxRewardPool && poolGen > Number(maxRewardPool)) return false;

      // 6. Numeric Range: Reward Per Review
      const rewardGen = Number(item.reward_per_review) / 1e18;
      if (minRewardPerReview && rewardGen < Number(minRewardPerReview)) return false;
      if (maxRewardPerReview && rewardGen > Number(maxRewardPerReview)) return false;

      // 7. Numeric Range: Min Stake
      const stakeGen = Number(item.min_stake) / 1e18;
      if (minStake && stakeGen < Number(minStake)) return false;
      if (maxStake && stakeGen > Number(maxStake)) return false;

      return true;
    });

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "pool-desc":
          return b.reward_pool > a.reward_pool ? 1 : -1;
        case "reward-desc":
          return b.reward_per_review > a.reward_per_review ? 1 : -1;
        case "stake-asc":
          return a.min_stake > b.min_stake ? 1 : -1;
        case "trust-desc":
          return b.trust_score - a.trust_score;
        case "reviews-desc":
          return b.review_count - a.review_count;
        case "newest":
        default:
          return b.id - a.id;
      }
    });

    return filtered;
  }, [
    listings,
    searchTerm,
    selectedCategories,
    selectedProofTypes,
    statusFilter,
    minRewardPool,
    maxRewardPool,
    minRewardPerReview,
    maxRewardPerReview,
    minStake,
    maxStake,
    sortBy,
  ]);

  const stats = useMemo(() => {
    const totalListings = listings.length;
    const totalPoolWei = listings.reduce((acc, curr) => acc + curr.reward_pool, 0n);
    const totalVerified = listings.reduce((acc, curr) => acc + curr.verified_count, 0);
    const avgTrust =
      totalListings > 0
        ? Math.round(listings.reduce((acc, curr) => acc + curr.trust_score, 0) / totalListings)
        : 0;
    return {
      totalListings,
      totalPoolGen: formatGen(totalPoolWei),
      totalVerified,
      avgTrust,
    };
  }, [listings]);

  return (
    <div className="space-y-12">
      {/* Hero Command Center Header */}
      <section className="relative rounded-lg border border-[#1e1e1e] bg-[#141414] blueprint-grid p-8 sm:p-12 overflow-hidden">
        <div className="relative max-w-3xl space-y-4">
          <div className="section-eyebrow text-[#6798ff] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#6798ff] animate-pulse" />
            <span>GENLAYER INTELLIGENT CONTRACTS / STAKED CONSUMER ORACLE</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-medium tracking-tight text-[#ffffff] leading-[1.15]">
            Skin-in-the-game consumer critiques.
          </h1>

          <p className="text-base text-[#a7a7a7] leading-relaxed max-w-2xl">
            Fake review farms and unverified complaints corrupt commerce. CritiqProof requires reviewers to lock an anti-Sybil economic stake alongside public digital proof. GenLayer validator magistrates inspect purchase evidence under the Equivalence Principle, releasing merchant bounties or slashing fraudulent stakes.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link href="/listings/create" className="btn-primary">
              <PlusIcon className="w-4 h-4" />
              <span>Register Product Listing</span>
            </Link>

            <Link href="/protocol" className="btn-secondary">
              <span>View Protocol Architecture</span>
            </Link>
          </div>
        </div>
      </section>

      {/* KPI Stat Row (Dovetail 4-Column Stat Blocks) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-dovetail space-y-1">
          <span className="section-eyebrow flex items-center gap-1.5">
            <ScaleIcon className="w-3.5 h-3.5 text-[#6798ff]" />
            TOTAL REWARD POOLS
          </span>
          <div className="text-2xl sm:text-3xl font-medium text-[#ffffff] font-mono">
            {stats.totalPoolGen} <span className="text-xs text-[#6798ff]">GEN</span>
          </div>
          <p className="text-xs text-[#a7a7a7]">Total escrow locked across active listings</p>
        </div>

        <div className="card-dovetail space-y-1">
          <span className="section-eyebrow flex items-center gap-1.5">
            <ShieldCheckIcon className="w-3.5 h-3.5 text-[#6798ff]" />
            VERIFIED CRITIQUES
          </span>
          <div className="text-2xl sm:text-3xl font-medium text-[#ffffff] font-mono">
            {stats.totalVerified}
          </div>
          <p className="text-xs text-[#a7a7a7]">Critiques audited and verified on-chain</p>
        </div>

        <div className="card-dovetail space-y-1">
          <span className="section-eyebrow flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#6798ff]" />
            AVERAGE TRUST SCORE
          </span>
          <div className="text-2xl sm:text-3xl font-medium text-[#ffffff] font-mono">
            {stats.avgTrust}%
          </div>
          <p className="text-xs text-[#a7a7a7]">Aggregate consumer confidence metric</p>
        </div>

        <div className="card-dovetail space-y-1">
          <span className="section-eyebrow flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            MARKETPLACE LISTINGS
          </span>
          <div className="text-2xl sm:text-3xl font-medium text-[#ffffff] font-mono">
            {stats.totalListings}
          </div>
          <p className="text-xs text-[#a7a7a7]">Available products and services to critique</p>
        </div>
      </section>

      {/* Advanced Filtering & Discovery Hub */}
      <section className="card-dovetail space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-[#1e1e1e]">
          <div>
            <h2 className="text-lg font-medium text-[#ffffff]">Marketplace Discovery</h2>
            <p className="text-xs text-[#a7a7a7]">
              Filter by category, acceptable proof types, reward pools, and reviewer stakes
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={loadData}
              disabled={loading}
              className="btn-secondary text-xs py-1.5 px-3"
              title="Refresh listings from chain"
            >
              <RefreshIcon className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>

            {activeFilterCount > 0 && (
              <button
                onClick={resetAllFilters}
                className="text-xs font-mono text-rose-400 hover:text-rose-300 underline cursor-pointer"
              >
                Reset Filters ({activeFilterCount})
              </button>
            )}
          </div>
        </div>

        {/* Search Bar & Primary Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6 lg:col-span-7">
            <input
              type="text"
              placeholder="Search by title, description, or merchant address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg bg-[#0a0a0a] border border-[#1e1e1e] focus:border-[#6798ff] focus:outline-none text-sm text-[#ffffff] placeholder-[#7c7c7c]"
            />
          </div>

          <div className="sm:col-span-3 lg:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "archived")}
              className="w-full px-3 py-2 rounded-lg bg-[#0a0a0a] border border-[#1e1e1e] text-xs font-mono text-[#ffffff] focus:outline-none cursor-pointer"
            >
              <option value="all">Status: All</option>
              <option value="active">Active Only</option>
              <option value="archived">Archived Only</option>
            </select>
          </div>

          <div className="sm:col-span-3 lg:col-span-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="w-full px-3 py-2 rounded-lg bg-[#0a0a0a] border border-[#1e1e1e] text-xs font-mono text-[#ffffff] focus:outline-none cursor-pointer"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="pool-desc">Highest Reward Pool</option>
              <option value="reward-desc">Highest Bounty / Review</option>
              <option value="stake-asc">Lowest Stake Required</option>
              <option value="trust-desc">Highest Trust Score</option>
              <option value="reviews-desc">Most Critiques</option>
            </select>
          </div>
        </div>

        {/* Multi-Category Filter Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="section-eyebrow">FILTER BY CATEGORIES (MULTI-SELECT)</span>
            {selectedCategories.length > 0 && (
              <span className="text-[11px] font-mono text-[#6798ff]">
                {selectedCategories.length} selected
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Category filters">
            <button
              onClick={() => setSelectedCategories([])}
              role="button"
              aria-pressed={selectedCategories.length === 0}
              aria-label="Filter by all categories"
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono border cursor-pointer transition ${
                selectedCategories.length === 0
                  ? "bg-[#6798ff]/20 text-white border-[#6798ff] font-medium shadow-[0_0_10px_rgba(103,152,255,0.25)]"
                  : "bg-[#141414] text-[#a7a7a7] border-[#1e1e1e] hover:border-[#454545] hover:text-white"
              }`}
            >
              {selectedCategories.length === 0 && <CheckIcon className="w-3.5 h-3.5 text-[#6798ff]" />}
              <span>All Categories</span>
            </button>

            {CATEGORIES_LIST.map((cat) => {
              const isSelected = selectedCategories.includes(cat);
              return (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  role="button"
                  aria-pressed={isSelected}
                  aria-label={`Filter by category ${cat}`}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono border cursor-pointer transition ${
                    isSelected
                      ? "bg-[#6798ff]/20 text-white border-[#6798ff] font-medium shadow-[0_0_10px_rgba(103,152,255,0.25)]"
                      : "bg-[#141414] text-[#a7a7a7] border-[#1e1e1e] hover:border-[#454545] hover:text-white"
                  }`}
                >
                  {isSelected && <CheckIcon className="w-3.5 h-3.5 text-[#6798ff]" />}
                  <span>{cat}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Multi-Proof Types Filter */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="section-eyebrow">FILTER BY ACCEPTED PROOF TYPES</span>
            {selectedProofTypes.length > 0 && (
              <span className="text-[11px] font-mono text-[#6798ff]">
                {selectedProofTypes.length} selected
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Proof type filters">
            <button
              onClick={() => setSelectedProofTypes([])}
              role="button"
              aria-pressed={selectedProofTypes.length === 0}
              aria-label="Filter by any proof type"
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono border cursor-pointer transition ${
                selectedProofTypes.length === 0
                  ? "bg-[#6798ff]/20 text-white border-[#6798ff] font-medium shadow-[0_0_10px_rgba(103,152,255,0.25)]"
                  : "bg-[#141414] text-[#a7a7a7] border-[#1e1e1e] hover:border-[#454545] hover:text-white"
              }`}
            >
              {selectedProofTypes.length === 0 && <CheckIcon className="w-3.5 h-3.5 text-[#6798ff]" />}
              <span>Any Proof Type</span>
            </button>

            {PROOF_TYPES_LIST.map((pt) => {
              const isSelected = selectedProofTypes.includes(pt.id);
              return (
                <button
                  key={pt.id}
                  onClick={() => toggleProofType(pt.id)}
                  role="button"
                  aria-pressed={isSelected}
                  aria-label={`Filter by proof type ${pt.label}`}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono border cursor-pointer transition ${
                    isSelected
                      ? "bg-[#6798ff]/20 text-white border-[#6798ff] font-medium shadow-[0_0_10px_rgba(103,152,255,0.25)]"
                      : "bg-[#141414] text-[#a7a7a7] border-[#1e1e1e] hover:border-[#454545] hover:text-white"
                  }`}
                >
                  {isSelected && <CheckIcon className="w-3.5 h-3.5 text-[#6798ff]" />}
                  <span>{pt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Numeric Range Filters: Reward Pool, Bounty, Stake */}
        <div className="pt-2 border-t border-[#1e1e1e] space-y-3">
          <span className="section-eyebrow block">NUMERIC RANGE FILTERS (GEN)</span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
            {/* Reward Pool Range */}
            <div className="p-3 rounded-lg bg-[#0a0a0a] border border-[#1e1e1e] space-y-2">
              <span className="text-[#a7a7a7] block text-[11px]">Reward Pool (GEN)</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minRewardPool}
                  onChange={(e) => setMinRewardPool(e.target.value)}
                  className="w-1/2 px-2.5 py-1.5 rounded bg-[#141414] border border-[#1e1e1e] focus:border-[#6798ff] focus:outline-none text-[#ffffff]"
                />
                <span className="text-[#7c7c7c]">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxRewardPool}
                  onChange={(e) => setMaxRewardPool(e.target.value)}
                  className="w-1/2 px-2.5 py-1.5 rounded bg-[#141414] border border-[#1e1e1e] focus:border-[#6798ff] focus:outline-none text-[#ffffff]"
                />
              </div>
            </div>

            {/* Bounty Per Review Range */}
            <div className="p-3 rounded-lg bg-[#0a0a0a] border border-[#1e1e1e] space-y-2">
              <span className="text-[#a7a7a7] block text-[11px]">Bounty / Review (GEN)</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minRewardPerReview}
                  onChange={(e) => setMinRewardPerReview(e.target.value)}
                  className="w-1/2 px-2.5 py-1.5 rounded bg-[#141414] border border-[#1e1e1e] focus:border-[#6798ff] focus:outline-none text-[#ffffff]"
                />
                <span className="text-[#7c7c7c]">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxRewardPerReview}
                  onChange={(e) => setMaxRewardPerReview(e.target.value)}
                  className="w-1/2 px-2.5 py-1.5 rounded bg-[#141414] border border-[#1e1e1e] focus:border-[#6798ff] focus:outline-none text-[#ffffff]"
                />
              </div>
            </div>

            {/* Required Stake Range */}
            <div className="p-3 rounded-lg bg-[#0a0a0a] border border-[#1e1e1e] space-y-2">
              <span className="text-[#a7a7a7] block text-[11px]">Required Stake (GEN)</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minStake}
                  onChange={(e) => setMinStake(e.target.value)}
                  className="w-1/2 px-2.5 py-1.5 rounded bg-[#141414] border border-[#1e1e1e] focus:border-[#6798ff] focus:outline-none text-[#ffffff]"
                />
                <span className="text-[#7c7c7c]">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxStake}
                  onChange={(e) => setMaxStake(e.target.value)}
                  className="w-1/2 px-2.5 py-1.5 rounded bg-[#141414] border border-[#1e1e1e] focus:border-[#6798ff] focus:outline-none text-[#ffffff]"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Network / RPC Error Banner */}
      {rpcError && (
        <div
          role="alert"
          className="p-4 rounded-lg border border-amber-800/60 bg-amber-950/30 text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangleIcon className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-amber-900/60 text-amber-300 font-semibold border border-amber-700/50">
                  RPC DEGRADED
                </span>
                <span className="text-sm font-medium text-white">Studionet Connection Warning</span>
              </div>
              <p className="text-xs text-amber-200/80">
                {isFallbackData
                  ? "Studionet node did not respond to live queries. Displaying cached verified listings. Live consensus updates may be delayed."
                  : rpcError}
              </p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="px-3 py-1.5 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-100 text-xs font-mono transition cursor-pointer shrink-0"
          >
            Retry RPC Connection
          </button>
        </div>
      )}

      {/* Listings Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-medium text-[#ffffff]">Marketplace Listings</h2>
            <span className="tag-badge">
              {filteredAndSortedListings.length} {filteredAndSortedListings.length === 1 ? "result" : "results"}
            </span>
          </div>

          <span className="text-xs text-[#a7a7a7]">
            Click any card to preview full details and stake
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center space-y-3 border border-[#1e1e1e] rounded-lg bg-[#141414]">
            <RefreshIcon className="w-6 h-6 animate-spin mx-auto text-[#6798ff]" />
            <p className="text-sm font-mono text-[#a7a7a7]">
              Reading verified listings from GenLayer Studionet...
            </p>
          </div>
        ) : filteredAndSortedListings.length === 0 ? (
          <div className="py-16 text-center space-y-3 border border-[#1e1e1e] rounded-lg bg-[#141414]">
            <p className="text-sm text-[#ffffff] font-medium">No listings match your search criteria</p>
            <p className="text-xs text-[#a7a7a7]">Try clearing some filters or searching for different keywords</p>
            <button
              onClick={resetAllFilters}
              className="btn-secondary text-xs mt-2"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedListings.map((item) => (
              <ListingCard
                key={item.id}
                listing={item}
                onSelect={(selected) => setPreviewListing(selected)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Listing Preview Modal */}
      <ListingPreviewModal
        listing={previewListing}
        onClose={() => setPreviewListing(null)}
      />
    </div>
  );
}
