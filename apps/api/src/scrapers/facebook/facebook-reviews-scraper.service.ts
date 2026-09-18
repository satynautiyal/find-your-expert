import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import {
  PlatformScrapedResult,
  ScrapedReviewItem,
} from '../interfaces/review-scraper.interface';
import { ScraperHttpUtil } from '../utils/scraper-http.util';

@Injectable()
export class FacebookReviewsScraperService {
  private readonly logger = new Logger(FacebookReviewsScraperService.name);

  /**
   * Scrapes Facebook Page recommendations and reviews
   * @param pageUrlOrHandle Facebook page URL or slug (e.g. "KingRemodelingCorp" or "https://www.facebook.com/KingRemodelingCorp/reviews")
   * @param maxReviews Max reviews to collect (default: 100)
   */
  async scrapeReviews(
    pageUrlOrHandle: string,
    maxReviews = 100
  ): Promise<PlatformScrapedResult> {
    let targetUrl = pageUrlOrHandle;
    if (!targetUrl.startsWith('http')) {
      targetUrl = `https://www.facebook.com/${pageUrlOrHandle.replace(/^\/+/, '')}/reviews/`;
    } else if (!targetUrl.includes('/reviews')) {
      targetUrl = targetUrl.replace(/\/+$/, '') + '/reviews/';
    }

    this.logger.log(`🔍 [Facebook] Starting reviews scrape for: "${targetUrl}" (Max: ${maxReviews})`);

    const result: PlatformScrapedResult = {
      platform: 'FACEBOOK',
      rating: 0,
      totalReviews: 0,
      profileUrl: targetUrl,
      reviews: [],
      scrapedAt: new Date(),
      success: false,
    };

    try {
      const html = await ScraperHttpUtil.fetchHtml(targetUrl, {
        headers: {
          'Sec-Fetch-Site': 'same-origin',
        },
      });

      const $ = cheerio.load(html);

      // 1. Extract Facebook Page Rating & Recommendation Stats
      this.extractFacebookStats($, html, result);

      // 2. Extract Reviews / Recommendations Cards
      result.reviews = this.parseFacebookReviews($, html, targetUrl, maxReviews);

      if (result.totalReviews === 0 && result.reviews.length > 0) {
        result.totalReviews = result.reviews.length;
      }
      if (result.rating === 0 && result.reviews.length > 0) {
        const sum = result.reviews.reduce((acc, r) => acc + r.rating, 0);
        result.rating = Math.round((sum / result.reviews.length) * 10) / 10;
      }

      result.success = true;
      this.logger.log(
        `✅ [Facebook] Completed scrape: ${result.reviews.length} reviews collected (Rating: ${result.rating}, Total: ${result.totalReviews})`
      );
      return result;
    } catch (err: any) {
      this.logger.error(`❌ [Facebook] Scraping failed for ${targetUrl}: ${err.message}`);
      result.error = err.message;
      return result;
    }
  }

  /**
   * Extract Facebook page ratings and review counts from meta tags or page content
   */
  private extractFacebookStats($: cheerio.CheerioAPI, rawHtml: string, result: PlatformScrapedResult): void {
    // 1. Check meta tags
    const ogDesc = $('meta[property="og:description"]').attr('content') || '';
    const ratingMatch = ogDesc.match(/Rating\s*·\s*([0-9.]+)\s*\(([0-9,]+)\s*(?:votes|reviews|ratings)/i);
    if (ratingMatch) {
      result.rating = parseFloat(ratingMatch[1]);
      result.totalReviews = parseInt(ratingMatch[2].replace(/,/g, ''), 10);
      return;
    }

    // 2. Check recommendation percentage (e.g. "98% recommend (45 reviews)")
    const percentMatch = rawHtml.match(/([0-9]{1,3})%\s+recommend/i);
    if (percentMatch) {
      const percent = parseInt(percentMatch[1], 10);
      result.rating = Math.round((percent / 20) * 10) / 10; // Convert 100% -> 5.0 scale
    }

    // 3. Search raw scripts for ratingValue
    const scriptRatingMatch = rawHtml.match(/"ratingValue":\s*"?([0-9.]+)"?/);
    if (scriptRatingMatch) {
      result.rating = parseFloat(scriptRatingMatch[1]);
    }
    const scriptCountMatch = rawHtml.match(/"reviewCount":\s*"?([0-9]+)"?/);
    if (scriptCountMatch) {
      result.totalReviews = parseInt(scriptCountMatch[1], 10);
    }
  }

  /**
   * Parse Facebook review feed items
   */
  private parseFacebookReviews(
    $: cheerio.CheerioAPI,
    rawHtml: string,
    sourceUrl: string,
    maxReviews: number
  ): ScrapedReviewItem[] {
    const reviews: ScrapedReviewItem[] = [];

    // Check user post/review nodes
    $('div[role="article"], div[data-ad-preview="message"], div[class*="userContentWrapper"]').each((_, el) => {
      if (reviews.length >= maxReviews) return false;

      const node = $(el);

      // Author Name
      const authorName =
        node.find('h2 a, strong, span[dir="auto"] a, .profileLink').first().text().trim();

      if (!authorName) return;

      // Author Avatar
      const authorAvatarUrl =
        node.find('image, img[src*="fbcdn"], img[src*="profile"]').first().attr('src') || '';

      // Review Text Content
      const commentEl = node.find('div[dir="auto"][style*="text-align"], div[data-ad-preview="message"], .userContent');
      const comment = ScraperHttpUtil.cleanText(commentEl.text());

      // Date Text
      const dateText = node.find('abbr, span[id*="timestamp"], a[href*="posts"], a[href*="story"]').first().text().trim();

      // Facebook recommendations are positive (5) or negative (1)
      const isNegative = /doesn't recommend|does not recommend/i.test(node.text());
      const rating = isNegative ? 1 : 5;

      if (comment && comment.length > 10) {
        reviews.push({
          authorName,
          authorAvatarUrl,
          rating,
          comment,
          reviewDate: dateText || undefined,
          isVerified: true,
          platform: 'FACEBOOK',
          sourceUrl,
        });
      }
    });

    return reviews;
  }
}
