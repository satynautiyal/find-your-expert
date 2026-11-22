import Link from 'next/link';
import { Header, Footer } from '@/components/common';
import { ArrowRight, Compass, Search } from 'lucide-react';

/**
 * Sheet 1 Row 8: Custom 404 page with search bar and top links.
 * Rendered via Next.js `not-found.tsx`, returning a real HTTP 404 status + `noindex`.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-950 flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 py-16 sm:py-24">
        <div className="max-w-xl w-full bg-white rounded-3xl border border-gray-200/90 p-7 sm:p-11 text-center shadow-sm space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EBF7F2] text-[#0B3B2C] border border-[#0B3B2C]/15 text-xs font-extrabold uppercase tracking-wider">
            <Compass className="w-3.5 h-3.5" />
            <span>Error 404</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-4xl font-black text-gray-950 tracking-tight">
              Page Not Found
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed max-w-md mx-auto">
              We couldn&apos;t find the page you were looking for. It may have moved to a new URL, or you can search verified local companies below.
            </p>
          </div>

          {/* Direct Search Form -> `/search` */}
          <form
            action="/search"
            method="GET"
            className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                name="q"
                required
                placeholder="Search service or company name..."
                className="w-full text-xs sm:text-sm pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0F3E35]/20 focus:border-[#0F3E35]"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#0F3E35] hover:bg-[#0A2C25] text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer shrink-0"
            >
              Search
            </button>
          </form>

          {/* Top Helpful Links */}
          <div className="pt-4 border-t border-gray-100 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
              Popular Destinations
            </span>
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-semibold">
              <Link
                href="/"
                className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 transition-colors"
              >
                Homepage
              </Link>
              <Link
                href="/services"
                className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 transition-colors"
              >
                All Services
              </Link>
              <Link
                href="/locations"
                className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 transition-colors"
              >
                All Locations
              </Link>
              <Link
                href="/custom-cabinets/new-york-city-ny"
                className="px-3.5 py-2 rounded-xl bg-[#EBF7F2] hover:bg-[#dcf0e7] text-[#0B3B2C] inline-flex items-center gap-1 transition-colors"
              >
                <span>NYC Custom Cabinets</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
              <Link
                href="/roofing/new-york-city-ny"
                className="px-3.5 py-2 rounded-xl bg-[#EBF7F2] hover:bg-[#dcf0e7] text-[#0B3B2C] inline-flex items-center gap-1 transition-colors"
              >
                <span>NYC Roofing</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
              <Link
                href="/blog"
                className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 transition-colors"
              >
                Guides &amp; Blog
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
