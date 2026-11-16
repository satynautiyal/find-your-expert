import type { RooferProvider } from '@/data/mockRoofers';
import { getMediaUrl } from './media-url';

export interface GetProvidersParams {
  search?: string;
  borough?: string;
  service?: string;
  category?: string;
  sortBy?: 'rating' | 'reviews' | 'experience';
  page?: number;
  limit?: number;
}

export interface PaginatedProvidersResponse {
  items: RooferProvider[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProviderFiltersResponse {
  boroughs: string[];
  services: string[];
  categories?: CategoryItem[];
  stats: {
    totalProviders: number;
    avgRating: number;
    totalReviews: number;
  };
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// IN-FLIGHT PROMISE DEDUPLICATION + BOUNDED TTL CLIENT CACHE
// Eliminates duplicate bursts across Header, Footer, Page & React StrictMode
// ═══════════════════════════════════════════════════════════════════════════

const CLIENT_CACHE_TTL_MS = 60_000; // 60s in browser
const SSR_CACHE_TTL_MS = 15_000; // 15s on server
const MAX_CLIENT_CACHE_ENTRIES = 200;

const memoryCache = new Map<string, { data: unknown; expiresAt: number }>();
const inFlightRequests = new Map<string, Promise<unknown>>();

function getCacheTtl(): number {
  return typeof window !== 'undefined' ? CLIENT_CACHE_TTL_MS : SSR_CACHE_TTL_MS;
}

function setMemoryCache<T>(key: string, data: T, ttlMs = getCacheTtl()): void {
  if (memoryCache.size >= MAX_CLIENT_CACHE_ENTRIES && !memoryCache.has(key)) {
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey !== undefined) memoryCache.delete(oldestKey);
  }
  memoryCache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

async function cachedRequest<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  ttlMs = getCacheTtl()
): Promise<T> {
  const now = Date.now();
  const cached = memoryCache.get(cacheKey);
  if (cached && now < cached.expiresAt) {
    return cached.data as T;
  }

  const existing = inFlightRequests.get(cacheKey);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = fetcher()
    .then((result) => {
      setMemoryCache(cacheKey, result, ttlMs);
      return result;
    })
    .finally(() => {
      inFlightRequests.delete(cacheKey);
    });

  inFlightRequests.set(cacheKey, promise);
  return promise;
}

export function invalidateProvidersCache(): void {
  memoryCache.clear();
}

/**
 * Robust URL builder for API requests (works in client, SSR, with full or relative URLs).
 * Normalizes localhost:4000 -> 127.0.0.1:4000 in development to avoid Windows IPv6 ::1 fallback delays.
 */
function buildApiUrl(
  endpoint: string,
  params?: Record<string, string | number | undefined>
): string {
  const cleanEndpoint = endpoint.replace(/^\/+/, '');
  let fullUrl: string;

  // 1. Prefer NEXT_PUBLIC_API_URL if it's an absolute URL
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && (envUrl.startsWith('http://') || envUrl.startsWith('https://'))) {
    const normalizedEnv = envUrl
      .replace(/\/+$/, '')
      .replace('://127.0.0.1:4000', '://localhost:4000');
    fullUrl = `${normalizedEnv}/${cleanEndpoint}`;
  } else if (process.env.NODE_ENV === 'production') {
    fullUrl = `https://api.prosvetted.com/api/${cleanEndpoint}`;
  } else if (typeof window !== 'undefined') {
    // 2. In browser: use same-origin /api rewrite
    fullUrl = `${window.location.origin}/api/${cleanEndpoint}`;
  } else {
    // 3. Server-side fallback: directly to backend localhost:4000
    fullUrl = `http://localhost:4000/api/${cleanEndpoint}`;
  }

  const url = new URL(fullUrl);
  if (params) {
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== '') {
        url.searchParams.set(key, String(val));
      }
    }
  }

  return url.toString();
}

/**
 * Fetch real providers directly from the NestJS backend
 */
export async function fetchProviders(
  params: GetProvidersParams = {}
): Promise<PaginatedProvidersResponse> {
  const queryParams: Record<string, string | number | undefined> = {};

  if (params.search && params.search.trim()) {
    queryParams.search = params.search.trim();
  }
  if (params.borough && params.borough !== 'All') {
    queryParams.borough = params.borough;
  }
  if (params.service && params.service !== 'All Services') {
    queryParams.service = params.service;
  }
  if (params.category && params.category !== 'All' && params.category !== 'All Services') {
    queryParams.category = params.category;
  }
  if (params.sortBy) {
    queryParams.sortBy = params.sortBy;
  }
  if (params.page) {
    queryParams.page = params.page;
  }
  if (params.limit) {
    queryParams.limit = params.limit;
  }

  const url = buildApiUrl('providers', queryParams);

  return cachedRequest(`providers:list:${url}`, async () => {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const json: ApiResponse<PaginatedProvidersResponse> = await response.json();
    if (!json.success || !json.data) {
      throw new Error(json.error || 'Invalid response from providers API');
    }

    return json.data;
  });
}

/**
 * Fetch dynamic filter categories and live aggregates from database
 */
export async function fetchProviderFilters(): Promise<ProviderFiltersResponse> {
  const url = buildApiUrl('providers/filters');

  return cachedRequest('providers:filters', async () => {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch filter options: ${response.status}`);
    }

    const json: ApiResponse<ProviderFiltersResponse> = await response.json();
    if (!json.success || !json.data) {
      throw new Error(json.error || 'Invalid filter response from API');
    }

    // Normalize & cross-seed categories cache so Header/Footer reuse it without an extra network hop
    if (Array.isArray(json.data.categories) && json.data.categories.length > 0) {
      const normalizedCats = normalizeAndSortCategories(json.data.categories);
      json.data.categories = normalizedCats;
      setMemoryCache('providers:categories', normalizedCats);
    }

    return json.data;
  });
}

/**
 * Fetch a single provider by slug directly from database
 */
export async function fetchProviderBySlug(slug: string): Promise<RooferProvider> {
  const url = buildApiUrl(`providers/${encodeURIComponent(slug)}`);

  return cachedRequest(`providers:slug:${slug}`, async () => {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Provider "${slug}" not found (HTTP ${response.status})`);
    }

    const json: ApiResponse<RooferProvider> = await response.json();
    if (!json.success || !json.data) {
      throw new Error(json.error || 'Failed to load provider profile');
    }

    return json.data;
  });
}

export interface ProviderTeamMemberDto {
  id: string;
  name: string;
  role?: string;
  credentials?: string;
  bio?: string;
  photoUrl?: string;
}

export interface ScrapedReviewItemDto {
  authorName: string;
  authorAvatarUrl?: string;
  rating: number;
  comment: string;
  reviewDate?: string;
  platform: 'GOOGLE' | 'YELP' | 'HOMEADVISOR' | 'HOUZZ' | 'FACEBOOK';
  sourceUrl?: string;
  photoUrls?: string[];
}

export interface SyncReviewsResult {
  provider: RooferProvider;
  scrapedSummary: {
    businessName: string;
    scrapedAt: string;
    compositeRating: number;
    totalReviews: number;
    platforms: {
      google?: { rating: number; totalReviews: number; reviews: ScrapedReviewItemDto[] };
      yelp?: { rating: number; totalReviews: number; reviews: ScrapedReviewItemDto[] };
      homeadvisor?: { rating: number; totalReviews: number; reviews: ScrapedReviewItemDto[] };
      houzz?: { rating: number; totalReviews: number; reviews: ScrapedReviewItemDto[] };
      facebook?: { rating: number; totalReviews: number; reviews: ScrapedReviewItemDto[] };
    };
    allReviews: ScrapedReviewItemDto[];
  };
}

/**
 * Trigger live reviews scrape & sync from Google, Yelp, HomeAdvisor and Houzz
 */
export async function syncProviderReviews(slug: string): Promise<SyncReviewsResult> {
  const url = buildApiUrl(`providers/${encodeURIComponent(slug)}/sync-reviews`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to sync reviews: HTTP ${response.status}`);
  }

  const json: ApiResponse<SyncReviewsResult> = await response.json();
  if (!json.success || !json.data) {
    throw new Error(json.error || 'Failed to sync reviews from platforms');
  }

  invalidateProvidersCache();
  return json.data;
}

export interface AiSummaryResult {
  provider: RooferProvider;
  summary: string;
}

/**
 * Trigger progressive AI review analysis chunked by 20 reviews via OpenRouter Mistral
 */
export async function generateAiSummary(slug: string): Promise<AiSummaryResult> {
  const url = buildApiUrl(`providers/${encodeURIComponent(slug)}/generate-ai-summary`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to generate AI summary: HTTP ${response.status}`);
  }

  const json: ApiResponse<AiSummaryResult> = await response.json();
  if (!json.success || !json.data) {
    throw new Error(json.error || 'Failed to generate AI review summary');
  }

  invalidateProvidersCache();
  return json.data;
}

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORIES & SERVICES
// ═══════════════════════════════════════════════════════════════════════════

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  providerCount: number;
  image: string;
  subServices: Array<{
    id: string;
    name: string;
    slug: string;
    isPopular: boolean;
    description?: string | null;
  }>;
  costBenchmarks?: Array<{
    id: string;
    roofType: string;
    footprint?: string | null;
    description?: string | null;
    minCost: number;
    maxCost: number;
  }>;
}

function resolveCategoryImage(cat: any): string {
  if (cat.image) return cat.image;
  if (cat.icon) return getMediaUrl(cat.icon);
  return '';
}

function normalizeAndSortCategories(items: any[]): CategoryItem[] {
  return items
    .map((cat) => ({
      ...cat,
      image: resolveCategoryImage(cat),
    }))
    .sort((a, b) => {
      const aActive = (a.providerCount || 0) > 0 ? 1 : 0;
      const bActive = (b.providerCount || 0) > 0 ? 1 : 0;
      if (bActive !== aActive) return bActive - aActive;
      return a.name.localeCompare(b.name);
    });
}

/**
 * Fetch all categories dynamically from the database with provider counts and resolved images
 */
export async function fetchCategories(): Promise<CategoryItem[]> {
  return cachedRequest('providers:categories', async () => {
    const url = buildApiUrl('categories');
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      const fallbackUrl = buildApiUrl('providers/categories');
      const fallbackRes = await fetch(fallbackUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      if (!fallbackRes.ok) {
        throw new Error(`Failed to fetch categories: HTTP ${response.status}`);
      }
      const json: ApiResponse<any[]> = await fallbackRes.json();
      return normalizeAndSortCategories(json.data || []);
    }

    const json: ApiResponse<any[]> = await response.json();
    return normalizeAndSortCategories(json.data || []);
  });
}

/**
 * Submit a customer quote request to the backend QuoteRequest table
 */
export async function submitQuoteRequest(payload: {
  providerProfileId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  borough?: string;
  zipCode?: string;
  serviceType: string;
  projectNotes?: string;
}) {
  const url = buildApiUrl('providers/quotes');
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to submit quote request: HTTP ${response.status}`);
  }

  const json: ApiResponse<any> = await response.json();
  return json.data;
}

