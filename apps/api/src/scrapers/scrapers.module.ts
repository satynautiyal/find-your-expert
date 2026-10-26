import { Module } from '@nestjs/common';
import { GoogleReviewsScraperService } from './google/google-reviews-scraper.service';
import { YelpReviewsScraperService } from './yelp/yelp-reviews-scraper.service';
import { HouzzReviewsScraperService } from './houzz/houzz-reviews-scraper.service';
import { ReviewsScraperService } from './reviews-scraper.service';

@Module({
  providers: [
    GoogleReviewsScraperService,
    YelpReviewsScraperService,
    HouzzReviewsScraperService,
    ReviewsScraperService,
  ],
  exports: [
    GoogleReviewsScraperService,
    YelpReviewsScraperService,
    HouzzReviewsScraperService,
    ReviewsScraperService,
  ],
})
export class ScrapersModule {}
