'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export const buttonVariants = cva(
  'inline-flex items-center justify-center font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F15A24] disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer',
  {
    variants: {
      variant: {
        primary:
          'bg-[#F15A24] hover:bg-[#DE4714] text-white shadow-xs active:scale-[0.98]',
        outline:
          'bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-800 shadow-2xs',
        secondary:
          'bg-gray-100 hover:bg-gray-200 text-gray-800',
        pill:
          'bg-white hover:bg-orange-50/60 border border-gray-200 text-gray-700 hover:text-[#F15A24] rounded-full shadow-2xs font-semibold',
        ghost:
          'bg-transparent hover:bg-gray-100 text-gray-700',
        link:
          'text-[#F15A24] hover:underline p-0 font-semibold inline-flex items-center gap-1',
        dark:
          'bg-gray-900 hover:bg-gray-800 text-white shadow-xs',
      },
      size: {
        sm: 'px-2.5 py-1 text-[11px] rounded-md gap-1',
        md: 'px-4 py-2 text-xs rounded-lg gap-1.5',
        lg: 'px-5 py-2.5 text-sm rounded-xl gap-2',
        icon: 'p-2 rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface EButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  isLoading?: boolean;
}

export const EButton = React.forwardRef<HTMLButtonElement, EButtonProps>(
  (
    {
      className,
      variant,
      size,
      iconLeft,
      iconRight,
      isLoading,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          iconLeft
        )}
        {children}
        {!isLoading && iconRight}
      </button>
    );
  }
);

EButton.displayName = 'EButton';
