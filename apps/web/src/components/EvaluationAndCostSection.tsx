'use client';

import React from 'react';
import Link from 'next/link';
import {
  Star,
  Clock,
  ShieldCheck,
  Building2,
  ArrowRight,
  Sparkles,
  HelpCircle,
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
  const isCabinets = currentService.toLowerCase().includes('cabinet') ||
    currentService.toLowerCase().includes('shelv') ||
    currentService.toLowerCase().includes('vanit') ||
    currentService.toLowerCase().includes('closet');

  const methodologyCards = [
    {
      icon: Star,
      title: 'Reputation & Reviews',
      description: 'Review sentiment & rating volume across Google, Yelp, and Houzz.',
    },
    {
      icon: Clock,
      title: 'NYC Experience',
      description: `Years in business and demonstrated project portfolio in ${currentLocation}.`,
    },
    {
      icon: ShieldCheck,
      title: 'Verified Credentials',
      description: 'NYC Home Improvement Contractor license and active liability insurance.',
    },
    {
      icon: Building2,
      title: 'Business Reliability',
      description: 'Transparent pricing estimates, written contracts, and manufacturer warranties.',
    },
  ];

  const hiringSteps = isCabinets
    ? [
        { step: 1, text: 'Review workshop portfolio and joinery craftsmanship' },
        { step: 2, text: 'Verify NYC contractor license and liability insurance' },
        { step: 3, text: 'Request detailed 3D shop drawings and material specs' },
        { step: 4, text: 'Confirm soft-close hardware warranties (Blum, Salice)' },
        { step: 5, text: 'Confirm in-shop spray finish vs on-site painting' },
        { step: 6, text: 'Clarify delivery, building COI, and installation scope' },
        { step: 7, text: 'Do not compare bids on price alone (hardwood vs MDF)' },
      ]
    : [
        { step: 1, text: 'Verify NYC Department of Buildings license and active insurance' },
        { step: 2, text: 'Check recent reviews from brownstone and flat roof owners' },
        { step: 3, text: 'Ask for a detailed written estimate with line-item materials' },
        { step: 4, text: 'Understand the manufacturer vs workmanship warranty' },
        { step: 5, text: 'Confirm who performs the work (in-house vs subcontractor)' },
        { step: 6, text: 'Ask about DOB scaffolding permits and disposal fees' },
        { step: 7, text: 'Never select a roofer on lowest price alone' },
      ];

  const costItems = isCabinets
    ? [
        { project: 'Custom Bathroom Vanity (Single/Double)', cost: '$1,800 – $4,500' },
        { project: 'Built-In Bookcases & Media Wall', cost: '$3,500 – $9,000' },
        { project: 'Semi-Custom Kitchen Cabinetry', cost: '$8,000 – $18,000' },
        { project: 'Full Custom Luxury Kitchen (NYC)', cost: '$18,000 – $45,000+' },
        { project: 'Architectural Wall Paneling & Millwork', cost: '$4,500 – $14,000' },
      ]
    : [
        { project: 'Roof Inspection & Leak Diagnostics', cost: '$200 – $500' },
        { project: 'NYC Emergency Leak Repair', cost: '$450 – $1,800' },
        { project: 'Flat Roof SBS Modified Bitumen (1,000 sq ft)', cost: '$6,500 – $14,000' },
        { project: 'Asphalt Shingle Roof Replacement', cost: '$7,500 – $16,000' },
        { project: 'Full Commercial Flat Roof System', cost: '$12,000 – $35,000+' },
      ];

  return (
    <section className="space-y-10 pt-6 pb-2">
      {/* 1. How We Evaluate Companies Banner */}
      <div className="bg-[#FAFBF9] border border-gray-200/80 rounded-2xl p-6 sm:p-7 shadow-xs">
        {/* Banner Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div className="max-w-2xl">
            <h2 className="text-xl sm:text-2xl font-bold text-[#111827] tracking-tight leading-tight">
              How We Evaluate {currentService} Companies in {currentLocation}
            </h2>
            <p className="mt-1.5 text-xs sm:text-[13px] text-[#5A6578] font-normal leading-relaxed">
              We combine business licensing, multi-platform customer feedback, verified insurance credentials, and demonstrated New York project craftsmanship to help property owners compare verified professionals.
            </p>
          </div>

          <EButton
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenCostGuide}
            className="text-xs font-semibold text-[#111827] border-gray-200 hover:border-gray-300 self-start sm:self-end shrink-0"
          >
            <span>Learn About Our Methodology</span>
          </EButton>
        </div>

        {/* 4 Methodology Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {methodologyCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                className="bg-white rounded-xl border border-gray-100 p-4 shadow-2xs hover:shadow-xs transition-shadow"
              >
                <div className="w-8 h-8 rounded-lg bg-[#EBF3F1] text-[#0F3E35] flex items-center justify-center mb-3">
                  <Icon className="w-4 h-4 stroke-[2.2]" />
                </div>
                <h3 className="text-sm font-bold text-[#111827] mb-1">
                  {card.title}
                </h3>
                <p className="text-xs text-[#5A6578] font-normal leading-relaxed">
                  {card.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Side-by-Side: 7 Steps to Hire + NYC Cost Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        {/* Left Column: 7 Steps to Hire */}
        <div className="lg:col-span-6 bg-white border border-gray-200/80 rounded-2xl p-6 sm:p-7 shadow-xs">
          <h2 className="text-lg sm:text-xl font-bold text-[#111827] tracking-tight mb-2">
            7 Steps to Hire a {isCabinets ? 'Custom Cabinet Maker' : 'Roofer'} in {currentLocation}
          </h2>
          <p className="text-xs sm:text-[13px] text-[#5A6578] font-normal mb-5 leading-relaxed">
            Follow this checklist before signing any contract with a New York professional.
          </p>

          <ol className="space-y-3">
            {hiringSteps.map((item) => (
              <li key={item.step} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-[#EBF3F1] text-[#0F3E35] text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {item.step}
                </span>
                <span className="text-xs sm:text-[13px] text-[#374151] font-medium leading-relaxed">
                  {item.text}
                </span>
              </li>
            ))}
          </ol>
        </div>

        {/* Right Column: NYC Cost Guide */}
        <div className="lg:col-span-6 bg-white border border-gray-200/80 rounded-2xl p-6 sm:p-7 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg sm:text-xl font-bold text-[#111827] tracking-tight">
              {currentService} Cost Guide in {currentLocation}
            </h2>
            <button
              type="button"
              onClick={onOpenCostGuide}
              className="text-xs font-bold text-[#DA5F2F] hover:underline cursor-pointer"
            >
              View Full Guide
            </button>
          </div>
          <p className="text-xs sm:text-[13px] text-[#5A6578] font-normal mb-5 leading-relaxed">
            Estimated market pricing based on verified NYC homeowner invoices and material costs.
          </p>

          <div className="divide-y divide-gray-100">
            {costItems.map((item, idx) => (
              <div
                key={idx}
                className="py-3 flex items-center justify-between gap-4 text-xs sm:text-[13px]"
              >
                <span className="text-gray-700 font-medium">
                  {item.project}
                </span>
                <span className="font-bold text-gray-900 shrink-0 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                  {item.cost}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-[11px] text-gray-400">
              Updated for NYC Market 2026
            </span>
            <EButton
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenCostGuide}
              className="text-xs font-semibold"
            >
              Request Custom Estimate
            </EButton>
          </div>
        </div>
      </div>
    </section>
  );
}
