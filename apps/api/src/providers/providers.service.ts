import { Injectable, Logger, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { MemoryCacheService } from '../common/cache';
import {
  ReviewsScraperService,
  MultiPlatformScrapeResult,
  ProjectsScraperService,
  ScraperHttpUtil,
} from '../scrapers';
import { AiReviewSummaryService } from './ai-review-summary.service';
import { GetProvidersQueryDto } from './dto/get-providers.dto';
import { Prisma, ReviewPlatform, PhotoCategory } from '@prisma/client';

export interface FormattedProviderProjectPhoto {
  id: string;
  url: string;
  caption?: string;
  width?: number;
  height?: number;
}

export interface FormattedProviderProject {
  id: string;
  title: string;
  slug: string;
  description?: string;
  location?: string;
  projectYear?: number;
  costRange?: string;
  serviceCategory?: string;
  sourceUrl?: string;
  coverUrl: string;
  photoCount: number;
  photos: FormattedProviderProjectPhoto[];
}

export interface FormattedProviderTeamMember {
  id: string;
  name: string;
  role?: string;
  credentials?: string;
  bio?: string;
  photoUrl?: string;
}

export interface FormattedProvider {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  badge: string;
  topPickCategory: string;
  category?: string;
  categorySlug?: string;
  logoText: string;
  imageUrl: string;
  photoCount: number;
  photos?: Array<{
    id: string;
    url: string;
    caption?: string;
    category?: string;
  }>;
  projectCount: number;
  projects?: FormattedProviderProject[];
  teamCount: number;
  teamMembers?: FormattedProviderTeamMember[];
  borough: string;
  city?: string;
  state?: string;
  zipCode?: string;
  address: string;
  servesArea: string;
  serviceAreas?: string[];
  phone: string;
  displayPhone: string;
  website: string;
  licenseNumber: string;
  yearsInBusiness: number;
  sinceYear: number;
  isLicensed: boolean;
  isInsured: boolean;
  isBonded: boolean;
  hasWarranty: boolean;
  financingAvailable: boolean;
  emergencyService: boolean;
  typicalPriceRange: string;
  description: string;
  services: string[];
  reviews: {
    google: { rating: number; count: number; url: string };
    yelp: { rating: number; count: number; url: string };
    homeadvisor: { rating: number; count: number; url: string };
    houzz: { rating: number; count: number; url: string };
    facebook?: { rating: number; count: number; url: string };
  };
  compositeRating: number;
  totalReviews: number;
  featuredQuote: string;
  verifiedYear: number;
  reviewsLastUpdatedAt?: string;
  aiReviewSummary?: string;
  aiSummaryUpdatedAt?: string;
  scrapedReviews?: Array<{
    authorName: string;
    authorAvatarUrl?: string;
    rating: number;
    comment: string;
    reviewDate?: string;
    platform: string;
    sourceUrl?: string;
    photoUrls?: string[];
  }>;
}

@Injectable()
export class ProvidersService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ProvidersService.name);
  private reviewPhotosColumnReady = false;
  private teamMembersTableReady = false;

  private static readonly LIST_CACHE_TTL_MS = 5 * 60 * 1000; // 5 min fresh
  private static readonly LIST_CACHE_SWR_MS = 25 * 60 * 1000; // +25 min SWR
  private static readonly TAXONOMY_CACHE_TTL_MS = 10 * 60 * 1000; // 10 min fresh
  private static readonly TAXONOMY_CACHE_SWR_MS = 50 * 60 * 1000; // +50 min SWR

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly cache: MemoryCacheService,
    private readonly reviewsScraperService: ReviewsScraperService,
    private readonly projectsScraperService: ProjectsScraperService,
    private readonly aiReviewSummaryService: AiReviewSummaryService
  ) {}

  /**
   * Ensure `scraped_reviews.photo_urls` JSON column exists in MariaDB/MySQL (idempotent).
   */
  private async ensureReviewPhotosColumn(): Promise<void> {
    if (this.reviewPhotosColumnReady) return;
    try {
      const cols = await this.prisma.$queryRawUnsafe<Array<{ Field: string }>>(
        `SHOW COLUMNS FROM \`scraped_reviews\` LIKE 'photo_urls'`
      );
      if (!Array.isArray(cols) || cols.length === 0) {
        await this.prisma.$executeRawUnsafe(
          `ALTER TABLE \`scraped_reviews\` ADD COLUMN \`photo_urls\` JSON NULL`
        );
      }
      // Ensure profileUrl & sourceUrl columns are TEXT so >191-char Google Maps place URLs never truncate or fail with P2000
      await this.prisma
        .$executeRawUnsafe(`ALTER TABLE \`platform_reviews\` MODIFY COLUMN \`profileUrl\` TEXT NOT NULL`)
        .catch(() => {});
      await this.prisma
        .$executeRawUnsafe(`ALTER TABLE \`scraped_reviews\` MODIFY COLUMN \`sourceUrl\` TEXT NULL`)
        .catch(() => {});
      this.reviewPhotosColumnReady = true;
    } catch (err: any) {
      this.logger.warn(`ensureReviewPhotosColumn check warning: ${err?.message || err}`);
    }
  }

  /**
   * Ensure `provider_team_members` table exists in MariaDB/MySQL (idempotent, zero-downtime).
   */
  private async ensureTeamMembersTable(): Promise<void> {
    if (this.teamMembersTableReady) return;
    try {
      await this.prisma.$executeRawUnsafe(`
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
      this.teamMembersTableReady = true;
    } catch (err: any) {
      this.logger.warn(`ensureTeamMembersTable warning: ${err?.message || err}`);
    }
  }

  /**
   * Batch-load `provider_team_members` and resolve R2 headshot keys to presigned URLs
   * (NEVER exposes raw third-party image URLs).
   */
  private async formatTeamMembersForProviders(
    providerIds: string[]
  ): Promise<Map<string, FormattedProviderTeamMember[]>> {
    const map = new Map<string, FormattedProviderTeamMember[]>();
    if (providerIds.length === 0) return map;

    await this.ensureTeamMembersTable();

    try {
      const placeholders = providerIds.map(() => '?').join(',');
      const rows = await this.prisma.$queryRawUnsafe<
        Array<{
          id: string;
          providerProfileId: string;
          name: string;
          role: string | null;
          credentials: string | null;
          bio: string | null;
          imageUrl: string | null;
          orderIndex: number;
        }>
      >(
        `SELECT id, providerProfileId, name, role, credentials, bio, imageUrl, orderIndex FROM \`provider_team_members\` WHERE \`providerProfileId\` IN (${placeholders}) ORDER BY \`orderIndex\` ASC`,
        ...providerIds
      );

      if (!Array.isArray(rows) || rows.length === 0) return map;

      await Promise.all(
        rows.map(async (row) => {
          let resolvedPhotoUrl: string | undefined;
          if (row.imageUrl && row.imageUrl.trim().startsWith('providers/')) {
            const presigned = await this.storageService.getPresignedUrl(row.imageUrl.trim());
            if (
              presigned &&
              (!presigned.startsWith('http') ||
                presigned.includes('.r2.cloudflarestorage.com') ||
                presigned.includes('.amazonaws.com') ||
                presigned.includes('/api/storage/'))
            ) {
              resolvedPhotoUrl = presigned;
            }
          }
          const entry: FormattedProviderTeamMember & { _order: number; _provId: string } = {
            id: row.id,
            name: row.name,
            role: row.role || undefined,
            credentials: row.credentials || undefined,
            bio: row.bio || undefined,
            photoUrl: resolvedPhotoUrl,
            _order: Number(row.orderIndex || 0),
            _provId: row.providerProfileId,
          };
          const list = (map.get(row.providerProfileId) as any[]) || [];
          list.push(entry);
          map.set(row.providerProfileId, list);
        })
      );

      for (const [provId, list] of map.entries()) {
        (list as any[]).sort((a, b) => a._order - b._order);
        map.set(
          provId,
          (list as any[]).map(({ _order, _provId, ...clean }) => clean)
        );
      }
    } catch (err: any) {
      this.logger.warn(`formatTeamMembersForProviders warning: ${err?.message || err}`);
    }

    return map;
  }

  private async loadTeamCountsForProviders(
    providerIds: string[]
  ): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    if (providerIds.length === 0) return counts;
    await this.ensureTeamMembersTable();
    try {
      const placeholders = providerIds.map(() => '?').join(',');
      const rows = await this.prisma.$queryRawUnsafe<
        Array<{ providerProfileId: string; cnt: bigint | number }>
      >(
        `SELECT providerProfileId, COUNT(id) AS cnt FROM \`provider_team_members\` WHERE \`providerProfileId\` IN (${placeholders}) GROUP BY \`providerProfileId\``,
        ...providerIds
      );
      for (const r of rows || []) {
        counts.set(r.providerProfileId, Number(r.cnt || 0));
      }
    } catch {}
    return counts;
  }

  /**
   * Batch-load customer-shared review photos (`scraped_reviews.photo_urls`) and resolve
   * strictly R2-hosted keys into presigned Cloudflare R2 URLs (zero third-party hotlinks).
   */
  private async loadReviewPhotoMap(
    providerIds: string[]
  ): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>();
    if (providerIds.length === 0) return map;

    await this.ensureReviewPhotosColumn();

    try {
      const placeholders = providerIds.map(() => '?').join(',');
      const rows = await this.prisma.$queryRawUnsafe<
        Array<{ id: string; photo_urls: unknown }>
      >(
        `SELECT id, photo_urls FROM \`scraped_reviews\` WHERE \`providerProfileId\` IN (${placeholders}) AND \`photo_urls\` IS NOT NULL`,
        ...providerIds
      );

      if (!Array.isArray(rows) || rows.length === 0) return map;

      await Promise.all(
        rows.map(async (row) => {
          let parsed: unknown = row.photo_urls;
          if (typeof parsed === 'string') {
            try {
              parsed = JSON.parse(parsed);
            } catch {
              parsed = [];
            }
          }
          if (!Array.isArray(parsed) || parsed.length === 0) return;

          // Strictly resolve R2 object keys only — NEVER expose raw external URLs
          const cleanKeys = parsed
            .filter((k): k is string => typeof k === 'string')
            .map((k) => k.trim())
            .filter((k) => k.startsWith('providers/'));

          if (cleanKeys.length === 0) return;

          const resolvedUrls = (
            await Promise.all(
              cleanKeys.map(async (r2Key) => {
                const url = await this.storageService.getPresignedUrl(r2Key);
                if (!url) return null;
                if (
                  url.startsWith('http') &&
                  !url.includes('.r2.cloudflarestorage.com') &&
                  !url.includes('.amazonaws.com') &&
                  !url.includes('/api/storage/')
                ) {
                  return null;
                }
                return url;
              })
            )
          ).filter((u): u is string => Boolean(u));

          if (resolvedUrls.length > 0) {
            map.set(row.id, resolvedUrls);
          }
        })
      );
    } catch (err: any) {
      this.logger.warn(`loadReviewPhotoMap warning: ${err?.message || err}`);
    }

    return map;
  }

  /**
   * Batch-load and resolve R2 presigned URLs for ProviderProject + ProviderProjectPhoto
   * across a set of providerProfileIds in 2 flat queries (zero N+1).
   */
  private async formatProjectsForProviders(
    providerIds: string[]
  ): Promise<Map<string, FormattedProviderProject[]>> {
    const result = new Map<string, FormattedProviderProject[]>();
    if (providerIds.length === 0) return result;

    const rawProjects = await this.prisma.providerProject.findMany({
      where: { providerProfileId: { in: providerIds } },
      orderBy: { orderIndex: 'asc' },
    });
    if (rawProjects.length === 0) return result;

    const projectIds = rawProjects.map((p) => p.id);
    const rawPhotos = await this.prisma.providerProjectPhoto.findMany({
      where: { projectId: { in: projectIds } },
      orderBy: { orderIndex: 'asc' },
    });

    const photosByProject = new Map<string, typeof rawPhotos>();
    for (const ph of rawPhotos) {
      const list = photosByProject.get(ph.projectId) || [];
      list.push(ph);
      photosByProject.set(ph.projectId, list);
    }

    await Promise.all(
      rawProjects.map(async (proj) => {
        const albumPhotos = photosByProject.get(proj.id) || [];
        const formattedPhotos = (
          await Promise.all(
            albumPhotos.map(async (ph) => {
              const url = await this.storageService.getPresignedUrl(ph.imageUrl);
              if (!url) return null;
              return {
                id: ph.id,
                url,
                caption: ph.caption || undefined,
                width: ph.width || undefined,
                height: ph.height || undefined,
              } as FormattedProviderProjectPhoto;
            })
          )
        ).filter((x): x is FormattedProviderProjectPhoto => Boolean(x));

        const coverUrl =
          (proj.coverImageUrl
            ? await this.storageService.getPresignedUrl(proj.coverImageUrl)
            : '') ||
          formattedPhotos[0]?.url ||
          '';

        if (!coverUrl && formattedPhotos.length === 0) return;

        const formattedProj: FormattedProviderProject = {
          id: proj.id,
          title: proj.title,
          slug: proj.slug,
          description: proj.description || undefined,
          location: proj.location || undefined,
          projectYear: proj.projectYear || undefined,
          costRange: proj.costRange || undefined,
          serviceCategory: proj.serviceCategory || undefined,
          sourceUrl: proj.sourceUrl || undefined,
          coverUrl,
          photoCount: formattedPhotos.length || proj.photoCount,
          photos: formattedPhotos,
        };

        const list = result.get(proj.providerProfileId) || [];
        list.push(formattedProj);
        result.set(proj.providerProfileId, list);
      })
    );

    // Preserve deterministic orderIndex ordering within each provider
    const orderByProjId = new Map(rawProjects.map((p) => [p.id, p.orderIndex]));
    for (const [provId, list] of result.entries()) {
      list.sort((a, b) => (orderByProjId.get(a.id) ?? 0) - (orderByProjId.get(b.id) ?? 0));
      result.set(provId, list);
    }

    return result;
  }

  /**
   * Warm up hot directory caches asynchronously on server bootstrap
   * so even the first visitor gets sub-15ms API responses.
   */
  onApplicationBootstrap() {
    setTimeout(() => {
      this.warmUpCache().catch((err) => {
        this.logger.warn(`Initial cache warm-up skipped: ${err?.message || err}`);
      });
    }, 250);
  }

  private async warmUpCache(): Promise<void> {
    await this.getCategories();
    const [, allRes] = await Promise.all([
      this.getFiltersAndStats(),
      this.findAll({ limit: 50 } as GetProvidersQueryDto),
      this.findAll({ category: 'Custom Cabinets', limit: 50 } as GetProvidersQueryDto),
      this.findAll({ category: 'Roofing', limit: 50 } as GetProvidersQueryDto),
    ]);

    // Pre-warm individual slug profiles in 1 batch query so clicking "View Profile" is <2ms from the very first click
    if (allRes?.items?.length) {
      const ids = allRes.items.map((p) => p.id);
      const [allScraped, projectsByProvider, reviewPhotoMap, teamByProvider] = await Promise.all([
        this.prisma.scrapedReview.findMany({
          where: { providerProfileId: { in: ids } },
          orderBy: { createdAt: 'desc' },
        }),
        this.formatProjectsForProviders(ids),
        this.loadReviewPhotoMap(ids),
        this.formatTeamMembersForProviders(ids),
      ]);
      const reviewsByProvider = new Map<string, any[]>();
      const latestScrapedMsByProvider = new Map<string, number>();
      for (const sr of allScraped) {
        const ts = sr.updatedAt
          ? new Date(sr.updatedAt).getTime()
          : sr.createdAt
          ? new Date(sr.createdAt).getTime()
          : 0;
        if (ts > (latestScrapedMsByProvider.get(sr.providerProfileId) || 0)) {
          latestScrapedMsByProvider.set(sr.providerProfileId, ts);
        }
        const arr = reviewsByProvider.get(sr.providerProfileId) || [];
        if (arr.length < 2000) {
          const resolvedAvatar = sr.authorAvatarUrl
            ? await this.storageService.getPresignedUrl(sr.authorAvatarUrl)
            : undefined;
          const resolvedPhotos = reviewPhotoMap.get(sr.id);
          arr.push({
            authorName: sr.authorName,
            authorAvatarUrl: resolvedAvatar || undefined,
            rating: sr.rating,
            comment: sr.comment,
            reviewDate: sr.reviewDate || undefined,
            platform: sr.platform,
            sourceUrl: sr.sourceUrl || undefined,
            ...(resolvedPhotos && resolvedPhotos.length > 0 ? { photoUrls: resolvedPhotos } : {}),
          });
          reviewsByProvider.set(sr.providerProfileId, arr);
        }
      }
      for (const item of allRes.items) {
        const existingMs = item.reviewsLastUpdatedAt
          ? new Date(item.reviewsLastUpdatedAt).getTime()
          : 0;
        const scrapedMs = latestScrapedMsByProvider.get(item.id) || 0;
        const bestMs = Math.max(existingMs, scrapedMs);
        const providerProjects = projectsByProvider.get(item.id) || [];
        const providerTeam = teamByProvider.get(item.id) || [];
        this.cache.set(
          `providers:slug:${item.slug}`,
          {
            ...item,
            projectCount: providerProjects.length,
            projects: providerProjects,
            teamCount: providerTeam.length,
            teamMembers: providerTeam,
            reviewsLastUpdatedAt: bestMs > 0 ? new Date(bestMs).toISOString() : item.reviewsLastUpdatedAt,
            scrapedReviews: reviewsByProvider.get(item.id) || [],
          },
          {
            ttlMs: ProvidersService.LIST_CACHE_TTL_MS,
            swrMs: ProvidersService.LIST_CACHE_SWR_MS,
          }
        );
      }
    }

    this.logger.log('⚡ Warmed up Providers, Profiles, Projects, Categories & Filters cache');
  }

  /**
   * Manually invalidate all provider & taxonomy caches (e.g. after running external DB scraper/seed scripts)
   */
  async clearCache(): Promise<{ cleared: boolean }> {
    await this.prisma.scrapedReview
      .deleteMany({
        where: {
          OR: [
            { authorName: { startsWith: 'Yelp Reviewer #' } },
            { comment: { startsWith: 'Average rating:' } },
            { comment: 'Great roofing service, highly recommended!' },
            { authorName: 'EL' },
          ],
        },
      })
      .catch(() => {});
    await this.prisma
      .$executeRawUnsafe(
        `UPDATE \`scraped_reviews\` SET \`photo_urls\` = NULL WHERE \`photo_urls\` LIKE '%0554099452e3%'`
      )
      .catch(() => {});
    this.cache.invalidatePrefix('providers:');
    await this.warmUpCache();
    return { cleared: true };
  }

  /**
   * Format phone number for clean UI display
   */
  private formatDisplayPhone(phone: string): string {
    const cleaned = ('' + phone).replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    return match ? `(${match[1]}) ${match[2]}-${match[3]}` : phone;
  }

  /**
   * Transform raw Prisma provider object into API-ready format
   */
  private async formatProvider(provider: any): Promise<FormattedProvider> {
    const google = provider.platformReviews?.find((p: any) => p.platform === 'GOOGLE');
    const yelp = provider.platformReviews?.find((p: any) => p.platform === 'YELP');
    const homeadvisor = provider.platformReviews?.find((p: any) => p.platform === 'HOMEADVISOR');
    const houzz = provider.platformReviews?.find((p: any) => p.platform === 'HOUZZ');
    const facebook = provider.platformReviews?.find((p: any) => p.platform === 'FACEBOOK');

    const logoUrl = provider.logoUrl
      ? await this.storageService.getPresignedUrl(provider.logoUrl)
      : '';

    const coverImageUrl = provider.coverImageUrl
      ? await this.storageService.getPresignedUrl(provider.coverImageUrl)
      : '';

    const allServices = provider.listings?.flatMap(
      (l: any) => l.subServices?.map((ss: any) => ss.subService.name) || []
    ) || [];
    const uniqueServices = [...new Set<string>(allServices)];

    const primaryCategory = provider.listings?.[0]?.category?.name || '';
    const primaryCategorySlug = provider.listings?.[0]?.category?.slug || '';

    const rawPhotos = provider.listings?.flatMap((l: any) => l.photos || []) || [];
    const formattedPhotos = await Promise.all(
      rawPhotos.map(async (photo: any) => ({
        id: photo.id,
        url: await this.storageService.getPresignedUrl(photo.imageUrl),
        caption: photo.caption || undefined,
        category: photo.category || undefined,
      }))
    );

    const firstPhotoUrl = formattedPhotos[0]?.url || '';
    const imageUrl = logoUrl || coverImageUrl || firstPhotoUrl;

    const rawServiceAreas =
      provider.listings?.flatMap(
        (l: any) => l.serviceAreas?.map((sa: any) => sa.areaName) || []
      ) || [];
    const uniqueServiceAreas = [...new Set<string>(rawServiceAreas)];
    const computedServesArea =
      provider.servesArea ||
      (uniqueServiceAreas.length > 0
        ? uniqueServiceAreas.join(', ')
        : [provider.borough, provider.city, provider.state].filter(Boolean).join(', '));

    const firstListingWithPrice = provider.listings?.find(
      (l: any) => l.minPrice != null || l.maxPrice != null
    );
    const computedPriceRange =
      provider.typicalPriceRange ||
      (firstListingWithPrice
        ? `$${Number(firstListingWithPrice.minPrice || 0).toLocaleString()} – $${Number(
            firstListingWithPrice.maxPrice || 0
          ).toLocaleString()}`
        : '');

    // Compute latest review scrape / sync timestamp across platformReviews & scrapedReviews
    const scrapeTimestamps: number[] = [];
    for (const pr of provider.platformReviews || []) {
      if (pr.lastScrapedAt) {
        const t = new Date(pr.lastScrapedAt).getTime();
        if (!Number.isNaN(t)) scrapeTimestamps.push(t);
      }
    }
    for (const sr of provider.scrapedReviews || []) {
      const raw = sr.updatedAt || sr.createdAt;
      if (raw) {
        const t = new Date(raw).getTime();
        if (!Number.isNaN(t)) scrapeTimestamps.push(t);
      }
    }
    if (scrapeTimestamps.length === 0) {
      for (const pr of provider.platformReviews || []) {
        if (pr.updatedAt) {
          const t = new Date(pr.updatedAt).getTime();
          if (!Number.isNaN(t)) scrapeTimestamps.push(t);
        }
      }
    }
    const reviewsLastUpdatedAt =
      scrapeTimestamps.length > 0
        ? new Date(Math.max(...scrapeTimestamps)).toISOString()
        : undefined;

    // Format saved scraped reviews (filtering out any legacy DOM/directory noise rows)
    const filteredRawReviews = (provider.scrapedReviews || []).filter((sr: any) => {
      const c = String(sr.comment || '').trim();
      if (c.length < 8) return false;
      if (c === 'Great roofing service, highly recommended!') return false;
      if (/^Average rating:/i.test(c)) return false;
      if (/^[A-Za-z0-9+/]{24,}$/.test(c)) return false;
      if (/\b\d+\s+Photos\b/i.test(c) && /\bMon\s*-/i.test(c)) return false;
      if (/^\d+\s+[A-Za-z0-9\s.,#-]+NY\s+\d{5}$/i.test(c)) return false;
      return true;
    });

    const scrapedReviews = await Promise.all(
      filteredRawReviews.map(async (sr: any) => ({
        authorName: sr.authorName,
        authorAvatarUrl: sr.authorAvatarUrl
          ? (await this.storageService.getPresignedUrl(sr.authorAvatarUrl)) || undefined
          : undefined,
        rating: sr.rating,
        comment: sr.comment,
        reviewDate: sr.reviewDate || undefined,
        platform: sr.platform,
        sourceUrl: sr.sourceUrl || undefined,
        ...(Array.isArray(sr.resolvedPhotoUrls) && sr.resolvedPhotoUrls.length > 0
          ? { photoUrls: sr.resolvedPhotoUrls }
          : {}),
      }))
    );

    const activePlatforms = [google, yelp, homeadvisor, houzz].filter(
      (p: any) => p && Number(p.reviewCount) > 0
    );
    const computedTotalReviews =
      activePlatforms.length > 0
        ? activePlatforms.reduce((acc: number, p: any) => acc + Number(p.reviewCount), 0)
        : provider.totalReviews || 0;
    const computedCompositeRating =
      activePlatforms.length > 0 && computedTotalReviews > 0
        ? Math.round(
            (activePlatforms.reduce(
              (acc: number, p: any) => acc + Number(p.rating) * Number(p.reviewCount),
              0
            ) /
              computedTotalReviews) *
              10
          ) / 10
        : Number(provider.compositeRating) || 0;

    const formattedProjects: FormattedProviderProject[] | undefined = provider.formattedProjects;
    const projectCount: number = formattedProjects
      ? formattedProjects.length
      : Number(provider.projectCountOverride || 0);

    const formattedTeamMembers: FormattedProviderTeamMember[] | undefined =
      provider.formattedTeamMembers;
    const teamCount: number = formattedTeamMembers
      ? formattedTeamMembers.length
      : Number(provider.teamCountOverride || 0);

    return {
      id: provider.id,
      name: provider.businessName,
      slug: provider.slug,
      tagline: provider.tagline || '',
      badge: provider.badge || '',
      topPickCategory: provider.topPickCategory || '',
      category: primaryCategory || undefined,
      categorySlug: primaryCategorySlug || undefined,
      logoText: provider.logoText || provider.businessName.charAt(0),
      imageUrl,
      photoCount: formattedPhotos.length,
      photos: formattedPhotos,
      projectCount,
      projects: formattedProjects,
      teamCount,
      teamMembers: formattedTeamMembers,
      borough: provider.borough || '',
      city: provider.city || undefined,
      state: provider.state || undefined,
      zipCode: provider.zipCode || undefined,
      address: provider.address || '',
      servesArea: computedServesArea,
      serviceAreas: uniqueServiceAreas,
      phone: provider.phone || '',
      displayPhone: this.formatDisplayPhone(provider.phone || ''),
      website: ScraperHttpUtil.normalizeOfficialWebsiteUrl(provider.websiteUrl) || '',
      licenseNumber: provider.licenseNumber || '',
      yearsInBusiness: provider.sinceYear
        ? new Date().getFullYear() - provider.sinceYear
        : 0,
      sinceYear: provider.sinceYear || 0,
      isLicensed: provider.isLicensed ?? false,
      isInsured: provider.isInsured ?? false,
      isBonded: provider.isBonded ?? false,
      hasWarranty: provider.hasWarranty ?? false,
      financingAvailable: provider.financingAvailable ?? false,
      emergencyService: provider.emergencyService ?? false,
      typicalPriceRange: computedPriceRange,
      description: provider.description || '',
      services: uniqueServices,
      reviews: {
        google: {
          rating: google ? Number(google.rating) : 0,
          count: google ? google.reviewCount : 0,
          url: google ? google.profileUrl : '',
        },
        yelp: {
          rating: yelp ? Number(yelp.rating) : 0,
          count: yelp ? yelp.reviewCount : 0,
          url: yelp ? yelp.profileUrl : '',
        },
        homeadvisor: {
          rating: homeadvisor ? Number(homeadvisor.rating) : 0,
          count: homeadvisor ? homeadvisor.reviewCount : 0,
          url: homeadvisor ? homeadvisor.profileUrl : '',
        },
        houzz: {
          rating: houzz ? Number(houzz.rating) : (facebook ? Number(facebook.rating) : 0),
          count: houzz ? houzz.reviewCount : (facebook ? facebook.reviewCount : 0),
          url: houzz ? houzz.profileUrl : (facebook ? facebook.profileUrl : ''),
        },
      },
      compositeRating: computedCompositeRating,
      totalReviews: computedTotalReviews,
      featuredQuote: provider.featuredQuote || '',
      verifiedYear: provider.verifiedYear || 0,
      reviewsLastUpdatedAt,
      aiReviewSummary: provider.aiReviewSummary || undefined,
      aiSummaryUpdatedAt: provider.aiSummaryUpdatedAt ? provider.aiSummaryUpdatedAt.toISOString() : undefined,
      scrapedReviews,
    };
  }

  /**
   * Hydrate raw ProviderProfile records in 1 parallel query wave instead of Prisma's 4-hop sequential waterfall.
   */
  private async hydrateProvidersBatch(
    rawProviders: any[],
    includeScrapedReviews: boolean
  ): Promise<FormattedProvider[]> {
    if (rawProviders.length === 0) return [];

    const providerIds = rawProviders.map((p) => p.id);

    const [
      categories,
      listings,
      platformReviews,
      scrapedReviews,
      reviewPhotoMap,
      projectsByProvider,
      projectCountsGroup,
      teamByProvider,
      teamCountByProvider,
    ] = await Promise.all([
      this.getCategories(),
      this.prisma.listing.findMany({
        where: { providerProfileId: { in: providerIds } },
      }),
      this.prisma.platformReview.findMany({
        where: { providerProfileId: { in: providerIds } },
      }),
      includeScrapedReviews
        ? this.prisma.scrapedReview.findMany({
            where: { providerProfileId: { in: providerIds } },
            orderBy: { createdAt: 'desc' },
            take: providerIds.length === 1 ? 2000 : 2000 * providerIds.length,
          })
        : Promise.resolve([]),
      includeScrapedReviews
        ? this.loadReviewPhotoMap(providerIds)
        : Promise.resolve(new Map<string, string[]>()),
      includeScrapedReviews
        ? this.formatProjectsForProviders(providerIds)
        : Promise.resolve(new Map<string, FormattedProviderProject[]>()),
      includeScrapedReviews
        ? Promise.resolve([])
        : this.prisma.providerProject.groupBy({
            by: ['providerProfileId'],
            where: { providerProfileId: { in: providerIds } },
            _count: { id: true },
          }),
      includeScrapedReviews
        ? this.formatTeamMembersForProviders(providerIds)
        : Promise.resolve(new Map<string, FormattedProviderTeamMember[]>()),
      includeScrapedReviews
        ? Promise.resolve(new Map<string, number>())
        : this.loadTeamCountsForProviders(providerIds),
    ]);

    const projectCountByProvider = new Map<string, number>();
    for (const row of projectCountsGroup) {
      projectCountByProvider.set(row.providerProfileId, row._count.id);
    }

    const listingIds = listings.map((l) => l.id);
    const [photos, serviceAreas, listingSubServices] =
      listingIds.length > 0
        ? await Promise.all([
            this.prisma.listingPhoto.findMany({
              where: { listingId: { in: listingIds } },
              orderBy: { orderIndex: 'asc' },
            }),
            this.prisma.listingServiceArea.findMany({
              where: { listingId: { in: listingIds } },
            }),
            this.prisma.listingSubService.findMany({
              where: { listingId: { in: listingIds } },
            }),
          ])
        : [[], [], []];

    const categoryById = new Map<string, any>();
    const subServiceById = new Map<string, any>();
    for (const cat of categories) {
      categoryById.set(cat.id, cat);
      for (const ss of cat.subServices || []) {
        subServiceById.set(ss.id, ss);
      }
    }

    const photosByListing = new Map<string, any[]>();
    for (const ph of photos) {
      const arr = photosByListing.get(ph.listingId) || [];
      arr.push(ph);
      photosByListing.set(ph.listingId, arr);
    }

    const areasByListing = new Map<string, any[]>();
    for (const sa of serviceAreas) {
      const arr = areasByListing.get(sa.listingId) || [];
      arr.push(sa);
      areasByListing.set(sa.listingId, arr);
    }

    const subsByListing = new Map<string, any[]>();
    for (const lss of listingSubServices) {
      const sub = subServiceById.get(lss.subServiceId);
      if (!sub) continue;
      const arr = subsByListing.get(lss.listingId) || [];
      arr.push({ ...lss, subService: sub });
      subsByListing.set(lss.listingId, arr);
    }

    const listingsByProvider = new Map<string, any[]>();
    for (const l of listings) {
      const enriched = {
        ...l,
        category: categoryById.get(l.categoryId) || null,
        photos: photosByListing.get(l.id) || [],
        serviceAreas: areasByListing.get(l.id) || [],
        subServices: subsByListing.get(l.id) || [],
      };
      const arr = listingsByProvider.get(l.providerProfileId) || [];
      arr.push(enriched);
      listingsByProvider.set(l.providerProfileId, arr);
    }

    const platformByProvider = new Map<string, any[]>();
    for (const pr of platformReviews) {
      const arr = platformByProvider.get(pr.providerProfileId) || [];
      arr.push(pr);
      platformByProvider.set(pr.providerProfileId, arr);
    }

    const scrapedByProvider = new Map<string, any[]>();
    for (const sr of scrapedReviews) {
      const arr = scrapedByProvider.get(sr.providerProfileId) || [];
      const resolvedPhotoUrls = reviewPhotoMap.get(sr.id);
      arr.push(
        resolvedPhotoUrls && resolvedPhotoUrls.length > 0
          ? { ...sr, resolvedPhotoUrls }
          : sr
      );
      scrapedByProvider.set(sr.providerProfileId, arr);
    }

    return Promise.all(
      rawProviders.map((p) =>
        this.formatProvider({
          ...p,
          listings: listingsByProvider.get(p.id) || [],
          platformReviews: platformByProvider.get(p.id) || [],
          scrapedReviews: scrapedByProvider.get(p.id) || [],
          formattedProjects: includeScrapedReviews
            ? projectsByProvider.get(p.id) || []
            : undefined,
          projectCountOverride: includeScrapedReviews
            ? undefined
            : projectCountByProvider.get(p.id) || 0,
          formattedTeamMembers: includeScrapedReviews
            ? teamByProvider.get(p.id) || []
            : undefined,
          teamCountOverride: includeScrapedReviews
            ? undefined
            : teamCountByProvider.get(p.id) || 0,
        })
      )
    );
  }

  /**
   * Search, filter, sort and paginate providers with SWR + Single-Flight caching
   */
  async findAll(query: GetProvidersQueryDto) {
    const cacheKey = `providers:list:${JSON.stringify({
      search: query.search?.trim() || '',
      borough: query.borough || '',
      service: query.service || '',
      category: query.category || '',
      topPickCategory: query.topPickCategory || '',
      sortBy: query.sortBy || 'rating',
      minRating: (query as any).minRating || 0,
      boroughs: (query as any).boroughs || null,
      services: (query as any).services || null,
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 50,
    })}`;

    return this.cache.getOrSet(
      cacheKey,
      () => this.executeFindAll(query),
      {
        ttlMs: ProvidersService.LIST_CACHE_TTL_MS,
        swrMs: ProvidersService.LIST_CACHE_SWR_MS,
      }
    );
  }

  private async executeFindAll(query: GetProvidersQueryDto) {
    const { search, borough, service, category, topPickCategory, sortBy, page = 1, limit = 50 } = query;

    const where: Prisma.ProviderProfileWhereInput = {
      isActive: true,
    };

    if (topPickCategory && topPickCategory !== 'ALL') {
      where.topPickCategory = topPickCategory as any;
    }

    if (search) {
      where.OR = [
        { businessName: { contains: search } },
        { description: { contains: search } },
        { borough: { contains: search } },
      ];
    }

    if (borough && borough !== 'All') {
      where.borough = { equals: borough };
    }

    // Filter by high-level category if specified
    if (category && category !== 'All' && category !== 'All Services') {
      const cleanCat = category.toLowerCase().trim();
      where.listings = {
        some: {
          category: {
            OR: [
              { name: { contains: category } },
              { slug: { contains: cleanCat.replace(/\s+/g, '-') } },
            ],
          },
        },
      };
    }

    // Filter by specific sub-service or trade name
    if (service && service !== 'All Services' && service !== 'All') {
      const cleanService = service.replace(/^Roof\s+/i, '').trim();
      const serviceVariants = [service, cleanService];
      if (/replacement/i.test(service)) serviceVariants.push('Installation', 'Roof Installation');
      if (/storm/i.test(service)) serviceVariants.push('Repair');
      if (/shingle/i.test(service)) serviceVariants.push('Roof Installation', 'Installation');
      if (/metal/i.test(service)) serviceVariants.push('Roof Installation', 'Flat Roof Systems');

      where.listings = {
        some: {
          OR: [
            // Check if matches category name (e.g. 'Roofing' or 'Custom Cabinets')
            {
              category: {
                OR: [
                  { name: { contains: service } },
                  { slug: { contains: service.toLowerCase().replace(/\s+/g, '-') } },
                ],
              },
            },
            // Or matches subService name
            {
              subServices: {
                some: {
                  subService: {
                    OR: serviceVariants.map((v) => ({
                      name: { contains: v },
                    })),
                  },
                },
              },
            },
          ],
        },
      };
    }

    // Guard against extreme values for rating filter
    if ((query as any).minRating) {
      where.compositeRating = { gte: (query as any).minRating };
    }

    if ((query as any).boroughs && Array.isArray((query as any).boroughs)) {
      where.borough = {
        in: (query as any).boroughs,
      };
    }

    if ((query as any).services && Array.isArray((query as any).services)) {
      where.listings = {
        some: {
          subServices: {
            some: {
              subService: {
                name: { in: (query as any).services },
              },
            },
          },
        },
      };
    }

    let orderBy: Prisma.ProviderProfileOrderByWithRelationInput = {
      compositeRating: 'desc',
    };
    if (sortBy === 'reviews') {
      orderBy = { totalReviews: 'desc' };
    } else if (sortBy === 'experience') {
      orderBy = { sinceYear: 'asc' };
    }

    const numericPage = Number(page) || 1;
    const numericLimit = Number(limit) || 12;

    const rawProviders = await this.prisma.providerProfile.findMany({
      where,
      orderBy,
      skip: (numericPage - 1) * numericLimit,
      take: numericLimit,
    });

    // Avoid an extra COUNT(*) round-trip when page 1 has fewer rows than limit
    const total =
      numericPage === 1 && rawProviders.length < numericLimit
        ? rawProviders.length
        : await this.prisma.providerProfile.count({ where });

    const formattedProviders = await this.hydrateProvidersBatch(rawProviders, false);

    return {
      items: formattedProviders,
      total,
      page: numericPage,
      limit: numericLimit,
      totalPages: Math.ceil(total / numericLimit),
    };
  }

  /**
   * Retrieve dynamic filter options and live database statistics (Cached + SWR)
   */
  async getFiltersAndStats() {
    return this.cache.getOrSet(
      'providers:filters',
      async () => {
        const [boroughRecords, aggregates, categories] = await Promise.all([
          this.prisma.providerProfile.findMany({
            where: { isActive: true, borough: { not: null } },
            select: { borough: true },
            distinct: ['borough'],
          }),
          this.prisma.providerProfile.aggregate({
            where: { isActive: true },
            _count: { id: true },
            _avg: { compositeRating: true },
            _sum: { totalReviews: true },
          }),
          this.getCategories(),
        ]);

        const boroughs = [
          'All',
          ...boroughRecords
            .map((b) => b.borough as string)
            .filter((b) => b && b !== 'All'),
        ];

        const uniqueSubServiceNames = Array.from(
          new Set(
            categories.flatMap((cat) => (cat.subServices || []).map((s: any) => s.name))
          )
        ).sort((a, b) => a.localeCompare(b));

        const services = ['All Services', ...uniqueSubServiceNames];

        const totalProviders = aggregates._count.id || 0;
        const avgRating = aggregates._avg.compositeRating
          ? Number(aggregates._avg.compositeRating.toFixed(1))
          : 4.8;
        const totalReviews = aggregates._sum.totalReviews || 0;

        return {
          boroughs,
          services,
          categories,
          stats: {
            totalProviders,
            avgRating,
            totalReviews,
          },
        };
      },
      {
        ttlMs: ProvidersService.LIST_CACHE_TTL_MS,
        swrMs: ProvidersService.LIST_CACHE_SWR_MS,
      }
    );
  }

  /**
   * Retrieve all service categories with active provider count and sub-services (Parallel + Cached)
   */
  async getCategories() {
    return this.cache.getOrSet(
      'providers:categories',
      async () => {
        const [rawCategories, allSubServices, activeListings, allBenchmarks] =
          await Promise.all([
            this.prisma.serviceCategory.findMany({
              orderBy: { name: 'asc' },
            }),
            this.prisma.subService.findMany({
              select: {
                id: true,
                categoryId: true,
                name: true,
                slug: true,
                isPopular: true,
                description: true,
              },
              orderBy: { name: 'asc' },
            }),
            this.prisma.listing.findMany({
              where: { status: 'ACTIVE' },
              select: { categoryId: true, providerProfileId: true },
              distinct: ['categoryId', 'providerProfileId'],
            }),
            this.prisma.costBenchmark.findMany({
              orderBy: { orderIndex: 'asc' },
            }),
          ]);

        const subsByCategory = new Map<string, any[]>();
        for (const s of allSubServices) {
          const arr = subsByCategory.get(s.categoryId) || [];
          arr.push({
            id: s.id,
            name: s.name,
            slug: s.slug,
            isPopular: s.isPopular,
            description: s.description,
          });
          subsByCategory.set(s.categoryId, arr);
        }

        const providerCountByCategory = new Map<string, number>();
        for (const l of activeListings) {
          providerCountByCategory.set(
            l.categoryId,
            (providerCountByCategory.get(l.categoryId) || 0) + 1
          );
        }

        const benchmarksByCategory = new Map<string, any[]>();
        for (const cb of allBenchmarks) {
          const arr = benchmarksByCategory.get(cb.categoryId) || [];
          arr.push({
            id: cb.id,
            roofType: cb.roofType,
            footprint: cb.footprint,
            description: cb.description,
            minCost: Number(cb.minCost),
            maxCost: Number(cb.maxCost),
          });
          benchmarksByCategory.set(cb.categoryId, arr);
        }

        const mapped = await Promise.all(
          rawCategories.map(async (cat) => {
            const image =
              cat.icon &&
              (cat.icon.includes('/') ||
                cat.icon.endsWith('.jpg') ||
                cat.icon.endsWith('.png') ||
                cat.icon.endsWith('.webp'))
                ? await this.storageService.getPresignedUrl(cat.icon)
                : '';

            return {
              id: cat.id,
              name: cat.name,
              slug: cat.slug,
              description: cat.description,
              icon: cat.icon,
              image,
              metaTitle: cat.metaTitle,
              metaDescription: cat.metaDescription,
              providerCount: providerCountByCategory.get(cat.id) || 0,
              subServices: subsByCategory.get(cat.id) || [],
              costBenchmarks: benchmarksByCategory.get(cat.id) || [],
            };
          })
        );

        return mapped.sort((a, b) => {
          const aActive = a.providerCount > 0 ? 1 : 0;
          const bActive = b.providerCount > 0 ? 1 : 0;
          if (bActive !== aActive) return bActive - aActive;
          return a.name.localeCompare(b.name);
        });
      },
      {
        ttlMs: ProvidersService.TAXONOMY_CACHE_TTL_MS,
        swrMs: ProvidersService.TAXONOMY_CACHE_SWR_MS,
      }
    );
  }

  /**
   * Retrieve single provider profile by slug (Parallel Hydrated + Cached)
   */
  async findBySlug(slug: string): Promise<FormattedProvider> {
    return this.cache.getOrSet(
      `providers:slug:${slug}`,
      async () => {
        const provider = await this.prisma.providerProfile.findUnique({
          where: { slug },
        });

        if (!provider) {
          throw new NotFoundException(`Provider with slug "${slug}" not found`);
        }

        const [hydrated] = await this.hydrateProvidersBatch([provider], true);
        return hydrated;
      },
      {
        ttlMs: ProvidersService.LIST_CACHE_TTL_MS,
        swrMs: ProvidersService.LIST_CACHE_SWR_MS,
      }
    );
  }

  /**
   * Sync and scrape latest live reviews (up to 2,000 max per contractor) from Google, Yelp, HomeAdvisor & Houzz.
   * Saves both aggregate ratings AND individual review comments (with 100% R2-hosted reviewer avatars) to database.
   */
  async syncReviews(
    slug: string,
    platforms?: string[],
    maxReviews = 2000
  ): Promise<{
    provider: FormattedProvider;
    scrapedSummary: MultiPlatformScrapeResult;
  }> {
    const cappedMax = Math.min(2000, Math.max(1, Number(maxReviews) || 2000));
    await this.ensureReviewPhotosColumn();
    const profile = await this.prisma.providerProfile.findUnique({
      where: { slug },
      include: {
        platformReviews: true,
      },
    });

    if (!profile) {
      throw new NotFoundException(`Provider with slug "${slug}" not found`);
    }

    const googleUrl = profile.platformReviews.find((p) => p.platform === 'GOOGLE')?.profileUrl;
    const yelpUrl = profile.platformReviews.find((p) => p.platform === 'YELP')?.profileUrl;
    const homeAdvisorUrl = profile.platformReviews.find((p) => p.platform === 'HOMEADVISOR')?.profileUrl;
    const fallbackHouzzFromWebsite = profile.websiteUrl?.includes('houzz.com')
      ? profile.websiteUrl
      : undefined;
    const houzzUrl =
      profile.platformReviews.find((p) => p.platform === 'HOUZZ')?.profileUrl ||
      fallbackHouzzFromWebsite;

    // Scrape live across platforms (Google, Yelp, HomeAdvisor, Houzz) up to cappedMax
    const scrapedResult = await this.reviewsScraperService.scrapeAllPlatforms(
      {
        businessName: profile.businessName,
        borough: profile.borough || undefined,
        city: profile.city || undefined,
        googleUrl,
        yelpUrl,
        homeAdvisorUrl,
        houzzUrl,
      },
      cappedMax,
      platforms
    );

    const aggregateUpdates: Promise<any>[] = [];

    // ── Save Platform Aggregates ──
    if (scrapedResult.platforms.google && scrapedResult.platforms.google.totalReviews > 0) {
      aggregateUpdates.push(
        this.prisma.platformReview.upsert({
          where: {
            providerProfileId_platform: {
              providerProfileId: profile.id,
              platform: 'GOOGLE',
            },
          },
          update: {
            rating: scrapedResult.platforms.google.rating,
            reviewCount: scrapedResult.platforms.google.totalReviews,
            profileUrl: scrapedResult.platforms.google.profileUrl,
            lastScrapedAt: new Date(),
          },
          create: {
            providerProfileId: profile.id,
            platform: 'GOOGLE',
            rating: scrapedResult.platforms.google.rating,
            reviewCount: scrapedResult.platforms.google.totalReviews,
            profileUrl: scrapedResult.platforms.google.profileUrl,
            lastScrapedAt: new Date(),
          },
        })
      );
    }

    if (scrapedResult.platforms.yelp && scrapedResult.platforms.yelp.totalReviews > 0) {
      aggregateUpdates.push(
        this.prisma.platformReview.upsert({
          where: {
            providerProfileId_platform: {
              providerProfileId: profile.id,
              platform: 'YELP',
            },
          },
          update: {
            rating: scrapedResult.platforms.yelp.rating,
            reviewCount: scrapedResult.platforms.yelp.totalReviews,
            profileUrl: scrapedResult.platforms.yelp.profileUrl,
            lastScrapedAt: new Date(),
          },
          create: {
            providerProfileId: profile.id,
            platform: 'YELP',
            rating: scrapedResult.platforms.yelp.rating,
            reviewCount: scrapedResult.platforms.yelp.totalReviews,
            profileUrl: scrapedResult.platforms.yelp.profileUrl,
            lastScrapedAt: new Date(),
          },
        })
      );
    }

    if (scrapedResult.platforms.homeadvisor && scrapedResult.platforms.homeadvisor.totalReviews > 0) {
      aggregateUpdates.push(
        this.prisma.platformReview.upsert({
          where: {
            providerProfileId_platform: {
              providerProfileId: profile.id,
              platform: 'HOMEADVISOR',
            },
          },
          update: {
            rating: scrapedResult.platforms.homeadvisor.rating,
            reviewCount: scrapedResult.platforms.homeadvisor.totalReviews,
            profileUrl: scrapedResult.platforms.homeadvisor.profileUrl,
            lastScrapedAt: new Date(),
          },
          create: {
            providerProfileId: profile.id,
            platform: 'HOMEADVISOR',
            rating: scrapedResult.platforms.homeadvisor.rating,
            reviewCount: scrapedResult.platforms.homeadvisor.totalReviews,
            profileUrl: scrapedResult.platforms.homeadvisor.profileUrl,
            lastScrapedAt: new Date(),
          },
        })
      );
    }

    if (scrapedResult.platforms.houzz && scrapedResult.platforms.houzz.totalReviews > 0) {
      aggregateUpdates.push(
        this.prisma.platformReview.upsert({
          where: {
            providerProfileId_platform: {
              providerProfileId: profile.id,
              platform: 'HOUZZ',
            },
          },
          update: {
            rating: scrapedResult.platforms.houzz.rating,
            reviewCount: scrapedResult.platforms.houzz.totalReviews,
            profileUrl: scrapedResult.platforms.houzz.profileUrl,
            lastScrapedAt: new Date(),
          },
          create: {
            providerProfileId: profile.id,
            platform: 'HOUZZ',
            rating: scrapedResult.platforms.houzz.rating,
            reviewCount: scrapedResult.platforms.houzz.totalReviews,
            profileUrl: scrapedResult.platforms.houzz.profileUrl,
            lastScrapedAt: new Date(),
          },
        })
      );
    }

    await Promise.all(aggregateUpdates);

    // ── Save Individual Review Comments to DB (up to 2,000 max per contractor) ──
    const allScrapedReviews = (scrapedResult.allReviews || []).slice(0, 2000);
    if (allScrapedReviews.length > 0) {
      this.logger.log(
        `💾 Saving ${allScrapedReviews.length} individual review comments to database for "${profile.businessName}"...`
      );

      const runBounded = async <T>(
        items: T[],
        limit: number,
        worker: (item: T, index: number) => Promise<void>
      ) => {
        let idx = 0;
        const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
          while (idx < items.length) {
            const cur = idx++;
            await worker(items[cur], cur);
          }
        });
        await Promise.all(runners);
      };

      // 1. Ingest all external reviewer avatars into Cloudflare R2 with bounded concurrency (zero hotlinks)
      const avatarKeyByUrl = new Map<string, string | null>();
      const uniqueAvatarUrls = [
        ...new Set(
          allScrapedReviews
            .map((r) => (r.authorAvatarUrl || '').trim())
            .filter((u) => u.startsWith('http://') || u.startsWith('https://'))
        ),
      ];
      if (uniqueAvatarUrls.length > 0) {
        await runBounded(uniqueAvatarUrls, 8, async (rawAvatar) => {
          const r2Key = await this.storageService.ingestRemoteImage(
            rawAvatar,
            `providers/avatars/${this.storageService.hashUrl(rawAvatar)}`
          );
          avatarKeyByUrl.set(rawAvatar, r2Key);
        });
      }

      // 1b. Ingest all customer-shared review photos into Cloudflare R2 bucket (100% R2 keys, zero external URLs)
      await this.ensureReviewPhotosColumn();
      const reviewPhotoKeyByUrl = new Map<string, string | null>();
      const uniqueReviewPhotoUrls = [
        ...new Set(
          allScrapedReviews.flatMap((r) =>
            (r.photoUrls || [])
              .map((u) => (u || '').trim())
              .filter((u) => u.startsWith('http://') || u.startsWith('https://'))
          )
        ),
      ];
      if (uniqueReviewPhotoUrls.length > 0) {
        this.logger.log(
          `📸 Ingesting ${uniqueReviewPhotoUrls.length} customer-shared review photos into R2 for "${profile.businessName}"...`
        );
        await runBounded(uniqueReviewPhotoUrls, 8, async (rawPhotoUrl) => {
          const r2Key = await this.storageService.ingestRemoteImage(
            rawPhotoUrl,
            `providers/review-photos/${profile.slug}/${this.storageService.hashUrl(rawPhotoUrl)}`
          );
          reviewPhotoKeyByUrl.set(rawPhotoUrl, r2Key);
        });
      }

      // 2. Preload existing review slots for this provider so distinct reviews sharing (platform, authorName, rating) never overwrite each other
      const existingRows = await this.prisma.scrapedReview.findMany({
        where: { providerProfileId: profile.id },
        select: { platform: true, authorName: true, rating: true, comment: true },
      });

      const normalizeCommentSig = (txt: string) =>
        (txt || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 80);

      const slotCommentSig = new Map<string, string>();
      const seenCommentSigsByPlatform = new Map<string, string>(); // `${platform}|${commentSig}` -> assignedAuthorName

      for (const row of existingRows) {
        const sig = normalizeCommentSig(row.comment);
        const slotKey = `${row.platform}|${row.authorName}|${row.rating}`;
        slotCommentSig.set(slotKey, sig);
        if (sig) {
          seenCommentSigsByPlatform.set(`${row.platform}|${sig}`, row.authorName);
        }
      }

      const preparedReviews: Array<{
        platformEnum: ReviewPlatform;
        finalAuthorName: string;
        storedAvatarKey: string | null;
        storedPhotoKeys: string[];
        intRating: number;
        comment: string;
        reviewDate: string | null;
        sourceUrl: string | null;
        isVerified: boolean;
      }> = [];

      for (let idx = 0; idx < allScrapedReviews.length; idx++) {
        const rev = allScrapedReviews[idx];
        const cleanBody = (rev.comment || '').trim();
        if (cleanBody.length < 8 || cleanBody === 'Great roofing service, highly recommended!') {
          continue;
        }

        const platformEnum = rev.platform as ReviewPlatform;
        const intRating = Math.min(5, Math.max(1, Math.round(Number(rev.rating) || 5)));
        const commentSig = normalizeCommentSig(cleanBody);
        if (!commentSig) continue;

        const baseAuthor = (rev.authorName || '').trim() || `Verified Reviewer #${idx + 1}`;
        const existingSameCommentAuthor = seenCommentSigsByPlatform.get(
          `${platformEnum}|${commentSig}`
        );

        let finalAuthorName = existingSameCommentAuthor || baseAuthor;
        if (!existingSameCommentAuthor) {
          let candidateName = baseAuthor;
          let suffixNum = 2;
          while (true) {
            const slotKey = `${platformEnum}|${candidateName}|${intRating}`;
            const occupiedSig = slotCommentSig.get(slotKey);
            if (!occupiedSig || occupiedSig === commentSig) {
              finalAuthorName = candidateName;
              slotCommentSig.set(slotKey, commentSig);
              seenCommentSigsByPlatform.set(`${platformEnum}|${commentSig}`, finalAuthorName);
              break;
            }
            candidateName = `${baseAuthor} · #${suffixNum++}`;
          }
        }

        const rawAvatar = (rev.authorAvatarUrl || '').trim();
        const storedAvatarKey = rawAvatar
          ? rawAvatar.startsWith('providers/')
            ? rawAvatar
            : avatarKeyByUrl.get(rawAvatar) ?? null
          : null;

        const storedPhotoKeys = [
          ...new Set(
            (rev.photoUrls || [])
              .map((u) => (u || '').trim())
              .map((u) => (u.startsWith('providers/') ? u : reviewPhotoKeyByUrl.get(u) || ''))
              .filter((k) => k.startsWith('providers/'))
          ),
        ];

        preparedReviews.push({
          platformEnum,
          finalAuthorName,
          storedAvatarKey,
          storedPhotoKeys,
          intRating,
          comment: cleanBody,
          reviewDate: rev.reviewDate || null,
          sourceUrl: rev.sourceUrl || null,
          isVerified: rev.isVerified ?? true,
        });
      }

      await runBounded(preparedReviews, 8, async (item) => {
        try {
          const savedRow = await this.prisma.scrapedReview.upsert({
            where: {
              providerProfileId_platform_authorName_rating: {
                providerProfileId: profile.id,
                platform: item.platformEnum,
                authorName: item.finalAuthorName,
                rating: item.intRating,
              },
            },
            update: {
              authorName: item.finalAuthorName,
              ...(item.storedAvatarKey ? { authorAvatarUrl: item.storedAvatarKey } : {}),
              rating: item.intRating,
              comment: item.comment,
              reviewDate: item.reviewDate,
              sourceUrl: item.sourceUrl,
              isVerified: item.isVerified,
            },
            create: {
              providerProfileId: profile.id,
              platform: item.platformEnum,
              authorName: item.finalAuthorName,
              authorAvatarUrl: item.storedAvatarKey,
              rating: item.intRating,
              comment: item.comment,
              reviewDate: item.reviewDate,
              sourceUrl: item.sourceUrl,
              isVerified: item.isVerified,
            },
            select: { id: true },
          });

          if (item.storedPhotoKeys.length > 0 && savedRow?.id) {
            await this.prisma.$executeRawUnsafe(
              `UPDATE \`scraped_reviews\` SET \`photo_urls\` = ? WHERE \`id\` = ?`,
              JSON.stringify(item.storedPhotoKeys),
              savedRow.id
            );
          }
        } catch (err: any) {
          this.logger.debug(`[Scrape DB] Skipped review: ${err.message?.substring(0, 80)}`);
        }
      });

      // Enforce 2,000 max reviews per contractor in DB (keeping newest 2,000 if ever exceeded)
      const totalSavedForProvider = await this.prisma.scrapedReview.count({
        where: { providerProfileId: profile.id },
      });
      if (totalSavedForProvider > 2000) {
        const overflowRows = await this.prisma.scrapedReview.findMany({
          where: { providerProfileId: profile.id },
          orderBy: { createdAt: 'desc' },
          skip: 2000,
          select: { id: true },
        });
        if (overflowRows.length > 0) {
          await this.prisma.scrapedReview.deleteMany({
            where: { id: { in: overflowRows.map((r) => r.id) } },
          });
        }
      }
    }

    // Recompute accurate compositeRating & totalReviews + persist official websiteUrl if discovered or cleaned
    const existingCleanSite = ScraperHttpUtil.normalizeOfficialWebsiteUrl(profile.websiteUrl);
    const discoveredCleanSite = ScraperHttpUtil.normalizeOfficialWebsiteUrl(
      scrapedResult.discoveredWebsiteUrl
    );
    const nextWebsiteUrl = existingCleanSite || discoveredCleanSite || null;

    const allPlatformRows = await this.prisma.platformReview.findMany({
      where: { providerProfileId: profile.id, reviewCount: { gt: 0 } },
    });
    const profilePostScrapeUpdate: Prisma.ProviderProfileUpdateInput = {};
    if (allPlatformRows.length > 0) {
      const totalCount = allPlatformRows.reduce((sum, p) => sum + p.reviewCount, 0);
      const weightedSum = allPlatformRows.reduce(
        (sum, p) => sum + Number(p.rating) * p.reviewCount,
        0
      );
      const composite = Math.round((weightedSum / totalCount) * 10) / 10;
      profilePostScrapeUpdate.totalReviews = totalCount;
      profilePostScrapeUpdate.compositeRating = composite;
    }
    if (nextWebsiteUrl !== (profile.websiteUrl || null)) {
      const hasHouzzRow =
        allPlatformRows.some((p) => p.platform === 'HOUZZ' && p.profileUrl) ||
        Boolean(scrapedResult.platforms.houzz?.profileUrl);
      // Only clear a legacy houzz.com websiteUrl once HOUZZ profileUrl is safely stored or replaced by a real site
      if (nextWebsiteUrl || !profile.websiteUrl?.includes('houzz.com') || hasHouzzRow) {
        profilePostScrapeUpdate.websiteUrl = nextWebsiteUrl;
      }
    }
    if (Object.keys(profilePostScrapeUpdate).length > 0) {
      await this.prisma.providerProfile.update({
        where: { id: profile.id },
        data: profilePostScrapeUpdate,
      });
    }

    this.cache.invalidatePrefix('providers:');

    this.logger.log(`✅ Saved ${allScrapedReviews.length} review comments + aggregates to DB for "${profile.businessName}"`);

    const updatedProvider = await this.findBySlug(slug);
    return {
      provider: updatedProvider,
      scrapedSummary: scrapedResult,
    };
  }

  /**
   * Generate progressive AI review summary for a provider using Mistral small models (20 reviews per batch)
   * Stored directly into database for fast reads.
   */
  async generateAiSummary(slug: string): Promise<{
    provider: FormattedProvider;
    summary: string;
  }> {
    const profile = await this.prisma.providerProfile.findUnique({
      where: { slug },
      include: {
        scrapedReviews: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException(`Provider with slug "${slug}" not found`);
    }

    const reviewsToAnalyze = (profile.scrapedReviews || []).map((r) => ({
      comment: r.comment,
      rating: r.rating,
      authorName: r.authorName,
      platform: r.platform,
      reviewDate: r.reviewDate || undefined,
    }));

    const summary = await this.aiReviewSummaryService.generateProgressiveSummary(
      profile.businessName,
      reviewsToAnalyze
    );

    await this.prisma.providerProfile.update({
      where: { id: profile.id },
      data: {
        aiReviewSummary: summary,
        aiSummaryUpdatedAt: new Date(),
      },
    });

    this.cache.invalidatePrefix('providers:');
    this.logger.log(`✅ Saved AI Review Summary to DB for "${profile.businessName}"`);

    const updatedProvider = await this.findBySlug(slug);
    return {
      provider: updatedProvider,
      summary,
    };
  }

  /**
   * Create and persist a quote request in PostgreSQL
   */
  async createQuoteRequest(payload: {
    providerProfileId?: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    borough?: string;
    zipCode?: string;
    serviceType: string;
    projectNotes?: string;
  }) {
    const trackingNumber = `PV-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .substring(2, 6)
      .toUpperCase()}`;

    const quote = await this.prisma.quoteRequest.create({
      data: {
        trackingNumber,
        providerProfileId: payload.providerProfileId || null,
        customerName: payload.customerName,
        customerEmail: payload.customerEmail,
        customerPhone: payload.customerPhone,
        borough: payload.borough || null,
        zipCode: payload.zipCode || '10001',
        serviceType: payload.serviceType,
        projectNotes: payload.projectNotes || null,
      },
    });

    return quote;
  }

  /**
   * Migrate ALL external image URLs across ProviderProfile (logoUrl, coverImageUrl),
   * ListingPhoto (imageUrl), ScrapedReview (authorAvatarUrl), ServiceCategory (icon),
   * and BlogPost (coverImageUrl, ogImageUrl, authorAvatar) into Cloudflare R2 bucket,
   * replacing raw third-party hotlinks (Houzz, Yelp, contractor websites, etc.) with clean R2 keys.
   */
  async migrateExternalMediaToBucket() {
    const isExternalUrl = (val?: string | null): boolean => {
      if (!val) return false;
      const t = val.trim();
      if (!t.startsWith('http://') && !t.startsWith('https://') && !t.startsWith('//')) {
        return false;
      }
      if (
        t.includes('.r2.cloudflarestorage.com') ||
        t.includes('.amazonaws.com') ||
        t.includes('/api/storage/')
      ) {
        return false;
      }
      return true;
    };

    const runWithConcurrency = async <T>(
      items: T[],
      limit: number,
      worker: (item: T) => Promise<void>
    ) => {
      let idx = 0;
      const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (idx < items.length) {
          const current = items[idx++];
          await worker(current);
        }
      });
      await Promise.all(runners);
    };

    const stats = {
      logosMigrated: 0,
      logosCleared: 0,
      photosMigrated: 0,
      deadPhotosRemoved: 0,
      coversMigrated: 0,
      avatarsMigrated: 0,
      avatarsCleared: 0,
      reviewPhotosMigrated: 0,
      teamPhotosMigrated: 0,
      categoriesMigrated: 0,
      blogsMigrated: 0,
    };

    const uploadedByUrl = new Map<string, string>();

    // 1. Migrate Provider Logos
    const allProviders = await this.prisma.providerProfile.findMany({
      select: { id: true, slug: true, logoUrl: true, coverImageUrl: true },
    });

    await runWithConcurrency(allProviders, 6, async (p) => {
      if (!p.logoUrl) return;
      if (isExternalUrl(p.logoUrl)) {
        const r2Key = await this.storageService.ingestRemoteImage(
          p.logoUrl,
          `providers/logos/${p.slug}`
        );
        if (r2Key) {
          uploadedByUrl.set(p.logoUrl, r2Key);
          await this.prisma.providerProfile.update({
            where: { id: p.id },
            data: { logoUrl: r2Key },
          });
          stats.logosMigrated++;
        } else {
          await this.prisma.providerProfile.update({
            where: { id: p.id },
            data: { logoUrl: null },
          });
          stats.logosCleared++;
        }
      } else if (p.logoUrl.startsWith('http')) {
        const cleanKey = this.storageService.extractCleanKey(p.logoUrl);
        if (cleanKey && cleanKey !== p.logoUrl) {
          await this.prisma.providerProfile.update({
            where: { id: p.id },
            data: { logoUrl: cleanKey },
          });
        }
      }
    });

    // 2. Migrate Listing Portfolio Photos
    const allListings = await this.prisma.listing.findMany({
      include: {
        providerProfile: { select: { id: true, slug: true } },
        photos: { orderBy: { orderIndex: 'asc' } },
      },
    });

    const photoTasks: Array<{
      photoId: string;
      imageUrl: string;
      orderIndex: number;
      providerId: string;
      providerSlug: string;
    }> = [];

    for (const listing of allListings) {
      const slug = listing.providerProfile?.slug || listing.slug;
      const providerId = listing.providerProfileId;
      for (const ph of listing.photos) {
        if (isExternalUrl(ph.imageUrl)) {
          photoTasks.push({
            photoId: ph.id,
            imageUrl: ph.imageUrl,
            orderIndex: ph.orderIndex,
            providerId,
            providerSlug: slug,
          });
        } else if (ph.imageUrl.startsWith('http')) {
          const cleanKey = this.storageService.extractCleanKey(ph.imageUrl);
          if (cleanKey && cleanKey !== ph.imageUrl) {
            await this.prisma.listingPhoto.update({
              where: { id: ph.id },
              data: { imageUrl: cleanKey },
            });
          }
        }
      }
    }

    await runWithConcurrency(photoTasks, 8, async (task) => {
      const shortHash = this.storageService.hashUrl(task.imageUrl);
      const keyBase = `providers/photos/${task.providerSlug}/${String(task.orderIndex + 1).padStart(2, '0')}-${shortHash}`;
      const r2Key = await this.storageService.ingestRemoteImage(task.imageUrl, keyBase);
      if (r2Key) {
        uploadedByUrl.set(task.imageUrl, r2Key);
        await this.prisma.listingPhoto.update({
          where: { id: task.photoId },
          data: { imageUrl: r2Key },
        });
        stats.photosMigrated++;
      } else {
        await this.prisma.listingPhoto.delete({
          where: { id: task.photoId },
        });
        stats.deadPhotosRemoved++;
      }
    });

    // 3. Migrate Provider Cover Images (reusing already uploaded photo R2 key when identical)
    const refreshedProviders = await this.prisma.providerProfile.findMany({
      include: {
        listings: {
          include: {
            photos: { orderBy: { orderIndex: 'asc' }, take: 1 },
          },
        },
      },
    });

    await runWithConcurrency(refreshedProviders, 6, async (p) => {
      if (!p.coverImageUrl) return;
      if (isExternalUrl(p.coverImageUrl)) {
        const reused = uploadedByUrl.get(p.coverImageUrl);
        if (reused) {
          await this.prisma.providerProfile.update({
            where: { id: p.id },
            data: { coverImageUrl: reused },
          });
          stats.coversMigrated++;
          return;
        }
        const r2Key = await this.storageService.ingestRemoteImage(
          p.coverImageUrl,
          `providers/covers/${p.slug}`
        );
        const fallbackPhotoKey = p.listings?.[0]?.photos?.[0]?.imageUrl || null;
        await this.prisma.providerProfile.update({
          where: { id: p.id },
          data: { coverImageUrl: r2Key || fallbackPhotoKey },
        });
        stats.coversMigrated++;
      } else if (p.coverImageUrl.startsWith('http')) {
        const cleanKey = this.storageService.extractCleanKey(p.coverImageUrl);
        if (cleanKey && cleanKey !== p.coverImageUrl) {
          await this.prisma.providerProfile.update({
            where: { id: p.id },
            data: { coverImageUrl: cleanKey },
          });
        }
      }
    });

    // 4. Migrate ScrapedReview Author Avatars (download in parallel, update DB sequentially by PK to avoid MySQL table deadlocks)
    const reviewsWithAvatar = await this.prisma.scrapedReview.findMany({
      where: {
        authorAvatarUrl: { not: null },
      },
      select: { id: true, authorAvatarUrl: true },
    });

    const idsByAvatarUrl = new Map<string, string[]>();
    for (const r of reviewsWithAvatar) {
      const url = r.authorAvatarUrl || '';
      if (!isExternalUrl(url)) continue;
      const list = idsByAvatarUrl.get(url) || [];
      list.push(r.id);
      idsByAvatarUrl.set(url, list);
    }

    const uniqueExternalAvatars = Array.from(idsByAvatarUrl.keys());
    const avatarR2Map = new Map<string, string | null>();

    await runWithConcurrency(uniqueExternalAvatars, 8, async (avatarUrl) => {
      const r2Key = await this.storageService.ingestRemoteImage(
        avatarUrl,
        `providers/avatars/${this.storageService.hashUrl(avatarUrl)}`
      );
      avatarR2Map.set(avatarUrl, r2Key);
    });

    for (const [avatarUrl, ids] of idsByAvatarUrl.entries()) {
      const r2Key = avatarR2Map.get(avatarUrl) ?? null;
      const updated = await this.prisma.scrapedReview.updateMany({
        where: { id: { in: ids } },
        data: { authorAvatarUrl: r2Key },
      });
      if (r2Key) {
        stats.avatarsMigrated += updated.count;
      } else {
        stats.avatarsCleared += updated.count;
      }
    }

    // 4b. Migrate any customer-shared review photos in scraped_reviews.photo_urls
    await this.ensureReviewPhotosColumn();
    const slugByProviderId = new Map(allProviders.map((p) => [p.id, p.slug]));
    const rowsWithReviewPhotos = await this.prisma
      .$queryRawUnsafe<Array<{ id: string; providerProfileId: string; photo_urls: unknown }>>(
        `SELECT id, providerProfileId, photo_urls FROM \`scraped_reviews\` WHERE \`photo_urls\` IS NOT NULL`
      )
      .catch(() => [] as Array<{ id: string; providerProfileId: string; photo_urls: unknown }>);

    for (const row of rowsWithReviewPhotos) {
      let arr: unknown = row.photo_urls;
      if (typeof arr === 'string') {
        try {
          arr = JSON.parse(arr);
        } catch {
          arr = [];
        }
      }
      if (!Array.isArray(arr) || arr.length === 0) continue;

      let changed = false;
      const cleanKeys: string[] = [];
      const provSlug = slugByProviderId.get(row.providerProfileId) || 'contractor';

      for (const rawEntry of arr) {
        if (typeof rawEntry !== 'string') {
          changed = true;
          continue;
        }
        const trimmed = rawEntry.trim();
        if (trimmed.startsWith('providers/')) {
          cleanKeys.push(trimmed);
        } else if (isExternalUrl(trimmed)) {
          changed = true;
          const r2Key = await this.storageService.ingestRemoteImage(
            trimmed,
            `providers/review-photos/${provSlug}/${this.storageService.hashUrl(trimmed)}`
          );
          if (r2Key) {
            cleanKeys.push(r2Key);
            stats.reviewPhotosMigrated++;
          }
        } else if (trimmed.startsWith('http')) {
          changed = true;
          const extracted = this.storageService.extractCleanKey(trimmed);
          if (extracted && extracted.startsWith('providers/')) {
            cleanKeys.push(extracted);
          }
        }
      }

      if (changed) {
        await this.prisma.$executeRawUnsafe(
          `UPDATE \`scraped_reviews\` SET \`photo_urls\` = ? WHERE \`id\` = ?`,
          cleanKeys.length > 0 ? JSON.stringify(cleanKeys) : null,
          row.id
        );
      }
    }

    // 5. Migrate Categories & Blogs if any external URLs exist
    const categories = await this.prisma.serviceCategory.findMany();
    for (const cat of categories) {
      if (isExternalUrl(cat.icon)) {
        const r2Key = await this.storageService.ingestRemoteImage(
          cat.icon,
          `categories/${cat.slug}`
        );
        if (r2Key) {
          await this.prisma.serviceCategory.update({
            where: { id: cat.id },
            data: { icon: r2Key },
          });
          stats.categoriesMigrated++;
        }
      }
    }

    const blogs = await this.prisma.blogPost.findMany();
    for (const blog of blogs) {
      const blogUpdate: Record<string, string | null> = {};
      if (isExternalUrl(blog.coverImageUrl)) {
        blogUpdate.coverImageUrl = await this.storageService.ingestRemoteImage(
          blog.coverImageUrl,
          `blogs/covers/${blog.slug}`
        );
      }
      if (isExternalUrl(blog.ogImageUrl)) {
        blogUpdate.ogImageUrl =
          blogUpdate.coverImageUrl !== undefined
            ? blogUpdate.coverImageUrl
            : await this.storageService.ingestRemoteImage(
                blog.ogImageUrl,
                `blogs/og/${blog.slug}`
              );
      }
      if (isExternalUrl(blog.authorAvatar)) {
        blogUpdate.authorAvatar = await this.storageService.ingestRemoteImage(
          blog.authorAvatar,
          `blogs/authors/${this.storageService.hashUrl(blog.authorAvatar!)}`
        );
      }
      if (Object.keys(blogUpdate).length > 0) {
        await this.prisma.blogPost.update({
          where: { id: blog.id },
          data: blogUpdate,
        });
        stats.blogsMigrated++;
      }
    }

    // 5b. Migrate any external team member headshots in provider_team_members
    await this.ensureTeamMembersTable();
    const teamRows = await this.prisma
      .$queryRawUnsafe<
        Array<{ id: string; providerProfileId: string; name: string; imageUrl: string | null }>
      >(
        `SELECT id, providerProfileId, name, imageUrl FROM \`provider_team_members\` WHERE \`imageUrl\` IS NOT NULL`
      )
      .catch(() => []);
    for (const trow of teamRows) {
      const rawImg = (trow.imageUrl || '').trim();
      if (!rawImg) continue;
      if (isExternalUrl(rawImg)) {
        const provSlug = slugByProviderId.get(trow.providerProfileId) || 'contractor';
        const memberSlug = this.projectsScraperService.slugify(trow.name) || 'member';
        const r2Key = await this.storageService.ingestRemoteImage(
          rawImg,
          `providers/team/${provSlug}/${memberSlug}-${this.storageService.hashUrl(rawImg).slice(0, 8)}`
        );
        await this.prisma.$executeRawUnsafe(
          `UPDATE \`provider_team_members\` SET \`imageUrl\` = ? WHERE \`id\` = ?`,
          r2Key || null,
          trow.id
        );
        if (r2Key) stats.teamPhotosMigrated++;
      } else if (rawImg.startsWith('http')) {
        const extracted = this.storageService.extractCleanKey(rawImg);
        await this.prisma.$executeRawUnsafe(
          `UPDATE \`provider_team_members\` SET \`imageUrl\` = ? WHERE \`id\` = ?`,
          extracted && extracted.startsWith('providers/') ? extracted : null,
          trow.id
        );
      }
    }

    // 6. Clear & re-warm all caches
    this.cache.invalidatePrefix('blogs:');
    await this.clearCache();

    this.logger.log(`✅ Completed R2 media migration: ${JSON.stringify(stats)}`);
    return stats;
  }

  /**
   * Scrape full authentic multi-photo project albums for a single contractor from Houzz / Official Website,
   * ingest 100% of project photos into Cloudflare R2 bucket (zero hotlinking), persist ProviderProject +
   * ProviderProjectPhoto rows, and refresh ListingPhoto + coverImageUrl with crisp R2 project photos.
   */
  async syncProviderProjects(
    slug: string,
    options?: { maxProjects?: number; maxPhotosPerProject?: number; skipProjects?: boolean }
  ): Promise<{
    slug: string;
    businessName: string;
    officialWebsiteUrl: string | null;
    sourceUsed: 'WEBSITE' | 'HOUZZ' | 'NONE';
    logoUpdated: boolean;
    descriptionRewritten: boolean;
    teamMembersSaved: number;
    projectsSaved: number;
    photosUploadedToR2: number;
    provider: FormattedProvider;
  }> {
    const profile = await this.prisma.providerProfile.findUnique({
      where: { slug },
      include: {
        platformReviews: true,
        projects: { select: { id: true } },
        listings: {
          include: {
            category: true,
            subServices: { include: { subService: true } },
            serviceAreas: true,
            photos: { orderBy: { orderIndex: 'asc' } },
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException(`Provider with slug "${slug}" not found`);
    }

    const fallbackHouzzFromWebsite = profile.websiteUrl?.includes('houzz.com')
      ? profile.websiteUrl
      : null;
    const houzzUrl =
      profile.platformReviews.find((p) => p.platform === 'HOUZZ')?.profileUrl ||
      fallbackHouzzFromWebsite;

    const brandAndProjects = await this.projectsScraperService.scrapeProviderBrandAndProjects({
      businessName: profile.businessName,
      boroughOrCity: profile.borough || profile.city,
      houzzUrl,
      websiteUrl: profile.websiteUrl,
      maxProjects: options?.maxProjects ?? 12,
      maxPhotosPerProject: options?.maxPhotosPerProject ?? 12,
      skipProjects: options?.skipProjects ?? false,
    });

    const scrapedProjects = brandAndProjects.projects;

    // Persist discovered Houzz URL on existing HOUZZ platform row if missing
    if (brandAndProjects.discoveredHouzzUrl) {
      const existingHz = profile.platformReviews.find((p) => p.platform === 'HOUZZ');
      if (existingHz && !existingHz.profileUrl) {
        await this.prisma.platformReview
          .update({
            where: { id: existingHz.id },
            data: { profileUrl: brandAndProjects.discoveredHouzzUrl },
          })
          .catch(() => {});
      }
    }

    // Persist Official Website URL + Official Website Brand Logo into Cloudflare R2
    let newLogoKey: string | null = null;
    if (brandAndProjects.logoSourceUrl) {
      const logoHash = this.storageService.hashUrl(brandAndProjects.logoSourceUrl).slice(0, 8);
      newLogoKey = await this.storageService.ingestRemoteImage(
        brandAndProjects.logoSourceUrl,
        `providers/logos/${profile.slug}-site-${logoHash}`
      );
    }
    if (
      !newLogoKey &&
      brandAndProjects.logoPngBuffer &&
      brandAndProjects.logoPngBuffer.length > 200
    ) {
      const bufHash = this.storageService
        .hashUrl(
          `${profile.slug}-${brandAndProjects.officialWebsiteUrl || 'site'}-${brandAndProjects.logoPngBuffer.length}`
        )
        .slice(0, 8);
      const candidateKey = `providers/logos/${profile.slug}-site-${bufHash}.png`;
      await this.storageService.putObject(
        brandAndProjects.logoPngBuffer,
        candidateKey,
        'image/png'
      );
      newLogoKey = candidateKey;
    }

    // AI-rewrite Contractor "About" Business Description (prioritizing official website About copy)
    const primaryCategoryName = profile.listings?.[0]?.category?.name || undefined;
    const providerServiceNames =
      profile.listings?.flatMap(
        (l: any) => l.subServices?.map((ss: any) => ss.subService?.name).filter(Boolean) || []
      ) || [];
    const providerServiceAreas =
      profile.listings?.flatMap(
        (l: any) => l.serviceAreas?.map((sa: any) => sa.areaName).filter(Boolean) || []
      ) || [];

    let aiBusinessDesc: string | null = null;
    try {
      const rewrittenAbout = await this.aiReviewSummaryService.rewriteBusinessDescription({
        businessName: profile.businessName,
        category: primaryCategoryName,
        services: providerServiceNames,
        boroughOrCity: profile.borough || profile.city || undefined,
        serviceAreas: providerServiceAreas,
        sinceYear: profile.sinceYear,
        isLicensed: profile.isLicensed,
        isInsured: profile.isInsured,
        hasWarranty: profile.hasWarranty,
        rawWebsiteAbout: brandAndProjects.websiteAboutDescription,
        fallbackBio: profile.description,
      });
      if (rewrittenAbout && rewrittenAbout.length >= 35) {
        aiBusinessDesc = rewrittenAbout;
      }
    } catch (aiDescErr: any) {
      this.logger.warn(
        `⚠️ [AI About Rewrite] Could not rewrite business description for "${profile.businessName}": ${aiDescErr.message}`
      );
    }

    const existingCleanSite = ScraperHttpUtil.normalizeOfficialWebsiteUrl(profile.websiteUrl);
    const finalWebsiteUrl = brandAndProjects.officialWebsiteUrl || existingCleanSite || null;
    const profileBrandUpdate: Prisma.ProviderProfileUpdateInput = {};
    if (finalWebsiteUrl !== (profile.websiteUrl || null)) {
      profileBrandUpdate.websiteUrl = finalWebsiteUrl;
    }
    if (newLogoKey) {
      profileBrandUpdate.logoUrl = newLogoKey;
    }
    if (aiBusinessDesc) {
      profileBrandUpdate.description = aiBusinessDesc;
    }
    if (Object.keys(profileBrandUpdate).length > 0) {
      await this.prisma.providerProfile.update({
        where: { id: profile.id },
        data: profileBrandUpdate,
      });
    }

    const runWithConcurrency = async <T>(
      items: T[],
      limit: number,
      worker: (item: T, index: number) => Promise<void>
    ) => {
      let cursor = 0;
      const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (cursor < items.length) {
          const i = cursor++;
          await worker(items[i], i);
        }
      });
      await Promise.all(runners);
    };

    // Persist Website "The team" Members (100% R2 headshots + AI-rewritten bios; 0 rows if contractor has no team on website)
    await this.ensureTeamMembersTable();
    let teamMembersSaved = 0;
    if (brandAndProjects.officialWebsiteUrl) {
      const preparedTeam: Array<{
        order: number;
        name: string;
        role: string | null;
        credentials: string | null;
        bio: string | null;
        r2ImageKey: string | null;
        sourceUrl: string | null;
      }> = [];

      await runWithConcurrency(brandAndProjects.teamMembers, 4, async (member, mIdx) => {
        let r2ImageKey: string | null = null;
        if (member.photoSourceUrl) {
          const memberSlug = this.projectsScraperService.slugify(member.name) || `member-${mIdx + 1}`;
          const photoHash = this.storageService.hashUrl(member.photoSourceUrl).slice(0, 8);
          r2ImageKey = await this.storageService.ingestRemoteImage(
            member.photoSourceUrl,
            `providers/team/${profile.slug}/${memberSlug}-${photoHash}`
          );
        }

        let cleanBio: string | null = null;
        if (member.bio && member.bio.trim().length >= 20) {
          try {
            const rewrittenMemberBio = await this.aiReviewSummaryService.rewriteTeamMemberBio({
              businessName: profile.businessName,
              memberName: member.name,
              role: member.role,
              credentials: member.credentials,
              rawBio: member.bio,
            });
            if (rewrittenMemberBio && rewrittenMemberBio.length >= 15) {
              cleanBio = rewrittenMemberBio;
            }
          } catch {}
        }

        preparedTeam.push({
          order: mIdx,
          name: member.name.slice(0, 180),
          role: member.role ? member.role.slice(0, 180) : null,
          credentials: member.credentials ? member.credentials.slice(0, 180) : null,
          bio: cleanBio,
          r2ImageKey,
          sourceUrl: member.sourceUrl || finalWebsiteUrl,
        });
      });

      preparedTeam.sort((a, b) => a.order - b.order);

      await this.prisma.$executeRawUnsafe(
        `DELETE FROM \`provider_team_members\` WHERE \`providerProfileId\` = ?`,
        profile.id
      );

      for (let tIdx = 0; tIdx < preparedTeam.length; tIdx++) {
        const tm = preparedTeam[tIdx];
        await this.prisma.$executeRawUnsafe(
          `INSERT INTO \`provider_team_members\` (\`id\`, \`providerProfileId\`, \`name\`, \`role\`, \`credentials\`, \`bio\`, \`imageUrl\`, \`sourceUrl\`, \`orderIndex\`, \`createdAt\`, \`updatedAt\`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3))`,
          randomUUID(),
          profile.id,
          tm.name,
          tm.role,
          tm.credentials,
          tm.bio,
          tm.r2ImageKey,
          tm.sourceUrl,
          tIdx
        );
        teamMembersSaved++;
      }
    } else {
      await this.prisma.$executeRawUnsafe(
        `DELETE FROM \`provider_team_members\` WHERE \`providerProfileId\` = ?`,
        profile.id
      );
    }

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

    let totalUploadedPhotos = 0;

    for (const proj of scrapedProjects) {
      const uploadedPhotos: Array<{
        order: number;
        r2Key: string;
        caption?: string;
        width?: number;
        height?: number;
      }> = [];

      await runWithConcurrency(proj.photos, 6, async (photo, pIdx) => {
        const shortHash = this.storageService.hashUrl(photo.sourceUrl);
        const keyBase = `providers/projects/${profile.slug}/${proj.slug}/${String(
          pIdx + 1
        ).padStart(2, '0')}-${shortHash}`;
        const r2Key = await this.storageService.ingestRemoteImage(photo.sourceUrl, keyBase);
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
        totalUploadedPhotos += uploadedPhotos.length;

        const primaryCatName = profile.listings?.[0]?.category?.name || undefined;
        const verifiedServiceNames =
          profile.listings?.flatMap(
            (l: any) => l.subServices?.map((ss: any) => ss.subService?.name).filter(Boolean) || []
          ) || [];

        let seoOriginalDesc: string | undefined;
        try {
          seoOriginalDesc = await this.aiReviewSummaryService.rewriteProjectDescription({
            businessName: profile.businessName,
            category: primaryCatName,
            services: verifiedServiceNames,
            boroughOrCity: profile.borough || profile.city || undefined,
            title: proj.title,
            rawDescription: proj.description,
            location: proj.location,
            projectYear: proj.projectYear,
            costRange: proj.costRange,
            photoCount: uploadedPhotos.length,
            photoCaptions: uploadedPhotos
              .map((ph) => ph.caption || '')
              .filter(Boolean),
          });
        } catch (aiErr: any) {
          this.logger.warn(
            `⚠️ [AI Project Rewrite] Could not rewrite "${proj.title}": ${aiErr.message}`
          );
        }

        uploadedProjects.push({
          title: proj.title,
          slug: proj.slug,
          description: seoOriginalDesc || undefined,
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

    const primaryListing = profile.listings?.[0];

    if (uploadedProjects.length > 0) {
      // Replace provider's structured projects with freshly scraped R2-backed albums
      await this.prisma.providerProject.deleteMany({
        where: { providerProfileId: profile.id },
      });

      for (let projIdx = 0; projIdx < uploadedProjects.length; projIdx++) {
        const up = uploadedProjects[projIdx];
        await this.prisma.providerProject.create({
          data: {
            providerProfileId: profile.id,
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

      // Build diverse top showcase photos (round-robin across project albums first) for ListingPhoto & Hero Carousel
      const showcasePhotos: Array<{ r2Key: string; caption: string }> = [];
      const seenKeys = new Set<string>();
      const maxDepth = Math.max(...uploadedProjects.map((p) => p.photos.length));

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
        await this.prisma.listingPhoto.deleteMany({
          where: { listingId: primaryListing.id },
        });
        await this.prisma.listingPhoto.createMany({
          data: showcasePhotos.map((sp, idx) => ({
            listingId: primaryListing.id,
            imageUrl: sp.r2Key,
            caption: sp.caption,
            category: idx === 0 ? PhotoCategory.HERO : PhotoCategory.PORTFOLIO,
            orderIndex: idx,
          })),
        });
        await this.prisma.providerProfile.update({
          where: { id: profile.id },
          data: { coverImageUrl: showcasePhotos[0].r2Key },
        });
      }
    } else if (!options?.skipProjects) {
      if ((profile.projects?.length || 0) === 0) {
        await this.prisma.providerProject.deleteMany({
          where: { providerProfileId: profile.id },
        });
      } else {
        this.logger.warn(
          `⚠️ [Projects Sync] 0 freshly scraped projects for "${profile.businessName}" — preserving ${profile.projects.length} existing R2 projects`
        );
      }
      if (primaryListing) {
        // Purge any legacy non-work photos (license, office, truck) even if no new project albums were scraped
        const badPhotos = primaryListing.photos.filter((ph) =>
          /\b(license|truck|office|logo|badge)\b/i.test(`${ph.caption || ''} ${ph.imageUrl || ''}`)
        );
        if (badPhotos.length > 0) {
          await this.prisma.listingPhoto.deleteMany({
            where: { id: { in: badPhotos.map((b) => b.id) } },
          });
        }
      }
    }

    this.cache.invalidatePrefix('providers:');
    const updatedProvider = await this.findBySlug(slug);

    this.logger.log(
      `✅ [Brand/Team/Projects Sync] ${profile.businessName} [${brandAndProjects.sourceUsed}] (site: ${
        finalWebsiteUrl || 'none'
      }, logoUpdated: ${Boolean(newLogoKey)}, aiBio: ${Boolean(
        aiBusinessDesc
      )}, team: ${teamMembersSaved}): ${
        uploadedProjects.length || updatedProvider.projectCount || 0
      } projects (${totalUploadedPhotos} new R2 photos)`
    );

    return {
      slug: profile.slug,
      businessName: profile.businessName,
      officialWebsiteUrl: finalWebsiteUrl,
      sourceUsed: brandAndProjects.sourceUsed,
      logoUpdated: Boolean(newLogoKey),
      descriptionRewritten: Boolean(aiBusinessDesc),
      teamMembersSaved,
      projectsSaved: uploadedProjects.length || updatedProvider.projectCount || 0,
      photosUploadedToR2: totalUploadedPhotos,
      provider: updatedProvider,
    };
  }

  /**
   * Fast Website Brand + AI About Description + Website Team ("The team") sync for a single contractor
   * without re-downloading existing R2 project albums.
   */
  async syncProviderBrandAndTeam(slug: string) {
    return this.syncProviderProjects(slug, { skipProjects: true });
  }

  /**
   * Fast Website Brand + AI About Description + Website Team ("The team") sync across all active providers.
   */
  async syncAllProviderBrandAndTeam() {
    const activeProviders = await this.prisma.providerProfile.findMany({
      where: { isActive: true },
      select: { slug: true, businessName: true },
      orderBy: { compositeRating: 'desc' },
    });

    const results: Array<{
      slug: string;
      businessName: string;
      officialWebsiteUrl?: string | null;
      logoUpdated?: boolean;
      descriptionRewritten?: boolean;
      teamMembersSaved: number;
      error?: string;
    }> = [];

    for (const prov of activeProviders) {
      try {
        const res = await this.syncProviderBrandAndTeam(prov.slug);
        results.push({
          slug: res.slug,
          businessName: res.businessName,
          officialWebsiteUrl: res.officialWebsiteUrl,
          logoUpdated: res.logoUpdated,
          descriptionRewritten: res.descriptionRewritten,
          teamMembersSaved: res.teamMembersSaved,
        });
      } catch (err: any) {
        this.logger.error(`Failed brand/team sync for ${prov.slug}: ${err.message}`);
        results.push({
          slug: prov.slug,
          businessName: prov.businessName,
          teamMembersSaved: 0,
          error: err.message,
        });
      }
    }

    await this.clearCache();
    return {
      totalProviders: activeProviders.length,
      providersWithTeam: results.filter((r) => r.teamMembersSaved > 0).length,
      totalTeamMembersSaved: results.reduce((acc, r) => acc + r.teamMembersSaved, 0),
      descriptionsRewritten: results.filter((r) => r.descriptionRewritten).length,
      results,
    };
  }

  /**
   * Complete permanent 1-stop scraper pipeline for a contractor:
   *   1) Official Website discovery + Website Logo -> R2
   *   2) Website "About" description -> AI-rewritten SEO-original description
   *   3) Website "The team" members -> R2 headshots + AI-rewritten bios
   *   4) Website-first Project Albums (+ Houzz fallback) -> R2 photos + AI-rewritten project descriptions
   *   5) Up to 2,000 Reviews across Google/Yelp/HomeAdvisor/Houzz -> R2 avatars + R2 review photos
   *   6) Progressive AI Review Summary
   */
  async syncFullProvider(slug: string, maxReviews = 2000) {
    const brandAndProjectsRes = await this.syncProviderProjects(slug);
    const reviewsRes = await this.syncReviews(slug, undefined, maxReviews);
    let aiSummaryGenerated = false;
    try {
      await this.generateAiSummary(slug);
      aiSummaryGenerated = true;
    } catch (err: any) {
      this.logger.warn(`AI summary generation skipped for ${slug}: ${err.message}`);
    }
    const finalProvider = await this.findBySlug(slug);
    return {
      slug,
      businessName: finalProvider.name,
      officialWebsiteUrl: brandAndProjectsRes.officialWebsiteUrl,
      logoUpdated: brandAndProjectsRes.logoUpdated,
      descriptionRewritten: brandAndProjectsRes.descriptionRewritten,
      teamMembersSaved: brandAndProjectsRes.teamMembersSaved,
      projectsSaved: brandAndProjectsRes.projectsSaved,
      photosUploadedToR2: brandAndProjectsRes.photosUploadedToR2,
      reviewsSaved: finalProvider.scrapedReviews?.length || 0,
      totalAggregateReviews: finalProvider.totalReviews || 0,
      aiSummaryGenerated,
      provider: finalProvider,
    };
  }

  /**
   * Run complete permanent 1-stop scraper pipeline across all active providers.
   */
  async syncFullAllProviders(maxReviews = 2000) {
    const activeProviders = await this.prisma.providerProfile.findMany({
      where: { isActive: true },
      select: { slug: true, businessName: true },
      orderBy: { compositeRating: 'desc' },
    });

    const results: Array<Record<string, any>> = [];
    for (const prov of activeProviders) {
      try {
        const res = await this.syncFullProvider(prov.slug, maxReviews);
        const { provider: _omitted, ...summary } = res;
        results.push(summary);
      } catch (err: any) {
        this.logger.error(`Full pipeline failed for ${prov.slug}: ${err.message}`);
        results.push({
          slug: prov.slug,
          businessName: prov.businessName,
          error: err.message,
        });
      }
    }

    await this.clearCache();
    return {
      totalProviders: activeProviders.length,
      results,
    };
  }

  /**
   * Sync projects across all active providers sequentially.
   */
  async syncAllProviderProjects() {
    const activeProviders = await this.prisma.providerProfile.findMany({
      where: { isActive: true },
      select: { slug: true, businessName: true },
      orderBy: { compositeRating: 'desc' },
    });

    const results: Array<{
      slug: string;
      businessName: string;
      officialWebsiteUrl?: string | null;
      sourceUsed?: string;
      logoUpdated?: boolean;
      projectsSaved: number;
      photosUploadedToR2: number;
      error?: string;
    }> = [];

    for (const prov of activeProviders) {
      try {
        const res = await this.syncProviderProjects(prov.slug);
        results.push({
          slug: res.slug,
          businessName: res.businessName,
          officialWebsiteUrl: res.officialWebsiteUrl,
          sourceUsed: res.sourceUsed,
          logoUpdated: res.logoUpdated,
          projectsSaved: res.projectsSaved,
          photosUploadedToR2: res.photosUploadedToR2,
        });
      } catch (err: any) {
        this.logger.error(`Failed project sync for ${prov.slug}: ${err.message}`);
        results.push({
          slug: prov.slug,
          businessName: prov.businessName,
          projectsSaved: 0,
          photosUploadedToR2: 0,
          error: err.message,
        });
      }
    }

    await this.clearCache();
    return {
      totalProviders: activeProviders.length,
      totalProjectsSaved: results.reduce((acc, r) => acc + r.projectsSaved, 0),
      totalPhotosUploadedToR2: results.reduce((acc, r) => acc + r.photosUploadedToR2, 0),
      results,
    };
  }

  /**
   * Sync reviews across all active providers sequentially (up to 2,000 reviews per contractor).
   */
  async syncAllProviderReviews(platforms?: string[], maxReviewsPerProvider = 2000) {
    const activeProviders = await this.prisma.providerProfile.findMany({
      where: { isActive: true },
      select: { slug: true, businessName: true },
      orderBy: { compositeRating: 'desc' },
    });

    const results: Array<{
      slug: string;
      businessName: string;
      scrapedNow: number;
      totalSavedInDb: number;
      totalAggregateReviews: number;
      error?: string;
    }> = [];

    for (const prov of activeProviders) {
      try {
        const res = await this.syncReviews(prov.slug, platforms, maxReviewsPerProvider);
        results.push({
          slug: prov.slug,
          businessName: prov.businessName,
          scrapedNow: res.scrapedSummary.allReviews.length,
          totalSavedInDb: res.provider.scrapedReviews?.length || 0,
          totalAggregateReviews: res.provider.totalReviews || 0,
        });
      } catch (err: any) {
        this.logger.error(`Failed review sync for ${prov.slug}: ${err.message}`);
        results.push({
          slug: prov.slug,
          businessName: prov.businessName,
          scrapedNow: 0,
          totalSavedInDb: 0,
          totalAggregateReviews: 0,
          error: err.message,
        });
      }
    }

    await this.clearCache();
    return {
      totalProviders: activeProviders.length,
      totalSavedInDb: results.reduce((acc, r) => acc + r.totalSavedInDb, 0),
      results,
    };
  }

  /**
   * Enrich & AI-rewrite all ProviderProject descriptions in MariaDB into 100% original,
   * crawler-safe portfolio prose (zero verbatim Houzz wording, zero re-uploading of R2 photos).
   */
  async rewriteAllProjectDescriptions(options?: { slug?: string; force?: boolean }) {
    const force = options?.force ?? true;

    const projects = await this.prisma.providerProject.findMany({
      where: options?.slug
        ? { providerProfile: { slug: options.slug } }
        : undefined,
      include: {
        photos: { orderBy: { orderIndex: 'asc' } },
        providerProfile: {
          include: {
            listings: {
              include: {
                category: true,
                subServices: { include: { subService: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const targets = force
      ? projects
      : projects.filter((p) => !p.description || p.description.trim().length < 25);

    this.logger.log(
      `✍️ [AI Project Rewrite] Rewriting ${targets.length}/${projects.length} project descriptions with OpenRouter Mistral...`
    );

    let updatedCount = 0;
    let rawSourceFoundCount = 0;
    const errors: Array<{ projectId: string; title: string; error: string }> = [];

    let cursor = 0;
    const concurrency = 4;
    const workers = Array.from(
      { length: Math.min(concurrency, Math.max(1, targets.length)) },
      async () => {
        while (cursor < targets.length) {
          const proj = targets[cursor++];
          try {
            const rawFromSource = await this.projectsScraperService.extractRawDescriptionFromSourceUrl(
              proj.sourceUrl
            );
            if (rawFromSource) {
              rawSourceFoundCount++;
            }

            const prof = proj.providerProfile;
            const categoryName = prof.listings?.[0]?.category?.name || undefined;
            const serviceNames =
              prof.listings?.flatMap(
                (l) => l.subServices?.map((ss) => ss.subService?.name).filter(Boolean) || []
              ) || [];

            const rewritten = await this.aiReviewSummaryService.rewriteProjectDescription({
              businessName: prof.businessName,
              category: categoryName,
              services: serviceNames,
              boroughOrCity: prof.borough || prof.city || undefined,
              title: proj.title,
              rawDescription: rawFromSource || proj.description,
              location: proj.location,
              projectYear: proj.projectYear,
              costRange: proj.costRange,
              photoCount: proj.photos.length || proj.photoCount,
              photoCaptions: proj.photos.map((ph) => ph.caption || '').filter(Boolean),
            });

            if (rewritten && rewritten.length >= 20) {
              await this.prisma.providerProject.update({
                where: { id: proj.id },
                data: { description: rewritten },
              });
              updatedCount++;
            }
          } catch (err: any) {
            this.logger.warn(
              `⚠️ [AI Project Rewrite] Failed on "${proj.title}" (${proj.id}): ${err.message}`
            );
            errors.push({
              projectId: proj.id,
              title: proj.title,
              error: err.message,
            });
          }
        }
      }
    );

    await Promise.all(workers);
    await this.clearCache();

    return {
      totalProjects: projects.length,
      targetedProjects: targets.length,
      rawSourceNotesExtracted: rawSourceFoundCount,
      rewrittenAndSaved: updatedCount,
      errors,
    };
  }
}
