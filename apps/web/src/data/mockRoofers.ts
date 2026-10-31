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
  topPickCategory: string;
  category?: string;
  categorySlug?: string;
  logoText: string;
  imageUrl: string;
  photoCount: number;
  photos?: Array<{
    id: string;
    url: string;
    caption?: string;
    category?: string;
  }>;
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
    houzz: PlatformReviewData;
    facebook?: PlatformReviewData;
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
    platform: 'GOOGLE' | 'YELP' | 'HOUZZ' | 'FACEBOOK' | string;
    sourceUrl?: string;
  }>;
}
