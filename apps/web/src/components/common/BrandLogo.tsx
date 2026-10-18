import React from 'react';
import Link from 'next/link';

export interface BrandLogoProps {
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showText?: boolean;
  href?: string;
}

/**
 * Click Sailors Icon: Geometric twin sails / roofline peaks in signature orange
 */
export function ClickSailorsIcon({
  className = 'w-7 h-5 sm:w-8 sm:h-6',
  color = '#EA580C',
}: {
  className?: string;
  color?: string;
}) {
  return (
    <svg
      viewBox="0 0 32 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Left Chevron Roof / Sail */}
      <path
        d="M2.5 20.5L10 4.5C10.5 3.5 11.9 3.5 12.4 4.5L18.5 17.5"
        stroke={color}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Right Chevron Roof / Sail */}
      <path
        d="M13.5 17.5L19.6 4.5C20.1 3.5 21.5 3.5 22 4.5L29.5 20.5"
        stroke={color}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function BrandLogo({
  variant = 'light',
  size = 'md',
  className = '',
  showText = true,
  href = '/',
}: BrandLogoProps) {
  const isDark = variant === 'dark';

  const sizeClasses = {
    sm: {
      icon: 'w-6 h-4',
      text: 'text-base',
    },
    md: {
      icon: 'w-7 h-5 sm:w-8 sm:h-6',
      text: 'text-lg sm:text-xl',
    },
    lg: {
      icon: 'w-9 h-6 sm:w-10 sm:h-7',
      text: 'text-2xl sm:text-3xl',
    },
  }[size];

  const content = (
    <div className={`inline-flex items-center gap-2 group transition-transform ${className}`}>
      {/* Orange Twin-Sail / Roof Icon */}
      <div className="shrink-0 transition-transform duration-200 group-hover:scale-105">
        <ClickSailorsIcon className={sizeClasses.icon} />
      </div>

      {/* Brand Typography */}
      {showText && (
        <div
          className={`flex items-baseline font-black tracking-tight leading-none ${sizeClasses.text} ${
            isDark ? 'text-white' : 'text-gray-950'
          }`}
        >
          <span>Click</span>
          <span className={`font-semibold ml-1 ${isDark ? 'text-white/90' : 'text-gray-900'}`}>
            Sailors
          </span>
        </div>
      )}
    </div>
  );

  if (!href) return content;

  return (
    <Link href={href} className="inline-flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg">
      {content}
    </Link>
  );
}
