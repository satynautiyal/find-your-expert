import type { Metadata } from 'next';
import Link from 'next/link';
import { Header, Footer } from '@/components/common';
import { fetchProviders } from '@/lib/api';
import { fetchBlogs } from '@/lib/blogs-api';
import type { BlogPost } from '@repo/types';
import { TRACKER_NYC_BOROUGHS } from '@/data/geoTrackerLocations';
import {
  SITE_BASE_URL,
  buildBreadcrumbJsonLd,
  getCompanyUrl,
  getLiveServices,
} from '@/lib/seo-urls';

export const metadata: Metadata = {
  title: 'HTML Sitemap: All Live Pages | ProsVetted',
  description:
    'Complete directory of all live pages on ProsVetted, including verified home service hubs, city directories, company profiles, editorial policies, and guides.',
  alternates: {
    canonical: `${SITE_BASE_URL}/sitemap`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function HtmlSitemapPage() {
  const liveServices = getLiveServices();

  const [providersRes, blogsRes] = await Promise.allSettled([
    fetchProviders({ limit: 500 }),
    fetchBlogs({ limit: 200 }),
  ]);

  const providers =
    providersRes.status === 'fulfilled' ? providersRes.value.items || [] : [];
  const blogs =
    blogsRes.status === 'fulfilled'
      ? ((blogsRes.value.blogs || []) as BlogPost[])
      : [];

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Sitemap', href: '/sitemap' },
  ];

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-950 flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildBreadcrumbJsonLd(breadcrumbs)),
        }}
      />

      <Header />

      <section className="bg-[#FAFBF9] border-b border-gray-200/80 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-2">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-xs text-gray-500 font-medium"
          >
            <Link href="/" className="hover:text-[#0F3E35]">
              Home
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-[#0F3E35] font-bold">Sitemap</span>
          </nav>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-950 tracking-tight">
            ProsVetted Sitemap
          </h1>
          <p className="text-xs sm:text-sm text-gray-600">
            Plain index of all live pages across ProsVetted.
          </p>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1 space-y-10">
        {/* 1. Core, Trust, Business & Legal */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <section className="space-y-3">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#0F3E35] border-b border-gray-200 pb-2">
              Core Pages
            </h2>
            <ul className="space-y-2 text-sm text-gray-700">
              <li><Link href="/" className="hover:text-[#DA5F2F] hover:underline">Homepage</Link></li>
              <li><Link href="/services" className="hover:text-[#DA5F2F] hover:underline">All Services</Link></li>
              <li><Link href="/locations" className="hover:text-[#DA5F2F] hover:underline">All Locations</Link></li>
              <li><Link href="/blog" className="hover:text-[#DA5F2F] hover:underline">Guides &amp; Blog</Link></li>
              <li><Link href="/sitemap" className="hover:text-[#DA5F2F] hover:underline">HTML Sitemap</Link></li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#0F3E35] border-b border-gray-200 pb-2">
              Trust &amp; Editorial
            </h2>
            <ul className="space-y-2 text-sm text-gray-700">
              <li><Link href="/about" className="hover:text-[#DA5F2F] hover:underline">About Us</Link></li>
              <li><Link href="/how-we-research" className="hover:text-[#DA5F2F] hover:underline">How We Research Companies</Link></li>
              <li><Link href="/editorial-policy" className="hover:text-[#DA5F2F] hover:underline">Editorial Policy</Link></li>
              <li><Link href="/advertising-disclosure" className="hover:text-[#DA5F2F] hover:underline">Advertising Disclosure</Link></li>
              <li><Link href="/corrections" className="hover:text-[#DA5F2F] hover:underline">Corrections &amp; Update Requests</Link></li>
              <li><Link href="/contact" className="hover:text-[#DA5F2F] hover:underline">Contact Us</Link></li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#0F3E35] border-b border-gray-200 pb-2">
              For Businesses
            </h2>
            <ul className="space-y-2 text-sm text-gray-700">
              <li><Link href="/for-businesses" className="hover:text-[#DA5F2F] hover:underline">For Businesses</Link></li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#0F3E35] border-b border-gray-200 pb-2">
              Legal
            </h2>
            <ul className="space-y-2 text-sm text-gray-700">
              <li><Link href="/privacy-policy" className="hover:text-[#DA5F2F] hover:underline">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-[#DA5F2F] hover:underline">Terms of Use</Link></li>
              <li><Link href="/cookie-policy" className="hover:text-[#DA5F2F] hover:underline">Cookie Policy</Link></li>
            </ul>
          </section>
        </div>

        {/* 2. Live Service & Location Directories */}
        <section className="space-y-4 pt-4 border-t border-gray-200">
          <h2 className="text-base font-extrabold uppercase tracking-wider text-[#0F3E35]">
            Live Service &amp; City Directories
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {liveServices.map((svc) => (
              <div key={svc.slug} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
                <h3 className="text-base font-bold text-gray-950">
                  <Link href={`/${svc.slug}`} className="hover:text-[#DA5F2F] hover:underline">
                    {svc.name} Hub (/{svc.slug})
                  </Link>
                </h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-700">
                  <li>
                    <Link href={`/${svc.slug}/new-york`} className="hover:text-[#DA5F2F] hover:underline">
                      {svc.companyLabel} Companies in New York
                    </Link>
                  </li>
                  <li>
                    <Link href={`/${svc.slug}/new-york-city-ny`} className="hover:text-[#DA5F2F] hover:underline">
                      Best {svc.companyLabel} Companies in New York City
                    </Link>
                  </li>
                  {TRACKER_NYC_BOROUGHS.map((b) => (
                    <li key={b.slug}>
                      <Link href={`/${svc.slug}/${b.slug}`} className="hover:text-[#DA5F2F] hover:underline">
                        Best {svc.companyLabel} Companies in {b.name}, NY
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* 3. Live Verified Company Profiles */}
        {providers.length > 0 && (
          <section className="space-y-4 pt-4 border-t border-gray-200">
            <h2 className="text-base font-extrabold uppercase tracking-wider text-[#0F3E35]">
              Verified Company Profiles ({providers.length})
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-sm text-gray-700">
              {providers.map((p) => (
                <li key={p.id} className="truncate">
                  <Link
                    href={getCompanyUrl(p.slug)}
                    className="hover:text-[#DA5F2F] hover:underline"
                  >
                    {p.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 4. Published Blog Guides */}
        {blogs.length > 0 && (
          <section className="space-y-4 pt-4 border-t border-gray-200">
            <h2 className="text-base font-extrabold uppercase tracking-wider text-[#0F3E35]">
              Guides &amp; Articles ({blogs.length})
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm text-gray-700">
              {blogs.map((post) => (
                <li key={post.id} className="truncate">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="hover:text-[#DA5F2F] hover:underline"
                  >
                    {post.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
