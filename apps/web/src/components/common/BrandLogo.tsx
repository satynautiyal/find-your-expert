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
 * Prosvetted Icon: Geometric "P" mark in deep forest green (#144E35) with warm orange pillar (#F1A14A)
 */
export function ProsvettedIcon({
  className = 'w-6 h-7 sm:w-7 sm:h-8',
  primaryColor = '#144E35',
  accentColor = '#F1A14A',
}: {
  className?: string;
  primaryColor?: string;
  accentColor?: string;
}) {
  return (
    <svg
      viewBox="0 0 144 171"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Upper Block & Rounded Bowl of P */}
      <path
        d="M0 0H82A62 62 0 0 1 82 124H38L71 86H83.5A23.5 23.5 0 0 0 83.5 39H38V86H0V0Z"
        fill={primaryColor}
      />
      {/* Lower Curved Stem of P */}
      <path
        d="M38 86A38 38 0 0 0 0 124V171H38V86Z"
        fill={primaryColor}
      />
      {/* Inner Orange Vertical Pillar with Diagonal Cut */}
      <path
        d="M38 39H71V86L38 124V39Z"
        fill={accentColor}
      />
    </svg>
  );
}

// Keep alias for backward compatibility
export const ClickSailorsIcon = ProsvettedIcon;

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
      icon: 'w-5 h-6',
      text: 'text-lg',
      gap: 'gap-2',
    },
    md: {
      icon: 'w-6 h-7 sm:w-7 sm:h-8',
      text: 'text-xl sm:text-[22px]',
      gap: 'gap-2.5',
    },
    lg: {
      icon: 'w-8 h-9 sm:w-9 sm:h-11',
      text: 'text-2xl sm:text-3xl',
      gap: 'gap-3',
    },
  }[size];

  const content = (
    <div className={`inline-flex items-center ${sizeClasses.gap} group transition-transform ${className}`}>
      {/* Prosvetted Geometric P Icon */}
      <div className="shrink-0 transition-transform duration-200 group-hover:scale-105 flex items-center">
        <ProsvettedIcon
          className={sizeClasses.icon}
          primaryColor={isDark ? '#FFFFFF' : '#144E35'}
          accentColor="#F1A14A"
        />
      </div>

      {/* Brand Typography */}
      {showText && (
        <span
          className={`font-bold tracking-[-0.025em] leading-none -mt-0.5 ${sizeClasses.text} ${
            isDark ? 'text-white' : 'text-[#0D3421]'
          }`}
        >
          Prosvetted
        </span>
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
