import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { GetBlogsQueryDto } from './dto/get-blogs.dto';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { PostStatus, Prisma } from '@prisma/client';

@Injectable()
export class BlogsService {
  private readonly logger = new Logger(BlogsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService
  ) {}

  /**
   * Helper: Format blog post with fresh presigned URLs for all media assets
   */
  public async formatBlog(blog: any): Promise<any> {
    if (!blog) return null;

    let coverImageUrl = blog.coverImageUrl || '';
    if (coverImageUrl) {
      coverImageUrl = await this.storageService.getPresignedUrl(coverImageUrl);
    } else if (blog.content) {
      // Fallback: extract first <img> src from content if no cover image was explicitly set
      const match = blog.content.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (match && match[1]) {
        coverImageUrl = await this.storageService.getPresignedUrl(match[1]);
      }
    }

    let ogImageUrl = blog.ogImageUrl || '';
    if (ogImageUrl) {
      ogImageUrl = await this.storageService.getPresignedUrl(ogImageUrl);
    }

    let authorAvatar = blog.authorAvatar || '';
    if (authorAvatar) {
      authorAvatar = await this.storageService.getPresignedUrl(authorAvatar);
    }

    return {
      ...blog,
      coverImageUrl: coverImageUrl || null,
      ogImageUrl: ogImageUrl || null,
      authorAvatar: authorAvatar || null,
    };
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
        mode: 'insensitive',
      };
    }

    if (tag) {
      where.tags = {
        has: tag,
      };
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { excerpt: { contains: term, mode: 'insensitive' } },
        { content: { contains: term, mode: 'insensitive' } },
        { category: { contains: term, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.BlogPostOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [rawBlogs, total] = await Promise.all([
      this.prisma.blogPost.findMany({
        where,
        skip,
        take: limit,
        orderBy,
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
   * Public: Get top featured blog post for the hero section
   */
  async findFeatured() {
    const featured = await this.prisma.blogPost.findFirst({
      where: {
        status: PostStatus.PUBLISHED,
        isFeatured: true,
      },
      orderBy: {
        publishedAt: 'desc',
      },
    });

    if (featured) return await this.formatBlog(featured);

    // Fallback: get the latest published post
    const latest = await this.prisma.blogPost.findFirst({
      where: {
        status: PostStatus.PUBLISHED,
      },
      orderBy: {
        publishedAt: 'desc',
      },
    });

    return await this.formatBlog(latest);
  }

  /**
   * Public: Get categories with blog post counts
   */
  async getCategories() {
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
  }

  /**
   * Public: Get single published blog post by slug + increment viewCount + fetch related posts
   */
  async findBySlug(slug: string) {
    const blog = await this.prisma.blogPost.findUnique({
      where: { slug },
    });

    if (!blog) {
      throw new NotFoundException(`Blog post with slug "${slug}" not found`);
    }

    // Async increment viewCount in background without blocking response
    this.prisma.blogPost
      .update({
        where: { id: blog.id },
        data: { viewCount: { increment: 1 } },
      })
      .catch((err) => this.logger.warn(`Failed to increment view count: ${err.message}`));

    // Fetch related articles (same category or shared tags, excluding current post)
    const rawRelatedPosts = await this.prisma.blogPost.findMany({
      where: {
        id: { not: blog.id },
        status: PostStatus.PUBLISHED,
        OR: [
          { category: blog.category },
          ...(blog.tags.length > 0 ? [{ tags: { hasSome: blog.tags } }] : []),
        ],
      },
      take: 3,
      orderBy: { publishedAt: 'desc' },
    });

    const [formattedBlog, relatedPosts] = await Promise.all([
      this.formatBlog(blog),
      Promise.all(rawRelatedPosts.map((p) => this.formatBlog(p))),
    ]);

    return {
      blog: formattedBlog,
      relatedPosts,
    };
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
      where.category = { equals: category, mode: 'insensitive' };
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { excerpt: { contains: term, mode: 'insensitive' } },
        { category: { contains: term, mode: 'insensitive' } },
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
        authorName: dto.authorName || 'FindYourExperts Editorial',
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

    this.logger.log(`Updated blog post: "${updated.title}" (${updated.id})`);
    return await this.formatBlog(updated);
  }

  /**
   * Admin: Delete blog post
   */
  async remove(id: string) {
    await this.findById(id);
    await this.prisma.blogPost.delete({ where: { id } });
    this.logger.log(`Deleted blog post with ID: ${id}`);
    return { success: true, message: `Blog post ${id} deleted successfully` };
  }
}
