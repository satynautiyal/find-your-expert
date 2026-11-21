'use client';

import React, { useEffect, useRef, useState } from 'react';

interface BrandLogoBadgeProps {
  src?: string | null;
  name: string;
  fallbackInitial?: string;
  size?: 'hero' | 'card';
}

function getBrandInitials(name: string, fallbackInitial?: string): string {
  const words = (name || '')
    .replace(/[^A-Za-z0-9\s&]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((w) => Boolean(w) && !/^(inc|llc|ltd|corp|co|the|and|&)$/i.test(w));

  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  if (words.length === 1 && words[0].length >= 2) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return (fallbackInitial || name || 'PV').trim().slice(0, 2).toUpperCase();
}

/**
 * Houzz-style clean, generous, uncramped contractor brand logo mark.
 * - Renders logos at full readable scale on a clean white stage (no cramped pill border).
 * - Automatically detects white-on-transparent logos when CORS allows and applies a dark contrast backdrop.
 * - Falls back to a refined 2-letter architectural monogram when no logo image exists.
 */
export default function BrandLogoBadge({
  src,
  name,
  fallbackInitial,
  size = 'hero',
}: BrandLogoBadgeProps) {
  const [failed, setFailed] = useState(false);
  const [needsDarkBackdrop, setNeedsDarkBackdrop] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const cleanSrc = src && !src.includes('placeholder') ? src.trim() : '';

  useEffect(() => {
    setFailed(false);
    setNeedsDarkBackdrop(false);
  }, [cleanSrc]);

  const inspectLogoContrast = (img: HTMLImageElement | null) => {
    if (!img || !img.naturalWidth || !img.naturalHeight) return;
    try {
      const canvas = document.createElement('canvas');
      const sampleW = 48;
      const sampleH = 48;
      canvas.width = sampleW;
      canvas.height = sampleH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, sampleW, sampleH);
      ctx.drawImage(img, 0, 0, sampleW, sampleH);
      const { data } = ctx.getImageData(0, 0, sampleW, sampleH);

      let visiblePixels = 0;
      let transparentPixels = 0;
      let brightPixels = 0;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        if (a < 35) {
          transparentPixels++;
          continue;
        }
        visiblePixels++;
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        if (lum > 228) {
          brightPixels++;
        }
      }

      // If logo has a transparent background and >85% of visible ink is near-white, add dark backdrop
      if (
        transparentPixels > sampleW * sampleH * 0.15 &&
        visiblePixels > 20 &&
        brightPixels / visiblePixels > 0.85
      ) {
        setNeedsDarkBackdrop(true);
      }
    } catch {
      // Cross-origin canvas read blocked (R2 presigned URL without anonymous CORS); keep clean white stage
    }
  };

  const initials = getBrandInitials(name, fallbackInitial);

  if (!cleanSrc || failed) {
    return (
      <div
        className={
          size === 'hero'
            ? 'w-20 h-20 sm:w-[96px] sm:h-[96px] rounded-2xl bg-[#F2FAF6] text-[#0B3B2C] border border-[#0B3B2C]/15 flex items-center justify-center shrink-0 font-black text-2xl tracking-tight select-none'
            : 'w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-[#F2FAF6] text-[#0B3B2C] border border-[#0B3B2C]/15 flex items-center justify-center shrink-0 font-black text-base tracking-tight select-none'
        }
      >
        {initials}
      </div>
    );
  }

  if (size === 'hero') {
    return (
      <div
        className={`w-[104px] h-[74px] sm:w-[136px] sm:h-[96px] shrink-0 flex items-center justify-center select-none ${
          needsDarkBackdrop
            ? 'bg-[#0B3B2C] rounded-2xl p-3 shadow-xs'
            : 'bg-white rounded-xl py-1 pr-2'
        }`}
      >
        <img
          ref={imgRef}
          src={cleanSrc}
          alt={`${name} logo`}
          onLoad={(e) => inspectLogoContrast(e.currentTarget)}
          onError={() => setFailed(true)}
          className="max-w-full max-h-full w-auto h-auto object-contain"
        />
      </div>
    );
  }

  return (
    <div
      className={`w-[74px] h-[52px] sm:w-[92px] sm:h-[62px] shrink-0 flex items-center justify-center select-none ${
        needsDarkBackdrop
          ? 'bg-[#0B3B2C] rounded-xl p-2 shadow-2xs'
          : 'bg-white rounded-lg py-0.5 pr-1'
      }`}
    >
      <img
        ref={imgRef}
        src={cleanSrc}
        alt={`${name} logo`}
        onLoad={(e) => inspectLogoContrast(e.currentTarget)}
        onError={() => setFailed(true)}
        className="max-w-full max-h-full w-auto h-auto object-contain"
      />
    </div>
  );
}
