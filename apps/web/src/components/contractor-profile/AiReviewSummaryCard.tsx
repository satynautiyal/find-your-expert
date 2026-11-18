'use client';

import React from 'react';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  ShieldCheck,
  MessageSquare,
  Wrench,
  BadgeDollarSign,
  AlertCircle,
} from 'lucide-react';
import type { RooferProvider, AiReviewTagItem } from '@/data/mockRoofers';
import {
  GoogleLogo,
  YelpLogo,
  HomeAdvisorLogo,
  HouzzLogo,
} from './PlatformLogos';

interface AiReviewSummaryCardProps {
  provider: RooferProvider;
  variant?: 'default' | 'compact';
  activeKeyword?: string;
  onSelectTagKeyword?: (keyword: string) => void;
}

function renderTagIcon(tag: AiReviewTagItem, isActive: boolean) {
  const iconClass = `w-3.5 h-3.5 shrink-0 ${
    isActive
      ? 'text-emerald-300'
      : tag.sentiment === 'caution'
      ? 'text-amber-600'
      : 'text-[#0B3B2C]'
  }`;

  if (tag.sentiment === 'caution') {
    return <AlertCircle className={iconClass} />;
  }

  switch (tag.category) {
    case 'punctuality':
      return <Clock className={iconClass} />;
    case 'pricing':
      return <BadgeDollarSign className={iconClass} />;
    case 'communication':
      return <MessageSquare className={iconClass} />;
    case 'specialty':
      return <Wrench className={iconClass} />;
    case 'trust':
      return <ShieldCheck className={iconClass} />;
    default:
      return <CheckCircle2 className={iconClass} />;
  }
}

function renderMiniPlatformLogo(platformKey: string) {
  switch (platformKey.toUpperCase()) {
    case 'GOOGLE':
      return <GoogleLogo className="w-3.5 h-3.5 shrink-0" />;
    case 'HOUZZ':
      return <HouzzLogo className="w-3.5 h-3.5 shrink-0" />;
    case 'YELP':
      return <YelpLogo className="w-3.5 h-3.5 shrink-0" />;
    case 'HOMEADVISOR':
      return <HomeAdvisorLogo className="w-3.5 h-3.5 shrink-0" />;
    default:
      return null;
  }
}

function formatPlatformTitle(key: string): string {
  switch (key.toUpperCase()) {
    case 'GOOGLE':
      return 'Google';
    case 'HOUZZ':
      return 'Houzz';
    case 'YELP':
      return 'Yelp';
    case 'HOMEADVISOR':
      return 'HomeAdvisor';
    default:
      return key;
  }
}

export default function AiReviewSummaryCard({
  provider,
  variant = 'default',
  activeKeyword = '',
  onSelectTagKeyword,
}: AiReviewSummaryCardProps) {
  const analysis = provider.aiReviewAnalysis;

  // Clean fallback if only plain aiReviewSummary exists
  const fallbackRaw = (provider.aiReviewSummary || '').trim();
  const hasValidFallback =
    !analysis &&
    fallbackRaw.length >= 35 &&
    !fallbackRaw.startsWith('No detailed customer reviews');

  if (!analysis && !hasValidFallback) {
    return null;
  }

  const summaryText = analysis
    ? analysis.summary
    : fallbackRaw
        .replace(/\*\*/g, '')
        .replace(/^#+\s+.*$/gm, '')
        .replace(/^\d+\.\s+/gm, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 460);

  if (!summaryText) return null;

  const headline = analysis?.verdictHeadline?.trim() || '';
  const tags = analysis?.tags || [];
  const analyzedCount =
    analysis?.analyzedCount ||
    Math.min(500, provider.reviewStats?.totalSaved || provider.totalReviews || 0);

  const platformOrder = ['GOOGLE', 'HOUZZ', 'YELP', 'HOMEADVISOR'] as const;
  const activePlatforms = platformOrder.filter((key) => {
    if (analysis?.platformsIncluded) {
      return (analysis.platformsIncluded[key] || 0) > 0;
    }
    return (provider.reviewStats?.platformCounts?.[key] || 0) > 0;
  });

  const normalizedActiveKw = activeKeyword.trim().toLowerCase();
  const isCompact = variant === 'compact';

  return (
    <div
      className={`rounded-2xl border border-[#0B3B2C]/20 bg-gradient-to-br from-[#F4FAF7] via-white to-[#F8FAFC] shadow-[0_4px_16px_-4px_rgba(11,59,44,0.08)] ${
        isCompact ? 'p-3.5 sm:p-4 space-y-2.5' : 'p-4 sm:p-5 space-y-3.5'
      }`}
    >
      {/* Header Row: AI Badge + Transparent Analyzed Sample Count + Platform Icons */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0B3B2C] text-white text-[11px] font-extrabold tracking-wide shadow-sm">
            <Sparkles className="w-3 h-3 text-emerald-300 shrink-0" />
            <span>AI Review Summary</span>
          </span>

          {analyzedCount > 0 && (
            <span className="text-[11px] sm:text-xs font-semibold text-gray-600">
              Based on{' '}
              <strong className="font-extrabold text-gray-900 tabular-nums">
                {analyzedCount}
              </strong>{' '}
              most recent {analyzedCount === 1 ? 'review' : 'reviews'}
            </span>
          )}
        </div>

        {activePlatforms.length > 0 && (
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-gray-200/90 shadow-xs"
            title={`Synthesized from ${activePlatforms.map(formatPlatformTitle).join(', ')}`}
          >
            <span className="text-[10.5px] font-semibold text-gray-500 hidden sm:inline">
              Sources:
            </span>
            <div className="flex items-center gap-1.5">
              {activePlatforms.map((platKey) => (
                <span
                  key={platKey}
                  title={formatPlatformTitle(platKey)}
                  className="inline-flex items-center justify-center"
                >
                  {renderMiniPlatformLogo(platKey)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Verdict Headline + Crisp Summary Prose */}
      <div className="space-y-1.5">
        {headline && !isCompact && (
          <h3 className="text-sm sm:text-[15px] font-extrabold text-gray-950 leading-snug">
            {headline}
          </h3>
        )}
        <p
          className={`${
            isCompact ? 'text-xs sm:text-[13px]' : 'text-xs sm:text-[13.5px]'
          } text-gray-700 leading-relaxed`}
        >
          {summaryText}
        </p>
      </div>

      {/* Important Highlight Tags Row (1-Click Verifiable in ReviewsModal) */}
      {tags.length > 0 && (
        <div className="pt-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {tags.map((tag) => {
              const isActive =
                Boolean(normalizedActiveKw) &&
                normalizedActiveKw === tag.keyword.trim().toLowerCase();
              const showCountBadge = analyzedCount >= 6 && tag.mentionCount >= 2;
              const clickable = Boolean(onSelectTagKeyword);

              const pillClasses = isActive
                ? 'bg-[#0B3B2C] text-white border-[#0B3B2C] shadow-sm'
                : tag.sentiment === 'caution'
                ? 'bg-amber-50/90 hover:bg-amber-100/80 text-amber-950 border-amber-200/90'
                : 'bg-white hover:bg-[#EBF7F2]/80 text-gray-800 hover:text-[#0B3B2C] border-gray-200/95 hover:border-[#0B3B2C]/35 shadow-2xs';

              if (!clickable) {
                return (
                  <span
                    key={`${tag.label}-${tag.keyword}`}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11.5px] sm:text-xs font-bold transition-all ${pillClasses}`}
                  >
                    {renderTagIcon(tag, isActive)}
                    <span>{tag.label}</span>
                    {showCountBadge && (
                      <span className="text-[10.5px] font-semibold text-gray-400 tabular-nums">
                        ({tag.mentionCount})
                      </span>
                    )}
                  </span>
                );
              }

              return (
                <button
                  key={`${tag.label}-${tag.keyword}`}
                  type="button"
                  onClick={() => onSelectTagKeyword?.(isActive ? '' : tag.keyword)}
                  title={
                    isActive
                      ? 'Click to clear topic filter'
                      : `See verified reviews mentioning "${tag.label}"`
                  }
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11.5px] sm:text-xs font-bold transition-all cursor-pointer ${pillClasses}`}
                >
                  {renderTagIcon(tag, isActive)}
                  <span>{tag.label}</span>
                  {showCountBadge && (
                    <span
                      className={`text-[10.5px] font-semibold tabular-nums ${
                        isActive ? 'text-emerald-200' : 'text-gray-400'
                      }`}
                    >
                      ({tag.mentionCount})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

