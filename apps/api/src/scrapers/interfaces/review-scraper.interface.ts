export type ReviewPlatformType = 'GOOGLE' | 'YELP' | 'FACEBOOK';

export interface ScrapedReviewItem {
  id?: string;
  authorName: string;
  authorAvatarUrl?: string;
  rating: number; // 1 to 5
  title?: string;
  comment: string;
  reviewDate?: string;
  reviewTimestamp?: Date;
  isVerified?: boolean;
  platform: ReviewPlatformType;
  sourceUrl?: string;
}

export interface PlatformScrapedResult {
  platform: ReviewPlatformType;
  rating: number; // e.g. 4.9
  totalReviews: number; // e.g. 143
  profileUrl: string;
  reviews: ScrapedReviewItem[];
  scrapedAt: Date;
  success: boolean;
  error?: string;
}

export interface MultiPlatformScrapeResult {
  businessName: string;
  scrapedAt: Date;
  compositeRating: number;
  totalReviews: number;
  platforms: {
    google?: PlatformScrapedResult;
    yelp?: PlatformScrapedResult;
    facebook?: PlatformScrapedResult;
  };
  allReviews: ScrapedReviewItem[];
}
