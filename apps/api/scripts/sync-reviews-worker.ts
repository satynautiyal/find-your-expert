import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

import { PrismaClient, ReviewPlatform } from '@prisma/client';
import { GoogleReviewsScraperService } from '../src/scrapers/google/google-reviews-scraper.service';
import { YelpReviewsScraperService } from '../src/scrapers/yelp/yelp-reviews-scraper.service';
import { HomeAdvisorReviewsScraperService } from '../src/scrapers/homeadvisor/homeadvisor-reviews-scraper.service';
import { HouzzReviewsScraperService } from '../src/scrapers/houzz/houzz-reviews-scraper.service';
import { ReviewsScraperService } from '../src/scrapers/reviews-scraper.service';
import { ScraperHttpUtil } from '../src/scrapers/utils/scraper-http.util';
import { AiReviewSummaryService } from '../src/providers/ai-review-summary.service';
import { resolveDatabaseUrlIpv4 } from '../src/prisma/prisma.service';
import { ingestImageToR2, hashAssetUrl } from './utils/r2-upload';

let prisma = new PrismaClient();
const googleScraper = new GoogleReviewsScraperService();
const yelpScraper = new YelpReviewsScraperService();
const homeAdvisorScraper = new HomeAdvisorReviewsScraperService();
const houzzScraper = new HouzzReviewsScraperService();
const orchestrator = new ReviewsScraperService(
  googleScraper,
  yelpScraper,
  homeAdvisorScraper,
  houzzScraper
);
const aiService = new AiReviewSummaryService();

async function ensureReviewColumns() {
  try {
    const cols = await prisma.$queryRawUnsafe<Array<{ Field: string }>>(
      `SHOW COLUMNS FROM \`scraped_reviews\` LIKE 'photo_urls'`
    );
    if (!Array.isArray(cols) || cols.length === 0) {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE \`scraped_reviews\` ADD COLUMN \`photo_urls\` JSON NULL`
      );
    }
    const aiCols = await prisma.$queryRawUnsafe<Array<{ Field: string }>>(
      `SHOW COLUMNS FROM \`provider_profiles\` LIKE 'ai_review_analysis'`
    );
    if (!Array.isArray(aiCols) || aiCols.length === 0) {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE \`provider_profiles\` ADD COLUMN \`ai_review_analysis\` JSON NULL`
      );
    }
    await prisma
      .$executeRawUnsafe(`ALTER TABLE \`platform_reviews\` MODIFY COLUMN \`profileUrl\` TEXT NOT NULL`)
      .catch(() => { });
    await prisma
      .$executeRawUnsafe(`ALTER TABLE \`scraped_reviews\` MODIFY COLUMN \`sourceUrl\` TEXT NULL`)
      .catch(() => { });
  } catch { }
}

export async function syncSingleProviderReviews(profile: any, maxReviews = 2000) {
  console.log(`\n===========================================================`);
  console.log(`🚀 Syncing up to ${maxReviews} reviews (+ R2 photos) for: "${profile.businessName}" (${profile.slug})`);
  console.log(`   Location: ${profile.borough || profile.city || 'NYC'}`);
  console.log(`===========================================================`);

  const googleUrl = profile.platformReviews?.find((p: any) => p.platform === 'GOOGLE')?.profileUrl;
  const yelpUrl = profile.platformReviews?.find((p: any) => p.platform === 'YELP')?.profileUrl;
  const homeAdvisorUrl = profile.platformReviews?.find((p: any) => p.platform === 'HOMEADVISOR')?.profileUrl;
  const houzzUrl = profile.platformReviews?.find((p: any) => p.platform === 'HOUZZ')?.profileUrl;

  try {
    const scraped = await orchestrator.scrapeAllPlatforms(
      {
        businessName: profile.businessName,
        borough: profile.borough || undefined,
        city: profile.city || undefined,
        googleUrl,
        yelpUrl,
        homeAdvisorUrl,
        houzzUrl,
      },
      maxReviews
    );

    console.log(`📊 Scrape Result:`);
    console.log(`   - Composite Rating: ${scraped.compositeRating} ⭐`);
    console.log(`   - Total Reviews Count: ${scraped.totalReviews}`);
    console.log(`   - Written Reviews Extracted: ${scraped.allReviews.length}`);

    // Persist discovered official website URL if provider had none
    const existingSite = ScraperHttpUtil.normalizeOfficialWebsiteUrl(profile.websiteUrl);
    if (!existingSite && scraped.discoveredWebsiteUrl) {
      const cleanDiscovered = ScraperHttpUtil.normalizeOfficialWebsiteUrl(scraped.discoveredWebsiteUrl);
      if (cleanDiscovered) {
        await prisma.providerProfile.update({
          where: { id: profile.id },
          data: { websiteUrl: cleanDiscovered },
        });
        console.log(`   🌐 Saved discovered official website: ${cleanDiscovered}`);
      }
    }

    // 1. Update Platform Reviews
    const platformEntries: Array<[ReviewPlatform, any]> = [
      ['GOOGLE', scraped.platforms.google],
      ['YELP', scraped.platforms.yelp],
      ['HOMEADVISOR', scraped.platforms.homeadvisor],
      ['HOUZZ', scraped.platforms.houzz],
    ];
    for (const [plat, data] of platformEntries) {
      if (data && data.totalReviews > 0) {
        await prisma.platformReview.upsert({
          where: {
            providerProfileId_platform: {
              providerProfileId: profile.id,
              platform: plat,
            },
          },
          update: {
            rating: data.rating,
            reviewCount: data.totalReviews,
            profileUrl: data.profileUrl,
            lastScrapedAt: new Date(),
          },
          create: {
            providerProfileId: profile.id,
            platform: plat,
            rating: data.rating,
            reviewCount: data.totalReviews,
            profileUrl: data.profileUrl,
            lastScrapedAt: new Date(),
          },
        });
      }
    }

    // 2. Save individual review comments + upload ALL reviewer avatars & customer-shared review photos into R2
    let savedComments = 0;
    let uploadedReviewPhotos = 0;
    const avatarCache = new Map<string, string | null>();
    const reviewPhotoCache = new Map<string, string | null>();
    const cappedReviews = scraped.allReviews.slice(0, maxReviews);

    for (let idx = 0; idx < cappedReviews.length; idx++) {
      const rev = cappedReviews[idx];
      if (!rev.comment || rev.comment.trim().length < 5) continue;
      const platformEnum = rev.platform as ReviewPlatform;
      const intRating = Math.min(5, Math.max(1, Math.round(Number(rev.rating) || 5)));
      const safeAuthorName = (rev.authorName || '').trim() || `Verified Reviewer #${idx + 1}`;
      const rawAvatar = (rev.authorAvatarUrl || '').trim();
      let storedAvatarKey: string | null = null;
      if (rawAvatar) {
        if (avatarCache.has(rawAvatar)) {
          storedAvatarKey = avatarCache.get(rawAvatar) ?? null;
        } else {
          storedAvatarKey = await ingestImageToR2(
            rawAvatar,
            `providers/avatars/${hashAssetUrl(rawAvatar)}`
          );
          avatarCache.set(rawAvatar, storedAvatarKey);
        }
      }

      const storedPhotoKeys: string[] = [];
      if (Array.isArray(rev.photoUrls) && rev.photoUrls.length > 0) {
        for (const rawPh of rev.photoUrls.slice(0, 8)) {
          const cleanPh = (rawPh || '').trim();
          if (!cleanPh) continue;
          let phKey: string | null = null;
          if (reviewPhotoCache.has(cleanPh)) {
            phKey = reviewPhotoCache.get(cleanPh) ?? null;
          } else {
            phKey = await ingestImageToR2(
              cleanPh,
              `providers/review-photos/${profile.slug}/${hashAssetUrl(cleanPh)}`
            );
            reviewPhotoCache.set(cleanPh, phKey);
          }
          if (phKey) {
            storedPhotoKeys.push(phKey);
            uploadedReviewPhotos++;
          }
        }
      }

      try {
        const upserted = await prisma.scrapedReview.upsert({
          where: {
            providerProfileId_platform_authorName_rating: {
              providerProfileId: profile.id,
              platform: platformEnum,
              authorName: safeAuthorName,
              rating: intRating,
            },
          },
          update: {
            comment: rev.comment,
            ...(storedAvatarKey ? { authorAvatarUrl: storedAvatarKey } : {}),
            reviewDate: rev.reviewDate || null,
            sourceUrl: rev.sourceUrl || null,
          },
          create: {
            providerProfileId: profile.id,
            platform: platformEnum,
            authorName: safeAuthorName,
            authorAvatarUrl: storedAvatarKey,
            rating: intRating,
            comment: rev.comment,
            reviewDate: rev.reviewDate || null,
            sourceUrl: rev.sourceUrl || null,
            isVerified: rev.isVerified ?? true,
          },
        });

        if (storedPhotoKeys.length > 0) {
          await prisma.$executeRawUnsafe(
            `UPDATE \`scraped_reviews\` SET \`photo_urls\` = ? WHERE \`id\` = ?`,
            JSON.stringify(storedPhotoKeys),
            upserted.id
          );
        }
        savedComments++;
      } catch { }
    }

    console.log(
      `   ✓ Saved ${savedComments} review comments (${uploadedReviewPhotos} customer review photos in R2)`
    );

    // 3. Recompute compositeRating & totalReviews from DB PlatformReviews
    const allPlats = await prisma.platformReview.findMany({
      where: { providerProfileId: profile.id, reviewCount: { gt: 0 } },
    });
    const totalRevCount = allPlats.reduce((acc, p) => acc + p.reviewCount, 0);
    const compRating =
      totalRevCount > 0
        ? Math.round(
          (allPlats.reduce((acc, p) => acc + Number(p.rating) * p.reviewCount, 0) /
            totalRevCount) *
          10
        ) / 10
        : scraped.compositeRating;

    if (totalRevCount > 0) {
      await prisma.providerProfile.update({
        where: { id: profile.id },
        data: {
          compositeRating: compRating,
          totalReviews: totalRevCount,
        },
      });
    }

    // 4. Refresh 500-review AI review summary & highlight tags across Google, Houzz, Yelp & HomeAdvisor
    const dbReviews = await prisma.scrapedReview.findMany({
      where: {
        providerProfileId: profile.id,
        platform: {
          in: ['GOOGLE', 'HOUZZ', 'YELP', 'HOMEADVISOR'],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 2500,
    });
    if (dbReviews.length > 0) {
      try {
        const analysis = await aiService.analyzeContractorReviews({
          businessName: profile.businessName,
          reviews: dbReviews.map((r) => ({
            comment: r.comment,
            rating: r.rating,
            authorName: r.authorName,
            platform: r.platform,
            reviewDate: r.reviewDate || undefined,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
          })),
          maxReviews: 500,
        });
        if (analysis && analysis.summary.length >= 35) {
          await prisma.providerProfile.update({
            where: { id: profile.id },
            data: {
              aiReviewSummary: analysis.summary,
              aiSummaryUpdatedAt: new Date(),
            },
          });
          await prisma.$executeRawUnsafe(
            `UPDATE \`provider_profiles\` SET \`ai_review_analysis\` = ? WHERE \`id\` = ?`,
            JSON.stringify(analysis),
            profile.id
          );
          console.log(
            `   🤖 Updated AI review summary (${analysis.analyzedCount} recent reviews, ${analysis.tags.length} tags)`
          );
        }
      } catch (aiErr: any) {
        console.warn(`   ⚠️ AI summary skipped: ${aiErr.message}`);
      }
    }

    console.log(`🎉 Finished syncing: ${profile.businessName}`);
  } catch (err: any) {
    console.error(`❌ Error syncing "${profile.businessName}":`, err.message);
  }
}

async function run() {
  const args = process.argv.slice(2);
  const slugArg = args.find((a) => a.startsWith('--slug='))?.replace('--slug=', '') || args.find((a) => !a.startsWith('--'));
  const maxArg = args.find((a) => a.startsWith('--max='))?.replace('--max=', '');
  const maxReviews = maxArg ? Number(maxArg) : 2000;
  const isAll = args.includes('--all') || slugArg === 'all';

  console.log('🔗 Connecting to database...');
  const resolvedUrl = await resolveDatabaseUrlIpv4(process.env.DATABASE_URL);
  prisma = new PrismaClient(
    resolvedUrl ? { datasources: { db: { url: resolvedUrl } } } : undefined
  );
  await prisma.$connect();
  await ensureReviewColumns();

  try {
    if (isAll) {
      const providers = await prisma.providerProfile.findMany({
        where: { isActive: true },
        include: { platformReviews: true },
        orderBy: { compositeRating: 'desc' },
      });
      console.log(`📋 Found ${providers.length} active providers to sync.`);
      for (const p of providers) {
        await syncSingleProviderReviews(p, maxReviews);
      }
    } else if (slugArg) {
      const provider = await prisma.providerProfile.findUnique({
        where: { slug: slugArg },
        include: { platformReviews: true },
      });
      if (!provider) {
        console.error(`❌ No provider found with slug: "${slugArg}"`);
        process.exit(1);
      }
      await syncSingleProviderReviews(provider, maxReviews);
    } else {
      console.log(`
Usage:
  npm run sync:reviews -- --slug=<contractor-slug> [--max=2000]
  npm run sync:reviews -- --all [--max=2000]
      `);
    }
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  run();
}
