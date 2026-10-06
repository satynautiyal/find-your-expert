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

/**
 * Robust URL builder for API requests (works in client, SSR, with full or relative URLs)
 */
function buildApiUrl(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined>
): string {
  const cleanEndpoint = endpoint.replace(/^\/+/, '');
  let fullUrl: string;

  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && (envUrl.startsWith('http://') || envUrl.startsWith('https://'))) {
    fullUrl = `${envUrl.replace(/\/+$/, '')}/${cleanEndpoint}`;
  } else if (typeof window !== 'undefined') {
    fullUrl = `${window.location.origin}/api/${cleanEndpoint}`;
  } else {
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
 * Fetch published blogs for the public /blog listing page
 */
export async function fetchBlogs(
  params: GetBlogsQueryInput = {}
): Promise<PaginatedBlogsResponse> {
  const queryParams: Record<string, string | number | boolean | undefined> = {
    page: params.page || 1,
    limit: params.limit || 9,
    status: 'PUBLISHED',
  };

  if (params.search && params.search.trim()) {
    queryParams.search = params.search.trim();
  }
  if (params.category && params.category !== 'All') {
    queryParams.category = params.category;
  }
  if (params.tag) {
    queryParams.tag = params.tag;
  }
  if (params.sortBy) {
    queryParams.sortBy = params.sortBy;
  }
  if (params.sortOrder) {
    queryParams.sortOrder = params.sortOrder;
  }

  const url = buildApiUrl('blogs', queryParams);

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch blogs: ${response.status}`);
  }

  const json: ApiResponse<PaginatedBlogsResponse> = await response.json();
  if (!json.success || !json.data) {
    throw new Error(json.error || 'Invalid blogs API response');
  }

  return json.data;
}

/**
 * Fetch top featured post for the hero banner
 */
export async function fetchFeaturedBlog(): Promise<BlogPost | null> {
  try {
    const url = buildApiUrl('blogs/featured');
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) return null;
    const json: ApiResponse<BlogPost> = await response.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

/**
 * Fetch blog categories with counts
 */
export async function fetchBlogCategories(): Promise<BlogCategoryCount[]> {
  try {
    const url = buildApiUrl('blogs/categories');
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) return [];
    const json: ApiResponse<BlogCategoryCount[]> = await response.json();
    return json.success && Array.isArray(json.data) ? json.data : [];
  } catch {
    return [];
  }
}

/**
 * Fetch a single blog post by slug + related articles
 */
export async function fetchBlogBySlug(
  slug: string
): Promise<{ blog: BlogPost; relatedPosts: BlogPost[] }> {
  const url = buildApiUrl(`blogs/${encodeURIComponent(slug)}`);

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Blog post "${slug}" not found (HTTP ${response.status})`);
  }

  const json: ApiResponse<{ blog: BlogPost; relatedPosts: BlogPost[] }> =
    await response.json();
  if (!json.success || !json.data) {
    throw new Error(json.error || 'Failed to load blog post');
  }

  return json.data;
}

/**
 * Admin: Fetch all blogs (Drafts + Published)
 */
export async function fetchAdminBlogs(
  params: GetBlogsQueryInput = {}
): Promise<PaginatedBlogsResponse> {
  const queryParams: Record<string, string | number | boolean | undefined> = {
    page: params.page || 1,
    limit: params.limit || 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  };

  if (params.search && params.search.trim()) queryParams.search = params.search.trim();
  if (params.status) queryParams.status = params.status;
  if (params.category && params.category !== 'All') queryParams.category = params.category;

  const url = buildApiUrl('blogs/admin/all', queryParams);

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to load admin blogs: ${response.status}`);
  }

  const json: ApiResponse<PaginatedBlogsResponse> = await response.json();
  return json.data;
}

/**
 * Admin: Fetch single post by ID for editor
 */
export async function fetchAdminBlogById(id: string): Promise<BlogPost> {
  const url = buildApiUrl(`blogs/admin/post/${encodeURIComponent(id)}`);

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to load post ${id}: ${response.status}`);
  }

  const json: ApiResponse<BlogPost> = await response.json();
  return json.data;
}

/**
 * Admin: Create a new blog post
 */
export async function createAdminBlog(payload: CreateBlogPostInput): Promise<BlogPost> {
  const url = buildApiUrl('blogs/admin');

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to create blog: HTTP ${response.status}`);
  }

  const json: ApiResponse<BlogPost> = await response.json();
  return json.data;
}

/**
 * Admin: Update an existing blog post
 */
export async function updateAdminBlog(
  id: string,
  payload: UpdateBlogPostInput
): Promise<BlogPost> {
  const url = buildApiUrl(`blogs/admin/${encodeURIComponent(id)}`);

  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to update blog: HTTP ${response.status}`);
  }

  const json: ApiResponse<BlogPost> = await response.json();
  return json.data;
}

/**
 * Admin: Delete a blog post
 */
export async function deleteAdminBlog(id: string): Promise<boolean> {
  const url = buildApiUrl(`blogs/admin/${encodeURIComponent(id)}`);

  const response = await fetch(url, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Failed to delete blog: HTTP ${response.status}`);
  }

  return true;
}

/**
 * Upload an image to Cloudflare R2 (via the API) and return a stable URL.
 *
 * The API streams the file to R2 server-side, so no bucket CORS config is needed.
 * The returned URL (`/api/storage/file?key=...`) never expires — it redirects to a
 * fresh presigned R2 URL on each request, so it's safe to store inside blog content.
 */
export async function uploadImageToStorage(file: File, folder = 'blog-images'): Promise<string> {
  const MAX_BYTES = 10 * 1024 * 1024;
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files can be uploaded');
  }
  if (file.size > MAX_BYTES) {
    throw new Error(`Image is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max is 10 MB.`);
  }

  const form = new FormData();
  form.append('file', file);
  form.append('folder', folder);

  // NOTE: don't set Content-Type manually — the browser adds the multipart boundary
  const response = await fetch(buildApiUrl('storage/upload'), {
    method: 'POST',
    body: form,
  });

  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.success || !json?.data?.url) {
    const msg = Array.isArray(json?.message) ? json.message.join(', ') : json?.message;
    throw new Error(msg || `Image upload failed (HTTP ${response.status})`);
  }

  return json.data.url as string;
}
