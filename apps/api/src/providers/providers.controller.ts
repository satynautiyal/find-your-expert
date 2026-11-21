import { Controller, Get, Post, Body, Query, Param, Header } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { GetProvidersQueryDto } from './dto/get-providers.dto';
import { BrowserPoolUtil } from '../scrapers/utils/browser-pool.util';

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
   * GET /api/providers/:slug/reviews
   * Paginated verified customer reviews (10 per page default, 100% R2 media, zero static/third-party URLs)
   */
  @Get(':slug/reviews')
  @Header('Cache-Control', PUBLIC_CACHE_HEADER)
  async getProviderReviews(
    @Param('slug') slug: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('platform') platform?: string,
    @Query('withPhotos') withPhotos?: string,
    @Query('sortBy') sortBy?: string,
    @Query('search') search?: string
  ) {
    const result = await this.providersService.getPaginatedReviews(slug, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
      platform,
      withPhotos: withPhotos === 'true' || withPhotos === '1',
      sortBy,
      search,
    });
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

  @Post('houzz-session/open')
  async openHouzzVisibleSession(@Body('url') url?: string) {
    const target =
      url ||
      'https://www.houzz.com/professionals/cabinets-and-cabinetry/manhattan-cabinets-inc-pfvwus-pf~914367236';
    const data = await BrowserPoolUtil.openSharedVisibleBrowser(target);
    return { success: true, data };
  }

  /**
   * POST /api/providers/projects/sync-all
   * Scrape authentic project albums, website brand logo, website About AI bio, and website Team across all active providers
   */
  @Post('projects/sync-all')
  async syncAllProjects(
    @Query('projectsOnly') projectsOnly?: string,
    @Query('skipHouzz') skipHouzz?: string
  ) {
    const result = await this.providersService.syncAllProviderProjects({
      projectsOnly: projectsOnly === 'true' || projectsOnly === '1',
      skipHouzz: skipHouzz === 'true' || skipHouzz === '1',
    });
    return {
      success: true,
      data: result,
      message: 'Synchronized contractor project albums, brand logos, AI bios, and website teams into R2 and MariaDB.',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /api/providers/logos/normalize-all
   * Auto-trim empty whitespace/transparent margins and convert white-on-transparent logos across all active R2 logos
   */
  @Post('logos/normalize-all')
  async normalizeAllLogos() {
    const result = await this.providersService.normalizeAllProviderLogos();
    return {
      success: true,
      data: result,
      message: `Normalized ${result.logosNormalized}/${result.totalProviders} contractor logos in Cloudflare R2.`,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /api/providers/brand-team/sync-all
   * Fast sync of official website brand logo, AI-rewritten website About description, and website "The team" members
   */
  @Post('brand-team/sync-all')
  async syncAllBrandAndTeam() {
    const result = await this.providersService.syncAllProviderBrandAndTeam();
    return {
      success: true,
      data: result,
      message: `Synchronized website brand, AI descriptions, and ${result.totalTeamMembersSaved} team members across ${result.totalProviders} providers.`,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /api/providers/sync-full-all
   * Run complete permanent scraper pipeline (Website + R2 Logo + AI Bio + R2 Team + Website/Houzz Projects + 2k Reviews + R2 Review Photos + AI Summary)
   */
  @Post('sync-full-all')
  async syncFullAllProviders(@Query('maxReviews') maxReviews?: string) {
    const result = await this.providersService.syncFullAllProviders(
      maxReviews ? Number(maxReviews) : 2000
    );
    return {
      success: true,
      data: result,
      message: 'Completed full permanent scraper pipeline across all active providers.',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /api/providers/projects/rewrite-descriptions
   * Enrich & AI-rewrite all project descriptions into 100% original, SEO-safe prose
   */
  @Post('projects/rewrite-descriptions')
  async rewriteProjectDescriptions(
    @Query('slug') slug?: string,
    @Query('force') force?: string
  ) {
    const result = await this.providersService.rewriteAllProjectDescriptions({
      slug: slug || undefined,
      force: force === undefined ? true : force !== 'false',
    });
    return {
      success: true,
      data: result,
      message: `AI-rewrote ${result.rewrittenAndSaved}/${result.targetedProjects} project descriptions.`,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /api/providers/reviews/sync-all
   * Scrape up to 2,000 live reviews per contractor across all active providers
   */
  @Post('reviews/sync-all')
  async syncAllProviderReviews(
    @Query('platforms') platformsCsv?: string,
    @Query('maxReviews') maxReviews?: string
  ) {
    const platforms = platformsCsv
      ? platformsCsv
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean)
      : undefined;
    const result = await this.providersService.syncAllProviderReviews(
      platforms,
      maxReviews ? Number(maxReviews) : 2000
    );
    return {
      success: true,
      data: result,
      message: 'Synchronized reviews across all active providers.',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /api/providers/reviews/generate-ai-summaries-all
   * Analyze up to 500 most recent reviews (Google, Houzz, Yelp, HomeAdvisor) across all active providers
   */
  @Post('reviews/generate-ai-summaries-all')
  async generateAllAiSummaries(
    @Query('force') force?: string,
    @Query('limit') limit?: string,
    @Query('maxReviews') maxReviews?: string
  ) {
    const result = await this.providersService.generateAiSummariesForAllProviders({
      force: force === undefined ? true : force !== 'false',
      limit: limit ? Number(limit) : undefined,
      maxReviews: maxReviews ? Number(maxReviews) : 500,
    });
    return {
      success: true,
      data: result,
      message: `Generated AI review summaries for ${result.generatedCount}/${result.totalProviders} contractor(s).`,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /api/providers/:slug/sync-brand-team
   * Fast sync of official website brand logo, AI-rewritten website About description, and website "The team" members
   */
  @Post(':slug/sync-brand-team')
  async syncProviderBrandAndTeam(@Param('slug') slug: string) {
    const result = await this.providersService.syncProviderBrandAndTeam(slug);
    return {
      success: true,
      data: result,
      message: `Synchronized website brand, AI description, and ${result.teamMembersSaved} team member(s) for ${result.businessName}.`,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /api/providers/:slug/sync-full
   * Run complete permanent scraper pipeline for a single contractor
   */
  @Post(':slug/sync-full')
  async syncFullProvider(
    @Param('slug') slug: string,
    @Query('maxReviews') maxReviews?: string
  ) {
    const result = await this.providersService.syncFullProvider(
      slug,
      maxReviews ? Number(maxReviews) : 2000
    );
    return {
      success: true,
      data: result,
      message: `Completed full permanent scrape for ${result.businessName}.`,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /api/providers/:slug/sync-projects
   * Scrape authentic project albums for a single contractor and upload 100% of photos to R2
   */
  @Post(':slug/sync-projects')
  async syncProviderProjects(
    @Param('slug') slug: string,
    @Query('maxProjects') maxProjects?: string,
    @Query('maxPhotos') maxPhotos?: string,
    @Query('projectsOnly') projectsOnly?: string,
    @Query('skipHouzz') skipHouzz?: string
  ) {
    const result = await this.providersService.syncProviderProjects(slug, {
      maxProjects: maxProjects ? Number(maxProjects) : undefined,
      maxPhotosPerProject: maxPhotos ? Number(maxPhotos) : undefined,
      projectsOnly: projectsOnly === 'true' || projectsOnly === '1',
      skipHouzz: skipHouzz === 'true' || skipHouzz === '1',
    });
    return {
      success: true,
      data: result,
      message: `Synchronized ${result.projectsSaved} project albums (${result.photosUploadedToR2} R2 photos) for ${result.businessName}.`,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /api/providers/:slug/restore-r2-projects
   * Restore R2-backed project albums stored under providers/projects/<slug>/<albumSlug>/
   */
  @Post(':slug/restore-r2-projects')
  async restoreR2Projects(
    @Param('slug') slug: string,
    @Body('albums')
    albums: Array<{
      slug: string;
      title: string;
      location?: string;
      projectYear?: number;
      costRange?: string;
      serviceCategory?: string;
      sourceUrl?: string;
    }>
  ) {
    const result = await this.providersService.restoreR2ProjectAlbums(slug, albums || []);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /api/providers/:slug/sync-reviews
   * Scrape and update live ratings/reviews (up to 2,000 max) from Google, Yelp, HomeAdvisor and Houzz
   */
  @Post(':slug/sync-reviews')
  async syncProviderReviews(
    @Param('slug') slug: string,
    @Query('platforms') platformsCsv?: string,
    @Query('maxReviews') maxReviews?: string
  ) {
    const platforms = platformsCsv
      ? platformsCsv
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean)
      : undefined;
    const result = await this.providersService.syncReviews(
      slug,
      platforms,
      maxReviews ? Number(maxReviews) : 2000
    );
    return {
      success: true,
      data: result,
      message: 'Reviews synchronized successfully across Google, Yelp, HomeAdvisor and Houzz.',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /api/providers/:slug/generate-ai-summary
   * Analyze up to 500 most recent verified reviews (Google, Houzz, Yelp, HomeAdvisor) -> crisp summary + tags
   */
  @Post(':slug/generate-ai-summary')
  async generateAiSummary(
    @Param('slug') slug: string,
    @Query('maxReviews') maxReviews?: string
  ) {
    const result = await this.providersService.generateAiSummary(
      slug,
      maxReviews ? Number(maxReviews) : 500
    );
    return {
      success: true,
      data: result,
      message: 'AI Review summary and highlight tags generated and saved successfully.',
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
   * POST /api/providers/media/migrate-to-bucket
   * Download all external provider logos, project photos, cover images, and avatars into R2 bucket
   */
  @Post('media/migrate-to-bucket')
  async migrateMediaToBucket() {
    const result = await this.providersService.migrateExternalMediaToBucket();
    return {
      success: true,
      data: result,
      message: 'All external images migrated into Cloudflare R2 bucket successfully.',
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
