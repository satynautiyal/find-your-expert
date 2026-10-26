'use client';

import React, { useState } from 'react';
import type { CategoryItem } from '@/lib/api';

export interface ServiceCategoriesSectionProps {
  selectedCategory: string;
  onSelectCategory?: (category: string) => void;
  selectedService: string;
  onSelectService?: (serviceName: string) => void;
  categories?: CategoryItem[];
  companiesCount?: number;
  currentLocation?: string;
}

export default function ServiceCategoriesSection({
  selectedCategory,
  selectedService,
  companiesCount = 10,
  currentLocation = 'New York, NY',
}: ServiceCategoriesSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const activeService =
    selectedService && selectedService !== 'All Services' && selectedService !== 'All'
      ? selectedService
      : selectedCategory || 'Custom Cabinets';

  const isCabinets =
    !activeService ||
    activeService.toLowerCase().includes('cabinet') ||
    activeService.toLowerCase().includes('shelv') ||
    activeService.toLowerCase().includes('vanit') ||
    activeService.toLowerCase().includes('closet') ||
    activeService.toLowerCase().includes('millwork');

  const isRoofing = activeService.toLowerCase().includes('roof');

  const displayServiceTitle =
    selectedService && selectedService !== 'All Services' && selectedService !== 'All'
      ? `${selectedService} Fabricator and Installer`
      : isCabinets
      ? 'Custom Cabinet Fabricator and Installer'
      : isRoofing
      ? 'Roofing and Waterproofing Contractor'
      : `${activeService} Fabricator and Installer`;

  const rawCity = currentLocation.split(',')[0].trim();
  const displayCity =
    rawCity === 'New York' || rawCity === 'All' ? 'New York City' : `${rawCity}, New York City`;

  const displayCount = companiesCount > 0 ? companiesCount : isCabinets ? 10 : 14;

  return (
    <section className="pt-6 sm:pt-8 pb-2">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl border border-gray-200/80 p-5 sm:p-7 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
          {/* SEO Ranking Headline */}
          <h2 className="text-lg sm:text-xl md:text-[22px] font-bold text-[#0F291E] tracking-[-0.015em] leading-[1.32]">
            Top {displayCount} {displayServiceTitle} Companies: {displayCity} – 2025-2026 Ranking
            with Customer Reviews and Mystery Shopper Evaluations
          </h2>

          {/* SEO Copy Content */}
          <div
            className={`mt-2.5 text-xs sm:text-[13.5px] text-[#6B7280] leading-[1.6] font-normal space-y-2.5 ${
              !isExpanded ? 'line-clamp-1' : ''
            }`}
          >
            <p>
              All the companies listed below are the top contractors in {displayCity}, according to
              our ranking. We evaluated their service quality, competitive pricing, and reputation.
              Each company earned its position in the ranking based on its Total Score, which
              reflects the results of our comprehensive research.
            </p>
          </div>

          {/* Show less / Show more toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-2.5 inline-block text-xs sm:text-[13px] font-bold text-[#111827] underline underline-offset-4 decoration-gray-400 hover:decoration-[#0F3E35] hover:text-[#0F3E35] transition-colors cursor-pointer"
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </button>
        </div>
      </div>
    </section>
  );
}
