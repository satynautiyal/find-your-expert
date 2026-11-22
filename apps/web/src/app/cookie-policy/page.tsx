import type { Metadata } from 'next';
import Link from 'next/link';
import EditorialPageLayout from '@/components/common/EditorialPageLayout';
import { SITE_BASE_URL } from '@/lib/seo-urls';

export const metadata: Metadata = {
  title: 'Cookie Policy | ProsVetted',
  description:
    'Learn how ProsVetted uses essential, functional, and analytics cookies and how you can manage cookie settings in your browser.',
  alternates: {
    canonical: `${SITE_BASE_URL}/cookie-policy`,
  },
  robots: { index: true, follow: true },
};

export default function CookiePolicyPage() {
  return (
    <EditorialPageLayout
      badge="Legal"
      title="Cookie Policy"
      subtitle="Details on the cookies and local storage technologies used on ProsVetted and how you can control them."
      currentPath="/cookie-policy"
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Cookie Policy', href: '/cookie-policy' },
      ]}
    >
      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-bold text-gray-950">
          What Are Cookies?
        </h2>
        <p>
          Cookies are small text files stored by your web browser when you visit websites. They help keep sessions secure, remember user preferences, and measure aggregate page performance.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-bold text-gray-950">
          Types of Cookies We Use
        </h2>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>Essential Cookies:</strong> Required for core site navigation, security, and form submission reliability.
          </li>
          <li>
            <strong>Performance &amp; Analytics Cookies:</strong> Help us understand which city directories and guides are most helpful in aggregate.
          </li>
          <li>
            <strong>Preference Storage:</strong> Remembers UI state such as contractor comparison selections during your session.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg sm:text-xl font-bold text-gray-950">
          Managing Cookies
        </h2>
        <p>
          Most browsers allow you to block or clear cookies through your browser settings. For broader details on how we handle personal data, review our{' '}
          <Link href="/privacy-policy" className="font-bold text-[#0F3E35] underline">
            Privacy Policy
          </Link>
          .
        </p>
      </section>
    </EditorialPageLayout>
  );
}
