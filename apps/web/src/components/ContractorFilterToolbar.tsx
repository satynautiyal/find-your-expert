'use client';

import React from 'react';
import {
  ChevronDown,
  Layers,
  Home,
  Star,
  Award,
  ShieldCheck,
  MapPin,
  X,
} from 'lucide-react';

export interface ContractorFilterToolbarProps {
  currentService: string;
  currentLocation: string;
  sortBy: string;
  onSortByChange: (sort: 'rating' | 'reviews' | 'experience') => void;
  selectedService: string;
  onSelectService: (service: string) => void;
  dynamicServices?: string[];
  roofType: string;
  onRoofTypeChange: (type: string) => void;
  minRating: number;
  onMinRatingChange: (rating: number) => void;
  minExperience: number;
  onMinExperienceChange: (exp: number) => void;
  verifiedOnly: boolean;
  onVerifiedOnlyChange: (verified: boolean) => void;
  distance: string;
  onDistanceChange: (dist: string) => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
}

export default function ContractorFilterToolbar({
  currentService,
  currentLocation,
  sortBy,
  onSortByChange,
  selectedService,
  onSelectService,
  dynamicServices,
  roofType,
  onRoofTypeChange,
  minRating,
  onMinRatingChange,
  minExperience,
  onMinExperienceChange,
  verifiedOnly,
  onVerifiedOnlyChange,
  distance,
  onDistanceChange,
  onResetFilters,
  hasActiveFilters,
}: ContractorFilterToolbarProps) {
  const serviceOptions = dynamicServices && dynamicServices.length > 0
    ? ['All Roofing Services', ...dynamicServices.filter(s => s !== 'All Services')]
    : [
        'All Roofing Services',
        'Roof Replacement',
        'Roof Repair',
        'Roof Inspection',
        'Storm Damage',
        'Shingle Roofing',
        'Metal Roofing',
      ];

  return (
    <div className="space-y-4">
      {/* Title & Subtitle + Sort by Dropdown */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-[26px] md:text-[28px] font-bold text-[#111827] tracking-tight leading-tight">
            {currentService} Contractors in {currentLocation}
          </h2>
          <p className="mt-1 text-xs sm:text-[13px] text-[#5A6578] font-normal">
            Compare local {currentService.toLowerCase()} professionals by reputation, experience, services, credentials and customer feedback.
          </p>
        </div>

        {/* Sort by: [ Recommended ⌵ ] */}
        <div className="flex items-center gap-2 self-start sm:self-end shrink-0">
          <span className="text-xs text-[#5A6578] font-medium">Sort by:</span>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value as any)}
              aria-label="Sort contractors"
              className="appearance-none bg-white border border-gray-200 hover:border-gray-300 rounded-lg px-3 py-1.5 pr-7 text-xs font-semibold text-[#111827] shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#DA5F2F]/20 focus:border-[#DA5F2F]"
            >
              <option value="rating">Recommended</option>
              <option value="rating">Top Rated</option>
              <option value="reviews">Most Reviews</option>
              <option value="experience">Years in Business</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 6 Filter Dropdown Pills Row */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 pt-1">
        {/* Filter 1: Services */}
        <div className="relative">
          <select
            value={selectedService === 'All' || selectedService === 'All Services' ? 'All Roofing Services' : selectedService}
            onChange={(e) => {
              const val = e.target.value;
              onSelectService(val === 'All Roofing Services' ? 'All Services' : val);
            }}
            aria-label="Filter by roofing service"
            className="appearance-none bg-white border border-gray-200 hover:border-gray-300 rounded-lg pl-8 pr-7 py-1.5 text-xs font-medium text-[#374151] shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#DA5F2F]/20 focus:border-[#DA5F2F]"
          >
            {serviceOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <Layers className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Filter 2: Roof Types */}
        <div className="relative">
          <select
            value={roofType}
            onChange={(e) => onRoofTypeChange(e.target.value)}
            aria-label="Filter by roof type"
            className="appearance-none bg-white border border-gray-200 hover:border-gray-300 rounded-lg pl-8 pr-7 py-1.5 text-xs font-medium text-[#374151] shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#DA5F2F]/20 focus:border-[#DA5F2F]"
          >
            <option value="All">All Roof Types</option>
            <option value="Asphalt Shingle">Asphalt Shingles</option>
            <option value="Metal">Metal Roofing</option>
            <option value="Flat">Flat Roof Systems</option>
            <option value="Tile">Slate &amp; Tile</option>
          </select>
          <Home className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Filter 3: Rating */}
        <div className="relative">
          <select
            value={minRating}
            onChange={(e) => onMinRatingChange(Number(e.target.value))}
            aria-label="Filter by rating"
            className="appearance-none bg-white border border-gray-200 hover:border-gray-300 rounded-lg pl-8 pr-7 py-1.5 text-xs font-medium text-[#374151] shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#DA5F2F]/20 focus:border-[#DA5F2F]"
          >
            <option value={0}>Any Rating</option>
            <option value={4.0}>4.0+ Rating</option>
            <option value={4.5}>4.5+ Rating</option>
            <option value={4.8}>4.8+ Rating</option>
          </select>
          <Star className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Filter 4: Experience */}
        <div className="relative">
          <select
            value={minExperience}
            onChange={(e) => onMinExperienceChange(Number(e.target.value))}
            aria-label="Filter by experience"
            className="appearance-none bg-white border border-gray-200 hover:border-gray-300 rounded-lg pl-8 pr-7 py-1.5 text-xs font-medium text-[#374151] shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#DA5F2F]/20 focus:border-[#DA5F2F]"
          >
            <option value={0}>Any Years</option>
            <option value={5}>5+ Years</option>
            <option value={10}>10+ Years</option>
            <option value={15}>15+ Years</option>
            <option value={20}>20+ Years</option>
          </select>
          <Award className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Filter 5: Verified */}
        <div className="relative">
          <select
            value={verifiedOnly ? 'true' : 'false'}
            onChange={(e) => onVerifiedOnlyChange(e.target.value === 'true')}
            aria-label="Filter by verification status"
            className="appearance-none bg-white border border-gray-200 hover:border-gray-300 rounded-lg pl-8 pr-7 py-1.5 text-xs font-medium text-[#374151] shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#DA5F2F]/20 focus:border-[#DA5F2F]"
          >
            <option value="false">All Contractors</option>
            <option value="true">Verified Only</option>
          </select>
          <ShieldCheck className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Filter 6: Distance */}
        <div className="relative">
          <select
            value={distance}
            onChange={(e) => onDistanceChange(e.target.value)}
            aria-label="Filter by distance"
            className="appearance-none bg-white border border-gray-200 hover:border-gray-300 rounded-lg pl-8 pr-7 py-1.5 text-xs font-medium text-[#374151] shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#DA5F2F]/20 focus:border-[#DA5F2F]"
          >
            <option value="All Areas">All Areas</option>
            <option value="Within 10 miles">Within 10 miles</option>
            <option value="Within 25 miles">Within 25 miles</option>
            <option value="Within 50 miles">Within 50 miles</option>
          </select>
          <MapPin className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Reset Filters Pill (if any filter is active) */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#DA5F2F] hover:bg-[#DA5F2F]/10 border border-[#DA5F2F]/30 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        )}
      </div>
    </div>
  );
}
