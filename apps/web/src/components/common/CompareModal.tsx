'use client';

import { motion, AnimatePresence } from 'motion/react';
import { X, Star, CheckCircle2 } from 'lucide-react';
import type { RooferProvider } from '@/data/mockRoofers';
import { EButton } from '@/components/EComponents';

export interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  providers: RooferProvider[];
  onSelectForQuote: (p: RooferProvider) => void;
}

function getVettedScore(provider: RooferProvider): number {
  return Math.min(
    99,
    Math.max(
      88,
      Math.round(
        (provider.compositeRating || 4.8) * 18 +
          (provider.isLicensed ? 3 : 0) +
          (provider.isInsured ? 3 : 0)
      )
    )
  );
}

function getEstablishedYear(provider: RooferProvider): number {
  if (provider.sinceYear && provider.sinceYear > 0) return provider.sinceYear;
  if (provider.yearsInBusiness && provider.yearsInBusiness > 0) {
    return new Date().getFullYear() - provider.yearsInBusiness;
  }
  return 0;
}

export default function CompareModal({
  isOpen,
  onClose,
  providers,
  onSelectForQuote,
}: CompareModalProps) {
  return (
    <AnimatePresence>
      {isOpen && providers.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/70 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-4xl w-full border border-gray-200 shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col"
          >
        {/* Modal Header */}
        <div className="p-5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-primary-dark font-bold">
              SIDE-BY-SIDE EVALUATION
            </span>
            <h3 className="text-lg font-black text-gray-950">
              Comparing {providers.length} Verified NYC Contractors
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
        <div className="overflow-x-auto p-3.5 sm:p-5 flex-1">
          <table className="w-full min-w-[520px] text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="p-3 font-bold text-gray-500 uppercase text-[10px] w-40">
                  Feature
                </th>
                {providers.map((p) => (
                  <th key={p.id} className="p-3 font-black text-gray-900 text-sm">
                    {p.imageUrl ? (
                      <div className="w-9 h-9 rounded-lg overflow-hidden bg-white border border-gray-200 p-1 mb-1.5 flex items-center justify-center">
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                    ) : null}
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {/* Vetted Score */}
              <tr>
                <td className="p-3 font-bold text-gray-500">Vetted Score</td>
                {providers.map((p) => (
                  <td key={p.id} className="p-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EBF7F2] border border-[#0B3B2C]/15 font-black text-[#0B3B2C] text-sm">
                      {getVettedScore(p)}
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium ml-1.5">
                      Prosvetted Audit
                    </span>
                  </td>
                ))}
              </tr>

              {/* Composite Rating */}
              <tr>
                <td className="p-3 font-bold text-gray-500">Customer Ratings</td>
                {providers.map((p) => (
                  <td key={p.id} className="p-3 font-bold text-gray-950">
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{(p.compositeRating || 0).toFixed(1)}</span>
                      <span className="text-gray-400 text-[10px]">
                        ({p.totalReviews} verified reviews)
                      </span>
                    </div>
                  </td>
                ))}
              </tr>

              {/* Google Reviews */}
              <tr>
                <td className="p-3 font-bold text-gray-500">Google</td>
                {providers.map((p) => (
                  <td key={p.id} className="p-3 font-semibold text-blue-700">
                    {p.reviews.google?.count > 0
                      ? `${p.reviews.google.rating.toFixed(1)} ★ (${p.reviews.google.count})`
                      : '—'}
                  </td>
                ))}
              </tr>

              {/* Yelp Reviews */}
              <tr>
                <td className="p-3 font-bold text-gray-500">Yelp</td>
                {providers.map((p) => (
                  <td key={p.id} className="p-3 font-semibold text-red-600">
                    {p.reviews.yelp?.count > 0
                      ? `${p.reviews.yelp.rating.toFixed(1)} ★ (${p.reviews.yelp.count})`
                      : '—'}
                  </td>
                ))}
              </tr>

              {/* HomeAdvisor Reviews */}
              <tr>
                <td className="p-3 font-bold text-gray-500">HomeAdvisor</td>
                {providers.map((p) => {
                  const haRating = p.reviews.homeadvisor?.rating ?? 0;
                  const haCount = p.reviews.homeadvisor?.count ?? 0;
                  return (
                    <td key={p.id} className="p-3 font-semibold text-amber-600">
                      {haCount > 0 ? `${haRating.toFixed(1)} ★ (${haCount})` : '—'}
                    </td>
                  );
                })}
              </tr>

              {/* Houzz Reviews */}
              <tr>
                <td className="p-3 font-bold text-gray-500">Houzz</td>
                {providers.map((p) => {
                  const hRating = (p.reviews.houzz || p.reviews.facebook)?.rating ?? 0;
                  const hCount = (p.reviews.houzz || p.reviews.facebook)?.count ?? 0;
                  return (
                    <td key={p.id} className="p-3 font-semibold text-emerald-700">
                      {hCount > 0 ? `${hRating.toFixed(1)} ★ (${hCount})` : '—'}
                    </td>
                  );
                })}
              </tr>

              {/* Established & Location */}
              <tr>
                <td className="p-3 font-bold text-gray-500">Location &amp; Est.</td>
                {providers.map((p) => {
                  const est = getEstablishedYear(p);
                  const loc =
                    p.borough && p.borough !== 'All' && p.borough !== 'New York City'
                      ? `${p.borough}, NY`
                      : `${p.city || 'New York'}, ${p.state || 'NY'}`;
                  return (
                    <td key={p.id} className="p-3 text-gray-700 font-medium">
                      {loc}
                      {est > 0 ? ` • Since ${est}` : ''}
                    </td>
                  );
                })}
              </tr>

              {/* Highlights */}
              <tr>
                <td className="p-3 font-bold text-gray-500">Service Highlights</td>
                {providers.map((p) => (
                  <td key={p.id} className="p-3 text-gray-700 font-medium">
                    Warranty Available • Free Estimates
                  </td>
                ))}
              </tr>

              {/* Audit Checklist */}
              <tr>
                <td className="p-3 font-bold text-gray-500">Audit Status</td>
                {providers.map((p) => (
                  <td key={p.id} className="p-3">
                    <div className="space-y-1 text-[11px] font-semibold">
                      <div className="flex items-center justify-between gap-2 text-gray-700">
                        <span>Business Confirmed</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      </div>
                      <div className="flex items-center justify-between gap-2 text-gray-400 select-none">
                        <span>License &amp; Insurance Checked</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                      </div>
                      <div className="flex items-center justify-between gap-2 text-gray-700">
                        <span>Reputation Analyzed</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      </div>
                      <div className="flex items-center justify-between gap-2 text-gray-700">
                        <span>Reviews Analyzed</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      </div>
                    </div>
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
                      Get a Quote
                    </EButton>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
