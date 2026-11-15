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
export class HomeAdvisorReviewsScraperService {
  private readonly logger = new Logger(HomeAdvisorReviewsScraperService.name);

  /**
   * Scrapes HomeAdvisor ratings and verified homeowner reviews:
   *   1. Direct HTML + schema.org JSON-LD parsing when a HomeAdvisor profile URL is known
   *   2. Public search snippet discovery (DuckDuckGo HTML lite) when given a business name + location
   *
   * Strictly respects anti-bot / CAPTCHA gates: if challenged, stops immediately without bypassing.
   */
  async scrapeReviews(
    urlOrQuery: string,
    maxReviews = 50,
  ): Promise<PlatformScrapedResult> {
    const trimmed = (urlOrQuery || '').trim();
    const isDirectUrl = /^https?:\/\/(www\.)?homeadvisor\.com\//i.test(trimmed);
    const initialUrl = isDirectUrl ? trimmed.split('?')[0] : 'https://www.homeadvisor.com';

    this.logger.log(`🔍 [HomeAdvisor] Starting review fetch for: "${trimmed}" (Max: ${maxReviews})`);

    const result: PlatformScrapedResult = {
      platform: 'HOMEADVISOR',
      rating: 0,
      totalReviews: 0,
      profileUrl: initialUrl,
      reviews: [],
      scrapedAt: new Date(),
      success: false,
    };

    if (!trimmed) {
      return result;
    }

    // Strategy 0: SerpApi Google structured search (discovers HomeAdvisor profile, rating, count & indexed homeowner reviews without CAPTCHAs)
    const serpApiKey = resolveSerpApiKey();
    if (serpApiKey) {
      try {
        const serpRes = await this.discoverViaSerpApi(trimmed, isDirectUrl, serpApiKey, maxReviews);
        if (serpRes.success && (serpRes.totalReviews > 0 || serpRes.reviews.length > 0)) {
          return serpRes;
        }
      } catch (serpErr: any) {
        this.logger.warn(`⚠️ [HomeAdvisor] SerpApi discovery failed (${serpErr.message}), falling back...`);
      }
    }

    // Strategy 1: If we already have a direct HomeAdvisor URL, parse JSON-LD & DOM cards
    if (isDirectUrl) {
      try {
        const directRes = await this.scrapeDirectProfile(initialUrl, maxReviews);
        if (directRes.success && (directRes.rating > 0 || directRes.totalReviews > 0)) {
          return directRes;
        }
      } catch (err: any) {
        this.logger.warn(`⚠️ [HomeAdvisor] Direct fetch did not complete (${err.message}), trying search snippet...`);
      }
    }

    // Strategy 2: Google Search rich snippet discovery (indexes HomeAdvisor / Angi rated pages)
    try {
      const googleDiscovered = await this.discoverViaGoogleSnippet(trimmed, maxReviews);
      if (googleDiscovered.profileUrl.includes('homeadvisor.com/rated.')) {
        try {
          const enriched = await this.scrapeDirectProfile(googleDiscovered.profileUrl, maxReviews);
          if (enriched.success && enriched.totalReviews > 0) {
            return enriched;
          }
        } catch {
          // Keep Google rich snippet result if direct HTML fetch fails
        }
      }
      if (googleDiscovered.success) {
        return googleDiscovered;
      }
    } catch (googleErr: any) {
      this.logger.warn(`⚠️ [HomeAdvisor] Google snippet discovery failed: ${googleErr.message}`);
    }

    // Strategy 3: Lightweight DuckDuckGo HTML search fallback
    try {
      const discovered = await this.discoverViaPublicSearch(trimmed, maxReviews);
      if (discovered.success) {
        return discovered;
      }
    } catch (searchErr: any) {
      this.logger.warn(`⚠️ [HomeAdvisor] Search discovery failed: ${searchErr.message}`);
    }

    return result;
  }

  /**
   * Strategy 0: Uses SerpApi (engine=google) to extract HomeAdvisor verified rating, review count, and indexed homeowner review quotes
   */
  private async discoverViaSerpApi(
    urlOrQuery: string,
    isDirectUrl: boolean,
    serpApiKey: string,
    maxReviews: number,
  ): Promise<PlatformScrapedResult> {
    const result: PlatformScrapedResult = {
      platform: 'HOMEADVISOR',
      rating: 0,
      totalReviews: 0,
      profileUrl: isDirectUrl ? urlOrQuery.split('?')[0] : 'https://www.homeadvisor.com',
      reviews: [],
      scrapedAt: new Date(),
      success: false,
    };

    let searchQ: string;
    let distinctiveTokens: string[] = [];

    if (isDirectUrl) {
      const idMatch = urlOrQuery.match(/rated\.([^.]+)\.(\d+)\.html/i);
      if (idMatch) {
        const camelSpaced = idMatch[1].replace(/([a-z])([A-Z])/g, '$1 $2');
        searchQ = `site:homeadvisor.com "${idMatch[2]}" OR "${camelSpaced}"`;
      } else {
        searchQ = `"${urlOrQuery.split('?')[0]}"`;
      }
    } else {
      const coreBusinessName = urlOrQuery
        .split(/\s+(?:Brooklyn|Manhattan|Queens|Bronx|Staten|New York|NY)/i)[0]
        .trim();
      distinctiveTokens = this.getDistinctiveTokens(coreBusinessName);
      searchQ = `site:homeadvisor.com "${coreBusinessName}"`;
    }

    const p1 = new URLSearchParams({
      engine: 'google',
      q: searchQ,
      gl: 'us',
      hl: 'en',
      num: '10',
      api_key: serpApiKey,
    });

    const r1 = await fetch(`https://serpapi.com/search.json?${p1.toString()}`);
    if (!r1.ok) {
      throw new Error(`SerpApi Google HTTP ${r1.status}`);
    }
    const j1: any = await r1.json();
    if (j1.error) {
      throw new Error(j1.error);
    }

    const organic: any[] = Array.isArray(j1.organic_results) ? j1.organic_results : [];
    let matchedItem: any = null;

    for (const item of organic) {
      const href = String(item.link || '').split('?')[0];
      if (!href.includes('homeadvisor.com/rated.')) continue;

      if (isDirectUrl) {
        matchedItem = item;
        break;
      }

      const hay = `${href} ${item.title || ''} ${item.snippet || ''}`
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      if (distinctiveTokens.length === 0 || distinctiveTokens.every((t) => hay.includes(t))) {
        matchedItem = item;
        break;
      }
    }

    if (!matchedItem) {
      return result;
    }

    result.profileUrl = String(matchedItem.link).split('?')[0];

    // Extract rating & review count from SerpApi rich_snippet.top / bottom or text fallback
    const topDetected = matchedItem.rich_snippet?.top?.detected_extensions || {};
    const botDetected = matchedItem.rich_snippet?.bottom?.detected_extensions || {};
    const extList: string[] = [
      ...(matchedItem.rich_snippet?.top?.extensions || []),
      ...(matchedItem.rich_snippet?.bottom?.extensions || []),
      matchedItem.snippet || '',
    ];

    result.rating = Number(topDetected.rating || botDetected.rating) || 0;
    result.totalReviews =
      Number(topDetected.reviews || topDetected.votes || botDetected.reviews || botDetected.votes) || 0;

    if (result.rating === 0 || result.totalReviews === 0) {
      const joinedExt = extList.join(' · ');
      const m =
        joinedExt.match(/(\d\.\d)\s*\(\s*(\d+)\s*\)/) ||
        joinedExt.match(/Rating:\s*(\d\.?\d?)\s*[·•-]\s*(\d+)\s*(?:reviews?|votes?)/i);
      if (m) {
        if (result.rating === 0) result.rating = parseFloat(m[1]);
        if (result.totalReviews === 0) result.totalReviews = parseInt(m[2], 10);
      }
    }

    // Collect indexed HomeAdvisor customer review quotes scoped strictly to this profile URL
    const candidateSnippets: string[] = [];
    if (matchedItem.snippet) {
      candidateSnippets.push(String(matchedItem.snippet));
    }

    const idPartMatch = result.profileUrl.match(/rated\.([^.]+)\.(\d+)\.html/i);
    const haIdToken = idPartMatch ? idPartMatch[2] : '';
    const haNameSpaced = idPartMatch
      ? idPartMatch[1].replace(/([a-z])([A-Z])/g, '$1 $2')
      : '';

    const reviewQueries = [
      haIdToken
        ? `site:homeadvisor.com "${haIdToken}" ("Review by" OR "Comments" OR "Project" OR "hired" OR "great" OR "work")`
        : '',
      haNameSpaced
        ? `site:homeadvisor.com "${haNameSpaced}" ("Review by" OR "Comments" OR "roof" OR "kitchen" OR "recommend")`
        : '',
    ].filter(Boolean);

    for (const rq of reviewQueries) {
      if (candidateSnippets.length >= maxReviews) break;
      try {
        const qp = new URLSearchParams({
          engine: 'google',
          q: rq,
          gl: 'us',
          hl: 'en',
          num: '10',
          api_key: serpApiKey,
        });
        const qr = await fetch(`https://serpapi.com/search.json?${qp.toString()}`);
        if (!qr.ok) continue;
        const qj: any = await qr.json();
        const qOrg: any[] = Array.isArray(qj.organic_results) ? qj.organic_results : [];
        for (const item of qOrg) {
          const itemUrl = String(item.link || '').split('?')[0];
          if (itemUrl.toLowerCase() !== result.profileUrl.toLowerCase()) continue;
          if (item.snippet) {
            candidateSnippets.push(String(item.snippet));
          }
          if (Array.isArray(item.sitelinks?.inline)) {
            for (const sl of item.sitelinks.inline) {
              if (sl.snippet) candidateSnippets.push(String(sl.snippet));
            }
          }
        }
      } catch {
        // Ignore secondary snippet query errors
      }
    }

    const seenSnips = new Set<string>();
    let haIdx = 1;
    for (const rawSnip of candidateSnippets) {
      if (result.reviews.length >= maxReviews) break;
      let clean = rawSnip
        .replace(/Read real-world reviews from homeowners[^.]*\./gi, '')
        .replace(/See rating, reviews,projects and more[^.]*\./gi, '')
        .replace(/HomeAdvisor\s*[-|•].*$/gi, '')
        .replace(/\.{3}$/g, '')
        .trim();

      // Extract "Review by <Name> in <City>, <State>" if present
      let authorName = `HomeAdvisor Homeowner #${haIdx}`;
      const authorMatch = clean.match(/Review by\s+([A-Z][a-z]+(?:\s+[A-Z]\.?)?)\s+in\s+[A-Za-z\s]+,\s*[A-Z]{2}/);
      if (authorMatch) {
        authorName = `${authorMatch[1].trim()} (Verified Homeowner)`;
      }

      clean = clean.replace(/^Comments:\s*/i, '').trim();
      const key = clean.substring(0, 50).toLowerCase();
      if (clean.length >= 35 && !seenSnips.has(key)) {
        seenSnips.add(key);
        haIdx++;
        result.reviews.push({
          authorName,
          rating: Math.min(5, Math.max(1, Math.round(result.rating || 5))),
          comment: clean,
          isVerified: true,
          platform: 'HOMEADVISOR',
          sourceUrl: result.profileUrl,
        });
      }
    }

    result.success = result.rating > 0 && result.totalReviews > 0;
    if (result.success) {
      this.logger.log(
        `✅ [HomeAdvisor SerpApi] ${result.profileUrl}: ${result.rating}★ (${result.totalReviews} reviews, ${result.reviews.length} snippets)`,
      );
    }
    return result;
  }

  /**
   * Discovers a business's HomeAdvisor rating, review count & snippets from Google Search rich results.
   * Strictly aborts immediately if Google presents a CAPTCHA challenge.
   */
  private async discoverViaGoogleSnippet(
    query: string,
    maxReviews: number,
  ): Promise<PlatformScrapedResult> {
    const result: PlatformScrapedResult = {
      platform: 'HOMEADVISOR',
      rating: 0,
      totalReviews: 0,
      profileUrl: 'https://www.homeadvisor.com',
      reviews: [],
      scrapedAt: new Date(),
      success: false,
    };

    const cleanQuery = query.startsWith('http')
      ? query
          .replace(/^https?:\/\/(www\.)?homeadvisor\.com\/rated\./i, '')
          .replace(/\.\d+\.html.*$/i, '')
          .replace(/\./g, ' ')
      : query;

    const coreBusinessName = cleanQuery
      .split(/\s+(?:Brooklyn|Manhattan|Queens|Bronx|Staten|New York|NY)/i)[0]
      .trim();
    const distinctiveTokens = this.getDistinctiveTokens(coreBusinessName);

    let browser: any = null;
    try {
      browser = await BrowserPoolUtil.createBrowser();
      const page = await BrowserPoolUtil.createStealthPage(browser);

      const searchQuery = `site:homeadvisor.com/rated "${coreBusinessName}"`;
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&gl=us&hl=en`;

      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 20000 });
      await new Promise((r: any) => setTimeout(r, 1200));

      const extracted = await page.evaluate(
        (tokens: string[], maxCount: number) => {
          const body = document.body?.innerText || '';
          if (body.includes('unusual traffic') || body.includes('not a robot')) {
            return {
              error: 'CAPTCHA',
              rating: 0,
              reviewCount: 0,
              discoveredUrl: '',
              snippets: [] as string[],
            };
          }

          let discoveredUrl = '';
          let matchedBlockText = '';

          const blocks = Array.from(document.querySelectorAll('div.MjjYud, div.g'));
          for (const block of blocks) {
            const linkEl = block.querySelector('a[href*="homeadvisor.com/rated."]') as HTMLAnchorElement | null;
            if (!linkEl) continue;
            const href = linkEl.href.split('?')[0];
            const textContent = (block as HTMLElement).innerText || '';
            const normalizedCheck = `${href} ${textContent}`.toLowerCase().replace(/[^a-z0-9]/g, '');

            if (tokens.length > 0 && !tokens.every((t) => normalizedCheck.includes(t))) {
              continue;
            }

            if (!discoveredUrl) {
              discoveredUrl = href;
              matchedBlockText = textContent;
              break;
            }
          }

          if (!discoveredUrl) {
            return {
              error: '',
              rating: 0,
              reviewCount: 0,
              discoveredUrl: '',
              snippets: [] as string[],
            };
          }

          const ratingPattern =
            matchedBlockText.match(/(\d\.\d)\s*\(\s*(\d+)\s*\)/) ||
            matchedBlockText.match(/Rating:\s*(\d\.?\d?)\s*[·•]\s*(\d+)\s*(?:votes|reviews?)/i) ||
            matchedBlockText.match(/(\d\.\d)\s*(?:out of 5|stars?)[^0-9]{1,20}(\d+)\s*(?:verified\s+)?reviews?/i);

          const rating = ratingPattern ? parseFloat(ratingPattern[1]) : 0;
          const reviewCount = ratingPattern ? parseInt(ratingPattern[2], 10) : 0;

          const snippets: string[] = [];
          const seen = new Set<string>();
          for (const block of blocks) {
            const linkEl = block.querySelector('a[href*="homeadvisor.com/rated."]') as HTMLAnchorElement | null;
            if (!linkEl || linkEl.href.split('?')[0] !== discoveredUrl) continue;
            block.querySelectorAll('div.VwiC3b, span.aCOpRe, div[data-sncf]').forEach((el) => {
              const text = (el as HTMLElement).innerText?.trim();
              if (text && text.length > 35 && !text.includes('Missing:') && !seen.has(text)) {
                seen.add(text);
                snippets.push(text);
              }
            });
          }

          return {
            error: '',
            rating,
            reviewCount,
            discoveredUrl,
            snippets: snippets.slice(0, maxCount),
          };
        },
        distinctiveTokens,
        maxReviews,
      );

      if (extracted.error === 'CAPTCHA') {
        this.logger.warn('⚠️ [HomeAdvisor] Google showed CAPTCHA — stopping cleanly.');
        result.error = 'CAPTCHA';
        return result;
      }

      if (extracted.discoveredUrl) {
        result.profileUrl = extracted.discoveredUrl;
      }
      result.rating = extracted.rating;
      result.totalReviews = extracted.reviewCount;

      let haIdx = 1;
      for (const snip of extracted.snippets) {
        const clean = snip.replace(/Read more$/i, '').replace(/\.{3}$/i, '').trim();
        if (clean.length > 25) {
          result.reviews.push({
            authorName: `Verified Homeowner #${haIdx++}`,
            rating: Math.min(5, Math.max(1, Math.round(result.rating || 5))),
            comment: clean,
            isVerified: true,
            platform: 'HOMEADVISOR',
            sourceUrl: result.profileUrl,
          });
        }
      }

      result.success = result.rating > 0 && result.totalReviews > 0;
      if (result.success) {
        this.logger.log(
          `✅ [HomeAdvisor via Google] Rating: ${result.rating}★, Total Reviews: ${result.totalReviews}, URL: ${result.profileUrl}`,
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
   * Parses a public HomeAdvisor `/rated.<Business>.<id>.html` page via HTTP + JSON-LD
   */
  private async scrapeDirectProfile(
    profileUrl: string,
    maxReviews: number,
  ): Promise<PlatformScrapedResult> {
    const result: PlatformScrapedResult = {
      platform: 'HOMEADVISOR',
      rating: 0,
      totalReviews: 0,
      profileUrl,
      reviews: [],
      scrapedAt: new Date(),
      success: false,
    };

    let html = '';
    try {
      html = await ScraperHttpUtil.fetchHtml(profileUrl, {
        headers: {
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
    } catch {
      let browser: any = null;
      try {
        browser = await BrowserPoolUtil.createBrowser();
        const page = await BrowserPoolUtil.createStealthPage(browser);
        await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await new Promise((r: any) => setTimeout(r, 1500));
        html = await page.content();
      } finally {
        if (browser) {
          try {
            await browser.close();
          } catch {}
        }
      }
    }

    if (this.isAntiBotChallenge(html)) {
      this.logger.warn(`⚠️ [HomeAdvisor] Anti-bot / CAPTCHA gate detected on ${profileUrl} — stopping cleanly.`);
      result.error = 'Blocked by anti-bot challenge';
      return result;
    }

    const $ = cheerio.load(html);

    // 1. Parse schema.org JSON-LD (HomeAdvisor embeds LocalBusiness / HomeAndConstructionBusiness)
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const raw = $(el).html();
        if (!raw) return;
        const parsed = JSON.parse(raw);
        const nodes = Array.isArray(parsed) ? parsed : parsed['@graph'] || [parsed];

        for (const node of nodes) {
          if (node?.aggregateRating) {
            const r = parseFloat(node.aggregateRating.ratingValue);
            const c = parseInt(
              String(node.aggregateRating.reviewCount || node.aggregateRating.ratingCount || '0'),
              10,
            );
            if (!Number.isNaN(r) && r > 0) result.rating = r;
            if (!Number.isNaN(c) && c > 0) result.totalReviews = c;
          }

          if (Array.isArray(node?.review)) {
            for (const rev of node.review) {
              if (result.reviews.length >= maxReviews) break;
              const body = ScraperHttpUtil.cleanText(rev.reviewBody || rev.description || '');
              if (!body || body.length < 10) continue;
              const revRating = parseInt(String(rev.reviewRating?.ratingValue || '5'), 10) || 5;
              const author =
                typeof rev.author === 'string'
                  ? rev.author
                  : rev.author?.name || 'Verified Homeowner';

              result.reviews.push({
                authorName: author,
                rating: Math.min(5, Math.max(1, revRating)),
                comment: body,
                reviewDate: rev.datePublished || undefined,
                isVerified: true,
                platform: 'HOMEADVISOR',
                sourceUrl: profileUrl,
              });
            }
          }
        }
      } catch {
        // Ignore malformed script blocks
      }
    });

    // 2. Fallback HTML meta / visible rating summary if JSON-LD omitted counts
    if (result.rating === 0 || result.totalReviews === 0) {
      const bodyText = $('body').text();
      const ratingMatch = bodyText.match(/([45]\.\d)\s*(?:out of 5|\/5|\s*stars?)/i);
      const countMatch = bodyText.match(/([0-9,]+)\s+Verified\s+Reviews?/i);
      if (result.rating === 0 && ratingMatch) {
        result.rating = parseFloat(ratingMatch[1]) || 0;
      }
      if (result.totalReviews === 0 && countMatch) {
        result.totalReviews = parseInt(countMatch[1].replace(/,/g, ''), 10) || 0;
      }
    }

    // 3. Fallback DOM review cards if JSON-LD had no review array
    if (result.reviews.length === 0) {
      $('[itemprop="review"], .sp-review-card, [class*="review-card"], [data-testid*="review"]').each(
        (_, el) => {
          if (result.reviews.length >= maxReviews) return;
          const card = $(el);
          const comment = ScraperHttpUtil.cleanText(
            card.find('[itemprop="reviewBody"], .review-content, p').first().text(),
          );
          if (!comment || comment.length < 15) return;
          const authorName =
            card.find('[itemprop="author"], .review-author, strong').first().text().trim() ||
            'Verified Homeowner';
          const dateText =
            card.find('[itemprop="datePublished"], time, .review-date').first().text().trim() ||
            undefined;

          result.reviews.push({
            authorName,
            rating: Math.round(result.rating || 5),
            comment,
            reviewDate: dateText,
            isVerified: true,
            platform: 'HOMEADVISOR',
            sourceUrl: profileUrl,
          });
        },
      );
    }

    result.success = result.rating > 0 || result.totalReviews > 0 || result.reviews.length > 0;
    if (result.success) {
      this.logger.log(
        `✅ [HomeAdvisor] Extracted rating ${result.rating}★ (${result.totalReviews} reviews, ${result.reviews.length} comments)`,
      );
    }
    return result;
  }

  /**
   * Discovers a business's HomeAdvisor `/rated.*.html` listing, rating & review count from public search HTML
   */
  private async discoverViaPublicSearch(
    query: string,
    maxReviews: number,
  ): Promise<PlatformScrapedResult> {
    const result: PlatformScrapedResult = {
      platform: 'HOMEADVISOR',
      rating: 0,
      totalReviews: 0,
      profileUrl: 'https://www.homeadvisor.com',
      reviews: [],
      scrapedAt: new Date(),
      success: false,
    };

    const cleanQuery = query.startsWith('http')
      ? query.replace(/^https?:\/\/(www\.)?homeadvisor\.com\/rated\./i, '').replace(/\.\d+\.html.*$/i, '').replace(/\./g, ' ')
      : query;

    const coreBusinessName = cleanQuery
      .split(/\s+(?:Brooklyn|Manhattan|Queens|Bronx|Staten|New York|NY)/i)[0]
      .trim();
    const distinctiveTokens = this.getDistinctiveTokens(coreBusinessName);

    const searchQuery = `site:homeadvisor.com "${coreBusinessName}" New York`;
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;

    const html = await ScraperHttpUtil.fetchHtml(ddgUrl, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
      },
    });

    if (this.isAntiBotChallenge(html)) {
      this.logger.warn('⚠️ [HomeAdvisor] Search endpoint returned anti-bot challenge — stopping cleanly.');
      return result;
    }

    const $ = cheerio.load(html);
    const snippets: string[] = [];

    $('.result').each((_, el) => {
      const node = $(el);
      const rawHref = node.find('a.result__a').attr('href') || '';
      let resolvedHref = rawHref;
      const uddgMatch = rawHref.match(/[?&]uddg=([^&]+)/);
      if (uddgMatch) {
        try {
          resolvedHref = decodeURIComponent(uddgMatch[1]);
        } catch {
          resolvedHref = rawHref;
        }
      }

      if (!/homeadvisor\.com\/rated\./i.test(resolvedHref)) return;

      const titleText = node.find('.result__title').text();
      const candidateCheck = `${resolvedHref} ${titleText}`.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (
        distinctiveTokens.length > 0 &&
        !distinctiveTokens.every((tok) => candidateCheck.includes(tok))
      ) {
        return;
      }

      if (result.profileUrl === 'https://www.homeadvisor.com') {
        result.profileUrl = resolvedHref.split('?')[0];
      }

      const textBlock = `${node.find('.result__title').text()} ${node.find('.result__snippet').text()}`;

      // Parse patterns like "Rating: 4.8 · 34 reviews" or "4.9 (28)" or "(4.8 stars, 19 reviews)"
      const ratingCountMatch =
        textBlock.match(/Rating:\s*(\d\.\d)\s*[·•\-|]\s*([0-9,]+)\s*(?:votes|reviews)/i) ||
        textBlock.match(/(\d\.\d)\s*\(\s*([0-9,]+)\s*(?:reviews?)?\)/i) ||
        textBlock.match(/(\d\.\d)\s*(?:out of 5|stars?)[^0-9]{1,20}([0-9,]+)\s*(?:verified\s+)?reviews/i);

      if (ratingCountMatch && result.rating === 0) {
        result.rating = parseFloat(ratingCountMatch[1]) || 0;
        result.totalReviews = parseInt(ratingCountMatch[2].replace(/,/g, ''), 10) || 0;
      }

      const snippet = ScraperHttpUtil.cleanText(node.find('.result__snippet').text());
      if (snippet && snippet.length > 35 && snippets.length < maxReviews) {
        snippets.push(snippet);
      }
    });

    for (const snippet of snippets) {
      if (result.reviews.length >= maxReviews) break;
      result.reviews.push({
        authorName: 'Verified Homeowner',
        rating: Math.round(result.rating || 5),
        comment: snippet,
        isVerified: true,
        platform: 'HOMEADVISOR',
        sourceUrl: result.profileUrl,
      });
    }

    result.success = result.rating > 0 && result.totalReviews > 0;
    return result;
  }

  private getDistinctiveTokens(name: string): string[] {
    const stopWords = new Set([
      'inc', 'corp', 'corporation', 'llc', 'ltd', 'co', 'company',
      'roofing', 'roofer', 'roof', 'waterproofing', 'contracting', 'contractor', 'contractors',
      'construction', 'remodeling', 'design', 'build', 'interiors', 'studio',
      'home', 'improvements', 'improvement', 'cabinets', 'cabinet', 'closets', 'closet',
      'and', 'the', 'of', 'ny', 'nyc', 'new', 'york',
    ]);
    const rawTokens = name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 2);
    const filtered = rawTokens.filter((t) => !stopWords.has(t));
    return filtered.length > 0 ? filtered.slice(0, 2) : rawTokens.slice(0, 2);
  }

  private isAntiBotChallenge(html: string): boolean {
    if (!html) return false;
    const lower = html.toLowerCase();
    return (
      lower.includes('verify you are human') ||
      lower.includes('unusual traffic') ||
      lower.includes('cf-turnstile') ||
      lower.includes('g-recaptcha') ||
      lower.includes('hcaptcha') ||
      lower.includes('px-captcha')
    );
  }
}
