import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import {
  PlatformScrapedResult,
  ScrapedReviewItem,
} from '../interfaces/review-scraper.interface';
import { ScraperHttpUtil } from '../utils/scraper-http.util';

@Injectable()
export class YelpReviewsScraperService {
  private readonly logger = new Logger(YelpReviewsScraperService.name);

  /**
   * Scrapes up to maxReviews from a given Yelp Business URL or slug
   * @param yelpUrlOrSlug Full URL or slug like "stop-leak-roofing-jamaica"
   * @param maxReviews Max reviews to collect (default: 100)
   */
  async scrapeReviews(
    yelpUrlOrSlug: string,
    maxReviews = 100
  ): Promise<PlatformScrapedResult> {
    const targetUrl = yelpUrlOrSlug.startsWith('http')
      ? yelpUrlOrSlug.split('?')[0]
      : `https://www.yelp.com/biz/${yelpUrlOrSlug}`;

    this.logger.log(`🔍 [Yelp] Starting review scrape for: ${targetUrl} (Max: ${maxReviews})`);

    const result: PlatformScrapedResult = {
      platform: 'YELP',
      rating: 0,
      totalReviews: 0,
      profileUrl: targetUrl,
      reviews: [],
      scrapedAt: new Date(),
      success: false,
    };

    try {
      const pageSize = 10;
      const totalPages = Math.ceil(maxReviews / pageSize);

      for (let page = 0; page < totalPages; page++) {
        const startOffset = page * pageSize;
        const pageUrl = `${targetUrl}?start=${startOffset}&sort_by=date_desc`;

        this.logger.debug(`[Yelp] Fetching page ${page + 1}/${totalPages} (Offset: ${startOffset})`);
        const html = await ScraperHttpUtil.fetchHtml(pageUrl, {
          headers: {
            Referer: 'https://www.google.com/',
          },
        });

        const $ = cheerio.load(html);

        // 1. Extract Business Aggregate Rating & Total Count on first page
        if (page === 0) {
          this.extractAggregateStats($, result);
        }

        // 2. Extract Reviews from current page
        const pageReviews = this.parsePageReviews($, targetUrl);
        if (pageReviews.length === 0) {
          this.logger.debug(`[Yelp] No more reviews found on page ${page + 1}. Ending pagination.`);
          break;
        }

        result.reviews.push(...pageReviews);

        // If we reached target count, break
        if (result.reviews.length >= maxReviews) {
          result.reviews = result.reviews.slice(0, maxReviews);
          break;
        }

        // Gentle delay between pages
        if (page < totalPages - 1) {
          await ScraperHttpUtil.sleep(400);
        }
      }

      // If totalReviews is still 0 but reviews were collected
      if (result.totalReviews === 0 && result.reviews.length > 0) {
        result.totalReviews = result.reviews.length;
        const sum = result.reviews.reduce((acc, r) => acc + r.rating, 0);
        result.rating = Math.round((sum / result.reviews.length) * 10) / 10;
      }

      result.success = true;
      this.logger.log(
        `✅ [Yelp] Completed scrape: ${result.reviews.length} reviews collected (Rating: ${result.rating}, Total: ${result.totalReviews})`
      );
      return result;
    } catch (err: any) {
      this.logger.error(`❌ [Yelp] Scraping failed for ${targetUrl}: ${err.message}`);
      result.error = err.message;
      return result;
    }
  }

  /**
   * Extract aggregate rating and review count from JSON-LD schema or HTML header
   */
  private extractAggregateStats($: cheerio.CheerioAPI, result: PlatformScrapedResult): void {
    // Try JSON-LD first
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html() || '{}');
        if (json['@type'] === 'LocalBusiness' || json['@type'] === 'RoofingContractor' || json.aggregateRating) {
          if (json.aggregateRating) {
            result.rating = parseFloat(json.aggregateRating.ratingValue) || result.rating;
            result.totalReviews = parseInt(json.aggregateRating.reviewCount, 10) || result.totalReviews;
          }
        }
      } catch {
        // Continue
      }
    });

    // Fallback: DOM Selectors
    if (result.rating === 0) {
      const starEl = $('[data-testid="rating-star"], div[aria-label*="star rating"]').first();
      const ariaLabel = starEl.attr('aria-label') || '';
      if (ariaLabel) {
        result.rating = ScraperHttpUtil.parseStarRating(ariaLabel);
      }
    }

    if (result.totalReviews === 0) {
      const countEl = $('a[href*="#reviews"], span:contains("reviews")').first();
      const countText = countEl.text();
      const match = countText.match(/([0-9,]+)/);
      if (match) {
        result.totalReviews = parseInt(match[1].replace(/,/g, ''), 10);
      }
    }
  }

  /**
   * Parse review items on a single Yelp page
   */
  private parsePageReviews($: cheerio.CheerioAPI, sourceUrl: string): ScrapedReviewItem[] {
    const reviews: ScrapedReviewItem[] = [];

    // Select review containers (Yelp uses aria-label or specific CSS class patterns)
    $('section[aria-label="Recommended Reviews"] ul > li, div[class*="review__"], li.css-1122zq5').each((_, el) => {
      const node = $(el);

      // 1. Author Name
      const authorName =
        node.find('a[href*="/user_details?userid="], span[class*="user-passport-info"] a, span.css-166la90').first().text().trim() ||
        node.find('.user-name, [class*="userName"]').text().trim();

      if (!authorName) return; // Skip non-review list items (e.g. ads, banners)

      // 2. Author Avatar
      const authorAvatarUrl =
        node.find('img[src*="user_avatars"], img[alt*="photo"]').first().attr('src') || '';

      // 3. Star Rating
      const starEl = node.find('div[aria-label*="star rating"], [class*="rating__"] [aria-label]').first();
      const starLabel = starEl.attr('aria-label') || starEl.text() || '';
      const rating = ScraperHttpUtil.parseStarRating(starLabel);

      // 4. Review Date
      const dateText = node.find('span[class*="css-chan6m"], span[class*="css-108eyak"], [class*="reviewDate"]').first().text().trim();

      // 5. Review Comment Content
      const commentEl = node.find('p[class*="comment__"], span[class*="raw__"], p.comment');
      const comment = ScraperHttpUtil.cleanText(commentEl.text());

      if (comment) {
        reviews.push({
          authorName,
          authorAvatarUrl,
          rating,
          comment,
          reviewDate: dateText || undefined,
          isVerified: true,
          platform: 'YELP',
          sourceUrl,
        });
      }
    });

    return reviews;
  }
}
