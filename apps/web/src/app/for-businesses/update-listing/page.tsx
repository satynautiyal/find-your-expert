import type { Metadata } from 'next';
import EditorialPageLayout from '@/components/common/EditorialPageLayout';
import EditorialSubmissionForm from '@/components/common/EditorialSubmissionForm';
import { SITE_BASE_URL } from '@/lib/seo-urls';

/**
 * Sheet 1 Row 17: `/for-businesses/update-listing` MUST be `noindex`.
 */
export const metadata: Metadata = {
  title: 'Update Your Business Listing | ProsVetted',
  description:
    'Submit updated business contact details, license numbers, or service areas for your company profile on ProsVetted.',
  alternates: {
    canonical: `${SITE_BASE_URL}/for-businesses/update-listing`,
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function UpdateListingPage() {
  return (
    <EditorialPageLayout
      badge="Listing Update"
      title="Update Your Company Listing"
      subtitle="Use this form to correct or update your business phone, address, website, license credentials, or service areas on ProsVetted."
      currentPath="/for-businesses"
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'For Businesses', href: '/for-businesses' },
        { label: 'Update Your Listing', href: '/for-businesses/update-listing' },
      ]}
    >
      <EditorialSubmissionForm
        heading="Company Profile Update Form"
        description="Please use an official company email address where possible so our team can verify ownership rapidly."
        submitLabel="Submit Listing Update"
        successMessage="Your listing update request has been received! After verification, updates typically go live within 2–3 business days."
        fields={[
          { name: 'businessName', label: 'Company Name', required: true, placeholder: 'Talavera Custom, LLC' },
          { name: 'contactName', label: 'Your Name & Role', required: true, placeholder: 'Owner / Operations Manager' },
          { name: 'email', label: 'Work Email', type: 'email', required: true, placeholder: 'info@yourcompany.com' },
          { name: 'phone', label: 'Business Phone', type: 'tel', required: false, placeholder: '(212) 555-0199' },
          { name: 'profileUrl', label: 'ProsVetted Profile URL (if already listed)', type: 'url', required: false, placeholder: 'https://prosvetted.com/companies/...' },
          { name: 'updates', label: 'Details to Update or Add', type: 'textarea', required: true, placeholder: 'Share updated address, license number, service areas, website URL, or corrections...' },
        ]}
      />
    </EditorialPageLayout>
  );
}
