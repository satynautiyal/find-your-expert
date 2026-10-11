'use client';

import * as React from 'react';
import Link from 'next/link';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export const buttonVariants = cva(
  'inline-flex items-center justify-center font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer',
  {
    variants: {
      variant: {
        primary:
          'bg-primary hover:bg-primary-hover text-white shadow-xs active:scale-[0.98]',
        secondary:
          'bg-secondary hover:bg-secondary-hover text-white shadow-xs active:scale-[0.98]',
        secondaryOutline:
          'bg-white border border-secondary text-secondary hover:bg-secondary hover:text-white shadow-xs active:scale-[0.98]',
        outline:
          'bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-800 shadow-2xs active:scale-[0.98]',
        pill:
          'bg-white hover:bg-primary-light border border-gray-200 text-gray-700 hover:text-primary hover:border-primary rounded-full shadow-2xs font-semibold active:scale-[0.98]',
        ghost:
          'bg-transparent hover:bg-gray-100 text-gray-700 active:scale-[0.98]',
        link:
          'text-primary hover:text-primary-hover hover:underline p-0 font-semibold inline-flex items-center gap-1',
        dark:
          'bg-gray-900 hover:bg-gray-800 text-white shadow-xs active:scale-[0.98]',
      },
      size: {
        sm: 'px-2.5 py-1 text-[11px] rounded-md gap-1',
        md: 'px-4 py-2 text-xs rounded-lg gap-1.5',
        lg: 'px-5 py-2.5 text-sm rounded-xl gap-2',
        xl: 'px-6 py-3.5 text-xs sm:text-sm rounded-xl gap-2',
        icon: 'p-2 rounded-lg',
        iconRound: 'w-8 h-8 rounded-full p-0 flex items-center justify-center',
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
  href?: string;
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
      href,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const content = (
      <>
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          iconLeft
        )}
        {children}
        {!isLoading && iconRight}
      </>
    );

    if (href) {
      return (
        <Link
          href={href}
          className={cn(buttonVariants({ variant, size, className }))}
          onClick={props.onClick as any}
          id={props.id}
          aria-label={props['aria-label']}
        >
          {content}
        </Link>
      );
    }

    return (
      <button
        ref={ref}
        type={type}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || isLoading}
        {...props}
      >
        {content}
      </button>
    );
  }
);

EButton.displayName = 'EButton';
