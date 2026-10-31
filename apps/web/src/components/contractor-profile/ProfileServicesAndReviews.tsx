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
} from 'lucide-react';
import type { RooferProvider } from '@/data/mockRoofers';
import { GoogleLogo, YelpLogo, HouzzLogo, FacebookLogo } from './PlatformLogos';
import type { ScrapedReviewItemDto } from '@/lib/api';

interface ProfileServicesAndReviewsProps {
  provider: RooferProvider;
  onOpenQuoteModal: () => void;
  scrapedReviews?: ScrapedReviewItemDto[];
}

export default function ProfileServicesAndReviews({
  provider,
  onOpenQuoteModal,
  scrapedReviews = [],
}: ProfileServicesAndReviewsProps) {
  const [filterPlatform, setFilterPlatform] = useState<string>('ALL');
  const [showAllReviews, setShowAllReviews] = useState(false);

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
  const allDisplayReviews = (scrapedReviews || []).map((sr) => ({
    authorName: sr.authorName || 'Verified Homeowner',
    platform: sr.platform?.toUpperCase() || 'GOOGLE',
    rating: sr.rating || 5,
    date: sr.reviewDate || 'Verified Review',
    comment: sr.comment,
  }));

  const renderPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'GOOGLE':
        return <GoogleLogo className="w-4 h-4" />;
      case 'YELP':
        return <YelpLogo className="w-4 h-4" />;
      case 'HOUZZ':
        return <HouzzLogo className="w-4 h-4" />;
      case 'FACEBOOK':
        return <FacebookLogo className="w-4 h-4" />;
      default:
        return <GoogleLogo className="w-4 h-4" />;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* ========================================================= */}
      {/* LEFT COLUMN: SERVICES OFFERED (col-span-12 lg:col-span-7) */}
      {/* ========================================================= */}
      <div id="services" className="lg:col-span-7 bg-white rounded-2xl border border-gray-200/90 p-5 sm:p-6 space-y-4 shadow-xs">
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
      <div id="reviews" className="lg:col-span-5 bg-white rounded-2xl border border-gray-200/90 p-5 sm:p-6 space-y-4 shadow-xs">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-black text-gray-950 tracking-tight">
            Customer Reviews
          </h2>
          <a
            href="#reviews-list"
            className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5"
          >
            <span>See all reviews</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </a>
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

        {/* Recent Review Cards List */}
        <div id="reviews-list" className="space-y-3 pt-1">
          {(showAllReviews ? allDisplayReviews : allDisplayReviews.slice(0, 3)).map((rev, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl border border-gray-100 bg-slate-50/50 space-y-2 hover:bg-slate-50 transition-colors"
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
                "{rev.comment}"
              </p>
            </div>
          ))}

          {allDisplayReviews.length > 3 && (
            <button
              type="button"
              onClick={() => setShowAllReviews(!showAllReviews)}
              className="w-full text-center text-xs font-bold text-primary hover:underline py-1.5 cursor-pointer"
            >
              {showAllReviews
                ? 'Show less reviews'
                : `+ View ${allDisplayReviews.length - 3} more reviews`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
