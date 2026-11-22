import { permanentRedirect } from 'next/navigation';
import { getCompanyUrl } from '@/lib/seo-urls';

export default async function LegacyContractorSingularRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  permanentRedirect(getCompanyUrl(slug));
}
