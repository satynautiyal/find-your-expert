'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown, Heart, Menu, X } from 'lucide-react';
import { EButton } from '@/components/EComponents';
import { fetchCategories, type CategoryItem } from '@/lib/api';
import { getServiceUrl, getStateUrl } from '@/lib/seo-urls';
import BrandLogo from './BrandLogo';

export interface HeaderProps {
  onOpenQuoteModal?: () => void;
  savedCount?: number;
}

export default function Header({ onOpenQuoteModal, savedCount = 0 }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);
  const [statesDropdownOpen, setStatesDropdownOpen] = useState(false);
  const [resourcesDropdownOpen, setResourcesDropdownOpen] = useState(false);
  const [aboutDropdownOpen, setAboutDropdownOpen] = useState(false);
  const [dbCategories, setDbCategories] = useState<CategoryItem[]>([]);

  useEffect(() => {
    fetchCategories()
      .then((cats) => {
        if (cats && cats.length > 0) setDbCategories(cats);
      })
      .catch(() => {});
  }, []);

  const popularServices = dbCategories.flatMap((cat) => {
    const svcHref = getServiceUrl(cat.slug || cat.name);
    return [
      { name: cat.name, href: svcHref },
      ...(cat.subServices || []).slice(0, 3).map((sub) => ({
        name: sub.name,
        href: `${svcHref}?subservice=${encodeURIComponent(sub.name)}`,
      })),
    ];
  });

  const popularLocations = [
    { name: 'New York City, NY', href: '/custom-cabinets/new-york-city-ny' },
    { name: 'New York', href: getStateUrl('custom-cabinets', 'New York') },
    { name: 'California', href: getStateUrl('custom-cabinets', 'California') },
    { name: 'Texas', href: getStateUrl('custom-cabinets', 'Texas') },
    { name: 'Florida', href: getStateUrl('custom-cabinets', 'Florida') },
    { name: 'Illinois', href: getStateUrl('custom-cabinets', 'Illinois') },
    { name: 'Pennsylvania', href: getStateUrl('custom-cabinets', 'Pennsylvania') },
    { name: 'New Jersey', href: getStateUrl('custom-cabinets', 'New Jersey') },
  ];

  return (
    <header className="bg-white border-b border-gray-200/90 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Brand Logo + Nav */}
          <div className="flex items-center gap-7">
            <BrandLogo variant="light" size="md" />

            {/* Desktop Navigation Links (Aligned with Sheet 1 Col F) */}
            <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-gray-700 h-16">
              {/* Find Pros Dropdown -> `/services` */}
              <div
                className="relative py-4"
                onMouseEnter={() => setServicesDropdownOpen(true)}
                onMouseLeave={() => setServicesDropdownOpen(false)}
              >
                <Link
                  href="/services"
                  className="flex items-center gap-1 hover:text-primary transition-colors py-1"
                >
                  <span>Find Pros</span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </Link>
                {servicesDropdownOpen && (
                  <div className="absolute top-14 left-0 w-64 bg-white rounded-2xl border border-gray-300/95 shadow-[0_14px_38px_-4px_rgba(15,23,42,0.20),0_6px_14px_-2px_rgba(15,23,42,0.10)] z-50 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="px-3.5 pt-2.5 pb-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-white shrink-0">
                      Live Categories
                    </div>
                    <div className="max-h-[280px] overflow-y-auto overscroll-contain py-1">
                      {popularServices.map((service) => (
                        <Link
                          key={service.name}
                          href={service.href}
                          className="block px-3.5 py-2 text-xs text-gray-700 hover:bg-primary-light hover:text-primary transition-colors"
                          onClick={() => setServicesDropdownOpen(false)}
                        >
                          {service.name}
                        </Link>
                      ))}
                    </div>
                    <div className="border-t border-gray-200/80 bg-[#FAFBF9] px-3.5 py-2 shrink-0">
                      <Link
                        href="/services"
                        className="block text-xs font-bold text-primary hover:underline"
                        onClick={() => setServicesDropdownOpen(false)}
                      >
                        All Services &rarr;
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Locations Dropdown -> `/locations` */}
              <div
                className="relative py-4"
                onMouseEnter={() => setStatesDropdownOpen(true)}
                onMouseLeave={() => setStatesDropdownOpen(false)}
              >
                <Link
                  href="/locations"
                  className="flex items-center gap-1 hover:text-primary transition-colors py-1"
                >
                  <span>Locations</span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </Link>
                {statesDropdownOpen && (
                  <div className="absolute top-14 left-0 w-56 bg-white rounded-2xl border border-gray-300/95 shadow-[0_14px_38px_-4px_rgba(15,23,42,0.20),0_6px_14px_-2px_rgba(15,23,42,0.10)] z-50 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="px-3.5 pt-2.5 pb-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-white shrink-0">
                      Popular Markets
                    </div>
                    <div className="max-h-[280px] overflow-y-auto overscroll-contain py-1">
                      {popularLocations.map((loc) => (
                        <Link
                          key={loc.name}
                          href={loc.href}
                          className="block px-3.5 py-2 text-xs text-gray-700 hover:bg-primary-light hover:text-primary transition-colors"
                          onClick={() => setStatesDropdownOpen(false)}
                        >
                          {loc.name}
                        </Link>
                      ))}
                    </div>
                    <div className="border-t border-gray-200/80 bg-[#FAFBF9] px-3.5 py-2 shrink-0">
                      <Link
                        href="/locations"
                        className="block text-xs font-bold text-primary hover:underline"
                        onClick={() => setStatesDropdownOpen(false)}
                      >
                        All Locations &rarr;
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* How We Research (Sheet 1 Row 10: Header + Footer + every city page) */}
              <Link
                href="/how-we-research"
                className="hover:text-primary transition-colors py-2"
              >
                How We Research
              </Link>

              {/* Guides (Sheet 1 Row 21: Header (Guides) + Footer) */}
              <div
                className="relative py-4"
                onMouseEnter={() => setResourcesDropdownOpen(true)}
                onMouseLeave={() => setResourcesDropdownOpen(false)}
              >
                <Link
                  href="/blog"
                  className="flex items-center gap-1 hover:text-primary transition-colors py-1"
                >
                  <span>Guides</span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </Link>
                {resourcesDropdownOpen && (
                  <div className="absolute top-14 left-0 w-56 bg-white rounded-2xl border border-gray-300/95 shadow-[0_14px_38px_-4px_rgba(15,23,42,0.20),0_6px_14px_-2px_rgba(15,23,42,0.10)] z-50 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="max-h-[280px] overflow-y-auto overscroll-contain py-1.5">
                      <Link
                        href="/blog"
                        className="block px-3.5 py-2 text-xs text-gray-700 hover:bg-primary-light hover:text-primary transition-colors"
                        onClick={() => setResourcesDropdownOpen(false)}
                      >
                        All Guides &amp; Articles
                      </Link>
                      <Link
                        href="/editorial-policy"
                        className="block px-3.5 py-2 text-xs text-gray-700 hover:bg-primary-light hover:text-primary transition-colors"
                        onClick={() => setResourcesDropdownOpen(false)}
                      >
                        Editorial Policy
                      </Link>
                    </div>
                    <div className="border-t border-gray-200/80 bg-[#FAFBF9] px-3.5 py-2 shrink-0">
                      <Link
                        href="/admin/blogs"
                        className="block text-[11px] text-gray-500 hover:text-primary transition-colors"
                        onClick={() => setResourcesDropdownOpen(false)}
                      >
                        Admin CMS
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* About Dropdown (Sheet 1 Row 9: Header + Footer) */}
              <div
                className="relative py-4"
                onMouseEnter={() => setAboutDropdownOpen(true)}
                onMouseLeave={() => setAboutDropdownOpen(false)}
              >
                <Link
                  href="/about"
                  className="flex items-center gap-1 hover:text-primary transition-colors py-1"
                >
                  <span>About</span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </Link>
                {aboutDropdownOpen && (
                  <div className="absolute top-14 left-0 w-56 bg-white rounded-2xl border border-gray-300/95 shadow-[0_14px_38px_-4px_rgba(15,23,42,0.20),0_6px_14px_-2px_rgba(15,23,42,0.10)] z-50 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="max-h-[280px] overflow-y-auto overscroll-contain py-1.5">
                      <Link
                        href="/about"
                        className="block px-3.5 py-2 text-xs text-gray-700 hover:bg-primary-light hover:text-primary transition-colors"
                        onClick={() => setAboutDropdownOpen(false)}
                      >
                        About ProsVetted
                      </Link>
                      <Link
                        href="/how-we-research"
                        className="block px-3.5 py-2 text-xs text-gray-700 hover:bg-primary-light hover:text-primary transition-colors"
                        onClick={() => setAboutDropdownOpen(false)}
                      >
                        How We Research Companies
                      </Link>
                      <Link
                        href="/advertising-disclosure"
                        className="block px-3.5 py-2 text-xs text-gray-700 hover:bg-primary-light hover:text-primary transition-colors"
                        onClick={() => setAboutDropdownOpen(false)}
                      >
                        Advertising Disclosure
                      </Link>
                      <Link
                        href="/contact"
                        className="block px-3.5 py-2 text-xs text-gray-700 hover:bg-primary-light hover:text-primary transition-colors"
                        onClick={() => setAboutDropdownOpen(false)}
                      >
                        Contact Us
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </nav>
          </div>

          {/* Right: For Businesses Button + Saved + CTA */}
          <div className="hidden sm:flex items-center gap-4 text-xs font-semibold">
            <Link
              href="/for-businesses"
              className="hidden md:inline-flex items-center px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 text-gray-700 hover:text-gray-950 transition-colors"
            >
              For Businesses
            </Link>

            {savedCount > 0 && (
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    const el = document.getElementById('listings');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="flex items-center gap-1.5 text-gray-700 hover:text-gray-950 transition-colors cursor-pointer"
              >
                <Heart className="w-4 h-4 fill-primary text-primary" />
                <span>Saved ({savedCount})</span>
              </button>
            )}

            {onOpenQuoteModal ? (
              <EButton
                type="button"
                onClick={onOpenQuoteModal}
                variant="primary"
                size="md"
              >
                Find a Pro
              </EButton>
            ) : (
              <EButton
                href="/services"
                variant="primary"
                size="md"
              >
                Find a Pro
              </EButton>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="flex lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-gray-600 hover:text-gray-900 rounded-md"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-200 bg-white px-4 py-4 space-y-2.5 text-xs font-semibold text-gray-800 animate-in fade-in slide-in-from-top-2 duration-150 shadow-[0_18px_38px_-4px_rgba(15,23,42,0.20)] max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain">
          <Link
            href="/services"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center justify-between py-2 text-gray-800 hover:text-primary border-b border-gray-100"
          >
            <span>Find Pros (All Services)</span>
            <ChevronDown className="w-3.5 h-3.5 -rotate-90 text-gray-400" />
          </Link>
          <Link
            href="/locations"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center justify-between py-2 text-gray-800 hover:text-primary border-b border-gray-100"
          >
            <span>Locations</span>
            <ChevronDown className="w-3.5 h-3.5 -rotate-90 text-gray-400" />
          </Link>
          <Link
            href="/how-we-research"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center justify-between py-2 text-gray-800 hover:text-primary border-b border-gray-100"
          >
            <span>How We Research</span>
            <ChevronDown className="w-3.5 h-3.5 -rotate-90 text-gray-400" />
          </Link>
          <Link
            href="/blog"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center justify-between py-2 text-gray-800 hover:text-primary border-b border-gray-100"
          >
            <span>Guides &amp; Blog</span>
            <ChevronDown className="w-3.5 h-3.5 -rotate-90 text-gray-400" />
          </Link>
          <Link
            href="/about"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center justify-between py-2 text-gray-800 hover:text-primary border-b border-gray-100"
          >
            <span>About Us</span>
            <ChevronDown className="w-3.5 h-3.5 -rotate-90 text-gray-400" />
          </Link>
          <Link
            href="/for-businesses"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center justify-between py-2 text-gray-800 hover:text-primary border-b border-gray-100"
          >
            <span>For Businesses</span>
            <ChevronDown className="w-3.5 h-3.5 -rotate-90 text-gray-400" />
          </Link>

          {/* Mobile CTA Button */}
          <div className="pt-3 space-y-2.5">
            {onOpenQuoteModal ? (
              <EButton
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenQuoteModal();
                }}
                variant="primary"
                size="md"
                className="w-full justify-center shadow-sm"
              >
                Find a Pro
              </EButton>
            ) : (
              <EButton
                href="/services"
                onClick={() => setMobileMenuOpen(false)}
                variant="primary"
                size="md"
                className="w-full justify-center shadow-sm"
              >
                Find a Pro
              </EButton>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
