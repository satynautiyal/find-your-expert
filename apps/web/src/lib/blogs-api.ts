import type {
  BlogPost,
  CreateBlogPostInput,
  UpdateBlogPostInput,
  GetBlogsQueryInput,
  PaginatedBlogsResponse,
  BlogCategoryCount,
} from '@repo/types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// IN-FLIGHT DEDUPLICATION + BOUNDED TTL CACHE (DRY CLIENT + SSR)
// ═══════════════════════════════════════════════════════════════════════════

const BLOG_CLIENT_CACHE_TTL_MS = 90_000;
const BLOG_SSR_CACHE_TTL_MS = 30_000;
const ADMIN_CLIENT_CACHE_TTL_MS = 20_000;

const blogMemoryCache = new Map<string, { data: unknown; expiresAt: number }>();
const blogInFlight = new Map<string, Promise<unknown>>();

function cachedBlogRequest<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  customTtlMs?: number
): Promise<T> {
  const now = Date.now();
  const cached = blogMemoryCache.get(cacheKey);
  if (cached && now < cached.expiresAt) {
    return Promise.resolve(cached.data as T);
  }

  const existing = blogInFlight.get(cacheKey);
  if (existing) {
    return existing as Promise<T>;
  }

  const ttl =
    customTtlMs ??
    (typeof window !== 'undefined'
      ? BLOG_CLIENT_CACHE_TTL_MS
      : BLOG_SSR_CACHE_TTL_MS);

  const promise = fetcher()
    .then((res) => {
      if (blogMemoryCache.size >= 200 && !blogMemoryCache.has(cacheKey)) {
        const oldest = blogMemoryCache.keys().next().value;
        if (oldest !== undefined) blogMemoryCache.delete(oldest);
      }
      blogMemoryCache.set(cacheKey, { data: res, expiresAt: Date.now() + ttl });
      return res;
    })
    .finally(() => {
      blogInFlight.delete(cacheKey);
    });

  blogInFlight.set(cacheKey, promise);
  return promise;
}

export function invalidateBlogsCache(): void {
  blogMemoryCache.clear();
}

/**
 * Unified API URL builder:
 * - In browser: uses same-origin `/api/...` Next.js rewrite in development (eliminates
 *   cross-origin `localhost` vs `127.0.0.1` mismatches & CORS `OPTIONS` preflights).
 * - On server (SSR): connects directly to `localhost:4000/api/...` (or production API).
 */
function buildApiUrl(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined>
): string {
  const cleanEndpoint = endpoint.replace(/^\/+/, '');
  let fullUrl: string;

  if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    fullUrl = `${window.location.origin}/api/${cleanEndpoint}`;
  } else {
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envUrl && (envUrl.startsWith('http://') || envUrl.startsWith('https://'))) {
      const normalizedEnv = envUrl
        .replace(/\/+$/, '')
        .replace('://127.0.0.1:4000', '://localhost:4000');
      fullUrl = `${normalizedEnv}/${cleanEndpoint}`;
    } else if (process.env.NODE_ENV === 'production') {
      fullUrl = `https://api.prosvetted.com/api/${cleanEndpoint}`;
    } else {
      fullUrl = `http://localhost:4000/api/${cleanEndpoint}`;
    }
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
 * DRY JSON fetch wrapper with Next.js ISR support for public SSR reads
 * and zero unnecessary CORS-preflight headers on GET requests.
 */
async function fetchBlogApiJson<T>(
  url: string,
  options: { revalidateSeconds?: number; init?: RequestInit } = {}
): Promise<T> {
  const isServer = typeof window === 'undefined';
  const fetchInit: RequestInit = {
    method: 'GET',
    headers: { Accept: 'application/json' },
    ...options.init,
  };

  if (isServer && options.revalidateSeconds !== undefined) {
    fetchInit.next = { revalidate: options.revalidateSeconds };
  } else if (!options.init?.cache && options.revalidateSeconds === undefined) {
    fetchInit.cache = 'no-store';
  }

  const response = await fetch(url, fetchInit);
  if (!response.ok) {
    const errBody = await response.json().catch(() => null);
    const msg = Array.isArray(errBody?.message)
      ? errBody.message.join(', ')
      : errBody?.message || errBody?.error;
    throw new Error(msg || `Blog API error (HTTP ${response.status})`);
  }

  const json: ApiResponse<T> = await response.json();
  if (!json.success) {
    throw new Error(json.error || json.message || 'Invalid blogs API response');
  }
  return json.data;
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC READ ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

export async function fetchBlogs(
  params: GetBlogsQueryInput = {}
): Promise<PaginatedBlogsResponse> {
  const queryParams: Record<string, string | number | boolean | undefined> = {
    page: params.page || 1,
    limit: params.limit || 9,
    status: 'PUBLISHED',
  };

  if (params.search?.trim()) queryParams.search = params.search.trim();
  if (params.category && params.category !== 'All') {
    queryParams.category = params.category;
  }
  if (params.tag) queryParams.tag = params.tag;
  if (params.sortBy) queryParams.sortBy = params.sortBy;
  if (params.sortOrder) queryParams.sortOrder = params.sortOrder;

  const url = buildApiUrl('blogs', queryParams);
  return cachedBlogRequest(`blogs:list:${url}`, () =>
    fetchBlogApiJson<PaginatedBlogsResponse>(url, { revalidateSeconds: 60 })
  );
}

export async function fetchFeaturedBlog(): Promise<BlogPost | null> {
  return cachedBlogRequest('blogs:featured', async () => {
    try {
      const url = buildApiUrl('blogs/featured');
      return await fetchBlogApiJson<BlogPost | null>(url, { revalidateSeconds: 60 });
    } catch {
      return null;
    }
  });
}

export async function fetchBlogCategories(): Promise<BlogCategoryCount[]> {
  return cachedBlogRequest('blogs:categories', async () => {
    try {
      const url = buildApiUrl('blogs/categories');
      const data = await fetchBlogApiJson<BlogCategoryCount[]>(url, {
        revalidateSeconds: 120,
      });
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  });
}

export async function fetchBlogBySlug(
  slug: string
): Promise<{ blog: BlogPost; relatedPosts: BlogPost[] }> {
  const url = buildApiUrl(`blogs/${encodeURIComponent(slug)}`);
  return cachedBlogRequest(`blogs:slug:${slug}`, () =>
    fetchBlogApiJson<{ blog: BlogPost; relatedPosts: BlogPost[] }>(url, {
      revalidateSeconds: 60,
    })
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN CMS ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

export async function fetchAdminBlogs(
  params: GetBlogsQueryInput = {}
): Promise<PaginatedBlogsResponse> {
  const queryParams: Record<string, string | number | boolean | undefined> = {
    page: params.page || 1,
    limit: params.limit || 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  };

  if (params.search?.trim()) queryParams.search = params.search.trim();
  if (params.status) queryParams.status = params.status;
  if (params.category && params.category !== 'All') {
    queryParams.category = params.category;
  }

  const url = buildApiUrl('blogs/admin/all', queryParams);
  return cachedBlogRequest(
    `blogs:admin:list:${url}`,
    () => fetchBlogApiJson<PaginatedBlogsResponse>(url),
    ADMIN_CLIENT_CACHE_TTL_MS
  );
}

export async function fetchAdminBlogById(id: string): Promise<BlogPost> {
  const url = buildApiUrl(`blogs/admin/post/${encodeURIComponent(id)}`);
  return fetchBlogApiJson<BlogPost>(url);
}

export async function createAdminBlog(
  payload: CreateBlogPostInput
): Promise<BlogPost> {
  const url = buildApiUrl('blogs/admin');
  const data = await fetchBlogApiJson<BlogPost>(url, {
    init: {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  });
  invalidateBlogsCache();
  return data;
}

export async function updateAdminBlog(
  id: string,
  payload: UpdateBlogPostInput
): Promise<BlogPost> {
  const url = buildApiUrl(`blogs/admin/${encodeURIComponent(id)}`);
  const data = await fetchBlogApiJson<BlogPost>(url, {
    init: {
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  });
  invalidateBlogsCache();
  return data;
}

export async function deleteAdminBlog(id: string): Promise<boolean> {
  const url = buildApiUrl(`blogs/admin/${encodeURIComponent(id)}`);
  await fetchBlogApiJson<unknown>(url, {
    init: { method: 'DELETE' },
  });
  invalidateBlogsCache();
  return true;
}

/**
 * Uploads an image to Cloudflare R2 via `/api/storage/upload` and returns an
 * immediately displayable URL (backend automatically persists clean storage keys on save).
 */
export async function uploadImageToStorage(
  file: File,
  folder = 'blog-images'
): Promise<string> {
  const MAX_BYTES = 10 * 1024 * 1024;
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files can be uploaded');
  }
  if (file.size > MAX_BYTES) {
    throw new Error(
      `Image is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max is 10 MB.`
    );
  }

  const form = new FormData();
  form.append('file', file);
  form.append('folder', folder);

  const response = await fetch(buildApiUrl('storage/upload'), {
    method: 'POST',
    body: form,
  });

  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.success || !json?.data?.url) {
    const msg = Array.isArray(json?.message)
      ? json.message.join(', ')
      : json?.message;
    throw new Error(msg || `Image upload failed (HTTP ${response.status})`);
  }

  return json.data.url as string;
}
