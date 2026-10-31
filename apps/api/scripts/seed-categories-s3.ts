import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const scriptDir =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(scriptDir, '../.env') });
dotenv.config({ path: path.resolve(scriptDir, '../../../.env') });
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const prisma = new PrismaClient();

const r2AccountId = process.env.R2_ACCOUNT_ID || '';
const r2AccessKey = process.env.R2_ACCESS_KEY_ID || '';
const r2SecretKey = process.env.R2_SECRET_ACCESS_KEY || '';
const r2BucketName = process.env.R2_BUCKET_NAME || 'findyourexperts-media';

const isR2Ready = Boolean(
  r2AccountId &&
    r2AccessKey &&
    r2SecretKey &&
    !r2AccountId.includes('your_') &&
    !r2AccessKey.includes('your_')
);

const r2Client = isR2Ready
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: r2AccessKey,
        secretAccessKey: r2SecretKey,
      },
    })
  : null;

interface SeedCategoryDef {
  name: string;
  slug: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  localFile?: string;
  remoteUrl: string;
  subServices: Array<{ name: string; slug: string; description: string }>;
}

const CATEGORIES_TO_SEED: SeedCategoryDef[] = [
  {
    name: 'Custom Cabinets',
    slug: 'custom-cabinets',
    description:
      'Bespoke kitchen cabinetry, architectural millwork, built-ins, and custom storage crafted for NYC residences.',
    metaTitle: 'Best Custom Cabinet Makers in NYC | FindYourExperts',
    metaDescription:
      'Compare vetted custom cabinet makers and architectural millwork specialists across Manhattan, Brooklyn, Queens, Bronx, and Staten Island.',
    localFile: path.resolve(scriptDir, '../../web/public/categories/custom-cabinets.jpg'),
    remoteUrl:
      'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80',
    subServices: [
      {
        name: 'Custom Kitchen Cabinets',
        slug: 'custom-kitchen-cabinets',
        description: 'Bespoke inset, frameless, and shaker kitchen cabinetry built to exact dimensions.',
      },
      {
        name: 'Bathroom Vanities',
        slug: 'bathroom-vanities',
        description: 'Custom floating and freestanding bathroom vanities with moisture-resistant finishes.',
      },
      {
        name: 'Custom Closets & Wardrobes',
        slug: 'custom-closets-wardrobes',
        description: 'Walk-in closets, reach-in wardrobes, and tailored dressing room cabinetry.',
      },
      {
        name: 'Architectural Millwork',
        slug: 'architectural-millwork',
        description: 'Custom paneling, coffered ceilings, library millwork, and trim carpentry.',
      },
      {
        name: 'Cabinet Refacing & Refinishing',
        slug: 'cabinet-refacing-refinishing',
        description: 'Factory-grade spray finishing, new custom doors, and soft-close hardware upgrades.',
      },
    ],
  },
  {
    name: 'Roofing',
    slug: 'roofing',
    description:
      'Licensed residential and commercial roof replacement, leak repair, flat roof waterproofing, and inspections.',
    metaTitle: 'Best Roofing Contractors in NYC | FindYourExperts',
    metaDescription:
      'Compare licensed, insured NYC roofing contractors for flat roofs, brownstones, shingle replacement, and emergency leak repair.',
    localFile: path.resolve(scriptDir, '../../web/public/roofing-hero-house.jpg'),
    remoteUrl:
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
    subServices: [
      {
        name: 'Roof Installation',
        slug: 'roof-installation',
        description: 'Complete tear-off and new roof installation for residential and commercial buildings.',
      },
      {
        name: 'Repair',
        slug: 'roof-repair',
        description: 'Active leak diagnostics, flashing repair, and storm damage restoration.',
      },
      {
        name: 'Inspection',
        slug: 'roof-inspection',
        description: 'Comprehensive structural, thermal, and waterproofing roof inspections.',
      },
      {
        name: 'Waterproofing',
        slug: 'waterproofing',
        description: 'Liquid membrane, parapet wall, and deck waterproofing systems.',
      },
      {
        name: 'Flat Roof Systems',
        slug: 'flat-roof-systems',
        description: 'EPDM, TPO, modified bitumen, and Kemper flat roofing for NYC buildings.',
      },
      {
        name: 'Gutter Installation',
        slug: 'gutter-installation',
        description: 'Seamless copper and aluminum gutters, downspouts, and leaf guards.',
      },
    ],
  },
  {
    name: 'Kitchen Remodeling',
    slug: 'kitchen-remodeling',
    description:
      'Full-service kitchen renovations, layout reconfiguration, cabinetry, countertops, and appliance integration.',
    metaTitle: 'Top Kitchen Remodeling Contractors in NYC | FindYourExperts',
    metaDescription:
      'Hire vetted NYC kitchen remodeling general contractors for co-op, condo, and brownstone kitchen renovations.',
    localFile: path.resolve(scriptDir, '../../web/public/hero-kitchen.jpg'),
    remoteUrl:
      'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80',
    subServices: [
      {
        name: 'Full Kitchen Gut Renovation',
        slug: 'full-kitchen-gut-renovation',
        description: 'End-to-end kitchen demolition, plumbing, electrical, cabinetry, and finishes.',
      },
      {
        name: 'Kitchen Layout & Island Design',
        slug: 'kitchen-layout-island-design',
        description: 'Structural wall removal, custom kitchen islands, and space optimization.',
      },
      {
        name: 'Co-op & Condo Kitchen Remodel',
        slug: 'coop-condo-kitchen-remodel',
        description: 'Board-package-ready kitchen renovations meeting strict NYC building rules.',
      },
      {
        name: 'Backsplash & Tile Installation',
        slug: 'backsplash-tile-installation',
        description: 'Slab stone, handmade zellige, porcelain, and mosaic kitchen backsplashes.',
      },
    ],
  },
  {
    name: 'Bathroom Remodeling',
    slug: 'bathroom-remodeling',
    description:
      'Luxury bathroom renovations, walk-in showers, wet rooms, custom tilework, and plumbing fixtures.',
    metaTitle: 'Best Bathroom Remodeling Contractors in NYC | FindYourExperts',
    metaDescription:
      'Find licensed NYC bathroom remodeling contractors for master baths, powder rooms, waterproofing, and custom tile.',
    remoteUrl:
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
    subServices: [
      {
        name: 'Full Bathroom Renovation',
        slug: 'full-bathroom-renovation',
        description: 'Complete bathroom remodel including waterproofing, tile, fixtures, and lighting.',
      },
      {
        name: 'Tub-to-Shower Conversion',
        slug: 'tub-to-shower-conversion',
        description: 'Frameless glass walk-in showers, curbless entry, and linear drain installation.',
      },
      {
        name: 'Powder Room Remodel',
        slug: 'powder-room-remodel',
        description: 'High-impact half-bath upgrades with statement vanities, wallpaper, and stone.',
      },
      {
        name: 'Bathroom Tile & Waterproofing',
        slug: 'bathroom-tile-waterproofing',
        description: 'Schluter Kerdi waterproofing, radiant heated floors, and large-format porcelain tile.',
      },
    ],
  },
  {
    name: 'Countertops',
    slug: 'countertops',
    description:
      'Precision-templated quartz, quartzite, marble, granite, and porcelain slab fabrication and installation.',
    metaTitle: 'Best Countertop Fabricators & Installers in NYC | FindYourExperts',
    metaDescription:
      'Compare NYC stone fabricators and countertop installers for quartz, marble, granite, and waterfall islands.',
    remoteUrl:
      'https://images.unsplash.com/photo-1556909212-d5b604d0c90d?auto=format&fit=crop&w=800&q=80',
    subServices: [
      {
        name: 'Quartz Countertops',
        slug: 'quartz-countertops',
        description: 'Caesarstone, Cambria, and Silestone quartz fabrication and laser templating.',
      },
      {
        name: 'Marble & Natural Stone Slabs',
        slug: 'marble-natural-stone-slabs',
        description: 'Calacatta marble, quartzite, soapstone, and granite countertops and full-height splashes.',
      },
      {
        name: 'Waterfall Island Fabrication',
        slug: 'waterfall-island-fabrication',
        description: 'Bookmatched mitered-edge waterfall islands and custom edge profiles.',
      },
      {
        name: 'Countertop Repair & Sealing',
        slug: 'countertop-repair-sealing',
        description: 'Chip repair, seam leveling, honing, polishing, and natural stone sealing.',
      },
    ],
  },
  {
    name: 'Built-In Shelving',
    slug: 'built-in-shelving',
    description:
      'Custom floor-to-ceiling bookcases, media walls, alcove shelving, mudroom lockers, and window benches.',
    metaTitle: 'Best Built-In Shelving & Bookcase Carpenters in NYC | FindYourExperts',
    metaDescription:
      'Find custom built-in shelving, bookcase, and media wall carpenters in New York City.',
    remoteUrl:
      'https://images.unsplash.com/photo-1594026112284-02bb6f3352fe?auto=format&fit=crop&w=800&q=80',
    subServices: [
      {
        name: 'Custom Bookcases & Home Libraries',
        slug: 'custom-bookcases-libraries',
        description: 'Floor-to-ceiling built-in bookshelves with integrated lighting and rolling ladders.',
      },
      {
        name: 'Built-In Media & Fireplace Walls',
        slug: 'built-in-media-fireplace-walls',
        description: 'Concealed wire management, floating credenzas, and fireplace surround built-ins.',
      },
      {
        name: 'Window Seats & Radiator Covers',
        slug: 'window-seats-radiator-covers',
        description: 'Custom NYC radiator enclosures and storage window benches.',
      },
      {
        name: 'Home Office Built-Ins',
        slug: 'home-office-built-ins',
        description: 'Integrated desks, file drawers, and overhead display cabinetry.',
      },
    ],
  },
  {
    name: 'HVAC',
    slug: 'hvac',
    description:
      'Ductless mini-split installation, central air conditioning, boiler repair, and heating systems for NYC homes.',
    metaTitle: 'Best HVAC Contractors in NYC | Heating & Cooling | FindYourExperts',
    metaDescription:
      'Compare licensed NYC HVAC contractors for Mitsubishi mini-splits, central AC, boilers, and PTAC units.',
    remoteUrl:
      'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80',
    subServices: [
      {
        name: 'Ductless Mini-Split Installation',
        slug: 'ductless-mini-split-installation',
        description: 'Multi-zone heat pump and ductless AC installation for brownstones and apartments.',
      },
      {
        name: 'Central Air Conditioning',
        slug: 'central-air-conditioning',
        description: 'High-velocity and concealed ducted central AC design and installation.',
      },
      {
        name: 'Boiler & Heating Repair',
        slug: 'boiler-heating-repair',
        description: 'Steam and hydronic boiler service, radiator balancing, and heat pump conversion.',
      },
      {
        name: 'HVAC Maintenance & Tune-Up',
        slug: 'hvac-maintenance-tune-up',
        description: 'Seasonal filter replacement, coil cleaning, and refrigerant diagnostics.',
      },
    ],
  },
  {
    name: 'Flooring',
    slug: 'flooring',
    description:
      'Hardwood floor installation, herringbone parquet, dustless sanding and refinishing, and luxury tile flooring.',
    metaTitle: 'Best Flooring Contractors in NYC | Hardwood & Refinishing | FindYourExperts',
    metaDescription:
      'Find top-rated NYC flooring contractors for wide-plank white oak, herringbone parquet, and dustless floor refinishing.',
    remoteUrl:
      'https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?auto=format&fit=crop&w=800&q=80',
    subServices: [
      {
        name: 'Hardwood Floor Installation',
        slug: 'hardwood-floor-installation',
        description: 'Solid and engineered white oak, walnut, and herringbone parquet installation.',
      },
      {
        name: 'Dustless Floor Sanding & Refinishing',
        slug: 'dustless-floor-sanding-refinishing',
        description: 'Custom staining, Bona water-based matte finishes, and historic floor restoration.',
      },
      {
        name: 'Porcelain & Stone Tile Flooring',
        slug: 'porcelain-stone-tile-flooring',
        description: 'Large-format porcelain, marble mosaic, and acoustic underlayment installation.',
      },
      {
        name: 'Subfloor Leveling & Soundproofing',
        slug: 'subfloor-leveling-soundproofing',
        description: 'Self-leveling concrete, cork acoustic mats, and NYC co-op sound attenuation.',
      },
    ],
  },
  {
    name: 'Windows & Doors',
    slug: 'windows-doors',
    description:
      'Energy-efficient window replacement, landmark-approved brownstone windows, custom entry doors, and patio sliders.',
    metaTitle: 'Best Window & Door Replacement Contractors in NYC | FindYourExperts',
    metaDescription:
      'Compare licensed NYC window and door installers for soundproof windows, LPC landmark windows, and custom entryways.',
    remoteUrl:
      'https://images.unsplash.com/photo-1509644851169-2acc08aa25b5?auto=format&fit=crop&w=800&q=80',
    subServices: [
      {
        name: 'Window Replacement',
        slug: 'window-replacement',
        description: 'Double-hung, casement, and tilt-turn energy-efficient window replacement.',
      },
      {
        name: 'Soundproof & Acoustic Windows',
        slug: 'soundproof-acoustic-windows',
        description: 'STC-rated acoustic windows to block NYC street and avenue noise.',
      },
      {
        name: 'Landmark & Brownstone Windows',
        slug: 'landmark-brownstone-windows',
        description: 'LPC-compliant wood and aluminum-clad historic window restoration and replacement.',
      },
      {
        name: 'Exterior & Interior Door Installation',
        slug: 'exterior-interior-door-installation',
        description: 'Solid core interior doors, fire-rated apartment entry doors, and garden terrace doors.',
      },
    ],
  },
  {
    name: 'Painting',
    slug: 'painting',
    description:
      'Fine interior painting, Level-5 skim coating, decorative plaster, wallpaper installation, and exterior facade painting.',
    metaTitle: 'Best Painting Contractors in NYC | Skim Coating & Interior | FindYourExperts',
    metaDescription:
      'Hire top-rated NYC painters for Level-5 skim coating, Benjamin Moore & Farrow & Ball fine finishes, and wallpaper hanging.',
    remoteUrl:
      'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=800&q=80',
    subServices: [
      {
        name: 'Interior Apartment & Townhouse Painting',
        slug: 'interior-apartment-townhouse-painting',
        description: 'Precision prep, trim spraying, and low-VOC luxury paint application.',
      },
      {
        name: 'Level-5 Plaster & Skim Coating',
        slug: 'level-5-plaster-skim-coating',
        description: 'Full-wall skim coating to transform uneven plaster walls into glass-smooth surfaces.',
      },
      {
        name: 'Wallpaper Installation & Removal',
        slug: 'wallpaper-installation-removal',
        description: 'Grasscloth, silk, hand-painted murals, and delicate wallcovering installation.',
      },
      {
        name: 'Exterior & Brownstone Facade Painting',
        slug: 'exterior-brownstone-facade-painting',
        description: 'Cornice, ironwork, stoop, and masonry elastomeric exterior painting.',
      },
    ],
  },
];

async function getImageBuffer(cat: SeedCategoryDef): Promise<{ buffer: Buffer; contentType: string }> {
  if (cat.localFile && fs.existsSync(cat.localFile)) {
    const buffer = fs.readFileSync(cat.localFile);
    return { buffer, contentType: 'image/jpeg' };
  }

  const res = await fetch(cat.remoteUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch image for ${cat.slug} from ${cat.remoteUrl}: HTTP ${res.status}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType = res.headers.get('content-type') || 'image/jpeg';
  return { buffer, contentType };
}

async function uploadCategoryImage(cat: SeedCategoryDef): Promise<string> {
  const key = `categories/${cat.slug}.jpg`;
  const { buffer, contentType } = await getImageBuffer(cat);

  if (isR2Ready && r2Client) {
    await r2Client.send(
      new PutObjectCommand({
        Bucket: r2BucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );
    console.log(`   ☁️ Uploaded to R2: ${key} (${buffer.length} bytes)`);
  } else {
    const localPath = path.resolve(scriptDir, '../public/uploads', key);
    fs.mkdirSync(path.dirname(localPath), { recursive: true });
    fs.writeFileSync(localPath, buffer);
    console.log(`   💾 Saved locally (R2 not active): ${key}`);
  }

  return key;
}

async function main() {
  console.log('===========================================================');
  console.log('🌱 Seeding 10 Categories + SubServices into DB & Cloudflare R2');
  console.log('===========================================================');

  for (const cat of CATEGORIES_TO_SEED) {
    console.log(`\n📦 Processing category: ${cat.name} (${cat.slug})`);
    const s3Key = await uploadCategoryImage(cat);

    // Check if category exists by slug or name
    const existing = await prisma.serviceCategory.findFirst({
      where: {
        OR: [{ slug: cat.slug }, { name: cat.name }],
      },
    });

    let categoryRecord;
    if (existing) {
      categoryRecord = await prisma.serviceCategory.update({
        where: { id: existing.id },
        data: {
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          icon: s3Key,
          metaTitle: cat.metaTitle,
          metaDescription: cat.metaDescription,
        },
      });
      console.log(`   ✅ Updated ServiceCategory: ${categoryRecord.name} (icon: ${s3Key})`);
    } else {
      categoryRecord = await prisma.serviceCategory.create({
        data: {
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          icon: s3Key,
          metaTitle: cat.metaTitle,
          metaDescription: cat.metaDescription,
        },
      });
      console.log(`   ✅ Created ServiceCategory: ${categoryRecord.name} (icon: ${s3Key})`);
    }

    for (const sub of cat.subServices) {
      await prisma.subService.upsert({
        where: {
          categoryId_slug: {
            categoryId: categoryRecord.id,
            slug: sub.slug,
          },
        },
        update: {
          name: sub.name,
          description: sub.description,
          isPopular: true,
        },
        create: {
          categoryId: categoryRecord.id,
          name: sub.name,
          slug: sub.slug,
          description: sub.description,
          isPopular: true,
        },
      });
    }
    console.log(`   🛠️ Upserted ${cat.subServices.length} SubServices for ${cat.name}`);
  }

  const totalCategories = await prisma.serviceCategory.count();
  const totalSubServices = await prisma.subService.count();
  console.log('\n===========================================================');
  console.log(`🎉 Done! Total DB Categories: ${totalCategories}, Total SubServices: ${totalSubServices}`);
  console.log('===========================================================');
}

main()
  .catch((err) => {
    console.error('❌ Error seeding categories:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

