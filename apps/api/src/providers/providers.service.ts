import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { GetProvidersQueryDto } from './dto/get-providers.dto';
import { Prisma } from '@prisma/client';

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
}

@Injectable()
export class ProvidersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService
  ) {}

  /**
   * Format phone number for clean UI display
   */
  private formatDisplayPhone(phone: string): string {
    const cleaned = ('' + phone).replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    return phone || '(212) 555-0100';
  }

  /**
   * Map database ProviderProfile model into frontend RooferProvider structure
   */
  private async formatProvider(p: any): Promise<FormattedProvider> {
    const currentYear = new Date().getFullYear();
    const sinceYear = p.sinceYear || currentYear;
    const yearsInBusiness = Math.max(1, currentYear - sinceYear);

    // Resolve presigned logo URL from R2 or external link
    let presignedImageUrl = '';
    if (p.logoUrl) {
      presignedImageUrl = await this.storageService.getPresignedUrl(p.logoUrl);
    } else if (p.coverImageUrl) {
      presignedImageUrl = await this.storageService.getPresignedUrl(p.coverImageUrl);
    }

    // Extract subServices from listings
    const servicesSet = new Set<string>();
    let photoCount = 0;
    if (p.listings && Array.isArray(p.listings)) {
      for (const listing of p.listings) {
        if (listing.photos) {
          photoCount += listing.photos.length;
        }
        if (listing.subServices) {
          for (const lss of listing.subServices) {
            if (lss.subService?.name) {
              servicesSet.add(lss.subService.name);
            }
          }
        }
      }
    }
    const servicesList = Array.from(servicesSet);

    // Map platform reviews
    const reviewsMap = {
      google: { rating: 0, count: 0, url: '' },
      yelp: { rating: 0, count: 0, url: '' },
      facebook: { rating: 0, count: 0, url: '' },
    };

    if (p.platformReviews && Array.isArray(p.platformReviews)) {
      for (const pr of p.platformReviews) {
        const platformKey = pr.platform.toLowerCase() as 'google' | 'yelp' | 'facebook';
        if (reviewsMap[platformKey]) {
          reviewsMap[platformKey] = {
            rating: Number(pr.rating) || 0,
            count: pr.reviewCount || 0,
            url: pr.profileUrl || '',
          };
        }
      }
    }

    // Determine badge / top pick from database
    const badge = p.badge || (p.isVerified ? 'VERIFIED EXPERT' : '');
    const topPickCategory = p.topPickCategory || '';

    // Price range from listings if set
    let priceRange = p.typicalPriceRange || '';
    if (!priceRange && p.listings?.[0]?.minPrice) {
      priceRange = `$${p.listings[0].minPrice}${p.listings[0].maxPrice ? ` – $${p.listings[0].maxPrice}` : '+'}`;
    }

    return {
      id: p.id,
      name: p.businessName,
      slug: p.slug,
      tagline: p.tagline || '',
      badge,
      topPickCategory,
      logoText: p.logoText || (p.businessName ? p.businessName.substring(0, 2).toUpperCase() : ''),
      imageUrl: presignedImageUrl,
      photoCount,
      borough: p.borough || '',
      address: p.address || '',
      servesArea: p.borough ? `${p.borough}, NY and surrounding areas` : (p.address || 'New York, NY'),
      phone: p.phone || '',
      displayPhone: p.phone ? this.formatDisplayPhone(p.phone) : '',
      website: p.websiteUrl || '',
      licenseNumber: p.licenseNumber || '',
      yearsInBusiness,
      sinceYear,
      isLicensed: Boolean(p.isLicensed),
      isInsured: Boolean(p.isInsured),
      isBonded: Boolean(p.isBonded),
      hasWarranty: Boolean(p.hasWarranty),
      financingAvailable: Boolean(p.financingAvailable),
      emergencyService: Boolean(p.emergencyService),
      typicalPriceRange: priceRange || 'Quote on request',
      description: p.description || '',
      services: servicesList,
      reviews: reviewsMap,
      compositeRating: Number(p.compositeRating) || 0,
      totalReviews: p.totalReviews || 0,
      featuredQuote: p.featuredQuote || '',
      verifiedYear: p.verifiedYear || (p.isVerified ? sinceYear : null),
    };
  }

  /**
   * Retrieve filtered, sorted, paginated providers directly from database
   */
  async findAll(query: GetProvidersQueryDto) {
    const {
      search,
      borough,
      service,
      sortBy = 'rating',
      page = 1,
      limit = 50,
    } = query;

    const where: Prisma.ProviderProfileWhereInput = {
      isActive: true,
    };

    // Filter by Borough
    if (borough && borough !== 'All') {
      where.borough = {
        equals: borough,
        mode: 'insensitive',
      };
    }

    // Filter by Service
    if (service && service !== 'All Services') {
      where.listings = {
        some: {
          subServices: {
            some: {
              subService: {
                name: {
                  contains: service,
                  mode: 'insensitive',
                },
              },
            },
          },
        },
      };
    }

    // Filter by Search Query
    if (search && search.trim() !== '') {
      const q = search.trim();
      where.OR = [
        { businessName: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { address: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
        { zipCode: { contains: q, mode: 'insensitive' } },
        { borough: { contains: q, mode: 'insensitive' } },
        { licenseNumber: { contains: q, mode: 'insensitive' } },
      ];
    }

    // Sort order
    let orderBy: Prisma.ProviderProfileOrderByWithRelationInput = {
      compositeRating: 'desc',
    };
    if (sortBy === 'reviews') {
      orderBy = { totalReviews: 'desc' };
    } else if (sortBy === 'experience') {
      orderBy = { sinceYear: 'asc' }; // older start year = more experience
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
      },
    });

    if (!provider) {
      throw new NotFoundException(`Provider with slug "${slug}" not found`);
    }

    return this.formatProvider(provider);
  }
}
