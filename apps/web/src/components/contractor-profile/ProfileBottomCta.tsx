'use client';

import React from 'react';
import { Phone, ArrowRight } from 'lucide-react';
import type { RooferProvider } from '@/data/mockRoofers';

interface ProfileBottomCtaProps {
  provider: RooferProvider;
  onOpenQuoteModal: () => void;
}

export default function ProfileBottomCta({
  provider,
  onOpenQuoteModal,
}: ProfileBottomCtaProps) {
  const isCabinets = provider.services?.some((s) => /Cabinet|Millwork/i.test(s));
  const trade = isCabinets ? 'Custom Cabinet' : 'Roofing';

  return (
    <section className="bg-[#0B3B2C] text-white rounded-3xl overflow-hidden relative shadow-xl border border-[#0F4C39]">
      {/* Background Graphic Illustration */}
      <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-15 pointer-events-none hidden md:block">
        <img
          src="/roofing-hero-clean.png"
          alt=""
          className="w-full h-full object-cover object-left"
        />
      </div>

      <div className="max-w-7xl mx-auto px-6 sm:px-10 py-10 sm:py-12 relative z-10">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Headline & Copy */}
          <div className="space-y-2 max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Ready to Start Your {trade} Project?
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/80 leading-relaxed">
              Get a free quote from {provider.name} and discuss your project with their expert team.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenQuoteModal}
              className="bg-[#EA580C] hover:bg-[#D94F0A] text-white font-bold text-xs sm:text-sm py-3 px-6 rounded-xl shadow-md transition-all active:scale-[0.99] flex items-center gap-2 cursor-pointer"
            >
              <span>Get a Quote</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <a
              href={`tel:${provider.phone.replace(/\D/g, '')}`}
              className="bg-black/30 hover:bg-black/50 text-white border border-white/20 font-bold text-xs sm:text-sm py-3 px-5 rounded-xl transition-colors flex items-center gap-2"
            >
              <Phone className="w-4 h-4 text-emerald-300" />
              <span>Call {provider.displayPhone || provider.phone}</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
