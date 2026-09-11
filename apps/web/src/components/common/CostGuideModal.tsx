'use client';

import { X, CheckCircle2 } from 'lucide-react';
import { EButton } from '@/components/EComponents';

export interface CostGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CostGuideModal({ isOpen, onClose }: CostGuideModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-gray-200 shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-primary-dark uppercase tracking-wider">
              2026 NYC PRICE BENCHMARK
            </span>
            <h3 className="text-xl font-black text-gray-950">
              NYC Roofing Cost Guide
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-gray-700">
          <p className="text-sm leading-relaxed text-gray-600">
            Roofing prices in New York City vary widely by borough, building height, access, and whether a full tear-off down to the plywood decking is required by the NYC Department of Buildings.
          </p>

          <div className="space-y-3">
            <h4 className="font-extrabold text-sm text-gray-900 uppercase tracking-wider">
              Average NYC Project Costs by Roof Type
            </h4>

            <div className="divide-y divide-gray-200 border border-gray-200 rounded-xl overflow-hidden">
              <div className="p-3.5 bg-white flex justify-between items-center">
                <div>
                  <span className="font-bold text-gray-900 text-xs">Brownstone / Rowhouse Flat Roof (Torch-down / EPDM)</span>
                  <div className="text-[11px] text-gray-500">Standard 20x50 ft NYC footprint (1,000 sq ft)</div>
                </div>
                <div className="font-mono font-black text-sm text-emerald-800">$8,500 – $14,000</div>
              </div>

              <div className="p-3.5 bg-gray-50/50 flex justify-between items-center">
                <div>
                  <span className="font-bold text-gray-900 text-xs">Liquid Silicone Roof Coating Restoration</span>
                  <div className="text-[11px] text-gray-500">Extends roof life by 15–20 years without tear-off</div>
                </div>
                <div className="font-mono font-black text-sm text-emerald-800">$4,500 – $7,800</div>
              </div>

              <div className="p-3.5 bg-white flex justify-between items-center">
                <div>
                  <span className="font-bold text-gray-900 text-xs">Architectural Asphalt Shingles (Queens / Staten Island)</span>
                  <div className="text-[11px] text-gray-500">Detached single &amp; multi-family homes (2,000 sq ft)</div>
                </div>
                <div className="font-mono font-black text-sm text-emerald-800">$6,500 – $12,500</div>
              </div>

              <div className="p-3.5 bg-gray-50/50 flex justify-between items-center">
                <div>
                  <span className="font-bold text-gray-900 text-xs">Historic Slate, Tile &amp; Copper Cornice Restoration</span>
                  <div className="text-[11px] text-gray-500">Park Slope, Brooklyn Heights landmark districts</div>
                </div>
                <div className="font-mono font-black text-sm text-emerald-800">$12,000 – $28,000</div>
              </div>

              <div className="p-3.5 bg-white flex justify-between items-center">
                <div>
                  <span className="font-bold text-gray-900 text-xs">Emergency Active Leak Repair &amp; Tarping</span>
                  <div className="text-[11px] text-gray-500">Same-day dispatch, flashing repair &amp; temporary seal</div>
                </div>
                <div className="font-mono font-black text-sm text-emerald-800">$450 – $1,800</div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5 text-emerald-950">
            <span className="font-bold text-xs flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              Tip for NYC Property Owners
            </span>
            <p className="text-[11px] leading-relaxed text-emerald-900">
              Always request at least 2 to 3 side-by-side estimates to verify labor, permit filing fees, and manufacturer warranty coverage before signing any contract.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <EButton onClick={onClose} variant="primary" size="md">
            Close Guide
          </EButton>
        </div>
      </div>
    </div>
  );
}
