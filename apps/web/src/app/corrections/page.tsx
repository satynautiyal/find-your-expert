import type { Metadata } from 'next';
import Link from 'next/link';
import EditorialPageLayout from '@/components/common/EditorialPageLayout';
import EditorialSubmissionForm from '@/components/common/EditorialSubmissionForm';
import { SITE_BASE_URL } from '@/lib/seo-urls';

export const metadata: Metadata = {
  title: 'Corrections & Update Requests | ProsVetted',
  description:
    'Report factual errors, outdated business details, or content corrections to the ProsVetted editorial team.',
  alternates: {
    canonical: `${SITE_BASE_URL}/corrections`,
  },
  robots: { index: true, follow: true },
};

export default function CorrectionsPage() {
  return (
    <EditorialPageLayout
      badge="Accuracy & Updates"
      title="Corrections & Update Requests"
      subtitle="How readers and companies report factual errors, outdated contact details, or editorial corrections on ProsVetted."
      currentPath="/corrections"
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Corrections & Update Requests', href: '/corrections' },
      ]}
    >
      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-bold text-gray-950">
          Our Corrections Commitment
        </h2>
        <p>
          We strive to keep every company profile, city ranking, and cost guide accurate. When you report a factual error—such as a changed business address, updated license status, closed company, or pricing typo—our editorial desk verifies the source and updates the page.
        </p>
        <p>
          If you represent a listed business and want to update your company profile details directly, you can also use our dedicated{' '}
          <Link
            href="/for-businesses/update-listing"
            className="font-bold text-[#0F3E35] underline"
          >
            Update Your Listing
          </Link>{' '}
          form.
        </p>
      </section>

      <EditorialSubmissionForm
        heading="Report an Error or Correction"
        description="Include the page URL and supporting details so our editors can verify quickly."
        submitLabel="Submit Correction"
        successMessage="Thank you for flagging this. Our editorial team reviews correction requests within 2–3 business days."
        fields={[
          { name: 'name', label: 'Your Name', required: true, placeholder: 'Jane Doe' },
          { name: 'email', label: 'Your Email', type: 'email', required: true, placeholder: 'jane@example.com' },
          { name: 'profileUrl', label: 'Page URL on ProsVetted', type: 'url', required: true, placeholder: 'https://prosvetted.com/...' },
          { name: 'details', label: 'What needs to be corrected?', type: 'textarea', required: true, placeholder: 'Describe the inaccurate or outdated information and share any verification link...' },
        ]}
      />
    </EditorialPageLayout>
  );
}
