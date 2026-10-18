import { Module } from '@nestjs/common';
import { ProvidersController } from './providers.controller';
import { CategoriesController } from './categories.controller';
import { ProvidersService } from './providers.service';
import { AiReviewSummaryService } from './ai-review-summary.service';
import { ScrapersModule } from '../scrapers/scrapers.module';

@Module({
  imports: [ScrapersModule],
  controllers: [ProvidersController, CategoriesController],
  providers: [ProvidersService, AiReviewSummaryService],
  exports: [ProvidersService, AiReviewSummaryService],
})
export class ProvidersModule {}
