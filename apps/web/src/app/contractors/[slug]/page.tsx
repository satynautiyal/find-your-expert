'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header, Footer, QuoteModal, CostGuideModal } from '@/components/common';
import type { RooferProvider } from '@/data/mockRoofers';
import { MOCK_NYC_ROOFERS } from '@/data/mockRoofers';
import { fetchProviderBySlug, type ScrapedReviewItemDto } from '@/lib/api';
import {
  ProfileHero,
  ProfileNavTabs,
  ProfileAboutAndLocation,
  ProfileServicesAndReviews,
  ProfileGalleryAndProjects,
  ProfileServiceAreasAndFaq,
  ProfileBottomCta,
} from '@/components/contractor-profile';
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';

export default function ContractorProfilePage() {
  const params = useParams();
  const router = useRouter();
  const rawSlug = params?.slug;
  const slug = typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '';

  const [provider, setProvider] = useState<RooferProvider | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scrapedReviews, setScrapedReviews] = useState<ScrapedReviewItemDto[]>([]);

  // Navigation & Modals
  const [activeTab, setActiveTab] = useState('overview');
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [costGuideOpen, setCostGuideOpen] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setIsLoading(true);
    setError(null);

    // Check mock roofers first as instant cache/fallback
    const localMock = MOCK_NYC_ROOFERS.find((r: RooferProvider) => r.slug === slug);
    if (localMock) {
      setProvider(localMock);
    }

    fetchProviderBySlug(slug)
      .then((data) => {
        setProvider(data);
        if (data.scrapedReviews && data.scrapedReviews.length > 0) {
          setScrapedReviews(data.scrapedReviews as ScrapedReviewItemDto[]);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch provider profile:', err);
        // If we don't have localMock, set error
        if (!localMock) {
          setError(err.message || 'Contractor profile not found.');
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [slug]);

  const scrollToReviews = () => {
    setActiveTab('reviews');
    if (typeof window !== 'undefined') {
      const el = document.getElementById('reviews');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  // Loading State Skeleton
  if (isLoading && !provider) {
    return (
      <div className="min-h-screen bg-[#FBFBFB] flex flex-col justify-between">
        <Header onOpenQuoteModal={() => setQuoteModalOpen(true)} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex-1 flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-gray-500">
            Loading contractor profile...
          </p>
        </div>
        <Footer />
      </div>
    );
  }

  // Error / Not Found State
  if (error && !provider) {
    return (
      <div className="min-h-screen bg-[#FBFBFB] flex flex-col justify-between">
        <Header onOpenQuoteModal={() => setQuoteModalOpen(true)} />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4 flex-1">
          <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto border border-rose-100">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-gray-950">Contractor Not Found</h1>
          <p className="text-sm text-gray-600 max-w-md mx-auto">
            We couldn't locate a verified contractor matching "{slug}". They may have updated their profile or moved locations.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link
              href="/contractors"
              className="bg-primary hover:bg-primary-dark text-white font-bold text-xs sm:text-sm px-6 py-2.5 rounded-xl shadow-sm transition-all"
            >
              Browse All Contractors
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!provider) return null;

  return (
    <div className="min-h-screen bg-[#FBFBFB] flex flex-col justify-between selection:bg-primary selection:text-white">
      {/* Global Header */}
      <Header onOpenQuoteModal={() => setQuoteModalOpen(true)} />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {/* Hero Section Container */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-6">
          <ProfileHero
            provider={provider}
            onOpenQuoteModal={() => setQuoteModalOpen(true)}
            onScrollToReviews={scrollToReviews}
          />
        </div>

        {/* Sticky Sub-Navigation Tabs */}
        <ProfileNavTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          reviewCount={provider.totalReviews || 126}
          projectCount={provider.photoCount || 28}
        />

        {/* Section Blocks Container */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Section 1: About & Location */}
          <ProfileAboutAndLocation provider={provider} />

          {/* Section 2: Services Offered & Customer Reviews */}
          <ProfileServicesAndReviews
            provider={provider}
            onOpenQuoteModal={() => setQuoteModalOpen(true)}
            scrapedReviews={scrapedReviews}
          />

          {/* Section 3: Photo Gallery & Recent Projects */}
          <ProfileGalleryAndProjects provider={provider} />

          {/* Section 4: Service Areas & FAQs */}
          <ProfileServiceAreasAndFaq provider={provider} />

          {/* Section 5: Bottom CTA Banner */}
          <ProfileBottomCta
            provider={provider}
            onOpenQuoteModal={() => setQuoteModalOpen(true)}
          />
        </div>
      </main>

      {/* Global Footer */}
      <Footer />

      {/* Free Quote Request Modal */}
      <QuoteModal
        isOpen={quoteModalOpen}
        onClose={() => setQuoteModalOpen(false)}
        selectedProvider={provider}
      />

      {/* Cost Guide Modal */}
      <CostGuideModal
        isOpen={costGuideOpen}
        onClose={() => setCostGuideOpen(false)}
      />
    </div>
  );
}
