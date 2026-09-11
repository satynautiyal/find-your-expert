'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Check, CheckCircle2, ShieldCheck } from 'lucide-react';

export const badgeVariants = cva(
  'inline-flex items-center font-medium transition-colors select-none',
  {
    variants: {
      variant: {
        verified:
          'gap-1 font-bold text-primary-dark text-xs',
        verifiedPill:
          'gap-1.5 px-3 py-1 rounded-full bg-primary-light border border-primary-border text-[11px] font-bold text-primary-dark shadow-2xs',
        service:
          'px-2.5 py-0.5 rounded text-[11px] bg-gray-100/80 text-gray-700 border border-gray-200/70',
        credential:
          'gap-1 text-[10px] font-medium bg-white border border-gray-200 px-1.5 py-0.5 rounded text-gray-700',
        rank:
          'w-6 h-6 rounded bg-primary text-white font-extrabold text-xs items-center justify-center shadow-xs',
        photoCount:
          'gap-1 px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-white text-[10px] font-medium',
        counter:
          'px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-500 border border-gray-200',
        popularChip:
          'px-2.5 py-1 rounded-md bg-gray-100/80 hover:bg-primary-light hover:text-primary-dark text-gray-600 font-medium text-[11px] cursor-pointer',
      },
    },
    defaultVariants: {
      variant: 'service',
    },
  }
);

export interface EBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode;
}

export const EBadge = React.forwardRef<HTMLSpanElement, EBadgeProps>(
  ({ className, variant, icon, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, className }))}
        {...props}
      >
        {variant === 'verified' && !icon && (
          <CheckCircle2 className="w-3.5 h-3.5 fill-primary text-white shrink-0" />
        )}
        {variant === 'credential' && !icon && (
          <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[3] shrink-0" />
        )}
        {icon}
        {children}
      </span>
    );
  }
);

EBadge.displayName = 'EBadge';
