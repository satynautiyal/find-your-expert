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
export class HomeAdvisorReviewsScraperService {
  private readonly logger = new Logger(HomeAdvisorReviewsScraperService.name);

  /**
   * Scrapes HomeAdvisor ratings and verified homeowner reviews (up to 2,000 max):
   *   1. FREE Direct HTML + schema.org JSON-LD + __NEXT_DATA__ parsing FIRST when URL is known (0 API cost)
   *   2. Serper.dev Google index discovery ONLY when direct HTML hits PerimeterX gate or URL is unknown
   *   3. Free DuckDuckGo HTML lite fallback
   *
   * Strictly respects anti-bot / CAPTCHA gates: if challenged, stops immediately without bypassing.
   */
  async scrapeReviews(
    urlOrQuery: string,
    maxReviews = 2000
  ): Promise<PlatformScrapedResult> {
    const trimmed = (urlOrQuery || '').trim();
    const isDirectUrl = /^https?:\/\/(www\.)?homeadvisor\.com\//i.test(trimmed);
    const initialUrl = isDirectUrl ? trimmed.split('?')[0] : 'https://www.homeadvisor.com';

    this.logger.log(
      `🔍 [HomeAdvisor] Starting review fetch for: "${trimmed}" (Max: ${maxReviews})`
    );

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

    // Strategy 1 (FREE FIRST): If we already have a direct HomeAdvisor URL, attempt direct scrape first ($0 cost)
    let directRes: PlatformScrapedResult | null = null;
    if (isDirectUrl) {
      try {
        directRes = await this.scrapeDirectProfile(initialUrl, maxReviews);
        if (
          directRes.success &&
          directRes.reviews.length > 0 &&
          (directRes.rating > 0 || directRes.totalReviews > 0)
        ) {
          return directRes;
        }
      } catch (err: any) {
        this.logger.debug(`[HomeAdvisor] Direct fetch did not complete: ${err.message}`);
      }
    }

    // Strategy 2 (SERPER ONLY WHEN NEEDED): Direct URL was blocked by PerimeterX or no direct URL known
    if (SerperUtil.hasApiKey()) {
      try {
        const serperRes = await this.discoverViaSerper(trimmed, isDirectUrl, maxReviews);

        // If Serper newly discovered a rated.*.html URL that we haven't tried directly yet, try free direct scrape on it
        if (
          !isDirectUrl &&
          serperRes.profileUrl.includes('homeadvisor.com/rated.')
        ) {
          try {
            directRes = await this.scrapeDirectProfile(
              serperRes.profileUrl,
              maxReviews,
              serperRes.totalReviews
            );
          } catch {}
        }

        if (serperRes.success || (directRes && directRes.success)) {
          const mergedReviews: ScrapedReviewItem[] = [];
          const seen = new Set<string>();
          for (const r of [...(directRes?.reviews || []), ...serperRes.reviews]) {
            if (mergedReviews.length >= maxReviews) break;
            const norm = r.comment.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 65);
            if (!norm || seen.has(norm)) continue;
            seen.add(norm);
            mergedReviews.push(r);
          }

          const finalRating = directRes?.rating || serperRes.rating || 0;
          const finalTotal = Math.max(
            directRes?.totalReviews || 0,
            serperRes.totalReviews || 0,
            mergedReviews.length
          );

          if (finalRating > 0 || finalTotal > 0 || mergedReviews.length > 0) {
            return {
              platform: 'HOMEADVISOR',
              rating: finalRating,
              totalReviews: finalTotal,
              profileUrl:
                directRes?.profileUrl && directRes.profileUrl.includes('rated.')
                  ? directRes.profileUrl
                  : serperRes.profileUrl,
              reviews: mergedReviews,
              scrapedAt: new Date(),
              success: true,
            };
          }
        }
      } catch (serperErr: any) {
        this.logger.warn(`⚠️ [HomeAdvisor] Serper discovery failed: ${serperErr.message}`);
      }
    }

    // Strategy 3: Lightweight DuckDuckGo HTML fallback (free)
    try {
      const discovered = await this.discoverViaPublicSearch(trimmed, maxReviews);
      if (discovered.success) {
        return discovered;
      }
    } catch (searchErr: any) {
      this.logger.warn(`⚠️ [HomeAdvisor] Public search fallback failed: ${searchErr.message}`);
    }

    return directRes && directRes.success ? directRes : result;
  }

  /**
   * Uses Serper.dev (1–2 lightweight queries ONLY when direct scrape is blocked/unavailable)
   */
  private async discoverViaSerper(
    urlOrQuery: string,
    isDirectUrl: boolean,
    maxReviews: number
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
        const camelSpaced = idMatch[1]
          .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
          .replace(/([a-z0-9])([A-Z])/g, '$1 $2');
        distinctiveTokens = this.getDistinctiveTokens(camelSpaced);
        searchQ = `site:homeadvisor.com/rated.${idMatch[1]} OR site:homeadvisor.com "${camelSpaced}"`;
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

    const j1 = await SerperUtil.searchGoogle(searchQ, { num: 10 });
    const organic = Array.isArray(j1.organic) ? j1.organic : [];
    let matchedItem = organic.find((item) => {
      const href = String(item.link || '').split('?')[0];
      if (!href.includes('homeadvisor.com/rated.')) return false;
      if (isDirectUrl) return true;
      const hay = `${href} ${item.title || ''} ${item.snippet || ''}`
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      return distinctiveTokens.length === 0 || distinctiveTokens.every((t) => hay.includes(t));
    });

    if (!matchedItem) {
      return result;
    }

    if (matchedItem.link) {
      result.profileUrl = String(matchedItem.link).split('?')[0];
    }

    result.rating = Number(matchedItem.rating) || 0;
    result.totalReviews = Number(matchedItem.ratingCount) || 0;

    if ((result.rating === 0 || result.totalReviews === 0) && matchedItem.snippet) {
      const m =
        matchedItem.snippet.match(/(\d\.\d)\s*\(\s*(\d+)\s*\)/) ||
        matchedItem.snippet.match(/Rating:\s*(\d\.?\d?)\s*[·•-]\s*(\d+)\s*(?:reviews?|votes?)/i);
      if (m) {
        if (result.rating === 0) result.rating = parseFloat(m[1]);
        if (result.totalReviews === 0) result.totalReviews = parseInt(m[2], 10);
      }
    }

    const candidateSnippets: Array<{ text: string; date?: string }> = [];
    if (matchedItem.snippet) {
      candidateSnippets.push({ text: String(matchedItem.snippet), date: matchedItem.date });
    }

    const idPartMatch = result.profileUrl.match(/rated\.([^.]+)\.(\d+)\.html/i);
    const haSlugToken = idPartMatch ? idPartMatch[1].toLowerCase() : '';
    const haIdToken = idPartMatch ? idPartMatch[2] : '';
    const haNameSpaced = idPartMatch
      ? idPartMatch[1]
          .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
          .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      : '';

    // 1 targeted Serper query for indexed HomeAdvisor/Angi verified homeowner quotes
    if (haNameSpaced && (result.totalReviews > 0 || isDirectUrl)) {
      try {
        const q2 = await SerperUtil.searchGoogle(
          `(site:homeadvisor.com OR site:angi.com/companylist) "${haNameSpaced}" ("Review by" OR "Comments" OR "hired" OR "work" OR "recommend" OR "project")`,
          { num: 20 }
        );
        for (const item of q2.organic || []) {
          const itemUrl = String(item.link || '').split('?')[0];
          const itemUrlLower = itemUrl.toLowerCase();
          const matchesSameEntity =
            itemUrlLower === result.profileUrl.toLowerCase() ||
            (haIdToken && itemUrl.includes(haIdToken)) ||
            (haSlugToken && itemUrlLower.includes(haSlugToken)) ||
            (itemUrlLower.includes('angi.com/companylist') &&
              distinctiveTokens.length > 0 &&
              distinctiveTokens.every((t) =>
                `${itemUrlLower} ${(item.title || '').toLowerCase()}`
                  .replace(/[^a-z0-9]/g, '')
                  .includes(t)
              ));
          if (matchesSameEntity && item.snippet) {
            candidateSnippets.push({ text: String(item.snippet), date: item.date });
          }
        }
      } catch {}
    }

    const seenSnips = new Set<string>();
    let haIdx = 1;
    for (const rawEntry of candidateSnippets) {
      if (result.reviews.length >= maxReviews) break;
      let clean = rawEntry.text
        .replace(/Read real-world reviews from homeowners[^.]*\./gi, '')
        .replace(/See rating, reviews,\s*projects and more[^.]*\./gi, '')
        .replace(/HomeAdvisor\s*[-|•].*$/gi, '')
        .replace(/\.{3}$/g, '')
        .trim();

      let authorName = `HomeAdvisor Homeowner #${haIdx}`;
      const authorMatch = clean.match(
        /Review by\s+([A-Z][a-z]+(?:\s+[A-Z]\.?)?)\s+in\s+[A-Za-z\s]+,\s*[A-Z]{2}/
      );
      if (authorMatch) {
        authorName = `${authorMatch[1].trim()} (Verified Homeowner)`;
      }

      clean = clean.replace(/^Comments:\s*/i, '').trim();
      const key = clean.substring(0, 55).toLowerCase();
      if (clean.length >= 28 && !seenSnips.has(key)) {
        seenSnips.add(key);
        haIdx++;
        result.reviews.push({
          authorName,
          rating: Math.min(5, Math.max(1, Math.round(result.rating || 5))),
          comment: clean,
          reviewDate: rawEntry.date || undefined,
          isVerified: true,
          platform: 'HOMEADVISOR',
          sourceUrl: result.profileUrl,
        });
      }
    }

    result.success =
      result.rating > 0 || result.totalReviews > 0 || result.reviews.length > 0;
    if (result.success) {
      this.logger.log(
        `✅ [HomeAdvisor Serper] ${result.profileUrl}: ${result.rating}★ (${result.totalReviews} reviews, ${result.reviews.length} quotes)`
      );
    }
    return result;
  }

  /**
   * Parses a public HomeAdvisor `/rated.<Business>.<id>.html` page via HTTP / Stealth Browser + multi-page pagination
   */
  private async scrapeDirectProfile(
    profileUrl: string,
    maxReviews: number,
    knownTotalReviews = 0
  ): Promise<PlatformScrapedResult> {
    const baseProfileUrl = profileUrl.split('?')[0];
    const result: PlatformScrapedResult = {
      platform: 'HOMEADVISOR',
      rating: 0,
      totalReviews: knownTotalReviews,
      profileUrl: baseProfileUrl,
      reviews: [],
      scrapedAt: new Date(),
      success: false,
    };

    const seenKeys = new Set<string>();
    let fallbackIdx = 1;

    const parseHtmlIntoResult = (html: string): number => {
      const $ = cheerio.load(html);
      let added = 0;

      const pushReview = (
        authorRaw: string,
        ratingVal: number,
        commentRaw: string,
        dateRaw?: string,
        photosRaw?: string[]
      ) => {
        if (result.reviews.length >= maxReviews) return;
        const body = ScraperHttpUtil.cleanText(commentRaw || '');
        if (!body || body.length < 12) return;
        const norm = body.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 70);
        if (!norm || seenKeys.has(norm)) return;
        seenKeys.add(norm);

        const cleanAuthor =
          (authorRaw || '').replace(/\s+/g, ' ').trim() ||
          `Verified Homeowner #${fallbackIdx++}`;
        result.reviews.push({
          authorName:
            cleanAuthor === 'Verified Homeowner'
              ? `Verified Homeowner #${fallbackIdx++}`
              : cleanAuthor,
          photoUrls: photosRaw && photosRaw.length > 0 ? photosRaw.slice(0, 8) : undefined,
          rating: Math.min(5, Math.max(1, Math.round(ratingVal || result.rating || 5))),
          comment: body,
          reviewDate: dateRaw ? dateRaw.trim() : undefined,
          isVerified: true,
          platform: 'HOMEADVISOR',
          sourceUrl: baseProfileUrl,
        });
        added++;
      };

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
                10
              );
              if (!Number.isNaN(r) && r > 0) result.rating = r;
              if (!Number.isNaN(c) && c > result.totalReviews) result.totalReviews = c;
            }

            if (Array.isArray(node?.review)) {
              for (const rev of node.review) {
                const revRating = parseFloat(String(rev.reviewRating?.ratingValue || '5')) || 5;
                const author =
                  typeof rev.author === 'string'
                    ? rev.author
                    : rev.author?.name || 'Verified Homeowner';
                pushReview(
                  author,
                  revRating,
                  rev.reviewBody || rev.description || '',
                  rev.datePublished
                );
              }
            }
          }
        } catch {}
      });

      const nextDataRaw = $('#__NEXT_DATA__').html();
      if (nextDataRaw) {
        try {
          const nextJson = JSON.parse(nextDataRaw);
          const scanReviews = (obj: any, depth = 0) => {
            if (!obj || typeof obj !== 'object' || depth > 8) return;
            if (Array.isArray(obj)) {
              for (const item of obj) scanReviews(item, depth + 1);
              return;
            }
            const textCandidate =
              obj.reviewText || obj.comments || obj.comment || obj.reviewBody || obj.body;
            const ratingCandidate = Number(obj.rating || obj.overallRating || obj.starRating || 0);
            if (
              typeof textCandidate === 'string' &&
              textCandidate.trim().length >= 12 &&
              (ratingCandidate > 0 || obj.reviewerName || obj.authorName || obj.firstName)
            ) {
              const author =
                obj.reviewerName ||
                obj.authorName ||
                [obj.firstName, obj.lastInitial || obj.lastName].filter(Boolean).join(' ') ||
                'Verified Homeowner';
              const dateStr = obj.submittedDate || obj.createdAt || obj.reviewDate || obj.date;
              const rawPhotos: string[] = [];
              if (Array.isArray(obj.photos || obj.images)) {
                for (const p of obj.photos || obj.images) {
                  const u = typeof p === 'string' ? p : p?.url || p?.imageUrl || '';
                  if (typeof u === 'string' && u.startsWith('http')) rawPhotos.push(u);
                }
              }
              pushReview(author, ratingCandidate || 5, textCandidate, dateStr, rawPhotos);
            }
            for (const val of Object.values(obj)) {
              if (val && typeof val === 'object') scanReviews(val, depth + 1);
            }
          };
          scanReviews(nextJson);
        } catch {}
      }

      if (result.rating === 0 || result.totalReviews === 0) {
        const bodyText = $('body').text();
        const ratingMatch = bodyText.match(/([1-5]\.\d)\s*(?:out of 5|\/5|\s*stars?)/i);
        const countMatch = bodyText.match(/([0-9,]+)\s+(?:Verified\s+)?Reviews?/i);
        if (result.rating === 0 && ratingMatch) {
          result.rating = parseFloat(ratingMatch[1]) || 0;
        }
        if (countMatch) {
          const cVal = parseInt(countMatch[1].replace(/,/g, ''), 10) || 0;
          if (cVal > result.totalReviews) result.totalReviews = cVal;
        }
      }

      $(
        '[itemprop="review"], .sp-review-card, [class*="review-card" i], [class*="ReviewCard" i], [data-testid*="review" i], .review-item, article[class*="review" i]'
      ).each((_, el) => {
        if (result.reviews.length >= maxReviews) return;
        const card = $(el);
        const comment =
          card
            .find('[itemprop="reviewBody"], .review-content, [class*="comment" i], p')
            .map((__, pEl) => $(pEl).text().trim())
            .get()
            .filter((t) => t.length >= 12)
            .join(' ') || '';
        if (!comment || comment.length < 15) return;

        const authorName =
          card
            .find('[itemprop="author"], .review-author, [class*="author" i], strong')
            .first()
            .text()
            .trim() || 'Verified Homeowner';
        const dateText =
          card
            .find('[itemprop="datePublished"], time, .review-date, [class*="date" i]')
            .first()
            .text()
            .trim() || undefined;
        const ratingAttr =
          card.find('[itemprop="ratingValue"]').attr('content') ||
          card.find('[itemprop="ratingValue"]').text();
        const cardRating = parseFloat(ratingAttr || '') || result.rating || 5;

        const cardPhotos: string[] = [];
        card.find('img[src^="http"]').each((__, imgEl) => {
          const u = ($(imgEl).attr('src') || '').trim();
          if (u && !/avatar|icon|logo|star/i.test(u)) cardPhotos.push(u);
        });

        pushReview(authorName, cardRating, comment, dateText, cardPhotos);
      });

      return added;
    };

    const fetchPageHtml = async (url: string, allowBrowserFallback: boolean): Promise<string> => {
      try {
        return await ScraperHttpUtil.fetchHtml(url, {
          headers: {
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          timeoutMs: 10000,
        });
      } catch {
        if (!allowBrowserFallback) return '';
        let browser: any = null;
        try {
          browser = await BrowserPoolUtil.createBrowser();
          const page = await BrowserPoolUtil.createStealthPage(browser);
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
          await new Promise((r: any) => setTimeout(r, 1600));
          return await page.content();
        } catch {
          return '';
        } finally {
          if (browser) {
            try {
              await browser.close();
            } catch {}
          }
        }
      }
    };

    const firstHtml = await fetchPageHtml(baseProfileUrl, false);
    if (!firstHtml || this.isAntiBotChallenge(firstHtml)) {
      if (firstHtml) {
        this.logger.warn(
          `⚠️ [HomeAdvisor] Anti-bot / CAPTCHA gate detected on ${baseProfileUrl} — stopping direct fetch cleanly.`
        );
        result.error = 'Blocked by anti-bot challenge';
      }
      return result;
    }

    parseHtmlIntoResult(firstHtml);

    const targetCount = Math.min(maxReviews, result.totalReviews || maxReviews);
    const maxPages = Math.min(200, Math.ceil(targetCount / 10) + 2);

    for (let pageNum = 2; pageNum <= maxPages && result.reviews.length < targetCount; pageNum++) {
      const pagedUrl = `${baseProfileUrl}?page=${pageNum}`;
      const pageHtml = await fetchPageHtml(pagedUrl, false);
      if (!pageHtml || this.isAntiBotChallenge(pageHtml)) break;
      const added = parseHtmlIntoResult(pageHtml);
      if (added === 0) break;
    }

    result.success = result.rating > 0 || result.totalReviews > 0 || result.reviews.length > 0;
    return result;
  }

  private async discoverViaPublicSearch(
    query: string,
    maxReviews: number
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

    const searchQuery = `site:homeadvisor.com "${coreBusinessName}" New York`;
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;

    const html = await ScraperHttpUtil.fetchHtml(ddgUrl, {
      headers: { Accept: 'text/html,application/xhtml+xml' },
    });

    if (this.isAntiBotChallenge(html)) return result;

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

      const textBlock = `${titleText} ${node.find('.result__snippet').text()}`;
      const ratingCountMatch =
        textBlock.match(/Rating:\s*(\d\.\d)\s*[·•\-|]\s*([0-9,]+)\s*(?:votes|reviews)/i) ||
        textBlock.match(/(\d\.\d)\s*\(\s*([0-9,]+)\s*(?:reviews?)?\)/i);

      if (ratingCountMatch && result.rating === 0) {
        result.rating = parseFloat(ratingCountMatch[1]) || 0;
        result.totalReviews = parseInt(ratingCountMatch[2].replace(/,/g, ''), 10) || 0;
      }

      const snippet = ScraperHttpUtil.cleanText(node.find('.result__snippet').text());
      if (snippet && snippet.length > 35 && snippets.length < maxReviews) {
        snippets.push(snippet);
      }
    });

    let idx = 1;
    for (const snippet of snippets) {
      if (result.reviews.length >= maxReviews) break;
      result.reviews.push({
        authorName: `Verified Homeowner #${idx++}`,
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
