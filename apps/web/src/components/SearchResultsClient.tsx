'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Header,
  Footer,
  QuoteModal,
  CostGuideModal,
  CompareDrawer,
  CompareModal,
} from '@/components/common';
import DropdownSelect from '@/components/common/DropdownSelect';
import ProviderCard from '@/components/ProviderCard';
import { ReviewsModal } from '@/components/contractor-profile';
import type { RooferProvider } from '@/data/mockRoofers';
import { fetchProviders } from '@/lib/api';
import {
  getLiveServices,
  resolveGeoFromInputs,
  resolveServiceFromInput,
} from '@/lib/seo-urls';
import {
  ArrowRight,
  Building2,
  Hammer,
  MapPin,
  MessageSquare,
  Search,
  ShieldCheck,
  Star,
  X,
} from 'lucide-react';

type SearchSortOption = 'recommended' | 'rating' | 'reviews' | 'experience';

const NYC_BOROUGH_CHIPS = [
  'Manhattan',
  'Brooklyn',
  'Queens',
  'Bronx',
  'Staten Island',
];

function SearchResultsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialQ = searchParams.get('q') || searchParams.get('search') || '';
  const initialService = searchParams.get('service') || '';
  const initialLocation = searchParams.get('location') || searchParams.get('zip') || '';

  const [query, setQuery] = useState(initialQ);
  const [serviceInput, setServiceInput] = useState(initialService);
  const [locationInput, setLocationInput] = useState(initialLocation);

  // Sync controlled inputs whenever URL query params change (e.g. clicking quick chips or browser Back)
  useEffect(() => {
    setQuery(initialQ);
    setServiceInput(initialService);
    setLocationInput(initialLocation);
  }, [initialQ, initialService, initialLocation]);

  const [providers, setProviders] = useState<RooferProvider[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Client-side sort & refinement state
  const [sortBy, setSortBy] = useState<SearchSortOption>('recommended');
  const [minRating, setMinRating] = useState<number>(0);

  const [comparedIds, setComparedIds] = useState<string[]>([]);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [selectedProviderForQuote, setSelectedProviderForQuote] =
    useState<RooferProvider | null>(null);
  const [costGuideOpen, setCostGuideOpen] = useState(false);
  const [reviewsModalState, setReviewsModalState] = useState<{
    isOpen: boolean;
    provider: RooferProvider | null;
    initialPlatform: string;
  }>({
    isOpen: false,
    provider: null,
    initialPlatform: 'ALL',
  });

  const resolvedService = resolveServiceFromInput(initialService || initialQ);
  const resolvedGeo = resolveGeoFromInputs({
    borough: initialLocation,
    city: initialLocation,
    state: initialLocation,
  });

  const runSearch = useCallback(async () => {
    setIsLoading(true);
    try {
      const boroughParam =
        resolvedGeo?.kind === 'borough'
          ? resolvedGeo.name.replace(/^The\s+/i, '')
          : undefined;
      const categoryParam = resolvedService?.dbCategoryName;
      const freeTextSearch =
        initialQ &&
        (!resolvedService ||
          initialQ.toLowerCase().trim() !== resolvedService.name.toLowerCase())
          ? initialQ
          : undefined;

      const res = await fetchProviders({
        search: freeTextSearch,
        category: categoryParam,
        borough: boroughParam,
        limit: 50,
      });
      setProviders(res.items);
      setTotal(res.total);
    } catch {
      setProviders([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [initialQ, resolvedGeo, resolvedService]);

  useEffect(() => {
    runSearch();
  }, [runSearch]);

  const pushSearchUrl = (nextQ: string, nextSvc: string, nextLoc: string) => {
    const trimmedQ = nextQ.trim();
    const trimmedSvc = nextSvc.trim();
    const trimmedLoc = nextLoc.trim();

    const matchedSvc = resolveServiceFromInput(trimmedSvc);
    const matchedGeo = resolveGeoFromInputs({
      borough: trimmedLoc,
      city: trimmedLoc,
      state: trimmedLoc,
    });

    // If user picked a clean live service + location without free-text keyword, jump to canonical SEO URL
    if (!trimmedQ && matchedSvc) {
      router.push(
        matchedGeo ? `/${matchedSvc.slug}/${matchedGeo.slug}` : `/${matchedSvc.slug}`
      );
      return;
    }

    const next = new URLSearchParams();
    if (trimmedQ) next.set('q', trimmedQ);
    if (trimmedSvc) next.set('service', trimmedSvc);
    if (trimmedLoc) next.set('location', trimmedLoc);
    router.push(`/search${next.toString() ? `?${next.toString()}` : ''}`);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    pushSearchUrl(query, serviceInput, locationInput);
  };

  const handleResetAll = () => {
    setQuery('');
    setServiceInput('');
    setLocationInput('');
    setMinRating(0);
    setSortBy('recommended');
    router.push('/search');
  };

  const liveServices = getLiveServices();
  const suggestedCleanUrl = resolvedService
    ? resolvedGeo
      ? `/${resolvedService.slug}/${resolvedGeo.slug}`
      : `/${resolvedService.slug}`
    : null;

  // Filtered & sorted providers
  const displayedProviders = useMemo(() => {
    let list = [...providers];
    if (minRating > 0) {
      list = list.filter((p) => (p.compositeRating || 0) >= minRating);
    }
    if (sortBy === 'rating') {
      list.sort((a, b) => (b.compositeRating || 0) - (a.compositeRating || 0));
    } else if (sortBy === 'reviews') {
      list.sort((a, b) => (b.totalReviews || 0) - (a.totalReviews || 0));
    } else if (sortBy === 'experience') {
      list.sort((a, b) => (b.yearsInBusiness || 0) - (a.yearsInBusiness || 0));
    }
    return list;
  }, [providers, minRating, sortBy]);

  // Aggregate live directory stats strictly from real DB result set (zero hardcoded fallback numbers)
  const summaryStats = useMemo(() => {
    if (providers.length === 0) {
      return { avgRating: null as string | null, totalReviews: 0 };
    }
    const rated = providers.filter((p) => (p.compositeRating || 0) > 0);
    const avg =
      rated.length > 0
        ? (
            rated.reduce((sum, p) => sum + (p.compositeRating || 0), 0) /
            rated.length
          ).toFixed(1)
        : null;
    const reviewsSum = providers.reduce((sum, p) => sum + (p.totalReviews || 0), 0);
    return { avgRating: avg, totalReviews: reviewsSum };
  }, [providers]);

  const hasActiveSearchParams = Boolean(
    initialQ || initialService || initialLocation || minRating > 0
  );

  const comparedProviders = useMemo(
    () => providers.filter((p) => comparedIds.includes(p.id)),
    [providers, comparedIds]
  );

  const headlineTitle = resolvedService
    ? `${resolvedService.name}${resolvedGeo ? ` in ${resolvedGeo.name}` : ''}`
    : initialQ
      ? `Results for "${initialQ}"`
      : 'Find & Compare Verified Pros';

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-950 flex flex-col">
      <Header
        onOpenQuoteModal={() => {
          setSelectedProviderForQuote(null);
          setQuoteModalOpen(true);
        }}
        savedCount={comparedIds.length}
      />

      {/* ========================================================= */}
      {/* EDITORIAL SEARCH HERO (100% Grid-Aligned with max-w-7xl) */}
      {/* ========================================================= */}
      <section className="relative bg-[#FAFBF9] border-b border-gray-200/80 overflow-visible">
        {/* Subtle editorial radial glow on top-right so hero feels rich, never flat */}
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          aria-hidden="true"
        >
          <div
            className="absolute -top-24 right-0 w-[560px] h-[340px] opacity-60"
            style={{
              background:
                'radial-gradient(circle at 75% 25%, rgba(15,62,53,0.08) 0%, rgba(255,91,38,0.05) 45%, transparent 75%)',
            }}
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8 sm:pt-9 sm:pb-10 space-y-6">
          {/* Top Row: Breadcrumb + Verified Badge */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-1.5 text-xs text-gray-500 font-medium"
            >
              <Link href="/" className="hover:text-[#0F3E35] transition-colors">
                Home
              </Link>
              <span className="text-gray-300">/</span>
              <span className="text-[#0F3E35] font-bold">Search Verified Pros</span>
            </nav>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF3EF] border border-[#D1E5DB]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0F3E35]" />
              <span className="text-[11px] font-bold text-[#0F3E35] tracking-tight">
                Independent ProsVetted Directory
              </span>
            </div>
          </div>

          {/* Headline + Live Metrics Card Row */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-2xl space-y-2">
              <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-[#111827] tracking-tight leading-[1.08]">
                {resolvedService || initialQ ? (
                  headlineTitle
                ) : (
                  <>
                    Find &amp; Compare{' '}
                    <span className="text-[#FF5B26]">Verified Pros</span>
                  </>
                )}
              </h1>
              <p className="text-sm sm:text-[15px] text-[#4B5563] leading-relaxed">
                Search hand-researched contractors by company name, service trade, or NYC borough — backed by verified credentials and cross-platform customer reviews.
              </p>
            </div>

            {/* Right Trust Summary Pill Strip (Desktop/Tablet) */}
            <div className="hidden sm:grid grid-cols-3 gap-3 bg-white/95 backdrop-blur-xs border border-gray-200/90 rounded-2xl px-4 py-3 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06)] shrink-0">
              <div className="flex items-center gap-2.5 pr-3 border-r border-gray-100">
                <div className="w-8 h-8 rounded-xl bg-[#EBF7F2] text-[#0F3E35] flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-black text-gray-950 leading-tight">
                    {isLoading ? '—' : total}
                  </div>
                  <div className="text-[10.5px] font-medium text-gray-500">
                    Verified Pros
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 pr-3 border-r border-gray-100">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                </div>
                <div>
                  <div className="text-sm font-black text-gray-950 leading-tight">
                    {summaryStats.avgRating ? `${summaryStats.avgRating}/5` : '—'}
                  </div>
                  <div className="text-[10.5px] font-medium text-gray-500">
                    Avg Rating
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#EBF7F2] text-[#0F3E35] flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-black text-gray-950 leading-tight">
                    {summaryStats.totalReviews > 0
                      ? `${summaryStats.totalReviews.toLocaleString()}+`
                      : 'Verified'}
                  </div>
                  <div className="text-[10.5px] font-medium text-gray-500">
                    Real Reviews
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Full-Width Balanced Search Bar (Matches Homepage & Service Hero Craftsmanship) */}
          <form
            onSubmit={handleFormSubmit}
            className="bg-white rounded-2xl border border-gray-300/95 hover:border-[#0F3E35]/45 focus-within:border-[#0F3E35]/60 shadow-[0_10px_30px_-6px_rgba(15,23,42,0.12),0_4px_12px_-2px_rgba(15,23,42,0.06)] hover:shadow-[0_14px_38px_-6px_rgba(15,23,42,0.16),0_6px_14px_-2px_rgba(15,23,42,0.08)] p-2.5 md:p-2 flex flex-col md:flex-row md:items-center gap-2 transition-all duration-200"
          >
            {/* 1. Company / Keyword Input */}
            <div className="flex-1 min-w-0 flex items-center gap-2.5 px-3.5 py-2.5 md:py-2 rounded-xl border border-gray-200 md:border-0 bg-white focus-within:border-[#0F3E35] md:focus-within:border-0">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Company name, specialty, or keyword..."
                className="w-full text-sm text-gray-900 placeholder-gray-400 focus:outline-none bg-transparent font-normal"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="p-0.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer shrink-0"
                  aria-label="Clear search query"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="hidden md:block w-px h-8 bg-gray-200/90 shrink-0" />

            {/* 2. Service Category Selector (Seamless Ghost Variant inside Search Bar) */}
            <div className="md:w-60 shrink-0 rounded-xl border border-gray-200 md:border-0 bg-white">
              <DropdownSelect
                variant="ghost"
                value={serviceInput}
                onChange={(val) => setServiceInput(val)}
                options={[
                  { label: 'All Live Services', value: '' },
                  ...liveServices.map((s) => ({ label: s.name, value: s.slug })),
                ]}
                icon={<Hammer className="w-4 h-4 text-[#0F3E35]" />}
                ariaLabel="Select service trade"
                triggerClassName="w-full py-2.5 md:py-2 px-3.5"
              />
            </div>

            <div className="hidden md:block w-px h-8 bg-gray-200/90 shrink-0" />

            {/* 3. Location / Borough / ZIP Input */}
            <div className="md:w-60 shrink-0 flex items-center gap-2.5 px-3.5 py-2.5 md:py-2 rounded-xl border border-gray-200 md:border-0 bg-white focus-within:border-[#0F3E35] md:focus-within:border-0">
              <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="text"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                placeholder="Borough, City, or ZIP"
                className="w-full text-sm text-gray-900 placeholder-gray-400 focus:outline-none bg-transparent font-normal"
              />
              {locationInput && (
                <button
                  type="button"
                  onClick={() => setLocationInput('')}
                  className="p-0.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer shrink-0"
                  aria-label="Clear location"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 4. Primary Search Submit Button */}
            <button
              type="submit"
              className="md:w-auto shrink-0 bg-[#0F3E35] hover:bg-[#0A2C25] active:scale-[0.99] text-white font-bold text-sm py-3 px-6 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Search Pros</span>
              <ArrowRight className="w-4 h-4 stroke-[2.3]" />
            </button>
          </form>

          {/* Quick Trade & Borough Filter Chips Row */}
          <div className="flex items-center gap-2 text-xs overflow-x-auto no-scrollbar pb-0.5">
            <span className="font-bold text-[#111827] shrink-0 mr-0.5">
              Quick Filter:
            </span>

            <button
              type="button"
              onClick={handleResetAll}
              className={`px-3 py-1.5 rounded-full border font-semibold transition-all shrink-0 cursor-pointer ${
                !initialService && !initialLocation && !initialQ
                  ? 'bg-[#0F3E35] text-white border-[#0F3E35] shadow-2xs'
                  : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200/90'
              }`}
            >
              All Pros
            </button>

            {liveServices.map((svc) => {
              const isSelected = resolvedService?.slug === svc.slug;
              return (
                <button
                  key={svc.slug}
                  type="button"
                  onClick={() => {
                    const nextSvc = isSelected ? '' : svc.slug;
                    setServiceInput(nextSvc);
                    const next = new URLSearchParams();
                    if (query.trim()) next.set('q', query.trim());
                    if (nextSvc) next.set('service', nextSvc);
                    if (locationInput.trim()) next.set('location', locationInput.trim());
                    router.push(`/search${next.toString() ? `?${next.toString()}` : ''}`);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-semibold transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-[#0F3E35] text-white border-[#0F3E35] shadow-2xs'
                      : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200/90'
                  }`}
                >
                  <Hammer className="w-3 h-3 opacity-80" />
                  <span>{svc.name}</span>
                </button>
              );
            })}

            <span className="h-4 w-px bg-gray-200 shrink-0 mx-0.5" />

            {NYC_BOROUGH_CHIPS.map((boro) => {
              const isSelected =
                initialLocation.toLowerCase().trim() === boro.toLowerCase();
              return (
                <button
                  key={boro}
                  type="button"
                  onClick={() => {
                    const nextLoc = isSelected ? '' : boro;
                    setLocationInput(nextLoc);
                    const next = new URLSearchParams();
                    if (query.trim()) next.set('q', query.trim());
                    if (serviceInput.trim()) next.set('service', serviceInput.trim());
                    if (nextLoc) next.set('location', nextLoc);
                    router.push(`/search${next.toString() ? `?${next.toString()}` : ''}`);
                  }}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full border font-medium transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-[#EBF7F2] text-[#0F3E35] border-[#0F3E35]/40 font-bold'
                      : 'bg-white hover:bg-gray-50 text-gray-600 border-gray-200/90'
                  }`}
                >
                  <MapPin className="w-3 h-3 opacity-75" />
                  <span>{boro}</span>
                </button>
              );
            })}
          </div>

          {/* Dedicated Directory Hub Callout when matching a canonical service/city */}
          {suggestedCleanUrl && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#EBF7F2] border border-[#0B3B2C]/15 rounded-xl px-4 py-3 text-xs">
              <span className="text-[#0B3B2C] font-medium">
                Want the full{' '}
                <strong>
                  {resolvedService?.name}
                  {resolvedGeo ? ` in ${resolvedGeo.name}` : ''}
                </strong>{' '}
                editorial ranking, evaluation rubric &amp; local cost guide?
              </span>
              <Link
                href={suggestedCleanUrl}
                className="inline-flex items-center gap-1.5 font-bold text-white bg-[#0F3E35] hover:bg-[#0A2C25] px-3.5 py-1.5 rounded-lg transition-colors shrink-0 self-start sm:self-auto"
              >
                <span>Open Full Guide</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ========================================================= */}
      {/* MAIN RESULTS CONTAINER (max-w-7xl) */}
      {/* ========================================================= */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 sm:py-9 w-full flex-1 space-y-5">
        {/* Results Count + Active Chips + Sort & Rating Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-gray-900">
              {isLoading
                ? 'Searching verified companies...'
                : `Showing ${displayedProviders.length} of ${total} Verified ${
                    total === 1 ? 'Company' : 'Companies'
                  }`}
            </span>

            {hasActiveSearchParams && (
              <button
                type="button"
                onClick={handleResetAll}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#DA5F2F] hover:text-[#b94b20] bg-orange-50 hover:bg-orange-100/80 border border-orange-200/70 px-2.5 py-1 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
                <span>Reset filters</span>
              </button>
            )}
          </div>

          {/* Right Toolbar: Rating Filter + Sort Dropdown + Browse All */}
          <div className="flex flex-wrap items-center gap-2.5">
            <DropdownSelect
              value={minRating}
              onChange={(v) => setMinRating(Number(v))}
              options={[
                { label: 'Any Rating', value: 0 },
                { label: '4.5+ Stars', value: 4.5 },
                { label: '4.8+ Stars', value: 4.8 },
              ]}
              icon={<Star className="w-3.5 h-3.5" />}
              ariaLabel="Filter by minimum rating"
            />

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-gray-500 hidden md:inline">
                Sort by:
              </span>
              <DropdownSelect
                value={sortBy}
                onChange={(v) => setSortBy(v as SearchSortOption)}
                options={[
                  { label: 'Recommended', value: 'recommended' },
                  { label: 'Highest Rated', value: 'rating' },
                  { label: 'Most Reviews', value: 'reviews' },
                  { label: 'Years in Business', value: 'experience' },
                ]}
                ariaLabel="Sort search results"
                align="right"
              />
            </div>

            <Link
              href="/services"
              className="hidden lg:inline-flex items-center gap-1 text-xs font-bold text-[#0F3E35] hover:underline ml-1"
            >
              <span>All Services</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Results Feed */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 shadow-2xs"
              >
                <div className="flex flex-col md:flex-row gap-5">
                  <div className="w-full md:w-60 h-44 rounded-xl shrink-0 skeleton-shimmer" />
                  <div className="flex-1 space-y-3">
                    <div className="h-6 rounded w-1/3 skeleton-shimmer" />
                    <div className="h-4 rounded w-1/2 skeleton-shimmer" />
                    <div className="h-12 rounded-xl w-full mt-4 skeleton-shimmer" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : displayedProviders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center space-y-4 shadow-2xs">
            <h2 className="text-lg font-bold text-gray-900">
              No matching companies found
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 max-w-md mx-auto">
              Try clearing active filters or browse our live verified directories in New York City:
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
              {hasActiveSearchParams && (
                <button
                  type="button"
                  onClick={handleResetAll}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold transition-colors cursor-pointer"
                >
                  <span>Show All Pros</span>
                </button>
              )}
              {liveServices.map((svc) => (
                <Link
                  key={svc.slug}
                  href={`/${svc.slug}/new-york-city-ny`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F3E35] text-white text-xs font-bold hover:bg-[#0A2C25] transition-colors"
                >
                  <span>NYC {svc.name}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedProviders.map((provider, idx) => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                rank={idx + 1}
                isCompared={comparedIds.includes(provider.id)}
                onToggleCompare={(id) =>
                  setComparedIds((prev) =>
                    prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                  )
                }
                onOpenQuoteModal={(p) => {
                  setSelectedProviderForQuote(p || null);
                  setQuoteModalOpen(true);
                }}
                onOpenCostGuide={() => setCostGuideOpen(true)}
                onOpenReviewsModal={(p, platform = 'ALL') =>
                  setReviewsModalState({
                    isOpen: true,
                    provider: p,
                    initialPlatform: platform,
                  })
                }
              />
            ))}
          </div>
        )}
      </main>

      <Footer />

      <CompareDrawer
        comparedProviders={comparedProviders}
        onRemove={(id) => setComparedIds((prev) => prev.filter((x) => x !== id))}
        onClear={() => setComparedIds([])}
        onOpenCompareModal={() => setCompareModalOpen(true)}
      />

      <CompareModal
        isOpen={compareModalOpen}
        onClose={() => setCompareModalOpen(false)}
        providers={comparedProviders}
        onSelectForQuote={(p) => {
          setCompareModalOpen(false);
          setSelectedProviderForQuote(p);
          setQuoteModalOpen(true);
        }}
      />

      <CostGuideModal
        isOpen={costGuideOpen}
        onClose={() => setCostGuideOpen(false)}
      />

      <QuoteModal
        isOpen={quoteModalOpen}
        onClose={() => {
          setQuoteModalOpen(false);
          setSelectedProviderForQuote(null);
        }}
        selectedProvider={selectedProviderForQuote}
      />

      {reviewsModalState.provider && (
        <ReviewsModal
          isOpen={reviewsModalState.isOpen}
          onClose={() =>
            setReviewsModalState((prev) => ({ ...prev, isOpen: false }))
          }
          provider={reviewsModalState.provider}
          initialPlatform={reviewsModalState.initialPlatform}
        />
      )}
    </div>
  );
}

export default function SearchResultsClient() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F9FAFB]" />}>
      <SearchResultsInner />
    </Suspense>
  );
}
