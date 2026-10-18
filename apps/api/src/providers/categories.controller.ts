import { Controller, Get } from '@nestjs/common';
import { ProvidersService } from './providers.service';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly providersService: ProvidersService) {}

  /**
   * GET /api/categories
   * Retrieve all service categories with active provider counts and subservices
   */
  @Get()
  async getCategories() {
    const data = await this.providersService.getCategories();
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }
}
