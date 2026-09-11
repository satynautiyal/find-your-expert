'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export interface ESelectOption {
  label: string;
  value: string;
}

export interface ESelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  icon?: React.ReactNode;
  options: (string | ESelectOption)[];
  variant?: 'segmented' | 'compact';
}

export const ESelect = React.forwardRef<HTMLSelectElement, ESelectProps>(
  (
    {
      className,
      label,
      icon,
      options,
      variant = 'segmented',
      value,
      onChange,
      ...props
    },
    ref
  ) => {
    if (variant === 'compact') {
      return (
        <div className="relative inline-flex items-center">
          {icon && (
            <div className="absolute left-2.5 text-gray-400 pointer-events-none">
              {icon}
            </div>
          )}
          <select
            ref={ref}
            value={value}
            onChange={onChange}
            className={cn(
              'appearance-none py-1.5 pr-7 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer hover:bg-gray-50 transition-colors',
              icon ? 'pl-7' : 'px-3',
              className
            )}
            {...props}
          >
            {options.map((opt) => {
              const val = typeof opt === 'string' ? opt : opt.value;
              const lbl = typeof opt === 'string' ? opt : opt.label;
              return (
                <option key={val} value={val}>
                  {lbl}
                </option>
              );
            })}
          </select>
          <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2 pointer-events-none" />
        </div>
      );
    }

    return (
      <div
        className={cn(
          'relative flex items-center gap-3 px-3.5 py-2.5 bg-gray-50/70 hover:bg-gray-50 border border-gray-200/80 rounded-xl transition-colors',
          className
        )}
      >
        {icon && <div className="text-primary shrink-0">{icon}</div>}
        <div className="flex-1 min-w-0">
          {label && (
            <div className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider">
              {label}
            </div>
          )}
          <select
            ref={ref}
            value={value}
            onChange={onChange}
            className="w-full bg-transparent text-xs sm:text-sm font-semibold text-gray-900 focus:outline-none cursor-pointer appearance-none pr-5 truncate"
            {...props}
          >
            {options.map((opt) => {
              const val = typeof opt === 'string' ? opt : opt.value;
              const lbl = typeof opt === 'string' ? opt : opt.label;
              return (
                <option key={val} value={val}>
                  {lbl}
                </option>
              );
            })}
          </select>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 pointer-events-none" />
      </div>
    );
  }
);

ESelect.displayName = 'ESelect';
