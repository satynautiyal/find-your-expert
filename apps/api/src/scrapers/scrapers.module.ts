import { Module } from '@nestjs/common';
import { GoogleReviewsScraperService } from './google/google-reviews-scraper.service';
import { YelpReviewsScraperService } from './yelp/yelp-reviews-scraper.service';
import { HomeAdvisorReviewsScraperService } from './homeadvisor/homeadvisor-reviews-scraper.service';
import { HouzzReviewsScraperService } from './houzz/houzz-reviews-scraper.service';
import { ReviewsScraperService } from './reviews-scraper.service';
import { ProjectsScraperService } from './projects/projects-scraper.service';

@Module({
  providers: [
    GoogleReviewsScraperService,
    YelpReviewsScraperService,
    HomeAdvisorReviewsScraperService,
    HouzzReviewsScraperService,
    ReviewsScraperService,
    ProjectsScraperService,
  ],
  exports: [
    GoogleReviewsScraperService,
    YelpReviewsScraperService,
    HomeAdvisorReviewsScraperService,
    HouzzReviewsScraperService,
    ReviewsScraperService,
    ProjectsScraperService,
  ],
})
export class ScrapersModule {}
