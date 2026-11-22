'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Star,
  Search,
  Clock,
  CheckCircle2,
  CornerDownRight,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ArrowRight,
  Camera,
} from 'lucide-react';
import type { RooferProvider, ProviderReviewStats } from '@/data/mockRoofers';
import { fetchProviderReviews, type ScrapedReviewItemDto } from '@/lib/api';
import { getOwnR2MediaUrl } from '@/lib/media-url';
import {
  GoogleLogo,
  YelpLogo,
  HomeAdvisorLogo,
  HouzzLogo,
  FacebookLogo,
} from './PlatformLogos';
import AiReviewSummaryCard from './AiReviewSummaryCard';
import DropdownSelect from '@/components/common/DropdownSelect';

const DEFAULT_PAGE_SIZE = 10;

interface ReviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: RooferProvider;
  scrapedReviews?: ScrapedReviewItemDto[];
  initialPlatform?: string;
  initialSearch?: string;
}

function ExpandableReviewText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState((text || '').length > 180);
  const pRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    const el = pRef.current;
    if (!el || expanded) return;
    setIsOverflowing(el.scrollHeight > el.clientHeight + 1);
  }, [text, expanded]);

  return (
    <div className="space-y-1.5">
      <p
        ref={pRef}
        className={`text-[13px] sm:text-sm text-gray-700 leading-relaxed whitespace-pre-line ${
          expanded ? '' : 'line-clamp-3'
        }`}
      >
        {text}
      </p>
      {(isOverflowing || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="group/rm inline-flex items-center gap-1 text-xs font-bold text-[#EA580C] hover:text-[#D94F0A] transition-colors cursor-pointer"
        >
          {expanded ? (
            <>
              <span>Show less</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              <span>Read more</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/rm:translate-x-0.5" />
            </>
          )}
        </button>
      )}
    </div>
  );
}

function ReviewerAvatar({
  avatarUrl,
  authorName,
}: {
  avatarUrl: string;
  authorName: string;
}) {
  const [failed, setFailed] = useState(false);
  const safeUrl = getOwnR2MediaUrl(avatarUrl);

  if (safeUrl && !failed) {
    return (
      <img
        src={safeUrl}
        alt={authorName}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border border-gray-200 shrink-0"
      />
    );
  }

  return (
    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-100 border border-gray-200 flex items-center justify-center text-xs font-black text-gray-700 shrink-0">
      {(authorName || 'V').charAt(0).toUpperCase()}
    </div>
  );
}

function formatReviewDate(rawDate?: string | null): string {
  const val = (rawDate || '').trim();
  if (!val) return 'Verified Review';
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
  const name = (rawName || '').replace(/\s*·\s*#\d+$/, '').trim();
  if (!name) return 'Verified Homeowner';
  if (/^HU-\d+$/i.test(name)) return 'Verified Houzz Homeowner';
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

function buildPageNumbers(currentPage: number, totalPages: number): Array<number | 'ELLIPSIS'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages: Array<number | 'ELLIPSIS'> = [1];
  const left = Math.max(2, currentPage - 1);
  const right = Math.min(totalPages - 1, currentPage + 1);

  if (left > 2) pages.push('ELLIPSIS');
  for (let p = left; p <= right; p++) {
    pages.push(p);
  }
  if (right < totalPages - 1) pages.push('ELLIPSIS');
  pages.push(totalPages);
  return pages;
}

export default function ReviewsModal({
  isOpen,
  onClose,
  provider,
  scrapedReviews = [],
  initialPlatform = 'ALL',
  initialSearch = '',
}: ReviewsModalProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string>(
    initialPlatform === 'WITH_PHOTOS' ? 'ALL' : initialPlatform
  );

  useEffect(() => {
    setMounted(true);
  }, []);
  const [onlyWithPhotos, setOnlyWithPhotos] = useState<boolean>(
    initialPlatform === 'WITH_PHOTOS'
  );
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch.trim());
  const [sortBy, setSortBy] = useState<'RELEVANT' | 'RECENT' | 'HIGHEST' | 'LOWEST'>('RELEVANT');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

  const [pageItems, setPageItems] = useState<ScrapedReviewItemDto[]>([]);
  const [totalMatching, setTotalMatching] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [apiStats, setApiStats] = useState<ProviderReviewStats | null>(
    provider.reviewStats || null
  );
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);

  const [lightboxState, setLightboxState] = useState<{
    photos: string[];
    index: number;
    authorName: string;
  } | null>(null);

  const mobileScrollRef = useRef<HTMLDivElement | null>(null);
  const desktopScrollRef = useRef<HTMLDivElement | null>(null);

  // Debounce keyword search (250ms) so typing doesn't spam API
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset modal state on open or contractor change
  useEffect(() => {
    if (isOpen) {
      if (initialPlatform === 'WITH_PHOTOS') {
        setSelectedPlatform('ALL');
        setOnlyWithPhotos(true);
      } else {
        setSelectedPlatform(initialPlatform || 'ALL');
        setOnlyWithPhotos(false);
      }
      const cleanInitSearch = (initialSearch || '').trim();
      setSearchQuery(cleanInitSearch);
      setDebouncedSearch(cleanInitSearch);
      setSortBy('RELEVANT');
      setPage(1);
      setPageSize(DEFAULT_PAGE_SIZE);
      setLightboxState(null);
      if (
        (!initialPlatform || initialPlatform === 'ALL') &&
        !cleanInitSearch &&
        scrapedReviews.length > 0 &&
        pageItems.length === 0
      ) {
        setPageItems(scrapedReviews.slice(0, DEFAULT_PAGE_SIZE));
        const fallbackTotal =
          provider.reviewStats?.totalSaved || provider.totalReviews || scrapedReviews.length;
        setTotalMatching(fallbackTotal);
        setTotalPages(Math.max(1, Math.ceil(fallbackTotal / DEFAULT_PAGE_SIZE)));
      }
      if (provider.reviewStats) {
        setApiStats(provider.reviewStats);
      }
    } else {
      setLightboxState(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialPlatform, initialSearch, provider.slug, provider.reviewStats]);

  // Fetch paginated reviews (10 per page default) + silently prefetch next page for 0ms paging
  useEffect(() => {
    if (!isOpen || !provider.slug) return;

    let cancelled = false;
    setIsLoadingReviews(true);

    fetchProviderReviews(provider.slug, {
      page,
      limit: pageSize,
      platform: selectedPlatform,
      withPhotos: onlyWithPhotos,
      sortBy,
      search: debouncedSearch || undefined,
    })
      .then((res) => {
        if (cancelled) return;
        setPageItems(res.items || []);
        setTotalMatching(res.pagination.totalMatching || 0);
        setTotalPages(res.pagination.totalPages || 1);
        setApiStats(res.stats);

        // Prefetch next page into memory cache so clicking "Next" is 0ms instant
        if (res.pagination.hasMore) {
          fetchProviderReviews(provider.slug, {
            page: page + 1,
            limit: pageSize,
            platform: selectedPlatform,
            withPhotos: onlyWithPhotos,
            sortBy,
            search: debouncedSearch || undefined,
          }).catch(() => {});
        }
      })
      .catch(() => {
        if (cancelled) return;
        setPageItems([]);
        setTotalMatching(0);
        setTotalPages(1);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingReviews(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, provider.slug, page, pageSize, selectedPlatform, onlyWithPhotos, sortBy, debouncedSearch]);

  const scrollFeedsToTop = () => {
    mobileScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    desktopScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageChange = (nextPage: number) => {
    const clamped = Math.max(1, Math.min(totalPages, nextPage));
    if (clamped === page) return;
    setPage(clamped);
    scrollFeedsToTop();
  };

  // Body scroll lock & Escape / Lightbox arrow handler
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxState) {
        if (e.key === 'Escape') {
          e.stopPropagation();
          setLightboxState(null);
        } else if (e.key === 'ArrowLeft' && lightboxState.photos.length > 1) {
          setLightboxState((prev) =>
            prev
              ? {
                  ...prev,
                  index: (prev.index - 1 + prev.photos.length) % prev.photos.length,
                }
              : null
          );
        } else if (e.key === 'ArrowRight' && lightboxState.photos.length > 1) {
          setLightboxState((prev) =>
            prev
              ? {
                  ...prev,
                  index: (prev.index + 1) % prev.photos.length,
                }
              : null
          );
        }
        return;
      }
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, lightboxState]);

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

  // Normalize strictly the current 50-item page (100% first-party R2 URLs only)
  const normalizedPageReviews = useMemo(
    () =>
      (pageItems || []).map((sr) => {
        const parsed = parseReviewCommentAndOwnerReply(
          sr.comment,
          provider.name,
          sr.reviewDate
        );
        return {
          authorName: cleanReviewerName(sr.authorName),
          authorAvatarUrl: sr.authorAvatarUrl ? getOwnR2MediaUrl(sr.authorAvatarUrl) : '',
          platform: (sr.platform || 'GOOGLE').toUpperCase(),
          rating: sr.rating || 5,
          date: formatReviewDate(parsed.extractedDate),
          customerComment: parsed.customerComment,
          ownerReply: parsed.ownerReply,
          photoUrls: Array.isArray(sr.photoUrls)
            ? sr.photoUrls.map((u) => getOwnR2MediaUrl(u)).filter(Boolean)
            : [],
        };
      }),
    [pageItems, provider.name]
  );

  const effectiveStats = apiStats || provider.reviewStats || null;
  const totalSavedCount = effectiveStats?.totalSaved || 0;
  const photoReviewsCount = effectiveStats?.withPhotosCount || 0;
  const savedByPlat = effectiveStats?.platformCounts || {};

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

  const totalReviews = provider.totalReviews || totalSavedCount || 0;
  const compositeRating = provider.compositeRating || 0;

  // Strictly real DB star distribution (zero static/hardcoded percentages)
  const distribution = useMemo(() => {
    if (effectiveStats?.starDistribution && effectiveStats.starDistribution.length === 5) {
      return effectiveStats.starDistribution;
    }
    return [5, 4, 3, 2, 1].map((stars) => ({ stars, pct: 0, count: 0 }));
  }, [effectiveStats]);

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

  if (!mounted || typeof document === 'undefined') return null;

  const rangeStart = totalMatching > 0 ? (page - 1) * pageSize + 1 : 0;
  const rangeEnd = Math.min(page * pageSize, totalMatching);
  const pageTokens = buildPageNumbers(page, totalPages);

  const topPaginationStrip =
    totalMatching > 0 ? (
      <div className="flex items-center justify-between gap-2 px-1 py-0.5 text-xs">
        <span className="font-semibold text-gray-500 tabular-nums">
          Showing <strong className="text-gray-900">{rangeStart}–{rangeEnd}</strong> of{' '}
          <strong className="text-gray-900">{totalMatching}</strong> reviews
        </span>

        {totalPages > 1 && (
          <div className="inline-flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] font-semibold text-gray-400 tabular-nums hidden xs:inline">
              Page {page}/{totalPages}
            </span>
            <button
              type="button"
              disabled={page <= 1 || isLoadingReviews}
              onClick={() => handlePageChange(page - 1)}
              aria-label="Previous page"
              className="w-7 h-7 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center text-gray-700 cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={page >= totalPages || isLoadingReviews}
              onClick={() => handlePageChange(page + 1)}
              aria-label="Next page"
              className="w-7 h-7 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center text-gray-700 cursor-pointer transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    ) : null;

  const paginationControls =
    totalMatching > 0 ? (
      <div className="pt-3.5 pb-1 border-t border-gray-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap justify-center sm:justify-start">
          <span className="text-xs font-semibold text-gray-500 tabular-nums">
            Showing {rangeStart}–{rangeEnd} of {totalMatching}
          </span>

          {totalMatching > 10 && (
            <DropdownSelect
              value={pageSize}
              onChange={(val) => {
                setPageSize(Number(val) || DEFAULT_PAGE_SIZE);
                setPage(1);
                scrollFeedsToTop();
              }}
              options={[
                { label: '10 / page', value: 10 },
                { label: '20 / page', value: 20 },
                { label: '50 / page', value: 50 },
              ]}
              ariaLabel="Reviews per page"
              triggerClassName="py-1 px-2.5 text-[11px] font-bold"
            />
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => handlePageChange(page - 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none text-xs font-bold text-gray-700 cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>

            {pageTokens.map((tok, idx) =>
              tok === 'ELLIPSIS' ? (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-1.5 text-xs font-bold text-gray-400 select-none"
                >
                  …
                </span>
              ) : (
                <button
                  key={tok}
                  type="button"
                  onClick={() => handlePageChange(tok)}
                  className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer tabular-nums ${
                    tok === page
                      ? 'bg-[#0B3B2C] text-white border-[#0B3B2C] shadow-sm'
                      : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
                  }`}
                >
                  {tok}
                </button>
              )
            )}

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => handlePageChange(page + 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none text-xs font-bold text-gray-700 cursor-pointer transition-colors"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    ) : null;

  const reviewsFeedContent =
    isLoadingReviews && normalizedPageReviews.length === 0 ? (
      <div className="space-y-3 sm:space-y-4">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="p-3.5 sm:p-4 rounded-2xl border border-gray-200/90 bg-white space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full skeleton-shimmer" />
                <div className="space-y-1.5">
                  <div className="w-28 h-3.5 rounded skeleton-shimmer" />
                  <div className="w-20 h-3 rounded skeleton-shimmer" />
                </div>
              </div>
              <div className="w-16 h-6 rounded-full skeleton-shimmer" />
            </div>
            <div className="space-y-2">
              <div className="w-full h-3 rounded skeleton-shimmer" />
              <div className="w-5/6 h-3 rounded skeleton-shimmer" />
              <div className="w-2/3 h-3 rounded skeleton-shimmer" />
            </div>
          </div>
        ))}
      </div>
    ) : normalizedPageReviews.length > 0 ? (
      <div
        className={`space-y-3 sm:space-y-4 transition-opacity duration-150 ${
          isLoadingReviews ? 'opacity-60 pointer-events-none' : 'opacity-100'
        }`}
      >
        {topPaginationStrip}
        {normalizedPageReviews.map((rev, idx) => (
        <article
          key={`${rev.platform}-${rev.authorName}-${page}-${idx}`}
          className="p-3.5 sm:p-4 rounded-2xl border border-gray-200/90 bg-white shadow-sm space-y-2.5 sm:space-y-3"
        >
          {/* Reviewer Identity Row */}
          <div className="flex items-start justify-between gap-2.5 sm:gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <ReviewerAvatar
                avatarUrl={rev.authorAvatarUrl}
                authorName={rev.authorName}
              />

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

          {/* 3-Line Review Comment + Read more -> Toggle */}
          <ExpandableReviewText text={rev.customerComment} />

          {/* Customer-Shared Review Photos (100% Served from Cloudflare R2 Bucket) */}
          {rev.photoUrls && rev.photoUrls.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap pt-0.5">
              {rev.photoUrls.map((photoUrl, pIdx) => (
                <button
                  key={`${photoUrl}-${pIdx}`}
                  type="button"
                  onClick={() =>
                    setLightboxState({
                      photos: rev.photoUrls,
                      index: pIdx,
                      authorName: rev.authorName,
                    })
                  }
                  aria-label={`View photo ${pIdx + 1} shared by ${rev.authorName}`}
                  className="group relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border border-gray-200/90 bg-slate-100 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0B3B2C]/30 transition-all cursor-pointer shrink-0"
                >
                  <img
                    src={photoUrl}
                    alt={`Photo ${pIdx + 1} shared by ${rev.authorName}`}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                </button>
              ))}
            </div>
          )}

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
      ))}

        {paginationControls}
      </div>
    ) : debouncedSearch ? (
    <div className="py-10 sm:py-12 text-center space-y-2">
      <p className="text-sm font-bold text-gray-900">
        No reviews matching &ldquo;{debouncedSearch}&rdquo;
      </p>
      <p className="text-xs text-gray-500">
        Try clearing your search filter or switching platforms.
      </p>
      <button
        type="button"
        onClick={() => {
          setSearchQuery('');
          setDebouncedSearch('');
          setPage(1);
        }}
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
      {totalSavedCount > 0 && (
        <div className="pt-1">
          <button
            type="button"
            onClick={() => {
              setSelectedPlatform('ALL');
              setOnlyWithPhotos(false);
              setPage(1);
            }}
            className="inline-flex items-center px-4 py-2 rounded-xl bg-[#0B3B2C] hover:bg-[#07261C] text-white text-xs font-bold transition-colors cursor-pointer"
          >
            View All Saved Customer Reviews ({totalSavedCount})
          </button>
        </div>
      )}
    </div>
  ) : (
    <div className="py-10 sm:py-12 text-center text-xs sm:text-sm text-gray-500">
      No written customer reviews have been synced for this contractor yet.
    </div>
  );

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 !m-0 z-[100] bg-gray-950/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="reviews-modal-title"
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
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
        <div
          ref={mobileScrollRef}
          className="md:hidden flex-1 min-h-0 overflow-y-auto overscroll-contain bg-white"
        >
          {/* 1. Compact Side-by-Side Score & Distribution Strip */}
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

          {/* 2. Sticky Horizontal Platform Chips + Search & Sort */}
          <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-gray-200/90 px-3.5 py-2.5 space-y-2 shadow-sm">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedPlatform('ALL');
                  setOnlyWithPhotos(false);
                  setPage(1);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold shrink-0 transition-colors cursor-pointer ${
                  selectedPlatform === 'ALL' && !onlyWithPhotos
                    ? 'bg-[#0B3B2C] text-white border-[#0B3B2C]'
                    : 'bg-white text-gray-800 border-gray-200/90'
                }`}
              >
                <span>All</span>
                <span
                  className={`text-[10.5px] font-semibold ${
                    selectedPlatform === 'ALL' && !onlyWithPhotos
                      ? 'text-white/80'
                      : 'text-gray-400'
                  }`}
                >
                  ({totalSavedCount || totalReviews})
                </span>
              </button>

              {photoReviewsCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setOnlyWithPhotos((prev) => !prev);
                    setPage(1);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold shrink-0 transition-colors cursor-pointer ${
                    onlyWithPhotos
                      ? 'bg-[#EA580C] text-white border-[#EA580C]'
                      : 'bg-orange-50/80 text-[#C2410C] border-orange-200'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5 shrink-0" />
                  <span>With Photos</span>
                  <span
                    className={`text-[10.5px] font-semibold ${
                      onlyWithPhotos ? 'text-white/85' : 'text-[#EA580C]/80'
                    }`}
                  >
                    ({photoReviewsCount})
                  </span>
                </button>
              )}

              {activePlatformSummaries.map((plat) => {
                const isActive = selectedPlatform === plat.key;
                const savedForPlat = savedByPlat[plat.key] || 0;

                return (
                  <button
                    key={plat.key}
                    type="button"
                    onClick={() => {
                      setSelectedPlatform(plat.key);
                      setPage(1);
                    }}
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
                      (
                      {savedForPlat > 0 && savedForPlat < plat.count
                        ? `${savedForPlat}/${plat.count}`
                        : Math.max(savedForPlat, plat.count)}
                      )
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 min-w-0">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search reviews..."
                  className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-gray-200 bg-gray-50/70 focus:bg-white focus:border-primary focus:outline-none text-[13px] text-gray-900 placeholder:text-gray-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setDebouncedSearch('');
                      setPage(1);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <DropdownSelect
                value={sortBy}
                onChange={(val) => {
                  setSortBy(
                    val as 'RELEVANT' | 'RECENT' | 'HIGHEST' | 'LOWEST'
                  );
                  setPage(1);
                }}
                options={[
                  { label: 'Relevant', value: 'RELEVANT' },
                  { label: 'Recent', value: 'RECENT' },
                  { label: 'Highest ★', value: 'HIGHEST' },
                  { label: 'Lowest ★', value: 'LOWEST' },
                ]}
                ariaLabel="Sort reviews"
                align="right"
                triggerClassName="py-1.5 px-2.5 shrink-0"
              />
            </div>
          </div>

          <div className="p-3.5 space-y-3 pb-8">
            {selectedPlatform === 'ALL' && !onlyWithPhotos && (
              <AiReviewSummaryCard
                provider={provider}
                variant="compact"
                activeKeyword={debouncedSearch}
                onSelectTagKeyword={(kw) => {
                  setSearchQuery(kw);
                  setDebouncedSearch(kw);
                  setPage(1);
                  scrollFeedsToTop();
                }}
              />
            )}
            {reviewsFeedContent}
          </div>
        </div>

        {/* ========================================================= */}
        {/* DESKTOP BODY (md+): 2-COLUMN SPLIT LAYOUT                 */}
        {/* ========================================================= */}
        <div className="hidden md:grid md:grid-cols-12 flex-1 min-h-0 overflow-hidden">
          {/* LEFT SIDEBAR: AGGREGATE RATING & PLATFORM SWITCHER */}
          <div className="md:col-span-4 border-r border-gray-200 bg-[#F8FAFC] p-5 space-y-5 overflow-y-auto">
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
                  onClick={() => {
                    setSelectedPlatform('ALL');
                    setOnlyWithPhotos(false);
                    setPage(1);
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    selectedPlatform === 'ALL' && !onlyWithPhotos
                      ? 'bg-[#0B3B2C] text-white border-[#0B3B2C] shadow-sm'
                      : 'bg-white hover:bg-gray-50 text-gray-800 border-gray-200/90'
                  }`}
                >
                  <span>All Platforms</span>
                  <span
                    className={`text-[11px] font-semibold ${
                      selectedPlatform === 'ALL' && !onlyWithPhotos
                        ? 'text-white/80'
                        : 'text-gray-500'
                    }`}
                  >
                    {totalSavedCount > 0
                      ? totalSavedCount >= totalReviews
                        ? `${totalSavedCount} verified`
                        : `${totalSavedCount} saved • ${totalReviews} total`
                      : `${totalReviews} total`}
                  </span>
                </button>

                {photoReviewsCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setOnlyWithPhotos((prev) => !prev);
                      setPage(1);
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      onlyWithPhotos
                        ? 'bg-[#EA580C] text-white border-[#EA580C] shadow-sm'
                        : 'bg-orange-50/70 hover:bg-orange-100/70 text-[#C2410C] border-orange-200'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Camera className="w-3.5 h-3.5 shrink-0" />
                      <span>Reviews With Photos</span>
                    </span>
                    <span
                      className={`text-[11px] font-bold ${
                        onlyWithPhotos ? 'text-white/85' : 'text-[#EA580C]'
                      }`}
                    >
                      {photoReviewsCount}
                    </span>
                  </button>
                )}

                {activePlatformSummaries.map((plat) => {
                  const isActive = selectedPlatform === plat.key;
                  const savedForPlat = savedByPlat[plat.key] || 0;

                  return (
                    <button
                      key={plat.key}
                      type="button"
                      onClick={() => {
                        setSelectedPlatform(plat.key);
                        setPage(1);
                      }}
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
                          (
                          {savedForPlat > 0 && savedForPlat < plat.count
                            ? `${savedForPlat}/${plat.count}`
                            : Math.max(savedForPlat, plat.count)}
                          )
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: SEARCH, SORT & PAGINATED 50-PER-PAGE REVIEWS FEED */}
          <div className="md:col-span-8 flex flex-col min-h-0 bg-white">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2.5 bg-white shrink-0">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search reviews by keyword or author..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl border border-gray-200 bg-gray-50/70 focus:bg-white focus:border-primary focus:outline-none text-sm text-gray-900 placeholder:text-gray-400 transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setDebouncedSearch('');
                      setPage(1);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400" />
                <DropdownSelect
                  value={sortBy}
                  onChange={(val) => {
                    setSortBy(
                      val as 'RELEVANT' | 'RECENT' | 'HIGHEST' | 'LOWEST'
                    );
                    setPage(1);
                  }}
                  options={[
                    { label: 'Most Relevant', value: 'RELEVANT' },
                    { label: 'Most Recent', value: 'RECENT' },
                    { label: 'Highest Rated', value: 'HIGHEST' },
                    { label: 'Lowest Rated', value: 'LOWEST' },
                  ]}
                  ariaLabel="Sort reviews"
                  align="right"
                  triggerClassName="py-2 px-3"
                />
              </div>
            </div>

            <div
              ref={desktopScrollRef}
              className="flex-1 overflow-y-auto p-5 space-y-4"
            >
              {selectedPlatform === 'ALL' && !onlyWithPhotos && (
                <AiReviewSummaryCard
                  provider={provider}
                  variant="compact"
                  activeKeyword={debouncedSearch}
                  onSelectTagKeyword={(kw) => {
                    setSearchQuery(kw);
                    setDebouncedSearch(kw);
                    setPage(1);
                    scrollFeedsToTop();
                  }}
                />
              )}
              {reviewsFeedContent}
            </div>
          </div>
        </div>
          </motion.div>

      {/* ========================================================= */}
      {/* FULL-SCREEN LIGHTBOX FOR CUSTOMER-SHARED REVIEW PHOTOS    */}
      {/* ========================================================= */}
      {lightboxState && (
        <div
          className="fixed inset-0 !m-0 z-[110] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 sm:p-8"
          onClick={(e) => {
            e.stopPropagation();
            setLightboxState(null);
          }}
        >
          <div
            className="w-full max-w-5xl flex items-center justify-between gap-3 pb-3 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">
                Photo shared by {lightboxState.authorName}
              </p>
              {lightboxState.photos.length > 1 && (
                <p className="text-xs text-white/70">
                  {lightboxState.index + 1} of {lightboxState.photos.length}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setLightboxState(null)}
              aria-label="Close photo preview"
              className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div
            className="relative flex-1 w-full max-w-5xl min-h-0 flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {lightboxState.photos.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setLightboxState((prev) =>
                    prev
                      ? {
                          ...prev,
                          index:
                            (prev.index - 1 + prev.photos.length) %
                            prev.photos.length,
                        }
                      : null
                  )
                }
                aria-label="Previous photo"
                className="absolute left-1 sm:left-3 z-10 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            <img
              src={lightboxState.photos[lightboxState.index]}
              alt={`Customer review photo ${lightboxState.index + 1}`}
              className="max-w-full max-h-[76dvh] object-contain rounded-xl shadow-2xl select-none"
            />

            {lightboxState.photos.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setLightboxState((prev) =>
                    prev
                      ? {
                          ...prev,
                          index: (prev.index + 1) % prev.photos.length,
                        }
                      : null
                  )
                }
                aria-label="Next photo"
                className="absolute right-1 sm:right-3 z-10 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
