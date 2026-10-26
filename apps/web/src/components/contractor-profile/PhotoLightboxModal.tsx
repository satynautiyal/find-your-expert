'use client';

import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';

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

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prevPhoto();
      if (e.key === 'ArrowRight') nextPhoto();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, photos.length]);

  if (!isOpen || photos.length === 0) return null;

  const nextPhoto = () => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  };

  const prevPhoto = () => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200">
      {/* Top Bar */}
      <div className="flex items-center justify-between text-white/90 z-10 pb-4 border-b border-white/10">
        <div>
          <h4 className="font-bold text-sm sm:text-base text-white">{providerName} Portfolio</h4>
          <p className="text-xs text-white/60">
            Photo {currentIndex + 1} of {photos.length}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          aria-label="Close photo viewer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Image View */}
      <div className="relative flex-1 flex items-center justify-center py-4 overflow-hidden">
        {photos.length > 1 && (
          <button
            onClick={prevPhoto}
            className="absolute left-2 sm:left-4 z-20 p-2 sm:p-3 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 transition-all cursor-pointer"
            aria-label="Previous photo"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        <img
          src={photos[currentIndex]}
          alt={`${providerName} project photo ${currentIndex + 1}`}
          className="max-h-[75vh] max-w-[90vw] object-contain rounded-lg shadow-2xl transition-all"
        />

        {photos.length > 1 && (
          <button
            onClick={nextPhoto}
            className="absolute right-2 sm:right-4 z-20 p-2 sm:p-3 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 transition-all cursor-pointer"
            aria-label="Next photo"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Thumbnail Strip */}
      <div className="flex items-center justify-center gap-2 overflow-x-auto py-2 z-10">
        {photos.map((photo, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`w-12 h-12 sm:w-16 sm:h-16 rounded-md overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
              idx === currentIndex ? 'border-primary scale-105' : 'border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <img src={photo} alt="" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
