'use client';

import { X, ArrowRight } from 'lucide-react';
import type { RooferProvider } from '@/data/mockRoofers';
import { EButton } from '@/components/EComponents';

export interface CompareDrawerProps {
  comparedProviders: RooferProvider[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onOpenCompareModal: () => void;
}

export default function CompareDrawer({
  comparedProviders,
  onRemove,
  onClear,
  onOpenCompareModal,
}: CompareDrawerProps) {
  if (comparedProviders.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 max-w-2xl w-[94%] bg-gray-950 text-white rounded-2xl shadow-2xl p-3 sm:p-4 border border-gray-800 animate-in slide-in-from-bottom duration-200 flex items-center justify-between gap-3 sm:gap-4">
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <div className="flex -space-x-2 shrink-0">
          {comparedProviders.map((p) => (
            <div
              key={p.id}
              className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-gray-900 overflow-hidden bg-gray-800"
            >
              <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
              <button
                onClick={() => onRemove(p.id)}
                className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                title={`Remove ${p.name}`}
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
        </div>

        <div className="min-w-0 text-xs">
          <div className="font-bold truncate text-[11.5px] sm:text-xs">
            {comparedProviders.length} Selected
          </div>
          <div className="text-[11px] text-gray-400 truncate hidden sm:block">
            Compare ratings, prices &amp; warranties side-by-side
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <button
          onClick={onClear}
          className="text-xs text-gray-400 hover:text-white px-1.5 sm:px-2 py-1 cursor-pointer transition-colors"
        >
          Clear
        </button>
        <EButton
          onClick={onOpenCompareModal}
          variant="primary"
          size="sm"
          iconRight={<ArrowRight className="w-3.5 h-3.5" />}
        >
          <span>Compare</span>
          <span className="hidden sm:inline">&nbsp;Side-by-Side</span>
        </EButton>
      </div>
    </div>
  );
}
