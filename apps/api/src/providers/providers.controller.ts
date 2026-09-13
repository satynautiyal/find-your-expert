import { Controller, Get, Query, Param } from '@nestjs/common';
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
}
