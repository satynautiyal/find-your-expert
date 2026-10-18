'use client';

import React from 'react';
import {
  Home,
  Wrench,
  Search,
  CloudLightning,
  Layers,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Hammer,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import SafeImage from '@/components/common/SafeImage';
import { getCategoryImage } from '@/lib/category-images';
import type { CategoryItem } from '@/lib/api';

export interface ServiceCategoriesSectionProps {
  selectedCategory: string; // 'Custom Cabinets' | 'Roofing' | 'All'
  onSelectCategory: (category: string) => void;
  selectedService: string;
  onSelectService: (serviceName: string) => void;
  categories?: CategoryItem[];
}

// Icon mapper for subservices
function getServiceIcon(slugOrName: string) {
  const s = slugOrName.toLowerCase();
  if (s.includes('cabinet') || s.includes('kitchen')) return Home;
  if (s.includes('shelv') || s.includes('closet')) return Layers;
  if (s.includes('vanit') || s.includes('millwork')) return Sparkles;
  if (s.includes('repair') || s.includes('install')) return Wrench;
  if (s.includes('waterproof') || s.includes('shield')) return ShieldCheck;
  if (s.includes('flat') || s.includes('shingle')) return Layers;
  if (s.includes('gutter') || s.includes('storm')) return CloudLightning;
  if (s.includes('inspect')) return Search;
  return Hammer;
}

export default function ServiceCategoriesSection({
  selectedCategory,
  onSelectCategory,
  selectedService,
  onSelectService,
  categories = [],
}: ServiceCategoriesSectionProps) {
  // Find current active category object from dynamic categories list
  const activeCategoryObj = categories.find(
    (c) => c.name.toLowerCase() === selectedCategory.toLowerCase() ||
           (c.slug && c.slug.toLowerCase() === selectedCategory.toLowerCase())
  ) || categories.find((c) => c.slug === 'custom-cabinets') || categories[0];

  const isCabinets = !selectedCategory || 
    selectedCategory.toLowerCase().includes('cabinet') || 
    activeCategoryObj?.slug === 'custom-cabinets';

  const isRoofing = selectedCategory?.toLowerCase().includes('roof') || 
    activeCategoryObj?.slug === 'roofing';

  // Sub-services to display for active category
  const subServices = activeCategoryObj?.subServices || [];

  const handleCardClick = (serviceName: string) => {
    onSelectService(serviceName);
    const listingsEl = document.getElementById('listings');
    if (listingsEl) {
      listingsEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleViewAllForTrade = () => {
    onSelectService('All Services');
    const listingsEl = document.getElementById('listings');
    if (listingsEl) {
      listingsEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="bg-[#FAFBF9] border-b border-gray-200/80 py-8 sm:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Trade Switcher: Custom Cabinets (LIVE) | Roofing (LIVE) | Coming Soon Trades */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-4 no-scrollbar [scrollbar-width:none]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 shrink-0 mr-1">
            Active Trades:
          </span>

          {/* 1. Custom Cabinets Pill */}
          <button
            type="button"
            onClick={() => {
              onSelectCategory('Custom Cabinets');
              onSelectService('All Services');
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              isCabinets
                ? 'bg-[#0F3E35] text-white shadow-xs'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
            }`}
          >
            <span>Custom Cabinets</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
              isCabinets ? 'bg-emerald-400 text-emerald-950' : 'bg-emerald-50 text-emerald-700'
            }`}>
              10 Pros
            </span>
          </button>

          {/* 2. Roofing Pill */}
          <button
            type="button"
            onClick={() => {
              onSelectCategory('Roofing');
              onSelectService('All Services');
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              isRoofing
                ? 'bg-[#0F3E35] text-white shadow-xs'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
            }`}
          >
            <span>Roofing</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
              isRoofing ? 'bg-emerald-400 text-emerald-950' : 'bg-emerald-50 text-emerald-700'
            }`}>
              14 Pros
            </span>
          </button>

          {/* Coming Soon Trade Pills */}
          {['Painting', 'HVAC', 'Flooring', 'Windows'].map((trade) => (
            <div
              key={trade}
              className="px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100/80 text-gray-400 border border-gray-200/50 flex items-center gap-1.5 shrink-0 select-none"
              title={`${trade} contractors coming soon to New York`}
            >
              <span>{trade}</span>
              <span className="text-[9px] px-1.5 py-0.2 bg-gray-200/80 text-gray-500 rounded-full font-bold uppercase tracking-wider">
                Soon
              </span>
            </div>
          ))}
        </div>

        {/* Section Header: Dynamic Title + View All Link */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6 sm:mb-7">
          <div>
            <h2 className="text-2xl sm:text-[26px] md:text-[28px] font-bold text-[#111827] tracking-tight leading-tight">
              {isCabinets
                ? 'What custom cabinetry service do you need?'
                : isRoofing
                ? 'What roofing service do you need?'
                : `What ${activeCategoryObj?.name || 'project'} service do you need?`}
            </h2>
            <p className="mt-1 text-xs sm:text-[13px] text-[#5A6578] font-normal">
              {isCabinets
                ? 'Compare verified NYC custom cabinet makers, carpenters, and architectural millwork specialists'
                : isRoofing
                ? 'Choose a roofing service to find licensed NYC flat roof and brownstone contractors'
                : 'Choose a service to find vetted New York professionals'}
            </p>
          </div>

          <button
            type="button"
            onClick={handleViewAllForTrade}
            className="inline-flex items-center gap-1.5 text-xs sm:text-[13px] font-semibold text-[#0B3B2C] hover:text-[#DA5F2F] transition-colors group cursor-pointer self-start sm:self-end"
          >
            <span>View all {isCabinets ? 'cabinet' : isRoofing ? 'roofing' : ''} services</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Dynamic Category Sub-Services Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
          {subServices.map((item) => {
            const isSelected = selectedService === item.name;
            const Icon = getServiceIcon(item.slug || item.name);
            const imageUrl = getCategoryImage(item.slug || item.name);

            return (
              <div
                key={item.id || item.slug || item.name}
                onClick={() => handleCardClick(item.name)}
                className={`group relative bg-white rounded-2xl overflow-hidden border transition-all duration-200 cursor-pointer flex flex-col select-none ${
                  isSelected
                    ? 'border-[#0F3E35] ring-2 ring-[#0F3E35]/20 shadow-sm'
                    : 'border-[#E5E7EB] hover:border-[#0F3E35]/50 hover:shadow-md hover:-translate-y-0.5'
                }`}
              >
                {/* Image Container */}
                <div className="relative h-28 sm:h-32 md:h-34 w-full overflow-hidden bg-gray-100">
                  <SafeImage
                    src={imageUrl}
                    alt={item.name}
                    fallbackCategory={activeCategoryObj?.name || 'Cabinet'}
                    fallbackTitle={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    draggable={false}
                    loading="lazy"
                  />

                  {/* Floating Badge at bottom-left */}
                  <div
                    className={`absolute -bottom-3 left-3 w-7 h-7 sm:w-[30px] sm:h-[30px] rounded-lg flex items-center justify-center shadow-xs transition-colors z-10 ${
                      isSelected
                        ? 'bg-[#0F3E35] text-white border border-[#0F3E35]'
                        : 'bg-[#EBF3F1] border border-[#CDE3DC] text-[#0F3E35] group-hover:bg-[#0F3E35] group-hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
                  </div>
                </div>

                {/* Card Title Footer */}
                <div className="pt-5 pb-3.5 px-3 sm:px-3.5 text-left bg-white flex-1 flex items-center">
                  <span
                    className={`text-xs sm:text-[13px] font-bold leading-snug tracking-tight transition-colors line-clamp-1 ${
                      isSelected
                        ? 'text-[#0F3E35]'
                        : 'text-[#111827] group-hover:text-[#0F3E35]'
                    }`}
                  >
                    {item.name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
