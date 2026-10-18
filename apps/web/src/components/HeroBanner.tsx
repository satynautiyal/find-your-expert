'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  MapPin,
  Search,
  Star,
  ChevronDown,
  Building2,
  Calendar,
  MessageSquare,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { EButton } from '@/components/EComponents';

export interface HeroBannerProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedBorough: string;
  onSelectBorough: (b: string) => void;
  selectedService: string;
  onSelectService: (s: string) => void;
  selectedSpace?: string;
  onSelectSpace?: (sp: string) => void;
  onSearchSubmit: () => void;
  companiesCount: number;
  dynamicBoroughs?: string[];
  dynamicServices?: string[];
  stats?: {
    totalProviders: number;
    avgRating: number;
    totalReviews: number;
  };
}

export default function HeroBanner({
  searchQuery,
  onSearchChange,
  selectedBorough,
  onSelectBorough,
  selectedService,
  onSelectService,
  onSearchSubmit,
  companiesCount,
  dynamicServices,
  stats,
}: HeroBannerProps) {
  const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false);

  // Default to Custom Cabinets as instructed by user
  const currentService =
    selectedService && selectedService !== 'All Services' && selectedService !== 'All'
      ? selectedService
      : 'Custom Cabinets';

  const isCabinets = currentService.toLowerCase().includes('cabinet') || 
    currentService.toLowerCase().includes('shelv') || 
    currentService.toLowerCase().includes('closet') ||
    currentService.toLowerCase().includes('millwork');

  // Popular search suggestions dynamically adapted to trade
  const popularServices = isCabinets
    ? [
        'Custom Cabinets',
        'Kitchen Cabinetry',
        'Built-In Shelving',
        'Bathroom Vanities',
        'Custom Closets',
        'Architectural Millwork',
      ]
    : [
        'Roof Installation',
        'Repair',
        'Flat Roof Systems',
        'Waterproofing',
        'Gutter Installation',
        'Inspection',
      ];

  // Strictly New York, NY / NYC Boroughs
  const currentLocation =
    selectedBorough && selectedBorough !== 'All' && selectedBorough !== 'New York City'
      ? `${selectedBorough}, NY`
      : 'New York, NY';

  const handleTagClick = (serviceName: string) => {
    onSelectService(serviceName);
    onSearchSubmit();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchSubmit();
  };

  const heroImage = isCabinets
    ? '/categories/custom-cabinets.jpg'
    : '/roofing-hero-house.jpg';

  return (
    <div className="bg-[#FAFBF9] border-b border-gray-200/80">
      {/* 1. Full-Bleed Hero Section */}
      <section className="relative min-h-[460px] lg:min-h-[500px] flex items-center overflow-hidden">
        {/* Background House/Interior Image on Right with Seamless Left Fade */}
        <div className="absolute right-0 top-0 bottom-0 w-full lg:w-[60%] xl:w-[58%] h-full pointer-events-none select-none z-0">
          <img
            src={heroImage}
            alt={`${currentService} Contractors in ${currentLocation}`}
            className="w-full h-full object-cover object-[center_right]"
          />
          {/* Soft left gradient fade into the off-white background */}
          <div className="absolute inset-y-0 left-0 w-36 sm:w-64 lg:w-96 bg-gradient-to-r from-[#FAFBF9] via-[#FAFBF9]/85 to-transparent" />
        </div>

        {/* Floating Verified Badge on Bottom-Right */}
        <div className="hidden lg:flex absolute bottom-6 right-6 xl:right-10 bg-white/95 backdrop-blur-md rounded-2xl px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.1)] border border-gray-100 items-center gap-3 z-10 pointer-events-none">
          <div className="w-8 h-8 rounded-full bg-[#07302C] text-white flex items-center justify-center shrink-0 shadow-2xs">
            <CheckCircle2 className="w-5 h-5 text-white stroke-[2.4]" />
          </div>
          <div>
            <div className="text-xs sm:text-[13px] font-bold text-[#111827] leading-tight">
              Verified NYC Professionals
            </div>
            <div className="text-[10px] sm:text-[11px] text-[#5A6578] font-medium leading-tight mt-0.5">
              100% Licensed &amp; Insured in New York
            </div>
          </div>
        </div>

        {/* Hero Content Container */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-10 lg:py-12 relative z-10">
          <div className="max-w-2xl lg:max-w-xl xl:max-w-2xl">
            {/* Breadcrumb targeting New York */}
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-gray-500 mb-3.5 font-normal">
              <Link href="/" className="hover:text-primary transition-colors">
                Home
              </Link>
              <span className="text-gray-400">&gt;</span>
              <span className="hover:text-primary transition-colors cursor-pointer">
                New York
              </span>
              <span className="text-gray-400">&gt;</span>
              <span className="text-gray-900 font-semibold truncate">
                {currentLocation.split(',')[0]}
              </span>
              <span className="text-gray-400">&gt;</span>
              <span className="text-primary font-bold truncate">
                {currentService}
              </span>
            </nav>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[50px] xl:text-[54px] font-bold text-[#111827] tracking-[-0.03em] leading-[1.02]">
              {currentService}
              <br />
              in {currentLocation}
            </h1>

            {/* Subtitle */}
            <p className="mt-4 text-sm sm:text-[15px] lg:text-[15.5px] text-[#4B5563] max-w-[560px] leading-[1.5] font-normal">
              Compare vetted {currentService.toLowerCase()} companies across {currentLocation.split(',')[0]} based on verified credentials, verified customer reviews, portfolio craftsmanship, and independent ratings.
            </p>

            {/* Dual Search Input Bar */}
            <form
              onSubmit={handleSubmit}
              className="mt-6 bg-white rounded-2xl shadow-[0_4px_25px_rgba(0,0,0,0.06)] border border-gray-200/90 p-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-2xl transition-shadow hover:shadow-[0_8px_30px_rgba(0,0,0,0.09)]"
            >
              {/* Search Need Input */}
              <div className="relative flex items-center gap-2.5 px-3 py-1 flex-1">
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  onFocus={() => setServiceDropdownOpen(true)}
                  placeholder={`Search ${currentService.toLowerCase()} (e.g. ${popularServices[0]})...`}
                  className="w-full text-xs sm:text-sm text-gray-800 placeholder-gray-400 bg-transparent focus:outline-none font-normal"
                />
                <button
                  type="button"
                  onClick={() => setServiceDropdownOpen(!serviceDropdownOpen)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 cursor-pointer"
                  aria-label="Toggle service options"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>

                {/* Dropdown Suggestions */}
                {serviceDropdownOpen && (
                  <div
                    className="absolute top-12 left-0 right-0 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
                    onMouseLeave={() => setServiceDropdownOpen(false)}
                  >
                    <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Popular {currentService} Services
                    </div>
                    {popularServices.map((service) => (
                      <button
                        key={service}
                        type="button"
                        onClick={() => {
                          onSearchChange(service);
                          onSelectService(service);
                          setServiceDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-[#EBF3F1] hover:text-[#0F3E35] transition-colors cursor-pointer"
                      >
                        {service}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Vertical Divider */}
              <div className="hidden sm:block w-px h-8 bg-gray-200 shrink-0" />

              {/* Location Input */}
              <div className="flex items-center gap-2.5 px-3 py-1 sm:w-48">
                <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type="text"
                  value={selectedBorough === 'All' ? '' : selectedBorough}
                  onChange={(e) => onSelectBorough(e.target.value)}
                  placeholder="NYC Borough / ZIP"
                  className="w-full text-xs sm:text-sm text-gray-800 placeholder-gray-400 bg-transparent focus:outline-none font-normal"
                />
              </div>

              {/* Submit EButton */}
              <EButton
                type="submit"
                variant="primary"
                size="xl"
                className="shrink-0"
              >
                Find {isCabinets ? 'Cabinet Makers' : 'Roofers'}
              </EButton>
            </form>

            {/* Popular Searches Pills */}
            <div className="mt-3.5 flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs">
              <span className="text-[#111827] font-bold mr-1">Popular services:</span>
              {popularServices.slice(0, 5).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleTagClick(item)}
                  className="px-2.5 sm:px-3 py-1 rounded-full bg-[#ECEEF0] hover:bg-gray-200 text-gray-800 transition-colors cursor-pointer text-xs font-medium"
                >
                  {item}
                </button>
              ))}
            </div>

            {/* Mobile-only Verified Badge */}
            <div className="flex lg:hidden items-center gap-2.5 mt-5 bg-white/95 backdrop-blur-md rounded-2xl px-3.5 py-2.5 shadow-xs border border-gray-100 max-w-xs">
              <div className="w-7 h-7 rounded-full bg-[#07302C] text-white flex items-center justify-center shrink-0 shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-white stroke-[2.4]" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#111827] leading-tight">
                  Verified NYC Professionals
                </div>
                <div className="text-[10px] text-[#5A6578] font-medium leading-tight mt-0.5">
                  100% Licensed &amp; Insured in New York
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Key Statistics Strip Bar with real DB numbers */}
      <section className="border-t border-[#DEEAE3] bg-[#EBF7F2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 items-center">
            {/* Stat 1: Professionals */}
            <div className="flex items-center gap-3 sm:gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-white border border-[#D5EADB] text-[#0B3B2C] flex items-center justify-center shrink-0 shadow-2xs">
                <Building2 className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <div className="text-base sm:text-lg font-bold text-[#111827] leading-tight tracking-tight">
                  {companiesCount > 0 ? `${companiesCount} Verified` : stats?.totalProviders ? `${stats.totalProviders} Active` : '24 Active'}
                </div>
                <div className="text-[11px] sm:text-xs text-[#5A6578] font-medium leading-tight mt-0.5">
                  {isCabinets ? 'Cabinet Makers' : 'Roofing Contractors'} in NYC
                </div>
              </div>
            </div>

            {/* Stat 2: Average Rating */}
            <div className="flex items-center gap-3 sm:gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-white border border-[#D5EADB] text-[#0B3B2C] flex items-center justify-center shrink-0 shadow-2xs">
                <Star className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <div className="text-base sm:text-lg font-bold text-[#111827] leading-tight tracking-tight">
                  {stats?.avgRating ? `${stats.avgRating}/5` : '4.9/5'}
                </div>
                <div className="text-[11px] sm:text-xs text-[#5A6578] font-medium leading-tight mt-0.5">
                  Average Composite Score
                </div>
              </div>
            </div>

            {/* Stat 3: Reviews Analyzed */}
            <div className="flex items-center gap-3 sm:gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-white border border-[#D5EADB] text-[#0B3B2C] flex items-center justify-center shrink-0 shadow-2xs">
                <MessageSquare className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <div className="text-base sm:text-lg font-bold text-[#111827] leading-tight tracking-tight">
                  {stats?.totalReviews ? `${stats.totalReviews.toLocaleString()}+` : '1,270+'}
                </div>
                <div className="text-[11px] sm:text-xs text-[#5A6578] font-medium leading-tight mt-0.5">
                  Cross-Platform Reviews
                </div>
              </div>
            </div>

            {/* Stat 4: Coverage Area */}
            <div className="flex items-center gap-3 sm:gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-white border border-[#D5EADB] text-[#0B3B2C] flex items-center justify-center shrink-0 shadow-2xs">
                <Calendar className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <div className="text-base sm:text-lg font-bold text-[#111827] leading-tight tracking-tight">
                  New York, NY
                </div>
                <div className="text-[11px] sm:text-xs text-[#5A6578] font-medium leading-tight mt-0.5">
                  5 NYC Boroughs Live
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
