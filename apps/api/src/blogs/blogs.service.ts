import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { MemoryCacheService } from '../common/cache';
import { GetBlogsQueryDto } from './dto/get-blogs.dto';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { PostStatus, Prisma } from '@prisma/client';

/**
 * Lightweight projection for blog cards/listings — omits large HTML `content` TEXT column
 * (~150KB+ saved per listing query across DB wire transfer & HTTP JSON payload).
 */
const BLOG_SUMMARY_SELECT = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  coverImageUrl: true,
  coverImageAlt: true,
  authorName: true,
  authorAvatar: true,
  authorRole: true,
  category: true,
  tags: true,
  readingTimeMin: true,
  wordCount: true,
  viewCount: true,
  status: true,
  isFeatured: true,
  publishedAt: true,
  metaTitle: true,
  metaDescription: true,
  canonicalUrl: true,
  ogImageUrl: true,
  focusKeyword: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.BlogPostSelect;

const BLOG_CACHE_OPTIONS = {
  ttlMs: 5 * 60_000, // 5 minutes fresh
  swrMs: 25 * 60_000, // +25 minutes stale-while-revalidate
};

@Injectable()
export class BlogsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BlogsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly cache: MemoryCacheService
  ) {}

  onApplicationBootstrap() {
    setTimeout(() => {
      Promise.allSettled([
        this.findAll({ page: 1, limit: 9, status: 'PUBLISHED' } as GetBlogsQueryDto),
        this.findAll({ page: 1, limit: 6, status: 'PUBLISHED' } as GetBlogsQueryDto),
        this.findFeatured(),
        this.getCategories(),
      ]).catch(() => undefined);
    }, 300);
  }

  /**
   * Helper: Format blog post with fresh presigned URLs for all media assets
   */
  public async formatBlog(blog: any): Promise<any> {
    if (!blog) return null;

    let rawCover = blog.coverImageUrl || '';
    if (!rawCover && blog.content) {
      // Fallback: extract first <img> src from content if no cover image was explicitly set
      const match = blog.content.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (match && match[1]) {
        rawCover = match[1];
      }
    }

    const [coverImageUrl, ogImageUrl, authorAvatar] = await Promise.all([
      rawCover ? this.storageService.getPresignedUrl(rawCover) : Promise.resolve(''),
      blog.ogImageUrl ? this.storageService.getPresignedUrl(blog.ogImageUrl) : Promise.resolve(''),
      blog.authorAvatar
        ? this.storageService.getPresignedUrl(blog.authorAvatar)
        : Promise.resolve(''),
    ]);

    return {
      ...blog,
      tags: Array.isArray(blog.tags) ? (blog.tags as string[]) : [],
      coverImageUrl: coverImageUrl || null,
      ogImageUrl: ogImageUrl || null,
      authorAvatar: authorAvatar || null,
    };
  }

  /**
   * Helper: Format blog summary card (without returning large HTML `content` body)
   */
  private async formatBlogSummary(blog: any): Promise<any> {
    if (!blog) return null;

    let rawCover = blog.coverImageUrl || '';
    if (!rawCover && blog.id) {
      // Rare fallback for legacy rows missing explicit coverImageUrl
      const row = await this.prisma.blogPost.findUnique({
        where: { id: blog.id },
        select: { content: true },
      });
      if (row?.content) {
        const match = row.content.match(/<img[^>]+src=["']([^"']+)["']/i);
        if (match && match[1]) rawCover = match[1];
      }
    }

    const formatted = await this.formatBlog({
      ...blog,
      coverImageUrl: rawCover,
      content: '',
    });

    return formatted;
  }

  /**
   * Helper: Normalize media URL or key for persistent database storage
   */
  private toStorageKey(urlOrKey?: string | null): string | null {
    if (!urlOrKey) return null;
    const cleanKey = this.storageService.extractCleanKey(urlOrKey);
    return cleanKey || null;
  }

  /**
   * Helper: Generate URL slug from title
   */
  private generateSlug(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-') // Replace spaces with -
      .replace(/[^\w\-]+/g, '') // Remove all non-word chars
      .replace(/\-\-+/g, '-') // Replace multiple - with single -
      .replace(/^-+/, '') // Trim - from start of text
      .replace(/-+$/, ''); // Trim - from end of text
  }

  /**
   * Helper: Calculate word count & estimated reading time (approx 200 words per minute)
   */
  private calculateReadingMetrics(content: string): {
    wordCount: number;
    readingTimeMin: number;
  } {
    if (!content) return { wordCount: 0, readingTimeMin: 1 };
    // Strip HTML tags for accurate word count
    const plainText = content.replace(/<[^>]+>/g, ' ').trim();
    const words = plainText.split(/\s+/).filter((w) => w.length > 0);
    const wordCount = words.length;
    const readingTimeMin = Math.max(1, Math.ceil(wordCount / 200));
    return { wordCount, readingTimeMin };
  }

  /**
   * Helper: Ensure unique slug in database
   */
  private async ensureUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await this.prisma.blogPost.findUnique({
        where: { slug },
      });

      if (!existing || (excludeId && existing.id === excludeId)) {
        return slug;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  /**
   * Public: Get published blogs with pagination, search, category & tag filters
   */
  async findAll(query: GetBlogsQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      tag,
      status = 'PUBLISHED',
      isFeatured,
      sortBy = 'publishedAt',
      sortOrder = 'desc',
    } = query;

    const cacheKey = `blogs:list:${JSON.stringify({
      page: Number(page),
      limit: Number(limit),
      search: search?.trim().toLowerCase() || '',
      category: category || '',
      tag: tag || '',
      status,
      isFeatured: isFeatured ?? null,
      sortBy,
      sortOrder,
    })}`;

    return this.cache.getOrSet(
      cacheKey,
      async () => {
        const skip = (page - 1) * limit;

        const where: Prisma.BlogPostWhereInput = {
          status: status as PostStatus,
        };

        if (isFeatured !== undefined) {
          where.isFeatured = isFeatured;
        }

        if (category && category !== 'All') {
          where.category = {
            equals: category,
          };
        }

        if (tag) {
          where.tags = {
            array_contains: tag,
          };
        }

        if (search && search.trim()) {
          const term = search.trim();
          where.OR = [
            { title: { contains: term } },
            { excerpt: { contains: term } },
            { content: { contains: term } },
            { category: { contains: term } },
          ];
        }

        const orderBy: Prisma.BlogPostOrderByWithRelationInput = {
          [sortBy]: sortOrder,
        };

        const rawBlogsPromise = this.prisma.blogPost.findMany({
          where,
          select: BLOG_SUMMARY_SELECT,
          skip,
          take: limit,
          orderBy,
        });

        let rawBlogs: any[];
        let total: number;

        if (page === 1) {
          rawBlogs = await rawBlogsPromise;
          total =
            rawBlogs.length < limit
              ? rawBlogs.length
              : await this.prisma.blogPost.count({ where });
        } else {
          [rawBlogs, total] = await Promise.all([
            rawBlogsPromise,
            this.prisma.blogPost.count({ where }),
          ]);
        }

        const blogs = await Promise.all(rawBlogs.map((b) => this.formatBlogSummary(b)));

        return {
          blogs,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        };
      },
      BLOG_CACHE_OPTIONS
    );
  }

  /**
   * Public: Get top featured blog post for the hero section
   */
  async findFeatured() {
    return this.cache.getOrSet(
      'blogs:featured',
      async () => {
        const featured = await this.prisma.blogPost.findFirst({
          where: {
            status: PostStatus.PUBLISHED,
            isFeatured: true,
          },
          select: BLOG_SUMMARY_SELECT,
          orderBy: {
            publishedAt: 'desc',
          },
        });

        if (featured) return await this.formatBlogSummary(featured);

        // Fallback: get the latest published post
        const latest = await this.prisma.blogPost.findFirst({
          where: {
            status: PostStatus.PUBLISHED,
          },
          select: BLOG_SUMMARY_SELECT,
          orderBy: {
            publishedAt: 'desc',
          },
        });

        return await this.formatBlogSummary(latest);
      },
      BLOG_CACHE_OPTIONS
    );
  }

  /**
   * Public: Get categories with blog post counts
   */
  async getCategories() {
    return this.cache.getOrSet(
      'blogs:categories',
      async () => {
        const categories = await this.prisma.blogPost.groupBy({
          by: ['category'],
          where: {
            status: PostStatus.PUBLISHED,
          },
          _count: {
            id: true,
          },
          orderBy: {
            _count: {
              id: 'desc',
            },
          },
        });

        return categories.map((c) => ({
          category: c.category,
          count: c._count.id,
        }));
      },
      BLOG_CACHE_OPTIONS
    );
  }

  /**
   * Public: Get single published blog post by slug + increment viewCount + fetch related posts
   */
  async findBySlug(slug: string) {
    const cleanSlug = slug.trim();
    const result = await this.cache.getOrSet(
      `blogs:slug:${cleanSlug}`,
      async () => {
        const blog = await this.prisma.blogPost.findUnique({
          where: { slug: cleanSlug },
        });

        if (!blog) {
          throw new NotFoundException(`Blog post with slug "${slug}" not found`);
        }

        // Fetch related articles (same category or shared tags, excluding current post) — summary projection only
        const blogTags = Array.isArray(blog.tags) ? (blog.tags as string[]) : [];
        const rawRelatedPosts = await this.prisma.blogPost.findMany({
          where: {
            id: { not: blog.id },
            status: PostStatus.PUBLISHED,
            OR: [
              { category: blog.category },
              ...(blogTags.length > 0
                ? blogTags.map((t) => ({ tags: { array_contains: t } }))
                : []),
            ],
          },
          select: BLOG_SUMMARY_SELECT,
          take: 3,
          orderBy: { publishedAt: 'desc' },
        });

        const [formattedBlog, relatedPosts] = await Promise.all([
          this.formatBlog(blog),
          Promise.all(rawRelatedPosts.map((p) => this.formatBlogSummary(p))),
        ]);

        return {
          blog: formattedBlog,
          relatedPosts,
        };
      },
      BLOG_CACHE_OPTIONS
    );

    // Async increment viewCount in background without blocking response (runs even on cache hits)
    if (result?.blog?.id) {
      this.prisma.blogPost
        .update({
          where: { id: result.blog.id },
          data: { viewCount: { increment: 1 } },
        })
        .catch((err) => this.logger.warn(`Failed to increment view count: ${err.message}`));
    }

    return result;
  }

  /**
   * Admin: Get all blogs (including drafts and archived) with pagination & filters
   */
  async findAllAdmin(query: GetBlogsQueryDto) {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    const where: Prisma.BlogPostWhereInput = {};

    if (status) {
      where.status = status as PostStatus;
    }

    if (category && category !== 'All') {
      where.category = { equals: category };
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { title: { contains: term } },
        { excerpt: { contains: term } },
        { category: { contains: term } },
      ];
    }

    const [rawBlogs, total] = await Promise.all([
      this.prisma.blogPost.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.blogPost.count({ where }),
    ]);

    const blogs = await Promise.all(rawBlogs.map((b) => this.formatBlog(b)));

    return {
      blogs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Admin / Internal: Get single post by ID
   */
  async findById(id: string) {
    const blog = await this.prisma.blogPost.findUnique({
      where: { id },
    });

    if (!blog) {
      throw new NotFoundException(`Blog post with ID "${id}" not found`);
    }

    return await this.formatBlog(blog);
  }

  /**
   * Admin: Create new blog post
   */
  async create(dto: CreateBlogDto) {
    if (!dto.title || !dto.content) {
      throw new BadRequestException('Title and content are required');
    }

    const baseSlug = dto.slug ? this.generateSlug(dto.slug) : this.generateSlug(dto.title);
    const slug = await this.ensureUniqueSlug(baseSlug);

    const { wordCount, readingTimeMin } = this.calculateReadingMetrics(dto.content);

    const status = dto.status || PostStatus.DRAFT;
    const publishedAt =
      status === PostStatus.PUBLISHED ? dto.publishedAt ? new Date(dto.publishedAt) : new Date() : null;

    // If coverImageUrl is not explicitly provided, try to extract first image from content
    let rawCover = dto.coverImageUrl;
    if (!rawCover && dto.content) {
      const match = dto.content.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (match && match[1]) {
        rawCover = match[1];
      }
    }
    const coverImageUrl = this.toStorageKey(rawCover);
    const ogImageUrl = this.toStorageKey(dto.ogImageUrl) || coverImageUrl;
    const authorAvatar = this.toStorageKey(dto.authorAvatar);

    const newPost = await this.prisma.blogPost.create({
      data: {
        title: dto.title,
        slug,
        excerpt: dto.excerpt || null,
        content: dto.content,
        coverImageUrl,
        coverImageAlt: dto.coverImageAlt || dto.title,
        authorName: dto.authorName || 'Prosvetted Editorial',
        authorAvatar,
        authorRole: dto.authorRole || 'Content Editor',
        category: dto.category || 'General',
        tags: dto.tags || [],
        readingTimeMin,
        wordCount,
        status: status as PostStatus,
        isFeatured: dto.isFeatured || false,
        publishedAt,
        metaTitle: dto.metaTitle || dto.title,
        metaDescription: dto.metaDescription || dto.excerpt || null,
        canonicalUrl: dto.canonicalUrl || null,
        ogImageUrl,
        focusKeyword: dto.focusKeyword || null,
      },
    });

    this.cache.invalidatePrefix('blogs:');
    this.logger.log(`Created new blog post: "${newPost.title}" (${newPost.id})`);
    return await this.formatBlog(newPost);
  }

  /**
   * Admin: Update existing blog post
   */
  async update(id: string, dto: UpdateBlogDto) {
    const existing = await this.findById(id);

    let slug = existing.slug;
    if (dto.slug && dto.slug !== existing.slug) {
      slug = await this.ensureUniqueSlug(this.generateSlug(dto.slug), id);
    } else if (dto.title && dto.title !== existing.title && !dto.slug) {
      // Auto-update slug if title changed and slug wasn't manually set
      slug = await this.ensureUniqueSlug(this.generateSlug(dto.title), id);
    }

    const content = dto.content !== undefined ? dto.content : existing.content;
    const { wordCount, readingTimeMin } = this.calculateReadingMetrics(content);

    let status = existing.status;
    let publishedAt = existing.publishedAt;

    if (dto.status) {
      status = dto.status as PostStatus;
      if (status === PostStatus.PUBLISHED && !existing.publishedAt) {
        publishedAt = dto.publishedAt ? new Date(dto.publishedAt) : new Date();
      }
    }

    if (dto.publishedAt !== undefined) {
      publishedAt = dto.publishedAt ? new Date(dto.publishedAt) : null;
    }

    // Determine cover image URL
    let rawCover = dto.coverImageUrl;
    if (rawCover === undefined && !existing.coverImageUrl && content) {
      const match = content.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (match && match[1]) {
        rawCover = match[1];
      }
    }
    const coverImageUrl = rawCover !== undefined ? this.toStorageKey(rawCover) : undefined;
    const ogImageUrl = dto.ogImageUrl !== undefined ? this.toStorageKey(dto.ogImageUrl) : undefined;
    const authorAvatar = dto.authorAvatar !== undefined ? this.toStorageKey(dto.authorAvatar) : undefined;

    const updated = await this.prisma.blogPost.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        slug,
        ...(dto.excerpt !== undefined && { excerpt: dto.excerpt }),
        ...(dto.content !== undefined && { content: dto.content }),
        ...(coverImageUrl !== undefined && { coverImageUrl }),
        ...(dto.coverImageAlt !== undefined && { coverImageAlt: dto.coverImageAlt }),
        ...(dto.authorName !== undefined && { authorName: dto.authorName }),
        ...(authorAvatar !== undefined && { authorAvatar }),
        ...(dto.authorRole !== undefined && { authorRole: dto.authorRole }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        readingTimeMin,
        wordCount,
        status,
        ...(dto.isFeatured !== undefined && { isFeatured: dto.isFeatured }),
        publishedAt,
        ...(dto.metaTitle !== undefined && { metaTitle: dto.metaTitle }),
        ...(dto.metaDescription !== undefined && { metaDescription: dto.metaDescription }),
        ...(dto.canonicalUrl !== undefined && { canonicalUrl: dto.canonicalUrl }),
        ...(ogImageUrl !== undefined && { ogImageUrl }),
        ...(dto.focusKeyword !== undefined && { focusKeyword: dto.focusKeyword }),
      },
    });

    this.cache.invalidatePrefix('blogs:');
    this.logger.log(`Updated blog post: "${updated.title}" (${updated.id})`);
    return await this.formatBlog(updated);
  }

  /**
   * Admin: Delete blog post
   */
  async remove(id: string) {
    await this.findById(id);
    await this.prisma.blogPost.delete({ where: { id } });
    this.cache.invalidatePrefix('blogs:');
    this.logger.log(`Deleted blog post with ID: ${id}`);
    return { success: true, message: `Blog post ${id} deleted successfully` };
  }
}
