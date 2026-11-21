'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Header, Footer, QuoteModal, CostGuideModal } from '@/components/common';
import type { RooferProvider } from '@/data/mockRoofers';
import {
  fetchProviderBySlug,
  fetchProviderReviews,
  type ScrapedReviewItemDto,
} from '@/lib/api';
import {
  ProfileHero,
  ProfileNavTabs,
  ProfileAboutAndLocation,
  ProfileServicesAndReviews,
  ProfileGalleryAndProjects,
  ProfileServiceAreasAndFaq,
  ProfileBottomCta,
  ReviewsModal,
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
  const [reviewsModalOpen, setReviewsModalOpen] = useState(false);
  const [reviewsModalPlatform, setReviewsModalPlatform] = useState<string>('ALL');
  const [reviewsModalSearch, setReviewsModalSearch] = useState<string>('');

  const handleOpenReviewsModal = (initialPlatform?: string, initialSearch?: string) => {
    setReviewsModalPlatform(initialPlatform || 'ALL');
    setReviewsModalSearch(initialSearch || '');
    setReviewsModalOpen(true);
  };

  useEffect(() => {
    if (!slug) return;
    setIsLoading(true);
    setError(null);

    fetchProviderBySlug(slug)
      .then((data) => {
        setProvider(data);
        setScrapedReviews((data.scrapedReviews || []) as ScrapedReviewItemDto[]);
        // Silently warm Page 1 (10 reviews) in background so opening ReviewsModal is 0ms instant
        setTimeout(() => {
          fetchProviderReviews(slug, {
            page: 1,
            limit: 10,
            platform: 'ALL',
            sortBy: 'RELEVANT',
          }).catch(() => {});
        }, 250);
      })
      .catch((err) => {
        console.error('Failed to fetch provider profile:', err);
        setError(err.message || 'Contractor profile not found.');
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

  // Layout-Matched Shimmer Skeleton (Zero layout jump / 0 CLS when data arrives)
  if (isLoading && !provider) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex flex-col justify-between">
        <Header onOpenQuoteModal={() => setQuoteModalOpen(true)} />
        <main className="flex-1 pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-6 space-y-3.5">
            {/* Breadcrumbs Bar Skeleton */}
            <div className="flex items-center justify-between gap-3 py-1">
              <div className="h-4 w-64 rounded-md skeleton-shimmer" />
              <div className="flex items-center gap-2">
                <div className="h-7 w-20 rounded-lg skeleton-shimmer" />
                <div className="h-7 w-16 rounded-lg skeleton-shimmer" />
              </div>
            </div>

            {/* Unified Architectural Hero Skeleton */}
            <div className="bg-white border border-gray-200/90 rounded-2xl p-4 sm:p-6 shadow-sm">
              <div className="flex flex-col lg:flex-row gap-6 items-stretch">
                <div className="w-full lg:w-[440px] xl:w-[520px] shrink-0 space-y-2.5">
                  <div className="w-full h-[228px] sm:h-[320px] lg:h-[304px] xl:h-[348px] rounded-2xl skeleton-shimmer" />
                  <div className="grid grid-cols-5 gap-2 h-[54px] sm:h-[64px]">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <div key={n} className="rounded-xl skeleton-shimmer" />
                    ))}
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3.5">
                      <div className="w-16 h-16 rounded-2xl skeleton-shimmer shrink-0" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 w-44 rounded-full skeleton-shimmer" />
                        <div className="h-8 w-3/4 rounded-lg skeleton-shimmer" />
                      </div>
                    </div>
                    <div className="h-10 w-full rounded-xl skeleton-shimmer" />
                  </div>
                  <div className="h-36 w-full rounded-2xl skeleton-shimmer" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="h-12 rounded-xl skeleton-shimmer" />
                    <div className="h-12 rounded-xl skeleton-shimmer" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Nav Skeleton */}
          <div className="bg-white border-y border-gray-200 py-3.5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-6">
              {[1, 2, 3, 4, 5].map((t) => (
                <div key={t} className="h-4 w-20 rounded skeleton-shimmer" />
              ))}
            </div>
          </div>

          {/* Overview + Map Grid Skeleton */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 h-72 bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
              <div className="h-6 w-48 rounded skeleton-shimmer" />
              <div className="space-y-2.5">
                <div className="h-3.5 w-full rounded skeleton-shimmer" />
                <div className="h-3.5 w-11/12 rounded skeleton-shimmer" />
                <div className="h-3.5 w-4/5 rounded skeleton-shimmer" />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-4">
                <div className="h-14 rounded-xl skeleton-shimmer" />
                <div className="h-14 rounded-xl skeleton-shimmer" />
              </div>
            </div>
            <div className="lg:col-span-5 h-72 bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
              <div className="h-6 w-40 rounded skeleton-shimmer" />
              <div className="h-44 w-full rounded-xl skeleton-shimmer" />
            </div>
          </div>
        </main>
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
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col justify-between selection:bg-primary selection:text-white">
      {/* Global Header */}
      <Header onOpenQuoteModal={() => setQuoteModalOpen(true)} />

      {/* Main Content Area */}
      <motion.main
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className="flex-1 pb-16"
      >
        {/* Hero Section Container */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-6">
          <ProfileHero
            provider={provider}
            onOpenQuoteModal={() => setQuoteModalOpen(true)}
            onScrollToReviews={scrollToReviews}
            onOpenReviewsModal={handleOpenReviewsModal}
          />
        </div>

        {/* Sticky Sub-Navigation Tabs */}
        <ProfileNavTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          reviewCount={provider.totalReviews || 0}
          teamCount={provider.teamMembers?.length || provider.teamCount || 0}
          projectCount={
            (provider.projects && provider.projects.length > 0
              ? provider.projects.length
              : (provider.photos || []).filter(
                  (p) => Boolean(p?.url) && p.url !== provider.imageUrl
                ).length) || 0
          }
        />

        {/* Section Blocks Container */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Section 1: About & Location */}
          <ProfileAboutAndLocation provider={provider} />

          {/* Section 2: Services Offered & Customer Reviews */}
          <ProfileServicesAndReviews
            provider={provider}
            onOpenQuoteModal={() => setQuoteModalOpen(true)}
            onOpenReviewsModal={handleOpenReviewsModal}
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
      </motion.main>

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

      {/* Verified Customer Reviews Modal */}
      <ReviewsModal
        isOpen={reviewsModalOpen}
        onClose={() => setReviewsModalOpen(false)}
        provider={provider}
        scrapedReviews={scrapedReviews}
        initialPlatform={reviewsModalPlatform}
        initialSearch={reviewsModalSearch}
      />
    </div>
  );
}
