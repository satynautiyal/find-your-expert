'use client';

import React from 'react';
import {
  Star,
  Award,
  ShieldCheck,
  Home,
  X,
  Sparkles,
} from 'lucide-react';
import DropdownSelect from '@/components/common/DropdownSelect';

export interface ContractorFilterToolbarProps {
  currentService: string;
  currentLocation: string;
  sortBy: string;
  onSortByChange: (sort: 'rating' | 'reviews' | 'experience' | 'fast-response') => void;
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
  dynamicServices,
  projectType,
  onProjectTypeChange,
  minRating,
  onMinRatingChange,
  minExperience,
  onMinExperienceChange,
  verifiedOnly,
  onVerifiedOnlyChange,
  onResetFilters,
  hasActiveFilters,
}: ContractorFilterToolbarProps) {
  const isCabinets =
    currentService.toLowerCase().includes('cabinet') ||
    currentService.toLowerCase().includes('shelv') ||
    currentService.toLowerCase().includes('vanit') ||
    currentService.toLowerCase().includes('closet') ||
    currentService.toLowerCase().includes('millwork');

  const cleanDynamicServices = (dynamicServices || []).filter(
    (s) => s && s !== 'All Services' && s !== 'All'
  );
  const projectTypeOptions = [
    { label: 'All Services', value: 'All' },
    ...cleanDynamicServices.map((s) => ({ label: s, value: s })),
  ];

  const sortOptions = [
    { label: 'Top Rated & Recommended', value: 'rating' },
    { label: 'Most Reviews', value: 'reviews' },
    { label: 'Years in Business', value: 'experience' },
    { label: 'Fast Response', value: 'fast-response' },
  ];

  const ratingOptions = [
    { label: 'Any Rating', value: 0 },
    { label: '4.0+ Stars', value: 4.0 },
    { label: '4.5+ Stars', value: 4.5 },
    { label: '4.8+ Stars', value: 4.8 },
  ];

  const experienceOptions = [
    { label: 'Any Experience', value: 0 },
    { label: '5+ Years in Business', value: 5 },
    { label: '10+ Years in Business', value: 10 },
    { label: '15+ Years in Business', value: 15 },
    { label: '20+ Years in Business', value: 20 },
  ];

  const verifiedOptions = [
    { label: 'All Contractors', value: 'false' },
    { label: '100% Verified Only', value: 'true' },
  ];

  return (
    <div className="space-y-4">
      {/* Title & Subtitle + Sort by Dropdown */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-[26px] md:text-[28px] font-bold text-[#111827] tracking-tight leading-tight">
            {currentService} in {currentLocation}
          </h2>
          <p className="mt-1 text-xs sm:text-[13px] text-[#5A6578] font-normal">
            Compare vetted {currentService.toLowerCase()} professionals by Vetted Score, reputation, project portfolio, and verified customer reviews.
          </p>
        </div>

        {/* Sort by Dropdown */}
        <div className="flex items-center gap-2 self-start sm:self-end shrink-0">
          <span className="text-xs text-[#5A6578] font-medium">Sort by:</span>
          <DropdownSelect
            value={sortBy}
            onChange={(v) => onSortByChange(v as any)}
            options={sortOptions}
            ariaLabel="Sort contractors"
            align="right"
          />
        </div>
      </div>

      {/* Filter Dropdown Pills Row */}
      <div className="flex items-center gap-2 sm:gap-2.5 pt-1 overflow-x-auto no-scrollbar pb-1 sm:pb-0 sm:flex-wrap">
        {/* Filter 1: Service / Project Type */}
        <DropdownSelect
          value={projectType}
          onChange={onProjectTypeChange}
          options={projectTypeOptions}
          ariaLabel="Filter by project type"
          icon={
            isCabinets ? (
              <Sparkles className="w-3.5 h-3.5" />
            ) : (
              <Home className="w-3.5 h-3.5" />
            )
          }
          triggerClassName="font-medium text-[#374151]"
        />

        {/* Filter 2: Rating */}
        <DropdownSelect
          value={minRating}
          onChange={(v) => onMinRatingChange(Number(v))}
          options={ratingOptions}
          ariaLabel="Filter by rating"
          icon={<Star className="w-3.5 h-3.5" />}
          triggerClassName="font-medium text-[#374151]"
        />

        {/* Filter 3: Experience */}
        <DropdownSelect
          value={minExperience}
          onChange={(v) => onMinExperienceChange(Number(v))}
          options={experienceOptions}
          ariaLabel="Filter by experience"
          icon={<Award className="w-3.5 h-3.5" />}
          triggerClassName="font-medium text-[#374151]"
        />

        {/* Filter 4: Verified Status */}
        <DropdownSelect
          value={verifiedOnly ? 'true' : 'false'}
          onChange={(v) => onVerifiedOnlyChange(v === 'true')}
          options={verifiedOptions}
          ariaLabel="Filter by verification status"
          icon={<ShieldCheck className="w-3.5 h-3.5" />}
          triggerClassName="font-medium text-[#374151]"
        />

        {/* Reset Filters Pill */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#DA5F2F] hover:bg-[#DA5F2F]/10 border border-[#DA5F2F]/30 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
          >
            <X className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        )}
      </div>
    </div>
  );
}
