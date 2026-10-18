'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Header,
  Footer,
  QuoteModal,
  CostGuideModal,
  CompareDrawer,
  CompareModal,
} from '@/components/common';
import { EButton } from '@/components/EComponents';
import HeroBanner from '@/components/HeroBanner';
import ServiceCategoriesSection from '@/components/ServiceCategoriesSection';
import ContractorFilterToolbar from '@/components/ContractorFilterToolbar';
import ProviderCard from '@/components/ProviderCard';
import EvaluationAndCostSection from '@/components/EvaluationAndCostSection';
import type { RooferProvider } from '@/data/mockRoofers';
import {
  fetchProviders,
  fetchProviderFilters,
  fetchCategories,
  type ProviderFiltersResponse,
  type CategoryItem,
} from '@/lib/api';
import {
  RefreshCw,
  AlertCircle,
  Clock,
  Sparkles,
  MapPin,
  CheckCircle2,
  Mail,
  ArrowRight,
} from 'lucide-react';

function ContractorsDirectoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL Query Parameters
  const initialSearch = searchParams.get('search') || searchParams.get('q') || '';
  const urlService = searchParams.get('service') || '';
  const urlCategory = searchParams.get('category') || '';
  const urlState = searchParams.get('state') || 'New York';
  const urlBorough = searchParams.get('borough') || 'All';

  // Determine initial category & service (Default to 'Custom Cabinets' as requested)
  let defaultCategory = 'Custom Cabinets';
  let defaultService = 'All Services';

  if (urlCategory) {
    defaultCategory = urlCategory;
  } else if (urlService) {
    if (urlService.toLowerCase().includes('roof')) {
      defaultCategory = 'Roofing';
      defaultService = urlService === 'Roofing' ? 'All Services' : urlService;
    } else if (
      urlService.toLowerCase().includes('cabinet') ||
      urlService.toLowerCase().includes('shelv') ||
      urlService.toLowerCase().includes('vanit') ||
      urlService.toLowerCase().includes('closet') ||
      urlService.toLowerCase().includes('millwork')
    ) {
      defaultCategory = 'Custom Cabinets';
      defaultService = urlService === 'Custom Cabinets' ? 'All Services' : urlService;
    } else {
      defaultCategory = urlService;
      defaultService = urlService;
    }
  }

  // Active Filter States
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [selectedState, setSelectedState] = useState(urlState);
  const [selectedBorough, setSelectedBorough] = useState(urlBorough);
  const [selectedCategory, setSelectedCategory] = useState(defaultCategory);
  const [selectedService, setSelectedService] = useState(defaultService);
  const [sortBy, setSortBy] = useState<'rating' | 'reviews' | 'experience'>('rating');

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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Email Notification State for Coming Soon
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifySuccess, setNotifySuccess] = useState(false);

  // Compare & Modals State
  const [comparedIds, setComparedIds] = useState<string[]>([]);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [costGuideOpen, setCostGuideOpen] = useState(false);
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [selectedRooferForQuote, setSelectedRooferForQuote] = useState<RooferProvider | null>(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load categories and filters meta on mount
  useEffect(() => {
    let isMounted = true;

    Promise.all([fetchCategories(), fetchProviderFilters()])
      .then(([cats, meta]) => {
        if (!isMounted) return;
        if (cats && cats.length > 0) setCategoriesList(cats);
        if (meta) setFilterMeta(meta);
      })
      .catch((err) => {
        console.warn('Error loading dynamic metadata:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Detect if selected state or category is outside active live scope (New York + Custom Cabinets / Roofing)
  const isUnlaunchedState = useMemo(() => {
    if (!selectedState || selectedState === 'All') return false;
    const s = selectedState.toLowerCase().trim();
    return s !== 'new york' && s !== 'ny' && s !== 'nyc';
  }, [selectedState]);

  const isUnlaunchedCategory = useMemo(() => {
    if (!selectedCategory || selectedCategory === 'All') return false;
    const c = selectedCategory.toLowerCase().trim();
    return !c.includes('cabinet') && !c.includes('roof');
  }, [selectedCategory]);

  const isComingSoon = isUnlaunchedState || isUnlaunchedCategory;

  // Fetch Providers from backend API
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
        borough: selectedBorough !== 'All' ? selectedBorough : undefined,
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
        service: selectedService !== 'All Services' && selectedService !== 'All' ? selectedService : undefined,
        sortBy,
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
  }, [debouncedSearch, selectedBorough, selectedCategory, selectedService, sortBy, isComingSoon]);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  const handleToggleCompare = (id: string) => {
    setComparedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleOpenQuote = (provider?: RooferProvider) => {
    setSelectedRooferForQuote(provider || null);
    setQuoteModalOpen(true);
  };

  const handleCloseQuote = () => {
    setQuoteModalOpen(false);
    setSelectedRooferForQuote(null);
  };

  const handleScrollToListings = () => {
    const el = document.getElementById('listings');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const comparedProviders = useMemo(() => {
    return providers.filter((r) => comparedIds.includes(r.id));
  }, [providers, comparedIds]);

  const currentService =
    selectedService && selectedService !== 'All Services' && selectedService !== 'All'
      ? selectedService
      : selectedCategory || 'Custom Cabinets';

  const currentLocation =
    selectedBorough && selectedBorough !== 'All' && selectedBorough !== 'New York City'
      ? `${selectedBorough}, NY`
      : 'New York, NY';

  const hasActiveFilters =
    projectType !== 'All' ||
    minRating > 0 ||
    minExperience > 0 ||
    verifiedOnly ||
    distance !== 'All Areas' ||
    (selectedService !== 'All Services' && selectedService !== 'All') ||
    (selectedBorough !== 'All' && selectedBorough !== 'New York City');

  const handleResetFilters = () => {
    setProjectType('All');
    setMinRating(0);
    setMinExperience(0);
    setVerifiedOnly(false);
    setDistance('All Areas');
    setSelectedService('All Services');
    setSelectedBorough('All');
    setSelectedState('New York');
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

  // Client-Side In-Memory Refinement (Rating, Experience, Verification, Sub-project match)
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

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-950 flex flex-col font-sans selection:bg-[#0F3E35] selection:text-white">
      {/* 1. Universal Header */}
      <Header
        onOpenQuoteModal={() => handleOpenQuote()}
        savedCount={comparedIds.length}
      />

      {/* 2. Hero Banner with real database numbers */}
      <HeroBanner
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedBorough={selectedBorough}
        onSelectBorough={setSelectedBorough}
        selectedService={currentService}
        onSelectService={setSelectedService}
        onSearchSubmit={handleScrollToListings}
        companiesCount={totalCount}
        dynamicBoroughs={filterMeta?.boroughs}
        dynamicServices={filterMeta?.services}
        stats={filterMeta?.stats}
      />

      {/* 3. Trade & Sub-service Selector (Custom Cabinets default | Roofing | Coming Soon) */}
      <ServiceCategoriesSection
        selectedCategory={selectedCategory}
        onSelectCategory={(categoryName) => {
          setSelectedCategory(categoryName);
          setSelectedService('All Services');
          setProjectType('All');
        }}
        selectedService={selectedService}
        onSelectService={(serviceName) => {
          setSelectedService(serviceName);
        }}
        categories={categoriesList}
      />

      {/* 4. Main Content Area */}
      <main id="listings" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 w-full flex-1 space-y-6 scroll-mt-4">
        {/* Filter Toolbar */}
        <ContractorFilterToolbar
          currentService={currentService}
          currentLocation={currentLocation}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          selectedService={selectedService}
          onSelectService={setSelectedService}
          dynamicServices={filterMeta?.services}
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

        {/* Dynamic Provider Cards List OR Coming Soon Banner */}
        <div className="space-y-4">
          {isComingSoon ? (
            /* COMING SOON CARD FOR UNLAUNCHED REGIONS / TRADES */
            <div className="bg-white rounded-3xl border border-gray-200/90 p-8 sm:p-12 text-center shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#EBF3F1] rounded-full blur-3xl -z-10 opacity-70" />
              <div className="max-w-xl mx-auto space-y-5">
                <div className="w-16 h-16 rounded-2xl bg-[#EBF3F1] text-[#0F3E35] flex items-center justify-center mx-auto shadow-2xs">
                  <Sparkles className="w-8 h-8" />
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Launching Soon</span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-black text-gray-950 tracking-tight">
                  {isUnlaunchedState
                    ? `${selectedState} Contractors are Coming Soon!`
                    : `${selectedCategory} in New York is Coming Soon!`}
                </h3>

                <p className="text-sm text-gray-600 leading-relaxed">
                  We are currently hand-vetting and verifying licensed contractors in{' '}
                  <strong className="text-gray-900 font-bold">New York City</strong> for{' '}
                  <strong className="text-[#0F3E35] font-bold">Custom Cabinets</strong> and{' '}
                  <strong className="text-[#0F3E35] font-bold">Roofing</strong>. Expanded coverage for {isUnlaunchedState ? selectedState : selectedCategory} is currently in progress.
                </p>

                {/* Quick Access to Live Trades in New York */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedState('New York');
                      setSelectedCategory('Custom Cabinets');
                      setSelectedService('All Services');
                      setSelectedBorough('All');
                    }}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-[#0F3E35] text-white hover:bg-[#0A2C25] transition-all cursor-pointer shadow-xs active:scale-95"
                  >
                    <span>View NYC Custom Cabinets (10 Pros)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedState('New York');
                      setSelectedCategory('Roofing');
                      setSelectedService('All Services');
                      setSelectedBorough('All');
                    }}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-white border border-gray-200 text-gray-800 hover:border-gray-300 hover:bg-gray-50 transition-all cursor-pointer shadow-2xs active:scale-95"
                  >
                    <span>View NYC Roofing (14 Pros)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Email Notification Subscription */}
                <div className="pt-6 border-t border-gray-100 max-w-md mx-auto">
                  <span className="text-xs font-semibold text-gray-700 block mb-2">
                    Get notified when {isUnlaunchedState ? selectedState : selectedCategory} goes live:
                  </span>
                  {notifySuccess ? (
                    <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Thank you! We will notify you when we launch here.</span>
                    </div>
                  ) : (
                    <form onSubmit={handleNotifySubmit} className="flex gap-2">
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
                        className="px-4 py-2 bg-[#0F3E35] text-white rounded-xl text-xs font-bold hover:bg-[#0A2C25] transition-colors cursor-pointer"
                      >
                        Notify Me
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          ) : isLoading ? (
            /* Skeleton Loaders */
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-gray-200 p-6 animate-pulse space-y-4"
                >
                  <div className="flex flex-col md:flex-row gap-5">
                    <div className="w-full md:w-60 h-44 bg-gray-200 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-3">
                      <div className="h-6 bg-gray-200 rounded w-1/3" />
                      <div className="h-4 bg-gray-100 rounded w-1/2" />
                      <div className="h-4 bg-gray-100 rounded w-2/3" />
                      <div className="h-12 bg-gray-100 rounded w-full mt-4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            /* Error State */
            <div className="bg-red-50/60 rounded-2xl border border-red-200 p-10 text-center space-y-3">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-red-900">
                Error Connecting to Database API
              </h3>
              <p className="text-xs text-red-600 max-w-md mx-auto">
                {error}
              </p>
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
            /* Empty State */
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center space-y-3">
              <h3 className="text-base font-bold text-gray-900">
                No contractor companies found for this filter
              </h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Try resetting your filters or selecting a different service to see all verified professionals in New York.
              </p>
              <div className="pt-2">
                <EButton
                  onClick={handleResetFilters}
                  variant="primary"
                  size="md"
                >
                  Reset All Filters
                </EButton>
              </div>
            </div>
          ) : (
            /* Live Verified Providers Cards */
            filteredProviders.map((roofer, index) => (
              <ProviderCard
                key={roofer.id}
                provider={roofer}
                rank={index + 1}
                isCompared={comparedIds.includes(roofer.id)}
                onToggleCompare={handleToggleCompare}
                onOpenQuoteModal={handleOpenQuote}
                onOpenCostGuide={() => setCostGuideOpen(true)}
              />
            ))
          )}
        </div>

        {/* 5. Evaluation & Cost Guide (Dynamically adapts to Custom Cabinets or Roofing in NY) */}
        {!isComingSoon && (
          <EvaluationAndCostSection
            currentService={currentService}
            currentLocation={currentLocation}
            onOpenCostGuide={() => setCostGuideOpen(true)}
          />
        )}
      </main>

      {/* 6. Universal Footer */}
      <Footer />

      {/* 7. Floating Compare Drawer */}
      <CompareDrawer
        comparedProviders={comparedProviders}
        onRemove={handleToggleCompare}
        onClear={() => setComparedIds([])}
        onOpenCompareModal={() => setCompareModalOpen(true)}
      />

      {/* 8. Compare Side-by-Side Modal */}
      <CompareModal
        isOpen={compareModalOpen}
        onClose={() => setCompareModalOpen(false)}
        providers={comparedProviders}
        onSelectForQuote={(p) => {
          setCompareModalOpen(false);
          handleOpenQuote(p);
        }}
      />

      {/* 9. Cost Guide Modal */}
      <CostGuideModal
        isOpen={costGuideOpen}
        onClose={() => setCostGuideOpen(false)}
      />

      {/* 10. Universal Quote Modal */}
      <QuoteModal
        isOpen={quoteModalOpen}
        onClose={handleCloseQuote}
        selectedProvider={selectedRooferForQuote}
      />
    </div>
  );
}

export default function ContractorsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center text-sm font-bold text-gray-500">Loading directory...</div>}>
      <ContractorsDirectoryContent />
    </Suspense>
  );
}
