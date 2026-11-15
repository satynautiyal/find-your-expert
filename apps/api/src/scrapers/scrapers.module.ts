import { Module } from '@nestjs/common';
import { GoogleReviewsScraperService } from './google/google-reviews-scraper.service';
import { YelpReviewsScraperService } from './yelp/yelp-reviews-scraper.service';
import { HomeAdvisorReviewsScraperService } from './homeadvisor/homeadvisor-reviews-scraper.service';
import { HouzzReviewsScraperService } from './houzz/houzz-reviews-scraper.service';
import { ReviewsScraperService } from './reviews-scraper.service';

@Module({
  providers: [
    GoogleReviewsScraperService,
    YelpReviewsScraperService,
    HomeAdvisorReviewsScraperService,
    HouzzReviewsScraperService,
    ReviewsScraperService,
  ],
  exports: [
    GoogleReviewsScraperService,
    YelpReviewsScraperService,
    HomeAdvisorReviewsScraperService,
    HouzzReviewsScraperService,
    ReviewsScraperService,
  ],
})
export class ScrapersModule {}
