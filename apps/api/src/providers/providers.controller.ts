import { Controller, Get, Post, Query, Param } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { GetProvidersQueryDto } from './dto/get-providers.dto';

@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  /**
   * GET /api/providers
   * Paginated, filtered, sorted providers directly from PostgreSQL
   */
  @Get()
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
  async getFiltersAndStats() {
    const result = await this.providersService.getFiltersAndStats();
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
   * Scrape and update live ratings/reviews from Google, Yelp and Facebook
   */
  @Post(':slug/sync-reviews')
  async syncProviderReviews(@Param('slug') slug: string) {
    const result = await this.providersService.syncReviews(slug);
    return {
      success: true,
      data: result,
      message: 'Reviews synchronized successfully across Google, Yelp and Facebook.',
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
}
