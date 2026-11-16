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
  async scrapeGoogle(
    queryOrUrl: string,
    maxReviews = 2000,
    searchHint?: string
  ): Promise<PlatformScrapedResult> {
    return this.googleScraper.scrapeReviews(queryOrUrl, maxReviews, searchHint);
  }

  /**
   * Scrapes Yelp reviews directly
   */
  async scrapeYelp(urlOrSlug: string, maxReviews = 2000): Promise<PlatformScrapedResult> {
    return this.yelpScraper.scrapeReviews(urlOrSlug, maxReviews);
  }

  /**
   * Scrapes HomeAdvisor ratings and homeowner reviews directly
   */
  async scrapeHomeAdvisor(urlOrQuery: string, maxReviews = 2000): Promise<PlatformScrapedResult> {
    return this.homeAdvisorScraper.scrapeReviews(urlOrQuery, maxReviews);
  }

  /**
   * Scrapes Houzz recommendations and reviews directly
   */
  async scrapeHouzz(urlOrSlug: string, maxReviews = 2000): Promise<PlatformScrapedResult> {
    return this.houzzScraper.scrapeReviews(urlOrSlug, maxReviews);
  }

  /**
   * Scrapes all 4 platforms (Google, Yelp, HomeAdvisor, Houzz) for a provider in parallel
   */
  async scrapeAllPlatforms(
    target: ProviderScrapeTarget,
    maxPerPlatform = 2000,
    platforms?: string[]
  ): Promise<MultiPlatformScrapeResult> {
    const { businessName, city, borough, googleUrl, yelpUrl, homeAdvisorUrl, houzzUrl } = target;
    const locationStr = borough || city || 'New York';
    const enabled =
      platforms && platforms.length > 0
        ? new Set(platforms.map((p) => p.trim().toUpperCase()))
        : new Set(['GOOGLE', 'YELP', 'HOMEADVISOR', 'HOUZZ']);

    this.logger.log(
      `🚀 [All-Scraper] Initiating review sync (${[...enabled].join(', ')}) for: "${businessName}" (Max/Platform: ${maxPerPlatform})`
    );

    const isCompleteGooglePlaceUrl =
      Boolean(googleUrl) &&
      (googleUrl!.includes('place_id:') ||
        (/google\.com\/maps\/place\//i.test(googleUrl!) &&
          googleUrl!.length < 190 &&
          (googleUrl!.includes('!3m') || googleUrl!.includes('0x'))));

    const searchHint = `${businessName} ${locationStr} NY`;
    const googleQuery = isCompleteGooglePlaceUrl ? googleUrl! : searchHint;
    const yelpTarget = yelpUrl || searchHint;
    const homeAdvisorTarget = homeAdvisorUrl || searchHint;
    const houzzTarget = houzzUrl || searchHint;

    // Run lightweight HTTP/Serper scrapers (Yelp + HomeAdvisor) alongside sequential free Puppeteer scrapers (Google -> Houzz)
    // so at most ONE Chromium instance runs at a time, eliminating dual-browser memory spikes.
    const runBrowserScrapersSequentially = async () => {
      const g = enabled.has('GOOGLE')
        ? await this.googleScraper
            .scrapeReviews(googleQuery, maxPerPlatform, searchHint)
            .catch((e) => {
              this.logger.warn(`Google scrape error: ${e.message}`);
              return null;
            })
        : null;
      const hz = enabled.has('HOUZZ')
        ? await this.houzzScraper.scrapeReviews(houzzTarget, maxPerPlatform).catch((e) => {
            this.logger.warn(`Houzz scrape error: ${e.message}`);
            return null;
          })
        : null;
      return { g, hz };
    };

    const [browserPair, yelpRes, homeAdvisorRes] = await Promise.allSettled([
      runBrowserScrapersSequentially(),
      enabled.has('YELP')
        ? this.yelpScraper.scrapeReviews(yelpTarget, maxPerPlatform)
        : Promise.resolve(null),
      enabled.has('HOMEADVISOR')
        ? this.homeAdvisorScraper.scrapeReviews(homeAdvisorTarget, maxPerPlatform)
        : Promise.resolve(null),
    ]);

    const googleRes =
      browserPair.status === 'fulfilled'
        ? ({ status: 'fulfilled', value: browserPair.value.g } as const)
        : ({ status: 'rejected', reason: browserPair.reason } as const);
    const houzzRes =
      browserPair.status === 'fulfilled'
        ? ({ status: 'fulfilled', value: browserPair.value.hz } as const)
        : ({ status: 'rejected', reason: browserPair.reason } as const);

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
    result.discoveredWebsiteUrl =
      result.platforms.google?.discoveredWebsiteUrl ||
      result.platforms.houzz?.discoveredWebsiteUrl ||
      undefined;

    this.logger.log(
      `🎉 [All-Scraper] Completed 4-platform scrape for "${businessName}": Total Reviews: ${result.totalReviews}, Composite Rating: ${result.compositeRating}, Collected Review Comments: ${result.allReviews.length}`
    );

    return result;
  }
}
