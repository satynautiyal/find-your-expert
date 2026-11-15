'use client';

import React, { useState, useEffect, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { Camera, ChevronLeft, ChevronRight } from 'lucide-react';

interface ProfilePhotoCarouselProps {
  photos: string[];
  businessLogo?: string;
  fallbackInitial?: string;
  providerName: string;
  onOpenLightbox: (index: number) => void;
}

export default function ProfilePhotoCarousel({
  photos,
  businessLogo = '',
  fallbackInitial = 'P',
  providerName,
  onOpenLightbox,
}: ProfilePhotoCarouselProps) {
  const hasProjectPhotos = photos.length > 0;
  const hasMultiplePhotos = photos.length > 1;

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [canThumbPrev, setCanThumbPrev] = useState(false);
  const [canThumbNext, setCanThumbNext] = useState(false);

  const [emblaMainRef, emblaMainApi] = useEmblaCarousel({
    loop: hasMultiplePhotos,
    align: 'start',
    skipSnaps: false,
  });

  const [emblaThumbsRef, emblaThumbsApi] = useEmblaCarousel({
    containScroll: 'keepSnaps',
    dragFree: true,
    align: 'start',
  });

  const syncThumbScrollState = useCallback(() => {
    if (!emblaThumbsApi) return;
    setCanThumbPrev(emblaThumbsApi.canScrollPrev());
    setCanThumbNext(emblaThumbsApi.canScrollNext());
  }, [emblaThumbsApi]);

  const onSelect = useCallback(() => {
    if (!emblaMainApi) return;
    const idx = emblaMainApi.selectedScrollSnap();
    setSelectedIndex(idx);
    if (emblaThumbsApi) {
      emblaThumbsApi.scrollTo(idx);
    }
  }, [emblaMainApi, emblaThumbsApi]);

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
    if (!emblaThumbsApi) return;
    syncThumbScrollState();
    emblaThumbsApi.on('select', syncThumbScrollState);
    emblaThumbsApi.on('scroll', syncThumbScrollState);
    emblaThumbsApi.on('reInit', syncThumbScrollState);
    return () => {
      emblaThumbsApi.off('select', syncThumbScrollState);
      emblaThumbsApi.off('scroll', syncThumbScrollState);
      emblaThumbsApi.off('reInit', syncThumbScrollState);
    };
  }, [emblaThumbsApi, syncThumbScrollState]);

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

  // Fallback when contractor has no project photos: show authentic company logo only
  if (!hasProjectPhotos) {
    return (
      <div className="relative h-[260px] sm:h-[330px] lg:h-full lg:min-h-[420px] rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-white flex items-center justify-center p-8">
        {businessLogo ? (
          <img
            src={businessLogo}
            alt={`${providerName} logo`}
            className="max-w-full max-h-full w-auto h-auto object-contain"
          />
        ) : (
          <span className="text-4xl font-black text-gray-300">{fallbackInitial}</span>
        )}
      </div>
    );
  }

  return (
    <div
      className="flex flex-col justify-between h-full gap-3"
      role="region"
      aria-roledescription="carousel"
      aria-label={`${providerName} project photos`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Main Featured Carousel Frame */}
      <div className="relative h-[260px] sm:h-[340px] lg:h-[380px] lg:flex-1 rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-gray-100 group select-none">
        <div
          ref={emblaMainRef}
          className="h-full w-full overflow-hidden cursor-grab active:cursor-grabbing"
        >
          <div className="flex h-full touch-pan-y">
            {photos.map((photo, idx) => (
              <div
                key={`${photo}-${idx}`}
                role="group"
                aria-roledescription="slide"
                aria-label={`Photo ${idx + 1} of ${photos.length}`}
                onClick={() => onOpenLightbox(idx)}
                className="relative flex-[0_0_100%] min-w-0 h-full cursor-pointer"
              >
                <img
                  src={photo}
                  alt={`${providerName} project photo ${idx + 1}`}
                  loading={idx === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  draggable={false}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.015]"
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/35 via-black/5 to-transparent" />
              </div>
            ))}
          </div>
        </div>

        {/* Prev / Next Carousel Controls */}
        {hasMultiplePhotos && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous project photo"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/90 hover:bg-white text-gray-900 shadow-md border border-gray-200/80 backdrop-blur-sm flex items-center justify-center transition-all duration-200 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 active:scale-95 cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5 stroke-[2.25]" />
            </button>

            <button
              type="button"
              onClick={handleNext}
              aria-label="Next project photo"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/90 hover:bg-white text-gray-900 shadow-md border border-gray-200/80 backdrop-blur-sm flex items-center justify-center transition-all duration-200 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 active:scale-95 cursor-pointer"
            >
              <ChevronRight className="w-5 h-5 stroke-[2.25]" />
            </button>

            {/* Slide Counter Badge */}
            <div className="pointer-events-none absolute top-3.5 right-3.5 z-10 bg-black/65 backdrop-blur-sm text-white text-[11px] font-semibold px-2.5 py-1 rounded-full tracking-wide shadow-sm">
              {selectedIndex + 1} / {photos.length}
            </div>
          </>
        )}

        {/* View All Photos Lightbox Trigger */}
        <button
          type="button"
          onClick={() => onOpenLightbox(selectedIndex)}
          className="absolute bottom-3.5 left-3.5 z-10 bg-black/75 hover:bg-black text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 backdrop-blur-sm transition-colors cursor-pointer shadow-md"
        >
          <Camera className="w-3.5 h-3.5 shrink-0" />
          <span>View All Photos ({photos.length})</span>
        </button>
      </div>

      {/* Synchronized Proportional 4:3 Thumbnail Carousel */}
      {hasMultiplePhotos && (
        <div className="relative group/thumbs">
          {canThumbPrev && (
            <button
              type="button"
              onClick={() => emblaThumbsApi?.scrollPrev()}
              aria-label="Scroll thumbnails left"
              className="hidden sm:flex absolute left-1.5 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white/95 hover:bg-white text-gray-800 shadow-md border border-gray-200 items-center justify-center transition-opacity opacity-0 group-hover/thumbs:opacity-100 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          <div ref={emblaThumbsRef} className="overflow-hidden p-1.5 -m-1">
            <div className="flex items-center gap-2.5">
              {photos.map((photo, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={`thumb-${idx}`}
                    type="button"
                    onClick={() => handleThumbClick(idx)}
                    aria-label={`View photo ${idx + 1}`}
                    aria-current={isSelected ? 'true' : undefined}
                    className={`relative shrink-0 w-[96px] h-[72px] sm:w-[108px] sm:h-[80px] rounded-xl overflow-hidden transition-all duration-200 cursor-pointer bg-gray-100 ${
                      isSelected
                        ? 'ring-2 ring-[#0B3B2C] ring-offset-2 opacity-100 shadow-sm'
                        : 'border border-gray-200 opacity-70 hover:opacity-100 hover:border-gray-300'
                    }`}
                  >
                    <img
                      src={photo}
                      alt={`${providerName} thumbnail ${idx + 1}`}
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                      className="w-full h-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {canThumbNext && (
            <button
              type="button"
              onClick={() => emblaThumbsApi?.scrollNext()}
              aria-label="Scroll thumbnails right"
              className="hidden sm:flex absolute right-1.5 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white/95 hover:bg-white text-gray-800 shadow-md border border-gray-200 items-center justify-center transition-opacity opacity-0 group-hover/thumbs:opacity-100 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

