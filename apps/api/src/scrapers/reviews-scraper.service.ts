import { Injectable, Logger } from '@nestjs/common';
import { GoogleReviewsScraperService } from './google/google-reviews-scraper.service';
import { YelpReviewsScraperService } from './yelp/yelp-reviews-scraper.service';
import { HomeAdvisorReviewsScraperService } from './homeadvisor/homeadvisor-reviews-scraper.service';
import { HouzzReviewsScraperService } from './houzz/houzz-reviews-scraper.service';
import {
  MultiPlatformScrapeResult,
  PlatformScrapedResult,
} from './interfaces/review-scraper.interface';

export interface ProviderScrapeTarget {
  businessName: string;
  city?: string;
  borough?: string;
  googleUrl?: string;
  yelpUrl?: string;
  homeAdvisorUrl?: string;
  houzzUrl?: string;
}

@Injectable()
export class ReviewsScraperService {
  private readonly logger = new Logger(ReviewsScraperService.name);

  constructor(
    public readonly googleScraper: GoogleReviewsScraperService,
    public readonly yelpScraper: YelpReviewsScraperService,
    public readonly homeAdvisorScraper: HomeAdvisorReviewsScraperService,
    public readonly houzzScraper: HouzzReviewsScraperService
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
   * Scrapes HomeAdvisor ratings and homeowner reviews directly
   */
  async scrapeHomeAdvisor(urlOrQuery: string, maxReviews = 100): Promise<PlatformScrapedResult> {
    return this.homeAdvisorScraper.scrapeReviews(urlOrQuery, maxReviews);
  }

  /**
   * Scrapes Houzz recommendations and reviews directly
   */
  async scrapeHouzz(urlOrSlug: string, maxReviews = 100): Promise<PlatformScrapedResult> {
    return this.houzzScraper.scrapeReviews(urlOrSlug, maxReviews);
  }

  /**
   * Scrapes all 4 platforms (Google, Yelp, HomeAdvisor, Houzz) for a provider in parallel
   */
  async scrapeAllPlatforms(
    target: ProviderScrapeTarget,
    maxPerPlatform = 50,
    platforms?: string[]
  ): Promise<MultiPlatformScrapeResult> {
    const { businessName, city, borough, yelpUrl, homeAdvisorUrl, houzzUrl } = target;
    const locationStr = borough || city || 'New York';
    const enabled =
      platforms && platforms.length > 0
        ? new Set(platforms.map((p) => p.trim().toUpperCase()))
        : new Set(['GOOGLE', 'YELP', 'HOMEADVISOR', 'HOUZZ']);

    this.logger.log(
      `🚀 [All-Scraper] Initiating review sync (${[...enabled].join(', ')}) for: "${businessName}"`
    );

    const googleQuery = `${businessName} ${locationStr} NY`;
    const yelpTarget = yelpUrl || `${businessName} ${locationStr} NY`;
    const homeAdvisorTarget = homeAdvisorUrl || `${businessName} ${locationStr} NY`;
    const houzzTarget = houzzUrl || `${businessName} ${locationStr} NY`;

    const [googleRes, yelpRes, homeAdvisorRes, houzzRes] = await Promise.allSettled([
      enabled.has('GOOGLE')
        ? this.googleScraper.scrapeReviews(googleQuery, maxPerPlatform)
        : Promise.resolve(null),
      enabled.has('YELP')
        ? this.yelpScraper.scrapeReviews(yelpTarget, maxPerPlatform)
        : Promise.resolve(null),
      enabled.has('HOMEADVISOR')
        ? this.homeAdvisorScraper.scrapeReviews(homeAdvisorTarget, maxPerPlatform)
        : Promise.resolve(null),
      enabled.has('HOUZZ')
        ? this.houzzScraper.scrapeReviews(houzzTarget, maxPerPlatform)
        : Promise.resolve(null),
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

    // 3. Process HomeAdvisor
    if (homeAdvisorRes.status === 'fulfilled' && homeAdvisorRes.value) {
      result.platforms.homeadvisor = homeAdvisorRes.value;
      if (homeAdvisorRes.value.success && homeAdvisorRes.value.totalReviews > 0) {
        totalScore += homeAdvisorRes.value.rating * homeAdvisorRes.value.totalReviews;
        totalCount += homeAdvisorRes.value.totalReviews;
      }
      result.allReviews.push(...(homeAdvisorRes.value.reviews || []));
    }

    // 4. Process Houzz
    if (houzzRes.status === 'fulfilled' && houzzRes.value) {
      result.platforms.houzz = houzzRes.value;
      if (houzzRes.value.success && houzzRes.value.totalReviews > 0) {
        totalScore += houzzRes.value.rating * houzzRes.value.totalReviews;
        totalCount += houzzRes.value.totalReviews;
      }
      result.allReviews.push(...(houzzRes.value.reviews || []));
    }

    // Calculate overall composite rating
    result.totalReviews = totalCount;
    result.compositeRating = totalCount > 0 ? Math.round((totalScore / totalCount) * 10) / 10 : 0;

    this.logger.log(
      `🎉 [All-Scraper] Completed 4-platform scrape for "${businessName}": Total Reviews: ${result.totalReviews}, Composite Rating: ${result.compositeRating}, Collected Review Comments: ${result.allReviews.length}`
    );

    return result;
  }
}
