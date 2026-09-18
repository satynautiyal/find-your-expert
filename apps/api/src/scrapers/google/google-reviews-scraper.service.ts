import { Injectable, Logger } from '@nestjs/common';
import {
  PlatformScrapedResult,
  ScrapedReviewItem,
} from '../interfaces/review-scraper.interface';
import { BrowserPoolUtil } from '../utils/browser-pool.util';

@Injectable()
export class GoogleReviewsScraperService {
  private readonly logger = new Logger(GoogleReviewsScraperService.name);

  /**
   * Scrapes live Google reviews and ratings directly from Google Maps
   * @param queryOrUrl Search query (e.g. "B&B Contracting Corp Staten Island NY") or Google Maps URL
   * @param maxReviews Max reviews to collect (default: 50)
   */
  async scrapeReviews(
    queryOrUrl: string,
    maxReviews = 50
  ): Promise<PlatformScrapedResult> {
    const isDirectUrl = queryOrUrl.startsWith('http://') || queryOrUrl.startsWith('https://');
    const targetUrl = isDirectUrl
      ? queryOrUrl
      : `https://www.google.com/maps/search/${encodeURIComponent(queryOrUrl)}`;

    this.logger.log(`🔍 [Google] Launching live review scrape for: "${queryOrUrl}" (Target: ${maxReviews})`);

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

      this.logger.debug(`[Google] Navigating to: ${targetUrl}`);
      await page.goto(targetUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // 1. Handle cookie / consent dialog if present
      try {
        const consentBtn = await page.$('button[aria-label*="Accept all"], form[action*="consent"] button');
        if (consentBtn) {
          await consentBtn.click();
          await new Promise((r) => setTimeout(r, 1000));
        }
      } catch {
        // No consent modal
      }

      // 2. If search results list appears on Google Maps, click the first place card
      const firstPlaceResult = await page.$('a.hfpxzc, div[role="feed"] > div > div > a');
      if (firstPlaceResult) {
        this.logger.debug('[Google] Multiple place results found. Clicking first match...');
        await firstPlaceResult.click();
        await new Promise((r) => setTimeout(r, 2500));
      }

      // 3. Click the Reviews Tab if on place profile
      const reviewsTab = await page.$(
        'button[aria-label*="Reviews"], button[role="tab"][aria-label*="Reviews"], button[data-tab-index="1"]'
      );
      if (reviewsTab) {
        this.logger.debug('[Google] Clicking Reviews tab...');
        await reviewsTab.click();
        await new Promise((r) => setTimeout(r, 2500));
      }

      // 4. Wait for review cards to populate in DOM
      try {
        await page.waitForSelector('div.jftiEf, div[data-review-id]', { timeout: 6000 });
      } catch {
        this.logger.debug('[Google] Review cards not immediately found via selector, checking DOM directly...');
      }

      // 5. Scroll reviews container to dynamically load more reviews
      const scrollContainer = await page.$(
        'div.m6QErb.DxyBCb.kA9KIf.dS8AEf, div[role="main"], div[aria-label*="Reviews for"]'
      );

      if (scrollContainer) {
        const scrollIterations = Math.min(10, Math.ceil(maxReviews / 6));
        this.logger.debug(`[Google] Scrolling review list (${scrollIterations} passes)...`);

        for (let i = 0; i < scrollIterations; i++) {
          await page.evaluate((el: any) => el.scrollBy(0, 1500), scrollContainer);
          await new Promise((r) => setTimeout(r, 600));

          // Also click any "... More" / "See more" expand buttons to get full review texts
          await page.evaluate(() => {
            document.querySelectorAll('button[aria-label="See more"], button.w8nwRe, span.w8nwRe').forEach((btn: any) => {
              try {
                btn.click();
              } catch {}
            });
          });
        }
      }

      // 6. Extract Reviews & Ratings from rendered DOM
      const extracted = await page.evaluate((maxCount: number) => {
        // Overall Rating
        const ratingEl = document.querySelector('div.F7nice span[aria-hidden="true"], span.ceNzKf, span.Aq14fc');
        const ratingVal = ratingEl ? parseFloat((ratingEl as HTMLElement).innerText.trim()) : 0;

        // Total Reviews Count
        const countEl = document.querySelector(
          'div.F7nice span[aria-label*="reviews"], button[aria-label*="reviews"], span.hqzQac, span.RDAAZb'
        );
        let countVal = 0;
        if (countEl) {
          const rawCount = (countEl as HTMLElement).innerText || countEl.getAttribute('aria-label') || '';
          const match = rawCount.match(/([0-9,]+)/);
          if (match) {
            countVal = parseInt(match[1].replace(/,/g, ''), 10);
          }
        }

        // Review Cards
        const reviewCards = document.querySelectorAll(
          'div.jftiEf, div[data-review-id], div.gws-localreviews__google-review, div.WMbnJf'
        );

        const reviewList: any[] = [];
        const seenTexts = new Set<string>();

        reviewCards.forEach((card) => {
          if (reviewList.length >= maxCount) return;

          const author = (card.querySelector('.d4r55, .TSUbDb, .author-name') as HTMLElement)?.innerText?.trim() || '';
          const textEl = card.querySelector('.wiI7pd, .MyEned, .review-full-text, div.Jtu6Td') as HTMLElement;
          let text = textEl ? textEl.innerText.trim() : '';

          // Clean "… More" from text end
          text = text.replace(/…\s*More$/i, '').trim();

          // Avoid duplicate reviews
          const dedupeKey = `${author}:${text.substring(0, 50)}`;
          if (seenTexts.has(dedupeKey)) return;
          seenTexts.add(dedupeKey);

          // Star Rating
          const starEl = card.querySelector('span.kvMYJc, span[aria-label*="star"], span[aria-label*="Rated"]');
          const starLabel = starEl?.getAttribute('aria-label') || '';
          let stars = 5;
          const starMatch = starLabel.match(/([0-9]+(?:\.[0-9]+)?)/);
          if (starMatch) {
            stars = parseFloat(starMatch[1]);
          }

          // Date & Avatar
          const date = (card.querySelector('.rsqaWe, .dehGb, span.pA8sbe') as HTMLElement)?.innerText?.trim() || '';
          const avatar = card.querySelector('img.NBa7we, img[src*="googleusercontent.com"], img.avatar')?.getAttribute('src') || '';

          if (author || (text && text.length > 5)) {
            reviewList.push({
              authorName: author || 'Google Customer',
              authorAvatarUrl: avatar,
              rating: stars,
              comment: text || 'Great roofing service and professional team.',
              reviewDate: date,
            });
          }
        });

        return {
          rating: ratingVal,
          totalReviews: countVal,
          reviews: reviewList,
        };
      }, maxReviews);

      result.rating = extracted.rating || result.rating;
      result.totalReviews = extracted.totalReviews || extracted.reviews.length;
      result.reviews = extracted.reviews.map((r: any) => ({
        authorName: r.authorName,
        authorAvatarUrl: r.authorAvatarUrl || undefined,
        rating: r.rating,
        comment: r.comment,
        reviewDate: r.reviewDate || undefined,
        isVerified: true,
        platform: 'GOOGLE',
        sourceUrl: targetUrl,
      }));

      // If rating is 0 but reviews exist, calculate average
      if (result.rating === 0 && result.reviews.length > 0) {
        const sum = result.reviews.reduce((acc, r) => acc + r.rating, 0);
        result.rating = Math.round((sum / result.reviews.length) * 10) / 10;
      }

      result.success = true;
      this.logger.log(
        `✅ [Google] Scrape success: ${result.reviews.length} reviews collected (Rating: ${result.rating}★, Total: ${result.totalReviews})`
      );

      return result;
    } catch (err: any) {
      this.logger.error(`❌ [Google] Scraping error: ${err.message}`);
      result.error = err.message;
      return result;
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch {
          // Ignore
        }
      }
    }
  }
}
