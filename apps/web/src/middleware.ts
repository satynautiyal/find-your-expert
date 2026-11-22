import { NextResponse, type NextRequest } from 'next/server';
import {
  LEGACY_QUERY_REDIRECTS_ENABLED,
  resolveLegacyContractorsQueryToUrl,
} from '@/lib/seo-urls';

export function middleware(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;

  // 1. Canonical lowercase enforcement for public SEO URLs
  // e.g. `/Custom-Cabinets/Brooklyn-NY` -> 308 `/custom-cabinets/brooklyn-ny`
  if (pathname !== pathname.toLowerCase() && !pathname.startsWith('/admin')) {
    const lowerUrl = request.nextUrl.clone();
    lowerUrl.pathname = pathname.toLowerCase();
    return NextResponse.redirect(lowerUrl, 308);
  }

  // 2. Legacy `/contractors?category=...&state=...&borough=...` -> clean SEO URLs
  // Enabled once `app/[service]` and `app/[service]/[location]` land in Phase 2.
  if (LEGACY_QUERY_REDIRECTS_ENABLED && pathname === '/contractors' && search) {
    const target = resolveLegacyContractorsQueryToUrl(searchParams);
    if (target) {
      const destUrl = new URL(target, request.url);
      return NextResponse.redirect(destUrl, 308);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all public page routes while skipping:
     * - `/api/*` backend proxy
     * - `/_next/*` static chunks & images
     * - static files in `public/` (with file extensions)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)',
  ],
};
