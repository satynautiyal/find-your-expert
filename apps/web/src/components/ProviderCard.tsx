'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Heart,
  ChevronDown,
  MapPin,
  Check,
  Star,
  Clock,
  ArrowRight,
} from 'lucide-react';
import type { RooferProvider } from '@/data/mockRoofers';
import { EButton } from '@/components/EComponents';

export interface ProviderCardProps {
  provider: RooferProvider;
  rank: number;
  isCompared: boolean;
  onToggleCompare: (id: string) => void;
  onOpenQuoteModal: (provider: RooferProvider) => void;
  onOpenCostGuide?: () => void;
}

const HOUSE_PROJECT_PHOTOS = [
  '/roofing-hero-house.jpg',
  '/services/roof-replacement.jpg',
  '/services/roof-repair.jpg',
  '/services/roof-inspection.jpg',
  '/services/storm-damage.jpg',
  '/services/shingle-roofing.jpg',
  '/services/metal-roofing.jpg',
];

export default function ProviderCard({
  provider,
  rank,
  isCompared,
  onToggleCompare,
  onOpenQuoteModal,
}: ProviderCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Trust score calculation
  const trustScore = Math.min(
    98,
    Math.max(82, Math.round((provider.compositeRating || 4.8) * 18.5 + (provider.yearsInBusiness > 10 ? 3 : 1)))
  );

  const defaultServices =
    provider.services && provider.services.length > 0
      ? provider.services.slice(0, 3)
      : ['Roof Replacement', 'Roof Repair', 'Storm Damage'];

  // Project house photo on the left (rotating realistic residential roofing project photos)
  const projectPhoto =
    HOUSE_PROJECT_PHOTOS[(rank - 1) % HOUSE_PROJECT_PHOTOS.length];

  // Web reviews data
  const googleRating = provider.reviews?.google?.rating || 4.8;
  const googleCount = provider.reviews?.google?.count || 89;
  const yelpRating = provider.reviews?.yelp?.rating || 4.6;
  const yelpCount = provider.reviews?.yelp?.count || 24;
  const houzzRating = provider.reviews?.facebook?.rating || 4.7;
  const houzzCount = provider.reviews?.facebook?.count || 13;

  return (
    <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* 1. Top Card Area */}
      <div className="p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 items-start lg:items-center justify-between">
          {/* Left Block: House Photo + Company Details */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-start flex-1 min-w-0">
            {/* Col 1: Real Residential Roof Project Photo with Rank Badge */}
            <div className="relative w-full sm:w-44 md:w-48 lg:w-52 h-36 sm:h-34 rounded-xl overflow-hidden shrink-0 bg-gray-100 group">
              <img
                src={projectPhoto}
                alt={`${provider.name} Roofing Project`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />

              {/* Rank Badge on top-left of image */}
              <div className="absolute top-2 left-2 bg-[#0B3B2C] text-white text-[11px] font-bold px-2 py-0.5 rounded-md shadow-xs z-10">
                #{rank}
              </div>
            </div>

            {/* Col 2: Business Info & Ratings */}
            <div className="space-y-1.5 min-w-0 flex-1">
              {/* Company Logo + Name */}
              <div className="flex items-center gap-2.5">
                {/* Logo from Cloudflare R2 / DB or fallback roof peak mark */}
                {provider.imageUrl ? (
                  <img
                    src={provider.imageUrl}
                    alt={provider.name}
                    className="w-7 h-7 object-contain rounded shrink-0 bg-white border border-gray-100 p-0.5"
                  />
                ) : (
                  <div className="w-7 h-7 flex items-center justify-center shrink-0">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#DA5F2F"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-6 h-6"
                    >
                      <path d="M3 11L12 3L21 11" />
                      <path d="M6 14L12 9L18 14" />
                    </svg>
                  </div>
                )}

                <Link
                  href={`/contractors/${provider.slug}`}
                  className="text-base sm:text-[17px] font-bold text-[#111827] hover:text-[#DA5F2F] transition-colors leading-tight truncate"
                >
                  {provider.name}
                </Link>
              </div>

              {/* Verified Professional Pill */}
              <div className="pt-0.5">
                <span className="inline-flex items-center gap-1 bg-[#EBF7F2] text-[#0B3B2C] text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                  <Check className="w-3 h-3 stroke-[2.5]" />
                  <span>Verified Professional</span>
                </span>
              </div>

              {/* Rating Stars + Reviews Count */}
              <div className="flex items-center gap-2 pt-0.5">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className="w-3.5 h-3.5 text-[#DA5F2F] fill-[#DA5F2F]"
                    />
                  ))}
                </div>
                <span className="text-xs font-bold text-[#111827]">
                  {provider.compositeRating?.toFixed(1) || '4.8'}
                </span>
                <span className="text-xs text-[#5A6578]">
                  {provider.totalReviews || 128} reviews
                </span>
              </div>

              {/* Service Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {defaultServices.map((service, idx) => (
                  <span
                    key={service}
                    className="bg-[#F3F4F6] text-[#374151] text-[11px] font-medium px-2.5 py-1 rounded-md flex items-center gap-1"
                  >
                    <span>{service}</span>
                    {idx === 1 && <ChevronDown className="w-3 h-3 text-gray-400" />}
                  </span>
                ))}
              </div>

              {/* Metadata: Years in business + Location */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-[#5A6578] pt-1 font-normal">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  <span>{provider.yearsInBusiness || 15}+ years in business</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  <span>{provider.servesArea || 'Birmingham + surrounding areas'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Block: Trust Score + Checklist + Action Buttons */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 pt-3 lg:pt-0 border-t lg:border-t-0 border-gray-100 w-full lg:w-auto shrink-0">
            {/* Trust Score & Checklist */}
            <div className="flex items-center gap-4">
              {/* Trust Score Box */}
              <div className="bg-[#EBF7F2] rounded-xl px-4 py-2.5 text-center shrink-0 min-w-[76px]">
                <div className="text-[10px] font-bold text-[#0B3B2C]/75 capitalize tracking-tight">
                  Trust Score
                </div>
                <div className="text-3xl font-black text-[#0B3B2C] leading-none mt-1">
                  {trustScore}
                </div>
              </div>

              {/* Verified Checklist */}
              <div className="space-y-1.5 text-xs text-[#374151]">
                <div className="flex items-center gap-2 font-medium">
                  <Check className="w-3.5 h-3.5 text-[#0B3B2C] stroke-[2.5]" />
                  <span>License Verified</span>
                </div>
                <div className="flex items-center gap-2 font-medium">
                  <Check className="w-3.5 h-3.5 text-[#0B3B2C] stroke-[2.5]" />
                  <span>Insurance Verified</span>
                </div>
                <div className="flex items-center gap-2 font-medium">
                  <Check className="w-3.5 h-3.5 text-[#0B3B2C] stroke-[2.5]" />
                  <span>Free Estimates</span>
                </div>
              </div>
            </div>

            {/* Action Buttons & Expand Chevron */}
            <div className="flex items-start gap-2 pl-0 sm:pl-4 border-l-0 sm:border-l border-gray-100 w-full sm:w-auto">
              <div className="w-full sm:w-32 md:w-36 flex flex-col gap-2">
                <Link href={`/contractors/${provider.slug}`} className="w-full">
                  <EButton variant="secondary" size="md" className="w-full font-semibold">
                    View Profile
                  </EButton>
                </Link>

                <EButton
                  variant="primary"
                  size="md"
                  className="w-full font-semibold"
                  onClick={() => onOpenQuoteModal(provider)}
                >
                  Get a Quote
                </EButton>

                <button
                  type="button"
                  onClick={() => onToggleCompare(provider.id)}
                  className="inline-flex items-center justify-center gap-1.5 text-xs text-[#111827] hover:border-gray-300 border border-gray-200 bg-white rounded-lg py-1.5 px-3 transition-colors cursor-pointer font-medium shadow-2xs"
                >
                  <Heart
                    className={`w-3.5 h-3.5 text-[#DA5F2F] ${
                      isCompared ? 'fill-[#DA5F2F]' : ''
                    }`}
                  />
                  <span>Save</span>
                </button>
              </div>

              {/* Chevron Collapse Toggle on far right */}
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-gray-400 hover:text-gray-600 p-1 transition-colors hidden sm:block cursor-pointer"
                title={isExpanded ? 'Collapse' : 'Expand'}
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

      {/* 2. Expandable Bottom Details: About, Address + Mini Map, Web Reviews */}
      {isExpanded && (
        <div className="border-t border-gray-100 bg-[#FCFDFB] p-4 sm:p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100 gap-4 md:gap-6">
            {/* Col 1: About the Contractor */}
            <div className="space-y-1.5 pr-0 md:pr-4">
              <h3 className="text-xs font-bold text-[#111827]">
                About {provider.name}
              </h3>
              <p className="text-[11px] sm:text-xs text-[#5A6578] leading-relaxed line-clamp-3">
                {provider.description ||
                  `${provider.name} has been serving homeowners in Alabama for over 15 years, specializing in roof replacement, repairs and storm damage. Known for quality workmanship and reliable service.`}
              </p>
              <div className="pt-0.5">
                <Link
                  href={`/contractors/${provider.slug}`}
                  className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-[#DA5F2F] hover:underline"
                >
                  <span>Read more</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* Col 2: Address & Realistic Mini Map Graphic */}
            <div className="space-y-1.5 pt-3 md:pt-0 px-0 md:px-4">
              <h3 className="text-xs font-bold text-[#111827]">Address</h3>
              <div className="flex items-start gap-1.5 text-[11px] sm:text-xs text-[#5A6578]">
                <MapPin className="w-3.5 h-3.5 text-[#DA5F2F] shrink-0 mt-0.5" />
                <span className="truncate">
                  {provider.address || '1234 Oak Mountain Dr, Birmingham, AL 35242'}
                </span>
              </div>

              {/* Realistic Mini Map Graphic */}
              <div className="h-16 w-full max-w-[220px] rounded-xl overflow-hidden relative border border-gray-200/80 bg-[#EAE9E6] shadow-2xs">
                <img
                  src="/mini-map-tile.svg"
                  alt="Location Map Preview"
                  className="w-full h-full object-cover select-none pointer-events-none"
                />
              </div>
            </div>

            {/* Col 3: Reviews from around the web */}
            <div className="space-y-2 pt-3 md:pt-0 pl-0 md:pl-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-[#111827]">
                    Reviews from around the web
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                </div>

                {/* Review breakdown rows in exact grid alignment */}
                <div className="space-y-2 text-xs">
                  {/* 1. Google */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {/* Official Google G Logo */}
                      <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0">
                        <path
                          fill="#4285F4"
                          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                        />
                      </svg>
                      {/* 5 Orange Stars */}
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star
                            key={i}
                            className="w-3 h-3 text-[#DA5F2F] fill-[#DA5F2F]"
                          />
                        ))}
                      </div>
                      {/* Score */}
                      <span className="font-bold text-[#111827] text-xs">
                        {googleRating.toFixed(1)}
                      </span>
                    </div>
                    <span className="text-xs text-[#5A6578]">
                      {googleCount} reviews
                    </span>
                  </div>

                  {/* 2. Yelp */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {/* Official Yelp Red Burst Icon */}
                      <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0">
                        <rect width="24" height="24" rx="4" fill="#D32323" />
                        <path
                          fill="#FFFFFF"
                          d="M12 12.8l2.6 3.6c.2.3.6.4.9.2l1.2-.8c.3-.2.4-.6.2-.9l-3.1-3.2 4.2-1.3c.4-.1.6-.5.5-.9l-.4-1.4c-.1-.4-.5-.6-.9-.5l-4.2 1.7 1.1-4.3c.1-.4-.2-.8-.6-.9l-1.4-.4c-.4-.1-.8.2-.9.6l-1.5 4.2-3.2-3c-.3-.3-.7-.2-.9.1l-.9 1.1c-.2.3-.2.7.1.9l3.5 2.6-4.3 1.2c-.4.1-.6.5-.5.9l.4 1.4c.1.4.5.6.9.5l4.3-1.4-1.2 4.3c-.1.4.2.8.6.9l1.4.4c.4.1.8-.2.9-.6l1.3-4.3z"
                        />
                      </svg>
                      {/* 4.5 Stars */}
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4].map((i) => (
                          <Star
                            key={i}
                            className="w-3 h-3 text-[#DA5F2F] fill-[#DA5F2F]"
                          />
                        ))}
                        <Star className="w-3 h-3 text-gray-200 fill-gray-200" />
                      </div>
                      {/* Score */}
                      <span className="font-bold text-[#111827] text-xs">
                        {yelpRating.toFixed(1)}
                      </span>
                    </div>
                    <span className="text-xs text-[#5A6578]">
                      {yelpCount} reviews
                    </span>
                  </div>

                  {/* 3. Houzz */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {/* Official Houzz 'h' Icon */}
                      <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0">
                        <rect width="24" height="24" rx="4" fill="#3FB87F" />
                        <path
                          fill="#FFFFFF"
                          d="M7 6h3v4.5h4V6h3v12h-3v-4.5h-4V18H7V6z"
                        />
                      </svg>
                      {/* 5 Stars */}
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star
                            key={i}
                            className="w-3 h-3 text-[#DA5F2F] fill-[#DA5F2F]"
                          />
                        ))}
                      </div>
                      {/* Score */}
                      <span className="font-bold text-[#111827] text-xs">
                        {houzzRating.toFixed(1)}
                      </span>
                    </div>
                    <span className="text-xs text-[#5A6578]">
                      {houzzCount} reviews
                    </span>
                  </div>
                </div>
              </div>

              {/* View all reviews link */}
              <div className="text-right pt-1">
                <Link
                  href={`/contractors/${provider.slug}`}
                  className="text-xs font-semibold text-[#DA5F2F] hover:underline"
                >
                  View all reviews &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
