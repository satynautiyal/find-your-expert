import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { Browser } from 'puppeteer-core';
import { BrowserPoolUtil } from '../utils/browser-pool.util';
import { ScraperHttpUtil } from '../utils/scraper-http.util';
import { SerperUtil } from '../utils/serper.util';

export interface ScrapedProjectPhotoInput {
  sourceUrl: string;
  caption?: string;
  width?: number;
  height?: number;
}

export interface ScrapedProjectInput {
  title: string;
  slug: string;
  description?: string;
  location?: string;
  projectYear?: number;
  costRange?: string;
  serviceCategory?: string;
  sourceUrl?: string;
  photos: ScrapedProjectPhotoInput[];
}

export interface ScrapedTeamMemberInput {
  name: string;
  role?: string;
  credentials?: string;
  bio?: string;
  photoSourceUrl?: string;
  sourceUrl?: string;
}

export interface ScrapedBrandAndProjectsResult {
  officialWebsiteUrl: string | null;
  discoveredHouzzUrl: string | null;
  logoSourceUrl: string | null;
  logoPngBuffer: Buffer | null;
  websiteAboutDescription: string | null;
  teamMembers: ScrapedTeamMemberInput[];
  projects: ScrapedProjectInput[];
  sourceUsed: 'WEBSITE' | 'HOUZZ' | 'NONE';
  houzzChallengeBlocked?: boolean;
}

const NON_WORK_IMAGE_PATTERNS = [
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
  'license',
  'truck',
  'thm-pattern',
];

@Injectable()
export class ProjectsScraperService {
  private readonly logger = new Logger(ProjectsScraperService.name);

  public slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/['’]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120);
  }

  private isNonWorkImage(url: string, alt = '', cls = ''): boolean {
    if (!url || typeof url !== 'string') return true;
    const lowerUrl = url.toLowerCase().trim();
    if (!lowerUrl.startsWith('http://') && !lowerUrl.startsWith('https://') && !lowerUrl.startsWith('//')) {
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
    // Reject blurred Houzz hero banner crops (-w794-h336-b2-)
    if (lowerUrl.includes('-w794-h336-b2-')) {
      return true;
    }

    const combined = `${lowerUrl} ${(alt || '').toLowerCase()} ${(cls || '').toLowerCase()}`;
    for (const pat of NON_WORK_IMAGE_PATTERNS) {
      if (combined.includes(pat)) return true;
    }
    return false;
  }

  /**
   * Upgrade Houzz CDN photo URLs (simgs / fimgs) to crisp high-resolution variants.
   */
  public upgradeHouzzPhotoUrl(rawUrl: string): string {
    let url = rawUrl.trim();
    if (url.startsWith('//')) url = `https:${url}`;

    // Upgrade simgs/<16hex>_<size>-<4digits>/... to _9- (large crisp photo)
    if (url.includes('st.hzcdn.com/simgs/')) {
      url = url.replace(/\/simgs\/([0-9a-f]{16})_(?:0|1|2|3|4|8|10|16)-(\d+)/i, '/simgs/$1_9-$2');
    }

    // Upgrade fimgs/<16hex>_<4digits>-w...-h...-b0-p0... to -w990-h660-b0-p0---.jpg
    if (url.includes('st.hzcdn.com/fimgs/')) {
      url = url.replace(
        /-w\d+-h\d+-b\d+-p\d+--?-?\.jpg/i,
        '-w990-h660-b0-p0---.jpg'
      );
    }

    return url;
  }

  /**
   * Extract unique 16-hex Houzz image hash so different size variants of the same photo deduplicate cleanly.
   */
  private extractHouzzImageHash(url: string): string {
    const m = url.match(/([0-9a-f]{16})[_-]/i);
    return m ? m[1].toLowerCase() : url.split('?')[0].toLowerCase();
  }

  /**
   * Website + Houzz Complete Portfolio Orchestrator:
   *   1. Discovers & validates the contractor's official website URL (never storing directory/Houzz links as websiteUrl).
   *   2. Scrapes the contractor's official brand logo directly from their website (raster URL + retina 2x PNG buffer).
   *   3. Scrapes ALL structured project/portfolio albums from the contractor's Official Website FIRST.
   *   4. Also scrapes ALL structured Houzz Project Albums (clicking "Load Next 6 Projects" until 100% are loaded) and merges them cleanly.
   */
  async scrapeProviderBrandAndProjects(options: {
    businessName: string;
    boroughOrCity?: string | null;
    houzzUrl?: string | null;
    websiteUrl?: string | null;
    maxProjects?: number;
    maxPhotosPerProject?: number;
    skipProjects?: boolean;
    projectsOnly?: boolean;
    skipHouzz?: boolean;
  }): Promise<ScrapedBrandAndProjectsResult> {
    const maxProjects = options.maxProjects ?? 300;
    const maxPhotosPerProject = options.maxPhotosPerProject ?? 100;
    const skipProjects = options.skipProjects ?? false;
    const projectsOnly = options.projectsOnly ?? false;
    const skipHouzz = options.skipHouzz ?? false;
    let houzzUrl = (options.houzzUrl || '').trim();
    const rawWebsite = (options.websiteUrl || '').trim();

    if (!houzzUrl && rawWebsite.includes('houzz.com/')) {
      houzzUrl = rawWebsite.split('?')[0];
    }

    let officialWebsiteUrl = ScraperHttpUtil.normalizeOfficialWebsiteUrl(rawWebsite);
    let discoveredHouzzUrl: string | null = houzzUrl || null;
    let logoSourceUrl: string | null = null;
    let logoPngBuffer: Buffer | null = null;
    let websiteAboutDescription: string | null = null;
    let teamMembers: ScrapedTeamMemberInput[] = [];
    let sourceUsed: 'WEBSITE' | 'HOUZZ' | 'NONE' = 'NONE';
    let houzzChallengeBlocked = false;
    const projects: ScrapedProjectInput[] = [];

    let browser: Browser | null = null;

    try {
      browser = await BrowserPoolUtil.createBrowser();

      // 1. If officialWebsiteUrl is missing, try discovering it FREE from their Houzz profile page first
      if (!officialWebsiteUrl && !skipHouzz && houzzUrl && houzzUrl.includes('houzz.com')) {
        const fromHouzz = await this.discoverWebsiteFromHouzzProfile(browser, houzzUrl);
        if (fromHouzz) {
          this.logger.log(
            `🌐 Discovered official website for "${options.businessName}" via Houzz: ${fromHouzz}`
          );
          officialWebsiteUrl = fromHouzz;
        }
      }

      // 1b. Last-resort 1-query Serper lookup ONLY if contractor STILL has no official website
      if (!officialWebsiteUrl && SerperUtil.hasApiKey()) {
        const fromSerper = await this.discoverOfficialWebsiteViaSerper(
          options.businessName,
          options.boroughOrCity || 'New York'
        );
        if (fromSerper) {
          this.logger.log(
            `🌐 Discovered official website for "${options.businessName}" via search: ${fromSerper}`
          );
          officialWebsiteUrl = fromSerper;
        }
      }

      // 2. If we have an official website: extract official brand logo + About copy + Team members + Website Projects FIRST!
      if (officialWebsiteUrl) {
        if (!houzzUrl) {
          const foundHz = await this.discoverHouzzLinkFromWebsite(officialWebsiteUrl);
          if (foundHz) {
            houzzUrl = foundHz;
            discoveredHouzzUrl = foundHz;
          }
        }

        if (!projectsOnly) {
          const brandLogo = await this.scrapeWebsiteBrandLogo(
            browser,
            officialWebsiteUrl,
            options.businessName
          );
          logoSourceUrl = brandLogo.logoSourceUrl;
          logoPngBuffer = brandLogo.logoPngBuffer;

          const aboutAndTeam = await this.scrapeWebsiteAboutAndTeam(
            browser,
            officialWebsiteUrl,
            options.businessName,
            logoSourceUrl
          );
          websiteAboutDescription = aboutAndTeam.websiteAboutDescription;
          teamMembers = aboutAndTeam.teamMembers;
        }

        if (!skipProjects) {
          const siteProjects = await this.scrapeWebsiteProjectAlbums(
            browser,
            officialWebsiteUrl,
            options.businessName,
            maxProjects,
            maxPhotosPerProject
          );
          if (siteProjects.length > 0) {
            projects.push(...siteProjects);
            sourceUsed = 'WEBSITE';
          }
        }
      }

      // 3. Complete Portfolio Enrichment:
      //    Keep Official Website albums FIRST (#1..), AND also scrape ALL structured Houzz Project Albums
      //    whenever a Houzz profile exists (deduplicating any matching normalized titles) so 0 projects are missed!
      if (!skipProjects && !skipHouzz && houzzUrl && houzzUrl.includes('houzz.com')) {
        const remainingSlots = maxProjects - projects.length;
        if (remainingSlots > 0) {
          this.logger.log(
            `🏛️ [${
              projects.length === 0 ? 'Houzz Full Portfolio' : 'Website-First + Full Houzz Portfolio'
            }] Website yielded ${
              projects.length
            } album(s) for "${options.businessName}" — fetching all structured project albums from Houzz (up to ${remainingSlots})`
          );
          const houzzOut = await this.scrapeHouzzProjectAlbums(
            browser,
            houzzUrl,
            options.businessName,
            remainingSlots,
            maxPhotosPerProject
          );
          if (houzzOut.challengeBlocked) {
            houzzChallengeBlocked = true;
          }
          const houzzProjects = houzzOut.projects;
          if (houzzProjects.length > 0) {
            if (sourceUsed === 'NONE') {
              sourceUsed = 'HOUZZ';
            }
            const websiteTitleKeys = new Set(
              projects.map((p) => p.title.toLowerCase().replace(/[^a-z0-9]/g, ''))
            );
            for (const hp of houzzProjects) {
              const tKey = hp.title.toLowerCase().replace(/[^a-z0-9]/g, '');
              if (tKey && websiteTitleKeys.has(tKey)) continue;
              projects.push(hp);
              if (projects.length >= maxProjects) break;
            }
          }
        }
      }
    } catch (err: any) {
      this.logger.error(
        `Failed scraping brand & projects for ${options.businessName}: ${err.message}`
      );
    } finally {
      await BrowserPoolUtil.closeBrowser(browser);
    }

    // Deduplicate slugs within provider
    const usedSlugs = new Set<string>();
    const dedupedProjects = projects
      .filter((p) => p.title && p.photos.length > 0)
      .map((p, i) => {
        const baseSlug = this.slugify(p.slug || p.title) || `project-${i + 1}`;
        let finalSlug = baseSlug;
        let suffix = 2;
        while (usedSlugs.has(finalSlug)) {
          finalSlug = `${baseSlug}-${suffix++}`;
        }
        usedSlugs.add(finalSlug);
        return {
          ...p,
          slug: finalSlug,
        };
      });

    return {
      officialWebsiteUrl,
      discoveredHouzzUrl,
      logoSourceUrl,
      logoPngBuffer,
      websiteAboutDescription,
      teamMembers,
      projects: dedupedProjects,
      sourceUsed,
      houzzChallengeBlocked,
    };
  }

  /**
   * Backwards-compatible wrapper returning project albums array (Website FIRST -> Houzz fallback).
   */
  async scrapeProviderProjects(options: {
    businessName: string;
    houzzUrl?: string | null;
    websiteUrl?: string | null;
    maxProjects?: number;
    maxPhotosPerProject?: number;
  }): Promise<ScrapedProjectInput[]> {
    const res = await this.scrapeProviderBrandAndProjects(options);
    return res.projects;
  }

  private async discoverWebsiteFromHouzzProfile(
    browser: Browser,
    houzzUrl: string
  ): Promise<string | null> {
    const page = await BrowserPoolUtil.createStealthPage(browser);
    try {
      await page.goto(houzzUrl.split('?')[0], {
        waitUntil: 'domcontentloaded',
        timeout: 22000,
      });
      await ScraperHttpUtil.sleep(1600);
      const rawUrl = await page.evaluate(() => {
        const anchors = Array.from(
          document.querySelectorAll(
            'a[data-compid*="Website" i], a[aria-label*="Website" i], a[class*="Website" i], a[rel*="noopener"][target="_blank"]'
          )
        ) as HTMLAnchorElement[];
        for (const a of anchors) {
          const txt = ((a.textContent || '') + ' ' + (a.getAttribute('aria-label') || '')).trim();
          const href = a.href || '';
          if (href && /^https?:\/\//i.test(href) && !href.includes('houzz.com') && /website|visit/i.test(txt)) {
            return href;
          }
        }
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
        const ctxRaw = document.getElementById('hz-ctx')?.textContent || '';
        const m = ctxRaw.match(/"(?:website|proWebsite|websiteUrl)"\s*:\s*"(https?:\\?\/\\?\/[^"]+)"/i);
        return m?.[1] ? m[1].replace(/\\\//g, '/') : '';
      });
      return ScraperHttpUtil.normalizeOfficialWebsiteUrl(rawUrl);
    } catch {
      return null;
    } finally {
      await page.close();
    }
  }

  private async discoverOfficialWebsiteViaSerper(
    businessName: string,
    boroughOrCity: string
  ): Promise<string | null> {
    try {
      const genericStop = new Set([
        'corp', 'inc', 'llc', 'ltd', 'co', 'company', 'the', 'and',
        'roofing', 'waterproofing', 'contracting', 'construction', 'remodeling',
        'home', 'improvements', 'interiors', 'design', 'build', 'cabinets', 'closets', 'studio',
      ]);
      const rawTokens = businessName
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((t) => t.length >= 2);
      const brandTokens = rawTokens.filter((t) => !genericStop.has(t));
      const checkTokens = brandTokens.length > 0 ? brandTokens : rawTokens;

      const res = await SerperUtil.searchGoogle(`${businessName} ${boroughOrCity} NY`, { num: 6 });
      if (res.knowledgeGraph?.website) {
        const kgUrl = ScraperHttpUtil.normalizeOfficialWebsiteUrl(res.knowledgeGraph.website);
        if (kgUrl) return kgUrl;
      }

      for (const item of res.organic || []) {
        const cleaned = ScraperHttpUtil.normalizeOfficialWebsiteUrl(item.link);
        if (!cleaned) continue;
        try {
          const parsed = new URL(cleaned);
          const hostAndTitle = `${parsed.hostname} ${item.title || ''}`.toLowerCase();
          if (checkTokens.length > 0 && checkTokens.some((t) => t.length >= 3 && hostAndTitle.includes(t))) {
            return `${parsed.protocol}//${parsed.host}/`;
          }
        } catch {}
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Extract the contractor's official brand logo from their own website homepage.
   * Captures both the direct raster URL (when light-background raster) AND a crisp 2x retina PNG screenshot
   * of the rendered header logo element (so SVG logos & white-on-dark navbar logos always render cleanly!).
   */
  private async scrapeWebsiteBrandLogo(
    browser: Browser,
    websiteUrl: string,
    businessName: string
  ): Promise<{ logoSourceUrl: string | null; logoPngBuffer: Buffer | null }> {
    const page = await BrowserPoolUtil.createStealthPage(browser);
    try {
      await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
      await page.goto(websiteUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await ScraperHttpUtil.sleep(1600);

      const meta = await page.evaluate(() => {
        const getEffectiveBgLuminance = (el: Element | null): number => {
          let cur: Element | null = el;
          while (cur && cur !== document.documentElement) {
            const bg = window.getComputedStyle(cur).backgroundColor || '';
            const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/i);
            if (m) {
              const alpha = m[4] !== undefined ? parseFloat(m[4]) : 1;
              if (alpha > 0.15) {
                const r = parseInt(m[1], 10);
                const g = parseInt(m[2], 10);
                const b = parseInt(m[3], 10);
                return 0.299 * r + 0.587 * g + 0.114 * b;
              }
            }
            cur = cur.parentElement;
          }
          return 255; // default white
        };

        // 1. Look for visible logo element in header / nav / top brand link
        const selectors = [
          'header [class*="logo" i] img',
          'nav [class*="logo" i] img',
          '[class*="site-logo" i] img',
          '[class*="navbar-brand" i] img',
          'a[class*="logo" i] img',
          'header a[href="/"] img',
          'img[class*="logo" i]',
          'img[id*="logo" i]',
          'img[alt*="logo" i]',
          'img[src*="logo" i]',
          'header img',
          'header [class*="logo" i] svg',
          'nav [class*="logo" i] svg',
          'header a[href="/"] svg',
          '[class*="logo" i] svg',
        ];

        for (const sel of selectors) {
          const nodes = Array.from(document.querySelectorAll(sel));
          for (const node of nodes) {
            if (node.closest('footer')) continue;
            const rect = node.getBoundingClientRect();
            if (rect.top > 280 || rect.width < 30 || rect.height < 16) continue;
            if (rect.width > 520 || rect.height > 260) continue;

            node.setAttribute('data-agy-brand-logo', 'true');
            const isSvg = node.tagName.toLowerCase() === 'svg';
            const rawSrc = !isSvg
              ? (node as HTMLImageElement).currentSrc ||
                (node as HTMLImageElement).src ||
                node.getAttribute('src') ||
                ''
              : '';
            const filterCss = window.getComputedStyle(node).filter || '';
            const lum = getEffectiveBgLuminance(node);
            const preferScreenshot =
              isSvg ||
              /\.svg(\?|$)/i.test(rawSrc) ||
              rawSrc.startsWith('data:') ||
              lum < 135 ||
              /invert|brightness\(0/i.test(filterCss);

            // If dark navbar background, temporarily ensure logo's immediate wrapper paints that dark bg cleanly for screenshot
            if (preferScreenshot && lum < 135 && node.parentElement) {
              node.parentElement.setAttribute('data-agy-brand-logo-wrap', 'true');
            }

            return {
              foundDomLogo: true,
              rawSrc: rawSrc.startsWith('http') ? rawSrc : '',
              preferScreenshot,
              useWrap: preferScreenshot && lum < 135 && Boolean(node.parentElement),
            };
          }
        }

        // 2. Check JSON-LD Organization / LocalBusiness logo or apple-touch-icon
        for (const s of Array.from(document.querySelectorAll('script[type="application/ld+json"]'))) {
          try {
            const p = JSON.parse(s.textContent || '');
            const items = Array.isArray(p) ? p : p?.['@graph'] || [p];
            for (const it of items) {
              const lg = typeof it?.logo === 'string' ? it.logo : it?.logo?.url || '';
              if (lg && typeof lg === 'string' && lg.startsWith('http')) {
                return { foundDomLogo: false, rawSrc: lg, preferScreenshot: false, useWrap: false };
              }
            }
          } catch {}
        }

        const touchIcon = (
          document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement | null
        )?.href;
        if (touchIcon && touchIcon.startsWith('http')) {
          return { foundDomLogo: false, rawSrc: touchIcon, preferScreenshot: false, useWrap: false };
        }

        return { foundDomLogo: false, rawSrc: '', preferScreenshot: false, useWrap: false };
      });

      let logoPngBuffer: Buffer | null = null;
      if (meta.foundDomLogo) {
        try {
          const targetSel = meta.useWrap
            ? '[data-agy-brand-logo-wrap="true"]'
            : '[data-agy-brand-logo="true"]';
          const handle = await page.$(targetSel);
          if (handle) {
            const shot = await handle.screenshot({ type: 'png' });
            const buf = Buffer.from(shot);
            if (buf.length >= 400) {
              logoPngBuffer = buf;
            }
          }
        } catch {}
      }

      if (!meta.preferScreenshot && meta.rawSrc) {
        try {
          const resp = await fetch(meta.rawSrc, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            },
          });
          if (resp.ok) {
            const rawMime = (resp.headers.get('content-type') || 'image/png').split(';')[0].trim();
            const rawBytes = Buffer.from(await resp.arrayBuffer());
            if (rawBytes.length >= 250 && !rawMime.includes('svg')) {
              const normalized = await this.normalizeLogoBufferWithPage(page, rawBytes, rawMime);
              if (normalized) {
                return { logoSourceUrl: null, logoPngBuffer: normalized };
              }
            }
          }
        } catch {}
      }

      if (logoPngBuffer) {
        const normalizedShot = await this.normalizeLogoBufferWithPage(
          page,
          logoPngBuffer,
          'image/png'
        );
        if (normalizedShot) {
          logoPngBuffer = normalizedShot;
        }
      }

      if (meta.preferScreenshot && logoPngBuffer) {
        this.logger.log(
          `🎨 [Website Logo] Captured crisp 2x rendered brand logo from ${websiteUrl} for "${businessName}"`
        );
        return { logoSourceUrl: null, logoPngBuffer };
      }

      return {
        logoSourceUrl: meta.rawSrc || null,
        logoPngBuffer,
      };
    } catch (err: any) {
      this.logger.debug(`[Website Logo] Could not extract logo from ${websiteUrl}: ${err.message}`);
      return { logoSourceUrl: null, logoPngBuffer: null };
    } finally {
      await page.close();
    }
  }

  /**
   * Auto-trims empty transparent/white margins around a brand logo AND converts
   * white-on-transparent navbar logos into crisp high-contrast dark charcoal (#111827)
   * while preserving 100% smooth alpha anti-aliasing.
   */
  public async normalizeLogoBufferWithPage(
    page: any,
    inputBuffer: Buffer,
    mimeType = 'image/png'
  ): Promise<Buffer | null> {
    if (!inputBuffer || inputBuffer.length < 150) return null;
    try {
      const dataUri = `data:${mimeType};base64,${inputBuffer.toString('base64')}`;
      const resultDataUri: string | null = await page.evaluate(async (srcUri: string) => {
        return await new Promise<string | null>((resolve) => {
          const img = new Image();
          img.onload = () => {
            try {
              const w = img.naturalWidth || img.width;
              const h = img.naturalHeight || img.height;
              if (w < 12 || h < 12 || w > 4096 || h > 4096) {
                resolve(null);
                return;
              }

              const canvas = document.createElement('canvas');
              canvas.width = w;
              canvas.height = h;
              const ctx = canvas.getContext('2d', { willReadFrequently: true });
              if (!ctx) {
                resolve(null);
                return;
              }
              ctx.drawImage(img, 0, 0);
              const imageData = ctx.getImageData(0, 0, w, h);
              const d = imageData.data;

              // 1. Inspect perimeter border pixels to detect transparent vs white vs solid-badge background
              let borderTotal = 0;
              let borderTransparent = 0;
              let borderNearWhite = 0;

              const sampleBorderPixel = (px: number, py: number) => {
                const idx = (py * w + px) * 4;
                const r = d[idx];
                const g = d[idx + 1];
                const b = d[idx + 2];
                const a = d[idx + 3];
                borderTotal++;
                if (a < 28) borderTransparent++;
                else if (a >= 200 && r >= 242 && g >= 242 && b >= 242) borderNearWhite++;
              };

              for (let x = 0; x < w; x++) {
                sampleBorderPixel(x, 0);
                if (h > 1) sampleBorderPixel(x, h - 1);
              }
              for (let y = 1; y < h - 1; y++) {
                sampleBorderPixel(0, y);
                if (w > 1) sampleBorderPixel(w - 1, y);
              }

              const transparentBorderRatio = borderTotal > 0 ? borderTransparent / borderTotal : 0;
              const whiteBorderRatio = borderTotal > 0 ? borderNearWhite / borderTotal : 0;

              // 2. Detect invisible white-on-transparent monochrome logos and convert foreground to crisp #111827
              if (transparentBorderRatio >= 0.45) {
                let opaqueCount = 0;
                let veryLightMonochromeCount = 0;
                let sumLum = 0;

                for (let i = 0; i < d.length; i += 4) {
                  const a = d[i + 3];
                  if (a < 45) continue;
                  const r = d[i];
                  const g = d[i + 1];
                  const b = d[i + 2];
                  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
                  const sat = Math.max(r, g, b) - Math.min(r, g, b);
                  opaqueCount++;
                  sumLum += lum;
                  if (lum >= 220 && sat < 32) {
                    veryLightMonochromeCount++;
                  }
                }

                const avgLum = opaqueCount > 0 ? sumLum / opaqueCount : 0;
                const lightRatio = opaqueCount > 0 ? veryLightMonochromeCount / opaqueCount : 0;

                if (opaqueCount >= 20 && avgLum >= 222 && lightRatio >= 0.82) {
                  for (let i = 0; i < d.length; i += 4) {
                    const a = d[i + 3];
                    if (a < 8) continue;
                    const r = d[i];
                    const g = d[i + 1];
                    const b = d[i + 2];
                    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
                    const sat = Math.max(r, g, b) - Math.min(r, g, b);
                    if (sat < 36 && lum > 175) {
                      d[i] = 17;
                      d[i + 1] = 24;
                      d[i + 2] = 39;
                    }
                  }
                  ctx.putImageData(imageData, 0, 0);
                }
              }

              // 3. Find tight foreground bounding box when background is transparent or pure white
              let minX = 0;
              let minY = 0;
              let maxX = w - 1;
              let maxY = h - 1;

              if (transparentBorderRatio >= 0.4 || whiteBorderRatio >= 0.65) {
                let bMinX = w;
                let bMinY = h;
                let bMaxX = -1;
                let bMaxY = -1;
                const trimMode = transparentBorderRatio >= 0.4 ? 'ALPHA' : 'WHITE';

                for (let y = 0; y < h; y++) {
                  for (let x = 0; x < w; x++) {
                    const idx = (y * w + x) * 4;
                    const r = d[idx];
                    const g = d[idx + 1];
                    const b = d[idx + 2];
                    const a = d[idx + 3];
                    const isFg =
                      trimMode === 'ALPHA'
                        ? a > 20
                        : a > 20 && !(r >= 244 && g >= 244 && b >= 244);

                    if (isFg) {
                      if (x < bMinX) bMinX = x;
                      if (x > bMaxX) bMaxX = x;
                      if (y < bMinY) bMinY = y;
                      if (y > bMaxY) bMaxY = y;
                    }
                  }
                }

                if (bMaxX > bMinX && bMaxY > bMinY && bMaxX - bMinX >= 8 && bMaxY - bMinY >= 8) {
                  minX = bMinX;
                  minY = bMinY;
                  maxX = bMaxX;
                  maxY = bMaxY;
                }
              }

              const cropW = maxX - minX + 1;
              const cropH = maxY - minY + 1;

              // Upscale tiny logos gently so text stays crisp at 2x DPI
              const scale = cropH < 96 ? Math.min(2, 112 / cropH) : 1;
              const padX = Math.max(2, Math.round(cropW * scale * 0.03));
              const padY = Math.max(2, Math.round(cropH * scale * 0.04));
              const outW = Math.round(cropW * scale) + padX * 2;
              const outH = Math.round(cropH * scale) + padY * 2;

              const outCanvas = document.createElement('canvas');
              outCanvas.width = outW;
              outCanvas.height = outH;
              const outCtx = outCanvas.getContext('2d');
              if (!outCtx) {
                resolve(null);
                return;
              }
              if (whiteBorderRatio >= 0.65 && transparentBorderRatio < 0.4) {
                outCtx.fillStyle = '#FFFFFF';
                outCtx.fillRect(0, 0, outW, outH);
              }
              outCtx.imageSmoothingEnabled = true;
              outCtx.imageSmoothingQuality = 'high';
              outCtx.drawImage(
                canvas,
                minX,
                minY,
                cropW,
                cropH,
                padX,
                padY,
                Math.round(cropW * scale),
                Math.round(cropH * scale)
              );

              resolve(outCanvas.toDataURL('image/png'));
            } catch {
              resolve(null);
            }
          };
          img.onerror = () => resolve(null);
          img.src = srcUri;
        });
      }, dataUri);

      if (!resultDataUri || !resultDataUri.startsWith('data:image/png;base64,')) {
        return null;
      }
      const b64 = resultDataUri.slice('data:image/png;base64,'.length);
      const outBuf = Buffer.from(b64, 'base64');
      return outBuf.length >= 200 ? outBuf : null;
    } catch {
      return null;
    }
  }

  /**
   * Batch-normalize existing logo buffers in 1 shared Chromium instance (for instant DB/R2 logo cleanup).
   */
  public async normalizeLogoBuffersBatch(
    items: Array<{ slug: string; buffer: Buffer; contentType: string }>
  ): Promise<Map<string, Buffer>> {
    const out = new Map<string, Buffer>();
    if (items.length === 0) return out;

    let browser: Browser | null = null;
    try {
      browser = await BrowserPoolUtil.createBrowser();
      const page = await BrowserPoolUtil.createStealthPage(browser);
      await page.goto('about:blank');

      for (const item of items) {
        const normalized = await this.normalizeLogoBufferWithPage(
          page,
          item.buffer,
          item.contentType || 'image/png'
        );
        if (normalized) {
          out.set(item.slug, normalized);
        }
      }
      await page.close();
    } catch (err: any) {
      this.logger.warn(`normalizeLogoBuffersBatch warning: ${err.message}`);
    } finally {
      await BrowserPoolUtil.closeBrowser(browser);
    }
    return out;
  }

  /**
   * Detects anti-bot CAPTCHA / challenge pages so the scraper stops immediately without retrying.
   */
  private async isAntiBotChallengePage(page: any): Promise<boolean> {
    try {
      return await page.evaluate(() => {
        const title = (document.title || '').toLowerCase();
        const href = (location.href || '').toLowerCase();
        const snippet = (document.body?.innerText || '').slice(0, 900).toLowerCase();
        return (
          title.includes('client challenge') ||
          title.includes('attention required') ||
          title.includes('just a moment') ||
          href.includes('/_fs-ch-') ||
          snippet.includes('enter the characters seen in the image') ||
          snippet.includes('download audio captcha') ||
          snippet.includes('verify you are human')
        );
      });
    } catch {
      return false;
    }
  }

  private async discoverHouzzLinkFromWebsite(websiteUrl: string): Promise<string | null> {
    try {
      const html = await ScraperHttpUtil.fetchHtml(websiteUrl, { timeoutMs: 8000 });
      const $ = cheerio.load(html);
      let found: string | null = null;
      $('a[href*="houzz.com/professionals/"], a[href*="houzz.com/pro/"]').each((_, el) => {
        const href = ($(el).attr('href') || '').trim();
        if (href && !found) {
          found = href.split('?')[0];
        }
      });
      return found;
    } catch {
      return null;
    }
  }

  /**
   * Discover ALL Houzz Project Album URLs (/hznb/projects/...) from a Houzz Professional Profile
   * (exhaustively CDP-clicking "Load Next 6 Projects" / "Load More" + checking /projects subpage)
   * and scrape each project's authentic metadata + full photo album in parallel worker tabs.
   */
  private async scrapeHouzzProjectAlbums(
    browser: Browser,
    houzzProfileUrl: string,
    businessName: string,
    maxProjects: number,
    maxPhotosPerProject: number
  ): Promise<{ projects: ScrapedProjectInput[]; challengeBlocked: boolean }> {
    const cleanProfileUrl = houzzProfileUrl.split('?')[0].replace(/\/+$/, '');
    this.logger.log(`🏗️ [Houzz Projects] Discovering ALL project albums from: ${cleanProfileUrl}`);

    const discoveredProjectMap = new Map<
      string,
      { url: string; fallbackTitle?: string; fallbackLocation?: string; fallbackPhotoCount?: number }
    >();
    let proLogoHash = '';
    let declaredTotalProjects = 0;
    let challengeBlocked = false;

    const mergeDiscovered = (
      items: Array<{ url: string; title: string; location: string; photoCount: number }>
    ): number => {
      let added = 0;
      for (const it of items) {
        if (!it.url) continue;
        const cleanUrl = it.url.split('?')[0].replace(/\/+$/, '');
        const existing = discoveredProjectMap.get(cleanUrl);
        if (!existing) added++;
        discoveredProjectMap.set(cleanUrl, {
          url: cleanUrl,
          fallbackTitle: it.title || existing?.fallbackTitle,
          fallbackLocation: it.location || existing?.fallbackLocation,
          fallbackPhotoCount: it.photoCount || existing?.fallbackPhotoCount,
        });
      }
      return added;
    };

    const page = await BrowserPoolUtil.createStealthPage(browser);
    try {
      await page.setViewport({ width: 1440, height: 900 });

      const extractFromCurrentHouzzDom = async () => {
        return await page.evaluate(() => {
          let logoHash = '';
          const avatarImg = document.querySelector(
            'img[class*="pro-avatar"], img[class*="ProAvatar"], header img[src*="simgs"]'
          ) as HTMLImageElement | null;
          if (avatarImg?.src) {
            const m = avatarImg.src.match(/([0-9a-f]{16})[_-]/i);
            if (m) logoHash = m[1].toLowerCase();
          }

          // Parse declared total project count (e.g. "62 Projects" heading)
          let declaredCount = 0;
          const headings = Array.from(
            document.querySelectorAll(
              'h1, h2, h3, h4, [id*="project" i] span, [data-component*="Project" i] span'
            )
          );
          for (const h of headings) {
            const txt = (h.textContent || '').replace(/\s+/g, ' ').trim();
            const m = txt.match(/^(\d{1,4})\s+Projects?$/i);
            if (m) {
              const n = parseInt(m[1], 10);
              if (n > declaredCount) declaredCount = n;
            }
          }

          const items: Array<{
            url: string;
            title: string;
            location: string;
            photoCount: number;
          }> = [];

          // 1. DOM links to /hznb/projects/...
          const anchors = Array.from(
            document.querySelectorAll('a[href*="/hznb/projects/"]')
          ) as HTMLAnchorElement[];

          for (const a of anchors) {
            const rawHref = a.href ? a.href.split('?')[0] : '';
            if (!rawHref || !rawHref.includes('/hznb/projects/')) continue;

            const card = a.closest('div, li, article') || a;
            const headingEl =
              a.querySelector('h3, h4, [class*="Title"], [class*="title"], [class*="Name"]') ||
              card.querySelector('h3, h4, [class*="Title"], [class*="title"]');
            const title = (headingEl?.textContent || '').trim();

            const subEl =
              a.querySelector('[class*="Location"], [class*="location"], [class*="Subtitle"], p') ||
              card.querySelector('[class*="Location"], [class*="location"]');
            const location = (subEl?.textContent || '').trim();

            const cardText = (a.textContent || card.textContent || '').trim();
            const countMatch =
              cardText.match(/(?:^|\D)(\d{1,3})\s*(?:Photos?)?$/i) ||
              cardText.match(/(\d+)\s*Photos?/i);
            const photoCount = countMatch ? parseInt(countMatch[1], 10) : 0;

            items.push({ url: rawHref, title, location, photoCount });
          }

          // 2. Also inspect <script id="hz-ctx"> JSON for any extra project URLs in Redux store
          const ctxEl = document.getElementById('hz-ctx');
          const rawCtx = ctxEl?.textContent || '';
          const regexUrls = rawCtx.match(
            /https?:\\?\/\\?\/www\.houzz\.com\\?\/hznb\\?\/projects\\?\/[a-zA-Z0-9_-]+-pj-vj~\d+/g
          );
          if (regexUrls) {
            for (const u of regexUrls) {
              items.push({
                url: u.replace(/\\\//g, '/'),
                title: '',
                location: '',
                photoCount: 0,
              });
            }
          }

          return { logoHash, declaredCount, items };
        });
      };

      const exhaustivelyClickLoadMoreProjects = async () => {
        let stagnantRounds = 0;
        for (let step = 0; step < 65; step++) {
          if (discoveredProjectMap.size >= maxProjects) break;
          if (
            declaredTotalProjects > 0 &&
            discoveredProjectMap.size >= declaredTotalProjects &&
            step >= 1
          ) {
            break;
          }

          const beforeDomAnchors = await page.evaluate(
            () => document.querySelectorAll('a[href*="/hznb/projects/"]').length
          );

          // Mark target button in DOM, then dispatch real CDP mouse click so Houzz React handlers fire reliably
          const markedLabel = await page.evaluate(() => {
            document
              .querySelectorAll('[data-agy-hz-projmore]')
              .forEach((n) => n.removeAttribute('data-agy-hz-projmore'));

            const isVisible = (el: Element) => {
              const r = el.getBoundingClientRect();
              const st = window.getComputedStyle(el);
              return r.width > 10 && r.height > 10 && st.display !== 'none' && st.visibility !== 'hidden';
            };

            const candidates = Array.from(
              document.querySelectorAll(
                'button, a[role="button"], div[role="button"], span[role="button"], a'
              )
            );

            // Priority 1: Explicit "Load Next 6 Projects" / "Load More Projects" / "Show More Projects" / "Next 6 Projects"
            let target = candidates.find((el) => {
              if (!isVisible(el)) return false;
              if ((el as HTMLButtonElement).disabled) return false;
              const txt = (
                (el.getAttribute('aria-label') || '') +
                ' ' +
                (el.textContent || '')
              )
                .replace(/\s+/g, ' ')
                .trim();
              if (txt.length > 80) return false;
              const href = (el as HTMLAnchorElement).href || '';
              if (href && href.includes('/hznb/projects/')) return false;
              return /\b(?:load|show|see|view)\s+(?:next|more|all)\s*(?:\d+\s*)?projects?\b|\bnext\s+\d+\s+projects?\b/i.test(
                txt
              );
            }) as HTMLElement | undefined;

            // Priority 2: Generic "Load More" / "Load Next 6" button positioned right below the Projects grid
            if (!target) {
              const projAnchors = Array.from(document.querySelectorAll('a[href*="/hznb/projects/"]'));
              if (projAnchors.length > 0) {
                const lastCardRect = projAnchors[projAnchors.length - 1].getBoundingClientRect();
                target = candidates.find((el) => {
                  if (!isVisible(el) || (el as HTMLButtonElement).disabled) return false;
                  const txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
                  if (!/^(?:load\s+(?:next|more).*|show\s+more|view\s+more|\+\s*\d+\s*more)$/i.test(txt)) {
                    return false;
                  }
                  if (/review|comment|photo|question/i.test(txt)) return false;
                  const r = el.getBoundingClientRect();
                  return r.top >= lastCardRect.top - 40 && r.top <= lastCardRect.bottom + 360;
                }) as HTMLElement | undefined;
              }
            }

            if (!target) return '';
            target.setAttribute('data-agy-hz-projmore', '1');
            target.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'center' });
            return (target.textContent || '').replace(/\s+/g, ' ').trim();
          });

          if (!markedLabel) {
            break;
          }

          const btnHandle = await page.$('[data-agy-hz-projmore="1"]');
          if (!btnHandle) break;
          await btnHandle.click({ delay: 35 }).catch(() => {});

          // Poll up to 4.5s for new /hznb/projects/ cards to mount into DOM
          let grew = false;
          for (let w = 0; w < 15; w++) {
            await ScraperHttpUtil.sleep(300);
            const nowAnchors = await page.evaluate(
              () => document.querySelectorAll('a[href*="/hznb/projects/"]').length
            );
            if (nowAnchors > beforeDomAnchors) {
              grew = true;
              await ScraperHttpUtil.sleep(250);
              break;
            }
          }

          if (await this.isAntiBotChallengePage(page)) {
            challengeBlocked = true;
            this.logger.warn(
              `⛔ [Houzz Blocked] Anti-bot CAPTCHA challenge encountered while paginating projects for "${businessName}" — halting Houzz scrape.`
            );
            break;
          }

          const pass = await extractFromCurrentHouzzDom();
          if (pass.declaredCount > declaredTotalProjects) {
            declaredTotalProjects = pass.declaredCount;
          }
          const newlyAdded = mergeDiscovered(pass.items);

          if (!grew && newlyAdded === 0) {
            stagnantRounds++;
            if (stagnantRounds >= 2) break;
          } else {
            stagnantRounds = 0;
          }
        }
      };

      await page.goto(cleanProfileUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await ScraperHttpUtil.sleep(2200);

      if (await this.isAntiBotChallengePage(page)) {
        this.logger.warn(
          `⛔ [Houzz Blocked] Anti-bot CAPTCHA challenge ("Client Challenge") detected at ${cleanProfileUrl} — stopping Houzz scrape without retrying.`
        );
        return { projects: [], challengeBlocked: true };
      }

      // Scroll down to trigger Houzz lazy-loaded Projects section
      await page.evaluate(async () => {
        const limitY = Math.min(document.body.scrollHeight, 5500);
        for (let y = 0; y < limitY; y += 550) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 140));
        }
      });
      await ScraperHttpUtil.sleep(900);

      const projectsSubPageUrl = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href]'));
        for (const a of links) {
          const href = (a as HTMLAnchorElement).href || '';
          const txt = (a.textContent || '').trim();
          if (
            /\/projects(\?|$|\/)/i.test(href) &&
            !href.includes('/hznb/projects/') &&
            /project|see all|view all/i.test(txt + ' ' + href)
          ) {
            return href;
          }
        }
        return '';
      });

      const firstPass = await extractFromCurrentHouzzDom();
      if (firstPass.logoHash) proLogoHash = firstPass.logoHash;
      if (firstPass.declaredCount > declaredTotalProjects) {
        declaredTotalProjects = firstPass.declaredCount;
      }
      mergeDiscovered(firstPass.items);

      // Exhaustively CDP-click "Load Next 6 Projects" on main profile page
      await exhaustivelyClickLoadMoreProjects();

      // Also check dedicated /projects subpage if declaredTotalProjects > discovered or subpage link exists
      const candidateSubUrl = projectsSubPageUrl || `${cleanProfileUrl}/projects`;
      if (
        !challengeBlocked &&
        discoveredProjectMap.size < maxProjects &&
        (Boolean(projectsSubPageUrl) ||
          (declaredTotalProjects > 0 && discoveredProjectMap.size < declaredTotalProjects))
      ) {
        try {
          await page.goto(candidateSubUrl, { waitUntil: 'domcontentloaded', timeout: 22000 });
          await ScraperHttpUtil.sleep(1800);
          if (await this.isAntiBotChallengePage(page)) {
            challengeBlocked = true;
          } else {
            await page.evaluate(async () => {
              const limitY = Math.min(document.body.scrollHeight, 5500);
              for (let y = 0; y < limitY; y += 600) {
                window.scrollTo(0, y);
                await new Promise((r) => setTimeout(r, 120));
              }
            });
            const subPass = await extractFromCurrentHouzzDom();
            if (subPass.declaredCount > declaredTotalProjects) {
              declaredTotalProjects = subPass.declaredCount;
            }
            mergeDiscovered(subPass.items);
            await exhaustivelyClickLoadMoreProjects();
          }
        } catch {}
      }
    } finally {
      await page.close();
    }

    const projectCandidates = Array.from(discoveredProjectMap.values()).slice(0, maxProjects);
    this.logger.log(
      `📂 [Houzz Projects] Discovered ${discoveredProjectMap.size}${
        declaredTotalProjects ? `/${declaredTotalProjects}` : ''
      } project albums for "${businessName}" — scraping all ${projectCandidates.length} album(s) in parallel`
    );

    if (projectCandidates.length === 0) {
      return { projects: [], challengeBlocked };
    }

    // Scrape all discovered Houzz albums using 4 persistent concurrent worker tabs (preserving exact order)
    const orderedResults: Array<ScrapedProjectInput | null> = new Array(
      projectCandidates.length
    ).fill(null);
    let cursor = 0;
    const workerCount = Math.min(
      BrowserPoolUtil.isRemoteBrowserConfigured() ? 2 : 4,
      projectCandidates.length
    );

    const workers = Array.from({ length: workerCount }, async () => {
      const workerPage = await BrowserPoolUtil.createStealthPage(browser);
      await workerPage.setViewport({ width: 1440, height: 900 });
      try {
        while (cursor < projectCandidates.length && !challengeBlocked) {
          const idx = cursor++;
          const cand = projectCandidates[idx];
          const scrapedAlbum = await this.scrapeSingleHouzzProjectAlbum(
            browser,
            cand.url,
            businessName,
            proLogoHash,
            maxPhotosPerProject,
            cand.fallbackTitle,
            cand.fallbackLocation,
            workerPage,
            () => {
              challengeBlocked = true;
            }
          );
          if (scrapedAlbum && scrapedAlbum.photos.length > 0) {
            orderedResults[idx] = scrapedAlbum;
          }
        }
      } finally {
        await workerPage.close().catch(() => {});
      }
    });

    await Promise.all(workers);

    return {
      projects: orderedResults.filter((x): x is ScrapedProjectInput => Boolean(x)),
      challengeBlocked,
    };
  }

  /**
   * Scrape a single Houzz Project Album (/hznb/projects/<slug>-pj-vj~<id>):
   * Extracts authentic title, description, location, projectYear, costRange, and ALL high-res album photos (50+ supported).
   */
  private async scrapeSingleHouzzProjectAlbum(
    browser: Browser,
    projectUrl: string,
    businessName: string,
    proLogoHash: string,
    maxPhotos: number,
    cardTitle?: string,
    cardLocation?: string,
    reusablePage?: any,
    onChallengeBlocked?: () => void
  ): Promise<ScrapedProjectInput | null> {
    const page = reusablePage || (await BrowserPoolUtil.createStealthPage(browser));
    try {
      if (!reusablePage) {
        await page.setViewport({ width: 1440, height: 900 });
      }
      await page.goto(projectUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await ScraperHttpUtil.sleep(1100);

      if (await this.isAntiBotChallengePage(page)) {
        this.logger.warn(
          `⛔ [Houzz Blocked] CAPTCHA challenge detected on album ${projectUrl} — stopping Houzz album scrape.`
        );
        onChallengeBlocked?.();
        return null;
      }

      // Scroll deeply & CDP-click any "Load More Photos" / "Load Next ... Photos" button inside 50+ photo albums
      for (let round = 0; round < 8; round++) {
        await page.evaluate(async () => {
          const maxScroll = Math.min(document.body.scrollHeight, 30000);
          for (let y = 0; y < maxScroll; y += 900) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 55));
          }
        });
        const markedPhotoMore = await page.evaluate(() => {
          document
            .querySelectorAll('[data-agy-hz-photomore]')
            .forEach((n) => n.removeAttribute('data-agy-hz-photomore'));
          const btn = Array.from(
            document.querySelectorAll('button, a[role="button"], div[role="button"]')
          ).find((b) => {
            if ((b as HTMLButtonElement).disabled) return false;
            const r = b.getBoundingClientRect();
            if (r.width < 10 || r.height < 10) return false;
            const txt = ((b.textContent || '') + ' ' + (b.getAttribute('aria-label') || ''))
              .replace(/\s+/g, ' ')
              .trim();
            return /\b(?:load|show|view|see)\s+(?:more|all|next)\s*(?:\d+\s*)?photos?\b/i.test(txt);
          }) as HTMLElement | undefined;
          if (!btn) return false;
          btn.setAttribute('data-agy-hz-photomore', '1');
          btn.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'center' });
          return true;
        });
        if (!markedPhotoMore) break;
        const phBtnHandle = await page.$('[data-agy-hz-photomore="1"]');
        if (!phBtnHandle) break;
        await phBtnHandle.click({ delay: 35 }).catch(() => {});
        await ScraperHttpUtil.sleep(850);
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      await ScraperHttpUtil.sleep(350);

      const urlProjectId = projectUrl.match(/vj~(\d+)/i)?.[1] || '';

      const data = await page.evaluate(
        (proName: string, exactProjectId: string) => {
          const normalizeBiz = (s: string) =>
            (s || '')
              .toLowerCase()
              .replace(/\b(company|co|inc|incorporated|corp|corporation|llc|ltd|limited|and)\b/g, '')
              .replace(/[^a-z0-9]/g, '');
          const normPro = normalizeBiz(proName);
          const isSameAsProName = (val: string) => {
            const n = normalizeBiz(val);
            if (!n || n === normPro) return true;
            if (
              normPro.length >= 5 &&
              (n.startsWith(normPro) || normPro.startsWith(n)) &&
              Math.abs(n.length - normPro.length) <= 4
            ) {
              return true;
            }
            return false;
          };

          let title = '';
          const ogTitle =
            document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
            document.title ||
            '';
          const cleanedOg = ogTitle
            .replace(/\s*[-|–]\s*Projects?\s*[-|–]\s*Houzz.*$/i, '')
            .replace(/\s*[-|–]\s*Houzz.*$/i, '')
            .trim();
          if (cleanedOg && !isSameAsProName(cleanedOg) && !/^projects?$/i.test(cleanedOg)) {
            title = cleanedOg;
          }

          if (!title) {
            const projectHeadingCandidates = Array.from(
              document.querySelectorAll(
                '[data-component*="Project" i] h1, [data-component*="Project" i] h2, [class*="project-title" i], [class*="ProjectTitle" i], [class*="projectHeader" i] h1, [class*="projectHeader" i] h2, main h1, h1'
              )
            );
            for (const el of projectHeadingCandidates) {
              if (
                el.closest(
                  'header, [class*="masthead" i], [class*="ProHeader" i], [class*="pro-header" i]'
                )
              ) {
                continue;
              }
              const txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
              if (txt.length >= 3 && !isSameAsProName(txt) && !/^projects?$/i.test(txt)) {
                title = txt;
                break;
              }
            }
          }

          let location = '';
          let projectYear: number | undefined;
          let costRange = '';
          let serviceCategory = '';
          let description = '';

          const isGenericHouzzMeta = (txt: string) => {
            const t = (txt || '').trim();
            if (t.length < 25) return true;
            return (
              /see more photos of this project on houzz/i.test(t) ||
              /^check out\b.*\bon houzz\.?$/i.test(t) ||
              /^browse\b.*\bphotos on houzz/i.test(t) ||
              /^houzz has millions of/i.test(t)
            );
          };

          const descEl = document.querySelector(
            '[class*="project-description" i], [class*="ProjectDescription" i], [data-component*="Description" i], [class*="ProjectInfo" i] p'
          );
          if (descEl?.textContent && !isGenericHouzzMeta(descEl.textContent)) {
            description = descEl.textContent.replace(/\s+/g, ' ').trim();
          }

          const rawPhotos: Array<{ src: string; alt: string; w: number; h: number }> = [];

          // Parse <script id="hz-ctx"> for both description AND exact project spaceIds -> imageIds (for 50+ photo albums)
          try {
            const ctxRaw = document.getElementById('hz-ctx')?.textContent || '';
            if (ctxRaw) {
              const ctx = JSON.parse(ctxRaw);
              const stores = ctx?.data?.stores?.data || {};
              const projStore =
                stores?.ProjectStore?.data ||
                stores?.ViewProjectStore?.data ||
                stores?.ProjectDetailsStore?.data ||
                null;
              if (projStore && typeof projStore === 'object') {
                const targetProj =
                  (exactProjectId && (projStore[exactProjectId] || projStore[Number(exactProjectId)])) ||
                  Object.values(projStore)[0];
                if (!description && targetProj) {
                  const cand = String(
                    targetProj?.description ||
                      targetProj?.projectDescription ||
                      targetProj?.project?.description ||
                      ''
                  ).trim();
                  if (cand && !isGenericHouzzMeta(cand)) {
                    description = cand.replace(/\s+/g, ' ').trim();
                  }
                }

                // If exactProjectId matches, extract all spaceIds -> imageIds belonging strictly to THIS project
                const exactProjObj =
                  exactProjectId &&
                  (projStore[exactProjectId] ||
                    projStore[Number(exactProjectId)] ||
                    projStore[exactProjectId]?.project);
                const spaceIds: any[] = Array.isArray(exactProjObj?.spaceIds)
                  ? exactProjObj.spaceIds
                  : Array.isArray(exactProjObj?.project?.spaceIds)
                  ? exactProjObj.project.spaceIds
                  : [];
                const spaceStore = stores?.SpaceStore?.data || stores?.ImageStore?.data || {};
                const imageStore = stores?.ImageStore?.data || {};
                for (const sid of spaceIds) {
                  const sp = spaceStore[sid] || spaceStore[String(sid)] || {};
                  const imgId =
                    sp?.imageId ||
                    sp?.imgId ||
                    imageStore[sid]?.imageId ||
                    (typeof sp?.image?.id === 'string' ? sp.image.id : '');
                  if (imgId && /^[0-9a-f]{16}$/i.test(String(imgId))) {
                    rawPhotos.push({
                      src: `https://st.hzcdn.com/simgs/${String(imgId).toLowerCase()}_9-0000/home-design.jpg`,
                      alt: String(sp?.title || sp?.description || title || '').trim(),
                      w: Number(sp?.width) || 1200,
                      h: Number(sp?.height) || 900,
                    });
                  }
                }
              }
            }
          } catch {}

          if (!description) {
            const metaDesc =
              document.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
              document.querySelector('meta[name="description"]')?.getAttribute('content') ||
              '';
            if (metaDesc && !isGenericHouzzMeta(metaDesc)) {
              description = metaDesc.replace(/\s+/g, ' ').trim();
            }
          }

          const bodyText = document.body.innerText || '';
          const yearMatch = bodyText.match(/Project\s+Year\s*[:\n]\s*(20\d{2}|19\d{2})/i);
          if (yearMatch) {
            projectYear = parseInt(yearMatch[1], 10);
          }

          const costMatch = bodyText.match(
            /Project\s+Cost\s*[:\n]\s*(\$[0-9,]+\s*(?:-\s*\$[0-9,]+|\+)?|Under\s+\$[0-9,]+|Over\s+\$[0-9,]+)/i
          );
          if (costMatch) {
            costRange = costMatch[1].trim();
          }

          const locMatch = bodyText.match(/Location\s*[:\n]\s*([A-Za-z\s.'-]+,\s*[A-Z]{2})\b/);
          if (locMatch) {
            location = locMatch[1].trim();
          }

          const h1 = document.querySelector('h1');
          if (!location && h1) {
            const headerWrap = h1.parentElement?.parentElement || h1.parentElement;
            if (headerWrap) {
              const locCandidate = headerWrap.textContent || '';
              const m = locCandidate.match(
                /\b((?:New York|Manhattan|Brooklyn|Queens|Bronx|Staten Island|Long Island|Jersey City|Hoboken|Westchester|Scarsdale|Astoria|Williamsburg|Tribeca|SoHo|Upper East Side|Upper West Side|Park Slope)(?:,\s*[A-Z]{2})?)\b/
              );
              if (m && m[1] !== title) {
                location = m[1].trim();
              }
            }
          }

          // Extract authentic project photos from main project DOM (excluding footer, other projects, pro avatar)
          const imgs = Array.from(document.querySelectorAll('img'));
          for (const img of imgs) {
            const excludedAncestor = img.closest(
              'header, footer, nav, aside, [class*="other-project" i], [class*="OtherProject" i], [class*="more-project" i], [class*="MoreProject" i], [class*="similar" i], [class*="pro-avatar" i], [class*="ProAvatar" i], [class*="ProCard" i], [class*="review" i]'
            );
            if (excludedAncestor) continue;

            const src =
              img.currentSrc ||
              img.src ||
              img.getAttribute('data-src') ||
              img.getAttribute('srcset')?.split(' ')[0] ||
              '';
            if (!src || !src.includes('hzcdn.com')) continue;

            const rect = img.getBoundingClientRect();
            const w = img.naturalWidth || Math.round(rect.width) || img.width || 0;
            const h = img.naturalHeight || Math.round(rect.height) || img.height || 0;
            const alt = (img.alt || '').trim();

            rawPhotos.push({ src, alt, w, h });
          }

          return {
            title,
            description,
            location,
            projectYear,
            costRange,
            serviceCategory,
            rawPhotos,
          };
        },
        businessName,
        urlProjectId
      );

      let resolvedTitle = (data.title || cardTitle || '').trim();
      if (
        !resolvedTitle ||
        resolvedTitle.toLowerCase().replace(/[^a-z0-9]/g, '') ===
          businessName.toLowerCase().replace(/[^a-z0-9]/g, '')
      ) {
        const firstAlt = (data.rawPhotos.find((p) => p.alt && p.alt.length >= 4)?.alt || '').trim();
        if (firstAlt) {
          resolvedTitle = firstAlt;
        }
      }
      const escapedBiz = businessName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      resolvedTitle = resolvedTitle
        .replace(new RegExp(`\\s*[|–—-]\\s*${escapedBiz}\\s*$`, 'i'), '')
        .replace(new RegExp(`\\s+by\\s+${escapedBiz}\\s*$`, 'i'), '')
        .trim();

      const finalTitle = resolvedTitle;
      if (!finalTitle || /^(meet (our|the) team|our team|staff|about us)$/i.test(finalTitle)) {
        return null;
      }

      let finalLocation = (data.location || cardLocation || '').trim();
      if (/^\d+\s*photos?$/i.test(finalLocation) || finalLocation.length > 60) {
        finalLocation = '';
      }

      const byHash = new Map<
        string,
        { sourceUrl: string; caption?: string; width?: number; height?: number; area: number }
      >();

      for (const item of data.rawPhotos) {
        if (this.isNonWorkImage(item.src, item.alt)) continue;
        if (item.src.includes('-w240-h240-') || item.src.includes('_0-') || item.src.includes('_1-')) {
          continue;
        }
        // Exclude tiny thumbnails/avatars
        if (item.w > 0 && item.h > 0) {
          if (item.w < 220 || item.h < 160) continue;
          if (Math.abs(item.w - item.h) <= 10 && item.w <= 300) continue;
        }

        const hash = this.extractHouzzImageHash(item.src);
        if (proLogoHash && hash === proLogoHash) continue;

        const upgradedUrl = this.upgradeHouzzPhotoUrl(item.src);
        const area = (item.w || 800) * (item.h || 600);
        const cleanCaption =
          item.alt &&
          item.alt.length >= 4 &&
          item.alt.toLowerCase() !== finalTitle.toLowerCase() &&
          !/photo|image/i.test(item.alt)
            ? item.alt.slice(0, 180)
            : undefined;

        const existing = byHash.get(hash);
        if (!existing || area > existing.area) {
          byHash.set(hash, {
            sourceUrl: upgradedUrl,
            caption: cleanCaption || existing?.caption,
            width: item.w || undefined,
            height: item.h || undefined,
            area,
          });
        }
      }

      const photos = Array.from(byHash.values())
        .slice(0, maxPhotos)
        .map(({ sourceUrl, caption, width, height }) => ({
          sourceUrl,
          caption,
          width,
          height,
        }));

      if (photos.length === 0) return null;

      const urlSlugMatch = projectUrl.match(/\/hznb\/projects\/([a-zA-Z0-9_-]+?)(?:-pj-vj~\d+)?$/i);
      const rawSlug = urlSlugMatch ? urlSlugMatch[1] : finalTitle;

      this.logger.log(
        `   ✓ [Houzz Album] "${finalTitle}" — ${photos.length} photos${finalLocation ? ` (${finalLocation})` : ''}`
      );

      return {
        title: finalTitle,
        slug: this.slugify(rawSlug),
        description: data.description || undefined,
        location: finalLocation || undefined,
        projectYear: data.projectYear,
        costRange: data.costRange || undefined,
        serviceCategory: data.serviceCategory || undefined,
        sourceUrl: projectUrl,
        photos,
      };
    } catch (err: any) {
      this.logger.warn(`⚠️ Could not scrape Houzz album ${projectUrl}: ${err.message}`);
      return null;
    } finally {
      if (!reusablePage) {
        await page.close().catch(() => {});
      }
    }
  }

  /**
   * Discovers structured project/portfolio subpages directly from a contractor website's XML sitemaps
   * (/sitemap.xml, /sitemap_index.xml, /wp-sitemap.xml, and child project/portfolio/page sitemaps).
   */
  private async discoverWebsiteProjectsFromSitemap(resolvedOrigin: string): Promise<string[]> {
    const discovered = new Set<string>();
    const visitedSitemaps = new Set<string>();
    const normHost = (() => {
      try {
        return new URL(resolvedOrigin).hostname.replace(/^www\./i, '').toLowerCase();
      } catch {
        return '';
      }
    })();
    if (!normHost) return [];

    const parseLocs = (xml: string): string[] => {
      const locs: string[] = [];
      const re = /<loc>\s*(?:<!\[CDATA\[)?\s*(https?:\/\/[^\s<\]]+)\s*(?:\]\]>)?\s*<\/loc>/gi;
      let m: RegExpExecArray | null;
      while ((m = re.exec(xml)) !== null) {
        if (m[1]) locs.push(m[1].trim());
      }
      return locs;
    };

    const childSitemapQueue: string[] = [];
    for (const rootCandidate of [`${resolvedOrigin}/sitemap.xml`, `${resolvedOrigin}/wp-sitemap.xml`]) {
      try {
        const xml = await ScraperHttpUtil.fetchHtml(rootCandidate, { timeoutMs: 8000 });
        if (!xml || !xml.includes('<loc>')) continue;
        visitedSitemaps.add(rootCandidate);
        const locs = parseLocs(xml);
        for (const loc of locs) {
          if (/\.xml(\?|$)/i.test(loc)) {
            if (/(project|portfolio|work|gallery|case|page|post)/i.test(loc) && !visitedSitemaps.has(loc)) {
              childSitemapQueue.push(loc);
            }
          } else {
            try {
              const u = new URL(loc);
              if (u.hostname.replace(/^www\./i, '').toLowerCase() !== normHost) continue;
              const p = u.pathname.replace(/\/+$/, '');
              if (
                /\/(projects?|portfolio|our-work|work|recent-work|case-stud(?:y|ies)|portfolio-item|project-gallery)\/[a-z0-9_-]+$/i.test(
                  p
                ) &&
                !/\/(category|tag|author|page)\//i.test(p)
              ) {
                discovered.add(loc.split('#')[0]);
              }
            } catch {}
          }
        }
        if (discovered.size > 0 || childSitemapQueue.length > 0) break;
      } catch {}
    }

    for (const childSm of childSitemapQueue.slice(0, 8)) {
      if (visitedSitemaps.has(childSm)) continue;
      visitedSitemaps.add(childSm);
      try {
        const xml = await ScraperHttpUtil.fetchHtml(childSm, { timeoutMs: 8000 });
        if (!xml || !xml.includes('<loc>')) continue;
        const isDedicatedProjectSitemap = /(project|portfolio|work)/i.test(childSm);
        for (const loc of parseLocs(xml)) {
          if (/\.xml(\?|$)/i.test(loc)) continue;
          try {
            const u = new URL(loc);
            if (u.hostname.replace(/^www\./i, '').toLowerCase() !== normHost) continue;
            const p = u.pathname.replace(/\/+$/, '');
            if (!p || p === '') continue;
            if (/\/(category|tag|author|page|blog|news|about|contact|privacy|terms|faq)\b/i.test(p)) {
              continue;
            }
            if (
              isDedicatedProjectSitemap ||
              /\/(projects?|portfolio|our-work|work|recent-work|case-stud(?:y|ies)|portfolio-item)\/[a-z0-9_-]+$/i.test(
                p
              )
            ) {
              discovered.add(loc.split('#')[0]);
            }
          } catch {}
        }
      } catch {}
    }

    return Array.from(discovered);
  }

  /**
   * Scrape authentic portfolio / project albums from a Contractor's Official Website.
   * Resolves HTTP->HTTPS / domain redirects, parses XML sitemaps, follows paginated portfolio pages,
   * and discovers dedicated project subpages or gallery sections with real DOM headings.
   */
  private async scrapeWebsiteProjectAlbums(
    browser: Browser,
    websiteUrl: string,
    businessName: string,
    maxProjects: number,
    maxPhotosPerProject: number
  ): Promise<ScrapedProjectInput[]> {
    this.logger.log(`🌐 [Website Projects] Crawling portfolio pages on: ${websiteUrl}`);
    const page = await BrowserPoolUtil.createStealthPage(browser);
    const results: ScrapedProjectInput[] = [];

    try {
      await page.setViewport({ width: 1440, height: 900 });
      await page.goto(websiteUrl, { waitUntil: 'domcontentloaded', timeout: 22000 });
      await ScraperHttpUtil.sleep(2000);

      const resolvedHomeUrl = page.url() || websiteUrl;
      let resolvedOrigin = '';
      try {
        resolvedOrigin = new URL(resolvedHomeUrl).origin;
      } catch {
        resolvedOrigin = websiteUrl;
      }

      // 0. Fast XML Sitemap scan on resolved origin to catch 100% of published project/portfolio URLs
      const sitemapProjectUrls = await this.discoverWebsiteProjectsFromSitemap(resolvedOrigin);
      if (sitemapProjectUrls.length > 0) {
        this.logger.log(
          `🗺️ [Website Sitemap] Discovered ${sitemapProjectUrls.length} project URLs from sitemap on ${resolvedOrigin}`
        );
      }

      // 1. Discover portfolio / gallery / project links on the LIVE resolved domain (handling www / https / domain redirects!)
      const navDiscovery = await page.evaluate(() => {
        const liveHost = window.location.hostname.replace(/^www\./i, '').toLowerCase();
        const isSameSite = (href: string) => {
          try {
            const u = new URL(href);
            return (
              (u.protocol === 'http:' || u.protocol === 'https:') &&
              u.hostname.replace(/^www\./i, '').toLowerCase() === liveHost
            );
          } catch {
            return false;
          }
        };

        const galleryPages: Array<{ url: string; label: string }> = [];
        const servicePages: Array<{ url: string; label: string }> = [];
        const projectSubPages: Array<{ url: string; label: string }> = [];
        const seen = new Set<string>();
        const currentClean = window.location.href.split('#')[0].replace(/\/+$/, '');

        for (const a of Array.from(document.querySelectorAll('a[href]'))) {
          const href = ((a as HTMLAnchorElement).href || '').split('#')[0].trim();
          const label = (a.textContent || '').replace(/\s+/g, ' ').trim();
          if (!href || !isSameSite(href)) continue;
          if (href.replace(/\/+$/, '') === currentClean) continue;
          if (/\.(pdf|jpg|jpeg|png|webp|zip|tel|mailto)$/i.test(href)) continue;

          let pathname = '';
          try {
            pathname = new URL(href).pathname;
          } catch {
            continue;
          }
          if (!pathname || pathname === '/') continue;

          const combinedPathLabel = `${pathname} ${label}`;
          if (
            /\b(about|about-us|contact|privacy|terms|login|cart|faq|faqs|blog|news|article|author|tag|category|testimonial|reviews?|careers?|jobs?|team|staff|financing|warranty|areas?-we-serve|service-areas?|quote|estimate|free-estimate|sitemap)\b/i.test(
              combinedPathLabel
            )
          ) {
            continue;
          }
          if (seen.has(href)) continue;

          if (
            /\/(projects?|portfolio|our-work|work|recent-work|case-stud(?:y|ies)|portfolio-item|renovations?|remodels?)\/[a-z0-9_-]+\/?$/i.test(
              pathname
            ) &&
            !/\/page\/\d+\/?$/i.test(pathname)
          ) {
            seen.add(href);
            projectSubPages.push({ url: href, label });
          } else if (
            /\b(gallery|projects?|portfolio|our-work|work|recent-work|completed-work|past-work|before-and-after|work-gallery|photo-gallery|featured-projects?|case-stud(?:y|ies)|lookbook|showroom)\b/i.test(
              combinedPathLabel
            )
          ) {
            seen.add(href);
            galleryPages.push({ url: href, label });
          } else if (
            /\b(kitchens?|bathrooms?|closets?|cabinets?|cabinetry|millwork|wardrobes?|vanit(?:y|ies)|built-ins?|interiors?|interior-design|brownstone|townhouse|penthouse|apartments?|remodeling|renovations?|roofing|roof-repair|roof-replacement|flat-roof|shingle|slate|metal-roof|waterproofing|siding|masonry|gutters|skylight|chimney|deck|exterior)\b/i.test(
              combinedPathLabel
            )
          ) {
            seen.add(href);
            servicePages.push({ url: href, label });
          }
        }

        return {
          galleryPages: galleryPages.slice(0, 30),
          servicePages: servicePages.slice(0, 25),
          projectSubPages: projectSubPages.slice(0, 250),
        };
      });

      const extractPageSectionsAndPhotos = async (targetPage: any, fallbackLabel?: string) => {
        await targetPage.evaluate(async () => {
          // Scroll + click any "Load More" gallery button on the page
          for (let r = 0; r < 4; r++) {
            const maxH = Math.min(document.body.scrollHeight, 14000);
            for (let y = 0; y < maxH; y += 650) {
              window.scrollTo(0, y);
              await new Promise((res) => setTimeout(res, 80));
            }
            const loadMoreBtn = Array.from(
              document.querySelectorAll('button, a[role="button"], .load-more, [class*="load-more" i]')
            ).find((el) => {
              const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
              const rect = el.getBoundingClientRect();
              return (
                rect.width > 10 &&
                rect.height > 10 &&
                /^(load\s+more|show\s+more|view\s+more|more\s+projects?|more\s+photos?)$/i.test(t)
              );
            }) as HTMLElement | undefined;
            if (loadMoreBtn) {
              loadMoreBtn.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'center' });
              loadMoreBtn.click();
              await new Promise((res) => setTimeout(res, 700));
            } else {
              break;
            }
          }
          window.scrollTo(0, 0);
        });
        await ScraperHttpUtil.sleep(600);

        return await targetPage.evaluate((fbLabel: string) => {
          const h1 = (document.querySelector('h1')?.textContent || '').replace(/\s+/g, ' ').trim();
          const pageTitleRaw = (document.title || '').split(/[|\-–—]/)[0].trim();
          const pageHeading = h1 || fbLabel || pageTitleRaw;

          let description = '';
          const mainParagraphs = Array.from(
            document.querySelectorAll('main p, article p, section p')
          );
          for (const p of mainParagraphs) {
            const txt = (p.textContent || '').replace(/\s+/g, ' ').trim();
            if (
              txt.length >= 60 &&
              txt.length <= 500 &&
              !/cookie|privacy|copyright|all rights reserved|call us today/i.test(txt)
            ) {
              description = txt;
              break;
            }
          }

          const items: Array<{
            src: string;
            alt: string;
            cls: string;
            sectionTitle: string;
            w: number;
            h: number;
          }> = [];

          const findNearestHeading = (el: Element): string => {
            const container = el.closest(
              'section, article, [class*="gallery" i], [class*="portfolio" i], div'
            );
            if (container) {
              const heading = container.querySelector('h2, h3');
              if (heading?.textContent) {
                const t = heading.textContent.replace(/\s+/g, ' ').trim();
                if (t.length >= 3 && t.length <= 75) return t;
              }
            }
            return '';
          };

          for (const img of Array.from(document.querySelectorAll('img'))) {
            if (
              img.closest(
                'header, nav, footer, [class*="logo" i], [id*="logo" i], [class*="brand" i], [class*="partner" i], [class*="client" i], [class*="badge" i], [class*="cert" i], [class*="review" i], [class*="testimonial" i]'
              )
            ) {
              continue;
            }

            const parentAnchor = img.closest('a[href]') as HTMLAnchorElement | null;
            const anchorHref = parentAnchor?.href || '';
            const isLightboxImageHref = /\.(jpe?g|png|webp)(\?.*)?$/i.test(anchorHref);

            const src =
              (isLightboxImageHref ? anchorHref : '') ||
              img.getAttribute('data-large_image') ||
              img.getAttribute('data-full-url') ||
              img.getAttribute('data-orig-file') ||
              img.currentSrc ||
              img.src ||
              img.getAttribute('data-src') ||
              img.getAttribute('data-lazy-src') ||
              '';
            const alt = (img.alt || parentAnchor?.title || '').replace(/\s+/g, ' ').trim();
            const cls = typeof img.className === 'string' ? img.className : '';
            const rect = img.getBoundingClientRect();
            const w = img.naturalWidth || Math.round(rect.width) || img.width || 0;
            const h = img.naturalHeight || Math.round(rect.height) || img.height || 0;
            const sectionTitle = findNearestHeading(img);

            items.push({ src, alt, cls, sectionTitle, w, h });
          }

          for (const a of Array.from(document.querySelectorAll('a[href]')) as HTMLAnchorElement[]) {
            if (a.closest('header, nav, footer')) continue;
            if (a.querySelector('img')) continue;
            const href = a.href || '';
            if (!/\.(jpe?g|png|webp)(\?.*)?$/i.test(href)) continue;
            const rect = a.getBoundingClientRect();
            if (rect.width >= 140 && rect.height >= 110) {
              items.push({
                src: href,
                alt: (a.getAttribute('title') || a.getAttribute('aria-label') || '').trim(),
                cls: typeof a.className === 'string' ? a.className : '',
                sectionTitle: findNearestHeading(a),
                w: Math.round(rect.width),
                h: Math.round(rect.height),
              });
            }
          }

          for (const el of Array.from(document.querySelectorAll('div, figure, a, li'))) {
            if (el.closest('header, nav, footer')) continue;
            const bg = window.getComputedStyle(el).backgroundImage || '';
            if (!bg.includes('url(')) continue;
            const m = bg.match(/url\(["']?(https?:\/\/[^"')]+)["']?\)/i);
            if (!m?.[1]) continue;
            const rect = el.getBoundingClientRect();
            if (rect.width >= 200 && rect.height >= 150) {
              const cls =
                typeof (el as HTMLElement).className === 'string'
                  ? (el as HTMLElement).className
                  : '';
              items.push({
                src: m[1],
                alt: (el.getAttribute('aria-label') || el.getAttribute('title') || '').trim(),
                cls,
                sectionTitle: findNearestHeading(el),
                w: Math.round(rect.width),
                h: Math.round(rect.height),
              });
            }
          }

          return { pageHeading, description, pageUrl: window.location.href, items };
        }, fallbackLabel || '');
      };

      const globalSeenImageKeys = new Set<string>();
      const isGenericNonProjectHeading = (t: string) =>
        /^(home|welcome|index|about|about us|contact|contact us|services|our services|faq|faqs|reviews|testimonials|gallery|photo gallery|portfolio|our work|projects|recent projects)$/i.test(
          (t || '').trim()
        );

      const filterValidPhotos = (
        candidates: Array<{ src: string; alt: string; cls: string; w: number; h: number }>
      ): ScrapedProjectPhotoInput[] => {
        const valid: ScrapedProjectPhotoInput[] = [];
        for (const c of candidates) {
          if (!c.src) continue;
          if (c.w > 0 && c.h > 0) {
            if (c.w < 160 || c.h < 120) continue;
            const ratio = c.w / c.h;
            if (ratio < 0.4 || ratio > 3.4) continue;
            if (Math.abs(c.w - c.h) < 8 && c.w <= 130) continue;
          }
          if (this.isNonWorkImage(c.src, c.alt, c.cls)) continue;

          const cleanSrc = c.src;
          const normKey = cleanSrc
            .split('?')[0]
            .replace(/-\d{2,4}x\d{2,4}(?=\.(?:jpe?g|png|webp)$)/i, '')
            .toLowerCase();
          if (globalSeenImageKeys.has(normKey)) continue;
          globalSeenImageKeys.add(normKey);

          const cleanCaption =
            c.alt &&
            c.alt.length >= 4 &&
            c.alt.length <= 120 &&
            !/^(img|image|photo|pic|slide|banner|dsc|pxl|whatsapp)[_\s-]?\d*/i.test(c.alt) &&
            !/\.(jpg|jpeg|png|webp)$/i.test(c.alt) &&
            c.alt.toLowerCase() !== businessName.toLowerCase()
              ? c.alt
              : undefined;

          valid.push({
            sourceUrl: cleanSrc,
            caption: cleanCaption,
            width: c.w || undefined,
            height: c.h || undefined,
          });
        }
        return valid;
      };

      const normalizeUrlKey = (u: string) => u.split('#')[0].split('?')[0].replace(/\/+$/, '').toLowerCase();
      const discoveredSubUrls = new Set<string>();
      const allProjectSubPages: Array<{ url: string; label: string }> = [];
      const pushProjectSub = (url: string, label = '') => {
        const k = normalizeUrlKey(url);
        if (!k || discoveredSubUrls.has(k)) return;
        discoveredSubUrls.add(k);
        allProjectSubPages.push({ url, label });
      };

      for (const s of navDiscovery.projectSubPages) pushProjectSub(s.url, s.label);
      for (const smUrl of sitemapProjectUrls) pushProjectSub(smUrl, '');

      // 2-Hop Discovery (+ Pagination /page/2, /page/3...): Visit gallery/portfolio index pages to discover ALL project subpages!
      const galleryQueue = [...navDiscovery.galleryPages.slice(0, 12)];
      const visitedGalleryKeys = new Set<string>();

      while (galleryQueue.length > 0 && visitedGalleryKeys.size < 25) {
        const gal = galleryQueue.shift()!;
        const galKey = normalizeUrlKey(gal.url);
        if (visitedGalleryKeys.has(galKey)) continue;
        visitedGalleryKeys.add(galKey);
        if (allProjectSubPages.length >= maxProjects + 10) break;

        try {
          await page.goto(gal.url, { waitUntil: 'domcontentloaded', timeout: 16000 });
          await ScraperHttpUtil.sleep(1100);
          await page.evaluate(async () => {
            for (let y = 0; y < Math.min(document.body.scrollHeight, 10000); y += 700) {
              window.scrollTo(0, y);
              await new Promise((r) => setTimeout(r, 70));
            }
            window.scrollTo(0, 0);
          });

          const discovery = await page.evaluate((parentUrl: string) => {
            const liveHost = window.location.hostname.replace(/^www\./i, '').toLowerCase();
            let parentPath = '';
            try {
              parentPath = new URL(parentUrl).pathname.replace(/\/+$/, '');
            } catch {}

            const childProjects: Array<{ url: string; label: string }> = [];
            const nextGalleryPages: Array<{ url: string; label: string }> = [];
            const seenLocal = new Set<string>();

            const anchors = Array.from(
              document.querySelectorAll(
                'main a[href], article a[href], section a[href], [class*="portfolio" i] a[href], [class*="project" i] a[href], [class*="gallery" i] a[href], [class*="grid" i] a[href]'
              )
            );

            for (const a of anchors) {
              if (a.closest('header, nav, footer')) continue;
              const rawHref = ((a as HTMLAnchorElement).href || '').split('#')[0].trim();
              if (!rawHref) continue;
              let u: URL;
              try {
                u = new URL(rawHref);
              } catch {
                continue;
              }
              if (u.hostname.replace(/^www\./i, '').toLowerCase() !== liveHost) continue;
              const cleanHref = `${u.origin}${u.pathname}`;
              if (/\.(pdf|jpe?g|png|webp|gif|svg|zip)$/i.test(cleanHref)) continue;
              const p = u.pathname.replace(/\/+$/, '');
              if (!p || p === '/' || p === parentPath) continue;

              // Follow portfolio pagination (/projects/page/2, ?page=2)
              if (
                (parentPath.length > 1 && new RegExp(`^${parentPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/page/\\d+$`, 'i').test(p)) ||
                /[?&](?:page|paged)=\d+/i.test(rawHref)
              ) {
                if (!seenLocal.has(rawHref)) {
                  seenLocal.add(rawHref);
                  nextGalleryPages.push({ url: rawHref, label: '' });
                }
                continue;
              }

              if (
                /\b(about|about-us|contact|contact-us|privacy|terms|login|cart|faq|faqs|blog|news|author|tag|category|testimonial|reviews?|careers?|jobs?|team|staff|press|services|our-services|financing|warranty|quote|estimate|free-estimate|book|consultation|inquiry)\b/i.test(
                  p
                )
              ) {
                continue;
              }

              const isChildOfGallery = parentPath.length > 1 && p.startsWith(`${parentPath}/`);
              const matchesProjectSlug =
                /\/(projects?|portfolio|our-work|work|recent-work|case-stud(?:y|ies)|portfolio-item|gallery|renovations?|remodels?|kitchens?|bathrooms?|closets?)\/[a-z0-9_-]+$/i.test(
                  p
                );
              // Also catch Squarespace/Wix/Webflow single-segment portfolio cards (e.g. /nomad-residence, /upper-west-side)
              // when linked inside a dedicated /portfolio or /work or /projects page and wrapping an image or portfolio card!
              const isDedicatedPortfolioIndex =
                /\/(portfolio|projects?|our-work|work|selected-work|featured-projects?)$/i.test(
                  parentPath
                );
              const hasVisualCard =
                Boolean(a.querySelector('img, picture, figure')) ||
                Boolean(a.closest('[class*="portfolio" i], [class*="project" i], [class*="gallery" i], figure'));
              const isRootSlugProjectCard =
                isDedicatedPortfolioIndex &&
                hasVisualCard &&
                /^\/[a-z0-9][a-z0-9_-]{2,80}$/i.test(p);

              if ((isChildOfGallery || matchesProjectSlug || isRootSlugProjectCard) && !seenLocal.has(cleanHref)) {
                seenLocal.add(cleanHref);
                const hEl = a.querySelector('h2, h3, h4, [class*="title" i], figcaption');
                const label = (
                  (hEl?.textContent || a.textContent || a.getAttribute('aria-label') || '') as string
                )
                  .replace(/\s+/g, ' ')
                  .trim();
                childProjects.push({ url: cleanHref, label });
              }
            }

            return { childProjects, nextGalleryPages };
          }, page.url());

          for (const cl of discovery.childProjects) {
            pushProjectSub(cl.url, cl.label);
          }
          for (const np of discovery.nextGalleryPages) {
            const nk = normalizeUrlKey(np.url);
            if (!visitedGalleryKeys.has(nk)) {
              galleryQueue.push(np);
            }
          }
        } catch {}
      }

      // Case 1: Dedicated individual project subpages — scrape in 3 concurrent tabs for fast full-portfolio coverage
      if (allProjectSubPages.length > 0) {
        const targets = allProjectSubPages.slice(0, maxProjects);
        this.logger.log(
          `📂 [Website Projects] Scraping ${targets.length} discovered project subpage(s) on ${resolvedOrigin}`
        );
        const orderedSubResults: Array<ScrapedProjectInput | null> = new Array(targets.length).fill(
          null
        );
        let subCursor = 0;
        const workerCount = Math.min(3, targets.length);

        const subWorkers = Array.from({ length: workerCount }, async () => {
          const wPage = await BrowserPoolUtil.createStealthPage(browser);
          await wPage.setViewport({ width: 1440, height: 900 });
          try {
            while (subCursor < targets.length) {
              const idx = subCursor++;
              const sub = targets[idx];
              try {
                await wPage.goto(sub.url, { waitUntil: 'domcontentloaded', timeout: 18000 });
                await ScraperHttpUtil.sleep(900);
                const extracted = await extractPageSectionsAndPhotos(wPage, sub.label);
                const photos = filterValidPhotos(extracted.items).slice(0, maxPhotosPerProject);
                const rawTitle = (extracted.pageHeading || sub.label || '').trim();
                if (photos.length > 0 && rawTitle && !isGenericNonProjectHeading(rawTitle)) {
                  orderedSubResults[idx] = {
                    title: rawTitle,
                    slug: this.slugify(rawTitle),
                    description: extracted.description || undefined,
                    sourceUrl: sub.url,
                    photos,
                  };
                }
              } catch {}
            }
          } finally {
            await wPage.close().catch(() => {});
          }
        });

        await Promise.all(subWorkers);
        for (const r of orderedSubResults) {
          if (r && results.length < maxProjects) results.push(r);
        }
      }

      // Case 2: Dedicated Gallery / Portfolio / Our Work pages (supports multi-section headings OR full gallery)
      for (const gal of navDiscovery.galleryPages) {
        if (results.length >= maxProjects) break;
        try {
          await page.goto(gal.url, { waitUntil: 'domcontentloaded', timeout: 16000 });
          await ScraperHttpUtil.sleep(1100);
          const extracted = await extractPageSectionsAndPhotos(page, gal.label);

          const bySection = new Map<string, typeof extracted.items>();
          for (const it of extracted.items) {
            const sec = (it.sectionTitle || '').trim();
            if (
              sec &&
              !isGenericNonProjectHeading(sec) &&
              sec.toLowerCase() !== businessName.toLowerCase()
            ) {
              const list = bySection.get(sec) || [];
              list.push(it);
              bySection.set(sec, list);
            }
          }

          let addedSections = 0;
          if (bySection.size >= 2) {
            for (const [secTitle, secItems] of bySection.entries()) {
              if (results.length >= maxProjects) break;
              const secPhotos = filterValidPhotos(secItems).slice(0, maxPhotosPerProject);
              if (secPhotos.length >= 2) {
                results.push({
                  title: secTitle,
                  slug: this.slugify(secTitle),
                  description: extracted.description || undefined,
                  sourceUrl: gal.url,
                  photos: secPhotos,
                });
                addedSections++;
              }
            }
          }

          if (addedSections === 0 && results.length < maxProjects) {
            const photos = filterValidPhotos(extracted.items).slice(0, maxPhotosPerProject);
            if (photos.length > 0) {
              const rawTitle = (extracted.pageHeading || gal.label || '').trim();
              const cleanTitle =
                rawTitle && !isGenericNonProjectHeading(rawTitle)
                  ? rawTitle
                  : `${businessName} Project Gallery`;
              results.push({
                title: cleanTitle,
                slug: this.slugify(cleanTitle),
                description: extracted.description || undefined,
                sourceUrl: gal.url,
                photos,
              });
            }
          }
        } catch {}
      }

      // Case 3: Authentic Service / Trade Showcase pages (Kitchens, Bathrooms, Closets, etc.) when website doesn't split into many project subpages
      if (results.length < 5) {
        for (const srv of navDiscovery.servicePages) {
          if (results.length >= maxProjects) break;
          try {
            await page.goto(srv.url, { waitUntil: 'domcontentloaded', timeout: 16000 });
            await ScraperHttpUtil.sleep(1000);
            const extracted = await extractPageSectionsAndPhotos(page, srv.label);
            const photos = filterValidPhotos(extracted.items).slice(0, maxPhotosPerProject);
            if (photos.length >= 2) {
              const rawTitle = (srv.label || extracted.pageHeading || '').trim();
              const cleanTitle =
                rawTitle && !isGenericNonProjectHeading(rawTitle)
                  ? rawTitle
                  : `${businessName} Portfolio`;
              results.push({
                title: cleanTitle,
                slug: this.slugify(cleanTitle),
                description: extracted.description || undefined,
                sourceUrl: srv.url,
                photos,
              });
            }
          } catch {}
        }
      }

      // Case 4: Homepage portfolio images if still empty (require >= 2 genuine work photos)
      if (results.length === 0) {
        try {
          await page.goto(resolvedHomeUrl, { waitUntil: 'domcontentloaded', timeout: 16000 });
          await ScraperHttpUtil.sleep(1300);
          const homeExtracted = await extractPageSectionsAndPhotos(page, `${businessName} Portfolio`);
          const photos = filterValidPhotos(homeExtracted.items).slice(0, maxPhotosPerProject);
          if (photos.length >= 2) {
            results.push({
              title: `${businessName} Portfolio`,
              slug: this.slugify(`${businessName}-portfolio`),
              sourceUrl: resolvedHomeUrl,
              photos,
            });
          }
        } catch {}
      }
    } finally {
      await page.close();
    }

    return results.slice(0, maxProjects);
  }

  /**
   * Lightweight raw description extractor from an existing project's sourceUrl (Houzz or contractor website)
   * so we can enrich and AI-paraphrase existing DB projects without re-downloading photos.
   */
  async extractRawDescriptionFromSourceUrl(sourceUrl?: string | null): Promise<string | null> {
    if (!sourceUrl || !sourceUrl.startsWith('http')) return null;

    const isBoilerplate = (txt: string): boolean => {
      const t = (txt || '').replace(/\s+/g, ' ').trim();
      if (t.length < 28) return true;
      return (
        /see more photos of this project on houzz/i.test(t) ||
        /^check out\b.*\bon houzz\.?$/i.test(t) ||
        /^browse\b.*\bphotos on houzz/i.test(t) ||
        /^houzz has millions of/i.test(t) ||
        /client challenge|verify you are human|captcha/i.test(t)
      );
    };

    try {
      const html = await ScraperHttpUtil.fetchHtml(sourceUrl, {
        timeoutMs: 9000,
        headers: { Referer: 'https://www.google.com/' },
      });
      if (!html || html.includes('Client Challenge')) return null;

      const $ = cheerio.load(html);

      // 1. Houzz hz-ctx JSON store
      if (sourceUrl.includes('houzz.com')) {
        const ctxRaw = $('#hz-ctx').html() || '';
        if (ctxRaw) {
          try {
            const ctx = JSON.parse(ctxRaw);
            const stores = ctx?.data?.stores?.data || {};
            for (const storeName of Object.keys(stores)) {
              if (!/project/i.test(storeName)) continue;
              const storeData = stores[storeName]?.data || stores[storeName];
              if (storeData && typeof storeData === 'object') {
                for (const entry of Object.values(storeData) as any[]) {
                  const cand = String(
                    entry?.description ||
                      entry?.projectDescription ||
                      entry?.project?.description ||
                      ''
                  ).trim();
                  if (cand && !isBoilerplate(cand)) {
                    return cand.replace(/\s+/g, ' ').slice(0, 900);
                  }
                }
              }
            }
          } catch {}
        }
      }

      // 2. Explicit project description DOM containers
      const domDesc = $(
        '[class*="project-description" i], [class*="ProjectDescription" i], [data-component*="Description" i]'
      )
        .first()
        .text()
        .replace(/\s+/g, ' ')
        .trim();
      if (domDesc && !isBoilerplate(domDesc)) {
        return domDesc.slice(0, 900);
      }

      // 3. Meta og:description / description
      const metaDesc = (
        $('meta[property="og:description"]').attr('content') ||
        $('meta[name="description"]').attr('content') ||
        ''
      )
        .replace(/\s+/g, ' ')
        .trim();
      if (metaDesc && !isBoilerplate(metaDesc)) {
        return metaDesc.slice(0, 900);
      }

      // 4. For contractor websites, grab first substantive paragraph in main/article
      if (!sourceUrl.includes('houzz.com')) {
        let bestPara = '';
        $('main p, article p, section p').each((_, el) => {
          if (bestPara) return;
          const pTxt = $(el).text().replace(/\s+/g, ' ').trim();
          if (
            pTxt.length >= 45 &&
            pTxt.length <= 700 &&
            !/cookie|privacy|copyright|all rights reserved|call us today/i.test(pTxt)
          ) {
            bestPara = pTxt;
          }
        });
        if (bestPara) return bestPara;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Scrapes BOTH:
   *   1) Authentic "About" company bio paragraphs from the contractor's official website
   *   2) Real human team members ("The team") strictly from the contractor's official website
   *      (returns `[]` when the contractor's website has no real team section — ZERO fake/fallback rows).
   */
  public async scrapeWebsiteAboutAndTeam(
    browser: Browser,
    websiteUrl: string,
    businessName: string,
    knownLogoUrl?: string | null
  ): Promise<{
    websiteAboutDescription: string | null;
    teamMembers: ScrapedTeamMemberInput[];
  }> {
    let origin = '';
    try {
      origin = new URL(websiteUrl).origin;
    } catch {
      return { websiteAboutDescription: null, teamMembers: [] };
    }

    const normalizeHost = (u: string): string => {
      try {
        return new URL(u).hostname.replace(/^www\./i, '').toLowerCase();
      } catch {
        return '';
      }
    };
    const baseHost = normalizeHost(websiteUrl);

    const page = await BrowserPoolUtil.createStealthPage(browser);
    const aboutParagraphs: string[] = [];
    let metaAboutFallback = '';
    const collectedMembers = new Map<string, ScrapedTeamMemberInput>();

    try {
      await page.setViewport({ width: 1440, height: 920, deviceScaleFactor: 1 });

      let allowedHosts = new Set<string>([baseHost]);

      const visitAndExtract = async (
        targetUrl: string,
        pageKind: 'HOME' | 'ABOUT' | 'TEAM'
      ): Promise<{ aboutLinks: string[]; teamLinks: string[] }> => {
        try {
          await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 18000 });
          await new Promise((r) => setTimeout(r, 1200));

          const landedUrl = page.url() || targetUrl;
          const landedHost = normalizeHost(landedUrl);
          if (landedHost) allowedHosts.add(landedHost);

          // Quick scroll to trigger lazy-loaded headshots and sections
          await page
            .evaluate(async () => {
              const step = 650;
              const maxScroll = Math.min(document.body?.scrollHeight || 3000, 5600);
              for (let y = 0; y <= maxScroll; y += step) {
                window.scrollTo(0, y);
                await new Promise((r) => setTimeout(r, 100));
              }
              window.scrollTo(0, 0);
            })
            .catch(() => {});
          await new Promise((r) => setTimeout(r, 450));

          const extracted = await page.evaluate(
            (ctx: { pageKind: 'HOME' | 'ABOUT' | 'TEAM'; currentUrl: string }) => {
              const aboutLinks: string[] = [];
              const teamLinks: string[] = [];

              document.querySelectorAll('a[href]').forEach((a) => {
                const rawHref = (a.getAttribute('href') || '').trim();
                if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:') || rawHref.startsWith('javascript:')) {
                  return;
                }
                let abs = '';
                try {
                  abs = new URL(rawHref, ctx.currentUrl).toString().split('#')[0];
                } catch {
                  return;
                }
                const pathname = (() => {
                  try {
                    return new URL(abs).pathname.toLowerCase();
                  } catch {
                    return '';
                  }
                })();
                const anchorText = (a.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();

                const isCareerLink = /\b(join|career|careers|job|jobs|hiring|apply|work-with-us)\b/i.test(
                  `${pathname} ${anchorText}`
                );
                if (isCareerLink) return;

                if (
                  /\/([a-z0-9-]*-)?(team|staff|leadership|designers|architects|founders|principals|our-people)(-[a-z0-9-]+)?(\/|$)/i.test(
                    pathname
                  ) ||
                  (/\b(our\s+team|the\s+team|meet\s+(?:the\s+|our\s+)?team|^team$|leadership|our\s+staff|our\s+designers|design\s+team|founders|principals)\b/i.test(
                    anchorText
                  ) &&
                    pathname.length > 1 &&
                    pathname.split('/').filter(Boolean).length <= 3)
                ) {
                  teamLinks.push(abs);
                } else if (
                  /\/(about|who-we-are|our-story|our-company|the-firm|the-studio|studio|info|bio|bios|meet-)(-[a-z0-9-]+|[a-z0-9-]*)?(\/|$)/i.test(
                    pathname
                  ) ||
                  (/^(about(\s+[a-z0-9&.'’-]+){0,3}|who\s+we\s+are|our\s+story|our\s+company|the\s+firm|the\s+studio|studio|info|bio|our\s+bio)$/i.test(
                    anchorText
                  ) &&
                    pathname.length > 1 &&
                    pathname.split('/').filter(Boolean).length <= 3)
                ) {
                  aboutLinks.push(abs);
                }
              });

              // 1. Extract About narrative paragraphs
              const paras: string[] = [];
              const metaDesc = (
                document.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
                document.querySelector('meta[name="description"]')?.getAttribute('content') ||
                ''
              )
                .replace(/\s+/g, ' ')
                .trim();

              const isInsideExcludedAbout = (el: Element | null): boolean => {
                let cur: Element | null = el;
                while (cur && cur !== document.body) {
                  const tag = cur.tagName.toLowerCase();
                  if (tag === 'header' || tag === 'nav' || tag === 'footer' || tag === 'form' || tag === 'blockquote') {
                    return true;
                  }
                  const attr = `${cur.id || ''} ${typeof cur.className === 'string' ? cur.className : ''}`.toLowerCase();
                  if (/(testimonial|review|cookie|popup|modal|footer|navbar|comment|faq)/i.test(attr)) {
                    return true;
                  }
                  cur = cur.parentElement;
                }
                return false;
              };

              const pNodes = Array.from(document.querySelectorAll('main p, article p, section p, [class*="about" i] p, [id*="about" i] p'));
              for (const p of pNodes) {
                if (isInsideExcludedAbout(p)) continue;
                const txt = (p.textContent || '').replace(/\s+/g, ' ').trim();
                if (txt.length < 50 || txt.length > 950) continue;
                if (/cookie|privacy policy|all rights reserved|terms of service|fill out the form|subscribe to our/i.test(txt)) {
                  continue;
                }
                if (ctx.pageKind === 'ABOUT') {
                  paras.push(txt);
                } else if (ctx.pageKind === 'HOME') {
                  let inAboutSection = false;
                  let anc: Element | null = p.parentElement;
                  while (anc && anc !== document.body) {
                    const attr = `${anc.id || ''} ${typeof anc.className === 'string' ? anc.className : ''}`;
                    if (/(about|story|who-we-are|company|intro|welcome|mission|bio)/i.test(attr)) {
                      inAboutSection = true;
                      break;
                    }
                    const h = anc.querySelector('h1, h2, h3');
                    if (h && /\b(about|who we are|our story|our company|welcome to)\b/i.test(h.textContent || '')) {
                      inAboutSection = true;
                      break;
                    }
                    anc = anc.parentElement;
                  }
                  if (inAboutSection || paras.length === 0) {
                    paras.push(txt);
                  }
                }
                if (paras.length >= 4) break;
              }

              // 2. Extract JSON-LD Person / employee / founder entries
              const rawCandidates: Array<{
                name: string;
                role: string;
                bio: string;
                photoUrl: string;
                fromJsonLd?: boolean;
                fromDedicatedTeamPage?: boolean;
                peerCount?: number;
              }> = [];

              document.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
                try {
                  const parsed = JSON.parse(s.textContent || '');
                  const walk = (node: any, underOrgRelation = false) => {
                    if (!node || typeof node !== 'object') return;
                    if (Array.isArray(node)) {
                      node.forEach((item) => walk(item, underOrgRelation));
                      return;
                    }
                    const t = String(node['@type'] || '');
                    if (/Person/i.test(t) && (underOrgRelation || ctx.pageKind === 'TEAM' || ctx.pageKind === 'ABOUT')) {
                      const nm = String(node.name || '').trim();
                      const rl = String(node.jobTitle || node.roleName || '').trim();
                      const desc = String(node.description || '').trim();
                      const img =
                        typeof node.image === 'string'
                          ? node.image
                          : typeof node.image?.url === 'string'
                          ? node.image.url
                          : '';
                      if (nm) {
                        rawCandidates.push({
                          name: nm,
                          role: rl,
                          bio: desc,
                          photoUrl: img,
                          fromJsonLd: true,
                          fromDedicatedTeamPage: ctx.pageKind === 'TEAM',
                          peerCount: 2,
                        });
                      }
                    }
                    for (const relKey of ['employee', 'employees', 'founder', 'founders', 'member', 'members']) {
                      if (node[relKey]) walk(node[relKey], true);
                    }
                    if (node['@graph']) walk(node['@graph'], underOrgRelation);
                  };
                  walk(parsed, false);
                } catch {}
              });

              // 3. Extract DOM Team Member Cards via Leaf-Up Name Anchors
              const isExcludedContainer = (el: Element | null): boolean => {
                let cur: Element | null = el;
                while (cur && cur !== document.body) {
                  const tag = cur.tagName.toLowerCase();
                  if (tag === 'header' || tag === 'nav' || tag === 'footer' || tag === 'blockquote' || tag === 'form') {
                    return true;
                  }
                  const attr = `${cur.id || ''} ${typeof cur.className === 'string' ? cur.className : ''}`.toLowerCase();
                  if (
                    /(testimonial|review|comment-list|blog-post|article-list|project-card|service-card|pricing-table|faq-item|site-footer|site-header|main-nav|navbar)/i.test(
                      attr
                    )
                  ) {
                    return true;
                  }
                  cur = cur.parentElement;
                }
                return false;
              };

              const resolveBestImageInEl = (root: Element): string => {
                const imgs = Array.from(root.querySelectorAll('img'));
                for (const img of imgs) {
                  const w = img.naturalWidth || img.width || 0;
                  const h = img.naturalHeight || img.height || 0;
                  if (w > 0 && w < 48) continue;
                  if (h > 0 && h < 48) continue;
                  if (w > 0 && h > 0 && w / h > 2.3) continue;

                  let src =
                    img.currentSrc ||
                    img.getAttribute('src') ||
                    img.getAttribute('data-src') ||
                    img.getAttribute('data-lazy-src') ||
                    '';
                  const srcset = img.getAttribute('srcset') || img.getAttribute('data-srcset') || '';
                  if (srcset) {
                    const parts = srcset
                      .split(',')
                      .map((s) => s.trim().split(/\s+/)[0])
                      .filter(Boolean);
                    if (parts.length > 0) {
                      src = parts[parts.length - 1];
                    }
                  }
                  if (!src || src.startsWith('data:')) continue;
                  try {
                    const abs = new URL(src, ctx.currentUrl).toString();
                    if (!/\.(svg|gif)(\?|$)/i.test(abs)) {
                      return abs;
                    }
                  } catch {}
                }

                const bgNodes = [root, ...Array.from(root.querySelectorAll('div, span, figure, a'))].slice(0, 24);
                for (const node of bgNodes) {
                  const bg = window.getComputedStyle(node).backgroundImage || '';
                  const m = bg.match(/url\(["']?(https?:\/\/[^"')]+|\/[^"')]+)["']?\)/i);
                  if (m && m[1] && !m[1].startsWith('data:')) {
                    try {
                      const abs = new URL(m[1], ctx.currentUrl).toString();
                      if (!/\.(svg|gif)(\?|$)/i.test(abs)) {
                        return abs;
                      }
                    } catch {}
                  }
                }
                return '';
              };

              const NON_NAME_TOKENS = new Set([
                'our', 'the', 'your', 'why', 'how', 'what', 'who', 'where', 'when', 'about', 'meet',
                'team', 'staff', 'leadership', 'founders', 'founder', 'owner', 'ceo', 'president',
                'director', 'manager', 'designer', 'designers', 'architect', 'architects', 'estimator',
                'coordinator', 'project', 'projects', 'kitchen', 'bathroom', 'bath', 'cabinet',
                'cabinets', 'closet', 'closets', 'roof', 'roofing', 'siding', 'gutter', 'gutters',
                'interior', 'interiors', 'design', 'build', 'remodeling', 'renovation', 'construction',
                'contracting', 'contractor', 'custom', 'modern', 'luxury', 'new', 'york', 'nyc',
                'brooklyn', 'manhattan', 'queens', 'bronx', 'university', 'college', 'school',
                'institute', 'studio', 'group', 'corp', 'inc', 'llc', 'company', 'services', 'service',
                'free', 'quote', 'estimate', 'contact', 'gallery', 'portfolio', 'reviews', 'review',
                'client', 'clients', 'home', 'commercial', 'residential', 'read', 'more', 'view', 'all',
              ]);

              const looksLikeNameLine = (s: string): boolean => {
                const cleaned = s
                  .replace(/^(meet|about)\s+/i, '')
                  .replace(/\s*\([A-Za-z.\s'’-]{1,20}\)/g, '')
                  .split(/(?:,\s+|\s+[-–—|:/•·]\s+)/)[0]
                  .trim();
                if (cleaned.length < 4 || cleaned.length > 40) return false;
                if (/[0-9@#$%^&*()_+={}[\]\\:;"<>?/~!]/.test(cleaned)) return false;
                const tokens = cleaned.split(/\s+/).filter(Boolean);
                if (tokens.length < 2 || tokens.length > 4) return false;
                if (!tokens.every((t) => /^[A-Za-z][A-Za-z'’-]*\.?$/.test(t))) return false;
                for (const t of tokens) {
                  if (NON_NAME_TOKENS.has(t.toLowerCase().replace(/[.]/g, ''))) return false;
                }
                return true;
              };

              // Identify candidate Team roots (avoid adding tiny leaf `.team-member-name` elements as roots!)
              const teamRoots = new Set<Element>();
              if (ctx.pageKind === 'TEAM' || ctx.pageKind === 'ABOUT') {
                const mainEl = document.querySelector('main') || document.body;
                if (mainEl) teamRoots.add(mainEl);
              } else {
                document
                  .querySelectorAll(
                    '[id*="team" i], [class*="team" i], [id*="staff" i], [class*="staff" i], [id*="leadership" i], [class*="leadership" i], [id*="founder" i], [class*="founder" i]'
                  )
                  .forEach((el) => {
                    if (isExcludedContainer(el)) return;
                    let sec: Element | null = el;
                    while (
                      sec &&
                      sec !== document.body &&
                      sec.tagName.toLowerCase() !== 'section' &&
                      (sec.textContent || '').trim().length < 120 &&
                      sec.querySelectorAll('img').length < 2
                    ) {
                      sec = sec.parentElement;
                    }
                    if (sec && sec !== document.body && !isExcludedContainer(sec)) {
                      teamRoots.add(sec);
                    }
                  });

                document.querySelectorAll('h1, h2, h3, h4, [class*="heading" i]').forEach((heading) => {
                  if (isExcludedContainer(heading)) return;
                  const hText = (heading.textContent || '').replace(/\s+/g, ' ').trim();
                  if (
                    /^(?:meet\s+)?(?:our\s+|the\s+)?(?:team|leadership|leadership\s+team|founders?|co-founders?|principals?|staff|designers?|design\s+team|architects?|management|our\s+people|key\s+personnel)\b/i.test(
                      hText
                    )
                  ) {
                    let anc: Element | null = heading.parentElement;
                    while (
                      anc &&
                      anc !== document.body &&
                      anc.tagName.toLowerCase() !== 'section' &&
                      anc.querySelectorAll('img, h3, h4, h5, p').length < 3
                    ) {
                      anc = anc.parentElement;
                    }
                    if (anc && anc !== document.body && !isExcludedContainer(anc)) {
                      teamRoots.add(anc);
                    }
                    const nextSib = heading.parentElement?.nextElementSibling || heading.nextElementSibling;
                    if (nextSib && !isExcludedContainer(nextSib)) {
                      teamRoots.add(nextSib);
                    }
                  }
                });
              }

              // Collect all leaf Name anchors inside teamRoots (including Elementor/Wix/Squarespace div/span/p leaf headings!)
              const nameAnchorSelector =
                'h1, h2, h3, h4, h5, h6, [class*="name" i], [class*="heading-title" i], [class*="member-title" i], strong, b, p, span, div';
              const processedNameEls = new Set<Element>();

              teamRoots.forEach((root) => {
                const rawAnchors = Array.from(root.querySelectorAll(nameAnchorSelector));
                const validAnchors = rawAnchors.filter((el) => {
                  if (processedNameEls.has(el) || isExcludedContainer(el)) return false;
                  const tag = el.tagName.toLowerCase();
                  // For generic p/span/div, require leaf or single-child element so outer wrappers never match
                  if ((tag === 'p' || tag === 'span' || tag === 'div') && el.children.length > 1) {
                    const onlyBrOrSpan = Array.from(el.children).every((c) =>
                      ['br', 'span', 'strong', 'b', 'em'].includes(c.tagName.toLowerCase())
                    );
                    if (!onlyBrOrSpan) return false;
                  }
                  const fullAnchorText = ((el as HTMLElement).innerText || el.textContent || '').trim();
                  if (fullAnchorText.length < 4 || fullAnchorText.length > 115) return false;
                  const lines = fullAnchorText
                    .split(/\r?\n/)
                    .map((l) => l.trim())
                    .filter(Boolean);
                  if (lines.length === 0 || lines.length > 3) return false;
                  return looksLikeNameLine(lines[0]);
                });

                // Deduplicate nested validAnchors (e.g. `<h3 class="heading"><span class="text">Noam Hanuka</span></h3>` -> keep outer `h3`)
                const dedupedAnchors = validAnchors.filter(
                  (el) => !validAnchors.some((other) => other !== el && other.contains(el))
                );

                for (const nameEl of dedupedAnchors) {
                  processedNameEls.add(nameEl);
                  const nameLines = ((nameEl as HTMLElement).innerText || nameEl.textContent || '')
                    .split(/\r?\n/)
                    .map((l) => l.trim())
                    .filter(Boolean);
                  const rawName = nameLines[0] || '';
                  let rawRole = nameLines.length >= 2 && nameLines[1].length <= 75 ? nameLines[1] : '';
                  let rawBio = '';

                  // Walk up from nameEl (up to 6 levels) to find the tightest card container for THIS person only
                  let card: Element = nameEl;
                  const nameTag = nameEl.tagName.toLowerCase();
                  if ((nameTag === 'strong' || nameTag === 'b' || nameTag === 'span') && nameEl.parentElement) {
                    card = nameEl.parentElement;
                  }
                  for (let depth = 0; depth < 6; depth++) {
                    const parent = card.parentElement;
                    if (!parent || parent === document.body) break;
                    if (parent === root && card !== nameEl) break;
                    const otherPeopleInParent = dedupedAnchors.filter(
                      (other) =>
                        other !== nameEl &&
                        parent.contains(other) &&
                        !nameEl.contains(other) &&
                        !other.contains(nameEl)
                    );
                    if (otherPeopleInParent.length > 0) break;
                    const pLen = (parent.textContent || '').replace(/\s+/g, ' ').trim().length;
                    if (pLen > 2000) break;
                    card = parent;
                  }

                  const fullCardText = (card.textContent || '').replace(/\s+/g, ' ').trim();
                  if (/★|⭐|\bverified\s+review|\bgoogle\s+review|\byelp|\bhouzz\s+review/i.test(fullCardText)) {
                    continue;
                  }

                  if (!rawRole) {
                    const explicitRoleEl = card.querySelector(
                      '[class*="role" i], [class*="title" i], [class*="position" i], [class*="designation" i], [class*="job" i], [class*="subtitle" i]'
                    );
                    if (explicitRoleEl && explicitRoleEl !== nameEl && !explicitRoleEl.contains(nameEl)) {
                      const rt = ((explicitRoleEl as HTMLElement).innerText || explicitRoleEl.textContent || '')
                        .replace(/\s+/g, ' ')
                        .trim();
                      if (rt && rt !== rawName && rt.length <= 85) {
                        rawRole = rt;
                      }
                    }
                  }

                  const subBlocks = Array.from(
                    card.querySelectorAll('h4, h5, h6, p, span, em, small, div')
                  );
                  for (const sb of subBlocks) {
                    if (sb === nameEl || sb.contains(nameEl) || nameEl.contains(sb)) continue;
                    if (sb.children.length > 3) continue;
                    const t = ((sb as HTMLElement).innerText || sb.textContent || '')
                      .replace(/\s+/g, ' ')
                      .trim();
                    if (!t || t === rawName || t === rawRole) continue;
                    if (!rawRole && t.length >= 3 && t.length <= 75 && !/[.!?]$/.test(t)) {
                      rawRole = t;
                    } else if (!rawBio && t.length >= 28 && t.length <= 900 && t !== rawRole) {
                      rawBio = t;
                    }
                  }

                  // Fallback for inline/text-node siblings inside `card` (e.g. `<p><strong>Name</strong> — Role<br>Bio...</p>`)
                  if (!rawRole || !rawBio) {
                    const cardLines = ((card as HTMLElement).innerText || card.textContent || '')
                      .split(/\r?\n/)
                      .map((l) => l.trim())
                      .filter(Boolean);
                    for (const line of cardLines) {
                      if (line === rawName) continue;
                      if (line.startsWith(rawName)) {
                        const remainder = line
                          .slice(rawName.length)
                          .replace(/^\s*[-–—|:,•·]+\s*/, '')
                          .trim();
                        if (!rawRole && remainder.length >= 3 && remainder.length <= 80) {
                          rawRole = remainder;
                          continue;
                        }
                      }
                      if (!rawRole && line.length >= 3 && line.length <= 75 && !/[.!?]$/.test(line)) {
                        rawRole = line;
                      } else if (!rawBio && line.length >= 28 && line.length <= 900 && line !== rawRole) {
                        rawBio = line;
                      }
                    }
                  }

                  // If on an About/Team page and bio explicitly states "<FirstName> is the Founder / Partner / Designer..."
                  if (!rawRole && rawBio && (ctx.pageKind === 'ABOUT' || ctx.pageKind === 'TEAM')) {
                    const roleInBio = rawBio.match(
                      /\b((?:Co-)?Founder(?:\s*[+&]\s*[A-Za-z\s]{3,28})?|Principal(?:\s+(?:Architect|Designer))?|Lead\s+(?:Designer|Architect|Estimator)|Owner(?:\s*[+&]\s*President)?|President(?:\s*[+&]\s*CEO)?|Creative\s+Director|Managing\s+Partner|Partner|Interior\s+Designer|Graphic\s+Designer?(?:\s*[+&]\s*Brand\s+Identity)?|Sales\s+Manager|General\s+Manager|Project\s+Manager|Director\s+of\s+[A-Za-z\s]{3,22})\b/i
                    );
                    if (roleInBio && roleInBio[1]) {
                      rawRole = roleInBio[1].trim();
                    }
                  }

                  const photoUrl = resolveBestImageInEl(card);
                  rawCandidates.push({
                    name: rawName,
                    role: rawRole,
                    bio: rawBio,
                    photoUrl,
                    fromJsonLd: false,
                    fromDedicatedTeamPage: ctx.pageKind === 'TEAM',
                    peerCount: validAnchors.length,
                  });
                }
              });

              return {
                aboutLinks,
                teamLinks,
                paras,
                metaDesc,
                rawCandidates,
              };
            },
            { pageKind, currentUrl: landedUrl }
          );

          if (extracted.metaDesc && !metaAboutFallback && extracted.metaDesc.length >= 50) {
            metaAboutFallback = extracted.metaDesc;
          }
          for (const p of extracted.paras) {
            if (!aboutParagraphs.includes(p)) {
              aboutParagraphs.push(p);
            }
          }

          for (const cand of extracted.rawCandidates) {
            const validated = this.validateAndCleanTeamMember(
              cand,
              businessName,
              landedUrl,
              knownLogoUrl
            );
            if (!validated) continue;
            const key = validated.name.toLowerCase();
            const existing = collectedMembers.get(key);
            if (!existing) {
              collectedMembers.set(key, validated);
            } else {
              if (!existing.role && validated.role) existing.role = validated.role;
              if (!existing.credentials && validated.credentials) existing.credentials = validated.credentials;
              if (!existing.bio && validated.bio) existing.bio = validated.bio;
              if (!existing.photoSourceUrl && validated.photoSourceUrl) {
                existing.photoSourceUrl = validated.photoSourceUrl;
              }
            }
          }

          const sameOriginOnly = (urls: string[]) =>
            [...new Set(urls)].filter(
              (u) =>
                allowedHosts.has(normalizeHost(u)) &&
                u.replace(/\/+$/, '') !== websiteUrl.replace(/\/+$/, '') &&
                u.replace(/\/+$/, '') !== landedUrl.replace(/\/+$/, '')
            );

          return {
            aboutLinks: sameOriginOnly(extracted.aboutLinks),
            teamLinks: sameOriginOnly(extracted.teamLinks),
          };
        } catch {
          return { aboutLinks: [], teamLinks: [] };
        }
      };

      // Step A: Visit Homepage to gather nav links + homepage About/Team sections
      const homeNav = await visitAndExtract(websiteUrl, 'HOME');

      // Step B: Visit up to 3 discovered About pages (to get rich "About" text AND any Team section on /about or /studio)
      const aboutQueue = homeNav.aboutLinks.slice(0, 3);
      const discoveredTeamFromAbout: string[] = [];
      for (const aboutUrl of aboutQueue) {
        const sub = await visitAndExtract(aboutUrl, 'ABOUT');
        discoveredTeamFromAbout.push(...sub.teamLinks);
      }

      // Step C: Visit up to 3 dedicated Team / Leadership / Staff / Designers pages
      const teamQueue = [...new Set([...homeNav.teamLinks, ...discoveredTeamFromAbout])].slice(0, 3);
      for (const teamUrl of teamQueue) {
        if (aboutQueue.includes(teamUrl)) continue;
        await visitAndExtract(teamUrl, 'TEAM');
      }

      // Build clean websiteAboutDescription (prioritizing narrative paragraphs over meta description)
      let websiteAboutDescription: string | null = null;
      if (aboutParagraphs.length > 0) {
        websiteAboutDescription = aboutParagraphs.slice(0, 3).join(' ').slice(0, 1400).trim();
      } else if (metaAboutFallback && metaAboutFallback.length >= 50) {
        websiteAboutDescription = metaAboutFallback.slice(0, 900).trim();
      }

      const finalTeam = Array.from(collectedMembers.values()).slice(0, 24);
      if (finalTeam.length > 0) {
        this.logger.log(
          `👥 [Website Team] Scraped ${finalTeam.length} authentic team member(s) from ${origin} for "${businessName}"`
        );
      }

      return {
        websiteAboutDescription,
        teamMembers: finalTeam,
      };
    } catch (err: any) {
      this.logger.warn(
        `scrapeWebsiteAboutAndTeam warning for "${businessName}" (${websiteUrl}): ${err.message}`
      );
      return { websiteAboutDescription: null, teamMembers: [] };
    } finally {
      try {
        await page.close();
      } catch {}
    }
  }

  /**
   * Strict human-person validator for scraped website team members.
   * Rejects 100% of trade/service cards, borough names, company names, customer reviews, and UI headings.
   */
  private validateAndCleanTeamMember(
    raw: {
      name: string;
      role: string;
      bio: string;
      photoUrl: string;
      fromJsonLd?: boolean;
      fromDedicatedTeamPage?: boolean;
      peerCount?: number;
    },
    businessName: string,
    sourceUrl: string,
    knownLogoUrl?: string | null
  ): ScrapedTeamMemberInput | null {
    let rawName = (raw.name || '')
      .replace(/^(meet|about)\s+/i, '')
      .replace(/\s*\([A-Za-z.\s'’-]{1,20}\)/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    let rawRole = (raw.role || '').replace(/\s+/g, ' ').trim();

    // Extract professional credentials FIRST (AIA, NCIDQ, CKBD, RA, PE, LEED AP, ASID, etc.) before comma-role splitting
    const credTokens: string[] = [];
    const credRegex =
      /(?:,\s*|\s+)(FAIA|AIA|NCIDQ|CKBD|AKBD|CAPS|ASID|IIDA|LEED\s*AP|RA|PE|PMP|CPA|NARI|OSHA|MBA|Ph\.?D\.?)\b/gi;
    rawName = rawName
      .replace(credRegex, (_, cred: string) => {
        credTokens.push(cred.replace(/\s+/g, ' ').toUpperCase());
        return '';
      })
      .replace(/[,|]+$/g, '')
      .trim();

    // Split inline "Full Name, Job Title" or "Full Name - Job Title" or "Full Name | Job Title" or "Full Name / Job Title"
    if (!rawRole && /(?:,\s+|\s+[-–—|:/•·]\s+)/.test(rawName)) {
      const parts = rawName.split(/(?:,\s+|\s+[-–—|:/•·]\s+)/);
      if (parts.length >= 2 && parts[0].length >= 4 && parts[1].length >= 3) {
        rawName = parts[0].trim();
        rawRole = parts.slice(1).join(' · ').trim();
      }
    }

    if (rawName.length < 5 || rawName.length > 38) return null;
    if (/[0-9@#$%^&*()_+={}[\]\\:;"<>?/~!]/.test(rawName)) return null;

    // Must not match the business name itself
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (norm(rawName) === norm(businessName)) return null;

    const words = rawName.split(/\s+/).filter(Boolean);
    if (words.length < 2 || words.length > 4) return null;

    const NON_HUMAN_WORDS = new Set([
      'roof', 'roofing', 'roofer', 'roofers', 'siding', 'gutter', 'gutters', 'shingle', 'flat', 'slate',
      'copper', 'metal', 'cabinet', 'cabinets', 'cabinetry', 'closet', 'closets', 'wardrobe', 'kitchen',
      'kitchens', 'bath', 'bathroom', 'bathrooms', 'vanity', 'vanities', 'millwork', 'woodwork',
      'woodworking', 'joinery', 'carpentry', 'interior', 'interiors', 'remodel', 'remodeling',
      'renovation', 'renovations', 'construction', 'contracting', 'contractor', 'contractors',
      'builder', 'builders', 'building', 'design', 'designs', 'build', 'architectural', 'architecture',
      'modern', 'custom', 'luxury', 'bespoke', 'classic', 'contemporary', 'traditional', 'commercial',
      'residential', 'home', 'homes', 'house', 'apartment', 'brownstone', 'townhouse', 'loft',
      'penthouse', 'brooklyn', 'manhattan', 'queens', 'bronx', 'staten', 'island', 'york', 'nyc',
      'jersey', 'westchester', 'astoria', 'williamsburg', 'tribeca', 'soho', 'chelsea', 'harlem',
      'studio', 'group', 'company', 'corp', 'corporation', 'inc', 'llc', 'ltd', 'associates',
      'partners', 'services', 'service', 'solutions', 'systems', 'specialists', 'experts', 'pros',
      'pro', 'team', 'staff', 'crew', 'leadership', 'management', 'about', 'contact', 'project',
      'projects', 'portfolio', 'gallery', 'photo', 'photos', 'work', 'works', 'blog', 'news', 'press',
      'media', 'award', 'awards', 'review', 'reviews', 'testimonial', 'testimonials', 'client',
      'clients', 'customer', 'customers', 'homeowner', 'homeowners', 'verified', 'google', 'yelp',
      'houzz', 'angi', 'homeadvisor', 'bbb', 'free', 'quote', 'estimate', 'consultation', 'schedule',
      'book', 'call', 'email', 'phone', 'address', 'location', 'hours', 'monday', 'friday', 'privacy',
      'policy', 'terms', 'conditions', 'warranty', 'insurance', 'licensed', 'insured', 'certified',
      'quality', 'trusted', 'reliable', 'affordable', 'premier', 'best', 'top', 'first', 'our', 'the',
      'your', 'why', 'choose', 'how', 'what', 'who', 'where', 'when', 'read', 'more', 'view', 'see',
      'all', 'profile', 'bio', 'learn', 'get', 'touch', 'connect', 'follow', 'share', 'menu',
      'navigation', 'footer', 'header', 'general', 'senior', 'junior', 'chief', 'principal',
      'founder', 'owner', 'president', 'director', 'manager', 'architect', 'designer', 'estimator',
      'engineer', 'foreman', 'superintendent', 'specialist', 'coordinator', 'consultant',
      'usa', 'vip', 'faq', 'diy', 'seo', 'cta', 'step', 'phase', 'part', 'new', 'south', 'north',
      'east', 'west', 'central', 'greater', 'tri', 'state', 'area', 'metro',
    ]);

    const PARTICLES = new Set(['de', 'da', 'di', 'del', 'della', 'van', 'von', 'la', 'le', 'st', 'st.']);
    let hasSubstantialToken = false;
    const normalizedWords: string[] = [];

    for (let i = 0; i < words.length; i++) {
      let w = words[i];
      const lowerClean = w.toLowerCase().replace(/[.]/g, '');
      if (NON_HUMAN_WORDS.has(lowerClean)) return null;

      if (i > 0 && PARTICLES.has(w.toLowerCase())) {
        normalizedWords.push(w.toLowerCase());
        continue;
      }

      const lettersOnly = w.replace(/[^a-zA-Z]/g, '');
      if (lettersOnly.length === 0) return null;

      // Normalize ALL-CAPS human name tokens ("SAMANTHA" -> "Samantha") while rejecting 2-3 char acronyms unless initial ("J.")
      if (lettersOnly.length >= 2 && lettersOnly === lettersOnly.toUpperCase()) {
        if (lettersOnly.length <= 2 && !w.endsWith('.')) return null;
        w = w
          .toLowerCase()
          .replace(/(^|['’-])([a-z])/g, (_, sep: string, ch: string) => `${sep}${ch.toUpperCase()}`);
      }

      if (!/^[A-Z][a-zA-Z'’-]*\.?$/.test(w)) return null;
      if (lettersOnly.length >= 3) hasSubstantialToken = true;
      normalizedWords.push(w);
    }
    if (!hasSubstantialToken) return null;
    rawName = normalizedWords.join(' ');

    // Role validation
    const VALID_HUMAN_ROLE =
      /\b(founder|co-founder|owner|co-owner|president|vice\s+president|\bvp\b|ceo|coo|cfo|partner|principal|director|architect|designer|graphic\s+design|brand\s+identity|estimator|project\s+manager|general\s+manager|office\s+manager|sales\s+manager|warehouse\s+manager|operations|superintendent|foreman|supervisor|carpenter|craftsman|cabinetmaker|millworker|installer|roofer|technician|specialist|consultant|coordinator|engineer|draftsman|drafter|strategist|lead|head\s+of|manager|administrator|executive|associate|advisor|sales|fabricator|finisher|mason|controller|treasurer|finance|accounting|marketing|warehouse|bookkeeper|expeditor|planner)\b/i;

    let cleanRole: string | undefined;
    if (rawRole && rawRole.length >= 2 && rawRole.length <= 75) {
      if (
        /\b(homeowner|client|customer|resident|verified|google|yelp|houzz|stars?|ago)\b/i.test(rawRole)
      ) {
        return null;
      }
      if (VALID_HUMAN_ROLE.test(rawRole)) {
        cleanRole = rawRole;
      }
    }

    // Validate headshot URL (never reuse site logo or icons)
    let cleanPhotoUrl: string | undefined;
    if (raw.photoUrl && /^https?:\/\//i.test(raw.photoUrl)) {
      const lowerPhoto = raw.photoUrl.toLowerCase();
      const isSameAsLogo =
        Boolean(knownLogoUrl) &&
        lowerPhoto.split('?')[0] === String(knownLogoUrl).toLowerCase().split('?')[0];
      const isNonPortraitAsset =
        isSameAsLogo ||
        /\.(svg|gif)(\?|$)/i.test(lowerPhoto) ||
        /(logo|icon|badge|seal|star|quote|award|placeholder|gravatar|blank|default[-_]?avatar|favicon|yelp|google|houzz|bbb)/i.test(
          lowerPhoto
        );
      if (!isNonPortraitAsset) {
        cleanPhotoUrl = raw.photoUrl;
      }
    }

    // Strict Gate: require a verified human job role OR (dedicated Team URL + valid headshot + >=2 peer cards)
    if (!cleanRole) {
      if (!(raw.fromDedicatedTeamPage && cleanPhotoUrl && (raw.peerCount || 0) >= 2)) {
        return null;
      }
    }

    // Clean bio (exclude boilerplate / review snippets)
    let cleanBio: string | undefined;
    const trimmedBio = (raw.bio || '').replace(/\s+/g, ' ').trim();
    if (
      trimmedBio.length >= 24 &&
      trimmedBio.length <= 850 &&
      !/\b(hired them|highly recommend|did an amazing job|cookie|privacy policy)\b/i.test(trimmedBio)
    ) {
      cleanBio = trimmedBio;
    }

    return {
      name: rawName,
      role: cleanRole,
      credentials: credTokens.length > 0 ? [...new Set(credTokens)].join(', ') : undefined,
      bio: cleanBio,
      photoSourceUrl: cleanPhotoUrl,
      sourceUrl,
    };
  }
}
