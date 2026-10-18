'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { EButton } from '@/components/EComponents';
import SafeImage from '@/components/common/SafeImage';
import type { CategoryItem } from '@/lib/api';

export interface PopularServicesCarouselProps {
  categories: CategoryItem[];
  loading?: boolean;
  title?: string;
  subtitle?: string;
  viewAllHref?: string;
}

export default function PopularServicesCarousel({
  categories,
  loading = false,
  title = 'Find Contractors by Project Type',
  subtitle = 'POPULAR HOME SERVICES',
  viewAllHref = '/contractors',
}: PopularServicesCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const targetScrollRef = useRef<number | null>(null);

  // Scroll button states & progress
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Mouse drag & momentum state
  const isPointerDownRef = useRef(false);
  const startXRef = useRef(0);
  const startScrollLeftRef = useRef(0);
  const dragDistanceRef = useRef(0);
  const lastPointerXRef = useRef(0);
  const lastPointerTimeRef = useRef(0);
  const velocityRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  // Calculate & update scroll boundaries & progress
  const updateScrollState = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxScroll = Math.max(0, scrollWidth - clientWidth);

    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft < maxScroll - 6);

    if (maxScroll > 0) {
      setScrollProgress(Math.min(1, Math.max(0, scrollLeft / maxScroll)));
    } else {
      setScrollProgress(0);
    }
  }, []);

  // Update boundary states on mount, category change, and resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);

    return () => {
      el.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [categories, updateScrollState]);

  // Buttery-smooth programmatic scroll using requestAnimationFrame with easeOutCubic
  const smoothScrollTo = useCallback((targetOffset: number) => {
    const container = containerRef.current;
    if (!container) return;

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    const maxScroll = container.scrollWidth - container.clientWidth;
    const target = Math.max(0, Math.min(maxScroll, targetOffset));
    const start = container.scrollLeft;
    const delta = target - start;

    if (Math.abs(delta) < 2) {
      container.scrollLeft = target;
      targetScrollRef.current = null;
      updateScrollState();
      return;
    }

    targetScrollRef.current = target;
    const duration = Math.min(500, Math.max(300, Math.abs(delta) * 0.5));
    const startTime = performance.now();

    // easeOutCubic: fast initial movement with a gentle, silky-smooth deceleration
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(progress);

      if (containerRef.current) {
        containerRef.current.scrollLeft = start + delta * eased;
      }

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(step);
      } else {
        if (containerRef.current) {
          containerRef.current.scrollLeft = target;
        }
        animFrameRef.current = null;
        targetScrollRef.current = null;
        updateScrollState();
      }
    };

    animFrameRef.current = requestAnimationFrame(step);
  }, [updateScrollState]);

  // Navigate left or right by whole card strides
  const handleScrollStep = (direction: 'left' | 'right') => {
    const container = containerRef.current;
    if (!container) return;

    // Measure single card stride (card width + gap)
    const firstItem = container.querySelector('[data-carousel-item]') as HTMLElement | null;
    const itemStride = firstItem ? firstItem.offsetWidth + 24 : 140; // 24px default gap

    // Scroll by visible cards minus one to maintain visual context
    const visibleCards = Math.max(1, Math.floor(container.clientWidth / itemStride));
    const stepCards = Math.max(1, visibleCards - 1);
    const scrollDistance = itemStride * stepCards;

    // If already animating, chain from target scroll position
    const currentBase = targetScrollRef.current !== null ? targetScrollRef.current : container.scrollLeft;
    const nextTarget = direction === 'left' ? currentBase - scrollDistance : currentBase + scrollDistance;

    smoothScrollTo(nextTarget);
  };

  // Mouse Drag / Grab to Scroll Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only respond to primary mouse button
    if (e.button !== 0) return;
    const container = containerRef.current;
    if (!container) return;

    // Cancel running animation
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
      targetScrollRef.current = null;
    }

    isPointerDownRef.current = true;
    startXRef.current = e.clientX;
    startScrollLeftRef.current = container.scrollLeft;
    dragDistanceRef.current = 0;
    lastPointerXRef.current = e.clientX;
    lastPointerTimeRef.current = performance.now();
    velocityRef.current = 0;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current || !containerRef.current) return;

    const deltaX = e.clientX - startXRef.current;
    dragDistanceRef.current = Math.abs(deltaX);

    if (dragDistanceRef.current > 5 && !isDragging) {
      setIsDragging(true);
    }

    // Direct 1:1 scroll without lag
    containerRef.current.scrollLeft = startScrollLeftRef.current - deltaX;

    // Track pointer velocity for momentum release
    const now = performance.now();
    const dt = now - lastPointerTimeRef.current;
    if (dt > 12) {
      velocityRef.current = (e.clientX - lastPointerXRef.current) / dt;
      lastPointerXRef.current = e.clientX;
      lastPointerTimeRef.current = now;
    }
  };

  const handlePointerUpOrLeave = () => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;

    // Apply smooth momentum if user flicked with velocity
    const velocity = velocityRef.current;
    if (Math.abs(velocity) > 0.25 && containerRef.current) {
      let currentVelocity = velocity * 14;
      const decay = 0.91;

      const inertiaTick = () => {
        if (!containerRef.current || Math.abs(currentVelocity) < 0.4) {
          animFrameRef.current = null;
          updateScrollState();
          return;
        }

        containerRef.current.scrollLeft -= currentVelocity;
        currentVelocity *= decay;
        animFrameRef.current = requestAnimationFrame(inertiaTick);
      };

      animFrameRef.current = requestAnimationFrame(inertiaTick);
    }

    // Delay drag state reset so accidental click triggers on child links are suppressed
    setTimeout(() => {
      setIsDragging(false);
      dragDistanceRef.current = 0;
    }, 60);
  };

  // Prevent link click when dragging
  const handleItemClick = (e: React.MouseEvent) => {
    if (dragDistanceRef.current > 6) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Keyboard accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handleScrollStep('left');
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleScrollStep('right');
    }
  };

  return (
    <section 
      className="py-14 sm:py-16 bg-[#F9FAFB] border-t border-gray-200/60 overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-[#0F3E35] font-extrabold text-[11px] uppercase tracking-wider block mb-1">
              {subtitle}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-950 tracking-tight">
              {title}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href={viewAllHref}
              className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-[#DA5F2F] hover:text-[#C44D29] hover:underline transition-colors"
            >
              <span>View all services</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <div className="flex items-center gap-1.5">
              <EButton
                type="button"
                variant="outline"
                size="iconRound"
                onClick={() => handleScrollStep('left')}
                disabled={!canScrollLeft}
                className={`transition-all duration-200 active:scale-90 ${
                  !canScrollLeft
                    ? 'opacity-30 cursor-not-allowed border-gray-200 text-gray-300'
                    : 'hover:scale-105 hover:border-[#0F3E35] hover:text-[#0F3E35] hover:shadow-xs'
                }`}
                aria-label="Previous services"
              >
                <ChevronLeft className="w-4 h-4" />
              </EButton>
              <EButton
                type="button"
                variant="outline"
                size="iconRound"
                onClick={() => handleScrollStep('right')}
                disabled={!canScrollRight}
                className={`transition-all duration-200 active:scale-90 ${
                  !canScrollRight
                    ? 'opacity-30 cursor-not-allowed border-gray-200 text-gray-300'
                    : 'hover:scale-105 hover:border-[#0F3E35] hover:text-[#0F3E35] hover:shadow-xs'
                }`}
                aria-label="Next services"
              >
                <ChevronRight className="w-4 h-4" />
              </EButton>
            </div>
          </div>
        </div>

        {/* Carousel Container with mouse drag & touch momentum */}
        <div className="relative">
          <div
            ref={containerRef}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUpOrLeave}
            onPointerLeave={handlePointerUpOrLeave}
            className={`flex items-start gap-6 sm:gap-8 overflow-x-auto pb-4 pt-2 no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden overscroll-x-contain select-none focus:outline-none transition-[cursor] ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            style={{
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-y pinch-zoom',
            }}
          >
            {loading ? (
              // Skeleton loading circles
              Array.from({ length: 8 }).map((_, idx) => (
                <div
                  key={`skeleton-${idx}`}
                  className="flex flex-col items-center shrink-0 w-24 sm:w-28 text-center animate-pulse"
                >
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gray-200 shadow-inner" />
                  <div className="w-16 h-3.5 bg-gray-200 rounded mt-3" />
                  <div className="w-12 h-2.5 bg-gray-100 rounded mt-1.5" />
                </div>
              ))
            ) : (
              categories.map((service) => (
                <Link
                  key={service.id || service.slug || service.name}
                  href={`/contractors?service=${encodeURIComponent(service.name)}`}
                  onClickCapture={handleItemClick}
                  data-carousel-item
                  className="flex flex-col items-center group shrink-0 w-24 sm:w-28 text-center select-none transition-transform duration-200 hover:-translate-y-0.5 focus:outline-none"
                >
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-white shadow-md group-hover:shadow-xl group-hover:scale-105 transition-all duration-300 ring-2 ring-transparent group-hover:ring-[#0F3E35]/40 bg-gray-100">
                    <SafeImage
                      src={service.image}
                      alt={service.name}
                      fallbackCategory={service.slug || service.name}
                      fallbackTitle={service.name}
                      className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-115 pointer-events-none"
                      draggable={false}
                      loading="lazy"
                    />
                  </div>
                  <span className="font-bold text-xs sm:text-[13px] text-gray-800 group-hover:text-[#0F3E35] transition-colors mt-3 leading-snug line-clamp-2">
                    {service.name}
                  </span>
                  {service.providerCount !== undefined && service.providerCount > 0 ? (
                    <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-2xs">
                      {service.providerCount} Pros
                    </span>
                  ) : (
                    <span className="mt-1 text-[10px] text-gray-400 font-medium">
                      Verified Pros
                    </span>
                  )}
                </Link>
              ))
            )}
          </div>

          {/* Elegant subtle scroll progress indicator track */}
          <div className="mt-4 flex items-center justify-center">
            <div className="w-28 sm:w-36 h-1 bg-gray-200/80 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0F3E35] rounded-full transition-[width,transform] duration-150 ease-out"
                style={{
                  width: `${Math.max(16, 25 + scrollProgress * 75)}%`,
                  transform: `translateX(${scrollProgress * (100 - Math.max(16, 25 + scrollProgress * 75)) * 0.8}%)`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
