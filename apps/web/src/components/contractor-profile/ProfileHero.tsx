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
  Globe,
  MapPin,
  ChevronRight,
  Clock,
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
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  // Dynamic Location & Category parsing for breadcrumbs & subtitle
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

  // Real project photos from DB (provider.photos) — never fall back to static placeholder images
  const businessLogo =
    provider.imageUrl && !provider.imageUrl.includes('placeholder')
      ? provider.imageUrl
      : '';

  const dbPhotoUrls = (provider.photos || [])
    .map((p) => p.url)
    .filter((url) => Boolean(url) && url !== businessLogo);

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
    setIsSaved(!isSaved);
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

  return (
    <>
      <div className="space-y-4">
        {/* Dynamic Breadcrumbs */}
        <nav
          aria-label="Breadcrumbs"
          className="flex items-center flex-wrap gap-1.5 text-xs text-gray-500 font-medium py-1.5"
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

          <span className="font-bold text-gray-900 truncate max-w-[200px] sm:max-w-none">
            {provider.name}
          </span>
        </nav>

        {/* Balanced 2-Zone Desktop Hero Layout (5 Cols Media + 7 Cols Structured Profile Card) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* ========================================================= */}
          {/* LEFT ZONE: PHOTO CAROUSEL OR LOGO (col-span-12 lg:col-span-5) */}
          {/* ========================================================= */}
          <div className="lg:col-span-5 flex flex-col">
            <ProfilePhotoCarousel
              photos={dbPhotoUrls}
              businessLogo={businessLogo}
              fallbackInitial={provider.logoText || provider.name.charAt(0)}
              providerName={provider.name}
              onOpenLightbox={openLightbox}
            />
          </div>

          {/* ========================================================= */}
          {/* RIGHT ZONE: UNIFIED PROFILE HEADER, TRUST BENTO & CTAS (lg:col-span-7) */}
          {/* ========================================================= */}
          <div className="lg:col-span-7 bg-white border border-gray-200/90 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between gap-4">
            {/* 1. Top Identity Header + Utility Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3.5">
              {/* Left: Inline Company Logo + Title + Trust Pills */}
              <div className="flex items-start gap-3.5 sm:gap-4 min-w-0">
                {hasProjectPhotos && businessLogo ? (
                  <div className="w-16 h-16 sm:w-[68px] sm:h-[68px] rounded-2xl bg-white border border-gray-200 shadow-xs p-2 flex items-center justify-center shrink-0">
                    <img
                      src={businessLogo}
                      alt={`${provider.name} logo`}
                      className="max-w-full max-h-full w-auto h-auto object-contain"
                    />
                  </div>
                ) : null}

                <div className="min-w-0 space-y-2">
                  <h1 className="text-2xl sm:text-[28px] font-black text-gray-950 tracking-tight leading-tight">
                    {provider.name}
                  </h1>

                  {/* Since Year (Left) + Verified Professional (Right) + Location */}
                  <div className="flex flex-wrap items-center gap-2">
                    {establishedYear > 0 && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-gray-700 text-xs font-semibold border border-gray-200/90">
                        <Calendar className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                        <span>Since {establishedYear}</span>
                      </div>
                    )}

                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200/80">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Verified Professional</span>
                    </div>

                    <div className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 pl-0.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>
                        {boroughOrCity}, {stateShort}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Utility Action Pills (Save, Share, Website) */}
              <div className="flex items-center gap-1.5 shrink-0 self-start">
                <button
                  type="button"
                  onClick={handleSaveToggle}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                    isSaved
                      ? 'bg-rose-50 border-rose-200 text-rose-600'
                      : 'bg-gray-50/80 hover:bg-gray-100 border-gray-200 text-gray-700'
                  }`}
                >
                  <Heart
                    className={`w-3.5 h-3.5 ${
                      isSaved ? 'fill-rose-500 text-rose-500' : 'text-gray-500'
                    }`}
                  />
                  <span>{isSaved ? 'Saved' : 'Save'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50/80 hover:bg-gray-100 text-xs font-semibold text-gray-700 transition-colors cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-gray-500" />
                  <span>{copiedLink ? 'Copied!' : 'Share'}</span>
                </button>

                {provider.website && (
                  <a
                    href={provider.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50/80 hover:bg-gray-100 hover:text-primary text-xs font-semibold text-gray-700 transition-colors"
                  >
                    <Globe className="w-3.5 h-3.5 text-gray-500" />
                    <span>Website</span>
                  </a>
                )}
              </div>
            </div>

            {/* 2. Aggregate Rating + Warranty & Free Estimates Strip */}
            <div className="flex flex-wrap items-center justify-between gap-3 py-2.5 border-y border-gray-100">
              {/* Composite Star Rating */}
              <div className="flex items-center gap-2">
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
                  className="text-xs font-semibold text-gray-500 hover:text-primary hover:underline transition-colors cursor-pointer"
                >
                  ({provider.totalReviews || 0} verified reviews)
                </button>
              </div>

              {/* Service Highlights: Warranty Available & Free Estimates */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50/70 border border-amber-200/60 text-xs font-semibold text-gray-800">
                  <Award className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Warranty Available</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50/70 border border-blue-200/60 text-xs font-semibold text-gray-800">
                  <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Free Estimates</span>
                </div>
              </div>
            </div>

            {/* 3. Symmetric 2-Column Trust & Ratings Bento Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-stretch">
              {/* Left Sub-Card: Vetted Score */}
              <div className="bg-[#F8FAFC] border border-gray-200/90 rounded-xl p-4 flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-gray-200/70">
                  <div>
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                      Vetted Score
                    </span>
                    <span className="text-[11px] text-gray-500 font-medium">
                      Prosvetted Audit
                    </span>
                  </div>
                  <div className="px-3.5 py-1.5 rounded-xl bg-[#EBF7F2] border border-[#0B3B2C]/15 flex items-center justify-center shrink-0">
                    <span className="text-2xl font-black text-[#0B3B2C] leading-none tracking-tight">
                      {trustScore}
                    </span>
                  </div>
                </div>

                {/* 4-Point Vetting Checklist (Tick placed after text) */}
                <div className="space-y-2 text-xs font-semibold">
                  <div className="flex items-center justify-between gap-2 text-gray-700">
                    <span>Business confirmed</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  </div>
                  <div className="flex items-center justify-between gap-2 text-gray-400 select-none">
                    <span>License and insurance</span>
                    <CheckCircle2 className="w-4 h-4 text-gray-300 shrink-0" />
                  </div>
                  <div className="flex items-center justify-between gap-2 text-gray-700">
                    <span>Reputation analyzed</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  </div>
                  <div className="flex items-center justify-between gap-2 text-gray-700">
                    <span>Reviews analyzed</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  </div>
                </div>
              </div>

              {/* Right Sub-Card: Customer Ratings */}
              <div className="bg-[#F8FAFC] border border-gray-200/90 rounded-xl p-4 flex flex-col justify-between gap-3">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-gray-200/70">
                    <div>
                      <h3 className="font-bold text-xs sm:text-sm text-gray-900 leading-tight">
                        Customer Ratings
                      </h3>
                      {formattedReviewsUpdated && (
                        <p className="text-[11px] text-gray-500 font-medium flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-gray-400 shrink-0" />
                          <span>Updated {formattedReviewsUpdated}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    {/* 1. Google */}
                    {(provider.reviews.google?.count ?? 0) > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          onOpenReviewsModal
                            ? onOpenReviewsModal('GOOGLE')
                            : onScrollToReviews?.()
                        }
                        className="w-full flex items-center justify-between gap-2 py-0.5 rounded-md hover:bg-white/80 transition-colors cursor-pointer text-left"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <GoogleLogo className="w-4 h-4 shrink-0" />
                          <span className="font-medium text-gray-700 hover:text-primary truncate">
                            Google
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="flex items-center text-amber-500">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3 h-3 ${
                                  i < Math.round(provider.reviews.google.rating)
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'fill-gray-200 text-gray-200'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="font-bold text-gray-900">
                            {provider.reviews.google.rating.toFixed(1)}
                          </span>
                          <span className="text-gray-400">
                            ({provider.reviews.google.count})
                          </span>
                        </div>
                      </button>
                    )}

                    {/* 2. Yelp */}
                    {(provider.reviews.yelp?.count ?? 0) > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          onOpenReviewsModal
                            ? onOpenReviewsModal('YELP')
                            : onScrollToReviews?.()
                        }
                        className="w-full flex items-center justify-between gap-2 py-0.5 rounded-md hover:bg-white/80 transition-colors cursor-pointer text-left"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <YelpLogo className="w-4 h-4 shrink-0" />
                          <span className="font-medium text-gray-700 hover:text-primary truncate">
                            Yelp
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="flex items-center text-amber-500">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3 h-3 ${
                                  i < Math.round(provider.reviews.yelp.rating)
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'fill-gray-200 text-gray-200'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="font-bold text-gray-900">
                            {provider.reviews.yelp.rating.toFixed(1)}
                          </span>
                          <span className="text-gray-400">
                            ({provider.reviews.yelp.count})
                          </span>
                        </div>
                      </button>
                    )}

                    {/* 3. HomeAdvisor */}
                    {(provider.reviews.homeadvisor?.count ?? 0) > 0 &&
                      provider.reviews.homeadvisor && (
                        <button
                          type="button"
                          onClick={() =>
                            onOpenReviewsModal
                              ? onOpenReviewsModal('HOMEADVISOR')
                              : onScrollToReviews?.()
                          }
                          className="w-full flex items-center justify-between gap-2 py-0.5 rounded-md hover:bg-white/80 transition-colors cursor-pointer text-left"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <HomeAdvisorLogo className="w-4 h-4 shrink-0" />
                            <span className="font-medium text-gray-700 hover:text-primary truncate">
                              HomeAdvisor
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <div className="flex items-center text-amber-500">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3 h-3 ${
                                    i < Math.round(provider.reviews.homeadvisor!.rating)
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'fill-gray-200 text-gray-200'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="font-bold text-gray-900">
                              {provider.reviews.homeadvisor.rating.toFixed(1)}
                            </span>
                            <span className="text-gray-400">
                              ({provider.reviews.homeadvisor.count})
                            </span>
                          </div>
                        </button>
                      )}

                    {/* 4. Houzz */}
                    {((provider.reviews.houzz?.count || provider.reviews.facebook?.count) ?? 0) >
                      0 && (
                      <button
                        type="button"
                        onClick={() =>
                          onOpenReviewsModal
                            ? onOpenReviewsModal('HOUZZ')
                            : onScrollToReviews?.()
                        }
                        className="w-full flex items-center justify-between gap-2 py-0.5 rounded-md hover:bg-white/80 transition-colors cursor-pointer text-left"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <HouzzLogo className="w-4 h-4 shrink-0" />
                          <span className="font-medium text-gray-700 hover:text-primary truncate">
                            Houzz
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="flex items-center text-amber-500">
                            {[...Array(5)].map((_, i) => {
                              const hRating =
                                provider.reviews.houzz?.rating ||
                                provider.reviews.facebook?.rating ||
                                0;
                              return (
                                <Star
                                  key={i}
                                  className={`w-3 h-3 ${
                                    i < Math.round(hRating)
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'fill-gray-200 text-gray-200'
                                  }`}
                                />
                              );
                            })}
                          </div>
                          <span className="font-bold text-gray-900">
                            {(
                              provider.reviews.houzz?.rating ||
                              provider.reviews.facebook?.rating ||
                              0
                            ).toFixed(1)}
                          </span>
                          <span className="text-gray-400">
                            ({provider.reviews.houzz?.count || provider.reviews.facebook?.count})
                          </span>
                        </div>
                      </button>
                    )}
                  </div>
                </div>

                {/* See all reviews trigger — Opens In-App Reviews Modal */}
                <button
                  type="button"
                  onClick={() =>
                    onOpenReviewsModal
                      ? onOpenReviewsModal('ALL')
                      : onScrollToReviews?.()
                  }
                  className="text-xs font-bold text-[#EA580C] hover:text-[#D94F0A] flex items-center gap-0.5 pt-1 transition-colors cursor-pointer self-start"
                >
                  <span>See all reviews</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 4. Primary Conversion CTA Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
              <button
                type="button"
                onClick={onOpenQuoteModal}
                className="h-12 bg-[#EA580C] hover:bg-[#D94F0A] text-white font-bold text-sm px-6 rounded-xl shadow-md transition-all active:scale-[0.99] cursor-pointer inline-flex items-center justify-center whitespace-nowrap"
              >
                Get a Quote
              </button>

              {provider.phone ? (
                <a
                  href={`tel:${provider.phone.replace(/\D/g, '')}`}
                  className="h-12 bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 font-bold text-sm px-5 rounded-xl shadow-xs transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <Phone className="w-4 h-4 text-gray-600 shrink-0" />
                  <span>Call {provider.displayPhone || provider.phone}</span>
                </a>
              ) : (
                <button
                  type="button"
                  onClick={onScrollToReviews}
                  className="h-12 bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 font-bold text-sm px-5 rounded-xl shadow-xs transition-colors inline-flex items-center justify-center whitespace-nowrap cursor-pointer"
                >
                  Read Customer Reviews
                </button>
              )}
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
