'use client';

import React, { useState, useEffect, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface PhotoLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  photos: string[];
  initialIndex?: number;
  providerName?: string;
}

export default function PhotoLightboxModal({
  isOpen,
  onClose,
  photos = [],
  initialIndex = 0,
  providerName = 'Contractor',
}: PhotoLightboxModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const hasMultiple = photos.length > 1;

  const [emblaMainRef, emblaMainApi] = useEmblaCarousel({
    loop: hasMultiple,
    startIndex: initialIndex,
    align: 'center',
  });

  const [emblaThumbsRef, emblaThumbsApi] = useEmblaCarousel({
    containScroll: 'keepSnaps',
    dragFree: true,
    align: 'center',
  });

  const onSelect = useCallback(() => {
    if (!emblaMainApi) return;
    const idx = emblaMainApi.selectedScrollSnap();
    setCurrentIndex(idx);
    emblaThumbsApi?.scrollTo(idx);
  }, [emblaMainApi, emblaThumbsApi]);

  useEffect(() => {
    if (!emblaMainApi || !isOpen) return;
    emblaMainApi.scrollTo(initialIndex, true);
    setCurrentIndex(initialIndex);
    emblaThumbsApi?.scrollTo(initialIndex, true);
  }, [emblaMainApi, emblaThumbsApi, initialIndex, isOpen]);

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

  // Body scroll lock & keyboard shortcuts when open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') emblaMainApi?.scrollPrev();
      if (e.key === 'ArrowRight') emblaMainApi?.scrollNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, emblaMainApi]);

  if (!isOpen || photos.length === 0) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${providerName} photo gallery`}
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex flex-col justify-between p-4 sm:p-6"
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between text-white/90 z-10 pb-4 border-b border-white/10">
        <div>
          <h4 className="font-bold text-sm sm:text-base text-white">{providerName} Portfolio</h4>
          <p className="text-xs text-white/60">
            Photo {currentIndex + 1} of {photos.length}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          aria-label="Close photo viewer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Embla Lightbox Carousel */}
      <div className="relative flex-1 flex items-center justify-center py-4 overflow-hidden select-none">
        {hasMultiple && (
          <button
            type="button"
            onClick={() => emblaMainApi?.scrollPrev()}
            className="absolute left-2 sm:left-5 z-20 p-2.5 sm:p-3 rounded-full bg-white/10 hover:bg-white/25 text-white border border-white/20 backdrop-blur-sm transition-all cursor-pointer active:scale-95"
            aria-label="Previous photo"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        <div
          ref={emblaMainRef}
          className="w-full h-full overflow-hidden cursor-grab active:cursor-grabbing"
        >
          <div className="flex h-full items-center touch-pan-y">
            {photos.map((photo, idx) => (
              <div
                key={`lb-${idx}`}
                className="flex-[0_0_100%] min-w-0 h-full flex items-center justify-center px-2 sm:px-14"
              >
                <img
                  src={photo}
                  alt={`${providerName} project photo ${idx + 1}`}
                  draggable={false}
                  className="max-h-[72vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
                />
              </div>
            ))}
          </div>
        </div>

        {hasMultiple && (
          <button
            type="button"
            onClick={() => emblaMainApi?.scrollNext()}
            className="absolute right-2 sm:right-5 z-20 p-2.5 sm:p-3 rounded-full bg-white/10 hover:bg-white/25 text-white border border-white/20 backdrop-blur-sm transition-all cursor-pointer active:scale-95"
            aria-label="Next photo"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Synchronized Proportional 4:3 Lightbox Thumbnail Carousel */}
      {hasMultiple && (
        <div className="max-w-3xl w-full mx-auto z-10 pt-2">
          <div ref={emblaThumbsRef} className="overflow-hidden py-1.5 px-1">
            <div className="flex items-center justify-center gap-2.5">
              {photos.map((photo, idx) => {
                const active = idx === currentIndex;
                return (
                  <button
                    key={`lb-thumb-${idx}`}
                    type="button"
                    onClick={() => emblaMainApi?.scrollTo(idx)}
                    aria-label={`Jump to photo ${idx + 1}`}
                    className={`shrink-0 w-20 h-[56px] sm:w-24 sm:h-[68px] rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                      active
                        ? 'border-white scale-105 opacity-100 shadow-lg'
                        : 'border-transparent opacity-50 hover:opacity-90'
                    }`}
                  >
                    <img
                      src={photo}
                      alt=""
                      draggable={false}
                      className="w-full h-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
