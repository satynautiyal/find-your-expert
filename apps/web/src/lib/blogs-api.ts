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
 * Upload image directly to Cloudflare R2 via presigned URL
 */
export async function uploadImageToStorage(file: File, folder = 'blog-images'): Promise<string> {
  const timestamp = Date.now();
  const cleanName = file.name.toLowerCase().replace(/[^a-z0-9.]/g, '-');
  const key = `${folder}/${timestamp}-${cleanName}`;

  // 1. Get Presigned Upload URL from backend
  const presignUrl = buildApiUrl('storage/presigned-upload');
  const presignRes = await fetch(presignUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      key,
      contentType: file.type || 'image/jpeg',
      expiresIn: 3600,
    }),
  });

  if (!presignRes.ok) {
    throw new Error('Failed to get presigned upload URL from storage');
  }

  const presignJson = await presignRes.json();
  const { uploadUrl, publicUrl } = presignJson.data;

  // 2. Upload file directly via PUT
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type || 'image/jpeg',
    },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error(`Direct image upload failed: HTTP ${uploadRes.status}`);
  }

  return publicUrl;
}
