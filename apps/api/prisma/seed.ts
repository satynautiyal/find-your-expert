import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env explicitly before reading process.env or instantiating PrismaClient
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

import { PrismaClient, PricingType, ListingStatus } from '@prisma/client';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as fs from 'fs';

const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════
// CLOUDFLARE R2 OBJECT STORAGE CONFIG
// ═══════════════════════════════════════════════════════
const r2AccountId = process.env.R2_ACCOUNT_ID || '';
const r2AccessKey = process.env.R2_ACCESS_KEY_ID || '';
const r2SecretKey = process.env.R2_SECRET_ACCESS_KEY || '';
const r2BucketName = process.env.R2_BUCKET_NAME || 'findyourexperts-media';

const isR2Ready = Boolean(
  r2AccountId &&
  r2AccessKey &&
  r2SecretKey &&
  !r2AccountId.includes('your_') &&
  !r2AccessKey.includes('your_')
);

let r2Client: S3Client | null = null;
if (isR2Ready) {
  r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: r2AccessKey,
      secretAccessKey: r2SecretKey,
    },
  });
}

/**
 * Downloads image from remote URL and uploads directly to Cloudflare R2 bucket,
 * returning a 12-hour presigned URL.
 */
async function uploadImageToR2(remoteUrl: string, destinationKey: string): Promise<string> {
  if (!isR2Ready || !r2Client || !remoteUrl || !remoteUrl.startsWith('http')) {
    return remoteUrl;
  }
  try {
    const res = await fetch(remoteUrl);
    if (!res.ok) return remoteUrl;
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = res.headers.get('content-type') || 'image/jpeg';

    await r2Client.send(
      new PutObjectCommand({
        Bucket: r2BucketName,
        Key: destinationKey,
        Body: buffer,
        ContentType: contentType,
      })
    );

    // Generate 12-hour presigned URL (43,200 seconds)
    const getCommand = new GetObjectCommand({
      Bucket: r2BucketName,
      Key: destinationKey,
    });
    return await getSignedUrl(r2Client, getCommand, { expiresIn: 12 * 60 * 60 });
  } catch (e: any) {
    console.warn(`   ⚠️ R2 upload skipped for ${destinationKey}: ${e.message}`);
    return remoteUrl;
  }
}

async function main() {
  console.log('===========================================================');
  console.log('🌱 Starting FindYourExperts Database & Media Seeding');
  console.log('===========================================================');
  if (isR2Ready) {
    console.log(`☁️ Cloudflare R2: ACTIVE (Bucket: ${r2BucketName}, Presigned URLs: 12 hours)`);
  } else {
    console.log('☁️ Cloudflare R2: Inactive / Placeholder keys in .env');
    console.log('   (Logos will temporarily keep source links until R2 keys are set)\n');
  }

  // 1. Seed Geographic Hierarchy
  console.log('📍 Seeding Countries, States, and Cities...');
  const country = await prisma.country.upsert({
    where: { slug: 'usa' },
    update: {},
    create: {
      name: 'United States',
      code: 'US',
      slug: 'usa',
    },
  });

  const state = await prisma.state.upsert({
    where: {
      countryId_slug: {
        countryId: country.id,
        slug: 'new-york',
      },
    },
    update: {},
    create: {
      countryId: country.id,
      name: 'New York',
      code: 'NY',
      slug: 'new-york',
    },
  });

  const city = await prisma.city.upsert({
    where: {
      stateId_slug: {
        stateId: state.id,
        slug: 'new-york-city',
      },
    },
    update: {},
    create: {
      stateId: state.id,
      name: 'New York City',
      slug: 'new-york-city',
      boroughs: ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'],
      heroTitle: 'Top-Rated Roofing Experts in NYC',
      heroSubtitle:
        'Compare licensed, vetted roof repair and replacement specialists across all 5 boroughs.',
    },
  });

  // 2. Seed Service Categories & Sub-Services
  console.log('🛠️ Seeding Service Categories & Sub-services...');
  const roofingCategory = await prisma.serviceCategory.upsert({
    where: { slug: 'roofing' },
    update: {},
    create: {
      name: 'Roofing',
      slug: 'roofing',
      description: 'Residential and commercial roof repair, replacement, and inspection.',
      icon: 'Home',
      metaTitle: 'Best Roofing Contractors in NYC | FindYourExperts',
      metaDescription: 'Find vetted and licensed roofers in NYC.',
    },
  });

  const subServiceNames = [
    { name: 'Roof Installation', slug: 'roof-installation' },
    { name: 'Repair', slug: 'roof-repair' },
    { name: 'Inspection', slug: 'roof-inspection' },
    { name: 'Waterproofing', slug: 'waterproofing' },
    { name: 'Flat Roof Systems', slug: 'flat-roof-systems' },
    { name: 'Gutter Installation', slug: 'gutter-installation' },
  ];

  const subServiceMap = new Map<string, string>();
  for (const s of subServiceNames) {
    const sub = await prisma.subService.upsert({
      where: {
        categoryId_slug: {
          categoryId: roofingCategory.id,
          slug: s.slug,
        },
      },
      update: {},
      create: {
        categoryId: roofingCategory.id,
        name: s.name,
        slug: s.slug,
        isPopular: true,
      },
    });
    subServiceMap.set(s.name, sub.id);
  }

  // 3. Load Scraped Providers JSON (Only verified emails)
  const jsonPath = path.resolve(__dirname, '../data/scraped-providers.json');
  if (!fs.existsSync(jsonPath)) {
    console.log(`⚠️ Scraped data not found at: ${jsonPath}`);
    console.log('   Run `npm run scrape` first to generate scraped providers.');
    return;
  }

  const providersData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  console.log(`\n💼 Seeding ${providersData.length} email-verified providers into database...\n`);

  let count = 0;
  for (const p of providersData) {
    if (!p.email) continue;

    // 3.1 Upload Logo to Cloudflare R2 Bucket
    let finalLogoUrl = p.logoUrl;
    if (p.logoUrl && isR2Ready) {
      const r2Key = `providers/logos/${p.slug}.jpg`;
      console.log(`   ☁️ Uploading logo to R2: ${r2Key}...`);
      finalLogoUrl = await uploadImageToR2(p.logoUrl, r2Key);
    }

    // 3.2 Create User Account
    const user = await prisma.user.upsert({
      where: { email: p.email },
      update: {},
      create: {
        email: p.email,
        role: 'PROVIDER',
        emailVerified: true,
        status: 'ACTIVE',
      },
    });

    // 3.3 Create Provider Profile
    const profile = await prisma.providerProfile.upsert({
      where: { userId: user.id },
      update: {
        businessName: p.businessName,
        phone: p.phone,
        websiteUrl: p.websiteUrl,
        logoUrl: finalLogoUrl,
        description: p.description,
        address: p.address,
        city: p.city,
        state: p.state,
        zipCode: p.zipCode,
        borough: p.borough,
        sinceYear: p.sinceYear,
        emergencyService: p.emergencyService,
        compositeRating: p.compositeRating,
        totalReviews: p.totalReviews,
        badge: p.badge,
        isVerified: true,
        isActive: true,
      },
      create: {
        userId: user.id,
        businessName: p.businessName,
        slug: p.slug,
        phone: p.phone,
        email: p.email,
        websiteUrl: p.websiteUrl,
        logoUrl: finalLogoUrl,
        description: p.description,
        address: p.address,
        city: p.city,
        state: p.state,
        zipCode: p.zipCode,
        borough: p.borough,
        sinceYear: p.sinceYear,
        emergencyService: p.emergencyService,
        compositeRating: p.compositeRating,
        totalReviews: p.totalReviews,
        badge: p.badge,
        isVerified: true,
        isActive: true,
      },
    });

    // 3.4 Create Default Listing
    const listing = await prisma.listing.upsert({
      where: { slug: `${p.slug}-services` },
      update: {},
      create: {
        providerProfileId: profile.id,
        categoryId: roofingCategory.id,
        cityId: city.id,
        title: `${p.businessName} - Professional Roofing & Repair`,
        slug: `${p.slug}-services`,
        description: p.description,
        pricingType: PricingType.QUOTE_ONLY,
        status: ListingStatus.ACTIVE,
      },
    });

    // 3.5 Link Sub-services
    for (const subName of p.subServices || ['Repair', 'Roof Installation']) {
      const subId = subServiceMap.get(subName) || subServiceMap.get('Repair');
      if (subId) {
        await prisma.listingSubService.upsert({
          where: {
            listingId_subServiceId: {
              listingId: listing.id,
              subServiceId: subId,
            },
          },
          update: {},
          create: {
            listingId: listing.id,
            subServiceId: subId,
          },
        });
      }
    }

    // 3.6 Create Platform Reviews
    if (p.ratings && Array.isArray(p.ratings)) {
      for (const r of p.ratings) {
        if (!r.platform) continue;
        await prisma.platformReview.upsert({
          where: {
            providerProfileId_platform: {
              providerProfileId: profile.id,
              platform: r.platform,
            },
          },
          update: {
            rating: r.rating,
            reviewCount: r.reviewCount,
            profileUrl: r.profileUrl,
          },
          create: {
            providerProfileId: profile.id,
            platform: r.platform,
            rating: r.rating,
            reviewCount: r.reviewCount,
            profileUrl: r.profileUrl,
          },
        });
      }
    }

    count++;
    console.log(`   [${count}/${providersData.length}] ✅ Seeded: ${p.businessName} (${p.email})`);
  }

  console.log(`\n🎉 Seeding finished successfully! ${count} providers inserted.`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
