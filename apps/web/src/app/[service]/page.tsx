import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import SeoDirectoryClient from '@/components/SeoDirectoryClient';
import {
  buildBreadcrumbJsonLd,
  buildGeoBreadcrumbs,
  buildGeoSeoPageMeta,
  parseServiceSlug,
} from '@/lib/seo-urls';

interface ServiceHubPageProps {
  params: Promise<{ service: string }>;
  searchParams: Promise<{ subservice?: string }>;
}

export async function generateMetadata({
  params,
}: ServiceHubPageProps): Promise<Metadata> {
  const { service: rawService } = await params;
  const service = parseServiceSlug(rawService);

  if (!service) {
    return {
      title: 'Page Not Found | ProsVetted',
      robots: { index: false, follow: false },
    };
  }

  const seoMeta = buildGeoSeoPageMeta(service, null);

  return {
    title: seoMeta.title,
    description: seoMeta.description,
    alternates: {
      canonical: seoMeta.canonicalUrl,
    },
    robots: {
      index: seoMeta.shouldIndex,
      follow: true,
    },
    openGraph: {
      title: seoMeta.title,
      description: seoMeta.description,
      url: seoMeta.canonicalUrl,
      siteName: 'ProsVetted',
      type: 'website',
    },
  };
}

export default async function ServiceHubPage({
  params,
  searchParams,
}: ServiceHubPageProps) {
  const [{ service: rawService }, resolvedSearch] = await Promise.all([
    params,
    searchParams,
  ]);

  const service = parseServiceSlug(rawService);
  if (!service) {
    notFound();
  }

  const breadcrumbs = buildGeoBreadcrumbs(service, null);
  const seoMeta = buildGeoSeoPageMeta(service, null);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(breadcrumbs);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <SeoDirectoryClient
        service={service}
        geo={null}
        breadcrumbs={breadcrumbs}
        seoMeta={seoMeta}
        initialSubService={resolvedSearch?.subservice}
      />
    </>
  );
}
