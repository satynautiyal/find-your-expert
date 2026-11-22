import {
  TRACKER_STATES,
  TRACKER_NYC_BOROUGHS,
  TRACKER_CITIES,
  type TrackerStateEntry,
  type TrackerBoroughEntry,
  type TrackerCityEntry,
} from '@/data/geoTrackerLocations';

export const SITE_BASE_URL = 'https://prosvetted.com';

/**
 * Legacy `/contractors?category=...&state=...&borough=...` query URLs now
 * 308-redirect to clean `/{service}` and `/{service}/{location}` SEO paths.
 */
export const LEGACY_QUERY_REDIRECTS_ENABLED = true;

export type ServicePriority = 'P1' | 'P2' | 'P3';

export type ServiceCategoryGroup =
  | 'Remodeling & Additions'
  | 'Kitchen, Bath & Cabinetry'
  | 'Exterior, Roofing & Structures'
  | 'Flooring, Painting & Surfaces'
  | 'Systems, Outdoor & Essential Trades';

export interface ServiceRegistryEntry {
  slug: string;
  name: string;
  /** Singular/modifier label for H1s like "Best {companyLabel} Companies in {City}, {ST}" */
  companyLabel: string;
  /** Exact Service Hub H1 (matches Sheet 3 Row 4 pattern) */
  hubH1: string;
  /** Matching category name in backend DB (`service_categories.name`) */
  dbCategoryName: string;
  categoryGroup: ServiceCategoryGroup;
  priority: ServicePriority;
  typicalBudget: string;
  demand: 'High' | 'Medium' | 'Low';
  avgBudget: number;
  isLive: boolean;
  aliases?: string[];
}

/**
 * Complete 37-service registry from `ProsVetted - Page - Tracker.xlsx` (Sheet 2: Services).
 * Currently `custom-cabinets` and `roofing` have verified NYC providers in DB (`isLive: true`);
 * the other 35 valid tracker services render "Coming Soon" with `noindex`.
 */
export const SERVICES_REGISTRY: ServiceRegistryEntry[] = [
  // ================= P1 (7 Services) =================
  {
    slug: 'adu-construction',
    name: 'ADU Construction',
    companyLabel: 'ADU Construction',
    hubH1: 'ADU Builders: Find & Compare Local Companies',
    dbCategoryName: 'ADU Construction',
    categoryGroup: 'Remodeling & Additions',
    priority: 'P1',
    typicalBudget: 'Avg ~$180,000 ($60k–$285k)',
    demand: 'Medium',
    avgBudget: 180000,
    isLive: false,
    aliases: ['adu builders', 'accessory dwelling unit', 'garage conversion'],
  },
  {
    slug: 'home-additions',
    name: 'Home Additions',
    companyLabel: 'Home Addition',
    hubH1: 'Home Addition Contractors: Find & Compare Local Companies',
    dbCategoryName: 'Home Additions',
    categoryGroup: 'Remodeling & Additions',
    priority: 'P1',
    typicalBudget: 'Avg $50,986 ($21,890–$83,355)',
    demand: 'Medium',
    avgBudget: 50986,
    isLive: false,
    aliases: ['room additions', 'second story addition'],
  },
  {
    slug: 'home-remodeling',
    name: 'Home Remodeling',
    companyLabel: 'Home Remodeling',
    hubH1: 'Home Remodeling Contractors: Find & Compare Local Companies',
    dbCategoryName: 'Home Remodeling',
    categoryGroup: 'Remodeling & Additions',
    priority: 'P1',
    typicalBudget: 'Typical $20,000–$75,000',
    demand: 'Medium',
    avgBudget: 47500,
    isLive: false,
    aliases: ['home remodeling (whole-house)', 'whole house remodeling', 'general remodeling'],
  },
  {
    slug: 'basement-remodeling',
    name: 'Basement Finishing & Remodeling',
    companyLabel: 'Basement Remodeling',
    hubH1: 'Basement Remodeling Contractors: Find & Compare Local Companies',
    dbCategoryName: 'Basement Remodeling',
    categoryGroup: 'Remodeling & Additions',
    priority: 'P1',
    typicalBudget: 'Avg $32,000 ($15,000–$75,000)',
    demand: 'Medium',
    avgBudget: 32000,
    isLive: false,
    aliases: ['basement finishing', 'basement renovation'],
  },
  {
    slug: 'kitchen-remodeling',
    name: 'Kitchen Remodeling',
    companyLabel: 'Kitchen Remodeling',
    hubH1: 'Kitchen Remodeling Contractors: Find & Compare Local Companies',
    dbCategoryName: 'Kitchen Remodeling',
    categoryGroup: 'Kitchen, Bath & Cabinetry',
    priority: 'P1',
    typicalBudget: 'Avg $26,988 ($14,592–$41,617)',
    demand: 'High',
    avgBudget: 26988,
    isLive: false,
    aliases: ['kitchen renovation', 'kitchen remodelers'],
  },
  {
    slug: 'outdoor-kitchens',
    name: 'Outdoor Kitchens',
    companyLabel: 'Outdoor Kitchen',
    hubH1: 'Outdoor Kitchen Builders: Find & Compare Local Companies',
    dbCategoryName: 'Outdoor Kitchens',
    categoryGroup: 'Systems, Outdoor & Essential Trades',
    priority: 'P1',
    typicalBudget: 'Avg $13,200 ($5,400–$22,000)',
    demand: 'Medium',
    avgBudget: 13200,
    isLive: false,
    aliases: ['outdoor kitchen installation', 'bbq island builders'],
  },
  {
    slug: 'bathroom-remodeling',
    name: 'Bathroom Remodeling',
    companyLabel: 'Bathroom Remodeling',
    hubH1: 'Bathroom Remodeling Contractors: Find & Compare Local Companies',
    dbCategoryName: 'Bathroom Remodeling',
    categoryGroup: 'Kitchen, Bath & Cabinetry',
    priority: 'P1',
    typicalBudget: 'Avg $12,153 ($6,651–$17,660)',
    demand: 'High',
    avgBudget: 12153,
    isLive: false,
    aliases: ['bathroom renovation', 'bath remodelers'],
  },

  // ================= P2 (17 Services) =================
  {
    slug: 'pool-builders',
    name: 'Pool Builders',
    companyLabel: 'Pool Building',
    hubH1: 'Pool Builders: Find & Compare Local Companies',
    dbCategoryName: 'Pool Builders',
    categoryGroup: 'Systems, Outdoor & Essential Trades',
    priority: 'P2',
    typicalBudget: 'Avg $65,909 ($44,499–$87,349)',
    demand: 'Low',
    avgBudget: 65909,
    isLive: false,
    aliases: ['pool builders (inground)', 'inground pool installation', 'swimming pool builders'],
  },
  {
    slug: 'solar-installation',
    name: 'Solar Panel Installation',
    companyLabel: 'Solar Installation',
    hubH1: 'Solar Panel Installers: Find & Compare Local Companies',
    dbCategoryName: 'Solar Installation',
    categoryGroup: 'Systems, Outdoor & Essential Trades',
    priority: 'P2',
    typicalBudget: 'Avg $20,534 ($13,962–$27,924)',
    demand: 'Low',
    avgBudget: 20534,
    isLive: false,
    aliases: ['solar installers', 'solar panels'],
  },
  {
    slug: 'siding',
    name: 'Siding Contractors',
    companyLabel: 'Siding',
    hubH1: 'Siding Contractors: Find & Compare Local Companies',
    dbCategoryName: 'Siding',
    categoryGroup: 'Exterior, Roofing & Structures',
    priority: 'P2',
    typicalBudget: 'Avg ~$10,500 ($5,400–$16,000)',
    demand: 'Low',
    avgBudget: 10500,
    isLive: false,
    aliases: ['siding installation', 'siding repair', 'vinyl siding', 'fiber cement siding'],
  },
  {
    slug: 'roofing',
    name: 'Roofing Contractors',
    companyLabel: 'Roofing',
    hubH1: 'Roofing Contractors: Find & Compare Local Companies',
    dbCategoryName: 'Roofing',
    categoryGroup: 'Exterior, Roofing & Structures',
    priority: 'P2',
    typicalBudget: 'Avg $9,609 ($5,903–$13,377)',
    demand: 'High',
    avgBudget: 9609,
    isLive: true,
    aliases: [
      'roofing',
      'roofers',
      'roof replacement',
      'roof repair',
      'flat roofing',
      'shingle roofing',
      'commercial roofing',
    ],
  },
  {
    slug: 'deck-builders',
    name: 'Deck Builders',
    companyLabel: 'Deck Building',
    hubH1: 'Deck Builders: Find & Compare Local Companies',
    dbCategoryName: 'Deck Builders',
    categoryGroup: 'Exterior, Roofing & Structures',
    priority: 'P2',
    typicalBudget: 'Avg $8,321 ($4,338–$12,653)',
    demand: 'Medium',
    avgBudget: 8321,
    isLive: false,
    aliases: ['deck installation', 'composite decking', 'patio decks'],
  },
  {
    slug: 'shower-installation',
    name: 'Shower Installation',
    companyLabel: 'Shower Installation',
    hubH1: 'Shower Installers: Find & Compare Local Companies',
    dbCategoryName: 'Shower Installation',
    categoryGroup: 'Kitchen, Bath & Cabinetry',
    priority: 'P2',
    typicalBudget: 'Avg $8,204 ($4,448–$12,373)',
    demand: 'High',
    avgBudget: 8204,
    isLive: false,
    aliases: ['walk-in shower installation', 'tub to shower conversion'],
  },
  {
    slug: 'window-replacement',
    name: 'Window Replacement',
    companyLabel: 'Window Replacement',
    hubH1: 'Window Replacement Companies: Find & Compare Local Pros',
    dbCategoryName: 'Window Replacement',
    categoryGroup: 'Exterior, Roofing & Structures',
    priority: 'P2',
    typicalBudget: 'Avg $7,348 ($3,436–$11,838)',
    demand: 'High',
    avgBudget: 7348,
    isLive: false,
    aliases: ['windows', 'window installation'],
  },
  {
    slug: 'custom-cabinets',
    name: 'Custom Cabinets',
    companyLabel: 'Custom Cabinet',
    hubH1: 'Custom Cabinet Makers: Find & Compare Local Companies',
    dbCategoryName: 'Custom Cabinets',
    categoryGroup: 'Kitchen, Bath & Cabinetry',
    priority: 'P2',
    typicalBudget: 'Avg $6,192 (High-end custom $13,000–$30,000)',
    demand: 'Medium',
    avgBudget: 6192,
    isLive: true,
    aliases: [
      'custom cabinetry',
      'cabinet makers',
      'kitchen cabinets',
      'bathroom vanities',
      'built-in shelving',
      'custom closets',
      'architectural millwork',
      'millwork',
    ],
  },
  {
    slug: 'hvac',
    name: 'HVAC Installation',
    companyLabel: 'HVAC',
    hubH1: 'HVAC Contractors: Find & Compare Local Companies',
    dbCategoryName: 'HVAC',
    categoryGroup: 'Systems, Outdoor & Essential Trades',
    priority: 'P2',
    typicalBudget: 'Avg $5,978 (Central AC) / $4,814 (Furnace)',
    demand: 'High',
    avgBudget: 5978,
    isLive: false,
    aliases: ['air conditioning', 'heating and cooling', 'furnace installation', 'hvac contractors'],
  },
  {
    slug: 'driveway-installation',
    name: 'Concrete Driveways',
    companyLabel: 'Driveway Installation',
    hubH1: 'Driveway Contractors: Find & Compare Local Companies',
    dbCategoryName: 'Driveway Installation',
    categoryGroup: 'Exterior, Roofing & Structures',
    priority: 'P2',
    typicalBudget: 'Avg $4,904 ($2,523–$7,292)',
    demand: 'High',
    avgBudget: 4904,
    isLive: false,
    aliases: ['asphalt driveway', 'paver driveway', 'driveway paving'],
  },
  {
    slug: 'hardwood-flooring',
    name: 'Hardwood Flooring',
    companyLabel: 'Hardwood Flooring',
    hubH1: 'Hardwood Flooring Contractors: Find & Compare Local Companies',
    dbCategoryName: 'Hardwood Flooring',
    categoryGroup: 'Flooring, Painting & Surfaces',
    priority: 'P2',
    typicalBudget: 'Avg $4,723 ($2,469–$7,034)',
    demand: 'High',
    avgBudget: 4723,
    isLive: false,
    aliases: ['wood flooring', 'hardwood refinishing'],
  },
  {
    slug: 'patio-installation',
    name: 'Patio Installation & Hardscaping',
    companyLabel: 'Patio & Hardscaping',
    hubH1: 'Patio & Hardscaping Contractors: Find & Compare Local Companies',
    dbCategoryName: 'Patio Installation',
    categoryGroup: 'Systems, Outdoor & Essential Trades',
    priority: 'P2',
    typicalBudget: 'Avg $4,007 ($2,029–$6,089)',
    demand: 'Medium',
    avgBudget: 4007,
    isLive: false,
    aliases: ['hardscaping', 'paver patio', 'concrete patio'],
  },
  {
    slug: 'landscaping',
    name: 'Landscaping',
    companyLabel: 'Landscaping',
    hubH1: 'Landscaping Companies: Find & Compare Local Pros',
    dbCategoryName: 'Landscaping',
    categoryGroup: 'Systems, Outdoor & Essential Trades',
    priority: 'P2',
    typicalBudget: 'Avg $3,517 ($1,248–$6,068)',
    demand: 'High',
    avgBudget: 3517,
    isLive: false,
    aliases: ['landscape design', 'landscapers'],
  },
  {
    slug: 'fence-installation',
    name: 'Fence Installation',
    companyLabel: 'Fence',
    hubH1: 'Fence Companies: Find & Compare Local Contractors',
    dbCategoryName: 'Fence Installation',
    categoryGroup: 'Exterior, Roofing & Structures',
    priority: 'P2',
    typicalBudget: 'Avg $3,276 ($425–$13,700)',
    demand: 'Medium',
    avgBudget: 3276,
    isLive: false,
    aliases: ['fencing', 'fence builders', 'wood fence', 'vinyl fence'],
  },
  {
    slug: 'exterior-painting',
    name: 'Exterior Painting',
    companyLabel: 'Exterior Painting',
    hubH1: 'Exterior Painters: Find & Compare Local Companies',
    dbCategoryName: 'Exterior Painting',
    categoryGroup: 'Flooring, Painting & Surfaces',
    priority: 'P2',
    typicalBudget: 'Avg $3,178 ($1,819–$4,551)',
    demand: 'High',
    avgBudget: 3178,
    isLive: false,
    aliases: ['house painters', 'exterior house painting'],
  },
  {
    slug: 'countertops',
    name: 'Countertop Installation',
    companyLabel: 'Countertop',
    hubH1: 'Countertop Installers: Find & Compare Local Companies',
    dbCategoryName: 'Countertops',
    categoryGroup: 'Kitchen, Bath & Cabinetry',
    priority: 'P2',
    typicalBudget: 'Avg $3,161 ($1,882–$4,484)',
    demand: 'Medium',
    avgBudget: 3161,
    isLive: false,
    aliases: ['quartz countertops', 'granite countertops', 'stone countertops'],
  },
  {
    slug: 'flooring',
    name: 'Flooring Installation',
    companyLabel: 'Flooring',
    hubH1: 'Flooring Contractors: Find & Compare Local Companies',
    dbCategoryName: 'Flooring',
    categoryGroup: 'Flooring, Painting & Surfaces',
    priority: 'P2',
    typicalBudget: 'Avg $3,153 ($1,528–$4,850)',
    demand: 'High',
    avgBudget: 3153,
    isLive: false,
    aliases: ['tile flooring', 'lvp flooring', 'laminate flooring', 'floor installers'],
  },

  // ================= P3 (13 Services) =================
  {
    slug: 'cabinet-refinishing',
    name: 'Cabinet Refacing & Refinishing',
    companyLabel: 'Cabinet Refinishing',
    hubH1: 'Cabinet Refacing & Refinishing Pros: Find Local Companies',
    dbCategoryName: 'Cabinet Refinishing',
    categoryGroup: 'Kitchen, Bath & Cabinetry',
    priority: 'P3',
    typicalBudget: 'Avg $7,230 ($4,234–$10,226)',
    demand: 'Low',
    avgBudget: 7230,
    isLive: false,
    aliases: ['cabinet painting', 'cabinet refacing'],
  },
  {
    slug: 'foundation-repair',
    name: 'Foundation Repair',
    companyLabel: 'Foundation Repair',
    hubH1: 'Foundation Repair Companies: Find & Compare Local Pros',
    dbCategoryName: 'Foundation Repair',
    categoryGroup: 'Exterior, Roofing & Structures',
    priority: 'P3',
    typicalBudget: 'Avg $5,174 ($2,225–$8,133)',
    demand: 'Low',
    avgBudget: 5174,
    isLive: false,
    aliases: ['basement waterproofing', 'structural foundation repair'],
  },
  {
    slug: 'irrigation-systems',
    name: 'Sprinkler & Irrigation Systems',
    companyLabel: 'Irrigation & Sprinkler',
    hubH1: 'Lawn Sprinkler & Irrigation Companies: Find Local Pros',
    dbCategoryName: 'Irrigation Systems',
    categoryGroup: 'Systems, Outdoor & Essential Trades',
    priority: 'P3',
    typicalBudget: 'Avg $2,549 ($1,636–$3,595)',
    demand: 'High',
    avgBudget: 2549,
    isLive: false,
    aliases: ['sprinkler installation', 'lawn irrigation'],
  },
  {
    slug: 'interior-painting',
    name: 'Interior Painting',
    companyLabel: 'Interior Painting',
    hubH1: 'Interior Painters: Find & Compare Local Companies',
    dbCategoryName: 'Interior Painting',
    categoryGroup: 'Flooring, Painting & Surfaces',
    priority: 'P3',
    typicalBudget: 'Avg $2,022 ($965–$3,089)',
    demand: 'High',
    avgBudget: 2022,
    isLive: false,
    aliases: ['painting', 'painters', 'interior house painters'],
  },
  {
    slug: 'insulation',
    name: 'Insulation',
    companyLabel: 'Insulation',
    hubH1: 'Insulation Contractors: Find & Compare Local Companies',
    dbCategoryName: 'Insulation',
    categoryGroup: 'Systems, Outdoor & Essential Trades',
    priority: 'P3',
    typicalBudget: 'Avg $1,852 ($498–$4,500)',
    demand: 'Low',
    avgBudget: 1852,
    isLive: false,
    aliases: ['attic insulation', 'spray foam insulation'],
  },
  {
    slug: 'water-heater-installation',
    name: 'Water Heater Installation',
    companyLabel: 'Water Heater',
    hubH1: 'Water Heater Installers: Find & Compare Local Pros',
    dbCategoryName: 'Water Heater Installation',
    categoryGroup: 'Systems, Outdoor & Essential Trades',
    priority: 'P3',
    typicalBudget: 'Avg $1,348 ($882–$1,826)',
    demand: 'High',
    avgBudget: 1348,
    isLive: false,
    aliases: ['tankless water heater', 'water heater replacement'],
  },
  {
    slug: 'garage-door-installation',
    name: 'Garage Door Installation',
    companyLabel: 'Garage Door',
    hubH1: 'Garage Door Companies: Find & Compare Local Pros',
    dbCategoryName: 'Garage Door Installation',
    categoryGroup: 'Exterior, Roofing & Structures',
    priority: 'P3',
    typicalBudget: 'Avg $1,231 ($754–$1,707)',
    demand: 'High',
    avgBudget: 1231,
    isLive: false,
    aliases: ['garage doors', 'garage door repair'],
  },
  {
    slug: 'gutters',
    name: 'Gutter Installation',
    companyLabel: 'Gutter',
    hubH1: 'Gutter Installation Companies: Find & Compare Local Pros',
    dbCategoryName: 'Gutters',
    categoryGroup: 'Exterior, Roofing & Structures',
    priority: 'P3',
    typicalBudget: 'Typical $550–$1,500',
    demand: 'Medium',
    avgBudget: 1025,
    isLive: false,
    aliases: ['seamless gutters', 'gutter guards', 'gutter repair'],
  },
  {
    slug: 'tree-services',
    name: 'Tree Services',
    companyLabel: 'Tree Service',
    hubH1: 'Tree Service Companies: Find & Compare Local Arborists',
    dbCategoryName: 'Tree Services',
    categoryGroup: 'Systems, Outdoor & Essential Trades',
    priority: 'P3',
    typicalBudget: 'Avg $750 ($200–$2,000)',
    demand: 'High',
    avgBudget: 750,
    isLive: false,
    aliases: ['tree removal', 'tree trimming', 'arborists'],
  },
  {
    slug: 'handyman',
    name: 'Handyman Services',
    companyLabel: 'Handyman',
    hubH1: 'Handyman Services: Find & Compare Local Pros',
    dbCategoryName: 'Handyman',
    categoryGroup: 'Systems, Outdoor & Essential Trades',
    priority: 'P3',
    typicalBudget: 'Avg $405 ($164–$647)',
    demand: 'Medium',
    avgBudget: 405,
    isLive: false,
    aliases: ['home repairs', 'local handyman'],
  },
  {
    slug: 'electricians',
    name: 'Electricians',
    companyLabel: 'Electrical',
    hubH1: 'Licensed Electricians: Find & Compare Local Companies',
    dbCategoryName: 'Electricians',
    categoryGroup: 'Systems, Outdoor & Essential Trades',
    priority: 'P3',
    typicalBudget: 'Avg $351 per job ($50–$130/hr)',
    demand: 'High',
    avgBudget: 351,
    isLive: false,
    aliases: ['electrical', 'electrical contractors'],
  },
  {
    slug: 'plumbers',
    name: 'Plumbers',
    companyLabel: 'Plumbing',
    hubH1: 'Licensed Plumbers: Find & Compare Local Companies',
    dbCategoryName: 'Plumbers',
    categoryGroup: 'Systems, Outdoor & Essential Trades',
    priority: 'P3',
    typicalBudget: 'Avg $341 per job (~$70–$120/hr)',
    demand: 'High',
    avgBudget: 341,
    isLive: false,
    aliases: ['plumbing', 'plumbing contractors'],
  },
  {
    slug: 'lawn-care',
    name: 'Lawn Care',
    companyLabel: 'Lawn Care',
    hubH1: 'Lawn Care Services: Find & Compare Local Companies',
    dbCategoryName: 'Lawn Care',
    categoryGroup: 'Systems, Outdoor & Essential Trades',
    priority: 'P3',
    typicalBudget: 'Avg $123 per visit ($49–$203)',
    demand: 'High',
    avgBudget: 123,
    isLive: false,
    aliases: ['lawn mowing', 'yard maintenance'],
  },
];

// ============================================================================
// O(1) IN-MEMORY LOOKUP INDEXES
// ============================================================================

const SERVICE_BY_SLUG = new Map<string, ServiceRegistryEntry>();
const SERVICE_BY_TERM = new Map<string, ServiceRegistryEntry>();

for (const svc of SERVICES_REGISTRY) {
  SERVICE_BY_SLUG.set(svc.slug, svc);
  SERVICE_BY_TERM.set(svc.slug, svc);
  SERVICE_BY_TERM.set(svc.name.toLowerCase(), svc);
  SERVICE_BY_TERM.set(svc.dbCategoryName.toLowerCase(), svc);
  SERVICE_BY_TERM.set(svc.companyLabel.toLowerCase(), svc);
  for (const alias of svc.aliases || []) {
    SERVICE_BY_TERM.set(alias.toLowerCase(), svc);
  }
}

const STATE_BY_SLUG = new Map<string, TrackerStateEntry>();
const STATE_BY_CODE = new Map<string, TrackerStateEntry>();
const STATE_BY_NAME = new Map<string, TrackerStateEntry>();

for (const st of TRACKER_STATES) {
  STATE_BY_SLUG.set(st.slug, st);
  STATE_BY_CODE.set(st.code.toLowerCase(), st);
  STATE_BY_NAME.set(st.name.toLowerCase(), st);
  STATE_BY_NAME.set(st.fullName.toLowerCase(), st);
}

const BOROUGH_BY_SLUG = new Map<string, TrackerBoroughEntry>();
const BOROUGH_BY_NAME = new Map<string, TrackerBoroughEntry>();

for (const b of TRACKER_NYC_BOROUGHS) {
  BOROUGH_BY_SLUG.set(b.slug, b);
  BOROUGH_BY_NAME.set(b.name.toLowerCase(), b);
  // Support "Bronx" as well as "The Bronx" -> `bronx-ny`
  const stripped = b.name.toLowerCase().replace(/^the\s+/, '');
  BOROUGH_BY_NAME.set(stripped, b);
}

const CITY_BY_SLUG = new Map<string, TrackerCityEntry>();
const CITIES_BY_STATE_SLUG = new Map<string, TrackerCityEntry[]>();

for (const c of TRACKER_CITIES) {
  CITY_BY_SLUG.set(c.slug, c);
  const list = CITIES_BY_STATE_SLUG.get(c.stateSlug) || [];
  list.push(c);
  CITIES_BY_STATE_SLUG.set(c.stateSlug, list);
}

// Common NYC aliases ("NYC", "New York", "New York, NY")
const NYC_CITY_ENTRY = CITY_BY_SLUG.get('new-york-city-ny')!;

export function toCleanSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['’.]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ============================================================================
// STRICT SLUG PARSERS (Used by App Router `[service]` & `[service]/[location]`)
// ============================================================================

/**
 * Strictly parses a root `/{service}` URL segment.
 * Returns `null` if not one of the 37 tracker services (triggers real HTTP 404).
 */
export function parseServiceSlug(rawSlug: string): ServiceRegistryEntry | null {
  if (!rawSlug) return null;
  const clean = rawSlug.toLowerCase().trim();
  return SERVICE_BY_SLUG.get(clean) || null;
}

/**
 * Fuzzy resolver for internal UI/query-param conversion (maps category/sub-service
 * names like "Custom Cabinets", "Built-in Shelving", or "Roof Replacement" to a ServiceRegistryEntry).
 */
export function resolveServiceFromInput(input?: string | null): ServiceRegistryEntry | null {
  if (!input) return null;
  const lower = input.toLowerCase().trim();
  if (!lower || lower === 'all' || lower === 'all services') return null;

  const direct = SERVICE_BY_TERM.get(lower) || SERVICE_BY_SLUG.get(toCleanSlug(lower));
  if (direct) return direct;

  if (
    lower.includes('cabinet') ||
    lower.includes('vanit') ||
    lower.includes('shelv') ||
    lower.includes('closet') ||
    lower.includes('millwork')
  ) {
    return SERVICE_BY_SLUG.get('custom-cabinets') || null;
  }
  if (lower.includes('roof')) {
    return SERVICE_BY_SLUG.get('roofing') || null;
  }
  return null;
}

export type ResolvedGeoLocation =
  | {
      kind: 'state';
      slug: string;
      name: string;
      fullName: string;
      stateName: string;
      stateCode: string;
      stateSlug: string;
      isLive: boolean;
    }
  | {
      kind: 'city';
      slug: string;
      name: string;
      stateName: string;
      stateCode: string;
      stateSlug: string;
      isLive: boolean;
    }
  | {
      kind: 'borough';
      slug: string;
      name: string;
      stateName: string;
      stateCode: string;
      stateSlug: string;
      parentCitySlug: string;
      parentCityName: string;
      isLive: boolean;
    };

/**
 * Strictly parses the second segment of `/{service}/{location}` across all 3 flat geo types:
 * 1. State (`new-york`, `california`, plus `washington-dc` special DC state-level slug)
 * 2. NYC Borough (`brooklyn-ny`, `queens-ny`, `manhattan-ny`, `bronx-ny`, `staten-island-ny`)
 * 3. US City (`new-york-city-ny`, `los-angeles-ca`, `pasadena-tx`, etc.)
 *
 * Returns `null` on unknown/invalid slugs so Next.js calls `notFound()` (real HTTP 404).
 */
export function parseGeoLocationSlug(rawLocationSlug: string): ResolvedGeoLocation | null {
  if (!rawLocationSlug) return null;
  const clean = rawLocationSlug.toLowerCase().trim().replace(/\/+$/, '');
  if (!clean) return null;

  // 1. State or Washington, DC (`washington-dc` is explicitly Page type: State in Sheet 3 Row 406)
  const stateMatch = STATE_BY_SLUG.get(clean);
  if (stateMatch) {
    return {
      kind: 'state',
      slug: stateMatch.slug,
      name: stateMatch.name,
      fullName: stateMatch.fullName,
      stateName: stateMatch.name,
      stateCode: stateMatch.code,
      stateSlug: stateMatch.slug,
      isLive: stateMatch.isLive,
    };
  }

  // 2. NYC Borough (`brooklyn-ny`, `bronx-ny`, etc. -> Parent: `/{service}/new-york-city-ny`)
  const boroughMatch = BOROUGH_BY_SLUG.get(clean);
  if (boroughMatch) {
    return {
      kind: 'borough',
      slug: boroughMatch.slug,
      name: boroughMatch.name,
      stateName: boroughMatch.stateName,
      stateCode: boroughMatch.stateCode,
      stateSlug: boroughMatch.stateSlug,
      parentCitySlug: boroughMatch.parentCitySlug,
      parentCityName: boroughMatch.parentCityName,
      isLive: boroughMatch.isLive,
    };
  }

  // 3. City (`{city-slug}-{st}` from the 347 tracker cities)
  const cityMatch = CITY_BY_SLUG.get(clean);
  if (cityMatch) {
    return {
      kind: 'city',
      slug: cityMatch.slug,
      name: cityMatch.name,
      stateName: cityMatch.stateName,
      stateCode: cityMatch.stateCode,
      stateSlug: cityMatch.stateSlug,
      isLive: cityMatch.isLive,
    };
  }

  return null;
}

/**
 * Resolves free-form state/city/borough labels (from search inputs, legacy query params,
 * or DB provider fields) to a canonical `ResolvedGeoLocation`.
 */
export function resolveGeoFromInputs(opts: {
  borough?: string | null;
  city?: string | null;
  state?: string | null;
}): ResolvedGeoLocation | null {
  const rawBorough = (opts.borough || '').trim();
  const rawCity = (opts.city || '').trim();
  const rawState = (opts.state || '').trim();

  // 1. Check NYC Borough first
  if (rawBorough && rawBorough.toLowerCase() !== 'all') {
    if (
      rawBorough.toLowerCase() === 'new york city' ||
      rawBorough.toLowerCase() === 'nyc'
    ) {
      return parseGeoLocationSlug('new-york-city-ny');
    }
    const b =
      BOROUGH_BY_NAME.get(rawBorough.toLowerCase().replace(/^the\s+/, '')) ||
      BOROUGH_BY_SLUG.get(toCleanSlug(rawBorough));
    if (b) return parseGeoLocationSlug(b.slug);
  }

  // 2. Check City (handling NYC & Borough names stored in `city` column too)
  if (rawCity && rawCity.toLowerCase() !== 'all') {
    const lowerCity = rawCity.toLowerCase();
    if (lowerCity === 'new york' || lowerCity === 'new york city' || lowerCity === 'nyc') {
      if (!rawState || ['ny', 'new york'].includes(rawState.toLowerCase())) {
        return parseGeoLocationSlug('new-york-city-ny');
      }
    }
    const asBorough = BOROUGH_BY_NAME.get(lowerCity.replace(/^the\s+/, ''));
    if (asBorough && (!rawState || ['ny', 'new york'].includes(rawState.toLowerCase()))) {
      return parseGeoLocationSlug(asBorough.slug);
    }

    const stEntry = rawState
      ? STATE_BY_CODE.get(rawState.toLowerCase()) ||
        STATE_BY_NAME.get(rawState.toLowerCase()) ||
        STATE_BY_SLUG.get(toCleanSlug(rawState))
      : null;

    if (stEntry) {
      const candidateSlug = `${toCleanSlug(rawCity)}-${stEntry.code.toLowerCase()}`;
      const matchedCity = parseGeoLocationSlug(candidateSlug);
      if (matchedCity) return matchedCity;
    } else {
      // Try unambiguous city name match in tracker
      const found = TRACKER_CITIES.find((c) => c.name.toLowerCase() === lowerCity);
      if (found) return parseGeoLocationSlug(found.slug);
    }
  }

  // 3. Fallback to State
  if (rawState && rawState.toLowerCase() !== 'all') {
    const stEntry =
      STATE_BY_CODE.get(rawState.toLowerCase()) ||
      STATE_BY_NAME.get(rawState.toLowerCase()) ||
      STATE_BY_SLUG.get(toCleanSlug(rawState));
    if (stEntry) return parseGeoLocationSlug(stEntry.slug);
  }

  return null;
}

// ============================================================================
// CANONICAL URL BUILDERS
// ============================================================================

export function getLiveServices(): ServiceRegistryEntry[] {
  return SERVICES_REGISTRY.filter((s) => s.isLive);
}

export function getCitiesForState(stateSlug: string): TrackerCityEntry[] {
  return CITIES_BY_STATE_SLUG.get(stateSlug) || [];
}

/**
 * Canonical Company Profile URL (`/companies/{slug}`).
 */
export function getCompanyUrl(companySlug: string): string {
  return `/companies/${encodeURIComponent(companySlug.trim().toLowerCase())}`;
}

/**
 * Canonical Author Profile URL (`/authors/{slug}`).
 */
export function getAuthorUrl(authorSlug: string): string {
  return `/authors/${toCleanSlug(authorSlug)}`;
}

/**
 * Canonical Service Hub URL (`/{service}`, e.g. `/custom-cabinets`).
 */
export function getServiceUrl(serviceInput: string | ServiceRegistryEntry): string {
  if (typeof serviceInput !== 'string') return `/${serviceInput.slug}`;
  const resolved = resolveServiceFromInput(serviceInput);
  return resolved ? `/${resolved.slug}` : `/${toCleanSlug(serviceInput)}`;
}

/**
 * Canonical State Geo URL (`/{service}/{state}`, e.g. `/custom-cabinets/new-york`).
 */
export function getStateUrl(
  serviceInput: string | ServiceRegistryEntry,
  stateInput: string | TrackerStateEntry
): string {
  const svcPath = getServiceUrl(serviceInput);
  if (typeof stateInput !== 'string') return `${svcPath}/${stateInput.slug}`;
  const st =
    STATE_BY_SLUG.get(toCleanSlug(stateInput)) ||
    STATE_BY_NAME.get(stateInput.toLowerCase().trim()) ||
    STATE_BY_CODE.get(stateInput.toLowerCase().trim());
  return `${svcPath}/${st ? st.slug : toCleanSlug(stateInput)}`;
}

/**
 * Canonical City Geo URL (`/{service}/{city}-{st}`, e.g. `/custom-cabinets/new-york-city-ny`).
 */
export function getCityUrl(
  serviceInput: string | ServiceRegistryEntry,
  citySlugOrName: string,
  stateCode?: string
): string {
  const svcPath = getServiceUrl(serviceInput);
  const direct = CITY_BY_SLUG.get(citySlugOrName.toLowerCase().trim());
  if (direct) return `${svcPath}/${direct.slug}`;

  if (
    ['new york', 'new york city', 'nyc'].includes(citySlugOrName.toLowerCase().trim()) &&
    (!stateCode || stateCode.toLowerCase() === 'ny')
  ) {
    return `${svcPath}/${NYC_CITY_ENTRY.slug}`;
  }

  const cleanCity = toCleanSlug(citySlugOrName);
  const suffix = stateCode ? `-${stateCode.toLowerCase().trim()}` : '';
  return `${svcPath}/${cleanCity}${suffix}`;
}

/**
 * Canonical NYC Borough URL (`/{service}/{borough}-ny`, e.g. `/custom-cabinets/brooklyn-ny`).
 */
export function getBoroughUrl(
  serviceInput: string | ServiceRegistryEntry,
  boroughNameOrSlug: string
): string {
  const svcPath = getServiceUrl(serviceInput);
  const lower = boroughNameOrSlug.toLowerCase().trim();
  const matched =
    BOROUGH_BY_SLUG.get(lower) ||
    BOROUGH_BY_NAME.get(lower.replace(/^the\s+/, ''));
  if (matched) return `${svcPath}/${matched.slug}`;
  const stripped = toCleanSlug(lower.replace(/^the\s+/, ''));
  return `${svcPath}/${stripped.endsWith('-ny') ? stripped : `${stripped}-ny`}`;
}

/**
 * Converts legacy `/contractors?category=...&service=...&state=...&borough=...&city=...&search=...`
 * query strings into the new canonical ProsVetted URL structure.
 */
export function resolveLegacyContractorsQueryToUrl(
  searchParams: URLSearchParams
): string | null {
  const q = (searchParams.get('search') || searchParams.get('q') || '').trim();
  const rawCategory = (searchParams.get('category') || '').trim();
  const rawService = (searchParams.get('service') || '').trim();
  const rawState = (searchParams.get('state') || '').trim();
  const rawBorough = (searchParams.get('borough') || '').trim();
  const rawCity = (searchParams.get('city') || '').trim();

  // 1. Site keyword search -> `/search`
  if (q) {
    const out = new URLSearchParams();
    out.set('q', q);
    if (rawCategory || rawService) out.set('service', rawService || rawCategory);
    if (rawBorough && rawBorough !== 'All') out.set('location', rawBorough);
    else if (rawCity) out.set('location', rawCity);
    else if (rawState && rawState !== 'All') out.set('location', rawState);
    return `/search?${out.toString()}`;
  }

  const hasAnyParam = Boolean(rawCategory || rawService || rawState || rawBorough || rawCity);
  if (!hasAnyParam) return null;

  const resolvedService =
    resolveServiceFromInput(rawCategory) ||
    resolveServiceFromInput(rawService) ||
    SERVICE_BY_SLUG.get('custom-cabinets')!;

  const resolvedGeo = resolveGeoFromInputs({
    borough: rawBorough,
    city: rawCity,
    state: rawState,
  });

  // Preserve sub-service filter only if `service` is more specific than the category
  const extraParams = new URLSearchParams();
  if (
    rawService &&
    rawService.toLowerCase() !== 'all' &&
    rawService.toLowerCase() !== 'all services' &&
    rawService.toLowerCase() !== resolvedService.name.toLowerCase() &&
    rawService.toLowerCase() !== resolvedService.dbCategoryName.toLowerCase()
  ) {
    extraParams.set('subservice', rawService);
  }
  const qs = extraParams.toString() ? `?${extraParams.toString()}` : '';

  if (resolvedGeo) {
    return `/${resolvedService.slug}/${resolvedGeo.slug}${qs}`;
  }
  return `/${resolvedService.slug}${qs}`;
}

// ============================================================================
// BREADCRUMBS & SHEET-MATCHED SEO COPY / METADATA HELPERS
// ============================================================================

export interface BreadcrumbItem {
  label: string;
  href: string;
}

/**
 * Builds the full logical breadcrumb hierarchy from Sheet 3 Column F (`Parent page`)
 * even though the URL stays flat at 2 segments (`/{service}/{location}`):
 * e.g. Home -> Services -> Custom Cabinets -> New York -> New York City -> Brooklyn
 */
export function buildGeoBreadcrumbs(
  service: ServiceRegistryEntry,
  geo?: ResolvedGeoLocation | null
): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [
    { label: 'Home', href: '/' },
    { label: 'Services', href: '/services' },
    { label: service.name, href: `/${service.slug}` },
  ];

  if (!geo) return items;

  if (geo.kind === 'state') {
    items.push({
      label: geo.name,
      href: `/${service.slug}/${geo.slug}`,
    });
    return items;
  }

  // City or Borough -> include State parent (`/{service}/{stateSlug}`)
  items.push({
    label: geo.stateName,
    href: `/${service.slug}/${geo.stateSlug}`,
  });

  if (geo.kind === 'borough') {
    // Borough -> include New York City parent (`/{service}/new-york-city-ny`)
    items.push({
      label: geo.parentCityName,
      href: `/${service.slug}/${geo.parentCitySlug}`,
    });
  }

  items.push({
    label: geo.name,
    href: `/${service.slug}/${geo.slug}`,
  });

  return items;
}

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.label,
      item: `${SITE_BASE_URL}${item.href === '/' ? '' : item.href}`,
    })),
  };
}

export interface GeoSeoPageMeta {
  h1: string;
  title: string;
  description: string;
  canonicalPath: string;
  canonicalUrl: string;
  isLive: boolean;
  shouldIndex: boolean;
}

/**
 * Generates exact H1s, `<title>`, meta descriptions, canonical URLs, and indexation flags
 * matching `ProsVetted - Page - Tracker.xlsx` (Sheet 3 Column I).
 */
export function buildGeoSeoPageMeta(
  service: ServiceRegistryEntry,
  geo?: ResolvedGeoLocation | null
): GeoSeoPageMeta {
  const isLive = service.isLive && (geo ? geo.isLive : true);
  // Per user decision: unlaunched regions/services render Coming Soon with `noindex`
  const shouldIndex = isLive;

  if (!geo) {
    const canonicalPath = `/${service.slug}`;
    return {
      h1: service.hubH1,
      title: `${service.hubH1} | ProsVetted`,
      description: `Compare verified ${service.name.toLowerCase()} professionals on ProsVetted. Review multi-platform ratings, project portfolios, licensing, and local cost guides.`,
      canonicalPath,
      canonicalUrl: `${SITE_BASE_URL}${canonicalPath}`,
      isLive,
      shouldIndex,
    };
  }

  const canonicalPath = `/${service.slug}/${geo.slug}`;
  let h1: string;
  let locationDisplay: string;

  if (geo.kind === 'state') {
    // Sheet 3 Row 406 special case: Washington, DC gets "Best ... in Washington, DC"
    if (geo.slug === 'washington-dc') {
      h1 = `Best ${service.companyLabel} Companies in Washington, DC`;
      locationDisplay = 'Washington, DC';
    } else {
      h1 = `${service.companyLabel} Companies in ${geo.name}`;
      locationDisplay = geo.name;
    }
  } else if (geo.slug === 'new-york-city-ny') {
    // Sheet 3 Row 156: "Best Custom Cabinet Companies in New York City" (no ", NY")
    h1 = `Best ${service.companyLabel} Companies in New York City`;
    locationDisplay = 'New York City';
  } else {
    // Cities & NYC Boroughs: "Best Custom Cabinet Companies in Brooklyn, NY"
    h1 = `Best ${service.companyLabel} Companies in ${geo.name}, ${geo.stateCode}`;
    locationDisplay = `${geo.name}, ${geo.stateCode}`;
  }

  return {
    h1,
    title: `${h1} | ProsVetted`,
    description: isLive
      ? `Find and compare top-rated ${service.companyLabel.toLowerCase()} companies in ${locationDisplay}. Backed by verified multi-platform customer reviews, AI review summaries, and transparent vetting.`
      : `ProsVetted is currently vetting ${service.companyLabel.toLowerCase()} companies in ${locationDisplay}. Get notified when verified local pros launch in your area.`,
    canonicalPath,
    canonicalUrl: `${SITE_BASE_URL}${canonicalPath}`,
    isLive,
    shouldIndex,
  };
}
