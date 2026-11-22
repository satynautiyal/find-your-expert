import type { Metadata } from 'next';
import Link from 'next/link';
import { Header, Footer } from '@/components/common';
import {
  SERVICES_REGISTRY,
  SITE_BASE_URL,
  buildBreadcrumbJsonLd,
  type ServiceCategoryGroup,
} from '@/lib/seo-urls';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Layers,
  MapPin,
  ShieldCheck,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'All Home Services: Find & Compare Verified Pros | ProsVetted',
  description:
    'Browse all live home improvement and contracting services on ProsVetted. Compare vetted local companies, verified reviews, and typical project budgets.',
  alternates: {
    canonical: `${SITE_BASE_URL}/services`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

const CATEGORY_ORDER: ServiceCategoryGroup[] = [
  'Kitchen, Bath & Cabinetry',
  'Exterior, Roofing & Structures',
  'Remodeling & Additions',
  'Flooring, Painting & Surfaces',
  'Systems, Outdoor & Essential Trades',
];

export default function AllServicesPage() {
  const liveServices = SERVICES_REGISTRY.filter((s) => s.isLive);
  const upcomingByGroup = CATEGORY_ORDER.map((group) => ({
    group,
    items: SERVICES_REGISTRY.filter((s) => !s.isLive && s.categoryGroup === group),
  })).filter((g) => g.items.length > 0);

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'All Services', href: '/services' },
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

      {/* Hero Header */}
      <section className="bg-[#FAFBF9] border-b border-gray-200/80 py-10 sm:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-xs text-gray-500 mb-3 font-medium"
          >
            <Link href="/" className="hover:text-[#0F3E35] transition-colors">
              Home
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-[#0F3E35] font-bold">All Services</span>
          </nav>

          <div className="max-w-3xl space-y-3">
            <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-black text-gray-950 tracking-tight leading-[1.1]">
              All Home Services
            </h1>
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
              Explore ProsVetted&apos;s hand-researched contractor directories. Every live service category features verified business profiles, cross-platform review analysis, and transparent local pricing benchmarks.
            </p>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 w-full flex-1 space-y-12">
        {/* 1. Live Services Section (Primary at Launch) */}
        <section className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EBF7F2] text-[#0B3B2C] border border-[#0B3B2C]/15 text-xs font-bold mb-2">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Live Verified Directories</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-950 tracking-tight">
                Available Now on ProsVetted
              </h2>
            </div>
            <Link
              href="/how-we-research"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F3E35] hover:underline"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>How We Research Companies</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {liveServices.map((svc) => (
              <div
                key={svc.slug}
                className="bg-white rounded-2xl border border-gray-200/90 hover:border-[#0F3E35]/40 p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-5"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F3E35] bg-[#EBF7F2] px-2.5 py-0.5 rounded-md">
                      {svc.categoryGroup}
                    </span>
                    <span className="text-xs font-semibold text-emerald-700 inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      Live in NYC (5 Boroughs)
                    </span>
                  </div>

                  <Link
                    href={`/${svc.slug}`}
                    className="block text-xl sm:text-2xl font-extrabold text-gray-950 hover:text-[#DA5F2F] transition-colors"
                  >
                    {svc.name}
                  </Link>

                  <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                    Typical U.S. project budget: <strong className="text-gray-900">{svc.typicalBudget}</strong>
                  </p>
                </div>

                <div className="pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <Link
                      href={`/${svc.slug}/new-york-city-ny`}
                      className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium transition-colors"
                    >
                      New York City
                    </Link>
                    <Link
                      href={`/${svc.slug}/brooklyn-ny`}
                      className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium transition-colors"
                    >
                      Brooklyn
                    </Link>
                    <Link
                      href={`/${svc.slug}/queens-ny`}
                      className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium transition-colors"
                    >
                      Queens
                    </Link>
                    <Link
                      href={`/${svc.slug}/manhattan-ny`}
                      className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium transition-colors"
                    >
                      Manhattan
                    </Link>
                  </div>

                  <Link
                    href={`/${svc.slug}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-[#0F3E35] hover:bg-[#0A2C25] px-4 py-2 rounded-xl transition-colors"
                  >
                    <span>Explore Hub</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 2. Upcoming Services Grouped by Category */}
        <section className="space-y-6 pt-4 border-t border-gray-200/80">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold mb-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Research Roadmap</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-950 tracking-tight">
              Upcoming Home Service Categories
            </h2>
            <p className="text-xs sm:text-sm text-gray-600">
              Select any upcoming category to see typical U.S. project budgets and sign up for launch alerts.
            </p>
          </div>

          <div className="space-y-8">
            {upcomingByGroup.map(({ group, items }) => (
              <div key={group} className="space-y-3">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-gray-700 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#0F3E35]" />
                  <span>{group}</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map((svc) => (
                    <Link
                      key={svc.slug}
                      href={`/${svc.slug}`}
                      className="bg-white rounded-xl border border-gray-200/85 hover:border-[#0F3E35]/40 p-4 flex items-center justify-between gap-3 transition-all group shadow-2xs"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-gray-900 group-hover:text-[#0F3E35] truncate">
                          {svc.name}
                        </div>
                        <div className="text-[11px] text-gray-500 truncate mt-0.5">
                          {svc.typicalBudget}
                        </div>
                      </div>
                      <span className="text-[10.5px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md shrink-0">
                        Soon
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
