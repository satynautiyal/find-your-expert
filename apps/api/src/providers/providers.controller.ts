import { Controller, Get, Post, Body, Query, Param, Header } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { GetProvidersQueryDto } from './dto/get-providers.dto';

const PUBLIC_CACHE_HEADER = 'public, max-age=0, s-maxage=60, stale-while-revalidate=300';

@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  /**
   * GET /api/providers
   * Paginated, filtered, sorted providers directly from database
   */
  @Get()
  @Header('Cache-Control', PUBLIC_CACHE_HEADER)
  async getProviders(@Query() query: GetProvidersQueryDto) {
    const result = await this.providersService.findAll(query);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /api/providers/filters
   * Dynamic filter options (Boroughs, Services) and live database stats
   */
  @Get('filters')
  @Header('Cache-Control', PUBLIC_CACHE_HEADER)
  async getFiltersAndStats() {
    const result = await this.providersService.getFiltersAndStats();
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /api/providers/categories
   * Dynamic categories taxonomy with active provider counts and subservices
   */
  @Get('categories')
  @Header('Cache-Control', PUBLIC_CACHE_HEADER)
  async getCategories() {
    const result = await this.providersService.getCategories();
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /api/providers/:slug
   * Retrieve single provider by slug
   */
  @Get(':slug')
  @Header('Cache-Control', PUBLIC_CACHE_HEADER)
  async getProviderBySlug(@Param('slug') slug: string) {
    const provider = await this.providersService.findBySlug(slug);
    return {
      success: true,
      data: provider,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /api/providers/:slug/sync-reviews
   * Scrape and update live ratings/reviews from Google, Yelp, HomeAdvisor and Houzz
   */
  @Post(':slug/sync-reviews')
  async syncProviderReviews(
    @Param('slug') slug: string,
    @Query('platforms') platformsCsv?: string
  ) {
    const platforms = platformsCsv
      ? platformsCsv
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean)
      : undefined;
    const result = await this.providersService.syncReviews(slug, platforms);
    return {
      success: true,
      data: result,
      message: 'Reviews synchronized successfully across Google, Yelp, HomeAdvisor and Houzz.',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /api/providers/:slug/generate-ai-summary
   * Trigger progressive AI chunked review analysis (20 reviews per batch via OpenRouter Mistral)
   */
  @Post(':slug/generate-ai-summary')
  async generateAiSummary(@Param('slug') slug: string) {
    const result = await this.providersService.generateAiSummary(slug);
    return {
      success: true,
      data: result,
      message: 'AI Review summary generated and saved successfully.',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /api/providers/cache/clear
   * Clear and re-warm provider caches after external DB updates
   */
  @Post('cache/clear')
  async clearCache() {
    const result = await this.providersService.clearCache();
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /api/providers/quotes
   * Persist customer quote request to QuoteRequest table in PostgreSQL
   */
  @Post('quotes')
  async createQuoteRequest(@Body() body: any) {
    const result = await this.providersService.createQuoteRequest(body);
    return {
      success: true,
      data: result,
      message: 'Quote request submitted successfully.',
      timestamp: new Date().toISOString(),
    };
  }
}
