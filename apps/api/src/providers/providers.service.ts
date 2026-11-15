import { Injectable, Logger, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { MemoryCacheService } from '../common/cache';
import { ReviewsScraperService, MultiPlatformScrapeResult } from '../scrapers';
import { AiReviewSummaryService } from './ai-review-summary.service';
import { GetProvidersQueryDto } from './dto/get-providers.dto';
import { Prisma, ReviewPlatform } from '@prisma/client';

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
  }>;
}

@Injectable()
export class ProvidersService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ProvidersService.name);

  private static readonly LIST_CACHE_TTL_MS = 5 * 60 * 1000; // 5 min fresh
  private static readonly LIST_CACHE_SWR_MS = 25 * 60 * 1000; // +25 min SWR
  private static readonly TAXONOMY_CACHE_TTL_MS = 10 * 60 * 1000; // 10 min fresh
  private static readonly TAXONOMY_CACHE_SWR_MS = 50 * 60 * 1000; // +50 min SWR

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly cache: MemoryCacheService,
    private readonly reviewsScraperService: ReviewsScraperService,
    private readonly aiReviewSummaryService: AiReviewSummaryService
  ) {}

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
      const allScraped = await this.prisma.scrapedReview.findMany({
        where: { providerProfileId: { in: ids } },
        orderBy: { createdAt: 'desc' },
      });
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
        if (arr.length < 50) {
          arr.push({
            authorName: sr.authorName,
            authorAvatarUrl: sr.authorAvatarUrl || undefined,
            rating: sr.rating,
            comment: sr.comment,
            reviewDate: sr.reviewDate || undefined,
            platform: sr.platform,
            sourceUrl: sr.sourceUrl || undefined,
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
        this.cache.set(
          `providers:slug:${item.slug}`,
          {
            ...item,
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

    this.logger.log('⚡ Warmed up Providers, Profiles, Categories & Filters cache');
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
            { authorName: 'EL' },
          ],
        },
      })
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
    const scrapedReviews = (provider.scrapedReviews || [])
      .filter((sr: any) => {
        const c = String(sr.comment || '').trim();
        if (c.length < 25) return false;
        if (/^Average rating:/i.test(c)) return false;
        if (/^[A-Za-z0-9+/]{20,}/.test(c)) return false;
        if (/\b\d+\s+Photos\b/i.test(c) && /\bMon\s*-/i.test(c)) return false;
        if (/^\d+\s+[A-Za-z0-9\s.,#-]+NY\s+\d{5}$/i.test(c)) return false;
        return true;
      })
      .map((sr: any) => ({
        authorName: sr.authorName,
        authorAvatarUrl: sr.authorAvatarUrl || undefined,
        rating: sr.rating,
        comment: sr.comment,
        reviewDate: sr.reviewDate || undefined,
        platform: sr.platform,
        sourceUrl: sr.sourceUrl || undefined,
      }));

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
      borough: provider.borough || '',
      city: provider.city || undefined,
      state: provider.state || undefined,
      zipCode: provider.zipCode || undefined,
      address: provider.address || '',
      servesArea: computedServesArea,
      serviceAreas: uniqueServiceAreas,
      phone: provider.phone || '',
      displayPhone: this.formatDisplayPhone(provider.phone || ''),
      website: provider.websiteUrl || '',
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

    const [categories, listings, platformReviews, scrapedReviews] = await Promise.all([
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
            take: providerIds.length === 1 ? 300 : 50 * providerIds.length,
          })
        : Promise.resolve([]),
    ]);

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
      arr.push(sr);
      scrapedByProvider.set(sr.providerProfileId, arr);
    }

    return Promise.all(
      rawProviders.map((p) =>
        this.formatProvider({
          ...p,
          listings: listingsByProvider.get(p.id) || [],
          platformReviews: platformByProvider.get(p.id) || [],
          scrapedReviews: scrapedByProvider.get(p.id) || [],
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
   * Sync and scrape latest live reviews from Google, Yelp, HomeAdvisor & Houzz for a provider.
   * Saves both aggregate ratings AND individual review comments to database.
   */
  async syncReviews(
    slug: string,
    platforms?: string[]
  ): Promise<{
    provider: FormattedProvider;
    scrapedSummary: MultiPlatformScrapeResult;
  }> {
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
    const houzzUrl = profile.platformReviews.find((p) => p.platform === 'HOUZZ')?.profileUrl;

    // Scrape live across platforms (Google, Yelp, HomeAdvisor, Houzz)
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
      50,
      platforms
    );

    const updates: Promise<any>[] = [];

    // ── Save Platform Aggregates ──
    if (scrapedResult.platforms.google && scrapedResult.platforms.google.totalReviews > 0) {
      updates.push(
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
      updates.push(
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
      updates.push(
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
      updates.push(
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

    // ── Save Individual Review Comments to DB ──
    const allScrapedReviews = scrapedResult.allReviews || [];
    if (allScrapedReviews.length > 0) {
      this.logger.log(`💾 Saving ${allScrapedReviews.length} individual review comments to database...`);

      for (let idx = 0; idx < allScrapedReviews.length; idx++) {
        const rev = allScrapedReviews[idx];
        if (!rev.comment || rev.comment.trim().length < 5) continue;

        const platformEnum = rev.platform as ReviewPlatform;
        const intRating = Math.min(5, Math.max(1, Math.round(Number(rev.rating) || 5)));
        const safeAuthorName = (rev.authorName || '').trim() || `Verified Reviewer #${idx + 1}`;

        updates.push(
          this.prisma.scrapedReview.upsert({
            where: {
              providerProfileId_platform_authorName_rating: {
                providerProfileId: profile.id,
                platform: platformEnum,
                authorName: safeAuthorName,
                rating: intRating,
              },
            },
            update: {
              authorName: safeAuthorName,
              authorAvatarUrl: rev.authorAvatarUrl || null,
              rating: intRating,
              comment: rev.comment,
              reviewDate: rev.reviewDate || null,
              sourceUrl: rev.sourceUrl || null,
              isVerified: rev.isVerified ?? true,
            },
            create: {
              providerProfileId: profile.id,
              platform: platformEnum,
              authorName: safeAuthorName,
              authorAvatarUrl: rev.authorAvatarUrl || null,
              rating: intRating,
              comment: rev.comment,
              reviewDate: rev.reviewDate || null,
              sourceUrl: rev.sourceUrl || null,
              isVerified: rev.isVerified ?? true,
            },
          }).catch((err) => {
            // Silently skip duplicates or constraint errors
            this.logger.debug(`[Scrape DB] Skipped review: ${err.message?.substring(0, 80)}`);
          })
        );
      }
    }

    await Promise.all(updates);

    // Recompute accurate compositeRating & totalReviews from ALL active PlatformReview rows in DB
    const allPlatformRows = await this.prisma.platformReview.findMany({
      where: { providerProfileId: profile.id, reviewCount: { gt: 0 } },
    });
    if (allPlatformRows.length > 0) {
      const totalCount = allPlatformRows.reduce((sum, p) => sum + p.reviewCount, 0);
      const weightedSum = allPlatformRows.reduce(
        (sum, p) => sum + Number(p.rating) * p.reviewCount,
        0
      );
      const composite = Math.round((weightedSum / totalCount) * 10) / 10;
      await this.prisma.providerProfile.update({
        where: { id: profile.id },
        data: {
          totalReviews: totalCount,
          compositeRating: composite,
        },
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
}
