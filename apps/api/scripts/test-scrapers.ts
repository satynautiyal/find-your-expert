import { YelpReviewsScraperService } from '../src/scrapers/yelp/yelp-reviews-scraper.service';
import { GoogleReviewsScraperService } from '../src/scrapers/google/google-reviews-scraper.service';
import { HouzzReviewsScraperService } from '../src/scrapers/houzz/houzz-reviews-scraper.service';
import { ReviewsScraperService } from '../src/scrapers/reviews-scraper.service';

async function testScrapers() {
  console.log('===========================================================');
  console.log('🧪 Testing In-House Review Scrapers (Free & No Keys)');
  console.log('===========================================================\n');

  const yelpScraper = new YelpReviewsScraperService();
  const googleScraper = new GoogleReviewsScraperService();
  const houzzScraper = new HouzzReviewsScraperService();
  const orchestrator = new ReviewsScraperService(googleScraper, yelpScraper, houzzScraper);

  // 1. Test Houzz Scraper
  console.log('--- 1. Testing Houzz Scraper ---');
  const houzzResult = await houzzScraper.scrapeReviews('https://www.houzz.com/professionals/general-contractors/evolution-group-pfvwus-pf~1766049999', 5);
  console.log(`Houzz Success: ${houzzResult.success} | Rating: ${houzzResult.rating} | Total: ${houzzResult.totalReviews} | Reviews Extracted: ${houzzResult.reviews.length}`);
  if (houzzResult.reviews.length > 0) {
    console.log('Sample Houzz Review:', houzzResult.reviews[0]);
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
    businessName: 'Evolution Group',
    city: 'New York',
    houzzUrl: 'https://www.houzz.com/professionals/general-contractors/evolution-group-pfvwus-pf~1766049999',
  }, 10);

  console.log(`\nMulti-Platform Result:`);
  console.log(`- Business: ${multiResult.businessName}`);
  console.log(`- Composite Rating: ${multiResult.compositeRating}`);
  console.log(`- Total Reviews: ${multiResult.totalReviews}`);
  console.log(`- Houzz Rating: ${multiResult.platforms.houzz?.rating} (${multiResult.platforms.houzz?.totalReviews})`);
  console.log(`- Total Reviews Collected: ${multiResult.allReviews.length}`);
  console.log('\n🎉 Scraper test completed successfully!');
}

testScrapers().catch(console.error);
