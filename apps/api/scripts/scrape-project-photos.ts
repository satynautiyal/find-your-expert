import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { BrowserPoolUtil } from '../src/scrapers/utils/browser-pool.util';

const prisma = new PrismaClient();

const BAD_IMAGE_KEYWORDS = [
  'logo',
  'icon',
  'badge',
  'seal',
  'bbb',
  'gaf',
  'owens',
  'certainteed',
  'yelp',
  'google',
  'facebook',
  'instagram',
  'twitter',
  'linkedin',
  'youtube',
  'tiktok',
  'pinterest',
  'avatar',
  'star',
  'rating',
  'review',
  'arrow',
  'spinner',
  'loader',
  'placeholder',
  'gravatar',
  'smiley',
  'emoji',
  'flag',
  'payment',
  'visa',
  'mastercard',
  'amex',
  'discover',
  'paypal',
  'award',
  'certif',
  'accredited',
  'angies',
  'angi',
  'homeadvisor',
  'expertise',
  'houzz-pro',
  'button',
  'banner-ad',
  'menu',
  'phone',
  'email',
  'map',
  'marker',
  'pin',
  'signature',
  'coupon',
  'discount',
  'financing',
  'warranty',
  'guarantee',
  'user_',
  'default',
  'blank',
  'pixel',
  'spacer',
];

function isBadImage(url: string, alt = '', cls = ''): boolean {
  if (!url || typeof url !== 'string') return true;
  const lowerUrl = url.toLowerCase().trim();
  if (!lowerUrl.startsWith('http://') && !lowerUrl.startsWith('https://')) {
    return true;
  }
  if (
    lowerUrl.endsWith('.svg') ||
    lowerUrl.endsWith('.gif') ||
    lowerUrl.includes('.svg?') ||
    lowerUrl.includes('.gif?') ||
    lowerUrl.startsWith('data:')
  ) {
    return true;
  }
  const combined = `${lowerUrl} ${(alt || '').toLowerCase()} ${(cls || '').toLowerCase()}`;
  for (const kw of BAD_IMAGE_KEYWORDS) {
    if (combined.includes(kw)) return true;
  }
  return false;
}

/**
 * Scrape real project photos from a Houzz Professional Profile page
 */
async function scrapeHouzzProjects(
  browser: any,
  houzzUrl: string,
  businessName: string,
  logoUrl?: string | null
): Promise<Array<{ url: string; caption: string }>> {
  const page = await BrowserPoolUtil.createStealthPage(browser);
  const photos: Array<{ url: string; caption: string }> = [];

  try {
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.goto(houzzUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise((r) => setTimeout(r, 2500));

    await page.evaluate(async () => {
      for (let y = 0; y < 3500; y += 500) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 200));
      }
      window.scrollTo(0, 0);
    });
    await new Promise((r) => setTimeout(r, 1200));

    const rawImgs = await page.evaluate(() => {
      const out: Array<{ src: string; alt: string; cardTitle: string; w: number; h: number }> = [];
      const imgs = Array.from(document.querySelectorAll('img'));
      for (const img of imgs) {
        const src = img.currentSrc || img.src || img.getAttribute('data-src') || '';
        const alt = (img.alt || '').trim();
        const w = img.naturalWidth || img.width || 0;
        const h = img.naturalHeight || img.height || 0;

        let cardTitle = '';
        const card = img.closest('a, [class*="project"], [class*="Project"], li');
        if (card) {
          const titleEl = card.querySelector('h3, h4, [class*="title"], [class*="Title"], [class*="name"]');
          if (titleEl && titleEl.textContent) {
            cardTitle = titleEl.textContent.trim();
          }
        }
        out.push({ src, alt, cardTitle, w, h });
      }
      return out;
    });

    const logoHashMatch = (logoUrl || '').match(/([0-9a-f]{16})_\d+/i);
    const logoHash = logoHashMatch ? logoHashMatch[1].toLowerCase() : '';
    const byHash = new Map<string, { url: string; caption: string; area: number }>();

    for (const item of rawImgs) {
      const { src, alt, cardTitle, w, h } = item;
      if (!src || !src.includes('hzcdn.com')) continue;
      if (src.includes('user_') || src.includes('badge') || src.includes('-w240-h240-')) continue;
      if (w > 0 && h > 0 && Math.abs(w - h) <= 12 && w <= 300) continue;
      if (w < 180 || h < 120) continue;

      const hashMatch = src.match(/([0-9a-f]{16})_\d+/i);
      const hash = hashMatch ? hashMatch[1].toLowerCase() : src;
      if (logoHash && hash === logoHash) continue;

      if (alt.toLowerCase() === businessName.toLowerCase() && !cardTitle && src.includes('simgs')) {
        continue;
      }

      const caption =
        cardTitle && cardTitle.length > 2 && cardTitle.length < 80
          ? cardTitle
          : alt && alt.toLowerCase() !== businessName.toLowerCase() && alt.length > 3
          ? alt.slice(0, 100)
          : `${businessName} Custom Cabinetry Project`;

      const existing = byHash.get(hash);
      if (!existing || w * h > existing.area) {
        byHash.set(hash, { url: src, caption, area: w * h });
      }
    }

    for (const val of byHash.values()) {
      photos.push({ url: val.url, caption: val.caption });
    }
  } catch (err: any) {
    console.warn(`   ⚠️ Houzz scrape warning for ${businessName}: ${err.message}`);
  } finally {
    await page.close();
  }

  return photos;
}

/**
 * Scrape real project photos from a Contractor's Official Website (gallery/projects subpages + homepage)
 */
async function scrapeWebsiteProjects(
  browser: any,
  websiteUrl: string,
  businessName: string,
  tradeLabel: string
): Promise<Array<{ url: string; caption: string }>> {
  const page = await BrowserPoolUtil.createStealthPage(browser);
  const photos: Array<{ url: string; caption: string }> = [];
  const seenUrls = new Set<string>();

  try {
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

    const extractFromCurrentPage = async () => {
      await page.evaluate(async () => {
        for (let y = 0; y < Math.min(document.body.scrollHeight, 4000); y += 500) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 150));
        }
        window.scrollTo(0, 0);
      });
      await new Promise((r) => setTimeout(r, 800));

      return await page.evaluate(() => {
        const list: Array<{ src: string; alt: string; cls: string; w: number; h: number }> = [];
        for (const img of Array.from(document.querySelectorAll('img'))) {
          const src =
            img.currentSrc ||
            img.src ||
            img.getAttribute('data-src') ||
            img.getAttribute('data-lazy-src') ||
            '';
          const alt = (img.alt || '').trim();
          const cls = typeof img.className === 'string' ? img.className : '';
          const rect = img.getBoundingClientRect();
          const w = img.naturalWidth || rect.width || img.width || 0;
          const h = img.naturalHeight || rect.height || img.height || 0;

          const inHeaderOrFooter = Boolean(
            img.closest(
              'header, nav, footer, [class*="logo"], [id*="logo"], [class*="brand"], [class*="client"], [class*="partner"], [class*="badge"], [class*="cert"]'
            )
          );
          if (inHeaderOrFooter) continue;
          list.push({ src, alt, cls, w, h });
        }

        for (const el of Array.from(document.querySelectorAll('div, section, a, figure, li'))) {
          const style = window.getComputedStyle(el);
          const bg = style.backgroundImage || '';
          if (bg && bg.includes('url(')) {
            const m = bg.match(/url\(["']?(https?:\/\/[^"')]+)["']?\)/i);
            if (m && m[1]) {
              const rect = el.getBoundingClientRect();
              if (rect.width >= 260 && rect.height >= 180) {
                const cls = typeof (el as HTMLElement).className === 'string' ? (el as HTMLElement).className : '';
                list.push({ src: m[1], alt: '', cls, w: rect.width, h: rect.height });
              }
            }
          }
        }
        return list;
      });
    };

    await page.goto(websiteUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise((r) => setTimeout(r, 2000));

    const subpageLinks = await page.evaluate((baseUrl: string) => {
      const links: string[] = [];
      const seen = new Set<string>();
      for (const a of Array.from(document.querySelectorAll('a[href]'))) {
        const href = (a as HTMLAnchorElement).href;
        const text = (a.textContent || '').trim();
        if (!href || !href.startsWith(baseUrl.slice(0, 16))) continue;
        if (/(gallery|project|portfolio|our-work|recent-work|work|photos|roofing|services)/i.test(href + ' ' + text)) {
          if (!seen.has(href) && href !== window.location.href && !href.includes('#')) {
            seen.add(href);
            links.push(href);
          }
        }
      }
      return links.slice(0, 3);
    }, websiteUrl);

    const processCandidates = (candidates: Array<{ src: string; alt: string; cls: string; w: number; h: number }>) => {
      for (const c of candidates) {
        if (!c.src) continue;
        if (c.w < 240 || c.h < 150) continue;
        const ratio = c.w / c.h;
        if (ratio < 0.45 || ratio > 3.2) continue;
        if (Math.abs(c.w - c.h) < 10 && c.w < 260) continue;
        if (isBadImage(c.src, c.alt, c.cls)) continue;

        const cleanKey = c.src.split('?')[0].toLowerCase();
        if (seenUrls.has(cleanKey)) continue;
        seenUrls.add(cleanKey);

        const caption =
          c.alt && c.alt.length > 4 && c.alt.length < 90 && !/img|image|photo|pic|slide|banner|\d{4}/i.test(c.alt)
            ? c.alt
            : `${businessName} — ${tradeLabel} Project`;

        photos.push({ url: c.src, caption });
      }
    };

    for (const subUrl of subpageLinks) {
      if (photos.length >= 8) break;
      try {
        await page.goto(subUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await new Promise((r) => setTimeout(r, 1500));
        const subCandidates = await extractFromCurrentPage();
        processCandidates(subCandidates);
      } catch {}
    }

    if (photos.length < 6) {
      try {
        await page.goto(websiteUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await new Promise((r) => setTimeout(r, 1500));
        const homeCandidates = await extractFromCurrentPage();
        processCandidates(homeCandidates);
      } catch {}
    }
  } catch (err: any) {
    console.warn(`   ⚠️ Website scrape warning for ${businessName}: ${err.message}`);
  } finally {
    await page.close();
  }

  return photos.slice(0, 8);
}

async function main() {
  console.log('===========================================================');
  console.log('🚀 ProsVetted — Contractor Project & Portfolio Photo Scraper');
  console.log('===========================================================\n');

  await prisma.$connect();
  const browser = await BrowserPoolUtil.createBrowser();

  try {
    const providers = await prisma.providerProfile.findMany({
      include: {
        platformReviews: true,
        listings: {
          include: {
            category: true,
            photos: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    for (let i = 0; i < providers.length; i++) {
      const p = providers[i];
      const listing = p.listings[0];
      if (!listing) continue;

      const categoryName = listing.category?.name || 'Roofing';
      const houzzReview = p.platformReviews.find((r) => r.platform === 'HOUZZ');
      const houzzUrl = houzzReview?.profileUrl || (p.websiteUrl?.includes('houzz.com') ? p.websiteUrl : '');

      console.log(`🔍 [${i + 1}/${providers.length}] ${p.businessName} (${categoryName})...`);
      const scrapedPhotos: Array<{ url: string; caption: string }> = [];

      if (houzzUrl) {
        const hPhotos = await scrapeHouzzProjects(browser, houzzUrl, p.businessName, p.logoUrl);
        scrapedPhotos.push(...hPhotos);
      }

      if (scrapedPhotos.length < 6 && p.websiteUrl && !p.websiteUrl.includes('houzz.com')) {
        const wPhotos = await scrapeWebsiteProjects(browser, p.websiteUrl, p.businessName, categoryName);
        for (const wp of wPhotos) {
          if (!scrapedPhotos.some((sp) => sp.url === wp.url)) {
            scrapedPhotos.push(wp);
          }
        }
      }

      const finalPhotos = scrapedPhotos.slice(0, 8);
      if (finalPhotos.length > 0) {
        await prisma.listingPhoto.deleteMany({
          where: { listingId: listing.id },
        });

        for (let idx = 0; idx < finalPhotos.length; idx++) {
          await prisma.listingPhoto.create({
            data: {
              listingId: listing.id,
              imageUrl: finalPhotos[idx].url,
              caption: finalPhotos[idx].caption,
              category: 'PORTFOLIO',
              orderIndex: idx,
            },
          });
        }

        await prisma.providerProfile.update({
          where: { id: p.id },
          data: {
            coverImageUrl: finalPhotos[0].url,
          },
        });
      }

      console.log(`   💾 Saved ${finalPhotos.length} project photos for ${p.businessName}`);
    }
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Fatal error in scrape-project-photos:', err);
  process.exit(1);
});

