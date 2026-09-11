'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const cardVariants = cva('transition-all', {
  variants: {
    variant: {
      listing:
        'bg-white rounded-xl border border-gray-200 shadow-2xs hover:shadow-xs transition-shadow duration-200 overflow-hidden relative',
      elevated:
        'bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-200/80 p-3 sm:p-4',
      stat:
        'bg-white border border-gray-200/80 rounded-xl p-3 shadow-2xs hover:border-primary/50 hover:shadow-xs flex items-center justify-between gap-2',
      financing:
        'bg-primary-light border border-primary-border rounded-lg p-2.5 flex items-center gap-2.5',
      floatingBadge:
        'bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 p-2.5 sm:p-3 flex items-center gap-3',
    },
  },
  defaultVariants: {
    variant: 'listing',
  },
});

export interface ECardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const ECard = React.forwardRef<HTMLDivElement, ECardProps>(
  ({ className, variant, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(cardVariants({ variant, className }))}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ECard.displayName = 'ECard';
