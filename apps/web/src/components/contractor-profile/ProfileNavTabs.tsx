'use client';

import React from 'react';
import {
  FileText,
  Star,
  Layers,
  Wrench,
  MapPin,
  HelpCircle,
} from 'lucide-react';

interface ProfileNavTabsProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  reviewCount?: number;
  projectCount?: number;
}

export default function ProfileNavTabs({
  activeTab,
  onTabChange,
  reviewCount = 126,
  projectCount = 28,
}: ProfileNavTabsProps) {
  const tabs = [
    { id: 'overview', label: 'Overview', icon: FileText, href: '#overview' },
    { id: 'reviews', label: `Reviews (${reviewCount})`, icon: Star, href: '#reviews' },
    { id: 'projects', label: `Projects (${projectCount})`, icon: Layers, href: '#projects' },
    { id: 'services', label: 'Services', icon: Wrench, href: '#services' },
    { id: 'service-areas', label: 'Service Areas', icon: MapPin, href: '#service-areas' },
    { id: 'faq', label: 'Q&A', icon: HelpCircle, href: '#faq' },
  ];

  const handleTabClick = (id: string, href: string) => {
    onTabChange(id);
    if (typeof window !== 'undefined') {
      const el = document.querySelector(href);
      if (el) {
        const offset = 80; // height of sticky header + tabs
        const bodyRect = document.body.getBoundingClientRect().top;
        const elementRect = el.getBoundingClientRect().top;
        const elementPosition = elementRect - bodyRect;
        const offsetPosition = elementPosition - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth',
        });
      }
    }
  };

  return (
    <div className="sticky top-16 z-30 bg-white border-y border-gray-200/90 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-2 no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabClick(tab.id, tab.href)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-100 text-gray-950 shadow-2xs border border-gray-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${
                    isActive ? 'text-primary' : 'text-gray-400'
                  }`}
                />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
