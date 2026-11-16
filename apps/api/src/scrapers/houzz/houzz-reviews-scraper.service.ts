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
   * Scrapes Houzz reviews (up to 2,000 max) using a multi-strategy pipeline:
   *   1. Direct stealth browser extraction with full scroll, "Read More" expansion & multi-page review pagination
   *   2. Cheerio direct HTML parsing fallback (if not challenged)
   *   3. Google Search rich snippet extraction fallback
   *
   * @param urlOrSlug Houzz profile URL, slug (e.g. "evolution-group-pfvwus-pf~1766049999"), or business name
   * @param maxReviews Max reviews to collect (default: 2000)
   */
  async scrapeReviews(
    urlOrSlug: string,
    maxReviews = 2000
  ): Promise<PlatformScrapedResult> {
    const targetUrl = this.normalizeHouzzUrl(urlOrSlug);

    this.logger.log(`🔍 [Houzz] Starting deep reviews scrape for: "${targetUrl}" (Max: ${maxReviews})`);

    const result: PlatformScrapedResult = {
      platform: 'HOUZZ',
      rating: 0,
      totalReviews: 0,
      profileUrl: targetUrl,
      reviews: [],
      scrapedAt: new Date(),
      success: false,
    };

    // Strategy 1: Direct Stealth Browser extraction with full multi-page pagination
    if (targetUrl.includes('houzz.com')) {
      try {
        const browserResult = await this.scrapeViaStealthBrowser(targetUrl, maxReviews);
        if (
          browserResult.success &&
          (browserResult.rating > 0 ||
            browserResult.totalReviews > 0 ||
            browserResult.reviews.length > 0)
        ) {
          return browserResult;
        }
      } catch (err: any) {
        this.logger.warn(
          `⚠️ [Houzz] Direct browser scrape failed (${err.message}), trying fallback strategies...`
        );
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

    // Strategy 3: Google Search rich snippet fallback
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

    if (trimmed.includes('pfvwus-pf~')) {
      return `https://www.houzz.com/professionals/general-contractors/${trimmed}`;
    }

    return `https://www.houzz.com/pro/${trimmed.replace(/^\/+/, '')}`;
  }

  /**
   * Strategy 1: Full stealth browser scrape of Houzz profile page with multi-page review pagination
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
      await page.setViewport({ width: 1440, height: 900 });

      this.logger.debug(`[Houzz] Navigating to: ${targetUrl}`);
      await page.goto(targetUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      await new Promise((r) => setTimeout(r, 2500));

      // Extract contractor's official external website URL from Houzz profile before navigating/scrolling
      const rawExternalWebsite = await page.evaluate(() => {
        // 1. Check DOM website anchor on Houzz Pro header/sidebar
        const webAnchors = Array.from(
          document.querySelectorAll(
            'a[data-compid*="Website" i], a[aria-label*="Website" i], a[class*="Website" i], a[rel*="noopener"][target="_blank"]'
          )
        ) as HTMLAnchorElement[];
        for (const a of webAnchors) {
          const txt = ((a.textContent || '') + ' ' + (a.getAttribute('aria-label') || '')).trim();
          const href = a.href || '';
          if (href && /^https?:\/\//i.test(href) && !href.includes('houzz.com') && /website|visit/i.test(txt)) {
            return href;
          }
        }
        // 2. Check JSON-LD sameAs / url
        for (const s of Array.from(document.querySelectorAll('script[type="application/ld+json"]'))) {
          try {
            const p = JSON.parse(s.textContent || '');
            const items = Array.isArray(p) ? p : p?.['@graph'] || [p];
            for (const it of items) {
              if (typeof it?.url === 'string' && !it.url.includes('houzz.com')) return it.url;
              if (Array.isArray(it?.sameAs)) {
                const ext = it.sameAs.find(
                  (u: any) =>
                    typeof u === 'string' &&
                    /^https?:\/\//i.test(u) &&
                    !/houzz|facebook|instagram|pinterest|twitter|linkedin|youtube|yelp/i.test(u)
                );
                if (ext) return ext;
              }
            }
          } catch {}
        }
        // 3. Check #hz-ctx JSON for website field
        const ctxRaw = document.getElementById('hz-ctx')?.textContent || '';
        const m = ctxRaw.match(/"(?:website|proWebsite|websiteUrl)"\s*:\s*"(https?:\\?\/\\?\/[^"]+)"/i);
        if (m?.[1]) {
          return m[1].replace(/\\\//g, '/');
        }
        return '';
      });
      const discoveredSite = ScraperHttpUtil.normalizeOfficialWebsiteUrl(rawExternalWebsite);
      if (discoveredSite) {
        result.discoveredWebsiteUrl = discoveredSite;
      }

      // Click "Reviews" tab in Houzz's sticky profile nav using REAL CDP click and scroll through reviews so pagination bar renders
      const markedHzRevTab = await page.evaluate(() => {
        document
          .querySelectorAll('[data-agy-hz-revtab]')
          .forEach((n) => n.removeAttribute('data-agy-hz-revtab'));
        const navLinks = Array.from(
          document.querySelectorAll('a[href*="#reviews"], button, a[role="tab"], [role="tab"]')
        ) as HTMLElement[];
        for (const nl of navLinks) {
          const txt = (nl.textContent || '').trim();
          const href = (nl as HTMLAnchorElement).getAttribute?.('href') || '';
          if (href.includes('#reviews') || /^reviews\s*(\(\d+\))?$/i.test(txt)) {
            nl.setAttribute('data-agy-hz-revtab', '1');
            nl.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'center' });
            return true;
          }
        }
        return false;
      });
      if (markedHzRevTab) {
        const hzTabHandle = await page.$('[data-agy-hz-revtab="1"]');
        if (hzTabHandle) {
          await hzTabHandle.click({ delay: 35 }).catch(() => {});
          await new Promise((r) => setTimeout(r, 1200));
        }
      }

      await page.evaluate(async () => {
        const step = 800;
        for (let y = 0; y <= Math.min(document.body.scrollHeight, 18000); y += step) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 85));
        }
        const cards = document.querySelectorAll('[data-component="ReviewItem"], .review-item');
        if (cards.length > 0) {
          cards[cards.length - 1].scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'center' });
        }
      });
      await new Promise((r) => setTimeout(r, 1500));

      // Check if there is a dedicated "See All N Reviews" / "Read All Reviews" / "/browseReviews/" control when main page only previews 5-10 reviews
      const expandedOrBrowseUrl = await page.evaluate(() => {
        document
          .querySelectorAll('[data-agy-hz-expand]')
          .forEach((n) => n.removeAttribute('data-agy-hz-expand'));
        const browseLinks = Array.from(
          document.querySelectorAll('a[href*="browseReviews"]')
        ) as HTMLAnchorElement[];
        if (browseLinks[0]?.href) return { navHref: browseLinks[0].href, markedExpand: false };

        const expandCandidates = Array.from(
          document.querySelectorAll('a, button')
        ) as HTMLElement[];
        for (const el of expandCandidates) {
          if (el.closest('header, footer')) continue;
          const txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
          if (/\b(see|read|show|view|load)\s+(all\s+|more\s+)?(\d+\s+)?reviews\b/i.test(txt)) {
            const href = (el as HTMLAnchorElement).href || '';
            if (href && href.includes('houzz.com') && !href.includes('#')) {
              return { navHref: href, markedExpand: false };
            }
            el.setAttribute('data-agy-hz-expand', '1');
            el.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'center' });
            return { navHref: '', markedExpand: true };
          }
        }
        return { navHref: '', markedExpand: false };
      });
      if (expandedOrBrowseUrl.navHref && expandedOrBrowseUrl.navHref.includes('houzz.com')) {
        try {
          await page.goto(expandedOrBrowseUrl.navHref, {
            waitUntil: 'domcontentloaded',
            timeout: 25000,
          });
          await new Promise((r) => setTimeout(r, 2000));
        } catch {}
      } else if (expandedOrBrowseUrl.markedExpand) {
        const expHandle = await page.$('[data-agy-hz-expand="1"]');
        if (expHandle) {
          await expHandle.click({ delay: 40 }).catch(() => {});
          await new Promise((r) => setTimeout(r, 2000));
        }
      }

      const collectedMap = new Map<
        string,
        {
          authorName: string;
          authorAvatarUrl: string;
          photoUrls: string[];
          rating: number;
          reviewDate: string;
          comment: string;
        }
      >();

      const extractCurrentPage = async (includeJsonLd: boolean) => {
        // Expand any "Read More" toggles inside review cards first
        const clickedMoreCount = await page.evaluate(() => {
          let clicked = 0;
          const candidates = Array.from(
            document.querySelectorAll(
              '#reviews button, #reviews a, .review-item button, .review-item span[role="button"], [data-component="ReviewItem"] button, [data-component="ReviewItem"] span[role="button"], [class*="Review" i] button'
            )
          ) as HTMLElement[];
          for (const el of candidates) {
            const txt = (el.textContent || '').trim();
            if (/^read\s+more$/i.test(txt)) {
              try {
                el.click();
                clicked++;
              } catch {}
            }
          }
          return clicked;
        });

        if (clickedMoreCount > 0) {
          await new Promise((r) => setTimeout(r, 450));
        }

        return await page.evaluate((parseJsonLd: boolean) => {
          const upgradeHouzzImg = (rawSrc: string): string => {
            if (!rawSrc) return '';
            let u = rawSrc.trim().split(' ')[0];
            if (u.startsWith('//')) u = 'https:' + u;
            if (!u.startsWith('http') || !u.includes('hzcdn.com')) return '';
            if (
              u.includes('spacer') ||
              u.includes('badge') ||
              u.includes('avatar') ||
              u.includes('user_')
            ) {
              return '';
            }
            // Reject small square profile/owner-reply avatars BEFORE upgrading dimensions!
            // e.g. -w36-h36-, -w44-h44-, -w60-h60-, -w72-h72-, -w100-h100- or simgs _0-, _1-, _2-
            const dimMatch = u.match(/-w(\d+)-h(\d+)-/i);
            if (dimMatch) {
              const w = parseInt(dimMatch[1], 10);
              const h = parseInt(dimMatch[2], 10);
              if (w <= 120 && h <= 120 && Math.abs(w - h) <= 12) return '';
            }
            if (/\/simgs\/[a-f0-9]+_(?:0|1|2)-/i.test(u)) return '';

            // Upgrade st.hzcdn.com/simgs/<id>_<size>-... to _9- (900px crisp)
            u = u.replace(/\/simgs\/([a-f0-9]+)_(\d+)-/i, '/simgs/$1_9-');
            u = u.replace(/-w\d+-h\d+-/i, '-w1000-h1000-');
            return u;
          };

          let rating = 0;
          let totalReviews = 0;
          const pageReviews: Array<{
            authorName: string;
            authorAvatarUrl: string;
            photoUrls: string[];
            rating: number;
            reviewDate: string;
            comment: string;
          }> = [];

          // 1. Extract schema.org JSON-LD aggregateRating + initial reviews
          const scripts = Array.from(
            document.querySelectorAll('script[type="application/ld+json"]')
          );
          for (const s of scripts) {
            try {
              const parsed = JSON.parse(s.textContent || '');
              const rootItems = Array.isArray(parsed)
                ? parsed
                : parsed && Array.isArray(parsed['@graph'])
                ? parsed['@graph']
                : [parsed];

              for (const item of rootItems) {
                if (!item || typeof item !== 'object') continue;
                if (item.aggregateRating) {
                  const val = parseFloat(item.aggregateRating.ratingValue);
                  const count = parseInt(item.aggregateRating.reviewCount, 10);
                  if (!isNaN(val) && val > 0) rating = val;
                  if (!isNaN(count) && count > 0) totalReviews = count;
                }

                if (parseJsonLd) {
                  const jsonReviews = Array.isArray(item.review)
                    ? item.review
                    : item['@type'] === 'Review'
                    ? [item]
                    : [];

                  for (const jr of jsonReviews) {
                    const body = String(jr.reviewBody || jr.description || '').trim();
                    if (body.length < 15) continue;
                    const authorObj = jr.author;
                    const authorName =
                      (typeof authorObj === 'string'
                        ? authorObj
                        : authorObj?.name || ''
                      ).trim() || 'Verified Houzz Homeowner';
                    const rVal = parseFloat(jr.reviewRating?.ratingValue || '5');
                    const dateRaw = String(jr.datePublished || '').trim();

                    pageReviews.push({
                      authorName,
                      authorAvatarUrl: '',
                      photoUrls: [],
                      rating: !isNaN(rVal) && rVal > 0 ? Math.round(rVal) : 5,
                      reviewDate: dateRaw,
                      comment: body,
                    });
                  }
                }
              }
            } catch {}
          }

          // 2. Also inspect <script id="hz-ctx"> Redux store for structured ReviewStore entries if present
          if (parseJsonLd) {
            try {
              const ctxText = document.getElementById('hz-ctx')?.textContent || '';
              if (ctxText) {
                const ctxJson = JSON.parse(ctxText);
                const reviewStore =
                  ctxJson?.data?.stores?.data?.ReviewStore?.data ||
                  ctxJson?.data?.stores?.data?.ProfessionalReviewStore?.data ||
                  null;
                if (reviewStore && typeof reviewStore === 'object') {
                  const candidates = Object.values(reviewStore).flatMap((v: any) =>
                    Array.isArray(v) ? v : v && typeof v === 'object' ? Object.values(v) : []
                  );
                  for (const rev of candidates as any[]) {
                    if (!rev || typeof rev !== 'object') continue;
                    const body = String(rev.body || rev.comment || rev.reviewText || '').trim();
                    if (body.length < 15) continue;
                    const authorName = String(
                      rev.user?.displayName ||
                        rev.user?.userName ||
                        rev.reviewerName ||
                        rev.authorName ||
                        ''
                    ).trim();
                    const avatar = String(
                      rev.user?.profileImageUrl || rev.user?.avatarUrl || ''
                    ).trim();
                    const rVal = Number(rev.rating || rev.starRating || 5);
                    const dateStr = String(rev.created || rev.publishDate || rev.date || '').trim();
                    const rawPhotoArr: string[] = [];
                    const imgsField = rev.images || rev.photos || rev.reviewPhotos || [];
                    if (Array.isArray(imgsField)) {
                      for (const imgEntry of imgsField) {
                        const rawU =
                          typeof imgEntry === 'string'
                            ? imgEntry
                            : imgEntry?.url || imgEntry?.src || imgEntry?.imageUrl || '';
                        const up = upgradeHouzzImg(rawU);
                        if (up && !rawPhotoArr.includes(up)) rawPhotoArr.push(up);
                      }
                    }
                    pageReviews.push({
                      authorName: authorName || 'Verified Houzz Homeowner',
                      authorAvatarUrl: avatar.startsWith('http') ? avatar : '',
                      photoUrls: rawPhotoArr.slice(0, 8),
                      rating: rVal >= 1 && rVal <= 5 ? Math.round(rVal) : 5,
                      reviewDate: dateStr,
                      comment: body,
                    });
                  }
                }
              }
            } catch {}
          }

          // 3. DOM aggregate rating fallback
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

          // 4. Extract top-level DOM review cards (preferred: includes avatar, date & owner replies)
          const reviewItems = Array.from(
            document.querySelectorAll(
              '[data-component="ReviewItem"], .hz-PendingReview, .review-item, #reviews [class*="ReviewItem" i], #reviews article'
            )
          ).filter((el) => {
            const cls = typeof el.className === 'string' ? el.className : '';
            if (/review-item__/.test(cls)) return false;
            // Exclude nested duplicates if an ancestor is already matched
            const parentMatch = el.parentElement?.closest(
              '[data-component="ReviewItem"], .hz-PendingReview, .review-item'
            );
            return !parentMatch;
          });

          for (const item of reviewItems) {
            const rightSideEl = item.querySelector(
              '.review-item__reviewer_right_side a, [class*="reviewer_right_side"] a, [class*="ReviewerInfo" i] a, [class*="Author" i] a, [class*="userName" i], .hz-user-name'
            );
            const genericAuthorEl = item.querySelector(
              '.review-item__reviewer a, [class*="reviewer" i] a, a[href*="/user/"]'
            );
            let authorName = (
              rightSideEl?.textContent ||
              genericAuthorEl?.textContent ||
              ''
            )
              .replace(/\s+/g, ' ')
              .trim();

            if (!authorName || authorName.length <= 1 || /^Average rating/i.test(authorName)) {
              authorName = 'Verified Houzz Homeowner';
            }

            const avatarEl = item.querySelector(
              '.review-item__reviewer img, [class*="reviewer" i] img, [class*="ReviewerInfo" i] img, [class*="Author" i] img'
            ) as HTMLImageElement | null;
            const rawAvatarSrc = avatarEl?.currentSrc || avatarEl?.getAttribute('src') || '';
            const authorAvatarUrl =
              rawAvatarSrc.startsWith('http') && !rawAvatarSrc.includes('spacer')
                ? rawAvatarSrc
                : '';

            // Extract customer-shared project photos attached inside this review (strictly excluding reviewer & owner-reply avatars!)
            const reviewPhotoSet = new Set<string>();
            const allCardImgs = Array.from(item.querySelectorAll('img')) as HTMLImageElement[];
            for (const cImg of allCardImgs) {
              if (cImg === avatarEl) continue;
              if (
                cImg.closest(
                  '.review-item__reviewer, [class*="reviewer" i], [class*="ReviewerInfo" i], [class*="Author" i], [class*="Comment" i], [class*="Reply" i], [class*="Response" i], a[href*="/professionals/"], a[href*="/pro/"], a[href*="/user/"]'
                )
              ) {
                continue;
              }
              const candSrc =
                cImg.currentSrc ||
                cImg.getAttribute('src') ||
                cImg.getAttribute('data-src') ||
                cImg.getAttribute('srcset')?.split(' ')[0] ||
                '';
              if (!candSrc || candSrc === rawAvatarSrc) continue;
              const w = cImg.naturalWidth || cImg.width || 0;
              const h = cImg.naturalHeight || cImg.height || 0;
              if (w > 0 && h > 0 && w <= 80 && h <= 80) continue; // skip small icons/avatars
              const upgraded = upgradeHouzzImg(candSrc);
              if (upgraded) reviewPhotoSet.add(upgraded);
            }

            const itemText = (item as HTMLElement).innerText || '';
            const ratingMatch =
              itemText.match(/Average rating:\s*([0-9]+(?:\.[0-9]+)?)\s*out of 5/i) ||
              itemText.match(/([0-9]+(?:\.[0-9]+)?)\s*out of 5 stars/i);
            let reviewRating = ratingMatch ? Math.round(parseFloat(ratingMatch[1])) : 0;
            if (!reviewRating) {
              const starAria = item
                .querySelector('[aria-label*="out of 5" i], [aria-label*="star" i]')
                ?.getAttribute('aria-label');
              const m = starAria?.match(/([0-9]+(?:\.[0-9]+)?)/);
              reviewRating = m ? Math.round(parseFloat(m[1])) : 5;
            }

            const dateMatch = itemText.match(
              /([A-Z][a-z]+\s+\d{1,2},\s+\d{4}|\d+\s+(?:days?|weeks?|months?|years?)\s+ago|[A-Z][a-z]+\s+\d{4})/
            );
            const reviewDate = dateMatch ? dateMatch[1] : '';

            const clone = item.cloneNode(true) as HTMLElement;
            clone
              .querySelectorAll(
                '.review-item__reviewer, [class*="reviewer" i], button, [class*="helpful" i], a[href*="write-review"], [class*=" Thumb" i]'
              )
              .forEach((n) => n.remove());

            const cleanComment = (clone.innerText || '')
              .replace(/Average rating:.*?(?:stars|\n)/gi, '')
              .replace(/\bRead\s+(?:More|Less)\b/gi, '')
              .replace(/\bHelpful\s*(?:\(\d+\))?/gi, '')
              .replace(/\bLike\s*(?:\(\d*\))?/gi, '')
              .replace(/\bSave\b/gi, '')
              .replace(/\bShare\b/gi, '')
              .replace(/\s+/g, ' ')
              .trim();

            const isNoise =
              cleanComment.length < 18 ||
              /^Average rating:/i.test(cleanComment) ||
              /^[A-Za-z0-9+/]{24,}$/.test(cleanComment);

            if (!isNoise) {
              pageReviews.push({
                authorName,
                authorAvatarUrl,
                photoUrls: Array.from(reviewPhotoSet).slice(0, 8),
                rating: Math.min(5, Math.max(1, reviewRating || 5)),
                reviewDate,
                comment: cleanComment,
              });
            }
          }

          return {
            rating,
            totalReviews,
            reviews: pageReviews,
          };
        }, includeJsonLd);
      };

      const mergeExtracted = (
        batch: Array<{
          authorName: string;
          authorAvatarUrl: string;
          photoUrls: string[];
          rating: number;
          reviewDate: string;
          comment: string;
        }>
      ): number => {
        let added = 0;
        for (const r of batch) {
          if (collectedMap.size >= maxReviews) break;
          const normKey = r.comment
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .slice(0, 75);
          if (!normKey || normKey.length < 12) continue;

          const existing = collectedMap.get(normKey);
          if (!existing) {
            collectedMap.set(normKey, r);
            added++;
          } else {
            // Upgrade existing entry if DOM version has avatar, photos, longer text, or real author name
            if (
              (!existing.authorAvatarUrl && r.authorAvatarUrl) ||
              (existing.photoUrls.length === 0 && r.photoUrls.length > 0) ||
              (r.comment.length > existing.comment.length + 10) ||
              (existing.authorName.includes('Houzz Homeowner') &&
                !r.authorName.includes('Houzz Homeowner'))
            ) {
              collectedMap.set(normKey, {
                authorName: !r.authorName.includes('Houzz Homeowner')
                  ? r.authorName
                  : existing.authorName,
                authorAvatarUrl: r.authorAvatarUrl || existing.authorAvatarUrl,
                photoUrls:
                  r.photoUrls.length >= existing.photoUrls.length
                    ? r.photoUrls
                    : existing.photoUrls,
                rating: r.rating || existing.rating,
                reviewDate: r.reviewDate || existing.reviewDate,
                comment: r.comment.length >= existing.comment.length ? r.comment : existing.comment,
              });
            }
          }
        }
        return added;
      };

      // First page extraction
      const firstPage = await extractCurrentPage(true);
      if (firstPage.rating > 0) result.rating = firstPage.rating;
      if (firstPage.totalReviews > 0) result.totalReviews = firstPage.totalReviews;
      mergeExtracted(firstPage.reviews);

      // Paginate through all remaining Houzz review pages up to maxReviews
      const expectedTotal = result.totalReviews || maxReviews;
      const maxPages = Math.min(220, Math.ceil(Math.min(expectedTotal, maxReviews) / 5) + 5);
      let stagnantCount = 0;

      for (
        let pageNum = 2;
        pageNum <= maxPages &&
        collectedMap.size < maxReviews &&
        collectedMap.size < expectedTotal;
        pageNum++
      ) {
        const paginationAction = await page.evaluate((nextPageNum: number) => {
          document
            .querySelectorAll('[data-agy-hz-next]')
            .forEach((n) => n.removeAttribute('data-agy-hz-next'));

          // Scroll last review card into view so the pagination bar right underneath it is mounted and active
          const cards = document.querySelectorAll(
            '[data-component="ReviewItem"], .hz-PendingReview, .review-item'
          );
          let firstCardTop = 0;
          if (cards.length > 0) {
            firstCardTop = cards[0].getBoundingClientRect().top + window.scrollY - 120;
            cards[cards.length - 1].scrollIntoView({
              behavior: 'instant' as ScrollBehavior,
              block: 'center',
            });
          }

          // Universal selector across ALL interactive elements below first review card & above footer (immune to hashed StyledComponents classes!)
          const allClickables = Array.from(
            document.querySelectorAll('a, button, li[role="button"], span[role="button"]')
          ) as HTMLElement[];

          const isExcludedArea = (el: HTMLElement) => {
            if (
              el.closest(
                'header, footer, [class*="ProjectCarousel" i], [class*="ProHeader" i], .review-item, [data-component="ReviewItem"]'
              )
            ) {
              return true;
            }
            if (firstCardTop > 0) {
              const absTop = el.getBoundingClientRect().top + window.scrollY;
              if (absTop < firstCardTop) return true;
            }
            return false;
          };

          const isDisabled = (el: HTMLElement) =>
            Boolean(
              (el as HTMLButtonElement).disabled ||
                el.getAttribute('aria-disabled') === 'true' ||
                /\bdisabled\b/i.test(typeof el.className === 'string' ? el.className : '')
            );

          // Priority 1: Exact page number button ("2", "3", ...) that shares a bar/ancestor (within 3 levels) with String(nextPageNum - 1)
          const prevStr = String(nextPageNum - 1);
          const nextStr = String(nextPageNum);
          for (const el of allClickables) {
            if (isExcludedArea(el) || isDisabled(el)) continue;
            const txt = (el.textContent || '').trim();
            if (txt !== nextStr) continue;

            const bar = el.parentElement?.parentElement?.parentElement || el.parentElement;
            const hasPrevPageSibling = bar
              ? Array.from(bar.querySelectorAll('a, button, span, li')).some(
                  (sib) => sib !== el && (sib.textContent || '').trim() === prevStr
                )
              : false;
            const inNamedPagination = Boolean(
              el.closest('[class*="pagination" i], [data-component*="Pagination" i], nav, ul')
            );

            if (hasPrevPageSibling || inNamedPagination) {
              el.setAttribute('data-agy-hz-next', '1');
              el.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'center' });
              const href = (el as HTMLAnchorElement).href || '';
              return { marked: true, href };
            }
          }

          // Priority 2: Explicit "Next" / chevron button or "Show More Reviews" button below reviews
          for (const el of allClickables) {
            if (isExcludedArea(el) || isDisabled(el)) continue;
            const aria = (el.getAttribute('aria-label') || '').trim();
            const rel = (el.getAttribute('rel') || '').trim();
            const cls = typeof el.className === 'string' ? el.className : '';
            const txt = (el.textContent || '').replace(/\s+/g, ' ').trim();

            if (
              /next/i.test(aria) ||
              rel.toLowerCase() === 'next' ||
              /\bpagination[-_]*link[-_]*next\b|\bhz-pagination.*next\b/i.test(cls) ||
              /^(next|next\s*›|next\s*>|next page)$/i.test(txt) ||
              /\b(show|load|see|view)\s+(more|\d+\s+more)\s+reviews\b/i.test(txt)
            ) {
              el.setAttribute('data-agy-hz-next', '1');
              el.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'center' });
              const href = (el as HTMLAnchorElement).href || '';
              return { marked: true, href };
            }
          }

          return { marked: false, href: '' };
        }, pageNum);

        if (!paginationAction.marked) {
          break;
        }

        const nextBtnHandle = await page.$('[data-agy-hz-next="1"]');
        if (nextBtnHandle) {
          await nextBtnHandle.click({ delay: 40 }).catch(async () => {
            await page.evaluate(() => {
              (document.querySelector('[data-agy-hz-next="1"]') as HTMLElement)?.click();
            });
          });
        } else {
          break;
        }

        // Wait up to 4.2s for the review list DOM to update cleanly
        const prevFirstSig =
          Array.from(collectedMap.keys()).pop() || '';
        await page
          .waitForFunction(
            (lastSig: string) => {
              const cards = document.querySelectorAll(
                '[data-component="ReviewItem"], .hz-PendingReview, .review-item'
              );
              if (cards.length === 0) return false;
              const lastCardText = ((cards[cards.length - 1] as HTMLElement).innerText || '')
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '')
                .slice(0, 50);
              return Boolean(lastCardText && !lastSig.includes(lastCardText.slice(0, 25)));
            },
            { timeout: 4200 },
            prevFirstSig
          )
          .catch(() => {});
        await new Promise((r) => setTimeout(r, 650));

        const nextBatch = await extractCurrentPage(false);
        const added = mergeExtracted(nextBatch.reviews);

        this.logger.debug(
          `[Houzz] Page ${pageNum}: +${added} new reviews (Total collected: ${collectedMap.size}/${expectedTotal})`
        );

        if (added === 0) {
          // If click had an href that didn't trigger SPA update, try direct navigation once
          if (paginationAction.href && paginationAction.href.startsWith('http')) {
            try {
              await page.goto(paginationAction.href, {
                waitUntil: 'domcontentloaded',
                timeout: 22000,
              });
              await new Promise((r) => setTimeout(r, 1800));
              const retryBatch = await extractCurrentPage(false);
              const retryAdded = mergeExtracted(retryBatch.reviews);
              if (retryAdded > 0) {
                stagnantCount = 0;
                continue;
              }
            } catch {}
          }
          stagnantCount++;
          if (stagnantCount >= 2) break;
        } else {
          stagnantCount = 0;
        }
      }

      // Strip any image URL that repeats across >= 2 distinct reviews (guarantees 0% chance of repeated pro logo/owner-reply avatar)
      const photoFreq = new Map<string, number>();
      for (const r of collectedMap.values()) {
        for (const u of new Set(r.photoUrls || [])) {
          photoFreq.set(u, (photoFreq.get(u) || 0) + 1);
        }
      }

      let fallbackIdx = 1;
      for (const r of collectedMap.values()) {
        if (result.reviews.length >= maxReviews) break;
        const cleanAuthor =
          r.authorName === 'Verified Houzz Homeowner'
            ? `Houzz Homeowner #${fallbackIdx++}`
            : r.authorName;
        const uniqueReviewPhotos = (r.photoUrls || []).filter(
          (u) => (photoFreq.get(u) || 0) === 1
        );
        result.reviews.push({
          authorName: cleanAuthor,
          authorAvatarUrl: r.authorAvatarUrl || undefined,
          photoUrls: uniqueReviewPhotos.length > 0 ? uniqueReviewPhotos : undefined,
          rating: r.rating,
          comment: r.comment,
          reviewDate: r.reviewDate || undefined,
          isVerified: true,
          platform: 'HOUZZ',
          sourceUrl: targetUrl,
        });
      }

      if (result.totalReviews < result.reviews.length) {
        result.totalReviews = result.reviews.length;
      }
      if (result.rating === 0 && result.reviews.length > 0) {
        const sum = result.reviews.reduce((acc, cur) => acc + cur.rating, 0);
        result.rating = Math.round((sum / result.reviews.length) * 10) / 10;
      }

      result.success =
        result.rating > 0 || result.totalReviews > 0 || result.reviews.length > 0;
      if (result.success) {
        this.logger.log(
          `✅ [Houzz] Completed deep scrape: ${result.reviews.length} reviews collected (Rating: ${result.rating}, Total: ${result.totalReviews})`
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

      const cleanQuery = queryOrSlug
        .replace(/^https?:\/\/(www\.)?houzz\.com\/(professionals\/|pro\/)?/i, '')
        .replace(/[-_~]/g, ' ');
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
        let idx = 1;
        for (const snippet of extracted.snippets) {
          const cleanSnippet = snippet.replace(/Read more$/i, '').replace(/\.{3}$/i, '').trim();
          if (cleanSnippet.length > 20) {
            result.reviews.push({
              authorName: `Houzz Reviewer #${idx++}`,
              rating: Math.round(result.rating || 5),
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
