'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface EInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const EInput = React.forwardRef<HTMLInputElement, EInputProps>(
  ({ className, iconLeft, iconRight, ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        {iconLeft && (
          <div className="absolute left-3 text-gray-400 pointer-events-none flex items-center justify-center">
            {iconLeft}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full py-2 text-xs bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#F15A24] focus:border-[#F15A24] font-medium transition-all',
            iconLeft ? 'pl-8' : 'pl-3',
            iconRight ? 'pr-8' : 'pr-3',
            className
          )}
          {...props}
        />
        {iconRight && (
          <div className="absolute right-3 text-gray-400 pointer-events-none flex items-center justify-center">
            {iconRight}
          </div>
        )}
      </div>
    );
  }
);

EInput.displayName = 'EInput';
