import { PrismaClient, PostStatus } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding sample blogs...');

  const samples = [
    {
      title: 'NYC Flat Roof Replacement Cost Guide (2026 Breakdown)',
      slug: 'nyc-flat-roof-replacement-cost-guide-2026',
      excerpt:
        'Comprehensive cost breakdown for Brooklyn, Queens, and Manhattan property owners looking to repair or replace modified bitumen, EPDM, and torch-down flat roofs.',
      content: `
<h2>Understanding Flat Roof Replacement in NYC</h2>
<p>Living in New York City comes with distinct architectural charm and unique roofing demands. Whether you own a classic brownstone in Park Slope, a multi-family residence in Astoria, or a commercial space in Manhattan, understanding flat roof longevity and costs is essential.</p>

<h3>Average Cost by Material in New York City</h3>
<p>Flat roofs in the five boroughs generally cost between <strong>$7.50 and $16.00 per square foot</strong>, depending on the membrane system, roof deck condition, and NYC building code access requirements:</p>
<ul>
  <li><strong>Modified Bitumen (Torch Down):</strong> $6.50 – $11.00 per sq. ft. (15–20 year lifespan)</li>
  <li><strong>EPDM Rubber Membrane:</strong> $8.00 – $13.50 per sq. ft. (20–25 year lifespan)</li>
  <li><strong>TPO / PVC Single-Ply:</strong> $9.50 – $15.00 per sq. ft. (20–30 year energy-efficient reflective surface)</li>
  <li><strong>Liquid Applied Membrane:</strong> $11.00 – $18.00 per sq. ft. (Seamless waterproofing ideal for complex parapets)</li>
</ul>

<h3>Key Cost Factors to Keep in Mind</h3>
<ol>
  <li><strong>Old Layer Tear-Off:</strong> NYC Building Code permits a maximum of 2 roofing layers. If your roof already has 2 layers, a full tear-off is legally mandated.</li>
  <li><strong>Parapet Walls and Flashing:</strong> Leaks frequently originate at the flashing or copings rather than the flat surface itself.</li>
  <li><strong>Access and Crane Permits:</strong> Tight NYC street logistics can add permit and disposal fees.</li>
</ol>

<blockquote><strong>Pro Tip:</strong> Always verify that your roofing contractor carries active NYC Department of Buildings (DOB) licensing and comprehensive general liability insurance with roof open endorsements.</blockquote>
      `,
      coverImageUrl: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80',
      coverImageAlt: 'NYC Flat Roof inspection on townhouse',
      authorName: 'David Miller',
      authorRole: 'Senior Building Inspector',
      category: 'Cost Guides',
      tags: ['Roofing', 'Cost Guide', 'NYC', 'Flat Roof'],
      readingTimeMin: 4,
      wordCount: 420,
      status: PostStatus.PUBLISHED,
      isFeatured: true,
      publishedAt: new Date(),
      metaTitle: 'NYC Flat Roof Replacement Cost Guide 2026 | FindYourExperts',
      metaDescription: 'Find out the real costs of flat roof replacement across NYC boroughs in 2026. Material comparisons, permit rules, and contractor tips.',
      focusKeyword: 'NYC flat roof replacement cost',
    },
    {
      title: '7 Warning Signs Your Roof Has Hidden Water Damage',
      slug: '7-warning-signs-roof-hidden-water-damage',
      excerpt:
        'Do not wait for water to drip from your ceiling. Learn how to identify subtle structural warning signs before costly rot and mold set in.',
      content: `
<h2>Early Detection Saves Thousands</h2>
<p>Roof leaks are deceptive. By the time water actively drips onto your living room floor, the moisture has often travelled along rafters and sheathing for weeks or even months, creating silent structural damage.</p>

<h3>1. Subtle Ceiling and Wall Discoloration</h3>
<p>Look out for faint ring-shaped brown or yellow stains. Even a dry spot indicates that water penetrated previously and will return during the next heavy storm.</p>

<h3>2. Granule Loss in Gutters</h3>
<p>If you inspect your gutter downspouts and see piles of coarse, sand-like granules, your asphalt shingles are nearing the end of their weatherproofing cycle.</p>

<h3>3. Spongy or Sagging Roof Decking</h3>
<p>When walking on the roof (or when your certified inspector steps across it), there should be zero bounce. Sponginess indicates rotted plywood sheathing.</p>

<h3>4. Peeling Paint Under Eaves & Soffits</h3>
<p>Moisture trapped inside the roof attic seeks an exit, causing exterior paint along the roofline and fascia to bubble and peel prematurely.</p>

<blockquote><strong>Take Action:</strong> If you notice two or more of these signs, get quotes from at least 3 licensed contractors to compare diagnoses and repair scope.</blockquote>
      `,
      coverImageUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb186156f?auto=format&fit=crop&w=1200&q=80',
      coverImageAlt: 'Roof damage inspection',
      authorName: 'Sarah Jenkins',
      authorRole: 'Home Maintenance Specialist',
      category: 'Roofing Tips',
      tags: ['Maintenance', 'Water Damage', 'Roof Inspection'],
      readingTimeMin: 3,
      wordCount: 310,
      status: PostStatus.PUBLISHED,
      isFeatured: false,
      publishedAt: new Date(Date.now() - 86400000 * 2),
      metaTitle: '7 Signs Your Roof Has Hidden Water Damage | FindYourExperts',
      metaDescription: 'Learn the 7 subtle signs of hidden roof leaks and water damage before severe mold and deck rot occur.',
      focusKeyword: 'roof water damage signs',
    },
    {
      title: 'How to Choose the Right Contractor: The 10-Question Checklist',
      slug: 'how-to-choose-the-right-contractor-checklist',
      excerpt:
        'Never hire a home exterior contractor without asking these 10 crucial questions regarding permits, insurance, warranties, and milestones.',
      content: `
<h2>Hiring with Confidence</h2>
<p>Finding a trustworthy contractor does not have to be stressful. Arming yourself with the right questions protects your home investment and ensures accountability.</p>

<h3>The Essential 10 Questions</h3>
<ol>
  <li><strong>Are you licensed and insured for my specific municipality?</strong> Request Certificate of Insurance (COI) naming you as certificate holder.</li>
  <li><strong>Will you pull the required municipal permits?</strong> Never pull homeowner permits for contractor work.</li>
  <li><strong>What warranty is provided on labor versus materials?</strong> Standard workmanship warranties range from 5 to 10 years.</li>
  <li><strong>Do you use in-house crews or subcontractors?</strong> Knowing who will be on your property is paramount.</li>
  <li><strong>What is your cleanup and debris removal procedure?</strong> Ensure magnetic nail sweeps and dumpster permits are included.</li>
  <li><strong>How do you handle unforeseen rot or structural changes?</strong> Transparent change-order policies prevent billing shocks.</li>
  <li><strong>Can you provide 3 recent local references?</strong> Check verifiable projects completed in the past 6 months.</li>
  <li><strong>What is the payment milestone schedule?</strong> Avoid contractors asking for more than 20-30% upfront.</li>
  <li><strong>How will our project communication be handled daily?</strong> Designate a single project manager contact.</li>
  <li><strong>What is the estimated start and completion timeline?</strong> Have contingency clauses for inclement weather.</li>
</ol>
      `,
      coverImageUrl: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1200&q=80',
      coverImageAlt: 'Contractor reviewing blueprints on site',
      authorName: 'Marcus Vance',
      authorRole: 'Consumer Advocate',
      category: 'Hiring Advice',
      tags: ['Contractor Tips', 'Hiring Checklist', 'Home Improvement'],
      readingTimeMin: 4,
      wordCount: 360,
      status: PostStatus.PUBLISHED,
      isFeatured: false,
      publishedAt: new Date(Date.now() - 86400000 * 5),
      metaTitle: 'How to Choose a Contractor: 10-Question Checklist | FindYourExperts',
      metaDescription: 'The ultimate 10-question checklist for vetting and hiring licensed exterior contractors safely.',
      focusKeyword: 'how to choose a contractor checklist',
    },
  ];

  for (const post of samples) {
    await prisma.blogPost.upsert({
      where: { slug: post.slug },
      update: post,
      create: post,
    });
    console.log(`✅ Seeded blog: ${post.title}`);
  }

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
