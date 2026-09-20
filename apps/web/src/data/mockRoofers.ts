export interface PlatformReviewData {
  rating: number;
  count: number;
  url: string;
}

export interface RooferProvider {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  badge: string;
  topPickCategory: 'Best Overall' | 'Best Value' | 'Best for Flat Roofs' | 'Best for Historic Brownstones' | 'Fastest Emergency Response';
  logoText: string;
  imageUrl: string;
  photoCount: number;
  borough: 'All' | 'Manhattan' | 'Brooklyn' | 'Queens' | 'Bronx' | 'Staten Island';
  address: string;
  servesArea?: string;
  phone: string;
  displayPhone: string;
  website: string;
  licenseNumber: string;
  yearsInBusiness: number;
  sinceYear: number;
  isLicensed?: boolean;
  isInsured: boolean;
  isBonded: boolean;
  hasWarranty: boolean;
  financingAvailable: boolean;
  emergencyService: boolean;
  typicalPriceRange: string;
  description: string;
  services: string[];
  reviews: {
    google: PlatformReviewData;
    yelp: PlatformReviewData;
    facebook: PlatformReviewData;
  };
  compositeRating: number;
  totalReviews: number;
  featuredQuote: string;
  verifiedYear: number;
  aiReviewSummary?: string;
  aiSummaryUpdatedAt?: string;
  scrapedReviews?: Array<{
    authorName: string;
    authorAvatarUrl?: string;
    rating: number;
    comment: string;
    reviewDate?: string;
    platform: 'GOOGLE' | 'YELP' | 'FACEBOOK' | string;
    sourceUrl?: string;
  }>;
}

export const NYC_BOROUGHS = [
  'All',
  'Manhattan',
  'Brooklyn',
  'Queens',
  'Bronx',
  'Staten Island',
] as const;

export const ROOFING_SUB_SERVICES = [
  'All Services',
  'Full Roof Replacement',
  'Emergency Leak Repair',
  'Flat Roof Systems',
  'Asphalt Shingles',
  'Commercial Roofing',
  'Slate & Tile',
  'Gutter Installation',
] as const;

export const TOP_PICK_CHIPS = [
  'All Picks',
  'Best Overall',
  'Best Value',
  'Best for Flat Roofs',
  'Best for Historic Brownstones',
  'Fastest Emergency Response',
] as const;

export const MOCK_NYC_ROOFERS: RooferProvider[] = [
  {
    id: 'roofer-1',
    name: 'Empire State Roofing & Waterproofing Specialist',
    slug: 'empire-state-roofing-waterproofing',
    tagline: '',
    badge: 'Top Pick NYC 2026',
    topPickCategory: 'Best Overall',
    logoText: 'EMPIRE STATE',
    imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
    photoCount: 24,
    borough: 'Staten Island',
    address: 'Staten Island, NY',
    servesArea: 'Serves New York, NY',
    phone: '7185550192',
    displayPhone: '(718) 555-0192',
    website: 'https://example.com/empire-state-roofing',
    licenseNumber: 'NYC-HIC #2049182',
    yearsInBusiness: 24,
    sinceYear: 2002,
    isLicensed: true,
    isInsured: true,
    isBonded: true,
    hasWarranty: true,
    financingAvailable: true,
    emergencyService: true,
    typicalPriceRange: '$6,500 – $12,500',
    description:
      'Experts in premium NYC residential & commercial roofing with 20+ years of experience. We specialize in flat roof, shingle & waterproofing systems.',
    services: [
      'Full Roof Replacement',
      'Emergency Leak Repair',
      'Commercial Roofing',
      'Flat Roof Systems',
      'Waterproofing',
    ],
    reviews: {
      google: { rating: 4.8, count: 273, url: 'https://google.com' },
      yelp: { rating: 4.7, count: 120, url: 'https://yelp.com' },
      facebook: { rating: 4.6, count: 65, url: 'https://facebook.com' },
    },
    compositeRating: 4.9,
    totalReviews: 458,
    featuredQuote:
      '"Empire State diagnosed our 4th-story brownstone leak within 30 minutes after 2 other companies failed. Completed the silicone coating in two days flat."',
    verifiedYear: 2026,
  },
  {
    id: 'roofer-2',
    name: 'Staten Island Shingles & Gutter Masters',
    slug: 'staten-island-shingle-gutter-masters',
    tagline: 'Architectural Shingles & High-Wind Systems',
    badge: 'Best Value Residential',
    topPickCategory: 'Best Value',
    logoText: 'SI ROOFING',
    imageUrl: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80',
    photoCount: 27,
    borough: 'Staten Island',
    address: 'Staten Island, NY',
    servesArea: 'Serves New York, NY',
    phone: '7185550882',
    displayPhone: '(718) 555-0882',
    website: 'https://example.com/staten-island-roofs',
    licenseNumber: 'NYC-HIC #1994022',
    yearsInBusiness: 22,
    sinceYear: 2004,
    isLicensed: true,
    isInsured: true,
    isBonded: true,
    hasWarranty: true,
    financingAvailable: true,
    emergencyService: false,
    typicalPriceRange: '$3,000 – $9,500',
    description:
      'Highly skilled team, licensed, insured and committed to quality roofing solutions for your home or business.',
    services: [
      'Roof Installation',
      'Gutter Installation',
      'Siding & Trim',
      'Roof Inspection',
    ],
    reviews: {
      google: { rating: 4.7, count: 351, url: 'https://google.com' },
      yelp: { rating: 4.6, count: 50, url: 'https://yelp.com' },
      facebook: { rating: 4.5, count: 93, url: 'https://facebook.com' },
    },
    compositeRating: 4.8,
    totalReviews: 494,
    featuredQuote:
      '"Cleanest crew ever. Not a single nail left on our lawn or driveway, and the architectural shingles look gorgeous on our colonial."',
    verifiedYear: 2026,
  },
  {
    id: 'roofer-3',
    name: 'Brooklyn Crown Roofing & Sheet Metal',
    slug: 'brooklyn-crown-roofing',
    tagline: 'Historic Brownstone & Architectural Slate Specialist',
    badge: 'Best for Historic Homes',
    topPickCategory: 'Best for Historic Brownstones',
    logoText: 'BROOKLYN CROWN',
    imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
    photoCount: 19,
    borough: 'Brooklyn',
    address: 'Brooklyn, NY',
    servesArea: 'Serves New York, NY',
    phone: '7185550244',
    displayPhone: '(718) 555-0244',
    website: 'https://example.com/brooklyn-crown',
    licenseNumber: 'NYC-HIC #1883901',
    yearsInBusiness: 18,
    sinceYear: 2008,
    isLicensed: true,
    isInsured: true,
    isBonded: true,
    hasWarranty: true,
    financingAvailable: true,
    emergencyService: false,
    typicalPriceRange: '$5,000 – $15,000',
    description:
      'Highest craftsmanship for all roof types, known for our attention to detail, premium materials and historic restoration expertise.',
    services: [
      'Slate & Tile',
      'Custom Copper',
      'Flat Roof Systems',
      'Historic Restoration',
    ],
    reviews: {
      google: { rating: 4.7, count: 345, url: 'https://google.com' },
      yelp: { rating: 4.5, count: 28, url: 'https://yelp.com' },
      facebook: { rating: 4.4, count: 39, url: 'https://facebook.com' },
    },
    compositeRating: 4.8,
    totalReviews: 372,
    featuredQuote:
      '"True craftsmen. Restored our 1890s limestone cornice and replaced the flat roof with modern seamless torch-down waterproofing."',
    verifiedYear: 2026,
  },
  {
    id: 'roofer-4',
    name: 'Gotham 24/7 Emergency Roof Repair',
    slug: 'gotham-emergency-roof-repair',
    tagline: 'Storm Damage Tarping & Active Leak Stops',
    badge: 'Fastest Response',
    topPickCategory: 'Fastest Emergency Response',
    logoText: 'GOTHAM 24/7',
    imageUrl: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=800&q=80',
    photoCount: 35,
    borough: 'Manhattan',
    address: 'New York, NY',
    servesArea: 'Serves New York, NY',
    phone: '9175550911',
    displayPhone: '(917) 555-0911',
    website: 'https://example.com/gotham-roofing',
    licenseNumber: 'NYC-HIC #2104992',
    yearsInBusiness: 14,
    sinceYear: 2012,
    isLicensed: true,
    isInsured: true,
    isBonded: true,
    hasWarranty: true,
    financingAvailable: true,
    emergencyService: true,
    typicalPriceRange: '$1,200 – $6,500',
    description:
      'Available around-the-clock for severe weather, storm damage, and urgent leak repairs. Fast response and reliable service.',
    services: [
      'Emergency Roof Repair',
      'Storm Damage',
      'Roof Tarping',
      'Leak Detection',
    ],
    reviews: {
      google: { rating: 4.6, count: 117, url: 'https://google.com' },
      yelp: { rating: 4.5, count: 95, url: 'https://yelp.com' },
      facebook: { rating: 4.2, count: 52, url: 'https://facebook.com' },
    },
    compositeRating: 4.7,
    totalReviews: 264,
    featuredQuote:
      '"During the nor\'easter last December, water was pouring into our master bedroom. Gotham arrived in under an hour and sealed the breach."',
    verifiedYear: 2026,
  },
  {
    id: 'roofer-5',
    name: 'Manhattan Apex Commercial Roof Systems',
    slug: 'manhattan-apex-commercial-roofing',
    tagline: 'High-Rise, Parapet Walls & Cool Roof Coatings',
    badge: 'Top Commercial Pick',
    topPickCategory: 'Best for Flat Roofs',
    logoText: 'APEX NYC',
    imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
    photoCount: 26,
    borough: 'Manhattan',
    address: 'Manhattan, NY',
    servesArea: 'Serves New York, NY',
    phone: '2125550381',
    displayPhone: '(212) 555-0381',
    website: 'https://example.com/manhattan-apex',
    licenseNumber: 'NYC-DOB #039211',
    yearsInBusiness: 31,
    sinceYear: 1995,
    isLicensed: true,
    isInsured: true,
    isBonded: true,
    hasWarranty: true,
    financingAvailable: true,
    emergencyService: true,
    typicalPriceRange: '$5,800 – $24,000',
    description:
      'Engineered commercial roofing solutions for the office, condominium, towers, NYC. Local Law 97 cool roof expertise.',
    services: [
      'Commercial Roofing',
      'Flat Roof Systems',
      'Emergency Leak Repair',
      'Cool Roof Coatings',
    ],
    reviews: {
      google: { rating: 4.6, count: 214, url: 'https://google.com' },
      yelp: { rating: 4.5, count: 61, url: 'https://yelp.com' },
      facebook: { rating: 4.1, count: 40, url: 'https://facebook.com' },
    },
    compositeRating: 4.7,
    totalReviews: 315,
    featuredQuote:
      '"Managed our 12-story condo roof replacement in Midtown on schedule without causing disruption to retail tenants on the ground floor."',
    verifiedYear: 2026,
  },
];
