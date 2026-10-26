import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import {
  PlatformScrapedResult,
  ScrapedReviewItem,
} from '../interfaces/review-scraper.interface';
import { ScraperHttpUtil } from '../utils/scraper-http.util';
import { BrowserPoolUtil } from '../utils/browser-pool.util';

@Injectable()
export class HouzzReviewsScraperService {
  private readonly logger = new Logger(HouzzReviewsScraperService.name);

  /**
   * Scrapes Houzz reviews using a robust multi-strategy pipeline:
   *   1. Direct stealth browser extraction of schema.org JSON-LD & .review-item DOM cards
   *   2. Cheerio direct HTML parsing fallback (if not challenged)
   *   3. Google Search rich snippet extraction (free, reliable fallback bypassing challenges)
   *
   * @param urlOrSlug Houzz profile URL, slug (e.g. "evolution-group-pfvwus-pf~1766049999"), or business name
   * @param maxReviews Max reviews to collect (default: 50)
   */
  async scrapeReviews(
    urlOrSlug: string,
    maxReviews = 50
  ): Promise<PlatformScrapedResult> {
    const targetUrl = this.normalizeHouzzUrl(urlOrSlug);

    this.logger.log(`🔍 [Houzz] Starting reviews scrape for: "${targetUrl}" (Max: ${maxReviews})`);

    const result: PlatformScrapedResult = {
      platform: 'HOUZZ',
      rating: 0,
      totalReviews: 0,
      profileUrl: targetUrl,
      reviews: [],
      scrapedAt: new Date(),
      success: false,
    };

    // Strategy 1: Direct Stealth Browser extraction (primary & most accurate for Houzz)
    if (targetUrl.includes('houzz.com')) {
      try {
        const browserResult = await this.scrapeViaStealthBrowser(targetUrl, maxReviews);
        if (browserResult.success && (browserResult.rating > 0 || browserResult.totalReviews > 0 || browserResult.reviews.length > 0)) {
          return browserResult;
        }
      } catch (err: any) {
        this.logger.warn(`⚠️ [Houzz] Direct browser scrape failed (${err.message}), trying fallback strategies...`);
      }
    }

    // Strategy 2: Cheerio direct fetch fallback (lightweight)
    if (targetUrl.includes('houzz.com')) {
      try {
        const cheerioResult = await this.scrapeViaCheerio(targetUrl, maxReviews);
        if (cheerioResult.success && cheerioResult.totalReviews > 0) {
          return cheerioResult;
        }
      } catch (cheerioErr: any) {
        this.logger.debug(`[Houzz] Cheerio fallback did not complete: ${cheerioErr.message}`);
      }
    }

    // Strategy 3: Google Search rich snippet fallback (indexes Houzz ratings as "4.8(26)")
    try {
      this.logger.log(`🌐 [Houzz] Trying Google Search rich snippet strategy for: "${urlOrSlug}"`);
      const googleResult = await this.scrapeViaGoogleSnippet(urlOrSlug, targetUrl, maxReviews);
      if (googleResult.success && (googleResult.rating > 0 || googleResult.totalReviews > 0)) {
        return googleResult;
      }
    } catch (googleErr: any) {
      this.logger.warn(`⚠️ [Houzz] Google snippet strategy failed: ${googleErr.message}`);
    }

    return result;
  }

  /**
   * Normalizes input into a full Houzz URL
   */
  private normalizeHouzzUrl(urlOrSlug: string): string {
    if (!urlOrSlug) return 'https://www.houzz.com';
    const trimmed = urlOrSlug.trim();

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed.split('?')[0];
    }

    // If it's a professional slug with ID (e.g. "evolution-group-pfvwus-pf~1766049999")
    if (trimmed.includes('pfvwus-pf~')) {
      return `https://www.houzz.com/professionals/general-contractors/${trimmed}`;
    }

    // Default to /pro/ handle
    return `https://www.houzz.com/pro/${trimmed.replace(/^\/+/, '')}`;
  }

  /**
   * Strategy 1: Full stealth browser scrape of Houzz profile page
   */
  private async scrapeViaStealthBrowser(
    targetUrl: string,
    maxReviews: number
  ): Promise<PlatformScrapedResult> {
    const result: PlatformScrapedResult = {
      platform: 'HOUZZ',
      rating: 0,
      totalReviews: 0,
      profileUrl: targetUrl,
      reviews: [],
      scrapedAt: new Date(),
      success: false,
    };

    let browser: any = null;
    try {
      browser = await BrowserPoolUtil.createBrowser();
      const page = await BrowserPoolUtil.createStealthPage(browser);

      this.logger.debug(`[Houzz] Navigating to: ${targetUrl}`);
      await page.goto(targetUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 25000,
      });

      // Small delay for dynamic client hydration
      await new Promise((r) => setTimeout(r, 3500));

      const pageData = await page.evaluate((maxCount: number) => {
        // 1. Extract schema.org JSON-LD
        let rating = 0;
        let totalReviews = 0;
        const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
        for (const s of scripts) {
          try {
            const parsed = JSON.parse(s.textContent || '');
            const items = Array.isArray(parsed) ? parsed : [parsed];
            for (const item of items) {
              if (item.aggregateRating) {
                const val = parseFloat(item.aggregateRating.ratingValue);
                const count = parseInt(item.aggregateRating.reviewCount, 10);
                if (!isNaN(val) && val > 0) rating = val;
                if (!isNaN(count) && count > 0) totalReviews = count;
              }
            }
          } catch {}
        }

        // 2. DOM aggregate rating fallback
        const bodyText = document.body.innerText || '';
        if (rating === 0) {
          const domRatingEl = document.querySelector(
            '.ReviewAggregation__StyledRating, [class*="StyledRating"], [class*="review-rating"]'
          );
          if (domRatingEl) {
            const rVal = parseFloat(domRatingEl.textContent || '');
            if (!isNaN(rVal) && rVal > 0) rating = rVal;
          }
          if (rating === 0) {
            const match = bodyText.match(/Average rating:\s*([0-9]+(?:\.[0-9]+)?)\s*out of 5/i);
            if (match) rating = parseFloat(match[1]);
          }
        }

        if (totalReviews === 0) {
          const domCountEl = document.querySelector(
            '.ReviewAggregation__StyledReviewNumber, [class*="StyledReviewNumber"]'
          );
          if (domCountEl) {
            const cVal = parseInt((domCountEl.textContent || '').replace(/\D/g, ''), 10);
            if (!isNaN(cVal) && cVal > 0) totalReviews = cVal;
          }
          if (totalReviews === 0) {
            const countMatch = bodyText.match(/([0-9,]+)\s+Reviews/i);
            if (countMatch) totalReviews = parseInt(countMatch[1].replace(/,/g, ''), 10);
          }
        }

        // 3. Extract individual review cards (.review-item)
        const reviewItems = Array.from(document.querySelectorAll('.review-item, [class*="review-item"], [class*="ReviewItem"]'));
        const reviewsRaw: Array<{
          authorName: string;
          authorAvatarUrl: string;
          rating: number;
          reviewDate: string;
          comment: string;
        }> = [];

        for (const item of reviewItems) {
          if (reviewsRaw.length >= maxCount) break;

          // Author Name
          const rightSideEl = item.querySelector('.review-item__reviewer_right_side a, [class*="reviewer_right_side"] a');
          const genericAuthorEl = item.querySelector('.review-item__reviewer a, [class*="reviewer"] a');
          let authorName = (rightSideEl?.textContent || genericAuthorEl?.textContent || '').trim();

          // Avoid using 2-letter initials icon as author name if right side is present
          if (authorName.length <= 2 && rightSideEl?.textContent) {
            authorName = rightSideEl.textContent.trim();
          }
          if (!authorName) authorName = 'Houzz Reviewer';

          // Avatar
          const avatarEl = item.querySelector('.review-item__reviewer img, [class*="reviewer"] img');
          const authorAvatarUrl = avatarEl?.getAttribute('src') || '';

          // Rating
          const itemText = (item as HTMLElement).innerText || '';
          const ratingMatch =
            itemText.match(/Average rating:\s*([0-9]+(?:\.[0-9]+)?)\s*out of 5/i) ||
            itemText.match(/([0-9]+(?:\.[0-9]+)?)\s*out of 5 stars/i);
          const reviewRating = ratingMatch ? Math.round(parseFloat(ratingMatch[1])) : 5;

          // Date
          const dateMatch = itemText.match(/(\d+\s+(?:days?|weeks?|months?|years?)\s+ago|[A-Z][a-z]+\s+\d{4})/);
          const reviewDate = dateMatch ? dateMatch[1] : '';

          // Comment body text
          const clone = item.cloneNode(true) as HTMLElement;
          const reviewerNode = clone.querySelector('.review-item__reviewer, [class*="reviewer"]');
          if (reviewerNode) reviewerNode.remove();
          const footerNodes = clone.querySelectorAll(
            'button, [class*="helpful"], [class*="Helpful"], a[href*="write-review"]'
          );
          footerNodes.forEach((f) => f.remove());

          const cleanComment = (clone.innerText || '')
            .replace(/Average rating:.*?\n/gi, '')
            .replace(/Read More/gi, '')
            .replace(/Helpful\s*\(\d+\)/gi, '')
            .replace(/(\d+\s+(?:days?|weeks?|months?|years?)\s+ago)/g, '')
            .replace(/\s+/g, ' ')
            .trim();

          if (cleanComment.length > 10) {
            reviewsRaw.push({
              authorName,
              authorAvatarUrl,
              rating: reviewRating,
              reviewDate,
              comment: cleanComment,
            });
          }
        }

        return {
          rating,
          totalReviews,
          reviews: reviewsRaw,
        };
      }, maxReviews);

      result.rating = pageData.rating;
      result.totalReviews = pageData.totalReviews;

      for (const r of pageData.reviews) {
        result.reviews.push({
          authorName: r.authorName,
          authorAvatarUrl: r.authorAvatarUrl || undefined,
          rating: r.rating,
          comment: r.comment,
          reviewDate: r.reviewDate || undefined,
          isVerified: true,
          platform: 'HOUZZ',
          sourceUrl: targetUrl,
        });
      }

      if (result.totalReviews === 0 && result.reviews.length > 0) {
        result.totalReviews = result.reviews.length;
      }
      if (result.rating === 0 && result.reviews.length > 0) {
        const sum = result.reviews.reduce((acc, cur) => acc + cur.rating, 0);
        result.rating = Math.round((sum / result.reviews.length) * 10) / 10;
      }

      result.success = result.rating > 0 || result.totalReviews > 0 || result.reviews.length > 0;
      if (result.success) {
        this.logger.log(
          `✅ [Houzz] Completed scrape: ${result.reviews.length} reviews collected (Rating: ${result.rating}, Total: ${result.totalReviews})`
        );
      }

      return result;
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch {}
      }
    }
  }

  /**
   * Strategy 2: Cheerio direct HTML parsing
   */
  private async scrapeViaCheerio(
    targetUrl: string,
    maxReviews: number
  ): Promise<PlatformScrapedResult> {
    const result: PlatformScrapedResult = {
      platform: 'HOUZZ',
      rating: 0,
      totalReviews: 0,
      profileUrl: targetUrl,
      reviews: [],
      scrapedAt: new Date(),
      success: false,
    };

    const html = await ScraperHttpUtil.fetchHtml(targetUrl, {
      headers: {
        Referer: 'https://www.houzz.com/',
      },
    });

    if (html.includes('Client Challenge') || html.includes('captcha')) {
      throw new Error('Bot challenge detected in Cheerio response');
    }

    const $ = cheerio.load(html);

    // 1. JSON-LD
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const parsed = JSON.parse($(el).text() || '');
        const items = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of items) {
          if (item.aggregateRating) {
            const val = parseFloat(item.aggregateRating.ratingValue);
            const count = parseInt(item.aggregateRating.reviewCount, 10);
            if (!isNaN(val) && val > 0) result.rating = val;
            if (!isNaN(count) && count > 0) result.totalReviews = count;
          }
        }
      } catch {}
    });

    // 2. Individual review items
    $('.review-item').each((_, el) => {
      if (result.reviews.length >= maxReviews) return false;

      const node = $(el);
      const authorName =
        node.find('.review-item__reviewer_right_side a, .review-item__reviewer a').first().text().trim() ||
        'Houzz Reviewer';
      const authorAvatarUrl = node.find('.review-item__reviewer img').first().attr('src') || '';
      const text = node.text();

      const ratingMatch = text.match(/Average rating:\s*([0-9.]+)\s*out of 5/i);
      const rating = ratingMatch ? Math.round(parseFloat(ratingMatch[1])) : 5;

      const dateMatch = text.match(/(\d+\s+(?:days?|weeks?|months?|years?)\s+ago|[A-Z][a-z]+\s+\d{4})/);
      const reviewDate = dateMatch ? dateMatch[1] : undefined;

      const commentNode = node.clone();
      commentNode.find('.review-item__reviewer, button, [class*="helpful"]').remove();
      const comment = ScraperHttpUtil.cleanText(commentNode.text());

      if (comment.length > 10) {
        result.reviews.push({
          authorName,
          authorAvatarUrl: authorAvatarUrl || undefined,
          rating,
          comment,
          reviewDate,
          isVerified: true,
          platform: 'HOUZZ',
          sourceUrl: targetUrl,
        });
      }
    });

    result.success = result.rating > 0 || result.totalReviews > 0 || result.reviews.length > 0;
    return result;
  }

  /**
   * Strategy 3: Google Search rich snippet extraction
   * Extracts Houzz ratings ("4.9(20)") from Google's cached organic search index
   */
  private async scrapeViaGoogleSnippet(
    queryOrSlug: string,
    profileUrl: string,
    maxReviews: number
  ): Promise<PlatformScrapedResult> {
    const result: PlatformScrapedResult = {
      platform: 'HOUZZ',
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

      const cleanQuery = queryOrSlug.replace(/^https?:\/\/(www\.)?houzz\.com\/(professionals\/|pro\/)?/i, '').replace(/[-_~]/g, ' ');
      const searchQuery = `site:houzz.com "${cleanQuery}" reviews`;
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&gl=us&hl=en`;

      this.logger.debug(`[Houzz] Google rich snippet search: ${searchQuery}`);
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 20000 });
      await new Promise((r) => setTimeout(r, 1500));

      const extracted = await page.evaluate((maxCount: number) => {
        const body = document.body?.innerText || '';
        if (body.includes('unusual traffic') || body.includes('not a robot')) {
          return { error: 'CAPTCHA', rating: 0, reviewCount: 0, snippets: [] as string[] };
        }

        // Google pattern e.g. "4.9(20)" or "Rating: 4.9 · 20 reviews"
        const ratingPattern = body.match(/(\d\.?\d?)\((\d+)\)/);
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

        const snippets: string[] = [];
        const seen = new Set<string>();
        document.querySelectorAll('div.VwiC3b, span.aCOpRe, div[data-sncf]').forEach((el) => {
          const text = (el as HTMLElement).innerText?.trim();
          if (text && text.length > 25 && !text.includes('Missing:') && !seen.has(text)) {
            seen.add(text);
            snippets.push(text);
          }
        });

        return { rating, reviewCount, snippets: snippets.slice(0, maxCount), error: '' };
      }, maxReviews);

      if (extracted.error === 'CAPTCHA') {
        return result;
      }

      result.rating = extracted.rating;
      result.totalReviews = extracted.reviewCount;

      if (extracted.snippets.length > 0) {
        for (const snippet of extracted.snippets) {
          const cleanSnippet = snippet.replace(/Read more$/i, '').replace(/\.{3}$/i, '').trim();
          if (cleanSnippet.length > 20) {
            result.reviews.push({
              authorName: 'Houzz Reviewer',
              rating: result.rating || 5,
              comment: cleanSnippet,
              isVerified: true,
              platform: 'HOUZZ',
              sourceUrl: profileUrl,
            });
          }
        }
      }

      result.success = result.rating > 0 || result.totalReviews > 0 || result.reviews.length > 0;
      return result;
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch {}
      }
    }
  }
}
