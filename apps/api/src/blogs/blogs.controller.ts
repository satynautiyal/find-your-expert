import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Query,
  Param,
  Body,
} from '@nestjs/common';
import { BlogsService } from './blogs.service';
import { GetBlogsQueryDto } from './dto/get-blogs.dto';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';

@Controller('blogs')
export class BlogsController {
  constructor(private readonly blogsService: BlogsService) {}

  // ═══════════════════════════════════════════════════════
  // PUBLIC ENDPOINTS
  // ═══════════════════════════════════════════════════════

  /**
   * GET /api/blogs
   * Paginated, searched & filtered published blog posts
   */
  @Get()
  async getBlogs(@Query() query: GetBlogsQueryDto) {
    const result = await this.blogsService.findAll(query);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /api/blogs/featured
   * Top featured post for the hero banner
   */
  @Get('featured')
  async getFeaturedBlog() {
    const result = await this.blogsService.findFeatured();
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /api/blogs/categories
   * List of categories with post counts
   */
  @Get('categories')
  async getCategories() {
    const result = await this.blogsService.getCategories();
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  // ═══════════════════════════════════════════════════════
  // ADMIN / MANAGEMENT ENDPOINTS (Open for demo/testing)
  // ═══════════════════════════════════════════════════════

  /**
   * GET /api/blogs/admin/all
   * List all posts including drafts & archived
   */
  @Get('admin/all')
  async getAdminBlogs(@Query() query: GetBlogsQueryDto) {
    const result = await this.blogsService.findAllAdmin(query);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /api/blogs/admin/post/:id
   * Fetch single post by ID for editing
   */
  @Get('admin/post/:id')
  async getAdminBlogById(@Param('id') id: string) {
    const result = await this.blogsService.findById(id);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /api/blogs/admin
   * Create a new draft or published blog post
   */
  @Post('admin')
  async createBlog(@Body() dto: CreateBlogDto) {
    const result = await this.blogsService.create(dto);
    return {
      success: true,
      data: result,
      message: 'Blog post created successfully',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * PUT /api/blogs/admin/:id
   * Update existing blog post & SEO tags
   */
  @Put('admin/:id')
  async updateBlog(@Param('id') id: string, @Body() dto: UpdateBlogDto) {
    const result = await this.blogsService.update(id, dto);
    return {
      success: true,
      data: result,
      message: 'Blog post updated successfully',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * DELETE /api/blogs/admin/:id
   * Delete a blog post
   */
  @Delete('admin/:id')
  async deleteBlog(@Param('id') id: string) {
    const result = await this.blogsService.remove(id);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /api/blogs/admin/seed
   * Seed sample blogs if empty
   */
  @Post('admin/seed')
  async seedBlogs() {
    const result = await this.blogsService.seedSampleBlogs();
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  // ═══════════════════════════════════════════════════════
  // DYNAMIC SLUG ENDPOINT (Must be last to avoid route conflicts)
  // ═══════════════════════════════════════════════════════

  /**
   * GET /api/blogs/:slug
   * Fetch single blog post by slug + related posts
   */
  @Get(':slug')
  async getBlogBySlug(@Param('slug') slug: string) {
    const result = await this.blogsService.findBySlug(slug);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }
}
