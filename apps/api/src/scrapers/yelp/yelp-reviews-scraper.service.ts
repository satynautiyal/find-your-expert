import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import {
  PlatformScrapedResult,
  ScrapedReviewItem,
} from '../interfaces/review-scraper.interface';
import { ScraperHttpUtil } from '../utils/scraper-http.util';
import { BrowserPoolUtil } from '../utils/browser-pool.util';
import { SerperUtil } from '../utils/serper.util';

@Injectable()
export class YelpReviewsScraperService {
  private readonly logger = new Logger(YelpReviewsScraperService.name);

  /**
   * Scrapes Yelp ratings and customer reviews (up to 2,000 max):
   *   1. Official Yelp Fusion API (free if YELP_API_KEY is configured)
   *   2. Serper.dev Google index extraction (used specifically for Yelp because DataDome blocks direct Yelp scraping)
   *   3. Free Google Search browser snippet fallback
   *   4. Direct HTML fallback
   */
  async scrapeReviews(
    yelpUrlOrSlug: string,
    maxReviews = 2000
  ): Promise<PlatformScrapedResult> {
    const isSearchQuery = !yelpUrlOrSlug.startsWith('http') && /\s/.test(yelpUrlOrSlug.trim());
    const businessAlias = isSearchQuery
      ? yelpUrlOrSlug.trim()
      : this.extractBusinessAlias(yelpUrlOrSlug);
    const targetUrl = yelpUrlOrSlug.startsWith('http')
      ? yelpUrlOrSlug.split('?')[0]
      : isSearchQuery
      ? 'https://www.yelp.com'
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

    // Strategy 1: Official Yelp Fusion API (free if configured)
    const apiKey = process.env.YELP_API_KEY || process.env.YELP_FUSION_API_KEY;
    if (apiKey && !isSearchQuery) {
      try {
        this.logger.log(`⚡ [Yelp] Using official Yelp Fusion API for: ${businessAlias}`);
        const fusionRes = await this.fetchViaFusionApi(businessAlias, targetUrl, apiKey, maxReviews);
        if (fusionRes.success) return fusionRes;
      } catch (apiErr: any) {
        this.logger.warn(`⚠️ [Yelp] Fusion API failed (${apiErr.message}), falling back to Serper...`);
      }
    }

    // Strategy 2: Serper.dev lightweight search (bypasses Yelp DataDome cleanly at minimal cost)
    if (SerperUtil.hasApiKey()) {
      try {
        const serperRes = await this.fetchViaSerper(
          businessAlias,
          targetUrl,
          isSearchQuery,
          maxReviews
        );
        if (serperRes.success && (serperRes.totalReviews > 0 || serperRes.reviews.length > 0)) {
          return serperRes;
        }
      } catch (serperErr: any) {
        this.logger.warn(`⚠️ [Yelp] Serper lookup failed (${serperErr.message}), trying fallback...`);
      }
    }

    // Strategy 3: Free Google Search rich snippet extraction via Stealth Browser
    try {
      const googleResult = await this.fetchViaGoogleSnippet(businessAlias, targetUrl, maxReviews);
      if (googleResult.success) {
        return googleResult;
      }
    } catch (googleErr: any) {
      this.logger.warn(`⚠️ [Yelp] Google snippet strategy failed (${googleErr.message})`);
    }

    // Strategy 4: Direct HTML fallback
    try {
      return await this.fetchViaDirectScrape(targetUrl, maxReviews, result);
    } catch (err: any) {
      result.error = err.message;
      return result;
    }
  }

  /**
   * Strategy 2: Uses Serper.dev (1–2 lightweight queries) to extract Yelp rating, review count & indexed customer reviews
   */
  private async fetchViaSerper(
    businessAliasOrQuery: string,
    initialProfileUrl: string,
    isSearchQuery: boolean,
    maxReviews: number
  ): Promise<PlatformScrapedResult> {
    const result: PlatformScrapedResult = {
      platform: 'YELP',
      rating: 0,
      totalReviews: 0,
      profileUrl: initialProfileUrl,
      reviews: [],
      scrapedAt: new Date(),
      success: false,
    };

    const primaryQuery = isSearchQuery
      ? `site:yelp.com/biz ${businessAliasOrQuery}`
      : `site:yelp.com/biz/${businessAliasOrQuery}`;

    const primaryData = await SerperUtil.searchGoogle(primaryQuery, { num: 10 });
    const organic = Array.isArray(primaryData.organic) ? primaryData.organic : [];

    const stopWords = new Set([
      'inc', 'llc', 'corp', 'co', 'company', 'the', 'and',
      'ny', 'nyc', 'new', 'york', 'brooklyn', 'manhattan', 'queens', 'bronx', 'staten', 'island',
    ]);
    const queryTokens = businessAliasOrQuery
      .toLowerCase()
      .replace(/-\d+$/, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 2 && !stopWords.has(t));

    let matchedItem = organic.find((item) => {
      const href = String(item.link || '').split('?')[0];
      if (!/yelp\.com\/biz\/[^/]+/i.test(href)) return false;
      if (!isSearchQuery) {
        return href.toLowerCase().includes(businessAliasOrQuery.toLowerCase());
      }
      const hay = `${item.title || ''} ${href}`.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
      return queryTokens.length === 0 || queryTokens.every((t) => hay.includes(t));
    });

    if (!matchedItem) {
      return result;
    }

    if (matchedItem.link) {
      result.profileUrl = matchedItem.link.split('?')[0];
    }
    result.rating = Number(matchedItem.rating) || 0;
    result.totalReviews = Number(matchedItem.ratingCount) || 0;

    if ((result.rating === 0 || result.totalReviews === 0) && matchedItem.snippet) {
      const m =
        matchedItem.snippet.match(/(\d\.\d)\s*\(\s*(\d+)\s*(?:reviews?)?\)/i) ||
        matchedItem.snippet.match(/Rating:\s*(\d\.?\d?)\s*[·•-]\s*(\d+)\s*reviews?/i);
      if (m) {
        if (result.rating === 0) result.rating = parseFloat(m[1]);
        if (result.totalReviews === 0) result.totalReviews = parseInt(m[2], 10);
      }
    }

    const candidateSnippets: Array<{ text: string; date?: string }> = [];
    for (const item of organic) {
      const href = String(item.link || '').split('?')[0];
      if (href.toLowerCase() === result.profileUrl.toLowerCase() && item.snippet) {
        candidateSnippets.push({ text: item.snippet, date: item.date });
      }
    }

    // Fetch 1 additional page of indexed Yelp customer review quotes if reviews exist
    const resolvedAlias = this.extractBusinessAlias(result.profileUrl);
    if (resolvedAlias && result.totalReviews > 0) {
      try {
        const quoteData = await SerperUtil.searchGoogle(
          `site:yelp.com/biz/${resolvedAlias} ("recommend" OR "great" OR "work" OR "team" OR "project" OR "service")`,
          { num: 20 }
        );
        for (const item of quoteData.organic || []) {
          const href = String(item.link || '').toLowerCase();
          if (href.includes(resolvedAlias.toLowerCase()) && item.snippet) {
            candidateSnippets.push({ text: item.snippet, date: item.date });
          }
        }
      } catch {}
    }

    const seenKeys = new Set<string>();
    let idx = 1;
    for (const entry of candidateSnippets) {
      if (result.reviews.length >= maxReviews) break;
      const clean = entry.text
        .replace(/Read more$/i, '')
        .replace(/\.{3}$/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      const isDirectoryMeta =
        /\b\d+\s+Photos\b/i.test(clean) ||
        /\bMon\s*-\s*\d{1,2}:\d{2}/i.test(clean) ||
        /\bTop\s+10\s+Best\b/i.test(clean) ||
        /^\d+\s+[A-Za-z0-9\s.,#-]+NY\s+\d{5}$/i.test(clean) ||
        clean.length < 40;

      const key = clean.slice(0, 60).toLowerCase();
      if (!isDirectoryMeta && !seenKeys.has(key)) {
        seenKeys.add(key);
        result.reviews.push({
          authorName: `Verified Yelp Customer #${idx++}`,
          rating: Math.min(5, Math.max(1, Math.round(result.rating || 5))),
          comment: clean,
          reviewDate: entry.date || undefined,
          isVerified: true,
          platform: 'YELP',
          sourceUrl: result.profileUrl,
        });
      }
    }

    result.success = result.rating > 0 || result.totalReviews > 0 || result.reviews.length > 0;
    if (result.success) {
      this.logger.log(
        `✅ [Yelp Serper] ${result.profileUrl}: ${result.rating}★ (${result.totalReviews} reviews, ${result.reviews.length} snippets)`
      );
    }
    return result;
  }

  private async fetchViaGoogleSnippet(
    businessAlias: string,
    profileUrl: string,
    maxReviews: number
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

      const isNameQuery = /\s/.test(businessAlias);
      const searchQuery = isNameQuery
        ? `site:yelp.com/biz ${businessAlias}`
        : `site:yelp.com/biz/${businessAlias}`;
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&gl=us&hl=en`;

      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 20000 });
      await new Promise((r: any) => setTimeout(r, 1500));

      const extracted = await page.evaluate((maxCount: number) => {
        const body = document.body?.innerText || '';
        if (body.includes('unusual traffic') || body.includes('not a robot')) {
          return { error: 'CAPTCHA', rating: 0, reviewCount: 0, discoveredUrl: '', snippets: [] as string[] };
        }

        let discoveredUrl = '';
        document.querySelectorAll('a[href*="yelp.com/biz/"]').forEach((a) => {
          const href = (a as HTMLAnchorElement).href || '';
          if (!discoveredUrl && /https?:\/\/(www\.)?yelp\.com\/biz\/[^/?#]+/i.test(href)) {
            discoveredUrl = href.split('?')[0];
          }
        });

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
        document.querySelectorAll('div.MjjYud, div.g').forEach((block) => {
          const yelpLink = block.querySelector('a[href*="yelp.com/biz/"]') as HTMLAnchorElement | null;
          if (!yelpLink) return;
          block.querySelectorAll('div.VwiC3b, span.aCOpRe, div[data-sncf]').forEach((el) => {
            const text = (el as HTMLElement).innerText?.trim();
            if (text && text.length > 35 && !text.includes('Missing:') && !seen.has(text)) {
              seen.add(text);
              snippets.push(text);
            }
          });
        });

        return { rating, reviewCount, discoveredUrl, snippets: snippets.slice(0, maxCount), error: '' };
      }, maxReviews);

      if (extracted.error === 'CAPTCHA') return result;

      if (extracted.discoveredUrl && result.profileUrl === 'https://www.yelp.com') {
        result.profileUrl = extracted.discoveredUrl;
      }

      result.rating = extracted.rating;
      result.totalReviews = extracted.reviewCount;
      result.success = result.rating > 0 || result.totalReviews > 0;
      return result;
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch {}
      }
    }
  }

  private async fetchViaDirectScrape(
    targetUrl: string,
    maxReviews: number,
    result: PlatformScrapedResult
  ): Promise<PlatformScrapedResult> {
    const pageSize = 10;
    const totalPages = Math.ceil(maxReviews / pageSize);

    for (let page = 0; page < totalPages; page++) {
      const startOffset = page * pageSize;
      const pageUrl = `${targetUrl}?start=${startOffset}&sort_by=date_desc`;

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
          result.error = 'Direct scraping blocked by DataDome.';
          return result;
        }
        throw fetchErr;
      }

      const $ = cheerio.load(html);
      if (page === 0) this.extractAggregateStats($, result);

      const pageReviews = this.parsePageReviews($, targetUrl);
      if (pageReviews.length === 0) break;

      result.reviews.push(...pageReviews);
      if (result.reviews.length >= maxReviews) {
        result.reviews = result.reviews.slice(0, maxReviews);
        break;
      }

      if (page < totalPages - 1) {
        await ScraperHttpUtil.sleep(400);
      }
    }

    if (result.reviews.length > 0 || result.totalReviews > 0) {
      result.success = true;
    }
    return result;
  }

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

  private async fetchViaFusionApi(
    businessAlias: string,
    profileUrl: string,
    apiKey: string,
    maxReviews: number
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

    const reviewsUrl = `https://api.yelp.com/v3/businesses/${encodeURIComponent(
      businessAlias
    )}/reviews?limit=${Math.min(maxReviews, 50)}&sort_by=newest`;
    const reviewsRes = await fetch(reviewsUrl, { headers });
    if (reviewsRes.ok) {
      const reviewsData = await reviewsRes.json();
      const rawReviews = reviewsData.reviews || [];
      result.reviews = rawReviews.map(
        (r: any): ScrapedReviewItem => ({
          authorName: r.user?.name || 'Yelp Reviewer',
          authorAvatarUrl: r.user?.image_url || undefined,
          rating: r.rating || 5,
          comment: ScraperHttpUtil.cleanText(r.text || ''),
          reviewDate: r.time_created || undefined,
          isVerified: true,
          platform: 'YELP',
          sourceUrl: r.url || result.profileUrl,
        })
      );
      if (result.totalReviews === 0) {
        result.totalReviews = reviewsData.total || result.reviews.length;
      }
    }

    result.success = result.totalReviews > 0 || result.reviews.length > 0;
    return result;
  }

  private extractAggregateStats($: cheerio.CheerioAPI, result: PlatformScrapedResult): void {
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html() || '{}');
        if (json.aggregateRating) {
          result.rating = parseFloat(json.aggregateRating.ratingValue) || result.rating;
          result.totalReviews = parseInt(json.aggregateRating.reviewCount, 10) || result.totalReviews;
        }
      } catch {}
    });
  }

  private parsePageReviews($: cheerio.CheerioAPI, sourceUrl: string): ScrapedReviewItem[] {
    const reviews: ScrapedReviewItem[] = [];
    $(
      'section[aria-label="Recommended Reviews"] ul > li, div[class*="review__"], li.css-1122zq5, li.css-1q20h9a'
    ).each((_, el) => {
      const node = $(el);
      const authorName =
        node
          .find('a[href*="/user_details?userid="], span[class*="user-passport-info"] a')
          .first()
          .text()
          .trim() || node.find('.user-name, [class*="userName"]').text().trim();
      if (!authorName) return;

      const authorAvatarUrl =
        node.find('img[src*="user_avatars"], img[alt*="photo"]').first().attr('src') || '';
      const starEl = node
        .find('div[aria-label*="star rating"], [class*="rating__"] [aria-label]')
        .first();
      const rating = ScraperHttpUtil.parseStarRating(
        starEl.attr('aria-label') || starEl.text() || ''
      );
      const dateText = node.find('[class*="reviewDate"]').first().text().trim();
      const comment = ScraperHttpUtil.cleanText(
        node.find('p[class*="comment__"], span[class*="raw__"], p.comment').text()
      );

      // Extract any customer-attached Yelp review photos (bphoto / o.jpg)
      const photoUrls: string[] = [];
      node.find('img[src*="bphoto"]').each((__, imgEl) => {
        const rawPhoto = ($(imgEl).attr('src') || '').trim();
        if (rawPhoto.startsWith('http')) {
          const fullRes = rawPhoto.replace(/\/\d+s\.jpg$/i, '/o.jpg');
          if (!photoUrls.includes(fullRes)) photoUrls.push(fullRes);
        }
      });

      if (comment) {
        reviews.push({
          authorName,
          authorAvatarUrl: authorAvatarUrl || undefined,
          photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
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
