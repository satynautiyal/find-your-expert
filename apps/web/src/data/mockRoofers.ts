export interface PlatformReviewData {
  rating: number;
  count: number;
  url: string;
}

export interface ProviderProjectPhotoItem {
  id: string;
  url: string;
  caption?: string;
  width?: number;
  height?: number;
}

export interface ProviderProjectItem {
  id: string;
  title: string;
  slug: string;
  description?: string;
  location?: string;
  projectYear?: number;
  costRange?: string;
  serviceCategory?: string;
  sourceUrl?: string;
  coverUrl: string;
  photoCount: number;
  photos: ProviderProjectPhotoItem[];
}

export interface ProviderTeamMemberItem {
  id: string;
  name: string;
  role?: string;
  credentials?: string;
  bio?: string;
  photoUrl?: string;
}

export interface ProviderReviewStats {
  totalSaved: number;
  withPhotosCount: number;
  platformCounts: Record<string, number>;
  starDistribution: Array<{ stars: number; count: number; pct: number }>;
}

export interface AiReviewTagItem {
  label: string;
  keyword: string;
  mentionCount: number;
  sentiment: 'positive' | 'neutral' | 'caution';
  category:
    | 'craftsmanship'
    | 'punctuality'
    | 'pricing'
    | 'communication'
    | 'cleanliness'
    | 'specialty'
    | 'trust'
    | string;
}

export interface AiReviewAnalysisData {
  verdictHeadline: string;
  summary: string;
  tags: AiReviewTagItem[];
  analyzedCount: number;
  maxWindowSize?: number;
  platformsIncluded?: Partial<Record<'GOOGLE' | 'HOUZZ' | 'YELP' | 'HOMEADVISOR' | string, number>>;
  averageRating?: number;
  generatedAt?: string;
  version?: number;
}

export interface RooferProvider {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  badge: string;
  topPickCategory: string;
  category?: string;
  categorySlug?: string;
  logoText: string;
  logoUrl?: string;
  imageUrl: string;
  photoCount: number;
  photos?: Array<{
    id: string;
    url: string;
    caption?: string;
    category?: string;
  }>;
  projectCount?: number;
  projects?: ProviderProjectItem[];
  teamCount?: number;
  teamMembers?: ProviderTeamMemberItem[];
  borough: string;
  city?: string;
  state?: string;
  zipCode?: string;
  address: string;
  servesArea?: string;
  serviceAreas?: string[];
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
    homeadvisor?: PlatformReviewData;
    houzz: PlatformReviewData;
    facebook?: PlatformReviewData;
  };
  compositeRating: number;
  totalReviews: number;
  featuredQuote: string;
  verifiedYear: number;
  reviewsLastUpdatedAt?: string;
  aiReviewSummary?: string;
  aiReviewAnalysis?: AiReviewAnalysisData;
  aiSummaryUpdatedAt?: string;
  reviewStats?: ProviderReviewStats;
  scrapedReviews?: Array<{
    authorName: string;
    authorAvatarUrl?: string;
    rating: number;
    comment: string;
    reviewDate?: string;
    platform: 'GOOGLE' | 'YELP' | 'HOMEADVISOR' | 'HOUZZ' | 'FACEBOOK' | string;
    photoUrls?: string[];
  }>;
}
