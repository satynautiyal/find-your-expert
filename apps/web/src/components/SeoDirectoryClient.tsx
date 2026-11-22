'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import {
  Header,
  Footer,
  QuoteModal,
  CostGuideModal,
  CompareDrawer,
  CompareModal,
} from '@/components/common';
import SafeImage from '@/components/common/SafeImage';
import { EButton } from '@/components/EComponents';
import HeroBanner from '@/components/HeroBanner';
import ServiceCategoriesSection from '@/components/ServiceCategoriesSection';
import ContractorFilterToolbar from '@/components/ContractorFilterToolbar';
import ProviderCard from '@/components/ProviderCard';
import EvaluationAndCostSection from '@/components/EvaluationAndCostSection';
import { ReviewsModal } from '@/components/contractor-profile';
import type { RooferProvider } from '@/data/mockRoofers';
import {
  fetchProviders,
  fetchProviderFilters,
  fetchCategories,
  type ProviderFiltersResponse,
  type CategoryItem,
} from '@/lib/api';
import {
  TRACKER_NYC_BOROUGHS,
  TRACKER_STATES,
} from '@/data/geoTrackerLocations';
import {
  getCitiesForState,
  getLiveServices,
  resolveGeoFromInputs,
  type BreadcrumbItem,
  type GeoSeoPageMeta,
  type ResolvedGeoLocation,
  type ServiceRegistryEntry,
} from '@/lib/seo-urls';
import {
  RefreshCw,
  AlertCircle,
  Clock,
  Sparkles,
  MapPin,
  CheckCircle2,
  Mail,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export interface SeoDirectoryClientProps {
  service: ServiceRegistryEntry;
  geo: ResolvedGeoLocation | null;
  breadcrumbs: BreadcrumbItem[];
  seoMeta: GeoSeoPageMeta;
  initialSubService?: string;
}

export default function SeoDirectoryClient({
  service,
  geo,
  breadcrumbs,
  seoMeta,
  initialSubService = 'All Services',
}: SeoDirectoryClientProps) {
  const router = useRouter();

  const initialBoroughFilter =
    geo?.kind === 'borough' ? geo.name.replace(/^The\s+/i, '') : 'All';

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [locationInput, setLocationInput] = useState(
    geo?.kind === 'borough' ? geo.name : geo?.kind === 'city' ? geo.name : ''
  );
  const [selectedService, setSelectedService] = useState(initialSubService || 'All Services');
  const [sortBy, setSortBy] = useState<'rating' | 'reviews' | 'experience' | 'fast-response'>('rating');

  // Sub-filters
  const [projectType, setProjectType] = useState('All');
  const [minRating, setMinRating] = useState(0);
  const [minExperience, setMinExperience] = useState(0);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [distance, setDistance] = useState('All Areas');

  // Dynamic Data States
  const [categoriesList, setCategoriesList] = useState<CategoryItem[]>([]);
  const [providers, setProviders] = useState<RooferProvider[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [filterMeta, setFilterMeta] = useState<ProviderFiltersResponse | null>(null);
  const [isLoading, setIsLoading] = useState(seoMeta.isLive);
  const [error, setError] = useState<string | null>(null);

  // Coming Soon notification state
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifySuccess, setNotifySuccess] = useState(false);

  // Compare & Modals State
  const [comparedIds, setComparedIds] = useState<string[]>([]);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [costGuideOpen, setCostGuideOpen] = useState(false);
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [selectedRooferForQuote, setSelectedRooferForQuote] = useState<RooferProvider | null>(null);
  const [reviewsModalState, setReviewsModalState] = useState<{
    isOpen: boolean;
    provider: RooferProvider | null;
    initialPlatform: string;
  }>({
    isOpen: false,
    provider: null,
    initialPlatform: 'ALL',
  });

  const handleOpenReviewsModal = useCallback(
    (provider: RooferProvider, initialPlatform = 'ALL') => {
      setReviewsModalState({
        isOpen: true,
        provider,
        initialPlatform,
      });
    },
    []
  );

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load categories & filter metadata
  useEffect(() => {
    let isMounted = true;
    fetchProviderFilters()
      .then(async (meta) => {
        if (!isMounted) return;
        const resolvedCats =
          meta?.categories && meta.categories.length > 0
            ? meta.categories
            : await fetchCategories();
        if (!isMounted) return;
        if (resolvedCats.length > 0) {
          setCategoriesList(resolvedCats);
        }
        if (meta) setFilterMeta(meta);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const activeCategoryObj = useMemo(() => {
    const target = service.dbCategoryName.toLowerCase().trim();
    return categoriesList.find(
      (cat) =>
        cat.name.toLowerCase() === target ||
        cat.slug.toLowerCase() === service.slug
    );
  }, [service, categoriesList]);

  const activeCategorySubServices = useMemo(() => {
    if (activeCategoryObj?.subServices && activeCategoryObj.subServices.length > 0) {
      return activeCategoryObj.subServices.map((s) => s.name);
    }
    return service.aliases || filterMeta?.services || [];
  }, [activeCategoryObj, service, filterMeta]);

  const isComingSoon = !seoMeta.isLive;

  // Fetch Providers for live service/location routes
  const loadProviders = useCallback(async () => {
    if (isComingSoon) {
      setProviders([]);
      setTotalCount(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchProviders({
        search: debouncedSearch,
        borough: initialBoroughFilter !== 'All' ? initialBoroughFilter : undefined,
        category: service.dbCategoryName,
        service:
          selectedService !== 'All Services' && selectedService !== 'All'
            ? selectedService
            : undefined,
        sortBy: sortBy === 'fast-response' ? 'rating' : sortBy,
        limit: 50,
      });
      setProviders(data.items);
      setTotalCount(data.total);
    } catch (err: any) {
      console.error('Error fetching providers:', err);
      setError(err.message || 'Failed to connect to API server.');
    } finally {
      setIsLoading(false);
    }
  }, [
    isComingSoon,
    debouncedSearch,
    initialBoroughFilter,
    service.dbCategoryName,
    selectedService,
    sortBy,
  ]);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  const locationDisplay = useMemo(() => {
    if (!geo) return 'United States';
    if (geo.kind === 'state') return geo.name;
    if (geo.slug === 'new-york-city-ny') return 'New York City, NY';
    return `${geo.name}, ${geo.stateCode}`;
  }, [geo]);

  const handleHeroSearchSubmit = () => {
    const trimmedLoc = locationInput.trim();
    if (trimmedLoc) {
      const targetGeo = resolveGeoFromInputs({
        borough: trimmedLoc,
        city: trimmedLoc,
        state: trimmedLoc,
      });
      if (targetGeo && targetGeo.slug !== geo?.slug) {
        router.push(`/${service.slug}/${targetGeo.slug}`);
        return;
      }
    }
    const el = document.getElementById('listings');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleToggleCompare = (id: string) => {
    setComparedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleOpenQuote = (provider?: RooferProvider) => {
    setSelectedRooferForQuote(provider || null);
    setQuoteModalOpen(true);
  };

  const comparedProviders = useMemo(
    () => providers.filter((r) => comparedIds.includes(r.id)),
    [providers, comparedIds]
  );

  const currentServiceLabel =
    selectedService && selectedService !== 'All Services' && selectedService !== 'All'
      ? selectedService
      : service.dbCategoryName;

  const hasActiveFilters =
    projectType !== 'All' ||
    minRating > 0 ||
    minExperience > 0 ||
    verifiedOnly ||
    distance !== 'All Areas' ||
    (selectedService !== 'All Services' && selectedService !== 'All') ||
    Boolean(debouncedSearch);

  const handleResetFilters = () => {
    setProjectType('All');
    setMinRating(0);
    setMinExperience(0);
    setVerifiedOnly(false);
    setDistance('All Areas');
    setSelectedService('All Services');
    setSearchQuery('');
  };

  const handleNotifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (notifyEmail.trim()) {
      setNotifySuccess(true);
      setTimeout(() => {
        setNotifyEmail('');
        setNotifySuccess(false);
      }, 4000);
    }
  };

  const filteredProviders = useMemo(() => {
    return providers.filter((p) => {
      if (minRating > 0 && (p.compositeRating || 0) < minRating) return false;
      if (minExperience > 0 && (p.yearsInBusiness || 0) < minExperience) return false;
      if (verifiedOnly && !p.isLicensed && !p.badge) return false;
      if (projectType !== 'All') {
        const pLower = projectType.toLowerCase();
        const matchesServices = p.services?.some((s) => s.toLowerCase().includes(pLower));
        const matchesName = p.name.toLowerCase().includes(pLower);
        const matchesDesc = (p.description || '').toLowerCase().includes(pLower);
        if (!matchesServices && !matchesName && !matchesDesc) return false;
      }
      return true;
    });
  }, [providers, minRating, minExperience, verifiedOnly, projectType]);

  const stateCities = useMemo(() => {
    if (geo?.kind === 'state') {
      return getCitiesForState(geo.slug);
    }
    return [];
  }, [geo]);

  const liveServices = useMemo(() => getLiveServices(), []);

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-950 flex flex-col font-sans selection:bg-[#0F3E35] selection:text-white">
      {/* 1. Universal Header */}
      <Header
        onOpenQuoteModal={() => handleOpenQuote()}
        savedCount={comparedIds.length}
      />

      {/* 2. Hero Banner with Sheet-Matched H1 & Logical Multi-Level Breadcrumbs */}
      <HeroBanner
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedBorough={locationInput || 'All'}
        onSelectBorough={setLocationInput}
        selectedService={currentServiceLabel}
        onSelectService={setSelectedService}
        onSearchSubmit={handleHeroSearchSubmit}
        companiesCount={totalCount}
        dynamicBoroughs={filterMeta?.boroughs}
        dynamicServices={activeCategorySubServices}
        stats={filterMeta?.stats}
        breadcrumbs={breadcrumbs}
        headlineOverride={seoMeta.h1}
        locationLabelOverride={geo ? locationDisplay : 'New York, NY'}
        isComingSoon={isComingSoon}
      />

      {/* 3. Hierarchical Clean-URL Geo Navigation Strip */}
      <section className="bg-white border-b border-gray-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          {!geo ? (
            /* Service Hub (`/{service}`): Link to Live NYC Markets + Top States */
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar text-xs">
              <span className="font-bold text-gray-800 shrink-0 flex items-center gap-1 mr-1">
                <MapPin className="w-3.5 h-3.5 text-[#0F3E35]" />
                <span>Browse by Location:</span>
              </span>
              <Link
                href={`/${service.slug}/new-york`}
                className="px-3 py-1.5 rounded-full bg-[#EBF7F2] text-[#0B3B2C] border border-[#0B3B2C]/20 font-semibold hover:bg-[#dcf0e7] transition-colors shrink-0"
              >
                New York (Live)
              </Link>
              <Link
                href={`/${service.slug}/new-york-city-ny`}
                className="px-3 py-1.5 rounded-full bg-white text-gray-700 border border-gray-200 font-medium hover:border-[#0F3E35] hover:text-[#0F3E35] transition-colors shrink-0"
              >
                New York City
              </Link>
              {TRACKER_NYC_BOROUGHS.map((b) => (
                <Link
                  key={b.slug}
                  href={`/${service.slug}/${b.slug}`}
                  className="px-3 py-1.5 rounded-full bg-white text-gray-700 border border-gray-200 font-medium hover:border-[#0F3E35] hover:text-[#0F3E35] transition-colors shrink-0"
                >
                  {b.name}
                </Link>
              ))}
              {TRACKER_STATES.filter((s) => !s.isLive)
                .slice(0, 5)
                .map((s) => (
                  <Link
                    key={s.slug}
                    href={`/${service.slug}/${s.slug}`}
                    className="px-3 py-1.5 rounded-full bg-gray-50 text-gray-600 border border-gray-200 font-medium hover:border-gray-300 hover:text-gray-900 transition-colors shrink-0"
                  >
                    {s.name}
                  </Link>
                ))}
              <Link
                href="/locations"
                className="px-3 py-1.5 rounded-full text-[#DA5F2F] font-bold hover:underline shrink-0 inline-flex items-center gap-1"
              >
                <span>All Locations</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          ) : geo.kind === 'state' ? (
            /* State Page (`/{service}/{state}`): Link to Cities in this State (+ NYC Boroughs if NY) */
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar text-xs">
              <span className="font-bold text-gray-800 shrink-0 flex items-center gap-1 mr-1">
                <MapPin className="w-3.5 h-3.5 text-[#0F3E35]" />
                <span>Cities in {geo.name}:</span>
              </span>
              {geo.slug === 'new-york' &&
                TRACKER_NYC_BOROUGHS.map((b) => (
                  <Link
                    key={b.slug}
                    href={`/${service.slug}/${b.slug}`}
                    className="px-3 py-1.5 rounded-full bg-[#EBF7F2] text-[#0B3B2C] border border-[#0B3B2C]/20 font-semibold hover:bg-[#dcf0e7] transition-colors shrink-0"
                  >
                    {b.name}
                  </Link>
                ))}
              {stateCities.slice(0, 14).map((c) => (
                <Link
                  key={c.slug}
                  href={`/${service.slug}/${c.slug}`}
                  className="px-3 py-1.5 rounded-full bg-white text-gray-700 border border-gray-200 font-medium hover:border-[#0F3E35] hover:text-[#0F3E35] transition-colors shrink-0"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          ) : geo.slug === 'new-york-city-ny' || geo.kind === 'borough' ? (
            /* NYC City or Borough Page: 1-Click Clean URL Switcher across All NYC + 5 Boroughs */
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar text-xs">
              <span className="font-bold text-gray-800 shrink-0 flex items-center gap-1 mr-1">
                <MapPin className="w-3.5 h-3.5 text-[#0F3E35]" />
                <span>NYC Areas:</span>
              </span>
              <Link
                href={`/${service.slug}/new-york-city-ny`}
                className={`px-3 py-1.5 rounded-full border font-semibold transition-colors shrink-0 ${
                  geo.slug === 'new-york-city-ny'
                    ? 'bg-[#0F3E35] text-white border-[#0F3E35]'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-[#0F3E35] hover:text-[#0F3E35]'
                }`}
              >
                All New York City
              </Link>
              {TRACKER_NYC_BOROUGHS.map((b) => {
                const isActive = geo.slug === b.slug;
                return (
                  <Link
                    key={b.slug}
                    href={`/${service.slug}/${b.slug}`}
                    className={`px-3 py-1.5 rounded-full border font-semibold transition-colors shrink-0 ${
                      isActive
                        ? 'bg-[#0F3E35] text-white border-[#0F3E35]'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-[#0F3E35] hover:text-[#0F3E35]'
                    }`}
                  >
                    {b.name}
                  </Link>
                );
              })}
            </div>
          ) : (
            /* Other US City Page (`/{service}/{city}-{st}`): Link up to parent State + sibling cities */
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar text-xs">
              <span className="font-bold text-gray-800 shrink-0 flex items-center gap-1 mr-1">
                <MapPin className="w-3.5 h-3.5 text-[#0F3E35]" />
                <span>More in {geo.stateName}:</span>
              </span>
              <Link
                href={`/${service.slug}/${geo.stateSlug}`}
                className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-800 border border-gray-200 font-semibold hover:bg-gray-200 transition-colors shrink-0"
              >
                All {geo.stateName}
              </Link>
              {getCitiesForState(geo.stateSlug)
                .filter((c) => c.slug !== geo.slug)
                .slice(0, 10)
                .map((c) => (
                  <Link
                    key={c.slug}
                    href={`/${service.slug}/${c.slug}`}
                    className="px-3 py-1.5 rounded-full bg-white text-gray-700 border border-gray-200 font-medium hover:border-[#0F3E35] hover:text-[#0F3E35] transition-colors shrink-0"
                  >
                    {c.name}
                  </Link>
                ))}
            </div>
          )}
        </div>
      </section>

      {/* 4. SEO Ranking Intro Section (Live pages only) */}
      {!isComingSoon && (
        <ServiceCategoriesSection
          selectedCategory={service.dbCategoryName}
          selectedService={selectedService}
          onSelectService={setSelectedService}
          categories={categoriesList}
          companiesCount={filteredProviders.length || totalCount}
          currentLocation={geo ? locationDisplay : 'New York, NY'}
        />
      )}

      {/* 5. Main Content Area */}
      <main
        id="listings"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 sm:py-9 w-full flex-1 space-y-6 scroll-mt-4"
      >
        {/* Mandatory Editorial Methodology & Advertising Disclosure Bar (Sheet 1 Rows 10 & 12) */}
        <div className="bg-white border border-gray-200/90 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600 shadow-2xs">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldCheck className="w-4 h-4 text-[#0F3E35] shrink-0" />
            <span>
              Researched by the{' '}
              <Link
                href="/authors/prosvetted-editorial-team"
                className="font-semibold text-gray-800 hover:text-[#0F3E35] underline decoration-gray-300"
              >
                ProsVetted Editorial Team
              </Link>{' '}
              using verified credentials and multi-platform reviews.
            </span>
          </div>
          <div className="flex items-center gap-3 font-semibold text-[#0F3E35] shrink-0">
            <Link href="/how-we-research" className="hover:underline">
              How We Research
            </Link>
            <span className="text-gray-300">•</span>
            <Link href="/advertising-disclosure" className="hover:underline">
              Advertising Disclosure
            </Link>
          </div>
        </div>

        {/* Filter Toolbar (Live pages only) */}
        {!isComingSoon && (
          <ContractorFilterToolbar
            currentService={currentServiceLabel}
            currentLocation={geo ? locationDisplay : 'New York, NY'}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            selectedService={selectedService}
            onSelectService={setSelectedService}
            dynamicServices={activeCategorySubServices}
            projectType={projectType}
            onProjectTypeChange={setProjectType}
            minRating={minRating}
            onMinRatingChange={setMinRating}
            minExperience={minExperience}
            onMinExperienceChange={setMinExperience}
            verifiedOnly={verifiedOnly}
            onVerifiedOnlyChange={setVerifiedOnly}
            distance={distance}
            onDistanceChange={setDistance}
            onResetFilters={handleResetFilters}
            hasActiveFilters={hasActiveFilters}
          />
        )}

        {/* Dynamic Provider Cards OR Coming Soon View */}
        <div className="space-y-4">
          {isComingSoon ? (
            <div className="bg-white rounded-3xl border border-gray-200/90 p-6 sm:p-12 text-center shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#EBF3F1] rounded-full blur-3xl -z-10 opacity-70" />
              <div className="max-w-xl mx-auto space-y-4 sm:space-y-5">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#EBF3F1] text-[#0F3E35] flex items-center justify-center mx-auto shadow-2xs">
                  <Sparkles className="w-7 h-7 sm:w-8 sm:h-8" />
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Coming Soon</span>
                </div>

                <h2 className="text-xl sm:text-3xl font-black text-gray-950 tracking-tight">
                  {geo
                    ? `${service.name} in ${locationDisplay} is Coming Soon!`
                    : `${service.name} is Coming Soon!`}
                </h2>

                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  Our editorial team is currently hand-vetting and verifying licensed{' '}
                  <strong className="text-gray-900 font-bold">{service.name.toLowerCase()}</strong>{' '}
                  companies{geo ? ` in ${locationDisplay}` : ''}. Typical U.S. project budget:{' '}
                  <span className="font-semibold text-gray-800">{service.typicalBudget}</span>.
                </p>

                {/* Direct Clean-URL Links to Live NYC Directories */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3 flex-wrap">
                  {liveServices.map((liveSvc, idx) => (
                    <Link
                      key={liveSvc.slug}
                      href={`/${liveSvc.slug}/new-york-city-ny`}
                      className={
                        idx === 0
                          ? 'w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-[#0F3E35] text-white hover:bg-[#0A2C25] transition-all shadow-xs active:scale-95'
                          : 'w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-white border border-gray-200 text-gray-800 hover:border-gray-300 hover:bg-gray-50 transition-all shadow-2xs active:scale-95'
                      }
                    >
                      <span>Explore NYC {liveSvc.name}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  ))}
                </div>

                {/* Email Notification Subscription */}
                <div className="pt-5 sm:pt-6 border-t border-gray-100 max-w-md mx-auto">
                  <span className="text-xs font-semibold text-gray-700 block mb-2">
                    Get notified when {service.name} launches{geo ? ` in ${locationDisplay}` : ''}:
                  </span>
                  {notifySuccess ? (
                    <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Thank you! We&apos;ll notify you as soon as this page goes live.</span>
                    </div>
                  ) : (
                    <form onSubmit={handleNotifySubmit} className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          required
                          value={notifyEmail}
                          onChange={(e) => setNotifyEmail(e.target.value)}
                          placeholder="Enter your email address"
                          className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0F3E35]/20 focus:border-[#0F3E35]"
                        />
                      </div>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-[#0F3E35] text-white rounded-xl text-xs font-bold hover:bg-[#0A2C25] transition-colors cursor-pointer w-full sm:w-auto"
                      >
                        Notify Me
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          ) : isLoading ? (
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
                      <div className="h-4 rounded w-2/3 skeleton-shimmer" />
                      <div className="h-12 rounded-xl w-full mt-4 skeleton-shimmer" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="bg-red-50/60 rounded-2xl border border-red-200 p-10 text-center space-y-3">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-red-900">
                Error Connecting to Database API
              </h3>
              <p className="text-xs text-red-600 max-w-md mx-auto">{error}</p>
              <div className="pt-2">
                <EButton
                  onClick={() => loadProviders()}
                  variant="primary"
                  size="md"
                  iconLeft={<RefreshCw className="w-3.5 h-3.5" />}
                >
                  Retry Loading
                </EButton>
              </div>
            </div>
          ) : filteredProviders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center space-y-3">
              <h3 className="text-base font-bold text-gray-900">
                No companies matched this specific filter
              </h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Try resetting your filters or browsing all verified {service.name.toLowerCase()} companies in New York City.
              </p>
              <div className="pt-2 flex items-center justify-center gap-3">
                {hasActiveFilters ? (
                  <EButton onClick={handleResetFilters} variant="primary" size="md">
                    Reset All Filters
                  </EButton>
                ) : (
                  <Link
                    href={`/${service.slug}/new-york-city-ny`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-[#0F3E35] text-white hover:bg-[#0A2C25] transition-all"
                  >
                    <span>View All NYC {service.name}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </div>
          ) : (
            filteredProviders.map((roofer, index) => (
              <motion.div
                key={roofer.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.22,
                  delay: Math.min(index * 0.035, 0.2),
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <ProviderCard
                  provider={roofer}
                  rank={index + 1}
                  isCompared={comparedIds.includes(roofer.id)}
                  onToggleCompare={handleToggleCompare}
                  onOpenQuoteModal={handleOpenQuote}
                  onOpenCostGuide={() => setCostGuideOpen(true)}
                  onOpenReviewsModal={handleOpenReviewsModal}
                />
              </motion.div>
            ))
          )}
        </div>

        {/* For Businesses Get Listed Banner */}
        {!isComingSoon && (
          <div className="bg-[#0B3B2C] rounded-2xl px-5 py-5 sm:px-7 sm:py-6 shadow-sm border border-[#0F3E35] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-4 sm:gap-5 min-w-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden shrink-0 bg-white/10 border border-white/15 shadow-sm">
                <SafeImage
                  src={activeCategoryObj?.image || '/categories/custom-cabinets.jpg'}
                  alt={currentServiceLabel}
                  fallbackCategory={currentServiceLabel}
                  fallbackTitle={currentServiceLabel}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <span className="inline-block text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-300 mb-1">
                  FOR BUSINESSES • PROSVETTED NETWORK
                </span>
                <h3 className="text-base sm:text-lg md:text-[20px] font-bold text-white leading-snug tracking-tight">
                  Are You a {service.companyLabel} Company in {geo ? locationDisplay : 'New York'}?
                </h3>
                <p className="text-xs sm:text-[13px] text-emerald-100/75 mt-1 font-normal leading-relaxed max-w-2xl">
                  Learn how ProsVetted researches companies, or request an update to your existing business profile.
                </p>
              </div>
            </div>

            <Link
              href="/for-businesses"
              className="bg-[#DA5F2F] hover:bg-[#C44D29] text-white rounded-xl px-5 py-3 text-xs sm:text-[13px] font-bold leading-tight text-center shrink-0 transition-all w-full sm:w-auto inline-flex items-center justify-center gap-2 shadow-sm"
            >
              <span>For Businesses</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.4]" />
            </Link>
          </div>
        )}

        {/* Evaluation & Cost Guide */}
        {!isComingSoon && (
          <EvaluationAndCostSection
            currentService={currentServiceLabel}
            currentLocation={geo ? locationDisplay : 'New York, NY'}
            onOpenCostGuide={() => setCostGuideOpen(true)}
            costBenchmarks={activeCategoryObj?.costBenchmarks}
          />
        )}
      </main>

      {/* Footer */}
      <Footer />

      {/* Modals */}
      <CompareDrawer
        comparedProviders={comparedProviders}
        onRemove={handleToggleCompare}
        onClear={() => setComparedIds([])}
        onOpenCompareModal={() => setCompareModalOpen(true)}
      />

      <CompareModal
        isOpen={compareModalOpen}
        onClose={() => setCompareModalOpen(false)}
        providers={comparedProviders}
        onSelectForQuote={(p) => {
          setCompareModalOpen(false);
          handleOpenQuote(p);
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
          setSelectedRooferForQuote(null);
        }}
        selectedProvider={selectedRooferForQuote}
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
