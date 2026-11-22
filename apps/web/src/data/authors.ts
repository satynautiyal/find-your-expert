import { toCleanSlug } from '@/lib/seo-urls';

export interface AuthorProfileEntry {
  slug: string;
  name: string;
  role: string;
  bio: string;
  expertise: string[];
}

/**
 * Canonical Author Registry (Sheet 1 Row 15: `/authors/{name}`).
 * Add one entry per real writer or editorial reviewer as the team grows.
 */
export const EDITORIAL_AUTHORS: AuthorProfileEntry[] = [
  {
    slug: 'prosvetted-editorial-team',
    name: 'ProsVetted Editorial Team',
    role: 'Home Improvement Research & Vetting Desk',
    bio: 'The ProsVetted Editorial Team researches local residential contractors, audits multi-platform homeowner reviews, and compiles transparent U.S. remodeling cost guides.',
    expertise: [
      'Custom Cabinetry & Millwork',
      'Residential Roofing',
      'Contractor Vetting & Licensing',
      'Remodeling Cost Benchmarks',
    ],
  },
];

export function findEditorialAuthorBySlug(
  rawSlug: string
): AuthorProfileEntry | null {
  const clean = toCleanSlug(rawSlug);
  return EDITORIAL_AUTHORS.find((a) => a.slug === clean) || null;
}
