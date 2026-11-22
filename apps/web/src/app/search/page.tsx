import type { Metadata } from 'next';
import SearchResultsClient from '@/components/SearchResultsClient';
import { SITE_BASE_URL } from '@/lib/seo-urls';

/**
 * Sheet 1 Row 6: `/search` MUST be `noindex` (and blocked in `robots.txt`).
 */
export const metadata: Metadata = {
  title: 'Search Verified Companies | ProsVetted',
  description: 'Search ProsVetted by service, company name, or city/ZIP.',
  alternates: {
    canonical: `${SITE_BASE_URL}/search`,
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function SearchPage() {
  return <SearchResultsClient />;
}
