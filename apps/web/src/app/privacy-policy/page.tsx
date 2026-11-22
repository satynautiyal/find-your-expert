import type { Metadata } from 'next';
import Link from 'next/link';
import EditorialPageLayout from '@/components/common/EditorialPageLayout';
import { SITE_BASE_URL } from '@/lib/seo-urls';

export const metadata: Metadata = {
  title: 'Privacy Policy | ProsVetted',
  description:
    'Read the ProsVetted Privacy Policy covering personal information submitted via quote and contact forms, analytics, cookies, and your privacy rights.',
  alternates: {
    canonical: `${SITE_BASE_URL}/privacy-policy`,
  },
  robots: { index: true, follow: true },
};

export default function PrivacyPolicyPage() {
  return (
    <EditorialPageLayout
      badge="Legal"
      title="Privacy Policy"
      subtitle="How ProsVetted collects, uses, and safeguards personal information across our website, quote request forms, and analytics tools."
      currentPath="/privacy-policy"
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Privacy Policy', href: '/privacy-policy' },
      ]}
    >
      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-bold text-gray-950">
          1. Information We Collect
        </h2>
        <p>
          We collect information you voluntarily submit—such as your name, email address, phone number, ZIP code, and project details when requesting a contractor quote, subscribing to city launch notifications, or contacting our team—as well as standard technical usage data (IP address, browser type, pages visited).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-bold text-gray-950">
          2. How We Use Information
        </h2>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>To route homeowner quote requests to selected or matching residential contractors.</li>
          <li>To process listing updates, editorial corrections, and customer support inquiries.</li>
          <li>To analyze site performance, improve directory usability, and prevent spam or abuse.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-bold text-gray-950">
          3. Cookies &amp; Analytics
        </h2>
        <p>
          ProsVetted uses essential and analytics cookies to understand traffic patterns and remember interface preferences. For full details, see our{' '}
          <Link href="/cookie-policy" className="font-bold text-[#0F3E35] underline">
            Cookie Policy
          </Link>
          .
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg sm:text-xl font-bold text-gray-950">
          4. Your Privacy Choices &amp; Contact
        </h2>
        <p>
          To request access to, correction of, or deletion of personal data you have submitted to ProsVetted, email{' '}
          <a href="mailto:support@prosvetted.com" className="font-bold text-[#0F3E35] underline">
            support@prosvetted.com
          </a>{' '}
          or reach us via our{' '}
          <Link href="/contact" className="font-bold text-[#0F3E35] underline">
            Contact page
          </Link>
          .
        </p>
      </section>
    </EditorialPageLayout>
  );
}
