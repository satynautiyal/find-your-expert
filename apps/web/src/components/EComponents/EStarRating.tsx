'use client';

import * as React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EStarRatingProps extends React.HTMLAttributes<HTMLDivElement> {
  rating: number;
  totalReviews?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showScore?: boolean;
  showCount?: boolean;
  scoreClassName?: string;
  countClassName?: string;
}

export function EStarRating({
  rating,
  totalReviews,
  size = 'md',
  showScore = true,
  showCount = true,
  scoreClassName,
  countClassName,
  className,
  ...props
}: EStarRatingProps) {
  const starSizes = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  const defaultScoreSizes = {
    xs: 'text-[11px] font-semibold text-gray-800',
    sm: 'text-xs font-bold text-gray-900',
    md: 'text-lg font-black text-gray-950',
    lg: 'text-xl font-black text-gray-950',
  };

  const defaultCountSizes = {
    xs: 'text-[10px] text-gray-400',
    sm: 'text-[11px] text-gray-400',
    md: 'text-xs text-gray-400',
    lg: 'text-sm text-gray-400',
  };

  return (
    <div
      className={cn('flex items-center gap-1.5', className)}
      {...props}
    >
      {showScore && (
        <span className={cn(defaultScoreSizes[size], scoreClassName)}>
          {rating.toFixed(1)}
        </span>
      )}
      <div className="flex gap-0.5 text-[#F15A24]">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className={cn('fill-current', starSizes[size])} />
        ))}
      </div>
      {showCount && totalReviews !== undefined && (
        <span className={cn(defaultCountSizes[size], countClassName)}>
          ({totalReviews})
        </span>
      )}
    </div>
  );
}
