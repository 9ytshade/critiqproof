"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Critique, Listing, Verdict } from "@/types/critiqproof";
import { fetchListings, fetchCritiques, fetchVerdict } from "@/lib/genlayer";
import { formatGen } from "@/lib/safety";
import { useWallet } from "@/lib/use-wallet";
import { CritiqueCard } from "@/components/critique-card";
import { VerdictModal } from "@/components/verdict-modal";
import { ShieldIcon, RefreshIcon, PlusIcon } from "@/components/icons";

export default function PortfolioPage() {
  const { account, isConnected } = useWallet();

  const [listings, setListings] = useState<Listing[]>([]);
  const [allCritiques, setAllCritiques] = useState<Critique[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeVerdict, setActiveVerdict] = useState<Verdict | null>(null);

  const loadAll = async () => {
    if (!account) {
      setListings([]);
      setAllCritiques([]);
      return;
    }
    setLoading(true);
    try {
      const lList = await fetchListings();
      setListings(lList);

      const critiquesAccumulator: Critique[] = [];
      for (const l of lList) {
        try {
          const cList = await fetchCritiques(l.id);
          critiquesAccumulator.push(...cList);
        } catch (err) {
          console.warn(`Error loading critiques for listing #${l.id}:`, err);
        }
      }
      setAllCritiques(critiquesAccumulator);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!account) return;
    let active = true;
    (async () => {
      try {
        const lList = await fetchListings();
        if (!active) return;
        setListings(lList);

        const critiquesAccumulator: Critique[] = [];
        for (const l of lList) {
          try {
            const cList = await fetchCritiques(l.id);
            critiquesAccumulator.push(...cList);
          } catch (err) {
            console.warn(`Error loading critiques for listing #${l.id}:`, err);
          }
        }
        if (active) {
          setAllCritiques(critiquesAccumulator);
          setLoading(false);
        }
      } catch {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [account]);

  // Filter critiques submitted by current account
  const myCritiques = useMemo(() => {
    if (!account) return [];
    return allCritiques.filter(
      (c) => c.reviewer.toLowerCase() === account.toLowerCase()
    );
  }, [allCritiques, account]);

  // Filter listings owned by current account
  const myListings = useMemo(() => {
    if (!account) return [];
    return listings.filter(
      (l) => l.owner.toLowerCase() === account.toLowerCase()
    );
  }, [listings, account]);

  const reviewerStats = useMemo(() => {
    const totalStakedWei = myCritiques.reduce((acc, c) => acc + c.stake_amount, 0n);
    const verifiedReviews = myCritiques.filter((c) => c.status === "verified");
    const rejectedReviews = myCritiques.filter((c) => c.status === "rejected");
    const pendingReviews = myCritiques.filter((c) => c.status === "submitted" || c.status === "undetermined");

    const rewardsEarnedWei = verifiedReviews.reduce((acc, c) => {
      const match = listings.find((l) => l.id === c.listing_id);
      return acc + (match ? match.reward_per_review : 0n);
    }, 0n);

    const slashedWei = rejectedReviews.reduce((acc, c) => acc + c.stake_amount, 0n);

    return {
      totalCount: myCritiques.length,
      totalStakedGen: formatGen(totalStakedWei),
      verifiedCount: verifiedReviews.length,
      rejectedCount: rejectedReviews.length,
      pendingCount: pendingReviews.length,
      rewardsEarnedGen: formatGen(rewardsEarnedWei),
      slashedGen: formatGen(slashedWei),
    };
  }, [myCritiques, listings]);

  const merchantStats = useMemo(() => {
    const totalPoolWei = myListings.reduce((acc, l) => acc + l.reward_pool, 0n);
    const totalReviewsAccumulated = myListings.reduce((acc, l) => acc + l.review_count, 0);
    const totalVerifiedAccumulated = myListings.reduce((acc, l) => acc + l.verified_count, 0);
    return {
      listingCount: myListings.length,
      totalPoolGen: formatGen(totalPoolWei),
      totalReviewsAccumulated,
      totalVerifiedAccumulated,
    };
  }, [myListings]);

  const handleOpenVerdict = async (verdictId: number) => {
    const v = await fetchVerdict(verdictId);
    setActiveVerdict(v);
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--color-paper)] tracking-tight">
            Account Portfolio &amp; Staking Ledger
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-fog)] mt-1">
            Track your skin-in-the-game stakes, earned review bounties, and merchant reward pools.
          </p>
        </div>

        <button
          onClick={() => void loadAll()}
          className="flex items-center space-x-1.5 px-3 py-2 rounded-[8px] border border-[var(--color-iron)] bg-[var(--color-graphite)] hover:bg-[var(--color-iron)] text-[var(--color-fog)] hover:text-[var(--color-paper)] text-xs font-mono transition-colors self-start sm:self-auto"
        >
          <RefreshIcon className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Portfolio</span>
        </button>
      </div>

      {!isConnected ? (
        <div className="p-12 text-center rounded-[8px] border border-[var(--color-iron)] bg-[var(--color-graphite)] space-y-4">
          <ShieldIcon className="w-10 h-10 mx-auto text-[var(--color-accent)]" />
          <h2 className="text-lg font-medium text-[var(--color-paper)]">Wallet Disconnected</h2>
          <p className="text-xs text-[var(--color-fog)] max-w-md mx-auto">
            Connect your MetaMask wallet in the top navigation bar to inspect your active stakes and merchant balances.
          </p>
        </div>
      ) : loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 mx-auto border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-mono text-[var(--color-fog)]">Loading portfolio data from Studionet...</p>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Reviewer Section */}
          <div className="space-y-4">
            <h2 className="text-base font-medium text-[var(--color-paper)] flex items-center space-x-2">
              <span>Consumer Reviewer Portfolio</span>
              <span className="text-xs font-mono text-[var(--color-ash)]">
                ({reviewerStats.totalCount} {reviewerStats.totalCount === 1 ? "review" : "reviews"})
              </span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono">
              <div className="p-4 rounded-[8px] border border-[var(--color-iron)] bg-[var(--color-graphite)]">
                <span className="text-[var(--color-ash)] text-xs block mb-1">Total Staked</span>
                <span className="text-xl font-bold text-[var(--color-paper)]">{reviewerStats.totalStakedGen} GEN</span>
                <span className="text-[10px] text-[var(--color-ash)] block mt-1">Skin-in-the-game capital</span>
              </div>
              <div className="p-4 rounded-[8px] border border-[var(--color-iron)] bg-[var(--color-graphite)]">
                <span className="text-[var(--color-ash)] text-xs block mb-1">Bounties Earned</span>
                <span className="text-xl font-bold text-[#27a644]">+{reviewerStats.rewardsEarnedGen} GEN</span>
                <span className="text-[10px] text-[var(--color-ash)] block mt-1">From verified reviews</span>
              </div>
              <div className="p-4 rounded-[8px] border border-[var(--color-iron)] bg-[var(--color-graphite)]">
                <span className="text-[var(--color-ash)] text-xs block mb-1">Verified / Pending</span>
                <span className="text-xl font-bold text-[var(--color-accent)]">
                  {reviewerStats.verifiedCount} <span className="text-[var(--color-ash)] text-sm">/ {reviewerStats.pendingCount}</span>
                </span>
                <span className="text-[10px] text-[var(--color-ash)] block mt-1">Audited vs active</span>
              </div>
              <div className="p-4 rounded-[8px] border border-[var(--color-iron)] bg-[var(--color-graphite)]">
                <span className="text-[var(--color-ash)] text-xs block mb-1">Slashed Stakes</span>
                <span className="text-xl font-bold text-[#eb5757]">-{reviewerStats.slashedGen} GEN</span>
                <span className="text-[10px] text-[var(--color-ash)] block mt-1">
                  {reviewerStats.rejectedCount} fraudulent reviews
                </span>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              {myCritiques.length === 0 ? (
                <div className="p-8 text-center rounded-[8px] border border-[var(--color-iron)] bg-[var(--color-graphite)] text-xs text-[var(--color-fog)] space-y-2">
                  <p>You have not submitted any critiques from this account yet.</p>
                  <Link href="/" className="text-[var(--color-accent)] hover:underline font-mono inline-block">
                    Explore Marketplace Listings
                  </Link>
                </div>
              ) : (
                myCritiques.map((c) => (
                  <CritiqueCard
                    key={c.id}
                    critique={c}
                    onViewVerdict={handleOpenVerdict}
                  />
                ))
              )}
            </div>
          </div>

          {/* Merchant Section */}
          <div className="space-y-4 pt-4 border-t border-[var(--color-iron)]">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-medium text-[var(--color-paper)] flex items-center space-x-2">
                <span>Merchant Creator Listings</span>
                <span className="text-xs font-mono text-[var(--color-ash)]">
                  ({merchantStats.listingCount} owned)
                </span>
              </h2>

              <Link
                href="/listings/create"
                className="btn-primary text-xs inline-flex items-center gap-1.5"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                <span>New Listing</span>
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 font-mono">
              <div className="p-4 rounded-[8px] border border-[var(--color-iron)] bg-[var(--color-graphite)]">
                <span className="text-[var(--color-ash)] text-xs block mb-1">Active Reward Pool</span>
                <span className="text-xl font-bold text-[var(--color-accent)]">{merchantStats.totalPoolGen} GEN</span>
                <span className="text-[10px] text-[var(--color-ash)] block mt-1">Remaining merchant escrow</span>
              </div>
              <div className="p-4 rounded-[8px] border border-[var(--color-iron)] bg-[var(--color-graphite)]">
                <span className="text-[var(--color-ash)] text-xs block mb-1">Total Customer Reviews</span>
                <span className="text-xl font-bold text-[var(--color-paper)]">{merchantStats.totalReviewsAccumulated}</span>
                <span className="text-[10px] text-[var(--color-ash)] block mt-1">Submitted critiques</span>
              </div>
              <div className="p-4 rounded-[8px] border border-[var(--color-iron)] bg-[var(--color-graphite)]">
                <span className="text-[var(--color-ash)] text-xs block mb-1">Verified Reviews</span>
                <span className="text-xl font-bold text-[#27a644]">{merchantStats.totalVerifiedAccumulated}</span>
                <span className="text-[10px] text-[var(--color-ash)] block mt-1">Passed AI Magistrate</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {myListings.length === 0 ? (
                <div className="col-span-full p-8 text-center rounded-[8px] border border-[var(--color-iron)] bg-[var(--color-graphite)] text-xs text-[var(--color-fog)] space-y-2">
                  <p>You have not published any commercial listings from this address.</p>
                  <Link href="/listings/create" className="text-[var(--color-accent)] hover:underline font-mono inline-block">
                    Register a Commercial Listing
                  </Link>
                </div>
              ) : (
                myListings.map((l) => (
                  <div
                    key={l.id}
                    className="p-5 rounded-[8px] border border-[var(--color-iron)] bg-[var(--color-graphite)] space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-[var(--color-ash)]">Listing #{l.id}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[var(--color-carbon)] text-[var(--color-fog)] border border-[var(--color-iron)]">
                        {l.status}
                      </span>
                    </div>
                    <h3 className="font-medium text-[var(--color-paper)] text-sm">{l.title}</h3>
                    <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-[var(--color-iron)]">
                      <span className="text-[var(--color-fog)]">Pool: {formatGen(l.reward_pool)} GEN</span>
                      <Link
                        href={`/listings/${l.id}`}
                        className="text-[var(--color-accent)] hover:underline text-xs"
                      >
                        Manage Listing
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Magistrate Verdict Modal */}
      <VerdictModal
        verdict={activeVerdict}
        onClose={() => setActiveVerdict(null)}
      />
    </div>
  );
}
