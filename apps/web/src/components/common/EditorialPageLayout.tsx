import type { ReactNode } from 'react';
import Link from 'next/link';
import { Header, Footer } from '@/components/common';
import { buildBreadcrumbJsonLd, type BreadcrumbItem } from '@/lib/seo-urls';
import { FileText, ShieldCheck } from 'lucide-react';

export interface EditorialPageLayoutProps {
  badge: string;
  title: string;
  subtitle: string;
  lastUpdated?: string;
  currentPath: string;
  breadcrumbs: BreadcrumbItem[];
  children: ReactNode;
}

const TRUST_NAV_LINKS = [
  { label: 'About Us', href: '/about' },
  { label: 'How We Research Companies', href: '/how-we-research' },
  { label: 'Editorial Policy', href: '/editorial-policy' },
  { label: 'Advertising Disclosure', href: '/advertising-disclosure' },
  { label: 'Corrections & Updates', href: '/corrections' },
  { label: 'Contact Us', href: '/contact' },
  { label: 'For Businesses', href: '/for-businesses' },
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Terms of Use', href: '/terms' },
  { label: 'Cookie Policy', href: '/cookie-policy' },
];

export default function EditorialPageLayout({
  badge,
  title,
  subtitle,
  lastUpdated = 'November 2026',
  currentPath,
  breadcrumbs,
  children,
}: EditorialPageLayoutProps) {
  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-950 flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildBreadcrumbJsonLd(breadcrumbs)),
        }}
      />

      <Header />

      {/* Editorial Hero */}
      <section className="bg-[#FAFBF9] border-b border-gray-200/80 py-10 sm:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center flex-wrap gap-1.5 text-xs text-gray-500 mb-3.5 font-medium"
          >
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <span key={crumb.href} className="inline-flex items-center gap-1.5">
                  {idx > 0 && <span className="text-gray-300">/</span>}
                  {isLast ? (
                    <span className="text-[#0F3E35] font-bold">{crumb.label}</span>
                  ) : (
                    <Link href={crumb.href} className="hover:text-[#0F3E35] transition-colors">
                      {crumb.label}
                    </Link>
                  )}
                </span>
              );
            })}
          </nav>

          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EBF7F2] text-[#0B3B2C] border border-[#0B3B2C]/15 text-xs font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{badge}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-gray-950 tracking-tight leading-[1.12]">
              {title}
            </h1>

            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
              {subtitle}
            </p>

            {lastUpdated && (
              <p className="text-xs text-gray-400 font-medium pt-1">
                Last reviewed: {lastUpdated}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Main Content + Sidebar */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 w-full flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Article Body */}
          <article className="lg:col-span-8 bg-white rounded-2xl border border-gray-200/90 p-6 sm:p-9 shadow-2xs space-y-6 text-sm sm:text-[15px] text-gray-700 leading-relaxed">
            {children}
          </article>

          {/* Sticky Trust & Legal Navigation Sidebar */}
          <aside className="lg:col-span-4 lg:sticky lg:top-24 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#0F3E35] border-b border-gray-100 pb-2.5">
                <FileText className="w-4 h-4" />
                <span>Trust, Policies &amp; Legal</span>
              </div>
              <nav aria-label="Trust and policy pages" className="space-y-1">
                {TRUST_NAV_LINKS.map((item) => {
                  const active = item.href === currentPath;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`block px-3 py-2 rounded-xl text-xs sm:text-[13px] font-semibold transition-colors ${
                        active
                          ? 'bg-[#EBF7F2] text-[#0B3B2C] font-bold'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-950'
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
