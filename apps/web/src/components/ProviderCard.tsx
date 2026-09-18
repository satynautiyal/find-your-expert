'use client';

import { useState } from 'react';
import Link from 'next/link';
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
  buttonVariants,
} from '@/components/EComponents';
import { cn } from '@/lib/utils';

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
  const [imgError, setImgError] = useState(false);

  // Full title string
  const fullTitle = provider.tagline
    ? `${provider.name} – ${provider.tagline}`
    : provider.name;

  return (
    <ECard variant="listing">
      <div className="p-4 sm:p-5 flex flex-col xl:flex-row gap-5 items-stretch">
        {/* Col 1: Photo & Badges (Clickable Link to Profile) */}
        <Link
          href={`/contractors/${provider.slug}`}
          className="relative w-full xl:w-[250px] h-48 xl:h-[220px] rounded-lg overflow-hidden shrink-0 bg-gray-100 block group"
        >
          {provider.imageUrl && !imgError ? (
            <img
              src={provider.imageUrl}
              alt={provider.name}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center text-primary-dark font-black text-3xl">
              {provider.logoText || provider.name.substring(0, 2).toUpperCase()}
            </div>
          )}

          {/* Rank Badge top-left (Vibrant brand orange square) */}
          <div className="absolute top-2.5 left-2.5">
            <EBadge variant="rank">{rank}</EBadge>
          </div>

          {/* Photos pill bottom-left (Only shown if real photos exist) */}
          {provider.photoCount > 0 && (
            <div className="absolute bottom-2.5 left-2.5">
              <EBadge variant="photoCount" icon={<Camera className="w-3 h-3 mr-1" />}>
                {provider.photoCount} {provider.photoCount === 1 ? 'Photo' : 'Photos'}
              </EBadge>
            </div>
          )}
        </Link>

        {/* Col 2: Company Details & Bio */}
        <div className="flex-1 flex flex-col justify-between space-y-2.5 min-w-0 pr-0 xl:pr-2">
          <div className="space-y-2">
            {/* Title (Clickable Link to Profile) */}
            <Link href={`/contractors/${provider.slug}`} className="block group">
              <h2 className="text-base sm:text-[17px] font-bold text-gray-950 group-hover:text-primary transition-colors leading-snug cursor-pointer">
                {fullTitle}
              </h2>
            </Link>

            {/* Subtitle / Verification & Location */}
            <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
              {provider.badge && (
                <EBadge variant="verified">{provider.badge}</EBadge>
              )}
              {provider.address && (
                <span className="inline-flex items-center gap-1 text-gray-600">
                  <MapPin className="w-3 h-3 text-gray-400" />
                  <span>{provider.address}</span>
                </span>
              )}
              {provider.servesArea && (
                <span className="inline-flex items-center gap-1 text-gray-600">
                  <MapPin className="w-3 h-3 text-gray-400" />
                  <span>{provider.servesArea}</span>
                </span>
              )}
            </div>

            {/* Service Tags */}
            {provider.services && provider.services.length > 0 && (
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
            )}

            {/* Description */}
            <p className="text-xs text-gray-600 leading-relaxed pt-1">
              {provider.description}
            </p>
            <div>
              <Link
                href={`/contractors/${provider.slug}`}
                className="text-primary hover:underline p-0 font-semibold inline-flex items-center gap-1 text-xs"
              >
                <span>Read full profile &amp; reviews</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
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
                  isCompared ? 'fill-primary text-primary' : 'text-gray-400'
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
                  {provider.reviews?.google?.count > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-blue-600 font-medium">Google</span>
                      <EStarRating
                        rating={provider.reviews.google.rating}
                        totalReviews={provider.reviews.google.count}
                        size="xs"
                      />
                    </div>
                  )}

                  {provider.reviews?.yelp?.count > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-red-600 font-medium">Yelp</span>
                      <EStarRating
                        rating={provider.reviews.yelp.rating}
                        totalReviews={provider.reviews.yelp.count}
                        size="xs"
                      />
                    </div>
                  )}

                  {provider.reviews?.facebook?.count > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-indigo-600 font-medium">Facebook</span>
                      <EStarRating
                        rating={provider.reviews.facebook.rating}
                        totalReviews={provider.reviews.facebook.count}
                        size="xs"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Typical Price Range & Benchmark */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Typical Project Range
                </div>
                <div className="text-sm font-extrabold text-gray-950">
                  {provider.typicalPriceRange}
                </div>
                <div className="text-[10px] text-gray-500">
                  Based on NYC roofing averages.
                </div>
                <div className="pt-0.5">
                  <button
                    onClick={onOpenCostGuide}
                    className="text-[11px] font-semibold text-primary-dark hover:underline cursor-pointer"
                  >
                    View NYC Cost Benchmark &rarr;
                  </button>
                </div>

                {/* Badges - strictly from database */}
                <div className="flex flex-wrap gap-1 pt-1.5">
                  {provider.isLicensed && <EBadge variant="credential">Licensed</EBadge>}
                  {provider.isInsured && <EBadge variant="credential">Insured</EBadge>}
                  {provider.isBonded && <EBadge variant="credential">Bonded</EBadge>}
                  {provider.hasWarranty && <EBadge variant="credential">Warranty</EBadge>}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Section: Financing Banner & Two Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            {/* Financing Box - only if true in database */}
            {provider.financingAvailable ? (
              <ECard variant="financing" className="flex-1 min-w-0">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <CreditCard className="w-3.5 h-3.5 text-primary-dark" />
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
            ) : (
              <div className="flex-1" />
            )}

            {/* Buttons: View Profile (Direct Link) & Get Quote */}
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/contractors/${provider.slug}`}
                className={cn(buttonVariants({ variant: 'outline', size: 'md' }))}
              >
                View Profile
              </Link>
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
