'use client';

import React, { useState } from 'react';
import { MapPin, ChevronDown, ChevronUp, ArrowRight, ExternalLink } from 'lucide-react';
import type { RooferProvider } from '@/data/mockRoofers';

interface ProfileAboutAndLocationProps {
  provider: RooferProvider;
}

export default function ProfileAboutAndLocation({
  provider,
}: ProfileAboutAndLocationProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const fullDescription =
    provider.description ||
    `${provider.name} has been serving homeowners for over ${provider.yearsInBusiness || 15} years, specializing in comprehensive home improvement, quality installations, and reliable maintenance. Known for superior craftsmanship, transparent communication, and premium materials, their skilled local team delivers long-lasting results for residential and light commercial properties across the region.`;

  const shortDescription =
    fullDescription.length > 280
      ? fullDescription.slice(0, 280) + '...'
      : fullDescription;

  const encodedAddress = encodeURIComponent(provider.address || 'New York, NY');
  const googleMapsDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;

  return (
    <div id="overview" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* ========================================================= */}
      {/* LEFT COLUMN: ABOUT SECTION (col-span-12 lg:col-span-7) */}
      {/* ========================================================= */}
      <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200/90 p-5 sm:p-6 space-y-3.5 shadow-xs">
        <h2 className="text-xl sm:text-2xl font-black text-gray-950 tracking-tight">
          About {provider.name}
        </h2>

        <p className="text-xs sm:text-sm text-gray-600 leading-relaxed whitespace-pre-line">
          {isExpanded ? fullDescription : shortDescription}
        </p>

        {fullDescription.length > 280 && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-primary-dark transition-colors cursor-pointer pt-1"
          >
            <span>{isExpanded ? 'Read less' : 'Read more'}</span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>

      {/* ========================================================= */}
      {/* RIGHT COLUMN: OUR LOCATION (col-span-12 lg:col-span-5) */}
      {/* ========================================================= */}
      <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-200/90 p-5 sm:p-6 space-y-3.5 shadow-xs">
        <h2 className="text-xl sm:text-2xl font-black text-gray-950 tracking-tight">
          Our Location
        </h2>

        {/* Map Preview Card */}
        <div className="relative h-36 sm:h-40 rounded-xl overflow-hidden border border-gray-200 bg-slate-100 flex items-center justify-center group">
          {/* Stylized Vector Map Graphics */}
          <svg
            className="w-full h-full object-cover"
            viewBox="0 0 400 160"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Map Roads / Grid */}
            <rect width="400" height="160" fill="#F1F5F9" />
            <path d="M0 40H400M0 90H400M0 135H400" stroke="#CBD5E1" strokeWidth="6" />
            <path d="M80 0V160M200 0V160M310 0V160" stroke="#CBD5E1" strokeWidth="6" />
            <path d="M30 0L380 160" stroke="#E2E8F0" strokeWidth="4" />
            <path d="M0 140L350 0" stroke="#E2E8F0" strokeWidth="4" />
            {/* Parks / Green Areas */}
            <rect x="220" y="20" width="70" height="50" rx="6" fill="#DCFCE7" opacity="0.8" />
            <rect x="40" y="105" width="80" height="40" rx="6" fill="#DCFCE7" opacity="0.8" />
          </svg>

          {/* Central Red Location Pin */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-[#EA580C] text-white flex items-center justify-center shadow-lg border-2 border-white animate-bounce-gentle">
                <MapPin className="w-4 h-4 fill-white" />
              </div>
              <div className="w-3 h-1.5 rounded-full bg-black/20 blur-[1px] mt-0.5" />
            </div>
          </div>

          {/* Overlay Link to Open Google Maps */}
          <a
            href={googleMapsDirectionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute inset-0 z-10"
            aria-label={`Open map directions for ${provider.address}`}
          />
        </div>

        {/* Address String */}
        <div className="flex items-start gap-2 text-xs sm:text-sm text-gray-700">
          <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
          <span className="font-medium">{provider.address}</span>
        </div>

        {/* Get Directions Link */}
        <div className="pt-1">
          <a
            href={googleMapsDirectionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-dark transition-colors"
          >
            <span>Get Directions</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
