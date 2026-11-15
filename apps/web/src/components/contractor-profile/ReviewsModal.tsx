'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Star,
  Search,
  Clock,
  CheckCircle2,
  CornerDownRight,
  SlidersHorizontal,
} from 'lucide-react';
import type { RooferProvider } from '@/data/mockRoofers';
import { fetchProviderBySlug, type ScrapedReviewItemDto } from '@/lib/api';
import {
  GoogleLogo,
  YelpLogo,
  HomeAdvisorLogo,
  HouzzLogo,
  FacebookLogo,
} from './PlatformLogos';

interface ReviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: RooferProvider;
  scrapedReviews?: ScrapedReviewItemDto[];
  initialPlatform?: string;
}

function formatReviewDate(rawDate?: string | null): string {
  const val = (rawDate || '').trim();
  if (!val) return 'Verified Review';
  // Format ISO timestamps like "2018-06-27T10:59:04Z" or "2024-03-15" cleanly
  if (/^\d{4}-\d{2}-\d{2}(?:[T\s].*)?$/.test(val)) {
    const parsed = new Date(val);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  }
  return val;
}

function cleanReviewerName(rawName?: string): string {
  const name = (rawName || '').trim();
  if (!name) return 'Verified Homeowner';
  if (/^HU-\d+$/i.test(name)) return 'Verified Houzz Homeowner';
  // Strip Houzz obfuscated hash token prefix before real surname (e.g. "E2Isk.../TlN Levine" -> "Levine")
  const parts = name.split(/\s+/);
  if (parts.length >= 2 && parts[0].length > 20 && /[+/0-9]/.test(parts[0])) {
    return parts.slice(1).join(' ');
  }
  return name;
}

function parseReviewCommentAndOwnerReply(
  rawComment: string,
  businessName: string,
  existingDate?: string
): {
  customerComment: string;
  ownerReply: string | null;
  extractedDate: string | null;
} {
  let text = (rawComment || '').trim();
  // Clean trailing Google Maps structured metadata tags ("Price assessment\nReasonable price\nServices\n...")
  text = text
    .replace(/\nPrice assessment\n[\s\S]*$/i, '')
    .replace(/\nServices\n[^\n]+$/i, '')
    .trim();

  const escapedBiz = businessName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const replyRegex = new RegExp(
    `([A-Z][a-z]+\\s+\\d{1,2},\\s+\\d{4})?\\s*Comment\\s+from\\s+(?:${escapedBiz}|the\\s+Owner|Business)\\s*:\\s*([\\s\\S]+)$`,
    'i'
  );
  const match = text.match(replyRegex);

  if (match && typeof match.index === 'number') {
    const before = text.slice(0, match.index).trim();
    const inlineDate = match[1]?.trim() || null;
    const replyText = match[2]?.trim() || null;
    return {
      customerComment: before || text,
      ownerReply: replyText,
      extractedDate: existingDate || inlineDate,
    };
  }

  return {
    customerComment: text,
    ownerReply: null,
    extractedDate: existingDate || null,
  };
}

export default function ReviewsModal({
  isOpen,
  onClose,
  provider,
  scrapedReviews = [],
  initialPlatform = 'ALL',
}: ReviewsModalProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<string>(initialPlatform);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'RELEVANT' | 'HIGHEST' | 'LOWEST'>('RELEVANT');
  const [lazyScrapedReviews, setLazyScrapedReviews] = useState<ScrapedReviewItemDto[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);

  useEffect(() => {
    setLazyScrapedReviews([]);
  }, [provider.slug]);

  useEffect(() => {
    if (isOpen) {
      setSelectedPlatform(initialPlatform || 'ALL');
      setSearchQuery('');
      setSortBy('RELEVANT');
    }
  }, [isOpen, initialPlatform]);

  // Lazy-fetch full scraped reviews when opened from listing/category cards where scrapedReviews aren't preloaded
  useEffect(() => {
    if (!isOpen) return;
    if (scrapedReviews && scrapedReviews.length > 0) return;
    if (provider.scrapedReviews && provider.scrapedReviews.length > 0) return;
    if (!provider.slug) return;

    let cancelled = false;
    setIsLoadingReviews(true);
    fetchProviderBySlug(provider.slug)
      .then((fullProvider) => {
        if (!cancelled && fullProvider?.scrapedReviews) {
          setLazyScrapedReviews(fullProvider.scrapedReviews as ScrapedReviewItemDto[]);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoadingReviews(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, provider.slug, provider.scrapedReviews, scrapedReviews]);

  // Body scroll lock & Escape handler
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const formattedReviewsUpdated = useMemo(() => {
    if (!provider.reviewsLastUpdatedAt) return null;
    const parsed = new Date(provider.reviewsLastUpdatedAt);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [provider.reviewsLastUpdatedAt]);

  const effectiveScrapedReviews = useMemo(() => {
    if (scrapedReviews && scrapedReviews.length > 0) return scrapedReviews;
    if (provider.scrapedReviews && provider.scrapedReviews.length > 0) {
      return provider.scrapedReviews as ScrapedReviewItemDto[];
    }
    return lazyScrapedReviews;
  }, [scrapedReviews, provider.scrapedReviews, lazyScrapedReviews]);

  const normalizedReviews = useMemo(
    () =>
      (effectiveScrapedReviews || []).map((sr) => {
        const parsed = parseReviewCommentAndOwnerReply(
          sr.comment,
          provider.name,
          sr.reviewDate
        );
        return {
          authorName: cleanReviewerName(sr.authorName),
          authorAvatarUrl: sr.authorAvatarUrl || '',
          platform: (sr.platform || 'GOOGLE').toUpperCase(),
          rating: sr.rating || 5,
          date: formatReviewDate(parsed.extractedDate),
          customerComment: parsed.customerComment,
          ownerReply: parsed.ownerReply,
        };
      }),
    [effectiveScrapedReviews, provider.name]
  );

  const activePlatformSummaries = useMemo(
    () =>
      [
        provider.reviews?.google && provider.reviews.google.count > 0
          ? {
            key: 'GOOGLE',
            label: 'Google',
            rating: provider.reviews.google.rating,
            count: provider.reviews.google.count,
          }
          : null,
        provider.reviews?.yelp && provider.reviews.yelp.count > 0
          ? {
            key: 'YELP',
            label: 'Yelp',
            rating: provider.reviews.yelp.rating,
            count: provider.reviews.yelp.count,
          }
          : null,
        provider.reviews?.homeadvisor && provider.reviews.homeadvisor.count > 0
          ? {
            key: 'HOMEADVISOR',
            label: 'HomeAdvisor',
            rating: provider.reviews.homeadvisor.rating,
            count: provider.reviews.homeadvisor.count,
          }
          : null,
        (provider.reviews?.houzz?.count || provider.reviews?.facebook?.count || 0) > 0
          ? {
            key: 'HOUZZ',
            label: 'Houzz',
            rating:
              provider.reviews.houzz?.rating || provider.reviews.facebook?.rating || 0,
            count:
              provider.reviews.houzz?.count || provider.reviews.facebook?.count || 0,
          }
          : null,
      ].filter((item): item is NonNullable<typeof item> => Boolean(item)),
    [provider.reviews]
  );

  const totalReviews = provider.totalReviews || normalizedReviews.length || 0;
  const compositeRating = provider.compositeRating || 0;

  const distribution = useMemo(
    () =>
      [5, 4, 3, 2, 1].map((stars) => {
        if (normalizedReviews.length > 0) {
          const count = normalizedReviews.filter(
            (r) => Math.round(r.rating || 5) === stars
          ).length;
          const pct = Math.round((count / normalizedReviews.length) * 100);
          return { stars, pct, count };
        }
        const defaultPct = stars === 5 ? 78 : stars === 4 ? 16 : stars === 3 ? 4 : 1;
        return {
          stars,
          pct: totalReviews > 0 ? defaultPct : 0,
          count: Math.round((totalReviews * defaultPct) / 100),
        };
      }),
    [normalizedReviews, totalReviews]
  );

  const visibleReviews = useMemo(() => {
    let list =
      selectedPlatform === 'ALL'
        ? normalizedReviews
        : normalizedReviews.filter((r) => r.platform === selectedPlatform);

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.customerComment.toLowerCase().includes(q) ||
          r.authorName.toLowerCase().includes(q) ||
          (r.ownerReply && r.ownerReply.toLowerCase().includes(q))
      );
    }

    if (sortBy === 'HIGHEST') {
      list = [...list].sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'LOWEST') {
      list = [...list].sort((a, b) => a.rating - b.rating);
    }

    return list;
  }, [normalizedReviews, selectedPlatform, searchQuery, sortBy]);

  const selectedSummary =
    selectedPlatform !== 'ALL'
      ? activePlatformSummaries.find((p) => p.key === selectedPlatform) || null
      : null;

  const renderPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'GOOGLE':
        return <GoogleLogo className="w-4 h-4 shrink-0" />;
      case 'YELP':
        return <YelpLogo className="w-4 h-4 shrink-0" />;
      case 'HOMEADVISOR':
        return <HomeAdvisorLogo className="w-4 h-4 shrink-0" />;
      case 'HOUZZ':
        return <HouzzLogo className="w-4 h-4 shrink-0" />;
      case 'FACEBOOK':
        return <FacebookLogo className="w-4 h-4 shrink-0" />;
      default:
        return <GoogleLogo className="w-4 h-4 shrink-0" />;
    }
  };

  const formatPlatformName = (platform: string) => {
    switch (platform) {
      case 'GOOGLE':
        return 'Google';
      case 'YELP':
        return 'Yelp';
      case 'HOMEADVISOR':
        return 'HomeAdvisor';
      case 'HOUZZ':
        return 'Houzz';
      default:
        return platform;
    }
  };

  if (!isOpen) return null;

  const reviewsFeedContent = isLoadingReviews ? (
    <div className="space-y-3 sm:space-y-4">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="p-3.5 sm:p-4 rounded-2xl border border-gray-200/90 bg-white space-y-3 animate-pulse"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gray-200" />
              <div className="space-y-1.5">
                <div className="w-28 h-3.5 bg-gray-200 rounded" />
                <div className="w-20 h-3 bg-gray-100 rounded" />
              </div>
            </div>
            <div className="w-16 h-6 bg-gray-100 rounded-full" />
          </div>
          <div className="space-y-2">
            <div className="w-full h-3 bg-gray-100 rounded" />
            <div className="w-5/6 h-3 bg-gray-100 rounded" />
            <div className="w-2/3 h-3 bg-gray-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  ) : visibleReviews.length > 0 ? (
    visibleReviews.map((rev, idx) => (
      <article
        key={`${rev.platform}-${rev.authorName}-${idx}`}
        className="p-3.5 sm:p-4 rounded-2xl border border-gray-200/90 bg-white shadow-sm space-y-2.5 sm:space-y-3"
      >
        {/* Reviewer Identity Row */}
        <div className="flex items-start justify-between gap-2.5 sm:gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {rev.authorAvatarUrl ? (
              <img
                src={rev.authorAvatarUrl}
                alt={rev.authorName}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border border-gray-200 shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-100 border border-gray-200 flex items-center justify-center text-xs font-black text-gray-700 shrink-0">
                {rev.authorName.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-[13px] sm:text-sm text-gray-950 truncate max-w-[160px] xs:max-w-[210px] sm:max-w-none">
                  {rev.authorName}
                </span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex items-center text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${
                        i < Math.round(rev.rating || 5)
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-gray-200 text-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[11px] text-gray-400 font-medium">
                  {rev.date}
                </span>
              </div>
            </div>
          </div>

          {/* Platform Badge */}
          <span className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full bg-slate-50 border border-gray-200/90 text-[10.5px] sm:text-[11px] font-bold text-gray-700 shrink-0">
            {renderPlatformIcon(rev.platform)}
            <span>{formatPlatformName(rev.platform)}</span>
          </span>
        </div>

        {/* Full Untruncated Review Comment */}
        <p className="text-[13px] sm:text-sm text-gray-700 leading-relaxed whitespace-pre-line">
          {rev.customerComment}
        </p>

        {/* Business Owner Reply (if present in review data) */}
        {rev.ownerReply && (
          <div className="ml-1.5 sm:ml-4 pl-3 sm:pl-3.5 py-2.5 pr-3 rounded-xl bg-slate-50 border-l-2 border-primary/70 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-900">
              <CornerDownRight className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>Response from {provider.name}</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">
              {rev.ownerReply}
            </p>
          </div>
        )}
      </article>
    ))
  ) : searchQuery.trim() ? (
    <div className="py-10 sm:py-12 text-center space-y-2">
      <p className="text-sm font-bold text-gray-900">
        No reviews matching &ldquo;{searchQuery}&rdquo;
      </p>
      <p className="text-xs text-gray-500">
        Try clearing your search filter or switching platforms.
      </p>
      <button
        type="button"
        onClick={() => setSearchQuery('')}
        className="mt-2 inline-flex items-center px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-gray-800 cursor-pointer"
      >
        Clear Search
      </button>
    </div>
  ) : selectedSummary ? (
    <div className="p-5 sm:p-6 rounded-2xl border border-gray-200/90 bg-[#F8FAFC] text-center space-y-3 my-2 sm:my-4">
      <div className="w-11 h-11 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center mx-auto">
        {renderPlatformIcon(selectedSummary.key)}
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-black text-gray-950">
          {selectedSummary.rating.toFixed(1)} ★ Verified {selectedSummary.label} Score
        </h3>
        <p className="text-xs sm:text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
          {provider.name} holds a verified{' '}
          <strong className="font-bold text-gray-900">
            {selectedSummary.rating.toFixed(1)} out of 5
          </strong>{' '}
          rating across{' '}
          <strong className="font-bold text-gray-900">
            {selectedSummary.count} customer reviews
          </strong>{' '}
          on {selectedSummary.label}.
        </p>
      </div>
      {normalizedReviews.length > 0 && (
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setSelectedPlatform('ALL')}
            className="inline-flex items-center px-4 py-2 rounded-xl bg-[#0B3B2C] hover:bg-[#07261C] text-white text-xs font-bold transition-colors cursor-pointer"
          >
            View All Saved Customer Reviews ({normalizedReviews.length})
          </button>
        </div>
      )}
    </div>
  ) : (
    <div className="py-10 sm:py-12 text-center text-xs sm:text-sm text-gray-500">
      No written customer reviews have been synced for this contractor yet.
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-gray-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reviews-modal-title"
    >
      <div
        className="w-full max-w-4xl h-[93dvh] sm:h-auto sm:max-h-[90vh] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ========================================================= */}
        {/* MODAL HEADER                                              */}
        {/* ========================================================= */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex items-center justify-between gap-3 bg-white shrink-0">
          <div className="min-w-0">
            <h2
              id="reviews-modal-title"
              className="text-base sm:text-xl font-black text-gray-950 tracking-tight truncate"
            >
              {provider.name} — Verified Reviews
            </h2>
            {formattedReviewsUpdated && (
              <p className="text-[11px] sm:text-xs text-gray-500 font-medium flex items-center gap-1.5 mt-0.5">
                <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400 shrink-0" />
                <span>Reviews last updated: {formattedReviewsUpdated}</span>
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close reviews modal"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-950 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ========================================================= */}
        {/* MOBILE BODY (< md): UNIFIED SCROLL + STICKY FILTER RAIL   */}
        {/* ========================================================= */}
        <div className="md:hidden flex-1 min-h-0 overflow-y-auto overscroll-contain bg-white">
          {/* 1. Compact Side-by-Side Score & Distribution Strip (Scrolls away naturally as you read) */}
          <div className="bg-[#F8FAFC] px-4 py-3 border-b border-gray-200/80 flex items-center gap-4">
            <div className="shrink-0 text-center min-w-[82px]">
              <div className="text-3xl font-black text-gray-950 leading-none tracking-tight">
                {compositeRating.toFixed(1)}
              </div>
              <div className="flex items-center justify-center gap-0.5 text-amber-500 mt-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3 h-3 ${
                      i < Math.round(compositeRating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'fill-gray-200 text-gray-200'
                    }`}
                  />
                ))}
              </div>
              <p className="text-[10.5px] text-gray-500 font-semibold mt-0.5">
                {totalReviews} verified
              </p>
            </div>

            <div className="w-px h-14 bg-gray-200/90 shrink-0" />

            <div className="flex-1 space-y-1 text-[10px] font-medium text-gray-600">
              {distribution.map((item) => (
                <div key={item.stars} className="flex items-center gap-1.5">
                  <span className="w-3.5 shrink-0 text-right font-semibold">
                    {item.stars}★
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-gray-200/80 overflow-hidden">
                    <div
                      className="h-full bg-[#0B3B2C] rounded-full"
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                  <span className="w-7 text-right text-gray-400 shrink-0">
                    {item.pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Sticky Horizontal Platform Chips + Compact Single-Row Search & Sort */}
          <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-gray-200/90 px-3.5 py-2.5 space-y-2 shadow-sm">
            {/* Swipeable Horizontal Platform Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              <button
                type="button"
                onClick={() => setSelectedPlatform('ALL')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold shrink-0 transition-colors cursor-pointer ${
                  selectedPlatform === 'ALL'
                    ? 'bg-[#0B3B2C] text-white border-[#0B3B2C]'
                    : 'bg-white text-gray-800 border-gray-200/90'
                }`}
              >
                <span>All</span>
                <span
                  className={`text-[10.5px] font-semibold ${
                    selectedPlatform === 'ALL' ? 'text-white/80' : 'text-gray-400'
                  }`}
                >
                  ({normalizedReviews.length || totalReviews})
                </span>
              </button>

              {activePlatformSummaries.map((plat) => {
                const isActive = selectedPlatform === plat.key;
                const savedForPlat = normalizedReviews.filter(
                  (r) => r.platform === plat.key
                ).length;

                return (
                  <button
                    key={plat.key}
                    type="button"
                    onClick={() => setSelectedPlatform(plat.key)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs shrink-0 transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#0B3B2C] text-white border-[#0B3B2C] font-bold'
                        : 'bg-white text-gray-800 border-gray-200/90 font-semibold'
                    }`}
                  >
                    {renderPlatformIcon(plat.key)}
                    <span>{plat.label}</span>
                    <span className="font-bold">{plat.rating.toFixed(1)}</span>
                    <span
                      className={`text-[10.5px] ${
                        isActive ? 'text-white/80' : 'text-gray-400'
                      }`}
                    >
                      ({savedForPlat > 0 ? `${savedForPlat}/${plat.count}` : plat.count})
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Single-Row Search + Sort */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 min-w-0">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search reviews..."
                  className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-gray-200 bg-gray-50/70 focus:bg-white focus:border-primary focus:outline-none text-[13px] text-gray-900 placeholder:text-gray-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as 'RELEVANT' | 'HIGHEST' | 'LOWEST')
                }
                aria-label="Sort reviews"
                className="py-1.5 px-2.5 rounded-lg border border-gray-200 bg-gray-50/70 focus:bg-white focus:border-primary focus:outline-none text-xs font-semibold text-gray-700 shrink-0 cursor-pointer"
              >
                <option value="RELEVANT">Relevant</option>
                <option value="HIGHEST">Highest ★</option>
                <option value="LOWEST">Lowest ★</option>
              </select>
            </div>
          </div>

          {/* 3. Full Spacious Mobile Reviews Feed */}
          <div className="p-3.5 space-y-3 pb-8">{reviewsFeedContent}</div>
        </div>

        {/* ========================================================= */}
        {/* DESKTOP BODY (md+): 2-COLUMN SPLIT LAYOUT                 */}
        {/* ========================================================= */}
        <div className="hidden md:grid md:grid-cols-12 flex-1 min-h-0 overflow-hidden">
          {/* LEFT SIDEBAR: AGGREGATE RATING & PLATFORM SWITCHER */}
          <div className="md:col-span-4 border-r border-gray-200 bg-[#F8FAFC] p-5 space-y-5 overflow-y-auto">
            {/* Overall Score Card */}
            <div className="bg-white border border-gray-200/90 rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-4xl font-black text-gray-950 tracking-tight">
                  {compositeRating.toFixed(1)}
                </span>
                <div className="space-y-1">
                  <div className="flex items-center gap-0.5 text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.round(compositeRating)
                            ? 'fill-amber-400 text-amber-400'
                            : 'fill-gray-200 text-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 font-semibold">
                    {totalReviews} verified reviews
                  </p>
                </div>
              </div>

              {/* 5★ - 1★ Distribution */}
              <div className="space-y-1.5 pt-2 border-t border-gray-100 text-[11px] font-medium text-gray-600">
                {distribution.map((item) => (
                  <div key={item.stars} className="flex items-center gap-2">
                    <span className="w-4 shrink-0 text-right font-semibold">
                      {item.stars}★
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full bg-[#0B3B2C] rounded-full transition-all duration-300"
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                    <span className="w-9 text-right text-gray-400 text-[10px] shrink-0">
                      {item.pct}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Platform Filter Buttons */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                Filter by Platform
              </span>

              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedPlatform('ALL')}
                  className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    selectedPlatform === 'ALL'
                      ? 'bg-[#0B3B2C] text-white border-[#0B3B2C] shadow-sm'
                      : 'bg-white hover:bg-gray-50 text-gray-800 border-gray-200/90'
                  }`}
                >
                  <span>All Platforms</span>
                  <span
                    className={`text-[11px] font-semibold ${
                      selectedPlatform === 'ALL' ? 'text-white/80' : 'text-gray-500'
                    }`}
                  >
                    {normalizedReviews.length > 0
                      ? `${normalizedReviews.length} saved • ${totalReviews} total`
                      : `${totalReviews} total`}
                  </span>
                </button>

                {activePlatformSummaries.map((plat) => {
                  const isActive = selectedPlatform === plat.key;
                  const savedForPlat = normalizedReviews.filter(
                    (r) => r.platform === plat.key
                  ).length;

                  return (
                    <button
                      key={plat.key}
                      type="button"
                      onClick={() => setSelectedPlatform(plat.key)}
                      className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#0B3B2C] text-white border-[#0B3B2C] shadow-sm font-bold'
                          : 'bg-white hover:bg-gray-50 text-gray-800 border-gray-200/90 font-semibold'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {renderPlatformIcon(plat.key)}
                        <span className="truncate">{plat.label}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                        <span className="font-bold">{plat.rating.toFixed(1)}</span>
                        <span
                          className={`text-[11px] ${
                            isActive ? 'text-white/80' : 'text-gray-400'
                          }`}
                        >
                          ({savedForPlat > 0 ? `${savedForPlat}/${plat.count}` : plat.count})
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: SEARCH, SORT & FULL UNTRUNCATED REVIEWS FEED */}
          <div className="md:col-span-8 flex flex-col min-h-0 bg-white">
            {/* Search & Sort Toolbar */}
            <div className="p-4 border-b border-gray-100 flex items-center gap-2.5 bg-white shrink-0">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search reviews by keyword or author..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl border border-gray-200 bg-gray-50/70 focus:bg-white focus:border-primary focus:outline-none text-sm text-gray-900 placeholder:text-gray-400 transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400" />
                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value as 'RELEVANT' | 'HIGHEST' | 'LOWEST')
                  }
                  className="py-2 px-3 rounded-xl border border-gray-200 bg-gray-50/70 focus:bg-white focus:border-primary focus:outline-none text-xs font-semibold text-gray-700 cursor-pointer"
                >
                  <option value="RELEVANT">Most Relevant</option>
                  <option value="HIGHEST">Highest Rated</option>
                  <option value="LOWEST">Lowest Rated</option>
                </select>
              </div>
            </div>

            {/* Scrollable Reviews List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {reviewsFeedContent}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

