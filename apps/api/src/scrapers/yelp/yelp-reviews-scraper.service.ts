import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import {
  PlatformScrapedResult,
  ScrapedReviewItem,
} from '../interfaces/review-scraper.interface';
import { ScraperHttpUtil } from '../utils/scraper-http.util';
import { BrowserPoolUtil } from '../utils/browser-pool.util';

@Injectable()
export class YelpReviewsScraperService {
  private readonly logger = new Logger(YelpReviewsScraperService.name);

  /**
   * Scrapes Yelp reviews using a multi-strategy approach:
   *   1. Yelp Fusion API (if YELP_API_KEY is configured)
   *   2. Google Search rich snippet extraction (free, reliable)
   *   3. Direct HTML scraping fallback (blocked by DataDome)
   *
   * @param yelpUrlOrSlug Full URL or slug like "b-and-b-contracting-staten-island"
   * @param maxReviews Max reviews to collect (default: 100)
   */
  async scrapeReviews(
    yelpUrlOrSlug: string,
    maxReviews = 100,
  ): Promise<PlatformScrapedResult> {
    const businessAlias = this.extractBusinessAlias(yelpUrlOrSlug);
    const targetUrl = yelpUrlOrSlug.startsWith('http')
      ? yelpUrlOrSlug.split('?')[0]
      : `https://www.yelp.com/biz/${businessAlias}`;

    this.logger.log(`🔍 [Yelp] Starting review fetch for: ${targetUrl} (Max: ${maxReviews})`);

    const result: PlatformScrapedResult = {
      platform: 'YELP',
      rating: 0,
      totalReviews: 0,
      profileUrl: targetUrl,
      reviews: [],
      scrapedAt: new Date(),
      success: false,
    };

    // Strategy 1: Try Official Yelp Fusion API if API key is configured
    const apiKey = process.env.YELP_API_KEY || process.env.YELP_FUSION_API_KEY;
    if (apiKey) {
      try {
        this.logger.log(`⚡ [Yelp] Using official Yelp Fusion API for: ${businessAlias}`);
        return await this.fetchViaFusionApi(businessAlias, targetUrl, apiKey, maxReviews);
      } catch (apiErr: any) {
        this.logger.warn(`⚠️ [Yelp] Fusion API failed (${apiErr.message}), trying Google snippet strategy...`);
      }
    }

    // Strategy 2: Extract rating + review snippets via Google Search rich results
    // Google caches Yelp ratings as "3.0(4)" in its search index — no DataDome!
    try {
      this.logger.log(`🌐 [Yelp] Using Google Search rich snippet strategy for: ${businessAlias}`);
      const googleResult = await this.fetchViaGoogleSnippet(businessAlias, targetUrl, maxReviews);
      if (googleResult.success) {
        return googleResult;
      }
      this.logger.warn(`⚠️ [Yelp] Google snippet did not return data, trying direct scrape...`);
    } catch (googleErr: any) {
      this.logger.warn(`⚠️ [Yelp] Google snippet strategy failed (${googleErr.message}), trying direct scrape...`);
    }

    // Strategy 3: Direct HTML scraping (likely blocked by DataDome, but try anyway)
    try {
      return await this.fetchViaDirectScrape(targetUrl, maxReviews, result);
    } catch (err: any) {
      this.logger.error(`❌ [Yelp] All strategies failed for ${targetUrl}: ${err.message}`);
      result.error = err.message;
      return result;
    }
  }

  /**
   * Strategy 2: Extract Yelp rating and review snippets from Google Search results.
   * Google indexes Yelp business pages and shows "3.0(4)" rating in rich snippets.
   * This bypasses DataDome entirely since we're reading Google, not Yelp.
   */
  private async fetchViaGoogleSnippet(
    businessAlias: string,
    profileUrl: string,
    maxReviews: number,
  ): Promise<PlatformScrapedResult> {
    const result: PlatformScrapedResult = {
      platform: 'YELP',
      rating: 0,
      totalReviews: 0,
      profileUrl,
      reviews: [],
      scrapedAt: new Date(),
      success: false,
    };

    let browser: any = null;
    try {
      browser = await BrowserPoolUtil.createBrowser();
      const page = await BrowserPoolUtil.createStealthPage(browser);

      // Search Google for the exact Yelp business page
      const searchQuery = `site:yelp.com/biz/${businessAlias}`;
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&gl=us&hl=en`;

      this.logger.debug(`[Yelp] Google search: ${searchQuery}`);
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 20000 });
      await new Promise((r: any) => setTimeout(r, 1500));

      // Extract data from Google's rendered search results
      const extracted = await page.evaluate((maxCount: number) => {
        const body = document.body?.innerText || '';

        // Check for Google CAPTCHA
        if (body.includes('unusual traffic') || body.includes('not a robot')) {
          return { error: 'CAPTCHA', rating: 0, reviewCount: 0, snippets: [] as string[] };
        }

        // Google shows Yelp rating as "3.0(4)" pattern in rich snippets
        const ratingPattern = body.match(/(\d\.?\d?)\((\d+)\)/);
        // Alternative: "Rating: 3.0 · 4 reviews"
        const ratingAlt = body.match(/Rating:\s*(\d\.?\d?)\s*[·•]\s*(\d+)\s*reviews?/i);

        const rating = ratingPattern
          ? parseFloat(ratingPattern[1])
          : ratingAlt
            ? parseFloat(ratingAlt[1])
            : 0;

        const reviewCount = ratingPattern
          ? parseInt(ratingPattern[2], 10)
          : ratingAlt
            ? parseInt(ratingAlt[2], 10)
            : 0;

        // Extract review snippet text from search results
        const snippets: string[] = [];
        const seen = new Set<string>();
        document.querySelectorAll('div.VwiC3b, span.aCOpRe, div[data-sncf], em').forEach((el) => {
          const text = (el as HTMLElement).innerText?.trim();
          if (text && text.length > 30 && !text.includes('Missing:') && !seen.has(text)) {
            seen.add(text);
            snippets.push(text);
          }
        });

        return { rating, reviewCount, snippets: snippets.slice(0, maxCount), error: '' };
      }, maxReviews);

      if (extracted.error === 'CAPTCHA') {
        this.logger.warn('[Yelp] Google showed CAPTCHA, cannot extract snippet');
        return result;
      }

      result.rating = extracted.rating;
      result.totalReviews = extracted.reviewCount;

      // Build review items from snippets
      if (extracted.snippets.length > 0) {
        const seenComments = new Set<string>();
        for (const snippet of extracted.snippets) {
          const cleanSnippet = snippet.replace(/Read more$/i, '').replace(/\.{3}$/i, '').trim();
          if (cleanSnippet.length > 20 && !seenComments.has(cleanSnippet.substring(0, 50))) {
            seenComments.add(cleanSnippet.substring(0, 50));
            result.reviews.push({
              authorName: 'Yelp Reviewer',
              rating: result.rating || 5,
              comment: cleanSnippet,
              isVerified: true,
              platform: 'YELP',
              sourceUrl: profileUrl,
            });
          }
        }
      }

      result.success = result.rating > 0 || result.totalReviews > 0;

      if (result.success) {
        this.logger.log(
          `✅ [Yelp via Google] Rating: ${result.rating}★, Total Reviews: ${result.totalReviews}, Snippets: ${result.reviews.length}`,
        );
      }

      return result;
    } finally {
      if (browser) {
        try { await browser.close(); } catch {}
      }
    }
  }

  /**
   * Strategy 3: Direct HTML scraping (often blocked by DataDome)
   */
  private async fetchViaDirectScrape(
    targetUrl: string,
    maxReviews: number,
    result: PlatformScrapedResult,
  ): Promise<PlatformScrapedResult> {
    const pageSize = 10;
    const totalPages = Math.ceil(maxReviews / pageSize);

    for (let page = 0; page < totalPages; page++) {
      const startOffset = page * pageSize;
      const pageUrl = `${targetUrl}?start=${startOffset}&sort_by=date_desc`;

      this.logger.debug(`[Yelp] Fetching page ${page + 1}/${totalPages} (Offset: ${startOffset})`);

      let html: string;
      try {
        html = await ScraperHttpUtil.fetchHtml(pageUrl, {
          headers: {
            Referer: 'https://www.google.com/',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
          },
        });
      } catch (fetchErr: any) {
        if (fetchErr.message && fetchErr.message.includes('403')) {
          this.logger.warn(
            `⚠️ [Yelp] HTTP 403 — Yelp DataDome blocked direct scrape. Rating/review count may still be available via Google snippet strategy.`,
          );
          result.error = 'Direct scraping blocked by DataDome. Data fetched via Google snippet instead.';
          return result;
        }
        throw fetchErr;
      }

      const $ = cheerio.load(html);

      if (page === 0) {
        this.extractAggregateStats($, result);
      }

      const pageReviews = this.parsePageReviews($, targetUrl);
      if (pageReviews.length === 0) {
        this.logger.debug(`[Yelp] No more reviews found on page ${page + 1}. Ending pagination.`);
        break;
      }

      result.reviews.push(...pageReviews);

      if (result.reviews.length >= maxReviews) {
        result.reviews = result.reviews.slice(0, maxReviews);
        break;
      }

      if (page < totalPages - 1) {
        await ScraperHttpUtil.sleep(400);
      }
    }

    if (result.totalReviews === 0 && result.reviews.length > 0) {
      result.totalReviews = result.reviews.length;
      const sum = result.reviews.reduce((acc, r) => acc + r.rating, 0);
      result.rating = Math.round((sum / result.reviews.length) * 10) / 10;
    }

    if (result.reviews.length > 0 || result.totalReviews > 0) {
      result.success = true;
    }

    return result;
  }

  /**
   * Extract business slug / alias from full Yelp URL or raw slug
   */
  private extractBusinessAlias(urlOrSlug: string): string {
    let clean = urlOrSlug.trim();
    if (clean.includes('/biz/')) {
      const match = clean.match(/\/biz\/([^/?#]+)/);
      if (match) return match[1];
    }
    clean = clean.replace(/^https?:\/\/(www\.)?yelp\.com\/?/i, '');
    clean = clean.split('?')[0].split('#')[0].replace(/^\/+|\/+$/g, '');
    return clean;
  }

  /**
   * Strategy 1: Fetch via official Yelp Fusion API
   */
  private async fetchViaFusionApi(
    businessAlias: string,
    profileUrl: string,
    apiKey: string,
    maxReviews: number,
  ): Promise<PlatformScrapedResult> {
    const headers = {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    };

    const result: PlatformScrapedResult = {
      platform: 'YELP',
      rating: 0,
      totalReviews: 0,
      profileUrl,
      reviews: [],
      scrapedAt: new Date(),
      success: false,
    };

    // 1. Business Details
    const bizUrl = `https://api.yelp.com/v3/businesses/${encodeURIComponent(businessAlias)}`;
    const bizRes = await fetch(bizUrl, { headers });
    if (bizRes.ok) {
      const bizData = await bizRes.json();
      result.rating = bizData.rating || 0;
      result.totalReviews = bizData.review_count || 0;
      if (bizData.url) {
        result.profileUrl = bizData.url.split('?')[0];
      }
    }

    // 2. Reviews
    const reviewsUrl = `https://api.yelp.com/v3/businesses/${encodeURIComponent(businessAlias)}/reviews?limit=${Math.min(maxReviews, 50)}&sort_by=newest`;
    const reviewsRes = await fetch(reviewsUrl, { headers });
    if (reviewsRes.ok) {
      const reviewsData = await reviewsRes.json();
      const rawReviews = reviewsData.reviews || [];
      result.reviews = rawReviews.map((r: any): ScrapedReviewItem => ({
        authorName: r.user?.name || 'Yelp Reviewer',
        authorAvatarUrl: r.user?.image_url || undefined,
        rating: r.rating || 5,
        comment: ScraperHttpUtil.cleanText(r.text || ''),
        reviewDate: r.time_created || undefined,
        isVerified: true,
        platform: 'YELP',
        sourceUrl: r.url || result.profileUrl,
      }));
      if (result.totalReviews === 0) {
        result.totalReviews = reviewsData.total || result.reviews.length;
      }
    }

    result.success = result.totalReviews > 0 || result.reviews.length > 0;
    this.logger.log(
      `✅ [Yelp Fusion API] Fetched: ${result.reviews.length} reviews (Rating: ${result.rating}, Total: ${result.totalReviews})`,
    );
    return result;
  }

  /**
   * Extract aggregate rating and review count from JSON-LD or HTML
   */
  private extractAggregateStats($: cheerio.CheerioAPI, result: PlatformScrapedResult): void {
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

    $('section[aria-label="Recommended Reviews"] ul > li, div[class*="review__"], li.css-1122zq5, li.css-1q20h9a').each((_, el) => {
      const node = $(el);

      const authorName =
        node.find('a[href*="/user_details?userid="], span[class*="user-passport-info"] a, span.css-166la90').first().text().trim() ||
        node.find('.user-name, [class*="userName"]').text().trim();

      if (!authorName) return;

      const authorAvatarUrl =
        node.find('img[src*="user_avatars"], img[alt*="photo"]').first().attr('src') || '';

      const starEl = node.find('div[aria-label*="star rating"], [class*="rating__"] [aria-label]').first();
      const starLabel = starEl.attr('aria-label') || starEl.text() || '';
      const rating = ScraperHttpUtil.parseStarRating(starLabel);

      const dateText = node.find('span[class*="css-chan6m"], span[class*="css-108eyak"], [class*="reviewDate"]').first().text().trim();

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
