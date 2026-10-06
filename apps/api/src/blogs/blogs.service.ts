import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetBlogsQueryDto } from './dto/get-blogs.dto';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { PostStatus, Prisma } from '@prisma/client';

@Injectable()
export class BlogsService {
  private readonly logger = new Logger(BlogsService.name);

  constructor(private readonly prisma: PrismaService) {}

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

    const [blogs, total] = await Promise.all([
      this.prisma.blogPost.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.blogPost.count({ where }),
    ]);

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

    if (featured) return featured;

    // Fallback: get the latest published post
    return this.prisma.blogPost.findFirst({
      where: {
        status: PostStatus.PUBLISHED,
      },
      orderBy: {
        publishedAt: 'desc',
      },
    });
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
    const relatedPosts = await this.prisma.blogPost.findMany({
      where: {
        id: { not: blog.id },
        status: PostStatus.PUBLISHED,
        OR: [
          { category: blog.category },
          { tags: { hasSome: blog.tags.length > 0 ? blog.tags : ['Roofing'] } },
        ],
      },
      take: 3,
      orderBy: { publishedAt: 'desc' },
    });

    return {
      blog,
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

    const [blogs, total] = await Promise.all([
      this.prisma.blogPost.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.blogPost.count({ where }),
    ]);

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

    return blog;
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

    const newPost = await this.prisma.blogPost.create({
      data: {
        title: dto.title,
        slug,
        excerpt: dto.excerpt || null,
        content: dto.content,
        coverImageUrl: dto.coverImageUrl || null,
        coverImageAlt: dto.coverImageAlt || dto.title,
        authorName: dto.authorName || 'FindYourExperts Editorial',
        authorAvatar: dto.authorAvatar || null,
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
        ogImageUrl: dto.ogImageUrl || dto.coverImageUrl || null,
        focusKeyword: dto.focusKeyword || null,
      },
    });

    this.logger.log(`Created new blog post: "${newPost.title}" (${newPost.id})`);
    return newPost;
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

    const updated = await this.prisma.blogPost.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        slug,
        ...(dto.excerpt !== undefined && { excerpt: dto.excerpt }),
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.coverImageUrl !== undefined && { coverImageUrl: dto.coverImageUrl }),
        ...(dto.coverImageAlt !== undefined && { coverImageAlt: dto.coverImageAlt }),
        ...(dto.authorName !== undefined && { authorName: dto.authorName }),
        ...(dto.authorAvatar !== undefined && { authorAvatar: dto.authorAvatar }),
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
        ...(dto.ogImageUrl !== undefined && { ogImageUrl: dto.ogImageUrl }),
        ...(dto.focusKeyword !== undefined && { focusKeyword: dto.focusKeyword }),
      },
    });

    this.logger.log(`Updated blog post: "${updated.title}" (${updated.id})`);
    return updated;
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

  /**
   * Seed: Insert high-quality sample roofing & home improvement blogs
   */
  async seedSampleBlogs() {
    const existingCount = await this.prisma.blogPost.count();
    if (existingCount > 0) {
      return { message: `Database already has ${existingCount} blogs. Skipping seed.`, seeded: 0 };
    }

    const samples: Array<Prisma.BlogPostCreateInput> = [
      {
        title: 'NYC Flat Roof Replacement Cost Guide (2026 Breakdown)',
        slug: 'nyc-flat-roof-replacement-cost-guide-2026',
        excerpt:
          'Comprehensive cost breakdown for Brooklyn, Queens, and Manhattan property owners looking to repair or replace modified bitumen, EPDM, and torch-down flat roofs.',
        content: `
<h2>Understanding Flat Roof Replacement in NYC</h2>
<p>Living in New York City comes with distinct architectural charm and unique roofing demands. Whether you own a classic brownstone in Park Slope, a multi-family residence in Astoria, or a commercial space in Manhattan, understanding flat roof longevity and costs is essential.</p>

<h3>Average Cost by Material in New York City</h3>
<p>Flat roofs in the five boroughs generally cost between <strong>$7.50 and $16.00 per square foot</strong>, depending on the membrane system, roof deck condition, and NYC building code access requirements:</p>
<ul>
  <li><strong>Modified Bitumen (Torch Down):</strong> $6.50 – $11.00 per sq. ft. (15–20 year lifespan)</li>
  <li><strong>EPDM Rubber Membrane:</strong> $8.00 – $13.50 per sq. ft. (20–25 year lifespan)</li>
  <li><strong>TPO / PVC Single-Ply:</strong> $9.50 – $15.00 per sq. ft. (20–30 year energy-efficient reflective surface)</li>
  <li><strong>Liquid Applied Membrane:</strong> $11.00 – $18.00 per sq. ft. (Seamless waterproofing ideal for complex parapets)</li>
</ul>

<h3>Key Cost Factors to Keep in Mind</h3>
<ol>
  <li><strong>Old Layer Tear-Off:</strong> NYC Building Code permits a maximum of 2 roofing layers. If your roof already has 2 layers, a full tear-off is legally mandated.</li>
  <li><strong>Parapet Walls and Flashing:</strong> Leaks frequently originate at the flashing or copings rather than the flat surface itself.</li>
  <li><strong>Access and Crane Permits:</strong> Tight NYC street logistics can add permit and disposal fees.</li>
</ol>

<blockquote><strong>Pro Tip:</strong> Always verify that your roofing contractor carries active NYC Department of Buildings (DOB) licensing and comprehensive general liability insurance with roof open endorsements.</blockquote>
        `,
        coverImageUrl: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80',
        coverImageAlt: 'NYC Flat Roof inspection on townhouse',
        authorName: 'David Miller',
        authorRole: 'Senior Building Inspector',
        category: 'Cost Guides',
        tags: ['Roofing', 'Cost Guide', 'NYC', 'Flat Roof'],
        readingTimeMin: 4,
        wordCount: 420,
        status: PostStatus.PUBLISHED,
        isFeatured: true,
        publishedAt: new Date(),
        metaTitle: 'NYC Flat Roof Replacement Cost Guide 2026 | FindYourExperts',
        metaDescription: 'Find out the real costs of flat roof replacement across NYC boroughs in 2026. Material comparisons, permit rules, and contractor tips.',
        focusKeyword: 'NYC flat roof replacement cost',
      },
      {
        title: '7 Warning Signs Your Roof Has Hidden Water Damage',
        slug: '7-warning-signs-roof-hidden-water-damage',
        excerpt:
          'Do not wait for water to drip from your ceiling. Learn how to identify subtle structural warning signs before costly rot and mold set in.',
        content: `
<h2>Early Detection Saves Thousands</h2>
<p>Roof leaks are deceptive. By the time water actively drips onto your living room floor, the moisture has often travelled along rafters and sheathing for weeks or even months, creating silent structural damage.</p>

<h3>1. Subtle Ceiling and Wall Discoloration</h3>
<p>Look out for faint ring-shaped brown or yellow stains. Even a dry spot indicates that water penetrated previously and will return during the next heavy storm.</p>

<h3>2. Granule Loss in Gutters</h3>
<p>If you inspect your gutter downspouts and see piles of coarse, sand-like granules, your asphalt shingles are nearing the end of their weatherproofing cycle.</p>

<h3>3. Spongy or Sagging Roof Decking</h3>
<p>When walking on the roof (or when your certified inspector steps across it), there should be zero bounce. Sponginess indicates rotted plywood sheathing.</p>

<h3>4. Peeling Paint Under Eaves & Soffits</h3>
<p>Moisture trapped inside the roof attic seeks an exit, causing exterior paint along the roofline and fascia to bubble and peel prematurely.</p>

<blockquote><strong>Take Action:</strong> If you notice two or more of these signs, get quotes from at least 3 licensed contractors to compare diagnoses and repair scope.</blockquote>
        `,
        coverImageUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb186156f?auto=format&fit=crop&w=1200&q=80',
        coverImageAlt: 'Roof damage inspection',
        authorName: 'Sarah Jenkins',
        authorRole: 'Home Maintenance Specialist',
        category: 'Roofing Tips',
        tags: ['Maintenance', 'Water Damage', 'Roof Inspection'],
        readingTimeMin: 3,
        wordCount: 310,
        status: PostStatus.PUBLISHED,
        isFeatured: false,
        publishedAt: new Date(Date.now() - 86400000 * 2), // 2 days ago
        metaTitle: '7 Signs Your Roof Has Hidden Water Damage | FindYourExperts',
        metaDescription: 'Learn the 7 subtle signs of hidden roof leaks and water damage before severe mold and deck rot occur.',
        focusKeyword: 'roof water damage signs',
      },
      {
        title: 'How to Choose the Right Contractor: The 10-Question Checklist',
        slug: 'how-to-choose-the-right-contractor-checklist',
        excerpt:
          'Never hire a home exterior contractor without asking these 10 crucial questions regarding permits, insurance, warranties, and milestones.',
        content: `
<h2>Hiring with Confidence</h2>
<p>Finding a trustworthy contractor does not have to be stressful. Arming yourself with the right questions protects your home investment and ensures accountability.</p>

<h3>The Essential 10 Questions</h3>
<ol>
  <li><strong>Are you licensed and insured for my specific municipality?</strong> Request Certificate of Insurance (COI) naming you as certificate holder.</li>
  <li><strong>Will you pull the required municipal permits?</strong> Never pull homeowner permits for contractor work.</li>
  <li><strong>What warranty is provided on labor versus materials?</strong> Standard workmanship warranties range from 5 to 10 years.</li>
  <li><strong>Do you use in-house crews or subcontractors?</strong> Knowing who will be on your property is paramount.</li>
  <li><strong>What is your cleanup and debris removal procedure?</strong> Ensure magnetic nail sweeps and dumpster permits are included.</li>
  <li><strong>How do you handle unforeseen rot or structural changes?</strong> Transparent change-order policies prevent billing shocks.</li>
  <li><strong>Can you provide 3 recent local references?</strong> Check verifiable projects completed in the past 6 months.</li>
  <li><strong>What is the payment milestone schedule?</strong> Avoid contractors asking for more than 20-30% upfront.</li>
  <li><strong>How will our project communication be handled daily?</strong> Designate a single project manager contact.</li>
  <li><strong>What is the estimated start and completion timeline?</strong> Have contingency clauses for inclement weather.</li>
</ol>
        `,
        coverImageUrl: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1200&q=80',
        coverImageAlt: 'Contractor reviewing blueprints on site',
        authorName: 'Marcus Vance',
        authorRole: 'Consumer Advocate',
        category: 'Hiring Advice',
        tags: ['Contractor Tips', 'Hiring Checklist', 'Home Improvement'],
        readingTimeMin: 4,
        wordCount: 360,
        status: PostStatus.PUBLISHED,
        isFeatured: false,
        publishedAt: new Date(Date.now() - 86400000 * 5), // 5 days ago
        metaTitle: 'How to Choose a Contractor: 10-Question Checklist | FindYourExperts',
        metaDescription: 'The ultimate 10-question checklist for vetting and hiring licensed exterior contractors safely.',
        focusKeyword: 'how to choose a contractor checklist',
      },
    ];

    for (const post of samples) {
      await this.prisma.blogPost.create({ data: post });
    }

    this.logger.log(`Successfully seeded ${samples.length} sample blog posts.`);
    return { message: 'Sample blogs seeded successfully', seeded: samples.length };
  }
}
