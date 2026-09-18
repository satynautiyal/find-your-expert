import { Injectable, Logger } from '@nestjs/common';
import { GoogleReviewsScraperService } from './google/google-reviews-scraper.service';
import { YelpReviewsScraperService } from './yelp/yelp-reviews-scraper.service';
import { FacebookReviewsScraperService } from './facebook/facebook-reviews-scraper.service';
import {
  MultiPlatformScrapeResult,
  PlatformScrapedResult,
  ScrapedReviewItem,
} from './interfaces/review-scraper.interface';

export interface ProviderScrapeTarget {
  businessName: string;
  city?: string;
  borough?: string;
  googleUrl?: string;
  yelpUrl?: string;
  facebookUrl?: string;
}

@Injectable()
export class ReviewsScraperService {
  private readonly logger = new Logger(ReviewsScraperService.name);

  constructor(
    public readonly googleScraper: GoogleReviewsScraperService,
    public readonly yelpScraper: YelpReviewsScraperService,
    public readonly facebookScraper: FacebookReviewsScraperService
  ) {}

  /**
   * Scrapes Google reviews directly
   */
  async scrapeGoogle(queryOrUrl: string, maxReviews = 100): Promise<PlatformScrapedResult> {
    return this.googleScraper.scrapeReviews(queryOrUrl, maxReviews);
  }

  /**
   * Scrapes Yelp reviews directly
   */
  async scrapeYelp(urlOrSlug: string, maxReviews = 100): Promise<PlatformScrapedResult> {
    return this.yelpScraper.scrapeReviews(urlOrSlug, maxReviews);
  }

  /**
   * Scrapes Facebook recommendations and reviews directly
   */
  async scrapeFacebook(urlOrHandle: string, maxReviews = 100): Promise<PlatformScrapedResult> {
    return this.facebookScraper.scrapeReviews(urlOrHandle, maxReviews);
  }

  /**
   * Scrapes all available platforms (Google, Yelp, Facebook) for a provider in parallel
   */
  async scrapeAllPlatforms(
    target: ProviderScrapeTarget,
    maxPerPlatform = 50
  ): Promise<MultiPlatformScrapeResult> {
    const { businessName, city, borough, googleUrl, yelpUrl, facebookUrl } = target;
    const locationStr = borough || city || 'New York';

    this.logger.log(`🚀 [All-Scraper] Initiating multi-platform review sync for: "${businessName}"`);

    // Prioritize direct Maps place query for highest extraction success
    const googleQuery = `${businessName} ${locationStr} NY`;
    const yelpTarget = yelpUrl || `${businessName} ${locationStr}`;
    const facebookTarget = facebookUrl || businessName;

    const [googleRes, yelpRes, fbRes] = await Promise.allSettled([
      this.googleScraper.scrapeReviews(googleQuery, maxPerPlatform),
      yelpUrl ? this.yelpScraper.scrapeReviews(yelpTarget, maxPerPlatform) : Promise.resolve(null),
      facebookUrl ? this.facebookScraper.scrapeReviews(facebookTarget, maxPerPlatform) : Promise.resolve(null),
    ]);

    const result: MultiPlatformScrapeResult = {
      businessName,
      scrapedAt: new Date(),
      compositeRating: 0,
      totalReviews: 0,
      platforms: {},
      allReviews: [],
    };

    let totalScore = 0;
    let totalCount = 0;

    // 1. Process Google
    if (googleRes.status === 'fulfilled' && googleRes.value) {
      result.platforms.google = googleRes.value;
      if (googleRes.value.success && googleRes.value.totalReviews > 0) {
        totalScore += googleRes.value.rating * googleRes.value.totalReviews;
        totalCount += googleRes.value.totalReviews;
      }
      result.allReviews.push(...(googleRes.value.reviews || []));
    }

    // 2. Process Yelp
    if (yelpRes.status === 'fulfilled' && yelpRes.value) {
      result.platforms.yelp = yelpRes.value;
      if (yelpRes.value.success && yelpRes.value.totalReviews > 0) {
        totalScore += yelpRes.value.rating * yelpRes.value.totalReviews;
        totalCount += yelpRes.value.totalReviews;
      }
      result.allReviews.push(...(yelpRes.value.reviews || []));
    }

    // 3. Process Facebook
    if (fbRes.status === 'fulfilled' && fbRes.value) {
      result.platforms.facebook = fbRes.value;
      if (fbRes.value.success && fbRes.value.totalReviews > 0) {
        totalScore += fbRes.value.rating * fbRes.value.totalReviews;
        totalCount += fbRes.value.totalReviews;
      }
      result.allReviews.push(...(fbRes.value.reviews || []));
    }

    // Calculate overall composite rating
    result.totalReviews = totalCount;
    result.compositeRating = totalCount > 0 ? Math.round((totalScore / totalCount) * 10) / 10 : 0;

    this.logger.log(
      `🎉 [All-Scraper] Completed multi-platform scrape for "${businessName}": Total Reviews: ${result.totalReviews}, Composite Rating: ${result.compositeRating}, Collected Review Comments: ${result.allReviews.length}`
    );

    return result;
  }
}
