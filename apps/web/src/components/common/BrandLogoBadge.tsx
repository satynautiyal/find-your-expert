'use client';

import React, { useEffect, useRef, useState } from 'react';

interface BrandLogoBadgeProps {
  src?: string | null;
  name: string;
  fallbackInitial?: string;
  size?: 'hero' | 'card';
}

type LogoShape = 'square' | 'medium' | 'wide';

export default function BrandLogoBadge({
  src,
  name,
  fallbackInitial,
  size = 'hero',
}: BrandLogoBadgeProps) {
  const [failed, setFailed] = useState(false);
  const [shape, setShape] = useState<LogoShape>('medium');
  const imgRef = useRef<HTMLImageElement | null>(null);

  const cleanSrc =
    src && !src.includes('placeholder') ? src.trim() : '';

  useEffect(() => {
    setFailed(false);
  }, [cleanSrc]);

  const detectShape = (img: HTMLImageElement | null) => {
    if (!img) return;
    const w = img.naturalWidth || 0;
    const h = img.naturalHeight || 0;
    if (w <= 0 || h <= 0) return;
    const ratio = w / h;
    if (ratio >= 2.15) {
      setShape('wide');
    } else if (ratio >= 1.35) {
      setShape('medium');
    } else {
      setShape('square');
    }
  };

  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) {
      detectShape(el);
    }
  }, [cleanSrc]);

  const initial = (fallbackInitial || name || 'P').trim().charAt(0).toUpperCase();

  if (!cleanSrc || failed) {
    return (
      <div
        className={
          size === 'hero'
            ? 'w-14 h-14 sm:w-[66px] sm:h-[66px] rounded-2xl bg-[#EBF7F2] text-[#0B3B2C] border border-[#0B3B2C]/20 shadow-sm flex items-center justify-center shrink-0 font-black text-xl'
            : 'w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#EBF7F2] text-[#0B3B2C] border border-[#0B3B2C]/20 shadow-sm flex items-center justify-center shrink-0 font-black text-base'
        }
      >
        {initial}
      </div>
    );
  }

  const containerClasses =
    size === 'hero'
      ? shape === 'wide'
        ? 'h-14 sm:h-[66px] px-3 sm:px-3.5 py-1.5 rounded-2xl'
        : shape === 'medium'
        ? 'h-14 sm:h-[66px] px-2.5 sm:px-3 py-1.5 rounded-2xl'
        : 'w-14 h-14 sm:w-[66px] sm:h-[66px] p-1.5 rounded-2xl'
      : shape === 'wide'
      ? 'h-11 sm:h-12 px-2.5 sm:px-3 py-1 rounded-xl'
      : shape === 'medium'
      ? 'h-11 sm:h-12 px-2 sm:px-2.5 py-1 rounded-xl'
      : 'w-11 h-11 sm:w-12 sm:h-12 p-1 rounded-xl';

  const imgClasses =
    size === 'hero'
      ? shape === 'wide'
        ? 'h-9 sm:h-11 w-auto max-w-[155px] sm:max-w-[205px] object-contain'
        : shape === 'medium'
        ? 'h-10 sm:h-12 w-auto max-w-[130px] sm:max-w-[165px] object-contain'
        : 'w-full h-full object-contain'
      : shape === 'wide'
      ? 'h-7 sm:h-8 w-auto max-w-[135px] sm:max-w-[168px] object-contain'
      : shape === 'medium'
      ? 'h-8 sm:h-9 w-auto max-w-[108px] sm:max-w-[132px] object-contain'
      : 'w-full h-full object-contain';

  return (
    <div
      className={`${containerClasses} bg-white border border-gray-300/85 shadow-sm flex items-center justify-center shrink-0 overflow-hidden`}
    >
      <img
        ref={imgRef}
        src={cleanSrc}
        alt={`${name} logo`}
        onLoad={(e) => detectShape(e.currentTarget)}
        onError={() => setFailed(true)}
        className={imgClasses}
      />
    </div>
  );
}

