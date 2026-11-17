'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { Camera, ChevronLeft, ChevronRight, Grid2X2, Maximize2, ShieldCheck } from 'lucide-react';

interface ProfilePhotoCarouselProps {
  photos: string[];
  businessLogo?: string;
  fallbackInitial?: string;
  providerName: string;
  tradeLabel?: string;
  onOpenLightbox: (index: number) => void;
}

/**
 * Fixed-dimension, industry-standard media showcase for Contractor Profiles.
 * - Main featured frame uses strict locked dimensions at every breakpoint
 *   (h-[228px] mobile -> sm:h-[320px] -> lg:w-[440px] lg:h-[304px] -> xl:w-[520px] xl:h-[348px])
 *   so every contractor displays an identical, harmonious 3:2 architectural frame.
 * - Flush 5-slot thumbnail dock aligns edge-to-edge with zero half-clipped thumbnails.
 */
export default function ProfilePhotoCarousel({
  photos,
  businessLogo = '',
  fallbackInitial = 'P',
  providerName,
  tradeLabel = 'Verified Contractor',
  onOpenLightbox,
}: ProfilePhotoCarouselProps) {
  const [failedUrls, setFailedUrls] = useState<Record<string, boolean>>({});
  const validPhotos = useMemo(
    () => photos.filter((u) => Boolean(u) && !failedUrls[u]),
    [photos, failedUrls]
  );

  const hasProjectPhotos = validPhotos.length > 0;
  const hasMultiplePhotos = validPhotos.length > 1;

  const [selectedIndex, setSelectedIndex] = useState(0);

  const [emblaMainRef, emblaMainApi] = useEmblaCarousel({
    loop: hasMultiplePhotos,
    align: 'start',
    skipSnaps: false,
  });

  const onSelect = useCallback(() => {
    if (!emblaMainApi) return;
    setSelectedIndex(emblaMainApi.selectedScrollSnap());
  }, [emblaMainApi]);

  useEffect(() => {
    if (!emblaMainApi) return;
    onSelect();
    emblaMainApi.on('select', onSelect);
    emblaMainApi.on('reInit', onSelect);
    return () => {
      emblaMainApi.off('select', onSelect);
      emblaMainApi.off('reInit', onSelect);
    };
  }, [emblaMainApi, onSelect]);

  useEffect(() => {
    if (selectedIndex >= validPhotos.length && validPhotos.length > 0) {
      setSelectedIndex(0);
    }
  }, [validPhotos.length, selectedIndex]);

  const handlePrev = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      emblaMainApi?.scrollPrev();
    },
    [emblaMainApi]
  );

  const handleNext = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      emblaMainApi?.scrollNext();
    },
    [emblaMainApi]
  );

  const handleThumbClick = useCallback(
    (index: number) => {
      if (!emblaMainApi) return;
      emblaMainApi.scrollTo(index);
    },
    [emblaMainApi]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!hasMultiplePhotos || !emblaMainApi) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        emblaMainApi.scrollPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        emblaMainApi.scrollNext();
      }
    },
    [hasMultiplePhotos, emblaMainApi]
  );

  const markUrlFailed = useCallback((url: string) => {
    setFailedUrls((prev) => (prev[url] ? prev : { ...prev, [url]: true }));
  }, []);

  // Compute flush 5-slot thumbnail window (zero clipped half-thumbnails)
  const visibleThumbSlots = useMemo(() => {
    const total = validPhotos.length;
    if (total <= 1) return [];
    if (total <= 5) {
      return validPhotos.map((url, idx) => ({
        photoIndex: idx,
        url,
        moreCount: 0,
      }));
    }

    // Slots 0..3 follow a smooth sliding window around `selectedIndex`;
    // Slot 4 is a "+N more" gallery tile opening the full lightbox.
    const maxStart = Math.max(0, total - 5);
    const windowStart = Math.min(Math.max(0, selectedIndex - 1), maxStart);
    const previewIndices = [
      windowStart,
      windowStart + 1,
      windowStart + 2,
      windowStart + 3,
    ];

    // Pick a distinct 5th tile image for the "+N" overlay
    let fifthIndex = windowStart + 4;
    if (fifthIndex >= total) {
      fifthIndex = total - 1;
    }

    return [
      ...previewIndices.map((pIdx) => ({
        photoIndex: pIdx,
        url: validPhotos[pIdx],
        moreCount: 0,
      })),
      {
        photoIndex: fifthIndex,
        url: validPhotos[fifthIndex],
        moreCount: total - 4,
      },
    ];
  }, [validPhotos, selectedIndex]);

  // Fixed-size fallback showcase when contractor has 0 project photos
  if (!hasProjectPhotos) {
    return (
      <div className="w-full lg:w-[440px] xl:w-[520px] shrink-0 space-y-2.5">
        <div
          className="relative w-full h-[228px] sm:h-[320px] lg:h-[304px] xl:h-[348px] rounded-2xl overflow-hidden border border-gray-200/90 bg-gradient-to-br from-slate-50 via-white to-emerald-50/40 flex flex-col items-center justify-center p-8 text-center"
          style={{
            backgroundImage:
              'radial-gradient(rgba(11, 59, 44, 0.06) 1px, transparent 1px)',
            backgroundSize: '18px 18px',
          }}
        >
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-white border border-gray-200/90 shadow-sm p-4 flex items-center justify-center">
            {businessLogo && !failedUrls[businessLogo] ? (
              <img
                src={businessLogo}
                alt={`${providerName} logo`}
                onError={() => markUrlFailed(businessLogo)}
                className="max-w-full max-h-full w-auto h-auto object-contain"
              />
            ) : (
              <span className="text-4xl font-black text-[#0B3B2C]">
                {fallbackInitial}
              </span>
            )}
          </div>
          <span className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 border border-gray-200/80 text-[11px] font-semibold text-gray-600 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{tradeLabel} · Official Brand Profile</span>
          </span>
        </div>

        <div className="h-[54px] sm:h-[64px] rounded-xl bg-slate-50/80 border border-gray-200/80 px-3.5 flex items-center justify-between text-xs text-gray-500">
          <span className="font-medium truncate">{providerName}</span>
          <span className="text-[11px] font-semibold text-gray-400 shrink-0">
            Verified Business
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full lg:w-[440px] xl:w-[520px] shrink-0 space-y-2.5 outline-none"
      role="region"
      aria-roledescription="carousel"
      aria-label={`${providerName} project photos`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* STRICT FIXED-SIZE MAIN SHOWCASE FRAME (Never stretches or changes across contractors) */}
      <div className="relative w-full h-[228px] sm:h-[320px] lg:h-[304px] xl:h-[348px] rounded-2xl overflow-hidden border border-gray-300/80 bg-slate-100 group select-none shadow-sm">
        <div
          ref={emblaMainRef}
          className="h-full w-full overflow-hidden cursor-grab active:cursor-grabbing"
        >
          <div className="flex h-full touch-pan-y">
            {validPhotos.map((photo, idx) => (
              <div
                key={`${photo}-${idx}`}
                role="group"
                aria-roledescription="slide"
                aria-label={`Photo ${idx + 1} of ${validPhotos.length}`}
                onClick={() => onOpenLightbox(idx)}
                className="relative flex-[0_0_100%] min-w-0 h-full cursor-pointer overflow-hidden"
              >
                <img
                  src={photo}
                  alt={`${providerName} project photo ${idx + 1}`}
                  loading={idx === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  draggable={false}
                  onError={() => markUrlFailed(photo)}
                  className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.02]"
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />
              </div>
            ))}
          </div>
        </div>

        {/* Prev / Next Glass Carousel Controls */}
        {hasMultiplePhotos && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous project photo"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/95 hover:bg-white text-gray-900 shadow-md border border-gray-200/80 backdrop-blur-sm flex items-center justify-center transition-all duration-200 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 active:scale-95 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
            </button>

            <button
              type="button"
              onClick={handleNext}
              aria-label="Next project photo"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/95 hover:bg-white text-gray-900 shadow-md border border-gray-200/80 backdrop-blur-sm flex items-center justify-center transition-all duration-200 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 active:scale-95 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </button>

            {/* Top-Right Slide Counter Pill */}
            <div className="pointer-events-none absolute top-3 right-3 z-10 bg-black/60 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-1 rounded-full tracking-wide">
              {selectedIndex + 1} / {validPhotos.length}
            </div>
          </>
        )}

        {/* Bottom-Right Industry-Standard Crisp White Lightbox Trigger */}
        <button
          type="button"
          onClick={() => onOpenLightbox(selectedIndex)}
          className="absolute bottom-3 right-3 z-10 bg-white/95 hover:bg-white text-gray-950 border border-white/80 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 backdrop-blur-md transition-all cursor-pointer shadow-md active:scale-[0.98]"
        >
          <Grid2X2 className="w-3.5 h-3.5 text-[#0B3B2C] shrink-0" />
          <span>
            {validPhotos.length > 1
              ? `Show all ${validPhotos.length} photos`
              : 'View full photo'}
          </span>
        </button>
      </div>

      {/* FLUSH 5-SLOT THUMBNAIL DOCK (Zero half-cut clipped thumbnails; fixed height across contractors) */}
      {hasMultiplePhotos ? (
        <div className="grid grid-cols-5 gap-2 h-[54px] sm:h-[64px]">
          {visibleThumbSlots.map((slot, slotIdx) => {
            const isMoreTile = slot.moreCount > 0 && slotIdx === 4;
            const isSelected = !isMoreTile && slot.photoIndex === selectedIndex;

            return (
              <button
                key={`slot-${slotIdx}-${slot.photoIndex}`}
                type="button"
                onClick={() =>
                  isMoreTile
                    ? onOpenLightbox(selectedIndex)
                    : handleThumbClick(slot.photoIndex)
                }
                aria-label={
                  isMoreTile
                    ? `View all ${validPhotos.length} photos`
                    : `Select photo ${slot.photoIndex + 1}`
                }
                aria-current={isSelected ? 'true' : undefined}
                className={`relative w-full h-full rounded-xl overflow-hidden transition-all duration-200 cursor-pointer bg-slate-100 ${
                  isSelected
                    ? 'ring-2 ring-[#0B3B2C] shadow-sm opacity-100'
                    : 'border border-gray-300/80 opacity-80 hover:opacity-100 hover:border-gray-400'
                }`}
              >
                <img
                  src={slot.url}
                  alt={`${providerName} thumbnail ${slot.photoIndex + 1}`}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  onError={() => markUrlFailed(slot.url)}
                  className="w-full h-full object-cover"
                />
                {isMoreTile && (
                  <div className="absolute inset-0 bg-gray-950/65 hover:bg-gray-950/75 backdrop-blur-[1px] transition-colors flex flex-col items-center justify-center text-white">
                    <span className="text-xs sm:text-sm font-extrabold leading-none">
                      +{slot.moreCount}
                    </span>
                    <span className="text-[10px] font-semibold text-white/85 mt-0.5">
                      Photos
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onOpenLightbox(0)}
          className="w-full h-[54px] sm:h-[64px] rounded-xl bg-slate-50/80 hover:bg-slate-100/80 border border-gray-200/80 px-3.5 flex items-center justify-between text-xs text-gray-600 transition-colors cursor-pointer"
        >
          <span className="inline-flex items-center gap-2 font-semibold text-gray-700">
            <Camera className="w-3.5 h-3.5 text-[#0B3B2C] shrink-0" />
            <span>Featured Project Showcase</span>
          </span>
          <span className="inline-flex items-center gap-1 font-bold text-[#0B3B2C]">
            <span>Enlarge</span>
            <Maximize2 className="w-3.5 h-3.5" />
          </span>
        </button>
      )}
    </div>
  );
}
