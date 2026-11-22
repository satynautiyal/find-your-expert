import type { Metadata } from 'next';
import Link from 'next/link';
import EditorialPageLayout from '@/components/common/EditorialPageLayout';
import { SITE_BASE_URL } from '@/lib/seo-urls';

export const metadata: Metadata = {
  title: 'About ProsVetted: Independent Home Contractor Research | ProsVetted',
  description:
    'Learn who runs ProsVetted, how we research local home improvement companies, and how our independent directory works for homeowners.',
  alternates: {
    canonical: `${SITE_BASE_URL}/about`,
  },
  robots: { index: true, follow: true },
};

export default function AboutPage() {
  return (
    <EditorialPageLayout
      badge="About ProsVetted"
      title="About Us"
      subtitle="ProsVetted is an independent research directory built to help homeowners compare local residential contractors using verifiable signals rather than pay-to-rank lead lists."
      currentPath="/about"
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'About Us', href: '/about' },
      ]}
    >
      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-bold text-gray-950">
          Why We Built ProsVetted
        </h2>
        <p>
          Hiring a contractor for high-stakes residential work—like custom cabinetry, roofing, or kitchen remodeling—usually forces homeowners to bounce between four or five review sites, state licensing portals, and outdated portfolios. Worse, many directories rank whoever pays the highest lead fee at the top.
        </p>
        <p>
          ProsVetted brings verified business records, cross-platform customer ratings (Google, Houzz, Yelp, and HomeAdvisor), project photography, and clear cost benchmarks into one structured comparison experience.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-bold text-gray-950">
          How ProsVetted Makes Money
        </h2>
        <p>
          ProsVetted is 100% free for homeowners. As we expand, we may earn revenue from clearly labeled featured placements, business profile tools, or quote connection partnerships. Companies cannot pay to alter their Vetted Score, edit customer review counts, or remove legitimate negative feedback. Read our full{' '}
          <Link href="/advertising-disclosure" className="font-bold text-[#0F3E35] underline">
            Advertising Disclosure
          </Link>
          .
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-bold text-gray-950">
          Our Editorial &amp; Research Standards
        </h2>
        <p>
          Every live city page on ProsVetted follows a documented evaluation framework maintained by our{' '}
          <Link
            href="/authors/prosvetted-editorial-team"
            className="font-bold text-[#0F3E35] underline"
          >
            ProsVetted Editorial Team
          </Link>
          . To see exactly what we verify—and what homeowners should still confirm directly before signing a contract—visit{' '}
          <Link href="/how-we-research" className="font-bold text-[#0F3E35] underline">
            How We Research Companies
          </Link>
          .
        </p>
      </section>
    </EditorialPageLayout>
  );
}
