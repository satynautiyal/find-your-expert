'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Star,
  ChevronRight,
  ChevronUp,
  ArrowRight,
  Home,
  Wrench,
  CloudRain,
  Search,
  Layers,
  Grid,
  CheckCircle2,
  Sun,
  ShieldAlert,
  Building2,
  Hammer,
  Sparkles,
  Box,
  Compass,
  Clock,
  MapPin,
  PenLine,
  Camera,
} from 'lucide-react';
import type { RooferProvider } from '@/data/mockRoofers';
import {
  GoogleLogo,
  YelpLogo,
  HomeAdvisorLogo,
  HouzzLogo,
  FacebookLogo,
} from './PlatformLogos';
import ProfileTeamSection from './ProfileTeamSection';
import PhotoLightboxModal from './PhotoLightboxModal';
import { fetchProviderReviews, type ScrapedReviewItemDto } from '@/lib/api';
import { getOwnR2MediaUrl } from '@/lib/media-url';

interface ProfileServicesAndReviewsProps {
  provider: RooferProvider;
  onOpenQuoteModal: () => void;
  onOpenReviewsModal?: (initialPlatform?: string) => void;
  scrapedReviews?: ScrapedReviewItemDto[];
}

function getReviewerInitials(name: string): string {
  const parts = (name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'VH';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

interface DisplayReviewCardItem {
  authorName: string;
  authorAvatarUrl: string;
  photoUrls: string[];
  platform: string;
  rating: number;
  date: string;
  comment: string;
}

function CustomerReviewCard({
  rev,
  renderPlatformIcon,
  onOpenModal,
  onOpenPhotoLightbox,
}: {
  rev: DisplayReviewCardItem;
  renderPlatformIcon: (platform: string) => React.ReactNode;
  onOpenModal: () => void;
  onOpenPhotoLightbox: (photos: string[], index: number, authorName: string) => void;
}) {
  const cleanComment = rev.comment.replace(/\nPrice assessment[\s\S]*$/i, '').trim();
  const [expanded, setExpanded] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(cleanComment.length > 135);
  const textRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    const el = textRef.current;
    if (!el || expanded) return;
    const checkOverflow = () => {
      if (el) {
        setIsOverflowing(el.scrollHeight > el.clientHeight + 1);
      }
    };
    checkOverflow();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(checkOverflow);
      ro.observe(el);
      return () => ro.disconnect();
    }
  }, [cleanComment, expanded]);

  const showAvatar = Boolean(rev.authorAvatarUrl) && !avatarFailed;

  return (
    <article className="p-4 rounded-2xl border border-gray-300/80 bg-white shadow-[0_4px_14px_-2px_rgba(15,23,42,0.08),0_2px_5px_-1px_rgba(15,23,42,0.04)] hover:shadow-[0_10px_24px_-4px_rgba(15,23,42,0.13)] hover:border-gray-300 transition-all flex flex-col justify-between gap-3">
      <div className="space-y-2.5">
        {/* Reviewer Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-white border border-gray-200 flex items-center justify-center shrink-0">
              {showAvatar ? (
                <img
                  src={rev.authorAvatarUrl}
                  alt={rev.authorName}
                  loading="lazy"
                  onError={() => setAvatarFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-[11px] font-bold text-slate-600">
                  {getReviewerInitials(rev.authorName)}
                </span>
              )}
            </div>

            <div className="min-w-0">
              <div className="font-bold text-xs sm:text-[13px] text-gray-950 truncate">
                {rev.authorName}
              </div>
              <div className="text-[11px] text-gray-400 font-medium">
                {rev.date}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenModal}
            title={`View ${rev.platform} reviews`}
            className="shrink-0 pt-0.5 cursor-pointer"
          >
            {renderPlatformIcon(rev.platform)}
          </button>
        </div>

        {/* Star Rating */}
        <div className="flex items-center gap-0.5 text-amber-500">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-3.5 h-3.5 ${
                i < (rev.rating || 5)
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-gray-200 text-gray-200'
              }`}
            />
          ))}
        </div>

        {/* 3-Line Clamped Review Text + Read more -> Button */}
        <div className="space-y-1.5">
          <p
            ref={textRef}
            className={`text-xs sm:text-[13px] text-gray-600 leading-relaxed ${
              expanded ? '' : 'line-clamp-3'
            }`}
          >
            &ldquo;{cleanComment}&rdquo;
          </p>

          {(isOverflowing || expanded) && (
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="group/rm inline-flex items-center gap-1 text-xs font-bold text-[#EA580C] hover:text-[#D94F0A] transition-colors cursor-pointer"
            >
              {expanded ? (
                <>
                  <span>Show less</span>
                  <ChevronUp className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <span>Read more</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/rm:translate-x-0.5" />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Customer-Shared R2 Review Photos Preview (if attached) */}
      {rev.photoUrls && rev.photoUrls.length > 0 && (
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          {rev.photoUrls.slice(0, 4).map((pUrl, pIdx) => (
            <button
              key={pIdx}
              type="button"
              onClick={() => onOpenPhotoLightbox(rev.photoUrls, pIdx, rev.authorName)}
              aria-label={`View customer photo ${pIdx + 1} by ${rev.authorName}`}
              className="group/rph relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border border-gray-200/90 hover:border-gray-300 bg-slate-100 shrink-0 cursor-pointer shadow-sm"
            >
              <img
                src={pUrl}
                alt={`Photo shared by ${rev.authorName}`}
                loading="lazy"
                className="w-full h-full object-cover group-hover/rph:scale-105 transition-transform duration-200"
              />
              {pIdx === 3 && rev.photoUrls.length > 4 && (
                <div className="absolute inset-0 bg-black/65 text-white text-xs font-extrabold flex items-center justify-center">
                  +{rev.photoUrls.length - 4}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}

export default function ProfileServicesAndReviews({
  provider,
  onOpenQuoteModal,
  onOpenReviewsModal,
  scrapedReviews = [],
}: ProfileServicesAndReviewsProps) {
  const [filterPlatform, setFilterPlatform] = useState<string>('ALL');
  const [onlyWithPhotos, setOnlyWithPhotos] = useState(false);
  const [tabFilteredItems, setTabFilteredItems] = useState<ScrapedReviewItemDto[] | null>(null);
  const [isTabLoading, setIsTabLoading] = useState(false);
  const [reviewLightbox, setReviewLightbox] = useState<{
    photos: string[];
    index: number;
    authorName: string;
  } | null>(null);
  const [showAllServices, setShowAllServices] = useState(false);
  const [showAllAreas, setShowAllAreas] = useState(false);

  // When user selects a specific platform or "With Photos" on the profile preview, fetch top 6 matching reviews from paginated API
  useEffect(() => {
    if (filterPlatform === 'ALL' && !onlyWithPhotos) {
      setTabFilteredItems(null);
      setIsTabLoading(false);
      return;
    }
    if (!provider.slug) return;
    let cancelled = false;
    setIsTabLoading(true);
    fetchProviderReviews(provider.slug, {
      page: 1,
      limit: 6,
      platform: filterPlatform,
      withPhotos: onlyWithPhotos,
      sortBy: 'RELEVANT',
    })
      .then((res) => {
        if (!cancelled) {
          setTabFilteredItems(res.items || []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTabFilteredItems([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsTabLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [provider.slug, filterPlatform, onlyWithPhotos]);

  const formattedReviewsUpdated = (() => {
    if (!provider.reviewsLastUpdatedAt) return null;
    const parsed = new Date(provider.reviewsLastUpdatedAt);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  })();

  // Trade & Location detection
  const isCabinets =
    /Cabinet|Millwork|Closet/i.test(provider.category || '') ||
    Boolean(provider.services?.some((s) => /Cabinet|Millwork|Closet/i.test(s)));

  const borough =
    provider.borough && provider.borough !== 'All'
      ? provider.borough
      : provider.city || 'Manhattan';

  const roofingServicesList = [
    { name: 'Roof Replacement', icon: Home },
    { name: 'Roof Repair', icon: Wrench },
    { name: 'Storm Damage Repair', icon: CloudRain },
    { name: 'Roof Inspection', icon: Search },
    { name: 'Shingle Roofing', icon: Layers },
    { name: 'Metal Roofing', icon: Grid },
    { name: 'Flat Roofing', icon: Box },
    { name: 'Gutter Installation', icon: CheckCircle2 },
    { name: 'Skylight Installation', icon: Sun },
  ];

  const cabinetServicesList = [
    { name: 'Custom Cabinets', icon: Home },
    { name: 'Kitchen Cabinetry', icon: Wrench },
    { name: 'Bathroom Vanities', icon: Layers },
    { name: 'Built-In Shelving', icon: Grid },
    { name: 'Architectural Millwork', icon: Hammer },
    { name: 'Custom Closets', icon: Box },
    { name: 'Cabinet Refacing', icon: Sparkles },
    { name: 'Finish Carpentry', icon: CheckCircle2 },
    { name: 'Commercial Millwork', icon: Building2 },
  ];

  const serviceIcons = [
    Home,
    Wrench,
    Layers,
    Grid,
    Hammer,
    Box,
    Sparkles,
    CheckCircle2,
    Building2,
    Search,
    Compass,
    ShieldAlert,
  ];

  const fallbackServicesList = isCabinets ? cabinetServicesList : roofingServicesList;
  const displayServices =
    provider.services && provider.services.length > 0
      ? provider.services.map((name, idx) => ({
          name,
          icon: serviceIcons[idx % serviceIcons.length],
        }))
      : fallbackServicesList;

  const INITIAL_SERVICES_LIMIT = 9;
  const visibleServices = showAllServices
    ? displayServices
    : displayServices.slice(0, INITIAL_SERVICES_LIMIT);
  const extraServicesCount = Math.max(0, displayServices.length - INITIAL_SERVICES_LIMIT);

  // Dynamic Service Areas from DB (ListingServiceArea / servesArea) with NYC borough coverage
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
    ...['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'].filter(
      (b) => b.toLowerCase() !== borough.toLowerCase()
    ),
  ];

  const allAreas = Array.from(new Set(dbAreas.length > 0 ? dbAreas : nycAreas));
  const INITIAL_AREAS_LIMIT = 8;
  const visibleSecondaryAreas = showAllAreas
    ? allAreas.slice(1)
    : allAreas.slice(1, INITIAL_AREAS_LIMIT);
  const extraAreasCount = Math.max(0, allAreas.length - INITIAL_AREAS_LIMIT);

  // Rating & review distributions strictly from real DB stats (zero static fallbacks)
  const rating = provider.compositeRating || 0;
  const totalSavedInDb = provider.reviewStats?.totalSaved ?? scrapedReviews.length ?? 0;
  const totalReviews = provider.totalReviews || totalSavedInDb || 0;

  const distribution = provider.reviewStats?.starDistribution
    ? provider.reviewStats.starDistribution
    : [5, 4, 3, 2, 1].map((stars) => {
        if (scrapedReviews && scrapedReviews.length > 0) {
          const count = scrapedReviews.filter((r) => Math.round(r.rating || 5) === stars).length;
          const pct = Math.round((count / scrapedReviews.length) * 100);
          return { stars, pct, count };
        }
        return { stars, pct: 0, count: 0 };
      });

  const activeRawPreviewSource =
    tabFilteredItems !== null ? tabFilteredItems : scrapedReviews || [];

  const formatReviewItem = (sr: ScrapedReviewItemDto, origIdx: number) => {
    const rawName = (sr.authorName || '').trim();
    let authorName = rawName || 'Verified Homeowner';
    if (/^HU-\d+$/i.test(authorName)) {
      authorName = 'Verified Houzz Homeowner';
    } else {
      const parts = authorName.split(/\s+/);
      if (parts.length >= 2 && parts[0].length > 20 && /[+/0-9]/.test(parts[0])) {
        authorName = parts.slice(1).join(' ');
      }
    }
    let formattedDate = (sr.reviewDate || '').trim() || 'Verified Review';
    if (/^\d{4}-\d{2}-\d{2}(?:[T\s].*)?$/.test(formattedDate)) {
      const parsedDate = new Date(formattedDate);
      if (!Number.isNaN(parsedDate.getTime())) {
        formattedDate = parsedDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }
    }
    const cleanPhotos = (sr.photoUrls || []).map((u) => getOwnR2MediaUrl(u)).filter(Boolean);
    return {
      authorName,
      authorAvatarUrl: sr.authorAvatarUrl ? getOwnR2MediaUrl(sr.authorAvatarUrl) : '',
      photoUrls: cleanPhotos,
      platform: sr.platform?.toUpperCase() || 'GOOGLE',
      rating: sr.rating || 5,
      date: formattedDate,
      comment: sr.comment,
      _origIdx: origIdx,
    };
  };

  const allDisplayReviews = (scrapedReviews || []).map(formatReviewItem);
  const filteredReviews = activeRawPreviewSource.map(formatReviewItem);

  const photoReviewsCount =
    provider.reviewStats?.withPhotosCount ??
    allDisplayReviews.filter((r) => r.photoUrls.length > 0).length;

  const renderPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'GOOGLE':
        return <GoogleLogo className="w-4 h-4 shrink-0" />;
      case 'YELP':
        return <YelpLogo className="w-4 h-4 shrink-0" />;
      case 'HOMEADVISOR':
        return <HomeAdvisorLogo className="w-4 h-4 shrink-0" />;
      case 'HOUZZ':
        return <HouzzLogo className="w-4 h-4 shrink-0" />;
      case 'FACEBOOK':
        return <FacebookLogo className="w-4 h-4 shrink-0" />;
      default:
        return <GoogleLogo className="w-4 h-4 shrink-0" />;
    }
  };

  const activePlatformSummaries = [
    provider.reviews?.google && provider.reviews.google.count > 0
      ? {
          key: 'GOOGLE',
          label: 'Google',
          rating: provider.reviews.google.rating,
          count: provider.reviews.google.count,
          url: provider.reviews.google.url,
        }
      : null,
    provider.reviews?.yelp && provider.reviews.yelp.count > 0
      ? {
          key: 'YELP',
          label: 'Yelp',
          rating: provider.reviews.yelp.rating,
          count: provider.reviews.yelp.count,
          url: provider.reviews.yelp.url,
        }
      : null,
    provider.reviews?.homeadvisor && provider.reviews.homeadvisor.count > 0
      ? {
          key: 'HOMEADVISOR',
          label: 'HomeAdvisor',
          rating: provider.reviews.homeadvisor.rating,
          count: provider.reviews.homeadvisor.count,
          url: provider.reviews.homeadvisor.url,
        }
      : null,
    (provider.reviews?.houzz?.count || provider.reviews?.facebook?.count || 0) > 0
      ? {
          key: 'HOUZZ',
          label: 'Houzz',
          rating: provider.reviews.houzz?.rating || provider.reviews.facebook?.rating || 0,
          count: provider.reviews.houzz?.count || provider.reviews.facebook?.count || 0,
          url: provider.reviews.houzz?.url || provider.reviews.facebook?.url || '',
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

  const savedByPlat = provider.reviewStats?.platformCounts || {};

  const platformFilterOptions = [
    { key: 'ALL', label: 'All Reviews', count: totalReviews },
    {
      key: 'GOOGLE',
      label: 'Google',
      count:
        activePlatformSummaries.find((p) => p.key === 'GOOGLE')?.count ||
        savedByPlat.GOOGLE ||
        0,
    },
    {
      key: 'YELP',
      label: 'Yelp',
      count:
        activePlatformSummaries.find((p) => p.key === 'YELP')?.count ||
        savedByPlat.YELP ||
        0,
    },
    {
      key: 'HOMEADVISOR',
      label: 'HomeAdvisor',
      count:
        activePlatformSummaries.find((p) => p.key === 'HOMEADVISOR')?.count ||
        savedByPlat.HOMEADVISOR ||
        0,
    },
    {
      key: 'HOUZZ',
      label: 'Houzz',
      count:
        activePlatformSummaries.find((p) => p.key === 'HOUZZ')?.count ||
        savedByPlat.HOUZZ ||
        0,
    },
  ].filter(
    (opt) =>
      opt.key === 'ALL' ||
      opt.count > 0 ||
      Boolean(savedByPlat[opt.key])
  );

  const selectedPlatformSummary =
    filterPlatform !== 'ALL'
      ? activePlatformSummaries.find((p) => p.key === filterPlatform) || null
      : null;

  return (
    <div className="space-y-8">
      {/* =================================================================== */}
      {/* 1. COMPACT PAIRED ROW: SERVICES OFFERED (7) + SERVICE AREAS (5)     */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Card: Compact Services Offered */}
        <section
          id="services"
          className="lg:col-span-7 bg-white rounded-2xl border border-gray-300/85 p-5 sm:p-6 shadow-[0_8px_28px_-4px_rgba(15,23,42,0.11),0_4px_10px_-2px_rgba(15,23,42,0.06)] flex flex-col justify-between gap-4 scroll-mt-36"
        >
          <div className="space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-gray-950 tracking-tight">
                  Services Offered
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Specialized {isCabinets ? 'cabinetry & millwork' : 'roofing & exterior'}{' '}
                  capabilities for residential &amp; commercial projects.
                </p>
              </div>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 border border-gray-200/80 text-[11px] font-bold text-gray-700 shrink-0">
                {displayServices.length} Specialties
              </span>
            </div>

            {/* Sleek Compact 2/3-Column Specialty Grid (Zero bloated vertical spacing) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
              {visibleServices.map((service, idx) => {
                const IconComponent = service.icon;
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#F8FAFC] border border-gray-200/85 hover:bg-white hover:border-[#0B3B2C]/35 transition-all group"
                  >
                    <div className="w-6 h-6 rounded-md bg-[#EBF7F2] text-[#0B3B2C] flex items-center justify-center shrink-0">
                      <IconComponent className="w-3.5 h-3.5 stroke-[2.2]" />
                    </div>
                    <span className="text-xs font-bold text-gray-800 group-hover:text-gray-950 truncate">
                      {service.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {extraServicesCount > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowAllServices((prev) => !prev)}
                className="text-xs font-bold text-[#EA580C] hover:text-[#D94F0A] transition-colors cursor-pointer"
              >
                {showAllServices
                  ? 'Show fewer services'
                  : `+ View ${extraServicesCount} more services`}
              </button>
            </div>
          )}
        </section>

        {/* Right Card: Matching Compact Service Areas */}
        <section
          id="service-areas"
          className="lg:col-span-5 bg-white rounded-2xl border border-gray-300/85 p-5 sm:p-6 shadow-[0_8px_28px_-4px_rgba(15,23,42,0.11),0_4px_10px_-2px_rgba(15,23,42,0.06)] flex flex-col justify-between gap-4 scroll-mt-36"
        >
          <div className="space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-gray-950 tracking-tight">
                  Service Areas
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Active on-site consultations &amp; installations across {borough} &amp; nearby areas.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-[11px] font-bold text-emerald-800 shrink-0">
                <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>{allAreas.length} Areas</span>
              </span>
            </div>

            {/* Clean Regional Coverage Chips */}
            <div className="flex flex-wrap items-center gap-2">
              {allAreas[0] && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#0B3B2C] text-white shadow-sm">
                  <MapPin className="w-3 h-3 text-emerald-300 shrink-0" />
                  <span>{allAreas[0]}</span>
                </span>
              )}

              {visibleSecondaryAreas.map((area, idx) => (
                <span
                  key={`${area}-${idx}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#F8FAFC] border border-gray-200/85 text-gray-700 hover:bg-slate-100/80 transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0B3B2C]/60 shrink-0" />
                  <span>{area}</span>
                </span>
              ))}

              {extraAreasCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllAreas((prev) => !prev)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-[#EA580C] hover:bg-orange-50 border border-orange-200/80 transition-colors cursor-pointer"
                >
                  {showAllAreas ? 'Show less' : `+${extraAreasCount} more`}
                </button>
              )}
            </div>
          </div>

          <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between gap-2 text-[11px] text-gray-500 font-medium">
            <span>Primary Hub: {borough}, NY</span>
            <button
              type="button"
              onClick={onOpenQuoteModal}
              className="font-bold text-[#0B3B2C] hover:underline cursor-pointer"
            >
              Check availability →
            </button>
          </div>
        </section>
      </div>

      {/* =================================================================== */}
      {/* 2. CONDITIONAL "THE TEAM" SECTION (Only when real website team exists) */}
      {/* =================================================================== */}
      <ProfileTeamSection provider={provider} />

      {/* =================================================================== */}
      {/* 3. FULL-WIDTH INDUSTRY-STANDARD CUSTOMER REVIEWS SECTION            */}
      {/* =================================================================== */}
      <section
        id="reviews"
        className="bg-white rounded-2xl border border-gray-300/85 p-5 sm:p-6 shadow-[0_8px_28px_-4px_rgba(15,23,42,0.11),0_4px_10px_-2px_rgba(15,23,42,0.06)] space-y-5 scroll-mt-36"
      >
        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-950 tracking-tight">
              Customer Reviews
            </h2>
            {formattedReviewsUpdated && (
              <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span>Reviews last updated: {formattedReviewsUpdated}</span>
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={onOpenQuoteModal}
              className="inline-flex items-center gap-1.5 py-2 px-3.5 rounded-xl border border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-800 font-bold text-xs transition-colors cursor-pointer"
            >
              <PenLine className="w-3.5 h-3.5 text-gray-600" />
              <span>Write a Review</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenReviewsModal?.(filterPlatform)}
              className="inline-flex items-center gap-1 py-2 px-3.5 rounded-xl bg-[#0B3B2C] hover:bg-[#082B20] text-white font-bold text-xs transition-colors cursor-pointer shadow-sm"
            >
              <span>See all {totalReviews} reviews</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Full-Width 3-Zone Rating Intelligence Banner */}
        <div className="rounded-2xl bg-[#F8FAFC] border border-gray-200/85 p-4 sm:p-5 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
          {/* Zone 1: Overall Composite Score */}
          <div className="md:col-span-3 flex sm:flex-col items-center sm:items-start justify-between sm:justify-center gap-2">
            <div>
              <div className="text-4xl sm:text-5xl font-black text-gray-950 tracking-tight leading-none">
                {rating.toFixed(1)}
              </div>
              <div className="flex items-center gap-0.5 text-amber-500 mt-2">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.round(rating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'fill-gray-200 text-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>
            <p className="text-xs text-gray-500 font-semibold">
              Based on {totalReviews} verified reviews
            </p>
          </div>

          {/* Zone 2: 5-Star Distribution Bars */}
          <div className="md:col-span-5 md:border-x md:border-gray-200/80 md:px-6 space-y-1.5 text-xs font-medium text-gray-600">
            {distribution.map((item) => (
              <div key={item.stars} className="flex items-center gap-2.5">
                <span className="w-5 shrink-0 font-bold text-gray-700 tabular-nums">
                  {item.stars}★
                </span>
                <div className="flex-1 h-2 rounded-full bg-gray-200/80 overflow-hidden">
                  <div
                    className="h-full bg-[#0B3B2C] rounded-full transition-all duration-500"
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
                <span className="w-16 text-right text-gray-500 text-[11px] tabular-nums shrink-0">
                  {item.pct}% ({item.count})
                </span>
              </div>
            ))}
          </div>

          {/* Zone 3: Cross-Platform Breakdown */}
          <div className="md:col-span-4">
            {activePlatformSummaries.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activePlatformSummaries.map((plat) => (
                  <button
                    key={plat.key}
                    type="button"
                    onClick={() => onOpenReviewsModal?.(plat.key)}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-gray-200/90 bg-white hover:border-gray-300 shadow-sm transition-all text-xs cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {renderPlatformIcon(plat.key)}
                      <span className="font-bold text-gray-800 truncate">
                        {plat.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 tabular-nums">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                      <span className="font-bold text-gray-950">
                        {plat.rating.toFixed(1)}
                      </span>
                      <span className="text-gray-400 text-[11px]">
                        ({plat.count})
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">
                Ratings verified across major homeowner review platforms.
              </p>
            )}
          </div>
        </div>

        {/* Platform + "With Photos" Filter Tabs */}
        {(platformFilterOptions.length > 1 || photoReviewsCount > 0) && (
          <div className="flex flex-wrap items-center gap-2">
            {platformFilterOptions.map((opt) => {
              const active = filterPlatform === opt.key && !onlyWithPhotos;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    setFilterPlatform(opt.key);
                    setOnlyWithPhotos(false);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    active
                      ? 'bg-[#0B3B2C] text-white border-[#0B3B2C] shadow-sm'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {opt.key !== 'ALL' && renderPlatformIcon(opt.key)}
                  <span>{opt.label}</span>
                  {opt.count > 0 && (
                    <span
                      className={`text-[11px] tabular-nums ${
                        active ? 'text-white/80' : 'text-gray-400'
                      }`}
                    >
                      ({opt.count})
                    </span>
                  )}
                </button>
              );
            })}

            {photoReviewsCount > 0 && (
              <button
                type="button"
                onClick={() => setOnlyWithPhotos((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  onlyWithPhotos
                    ? 'bg-[#EA580C] text-white border-[#EA580C] shadow-sm'
                    : 'bg-orange-50/70 text-[#C2410C] border-orange-200 hover:bg-orange-100/70'
                }`}
              >
                <Camera className="w-3.5 h-3.5 shrink-0" />
                <span>With Photos</span>
                <span
                  className={`text-[11px] tabular-nums ${
                    onlyWithPhotos ? 'text-white/85' : 'text-[#EA580C]/80'
                  }`}
                >
                  ({photoReviewsCount})
                </span>
              </button>
            )}
          </div>
        )}

        {/* Full-Width 3-Column Customer Review Cards Grid */}
        <div id="reviews-list">
          {isTabLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((sk) => (
                <div
                  key={sk}
                  className="p-4 rounded-2xl border border-gray-200/80 bg-[#F8FAFC]/60 space-y-3 animate-pulse"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-gray-200" />
                    <div className="space-y-1.5">
                      <div className="w-28 h-3 bg-gray-200 rounded" />
                      <div className="w-16 h-2.5 bg-gray-100 rounded" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="w-full h-3 bg-gray-100 rounded" />
                    <div className="w-5/6 h-3 bg-gray-100 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredReviews.length > 0 ? (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                {filteredReviews.slice(0, 6).map((rev, idx) => (
                  <CustomerReviewCard
                    key={`${rev.platform}-${rev.authorName}-${idx}`}
                    rev={rev}
                    renderPlatformIcon={renderPlatformIcon}
                    onOpenModal={() =>
                      onOpenReviewsModal?.(onlyWithPhotos ? 'WITH_PHOTOS' : filterPlatform)
                    }
                    onOpenPhotoLightbox={(photos, index, authorName) =>
                      setReviewLightbox({ photos, index, authorName })
                    }
                  />
                ))}
              </div>

              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={() =>
                    onOpenReviewsModal?.(onlyWithPhotos ? 'WITH_PHOTOS' : filterPlatform)
                  }
                  className="py-2.5 px-6 rounded-xl bg-[#F8FAFC] hover:bg-slate-100 border border-gray-300/80 hover:border-gray-400 text-xs sm:text-sm font-bold text-gray-900 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
                >
                  <span>
                    {onlyWithPhotos
                      ? `Read all ${photoReviewsCount} photo reviews`
                      : filterPlatform === 'ALL'
                      ? `Read all ${totalSavedInDb || totalReviews} verified reviews`
                      : `Read all ${
                          savedByPlat[filterPlatform] ||
                          platformFilterOptions.find((o) => o.key === filterPlatform)?.count ||
                          filteredReviews.length
                        } ${
                          platformFilterOptions.find((o) => o.key === filterPlatform)?.label || ''
                        } reviews`}
                  </span>
                  <ChevronRight className="w-4 h-4 text-[#EA580C]" />
                </button>
              </div>
            </div>
          ) : selectedPlatformSummary ? (
            <div className="p-5 rounded-2xl border border-gray-200/90 bg-[#F8FAFC] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {renderPlatformIcon(selectedPlatformSummary.key)}
                  <span className="text-sm font-bold text-gray-950">
                    Verified {selectedPlatformSummary.label} Rating ·{' '}
                    {selectedPlatformSummary.rating.toFixed(1)}★ (
                    {selectedPlatformSummary.count} reviews)
                  </span>
                </div>
                <p className="text-xs sm:text-[13px] text-gray-600">
                  {provider.name} holds a verified{' '}
                  {selectedPlatformSummary.rating.toFixed(1)}-star rating across{' '}
                  {selectedPlatformSummary.count} customer reviews on{' '}
                  {selectedPlatformSummary.label}.
                </p>
              </div>

              <button
                type="button"
                onClick={() => onOpenReviewsModal?.('ALL')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 shadow-sm text-xs font-bold transition-all cursor-pointer shrink-0"
              >
                <span>View all reviews</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#EA580C]" />
              </button>
            </div>
          ) : null}
        </div>
      </section>

      {/* Lightbox for Customer-Uploaded Review Photos */}
      <PhotoLightboxModal
        isOpen={Boolean(reviewLightbox)}
        onClose={() => setReviewLightbox(null)}
        photos={reviewLightbox?.photos || []}
        initialIndex={reviewLightbox?.index || 0}
        providerName={
          reviewLightbox
            ? `${provider.name} — Photo by ${reviewLightbox.authorName}`
            : provider.name
        }
      />
    </div>
  );
}
