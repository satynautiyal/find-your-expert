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

  // Popular search suggestions directly from DB sub-services
  const popularServices = (dynamicServices || []).filter(
    (s) => s && s !== 'All Services' && s !== 'All'
  );

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

  const activeProsCount =
    companiesCount > 0
      ? companiesCount
      : stats?.totalProviders
      ? stats.totalProviders
      : 0;
  const displayRating = stats?.avgRating ? `${stats.avgRating}/5` : '';

  return (
    <div className="bg-[#FAFBF9] border-b border-gray-200/80">
      {/* ========================================================= */}
      {/* 1A. MOBILE HERO VIEW (< lg) - Same industry-standard split pattern as Home page */}
      {/* ========================================================= */}
      <section className="lg:hidden relative bg-[#FAFBF9] overflow-hidden">
        {/* 1. Top Copy Container on Clean Solid #FAFBF9 Background (100% readable, zero image clutter behind text) */}
        <div className="pt-3.5 pb-2 px-4 relative z-10 bg-[#FAFBF9]">
          {/* Breadcrumb + Kicker Row */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-1 text-[11px] text-gray-500 font-medium overflow-x-auto no-scrollbar py-0.5"
            >
              <Link href="/" className="hover:text-primary transition-colors shrink-0">
                Home
              </Link>
              <span className="text-gray-300 shrink-0">/</span>
              <span className="text-gray-700 shrink-0">
                {currentLocation.split(',')[0]}
              </span>
              <span className="text-gray-300 shrink-0">/</span>
              <span className="text-[#0F3E35] font-bold truncate shrink-0">
                {currentService}
              </span>
            </nav>

            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#EAF3EF] border border-[#D1E5DB] shrink-0">
              <CheckCircle2 className="w-3 h-3 text-[#0F3E35]" />
              <span className="text-[10.5px] font-semibold text-[#0F3E35] tracking-tight">
                Verified NYC
              </span>
            </div>
          </div>

          {/* 3-Line Headline matching Landing Page */}
          <h1 className="text-[28px] min-[370px]:text-[32px] font-black text-[#111827] tracking-tight leading-[1.08]">
            <span className="block">Find the Best</span>
            <span className="block text-[#FF5B26]">{currentService}</span>
            <span className="block">in {currentLocation}</span>
          </h1>

          {/* Subtitle */}
          <p className="mt-2.5 text-[13.5px] font-normal text-[#374151] leading-[1.48] max-w-[355px]">
            Compare vetted {currentService.toLowerCase()} companies across{' '}
            {currentLocation.split(',')[0]} based on verified credentials, real customer reviews, project photos and ratings.
          </p>

          {/* Ratings & Verified Pros Row */}
          <div className="flex items-center gap-2 mt-3">
            <div className="flex -space-x-1.5 shrink-0">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=64&q=80"
                alt="Customer"
                className="w-6 h-6 rounded-full border-2 border-white object-cover shadow-sm"
              />
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=64&q=80"
                alt="Customer"
                className="w-6 h-6 rounded-full border-2 border-white object-cover shadow-sm"
              />
              <img
                src="https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=64&q=80"
                alt="Customer"
                className="w-6 h-6 rounded-full border-2 border-white object-cover shadow-sm"
              />
            </div>
            <div className="flex text-amber-500 text-[11px] tracking-tight shrink-0">
              {'★'.repeat(5)}
            </div>
            <span className="text-xs font-extrabold text-[#111827] shrink-0">
              {displayRating}
            </span>
            <span className="text-gray-300 shrink-0">|</span>
            <span className="text-[11.5px] font-semibold text-[#374151] shrink-0">
              {activeProsCount}+ Verified NYC Pros
            </span>
          </div>
        </div>

        {/* 2. Dedicated Project Image Showcase + Overlapping Floating Search Card */}
        <div className="relative">
          {/* Unobstructed 100% Clear Project Image Window */}
          <div className="relative h-[230px] sm:h-[280px] w-full overflow-hidden">
            <img
              src={heroImage}
              alt={`${currentService} Contractors in ${currentLocation}`}
              className="w-full h-full object-cover object-[55%_42%]"
            />
            {/* Soft top edge feather so the photo blends seamlessly into the #FAFBF9 copy block above */}
            <div
              className="absolute inset-x-0 top-0 h-8 pointer-events-none"
              style={{
                background: 'linear-gradient(180deg, #FAFBF9 0%, rgba(250,251,249,0) 100%)',
              }}
            />
            {/* Subtle bottom vignette to ground the floating search card */}
            <div
              className="absolute inset-x-0 bottom-0 h-16 pointer-events-none"
              style={{
                background: 'linear-gradient(0deg, rgba(17,24,39,0.25) 0%, rgba(17,24,39,0) 100%)',
              }}
            />
          </div>

          {/* Floating White Search Card overlapping the lower portion of the project image */}
          <div className="relative z-10 px-4 -mt-20 pb-4">
            <div className="bg-white rounded-2xl p-3.5 shadow-[0_14px_34px_rgba(0,0,0,0.12)] border border-gray-100">
              <form onSubmit={handleSubmit} className="flex flex-col gap-2">
                {/* Field 1: Search Service */}
                <div className="relative flex items-center justify-between border border-gray-200 rounded-xl px-3.5 py-2.5 bg-white focus-within:border-[#0F3E35] focus-within:ring-1 focus-within:ring-[#0F3E35] transition-all">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <Search className="w-4 h-4 text-gray-400 shrink-0" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => onSearchChange(e.target.value)}
                      onFocus={() => setServiceDropdownOpen(true)}
                      placeholder={`Search ${currentService.toLowerCase()} (e.g. ${popularServices[0]})...`}
                      className="w-full text-[13px] text-gray-900 placeholder-gray-400 bg-transparent focus:outline-none font-normal"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setServiceDropdownOpen(!serviceDropdownOpen)}
                    className="text-gray-400 hover:text-gray-600 transition-colors ml-1 cursor-pointer"
                    aria-label="Toggle service options"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>

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

                {/* Field 2: NYC Borough / ZIP */}
                <div className="flex items-center border border-gray-200 rounded-xl px-3.5 py-2.5 bg-white focus-within:border-[#0F3E35] focus-within:ring-1 focus-within:ring-[#0F3E35] transition-all">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                    <input
                      type="text"
                      value={selectedBorough === 'All' ? '' : selectedBorough}
                      onChange={(e) => onSelectBorough(e.target.value)}
                      placeholder="NYC Borough or ZIP code"
                      className="w-full text-[13px] text-gray-900 placeholder-gray-400 bg-transparent focus:outline-none font-normal"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full mt-1 bg-[#0F3E35] hover:bg-[#0B3B2C] active:scale-[0.99] text-white font-bold text-[14px] py-3 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Find {isCabinets ? 'Cabinet Makers' : 'Roofers'}</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* 3. Popular Row (Under project image, clean strip matching landing page) */}
        <div className="px-4 py-3 bg-[#FAFBF9] border-t border-gray-100">
          <div className="flex items-center gap-2 text-xs overflow-x-auto no-scrollbar">
            <span className="font-bold text-[#111827] text-xs shrink-0 mr-0.5">
              Popular:
            </span>
            {popularServices.slice(0, 5).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => handleTagClick(item)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-gray-700 font-medium text-xs hover:border-gray-300 hover:bg-gray-50 transition-colors shrink-0 shadow-sm cursor-pointer"
              >
                <span>{item}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 1B. DESKTOP HERO VIEW (lg+) - 100% UNTOUCHED ORIGINAL DESKTOP */}
      {/* ========================================================= */}
      <section className="hidden lg:flex relative min-h-[500px] items-center overflow-hidden">
        {/* Background House/Interior Image on Right with Seamless Left Fade */}
        <div className="absolute right-0 top-0 bottom-0 w-[60%] xl:w-[58%] h-full pointer-events-none select-none z-0 overflow-hidden">
          <img
            src={heroImage}
            alt={`${currentService} Contractors in ${currentLocation}`}
            className="w-full h-full object-cover object-[center_right] opacity-100 transition-all duration-300"
          />
          {/* Desktop soft left gradient fade into the off-white background */}
          <div className="absolute inset-y-0 left-0 w-96 bg-gradient-to-r from-[#FAFBF9] via-[#FAFBF9]/85 to-transparent" />
        </div>

        {/* Floating Verified Badge on Bottom-Right */}
        <div className="flex absolute bottom-6 right-6 xl:right-10 bg-white/95 backdrop-blur-md rounded-2xl px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.1)] border border-gray-100 items-center gap-3 z-10 pointer-events-none">
          <div className="w-8 h-8 rounded-full bg-[#07302C] text-white flex items-center justify-center shrink-0 shadow-sm">
            <CheckCircle2 className="w-5 h-5 text-white stroke-[2.4]" />
          </div>
          <div>
            <div className="text-[13px] font-bold text-[#111827] leading-tight">
              Verified NYC Professionals
            </div>
            <div className="text-[11px] text-[#5A6578] font-medium leading-tight mt-0.5">
              100% Licensed &amp; Insured in New York
            </div>
          </div>
        </div>

        {/* Hero Content Container */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-12 relative z-10">
          <div className="max-w-xl xl:max-w-2xl">
            {/* Breadcrumb targeting New York */}
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-gray-500 mb-3.5 font-normal py-0.5">
              <Link href="/" className="hover:text-primary transition-colors shrink-0">
                Home
              </Link>
              <span className="text-gray-400 shrink-0">&gt;</span>
              <span className="hover:text-primary transition-colors cursor-pointer shrink-0">
                New York
              </span>
              <span className="text-gray-400 shrink-0">&gt;</span>
              <span className="text-gray-900 font-semibold truncate shrink-0">
                {currentLocation.split(',')[0]}
              </span>
              <span className="text-gray-400 shrink-0">&gt;</span>
              <span className="text-primary font-bold truncate shrink-0">
                {currentService}
              </span>
            </nav>

            {/* Desktop Headline */}
            <h1 className="text-[50px] xl:text-[54px] font-bold text-[#111827] tracking-[-0.03em] leading-[1.02]">
              {currentService}
              <br />
              in {currentLocation}
            </h1>

            {/* Subtitle */}
            <p className="mt-4 text-[15.5px] text-[#374151] max-w-[560px] leading-[1.5] font-normal">
              Compare vetted {currentService.toLowerCase()} companies across {currentLocation.split(',')[0]} based on verified credentials, verified customer reviews, portfolio craftsmanship, and independent ratings.
            </p>
          </div>

          {/* Bottom Actions: Search Form & Quick Filters */}
          <div className="mt-6 max-w-xl xl:max-w-2xl">
            {/* Dual Search Input Bar */}
            <form
              onSubmit={handleSubmit}
              className="bg-white backdrop-blur-md rounded-2xl shadow-[0_4px_25px_rgba(0,0,0,0.06)] border border-gray-200/90 p-2 flex flex-row items-center gap-2 transition-shadow hover:shadow-[0_16px_40px_rgba(15,62,53,0.15)]"
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
                  className="w-full text-sm text-gray-800 placeholder-gray-400 bg-transparent focus:outline-none font-normal"
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

              {/* Vertical Divider for desktop */}
              <div className="w-px h-8 bg-gray-200 shrink-0" />

              {/* Location Input */}
              <div className="flex items-center gap-2.5 px-3 py-1 w-48">
                <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type="text"
                  value={selectedBorough === 'All' ? '' : selectedBorough}
                  onChange={(e) => onSelectBorough(e.target.value)}
                  placeholder="NYC Borough / ZIP"
                  className="w-full text-sm text-gray-800 placeholder-gray-400 bg-transparent focus:outline-none font-normal"
                />
              </div>

              {/* Submit EButton */}
              <EButton
                type="submit"
                variant="primary"
                size="xl"
                className="shrink-0 w-auto justify-center"
              >
                Find {isCabinets ? 'Cabinet Makers' : 'Roofers'}
              </EButton>
            </form>

            {/* Popular Searches Pills */}
            <div className="mt-3.5 flex items-center gap-2 text-xs flex-wrap">
              <span className="text-[#111827] font-bold mr-1 shrink-0 whitespace-nowrap">
                Popular:
              </span>
              {popularServices.slice(0, 5).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleTagClick(item)}
                  className="px-3 py-1 rounded-full bg-[#ECEEF0] hover:bg-gray-200 text-gray-800 transition-colors cursor-pointer text-xs font-medium shrink-0 whitespace-nowrap"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Key Statistics Strip Bar with real DB numbers */}
      <section className="border-t border-[#DEEAE3] bg-[#EBF7F2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 items-center">
            {/* Stat 1: Professionals */}
            <div className="flex items-center gap-2.5 sm:gap-3.5">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white border border-[#D5EADB] text-[#0B3B2C] flex items-center justify-center shrink-0 shadow-2xs">
                <Building2 className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <div className="text-sm sm:text-lg font-bold text-[#111827] leading-tight tracking-tight truncate">
                  {companiesCount > 0 ? `${companiesCount} Verified` : stats?.totalProviders ? `${stats.totalProviders} Active` : 'Verified'}
                </div>
                <div className="text-[10.5px] sm:text-xs text-[#5A6578] font-medium leading-tight mt-0.5 truncate">
                  {currentService} Pros in NYC
                </div>
              </div>
            </div>

            {/* Stat 2: Average Rating */}
            <div className="flex items-center gap-2.5 sm:gap-3.5">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white border border-[#D5EADB] text-[#0B3B2C] flex items-center justify-center shrink-0 shadow-2xs">
                <Star className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <div className="text-sm sm:text-lg font-bold text-[#111827] leading-tight tracking-tight truncate">
                  {stats?.avgRating ? `${stats.avgRating}/5` : '—'}
                </div>
                <div className="text-[10.5px] sm:text-xs text-[#5A6578] font-medium leading-tight mt-0.5 truncate">
                  Average Composite Score
                </div>
              </div>
            </div>

            {/* Stat 3: Reviews Analyzed */}
            <div className="flex items-center gap-2.5 sm:gap-3.5">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white border border-[#D5EADB] text-[#0B3B2C] flex items-center justify-center shrink-0 shadow-2xs">
                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <div className="text-sm sm:text-lg font-bold text-[#111827] leading-tight tracking-tight truncate">
                  {stats?.totalReviews ? `${stats.totalReviews.toLocaleString()}+` : '0'}
                </div>
                <div className="text-[10.5px] sm:text-xs text-[#5A6578] font-medium leading-tight mt-0.5 truncate">
                  Cross-Platform Reviews
                </div>
              </div>
            </div>

            {/* Stat 4: Coverage Area */}
            <div className="flex items-center gap-2.5 sm:gap-3.5">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white border border-[#D5EADB] text-[#0B3B2C] flex items-center justify-center shrink-0 shadow-2xs">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <div className="text-sm sm:text-lg font-bold text-[#111827] leading-tight tracking-tight truncate">
                  New York, NY
                </div>
                <div className="text-[10.5px] sm:text-xs text-[#5A6578] font-medium leading-tight mt-0.5 truncate">
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
