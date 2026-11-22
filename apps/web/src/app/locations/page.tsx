import type { Metadata } from 'next';
import Link from 'next/link';
import { Header, Footer } from '@/components/common';
import {
  TRACKER_NYC_BOROUGHS,
  TRACKER_STATES,
} from '@/data/geoTrackerLocations';
import {
  SITE_BASE_URL,
  buildBreadcrumbJsonLd,
  getCitiesForState,
  getLiveServices,
} from '@/lib/seo-urls';
import { ArrowRight, CheckCircle2, Clock, MapPin } from 'lucide-react';

export const metadata: Metadata = {
  title: 'All Locations: Browse Verified Local Contractors by State & City | ProsVetted',
  description:
    'Browse all live states, cities, and NYC boroughs on ProsVetted. Find hand-researched local contractors in New York City and upcoming U.S. markets.',
  alternates: {
    canonical: `${SITE_BASE_URL}/locations`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function AllLocationsPage() {
  const liveServices = getLiveServices();
  const nyCities = getCitiesForState('new-york');
  const sortedStates = [...TRACKER_STATES].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'All Locations', href: '/locations' },
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
            <span className="text-[#0F3E35] font-bold">All Locations</span>
          </nav>

          <div className="max-w-3xl space-y-3">
            <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-black text-gray-950 tracking-tight leading-[1.1]">
              All Locations
            </h1>
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
              Find vetted home improvement companies by state, city, and borough. We are currently live across New York City&apos;s five boroughs and expanding to major U.S. metro areas.
            </p>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 w-full flex-1 space-y-12">
        {/* 1. Live Markets: New York & NYC 5 Boroughs across Live Services */}
        <section className="space-y-5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EBF7F2] text-[#0B3B2C] border border-[#0B3B2C]/15 text-xs font-bold mb-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Live Coverage</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-950 tracking-tight">
              New York &amp; New York City Boroughs
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {liveServices.map((svc) => (
              <div
                key={svc.slug}
                className="bg-white rounded-2xl border border-gray-200/90 p-6 shadow-xs space-y-4"
              >
                <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-3.5">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F3E35]">
                      {svc.name}
                    </span>
                    <h3 className="text-lg font-extrabold text-gray-950">
                      {svc.companyLabel} Companies in New York
                    </h3>
                  </div>
                  <Link
                    href={`/${svc.slug}/new-york`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#DA5F2F] hover:underline shrink-0"
                  >
                    <span>NY State Hub</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* NYC + 5 Boroughs */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <Link
                    href={`/${svc.slug}/new-york-city-ny`}
                    className="px-3 py-2 rounded-xl bg-[#EBF7F2] text-[#0B3B2C] border border-[#0B3B2C]/15 text-xs font-bold hover:bg-[#dcf0e7] transition-colors flex items-center justify-between"
                  >
                    <span>New York City</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                  {TRACKER_NYC_BOROUGHS.map((b) => (
                    <Link
                      key={b.slug}
                      href={`/${svc.slug}/${b.slug}`}
                      className="px-3 py-2 rounded-xl bg-gray-50 hover:bg-[#EBF7F2] text-gray-800 hover:text-[#0B3B2C] border border-gray-200/80 text-xs font-semibold transition-colors flex items-center justify-between"
                    >
                      <span>{b.name}</span>
                      <ArrowRight className="w-3 h-3 opacity-60" />
                    </Link>
                  ))}
                </div>

                {/* Other NY Cities */}
                <div className="pt-2 border-t border-gray-100">
                  <span className="text-[11px] font-semibold text-gray-500 block mb-2">
                    Upcoming New York Cities:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {nyCities
                      .filter((c) => c.slug !== 'new-york-city-ny')
                      .map((c) => (
                        <Link
                          key={c.slug}
                          href={`/${svc.slug}/${c.slug}`}
                          className="text-xs px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-colors"
                        >
                          {c.name}, NY
                        </Link>
                      ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 2. U.S. States Directory (50 States + DC) */}
        <section className="space-y-5 pt-4 border-t border-gray-200/80">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold mb-1">
              <Clock className="w-3.5 h-3.5" />
              <span>National Rollout</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-950 tracking-tight">
              Browse by U.S. State &amp; Territory
            </h2>
            <p className="text-xs sm:text-sm text-gray-600">
              Select a state to view live listings or get notified when ProsVetted launches verified directories in your region.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
            {sortedStates.map((st) => {
              const cityCount = getCitiesForState(st.slug).length;
              return (
                <Link
                  key={st.slug}
                  href={`/custom-cabinets/${st.slug}`}
                  className={`rounded-xl border p-3.5 transition-all flex flex-col justify-between gap-1.5 ${
                    st.isLive
                      ? 'bg-[#EBF7F2] border-[#0B3B2C]/25 hover:border-[#0B3B2C]'
                      : 'bg-white border-gray-200/90 hover:border-gray-300 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-xs sm:text-sm font-bold text-gray-950 truncate">
                      {st.name}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        st.isLive
                          ? 'bg-[#0B3B2C] text-white'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {st.isLive ? 'LIVE' : st.code}
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span>
                      {st.slug === 'washington-dc'
                        ? 'Metro District'
                        : `${cityCount} tracked ${cityCount === 1 ? 'city' : 'cities'}`}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
