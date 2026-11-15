'use client';

import React, { useState } from 'react';
import {
  Star,
  ChevronRight,
  Home,
  Wrench,
  CloudRain,
  Search,
  Layers,
  Grid,
  CheckCircle2,
  Sun,
  ShieldAlert,
  Building2,
  FolderKanban,
  Hammer,
  Sparkles,
  Paintbrush,
  Box,
  Compass,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import type { RooferProvider } from '@/data/mockRoofers';
import {
  GoogleLogo,
  YelpLogo,
  HomeAdvisorLogo,
  HouzzLogo,
  FacebookLogo,
} from './PlatformLogos';
import type { ScrapedReviewItemDto } from '@/lib/api';

interface ProfileServicesAndReviewsProps {
  provider: RooferProvider;
  onOpenQuoteModal: () => void;
  onOpenReviewsModal?: (initialPlatform?: string) => void;
  scrapedReviews?: ScrapedReviewItemDto[];
}

export default function ProfileServicesAndReviews({
  provider,
  onOpenQuoteModal,
  onOpenReviewsModal,
  scrapedReviews = [],
}: ProfileServicesAndReviewsProps) {
  const [filterPlatform, setFilterPlatform] = useState<string>('ALL');

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

  // Trade detection
  const isRoofing = provider.services?.some((s) => /Roof/i.test(s)) ?? true;
  const isCabinets = provider.services?.some((s) => /Cabinet|Millwork/i.test(s));

  // 12 Services matching the trade
  const roofingServicesList = [
    { name: 'Roof Replacement', icon: Home },
    { name: 'Roof Repair', icon: Wrench },
    { name: 'Storm Damage Repair', icon: CloudRain },
    { name: 'Roof Inspection', icon: Search },
    { name: 'Shingle Roofing', icon: Layers },
    { name: 'Metal Roofing', icon: Grid },
    { name: 'Flat Roofing', icon: Box },
    { name: 'Gutter Installation', icon: CheckCircle2 },
    { name: 'Skylight Installation', icon: Sun },
    { name: 'Roof Maintenance', icon: Compass },
    { name: 'Emergency Roof Repair', icon: ShieldAlert },
    { name: 'Commercial Roofing', icon: Building2 },
  ];

  const cabinetServicesList = [
    { name: 'Custom Cabinets', icon: Home },
    { name: 'Kitchen Cabinetry', icon: Wrench },
    { name: 'Bathroom Vanities', icon: Layers },
    { name: 'Built-In Shelving', icon: Grid },
    { name: 'Architectural Millwork', icon: Hammer },
    { name: 'Custom Closets', icon: Box },
    { name: 'Cabinet Refacing', icon: Sparkles },
    { name: 'Finish Carpentry', icon: CheckCircle2 },
    { name: 'Commercial Millwork', icon: Building2 },
    { name: 'Design Consultation & 3D', icon: Search },
    { name: 'Hardware & Trim', icon: Compass },
    { name: 'Restoration & Repair', icon: ShieldAlert },
  ];

  const serviceIcons = [
    Home,
    Wrench,
    Layers,
    Grid,
    Hammer,
    Box,
    Sparkles,
    CheckCircle2,
    Building2,
    Search,
    Compass,
    ShieldAlert,
  ];

  const fallbackServicesList = isCabinets ? cabinetServicesList : roofingServicesList;
  const displayServices =
    provider.services && provider.services.length > 0
      ? provider.services.map((name, idx) => ({
        name,
        icon: serviceIcons[idx % serviceIcons.length],
      }))
      : fallbackServicesList;

  // Rating & review distributions from DB
  const rating = provider.compositeRating || 0;
  const totalReviews = provider.totalReviews || scrapedReviews.length || 0;

  // Star breakdown calculation (computed from real scrapedReviews when present)
  const distribution = [5, 4, 3, 2, 1].map((stars) => {
    if (scrapedReviews && scrapedReviews.length > 0) {
      const count = scrapedReviews.filter((r) => Math.round(r.rating || 5) === stars).length;
      const pct = Math.round((count / scrapedReviews.length) * 100);
      return { stars, pct, count };
    }
    const defaultPct = stars === 5 ? 78 : stars === 4 ? 16 : stars === 3 ? 4 : 1;
    return {
      stars,
      pct: totalReviews > 0 ? defaultPct : 0,
      count: Math.round((totalReviews * defaultPct) / 100),
    };
  });

  // Real scraped reviews from DB
  const allDisplayReviews = (scrapedReviews || []).map((sr) => {
    const rawName = (sr.authorName || '').trim();
    let authorName = rawName || 'Verified Homeowner';
    if (/^HU-\d+$/i.test(authorName)) {
      authorName = 'Verified Houzz Homeowner';
    } else {
      const parts = authorName.split(/\s+/);
      if (parts.length >= 2 && parts[0].length > 20 && /[+/0-9]/.test(parts[0])) {
        authorName = parts.slice(1).join(' ');
      }
    }
    let formattedDate = (sr.reviewDate || '').trim() || 'Verified Review';
    if (/^\d{4}-\d{2}-\d{2}(?:[T\s].*)?$/.test(formattedDate)) {
      const parsedDate = new Date(formattedDate);
      if (!Number.isNaN(parsedDate.getTime())) {
        formattedDate = parsedDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }
    }
    return {
      authorName,
      platform: sr.platform?.toUpperCase() || 'GOOGLE',
      rating: sr.rating || 5,
      date: formattedDate,
      comment: sr.comment,
    };
  });

  const renderPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'GOOGLE':
        return <GoogleLogo className="w-4 h-4 shrink-0" />;
      case 'YELP':
        return <YelpLogo className="w-4 h-4 shrink-0" />;
      case 'HOMEADVISOR':
        return <HomeAdvisorLogo className="w-4 h-4 shrink-0" />;
      case 'HOUZZ':
        return <HouzzLogo className="w-4 h-4 shrink-0" />;
      case 'FACEBOOK':
        return <FacebookLogo className="w-4 h-4 shrink-0" />;
      default:
        return <GoogleLogo className="w-4 h-4 shrink-0" />;
    }
  };

  const activePlatformSummaries = [
    provider.reviews?.google && provider.reviews.google.count > 0
      ? {
        key: 'GOOGLE',
        label: 'Google',
        rating: provider.reviews.google.rating,
        count: provider.reviews.google.count,
        url: provider.reviews.google.url,
      }
      : null,
    provider.reviews?.yelp && provider.reviews.yelp.count > 0
      ? {
        key: 'YELP',
        label: 'Yelp',
        rating: provider.reviews.yelp.rating,
        count: provider.reviews.yelp.count,
        url: provider.reviews.yelp.url,
      }
      : null,
    provider.reviews?.homeadvisor && provider.reviews.homeadvisor.count > 0
      ? {
        key: 'HOMEADVISOR',
        label: 'HomeAdvisor',
        rating: provider.reviews.homeadvisor.rating,
        count: provider.reviews.homeadvisor.count,
        url: provider.reviews.homeadvisor.url,
      }
      : null,
    (provider.reviews?.houzz?.count || provider.reviews?.facebook?.count || 0) > 0
      ? {
        key: 'HOUZZ',
        label: 'Houzz',
        rating: provider.reviews.houzz?.rating || provider.reviews.facebook?.rating || 0,
        count: provider.reviews.houzz?.count || provider.reviews.facebook?.count || 0,
        url: provider.reviews.houzz?.url || provider.reviews.facebook?.url || '',
      }
      : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

  const platformFilterOptions = [
    { key: 'ALL', label: 'All', count: totalReviews },
    {
      key: 'GOOGLE',
      label: 'Google',
      count:
        activePlatformSummaries.find((p) => p.key === 'GOOGLE')?.count ||
        allDisplayReviews.filter((r) => r.platform === 'GOOGLE').length,
    },
    {
      key: 'YELP',
      label: 'Yelp',
      count:
        activePlatformSummaries.find((p) => p.key === 'YELP')?.count ||
        allDisplayReviews.filter((r) => r.platform === 'YELP').length,
    },
    {
      key: 'HOMEADVISOR',
      label: 'HomeAdvisor',
      count:
        activePlatformSummaries.find((p) => p.key === 'HOMEADVISOR')?.count ||
        allDisplayReviews.filter((r) => r.platform === 'HOMEADVISOR').length,
    },
    {
      key: 'HOUZZ',
      label: 'Houzz',
      count:
        activePlatformSummaries.find((p) => p.key === 'HOUZZ')?.count ||
        allDisplayReviews.filter((r) => r.platform === 'HOUZZ').length,
    },
  ].filter(
    (opt) =>
      opt.key === 'ALL' ||
      opt.count > 0 ||
      allDisplayReviews.some((r) => r.platform === opt.key)
  );

  const filteredReviews =
    filterPlatform === 'ALL'
      ? allDisplayReviews
      : allDisplayReviews.filter((r) => r.platform === filterPlatform);

  const selectedPlatformSummary =
    filterPlatform !== 'ALL'
      ? activePlatformSummaries.find((p) => p.key === filterPlatform) || null
      : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* ========================================================= */}
      {/* LEFT COLUMN: SERVICES OFFERED (col-span-12 lg:col-span-7) */}
      {/* ========================================================= */}
      <div id="services" className="lg:col-span-7 bg-white rounded-2xl border border-gray-200/90 p-5 sm:p-6 space-y-4 shadow-sm">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-950 tracking-tight">
            Services Offered
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Complete {isCabinets ? 'custom cabinet and architectural millwork' : 'roofing'} solutions for residential and light commercial properties.
          </p>
        </div>

        {/* 12-Service Grid (2 columns x 6 rows) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {displayServices.map((service, idx) => {
            const IconComponent = service.icon;
            return (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/70 border border-gray-200/80 hover:bg-white hover:border-primary/40 hover:shadow-2xs transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-700 group-hover:text-primary transition-colors shrink-0">
                  <IconComponent className="w-4 h-4 stroke-[2]" />
                </div>
                <span className="text-xs sm:text-[13px] font-bold text-gray-800 group-hover:text-gray-950 transition-colors">
                  {service.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* RIGHT COLUMN: CUSTOMER REVIEWS (col-span-12 lg:col-span-5) */}
      {/* ========================================================= */}
      <div id="reviews" className="lg:col-span-5 bg-white rounded-2xl border border-gray-200/90 p-5 sm:p-6 space-y-4 shadow-sm">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-950 tracking-tight">
              Customer Reviews
            </h2>
            {formattedReviewsUpdated && (
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span>Reviews last updated: {formattedReviewsUpdated}</span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onOpenReviewsModal?.(filterPlatform)}
            className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5 shrink-0 pt-1 cursor-pointer"
          >
            <span>See all reviews</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Score & Stars + Distribution Breakdown */}
        <div className="grid grid-cols-12 gap-4 items-center pt-1 pb-2 border-b border-gray-100">
          {/* Big Score Box (col-span-5) */}
          <div className="col-span-5 text-center sm:text-left space-y-1">
            <div className="text-4xl font-black text-gray-950 tracking-tight">
              {rating.toFixed(1)}
            </div>
            <div className="flex items-center justify-center sm:justify-start text-amber-500">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <p className="text-[11px] text-gray-500 font-medium">
              Based on {totalReviews} reviews
            </p>
          </div>

          {/* Progress Bars (col-span-7) */}
          <div className="col-span-7 space-y-1 text-[11px] font-medium text-gray-600">
            {distribution.map((item) => (
              <div key={item.stars} className="flex items-center gap-2">
                <span className="w-3 shrink-0 text-right">{item.stars}★</span>
                <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full bg-teal-800 rounded-full transition-all duration-500"
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
                <span className="w-12 text-right text-gray-400 text-[10px] shrink-0">
                  {item.pct}% ({item.count})
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Verified Platform Ratings Breakdown — Opens Reviews Modal on Click */}
        {activePlatformSummaries.length > 0 && (
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            {activePlatformSummaries.map((plat) => (
              <button
                key={plat.key}
                type="button"
                onClick={() => onOpenReviewsModal?.(plat.key)}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-gray-200/90 bg-slate-50/70 hover:bg-white hover:border-gray-300 transition-colors text-xs cursor-pointer text-left"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  {renderPlatformIcon(plat.key)}
                  <span className="font-bold text-gray-800 truncate">{plat.label}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                  <span className="font-bold text-gray-950">{plat.rating.toFixed(1)}</span>
                  <span className="text-gray-400 text-[11px]">({plat.count})</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Write a Review Button */}
        <div>
          <button
            type="button"
            onClick={onOpenQuoteModal}
            className="w-full py-2.5 px-4 rounded-xl border border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-800 font-bold text-xs transition-colors cursor-pointer text-center"
          >
            Write a Review
          </button>
        </div>

        {/* Platform Filter Pills (shown for every verified platform on this contractor) */}
        {platformFilterOptions.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {platformFilterOptions.map((opt) => {
              const active = filterPlatform === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setFilterPlatform(opt.key)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${active
                      ? 'bg-[#0B3B2C] text-white border-[#0B3B2C]'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                >
                  {opt.key !== 'ALL' && renderPlatformIcon(opt.key)}
                  <span>{opt.label}</span>
                  {opt.key !== 'ALL' && opt.count > 0 && (
                    <span
                      className={`text-[10px] ${active ? 'text-white/80' : 'text-gray-400'
                        }`}
                    >
                      ({opt.count})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Recent Review Cards List */}
        <div id="reviews-list" className="space-y-3 pt-1">
          {filteredReviews.length > 0 ? (
            <>
              {filteredReviews.slice(0, 3).map((rev, idx) => (
                <div
                  key={idx}
                  onClick={() => onOpenReviewsModal?.(filterPlatform)}
                  className="p-3.5 rounded-xl border border-gray-100 bg-slate-50/50 space-y-2 hover:bg-slate-50 hover:border-gray-200 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {renderPlatformIcon(rev.platform)}
                      <span className="font-bold text-xs text-gray-900">
                        {rev.authorName}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400">{rev.date}</span>
                  </div>

                  <div className="flex items-center text-amber-500">
                    {[...Array(rev.rating || 5)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                    ))}
                  </div>

                  <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">
                    "{rev.comment.replace(/\nPrice assessment[\s\S]*$/i, '').trim()}"
                  </p>
                </div>
              ))}

              <button
                type="button"
                onClick={() => onOpenReviewsModal?.(filterPlatform)}
                className="w-full py-2.5 px-4 rounded-xl bg-[#F8FAFC] hover:bg-slate-100 border border-gray-200/90 text-xs font-bold text-primary transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>
                  Read all{' '}
                  {filterPlatform === 'ALL'
                    ? `${allDisplayReviews.length} verified reviews`
                    : `${filteredReviews.length} ${platformFilterOptions.find((o) => o.key === filterPlatform)?.label || ''
                    } reviews`}
                </span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </>
          ) : selectedPlatformSummary ? (
            <div className="p-4 rounded-xl border border-gray-200/90 bg-[#F8FAFC] space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {renderPlatformIcon(selectedPlatformSummary.key)}
                  <span className="text-xs font-bold text-gray-950">
                    Verified {selectedPlatformSummary.label} Rating
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-black text-gray-950">
                    {selectedPlatformSummary.rating.toFixed(1)}
                  </span>
                  <span className="text-[11px] text-gray-500 font-medium">
                    ({selectedPlatformSummary.count} reviews)
                  </span>
                </div>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed">
                {provider.name} holds a verified{' '}
                <strong className="font-bold text-gray-900">
                  {selectedPlatformSummary.rating.toFixed(1)}-star
                </strong>{' '}
                rating across{' '}
                <strong className="font-bold text-gray-900">
                  {selectedPlatformSummary.count} customer reviews
                </strong>{' '}
                on {selectedPlatformSummary.label}.
              </p>

              <button
                type="button"
                onClick={() => onOpenReviewsModal?.('ALL')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-gray-50 text-gray-900 hover:text-primary border border-gray-200 shadow-sm text-xs font-bold transition-all cursor-pointer"
              >
                <span>Read all verified customer reviews</span>
                <ChevronRight className="w-3.5 h-3.5 text-primary" />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
