import * as dotenv from 'dotenv';
import * as path from 'path';
import { randomUUID } from 'crypto';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

import { PrismaClient, PhotoCategory, Prisma } from '@prisma/client';
import { ProjectsScraperService } from '../src/scrapers/projects/projects-scraper.service';
import { ScraperHttpUtil } from '../src/scrapers/utils/scraper-http.util';
import { AiReviewSummaryService } from '../src/providers/ai-review-summary.service';
import { ingestImageToR2, uploadBufferToR2, hashAssetUrl } from './utils/r2-upload';

const prisma = new PrismaClient();
const projectsScraper = new ProjectsScraperService();
const aiService = new AiReviewSummaryService();

async function ensureTeamMembersTable() {
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
}

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>
) {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      await worker(items[i], i);
    }
  });
  await Promise.all(runners);
}

async function main() {
  const args = process.argv.slice(2);
  const skipProjects = args.includes('--skip-projects');
  const filterSlug = args.find((a) => !a.startsWith('--'))?.trim() || '';

  console.log('===================================================================');
  console.log(
    '🏗️  Scraping Contractor Website Brand, AI Bio, Team & Project Albums -> R2'
  );
  console.log('===================================================================\n');

  await ensureTeamMembersTable();

  const providers = await prisma.providerProfile.findMany({
    where: filterSlug ? { slug: filterSlug } : { isActive: true },
    include: {
      listings: {
        include: {
          category: true,
          subServices: { include: { subService: true } },
          serviceAreas: true,
          photos: { orderBy: { orderIndex: 'asc' } },
        },
      },
      platformReviews: true,
      projects: { select: { id: true } },
    },
    orderBy: { compositeRating: 'desc' },
  });

  console.log(`Found ${providers.length} contractor(s) to sync.\n`);

  let totalProjectsSaved = 0;
  let totalPhotosSaved = 0;
  let totalTeamSaved = 0;

  for (let i = 0; i < providers.length; i++) {
    const p = providers[i];
    const primaryListing = p.listings[0];
    const fallbackHz = p.websiteUrl?.includes('houzz.com') ? p.websiteUrl : null;
    const houzzUrl =
      p.platformReviews.find((r) => r.platform === 'HOUZZ')?.profileUrl || fallbackHz;

    console.log(`\n[${i + 1}/${providers.length}] 🔎 ${p.businessName} (${p.slug})`);

    const brandAndProjects = await projectsScraper.scrapeProviderBrandAndProjects({
      businessName: p.businessName,
      boroughOrCity: p.borough || p.city,
      houzzUrl,
      websiteUrl: p.websiteUrl,
      maxProjects: 12,
      maxPhotosPerProject: 12,
      skipProjects,
    });

    // 1. Official Website Brand Logo -> R2
    let newLogoKey: string | null = null;
    if (brandAndProjects.logoSourceUrl) {
      const h = hashAssetUrl(brandAndProjects.logoSourceUrl).slice(0, 8);
      newLogoKey = await ingestImageToR2(
        brandAndProjects.logoSourceUrl,
        `providers/logos/${p.slug}-site-${h}`
      );
    }
    if (!newLogoKey && brandAndProjects.logoPngBuffer && brandAndProjects.logoPngBuffer.length > 200) {
      const h = hashAssetUrl(`${p.slug}-${brandAndProjects.logoPngBuffer.length}`).slice(0, 8);
      newLogoKey = await uploadBufferToR2(
        brandAndProjects.logoPngBuffer,
        `providers/logos/${p.slug}-site-${h}.png`,
        'image/png'
      );
    }

    // 2. Official Website "About" Description -> AI Rewritten SEO-Original Bio
    const categoryName = primaryListing?.category?.name || undefined;
    const serviceNames =
      p.listings.flatMap(
        (l) => l.subServices?.map((ss) => ss.subService?.name).filter(Boolean) || []
      ) || [];
    const areaNames =
      p.listings.flatMap(
        (l) => l.serviceAreas?.map((sa) => sa.areaName).filter(Boolean) || []
      ) || [];

    let aiAboutDesc: string | null = null;
    try {
      const rewritten = await aiService.rewriteBusinessDescription({
        businessName: p.businessName,
        category: categoryName,
        services: serviceNames,
        boroughOrCity: p.borough || p.city || undefined,
        serviceAreas: areaNames,
        sinceYear: p.sinceYear,
        isLicensed: p.isLicensed,
        isInsured: p.isInsured,
        hasWarranty: p.hasWarranty,
        rawWebsiteAbout: brandAndProjects.websiteAboutDescription,
        fallbackBio: p.description,
      });
      if (rewritten && rewritten.length >= 35) {
        aiAboutDesc = rewritten;
      }
    } catch (err: any) {
      console.warn(`   ⚠️ AI About rewrite skipped: ${err.message}`);
    }

    const finalSite =
      brandAndProjects.officialWebsiteUrl ||
      ScraperHttpUtil.normalizeOfficialWebsiteUrl(p.websiteUrl) ||
      null;

    const brandUpdate: Prisma.ProviderProfileUpdateInput = {};
    if (finalSite !== (p.websiteUrl || null)) brandUpdate.websiteUrl = finalSite;
    if (newLogoKey) brandUpdate.logoUrl = newLogoKey;
    if (aiAboutDesc) brandUpdate.description = aiAboutDesc;
    if (Object.keys(brandUpdate).length > 0) {
      await prisma.providerProfile.update({
        where: { id: p.id },
        data: brandUpdate,
      });
    }

    // 3. Official Website "The team" -> R2 Headshots + AI-Rewritten Bios
    await prisma.$executeRawUnsafe(
      `DELETE FROM \`provider_team_members\` WHERE \`providerProfileId\` = ?`,
      p.id
    );
    if (brandAndProjects.officialWebsiteUrl && brandAndProjects.teamMembers.length > 0) {
      for (let mIdx = 0; mIdx < brandAndProjects.teamMembers.length; mIdx++) {
        const member = brandAndProjects.teamMembers[mIdx];
        let r2TeamImg: string | null = null;
        if (member.photoSourceUrl) {
          const mSlug = projectsScraper.slugify(member.name) || `member-${mIdx + 1}`;
          const mHash = hashAssetUrl(member.photoSourceUrl).slice(0, 8);
          r2TeamImg = await ingestImageToR2(
            member.photoSourceUrl,
            `providers/team/${p.slug}/${mSlug}-${mHash}`
          );
        }
        let memberBio: string | null = null;
        if (member.bio && member.bio.trim().length >= 20) {
          try {
            const rewrittenBio = await aiService.rewriteTeamMemberBio({
              businessName: p.businessName,
              memberName: member.name,
              role: member.role,
              credentials: member.credentials,
              rawBio: member.bio,
            });
            if (rewrittenBio && rewrittenBio.length >= 15) memberBio = rewrittenBio;
          } catch {}
        }
        await prisma.$executeRawUnsafe(
          `INSERT INTO \`provider_team_members\` (\`id\`, \`providerProfileId\`, \`name\`, \`role\`, \`credentials\`, \`bio\`, \`imageUrl\`, \`sourceUrl\`, \`orderIndex\`, \`createdAt\`, \`updatedAt\`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3))`,
          randomUUID(),
          p.id,
          member.name.slice(0, 180),
          member.role ? member.role.slice(0, 180) : null,
          member.credentials ? member.credentials.slice(0, 180) : null,
          memberBio,
          r2TeamImg,
          member.sourceUrl || finalSite,
          mIdx
        );
        totalTeamSaved++;
      }
      console.log(`   👥 Saved ${brandAndProjects.teamMembers.length} website team member(s) in R2`);
    }

    if (skipProjects) continue;

    // 4. Website-First Project Albums (+ Houzz Fallback) -> R2 Photos + AI-Rewritten Descriptions
    const uploadedProjects: Array<{
      title: string;
      slug: string;
      description?: string;
      location?: string;
      projectYear?: number;
      costRange?: string;
      serviceCategory?: string;
      sourceUrl?: string;
      photos: Array<{
        r2Key: string;
        caption?: string;
        width?: number;
        height?: number;
      }>;
    }> = [];

    for (const proj of brandAndProjects.projects) {
      const uploadedPhotos: Array<{
        order: number;
        r2Key: string;
        caption?: string;
        width?: number;
        height?: number;
      }> = [];

      await runWithConcurrency(proj.photos, 6, async (photo, pIdx) => {
        const shortHash = hashAssetUrl(photo.sourceUrl);
        const keyBase = `providers/projects/${p.slug}/${proj.slug}/${String(
          pIdx + 1
        ).padStart(2, '0')}-${shortHash}`;
        const r2Key = await ingestImageToR2(photo.sourceUrl, keyBase);
        if (r2Key) {
          uploadedPhotos.push({
            order: pIdx,
            r2Key,
            caption: photo.caption,
            width: photo.width,
            height: photo.height,
          });
        }
      });

      uploadedPhotos.sort((a, b) => a.order - b.order);
      if (uploadedPhotos.length > 0) {
        totalPhotosSaved += uploadedPhotos.length;

        let aiProjDesc: string | undefined;
        try {
          aiProjDesc = await aiService.rewriteProjectDescription({
            businessName: p.businessName,
            category: categoryName,
            services: serviceNames,
            boroughOrCity: p.borough || p.city || undefined,
            title: proj.title,
            rawDescription: proj.description,
            location: proj.location,
            projectYear: proj.projectYear,
            costRange: proj.costRange,
            photoCount: uploadedPhotos.length,
            photoCaptions: uploadedPhotos.map((ph) => ph.caption || '').filter(Boolean),
          });
        } catch {}

        uploadedProjects.push({
          title: proj.title,
          slug: proj.slug,
          description: aiProjDesc || undefined,
          location: proj.location,
          projectYear: proj.projectYear,
          costRange: proj.costRange,
          serviceCategory: proj.serviceCategory,
          sourceUrl: proj.sourceUrl,
          photos: uploadedPhotos.map(({ r2Key, caption, width, height }) => ({
            r2Key,
            caption,
            width,
            height,
          })),
        });
      }
    }

    if (uploadedProjects.length > 0) {
      await prisma.providerProject.deleteMany({
        where: { providerProfileId: p.id },
      });

      for (let projIdx = 0; projIdx < uploadedProjects.length; projIdx++) {
        const up = uploadedProjects[projIdx];
        await prisma.providerProject.create({
          data: {
            providerProfileId: p.id,
            title: up.title,
            slug: up.slug,
            description: up.description || null,
            location: up.location || null,
            projectYear: up.projectYear || null,
            costRange: up.costRange || null,
            serviceCategory: up.serviceCategory || null,
            sourceUrl: up.sourceUrl || null,
            coverImageUrl: up.photos[0].r2Key,
            photoCount: up.photos.length,
            orderIndex: projIdx,
            photos: {
              create: up.photos.map((ph, phIdx) => ({
                imageUrl: ph.r2Key,
                caption: ph.caption || null,
                width: ph.width || null,
                height: ph.height || null,
                orderIndex: phIdx,
              })),
            },
          },
        });
      }

      totalProjectsSaved += uploadedProjects.length;

      const showcasePhotos: Array<{ r2Key: string; caption: string }> = [];
      const seenKeys = new Set<string>();
      const maxDepth = Math.max(...uploadedProjects.map((x) => x.photos.length));

      for (let depth = 0; depth < maxDepth && showcasePhotos.length < 12; depth++) {
        for (const up of uploadedProjects) {
          if (showcasePhotos.length >= 12) break;
          const ph = up.photos[depth];
          if (!ph || seenKeys.has(ph.r2Key)) continue;
          seenKeys.add(ph.r2Key);
          showcasePhotos.push({
            r2Key: ph.r2Key,
            caption: ph.caption || up.title,
          });
        }
      }

      if (primaryListing && showcasePhotos.length > 0) {
        await prisma.listingPhoto.deleteMany({
          where: { listingId: primaryListing.id },
        });
        await prisma.listingPhoto.createMany({
          data: showcasePhotos.map((sp, idx) => ({
            listingId: primaryListing.id,
            imageUrl: sp.r2Key,
            caption: sp.caption,
            category: idx === 0 ? PhotoCategory.HERO : PhotoCategory.PORTFOLIO,
            orderIndex: idx,
          })),
        });
        await prisma.providerProfile.update({
          where: { id: p.id },
          data: { coverImageUrl: showcasePhotos[0].r2Key },
        });
      }

      console.log(
        `   ✅ Saved ${uploadedProjects.length} AI-rewritten project album(s) [${brandAndProjects.sourceUsed}] into R2 + DB`
      );
    } else {
      console.log(`   ⚠️  0 structured project albums found for ${p.businessName}`);
    }
  }

  console.log('\n===================================================================');
  console.log(
    `🎉 Done! Saved ${totalProjectsSaved} project albums (${totalPhotosSaved} R2 photos) & ${totalTeamSaved} team member(s).`
  );
  console.log('===================================================================');
}

main()
  .catch((e) => {
    console.error('❌ Project/Brand/Team scraping failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
