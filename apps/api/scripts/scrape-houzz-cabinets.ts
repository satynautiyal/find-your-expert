import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import * as cheerio from 'cheerio';
import { BrowserPoolUtil } from '../src/scrapers/utils/browser-pool.util';
import { ProjectsScraperService } from '../src/scrapers/projects/projects-scraper.service';
import { ScraperHttpUtil } from '../src/scrapers/utils/scraper-http.util';
import { AiReviewSummaryService } from '../src/providers/ai-review-summary.service';
import { ingestImageToR2, uploadBufferToR2, hashAssetUrl } from './utils/r2-upload';

const prisma = new PrismaClient();
const projectsScraper = new ProjectsScraperService();
const aiService = new AiReviewSummaryService();

const HOUZZ_NYC_CABINETS_URL = 'https://www.houzz.com/professionals/cabinets/c/New-York--NY';

/**
 * Upgrade Houzz simgs URL to sharp _10- (500x500) logo resolution
 */
function normalizeHouzzLogoUrl(url: string): string {
  if (!url) return '';
  let clean = url.trim();
  if (clean.startsWith('//')) {
    clean = `https:${clean}`;
  }
  if (clean.includes('st.hzcdn.com/simgs/')) {
    clean = clean.replace(/_(?:0|1|2|3|4|16)-(\d+)/, '_10-$1');
  }
  return clean;
}

/**
 * Checks whether a Houzz avatar image URL is a graphic business logo vs a camera portrait photo.
 * On Houzz CDN:
 * - If _16- (full-res) does not exist (404), the uploaded image is a small square graphic logo (<= 500x500).
 * - If _16- exists (200), graphic logos are < 110KB whereas full-bleed human portrait photos are 160KB - 600KB.
 */
async function isHouzzImageGraphicLogo(url: string): Promise<boolean> {
  if (!url || url.includes('user_0.png')) return false;
  if (!url.includes('st.hzcdn.com/simgs/')) return true;

  let fullResUrl = url.trim();
  if (fullResUrl.startsWith('//')) {
    fullResUrl = `https:${fullResUrl}`;
  }
  fullResUrl = fullResUrl.replace(/_(?:0|1|2|3|4|10|14|16)-(\d+)/, '_16-$1');

  try {
    const res = await fetch(fullResUrl, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    });
    // If _16- returns 404, the original upload is a compact graphic logo (_10- works)
    if (res.status === 404) return true;
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    // Full-res _16- graphic logos on st.hzcdn.com are < 110KB, while human portrait photos are 160KB+
    return buf.length > 2000 && buf.length < 110000;
  } catch {
    return false;
  }
}

/**
 * Crawls a business's official website HTML to extract its authentic company logo URL.
 */
async function scrapeLogoFromBusinessWebsite(websiteUrl: string): Promise<string | null> {
  if (!websiteUrl || websiteUrl.includes('houzz.com')) return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(websiteUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    clearTimeout(timer);
    if (!res.ok) return null;

    const html = await res.text();
    const $ = cheerio.load(html);

    const resolveUrl = (raw?: string | null): string | null => {
      if (!raw) return null;
      const trimmed = raw.trim();
      if (!trimmed || trimmed.startsWith('data:')) return null;
      if (trimmed.startsWith('//')) return `https:${trimmed}`;
      try {
        return new URL(trimmed, websiteUrl).toString();
      } catch {
        return null;
      }
    };

    // 1. Check header / nav / branding img tags with "logo" in src, alt, or class (preferring dark/default over light/white-only)
    const candidateLogos: string[] = [];
    $('header img, nav img, [class*="logo"] img, [class*="brand"] img, img[src*="logo" i], img[alt*="logo" i], img[class*="logo" i]').each(
      (_, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src');
        const full = resolveUrl(src);
        if (full) {
          candidateLogos.push(full);
        }
      }
    );

    // Also check first img in page if its alt matches the site branding or filename has LOGO
    $('img').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src') || '';
      if (/logo/i.test(src) && !/light|white/i.test(src)) {
        const full = resolveUrl(src);
        if (full) candidateLogos.unshift(full);
      }
    });

    // If the primary logo is a white-on-transparent PNG on a dark theme (e.g. lytron/images/logo.png),
    // check if the site has a high-res colored apple-touch-icon brand mark
    const appleTouchIcon = resolveUrl($('link[rel="apple-touch-icon"]').attr('href'));

    for (const candidate of candidateLogos) {
      if (candidate.includes('/themes/lytron/images/logo.png') && appleTouchIcon) {
        return appleTouchIcon;
      }
      return candidate;
    }

    // 2. Check og:image if it explicitly contains "logo"
    const ogImage = resolveUrl($('meta[property="og:image"]').attr('content'));
    if (ogImage && /logo/i.test(ogImage)) {
      return ogImage;
    }

    if (appleTouchIcon) {
      return appleTouchIcon;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Extracts Houzz profile metadata (logoUrl, websiteUrl, rating, reviewCount) from a Houzz profile URL
 */
async function scrapeHouzzProfileMetadata(houzzUrl: string): Promise<{
  houzzLogoUrl: string;
  externalWebsiteUrl: string;
  rating: number;
  reviewCount: number;
}> {
  let houzzLogoUrl = '';
  let externalWebsiteUrl = '';
  let rating = 0;
  let reviewCount = 0;

  try {
    const res = await fetch(houzzUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (res.ok) {
      const html = await res.text();
      const $ = cheerio.load(html);

      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const parsed = JSON.parse($(el).html() || '');
          const items = Array.isArray(parsed) ? parsed : [parsed];
          for (const item of items) {
            if (item['@type'] === 'LocalBusiness' || item['@type'] === 'HomeAndConstructionBusiness' || item.logo || item.image) {
              const rawLogo = typeof item.logo === 'string' ? item.logo : typeof item.image === 'string' ? item.image : '';
              if (rawLogo && rawLogo.includes('hzcdn.com')) {
                houzzLogoUrl = normalizeHouzzLogoUrl(rawLogo);
              }
              if (item.aggregateRating) {
                rating = parseFloat(item.aggregateRating.ratingValue) || rating;
                reviewCount = parseInt(item.aggregateRating.reviewCount, 10) || reviewCount;
              }
            }
          }
        } catch {}
      });

      // Look for external website in HTML
      const webMatch = html.match(/"website"\s*:\s*"(https?:\/\/(?!www\.houzz\.com)[^"]+)"/i);
      if (webMatch) {
        externalWebsiteUrl = webMatch[1];
      }
    }
  } catch {}

  return { houzzLogoUrl, externalWebsiteUrl, rating, reviewCount };
}

/**
 * Discovers official business website for NYC cabinet providers when Houzz blocks outbound link in static HTML
 */
const OFFICIAL_WEBSITE_MAP: Record<string, string> = {
  'beyond-modern-interiors': 'https://www.bmihomestyling.com',
  'hub-woodworks': 'https://www.hubwoodworks.com',
  'samantha-heyl-studio': 'https://www.samanthaheyl.com',
  'dc-italia-ltd': 'http://www.dec-ita.com/',
  'gothic-cabinet-craft': 'https://www.gothiccabinetcraft.com',
  'nykb': 'https://www.nykb.com/',
};

async function main() {
  console.log('===========================================================');
  console.log('🚀 Prosvetted — Houzz NYC Custom Cabinets Logo & Profile Scraper');
  console.log('===========================================================\n');

  await prisma.$connect();

  // 1. Scrape Houzz NYC Cabinets Directory via Stealth Browser to collect live directory cards
  const directoryLogos = new Map<string, { logoUrl: string; profileUrl: string; projectPhotoUrl: string }>();
  let browser: any = null;
  try {
    console.log(`📡 Launching headless browser to scrape: ${HOUZZ_NYC_CABINETS_URL}`);
    browser = await BrowserPoolUtil.createBrowser();
    const page = await BrowserPoolUtil.createStealthPage(browser);

    await page.goto(HOUZZ_NYC_CABINETS_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 3000));

    // Scroll down to trigger lazy loading of all Houzz business avatars
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 400) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 200));
      }
      window.scrollTo(0, 0);
    });
    await new Promise((r) => setTimeout(r, 1500));

    const cards = await page.evaluate(() => {
      const nodes = Array.from(
        document.querySelectorAll('li.hz-pro-search-results__item, [class*="pro-search-results__item"]')
      );
      return nodes.map((card) => {
        const linkEl = card.querySelector('a[href*="/professionals/"], a[href*="/pro/"]');
        const profileUrl = linkEl ? linkEl.getAttribute('href') || '' : '';
        const imgs = Array.from(card.querySelectorAll('img')).map((img) => ({
          src: img.getAttribute('src') || img.getAttribute('data-src') || '',
          alt: (img.getAttribute('alt') || '').trim(),
          cls: img.getAttribute('class') || '',
        }));
        return { profileUrl, imgs };
      });
    });

    for (const c of cards) {
      // On Houzz directory cards, simgs/ is the business avatar/logo, and fimgs/ is the project photo
      const avatarImg = c.imgs.find((i) => i.src.includes('st.hzcdn.com/simgs/'));
      const projectImg = c.imgs.find((i) => i.src.includes('st.hzcdn.com/fimgs/'));
      if (avatarImg && avatarImg.alt) {
        directoryLogos.set(avatarImg.alt.toLowerCase(), {
          logoUrl: normalizeHouzzLogoUrl(avatarImg.src),
          profileUrl: c.profileUrl,
          projectPhotoUrl: projectImg?.src || '',
        });
      }
    }
    console.log(`✅ Extracted ${directoryLogos.size} business cards from Houzz NYC Cabinets directory.\n`);
  } catch (err: any) {
    console.warn(`⚠️ Directory browser scrape warning: ${err.message}`);
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }
  }

  // 2. Fetch all Custom Cabinets providers from Database and verify/scrape their authentic business logos
  const cabinetProviders = await prisma.providerProfile.findMany({
    where: {
      OR: [
        { id: { startsWith: 'prof_cab_' } },
        {
          listings: {
            some: {
              category: {
                slug: 'custom-cabinets',
              },
            },
          },
        },
      ],
    },
    include: {
      platformReviews: true,
      listings: {
        include: {
          photos: true,
        },
      },
    },
  });

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`provider_team_members\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`providerProfileId\` VARCHAR(191) NOT NULL,
      \`name\` VARCHAR(191) NOT NULL,
      \`role\` VARCHAR(191) NULL,
      \`credentials\` VARCHAR(191) NULL,
      \`bio\` TEXT NULL,
      \`imageUrl\` VARCHAR(512) NULL,
      \`sourceUrl\` TEXT NULL,
      \`orderIndex\` INT NOT NULL DEFAULT 0,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (\`id\`),
      INDEX \`provider_team_members_providerProfileId_orderIndex_idx\` (\`providerProfileId\`, \`orderIndex\`),
      CONSTRAINT \`provider_team_members_providerProfileId_fkey\`
        FOREIGN KEY (\`providerProfileId\`) REFERENCES \`provider_profiles\`(\`id\`)
        ON DELETE CASCADE ON UPDATE CASCADE
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  console.log(`🔍 Processing ${cabinetProviders.length} Custom Cabinets providers in database...\n`);

  for (const provider of cabinetProviders) {
    console.log(`-----------------------------------------------------------`);
    console.log(`🏢 Provider: ${provider.businessName} (${provider.slug})`);

    const dirMatch = directoryLogos.get(provider.businessName.toLowerCase());
    const houzzUrl =
      dirMatch?.profileUrl ||
      provider.platformReviews.find((p) => p.platform === 'HOUZZ')?.profileUrl ||
      (provider.websiteUrl?.includes('houzz.com') ? provider.websiteUrl : '');

    // Candidate Houzz logo URL (fallback ONLY if official website has no usable brand logo)
    let candidateHouzzLogo = dirMatch?.logoUrl || normalizeHouzzLogoUrl(provider.logoUrl || '');
    let externalWebsite =
      ScraperHttpUtil.normalizeOfficialWebsiteUrl(OFFICIAL_WEBSITE_MAP[provider.slug]) ||
      ScraperHttpUtil.normalizeOfficialWebsiteUrl(provider.websiteUrl) ||
      '';

    if (houzzUrl) {
      const meta = await scrapeHouzzProfileMetadata(houzzUrl);
      if (meta.houzzLogoUrl && !candidateHouzzLogo) {
        candidateHouzzLogo = meta.houzzLogoUrl;
      }
      if (meta.externalWebsiteUrl && !externalWebsite) {
        externalWebsite =
          ScraperHttpUtil.normalizeOfficialWebsiteUrl(meta.externalWebsiteUrl) || '';
      }
    }

    // Website-First: scrape Official Website Logo + Website "About" + Website "The team"
    const brandRes = await projectsScraper.scrapeProviderBrandAndProjects({
      businessName: provider.businessName,
      boroughOrCity: provider.borough || provider.city,
      houzzUrl,
      websiteUrl: externalWebsite || provider.websiteUrl,
      skipProjects: true,
    });
    const finalOfficialSite = brandRes.officialWebsiteUrl || externalWebsite || null;

    let storedLogoKey: string | null = null;
    if (brandRes.logoSourceUrl) {
      storedLogoKey = await ingestImageToR2(
        brandRes.logoSourceUrl,
        `providers/logos/${provider.slug}-site-${hashAssetUrl(brandRes.logoSourceUrl).slice(0, 8)}`
      );
    }
    if (!storedLogoKey && brandRes.logoPngBuffer) {
      storedLogoKey = await uploadBufferToR2(
        brandRes.logoPngBuffer,
        `providers/logos/${provider.slug}-site-${hashAssetUrl(provider.slug).slice(0, 8)}.png`,
        'image/png'
      );
    }
    if (!storedLogoKey && finalOfficialSite) {
      const scrapedSiteLogo = await scrapeLogoFromBusinessWebsite(finalOfficialSite);
      if (scrapedSiteLogo) {
        storedLogoKey = await ingestImageToR2(
          scrapedSiteLogo,
          `providers/logos/${provider.slug}-site-${hashAssetUrl(scrapedSiteLogo).slice(0, 8)}`
        );
      }
    }
    if (!storedLogoKey && candidateHouzzLogo) {
      const isGraphicLogo = await isHouzzImageGraphicLogo(candidateHouzzLogo);
      if (isGraphicLogo) {
        storedLogoKey = await ingestImageToR2(
          candidateHouzzLogo,
          `providers/logos/${provider.slug}`
        );
      }
    }

    if (storedLogoKey) {
      console.log(`   ☁️ Stored Website-First Business Logo in R2 Bucket: ${storedLogoKey}`);
    }

    // AI-Rewrite Contractor "About" Business Description from Official Website
    let aiBio: string | null = null;
    try {
      const rewritten = await aiService.rewriteBusinessDescription({
        businessName: provider.businessName,
        category: 'Custom Cabinets',
        boroughOrCity: provider.borough || provider.city || undefined,
        sinceYear: provider.sinceYear,
        isLicensed: provider.isLicensed,
        isInsured: provider.isInsured,
        hasWarranty: provider.hasWarranty,
        rawWebsiteAbout: brandRes.websiteAboutDescription,
        fallbackBio: provider.description,
      });
      if (rewritten && rewritten.length >= 35) aiBio = rewritten;
    } catch {}

    // Update ProviderProfile in DB
    await prisma.providerProfile.update({
      where: { id: provider.id },
      data: {
        ...(storedLogoKey ? { logoUrl: storedLogoKey } : {}),
        websiteUrl: finalOfficialSite,
        ...(aiBio ? { description: aiBio } : {}),
      },
    });

    // Persist Website "The team" members in R2 (0 rows if contractor website has no team)
    await prisma.$executeRawUnsafe(
      `DELETE FROM \`provider_team_members\` WHERE \`providerProfileId\` = ?`,
      provider.id
    );
    if (finalOfficialSite && brandRes.teamMembers.length > 0) {
      for (let mIdx = 0; mIdx < brandRes.teamMembers.length; mIdx++) {
        const m = brandRes.teamMembers[mIdx];
        const mImgKey = m.photoSourceUrl
          ? await ingestImageToR2(
              m.photoSourceUrl,
              `providers/team/${provider.slug}/${projectsScraper.slugify(m.name) || mIdx}-${hashAssetUrl(
                m.photoSourceUrl
              ).slice(0, 8)}`
            )
          : null;
        let mBio: string | null = null;
        if (m.bio && m.bio.length >= 20) {
          try {
            mBio = await aiService.rewriteTeamMemberBio({
              businessName: provider.businessName,
              memberName: m.name,
              role: m.role,
              credentials: m.credentials,
              rawBio: m.bio,
            });
          } catch {}
        }
        await prisma.$executeRawUnsafe(
          `INSERT INTO \`provider_team_members\` (\`id\`, \`providerProfileId\`, \`name\`, \`role\`, \`credentials\`, \`bio\`, \`imageUrl\`, \`sourceUrl\`, \`orderIndex\`, \`createdAt\`, \`updatedAt\`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3))`,
          randomUUID(),
          provider.id,
          m.name.slice(0, 180),
          m.role ? m.role.slice(0, 180) : null,
          m.credentials ? m.credentials.slice(0, 180) : null,
          mBio,
          mImgKey,
          m.sourceUrl || finalOfficialSite,
          mIdx
        );
      }
      console.log(`   👥 Saved ${brandRes.teamMembers.length} website team member(s) in R2`);
    }

    // Ensure HOUZZ PlatformReview has the Houzz profileUrl saved
    if (houzzUrl) {
      await prisma.platformReview.upsert({
        where: {
          providerProfileId_platform: {
            providerProfileId: provider.id,
            platform: 'HOUZZ',
          },
        },
        update: {
          profileUrl: houzzUrl,
        },
        create: {
          providerProfileId: provider.id,
          platform: 'HOUZZ',
          rating: Number(provider.compositeRating) || 5.0,
          reviewCount: provider.totalReviews || 10,
          profileUrl: houzzUrl,
        },
      });
    }

    console.log(`   💾 Updated DB record for ${provider.businessName}`);
  }

  console.log('\n===========================================================');
  console.log('🎉 Finished scraping and updating all Custom Cabinets business logos!');
  console.log('===========================================================');
}

main()
  .catch((err) => {
    console.error('Fatal error in scrape-houzz-cabinets:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
