'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Heart, Menu, X, Building2, MapPin, Sparkles, BookOpen } from 'lucide-react';
import { EButton } from '@/components/EComponents';

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

  const popularServices = [
    { name: 'Countertops', href: '/contractors?service=Countertops' },
    { name: 'Kitchen Remodeling', href: '/contractors?service=Kitchen+Remodeling' },
    { name: 'Bathroom Remodeling', href: '/contractors?service=Bathroom+Remodeling' },
    { name: 'Roofing', href: '/contractors?service=Roofing' },
    { name: 'HVAC', href: '/contractors?service=HVAC' },
    { name: 'Flooring', href: '/contractors?service=Flooring' },
    { name: 'Windows & Doors', href: '/contractors?service=Windows+%26+Doors' },
    { name: 'Painting', href: '/contractors?service=Painting' },
  ];

  const popularStates = [
    { name: 'Texas', href: '/contractors?state=Texas' },
    { name: 'California', href: '/contractors?state=California' },
    { name: 'Florida', href: '/contractors?state=Florida' },
    { name: 'New York', href: '/contractors?state=New+York' },
    { name: 'Illinois', href: '/contractors?state=Illinois' },
    { name: 'Pennsylvania', href: '/contractors?state=Pennsylvania' },
    { name: 'Ohio', href: '/contractors?state=Ohio' },
    { name: 'Georgia', href: '/contractors?state=Georgia' },
  ];

  return (
    <header className="bg-white border-b border-gray-200/90 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Brand Logo + Nav */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
                <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                </svg>
              </div>
              <div className="flex items-center text-lg sm:text-xl font-black tracking-tight text-gray-950">
                <span>HomePro</span>
                <span className="text-primary">Compare</span>
              </div>
            </Link>

            {/* Desktop Navigation Links (Exact from screenshot) */}
            <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-gray-700 h-16">
              {/* Find Services Dropdown */}
              <div
                className="relative py-4"
                onMouseEnter={() => setServicesDropdownOpen(true)}
                onMouseLeave={() => setServicesDropdownOpen(false)}
              >
                <button
                  type="button"
                  className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer py-1"
                >
                  <span>Find Services</span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-primary" />
                </button>
                {servicesDropdownOpen && (
                  <div className="absolute top-14 left-0 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Popular Categories
                    </div>
                    {popularServices.map((service) => (
                      <Link
                        key={service.name}
                        href={service.href}
                        className="block px-3 py-1.5 text-xs text-gray-700 hover:bg-primary-light hover:text-primary transition-colors"
                        onClick={() => setServicesDropdownOpen(false)}
                      >
                        {service.name}
                      </Link>
                    ))}
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <Link
                        href="/contractors"
                        className="block px-3 py-1.5 text-xs font-bold text-primary hover:underline"
                        onClick={() => setServicesDropdownOpen(false)}
                      >
                        View all services &rarr;
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* States Dropdown */}
              <div
                className="relative py-4"
                onMouseEnter={() => setStatesDropdownOpen(true)}
                onMouseLeave={() => setStatesDropdownOpen(false)}
              >
                <button
                  type="button"
                  className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer py-1"
                >
                  <span>States</span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </button>
                {statesDropdownOpen && (
                  <div className="absolute top-14 left-0 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Top States
                    </div>
                    {popularStates.map((state) => (
                      <Link
                        key={state.name}
                        href={state.href}
                        className="block px-3 py-1.5 text-xs text-gray-700 hover:bg-primary-light hover:text-primary transition-colors"
                        onClick={() => setStatesDropdownOpen(false)}
                      >
                        {state.name}
                      </Link>
                    ))}
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <a
                        href="/#states"
                        className="block px-3 py-1.5 text-xs font-bold text-primary hover:underline"
                        onClick={() => setStatesDropdownOpen(false)}
                      >
                        View all 50 states &rarr;
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* How It Works */}
              <a
                href="/#how-it-works"
                className="hover:text-primary transition-colors py-2"
              >
                How It Works
              </a>

              {/* Resources Dropdown */}
              <div
                className="relative py-4"
                onMouseEnter={() => setResourcesDropdownOpen(true)}
                onMouseLeave={() => setResourcesDropdownOpen(false)}
              >
                <button
                  type="button"
                  className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer py-1"
                >
                  <span>Resources</span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </button>
                {resourcesDropdownOpen && (
                  <div className="absolute top-14 left-0 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                    <Link
                      href="/blog"
                      className="block px-3 py-1.5 text-xs text-gray-700 hover:bg-primary-light hover:text-primary transition-colors"
                      onClick={() => setResourcesDropdownOpen(false)}
                    >
                      Expert Guides & Blog
                    </Link>
                    <a
                      href="/#faq"
                      className="block px-3 py-1.5 text-xs text-gray-700 hover:bg-primary-light hover:text-primary transition-colors"
                      onClick={() => setResourcesDropdownOpen(false)}
                    >
                      Frequently Asked Questions
                    </a>
                    <Link
                      href="/admin/blogs"
                      className="block px-3 py-1.5 text-[11px] text-gray-400 hover:text-primary transition-colors border-t border-gray-100 mt-1 pt-1"
                      onClick={() => setResourcesDropdownOpen(false)}
                    >
                      Admin CMS
                    </Link>
                  </div>
                )}
              </div>

              {/* About Us Dropdown */}
              <div
                className="relative py-4"
                onMouseEnter={() => setAboutDropdownOpen(true)}
                onMouseLeave={() => setAboutDropdownOpen(false)}
              >
                <button
                  type="button"
                  className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer py-1"
                >
                  <span>About Us</span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </button>
                {aboutDropdownOpen && (
                  <div className="absolute top-14 left-0 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                    <a
                      href="/#about"
                      className="block px-3 py-1.5 text-xs text-gray-700 hover:bg-primary-light hover:text-primary transition-colors"
                      onClick={() => setAboutDropdownOpen(false)}
                    >
                      About HomeProCompare
                    </a>
                    <a
                      href="/#contractors"
                      className="block px-3 py-1.5 text-xs text-gray-700 hover:bg-primary-light hover:text-primary transition-colors"
                      onClick={() => setAboutDropdownOpen(false)}
                    >
                      For Contractors
                    </a>
                  </div>
                )}
              </div>
            </nav>
          </div>

          {/* Right: Saved & CTA */}
          <div className="hidden sm:flex items-center gap-5 text-xs font-semibold">
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  const el = document.getElementById('listings');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="flex items-center gap-1.5 text-gray-700 hover:text-gray-950 transition-colors cursor-pointer"
            >
              <Heart
                className={`w-4 h-4 ${savedCount > 0 ? 'fill-primary text-primary' : 'text-gray-400'}`}
              />
              <span>Saved ({savedCount})</span>
            </button>

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
                href="/contractors"
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
        <div className="lg:hidden border-t border-gray-200 bg-white px-4 py-3 space-y-2 text-xs font-semibold text-gray-800 animate-in fade-in duration-150">
          <Link
            href="/contractors"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 hover:text-primary"
          >
            Find Services
          </Link>
          <a
            href="/#states"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 hover:text-primary"
          >
            States
          </a>
          <a
            href="/#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 hover:text-primary"
          >
            How It Works
          </a>
          <Link
            href="/blog"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 hover:text-primary"
          >
            Resources & Blog
          </Link>
          <a
            href="/#about"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 hover:text-primary"
          >
            About Us
          </a>
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
            <span className="text-gray-500">Saved ({savedCount})</span>
            <Link
              href="/admin/blogs"
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-1.5 rounded-lg bg-primary text-white font-bold text-xs"
            >
              Sign In
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
