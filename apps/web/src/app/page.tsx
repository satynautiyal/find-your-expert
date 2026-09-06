'use client';

import { useState, useMemo } from 'react';
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
import { MOCK_NYC_ROOFERS } from '@/data/mockRoofers';
import { List, LayoutGrid, ChevronDown } from 'lucide-react';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBorough, setSelectedBorough] = useState('All');
  const [selectedService, setSelectedService] = useState('All Services');
  const [selectedSpace, setSelectedSpace] = useState('All');
  const [selectedPick, setSelectedPick] = useState('All Picks');
  const [sortBy, setSortBy] = useState<'rating' | 'reviews' | 'experience'>('rating');

  // Compare State
  const [comparedIds, setComparedIds] = useState<string[]>([]);
  const [compareModalOpen, setCompareModalOpen] = useState(false);

  // Cost Guide Modal State
  const [costGuideOpen, setCostGuideOpen] = useState(false);

  // Quote Modal State
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [selectedRooferForQuote, setSelectedRooferForQuote] = useState<RooferProvider | null>(null);

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

  // Filtered List
  const filteredRoofers = useMemo(() => {
    return MOCK_NYC_ROOFERS.filter((roofer) => {
      // Borough filter
      if (selectedBorough !== 'All' && roofer.borough !== selectedBorough) {
        return false;
      }
      // Service filter
      if (
        selectedService !== 'All Services' &&
        !roofer.services.includes(selectedService)
      ) {
        return false;
      }
      // Top Pick chip filter
      if (selectedPick !== 'All Picks' && roofer.topPickCategory !== selectedPick) {
        return false;
      }
      // Search query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchesName = roofer.name.toLowerCase().includes(q);
        const matchesAddress = roofer.address.toLowerCase().includes(q);
        const matchesBorough = roofer.borough.toLowerCase().includes(q);
        const matchesService = roofer.services.some((s) => s.toLowerCase().includes(q));
        if (!matchesName && !matchesAddress && !matchesBorough && !matchesService) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'rating') return b.compositeRating - a.compositeRating;
      if (sortBy === 'reviews') return b.totalReviews - a.totalReviews;
      if (sortBy === 'experience') return b.yearsInBusiness - a.yearsInBusiness;
      return 0;
    });
  }, [selectedBorough, selectedService, selectedPick, searchQuery, sortBy]);

  const comparedProviders = useMemo(() => {
    return MOCK_NYC_ROOFERS.filter((r) => comparedIds.includes(r.id));
  }, [comparedIds]);

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-950 flex flex-col font-sans selection:bg-[#F15A24] selection:text-white">
      {/* 1. Universal Header */}
      <Header
        onOpenQuoteModal={() => handleOpenQuote()}
        savedCount={comparedIds.length}
      />

      {/* 2. Hero Banner with search & location filters */}
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
        companiesCount={filteredRoofers.length}
      />

      {/* 3. Main Content Area */}
      <main id="listings" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-4 scroll-mt-4">
        {/* Results Counter & Sub-filters Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 py-1 text-xs">
          <div className="flex items-center gap-4">
            <span className="font-extrabold text-sm text-gray-950">
              {filteredRoofers.length} companies found
            </span>

            <div className="hidden sm:flex items-center gap-2">
              <EButton
                variant="outline"
                size="sm"
                iconRight={<ChevronDown className="w-3 h-3 text-gray-400" />}
              >
                Rating
              </EButton>
              <EButton
                variant="outline"
                size="sm"
                iconRight={<ChevronDown className="w-3 h-3 text-gray-400" />}
              >
                Budget
              </EButton>
              <EButton
                variant="outline"
                size="sm"
                iconRight={<ChevronDown className="w-3 h-3 text-gray-400" />}
              >
                Material
              </EButton>
              <EButton
                variant="outline"
                size="sm"
                iconRight={<ChevronDown className="w-3 h-3 text-gray-400" />}
              >
                Services
              </EButton>
            </div>
          </div>

          {/* View Switcher */}
          <div className="flex items-center gap-1.5">
            <button
              className="p-1.5 rounded-md border border-orange-300 text-[#F15A24] bg-orange-50/50 hover:bg-orange-50 transition-colors cursor-pointer"
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

        {/* Provider Cards List */}
        <div className="space-y-4">
          {filteredRoofers.length === 0 ? (
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
                  setSelectedPick('All Picks');
                  setSearchQuery('');
                }}
                variant="primary"
                size="md"
              >
                Reset All Filters
              </EButton>
            </div>
          ) : (
            filteredRoofers.map((roofer, index) => (
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

      {/* 5. Floating Compare Drawer (when contractors are checked) */}
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

      {/* 8. Universal "Get Quote / Contact" Modal */}
      <QuoteModal
        isOpen={quoteModalOpen}
        onClose={handleCloseQuote}
        selectedProvider={selectedRooferForQuote}
      />
    </div>
  );
}
