import { Module } from '@nestjs/common';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';
import { AiReviewSummaryService } from './ai-review-summary.service';
import { ScrapersModule } from '../scrapers/scrapers.module';

@Module({
  imports: [ScrapersModule],
  controllers: [ProvidersController],
  providers: [ProvidersService, AiReviewSummaryService],
  exports: [ProvidersService, AiReviewSummaryService],
})
export class ProvidersModule {}
