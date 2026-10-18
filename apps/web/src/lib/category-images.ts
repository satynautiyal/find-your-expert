/**
 * Curated, high-resolution aesthetic images for home improvement categories & services.
 * Uses high-quality Unsplash URLs optimized with query parameters (w=400, q=80, auto=format).
 */

export const CATEGORY_IMAGE_MAP: Record<string, string> = {
  // Custom Cabinets & Millwork (High-end custom generated image)
  'custom-cabinets': '/categories/custom-cabinets.jpg',
  'cabinets': '/categories/custom-cabinets.jpg',
  'custom-cabinetry': '/categories/custom-cabinets.jpg',
  'kitchen-cabinetry': '/categories/custom-cabinets.jpg',
  'built-in-shelving':
    'https://images.unsplash.com/photo-1594026112284-02bb6f3352fe?auto=format&fit=crop&w=400&q=80',
  'custom-closets':
    'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=400&q=80',
  'architectural-millwork': '/categories/custom-cabinets.jpg',

  // Roofing & Exterior
  'roofing':
    'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80',
  'roof-installation':
    'https://images.unsplash.com/photo-1632759145351-1d592919f522?auto=format&fit=crop&w=400&q=80',
  'roof-repair':
    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&q=80',
  'waterproofing':
    'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=400&q=80',
  'gutter-installation':
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80',

  // Kitchen & Bath
  'countertops':
    'https://images.unsplash.com/photo-1556909212-d5b604d0c90d?auto=format&fit=crop&w=400&q=80',
  'kitchen-remodeling':
    'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=400&q=80',
  'bathroom-remodeling':
    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&q=80',
  'bathroom-vanities':
    'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=400&q=80',

  // Systems & Finishes
  'hvac':
    'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=400&q=80',
  'flooring':
    'https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?auto=format&fit=crop&w=400&q=80',
  'windows-doors':
    'https://images.unsplash.com/photo-1509644851169-2acc08aa25b5?auto=format&fit=crop&w=400&q=80',
  'painting':
    'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=400&q=80',
};

const DEFAULT_CATEGORY_IMAGE =
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80';

/**
 * Returns a high-resolution, matching image for a given category slug or name.
 */
export function getCategoryImage(slugOrName?: string | null): string {
  if (!slugOrName) return DEFAULT_CATEGORY_IMAGE;

  const normalized = slugOrName
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-');

  if (CATEGORY_IMAGE_MAP[normalized]) {
    return CATEGORY_IMAGE_MAP[normalized];
  }

  // Substring match heuristic
  for (const [key, url] of Object.entries(CATEGORY_IMAGE_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return url;
    }
  }

  return DEFAULT_CATEGORY_IMAGE;
}
