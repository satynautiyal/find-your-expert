import type { Metadata } from 'next';
import Link from 'next/link';
import EditorialPageLayout from '@/components/common/EditorialPageLayout';
import { SITE_BASE_URL } from '@/lib/seo-urls';

export const metadata: Metadata = {
  title: 'Advertising Disclosure | ProsVetted',
  description:
    'Learn how ProsVetted makes money, how sponsored placements are labeled, and how we keep organic contractor rankings independent.',
  alternates: {
    canonical: `${SITE_BASE_URL}/advertising-disclosure`,
  },
  robots: { index: true, follow: true },
};

export default function AdvertisingDisclosurePage() {
  return (
    <EditorialPageLayout
      badge="Transparency"
      title="Advertising Disclosure"
      subtitle="Clear disclosure of how ProsVetted earns revenue and how commercial relationships are separated from our editorial rankings."
      currentPath="/advertising-disclosure"
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Advertising Disclosure', href: '/advertising-disclosure' },
      ]}
    >
      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-bold text-gray-950">
          How ProsVetted Makes Money
        </h2>
        <p>
          ProsVetted is free for homeowners to browse, research, and compare contractors. To fund ongoing research, software engineering, and editorial updates, ProsVetted may earn compensation through:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Clearly badged sponsored or featured company placements.</li>
          <li>Quote request or project-matching referral partnerships.</li>
          <li>Optional profile enhancement tools for verified businesses.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-bold text-gray-950">
          How Sponsored Placements Are Labeled
        </h2>
        <p>
          Whenever a placement appears due to a paid partnership, it is explicitly marked with a visible <strong>&ldquo;Sponsored&rdquo;</strong> or <strong>&ldquo;Featured Partner&rdquo;</strong> badge so you can immediately distinguish paid visibility from organic research results.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg sm:text-xl font-bold text-gray-950">
          Vetted Scores Cannot Be Purchased
        </h2>
        <p>
          Every company&apos;s Vetted Score and review summary follow the exact same rules outlined in{' '}
          <Link href="/how-we-research" className="font-bold text-[#0F3E35] underline">
            How We Research Companies
          </Link>
          , regardless of whether a company advertises with us.
        </p>
      </section>
    </EditorialPageLayout>
  );
}
