import type { RooferProvider } from '@/data/mockRoofers';

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
  } else if (process.env.NODE_ENV === 'production') {
    fullUrl = `https://api.prosvetted.com/api/${cleanEndpoint}`;
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
  providerCount: number;
  image: string;
  subServices: Array<{
    id: string;
    name: string;
    slug: string;
    isPopular: boolean;
  }>;
}

import { getCategoryImage } from './category-images';

export const DEFAULT_CATEGORIES: CategoryItem[] = [
  {
    id: 'cat_custom_cabinets_nyc',
    name: 'Custom Cabinets',
    slug: 'custom-cabinets',
    description: 'Bespoke kitchen cabinetry, built-in shelving, and architectural woodwork.',
    providerCount: 10,
    image: getCategoryImage('custom-cabinets'),
    subServices: [
      { id: 'sub_cab_custom_cabinets', name: 'Custom Cabinets', slug: 'custom-cabinets', isPopular: true },
      { id: 'sub_cab_kitchen_cabinets', name: 'Kitchen Cabinetry', slug: 'kitchen-cabinetry', isPopular: true },
      { id: 'sub_cab_bathroom_vanities', name: 'Bathroom Vanities', slug: 'bathroom-vanities', isPopular: true },
      { id: 'sub_cab_builtin_shelving', name: 'Built-In Shelving', slug: 'built-in-shelving', isPopular: true },
    ],
  },
  {
    id: '420f19bd-8420-4c96-b42c-054a5217ab79',
    name: 'Roofing',
    slug: 'roofing',
    description: 'Residential and commercial roof repair, replacement, and inspection.',
    providerCount: 14,
    image: getCategoryImage('roofing'),
    subServices: [
      { id: '287f836c-fa8e-4405-a5c7-3ee3e8616dbf', name: 'Roof Installation', slug: 'roof-installation', isPopular: true },
      { id: '3dee85de-69a7-4f32-8367-7d9a1902f036', name: 'Repair', slug: 'roof-repair', isPopular: true },
      { id: '0c1bd803-ff9b-428b-8648-f1c8f30666b9', name: 'Waterproofing', slug: 'waterproofing', isPopular: true },
    ],
  },
  {
    id: 'cat_kitchen_remodeling',
    name: 'Kitchen Remodeling',
    slug: 'kitchen-remodeling',
    description: 'Full kitchen transformations, islands, pantries, and backsplashes.',
    providerCount: 12,
    image: getCategoryImage('kitchen-remodeling'),
    subServices: [],
  },
  {
    id: 'cat_bathroom_remodeling',
    name: 'Bathroom Remodeling',
    slug: 'bathroom-remodeling',
    description: 'Custom vanities, glass showers, soaking tubs, and modern tile work.',
    providerCount: 10,
    image: getCategoryImage('bathroom-remodeling'),
    subServices: [],
  },
  {
    id: 'cat_countertops',
    name: 'Countertops',
    slug: 'countertops',
    description: 'Quartz, granite, marble, and butcher block installation and fabrication.',
    providerCount: 8,
    image: getCategoryImage('countertops'),
    subServices: [],
  },
  {
    id: 'cat_builtin_shelving',
    name: 'Built-In Shelving',
    slug: 'built-in-shelving',
    description: 'Custom wall-to-wall bookcases, media centers, and alcove shelving.',
    providerCount: 10,
    image: getCategoryImage('built-in-shelving'),
    subServices: [],
  },
  {
    id: 'cat_hvac',
    name: 'HVAC',
    slug: 'hvac',
    description: 'Heating, ventilation, air conditioning repair, and mini-split installations.',
    providerCount: 12,
    image: getCategoryImage('hvac'),
    subServices: [],
  },
  {
    id: 'cat_flooring',
    name: 'Flooring',
    slug: 'flooring',
    description: 'Hardwood installation, refinishing, luxury vinyl plank, and tile.',
    providerCount: 9,
    image: getCategoryImage('flooring'),
    subServices: [],
  },
  {
    id: 'cat_windows_doors',
    name: 'Windows & Doors',
    slug: 'windows-doors',
    description: 'Energy-efficient window replacements, sliding patio doors, and entryways.',
    providerCount: 11,
    image: getCategoryImage('windows-doors'),
    subServices: [],
  },
  {
    id: 'cat_painting',
    name: 'Painting',
    slug: 'painting',
    description: 'Interior and exterior painting, decorative finishes, and skim coating.',
    providerCount: 15,
    image: getCategoryImage('painting'),
    subServices: [],
  },
];

/**
 * Fetch all categories dynamically with provider counts and resolved images
 */
export async function fetchCategories(): Promise<CategoryItem[]> {
  try {
    const url = buildApiUrl('categories');
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Try providers/categories route fallback
      const fallbackUrl = buildApiUrl('providers/categories');
      const fallbackRes = await fetch(fallbackUrl);
      if (!fallbackRes.ok) throw new Error(`HTTP ${response.status}`);
      const json = await fallbackRes.json();
      const items: any[] = json.data || [];
      if (items.length === 0) return DEFAULT_CATEGORIES;
      return items.map((cat) => ({
        ...cat,
        image: getCategoryImage(cat.slug || cat.name),
      }));
    }

    const json: ApiResponse<any[]> = await response.json();
    const items: any[] = json.data || [];
    if (items.length === 0) return DEFAULT_CATEGORIES;

    // Merge dynamic categories with defaults if DB has only a few categories
    const dynamicSlugs = new Set(items.map((c) => c.slug));
    const merged = [
      ...items.map((cat) => ({
        ...cat,
        image: getCategoryImage(cat.slug || cat.name),
      })),
      ...DEFAULT_CATEGORIES.filter((def) => !dynamicSlugs.has(def.slug)),
    ];

    return merged;
  } catch (err) {
    console.warn('Falling back to default categories list:', err);
    return DEFAULT_CATEGORIES;
  }
}

