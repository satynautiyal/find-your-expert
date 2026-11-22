'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DropdownOption {
  label: string;
  value: string | number;
}

export interface DropdownSelectProps {
  value: string | number;
  onChange: (value: string) => void;
  options: DropdownOption[];
  icon?: React.ReactNode;
  ariaLabel?: string;
  placeholder?: string;
  triggerClassName?: string;
  menuClassName?: string;
  align?: 'left' | 'right';
  variant?: 'default' | 'ghost';
}

/**
 * Accessible, portal-rendered custom select dropdown with:
 * - Crisp visible border (`border-gray-300/95`) + rich multi-layer box-shadow
 * - Bounded height (`max-h-64`) + smooth vertical scroll (`overflow-y-auto overscroll-contain`)
 * - Automatic viewport collision flip (opens upward if near bottom of screen)
 * - Zero clipping inside `overflow-x-auto` filter rails or modals
 */
export default function DropdownSelect({
  value,
  onChange,
  options,
  icon,
  ariaLabel,
  placeholder = 'Select...',
  triggerClassName,
  menuClassName,
  align = 'left',
  variant = 'default',
}: DropdownSelectProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    minWidth: number;
    maxHeight: number;
  }>({ top: 0, left: 0, minWidth: 180, maxHeight: 256 });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const selectedOption = options.find((o) => String(o.value) === String(value));

  const updatePosition = useCallback(() => {
    const btn = triggerRef.current;
    if (!btn || typeof window === 'undefined') return;

    const rect = btn.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const viewportW = window.innerWidth;
    const desiredMaxH = 260;
    const spaceBelow = viewportH - rect.bottom - 12;
    const spaceAbove = rect.top - 12;

    const openUpward = spaceBelow < 180 && spaceAbove > spaceBelow;
    const computedMaxH = Math.max(
      140,
      Math.min(desiredMaxH, openUpward ? spaceAbove - 8 : spaceBelow - 8)
    );

    const minWidth = Math.max(rect.width, 190);
    let left =
      align === 'right' ? rect.right - minWidth : rect.left;
    left = Math.max(8, Math.min(left, viewportW - minWidth - 8));

    const top = openUpward
      ? Math.max(8, rect.top - computedMaxH - 6)
      : rect.bottom + 6;

    setCoords({
      top,
      left,
      minWidth,
      maxHeight: computedMaxH,
    });
  }, [align]);

  useEffect(() => {
    if (!open) return;
    updatePosition();

    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    const handleScrollOrResize = (e: Event) => {
      if (menuRef.current && e.target instanceof Node && menuRef.current.contains(e.target)) {
        return;
      }
      updatePosition();
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [open, updatePosition]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          variant === 'ghost'
            ? 'inline-flex items-center justify-between gap-2 bg-transparent hover:bg-gray-100/70 rounded-xl px-3 py-2 text-sm font-semibold text-[#111827] transition-colors cursor-pointer focus:outline-none whitespace-nowrap'
            : 'inline-flex items-center justify-between gap-2 bg-white border border-gray-300/90 hover:border-[#0F3E35]/50 rounded-xl px-3 py-1.5 text-xs font-semibold text-[#111827] shadow-[0_2px_8px_rgba(15,23,42,0.06)] hover:shadow-[0_4px_12px_rgba(15,23,42,0.10)] transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0F3E35]/20 focus:border-[#0F3E35] whitespace-nowrap',
          variant === 'default' && open && 'border-[#0F3E35] ring-2 ring-[#0F3E35]/15',
          variant === 'ghost' && open && 'bg-[#EBF7F2]/70 text-[#0B3B2C]',
          triggerClassName
        )}
      >
        <span className="inline-flex items-center gap-1.5 min-w-0 truncate">
          {icon && <span className="text-gray-400 shrink-0 flex items-center">{icon}</span>}
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform duration-150',
            open && 'rotate-180 text-[#0F3E35]'
          )}
        />
      </button>

      {mounted &&
        open &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              minWidth: coords.minWidth,
              maxHeight: coords.maxHeight,
            }}
            className={cn(
              'z-[100] bg-white rounded-xl border border-gray-300/95 shadow-[0_14px_38px_-4px_rgba(15,23,42,0.20),0_6px_14px_-2px_rgba(15,23,42,0.10)] overflow-y-auto overscroll-contain py-1.5 animate-in fade-in zoom-in-95 duration-120',
              menuClassName
            )}
          >
            {options.map((opt) => {
              const isSelected = String(opt.value) === String(value);
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(String(opt.value));
                    setOpen(false);
                  }}
                  className={cn(
                    'w-full text-left px-3.5 py-2 text-xs flex items-center justify-between gap-3 transition-colors cursor-pointer',
                    isSelected
                      ? 'bg-[#EBF7F2] text-[#0B3B2C] font-bold'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-950 font-medium'
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-[#0B3B2C] shrink-0" />
                  )}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}
