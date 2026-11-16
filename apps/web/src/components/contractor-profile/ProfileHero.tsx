'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Star,
  CheckCircle2,
  Calendar,
  Award,
  FileText,
  Phone,
  Heart,
  Share2,
  ArrowUpRight,
  MapPin,
  ChevronRight,
  Clock,
  Check,
} from 'lucide-react';
import type { RooferProvider } from '@/data/mockRoofers';
import { GoogleLogo, YelpLogo, HomeAdvisorLogo, HouzzLogo } from './PlatformLogos';
import PhotoLightboxModal from './PhotoLightboxModal';
import ProfilePhotoCarousel from './ProfilePhotoCarousel';

interface ProfileHeroProps {
  provider: RooferProvider;
  onOpenQuoteModal: () => void;
  onScrollToReviews?: () => void;
  onOpenReviewsModal?: (initialPlatform?: string) => void;
}

export default function ProfileHero({
  provider,
  onOpenQuoteModal,
  onScrollToReviews,
  onOpenReviewsModal,
}: ProfileHeroProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  // Dynamic Location & Category parsing for breadcrumbs & eyebrow
  const trade =
    provider.category ||
    (provider.services?.find((s) => /Roof/i.test(s))
      ? 'Roofing'
      : provider.services?.find((s) => /Cabinet|Millwork/i.test(s))
      ? 'Custom Cabinets'
      : provider.services?.[0] || 'Contractors');

  const boroughOrCity =
    provider.borough && provider.borough !== 'All'
      ? provider.borough
      : provider.city || 'Manhattan';
  const stateName = provider.state === 'NY' || !provider.state ? 'New York' : provider.state;
  const stateShort = provider.state || 'NY';

  // Real R2 brand logo & R2 project photos from DB
  const businessLogo =
    provider.imageUrl && !provider.imageUrl.includes('placeholder') && !logoFailed
      ? provider.imageUrl
      : '';

  const dbPhotoUrls = (provider.photos || [])
    .map((p) => p.url)
    .filter((url) => Boolean(url) && url !== provider.imageUrl);

  const hasProjectPhotos = dbPhotoUrls.length > 0;
  const galleryPhotos = hasProjectPhotos ? dbPhotoUrls : businessLogo ? [businessLogo] : [];

  const formattedReviewsUpdated = (() => {
    if (!provider.reviewsLastUpdatedAt) return null;
    const parsed = new Date(provider.reviewsLastUpdatedAt);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  })();

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleSaveToggle = () => {
    setIsSaved((prev) => !prev);
  };

  const openLightbox = (index: number) => {
    setActivePhotoIndex(index);
    setLightboxOpen(true);
  };

  const establishedYear =
    provider.sinceYear && provider.sinceYear > 0
      ? provider.sinceYear
      : provider.yearsInBusiness > 0
      ? new Date().getFullYear() - provider.yearsInBusiness
      : 0;

  // Dynamic Vetted Score (88 - 99 range based on rating & credentials)
  const trustScore = Math.min(
    99,
    Math.max(
      88,
      Math.round(
        (provider.compositeRating || 4.8) * 18 +
          (provider.isLicensed ? 3 : 0) +
          (provider.isInsured ? 3 : 0)
      )
    )
  );

  const compositeRating = provider.compositeRating || 0;

  // Normalized active platform ratings list
  const platformRows = [
    (provider.reviews.google?.count ?? 0) > 0
      ? {
          key: 'GOOGLE',
          label: 'Google',
          rating: provider.reviews.google.rating,
          count: provider.reviews.google.count,
          Logo: GoogleLogo,
        }
      : null,
    (provider.reviews.yelp?.count ?? 0) > 0
      ? {
          key: 'YELP',
          label: 'Yelp',
          rating: provider.reviews.yelp.rating,
          count: provider.reviews.yelp.count,
          Logo: YelpLogo,
        }
      : null,
    (provider.reviews.homeadvisor?.count ?? 0) > 0 && provider.reviews.homeadvisor
      ? {
          key: 'HOMEADVISOR',
          label: 'HomeAdvisor',
          rating: provider.reviews.homeadvisor.rating,
          count: provider.reviews.homeadvisor.count,
          Logo: HomeAdvisorLogo,
        }
      : null,
    ((provider.reviews.houzz?.count || provider.reviews.facebook?.count) ?? 0) > 0
      ? {
          key: 'HOUZZ',
          label: 'Houzz',
          rating: provider.reviews.houzz?.rating || provider.reviews.facebook?.rating || 0,
          count: provider.reviews.houzz?.count || provider.reviews.facebook?.count || 0,
          Logo: HouzzLogo,
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

  const websiteHref = provider.website
    ? /^https?:\/\//i.test(provider.website)
      ? provider.website
      : `https://${provider.website}`
    : '';

  return (
    <>
      <div className="space-y-3.5">
        {/* =============================================================== */}
        {/* 1. INDUSTRY-STANDARD TOP BAR: BREADCRUMBS + UTILITY ACTIONS     */}
        {/* =============================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-0.5">
          <nav
            aria-label="Breadcrumbs"
            className="flex items-center flex-wrap gap-1.5 text-xs text-gray-500 font-medium min-w-0"
          >
            <Link href="/" className="hover:text-primary transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />

            <Link
              href={`/contractors?category=${encodeURIComponent(trade)}`}
              className="hover:text-primary transition-colors"
            >
              {trade}
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />

            <Link
              href={`/contractors?state=${encodeURIComponent(stateName)}`}
              className="hover:text-primary transition-colors"
            >
              {stateName}
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />

            <Link
              href={`/contractors?borough=${encodeURIComponent(boroughOrCity)}`}
              className="hover:text-primary transition-colors"
            >
              {boroughOrCity}
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />

            <span className="font-bold text-gray-900 truncate max-w-[200px] sm:max-w-[280px]">
              {provider.name}
            </span>
          </nav>

          {/* Right Utility Action Group (Website, Share, Save) */}
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            {websiteHref && (
              <a
                href={websiteHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200/90 bg-white hover:bg-gray-50 hover:border-gray-300 text-xs font-semibold text-gray-700 hover:text-gray-950 shadow-2xs transition-all"
              >
                <span>Website</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-gray-500" />
              </a>
            )}

            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200/90 bg-white hover:bg-gray-50 hover:border-gray-300 text-xs font-semibold text-gray-700 hover:text-gray-950 shadow-2xs transition-all cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-gray-500" />
                  <span>Share</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleSaveToggle}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold shadow-2xs transition-all cursor-pointer ${
                isSaved
                  ? 'bg-rose-50 border-rose-200 text-rose-600'
                  : 'bg-white hover:bg-gray-50 border-gray-200/90 hover:border-gray-300 text-gray-700 hover:text-gray-950'
              }`}
            >
              <Heart
                className={`w-3.5 h-3.5 ${
                  isSaved ? 'fill-rose-500 text-rose-500' : 'text-[#DA5F2F]'
                }`}
              />
              <span>{isSaved ? 'Saved' : 'Save'}</span>
            </button>
          </div>
        </div>

        {/* =============================================================== */}
        {/* 2. UNIFIED ARCHITECTURAL HERO CARD (Locked Media + Executive Info) */}
        {/* =============================================================== */}
        <div className="bg-white border border-gray-200/90 rounded-2xl p-4 sm:p-6 shadow-[0_8px_28px_-6px_rgba(15,23,42,0.08),0_2px_8px_-2px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col lg:flex-row gap-5 sm:gap-6 xl:gap-7 items-stretch">
            {/* LEFT ZONE: STRICT FIXED-DIMENSION MEDIA SHOWCASE */}
            <ProfilePhotoCarousel
              photos={dbPhotoUrls}
              businessLogo={businessLogo}
              fallbackInitial={provider.logoText || provider.name.charAt(0)}
              providerName={provider.name}
              tradeLabel={trade}
              onOpenLightbox={openLightbox}
            />

            {/* RIGHT ZONE: EXECUTIVE CONTRACTOR IDENTITY, TRUST AUDIT & CTAS */}
            <div className="flex-1 min-w-0 flex flex-col justify-between gap-4">
              {/* Top Block: Logo Plaque + Full-Width Business Title + Metadata */}
              <div className="space-y-3">
                <div className="flex items-start gap-3.5 sm:gap-4">
                  {hasProjectPhotos && businessLogo ? (
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white border border-gray-200/90 shadow-2xs p-2 flex items-center justify-center shrink-0">
                      <img
                        src={businessLogo}
                        alt={`${provider.name} logo`}
                        onError={() => setLogoFailed(true)}
                        className="max-w-full max-h-full w-auto h-auto object-contain"
                      />
                    </div>
                  ) : null}

                  <div className="min-w-0 flex-1 space-y-1.5">
                    {/* Eyebrow Credential Pills */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200/80">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Verified Professional</span>
                      </span>

                      {establishedYear > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-gray-700 text-[11px] font-semibold border border-gray-200/90">
                          <Calendar className="w-3 h-3 text-gray-500 shrink-0" />
                          <span>Since {establishedYear}</span>
                        </span>
                      )}

                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-gray-100/80 text-gray-600 text-[11px] font-semibold border border-gray-200/70">
                        {trade}
                      </span>
                    </div>

                    {/* Full-Width Uncluttered Contractor Title */}
                    <h1 className="text-2xl sm:text-[26px] xl:text-[28px] font-black text-gray-950 tracking-tight leading-tight">
                      {provider.name}
                    </h1>
                  </div>
                </div>

                {/* Rating + Location + Service Highlights Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 py-2.5 border-y border-gray-100">
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <div className="flex items-center gap-1.5">
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
                      <span className="font-black text-sm text-gray-950">
                        {compositeRating.toFixed(1)}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onOpenReviewsModal
                            ? onOpenReviewsModal('ALL')
                            : onScrollToReviews?.()
                        }
                        className="text-xs font-semibold text-gray-600 hover:text-primary hover:underline transition-colors cursor-pointer"
                      >
                        ({provider.totalReviews || 0} verified reviews)
                      </button>
                    </div>

                    <span className="text-gray-300 hidden sm:inline">•</span>

                    <div className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>
                        {boroughOrCity}, {stateShort}
                      </span>
                    </div>
                  </div>

                  {/* Subtle Service Assurance Chips */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50/70 border border-amber-200/60 text-[11px] font-semibold text-gray-800">
                      <Award className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Warranty Available</span>
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50/70 border border-blue-200/60 text-[11px] font-semibold text-gray-800">
                      <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>Free Estimates</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Middle Block: Unified 2-Column Vetted Audit & Multi-Platform Ratings Panel */}
              <div className="rounded-2xl border border-gray-200/90 bg-[#F8FAFC] grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-200/80 overflow-hidden">
                {/* Left Half: Prosvetted Audit Score & 4-Point Checklist */}
                <div className="p-3.5 sm:p-4 flex flex-col justify-between gap-3">
                  <div className="flex items-center gap-3 pb-2.5 border-b border-gray-200/70">
                    <div className="px-3 py-1.5 rounded-xl bg-[#EBF7F2] border border-[#0B3B2C]/15 flex items-baseline gap-0.5 shrink-0">
                      <span className="text-2xl font-black text-[#0B3B2C] leading-none tracking-tight">
                        {trustScore}
                      </span>
                      <span className="text-[10px] font-bold text-[#0B3B2C]/65">
                        /100
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-[11px] font-extrabold text-[#0B3B2C] uppercase tracking-wider block leading-tight">
                        Vetted Score
                      </span>
                      <span className="text-[11px] text-gray-500 font-medium block mt-0.5">
                        Prosvetted Audit
                      </span>
                    </div>
                  </div>

                  {/* 4-Point Vetting Checklist */}
                  <div className="space-y-1.5 text-xs font-semibold">
                    <div className="flex items-center justify-between gap-2 text-gray-700">
                      <span>Business Confirmed</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    </div>
                    <div className="flex items-center justify-between gap-2 text-gray-400 select-none">
                      <span>License &amp; Insurance Checked</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                    </div>
                    <div className="flex items-center justify-between gap-2 text-gray-700">
                      <span>Reputation Analyzed</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    </div>
                    <div className="flex items-center justify-between gap-2 text-gray-700">
                      <span>Reviews Analyzed</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    </div>
                  </div>
                </div>

                {/* Right Half: Cross-Platform Customer Ratings */}
                <div className="p-3.5 sm:p-4 flex flex-col justify-between gap-2.5">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-gray-200/70">
                      <h3 className="font-bold text-xs sm:text-[13px] text-gray-900 leading-tight">
                        Customer Ratings
                      </h3>
                      {formattedReviewsUpdated && (
                        <span className="text-[10.5px] text-gray-400 font-medium inline-flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3 text-gray-400 shrink-0" />
                          <span>{formattedReviewsUpdated}</span>
                        </span>
                      )}
                    </div>

                    {platformRows.length > 0 ? (
                      <div className="space-y-1 text-xs">
                        {platformRows.map((item) => {
                          const PlatformIcon = item.Logo;
                          return (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() =>
                                onOpenReviewsModal
                                  ? onOpenReviewsModal(item.key)
                                  : onScrollToReviews?.()
                              }
                              className="w-full flex items-center justify-between gap-2 px-1.5 py-1 -mx-1.5 rounded-lg hover:bg-white transition-colors cursor-pointer text-left"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <PlatformIcon className="w-4 h-4 shrink-0" />
                                <span className="font-semibold text-gray-700 hover:text-gray-950 truncate">
                                  {item.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <div className="flex items-center text-amber-500">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`w-3 h-3 ${
                                        i < Math.round(item.rating)
                                          ? 'fill-amber-400 text-amber-400'
                                          : 'fill-gray-200 text-gray-200'
                                      }`}
                                    />
                                  ))}
                                </div>
                                <span className="font-bold text-gray-900 tabular-nums">
                                  {item.rating.toFixed(1)}
                                </span>
                                <span className="text-gray-400 tabular-nums">
                                  ({item.count})
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 py-2">
                        Verified ratings aggregated across partner platforms.
                      </p>
                    )}
                  </div>

                  {/* See all reviews trigger */}
                  <button
                    type="button"
                    onClick={() =>
                      onOpenReviewsModal
                        ? onOpenReviewsModal('ALL')
                        : onScrollToReviews?.()
                    }
                    className="text-xs font-bold text-[#EA580C] hover:text-[#D94F0A] inline-flex items-center gap-0.5 pt-0.5 transition-colors cursor-pointer self-start"
                  >
                    <span>See all {provider.totalReviews || ''} reviews</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Bottom Block: Primary Conversion CTA Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
                <button
                  type="button"
                  onClick={onOpenQuoteModal}
                  className="h-11 sm:h-12 bg-[#EA580C] hover:bg-[#D94F0A] text-white font-bold text-sm px-6 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-[0.99] cursor-pointer inline-flex items-center justify-center whitespace-nowrap"
                >
                  Get a Free Quote
                </button>

                {provider.phone ? (
                  <a
                    href={`tel:${provider.phone.replace(/\D/g, '')}`}
                    className="h-11 sm:h-12 bg-white hover:bg-slate-50 text-gray-900 border border-gray-300 hover:border-gray-400 font-bold text-sm px-5 rounded-xl shadow-2xs transition-all inline-flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <Phone className="w-4 h-4 text-[#0B3B2C] shrink-0" />
                    <span>Call {provider.displayPhone || provider.phone}</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={onScrollToReviews}
                    className="h-11 sm:h-12 bg-white hover:bg-slate-50 text-gray-900 border border-gray-300 font-bold text-sm px-5 rounded-xl shadow-2xs transition-colors inline-flex items-center justify-center whitespace-nowrap cursor-pointer"
                  >
                    Read Customer Reviews
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Photo Viewer Modal */}
      <PhotoLightboxModal
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        photos={galleryPhotos}
        initialIndex={activePhotoIndex}
        providerName={provider.name}
      />
    </>
  );
}
