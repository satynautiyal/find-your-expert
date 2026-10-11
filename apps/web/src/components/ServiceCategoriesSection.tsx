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
} from 'lucide-react';

export interface ServiceCategory {
  id: string;
  name: string;
  image: string;
  icon: React.ElementType;
}

export interface ServiceCategoriesSectionProps {
  selectedService: string;
  onSelectService: (serviceName: string) => void;
}

const CATEGORIES: ServiceCategory[] = [
  {
    id: 'roof-replacement',
    name: 'Roof Replacement',
    image: '/services/roof-replacement.jpg',
    icon: Home,
  },
  {
    id: 'roof-repair',
    name: 'Roof Repair',
    image: '/services/roof-repair.jpg',
    icon: Wrench,
  },
  {
    id: 'roof-inspection',
    name: 'Roof Inspection',
    image: '/services/roof-inspection.jpg',
    icon: Search,
  },
  {
    id: 'storm-damage',
    name: 'Storm Damage',
    image: '/services/storm-damage.jpg',
    icon: CloudLightning,
  },
  {
    id: 'shingle-roofing',
    name: 'Shingle Roofing',
    image: '/services/shingle-roofing.jpg',
    icon: Layers,
  },
  {
    id: 'metal-roofing',
    name: 'Metal Roofing',
    image: '/services/metal-roofing.jpg',
    icon: ShieldCheck,
  },
];

export default function ServiceCategoriesSection({
  selectedService,
  onSelectService,
}: ServiceCategoriesSectionProps) {
  const handleCardClick = (serviceName: string) => {
    onSelectService(serviceName);
    const listingsEl = document.getElementById('listings');
    if (listingsEl) {
      listingsEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleViewAll = () => {
    onSelectService('All Services');
    const listingsEl = document.getElementById('listings');
    if (listingsEl) {
      listingsEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="bg-[#FAFBF9] border-b border-gray-200/80 py-8 sm:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header: Title + Subtitle on Left, View all link on Right */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6 sm:mb-7">
          <div>
            <h2 className="text-2xl sm:text-[26px] md:text-[28px] font-bold text-[#111827] tracking-tight leading-tight">
              What roofing service do you need?
            </h2>
            <p className="mt-1 text-xs sm:text-[13px] text-[#5A6578] font-normal">
              Choose a service to find the right professionals for your project
            </p>
          </div>

          <button
            type="button"
            onClick={handleViewAll}
            className="inline-flex items-center gap-1.5 text-xs sm:text-[13px] font-semibold text-[#0B3B2C] hover:text-[#DA5F2F] transition-colors group cursor-pointer self-start sm:self-end"
          >
            <span>View all roofing services</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* 6 Category Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
          {CATEGORIES.map((item) => {
            const isSelected = selectedService === item.name;
            const Icon = item.icon;

            return (
              <div
                key={item.id}
                onClick={() => handleCardClick(item.name)}
                className={`group relative bg-white rounded-2xl overflow-hidden border transition-all duration-200 cursor-pointer flex flex-col ${
                  isSelected
                    ? 'border-[#DA5F2F] ring-2 ring-[#DA5F2F]/20 shadow-sm'
                    : 'border-[#E5E7EB] hover:border-[#DA5F2F]/50 hover:shadow-md hover:-translate-y-0.5'
                }`}
              >
                {/* Image Container */}
                <div className="relative h-28 sm:h-32 md:h-34 w-full overflow-hidden bg-gray-100">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />

                  {/* Floating Orange Badge at bottom-left overlapping border */}
                  <div
                    className={`absolute -bottom-3 left-3 w-7 h-7 sm:w-[30px] sm:h-[30px] rounded-lg flex items-center justify-center shadow-xs transition-colors z-10 ${
                      isSelected
                        ? 'bg-[#DA5F2F] text-white border border-[#DA5F2F]'
                        : 'bg-[#FFF2EB] border border-[#FFDFC6] text-[#DA5F2F] group-hover:bg-[#DA5F2F] group-hover:text-white'
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
                        ? 'text-[#DA5F2F]'
                        : 'text-[#111827] group-hover:text-[#DA5F2F]'
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
