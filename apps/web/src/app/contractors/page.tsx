'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
  type ProviderFiltersResponse,
} from '@/lib/api';
import { List, LayoutGrid, RefreshCw, AlertCircle } from 'lucide-react';

function ContractorsDirectoryContent() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') || searchParams.get('q') || '';
  const initialService = searchParams.get('service') || 'All Services';
  const initialState = searchParams.get('state') || 'All';

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [selectedBorough, setSelectedBorough] = useState('All');
  const [selectedService, setSelectedService] = useState(initialService);
  const [selectedSpace, setSelectedSpace] = useState('All');
  const [sortBy, setSortBy] = useState<'rating' | 'reviews' | 'experience'>('rating');

  // Section 3 Sub-filters
  const [roofType, setRoofType] = useState('All');
  const [minRating, setMinRating] = useState(0);
  const [minExperience, setMinExperience] = useState(0);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [distance, setDistance] = useState('All Areas');

  // Dynamic Data State
  const [providers, setProviders] = useState<RooferProvider[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [filterMeta, setFilterMeta] = useState<ProviderFiltersResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Compare State
  const [comparedIds, setComparedIds] = useState<string[]>([]);
  const [compareModalOpen, setCompareModalOpen] = useState(false);

  // Cost Guide Modal State
  const [costGuideOpen, setCostGuideOpen] = useState(false);

  // Quote Modal State
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [selectedRooferForQuote, setSelectedRooferForQuote] = useState<RooferProvider | null>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    async function loadFilters() {
      try {
        const meta = await fetchProviderFilters();
        setFilterMeta(meta);
      } catch (err: any) {
        console.error('Failed to load dynamic filters:', err);
      }
    }
    loadFilters();
  }, []);

  const loadProviders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchProviders({
        search: debouncedSearch,
        borough: selectedBorough,
        service: selectedService,
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
  }, [debouncedSearch, selectedBorough, selectedService, sortBy]);

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
      : 'Roofing';

  const currentLocation =
    selectedBorough && selectedBorough !== 'All'
      ? `${selectedBorough}, AL`
      : 'Birmingham, AL';

  const hasActiveFilters =
    roofType !== 'All' ||
    minRating > 0 ||
    minExperience > 0 ||
    verifiedOnly ||
    distance !== 'All Areas' ||
    (selectedService !== 'All Services' && selectedService !== 'All');

  const handleResetFilters = () => {
    setRoofType('All');
    setMinRating(0);
    setMinExperience(0);
    setVerifiedOnly(false);
    setDistance('All Areas');
    setSelectedService('All Services');
    setSelectedBorough('All');
    setSearchQuery('');
  };

  const filteredProviders = useMemo(() => {
    return providers.filter((p) => {
      if (minRating > 0 && (p.compositeRating || 0) < minRating) return false;
      if (minExperience > 0 && (p.yearsInBusiness || 0) < minExperience) return false;
      if (verifiedOnly && !p.isLicensed && !p.badge) return false;
      if (
        roofType !== 'All' &&
        !p.services?.some((s) => s.toLowerCase().includes(roofType.toLowerCase()))
      ) {
        return false;
      }
      return true;
    });
  }, [providers, minRating, minExperience, verifiedOnly, roofType]);

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-950 flex flex-col font-sans selection:bg-primary selection:text-white">
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
        selectedService={selectedService}
        onSelectService={setSelectedService}
        selectedSpace={selectedSpace}
        onSelectSpace={setSelectedSpace}
        onSearchSubmit={handleScrollToListings}
        companiesCount={totalCount}
        dynamicBoroughs={filterMeta?.boroughs}
        dynamicServices={filterMeta?.services}
        stats={filterMeta?.stats}
      />

      {/* Section 2: What roofing service do you need? */}
      <ServiceCategoriesSection
        selectedService={selectedService}
        onSelectService={(serviceName) => {
          setSelectedService(serviceName);
        }}
      />

      {/* 3. Main Content Area */}
      <main id="listings" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 w-full flex-1 space-y-6 scroll-mt-4">
        {/* Section 3: Title + Filters Toolbar */}
        <ContractorFilterToolbar
          currentService={currentService}
          currentLocation={currentLocation}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          selectedService={selectedService}
          onSelectService={setSelectedService}
          dynamicServices={filterMeta?.services}
          roofType={roofType}
          onRoofTypeChange={setRoofType}
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

        {/* Dynamic Provider Cards List */}
        <div className="space-y-4">
          {isLoading ? (
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
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center space-y-3">
              <h3 className="text-base font-bold text-gray-900">
                No contractor companies found for this selection
              </h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Try resetting your filters or selecting a different service to see all verified contractors.
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

        {/* Section 4: How We Evaluate Roofing Companies & Cost Guide */}
        <EvaluationAndCostSection
          currentService={currentService}
          currentLocation={currentLocation}
          onOpenCostGuide={() => setCostGuideOpen(true)}
        />
      </main>

      {/* 4. Universal Footer */}
      <Footer />

      {/* 5. Floating Compare Drawer */}
      <CompareDrawer
        comparedProviders={comparedProviders}
        onRemove={handleToggleCompare}
        onClear={() => setComparedIds([])}
        onOpenCompareModal={() => setCompareModalOpen(true)}
      />

      {/* 6. Compare Side-by-Side Modal */}
      <CompareModal
        isOpen={compareModalOpen}
        onClose={() => setCompareModalOpen(false)}
        providers={comparedProviders}
        onSelectForQuote={(p) => {
          setCompareModalOpen(false);
          handleOpenQuote(p);
        }}
      />

      {/* 7. Cost Guide Modal */}
      <CostGuideModal
        isOpen={costGuideOpen}
        onClose={() => setCostGuideOpen(false)}
      />

      {/* 8. Universal Quote Modal */}
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
