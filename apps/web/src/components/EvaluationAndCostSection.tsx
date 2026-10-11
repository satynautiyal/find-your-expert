'use client';

import React from 'react';
import Link from 'next/link';
import {
  Star,
  Clock,
  ShieldCheck,
  Building2,
  ArrowRight,
} from 'lucide-react';
import { EButton } from '@/components/EComponents';

export interface EvaluationAndCostSectionProps {
  currentService: string;
  currentLocation: string;
  onOpenCostGuide?: () => void;
}

export default function EvaluationAndCostSection({
  currentService,
  currentLocation,
  onOpenCostGuide,
}: EvaluationAndCostSectionProps) {
  const methodologyCards = [
    {
      icon: Star,
      title: 'Reputation',
      description: 'Review volume and ratings across supported sources.',
    },
    {
      icon: Clock,
      title: 'Experience',
      description: 'Years in business and relevant roofing services.',
    },
    {
      icon: ShieldCheck,
      title: 'Credentials',
      description: 'License, insurance and other verifiable credentials.',
    },
    {
      icon: Building2,
      title: 'Business Information',
      description: 'Services, service areas, warranties, and more.',
    },
  ];

  const hiringSteps = [
    { step: 1, text: 'Verify licensing and insurance' },
    { step: 2, text: 'Check recent reviews' },
    { step: 3, text: 'Ask for a written estimate' },
    { step: 4, text: 'Understand the warranty' },
    { step: 5, text: 'Confirm who performs the work' },
    { step: 6, text: 'Ask about permits and materials' },
    { step: 7, text: "Don't compare quotes on price alone" },
  ];

  const costItems = [
    { project: 'Roof inspection', cost: '$150 – $400' },
    { project: 'Roof repair', cost: '$350 – $1,500' },
    { project: 'Asphalt shingle replacement', cost: '$5,500 – $12,000' },
    { project: 'Metal roof', cost: '$8,000 – $20,000' },
    { project: 'Full roof replacement', cost: '$6,000 – $18,000' },
  ];

  return (
    <section className="space-y-10 pt-6 pb-2">
      {/* 1. How We Evaluate Roofing Companies Banner */}
      <div className="bg-[#FAFBF9] border border-gray-200/80 rounded-2xl p-6 sm:p-7 shadow-xs">
        {/* Banner Header: Title & Description on Left, Methodology Button on Right */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div className="max-w-2xl">
            <h2 className="text-xl sm:text-2xl font-bold text-[#111827] tracking-tight leading-tight">
              How We Evaluate {currentService} Companies
            </h2>
            <p className="mt-1.5 text-xs sm:text-[13px] text-[#5A6578] font-normal leading-relaxed">
              We combine business information, customer feedback, credentials, service coverage and other publicly easily available data to help homeowners compare roofing professionals.
            </p>
          </div>

          <EButton
            variant="outline"
            size="sm"
            onClick={onOpenCostGuide}
            className="border-[#DA5F2F] text-[#DA5F2F] hover:bg-[#DA5F2F]/10 font-semibold shrink-0 self-start sm:self-end"
          >
            <span>View Our Methodology</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </EButton>
        </div>

        {/* 4 Methodology Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {methodologyCards.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="bg-white rounded-xl border border-gray-200/80 p-4 shadow-2xs flex items-start gap-3.5"
              >
                <div className="w-9 h-9 rounded-full bg-[#FFF2EB] text-[#DA5F2F] flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <h3 className="text-xs sm:text-[13px] font-bold text-[#111827] leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-[#5A6578] leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Two-Column Grid: What to Check & Cost Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
        {/* Left Column: What to Check Before Hiring a Roofer */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#111827] tracking-tight leading-tight">
              What to Check Before Hiring a Roofer
            </h2>
            <p className="mt-1 text-xs sm:text-[13px] text-[#5A6578] font-normal">
              Follow these key steps to find a reliable and qualified roofing contractor.
            </p>
          </div>

          {/* 7 Hiring Steps in 2 Columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 pt-1">
            {/* Col A: Steps 1-4 */}
            <div className="space-y-3">
              {hiringSteps.slice(0, 4).map((item) => (
                <div key={item.step} className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#DA5F2F] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                    {item.step}
                  </div>
                  <span className="text-xs sm:text-[13px] text-[#374151] font-medium leading-snug">
                    {item.text}
                  </span>
                </div>
              ))}
            </div>

            {/* Col B: Steps 5-7 */}
            <div className="space-y-3">
              {hiringSteps.slice(4).map((item) => (
                <div key={item.step} className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#DA5F2F] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                    {item.step}
                  </div>
                  <span className="text-xs sm:text-[13px] text-[#374151] font-medium leading-snug">
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Read the Full Guide Link */}
          <div className="pt-2">
            <button
              type="button"
              onClick={onOpenCostGuide}
              className="inline-flex items-center gap-1.5 text-xs sm:text-[13px] font-bold text-[#DA5F2F] hover:underline cursor-pointer"
            >
              <span>Read the Full Guide</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Column: How Much Does Roofing Cost */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#111827] tracking-tight leading-tight">
              How Much Does Roofing Cost in {currentLocation}?
            </h2>
            <p className="mt-1 text-xs sm:text-[13px] text-[#5A6578] font-normal leading-relaxed">
              Roofing costs vary based on roof size, material, pitch, accessibility, existing roof condition, labor and local requirements.
            </p>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-xl border border-gray-200/90 overflow-hidden shadow-2xs">
            <div className="bg-[#F8F9F8] border-b border-gray-200 px-4 py-2.5 flex items-center justify-between text-xs font-bold text-[#111827]">
              <span>Roofing project</span>
              <span>Typical cost</span>
            </div>
            <div className="divide-y divide-gray-100">
              {costItems.map((item) => (
                <div
                  key={item.project}
                  className="px-4 py-2.5 flex items-center justify-between text-xs sm:text-[13px] hover:bg-[#FAFBF9] transition-colors"
                >
                  <span className="text-[#374151] font-medium">
                    {item.project}
                  </span>
                  <span className="font-bold text-[#111827]">
                    {item.cost}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Read Cost Guide Link */}
          <div className="pt-1">
            <button
              type="button"
              onClick={onOpenCostGuide}
              className="inline-flex items-center gap-1.5 text-xs sm:text-[13px] font-bold text-[#DA5F2F] hover:underline cursor-pointer"
            >
              <span>Read the {currentLocation.split(',')[0]} Roofing Cost Guide</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
