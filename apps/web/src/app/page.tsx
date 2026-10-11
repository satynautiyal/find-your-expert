'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Header,
  Footer,
  QuoteModal,
} from '@/components/common';
import { EButton } from '@/components/EComponents';
import USStateMap from '@/components/USStateMap';
import {
  Search,
  MapPin,
  ShieldCheck,
  FileCheck2,
  Star,
  BarChart3,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  HelpCircle,
  Check,
  Building2,
  Sparkles,
  Phone,
  MessageSquare,
  Layers,
  Wrench,
  Award,
  Users2,
  TrendingUp,
} from 'lucide-react';

export default function Home() {
  const router = useRouter();

  // Search form state
  const [searchNeed, setSearchNeed] = useState('');
  const [searchZip, setSearchZip] = useState('');

  // Quote modal state
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);

  // FAQ accordion open index state
  const [openFaqIndices, setOpenFaqIndices] = useState<number[]>([]);

  // Horizontal scroll ref for popular services
  const servicesScrollRef = useRef<HTMLDivElement>(null);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchNeed.trim()) params.set('search', searchNeed.trim());
    if (searchZip.trim()) params.set('zip', searchZip.trim());
    router.push(`/contractors?${params.toString()}`);
  };

  const handlePopularSearch = (service: string) => {
    router.push(`/contractors?service=${encodeURIComponent(service)}`);
  };

  const toggleFaq = (index: number) => {
    setOpenFaqIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const scrollServices = (direction: 'left' | 'right') => {
    if (servicesScrollRef.current) {
      const scrollAmount = direction === 'left' ? -280 : 280;
      servicesScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Popular Services Data
  const popularServices = [
    {
      name: 'Countertops',
      image: 'https://images.unsplash.com/photo-1556909212-d5b604d0c90d?auto=format&fit=crop&w=300&q=80',
      href: '/contractors?service=Countertops',
    },
    {
      name: 'Kitchen Remodeling',
      image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=300&q=80',
      href: '/contractors?service=Kitchen+Remodeling',
    },
    {
      name: 'Bathroom Remodeling',
      image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=300&q=80',
      href: '/contractors?service=Bathroom+Remodeling',
    },
    {
      name: 'Roofing',
      image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=300&q=80',
      href: '/contractors?service=Roofing',
    },
    {
      name: 'HVAC',
      image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=300&q=80',
      href: '/contractors?service=HVAC',
    },
    {
      name: 'Flooring',
      image: 'https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?auto=format&fit=crop&w=300&q=80',
      href: '/contractors?service=Flooring',
    },
    {
      name: 'Windows & Doors',
      image: 'https://images.unsplash.com/photo-1509644851169-2acc08aa25b5?auto=format&fit=crop&w=300&q=80',
      href: '/contractors?service=Windows+%26+Doors',
    },
    {
      name: 'Painting',
      image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=300&q=80',
      href: '/contractors?service=Painting',
    },
  ];

  // States Data
  const stateList = [
    'Texas',
    'California',
    'Florida',
    'New York',
    'Illinois',
    'Pennsylvania',
    'Ohio',
    'Georgia',
    'North Carolina',
    'Michigan',
    'Arizona',
    'Tennessee',
  ];

  // FAQs Data
  const faqs = [
    {
      question: 'How does HomeProCompare rank contractors?',
      answer:
        'We evaluate contractors across verified license verifications, confirmed liability insurance, cross-platform review sentiment (Google, Yelp, Facebook), BBB standing, and demonstrated project history to produce our independent score.',
    },
    {
      question: 'Do you verify licenses and insurance?',
      answer:
        'Yes. Our editorial and compliance team cross-checks state registry records, license validity, and verified insurance and bonding where available for eligible listed professionals.',
    },
    {
      question: 'Are the contractor reviews real?',
      answer:
        'All aggregated reviews displayed on our platform are drawn from real customer feedback published across verified review directories, filtering out spam and paid testimonials.',
    },
    {
      question: 'Can I contact contractors directly?',
      answer:
        'Yes. You have full transparency to call listed direct phone numbers, request a free quote through our instant form, or visit contractor websites directly without any barriers.',
    },
    {
      question: 'Is it free to use HomeProCompare?',
      answer:
        'Yes, HomeProCompare is 100% free for homeowners. You can search, browse rankings, compare companies, and request estimates with zero cost and no obligation.',
    },
    {
      question: 'Do you work with contractors?',
      answer:
        'Yes. Licensed and insured service professionals can claim their company profile, submit credentials for verification, showcase past projects, and connect directly with local clients.',
    },
  ];

  // Blog articles
  const articles = [
    {
      title: 'Quartz vs Granite Countertops: Which is Right for Your Home?',
      category: 'COUNTERTOPS',
      tagColor: 'bg-orange-50 text-orange-600 border-orange-200',
      excerpt:
        'Compare durability, cost, maintenance and style to choose the best countertop for your kitchen.',
      date: 'Sep 15, 2025',
      image: 'https://images.unsplash.com/photo-1556909212-d5b604d0c90d?auto=format&fit=crop&w=600&q=80',
      slug: 'quartz-vs-granite-countertops',
    },
    {
      title: 'Bathroom Remodeling Costs in 2026: Complete Guide',
      category: 'BATHROOM REMODELING',
      tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      excerpt:
        'Get the latest cost ranges, design ideas and tips to plan your bathroom remodel with confidence.',
      date: 'Sep 11, 2025',
      image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80',
      slug: 'bathroom-remodeling-costs-2026',
    },
    {
      title: 'How to Choose the Right Roofing Contractor',
      category: 'ROOFING',
      tagColor: 'bg-teal-50 text-teal-800 border-teal-200',
      excerpt:
        'Learn what to look for, questions to ask and red flags to avoid before hiring a roofing contractor.',
      date: 'Sep 5, 2025',
      image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80',
      slug: 'how-to-choose-right-roofing-contractor',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-900 flex flex-col font-sans selection:bg-[#0F3E35] selection:text-white">
      {/* 1. Header Navigation */}
      <Header onOpenQuoteModal={() => setQuoteModalOpen(true)} />

      <main className="flex-1">
        {/* ========================================================= */}
        {/* 2. HERO SECTION */}
        {/* ========================================================= */}
        <section className="relative bg-[#FAFBF9] min-h-[580px] lg:min-h-[640px] flex items-center overflow-hidden border-b border-gray-100">
          {/* Background Kitchen Image on Right with Seamless Left Fade */}
          <div className="absolute right-0 top-0 bottom-0 w-full lg:w-[62%] h-full pointer-events-none select-none z-0">
            <img
              src="/hero-kitchen.jpg"
              alt="Luxury modern kitchen with island"
              className="w-full h-full object-cover object-[center_right]"
            />
            {/* Soft left gradient fade into the off-white background */}
            <div className="absolute inset-y-0 left-0 w-36 sm:w-64 lg:w-96 bg-gradient-to-r from-[#FAFBF9] via-[#FAFBF9]/80 to-transparent" />
          </div>



          {/* Main Hero Content (Left-aligned container) */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-12 lg:py-16 relative z-10">
            {/* Top row: Headline on Left, Review Card right beside it per reference mockup */}
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 xl:gap-12 max-w-5xl">
              <div className="max-w-2xl">
                {/* Kicker tag - Dark charcoal, wide tracking per reference */}
                <span className="text-[#111827] font-bold text-[11.5px] sm:text-[12.5px] tracking-[0.18em] uppercase block mb-3.5">
                  TRUSTED. VERIFIED. LOCAL.
                </span>

                {/* Main Headline - Plus Jakarta Sans 700 with exact 1.02 line height and #DA5F2F warm orange */}
                <h1 className="text-4xl sm:text-5xl lg:text-[52px] xl:text-[56px] font-bold text-[#111827] tracking-[-0.03em] leading-[1.02]">
                  Find the Best <span className="text-primary font-bold">Home</span>
                  <br />
                  <span className="text-primary font-bold">Service Contractors</span>
                  <br />
                  Near You
                </h1>

                {/* Subtitle */}
                <p className="mt-4 text-sm sm:text-[15px] lg:text-[15.5px] text-[#4B5563] max-w-[560px] leading-[1.5] font-normal">
                  Compare verified contractors, real customer reviews, project photos,
                  pricing insights and credentials — all in one place.
                </p>
              </div>

              {/* Floating Customer Rating Card (Positioned directly next to the headline over the kitchen transition) */}
              <div className="hidden lg:block shrink-0 mt-3 xl:mt-4">
                <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 sm:p-5 shadow-[0_16px_36px_rgba(0,0,0,0.08)] border border-gray-100/90 w-[295px] animate-in fade-in duration-300">
                  <div className="flex items-center justify-between gap-3">
                    {/* 3 Overlapping customer avatars */}
                    <div className="flex -space-x-2.5 shrink-0">
                      <img
                        src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80"
                        alt="Customer"
                        className="w-9 h-9 rounded-full border-2 border-white object-cover shadow-2xs"
                      />
                      <img
                        src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80"
                        alt="Customer"
                        className="w-9 h-9 rounded-full border-2 border-white object-cover shadow-2xs"
                      />
                      <img
                        src="https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=100&q=80"
                        alt="Customer"
                        className="w-9 h-9 rounded-full border-2 border-white object-cover shadow-2xs"
                      />
                    </div>

                    {/* 5 Amber/Gold Stars + 4.8/5 + 18,500+ */}
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <div className="flex text-amber-500 text-xs tracking-tighter">
                          {'★'.repeat(5)}
                        </div>
                        <span className="text-xs font-bold text-gray-900 tracking-tight">4.8/5</span>
                      </div>
                      <p className="text-[11.5px] font-bold text-gray-900 leading-tight mt-0.5">
                        18,500+ <span className="text-gray-500 font-medium">Homeowners</span>
                      </p>
                    </div>
                  </div>

                  {/* Caption */}
                  <p className="text-[11.5px] font-semibold text-gray-700 leading-tight mt-2.5">
                    found trusted contractors on HomeProCompare
                  </p>
                </div>
              </div>
            </div>

            {/* Dual Search Input Bar */}
            <form
              onSubmit={handleSearchSubmit}
              className="mt-7 bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-gray-200/90 p-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-2xl lg:max-w-[760px] transition-shadow hover:shadow-[0_12px_35px_rgba(0,0,0,0.09)]"
            >
              {/* Search Need Input */}
              <div className="flex items-center gap-2.5 px-3 py-1 flex-1">
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type="text"
                  value={searchNeed}
                  onChange={(e) => setSearchNeed(e.target.value)}
                  placeholder="What do you need done?"
                  className="w-full text-xs sm:text-sm text-gray-800 placeholder-gray-400 bg-transparent focus:outline-none font-normal"
                />
              </div>

              {/* Divider */}
              <div className="hidden sm:block w-px h-8 bg-gray-200 shrink-0" />

              {/* ZIP Code Input */}
              <div className="flex items-center gap-2.5 px-3 py-1 sm:w-44">
                <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type="text"
                  value={searchZip}
                  onChange={(e) => setSearchZip(e.target.value)}
                  placeholder="Enter ZIP code"
                  className="w-full text-xs sm:text-sm text-gray-800 placeholder-gray-400 bg-transparent focus:outline-none font-normal"
                />
              </div>

              {/* Submit Button */}
              <EButton
                type="submit"
                variant="secondary"
                size="xl"
                iconRight={<ArrowRight className="w-4 h-4 stroke-[2.5]" />}
                className="shrink-0"
              >
                Search Contractors
              </EButton>
            </form>

            {/* Popular Searches Pills - All 6 sit on one row on desktop */}
            <div className="mt-4 flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs max-w-3xl">
              <span className="text-[#111827] font-bold mr-1">Popular searches:</span>
              {[
                'Countertops',
                'Kitchen Remodeling',
                'Bathroom Remodeling',
                'Roofing',
                'HVAC',
                'Flooring',
              ].map((item) => (
                <EButton
                  key={item}
                  type="button"
                  variant="pill"
                  size="sm"
                  onClick={() => handlePopularSearch(item)}
                >
                  {item}
                </EButton>
              ))}
            </div>

            {/* Mobile-only Rating Card */}
            <div className="block md:hidden mt-6 bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-md border border-gray-200/80 max-w-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex -space-x-2">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80"
                    alt="Customer"
                    className="w-7 h-7 rounded-full border-2 border-white object-cover"
                  />
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80"
                    alt="Customer"
                    className="w-7 h-7 rounded-full border-2 border-white object-cover"
                  />
                  <img
                    src="https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=80&q=80"
                    alt="Customer"
                    className="w-7 h-7 rounded-full border-2 border-white object-cover"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <div className="flex text-amber-500 text-xs">★★★★★</div>
                  <span className="text-xs font-black text-gray-900">4.8/5</span>
                </div>
              </div>
              <div className="mt-1.5">
                <span className="font-black text-xs text-gray-900">18,500+</span>{' '}
                <span className="text-xs text-gray-500">Homeowners</span>
                <p className="text-[11px] text-gray-600 font-medium">
                  found trusted contractors on HomeProCompare
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 3. VALUE PROPOSITION STRIP (Trust Badges) */}
        {/* ========================================================= */}
        <section className="bg-[#F1F7F4] border-y border-[#E2EBE5] py-5 sm:py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-6 xl:gap-8">
              {/* Item 1: Licenses Checked */}
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-white/90 flex items-center justify-center shrink-0">
                  <svg className="w-7 h-7 text-[#0B3B2C]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="M12 2.5v19" />
                    <path d="M5 13.5c1.5 2.5 4 3.5 7 3.5v-7.5c-3.2 0-5.8 1.2-7 4z" fill="#0B3B2C" stroke="none" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-[13.5px] sm:text-[14px] text-[#0E2D1F] tracking-[-0.01em]">
                    Licenses Checked
                  </h3>
                  <p className="text-[11.5px] sm:text-[12px] text-[#5A6578] mt-0.5 leading-[1.35]">
                    We verify state licenses for eligible contractors.
                  </p>
                </div>
              </div>

              {/* Item 2: Insurance Verified */}
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-white/90 flex items-center justify-center shrink-0">
                  <svg className="w-7 h-7 text-[#0B3B2C]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="m9 12 2 2 4-4" strokeWidth="2.4" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-[13.5px] sm:text-[14px] text-[#0E2D1F] tracking-[-0.01em]">
                    Insurance Verified
                  </h3>
                  <p className="text-[11.5px] sm:text-[12px] text-[#5A6578] mt-0.5 leading-[1.35]">
                    Confirmed insurance and bonding where available.
                  </p>
                </div>
              </div>

              {/* Item 3: Real Customer Reviews */}
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-white/90 flex items-center justify-center shrink-0">
                  <Star className="w-7 h-7 text-[#0B3B2C] stroke-[2.2] fill-none" />
                </div>
                <div>
                  <h3 className="font-bold text-[13.5px] sm:text-[14px] text-[#0E2D1F] tracking-[-0.01em]">
                    Real Customer Reviews
                  </h3>
                  <p className="text-[11.5px] sm:text-[12px] text-[#5A6578] mt-0.5 leading-[1.35]">
                    Ratings from multiple trusted platforms.
                  </p>
                </div>
              </div>

              {/* Item 4: Rankings Never Sold */}
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-white/90 flex items-center justify-center shrink-0">
                  <svg className="w-7 h-7 text-[#0B3B2C]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="14" width="4.5" height="7" rx="1.5" />
                    <rect x="10" y="8" width="4.5" height="13" rx="1.5" />
                    <rect x="17" y="3" width="4.5" height="18" rx="1.5" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-[13.5px] sm:text-[14px] text-[#0E2D1F] tracking-[-0.01em]">
                    Rankings Never Sold
                  </h3>
                  <p className="text-[11.5px] sm:text-[12px] text-[#5A6578] mt-0.5 leading-[1.35]">
                    Our rankings are independent and not influenced by contractors.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 4. ABOUT HOMEPROCOMPARE */}
        {/* ========================================================= */}
        <section id="about" className="py-14 sm:py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              {/* Left Column: Text + CTA */}
              <div className="lg:col-span-6 max-w-xl">
                <span className="text-[#0B3B2C] font-bold text-[11.5px] sm:text-[12px] tracking-[0.15em] uppercase block mb-3">
                  ABOUT HOMEPROCOMPARE
                </span>
                <h2 className="text-3xl sm:text-4xl lg:text-[40px] xl:text-[43px] font-bold text-[#111827] tracking-[-0.028em] leading-[1.08]">
                  A Smarter Way to Find
                  <br />
                  Home Service Contractors
                </h2>
                <p className="mt-4 text-[14px] sm:text-[14.5px] text-[#4B5563] leading-[1.58] max-w-[470px]">
                  HomeProCompare helps homeowners find and compare the best home service
                  contractors across the USA. We verify licenses, insurance, reviews and
                  project quality so you can make confident decisions. Our mission is to make
                  home improvement easier, safer and more transparent for everyone.
                </p>
                <div className="mt-7">
                  <EButton
                    href="/contractors"
                    variant="secondary"
                    size="xl"
                    iconRight={<ArrowRight className="w-4 h-4 stroke-[2.5]" />}
                  >
                    Learn More About Us
                  </EButton>
                </div>
              </div>

              {/* Right Column: Composite House Image + Overlapping Floating Stats Card */}
              <div className="lg:col-span-6">
                <div className="relative w-full aspect-[16/10] sm:aspect-[16/9.6] max-w-[590px] ml-auto">
                  {/* Luxury Suburban Home Photo */}
                  <div className="w-full h-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-gray-100 relative">
                    <img
                      src="/about-house.jpg"
                      alt="A Smarter Way to Find Home Service Contractors"
                      className="w-full h-full object-cover object-[15%_center]"
                    />
                  </div>

                  {/* Overlapping Floating Stats Card (Desktop & Tablet) */}
                  <div className="hidden sm:flex absolute right-0 top-0 bottom-0 w-[225px] sm:w-[245px] lg:w-[255px] bg-white rounded-2xl sm:rounded-3xl shadow-[-12px_0_35px_rgba(0,0,0,0.08),0_10px_25px_rgba(0,0,0,0.04)] border border-gray-100/90 p-5 sm:p-6 lg:p-6.5 z-10 flex-col justify-between">
                    {/* Stat 1: 50+ States Covered */}
                    <div className="flex items-center gap-3.5">
                      <div className="w-8 h-8 flex items-center justify-center shrink-0">
                        <svg className="w-[26px] h-[26px] text-[#0B3B2C]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 6.5C5.2 6 6.8 6.6 8 7.5c1.2.9 2.4.7 3.5 0 1.2-.8 2.5-.7 3.8-.2 1.3.5 2.7.2 3.7-.5.8 1.4 1 3.2.2 4.8-.6 1.2-.5 2.6-.1 3.9.4 1.3-.2 2.7-1.4 3.5-1.5 1-3.2.5-4.8 1.2-1.3.6-2.5 1.8-4.2 1.5-1.2-.2-2.1-1.3-3.2-1.8-1.5-.7-2.6.4-4-.1-1-.4-1.2-1.8-1.3-3-.2-2.1-.2-4.2.3-6.2.3-1.4-.4-2.8-.5-4.2C3.1 7.4 3.5 6.7 4 6.5z" />
                          <circle cx="12" cy="11.5" r="1.3" fill="#0B3B2C" stroke="none" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xl sm:text-[23px] font-bold text-[#111827] tracking-tight leading-none">50+</div>
                        <div className="text-xs sm:text-[12.5px] text-[#5A6578] font-normal mt-1 leading-tight">States Covered</div>
                      </div>
                    </div>

                    {/* Stat 2: 200,000+ Contractors Listed */}
                    <div className="flex items-center gap-3.5">
                      <div className="w-8 h-8 flex items-center justify-center shrink-0">
                        <svg className="w-[26px] h-[26px] text-[#0B3B2C]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M7.5 7a4.5 4.5 0 0 1 9 0" />
                          <path d="M5.5 9.5h13" />
                          <circle cx="12" cy="7" r="1" fill="#0B3B2C" stroke="none" />
                          <path d="M8.5 9.5v2a3.5 3.5 0 0 0 7 0v-2" />
                          <path d="M4.5 21v-1a7.5 7.5 0 0 1 15 0v1" />
                          <path d="M9.5 16.5v4.5M14.5 16.5v4.5" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xl sm:text-[23px] font-bold text-[#111827] tracking-tight leading-none">200,000+</div>
                        <div className="text-xs sm:text-[12.5px] text-[#5A6578] font-normal mt-1 leading-tight">Contractors Listed</div>
                      </div>
                    </div>

                    {/* Stat 3: 1M+ Homeowner Reviews */}
                    <div className="flex items-center gap-3.5">
                      <div className="w-8 h-8 flex items-center justify-center shrink-0">
                        <svg className="w-[26px] h-[26px] text-[#0B3B2C]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="12 2.5 15.1 8.8 22 9.8 17 14.7 18.2 21.5 12 18.2 5.8 21.5 7 14.7 2 9.8 8.9 8.8 12 2.5" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xl sm:text-[23px] font-bold text-[#111827] tracking-tight leading-none">1M+</div>
                        <div className="text-xs sm:text-[12.5px] text-[#5A6578] font-normal mt-1 leading-tight">Homeowner Reviews</div>
                      </div>
                    </div>

                    {/* Stat 4: 25+ Home Service Categories */}
                    <div className="flex items-center gap-3.5">
                      <div className="w-8 h-8 flex items-center justify-center shrink-0">
                        <svg className="w-[26px] h-[26px] text-[#0B3B2C]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3.5 10.5L12 3.5l8.5 7V20a1.5 1.5 0 0 1-1.5 1.5h-14A1.5 1.5 0 0 1 3.5 20v-9.5z" />
                          <path d="m8.5 12.5 2.5 2.5 4.5-4.5" strokeWidth="2.4" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xl sm:text-[23px] font-bold text-[#111827] tracking-tight leading-none">25+</div>
                        <div className="text-xs sm:text-[12.5px] text-[#5A6578] font-normal mt-1 leading-tight">Home Service Categories</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile-only stacked stats card */}
                <div className="sm:hidden mt-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2.5">
                    <svg className="w-5 h-5 text-[#0B3B2C] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 6.5C5.2 6 6.8 6.6 8 7.5c1.2.9 2.4.7 3.5 0 1.2-.8 2.5-.7 3.8-.2 1.3.5 2.7.2 3.7-.5.8 1.4 1 3.2.2 4.8-.6 1.2-.5 2.6-.1 3.9.4 1.3-.2 2.7-1.4 3.5-1.5 1-3.2.5-4.8 1.2-1.3.6-2.5 1.8-4.2 1.5-1.2-.2-2.1-1.3-3.2-1.8-1.5-.7-2.6.4-4-.1-1-.4-1.2-1.8-1.3-3-.2-2.1-.2-4.2.3-6.2.3-1.4-.4-2.8-.5-4.2C3.1 7.4 3.5 6.7 4 6.5z" />
                    </svg>
                    <div>
                      <div className="text-lg font-bold text-gray-950 leading-none">50+</div>
                      <div className="text-[11px] text-[#5A6578] mt-0.5">States Covered</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <svg className="w-5 h-5 text-[#0B3B2C] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8 6.5a4 4 0 0 1 8 0" />
                      <path d="M6 9h12" />
                      <path d="M8.5 9v2a3.5 3.5 0 0 0 7 0V9" />
                      <path d="M4.5 21v-1a7.5 7.5 0 0 1 15 0v1" />
                    </svg>
                    <div>
                      <div className="text-lg font-bold text-gray-950 leading-none">200k+</div>
                      <div className="text-[11px] text-[#5A6578] mt-0.5">Contractors</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <svg className="w-5 h-5 text-[#0B3B2C] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2.5 15.1 8.8 22 9.8 17 14.7 18.2 21.5 12 18.2 5.8 21.5 7 14.7 2 9.8 8.9 8.8 12 2.5" />
                    </svg>
                    <div>
                      <div className="text-lg font-bold text-gray-950 leading-none">1M+</div>
                      <div className="text-[11px] text-[#5A6578] mt-0.5">Reviews</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <svg className="w-5 h-5 text-[#0B3B2C] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3.5 10.5L12 3.5l8.5 7V20a1.5 1.5 0 0 1-1.5 1.5h-14A1.5 1.5 0 0 1 3.5 20v-9.5z" />
                      <path d="m8.5 12.5 2.5 2.5 4.5-4.5" strokeWidth="2.4" />
                    </svg>
                    <div>
                      <div className="text-lg font-bold text-gray-950 leading-none">25+</div>
                      <div className="text-[11px] text-[#5A6578] mt-0.5">Categories</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 5. POPULAR HOME SERVICES */}
        {/* ========================================================= */}
        <section className="py-14 sm:py-16 bg-[#F9FAFB] border-t border-gray-200/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="flex items-end justify-between mb-8">
              <div>
                <span className="text-[#0F3E35] font-extrabold text-[11px] uppercase tracking-wider block mb-1">
                  POPULAR HOME SERVICES
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-gray-950 tracking-tight">
                  Find Contractors by Project Type
                </h2>
              </div>

              <div className="flex items-center gap-4">
                <Link
                  href="/contractors"
                  className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-[#DA5F2F] hover:text-[#C44D29] hover:underline"
                >
                  <span>View all services</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <div className="flex items-center gap-1.5">
                  <EButton
                    type="button"
                    variant="outline"
                    size="iconRound"
                    onClick={() => scrollServices('left')}
                    aria-label="Previous services"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </EButton>
                  <EButton
                    type="button"
                    variant="outline"
                    size="iconRound"
                    onClick={() => scrollServices('right')}
                    aria-label="Next services"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </EButton>
                </div>
              </div>
            </div>

            {/* Circular Category items */}
            <div
              ref={servicesScrollRef}
              className="flex items-start gap-6 sm:gap-8 overflow-x-auto pb-4 pt-2 no-scrollbar scroll-smooth"
            >
              {popularServices.map((service) => (
                <Link
                  key={service.name}
                  href={service.href}
                  className="flex flex-col items-center group shrink-0 w-24 sm:w-28 text-center"
                >
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-white shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-200">
                    <img
                      src={service.image}
                      alt={service.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="font-bold text-xs text-gray-800 group-hover:text-[#0F3E35] transition-colors mt-3 leading-snug">
                    {service.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 6. BROWSE BY STATE */}
        {/* ========================================================= */}
        <section id="states" className="py-14 sm:py-20 bg-white border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 xl:gap-12 items-center">
              {/* Left Column: State buttons grid */}
              <div className="lg:col-span-7">
                <span className="text-[#0B3B2C] font-bold text-[11.5px] sm:text-[12px] tracking-[0.15em] uppercase block mb-2.5">
                  BROWSE BY STATE
                </span>
                <h2 className="text-2xl sm:text-3xl lg:text-[34px] xl:text-[36px] font-bold text-[#111827] tracking-[-0.025em] leading-[1.15]">
                  Find Top Contractors in Your State
                </h2>
                <p className="text-sm sm:text-[14.5px] text-[#4B5563] mt-2 mb-6 font-normal">
                  Explore contractors by state to find trusted local professionals.
                </p>

                {/* 4-column state button grid matching reference mockup */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                  {stateList.map((state) => (
                    <Link
                      key={state}
                      href={`/contractors?state=${encodeURIComponent(state)}`}
                      className="flex items-center gap-2 px-3 py-2.5 sm:px-3.5 sm:py-2.5 bg-white border border-gray-100 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:border-[#0B3B2C] hover:text-[#0B3B2C] hover:shadow-xs transition-all group"
                    >
                      <MapPin className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#0B3B2C] shrink-0" />
                      <span className="text-[12.5px] sm:text-[13px] font-semibold text-[#111827] group-hover:text-[#0B3B2C] truncate">
                        {state}
                      </span>
                    </Link>
                  ))}
                </div>

                <div className="pt-6">
                  <EButton
                    href="/contractors"
                    variant="secondaryOutline"
                    size="lg"
                    iconRight={<ArrowRight className="w-4 h-4 stroke-[2]" />}
                  >
                    View All States
                  </EButton>
                </div>
              </div>

              {/* Right Column: Stylized Continental USA Map */}
              <div className="lg:col-span-5">
                <USStateMap />
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 7. HOW IT WORKS */}
        {/* ========================================================= */}
        <section id="how-it-works" className="py-14 sm:py-20 bg-white border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header: Left-aligned per reference mockup */}
            <div className="mb-10 sm:mb-12">
              <span className="text-[#0B3B2C] font-bold text-[11.5px] sm:text-[12px] tracking-[0.15em] uppercase block mb-2">
                - HOW IT WORKS
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-[34px] xl:text-[36px] font-bold text-[#111827] tracking-[-0.025em] leading-[1.15]">
                A Simple Way to Find the Right Contractor
              </h2>
            </div>

            {/* 4 Process Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
              {/* Step 1 */}
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100/90 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-md transition-shadow relative flex flex-col justify-between">
                <div>
                  {/* Top row: Number and Main Icon side-by-side on left */}
                  <div className="flex items-center gap-3.5 mb-5">
                    <div className="w-6 h-6 rounded-full bg-[#DA5F2F] text-white flex items-center justify-center font-bold text-xs shrink-0">
                      1
                    </div>
                    <svg className="w-7 h-7 sm:w-8 sm:h-8 text-[#0B3B2C] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="7" />
                      <path d="m21 21-4.35-4.35" />
                    </svg>
                  </div>

                  {/* Title row with small green arrow */}
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-3.5 h-3.5 text-[#9EBDB0] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                    <h3 className="font-bold text-[14.5px] sm:text-[15px] text-[#111827] tracking-tight">
                      Search Your Project
                    </h3>
                  </div>

                  <p className="text-[12px] sm:text-[12.5px] text-[#5A6578] leading-[1.55]">
                    Enter what you need done and your ZIP code to find local contractors.
                  </p>
                </div>

                {/* Arrow connecting to Step 2 on Desktop */}
                <div className="hidden lg:flex absolute -right-3.5 top-[52%] -translate-y-1/2 z-10 text-[#9EBDB0]">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100/90 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-md transition-shadow relative flex flex-col justify-between">
                <div>
                  {/* Top row: Number and Main Icon */}
                  <div className="flex items-center gap-3.5 mb-5">
                    <div className="w-6 h-6 rounded-full bg-[#DA5F2F] text-white flex items-center justify-center font-bold text-xs shrink-0">
                      2
                    </div>
                    <svg className="w-7 h-7 sm:w-8 sm:h-8 text-[#0B3B2C] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="4.5" cy="6" r="1.5" />
                      <circle cx="4.5" cy="12" r="1.5" />
                      <circle cx="4.5" cy="18" r="1.5" />
                      <path d="M10 6h11M10 12h11M10 18h11" />
                    </svg>
                  </div>

                  {/* Title row with small green arrow */}
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-3.5 h-3.5 text-[#9EBDB0] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                    <h3 className="font-bold text-[14.5px] sm:text-[15px] text-[#111827] tracking-tight">
                      Compare Contractors
                    </h3>
                  </div>

                  <p className="text-[12px] sm:text-[12.5px] text-[#5A6578] leading-[1.55]">
                    View verified profiles, reviews, credentials, project photos and pricing insights.
                  </p>
                </div>

                {/* Arrow connecting to Step 3 on Desktop */}
                <div className="hidden lg:flex absolute -right-3.5 top-[52%] -translate-y-1/2 z-10 text-[#9EBDB0]">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100/90 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-md transition-shadow relative flex flex-col justify-between">
                <div>
                  {/* Top row: Number and Main Icon */}
                  <div className="flex items-center gap-3.5 mb-5">
                    <div className="w-6 h-6 rounded-full bg-[#DA5F2F] text-white flex items-center justify-center font-bold text-xs shrink-0">
                      3
                    </div>
                    <svg className="w-7 h-7 sm:w-8 sm:h-8 text-[#0B3B2C] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2.5 15.1 8.8 22 9.8 17 14.7 18.2 21.5 12 18.2 5.8 21.5 7 14.7 2 9.8 8.9 8.8 12 2.5" />
                    </svg>
                  </div>

                  {/* Title row with small green arrow */}
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-3.5 h-3.5 text-[#9EBDB0] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                    <h3 className="font-bold text-[14.5px] sm:text-[15px] text-[#111827] tracking-tight">
                      Find the Best Fit
                    </h3>
                  </div>

                  <p className="text-[12px] sm:text-[12.5px] text-[#5A6578] leading-[1.55]">
                    Use our independent rankings and comparisons to choose the right contractor.
                  </p>
                </div>

                {/* Arrow connecting to Step 4 on Desktop */}
                <div className="hidden lg:flex absolute -right-3.5 top-[52%] -translate-y-1/2 z-10 text-[#9EBDB0]">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </div>
              </div>

              {/* Step 4 */}
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100/90 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-md transition-shadow relative flex flex-col justify-between">
                <div>
                  {/* Top row: Number and Main Icon */}
                  <div className="flex items-center gap-3.5 mb-5">
                    <div className="w-6 h-6 rounded-full bg-[#DA5F2F] text-white flex items-center justify-center font-bold text-xs shrink-0">
                      4
                    </div>
                    <svg className="w-7 h-7 sm:w-8 sm:h-8 text-[#0B3B2C] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 5h3a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3h-1v2.5L13 15" />
                      <path d="M14 13.5A4.5 4.5 0 0 1 6 16.5L3 17.5l1-2.5A4.5 4.5 0 1 1 14 13.5z" />
                      <circle cx="6.5" cy="11.5" r="1.1" fill="currentColor" stroke="none" />
                      <circle cx="9" cy="11.5" r="1.1" fill="currentColor" stroke="none" />
                      <circle cx="11.5" cy="11.5" r="1.1" fill="currentColor" stroke="none" />
                    </svg>
                  </div>

                  {/* Title row with small green arrow */}
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-3.5 h-3.5 text-[#9EBDB0] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                    <h3 className="font-bold text-[14.5px] sm:text-[15px] text-[#111827] tracking-tight">
                      Get in Touch
                    </h3>
                  </div>

                  <p className="text-[12px] sm:text-[12.5px] text-[#5A6578] leading-[1.55]">
                    Request a quote or contact the contractor directly through our platform.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 8. LATEST BLOGS & UPDATES */}
        {/* ========================================================= */}
        <section className="py-14 sm:py-20 bg-white border-t border-gray-200/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="flex items-end justify-between mb-8">
              <div>
                <span className="text-[#0F3E35] font-extrabold text-[11px] uppercase tracking-wider block mb-1">
                  LATEST BLOGS & UPDATES
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-gray-950 tracking-tight">
                  Expert Advice for Your Home Projects
                </h2>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/blog"
                  className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-[#DA5F2F] hover:text-[#C44D29] hover:underline"
                >
                  <span>View all articles</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <div className="flex items-center gap-1.5">
                  <EButton
                    type="button"
                    variant="outline"
                    size="iconRound"
                    aria-label="Previous articles"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </EButton>
                  <EButton
                    type="button"
                    variant="outline"
                    size="iconRound"
                    aria-label="Next articles"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </EButton>
                </div>
              </div>
            </div>

            {/* 3 Blog Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {articles.map((article) => (
                <div
                  key={article.title}
                  className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between group"
                >
                  <div>
                    <div className="relative aspect-[16/10] overflow-hidden">
                      <img
                        src={article.image}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>

                    <div className="p-5 space-y-2.5">
                      <span
                        className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${article.tagColor}`}
                      >
                        {article.category}
                      </span>
                      <h3 className="font-extrabold text-sm sm:text-base text-gray-950 group-hover:text-[#0F3E35] transition-colors leading-snug line-clamp-2">
                        <Link href="/blog">{article.title}</Link>
                      </h3>
                      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                        {article.excerpt}
                      </p>
                    </div>
                  </div>

                  <div className="px-5 pb-5 pt-2 flex items-center justify-between border-t border-gray-100 text-xs text-gray-400">
                    <span>{article.date}</span>
                    <Link
                      href="/blog"
                      className="font-bold text-[#DA5F2F] hover:text-[#C44D29] hover:underline flex items-center gap-1"
                    >
                      <span>Read Article</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 9. FREQUENTLY ASKED QUESTIONS */}
        {/* ========================================================= */}
        <section id="faq" className="py-12 sm:py-16 lg:py-20 bg-white border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header: Left Kicker + Title, Right Link + Circle Button */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-10">
              <div>
                <span className="text-[#0B3B2C] font-bold text-[11px] sm:text-[11.5px] tracking-[0.16em] uppercase block mb-2">
                  - FREQUENTLY ASKED QUESTIONS
                </span>
                <h2 className="text-2xl sm:text-3xl lg:text-[34px] xl:text-[36px] font-bold text-[#111827] tracking-[-0.025em] leading-[1.12]">
                  Quick Answers for Homeowners
                </h2>
              </div>

              <Link
                href="#faq"
                className="inline-flex items-center gap-2.5 group cursor-pointer self-start sm:self-end"
              >
                <span className="text-[12.5px] sm:text-[13px] font-bold text-[#DA5F2F] group-hover:text-[#C44D29] transition-colors">
                  View all FAQs &rarr;
                </span>
                <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-gray-200/90 bg-white flex items-center justify-center text-[#DA5F2F] shadow-2xs group-hover:border-[#DA5F2F] group-hover:bg-[#DA5F2F] group-hover:text-white transition-colors">
                  <ChevronRight className="w-3.5 h-3.5 stroke-[2.4]" />
                </span>
              </Link>
            </div>

            {/* Content: 2-Column Accordion Grid + Right Illustration Card */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 xl:gap-8 items-center">
              {/* FAQs: 2 Columns of 3 items each */}
              <div className="lg:col-span-8 xl:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-3.5">
                {/* Column 1 (indices 0, 2, 4) */}
                <div className="space-y-3 sm:space-y-3.5">
                  {[0, 2, 4].map((index) => {
                    const faq = faqs[index];
                    const isOpen = openFaqIndices.includes(index);
                    return (
                      <div
                        key={faq.question}
                        className="bg-white rounded-xl border border-gray-200/80 hover:border-gray-300 transition-all shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
                      >
                        <button
                          type="button"
                          onClick={() => toggleFaq(index)}
                          className="w-full flex items-center justify-between gap-3 text-left px-4 py-3 sm:px-5 sm:py-3.5 cursor-pointer select-none"
                        >
                          <span className="font-bold text-[13px] sm:text-[13.5px] text-[#111827] leading-snug tracking-tight">
                            {faq.question}
                          </span>
                          <ChevronDown
                            className={`w-3.5 h-3.5 text-[#111827] shrink-0 stroke-[2] transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#0B3B2C]' : ''
                              }`}
                          />
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-3.5 sm:px-5 sm:pb-4 text-[12.5px] text-[#5A6578] leading-relaxed border-t border-gray-100 pt-2 animate-in fade-in duration-150">
                            {faq.answer}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Column 2 (indices 1, 3, 5) */}
                <div className="space-y-3 sm:space-y-3.5">
                  {[1, 3, 5].map((index) => {
                    const faq = faqs[index];
                    const isOpen = openFaqIndices.includes(index);
                    return (
                      <div
                        key={faq.question}
                        className="bg-white rounded-xl border border-gray-200/80 hover:border-gray-300 transition-all shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
                      >
                        <button
                          type="button"
                          onClick={() => toggleFaq(index)}
                          className="w-full flex items-center justify-between gap-3 text-left px-4 py-3 sm:px-5 sm:py-3.5 cursor-pointer select-none"
                        >
                          <span className="font-bold text-[13px] sm:text-[13.5px] text-[#111827] leading-snug tracking-tight">
                            {faq.question}
                          </span>
                          <ChevronDown
                            className={`w-3.5 h-3.5 text-[#111827] shrink-0 stroke-[2] transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#0B3B2C]' : ''
                              }`}
                          />
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-3.5 sm:px-5 sm:pb-4 text-[12.5px] text-[#5A6578] leading-relaxed border-t border-gray-100 pt-2 animate-in fade-in duration-150">
                            {faq.answer}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Side: 3D Illustration + Floating Card aligned with right edge */}
              <div className="lg:col-span-4 xl:col-span-3 flex flex-col items-center lg:items-end justify-center relative pt-1 sm:pt-2">
                {/* Soft 3D circular illustration backdrop */}
                <div className="w-44 h-44 sm:w-48 sm:h-48 -mb-14 sm:-mb-16 lg:mr-3 relative z-0 flex items-center justify-center opacity-70">
                  <img
                    src="/faq-house.png"
                    alt="HomePro FAQ illustration"
                    className="w-full h-full object-contain pointer-events-none select-none"
                  />
                </div>

                {/* Floating White Card */}
                <div className="w-full max-w-[245px] sm:max-w-[260px] bg-white rounded-2xl px-4 py-3.5 sm:py-4 border border-gray-100/90 shadow-[0_8px_25px_rgba(0,0,0,0.05)] relative z-10 flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#EAF4EE] border border-[#D5EADB] flex items-center justify-center shrink-0">
                    <svg
                      className="w-5 h-5 text-[#0B3B2C]"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 2.5 4.5 5.8v6.5c0 5 3.5 8 7.5 9.2 4-1.2 7.5-4.2 7.5-9.2V5.8L12 2.5z" />
                      <path d="M9.8 9.2a2.3 2.3 0 0 1 4.4.6c0 1.4-1.7 2-2.2 2.8" />
                      <circle cx="12" cy="16.5" r="0.8" fill="currentColor" stroke="none" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-[13.5px] sm:text-[14px] text-[#111827] tracking-tight leading-tight">
                      Still have questions?
                    </h3>
                    <p className="text-[11px] sm:text-[11.5px] text-[#5A6578] mt-0.5 leading-tight">
                      Visit our full FAQ section.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 10. FOR CONTRACTORS BANNER */}
        {/* ========================================================= */}
        <section id="contractors" className="py-12 sm:py-16 bg-[#FAF8F5]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-[#FAF9F6] border border-[#E2EBE5] rounded-3xl overflow-hidden relative shadow-[0_4px_25px_rgba(0,0,0,0.03)]">
              <div className="grid grid-cols-1 lg:grid-cols-12 items-center min-h-[340px] sm:min-h-[360px]">
                {/* Left Column: Contractor Photo + Overlapping Feature Card */}
                <div className="lg:col-span-4 relative flex items-center h-full min-h-[320px] sm:min-h-[360px] overflow-hidden">
                  {/* Contractor Image with cap, plaid shirt and tool belt */}
                  <div className="w-[190px] sm:w-[220px] lg:w-[235px] h-[320px] sm:h-[360px] shrink-0 relative overflow-hidden">
                    <img
                      src="/contractor-portrait.jpg"
                      alt="Professional verified contractor with tools"
                      className="w-full h-full object-cover object-[center_top]"
                    />
                    {/* Soft fade on the right side into the background */}
                    <div className="absolute inset-y-0 right-0 w-14 bg-gradient-to-l from-[#FAF9F6] via-[#FAF9F6]/60 to-transparent pointer-events-none" />
                  </div>

                  {/* Floating White Feature Card */}
                  <div className="absolute left-[140px] sm:left-[165px] lg:left-[175px] z-10 bg-white rounded-2xl p-3.5 sm:p-4 border border-gray-100/90 shadow-[0_10px_30px_rgba(0,0,0,0.06)] shrink-0 w-[180px] sm:w-[195px]">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#EBF5F0] text-[#0B3B2C] flex items-center justify-center shrink-0">
                          <TrendingUp className="w-3.5 h-3.5 stroke-[2.4]" />
                        </div>
                        <span className="font-bold text-[12px] sm:text-[12.5px] text-[#111827] tracking-tight">
                          Increase Visibility
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#EBF5F0] text-[#0B3B2C] flex items-center justify-center shrink-0">
                          <Users2 className="w-3.5 h-3.5 stroke-[2.4]" />
                        </div>
                        <span className="font-bold text-[12px] sm:text-[12.5px] text-[#111827] tracking-tight">
                          Get More Leads
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#EBF5F0] text-[#0B3B2C] flex items-center justify-center shrink-0">
                          <Sparkles className="w-3.5 h-3.5 stroke-[2.4]" />
                        </div>
                        <span className="font-bold text-[12px] sm:text-[12.5px] text-[#111827] tracking-tight">
                          Showcase Your Work
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Middle Column: Headline, Copy & Action Buttons */}
                <div className="lg:col-span-5 px-6 py-8 sm:px-6 lg:px-6 xl:px-8 lg:py-10 z-10">
                  <span className="text-[#0B3B2C] font-bold text-[11px] sm:text-[11.5px] tracking-[0.16em] uppercase block mb-2">
                    FOR CONTRACTORS
                  </span>
                  <h2 className="text-2xl sm:text-[27px] lg:text-[28px] xl:text-[31px] font-bold text-[#111827] tracking-[-0.025em] leading-[1.15] mb-3">
                    Grow Your Business with HomeProCompare
                  </h2>
                  <p className="text-[13px] sm:text-[13.5px] text-[#5A6578] leading-[1.55] max-w-[460px] mb-6">
                    Claim your free profile to showcase your services, display your work, and connect with homeowners looking for trusted professionals.
                  </p>
                  <div className="flex flex-wrap items-center gap-3.5">
                    <EButton
                      type="button"
                      variant="primary"
                      size="xl"
                      onClick={() => setQuoteModalOpen(true)}
                      iconRight={<ArrowRight className="w-4 h-4 stroke-[2.2]" />}
                    >
                      Claim Your Free Profile
                    </EButton>
                    <EButton
                      href="/contractors"
                      variant="secondary"
                      size="xl"
                    >
                      Learn More
                    </EButton>
                  </div>
                </div>

                {/* Right Column: Business Profile Card + 3D Bar Chart Floating Cluster */}
                <div className="lg:col-span-3 px-6 pb-8 lg:px-4 lg:py-8 lg:mr-8 flex justify-center lg:justify-end relative">
                  {/* Soft mint circular backdrop disc */}
                  <div className="w-52 h-52 sm:w-60 sm:h-60 rounded-full bg-[#EBF5F0] border border-[#DEEAE2]/70 absolute -right-2 sm:right-0 top-1/2 -translate-y-1/2 pointer-events-none opacity-80" />

                  {/* Main Business Profile Card */}
                  <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-[0_10px_30px_rgba(0,0,0,0.06)] relative z-10 w-[200px] sm:w-[215px]">
                    <h3 className="font-bold text-[13.5px] sm:text-[14px] text-[#111827] tracking-tight mb-3.5">
                      Your Business Profile
                    </h3>
                    <div className="space-y-2.5">
                      {[
                        'Manage Info',
                        'Add Photos',
                        'Showcase Services',
                        'Get More Leads',
                      ].map((item) => (
                        <div key={item} className="flex items-center gap-2">
                          <div className="w-4.5 h-4.5 rounded-full bg-[#EBF5F0] text-[#0B3B2C] flex items-center justify-center shrink-0">
                            <Check className="w-2.8 h-2.8 stroke-[3]" />
                          </div>
                          <span className="font-bold text-[11.5px] sm:text-[12px] text-[#111827]">
                            {item}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Overlapping Growth Bar Chart Card */}
                  <div className="absolute -right-4 sm:-right-6 bottom-3 sm:bottom-5 bg-white rounded-2xl p-3 border border-gray-100 shadow-[0_12px_28px_rgba(0,0,0,0.09)] z-20 flex items-end gap-1.5 h-[84px] w-[88px] sm:w-[94px] justify-center">
                    <div className="w-3 bg-[#A3D9BC] rounded-t-md h-7" />
                    <div className="w-3 bg-[#52B788] rounded-t-md h-11" />
                    <div className="w-3 bg-[#2D6A4F] rounded-t-md h-14" />
                    <div className="w-3 bg-[#0B3B2C] rounded-t-md h-[68px]" />
                  </div>

                  {/* Small floating badge */}
                  <div className="absolute -right-1 sm:-right-2 top-3 sm:top-5 bg-white rounded-xl p-2 border border-gray-100 shadow-sm z-15 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-lg bg-[#EBF5F0] text-[#0B3B2C] flex items-center justify-center">
                      <FileCheck2 className="w-3.5 h-3.5 stroke-[2.2]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 11. Universal Footer */}
      <Footer />

      {/* Universal Quote Modal for Lead Capture */}
      <QuoteModal
        isOpen={quoteModalOpen}
        onClose={() => setQuoteModalOpen(false)}
      />
    </div>
  );
}
