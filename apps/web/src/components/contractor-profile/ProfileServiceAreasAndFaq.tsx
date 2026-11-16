'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ChevronRight, HelpCircle } from 'lucide-react';
import type { RooferProvider } from '@/data/mockRoofers';

interface ProfileServiceAreasAndFaqProps {
  provider: RooferProvider;
}

export default function ProfileServiceAreasAndFaq({
  provider,
}: ProfileServiceAreasAndFaqProps) {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const borough =
    provider.borough && provider.borough !== 'All'
      ? provider.borough
      : provider.city || 'Manhattan';
  const isCabinets =
    /Cabinet|Millwork|Closet/i.test(provider.category || '') ||
    Boolean(provider.services?.some((s) => /Cabinet|Millwork|Closet/i.test(s)));

  const roofingFaqs = [
    {
      q: `How much does a new roof cost in ${borough}?`,
      a: `Roofing replacement costs generally range between $5,500 and $16,000 depending on the roof square footage, pitch, material (asphalt shingles, architectural, or flat membrane systems), and structural decking condition.`,
    },
    {
      q: 'How long does a roof replacement take?',
      a: 'Most standard residential roof replacements are completed within 1 to 2 business days, weather permitting. Commercial or complex historic brownstone systems may take 3 to 5 days.',
    },
    {
      q: 'Do you offer free estimates?',
      a: `Yes, ${provider.name} provides 100% free, no-obligation comprehensive estimates including thorough roof inspections and written material breakdowns.`,
    },
    {
      q: 'Do you handle insurance claims for storm damage?',
      a: 'Yes, our team works directly with major insurance carriers, preparing detailed itemized loss estimates and documentation to support fair claim coverage.',
    },
  ];

  const cabinetFaqs = [
    {
      q: `How much do custom cabinets cost in ${borough}?`,
      a: `Custom cabinetry projects typically range from $12,000 to $45,000+ depending on linear footage, wood species, finish grade, hardware specifications, and integrated architectural millwork.`,
    },
    {
      q: 'How long does custom cabinet fabrication take?',
      a: 'Custom cabinetry typically requires 4 to 8 weeks for shop fabrication following final design approval, followed by 3 to 5 days for on-site professional installation.',
    },
    {
      q: 'Do you offer free on-site design consultations?',
      a: `Yes, ${provider.name} provides complimentary initial space measurements, design consultations, and material sample reviews for homeowners.`,
    },
    {
      q: 'Do you provide 3D CAD drawings before fabrication?',
      a: 'Yes, projects include detailed 3D CAD renders and shop drawings so you can review door profiles, interior configurations, and finishes before fabrication begins.',
    },
  ];

  const faqs = isCabinets ? cabinetFaqs : roofingFaqs;

  return (
    <section
      id="faq"
      className="bg-white rounded-2xl border border-gray-200/90 p-5 sm:p-6 space-y-4 shadow-xs scroll-mt-36"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#EBF7F2] text-[#0B3B2C] flex items-center justify-center shrink-0">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-gray-950 tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-xs text-gray-500">
              Common project, pricing, and timeline questions for {provider.name}.
            </p>
          </div>
        </div>

        <a
          href="/blog"
          className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-0.5"
        >
          <span>Explore homeowner guides</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Balanced 2-Column Accordion Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 items-start">
        {faqs.map((faq, idx) => {
          const isOpen = openFaqIndex === idx;
          return (
            <div
              key={idx}
              className="border border-gray-200/90 rounded-xl overflow-hidden bg-white transition-colors"
            >
              <button
                type="button"
                onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                className="w-full text-left p-3.5 flex items-center justify-between gap-3 text-xs sm:text-[13px] font-bold text-gray-900 hover:text-primary hover:bg-gray-50/60 transition-colors cursor-pointer"
              >
                <span>{faq.q}</span>
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                )}
              </button>

              {isOpen && (
                <div className="px-3.5 pb-3.5 pt-0 text-xs sm:text-[13px] text-gray-600 leading-relaxed border-t border-gray-100 bg-slate-50/50">
                  <p className="pt-2.5">{faq.a}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
