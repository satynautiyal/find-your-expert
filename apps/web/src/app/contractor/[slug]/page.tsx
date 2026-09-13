import { redirect } from 'next/navigation';

export default async function ContractorRedirectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = await params;
  redirect(`/contractors/${resolvedParams.slug}`);
}
