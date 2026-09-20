import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
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
  logoText: string;
  imageUrl: string;
  photoCount: number;
  borough: string;
  address: string;
  servesArea: string;
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
    facebook: { rating: number; count: number; url: string };
  };
  compositeRating: number;
  totalReviews: number;
  featuredQuote: string;
  verifiedYear: number;
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
export class ProvidersService {
  private readonly logger = new Logger(ProvidersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly reviewsScraperService: ReviewsScraperService,
    private readonly aiReviewSummaryService: AiReviewSummaryService
  ) {}

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

    const allPhotos = provider.listings?.flatMap((l: any) => l.photos || []) || [];
    const firstPhoto = allPhotos[0];
    const imageUrl = firstPhoto
      ? await this.storageService.getPresignedUrl(firstPhoto.imageUrl)
      : coverImageUrl || logoUrl;

    // Format saved scraped reviews
    const scrapedReviews = (provider.scrapedReviews || []).map((sr: any) => ({
      authorName: sr.authorName,
      authorAvatarUrl: sr.authorAvatarUrl || undefined,
      rating: sr.rating,
      comment: sr.comment,
      reviewDate: sr.reviewDate || undefined,
      platform: sr.platform,
      sourceUrl: sr.sourceUrl || undefined,
    }));

    return {
      id: provider.id,
      name: provider.businessName,
      slug: provider.slug,
      tagline: provider.tagline || '',
      badge: provider.badge || '',
      topPickCategory: provider.topPickCategory || '',
      logoText: provider.logoText || provider.businessName.charAt(0),
      imageUrl,
      photoCount: allPhotos.length,
      borough: provider.borough || '',
      address: provider.address || '',
      servesArea: provider.servesArea || '',
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
      typicalPriceRange: provider.typicalPriceRange || '',
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
        facebook: {
          rating: facebook ? Number(facebook.rating) : 0,
          count: facebook ? facebook.reviewCount : 0,
          url: facebook ? facebook.profileUrl : '',
        },
      },
      compositeRating: Number(provider.compositeRating) || 0,
      totalReviews: provider.totalReviews || 0,
      featuredQuote: provider.featuredQuote || '',
      verifiedYear: provider.verifiedYear || 0,
      aiReviewSummary: provider.aiReviewSummary || undefined,
      aiSummaryUpdatedAt: provider.aiSummaryUpdatedAt ? provider.aiSummaryUpdatedAt.toISOString() : undefined,
      scrapedReviews,
    };
  }

  /**
   * Search, filter, sort and paginate providers from PostgreSQL
   */
  async findAll(query: GetProvidersQueryDto) {
    const { search, borough, service, sortBy, page = 1, limit = 12 } = query;

    const where: Prisma.ProviderProfileWhereInput = {
      isActive: true,
    };

    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { borough: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (borough && borough !== 'All') {
      where.borough = { equals: borough, mode: 'insensitive' };
    }

    if (service && service !== 'All Services') {
      where.listings = {
        some: {
          subServices: {
            some: {
              subService: {
                name: { equals: service, mode: 'insensitive' },
              },
            },
          },
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
        mode: 'insensitive',
      };
    }

    if ((query as any).services && Array.isArray((query as any).services)) {
      where.listings = {
        some: {
          subServices: {
            some: {
              subService: {
                name: { in: (query as any).services, mode: 'insensitive' },
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

    const [total, rawProviders] = await Promise.all([
      this.prisma.providerProfile.count({ where }),
      this.prisma.providerProfile.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          listings: {
            include: {
              subServices: {
                include: {
                  subService: true,
                },
              },
              photos: true,
            },
          },
          platformReviews: true,
          scrapedReviews: {
            orderBy: { createdAt: 'desc' },
            take: 20,
          },
        },
      }),
    ]);

    const formattedProviders = await Promise.all(
      rawProviders.map((p) => this.formatProvider(p))
    );

    return {
      items: formattedProviders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Retrieve dynamic filter options and live database statistics
   */
  async getFiltersAndStats() {
    const [boroughRecords, subServices, totalProviders, aggregates] =
      await Promise.all([
        this.prisma.providerProfile.findMany({
          where: { isActive: true, borough: { not: null } },
          select: { borough: true },
          distinct: ['borough'],
        }),
        this.prisma.subService.findMany({
          select: { name: true, slug: true, isPopular: true },
          orderBy: { name: 'asc' },
        }),
        this.prisma.providerProfile.count({ where: { isActive: true } }),
        this.prisma.providerProfile.aggregate({
          where: { isActive: true },
          _avg: { compositeRating: true },
          _sum: { totalReviews: true },
        }),
      ]);

    const boroughs = [
      'All',
      ...boroughRecords
        .map((b) => b.borough as string)
        .filter((b) => b && b !== 'All'),
    ];

    const services = [
      'All Services',
      ...subServices.map((s) => s.name),
    ];

    const avgRating = aggregates._avg.compositeRating
      ? Number(aggregates._avg.compositeRating.toFixed(1))
      : 4.8;
    const totalReviews = aggregates._sum.totalReviews || 0;

    return {
      boroughs,
      services,
      stats: {
        totalProviders,
        avgRating,
        totalReviews,
      },
    };
  }

  /**
   * Retrieve single provider profile by slug
   */
  async findBySlug(slug: string): Promise<FormattedProvider> {
    const provider = await this.prisma.providerProfile.findUnique({
      where: { slug },
      include: {
        listings: {
          include: {
            subServices: {
              include: {
                subService: true,
              },
            },
            photos: true,
          },
        },
        platformReviews: true,
        scrapedReviews: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!provider) {
      throw new NotFoundException(`Provider with slug "${slug}" not found`);
    }

    return this.formatProvider(provider);
  }

  /**
   * Sync and scrape latest live reviews from Google, Yelp & Facebook for a provider.
   * Saves both aggregate ratings AND individual review comments to database.
   */
  async syncReviews(slug: string): Promise<{
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
    const facebookUrl = profile.platformReviews.find((p) => p.platform === 'FACEBOOK')?.profileUrl;

    // Scrape live across platforms
    const scrapedResult = await this.reviewsScraperService.scrapeAllPlatforms(
      {
        businessName: profile.businessName,
        borough: profile.borough || undefined,
        city: profile.city || undefined,
        googleUrl,
        yelpUrl,
        facebookUrl,
      },
      50
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

    if (scrapedResult.platforms.facebook && scrapedResult.platforms.facebook.totalReviews > 0) {
      updates.push(
        this.prisma.platformReview.upsert({
          where: {
            providerProfileId_platform: {
              providerProfileId: profile.id,
              platform: 'FACEBOOK',
            },
          },
          update: {
            rating: scrapedResult.platforms.facebook.rating,
            reviewCount: scrapedResult.platforms.facebook.totalReviews,
            profileUrl: scrapedResult.platforms.facebook.profileUrl,
            lastScrapedAt: new Date(),
          },
          create: {
            providerProfileId: profile.id,
            platform: 'FACEBOOK',
            rating: scrapedResult.platforms.facebook.rating,
            reviewCount: scrapedResult.platforms.facebook.totalReviews,
            profileUrl: scrapedResult.platforms.facebook.profileUrl,
            lastScrapedAt: new Date(),
          },
        })
      );
    }

    // ── Save Individual Review Comments to DB ──
    const allScrapedReviews = scrapedResult.allReviews || [];
    if (allScrapedReviews.length > 0) {
      this.logger.log(`💾 Saving ${allScrapedReviews.length} individual review comments to database...`);

      for (const rev of allScrapedReviews) {
        if (!rev.comment || rev.comment.trim().length < 5) continue;

        const platformEnum = rev.platform as ReviewPlatform;
        // Truncate comment for unique constraint (uses first 200 chars)
        updates.push(
          this.prisma.scrapedReview.upsert({
            where: {
              providerProfileId_platform_authorName_rating: {
                providerProfileId: profile.id,
                platform: platformEnum,
                authorName: rev.authorName || 'Reviewer',
                rating: rev.rating || 5,
              },
            },
            update: {
              authorName: rev.authorName || 'Reviewer',
              authorAvatarUrl: rev.authorAvatarUrl || null,
              rating: rev.rating || 5,
              reviewDate: rev.reviewDate || null,
              sourceUrl: rev.sourceUrl || null,
              isVerified: rev.isVerified ?? true,
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
          }).catch((err) => {
            // Silently skip duplicates or constraint errors
            this.logger.debug(`[Scrape DB] Skipped review: ${err.message?.substring(0, 80)}`);
          })
        );
      }
    }

    // Update aggregate ratings on ProviderProfile
    if (scrapedResult.totalReviews > 0) {
      updates.push(
        this.prisma.providerProfile.update({
          where: { id: profile.id },
          data: {
            compositeRating: scrapedResult.compositeRating,
            totalReviews: scrapedResult.totalReviews,
          },
        })
      );
    }

    await Promise.all(updates);

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

    this.logger.log(`✅ Saved AI Review Summary to DB for "${profile.businessName}"`);

    const updatedProvider = await this.findBySlug(slug);
    return {
      provider: updatedProvider,
      summary,
    };
  }

}
