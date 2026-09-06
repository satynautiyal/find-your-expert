'use client';

import { useState } from 'react';
import {
  Camera,
  Heart,
  CreditCard,
  ArrowRight,
  MapPin,
} from 'lucide-react';
import type { RooferProvider } from '@/data/mockRoofers';
import {
  EButton,
  EBadge,
  ECard,
  EStarRating,
} from '@/components/EComponents';

export interface ProviderCardProps {
  provider: RooferProvider;
  rank: number;
  isCompared: boolean;
  onToggleCompare: (id: string) => void;
  onOpenQuoteModal: (provider: RooferProvider) => void;
  onOpenCostGuide: () => void;
}

export default function ProviderCard({
  provider,
  rank,
  isCompared,
  onToggleCompare,
  onOpenQuoteModal,
  onOpenCostGuide,
}: ProviderCardProps) {
  const [readMore, setReadMore] = useState(false);

  // Full title string
  const fullTitle = provider.tagline
    ? `${provider.name} – ${provider.tagline}`
    : provider.name;

  return (
    <ECard variant="listing">
      <div className="p-4 sm:p-5 flex flex-col xl:flex-row gap-5 items-stretch">
        {/* Col 1: Photo & Badges */}
        <div className="relative w-full xl:w-[250px] h-48 xl:h-[220px] rounded-lg overflow-hidden shrink-0 bg-gray-100">
          <img
            src={provider.imageUrl}
            alt={provider.name}
            className="w-full h-full object-cover"
          />

          {/* Rank Badge top-left (Vibrant brand orange square) */}
          <div className="absolute top-2.5 left-2.5">
            <EBadge variant="rank">{rank}</EBadge>
          </div>

          {/* Photos pill bottom-left */}
          <div className="absolute bottom-2.5 left-2.5">
            <EBadge variant="photoCount" icon={<Camera className="w-3 h-3 mr-1" />}>
              {provider.photoCount} Photos
            </EBadge>
          </div>
        </div>

        {/* Col 2: Company Details & Bio */}
        <div className="flex-1 flex flex-col justify-between space-y-2.5 min-w-0 pr-0 xl:pr-2">
          <div className="space-y-2">
            {/* Title */}
            <h2
              onClick={() => onOpenQuoteModal(provider)}
              className="text-base sm:text-[17px] font-bold text-gray-950 hover:text-[#F15A24] transition-colors leading-snug cursor-pointer"
            >
              {fullTitle}
            </h2>

            {/* Subtitle / Verification & Location */}
            <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
              <EBadge variant="verified">Verified</EBadge>
              <span className="inline-flex items-center gap-1 text-gray-600">
                <MapPin className="w-3 h-3 text-gray-400" />
                <span>{provider.address}</span>
              </span>
              <span className="inline-flex items-center gap-1 text-gray-600">
                <MapPin className="w-3 h-3 text-gray-400" />
                <span>{provider.servesArea || 'Serves New York, NY'}</span>
              </span>
            </div>

            {/* Service Tags */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {provider.services.slice(0, 3).map((service) => (
                <EBadge key={service} variant="service">
                  {service}
                </EBadge>
              ))}
              {provider.services.length > 3 && (
                <EBadge variant="counter">
                  +{provider.services.length - 3} more
                </EBadge>
              )}
            </div>

            {/* Description */}
            <p className="text-xs text-gray-600 leading-relaxed pt-1">
              {provider.description}
            </p>
            <div>
              <EButton
                variant="link"
                size="sm"
                onClick={() => onOpenQuoteModal(provider)}
                iconRight={<ArrowRight className="w-3 h-3" />}
              >
                Read more
              </EButton>
            </div>
          </div>
        </div>

        {/* Col 3: Feedback Score, Typical Range, Financing & CTAs */}
        <div className="xl:w-[460px] shrink-0 flex flex-col justify-between border-t xl:border-t-0 xl:border-l border-gray-100 pt-4 xl:pt-0 xl:pl-5 space-y-4">
          {/* Top Section: Feedback Score & Typical Price Range */}
          <div className="relative">
            {/* Heart Save Button top-right */}
            <button
              onClick={() => onToggleCompare(provider.id)}
              className="absolute top-0 right-0 p-1 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
              title={isCompared ? 'Saved' : 'Save'}
            >
              <Heart
                className={`w-4 h-4 ${
                  isCompared ? 'fill-[#F15A24] text-[#F15A24]' : 'text-gray-400'
                }`}
              />
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pr-6">
              {/* Customer Feedback Score */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Customer Feedback Score
                </div>
                <EStarRating
                  rating={provider.compositeRating}
                  totalReviews={provider.totalReviews}
                  size="md"
                />

                {/* Sub breakdown platforms */}
                <div className="space-y-1 text-[11px] pt-1 text-gray-600">
                  <div className="flex items-center justify-between">
                    <span className="text-blue-600 font-medium">Google</span>
                    <EStarRating
                      rating={provider.reviews.google.rating}
                      totalReviews={provider.reviews.google.count}
                      size="xs"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-red-600 font-medium">Yelp</span>
                    <EStarRating
                      rating={provider.reviews.yelp.rating}
                      totalReviews={provider.reviews.yelp.count}
                      size="xs"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-indigo-600 font-medium">Facebook</span>
                    <EStarRating
                      rating={provider.reviews.facebook.rating}
                      totalReviews={provider.reviews.facebook.count}
                      size="xs"
                    />
                  </div>
                </div>
              </div>

              {/* Typical Project Range */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Typical Project Range
                </div>
                <div className="text-base font-black text-gray-950">
                  {provider.typicalPriceRange}
                </div>
                <div>
                  <button
                    onClick={onOpenCostGuide}
                    className="text-[10px] font-medium text-gray-500 hover:text-gray-900 inline-flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>View exact quotes</span>
                    <ArrowRight className="w-2.5 h-2.5 text-[#F15A24]" />
                  </button>
                </div>

                {/* 4 Badges */}
                <div className="flex flex-wrap gap-1 pt-1.5">
                  <EBadge variant="credential">Licensed</EBadge>
                  <EBadge variant="credential">Insured</EBadge>
                  <EBadge variant="credential">Bonded</EBadge>
                  <EBadge variant="credential">Warranty</EBadge>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Section: Financing Banner & Two Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            {/* Financing Box */}
            <ECard variant="financing" className="flex-1 min-w-0">
              <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                <CreditCard className="w-3.5 h-3.5 text-[#F15A24]" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-gray-900 leading-tight">
                  Financing Available
                </div>
                <div className="text-[10px] text-gray-500 truncate leading-tight">
                  Low monthly payment options
                </div>
              </div>
            </ECard>

            {/* Buttons: View Profile & Get Quote */}
            <div className="flex items-center gap-2 shrink-0">
              <EButton
                variant="outline"
                size="md"
                onClick={() => onOpenQuoteModal(provider)}
              >
                View Profile
              </EButton>
              <EButton
                variant="primary"
                size="md"
                onClick={() => onOpenQuoteModal(provider)}
              >
                Get Quote / Contact
              </EButton>
            </div>
          </div>
        </div>
      </div>
    </ECard>
  );
}
