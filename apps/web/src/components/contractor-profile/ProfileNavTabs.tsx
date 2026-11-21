'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  FileText,
  Star,
  Layers,
  Wrench,
  Users,
  MapPin,
  HelpCircle,
} from 'lucide-react';

interface ProfileNavTabsProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  reviewCount?: number;
  projectCount?: number;
  teamCount?: number;
}

export default function ProfileNavTabs({
  activeTab,
  onTabChange,
  reviewCount = 0,
  projectCount = 0,
  teamCount = 0,
}: ProfileNavTabsProps) {
  const [isStuck, setIsStuck] = useState(false);
  const navRef = useRef<HTMLDivElement | null>(null);
  const isClickScrollingRef = useRef(false);
  const clickScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tabs = useMemo(
    () => [
      { id: 'overview', label: 'Overview', icon: FileText, href: '#overview' },
      { id: 'services', label: 'Services', icon: Wrench, href: '#services' },
      {
        id: 'service-areas',
        label: 'Service Areas',
        icon: MapPin,
        href: '#service-areas',
      },
      ...(teamCount > 0
        ? [
            {
              id: 'team',
              label: 'The team',
              count: teamCount,
              icon: Users,
              href: '#team',
            },
          ]
        : []),
      {
        id: 'reviews',
        label: 'Reviews',
        count: reviewCount,
        icon: Star,
        href: '#reviews',
      },
      ...(projectCount > 0
        ? [
            {
              id: 'projects',
              label: 'Projects',
              count: projectCount,
              icon: Layers,
              href: '#projects',
            },
          ]
        : []),
      { id: 'faq', label: 'Q&A', icon: HelpCircle, href: '#faq' },
    ],
    [reviewCount, projectCount, teamCount]
  );

  // Scroll-spy + sticky shadow detection
  useEffect(() => {
    const handleScroll = () => {
      if (navRef.current) {
        const navTop = navRef.current.getBoundingClientRect().top;
        setIsStuck(navTop <= 65);
      }

      if (isClickScrollingRef.current) return;

      const scrollTriggerY = 160; // Header (64px) + Tab bar (~52px) + buffer
      let currentId = tabs[0]?.id || 'overview';

      for (const tab of tabs) {
        const sectionEl = document.querySelector(tab.href);
        if (sectionEl) {
          const rect = sectionEl.getBoundingClientRect();
          if (rect.top <= scrollTriggerY) {
            currentId = tab.id;
          }
        }
      }

      if (currentId !== activeTab) {
        onTabChange(currentId);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (clickScrollTimerRef.current) {
        clearTimeout(clickScrollTimerRef.current);
      }
    };
  }, [tabs, activeTab, onTabChange]);

  const handleTabClick = (id: string, href: string) => {
    onTabChange(id);

    if (typeof window !== 'undefined') {
      const el = document.querySelector(href);
      if (el) {
        isClickScrollingRef.current = true;
        if (clickScrollTimerRef.current) {
          clearTimeout(clickScrollTimerRef.current);
        }

        // Offset = Global Sticky Header (64px) + Sticky Tab Bar (52px) + 16px breathing room
        const offset = 132;
        const elementPosition =
          el.getBoundingClientRect().top + window.scrollY - offset;

        window.scrollTo({
          top: Math.max(0, elementPosition),
          behavior: 'smooth',
        });

        clickScrollTimerRef.current = setTimeout(() => {
          isClickScrollingRef.current = false;
        }, 750);
      }
    }
  };

  return (
    <div
      ref={navRef}
      className={`sticky top-16 z-30 bg-white/95 backdrop-blur-md border-b border-gray-200 transition-shadow duration-200 ${
        isStuck ? 'shadow-sm' : 'border-t border-gray-200/70'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          role="tablist"
          aria-label="Contractor profile sections"
          className="flex items-center gap-5 sm:gap-7 overflow-x-auto no-scrollbar"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleTabClick(tab.id, tab.href)}
                className={`group relative flex items-center gap-2 py-3.5 sm:py-4 px-1 text-sm whitespace-nowrap transition-colors cursor-pointer focus:outline-none ${
                  isActive
                    ? 'font-bold text-gray-950'
                    : 'font-semibold text-gray-500 hover:text-gray-900'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive
                      ? 'text-primary'
                      : 'text-gray-400 group-hover:text-gray-600'
                  }`}
                />
                <span>{tab.label}</span>

                {typeof tab.count === 'number' && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] leading-none transition-colors ${
                      isActive
                        ? 'bg-primary-light text-primary border border-primary-border font-bold'
                        : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200/80 font-semibold'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}

                {/* Smooth Sliding Tab Underline Indicator (Linear / Airbnb style) */}
                {isActive ? (
                  <motion.span
                    layoutId="profile-active-tab-underline"
                    aria-hidden="true"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    className="absolute bottom-0 inset-x-0 h-[3px] bg-primary rounded-t-full"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0 inset-x-0 h-[2px] bg-transparent group-hover:bg-gray-300 rounded-t-full transition-colors duration-200"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
