import { Module } from '@nestjs/common';
import { GoogleReviewsScraperService } from './google/google-reviews-scraper.service';
import { YelpReviewsScraperService } from './yelp/yelp-reviews-scraper.service';
import { FacebookReviewsScraperService } from './facebook/facebook-reviews-scraper.service';
import { ReviewsScraperService } from './reviews-scraper.service';

@Module({
  providers: [
    GoogleReviewsScraperService,
    YelpReviewsScraperService,
    FacebookReviewsScraperService,
    ReviewsScraperService,
  ],
  exports: [
    GoogleReviewsScraperService,
    YelpReviewsScraperService,
    FacebookReviewsScraperService,
    ReviewsScraperService,
  ],
})
export class ScrapersModule {}
