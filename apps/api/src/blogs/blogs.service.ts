import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { MemoryCacheService } from '../common/cache';
import { GetBlogsQueryDto } from './dto/get-blogs.dto';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { PostStatus, Prisma } from '@prisma/client';

/**
 * Lightweight projection for blog cards & admin tables — omits large HTML `content` TEXT column
 * (~95%+ payload & remote DB wire-transfer reduction).
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

/**
 * Blogs only mutate via admin endpoints (`create`, `update`, `remove`), which immediately
 * invalidate `blogs:*` and trigger a background re-warm.
 */
const PUBLIC_BLOG_CACHE_OPTIONS = {
  ttlMs: 30 * 60_000, // 30 minutes fresh
  swrMs: 120 * 60_000, // +2 hours stale-while-revalidate
};

const ADMIN_BLOG_CACHE_OPTIONS = {
  ttlMs: 2 * 60_000, // 2 minutes fresh
  swrMs: 10 * 60_000, // +10 minutes SWR
};

const IMG_SRC_REGEX = /(<img\b[^>]*?\bsrc=["'])([^"']+)(["'][^>]*>)/gi;

@Injectable()
export class BlogsService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(BlogsService.name);
  private readonly pendingViewIncrements = new Map<string, number>();
  private viewFlushTimer: NodeJS.Timeout | null = null;
  private legacyCoversBackfilled = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly cache: MemoryCacheService
  ) {}

  onApplicationBootstrap() {
    // Batch-flush viewCount increments every 60s instead of hitting remote DB on every read
    this.viewFlushTimer = setInterval(() => {
      this.flushPendingViews().catch(() => undefined);
    }, 60_000);
    if (this.viewFlushTimer.unref) {
      this.viewFlushTimer.unref();
    }

    setTimeout(() => {
      this.warmBlogsCache().catch(() => undefined);
    }, 350);
  }

  async onModuleDestroy() {
    if (this.viewFlushTimer) {
      clearInterval(this.viewFlushTimer);
      this.viewFlushTimer = null;
    }
    await this.flushPendingViews();
  }

  private async flushPendingViews(): Promise<void> {
    if (this.pendingViewIncrements.size === 0) return;
    const entries = Array.from(this.pendingViewIncrements.entries());
    this.pendingViewIncrements.clear();

    await Promise.allSettled(
      entries.map(([id, delta]) =>
        this.prisma.blogPost.update({
          where: { id },
          data: { viewCount: { increment: delta } },
        })
      )
    );
  }

  /**
   * Pre-warms public lists, featured post, categories, admin list, AND individual
   * published slug caches in the background so user clicks resolve in <5ms from RAM.
   */
  private async warmBlogsCache(): Promise<void> {
    if (!this.legacyCoversBackfilled) {
      this.legacyCoversBackfilled = true;
      await this.backfillMissingCoverKeys().catch(() => undefined);
    }

    await Promise.allSettled([
      this.findAll({ page: 1, limit: 9, status: 'PUBLISHED' } as GetBlogsQueryDto),
      this.findAll({ page: 1, limit: 6, status: 'PUBLISHED' } as GetBlogsQueryDto),
      this.findAll({ page: 1, limit: 200, status: 'PUBLISHED' } as GetBlogsQueryDto),
      this.findFeatured(),
      this.getCategories(),
      this.findAllAdmin({ page: 1, limit: 20 } as GetBlogsQueryDto),
      this.warmPublishedSlugCaches(),
    ]);
  }

  /**
   * Fetches published posts in a single query and seeds `blogs:slug:{slug}` cache entries
   * so opening any article avoids cold sequential remote DB round-trips.
   */
  private async warmPublishedSlugCaches(): Promise<void> {
    const posts = await this.prisma.blogPost.findMany({
      where: { status: PostStatus.PUBLISHED },
      orderBy: { publishedAt: 'desc' },
      take: 30,
    });
    if (posts.length === 0) return;

    const formattedMap = new Map<string, any>();
    const summaryMap = new Map<string, any>();

    await Promise.all(
      posts.map(async (post) => {
        const [full, summary] = await Promise.all([
          this.formatBlog(post),
          this.formatBlogSummary(post),
        ]);
        formattedMap.set(post.id, full);
        summaryMap.set(post.id, summary);
      })
    );

    for (const post of posts) {
      const sameCategory = posts.filter(
        (p) => p.id !== post.id && p.category === post.category
      );
      const others = posts.filter(
        (p) => p.id !== post.id && p.category !== post.category
      );
      const relatedSummaries = [...sameCategory, ...others]
        .slice(0, 3)
        .map((p) => summaryMap.get(p.id))
        .filter(Boolean);

      this.cache.set(
        `blogs:slug:${post.slug}`,
        {
          blog: formattedMap.get(post.id),
          relatedPosts: relatedSummaries,
        },
        PUBLIC_BLOG_CACHE_OPTIONS
      );
    }
  }

  /**
   * One-time startup backfill so legacy posts missing `coverImageUrl` never trigger N+1 queries.
   */
  private async backfillMissingCoverKeys(): Promise<void> {
    const missing = await this.prisma.blogPost.findMany({
      where: { coverImageUrl: null },
      select: { id: true, content: true },
      take: 50,
    });
    for (const row of missing) {
      const firstImg = this.extractFirstImageSrc(row.content);
      const cleanKey = this.toStorageKey(firstImg);
      if (cleanKey) {
        await this.prisma.blogPost
          .update({
            where: { id: row.id },
            data: { coverImageUrl: cleanKey },
          })
          .catch(() => undefined);
      }
    }
  }

  private invalidateAndRewarm(): void {
    this.cache.invalidatePrefix('blogs:');
    setTimeout(() => {
      this.warmBlogsCache().catch(() => undefined);
    }, 50);
  }

  private extractFirstImageSrc(html?: string | null): string {
    if (!html) return '';
    const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    return match?.[1] || '';
  }

  private isInternalStorageAsset(src: string): boolean {
    return (
      src.includes('.r2.cloudflarestorage.com') ||
      src.includes('.amazonaws.com') ||
      src.includes('/api/storage/file')
    );
  }

  /**
   * Before persisting `content` HTML to MariaDB, normalizes temporary R2 presigned `<img src>`
   * URLs into permanent `/api/storage/file?key=...` references so inline images never expire.
   */
  private normalizeContentImagesForStorage(html: string): string {
    if (!html || !html.includes('<img')) return html;
    return html.replace(IMG_SRC_REGEX, (full, prefix, src, suffix) => {
      if (!this.isInternalStorageAsset(src)) return full;
      const key = this.storageService.extractCleanKey(src);
      if (!key || key.startsWith('http://') || key.startsWith('https://')) {
        return full;
      }
      return `${prefix}/api/storage/file?key=${encodeURIComponent(key)}${suffix}`;
    });
  }

  /**
   * When reading full `content` HTML, resolves all internal R2 / `/api/storage/file?key=...`
   * inline images to fresh 12-hour presigned R2 URLs in parallel (cached in `StorageService`).
   */
  private async presignInlineContentImages(html?: string | null): Promise<string> {
    if (!html || !html.includes('<img')) return html || '';

    const uniqueSources = new Set<string>();
    let match: RegExpExecArray | null;
    const scanRegex = new RegExp(IMG_SRC_REGEX.source, 'gi');
    while ((match = scanRegex.exec(html)) !== null) {
      const src = match[2];
      if (src && this.isInternalStorageAsset(src)) {
        uniqueSources.add(src);
      }
    }

    if (uniqueSources.size === 0) return html;

    const resolvedMap = new Map<string, string>();
    await Promise.all(
      Array.from(uniqueSources).map(async (src) => {
        const signed = await this.storageService.getPresignedUrl(src);
        if (signed) resolvedMap.set(src, signed);
      })
    );

    return html.replace(IMG_SRC_REGEX, (full, prefix, src, suffix) => {
      const fresh = resolvedMap.get(src);
      return fresh ? `${prefix}${fresh}${suffix}` : full;
    });
  }

  /**
   * Formats a full blog post (including inline HTML image presigning).
   */
  public async formatBlog(blog: any): Promise<any> {
    if (!blog) return null;

    const rawCover = blog.coverImageUrl || this.extractFirstImageSrc(blog.content);

    const [coverImageUrl, ogImageUrl, authorAvatar, refreshedContent] =
      await Promise.all([
        rawCover ? this.storageService.getPresignedUrl(rawCover) : Promise.resolve(''),
        blog.ogImageUrl
          ? this.storageService.getPresignedUrl(blog.ogImageUrl)
          : Promise.resolve(''),
        blog.authorAvatar
          ? this.storageService.getPresignedUrl(blog.authorAvatar)
          : Promise.resolve(''),
        blog.content
          ? this.presignInlineContentImages(blog.content)
          : Promise.resolve(''),
      ]);

    return {
      ...blog,
      content: refreshedContent,
      tags: Array.isArray(blog.tags) ? (blog.tags as string[]) : [],
      coverImageUrl: coverImageUrl || null,
      ogImageUrl: ogImageUrl || null,
      authorAvatar: authorAvatar || null,
    };
  }

  /**
   * Formats a lightweight blog summary card (ZERO extra DB queries; omits `content`).
   */
  private async formatBlogSummary(blog: any): Promise<any> {
    if (!blog) return null;

    const [coverImageUrl, ogImageUrl, authorAvatar] = await Promise.all([
      blog.coverImageUrl
        ? this.storageService.getPresignedUrl(blog.coverImageUrl)
        : Promise.resolve(''),
      blog.ogImageUrl
        ? this.storageService.getPresignedUrl(blog.ogImageUrl)
        : Promise.resolve(''),
      blog.authorAvatar
        ? this.storageService.getPresignedUrl(blog.authorAvatar)
        : Promise.resolve(''),
    ]);

    return {
      ...blog,
      content: '',
      tags: Array.isArray(blog.tags) ? (blog.tags as string[]) : [],
      coverImageUrl: coverImageUrl || null,
      ogImageUrl: ogImageUrl || null,
      authorAvatar: authorAvatar || null,
    };
  }

  private toStorageKey(urlOrKey?: string | null): string | null {
    if (!urlOrKey) return null;
    const cleanKey = this.storageService.extractCleanKey(urlOrKey);
    return cleanKey || null;
  }

  private generateSlug(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  }

  private calculateReadingMetrics(content: string): {
    wordCount: number;
    readingTimeMin: number;
  } {
    if (!content) return { wordCount: 0, readingTimeMin: 1 };
    const plainText = content.replace(/<[^>]+>/g, ' ').trim();
    const words = plainText.split(/\s+/).filter((w) => w.length > 0);
    const wordCount = words.length;
    const readingTimeMin = Math.max(1, Math.ceil(wordCount / 200));
    return { wordCount, readingTimeMin };
  }

  private async ensureUniqueSlug(
    baseSlug: string,
    excludeId?: string
  ): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await this.prisma.blogPost.findUnique({
        where: { slug },
        select: { id: true },
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

    const numPage = Number(page) || 1;
    const numLimit = Number(limit) || 10;

    const cacheKey = `blogs:list:${JSON.stringify({
      page: numPage,
      limit: numLimit,
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
        const skip = (numPage - 1) * numLimit;

        const where: Prisma.BlogPostWhereInput = {
          status: status as PostStatus,
        };

        if (isFeatured !== undefined) {
          where.isFeatured = isFeatured;
        }

        if (category && category !== 'All') {
          where.category = { equals: category };
        }

        if (tag) {
          where.tags = { array_contains: tag };
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
            select: BLOG_SUMMARY_SELECT,
            skip,
            take: numLimit,
            orderBy: { [sortBy]: sortOrder },
          }),
          this.prisma.blogPost.count({ where }),
        ]);

        const blogs = await Promise.all(
          rawBlogs.map((b) => this.formatBlogSummary(b))
        );

        return {
          blogs,
          total,
          page: numPage,
          limit: numLimit,
          totalPages: Math.ceil(total / numLimit) || 1,
        };
      },
      PUBLIC_BLOG_CACHE_OPTIONS
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
          orderBy: { publishedAt: 'desc' },
        });

        if (featured) return await this.formatBlogSummary(featured);

        const latest = await this.prisma.blogPost.findFirst({
          where: { status: PostStatus.PUBLISHED },
          select: BLOG_SUMMARY_SELECT,
          orderBy: { publishedAt: 'desc' },
        });

        return await this.formatBlogSummary(latest);
      },
      PUBLIC_BLOG_CACHE_OPTIONS
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
          where: { status: PostStatus.PUBLISHED },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
        });

        return categories.map((c) => ({
          category: c.category,
          count: c._count.id,
        }));
      },
      PUBLIC_BLOG_CACHE_OPTIONS
    );
  }

  /**
   * Public: Get single published blog post by slug + related posts (indexed lookup + buffered viewCount)
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

        // Fast indexed query (`@@index([category, status])` + `@@index([status, publishedAt])`)
        const sameCategoryPosts = await this.prisma.blogPost.findMany({
          where: {
            id: { not: blog.id },
            status: PostStatus.PUBLISHED,
            category: blog.category,
          },
          select: BLOG_SUMMARY_SELECT,
          take: 3,
          orderBy: { publishedAt: 'desc' },
        });

        let rawRelated = sameCategoryPosts;
        if (rawRelated.length < 3) {
          const excludeIds = [blog.id, ...rawRelated.map((r) => r.id)];
          const filler = await this.prisma.blogPost.findMany({
            where: {
              id: { notIn: excludeIds },
              status: PostStatus.PUBLISHED,
            },
            select: BLOG_SUMMARY_SELECT,
            take: 3 - rawRelated.length,
            orderBy: { publishedAt: 'desc' },
          });
          rawRelated = [...rawRelated, ...filler];
        }

        const [formattedBlog, relatedPosts] = await Promise.all([
          this.formatBlog(blog),
          Promise.all(rawRelated.map((p) => this.formatBlogSummary(p))),
        ]);

        return {
          blog: formattedBlog,
          relatedPosts,
        };
      },
      PUBLIC_BLOG_CACHE_OPTIONS
    );

    if (result?.blog?.id) {
      const prev = this.pendingViewIncrements.get(result.blog.id) || 0;
      this.pendingViewIncrements.set(result.blog.id, prev + 1);
    }

    return result;
  }

  /**
   * Admin: Lightweight cached summary listing (omits heavy HTML `content` column!)
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

    const numPage = Number(page) || 1;
    const numLimit = Number(limit) || 20;

    const cacheKey = `blogs:admin:list:${JSON.stringify({
      page: numPage,
      limit: numLimit,
      search: search?.trim().toLowerCase() || '',
      category: category || '',
      status: status || 'ALL',
      sortBy,
      sortOrder,
    })}`;

    return this.cache.getOrSet(
      cacheKey,
      async () => {
        const skip = (numPage - 1) * numLimit;
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
            select: BLOG_SUMMARY_SELECT,
            skip,
            take: numLimit,
            orderBy: { [sortBy]: sortOrder },
          }),
          this.prisma.blogPost.count({ where }),
        ]);

        const blogs = await Promise.all(
          rawBlogs.map((b) => this.formatBlogSummary(b))
        );

        return {
          blogs,
          total,
          page: numPage,
          limit: numLimit,
          totalPages: Math.ceil(total / numLimit) || 1,
        };
      },
      ADMIN_BLOG_CACHE_OPTIONS
    );
  }

  /**
   * Admin: Get single full post by ID for editor
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

    const normalizedContent = this.normalizeContentImagesForStorage(dto.content);
    const baseSlug = dto.slug
      ? this.generateSlug(dto.slug)
      : this.generateSlug(dto.title);
    const slug = await this.ensureUniqueSlug(baseSlug);

    const { wordCount, readingTimeMin } =
      this.calculateReadingMetrics(normalizedContent);

    const status = dto.status || PostStatus.DRAFT;
    const publishedAt =
      status === PostStatus.PUBLISHED
        ? dto.publishedAt
          ? new Date(dto.publishedAt)
          : new Date()
        : null;

    const rawCover =
      dto.coverImageUrl || this.extractFirstImageSrc(normalizedContent);
    const coverImageUrl = this.toStorageKey(rawCover);
    const ogImageUrl = this.toStorageKey(dto.ogImageUrl) || coverImageUrl;
    const authorAvatar = this.toStorageKey(dto.authorAvatar);

    const newPost = await this.prisma.blogPost.create({
      data: {
        title: dto.title,
        slug,
        excerpt: dto.excerpt || null,
        content: normalizedContent,
        coverImageUrl,
        coverImageAlt: dto.coverImageAlt || dto.title,
        authorName: dto.authorName || 'ProsVetted Editorial Team',
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

    this.invalidateAndRewarm();
    this.logger.log(`Created new blog post: "${newPost.title}" (${newPost.id})`);
    return await this.formatBlog(newPost);
  }

  /**
   * Admin: Update existing blog post (lightweight metadata check + clean image reset support)
   */
  async update(id: string, dto: UpdateBlogDto) {
    const existing = await this.prisma.blogPost.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        publishedAt: true,
        coverImageUrl: true,
        wordCount: true,
        readingTimeMin: true,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Blog post with ID "${id}" not found`);
    }

    let slug = existing.slug;
    if (dto.slug) {
      const requestedSlug = this.generateSlug(dto.slug);
      if (requestedSlug && requestedSlug !== existing.slug) {
        slug = await this.ensureUniqueSlug(requestedSlug, id);
      }
    } else if (dto.title && dto.title !== existing.title) {
      const candidateSlug = this.generateSlug(dto.title);
      if (candidateSlug && candidateSlug !== existing.slug) {
        slug = await this.ensureUniqueSlug(candidateSlug, id);
      }
    }

    const normalizedContent =
      dto.content !== undefined
        ? this.normalizeContentImagesForStorage(dto.content)
        : undefined;

    const metrics =
      normalizedContent !== undefined
        ? this.calculateReadingMetrics(normalizedContent)
        : {
            wordCount: existing.wordCount,
            readingTimeMin: existing.readingTimeMin,
          };

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

    // Explicitly support clearing (`""` -> `null`) OR replacing `coverImageUrl` & `ogImageUrl`
    let coverImageUrl: string | null | undefined = undefined;
    if (dto.coverImageUrl !== undefined) {
      coverImageUrl =
        dto.coverImageUrl.trim() === ''
          ? null
          : this.toStorageKey(dto.coverImageUrl);
    } else if (!existing.coverImageUrl && normalizedContent) {
      const fallback = this.extractFirstImageSrc(normalizedContent);
      if (fallback) coverImageUrl = this.toStorageKey(fallback);
    }

    const ogImageUrl =
      dto.ogImageUrl !== undefined
        ? dto.ogImageUrl.trim() === ''
          ? null
          : this.toStorageKey(dto.ogImageUrl)
        : undefined;

    const authorAvatar =
      dto.authorAvatar !== undefined
        ? dto.authorAvatar.trim() === ''
          ? null
          : this.toStorageKey(dto.authorAvatar)
        : undefined;

    const updated = await this.prisma.blogPost.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        slug,
        ...(dto.excerpt !== undefined && { excerpt: dto.excerpt || null }),
        ...(normalizedContent !== undefined && { content: normalizedContent }),
        ...(coverImageUrl !== undefined && { coverImageUrl }),
        ...(dto.coverImageAlt !== undefined && {
          coverImageAlt: dto.coverImageAlt || null,
        }),
        ...(dto.authorName !== undefined && { authorName: dto.authorName }),
        ...(authorAvatar !== undefined && { authorAvatar }),
        ...(dto.authorRole !== undefined && { authorRole: dto.authorRole }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        readingTimeMin: metrics.readingTimeMin,
        wordCount: metrics.wordCount,
        status,
        ...(dto.isFeatured !== undefined && { isFeatured: dto.isFeatured }),
        publishedAt,
        ...(dto.metaTitle !== undefined && { metaTitle: dto.metaTitle || null }),
        ...(dto.metaDescription !== undefined && {
          metaDescription: dto.metaDescription || null,
        }),
        ...(dto.canonicalUrl !== undefined && {
          canonicalUrl: dto.canonicalUrl || null,
        }),
        ...(ogImageUrl !== undefined && { ogImageUrl }),
        ...(dto.focusKeyword !== undefined && {
          focusKeyword: dto.focusKeyword || null,
        }),
      },
    });

    this.invalidateAndRewarm();
    this.logger.log(`Updated blog post: "${updated.title}" (${updated.id})`);
    return await this.formatBlog(updated);
  }

  /**
   * Admin: Delete blog post (single round-trip)
   */
  async remove(id: string) {
    try {
      await this.prisma.blogPost.delete({ where: { id } });
    } catch {
      throw new NotFoundException(`Blog post with ID "${id}" not found`);
    }
    this.invalidateAndRewarm();
    this.logger.log(`Deleted blog post with ID: ${id}`);
    return { success: true, message: `Blog post ${id} deleted successfully` };
  }
}
