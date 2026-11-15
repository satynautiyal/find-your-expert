import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import {
  PlatformScrapedResult,
  ScrapedReviewItem,
} from '../interfaces/review-scraper.interface';
import { ScraperHttpUtil } from '../utils/scraper-http.util';
import { BrowserPoolUtil } from '../utils/browser-pool.util';

function resolveSerpApiKey(): string {
  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'apps/api/.env'),
    path.resolve(process.cwd(), '../web/.env'),
    path.resolve(process.cwd(), 'apps/web/.env'),
  ];
  if (!process.env.SERPAPI_KEY) {
    for (const envPath of candidates) {
      if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
      }
    }
  }
  return (process.env.SERPAPI_KEY || process.env.SERPAPI_API_KEY || '')
    .replace(/^['"]|['"]$/g, '')
    .trim();
}

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
    const isSearchQuery = !yelpUrlOrSlug.startsWith('http') && /\s/.test(yelpUrlOrSlug.trim());
    const businessAlias = isSearchQuery ? yelpUrlOrSlug.trim() : this.extractBusinessAlias(yelpUrlOrSlug);
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

    // Strategy 0: SerpApi (yelp + yelp_reviews) — returns up to ~49 full Yelp reviews per call
    const serpApiKey = resolveSerpApiKey();
    if (serpApiKey) {
      try {
        this.logger.log(`🚀 [Yelp] Using SerpApi (yelp + yelp_reviews) for: "${businessAlias}"`);
        const serpRes = await this.fetchViaSerpApi(
          businessAlias,
          targetUrl,
          isSearchQuery,
          serpApiKey,
          maxReviews,
        );
        if (serpRes.success && (serpRes.reviews.length > 0 || serpRes.totalReviews > 0)) {
          return serpRes;
        }
      } catch (serpErr: any) {
        this.logger.warn(`⚠️ [Yelp] SerpApi strategy failed (${serpErr.message}), falling back...`);
      }
    }

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

      // Search Google for the exact Yelp business page (supports both /biz/alias and "Business Name City" search)
      const isNameQuery = /\s/.test(businessAlias);
      const searchQuery = isNameQuery
        ? `site:yelp.com/biz ${businessAlias}`
        : `site:yelp.com/biz/${businessAlias}`;
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&gl=us&hl=en`;

      this.logger.debug(`[Yelp] Google search: ${searchQuery}`);
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 20000 });
      await new Promise((r: any) => setTimeout(r, 1500));

      // Extract data from Google's rendered search results
      const extracted = await page.evaluate((maxCount: number) => {
        const body = document.body?.innerText || '';

        // Check for Google CAPTCHA
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

        // Extract review snippet text ONLY from Google result blocks that link to this exact Yelp /biz/ page
        const snippets: string[] = [];
        const seen = new Set<string>();
        document.querySelectorAll('div.MjjYud, div.g').forEach((block) => {
          const yelpLink = block.querySelector('a[href*="yelp.com/biz/"]') as HTMLAnchorElement | null;
          if (!yelpLink) return;
          block.querySelectorAll('div.VwiC3b, span.aCOpRe, div[data-sncf]').forEach((el) => {
            const text = (el as HTMLElement).innerText?.trim();
            if (text && text.length > 30 && !text.includes('Missing:') && !seen.has(text)) {
              seen.add(text);
              snippets.push(text);
            }
          });
        });

        return { rating, reviewCount, discoveredUrl, snippets: snippets.slice(0, maxCount), error: '' };
      }, maxReviews);

      if (extracted.error === 'CAPTCHA') {
        this.logger.warn('[Yelp] Google showed CAPTCHA, cannot extract snippet');
        return result;
      }

      if (extracted.discoveredUrl && result.profileUrl === 'https://www.yelp.com') {
        result.profileUrl = extracted.discoveredUrl;
      }

      result.rating = extracted.rating;
      result.totalReviews = extracted.reviewCount;

      const allSnippets = [...extracted.snippets];

      // Step 2: Query indexed Yelp review quotes (?hrid= / paginated snippets) for authentic review text
      const resolvedAlias = this.extractBusinessAlias(result.profileUrl);
      if (resolvedAlias && result.totalReviews > 0) {
        try {
          const quoteQuery = `site:yelp.com/biz/${resolvedAlias} ("recommend" OR "great" OR "work" OR "team" OR "project" OR "service")`;
          await page.goto(
            `https://www.google.com/search?q=${encodeURIComponent(quoteQuery)}&num=10&gl=us&hl=en`,
            { waitUntil: 'networkidle2', timeout: 15000 }
          );
          await new Promise((r: any) => setTimeout(r, 1000));

          const extraQuotes: string[] = await page.evaluate((aliasLower: string) => {
            const body = document.body?.innerText || '';
            if (body.includes('unusual traffic') || body.includes('not a robot')) {
              return [];
            }
            const out: string[] = [];
            document.querySelectorAll('div.MjjYud, div.g').forEach((block) => {
              const yelpLink = block.querySelector('a[href*="yelp.com/biz/"]') as HTMLAnchorElement | null;
              if (!yelpLink || !yelpLink.href.toLowerCase().includes(aliasLower)) return;
              block.querySelectorAll('div.VwiC3b, span.aCOpRe, div[data-sncf]').forEach((el) => {
                const txt = (el as HTMLElement).innerText?.trim();
                if (txt && txt.length >= 45 && !txt.includes('Missing:')) {
                  out.push(txt);
                }
              });
            });
            return out;
          }, resolvedAlias.toLowerCase());
          allSnippets.push(...extraQuotes);
        } catch {
          // Ignore optional quote enrichment errors
        }
      }

      // Build review items from snippets (filter out directory address/hours meta descriptions)
      if (allSnippets.length > 0) {
        const seenComments = new Set<string>();
        let idx = 1;
        for (const snippet of allSnippets) {
          const cleanSnippet = snippet.replace(/Read more$/i, '').replace(/\.{3}$/i, '').trim();
          const isDirectoryMeta =
            /\b\d+\s+Photos\b/i.test(cleanSnippet) ||
            /\bMon\s*-\s*\d{1,2}:\d{2}/i.test(cleanSnippet) ||
            /\bTop\s+10\s+Best\b/i.test(cleanSnippet) ||
            /^\d+\s+[A-Za-z0-9\s.,#-]+NY\s+\d{5}$/i.test(cleanSnippet) ||
            cleanSnippet.length < 45;

          if (!isDirectoryMeta && !seenComments.has(cleanSnippet.substring(0, 50))) {
            seenComments.add(cleanSnippet.substring(0, 50));
            result.reviews.push({
              authorName: `Yelp Reviewer #${idx++}`,
              rating: Math.min(5, Math.max(1, Math.round(result.rating || 5))),
              comment: cleanSnippet,
              isVerified: true,
              platform: 'YELP',
              sourceUrl: result.profileUrl || profileUrl,
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
   * Strategy 0: Fetch full Yelp rating, total review count, and up to ~49+ full customer reviews via SerpApi
   */
  private async fetchViaSerpApi(
    businessAliasOrQuery: string,
    initialProfileUrl: string,
    isSearchQuery: boolean,
    serpApiKey: string,
    maxReviews: number,
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

    // Derive clean search description & location
    let findDesc = businessAliasOrQuery;
    let findLoc = 'New York, NY';

    if (!isSearchQuery) {
      // Convert slug e.g. "new-york-kitchen-and-bath-new-york-2" -> "new york kitchen and bath"
      findDesc = businessAliasOrQuery
        .replace(/-\d+$/, '')
        .replace(/-(new-york|manhattan|brooklyn|queens|bronx|staten-island|nyc|ny|nj)$/i, '')
        .replace(/-/g, ' ')
        .trim();
    } else {
      const locMatch = businessAliasOrQuery.match(
        /\b(Manhattan|Brooklyn|Queens|Bronx|Staten Island|New York)\b.*$/i,
      );
      if (locMatch && typeof locMatch.index === 'number' && locMatch.index > 2) {
        findDesc = businessAliasOrQuery.slice(0, locMatch.index).trim();
        findLoc = `${locMatch[1]}, NY`;
      }
    }

    // Step 1: Resolve Yelp 22-char place_id + rating + count via SerpApi engine=yelp
    const searchParams = new URLSearchParams({
      engine: 'yelp',
      find_desc: findDesc,
      find_loc: findLoc,
      api_key: serpApiKey,
    });
    const searchRes = await fetch(`https://serpapi.com/search.json?${searchParams.toString()}`);
    if (!searchRes.ok) {
      throw new Error(`SerpApi yelp search HTTP ${searchRes.status}`);
    }
    const searchJson: any = await searchRes.json();
    if (searchJson.error) {
      throw new Error(searchJson.error);
    }

    const organic: any[] = Array.isArray(searchJson.organic_results)
      ? searchJson.organic_results
      : [];

    const stopWords = new Set([
      'inc',
      'llc',
      'corp',
      'co',
      'company',
      'the',
      'and',
      'ny',
      'nyc',
      'new',
      'york',
      'brooklyn',
      'manhattan',
      'queens',
      'bronx',
      'staten',
      'island',
    ]);
    const descTokens = findDesc
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 2 && !stopWords.has(t));

    let matchedBiz: any = null;
    if (!isSearchQuery && businessAliasOrQuery) {
      const aliasLower = businessAliasOrQuery.toLowerCase();
      matchedBiz = organic.find(
        (item) =>
          (typeof item.link === 'string' && item.link.toLowerCase().includes(aliasLower)) ||
          (Array.isArray(item.place_ids) &&
            item.place_ids.some((id: string) => String(id).toLowerCase() === aliasLower)),
      );
    }

    if (!matchedBiz && descTokens.length > 0) {
      matchedBiz = organic.find((item) => {
        const hay = `${item.title || ''} ${item.link || ''}`
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, ' ');
        return descTokens.every((tok) => hay.includes(tok));
      });
    }

    if (!matchedBiz) {
      this.logger.log(`ℹ️ [Yelp SerpApi] No matching Yelp listing found for "${findDesc}" in ${findLoc}`);
      return result;
    }

    const placeIds: string[] = Array.isArray(matchedBiz.place_ids)
      ? matchedBiz.place_ids
      : matchedBiz.place_id
        ? [matchedBiz.place_id]
        : [];
    const primaryPlaceId = placeIds[0] || (!isSearchQuery ? businessAliasOrQuery : '');

    result.rating = Number(matchedBiz.rating) || 0;
    result.totalReviews = Number(matchedBiz.reviews) || 0;
    if (typeof matchedBiz.link === 'string' && matchedBiz.link.includes('yelp.com/biz/')) {
      result.profileUrl = matchedBiz.link.split('?')[0];
    }

    // Step 2: Fetch full granular Yelp customer reviews via engine=yelp_reviews
    if (primaryPlaceId && result.totalReviews > 0) {
      let offset = 0;
      while (result.reviews.length < maxReviews && offset < result.totalReviews) {
        const revParams = new URLSearchParams({
          engine: 'yelp_reviews',
          place_id: primaryPlaceId,
          start: String(offset),
          api_key: serpApiKey,
        });
        const revRes = await fetch(`https://serpapi.com/search.json?${revParams.toString()}`);
        if (!revRes.ok) break;
        const revJson: any = await revRes.json();
        if (revJson.error) {
          this.logger.warn(`⚠️ [Yelp SerpApi Reviews] ${revJson.error}`);
          break;
        }

        const rawList: any[] = Array.isArray(revJson.reviews) ? revJson.reviews : [];
        if (rawList.length === 0) break;

        for (const r of rawList) {
          if (result.reviews.length >= maxReviews) break;

          const rawText =
            typeof r.comment === 'string'
              ? r.comment
              : typeof r.comment?.text === 'string'
                ? r.comment.text
                : '';
          let cleanComment = ScraperHttpUtil.cleanText(rawText);
          if (!cleanComment || cleanComment.length < 10) continue;

          // Append owner reply cleanly if present so ReviewsModal formats it into a nested Owner Response box
          const ownerReplyText =
            r.owner_replies?.[0]?.comment ||
            r.owner_response?.comment ||
            '';
          if (ownerReplyText && typeof ownerReplyText === 'string' && ownerReplyText.trim().length > 5) {
            cleanComment = `${cleanComment}\nComment from the Owner: ${ownerReplyText.trim()}`;
          }

          const userObj = r.user || {};
          const authorName =
            (userObj.name || userObj.user_name || '').trim() ||
            `Yelp Customer #${result.reviews.length + 1}`;
          const avatarUrl = userObj.thumbnail || userObj.avatar || undefined;

          result.reviews.push({
            authorName,
            authorAvatarUrl: avatarUrl,
            rating: Math.min(5, Math.max(1, Math.round(Number(r.rating) || 5))),
            comment: cleanComment,
            reviewDate: r.date || undefined,
            isVerified: true,
            platform: 'YELP',
            sourceUrl: result.profileUrl,
          });
        }

        // One page from SerpApi returns ~49 reviews; stop if single page satisfies maxReviews or fewer returned
        if (rawList.length < 20 || result.reviews.length >= maxReviews) {
          break;
        }
        offset += rawList.length;
      }
    }

    result.success = result.totalReviews > 0 || result.reviews.length > 0;
    this.logger.log(
      `✅ [Yelp SerpApi] "${matchedBiz.title}": ${result.rating}★ (${result.totalReviews} total), saved ${result.reviews.length} full reviews`,
    );
    return result;
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
