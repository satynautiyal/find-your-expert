import type { MetadataRoute } from 'next';
import { SITE_BASE_URL } from '@/lib/seo-urls';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/search',
          '/admin',
          '/admin/',
          '/api/',
          '/for-businesses/update-listing',
        ],
      },
    ],
    sitemap: `${SITE_BASE_URL}/sitemap.xml`,
  };
}
