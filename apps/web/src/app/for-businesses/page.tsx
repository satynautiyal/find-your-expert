import type { Metadata } from 'next';
import Link from 'next/link';
import EditorialPageLayout from '@/components/common/EditorialPageLayout';
import { SITE_BASE_URL } from '@/lib/seo-urls';
import { ArrowRight, Building2, CheckCircle2, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'For Businesses: How Companies Get Listed on ProsVetted | ProsVetted',
  description:
    'Learn how residential contracting companies are researched and listed on ProsVetted, and how to submit updates to an existing company profile.',
  alternates: {
    canonical: `${SITE_BASE_URL}/for-businesses`,
  },
  robots: { index: true, follow: true },
};

export default function ForBusinessesPage() {
  return (
    <EditorialPageLayout
      badge="For Businesses"
      title="ProsVetted for Residential Contractors"
      subtitle="How companies earn a spot in ProsVetted directories, how our independent evaluation works, and how business owners can update their profile details."
      currentPath="/for-businesses"
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'For Businesses', href: '/for-businesses' },
      ]}
    >
      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-bold text-gray-950">
          How Companies Get Listed
        </h2>
        <p>
          ProsVetted researches active residential contractors city by city. Companies are evaluated on confirmed local operations, trade specialization, project portfolio craftsmanship, and multi-platform homeowner reviews across Google, Houzz, Yelp, and HomeAdvisor.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="rounded-xl border border-gray-200 p-4 bg-[#FAFBF9] space-y-1">
            <Building2 className="w-4 h-4 text-[#0F3E35]" />
            <div className="text-xs font-bold text-gray-950">1. Business Confirmed</div>
            <p className="text-xs text-gray-600">Active local presence, website, and verified trade focus.</p>
          </div>
          <div className="rounded-xl border border-gray-200 p-4 bg-[#FAFBF9] space-y-1">
            <CheckCircle2 className="w-4 h-4 text-[#0F3E35]" />
            <div className="text-xs font-bold text-gray-950">2. Reviews Audited</div>
            <p className="text-xs text-gray-600">Consistent homeowner ratings across public platforms.</p>
          </div>
          <div className="rounded-xl border border-gray-200 p-4 bg-[#FAFBF9] space-y-1">
            <ShieldCheck className="w-4 h-4 text-[#0F3E35]" />
            <div className="text-xs font-bold text-gray-950">3. No Pay-to-Rank</div>
            <p className="text-xs text-gray-600">Vetted Scores are merit-based and cannot be bought.</p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-bold text-gray-950">
          Already Listed? Update Your Company Details
        </h2>
        <p>
          If your company already has a profile on ProsVetted and you need to update your phone number, address, license number, service areas, or project photos, submit a verified update request—free of charge.
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <Link
            href="/for-businesses/update-listing"
            className="inline-flex items-center gap-2 rounded-xl bg-[#0F3E35] hover:bg-[#0A2C25] text-white text-xs sm:text-sm font-bold px-5 py-2.5 transition-colors"
          >
            <span>Update Your Listing</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 text-xs sm:text-sm font-bold px-5 py-2.5 transition-colors"
          >
            <span>Request Research Consideration</span>
          </Link>
        </div>
      </section>
    </EditorialPageLayout>
  );
}
