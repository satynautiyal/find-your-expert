'use client';

import { useState } from 'react';
import { ChevronDown, Heart, Menu, X } from 'lucide-react';
import { EButton } from '@/components/EComponents';

export interface HeaderProps {
  onOpenQuoteModal: () => void;
  savedCount: number;
}

export default function Header({ onOpenQuoteModal, savedCount }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Brand Logo + Nav */}
          <div className="flex items-center gap-8">
            <a href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center shadow-xs">
                <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                </svg>
              </div>
              <div className="flex items-center text-lg sm:text-xl font-black tracking-tight text-gray-950">
                <span>FindYour</span>
                <span className="text-primary-dark">Experts</span>
              </div>
            </a>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-gray-700 h-16">
              <div className="flex items-center gap-1 hover:text-primary-dark cursor-pointer py-2 transition-colors">
                <span>Find Services</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </div>

              {/* Active Tab: Roofing with bottom accent indicator */}
              <div className="relative flex items-center h-full text-gray-950 font-bold px-1 cursor-pointer">
                <span>Roofing</span>
                <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-primary rounded-t-full" />
              </div>

              <a href="#how-it-works" className="hover:text-primary-dark transition-colors py-2">
                How It Works
              </a>

              <div className="flex items-center gap-1 hover:text-primary-dark cursor-pointer py-2 transition-colors">
                <span>Cost Guides</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </div>

              <a href="#for-contractors" className="hover:text-primary-dark transition-colors py-2">
                For Contractors
              </a>
            </nav>
          </div>

          {/* Right: Saved & CTA */}
          <div className="hidden sm:flex items-center gap-5 text-xs font-semibold">
            <button className="flex items-center gap-1.5 text-gray-700 hover:text-gray-950 transition-colors">
              <Heart className={`w-4 h-4 ${savedCount > 0 ? 'fill-primary text-primary' : 'text-gray-400'}`} />
              <span>Saved ({savedCount})</span>
            </button>

            <EButton
              onClick={onOpenQuoteModal}
              variant="primary"
              size="md"
              iconRight={<span>&rarr;</span>}
            >
              Get Free Quotes
            </EButton>
          </div>

          {/* Mobile hamburger */}
          <div className="flex sm:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-gray-600 hover:text-gray-900"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-gray-200 bg-white px-4 py-3 space-y-2 text-xs font-semibold text-gray-800">
          <a href="#" className="block py-1.5">
            Find Services
          </a>
          <a href="#" className="block py-1.5 text-primary-dark font-bold">
            Roofing
          </a>
          <a href="#" className="block py-1.5">
            How It Works
          </a>
          <a href="#" className="block py-1.5">
            Cost Guides
          </a>
          <a href="#" className="block py-1.5">
            For Contractors
          </a>
          <EButton
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenQuoteModal();
            }}
            variant="primary"
            size="lg"
            className="w-full mt-2"
          >
            Get Free Quotes &rarr;
          </EButton>
        </div>
      )}
    </header>
  );
}
