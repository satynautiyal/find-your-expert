import * as dotenv from 'dotenv';
import * as path from 'path';
import { execFileSync } from 'child_process';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { resolveDatabaseUrlIpv4 } from '../src/prisma/prisma.service';
import { syncSingleProviderReviews } from './sync-reviews-worker';

let prisma = new PrismaClient();

/**
 * Permanent Master Scraper Pipeline (`npm run scrape:full` or `npm run scrape:full -- <slug>`)
 * Executes end-to-end for every targeted contractor:
 *   1. Official Website Discovery (never storing Houzz/directory URLs as websiteUrl)
 *   2. Official Website Brand Logo -> Cloudflare R2 (`providers/logos/...`)
 *   3. Official Website "About" Description -> AI-rewritten SEO-original description
 *   4. Official Website "The team" -> Cloudflare R2 headshots (`providers/team/...`) + AI bios
 *   5. Official Website-First Project Albums (+ Houzz fallback) -> R2 photos + AI project descriptions
 *   6. Up to 2,000 Reviews across Google / Yelp / HomeAdvisor / Houzz -> R2 avatars + R2 review photos
 *   7. Progressive AI Review Summary
 */
async function main() {
  const args = process.argv.slice(2);
  const slugArg =
    args.find((a) => a.startsWith('--slug='))?.replace('--slug=', '') ||
    args.find((a) => !a.startsWith('--')) ||
    '';

  console.log('=======================================================================');
  console.log('🚀 Running Full Permanent Contractor Scraper Pipeline (R2 + AI + Team)');
  console.log('=======================================================================\n');

  // Step 1-5: Website Brand Logo + AI About Bio + Website Team + Website/Houzz Projects
  const tsNodeBin = path.resolve(
    __dirname,
    '../node_modules/.bin',
    process.platform === 'win32' ? 'ts-node.cmd' : 'ts-node'
  );
  const projectScript = path.resolve(__dirname, 'scrape-project-photos.ts');
  execFileSync(tsNodeBin, slugArg ? [projectScript, slugArg] : [projectScript], {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..'),
    shell: process.platform === 'win32',
  });

  // Step 6-7: Up to 2,000 Reviews + R2 Customer Review Photos + Progressive AI Summary
  const resolvedUrl = await resolveDatabaseUrlIpv4(process.env.DATABASE_URL);
  prisma = new PrismaClient(
    resolvedUrl ? { datasources: { db: { url: resolvedUrl } } } : undefined
  );
  await prisma.$connect();
  try {
    const providers = await prisma.providerProfile.findMany({
      where: slugArg ? { slug: slugArg } : { isActive: true },
      include: { platformReviews: true },
      orderBy: { compositeRating: 'desc' },
    });

    for (const p of providers) {
      await syncSingleProviderReviews(p, 2000);
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n✅ Full Permanent Contractor Scraper Pipeline Completed Successfully!');
}

main().catch((err) => {
  console.error('❌ Full scraper pipeline failed:', err);
  process.exit(1);
});

