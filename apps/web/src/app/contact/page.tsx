import type { Metadata } from 'next';
import EditorialPageLayout from '@/components/common/EditorialPageLayout';
import EditorialSubmissionForm from '@/components/common/EditorialSubmissionForm';
import { SITE_BASE_URL } from '@/lib/seo-urls';
import { Mail } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contact Us | ProsVetted',
  description:
    'Get in touch with the ProsVetted team for homeowner questions, editorial feedback, or business listing inquiries.',
  alternates: {
    canonical: `${SITE_BASE_URL}/contact`,
  },
  robots: { index: true, follow: true },
};

export default function ContactPage() {
  return (
    <EditorialPageLayout
      badge="Contact"
      title="Contact Us"
      subtitle="Have a question about our research, spotted an update needed on a city page, or want to reach our partnerships desk? Send us a message below."
      currentPath="/contact"
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Contact Us', href: '/contact' },
      ]}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="rounded-xl border border-gray-200 p-4 space-y-1 bg-[#FAFBF9]">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#0F3E35]">
            <Mail className="w-3.5 h-3.5" />
            <span>General &amp; Support</span>
          </div>
          <a
            href="mailto:support@prosvetted.com"
            className="block text-xs sm:text-sm font-semibold text-gray-900 hover:underline break-all"
          >
            support@prosvetted.com
          </a>
        </div>

        <div className="rounded-xl border border-gray-200 p-4 space-y-1 bg-[#FAFBF9]">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#0F3E35]">
            <Mail className="w-3.5 h-3.5" />
            <span>Editorial &amp; Research</span>
          </div>
          <a
            href="mailto:editorial@prosvetted.com"
            className="block text-xs sm:text-sm font-semibold text-gray-900 hover:underline break-all"
          >
            editorial@prosvetted.com
          </a>
        </div>

        <div className="rounded-xl border border-gray-200 p-4 space-y-1 bg-[#FAFBF9]">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#0F3E35]">
            <Mail className="w-3.5 h-3.5" />
            <span>For Businesses</span>
          </div>
          <a
            href="mailto:partnerships@prosvetted.com"
            className="block text-xs sm:text-sm font-semibold text-gray-900 hover:underline break-all"
          >
            partnerships@prosvetted.com
          </a>
        </div>
      </div>

      <EditorialSubmissionForm
        heading="Send Us a Message"
        description="We typically respond within 1–2 business days."
        submitLabel="Send Message"
        successMessage="Thanks for reaching out! Your message has been routed to the appropriate ProsVetted team."
        fields={[
          { name: 'name', label: 'Full Name', required: true, placeholder: 'Alex Rivera' },
          { name: 'email', label: 'Email Address', type: 'email', required: true, placeholder: 'alex@example.com' },
          {
            name: 'topic',
            label: 'Topic',
            type: 'select',
            required: true,
            options: [
              'Homeowner Question',
              'Editorial Feedback / Correction',
              'Business Listing Inquiry',
              'Media / Press',
              'Other',
            ],
          },
          { name: 'subject', label: 'Subject', required: true, placeholder: 'How can we help?' },
          { name: 'message', label: 'Message', type: 'textarea', required: true, placeholder: 'Share your question or feedback...' },
        ]}
      />
    </EditorialPageLayout>
  );
}
