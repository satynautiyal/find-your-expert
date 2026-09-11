'use client';

import { X, Star } from 'lucide-react';
import type { RooferProvider } from '@/data/mockRoofers';
import { EButton } from '@/components/EComponents';

export interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  providers: RooferProvider[];
  onSelectForQuote: (p: RooferProvider) => void;
}

export default function CompareModal({
  isOpen,
  onClose,
  providers,
  onSelectForQuote,
}: CompareModalProps) {
  if (!isOpen || providers.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-4xl w-full border border-gray-200 shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-primary-dark font-bold">
              SIDE-BY-SIDE EVALUATION
            </span>
            <h3 className="text-lg font-black text-gray-950">
              Comparing {providers.length} NYC Roofing Contractors
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-200 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comparison Table */}
        <div className="overflow-x-auto p-5 flex-1">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="p-3 font-bold text-gray-500 uppercase text-[10px] w-40">
                  Feature
                </th>
                {providers.map((p) => (
                  <th key={p.id} className="p-3 font-black text-gray-900 text-sm">
                    <div className="w-8 h-8 rounded-md overflow-hidden bg-gray-100 mb-1">
                      <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                    </div>
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {/* Composite Rating */}
              <tr>
                <td className="p-3 font-bold text-gray-500">Customer Score</td>
                {providers.map((p) => (
                  <td key={p.id} className="p-3 font-bold text-gray-950">
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-primary text-primary" />
                      <span>{p.compositeRating}</span>
                      <span className="text-gray-400 text-[10px]">({p.totalReviews} reviews)</span>
                    </div>
                  </td>
                ))}
              </tr>

              {/* Google Reviews */}
              <tr>
                <td className="p-3 font-bold text-gray-500">Google Rating</td>
                {providers.map((p) => (
                  <td key={p.id} className="p-3 font-semibold text-blue-700">
                    {p.reviews.google.rating} ★ ({p.reviews.google.count})
                  </td>
                ))}
              </tr>

              {/* Yelp Reviews */}
              <tr>
                <td className="p-3 font-bold text-gray-500">Yelp Rating</td>
                {providers.map((p) => (
                  <td key={p.id} className="p-3 font-semibold text-red-600">
                    {p.reviews.yelp.rating} ★ ({p.reviews.yelp.count})
                  </td>
                ))}
              </tr>

              {/* Facebook Reviews */}
              <tr>
                <td className="p-3 font-bold text-gray-500">Facebook Rating</td>
                {providers.map((p) => (
                  <td key={p.id} className="p-3 font-semibold text-indigo-700">
                    {p.reviews.facebook.rating} ★ ({p.reviews.facebook.count})
                  </td>
                ))}
              </tr>

              {/* Price Range */}
              <tr>
                <td className="p-3 font-bold text-gray-500">Typical Project</td>
                {providers.map((p) => (
                  <td key={p.id} className="p-3 font-mono font-bold text-gray-950">
                    {p.typicalPriceRange}
                  </td>
                ))}
              </tr>

              {/* Borough & Years */}
              <tr>
                <td className="p-3 font-bold text-gray-500">Location &amp; Exp.</td>
                {providers.map((p) => (
                  <td key={p.id} className="p-3 text-gray-700">
                    {p.borough}, NYC ({p.yearsInBusiness} yrs)
                  </td>
                ))}
              </tr>

              {/* License */}
              <tr>
                <td className="p-3 font-bold text-gray-500">NYC License</td>
                {providers.map((p) => (
                  <td key={p.id} className="p-3 font-mono text-[11px] text-gray-700">
                    {p.licenseNumber}
                  </td>
                ))}
              </tr>

              {/* Action Button */}
              <tr>
                <td className="p-3 font-bold text-gray-500">Action</td>
                {providers.map((p) => (
                  <td key={p.id} className="p-3">
                    <EButton
                      onClick={() => {
                        onClose();
                        onSelectForQuote(p);
                      }}
                      variant="primary"
                      size="sm"
                      className="w-full"
                    >
                      Get Quote
                    </EButton>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
