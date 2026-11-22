import type { Metadata } from 'next';
import Link from 'next/link';
import EditorialPageLayout from '@/components/common/EditorialPageLayout';
import { SITE_BASE_URL } from '@/lib/seo-urls';

export const metadata: Metadata = {
  title: 'Terms of Use | ProsVetted',
  description:
    'Terms of Use and important homeowner disclaimers governing your use of the ProsVetted contractor directory and guides.',
  alternates: {
    canonical: `${SITE_BASE_URL}/terms`,
  },
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <EditorialPageLayout
      badge="Legal"
      title="Terms of Use"
      subtitle="Please read these Terms of Use carefully before using ProsVetted. By accessing this site, you agree to the terms and disclaimers below."
      currentPath="/terms"
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Terms of Use', href: '/terms' },
      ]}
    >
      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-bold text-gray-950">
          1. ProsVetted Is Not a Contractor
        </h2>
        <p>
          ProsVetted is an independent informational research directory. We do not perform construction, remodeling, roofing, or cabinetry services, and we do not employ, supervise, or act as an agent for any company listed on this website. Any agreement for home improvement work is strictly between you and the contractor you hire.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-bold text-gray-950">
          2. No Warranty of Licensing, Pricing, or Workmanship
        </h2>
        <p>
          While we research companies carefully (see{' '}
          <Link href="/how-we-research" className="font-bold text-[#0F3E35] underline">
            How We Research Companies
          </Link>
          ), business licenses, insurance coverage, ratings, and pricing change over time. Homeowners are solely responsible for verifying active state/municipal licenses, insurance certificates, references, and contract terms prior to hiring.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-bold text-gray-950">
          3. Acceptable Use &amp; Intellectual Property
        </h2>
        <p>
          Original rankings, editorial guides, cost tables, and site design on ProsVetted are protected by applicable copyright laws. Automated scraping, bulk reproduction, or fraudulent form submissions are prohibited.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg sm:text-xl font-bold text-gray-950">
          4. Limitation of Liability
        </h2>
        <p>
          To the fullest extent permitted by law, ProsVetted is provided &ldquo;as is&rdquo; without warranties of any kind and shall not be liable for damages or disputes arising from services performed by third-party contractors.
        </p>
      </section>
    </EditorialPageLayout>
  );
}
