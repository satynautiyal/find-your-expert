import type { MetadataRoute } from 'next';
import { fetchBlogs } from '@/lib/blogs-api';
import { fetchProviders } from '@/lib/api';
import type { BlogPost } from '@repo/types';
import {
  TRACKER_NYC_BOROUGHS,
} from '@/data/geoTrackerLocations';
import {
  SITE_BASE_URL,
  getCompanyUrl,
  getLiveServices,
} from '@/lib/seo-urls';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // 1. Core, Trust, For Businesses & Legal Indexable Static Pages
  // Note: `/search` and `/for-businesses/update-listing` are strictly excluded (`noindex`)
  const staticPaths: Array<{
    path: string;
    priority: number;
    changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
  }> = [
    { path: '', priority: 1.0, changeFrequency: 'daily' },
    { path: '/services', priority: 0.9, changeFrequency: 'weekly' },
    { path: '/locations', priority: 0.9, changeFrequency: 'weekly' },
    { path: '/blog', priority: 0.85, changeFrequency: 'daily' },
    { path: '/how-we-research', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/about', priority: 0.75, changeFrequency: 'monthly' },
    { path: '/editorial-policy', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/advertising-disclosure', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/corrections', priority: 0.6, changeFrequency: 'monthly' },
    { path: '/contact', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/for-businesses', priority: 0.75, changeFrequency: 'monthly' },
    { path: '/privacy-policy', priority: 0.5, changeFrequency: 'yearly' },
    { path: '/terms', priority: 0.5, changeFrequency: 'yearly' },
    { path: '/cookie-policy', priority: 0.4, changeFrequency: 'yearly' },
    { path: '/sitemap', priority: 0.5, changeFrequency: 'weekly' },
  ];

  const entries: MetadataRoute.Sitemap = staticPaths.map((p) => ({
    url: `${SITE_BASE_URL}${p.path}`,
    lastModified: now,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));

  // 2. Live Service Hubs + Live Geo Pages (`/{service}`, `/{service}/new-york`, `/{service}/new-york-city-ny`, + 5 NYC Boroughs)
  const liveServices = getLiveServices();
  for (const svc of liveServices) {
    entries.push({
      url: `${SITE_BASE_URL}/${svc.slug}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    });
    entries.push({
      url: `${SITE_BASE_URL}/${svc.slug}/new-york`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.85,
    });
    entries.push({
      url: `${SITE_BASE_URL}/${svc.slug}/new-york-city-ny`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    });
    for (const b of TRACKER_NYC_BOROUGHS) {
      entries.push({
        url: `${SITE_BASE_URL}/${svc.slug}/${b.slug}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.85,
      });
    }
  }

  // 3. Live Verified Company Profiles (`/companies/{slug}`) + Published Blog Posts (`/blog/{slug}`)
  const [providersResult, blogsResult] = await Promise.allSettled([
    fetchProviders({ limit: 500 }),
    fetchBlogs({ limit: 200 }),
  ]);

  if (providersResult.status === 'fulfilled') {
    for (const provider of providersResult.value.items || []) {
      if (!provider?.slug) continue;
      entries.push({
        url: `${SITE_BASE_URL}${getCompanyUrl(provider.slug)}`,
        lastModified: provider.reviewsLastUpdatedAt
          ? new Date(provider.reviewsLastUpdatedAt)
          : now,
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }
  }

  if (blogsResult.status === 'fulfilled') {
    for (const post of (blogsResult.value.blogs || []) as BlogPost[]) {
      if (!post?.slug) continue;
      entries.push({
        url: `${SITE_BASE_URL}/blog/${post.slug}`,
        lastModified: new Date(
          post.updatedAt || post.publishedAt || post.createdAt
        ),
        changeFrequency: 'weekly',
        priority: 0.75,
      });
    }
  }

  return entries;
}
