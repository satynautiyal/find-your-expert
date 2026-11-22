import type { Metadata } from 'next';
import Link from 'next/link';
import EditorialPageLayout from '@/components/common/EditorialPageLayout';
import { SITE_BASE_URL } from '@/lib/seo-urls';

export const metadata: Metadata = {
  title: 'Editorial Policy | ProsVetted',
  description:
    'ProsVetted editorial standards covering independence, primary sourcing, AI summary rules, and how city rankings and guides are updated.',
  alternates: {
    canonical: `${SITE_BASE_URL}/editorial-policy`,
  },
  robots: { index: true, follow: true },
};

export default function EditorialPolicyPage() {
  return (
    <EditorialPageLayout
      badge="Editorial Standards"
      title="Editorial Policy"
      subtitle="Our commitment to accuracy, editorial independence, verifiable data sourcing, and regular updates across every guide and city directory."
      currentPath="/editorial-policy"
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Editorial Policy', href: '/editorial-policy' },
      ]}
    >
      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-bold text-gray-950">
          Editorial Independence
        </h2>
        <p>
          ProsVetted&apos;s research and editorial staff operate independently from commercial partnerships. No contractor can pay to raise their Vetted Score, change their organic ranking position, or suppress verified homeowner feedback.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-bold text-gray-950">
          Sourcing &amp; Cost Data
        </h2>
        <p>
          Project budget ranges and cost guides draw from national construction cost datasets, municipal permit requirements, and local market benchmarks. Whenever market conditions shift materially, our editors review and update pricing tables.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-bold text-gray-950">
          Responsible Use of AI
        </h2>
        <p>
          We use AI solely to synthesize large volumes of verified customer reviews on company profiles (clearly badged as <em>AI Review Summary</em>). Editorial policies, methodology criteria, and company inclusion decisions are governed by human editors.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg sm:text-xl font-bold text-gray-950">
          Updates &amp; Corrections
        </h2>
        <p>
          When a business closes, rebrands, or changes service areas—or if a reader identifies an inaccuracy—we investigate and update the page promptly. See our{' '}
          <Link href="/corrections" className="font-bold text-[#0F3E35] underline">
            Corrections Policy
          </Link>
          .
        </p>
      </section>
    </EditorialPageLayout>
  );
}
