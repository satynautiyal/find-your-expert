import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

import { PrismaClient, ReviewPlatform } from '@prisma/client';
import { GoogleReviewsScraperService } from '../src/scrapers/google/google-reviews-scraper.service';
import { YelpReviewsScraperService } from '../src/scrapers/yelp/yelp-reviews-scraper.service';
import { FacebookReviewsScraperService } from '../src/scrapers/facebook/facebook-reviews-scraper.service';
import { ReviewsScraperService } from '../src/scrapers/reviews-scraper.service';

const prisma = new PrismaClient();
const googleScraper = new GoogleReviewsScraperService();
const yelpScraper = new YelpReviewsScraperService();
const fbScraper = new FacebookReviewsScraperService();
const orchestrator = new ReviewsScraperService(googleScraper, yelpScraper, fbScraper);

async function syncSingleProvider(profile: any) {
  console.log(`\n===========================================================`);
  console.log(`🚀 Syncing reviews for: "${profile.businessName}" (${profile.slug})`);
  console.log(`   Location: ${profile.borough || profile.city || 'NYC'}`);
  console.log(`===========================================================`);

  const googleUrl = profile.platformReviews?.find((p: any) => p.platform === 'GOOGLE')?.profileUrl;
  const yelpUrl = profile.platformReviews?.find((p: any) => p.platform === 'YELP')?.profileUrl;
  const facebookUrl = profile.platformReviews?.find((p: any) => p.platform === 'FACEBOOK')?.profileUrl;

  try {
    const scraped = await orchestrator.scrapeAllPlatforms(
      {
        businessName: profile.businessName,
        borough: profile.borough || undefined,
        city: profile.city || undefined,
        googleUrl,
        yelpUrl,
        facebookUrl,
      },
      30
    );

    console.log(`📊 Scrape Result:`);
    console.log(`   - Composite Rating: ${scraped.compositeRating} ⭐`);
    console.log(`   - Total Reviews Count: ${scraped.totalReviews}`);
    console.log(`   - Comments Extracted: ${scraped.allReviews.length}`);

    // 1. Update Platform Reviews
    if (scraped.platforms.google && scraped.platforms.google.totalReviews > 0) {
      await prisma.platformReview.upsert({
        where: {
          providerProfileId_platform: {
            providerProfileId: profile.id,
            platform: 'GOOGLE',
          },
        },
        update: {
          rating: scraped.platforms.google.rating,
          reviewCount: scraped.platforms.google.totalReviews,
          profileUrl: scraped.platforms.google.profileUrl,
          lastScrapedAt: new Date(),
        },
        create: {
          providerProfileId: profile.id,
          platform: 'GOOGLE',
          rating: scraped.platforms.google.rating,
          reviewCount: scraped.platforms.google.totalReviews,
          profileUrl: scraped.platforms.google.profileUrl,
          lastScrapedAt: new Date(),
        },
      });
      console.log(`   ✓ Saved Google platform ratings`);
    }

    if (scraped.platforms.yelp && scraped.platforms.yelp.totalReviews > 0) {
      await prisma.platformReview.upsert({
        where: {
          providerProfileId_platform: {
            providerProfileId: profile.id,
            platform: 'YELP',
          },
        },
        update: {
          rating: scraped.platforms.yelp.rating,
          reviewCount: scraped.platforms.yelp.totalReviews,
          profileUrl: scraped.platforms.yelp.profileUrl,
          lastScrapedAt: new Date(),
        },
        create: {
          providerProfileId: profile.id,
          platform: 'YELP',
          rating: scraped.platforms.yelp.rating,
          reviewCount: scraped.platforms.yelp.totalReviews,
          profileUrl: scraped.platforms.yelp.profileUrl,
          lastScrapedAt: new Date(),
        },
      });
      console.log(`   ✓ Saved Yelp platform ratings`);
    }

    // 2. Save individual review comments
    let savedComments = 0;
    for (const rev of scraped.allReviews) {
      if (!rev.comment || rev.comment.trim().length < 5) continue;
      const platformEnum = rev.platform as ReviewPlatform;

      try {
        await prisma.scrapedReview.upsert({
          where: {
            providerProfileId_platform_authorName_rating: {
              providerProfileId: profile.id,
              platform: platformEnum,
              authorName: rev.authorName || 'Reviewer',
              rating: rev.rating || 5,
            },
          },
          update: {
            authorAvatarUrl: rev.authorAvatarUrl || null,
            reviewDate: rev.reviewDate || null,
            sourceUrl: rev.sourceUrl || null,
          },
          create: {
            providerProfileId: profile.id,
            platform: platformEnum,
            authorName: rev.authorName || 'Reviewer',
            authorAvatarUrl: rev.authorAvatarUrl || null,
            rating: rev.rating || 5,
            comment: rev.comment,
            reviewDate: rev.reviewDate || null,
            sourceUrl: rev.sourceUrl || null,
            isVerified: rev.isVerified ?? true,
          },
        });
        savedComments++;
      } catch {
        // Silently skip duplicate constraint errors
      }
    }
    console.log(`   ✓ Saved ${savedComments} individual review comments`);

    // 3. Update Provider Profile summary
    if (scraped.totalReviews > 0) {
      await prisma.providerProfile.update({
        where: { id: profile.id },
        data: {
          compositeRating: scraped.compositeRating,
          totalReviews: scraped.totalReviews,
        },
      });
      console.log(`   ✓ Updated Provider composite rating to ${scraped.compositeRating}`);
    }

    console.log(`🎉 Finished syncing: ${profile.businessName}`);
  } catch (err: any) {
    console.error(`❌ Error syncing "${profile.businessName}":`, err.message);
  }
}

async function run() {
  const args = process.argv.slice(2);
  const slugArg = args.find((a) => a.startsWith('--slug='))?.replace('--slug=', '') || args[0];
  const isAll = args.includes('--all') || slugArg === 'all';

  console.log('🔗 Connecting to database...');
  await prisma.$connect();

  try {
    if (isAll) {
      const providers = await prisma.providerProfile.findMany({
        where: { isActive: true },
        include: { platformReviews: true },
        orderBy: { totalReviews: 'desc' },
      });

      console.log(`Found ${providers.length} active providers to sync.`);
      for (let i = 0; i < providers.length; i++) {
        const p = providers[i];
        console.log(`\n[${i + 1}/${providers.length}] Starting: ${p.businessName}`);
        await syncSingleProvider(p);
        // Small delay between providers to be polite to servers
        await new Promise((r) => setTimeout(r, 3000));
      }
    } else if (slugArg) {
      const provider = await prisma.providerProfile.findUnique({
        where: { slug: slugArg },
        include: { platformReviews: true },
      });

      if (!provider) {
        console.error(`❌ Provider with slug "${slugArg}" not found in database.`);
        process.exit(1);
      }

      await syncSingleProvider(provider);
    } else {
      console.log('\nUsage:');
      console.log('  npx ts-node scripts/sync-reviews-worker.ts --slug=<provider-slug>');
      console.log('  npx ts-node scripts/sync-reviews-worker.ts --all');
      process.exit(0);
    }

    console.log('\n✅ Sync task completed successfully!');
  } finally {
    await prisma.$disconnect();
  }
}

run().catch((err) => {
  console.error('\n💥 Fatal Error:', err);
  process.exit(1);
});
