'use client';

import { useMemo } from 'react';
import {
  MapPin,
  Wrench,
  Home,
  Search,
  Star,
  ShieldCheck,
  Tag,
  FileText,
  Shield,
  Zap,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { NYC_BOROUGHS, ROOFING_SUB_SERVICES } from '@/data/mockRoofers';
import {
  EButton,
  EBadge,
  EInput,
  ESelect,
  ECard,
} from '@/components/EComponents';

export interface HeroBannerProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedBorough: string;
  onSelectBorough: (b: string) => void;
  selectedService: string;
  onSelectService: (s: string) => void;
  selectedSpace: string;
  onSelectSpace: (sp: string) => void;
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
  selectedSpace,
  onSelectSpace,
  onSearchSubmit,
  companiesCount,
  dynamicBoroughs,
  dynamicServices,
  stats,
}: HeroBannerProps) {
  const handleTagClick = (serviceName: string) => {
    onSelectService(serviceName);
    onSearchSubmit();
  };

  const rawBoroughs = dynamicBoroughs && dynamicBoroughs.length > 0 ? dynamicBoroughs : NYC_BOROUGHS;
  const rawServices = dynamicServices && dynamicServices.length > 0 ? dynamicServices : ROOFING_SUB_SERVICES;

  const boroughOptions = useMemo(() => [
    { label: 'All NYC (5 Boroughs)', value: 'All' },
    ...rawBoroughs.filter((b) => b !== 'All').map((b) => ({
      label: `${b}, NY`,
      value: b,
    })),
  ], [rawBoroughs]);

  const serviceOptions = useMemo(() => [
    { label: 'All Roofing Services', value: 'All Services' },
    ...rawServices.filter((s) => s !== 'All Services').map((s) => ({
      label: s,
      value: s,
    })),
  ], [rawServices]);

  const propertyOptions = useMemo(() => [
    { label: 'All Properties', value: 'All' },
    { label: 'Residential', value: 'Residential' },
    { label: 'Commercial', value: 'Commercial' },
  ], []);

  const trustCards = [
    {
      icon: <Star className="w-4 h-4 text-primary" />,
      title: stats?.avgRating ? `${stats.avgRating}` : '4.8',
      subtitle: `Avg. Rating Across ${stats?.totalReviews ? stats.totalReviews.toLocaleString() : '2,800'}+ Reviews`,
    },
    {
      icon: <ShieldCheck className="w-4 h-4 text-primary" />,
      title: stats?.totalProviders ? `${stats.totalProviders}+` : `${companiesCount}+`,
      subtitle: 'Verified Contractors in NYC',
    },
    {
      icon: <Tag className="w-4 h-4 text-primary" />,
      title: '$4.5k – $15k',
      subtitle: 'Typical Project Cost Range',
    },
    {
      icon: <FileText className="w-4 h-4 text-primary" />,
      title: 'Updated 2026',
      subtitle: 'Latest Reviews & Pricing',
    },
    {
      icon: <Shield className="w-4 h-4 text-primary" />,
      title: 'Independent',
      subtitle: 'Verified & Unbiased Reviews',
    },
    {
      icon: <Zap className="w-4 h-4 text-primary" />,
      title: 'Fast & Easy',
      subtitle: 'Get Free Quotes in Minutes',
    },
  ];

  return (
    <section className="relative bg-gradient-to-b from-[#FFFBF9] via-[#FAF7F5] to-[#F9FAFB] border-b border-gray-200 overflow-hidden py-6 sm:py-8">
      {/* Subtle organic background glow */}
      <div className="absolute top-12 right-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -left-20 w-[400px] h-[400px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Top 2-Column Hero Grid: Left Content + Right Image */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center pt-2">
          {/* Left Column: Headlines, Trust Pill & Social Proof */}
          <div className="lg:col-span-6 space-y-4">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-light border border-primary-border text-[11px] font-bold shadow-2xs">
              <div className="flex items-center gap-1.5 text-primary-dark">
                <ShieldCheck className="w-3.5 h-3.5 fill-primary text-white" />
                <span>TOP RATED &amp; VERIFIED</span>
              </div>
              <span className="text-gray-300">|</span>
              <span className="text-gray-500 font-semibold tracking-wide">
                NYC &bull; 5,000+ CERTIFIED CONTRACTORS
              </span>
            </div>

            {/* H1 Heading */}
            <h1 className="text-3xl sm:text-4xl lg:text-[46px] font-black text-gray-950 tracking-tight leading-[1.12]">
              Top Roofing Contractors in{' '}
              <span className="text-primary-dark block sm:inline">New York, NY</span>
            </h1>

            {/* Subtitle */}
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed max-w-xl font-normal">
              Compare the best residential and commercial roofing contractors based on authentic customer reviews from Google, Yelp, and Facebook, verified NYC DOB credentials, and transparent pricing.
            </p>

            {/* Social Proof Review Row */}
            <div className="flex items-center gap-3 pt-1">
              {/* Overlapping Avatar Stack */}
              <div className="flex -space-x-2 shrink-0">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80"
                  alt="Reviewer"
                  className="w-7 h-7 rounded-full border-2 border-white object-cover"
                />
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80"
                  alt="Reviewer"
                  className="w-7 h-7 rounded-full border-2 border-white object-cover"
                />
                <img
                  src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&h=120&q=80"
                  alt="Reviewer"
                  className="w-7 h-7 rounded-full border-2 border-white object-cover"
                />
                <img
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&h=120&q=80"
                  alt="Reviewer"
                  className="w-7 h-7 rounded-full border-2 border-white object-cover"
                />
              </div>

              {/* Stars */}
              <div className="flex text-primary gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-current" />
                ))}
              </div>

              {/* Rating Text */}
              <div className="text-xs text-gray-700">
                <span className="font-extrabold text-gray-950">4.8/5</span>{' '}
                <span className="text-gray-500">from 2,800+ verified reviews</span>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Graphic (NYC Rooftop + Skyline + Floating Badges) */}
          <div className="lg:col-span-6 relative flex items-center justify-center lg:justify-end">
            {/* Fluid warm backdrop shapes */}
            <div className="absolute -top-4 -left-4 sm:left-4 w-72 sm:w-96 h-64 sm:h-80 bg-gradient-to-tr from-primary/30 via-primary/15 to-primary-light/20 rounded-tl-[100px] rounded-3xl -z-10 blur-xs" />

            {/* Main Asymmetrical Framed Image */}
            <div className="relative w-full max-w-lg h-[260px] sm:h-[320px] rounded-tl-[90px] rounded-tr-3xl rounded-br-3xl rounded-bl-3xl overflow-hidden shadow-2xl border-4 border-white">
              <img
                src="https://images.unsplash.com/photo-1534430480872-3498386e7856?auto=format&fit=crop&w=1200&q=80"
                alt="NYC Rooftop overlooking Manhattan Skyline"
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
            </div>

            {/* Floating Top-Right Badge: Verified Contractors */}
            <div className="absolute -top-3 right-2 sm:right-4">
              <ECard variant="floatingBadge">
                <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-xs">
                  <ShieldCheck className="w-5 h-5 fill-white text-primary" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-950 leading-tight">
                    Verified Contractors
                  </div>
                  <div className="text-[10px] text-gray-500 font-medium">
                    Licensed &bull; Insured &bull; Trusted
                  </div>
                </div>
              </ECard>
            </div>

            {/* Decorative Handwritten Script text on the right side */}
            <div className="absolute -bottom-2 sm:bottom-4 right-0 sm:-right-4 font-['Caveat'] text-2xl sm:text-3xl text-primary-dark rotate-[-6deg] select-none pointer-events-none drop-shadow-xs font-bold hidden sm:block">
              Better Roofs<br />Bigger Peace<br />of Mind
            </div>
          </div>
        </div>

        {/* Center: Clean Floating Search & Filter Bar */}
        <ECard variant="elevated">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-center">
            {/* Segment 1: Location / Borough */}
            <div className="lg:col-span-4">
              <ESelect
                label="Location / Borough"
                icon={<MapPin className="w-4 h-4" />}
                value={selectedBorough}
                onChange={(e) => onSelectBorough(e.target.value)}
                options={boroughOptions}
              />
            </div>

            {/* Segment 2: Service Needed */}
            <div className="lg:col-span-4">
              <ESelect
                label="Service Needed"
                icon={<Wrench className="w-4 h-4" />}
                value={selectedService}
                onChange={(e) => onSelectService(e.target.value)}
                options={serviceOptions}
              />
            </div>

            {/* Segment 3: Property Type */}
            <div className="lg:col-span-2">
              <ESelect
                label="Property"
                icon={<Home className="w-4 h-4" />}
                value={selectedSpace}
                onChange={(e) => onSelectSpace(e.target.value)}
                options={propertyOptions}
              />
            </div>

            {/* Segment 4: Search Roofers Button */}
            <div className="lg:col-span-2">
              <EButton
                onClick={onSearchSubmit}
                variant="primary"
                size="lg"
                className="w-full py-3 rounded-xl shadow-md shadow-primary/20"
                iconLeft={<Search className="w-4 h-4 stroke-[2.4]" />}
                iconRight={<span>&rarr;</span>}
              >
                Search Roofers
              </EButton>
            </div>
          </div>

          {/* Sub-row: Text search input + Popular tags */}
          <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
            <div className="w-full md:w-84">
              <EInput
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search by contractor name, license, or zip..."
                iconLeft={<Search className="w-3.5 h-3.5" />}
                className="bg-gray-50/70 border-gray-200"
              />
            </div>

            {/* Popular quick chips */}
            <div className="flex items-center gap-1.5 flex-wrap text-gray-500 text-[11px] w-full md:w-auto">
              <span className="font-semibold text-gray-400">Popular:</span>
              <button
                type="button"
                onClick={() => handleTagClick('Flat Roof Systems')}
              >
                <EBadge variant="popularChip">Flat Roofs</EBadge>
              </button>
              <button
                type="button"
                onClick={() => handleTagClick('Emergency Leak Repair')}
              >
                <EBadge variant="popularChip">Emergency Leak</EBadge>
              </button>
              <button
                type="button"
                onClick={() => handleTagClick('Full Roof Replacement')}
              >
                <EBadge variant="popularChip">Roof Replacement</EBadge>
              </button>
              <button
                type="button"
                onClick={() => handleTagClick('Commercial Roofing')}
              >
                <EBadge variant="popularChip">Commercial</EBadge>
              </button>
            </div>
          </div>
        </ECard>

        {/* Lower Row: 6 Trust Stat Highlight Cards with Right Chevrons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
          {trustCards.map((card) => (
            <ECard key={card.title} variant="stat">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-primary-light border border-primary-border flex items-center justify-center shrink-0">
                  {card.icon}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-black text-gray-950">{card.title}</div>
                  <div className="text-[10px] text-gray-500 font-medium leading-tight">
                    {card.subtitle}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
            </ECard>
          ))}
        </div>

        {/* Bottom CTA with clean divider lines */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <div className="w-12 sm:w-20 h-[1px] bg-gray-200" />
          <EButton
            onClick={onSearchSubmit}
            variant="pill"
            size="sm"
            iconRight={<ArrowRight className="w-3.5 h-3.5 text-primary" />}
          >
            Explore {companiesCount} Verified Contractors in NYC
          </EButton>
          <div className="w-12 sm:w-20 h-[1px] bg-gray-200" />
        </div>
      </div>
    </section>
  );
}
