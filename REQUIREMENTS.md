# FindYourExperts - Product Requirements Document (PRD) & Technical Specification

> **Target Concept**: Expertise.com functional model (Local Service Provider Directory & Lead Generation Engine)  
> **Initial Target**: **USA** → **New York (NYC)** → **Roofing Services**  
> **Future Horizon**: Multi-country, multi-city, multi-service expansion without architectural changes.  
> **Tech Stack**: Turborepo, Next.js 15 (Frontend), NestJS (Backend), Prisma ORM, Supabase PostgreSQL.

---

## 1. Executive Summary & Core Value Proposition

The platform connects homeowners/clients with vetted, top-rated local service providers.  
Unlike standard directories, the platform builds **instant credibility** through:
1. **Multi-Platform Review Aggregation**: Displaying verified ratings and review counts from Google, Yelp, and Facebook with direct deep-links.
2. **Curated Badges & Credentials**: License verification, insurance status, years in business, and editorial vetting badges.
3. **Frictionless Quote Engine**: Users can directly request a quote from specific providers or broadcast requests to top providers in NYC.

---

## 2. Scope Matrix: Initial Launch vs. Future Expansion

| Feature / Dimension | Initial Scope (Phase 1) | Future Scope (Phase 2+) |
|---|---|---|
| **Country** | USA | Canada, UK, Australia, etc. |
| **State / Province** | New York (NY) | California, Texas, Florida, etc. |
| **City / Metro** | New York City (Manhattan, Brooklyn, Queens, Bronx, Staten Island) | Los Angeles, Chicago, Houston, London, etc. |
| **Primary Category** | Roofing | Plumbing, HVAC, Electrical, Remodeling, Pest Control, etc. |
| **Sub-Services** | Roof Replacement, Shingle Repair, Flat Roof, Commercial Roofing, Emergency Leak Repair, Gutters | 50+ specialized service tags |
| **Reviews** | Google, Yelp, Facebook | BBB, HomeAdvisor, Angi |
| **Lead Engine** | Direct quote request to provider | Automatic multi-bid distribution, SMS/email alerts, provider dashboard |

---

## 3. Detailed Functional Requirements

### 3.1. Provider Directory & Ranking
- Display top roofing providers operating in New York City.
- Each provider profile must include:
  - **Business Identity**: Name, slug, logo URL, business address, service radius/boroughs, website link.
  - **Direct Contact**: Tracked phone number (`tel:` action) and direct quote trigger.
  - **Vetting & Credentials**: State License number, insurance status, years of operation, BBB rating.
  - **Service Capabilities**: Tags indicating specific roof types handled (Asphalt, Slate, Metal, Flat, etc.).
  - **Editorial Overview / Highlights**: Short summary of company expertise and guarantees.

### 3.2. Multi-Platform Reviews Aggregation (Google, Yelp, Facebook)
- Providers must store platform-specific review metrics:
  - **Google**: Rating (e.g., `4.8`), Review Count (e.g., `124`), Verification URL.
  - **Yelp**: Rating (e.g., `4.5`), Review Count (e.g., `86`), Verification URL.
  - **Facebook**: Rating (e.g., `4.9`), Review Count (e.g., `52`), Verification URL.
- **Composite Score Calculator**: Backend calculates an aggregate rating and total combined reviews across all platforms.
- **Proof Links**: Users can click any platform badge to verify the reviews directly on Google Maps, Yelp, or Facebook.

### 3.3. Lead Capture & Quote Request System
- Users can click **"Get a Free Quote"** or **"Contact Provider"** on any card.
- **Modal / Form Fields**:
  - Service Type needed (e.g., *Emergency Leak Repair, Roof Replacement, Inspection, Gutter Work*)
  - Property Type (*Residential* or *Commercial*)
  - Project Timeline (*Emergency / As soon as possible / Within 2 weeks / Just budgeting*)
  - Location: Zip Code / Borough in NYC
  - User Contact: Full Name, Email Address, Phone Number
  - Project Description / Notes
- **Processing**:
  - Saved to `QuoteRequest` in the database.
  - Generates a unique quote tracking reference.
  - Assigns status: `PENDING` → `ASSIGNED` → `CONTACTED` → `CLOSED`.

### 3.4. Filtering & Sorting Engine
- **Filter by Borough/Area**: All NYC, Manhattan, Brooklyn, Queens, Bronx, Staten Island.
- **Filter by Sub-Service**: Flat Roofing, Shingle Replacement, Leak Detection, Commercial, etc.
- **Sort by**:
  - *Recommended / Top Rated* (Composite score weighted by review volume)
  - *Most Reviews* (Total reviews across all platforms)
  - *Highest Rating*

---

## 4. Prisma Database Schema Blueprint

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// -------------------------------------------------------------
// GEOGRAPHIC HIERARCHY (Scalable to any country & city)
// -------------------------------------------------------------

model Country {
  id        String   @id @default(uuid())
  name      String   @unique // e.g., "United States"
  code      String   @unique // e.g., "USA"
  slug      String   @unique // e.g., "usa"
  states    State[]
  createdAt DateTime @default(now())

  @@map("countries")
}

model State {
  id        String   @id @default(uuid())
  countryId String
  country   Country  @relation(fields: [countryId], references: [id], onDelete: Cascade)
  name      String   // e.g., "New York"
  code      String   // e.g., "NY"
  slug      String   // e.g., "new-york"
  cities    City[]
  createdAt DateTime @default(now())

  @@unique([countryId, slug])
  @@map("states")
}

model City {
  id        String     @id @default(uuid())
  stateId   String
  state     State      @relation(fields: [stateId], references: [id], onDelete: Cascade)
  name      String     // e.g., "New York City"
  slug      String     // e.g., "new-york"
  zipCodes  String[]   // e.g., ["10001", "10002", ...]
  boroughs  String[]   // e.g., ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"]
  providers Provider[]
  createdAt DateTime   @default(now())

  @@unique([stateId, slug])
  @@map("cities")
}

// -------------------------------------------------------------
// SERVICE & CATEGORY HIERARCHY (Scalable to any trade)
// -------------------------------------------------------------

model ServiceCategory {
  id          String       @id @default(uuid())
  name        String       @unique // e.g., "Roofing"
  slug        String       @unique // e.g., "roofing"
  description String?
  icon        String?
  subServices SubService[]
  providers   Provider[]
  createdAt   DateTime     @default(now())

  @@map("service_categories")
}

model SubService {
  id          String          @id @default(uuid())
  categoryId  String
  category    ServiceCategory @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  name        String          // e.g., "Flat Roof Repair", "Shingle Replacement"
  slug        String          // e.g., "flat-roof-repair"
  createdAt   DateTime        @default(now())

  @@unique([categoryId, slug])
  @@map("sub_services")
}

// -------------------------------------------------------------
// PROVIDERS & PLATFORM REVIEWS
// -------------------------------------------------------------

enum ReviewPlatform {
  GOOGLE
  YELP
  FACEBOOK
  HOMEADVISOR
}

model Provider {
  id              String          @id @default(uuid())
  cityId          String
  city            City            @relation(fields: [cityId], references: [id])
  categoryId      String
  category        ServiceCategory @relation(fields: [categoryId], references: [id])
  
  businessName    String
  slug            String          @unique
  logoUrl         String?
  phone           String
  address         String
  borough         String?         // e.g., "Queens"
  zipCode         String?
  websiteUrl      String?
  
  licenseNumber   String?
  yearsInBusiness Int             @default(1)
  isInsured       Boolean         @default(true)
  isFeatured      Boolean         @default(false)
  isVerified      Boolean         @default(true)
  
  description     String          @db.Text
  servicesOffered String[]        // Array of sub-services
  serviceAreas    String[]        // NYC boroughs/neighborhoods covered
  
  compositeRating Float           @default(5.0)
  totalReviews    Int             @default(0)
  
  platformReviews PlatformReview[]
  quoteRequests   QuoteRequest[]
  
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  @@index([cityId, categoryId])
  @@map("providers")
}

model PlatformReview {
  id          String         @id @default(uuid())
  providerId  String
  provider    Provider       @relation(fields: [providerId], references: [id], onDelete: Cascade)
  platform    ReviewPlatform
  rating      Float          // e.g., 4.8
  reviewCount Int            // e.g., 142
  profileUrl  String         // Direct URL to view on Google/Yelp/FB
  updatedAt   DateTime       @updatedAt

  @@unique([providerId, platform])
  @@map("platform_reviews")
}

// -------------------------------------------------------------
// LEAD GENERATION & QUOTE ENGINE
// -------------------------------------------------------------

enum QuoteStatus {
  PENDING
  ASSIGNED
  CONTACTED
  COMPLETED
  CANCELLED
}

enum ProjectUrgency {
  EMERGENCY_24H
  WITHIN_A_WEEK
  FLEXIBLE
  PLANNING
}

model QuoteRequest {
  id            String         @id @default(uuid())
  providerId    String?        // Nullable if broadcast to top providers
  provider      Provider?      @relation(fields: [providerId], references: [id], onDelete: SetNull)
  
  customerName  String
  customerEmail String
  customerPhone String
  zipCode       String
  borough       String?
  
  serviceType   String         // e.g., "Roof Leak Repair"
  propertyType  String         @default("Residential") // Residential or Commercial
  urgency       ProjectUrgency @default(WITHIN_A_WEEK)
  projectNotes  String?        @db.Text
  
  status        QuoteStatus    @default(PENDING)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  @@map("quote_requests")
}
```

---

## 5. Backend REST API Specifications (`apps/api` - NestJS)

### Base URL: `http://localhost:4000/api`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/services` | List all service categories (e.g. Roofing) with sub-services |
| `GET` | `/api/locations/cities` | List supported cities (e.g. New York) with boroughs |
| `GET` | `/api/providers` | Query providers with filters: `?city=new-york&category=roofing&borough=Queens&subService=flat-roof&sort=rating` |
| `GET` | `/api/providers/:slug` | Get complete provider detail with all platform reviews & badges |
| `POST` | `/api/quotes` | Submit a new quote request / lead (Body validated with `class-validator`) |
| `GET` | `/api/quotes` | List leads (internal/admin monitoring) |
| `GET` | `/api/health` | System and database health status |

---

## 6. Frontend Dynamic Routing & UI Architecture (`apps/web` - Next.js)

### Dynamic Routing Schema:
```
/                                             -> Home / City & Service Directory
/services/[serviceSlug]/[countrySlug]/[citySlug] -> e.g. /services/roofing/usa/new-york
/providers/[providerSlug]                     -> Provider Profile Page
```

### Main Listing Page Layout (`/services/roofing/usa/new-york`):
1. **Header & Location Selector**: Breadcrumbs `Home > Roofing > New York > NYC`.
2. **Category Hero**:
   - Title: `15 Best Roofing Contractors in New York, NY`
   - Subtitle: Curated and verified based on Reputation, Reviews, and Licensing.
3. **Filter Bar**:
   - Filter by Borough (All, Manhattan, Brooklyn, Queens, Bronx, Staten Island).
   - Filter by Service Type (Emergency Repair, Flat Roof, Shingles, Inspection).
   - Sort dropdown (Top Rated, Most Reviews).
4. **Provider Cards**:
   - Provider Name, Logo, Badge (`Top Pick 2026`).
   - License #, Insured Checkmark, Years in business.
   - Review Sources Widget:
     - Google: ⭐ 4.8 (124) [Link]
     - Yelp: ⭐ 4.5 (86) [Link]
     - Facebook: ⭐ 4.9 (52) [Link]
   - Action Buttons:
     - 📞 **Call Provider** (`tel:866...`)
     - ✉️ **Get a Free Quote** (Opens Lead Modal)
     - 🌐 **Visit Website**
5. **Interactive Quote Modal**:
   - Step 1: Select issue (Leak, New Roof, Replacement)
   - Step 2: Location (NYC Zipcode)
   - Step 3: Contact info (Name, Phone, Email)
   - Real-time submit to `POST /api/quotes` with confirmation state.

---

## 7. Implementation Roadmap & Session Continuity

When resuming in any session, work proceeds according to this milestone checklist:

- [ ] **Milestone 1**: Update `packages/db/prisma/schema.prisma` with the complete model specification above.
- [ ] **Milestone 2**: Run `pnpm db:push` to apply schema to Supabase PostgreSQL.
- [ ] **Milestone 3**: Create `packages/db/prisma/seed.ts` with genuine NYC Roofing companies (names, addresses, real Google/Yelp/FB review stats).
- [ ] **Milestone 4**: Build NestJS backend modules in `apps/api`:
  - `ProvidersModule` (Service + Controller)
  - `QuotesModule` (Service + Controller + DTOs)
- [ ] **Milestone 5**: Build Next.js frontend pages in `apps/web`:
  - Dynamic listing page: `/services/[serviceSlug]/[countrySlug]/[citySlug]`
  - Provider Card Component with Multi-Platform Review badges
  - Quote Request Modal with API integration.
- [ ] **Milestone 6**: End-to-end testing of Quote submission and dynamic filter updates.
