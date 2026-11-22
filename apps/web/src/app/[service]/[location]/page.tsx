import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import SeoDirectoryClient from '@/components/SeoDirectoryClient';
import {
  buildBreadcrumbJsonLd,
  buildGeoBreadcrumbs,
  buildGeoSeoPageMeta,
  parseGeoLocationSlug,
  parseServiceSlug,
} from '@/lib/seo-urls';

interface ServiceGeoPageProps {
  params: Promise<{ service: string; location: string }>;
  searchParams: Promise<{ subservice?: string }>;
}

export async function generateMetadata({
  params,
}: ServiceGeoPageProps): Promise<Metadata> {
  const { service: rawService, location: rawLocation } = await params;
  const service = parseServiceSlug(rawService);
  const geo = parseGeoLocationSlug(rawLocation);

  if (!service || !geo) {
    return {
      title: 'Page Not Found | ProsVetted',
      robots: { index: false, follow: false },
    };
  }

  const seoMeta = buildGeoSeoPageMeta(service, geo);

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

export default async function ServiceGeoPage({
  params,
  searchParams,
}: ServiceGeoPageProps) {
  const [{ service: rawService, location: rawLocation }, resolvedSearch] =
    await Promise.all([params, searchParams]);

  const service = parseServiceSlug(rawService);
  const geo = parseGeoLocationSlug(rawLocation);

  // Strict validation: unknown service or unknown location returns real HTTP 404
  if (!service || !geo) {
    notFound();
  }

  const breadcrumbs = buildGeoBreadcrumbs(service, geo);
  const seoMeta = buildGeoSeoPageMeta(service, geo);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(breadcrumbs);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <SeoDirectoryClient
        service={service}
        geo={geo}
        breadcrumbs={breadcrumbs}
        seoMeta={seoMeta}
        initialSubService={resolvedSearch?.subservice}
      />
    </>
  );
}
