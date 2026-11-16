import { Injectable, Logger } from '@nestjs/common';
import {
  PlatformScrapedResult,
  ScrapedReviewItem,
} from '../interfaces/review-scraper.interface';
import { BrowserPoolUtil } from '../utils/browser-pool.util';
import { ScraperHttpUtil } from '../utils/scraper-http.util';
import { SerperUtil } from '../utils/serper.util';

@Injectable()
export class GoogleReviewsScraperService {
  private readonly logger = new Logger(GoogleReviewsScraperService.name);

  /**
   * Scrapes live Google reviews, ratings, AND customer-shared review photos up to maxReviews (default 2,000):
   *   1. 100% FREE Stealth Puppeteer deep-scroll of Google Maps scrollable reviews pane
   *      (expands full review text, owner responses, AND customer-shared review images)
   *   2. Last-resort lightweight Serper fallback ONLY if Puppeteer fails completely (0 credits in normal operation)
   */
  async scrapeReviews(
    queryOrUrl: string,
    maxReviews = 2000,
    searchHint?: string
  ): Promise<PlatformScrapedResult> {
    const trimmed = (queryOrUrl || '').trim();
    const isDirectUrl = trimmed.startsWith('http://') || trimmed.startsWith('https://');
    const targetUrl = isDirectUrl
      ? trimmed
      : `https://www.google.com/maps/search/${encodeURIComponent(trimmed)}?hl=en&gl=us`;

    this.logger.log(
      `🔍 [Google] Launching free Puppeteer deep review + photo scrape for: "${trimmed}" (Max: ${maxReviews})`
    );

    const result = await this.scrapeViaPuppeteer(trimmed, targetUrl, maxReviews);

    // Use Serper ONLY when Google Maps logged-out "Limited view" restricts Puppeteer to <= 6 overview reviews
    // while more reviews exist (or when Puppeteer fails completely). When <= 5 total reviews exist, 0 Serper credits are spent!
    const hitLimitedViewCap =
      SerperUtil.hasApiKey() &&
      maxReviews > 6 &&
      result.reviews.length <= 6 &&
      (!result.success || result.totalReviews > result.reviews.length + 1 || result.totalReviews === 0);

    if (hitLimitedViewCap) {
      try {
        this.logger.log(
          `🌐 [Google] Logged-out Maps Limited View capped Puppeteer at ${result.reviews.length}/${result.totalReviews} — fetching full reviews + customer photos via Serper`
        );
        const serperDeep = await this.scrapeDeepReviewsViaSerper(
          trimmed,
          maxReviews,
          searchHint,
          result
        );
        if (
          serperDeep.success &&
          (serperDeep.reviews.length > result.reviews.length || !result.success)
        ) {
          return serperDeep;
        }
      } catch (err: any) {
        this.logger.warn(`⚠️ [Google Serper Supplement] ${err.message}`);
      }
    }

    return result;
  }

  private async scrapeViaPuppeteer(
    queryOrUrl: string,
    targetUrl: string,
    maxReviews: number
  ): Promise<PlatformScrapedResult> {
    const result: PlatformScrapedResult = {
      platform: 'GOOGLE',
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

      await page.goto(targetUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      await ScraperHttpUtil.sleep(2200);

      // 1. Handle cookie / consent dialog if present
      try {
        const consentBtn = await page.$(
          'button[aria-label*="Accept all"], form[action*="consent"] button'
        );
        if (consentBtn) {
          await consentBtn.click();
          await ScraperHttpUtil.sleep(1200);
        }
      } catch {}

      try {
        await page.waitForSelector('button[role="tab"], a.hfpxzc', { timeout: 6000 });
      } catch {}

      // 2. Whenever search results list appears, resolve the exact matching business Place URL and navigate directly
      const matchedPlaceHref = await page.evaluate((rawQuery: string) => {
        const existingRevTab = Array.from(
          document.querySelectorAll('button[role="tab"]')
        ).some((b) =>
          /reviews/i.test((b.getAttribute('aria-label') || '') + ' ' + (b.textContent || ''))
        );
        if (existingRevTab) return '';

        const anchors = Array.from(
          document.querySelectorAll('a.hfpxzc, div[role="feed"] a[href*="/maps/place/"], a[href*="/maps/place/"]')
        ) as HTMLAnchorElement[];
        if (anchors.length === 0) return '';

        const cleanedQuery = rawQuery.startsWith('http')
          ? decodeURIComponent(
              rawQuery.match(/\/maps\/(?:search|place)\/([^/@?]+)/)?.[1]?.replace(/\+/g, ' ') ||
                rawQuery
            )
          : rawQuery;

        const genericStop = new Set([
          'corp', 'inc', 'llc', 'ltd', 'co', 'company', 'contractors', 'contractor', 'the', 'and',
          'roofing', 'waterproofing', 'contracting', 'construction', 'remodeling',
          'home', 'improvements', 'interiors', 'design', 'build', 'cabinets', 'closets', 'studio',
          'new', 'york', 'city', 'ny', 'nyc', 'brooklyn', 'manhattan', 'queens', 'bronx', 'staten', 'island',
        ]);

        const rawTokens = cleanedQuery
          .split(/\s+(?:Brooklyn|Manhattan|Queens|Bronx|Staten|New York|NY)/i)[0]
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, ' ')
          .split(/\s+/)
          .filter((t) => t.length >= 2);
        const distinctive = rawTokens.filter((t) => !genericStop.has(t));
        const mustMatch = distinctive.length > 0 ? distinctive : rawTokens;

        for (const a of anchors) {
          const href = a.href || '';
          if (!href.includes('/maps/place/')) continue;
          const label = (a.getAttribute('aria-label') || a.textContent || href)
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ');
          if (mustMatch.length > 0 && mustMatch.every((tok) => label.includes(tok))) {
            return href;
          }
        }
        // Fallback: match primary brand token on first search card (e.g. "Gibraltar", "Chief Cornerstone", "Jewel")
        if (mustMatch.length > 0 && mustMatch[0].length >= 4) {
          for (const a of anchors) {
            const href = a.href || '';
            if (!href.includes('/maps/place/')) continue;
            const label = (a.getAttribute('aria-label') || a.textContent || href)
              .toLowerCase()
              .replace(/[^a-z0-9\s]/g, ' ');
            if (label.includes(mustMatch[0])) {
              return href;
            }
          }
        }
        return '';
      }, queryOrUrl);

      if (matchedPlaceHref) {
        await page.goto(matchedPlaceHref, {
          waitUntil: 'domcontentloaded',
          timeout: 25000,
        });
        await ScraperHttpUtil.sleep(2200);
        try {
          await page.waitForFunction(
            () =>
              Array.from(document.querySelectorAll('button[role="tab"]')).some((b) =>
                /reviews/i.test((b.getAttribute('aria-label') || '') + ' ' + (b.textContent || ''))
              ),
            { timeout: 6500 }
          );
        } catch {}
      }

      // Verify we are on a single Place sheet (has Tabs)
      const isSinglePlaceSheet = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('button[role="tab"]')).some((b) =>
          /reviews|overview|about/i.test(
            (b.getAttribute('aria-label') || '') + ' ' + (b.textContent || '')
          )
        );
      });
      if (!isSinglePlaceSheet) {
        return result;
      }

      const currentUrl = page.url();
      if (currentUrl.includes('/maps/place/')) {
        result.profileUrl = currentUrl;
      }

      // Extract aggregate rating, total review count, AND official contractor website URL from Overview header
      const overviewStats = await page.evaluate(() => {
        const ratingEl = document.querySelector(
          'div.F7nice span[aria-hidden="true"], span.ceNzKf, span.Aq14fc'
        );
        const ratingVal = ratingEl
          ? parseFloat(((ratingEl as HTMLElement).innerText || '').trim())
          : 0;

        let countVal = 0;
        const countCandidates = Array.from(
          document.querySelectorAll(
            'div.F7nice span[aria-label*="review" i], button[aria-label*="review" i], span.hqzQac, span.RDAAZb'
          )
        );
        for (const el of countCandidates) {
          const raw = (el as HTMLElement).innerText || el.getAttribute('aria-label') || '';
          const m = raw.match(/([0-9,]+)\s*reviews?/i) || raw.match(/\(([0-9,]+)\)/);
          if (m) {
            const parsed = parseInt(m[1].replace(/,/g, ''), 10);
            if (parsed > countVal) countVal = parsed;
          }
        }

        const webAnchor = document.querySelector(
          'a[data-item-id="authority"], a[aria-label*="Website:" i], a[data-tooltip*="website" i]'
        ) as HTMLAnchorElement | null;
        const rawWebsite = webAnchor?.href || '';

        return {
          rating: ratingVal || 0,
          totalReviews: countVal || 0,
          rawWebsite,
        };
      });

      if (overviewStats.rating > 0) result.rating = overviewStats.rating;
      if (overviewStats.totalReviews > 0) result.totalReviews = overviewStats.totalReviews;
      const cleanOfficialSite = ScraperHttpUtil.normalizeOfficialWebsiteUrl(
        overviewStats.rawWebsite
      );
      if (cleanOfficialSite) {
        result.discoveredWebsiteUrl = cleanOfficialSite;
      }

      // 3. Click the Reviews Tab using REAL CDP hardware mouse click (isTrusted=true required by Google Maps Closure UI!)
      const markedReviewsTab = await page.evaluate(() => {
        document
          .querySelectorAll('[data-agy-rev-tab]')
          .forEach((n) => n.removeAttribute('data-agy-rev-tab'));
        const tabs = Array.from(
          document.querySelectorAll('button[role="tab"]')
        ) as HTMLButtonElement[];
        const revTab = tabs.find((b) =>
          /reviews/i.test((b.getAttribute('aria-label') || '') + ' ' + (b.textContent || ''))
        );
        if (revTab) {
          revTab.setAttribute('data-agy-rev-tab', '1');
          revTab.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'center' });
          return true;
        }
        return false;
      });

      if (markedReviewsTab) {
        const revTabHandle = await page.$('button[data-agy-rev-tab="1"]');
        if (revTabHandle) {
          await revTabHandle.click({ delay: 35 });
          await ScraperHttpUtil.sleep(2200);
        }
      }

      // Verify Reviews tab actually activated; if still on Overview, click "More reviews (N)" button via real CDP click
      const isRevTabSelected = await page.evaluate(() => {
        const t = document.querySelector('button[data-agy-rev-tab="1"]');
        if (t?.getAttribute('aria-selected') === 'true') return true;
        const moreRevBtn = document.querySelector(
          'button[aria-label*="More reviews" i], button[jsaction*="pane.reviewChart.moreReviews"]'
        ) as HTMLElement | null;
        if (moreRevBtn) {
          moreRevBtn.setAttribute('data-agy-more-rev', '1');
          moreRevBtn.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'center' });
        }
        return false;
      });

      if (!isRevTabSelected) {
        const moreHandle = await page.$('button[data-agy-more-rev="1"]');
        if (moreHandle) {
          await moreHandle.click({ delay: 35 });
          await ScraperHttpUtil.sleep(2200);
        }
      }

      try {
        await page.waitForSelector('div.jftiEf, div[data-review-id]', { timeout: 5500 });
      } catch {}

      // Position mouse pointer inside the left reviews pane so real hardware wheel events scroll Google's virtualized list
      try {
        const firstCardHandle = await page.$('div.jftiEf, div[data-review-id]');
        const box = await firstCardHandle?.boundingBox();
        if (box) {
          await page.mouse.move(box.x + Math.min(120, box.width / 2), box.y + Math.min(80, box.height / 2));
        } else {
          await page.mouse.move(260, 520);
        }
      } catch {}

      // 4. Dynamically scroll the true scrollable ancestor + real mouse wheel up to maxReviews (up to 2,000)
      const targetGoal =
        result.totalReviews > 0 ? Math.min(maxReviews, result.totalReviews) : maxReviews;
      const maxScrollPasses =
        markedReviewsTab || isRevTabSelected
          ? Math.min(350, Math.ceil(targetGoal / 5) + 15)
          : 0;

      let stagnantPasses = 0;
      let prevCardCount = 0;

      for (let pass = 0; pass < maxScrollPasses; pass++) {
        try {
          await page.mouse.wheel({ deltaY: 3800 });
        } catch {}

        const scrollState = await page.evaluate(() => {
          const cards = document.querySelectorAll('div.jftiEf, div[data-review-id]');
          const count = cards.length;
          const lastCard = cards[cards.length - 1] as HTMLElement | undefined;
          if (lastCard) {
            try {
              lastCard.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'end' });
            } catch {}
          }

          let scroller: HTMLElement | null = null;
          let node = (lastCard || cards[0])?.parentElement || null;
          while (node && node !== document.body) {
            const style = window.getComputedStyle(node);
            if (
              (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
              node.scrollHeight > node.clientHeight + 10
            ) {
              scroller = node;
              break;
            }
            node = node.parentElement;
          }

          if (!scroller) {
            scroller =
              (document.querySelector('div.m6QErb.DxyBCb.kA9KIf.dS8AEf') as HTMLElement) ||
              (document.querySelector('div.m6QErb.DxyBCb') as HTMLElement);
          }

          if (scroller) {
            scroller.scrollTop = scroller.scrollHeight;
            return { count, scrolled: true };
          }
          return { count, scrolled: false };
        });

        if (scrollState.count >= targetGoal || scrollState.count >= maxReviews) {
          break;
        }

        await ScraperHttpUtil.sleep(900);

        if (scrollState.count <= prevCardCount) {
          stagnantPasses++;
          if (stagnantPasses === 3 || stagnantPasses === 6) {
            try {
              await page.mouse.wheel({ deltaY: -600 });
              await ScraperHttpUtil.sleep(200);
              await page.mouse.wheel({ deltaY: 4500 });
            } catch {}
            await ScraperHttpUtil.sleep(1000);
          }
          if (stagnantPasses >= 9) {
            break;
          }
        } else {
          stagnantPasses = 0;
          prevCardCount = scrollState.count;
        }

        if (pass % 5 === 4) {
          await page.evaluate(() => {
            document
              .querySelectorAll(
                'button[aria-label*="See more" i], button.w8nwRe, button[jsaction*="review.expandReview"]'
              )
              .forEach((btn: any) => {
                try {
                  btn.click();
                } catch {}
              });
          });
        }
      }

      // Final pass: expand "... More" text buttons ONLY (NEVER click photo buttons, which open lightbox & unmount reviews!)
      // and sweep scrollTop from top to bottom so lazy review photo thumbnails hydrate their URLs.
      await page.evaluate(async () => {
        document
          .querySelectorAll(
            'button[aria-label*="See more" i], button.w8nwRe, button[jsaction*="review.expandReview"]'
          )
          .forEach((btn: any) => {
            try {
              btn.click();
            } catch {}
          });

        const cards = document.querySelectorAll('div.jftiEf, div[data-review-id]');
        let scroller: HTMLElement | null = null;
        let node = cards[0]?.parentElement || null;
        while (node && node !== document.body) {
          const st = window.getComputedStyle(node);
          if ((st.overflowY === 'auto' || st.overflowY === 'scroll') && node.scrollHeight > node.clientHeight + 10) {
            scroller = node;
            break;
          }
          node = node.parentElement;
        }
        if (scroller) {
          const maxScroll = scroller.scrollHeight;
          for (let y = 0; y <= maxScroll; y += 850) {
            scroller.scrollTop = y;
            await new Promise((r) => setTimeout(r, 55));
          }
        }
      });
      await ScraperHttpUtil.sleep(500);

      // 5. Extract all loaded Google review cards + customer-shared review photos
      const extracted = await page.evaluate((maxCount: number) => {
        const isGoogleUserAvatar = (u: string): boolean => {
          return (
            /googleusercontent\.com\/(?:a-|a)\//i.test(u) ||
            /=s(?:24|32|36|40|44|48|56|60|64)(?:-c|-p|-mo)?($|[?&])/i.test(u) ||
            u.includes('gstatic.com') ||
            u.includes('maps/vt/')
          );
        };

        const upgradeGooglePhoto = (rawUrl: string): string => {
          if (!rawUrl) return '';
          let u = rawUrl.trim().replace(/^url\(["']?|["']?\)$/g, '');
          if (u.startsWith('//')) u = 'https:' + u;
          if (!u.startsWith('http') || isGoogleUserAvatar(u)) return '';
          if (u.includes('googleusercontent.com')) {
            if (u.includes('/p/')) {
              u = u.replace(/=w\d+-h\d+[^&"'\s)]*/i, '=w1200-h900-no');
              u = u.replace(/=s\d+[^&"'\s)]*/i, '=s1200');
            }
            // Keep signed gps-cs-s / geougc-cs URLs untouched so their cryptographic token remains 100% valid!
            return u;
          }
          return '';
        };

        const ratingEl = document.querySelector(
          'div.F7nice span[aria-hidden="true"], span.ceNzKf, span.Aq14fc'
        );
        const ratingVal = ratingEl
          ? parseFloat(((ratingEl as HTMLElement).innerText || '').trim())
          : 0;

        let countVal = 0;
        const countEls = Array.from(
          document.querySelectorAll(
            'div.F7nice span[aria-label*="review" i], button[aria-label*="review" i], div.jANrlb div.fontBodySmall'
          )
        );
        for (const el of countEls) {
          const raw = (el as HTMLElement).innerText || el.getAttribute('aria-label') || '';
          const m = raw.match(/([0-9,]+)\s*reviews?/i) || raw.match(/\(([0-9,]+)\)/);
          if (m) {
            const c = parseInt(m[1].replace(/,/g, ''), 10);
            if (c > countVal) countVal = c;
          }
        }

        const reviewCards = Array.from(
          document.querySelectorAll('div.jftiEf[data-review-id], div.jftiEf')
        );
        const reviewList: Array<{
          reviewId: string;
          authorName: string;
          authorAvatarUrl: string;
          photoUrls: string[];
          rating: number;
          comment: string;
          reviewDate: string;
        }> = [];
        const seenIds = new Set<string>();

        for (const card of reviewCards) {
          if (reviewList.length >= maxCount) break;

          const revId = card.getAttribute('data-review-id') || '';
          const author =
            ((card.querySelector('.d4r55, .TSUbDb') as HTMLElement)?.innerText || '').trim();

          // Customer's own comment (excluding owner reply container .CDe7pd)
          let customerText = '';
          const textEls = Array.from(card.querySelectorAll('.wiI7pd, .MyEned'));
          for (const tEl of textEls) {
            if (tEl.closest('.CDe7pd')) continue;
            const txt = ((tEl as HTMLElement).innerText || '').replace(/…\s*More$/i, '').trim();
            if (txt) {
              customerText = txt;
              break;
            }
          }

          const avatarEl = card.querySelector('img.NBa7we') as HTMLImageElement | null;
          const avatarUrl = avatarEl?.src || '';

          // Extract customer-shared photos attached to this review across ALL img & background-image elements in card
          const photoSet = new Set<string>();
          const candidateEls = Array.from(
            card.querySelectorAll(
              'button[data-photo-index], button.Tya61d, [style*="background-image"], img, div[role="img"], button'
            )
          );
          for (const pNode of candidateEls) {
            if (pNode === avatarEl || pNode.closest('.CDe7pd')) continue;
            if (pNode.classList.contains('NBa7we')) continue;

            if (pNode.tagName.toLowerCase() === 'img') {
              const im = pNode as HTMLImageElement;
              const w = im.naturalWidth || im.width || 0;
              const h = im.naturalHeight || im.height || 0;
              if (w > 0 && h > 0 && w <= 56 && h <= 56) continue;
              const src = im.currentSrc || im.getAttribute('src') || '';
              if (src && src !== avatarUrl) {
                const up = upgradeGooglePhoto(src);
                if (up) photoSet.add(up);
              }
            }

            const inlineStyle = pNode.getAttribute('style') || '';
            const computedBg =
              inlineStyle.includes('url(')
                ? inlineStyle
                : window.getComputedStyle(pNode).backgroundImage || '';
            if (computedBg && computedBg !== 'none' && computedBg.includes('url(')) {
              const bgMatch = computedBg.match(/url\(([^)]+)\)/i);
              if (bgMatch?.[1]) {
                const up = upgradeGooglePhoto(bgMatch[1]);
                if (up) photoSet.add(up);
              }
            }
          }

          if (!customerText || customerText.length < 4) continue;

          const ownerReplyEl = card.querySelector(
            '.CDe7pd .wiI7pd, .CDe7pd .ODSEW-ShBeI-text'
          ) as HTMLElement | null;
          const ownerReply = ownerReplyEl
            ? (ownerReplyEl.innerText || '').replace(/…\s*More$/i, '').trim()
            : '';

          const fullComment =
            ownerReply && ownerReply.length > 4
              ? `${customerText}\nComment from the Owner: ${ownerReply}`
              : customerText;

          const dedupeKey = revId || `${author}:${customerText.substring(0, 60)}`;
          if (seenIds.has(dedupeKey)) continue;
          seenIds.add(dedupeKey);

          const starEl = card.querySelector(
            'span.kvMYJc, span[aria-label*="star" i], span[aria-label*="Rated" i]'
          );
          const starLabel = starEl?.getAttribute('aria-label') || '';
          let stars = 5;
          const starMatch = starLabel.match(/([0-9]+(?:\.[0-9]+)?)/);
          if (starMatch) {
            stars = Math.min(5, Math.max(1, Math.round(parseFloat(starMatch[1]))));
          }

          const dateStr =
            ((card.querySelector('.rsqaWe, .dehysf') as HTMLElement)?.innerText || '').trim();

          reviewList.push({
            reviewId: revId,
            authorName: author,
            authorAvatarUrl: avatarUrl,
            photoUrls: Array.from(photoSet).slice(0, 8),
            rating: stars,
            comment: fullComment,
            reviewDate: dateStr,
          });
        }

        return {
          rating: ratingVal || 0,
          totalReviews: countVal || 0,
          reviews: reviewList,
        };
      }, maxReviews);

      if (extracted.rating > 0) result.rating = extracted.rating;
      if (extracted.totalReviews > result.totalReviews) {
        result.totalReviews = extracted.totalReviews;
      }

      result.reviews = extracted.reviews.map(
        (r, i): ScrapedReviewItem => ({
          authorName: r.authorName || `Google Customer #${i + 1}`,
          authorAvatarUrl: r.authorAvatarUrl || undefined,
          photoUrls: r.photoUrls && r.photoUrls.length > 0 ? r.photoUrls : undefined,
          rating: r.rating,
          comment: r.comment,
          reviewDate: r.reviewDate || undefined,
          isVerified: true,
          platform: 'GOOGLE',
          sourceUrl: result.profileUrl,
        })
      );

      if (result.totalReviews === 0 && result.reviews.length > 0) {
        result.totalReviews = result.reviews.length;
      }
      if (result.rating === 0 && result.reviews.length > 0) {
        const sum = result.reviews.reduce((acc, cur) => acc + cur.rating, 0);
        result.rating = Math.round((sum / result.reviews.length) * 10) / 10;
      }

      result.success = result.totalReviews > 0 || result.reviews.length > 0;
      const photoTotal = result.reviews.reduce((acc, r) => acc + (r.photoUrls?.length || 0), 0);
      this.logger.log(
        `✅ [Google] Extracted ${result.reviews.length} written reviews & ${photoTotal} customer photos (Rating: ${result.rating}★, Total: ${result.totalReviews})`
      );

      return result;
    } catch (err: any) {
      this.logger.warn(`⚠️ [Google Puppeteer] Scrape interrupted: ${err.message}`);
      result.error = err.message;
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
   * Paginates full Google Business reviews + customer-shared review photos (`media`) via Serper
   * strictly when Google Maps' logged-out "Limited view" restricts browser access to 5 preview cards.
   */
  private async scrapeDeepReviewsViaSerper(
    queryOrUrl: string,
    maxReviews: number,
    searchHint?: string,
    seedResult?: PlatformScrapedResult
  ): Promise<PlatformScrapedResult> {
    const result: PlatformScrapedResult = {
      platform: 'GOOGLE',
      rating: seedResult?.rating || 0,
      totalReviews: seedResult?.totalReviews || 0,
      profileUrl: seedResult?.profileUrl || 'https://www.google.com/maps',
      discoveredWebsiteUrl: seedResult?.discoveredWebsiteUrl,
      reviews: [],
      scrapedAt: new Date(),
      success: false,
    };

    const placeIdFromUrl = queryOrUrl.match(/place_id:([A-Za-z0-9_-]+)/)?.[1] || '';
    const fidFromUrl =
      (seedResult?.profileUrl || queryOrUrl).match(/(0x[0-9a-f]+:0x[0-9a-f]+)/i)?.[1] || '';

    let cid: string | undefined;
    let fid: string | undefined = fidFromUrl || undefined;
    let placeId: string | undefined = placeIdFromUrl || undefined;

    const cleanSearchText =
      searchHint ||
      (queryOrUrl.startsWith('http')
        ? decodeURIComponent(
            queryOrUrl.match(/\/maps\/(?:search|place)\/([^/@?]+)/)?.[1]?.replace(/\+/g, ' ') || ''
          )
        : queryOrUrl);

    if ((!cid && !fid && !placeId) || result.totalReviews === 0) {
      if (cleanSearchText) {
        const mapsRes = await SerperUtil.searchMaps(cleanSearchText);
        const places = mapsRes.places || [];
        if (places.length > 0) {
          // Match primary brand token if multiple places returned
          const primaryWord = cleanSearchText
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .find((w) => w.length >= 3 && !['the', 'new', 'york', 'nyc'].includes(w));
          const chosen =
            (primaryWord
              ? places.find((p) => (p.title || '').toLowerCase().includes(primaryWord))
              : undefined) || places[0];

          cid = chosen.cid || cid;
          fid = chosen.fid || fid;
          placeId = chosen.placeId || placeId;
          if (chosen.rating && chosen.rating > 0) result.rating = chosen.rating;
          if (chosen.ratingCount && chosen.ratingCount > result.totalReviews) {
            result.totalReviews = chosen.ratingCount;
          }
          if (chosen.placeId) {
            result.profileUrl = `https://www.google.com/maps/place/?q=place_id:${chosen.placeId}`;
          }
          if (!result.discoveredWebsiteUrl && chosen.website) {
            const cleanWeb = ScraperHttpUtil.normalizeOfficialWebsiteUrl(chosen.website);
            if (cleanWeb) result.discoveredWebsiteUrl = cleanWeb;
          }
        }
      }
    } else if (placeId) {
      result.profileUrl = `https://www.google.com/maps/place/?q=place_id:${placeId}`;
    }

    if (!cid && !fid && !placeId) {
      return result;
    }

    const extractMediaUrls = (item: any): string[] => {
      const urls = new Set<string>();
      const pools = [item?.media, item?.images, item?.photos];
      for (const pool of pools) {
        if (!Array.isArray(pool)) continue;
        for (const entry of pool) {
          if (!entry) continue;
          // Skip video entries if marked as video without an image URL
          if (typeof entry === 'object' && entry.type && /video/i.test(String(entry.type))) {
            continue;
          }
          const raw =
            typeof entry === 'string'
              ? entry
              : entry.imageUrl || entry.url || entry.link || entry.src || entry.thumbnail || '';
          let u = String(raw || '').trim();
          if (u.startsWith('//')) u = 'https:' + u;
          if (!u.startsWith('http')) continue;
          if (/googleusercontent\.com\/(?:a-|a)\//i.test(u)) continue; // skip user avatar
          if (u.includes('googleusercontent.com/p/')) {
            u = u.replace(/=w\d+-h\d+[^&"'\s)]*/i, '=w1200-h900-no');
            u = u.replace(/=s\d+[^&"'\s)]*/i, '=s1200');
          }
          urls.add(u);
        }
      }
      return Array.from(urls).slice(0, 8);
    };

    const targetGoal =
      result.totalReviews > 0 ? Math.min(maxReviews, result.totalReviews) : maxReviews;
    const maxPages = Math.min(250, Math.ceil(targetGoal / 8) + 3);

    const seenKeys = new Set<string>();
    let nextPageToken: string | undefined;

    for (let pageIdx = 0; pageIdx < maxPages && result.reviews.length < maxReviews; pageIdx++) {
      const pageRes = await SerperUtil.fetchReviewsPage({
        cid,
        fid,
        placeId: !cid && !fid ? placeId : undefined,
        nextPageToken,
      });

      const batch = pageRes.reviews || [];
      if (batch.length === 0) break;

      let addedOnPage = 0;
      for (const r of batch) {
        if (result.reviews.length >= maxReviews) break;
        const body = String(r.snippet || r.text || '').trim();
        if (body.length < 4) continue;

        const ownerReply = String(r.response?.snippet || r.response?.text || '').trim();
        const fullComment =
          ownerReply.length > 4 ? `${body}\nComment from the Owner: ${ownerReply}` : body;

        const authorName = String(r.user?.name || '').trim() || `Google Reviewer #${result.reviews.length + 1}`;
        const dedupeKey = r.id || `${authorName}:${body.slice(0, 60)}`;
        if (seenKeys.has(dedupeKey)) continue;
        seenKeys.add(dedupeKey);

        const avatar = String(r.user?.thumbnail || '').trim();
        const photoUrls = extractMediaUrls(r);
        const stars = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 5)));

        result.reviews.push({
          authorName,
          authorAvatarUrl: avatar.startsWith('http') ? avatar : undefined,
          photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
          rating: stars,
          comment: fullComment,
          reviewDate: r.date || r.isoDate || undefined,
          isVerified: true,
          platform: 'GOOGLE',
          sourceUrl: result.profileUrl,
        });
        addedOnPage++;
      }

      nextPageToken = pageRes.nextPageToken;
      if (!nextPageToken || addedOnPage === 0) break;
    }

    // Merge any Puppeteer preview reviews not already present
    for (const seedRev of seedResult?.reviews || []) {
      if (result.reviews.length >= maxReviews) break;
      const k = `${seedRev.authorName}:${(seedRev.comment || '').slice(0, 60)}`;
      if (!seenKeys.has(k)) {
        seenKeys.add(k);
        result.reviews.push(seedRev);
      }
    }

    if (result.totalReviews < result.reviews.length) {
      result.totalReviews = result.reviews.length;
    }
    if (result.rating === 0 && result.reviews.length > 0) {
      const sum = result.reviews.reduce((acc, cur) => acc + cur.rating, 0);
      result.rating = Math.round((sum / result.reviews.length) * 10) / 10;
    }

    result.success = result.totalReviews > 0 || result.reviews.length > 0;
    const totalPhotos = result.reviews.reduce((acc, r) => acc + (r.photoUrls?.length || 0), 0);
    this.logger.log(
      `✅ [Google Serper Deep] Collected ${result.reviews.length} written reviews & ${totalPhotos} customer photos (Rating: ${result.rating}★, Total: ${result.totalReviews})`
    );

    return result;
  }
}
