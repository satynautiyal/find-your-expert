'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Heart,
  ChevronDown,
  ChevronRight,
  MapPin,
  CheckCircle2,
  Calendar,
  Award,
  FileText,
  Star,
  Clock,
  Phone,
  ArrowRight,
} from 'lucide-react';
import type { RooferProvider } from '@/data/mockRoofers';
import { EButton } from '@/components/EComponents';
import SafeImage from '@/components/common/SafeImage';
import BrandLogoBadge from '@/components/common/BrandLogoBadge';
import {
  GoogleLogo,
  YelpLogo,
  HomeAdvisorLogo,
  HouzzLogo,
} from '@/components/contractor-profile/PlatformLogos';
import ReviewsModal from '@/components/contractor-profile/ReviewsModal';

export interface ProviderCardProps {
  provider: RooferProvider;
  rank: number;
  isCompared: boolean;
  onToggleCompare: (id: string) => void;
  onOpenQuoteModal: (provider: RooferProvider) => void;
  onOpenCostGuide?: () => void;
  onOpenReviewsModal?: (provider: RooferProvider, initialPlatform?: string) => void;
}

function toTitleCaseIfUpper(text: string): string {
  if (!text) return '';
  if (text.length > 2 && text === text.toUpperCase()) {
    return text
      .toLowerCase()
      .replace(/\b\w/g, (ch) => ch.toUpperCase());
  }
  return text;
}

export default function ProviderCard({
  provider,
  rank,
  isCompared,
  onToggleCompare,
  onOpenQuoteModal,
  onOpenReviewsModal,
}: ProviderCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [cardImgIdx, setCardImgIdx] = useState(0);
  const [localReviewsModalOpen, setLocalReviewsModalOpen] = useState(false);
  const [localReviewsPlatform, setLocalReviewsPlatform] = useState<string>('ALL');

  const handleOpenReviews = (platform = 'ALL') => {
    if (onOpenReviewsModal) {
      onOpenReviewsModal(provider, platform);
    } else {
      setLocalReviewsPlatform(platform);
      setLocalReviewsModalOpen(true);
    }
  };

  // Unified Vetted Score calculation matching ProfileHero (88 - 99 range)
  const ratingValue = provider.compositeRating || 0;
  const yearsValue = provider.yearsInBusiness || 0;
  const vettedScore = Math.min(
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

  const establishedYear =
    provider.sinceYear && provider.sinceYear > 0
      ? provider.sinceYear
      : yearsValue > 0
      ? new Date().getFullYear() - yearsValue
      : 0;

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

  const isCabinets =
    provider.services?.some(
      (s) =>
        s.toLowerCase().includes('cabinet') ||
        s.toLowerCase().includes('shelv') ||
        s.toLowerCase().includes('vanit') ||
        s.toLowerCase().includes('closet') ||
        s.toLowerCase().includes('millwork')
    ) ||
    provider.tagline?.toLowerCase().includes('cabinet') ||
    provider.description?.toLowerCase().includes('cabinet');

  const servicesList =
    provider.services && provider.services.length > 0 ? provider.services : [];

  const businessLogo =
    provider.logoUrl ||
    (provider.imageUrl &&
    !provider.imageUrl.includes('placeholder') &&
    !(provider.photos || []).some((p) => p.url === provider.imageUrl)
      ? provider.imageUrl
      : '');

  const projectPhotos = (provider.photos || [])
    .map((p) => p.url)
    .filter((url) => Boolean(url) && url !== businessLogo);

  const cardCandidates = [
    ...projectPhotos,
    ...(businessLogo ? [businessLogo] : []),
  ];
  const activeCardImage = cardCandidates[cardImgIdx] || '';
  const isShowingProjectPhoto = cardImgIdx < projectPhotos.length;

  // Short city/borough label for top identity strip (matching ProfileHero)
  const shortLocation = (() => {
    const borough =
      provider.borough &&
      provider.borough !== 'All' &&
      provider.borough !== 'New York City'
        ? toTitleCaseIfUpper(provider.borough.trim())
        : '';
    const city = toTitleCaseIfUpper((provider.city || '').trim());
    const state = (provider.state || 'NY').trim();
    const locality = borough || city || 'New York';
    return `${locality}, ${state}`;
  })();

  // Clean normalized full street address for bottom details bar
  const fullAddress = (() => {
    const raw = (provider.address || '')
      .trim()
      .replace(/[\\/\s,]+$/g, '')
      .replace(
        /,?\s+\bNY\b,\s*(Manhattan|Brooklyn|Queens|Bronx|Staten Island|New York),\s*NY\b/gi,
        ', $1, NY'
      );
    const borough =
      provider.borough &&
      provider.borough !== 'All' &&
      provider.borough !== 'New York City'
        ? toTitleCaseIfUpper(provider.borough.trim())
        : '';
    const city = toTitleCaseIfUpper((provider.city || '').trim());
    const state = (provider.state || 'NY').trim();
    const zip = (provider.zipCode || '').trim();

    if (raw) {
      let result = raw;
      const locality = city || borough;
      if (locality && !result.toLowerCase().includes(locality.toLowerCase())) {
        result += `, ${locality}`;
      }
      if (state && !new RegExp(`\\b${state}\\b`, 'i').test(result)) {
        result += `, ${state}`;
      }
      if (zip && !result.includes(zip)) {
        result += ` ${zip}`;
      }
      const parts = result
        .split(',')
        .map((p) => toTitleCaseIfUpper(p.trim()))
        .filter(Boolean);
      const deduped: string[] = [];
      for (const part of parts) {
        if (
          deduped.length === 0 ||
          deduped[deduped.length - 1].toLowerCase() !== part.toLowerCase()
        ) {
          deduped.push(part);
        }
      }
      return deduped.join(', ');
    }

    const parts = [borough || city, state].filter(
      (val, idx, arr) =>
        Boolean(val) &&
        arr.findIndex((v) => v.toLowerCase() === val.toLowerCase()) === idx
    );
    const base = parts.join(', ');
    if (base) {
      return zip ? `${base} ${zip}` : base;
    }
    return provider.servesArea || 'New York, NY';
  })();

  // Active verified platform ratings
  const platformItems = [
    provider.reviews?.google && provider.reviews.google.count > 0
      ? {
          key: 'GOOGLE',
          label: 'Google',
          rating: provider.reviews.google.rating,
          count: provider.reviews.google.count,
          Logo: GoogleLogo,
        }
      : null,
    provider.reviews?.yelp && provider.reviews.yelp.count > 0
      ? {
          key: 'YELP',
          label: 'Yelp',
          rating: provider.reviews.yelp.rating,
          count: provider.reviews.yelp.count,
          Logo: YelpLogo,
        }
      : null,
    provider.reviews?.homeadvisor && provider.reviews.homeadvisor.count > 0
      ? {
          key: 'HOMEADVISOR',
          label: 'HomeAdvisor',
          rating: provider.reviews.homeadvisor.rating,
          count: provider.reviews.homeadvisor.count,
          Logo: HomeAdvisorLogo,
        }
      : null,
    (provider.reviews?.houzz?.count || provider.reviews?.facebook?.count || 0) > 0
      ? {
          key: 'HOUZZ',
          label: 'Houzz',
          rating:
            provider.reviews.houzz?.rating ||
            provider.reviews.facebook?.rating ||
            0,
          count:
            provider.reviews.houzz?.count ||
            provider.reviews.facebook?.count ||
            0,
          Logo: HouzzLogo,
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

  const useTwoColPlatformGrid = platformItems.length >= 3;

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-300/90 hover:border-[#0B3B2C]/45 shadow-[0_8px_28px_-4px_rgba(15,23,42,0.12),0_4px_10px_-2px_rgba(15,23,42,0.06)] hover:shadow-[0_14px_36px_-4px_rgba(15,23,42,0.18),0_6px_14px_-2px_rgba(15,23,42,0.09)] transition-all duration-200 overflow-hidden">
        {/* 1. Top Card Area */}
        <div className="p-4 sm:p-5">
          <div className="flex flex-col lg:flex-row gap-4 sm:gap-5 items-stretch justify-between">
            {/* Left Block: Media Thumbnail + Company Identity & Highlights */}
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-stretch flex-1 min-w-0 w-full sm:w-auto">
              {/* Col 1: Project Photo (stretches evenly on desktop so zero awkward gap below image) */}
              <Link
                href={`/contractors/${provider.slug}`}
                className={`relative w-full sm:w-44 md:w-48 lg:w-48 xl:w-52 h-44 xs:h-48 sm:h-auto sm:min-h-[152px] rounded-xl overflow-hidden shrink-0 group border border-gray-200 shadow-sm flex items-center justify-center ${
                  isShowingProjectPhoto ? 'bg-gray-100' : 'bg-white p-3'
                }`}
              >
                {activeCardImage ? (
                  <img
                    src={activeCardImage}
                    alt={
                      isShowingProjectPhoto
                        ? `${provider.name} Project`
                        : `${provider.name} Logo`
                    }
                    onError={() => {
                      if (cardImgIdx + 1 < cardCandidates.length) {
                        setCardImgIdx((prev) => prev + 1);
                      }
                    }}
                    className={`w-full h-full ${
                      isShowingProjectPhoto
                        ? 'object-cover sm:absolute sm:inset-0'
                        : 'object-contain max-h-32'
                    } group-hover:scale-105 transition-transform duration-300`}
                    loading="lazy"
                  />
                ) : (
                  <SafeImage
                    src=""
                    alt={provider.name}
                    fallbackCategory={isCabinets ? 'Custom Cabinets' : 'Roofing'}
                    fallbackTitle={provider.name}
                    fallbackIcon="letter"
                    className="w-full h-full object-contain"
                  />
                )}

                {/* Rank Badge on top-left of image */}
                <div className="absolute top-2 left-2 bg-[#0B3B2C] text-white text-[11px] font-bold px-2 py-0.5 rounded-md shadow-sm z-10">
                  #{rank}
                </div>

                {/* Mobile Quick-Save Heart */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onToggleCompare(provider.id);
                  }}
                  className="sm:hidden absolute top-2 right-2 w-8 h-8 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center shadow-sm border border-gray-200 z-10 cursor-pointer active:scale-90 transition-transform"
                  title={isCompared ? 'Saved' : 'Save'}
                >
                  <Heart
                    className={`w-4 h-4 text-[#DA5F2F] ${
                      isCompared ? 'fill-[#DA5F2F]' : ''
                    }`}
                  />
                </button>
              </Link>

              {/* Col 2: Houzz-Style Brand Logo + Business Identity, Ratings & Services */}
              <div className="flex flex-col justify-between gap-2.5 min-w-0 flex-1 w-full py-0.5">
                <div className="flex items-center gap-3.5 sm:gap-4">
                  {isShowingProjectPhoto && (
                    <Link
                      href={`/contractors/${provider.slug}`}
                      className="shrink-0"
                      aria-label={`${provider.name} profile`}
                    >
                      <BrandLogoBadge
                        src={businessLogo}
                        name={provider.name}
                        fallbackInitial={provider.logoText || provider.name.charAt(0)}
                        size="card"
                      />
                    </Link>
                  )}

                  <div className="min-w-0 flex-1 space-y-1">
                    <Link
                      href={`/contractors/${provider.slug}`}
                      className="block text-base sm:text-lg font-extrabold text-[#111827] hover:text-[#DA5F2F] transition-colors leading-snug truncate"
                    >
                      {provider.name}
                    </Link>

                    {/* Rating Stars + Reviews Row (Houzz style directly beneath business name) */}
                    {ratingValue > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-extrabold text-amber-500 tabular-nums">
                          {ratingValue.toFixed(1)}
                        </span>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${
                                s <= Math.round(ratingValue)
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-gray-200 fill-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenReviews('ALL')}
                          className="text-xs font-medium text-gray-500 hover:text-primary hover:underline transition-colors cursor-pointer"
                        >
                          {provider.totalReviews || 0} Reviews
                        </button>
                      </div>
                    )}

                    {/* Verified Professional + Since Year + Short Location */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-gray-600">
                      <span className="inline-flex items-center gap-1 font-bold text-gray-900">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Verified Professional</span>
                      </span>

                      {establishedYear > 0 && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span className="inline-flex items-center gap-1 font-medium text-gray-600">
                            <Calendar className="w-3 h-3 text-gray-400 shrink-0" />
                            <span>Since {establishedYear}</span>
                          </span>
                        </>
                      )}

                      <span className="text-gray-300">•</span>
                      <span className="inline-flex items-center gap-1 font-medium text-gray-600">
                        <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                        <span>{shortLocation}</span>
                      </span>
                    </div>

                    {/* Service Assurance Row */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 text-[11px] font-semibold text-gray-700">
                      <span className="inline-flex items-center gap-1">
                        <Award className="w-3 h-3 text-amber-600 shrink-0" />
                        <span>Warranty Available</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <FileText className="w-3 h-3 text-blue-600 shrink-0" />
                        <span>Free Estimates</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Direct Service Chips */}
                {servicesList.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {servicesList.map((service) => (
                      <span
                        key={service}
                        className="bg-[#F3F4F6] text-[#374151] border border-gray-200/90 text-[11px] font-medium px-2.5 py-0.5 rounded-md"
                      >
                        {service}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Block: Vetted Score + 4-Point Audit Checklist + Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-3 lg:pt-0 border-t lg:border-t-0 border-gray-200 w-full lg:w-auto shrink-0">
              {/* Vetted Score & 4-Point Audit Checklist */}
              <div className="flex items-center justify-between sm:justify-start gap-3.5 bg-[#F8FAFC] border border-gray-200/90 rounded-xl px-3.5 py-3 h-full">
                {/* Vetted Score Box */}
                <div className="bg-[#EBF7F2] border border-[#0B3B2C]/15 rounded-xl px-3 py-2.5 text-center shrink-0 min-w-[84px]">
                  <div className="text-[9.5px] font-extrabold text-[#0B3B2C]/80 uppercase tracking-wider leading-tight">
                    Vetted Score
                  </div>
                  <div className="text-3xl font-black text-[#0B3B2C] leading-none mt-1">
                    {vettedScore}
                  </div>
                  <div className="text-[9.5px] font-medium text-[#0B3B2C]/65 leading-tight mt-1">
                    Prosvetted Audit
                  </div>
                </div>

                {/* 4-Point Vetting Checklist (Tick placed after text, License & Insurance Checked greyed out) */}
                <div className="space-y-1.5 text-[11.5px] font-semibold min-w-[178px]">
                  <div className="flex items-center justify-between gap-2.5 text-gray-700 whitespace-nowrap">
                    <span>Business Confirmed</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  </div>
                  <div className="flex items-center justify-between gap-2.5 text-gray-400 select-none whitespace-nowrap">
                    <span>License &amp; Insurance Checked</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                  </div>
                  <div className="flex items-center justify-between gap-2.5 text-gray-700 whitespace-nowrap">
                    <span>Reputation Analyzed</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  </div>
                  <div className="flex items-center justify-between gap-2.5 text-gray-700 whitespace-nowrap">
                    <span>Reviews Analyzed</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  </div>
                </div>
              </div>

              {/* Action Buttons & Single Clean Expand Chevron */}
              <div className="flex items-center gap-2 pt-3 sm:pt-0 pl-0 sm:pl-3.5 border-t sm:border-t-0 sm:border-l border-gray-200 w-full sm:w-auto h-full">
                <div className="w-full sm:w-32 md:w-36 grid grid-cols-2 sm:flex sm:flex-col gap-2">
                  <EButton
                    variant="primary"
                    size="md"
                    className="w-full font-semibold justify-center"
                    onClick={() => onOpenQuoteModal(provider)}
                  >
                    Get a Quote
                  </EButton>

                  <Link href={`/contractors/${provider.slug}`} className="w-full">
                    <EButton
                      variant="secondary"
                      size="md"
                      className="w-full font-semibold justify-center"
                    >
                      View Profile
                    </EButton>
                  </Link>

                  {/* Desktop Save Button */}
                  <button
                    type="button"
                    onClick={() => onToggleCompare(provider.id)}
                    className="hidden sm:inline-flex items-center justify-center gap-1.5 text-xs text-[#111827] hover:border-gray-300 border border-gray-200 bg-white rounded-lg py-1.5 px-3 transition-colors cursor-pointer font-medium shadow-sm"
                  >
                    <Heart
                      className={`w-3.5 h-3.5 text-[#DA5F2F] ${
                        isCompared ? 'fill-[#DA5F2F]' : ''
                      }`}
                    />
                    <span>{isCompared ? 'Saved' : 'Save'}</span>
                  </button>
                </div>

                {/* Single Chevron Collapse Toggle on far right */}
                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-gray-400 hover:text-gray-600 p-1 self-start transition-colors hidden sm:block cursor-pointer"
                  title={isExpanded ? 'Collapse details' : 'Expand details'}
                >
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Toggle Button for Details */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="sm:hidden w-full py-2.5 px-4 border-t border-gray-200 bg-gray-50/80 hover:bg-gray-100/70 flex items-center justify-center gap-1.5 text-xs text-gray-700 font-semibold transition-colors cursor-pointer"
        >
          <span>
            {isExpanded
              ? 'Hide company details & ratings'
              : 'Show company details & ratings'}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* 2. Symmetrical 2-Column Bottom Strip: Company Overview & Location | Customer Ratings */}
        {isExpanded && (
          <div className="border-t border-gray-200/90 bg-[#F8FAFC]/85 px-4 sm:px-5 py-3.5">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-stretch">
              {/* Left Column (7 cols): About + Inline Location & Direct Phone Footer */}
              <div className="lg:col-span-7 flex flex-col justify-between gap-2.5 pb-3.5 lg:pb-0 lg:pr-6 border-b lg:border-b-0 lg:border-r border-gray-200/90">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-xs font-bold text-[#111827]">
                      About {provider.name}
                    </h3>
                    <Link
                      href={`/contractors/${provider.slug}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#DA5F2F] hover:underline shrink-0"
                    >
                      <span>Read more</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>

                  <p className="text-xs text-[#5A6578] leading-relaxed line-clamp-2">
                    {provider.description ||
                      provider.tagline ||
                      'Verified contractor profile serving New York homeowners.'}
                  </p>
                </div>

                {/* Crisp Location + Direct Phone Strip (No duplicate map or wasted column) */}
                <div className="pt-2 border-t border-gray-200/70 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-gray-600">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <MapPin className="w-3.5 h-3.5 text-[#DA5F2F] shrink-0" />
                    <span className="truncate font-medium text-gray-700">
                      {fullAddress}
                    </span>
                  </div>

                  {provider.phone && (
                    <a
                      href={`tel:${provider.phone.replace(/\D/g, '')}`}
                      className="inline-flex items-center gap-1.5 font-semibold text-gray-700 hover:text-primary transition-colors shrink-0"
                    >
                      <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                      <span>{provider.displayPhone || provider.phone}</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Right Column (5 cols): Balanced Customer Ratings Pill Grid */}
              <div className="lg:col-span-5 flex flex-col justify-between gap-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xs font-bold text-[#111827]">
                      Customer Ratings
                    </h3>
                    {formattedReviewsUpdated && (
                      <span className="text-[11px] text-gray-400 font-medium inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-400 shrink-0" />
                        <span>Updated {formattedReviewsUpdated}</span>
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenReviews('ALL')}
                    className="text-xs font-bold text-[#EA580C] hover:text-[#D94F0A] inline-flex items-center gap-0.5 transition-colors cursor-pointer shrink-0"
                  >
                    <span>See all reviews</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {platformItems.length > 0 ? (
                  <div
                    className={
                      useTwoColPlatformGrid
                        ? 'grid grid-cols-1 sm:grid-cols-2 gap-2'
                        : 'grid grid-cols-1 gap-1.5'
                    }
                  >
                    {platformItems.map((item) => {
                      const LogoComponent = item.Logo;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => handleOpenReviews(item.key)}
                          className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-white border border-gray-200/90 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer text-left"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <LogoComponent className="w-4 h-4 shrink-0" />
                            <span className="text-xs font-semibold text-gray-800 truncate">
                              {item.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 text-xs">
                            {useTwoColPlatformGrid ? (
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                            ) : (
                              <div className="flex items-center text-amber-500 mr-0.5">
                                {[1, 2, 3, 4, 5].map((i) => (
                                  <Star
                                    key={i}
                                    className={`w-3 h-3 ${
                                      i <= Math.round(item.rating)
                                        ? 'fill-amber-400 text-amber-400'
                                        : 'fill-gray-200 text-gray-200'
                                    }`}
                                  />
                                ))}
                              </div>
                            )}
                            <span className="font-bold text-gray-950">
                              {item.rating.toFixed(1)}
                            </span>
                            <span className="text-gray-400 text-[11px]">
                              ({item.count})
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-3 py-2.5 rounded-lg bg-white border border-gray-200/90 text-xs text-gray-500">
                    {provider.totalReviews > 0
                      ? `${provider.totalReviews} verified reviews (${ratingValue.toFixed(1)} avg rating)`
                      : 'Verified contractor profile'}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fallback local ReviewsModal if parent does not manage a shared modal */}
      {!onOpenReviewsModal && localReviewsModalOpen && (
        <ReviewsModal
          isOpen={localReviewsModalOpen}
          onClose={() => setLocalReviewsModalOpen(false)}
          provider={provider}
          initialPlatform={localReviewsPlatform}
        />
      )}
    </>
  );
}
