import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { AiReviewSummaryService } from '../src/providers/ai-review-summary.service';
import { resolveDatabaseUrlIpv4 } from '../src/prisma/prisma.service';

let prisma: PrismaClient;
const aiService = new AiReviewSummaryService();

async function ensureAiColumn() {
  const cols = await prisma.$queryRawUnsafe<Array<{ Field: string }>>(
    `SHOW COLUMNS FROM \`provider_profiles\` LIKE 'ai_review_analysis'`
  );
  if (!Array.isArray(cols) || cols.length === 0) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE \`provider_profiles\` ADD COLUMN \`ai_review_analysis\` JSON NULL`
    );
    console.log('✓ Added ai_review_analysis JSON column to provider_profiles');
  }
}

async function main() {
  const args = process.argv.slice(2);
  const slugArg =
    args.find((a) => a.startsWith('--slug='))?.replace('--slug=', '') ||
    args.find((a) => !a.startsWith('--')) ||
    '';
  const maxArg = args.find((a) => a.startsWith('--max='))?.replace('--max=', '');
  const maxReviews = maxArg ? Math.min(500, Math.max(1, Number(maxArg))) : 500;

  console.log('=======================================================================');
  console.log(`🤖 AI Review Summary & Tags Generator (Max Window: ${maxReviews} recent reviews)`);
  console.log('   Platforms: Google · Houzz · Yelp · HomeAdvisor (No minimum cutoff)');
  console.log('=======================================================================\n');

  const resolvedDbUrl = await resolveDatabaseUrlIpv4(process.env.DATABASE_URL);
  prisma = new PrismaClient(
    resolvedDbUrl ? { datasources: { db: { url: resolvedDbUrl } } } : undefined
  );

  await prisma.$connect();
  await ensureAiColumn();

  try {
    const providers = await prisma.providerProfile.findMany({
      where: slugArg ? { slug: slugArg } : { isActive: true },
      include: {
        listings: {
          include: {
            category: true,
            subServices: {
              include: { subService: true },
            },
          },
        },
      },
      orderBy: { compositeRating: 'desc' },
    });

    console.log(`Found ${providers.length} targeted contractor(s).\n`);

    let generated = 0;
    let skippedZero = 0;

    for (let i = 0; i < providers.length; i++) {
      const p = providers[i];
      console.log(`[${i + 1}/${providers.length}] Analyzing "${p.businessName}" (${p.slug})...`);

      const dbReviews = await prisma.scrapedReview.findMany({
        where: {
          providerProfileId: p.id,
          platform: {
            in: ['GOOGLE', 'HOUZZ', 'YELP', 'HOMEADVISOR'],
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 2500,
      });

      const primaryCategory = p.listings?.[0]?.category?.name || undefined;
      const services: string[] = Array.from(
        new Set<string>(
          (p.listings || []).flatMap((l: any) =>
            (l.subServices || []).map((ss: any) => String(ss.subService.name))
          )
        )
      );

      const analysis = await aiService.analyzeContractorReviews({
        businessName: p.businessName,
        category: primaryCategory,
        services,
        reviews: dbReviews.map((r: any) => ({
          comment: r.comment,
          rating: r.rating,
          authorName: r.authorName,
          platform: r.platform,
          reviewDate: r.reviewDate || undefined,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        })),
        maxReviews,
      });

      if (!analysis) {
        await prisma.providerProfile.update({
          where: { id: p.id },
          data: {
            aiReviewSummary: null,
            aiSummaryUpdatedAt: null,
          },
        });
        await prisma.$executeRawUnsafe(
          `UPDATE \`provider_profiles\` SET \`ai_review_analysis\` = NULL WHERE \`id\` = ?`,
          p.id
        );
        skippedZero++;
        console.log(`   ℹ️ 0 clean text reviews — cleared summary.\n`);
        continue;
      }

      await prisma.providerProfile.update({
        where: { id: p.id },
        data: {
          aiReviewSummary: analysis.summary,
          aiSummaryUpdatedAt: new Date(),
        },
      });
      await prisma.$executeRawUnsafe(
        `UPDATE \`provider_profiles\` SET \`ai_review_analysis\` = ? WHERE \`id\` = ?`,
        JSON.stringify(analysis),
        p.id
      );
      generated++;

      console.log(
        `   ✅ Analyzed ${analysis.analyzedCount} recent review(s) (${JSON.stringify(
          analysis.platformsIncluded
        )})`
      );
      console.log(`   📌 Headline: ${analysis.verdictHeadline}`);
      console.log(
        `   🏷️  Tags (${analysis.tags.length}): ${analysis.tags
          .map((t) => `${t.label} [${t.mentionCount}]`)
          .join(' | ')}\n`
      );
    }

    console.log('=======================================================================');
    console.log(`🎉 Done! Generated: ${generated} | Zero-review skipped: ${skippedZero}`);
    console.log('=======================================================================');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('❌ AI summary backfill failed:', err);
  process.exit(1);
});
