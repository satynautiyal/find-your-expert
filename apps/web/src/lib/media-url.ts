/**
 * Media URL utility for resolving S3/R2 presigned URLs, storage endpoints, and safe fallbacks.
 * Follows DRY principles for all media rendering across the application.
 */

/**
 * Resolves any image URL, S3 key, or relative API storage path to a browser-loadable URL.
 */
export function getMediaUrl(urlOrKey: string | null | undefined): string {
  if (!urlOrKey) return '';

  const trimmed = urlOrKey.trim();
  if (!trimmed) return '';

  // 1. Direct absolute URLs (e.g. presigned S3/R2 URL, Unsplash, Cloudinary)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // 2. Relative API storage URLs or uploads
  if (trimmed.startsWith('/api/storage/') || trimmed.startsWith('/uploads/')) {
    return trimmed;
  }

  // 3. Raw object key (e.g. 'blog-covers/2026/10/photo.jpg')
  const cleanKey = trimmed.replace(/^\/+/, '');
  return `/api/storage/file?key=${encodeURIComponent(cleanKey)}`;
}

/**
 * Returns a fallback gradient and placeholder metadata based on category or title
 */
export function getMediaPlaceholder(category?: string | null, title?: string | null) {
  const initial = (title || category || 'B').trim().charAt(0).toUpperCase();

  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    Bathroom: { bg: 'from-blue-500 to-indigo-600', text: 'text-white', border: 'border-blue-200' },
    Roofing: { bg: 'from-amber-500 to-orange-600', text: 'text-white', border: 'border-amber-200' },
    Kitchen: { bg: 'from-emerald-500 to-teal-600', text: 'text-white', border: 'border-emerald-200' },
    Plumbing: { bg: 'from-cyan-500 to-blue-600', text: 'text-white', border: 'border-cyan-200' },
    HVAC: { bg: 'from-rose-500 to-pink-600', text: 'text-white', border: 'border-rose-200' },
    General: { bg: 'from-slate-600 to-slate-800', text: 'text-white', border: 'border-slate-200' },
  };

  const matched = category && colorMap[category] ? colorMap[category] : colorMap.General;

  return {
    initial,
    gradient: matched.bg,
    textColor: matched.text,
    borderColor: matched.border,
  };
}
