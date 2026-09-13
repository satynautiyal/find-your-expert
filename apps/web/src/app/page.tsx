'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
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
import ProviderCard from '@/components/ProviderCard';
import type { RooferProvider } from '@/data/mockRoofers';
import {
  fetchProviders,
  fetchProviderFilters,
  type ProviderFiltersResponse,
} from '@/lib/api';
import { List, LayoutGrid, ChevronDown, RefreshCw, AlertCircle } from 'lucide-react';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedBorough, setSelectedBorough] = useState('All');
  const [selectedService, setSelectedService] = useState('All Services');
  const [selectedSpace, setSelectedSpace] = useState('All');
  const [sortBy, setSortBy] = useState<'rating' | 'reviews' | 'experience'>('rating');

  // Dynamic Data State (100% Live Database)
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

  // 1. Debounce search query input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // 2. Load dynamic filters and stats once on mount
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

  // 3. Fetch real providers whenever filters change
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

  // Toggle Compare
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

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-950 flex flex-col font-sans selection:bg-primary selection:text-white">
      {/* 1. Universal Header */}
      <Header
        onOpenQuoteModal={() => handleOpenQuote()}
        savedCount={comparedIds.length}
      />

      {/* 2. Dynamic Hero Banner with real database numbers */}
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

      {/* 3. Main Content Area */}
      <main id="listings" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-4 scroll-mt-4">
        {/* Results Counter & Sub-filters Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 py-1 text-xs">
          <div className="flex items-center gap-4">
            <span className="font-extrabold text-sm text-gray-950">
              {isLoading ? 'Searching verified contractors...' : `${totalCount} companies found`}
            </span>

            {/* Live Database Sorting */}
            <div className="hidden sm:flex items-center gap-2">
              <EButton
                variant={sortBy === 'rating' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSortBy('rating')}
              >
                Top Rated
              </EButton>
              <EButton
                variant={sortBy === 'reviews' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSortBy('reviews')}
              >
                Most Reviews
              </EButton>
              <EButton
                variant={sortBy === 'experience' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSortBy('experience')}
              >
                Years in Business
              </EButton>
            </div>
          </div>

          {/* View Switcher */}
          <div className="flex items-center gap-1.5">
            <button
              className="p-1.5 rounded-md border border-primary text-primary-dark bg-primary-light hover:bg-primary-subtle transition-colors cursor-pointer"
              title="List View"
            >
              <List className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
            <button
              className="p-1.5 rounded-md border border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-colors cursor-pointer"
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Dynamic Provider Cards List */}
        <div className="space-y-4">
          {/* Loading Skeletons */}
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
            /* Error State with live Retry button */
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
          ) : providers.length === 0 ? (
            /* Zero Matching Records State */
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center space-y-3">
              <h3 className="text-base font-bold text-gray-900">
                No roofing companies found for this selection
              </h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Try resetting your filters or selecting "All Boroughs" to see all verified contractors in New York.
              </p>
              <EButton
                onClick={() => {
                  setSelectedBorough('All');
                  setSelectedService('All Services');
                  setSearchQuery('');
                  setSortBy('rating');
                }}
                variant="primary"
                size="md"
              >
                Reset All Filters
              </EButton>
            </div>
          ) : (
            /* Real Database Providers */
            providers.map((roofer, index) => (
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

      {/* 7. NYC Roofing Cost Guide Modal */}
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
