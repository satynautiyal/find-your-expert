import type { RooferProvider } from '@/data/mockRoofers';

export interface GetProvidersParams {
  search?: string;
  borough?: string;
  service?: string;
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

/**
 * Robust URL builder for API requests (works in client, SSR, with full or relative URLs)
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
    fullUrl = `${envUrl.replace(/\/+$/, '')}/${cleanEndpoint}`;
  } else if (typeof window !== 'undefined') {
    // 2. In browser: use same-origin /api rewrite
    fullUrl = `${window.location.origin}/api/${cleanEndpoint}`;
  } else {
    // 3. Server-side fallback: directly to backend port 4000
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

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store', // Always fetch fresh database records
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const json: ApiResponse<PaginatedProvidersResponse> = await response.json();
  if (!json.success || !json.data) {
    throw new Error(json.error || 'Invalid response from providers API');
  }

  return json.data;
}

/**
 * Fetch dynamic filter categories and live aggregates from database
 */
export async function fetchProviderFilters(): Promise<ProviderFiltersResponse> {
  const url = buildApiUrl('providers/filters');

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch filter options: ${response.status}`);
  }

  const json: ApiResponse<ProviderFiltersResponse> = await response.json();
  if (!json.success || !json.data) {
    throw new Error(json.error || 'Invalid filter response from API');
  }

  return json.data;
}

/**
 * Fetch a single provider by slug directly from database
 */
export async function fetchProviderBySlug(slug: string): Promise<RooferProvider> {
  const url = buildApiUrl(`providers/${encodeURIComponent(slug)}`);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
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
}

export interface ScrapedReviewItemDto {
  authorName: string;
  authorAvatarUrl?: string;
  rating: number;
  comment: string;
  reviewDate?: string;
  platform: 'GOOGLE' | 'YELP' | 'FACEBOOK';
  sourceUrl?: string;
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
      facebook?: { rating: number; totalReviews: number; reviews: ScrapedReviewItemDto[] };
    };
    allReviews: ScrapedReviewItemDto[];
  };
}

/**
 * Trigger live reviews scrape & sync from Google, Yelp and Facebook
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

  return json.data;
}
