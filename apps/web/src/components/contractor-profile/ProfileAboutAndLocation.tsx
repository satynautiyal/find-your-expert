'use client';

import React from 'react';
import {
  MapPin,
  Briefcase,
  Calendar,
  Phone,
  Globe,
  ShieldCheck,
  ArrowUpRight,
  Navigation,
} from 'lucide-react';
import type { RooferProvider } from '@/data/mockRoofers';

interface ProfileAboutAndLocationProps {
  provider: RooferProvider;
}

function normalizeAddress(rawAddress?: string, fallbackHub?: string): string {
  if (!rawAddress) return fallbackHub || '';
  const cleaned = rawAddress
    .trim()
    // Strip stray trailing slashes/backslashes from scraped data
    .replace(/[\\/\s,]+$/g, '')
    // Remove stray "NY," right before ", <Borough>, NY" (e.g. "8 West 25th Street NY, Manhattan, NY 10010")
    .replace(
      /,?\s+\bNY\b,\s*(Manhattan|Brooklyn|Queens|Bronx|Staten Island|New York),\s*NY\b/gi,
      ', $1, NY'
    );

  // Deduplicate consecutive identical comma-separated segments (e.g. "Manhattan, Manhattan, NY")
  const parts = cleaned
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  const deduped: string[] = [];
  for (const part of parts) {
    if (
      deduped.length === 0 ||
      deduped[deduped.length - 1].toLowerCase() !== part.toLowerCase()
    ) {
      deduped.push(part);
    }
  }

  const joined = deduped.join(', ');
  if (!joined) return fallbackHub || '';

  // If address only has street line without state/city context (e.g. "149 Norman Ave"), append hub location
  if (
    fallbackHub &&
    !/\b(NY|NJ|CT|New York|Manhattan|Brooklyn|Queens|Bronx|Staten Island|\d{5})\b/i.test(
      joined
    )
  ) {
    return `${joined}, ${fallbackHub}`;
  }

  return joined;
}

function extractCleanHostname(url?: string): string | null {
  if (!url) return null;
  try {
    const withProtocol = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const parsed = new URL(withProtocol);
    return parsed.hostname.replace(/^www\./i, '');
  } catch {
    return url.replace(/^https?:\/\/(www\.)?/i, '').split('/')[0] || null;
  }
}

export default function ProfileAboutAndLocation({
  provider,
}: ProfileAboutAndLocationProps) {
  const fullDescription = (provider.description || '').trim();

  const trade =
    provider.category ||
    (provider.services?.find((s) => /Roof/i.test(s))
      ? 'Roofing'
      : provider.services?.find((s) => /Cabinet|Millwork/i.test(s))
      ? 'Custom Cabinets'
      : provider.services?.[0] || 'General Contracting');

  const establishedYear =
    provider.sinceYear && provider.sinceYear > 0
      ? provider.sinceYear
      : provider.yearsInBusiness > 0
      ? new Date().getFullYear() - provider.yearsInBusiness
      : 0;

  const boroughOrCity =
    provider.borough && provider.borough !== 'All'
      ? provider.borough
      : provider.city || 'New York';
  const stateShort = provider.state || 'NY';
  const hubLocation = `${boroughOrCity}, ${stateShort}${
    provider.zipCode ? ` ${provider.zipCode}` : ''
  }`;

  const cleanAddress = normalizeAddress(provider.address, hubLocation);
  const encodedAddress = encodeURIComponent(cleanAddress);
  const googleMapsEmbedUrl = `https://www.google.com/maps?q=${encodedAddress}&z=15&output=embed`;
  const googleMapsDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;

  const rawPhone = provider.phone || provider.displayPhone || '';
  const displayPhone = provider.displayPhone || provider.phone || '';
  const telHref = rawPhone ? `tel:${rawPhone.replace(/[^\d+]/g, '')}` : '';

  const websiteHref = provider.website
    ? /^https?:\/\//i.test(provider.website)
      ? provider.website
      : `https://${provider.website}`
    : '';
  const websiteHost = extractCleanHostname(provider.website);

  // Build authentic Business Details items strictly from real DB fields
  const detailItems: Array<{
    key: string;
    label: string;
    value: string;
    href?: string;
    external?: boolean;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      key: 'trade',
      label: 'Primary Specialty',
      value: trade,
      icon: Briefcase,
    },
  ];

  if (establishedYear > 0) {
    detailItems.push({
      key: 'established',
      label: 'Established',
      value:
        provider.yearsInBusiness > 0
          ? `Since ${establishedYear} (${provider.yearsInBusiness}+ yrs)`
          : `Since ${establishedYear}`,
      icon: Calendar,
    });
  }

  if (provider.licenseNumber && provider.licenseNumber.trim().length > 0) {
    detailItems.push({
      key: 'license',
      label: 'License Number',
      value: provider.licenseNumber.trim(),
      icon: ShieldCheck,
    });
  }

  if (displayPhone) {
    detailItems.push({
      key: 'phone',
      label: 'Direct Phone',
      value: displayPhone,
      href: telHref,
      icon: Phone,
    });
  }

  if (websiteHost && websiteHref) {
    detailItems.push({
      key: 'website',
      label: 'Official Website',
      value: websiteHost,
      href: websiteHref,
      external: true,
      icon: Globe,
    });
  }

  // Keep a clean symmetric 2-column grid (up to 4 key facts; add Service Hub if odd count < 4)
  if (detailItems.length % 2 !== 0 && detailItems.length < 4) {
    detailItems.push({
      key: 'hub',
      label: 'Primary Hub',
      value: hubLocation,
      icon: MapPin,
    });
  }

  const visibleDetails = detailItems.slice(0, 4);

  return (
    <section
      id="overview"
      className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
    >
      {/* ========================================================= */}
      {/* LEFT COLUMN: COMPANY OVERVIEW & BUSINESS DETAILS (7 COLS) */}
      {/* ========================================================= */}
      <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-300/85 p-5 sm:p-6 shadow-[0_8px_28px_-4px_rgba(15,23,42,0.11),0_4px_10px_-2px_rgba(15,23,42,0.06)] flex flex-col justify-between gap-6">
        {/* Top Bio Section */}
        <div className="space-y-3.5">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
              Company Overview
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-gray-950 tracking-tight">
              About {provider.name}
            </h2>
          </div>

          {fullDescription ? (
            <p className="text-sm sm:text-[15px] text-gray-600 leading-relaxed whitespace-pre-line">
              {fullDescription}
            </p>
          ) : (
            <p className="text-sm text-gray-400 italic">
              No company description provided yet.
            </p>
          )}
        </div>

        {/* Bottom Structured Business Details Snapshot (100% Real DB Fields) */}
        <div className="pt-4 border-t border-gray-100 space-y-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
            Business Details
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {visibleDetails.map((item) => {
              const Icon = item.icon;
              const content = (
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-white border border-gray-200/80 flex items-center justify-center shrink-0 shadow-sm">
                    <Icon className="w-4 h-4 text-gray-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] font-semibold text-gray-400 block leading-tight">
                      {item.label}
                    </span>
                    <span className="text-xs sm:text-[13px] font-bold text-gray-900 truncate flex items-center gap-1 mt-0.5 group-hover:text-primary transition-colors">
                      <span className="truncate">{item.value}</span>
                      {item.external && (
                        <ArrowUpRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-primary shrink-0 transition-colors" />
                      )}
                    </span>
                  </div>
                </div>
              );

              if (item.href) {
                return (
                  <a
                    key={item.key}
                    href={item.href}
                    target={item.external ? '_blank' : undefined}
                    rel={item.external ? 'noopener noreferrer' : undefined}
                    className="group bg-[#F8FAFC] hover:bg-slate-100/80 border border-gray-200/80 rounded-xl p-3 transition-colors"
                  >
                    {content}
                  </a>
                );
              }

              return (
                <div
                  key={item.key}
                  className="bg-[#F8FAFC] border border-gray-200/80 rounded-xl p-3"
                >
                  {content}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* RIGHT COLUMN: REAL INTERACTIVE LOCATION MAP (5 COLS)      */}
      {/* ========================================================= */}
      <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-300/85 p-5 sm:p-6 shadow-[0_8px_28px_-4px_rgba(15,23,42,0.11),0_4px_10px_-2px_rgba(15,23,42,0.06)] flex flex-col justify-between gap-4">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
              Location & Directions
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-gray-950 tracking-tight">
              Our Location
            </h2>
          </div>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-gray-200/90 text-xs font-semibold text-gray-700 shrink-0 mt-1">
            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>
              {boroughOrCity}, {stateShort}
            </span>
          </span>
        </div>

        {/* Live Interactive Google Maps Embed */}
        <div className="relative flex-1 min-h-[190px] rounded-xl overflow-hidden border border-gray-200 bg-slate-100">
          <iframe
            title={`${provider.name} location on Google Maps`}
            src={googleMapsEmbedUrl}
            className="w-full h-full min-h-[190px] border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

        {/* Clean Address & Directions Footer */}
        <div className="bg-[#F8FAFC] border border-gray-200/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="text-[11px] font-semibold text-gray-400 block leading-tight">
                Business Address
              </span>
              <span className="text-xs sm:text-[13px] font-bold text-gray-900 leading-snug block mt-0.5">
                {cleanAddress}
              </span>
            </div>
          </div>

          <a
            href={googleMapsDirectionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-gray-50 text-gray-900 hover:text-primary border border-gray-200 shadow-sm text-xs font-bold shrink-0 transition-all"
          >
            <Navigation className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>Get Directions</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          </a>
        </div>
      </div>
    </section>
  );
}
