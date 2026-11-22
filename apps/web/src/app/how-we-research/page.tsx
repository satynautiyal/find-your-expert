import type { Metadata } from 'next';
import Link from 'next/link';
import EditorialPageLayout from '@/components/common/EditorialPageLayout';
import { SITE_BASE_URL } from '@/lib/seo-urls';

export const metadata: Metadata = {
  title: 'How We Research Companies: Our Vetting Methodology | ProsVetted',
  description:
    'See how ProsVetted researches, scores, and ranks local contractors—what we verify, how cross-platform reviews are analyzed, and what homeowners must still confirm.',
  alternates: {
    canonical: `${SITE_BASE_URL}/how-we-research`,
  },
  robots: { index: true, follow: true },
};

export default function HowWeResearchPage() {
  return (
    <EditorialPageLayout
      badge="Methodology"
      title="How We Research Companies"
      subtitle="A transparent breakdown of what ProsVetted checks before listing a company, how our Vetted Score works, and what we do not verify."
      currentPath="/how-we-research"
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'How We Research Companies', href: '/how-we-research' },
      ]}
    >
      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-bold text-gray-950">
          1. Active Local Business &amp; Trade Focus
        </h2>
        <p>
          Before a company appears in a live city directory, we confirm an active physical or service-area presence, working contact details, and documented specialization in the target trade (such as custom cabinetry/millwork or residential roofing). General lead-resellers and unverified call centers are excluded.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-bold text-gray-950">
          2. Cross-Platform Customer Review Aggregation
        </h2>
        <p>
          Relying on a single platform can skew a contractor&apos;s reputation. ProsVetted aggregates publicly available ratings and review counts across up to four major homeowner platforms—<strong>Google, Houzz, Yelp, and HomeAdvisor</strong>—to calculate a weighted composite rating and highlight recurring strengths or complaints.
        </p>
        <p>
          Where AI Review Summaries appear on company profiles, they are generated strictly from up to 500 of the company&apos;s most recent customer reviews stored in our database so homeowners can quickly scan consistent themes alongside raw individual reviews.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-bold text-gray-950">
          3. Portfolio &amp; Service Capabilities
        </h2>
        <p>
          We review real project photography, years in business, sub-service offerings, and stated warranty or estimate policies so homeowners can match companies to their exact project scope.
        </p>
      </section>

      <section className="space-y-3 rounded-xl bg-amber-50/70 border border-amber-200 p-5">
        <h2 className="text-base sm:text-lg font-bold text-amber-950">
          What We Do Not Guarantee (Homeowner Checklist)
        </h2>
        <p className="text-amber-950/90 text-xs sm:text-sm">
          Licensing, general liability insurance, and workers&apos; compensation policies can expire or change between our research cycles. ProsVetted is not a government licensing board or a party to your construction contract. Before paying a deposit, always request the contractor&apos;s current license number, active Certificate of Insurance (COI) naming your property, and a written scope of work.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg sm:text-xl font-bold text-gray-950">
          Spot an Error or Outdated Detail?
        </h2>
        <p>
          We welcome updates from both homeowners and listed businesses. Submit a report anytime on our{' '}
          <Link href="/corrections" className="font-bold text-[#0F3E35] underline">
            Corrections &amp; Update Requests
          </Link>{' '}
          page or{' '}
          <Link
            href="/for-businesses/update-listing"
            className="font-bold text-[#0F3E35] underline"
          >
            Update Your Listing
          </Link>
          .
        </p>
      </section>
    </EditorialPageLayout>
  );
}
