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
  Sparkles,
} from 'lucide-react';

export interface ContractorFilterToolbarProps {
  currentService: string;
  currentLocation: string;
  sortBy: string;
  onSortByChange: (sort: 'rating' | 'reviews' | 'experience') => void;
  selectedService: string;
  onSelectService: (service: string) => void;
  dynamicServices?: string[];
  projectType: string;
  onProjectTypeChange: (type: string) => void;
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
  projectType,
  onProjectTypeChange,
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
  const isCabinets = currentService.toLowerCase().includes('cabinet') ||
    currentService.toLowerCase().includes('shelv') ||
    currentService.toLowerCase().includes('vanit') ||
    currentService.toLowerCase().includes('closet');

  // Dynamic Service Dropdown Options
  const serviceOptions = dynamicServices && dynamicServices.length > 0
    ? ['All Services', ...dynamicServices.filter(s => s !== 'All Services' && s !== 'All')]
    : isCabinets
    ? [
        'All Services',
        'Custom Cabinets',
        'Kitchen Cabinetry',
        'Built-In Shelving',
        'Bathroom Vanities',
        'Custom Closets',
        'Architectural Millwork',
      ]
    : [
        'All Services',
        'Roof Installation',
        'Repair',
        'Flat Roof Systems',
        'Waterproofing',
        'Gutter Installation',
        'Inspection',
      ];

  // Dynamic Project Type Options based on trade
  const projectTypeOptions = isCabinets
    ? [
        { label: 'All Cabinet Types', value: 'All' },
        { label: 'Kitchen Cabinets', value: 'Kitchen' },
        { label: 'Built-In Shelving', value: 'Shelving' },
        { label: 'Bathroom Vanities', value: 'Vanities' },
        { label: 'Custom Closets', value: 'Closet' },
        { label: 'Architectural Millwork', value: 'Millwork' },
      ]
    : [
        { label: 'All Roof Types', value: 'All' },
        { label: 'Flat Roof Systems', value: 'Flat' },
        { label: 'Asphalt Shingle', value: 'Shingle' },
        { label: 'Waterproofing', value: 'Waterproof' },
        { label: 'Metal Roofing', value: 'Metal' },
        { label: 'Gutter Systems', value: 'Gutter' },
      ];

  return (
    <div className="space-y-4">
      {/* Title & Subtitle + Sort by Dropdown */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-[26px] md:text-[28px] font-bold text-[#111827] tracking-tight leading-tight">
            {currentService} in {currentLocation}
          </h2>
          <p className="mt-1 text-xs sm:text-[13px] text-[#5A6578] font-normal">
            Compare licensed and vetted {currentService.toLowerCase()} professionals in New York by reputation, verified credentials, portfolio, and verified reviews.
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
              className="appearance-none bg-white border border-gray-200 hover:border-gray-300 rounded-lg px-3 py-1.5 pr-7 text-xs font-semibold text-[#111827] shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0F3E35]/20 focus:border-[#0F3E35]"
            >
              <option value="rating">Top Rated &amp; Recommended</option>
              <option value="reviews">Most Reviews</option>
              <option value="experience">Years in Business</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Filter Dropdown Pills Row */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 pt-1">
        {/* Filter 1: Services */}
        <div className="relative">
          <select
            value={selectedService === 'All' ? 'All Services' : selectedService}
            onChange={(e) => {
              const val = e.target.value;
              onSelectService(val);
            }}
            aria-label="Filter by service"
            className="appearance-none bg-white border border-gray-200 hover:border-gray-300 rounded-lg pl-8 pr-7 py-1.5 text-xs font-medium text-[#374151] shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0F3E35]/20 focus:border-[#0F3E35]"
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

        {/* Filter 2: Project / Material Type (Context-Aware) */}
        <div className="relative">
          <select
            value={projectType}
            onChange={(e) => onProjectTypeChange(e.target.value)}
            aria-label="Filter by project type"
            className="appearance-none bg-white border border-gray-200 hover:border-gray-300 rounded-lg pl-8 pr-7 py-1.5 text-xs font-medium text-[#374151] shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0F3E35]/20 focus:border-[#0F3E35]"
          >
            {projectTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {isCabinets ? (
            <Sparkles className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          ) : (
            <Home className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          )}
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Filter 3: Rating */}
        <div className="relative">
          <select
            value={minRating}
            onChange={(e) => onMinRatingChange(Number(e.target.value))}
            aria-label="Filter by rating"
            className="appearance-none bg-white border border-gray-200 hover:border-gray-300 rounded-lg pl-8 pr-7 py-1.5 text-xs font-medium text-[#374151] shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0F3E35]/20 focus:border-[#0F3E35]"
          >
            <option value={0}>Any Rating</option>
            <option value={4.0}>4.0+ Stars</option>
            <option value={4.5}>4.5+ Stars</option>
            <option value={4.8}>4.8+ Stars</option>
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
            className="appearance-none bg-white border border-gray-200 hover:border-gray-300 rounded-lg pl-8 pr-7 py-1.5 text-xs font-medium text-[#374151] shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0F3E35]/20 focus:border-[#0F3E35]"
          >
            <option value={0}>Any Experience</option>
            <option value={5}>5+ Years in Business</option>
            <option value={10}>10+ Years in Business</option>
            <option value={15}>15+ Years in Business</option>
            <option value={20}>20+ Years in Business</option>
          </select>
          <Award className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Filter 5: Verified Status */}
        <div className="relative">
          <select
            value={verifiedOnly ? 'true' : 'false'}
            onChange={(e) => onVerifiedOnlyChange(e.target.value === 'true')}
            aria-label="Filter by verification status"
            className="appearance-none bg-white border border-gray-200 hover:border-gray-300 rounded-lg pl-8 pr-7 py-1.5 text-xs font-medium text-[#374151] shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0F3E35]/20 focus:border-[#0F3E35]"
          >
            <option value="false">All Contractors</option>
            <option value="true">100% Verified Only</option>
          </select>
          <ShieldCheck className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Filter 6: Distance / NYC Coverage */}
        <div className="relative">
          <select
            value={distance}
            onChange={(e) => onDistanceChange(e.target.value)}
            aria-label="Filter by coverage distance"
            className="appearance-none bg-white border border-gray-200 hover:border-gray-300 rounded-lg pl-8 pr-7 py-1.5 text-xs font-medium text-[#374151] shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0F3E35]/20 focus:border-[#0F3E35]"
          >
            <option value="All Areas">All 5 NYC Boroughs</option>
            <option value="Within 5 miles">Within 5 miles</option>
            <option value="Within 10 miles">Within 10 miles</option>
            <option value="Within 25 miles">Within 25 miles</option>
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
