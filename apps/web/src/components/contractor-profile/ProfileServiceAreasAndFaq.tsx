'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ChevronRight, Plus } from 'lucide-react';
import type { RooferProvider } from '@/data/mockRoofers';

interface ProfileServiceAreasAndFaqProps {
  provider: RooferProvider;
}

export default function ProfileServiceAreasAndFaq({
  provider,
}: ProfileServiceAreasAndFaqProps) {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [showAllAreas, setShowAllAreas] = useState(false);

  const borough = provider.borough && provider.borough !== 'All' ? provider.borough : 'Manhattan';
  const isRoofing = provider.services?.some((s) => /Roof/i.test(s)) ?? true;

  // Dynamic Service Areas from DB (ListingServiceArea / servesArea) with NYC fallback
  const dbAreas =
    provider.serviceAreas && provider.serviceAreas.length > 0
      ? provider.serviceAreas
      : provider.servesArea
      ? provider.servesArea
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean)
      : [];

  const nycAreas = [
    borough,
    ...['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'].filter((b) => b !== borough),
  ];

  const allAreas = dbAreas.length > 0 ? dbAreas : nycAreas;
  const initialAreas = allAreas.slice(0, 10);
  const remainingAreas = allAreas.slice(10);

  // Dynamic FAQs based on trade and location
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
      a: `Yes, ${provider.name} provides 100% free, no-obligation comprehensive estimates including drone inspections and written material breakdowns.`,
    },
    {
      q: 'Do you handle insurance claims for storm damage?',
      a: 'Yes, our team works directly with all major insurance carriers, preparing detailed itemized Xactimate loss estimates and documentation to ensure fair claim coverage.',
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
      a: 'Yes, every project includes detailed 3D CAD renders and shop drawings so you can review door profiles, interior configurations, and finishes before fabrication begins.',
    },
  ];

  const faqs = isRoofing ? roofingFaqs : cabinetFaqs;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* ========================================================= */}
      {/* LEFT COLUMN: SERVICE AREAS (col-span-12 lg:col-span-6) */}
      {/* ========================================================= */}
      <div id="service-areas" className="lg:col-span-6 bg-white rounded-2xl border border-gray-200/90 p-5 sm:p-6 space-y-4 shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-950 tracking-tight">
            Service Areas
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Proudly serving {borough} and surrounding communities.
          </p>
        </div>

        {/* Neighborhood Tags / Pills */}
        <div className="flex flex-wrap gap-2 pt-1">
          {/* Main Primary Area Badge */}
          <span className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#0B3B2C] text-white shadow-xs">
            {allAreas[0]}
          </span>

          {/* Secondary Areas */}
          {initialAreas.slice(1).map((area, idx) => (
            <span
              key={idx}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-gray-700 transition-colors"
            >
              {area}
            </span>
          ))}

          {/* Expanded Remaining Areas */}
          {showAllAreas &&
            remainingAreas.map((area, idx) => (
              <span
                key={`rem-${idx}`}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-gray-700 animate-in fade-in duration-200"
              >
                {area}
              </span>
            ))}

          {/* + More Areas Toggle Button */}
          {remainingAreas.length > 0 && (
            <button
              type="button"
              onClick={() => setShowAllAreas(!showAllAreas)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#EA580C] hover:bg-orange-50 border border-orange-200 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>{showAllAreas ? 'Show Less' : `+ More Areas (${remainingAreas.length})`}</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* RIGHT COLUMN: FAQS (col-span-12 lg:col-span-6) */}
      {/* ========================================================= */}
      <div id="faq" className="lg:col-span-6 bg-white rounded-2xl border border-gray-200/90 p-5 sm:p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-black text-gray-950 tracking-tight">
            Frequently Asked Questions
          </h2>
          <a
            href="/blog"
            className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5"
          >
            <span>View all FAQs</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Accordions */}
        <div className="space-y-2 pt-1">
          {faqs.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="border border-gray-200/90 rounded-xl overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full text-left p-3.5 flex items-center justify-between gap-3 text-xs sm:text-[13px] font-bold text-gray-900 hover:text-primary hover:bg-gray-50/50 transition-colors cursor-pointer"
                >
                  <span>{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                  )}
                </button>

                {isOpen && (
                  <div className="px-3.5 pb-3.5 pt-0 text-xs sm:text-[13px] text-gray-600 leading-relaxed border-t border-gray-100 bg-slate-50/40 animate-in fade-in duration-150">
                    <p className="pt-2">{faq.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
