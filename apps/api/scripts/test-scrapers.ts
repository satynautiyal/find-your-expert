import { YelpReviewsScraperService } from '../src/scrapers/yelp/yelp-reviews-scraper.service';
import { GoogleReviewsScraperService } from '../src/scrapers/google/google-reviews-scraper.service';
import { FacebookReviewsScraperService } from '../src/scrapers/facebook/facebook-reviews-scraper.service';
import { ReviewsScraperService } from '../src/scrapers/reviews-scraper.service';

async function testScrapers() {
  console.log('===========================================================');
  console.log('🧪 Testing In-House Review Scrapers (Free & No Keys)');
  console.log('===========================================================\n');

  const yelpScraper = new YelpReviewsScraperService();
  const googleScraper = new GoogleReviewsScraperService();
  const fbScraper = new FacebookReviewsScraperService();
  const orchestrator = new ReviewsScraperService(googleScraper, yelpScraper, fbScraper);

  // 1. Test Yelp Scraper
  console.log('--- 1. Testing Yelp Scraper ---');
  const yelpResult = await yelpScraper.scrapeReviews('b-and-b-contracting-staten-island', 5);
  console.log(`Yelp Success: ${yelpResult.success} | Rating: ${yelpResult.rating} | Total: ${yelpResult.totalReviews} | Reviews Extracted: ${yelpResult.reviews.length}`);
  if (yelpResult.reviews.length > 0) {
    console.log('Sample Review:', yelpResult.reviews[0]);
  }

  // 2. Test Google Scraper
  console.log('\n--- 2. Testing Google Scraper ---');
  const googleResult = await googleScraper.scrapeReviews('King Remodeling Corp New York City', 5);
  console.log(`Google Success: ${googleResult.success} | Rating: ${googleResult.rating} | Total: ${googleResult.totalReviews} | Reviews Extracted: ${googleResult.reviews.length}`);
  if (googleResult.reviews.length > 0) {
    console.log('Sample Review:', googleResult.reviews[0]);
  }

  // 3. Test Multi-platform Orchestrator
  console.log('\n--- 3. Testing Orchestrator (Multi-Platform) ---');
  const multiResult = await orchestrator.scrapeAllPlatforms({
    businessName: 'B&B Contracting Corp.',
    borough: 'Staten Island',
    yelpUrl: 'https://www.yelp.com/biz/b-and-b-contracting-staten-island',
  }, 10);

  console.log(`\nMulti-Platform Result:`);
  console.log(`- Business: ${multiResult.businessName}`);
  console.log(`- Composite Rating: ${multiResult.compositeRating}`);
  console.log(`- Total Reviews: ${multiResult.totalReviews}`);
  console.log(`- Total Reviews Collected: ${multiResult.allReviews.length}`);
  console.log('\n🎉 Scraper test completed successfully!');
}

testScrapers().catch(console.error);
