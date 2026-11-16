import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

function buildOptimizedDatabaseUrl(rawUrl?: string): string | undefined {
  if (!rawUrl) return undefined;
  try {
    const parsed = new URL(rawUrl);
    if (!parsed.searchParams.has('connection_limit')) {
      parsed.searchParams.set('connection_limit', '10');
    }
    if (!parsed.searchParams.has('pool_timeout')) {
      parsed.searchParams.set('pool_timeout', '20');
    }
    if (!parsed.searchParams.has('connect_timeout')) {
      parsed.searchParams.set('connect_timeout', '10');
    }
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private keepAliveTimer: NodeJS.Timeout | null = null;
  public isDbHealthy = false;

  constructor() {
    const optimizedUrl = buildOptimizedDatabaseUrl(process.env.DATABASE_URL);
    super(
      optimizedUrl
        ? {
            datasources: {
              db: { url: optimizedUrl },
            },
          }
        : undefined
    );
  }

  async onModuleInit() {
    try {
      await this.$connect();
      await this.$queryRaw`SELECT 1`;
      await this.ensureProjectTables();
      this.isDbHealthy = true;
      this.logger.log('Successfully connected to database via Prisma (pool warmed)');

      // Keep remote MariaDB connection warm to avoid 1.1s–2.4s cold TCP/TLS reconnect penalty after idle periods
      this.keepAliveTimer = setInterval(async () => {
        try {
          await this.$queryRaw`SELECT 1`;
          this.isDbHealthy = true;
        } catch {
          this.isDbHealthy = false;
        }
      }, 25_000);

      if (this.keepAliveTimer.unref) {
        this.keepAliveTimer.unref();
      }
    } catch {
      this.isDbHealthy = false;
      this.logger.warn(
        'Could not connect to database on startup. Please ensure DATABASE_URL is set in .env'
      );
    }
  }

  private async ensureProjectTables(): Promise<void> {
    try {
      const rows = await this.$queryRawUnsafe<Array<{ TABLE_COLLATION?: string }>>(
        `SELECT TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'provider_profiles' LIMIT 1`
      );
      const collation = rows?.[0]?.TABLE_COLLATION || 'utf8mb4_unicode_ci';
      const charset = collation.split('_')[0] || 'utf8mb4';

      await this.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`provider_projects\` (
          \`id\` VARCHAR(191) NOT NULL,
          \`providerProfileId\` VARCHAR(191) NOT NULL,
          \`title\` VARCHAR(191) NOT NULL,
          \`slug\` VARCHAR(191) NOT NULL,
          \`description\` TEXT NULL,
          \`location\` VARCHAR(191) NULL,
          \`projectYear\` INTEGER NULL,
          \`costRange\` VARCHAR(191) NULL,
          \`serviceCategory\` VARCHAR(191) NULL,
          \`sourceUrl\` VARCHAR(191) NULL,
          \`coverImageUrl\` VARCHAR(191) NULL,
          \`photoCount\` INTEGER NOT NULL DEFAULT 0,
          \`orderIndex\` INTEGER NOT NULL DEFAULT 0,
          \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          PRIMARY KEY (\`id\`),
          UNIQUE INDEX \`provider_projects_providerProfileId_slug_key\`(\`providerProfileId\`, \`slug\`),
          INDEX \`provider_projects_providerProfileId_orderIndex_idx\`(\`providerProfileId\`, \`orderIndex\`),
          CONSTRAINT \`provider_projects_providerProfileId_fkey\` FOREIGN KEY (\`providerProfileId\`) REFERENCES \`provider_profiles\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
        ) DEFAULT CHARACTER SET ${charset} COLLATE ${collation};
      `);

      await this.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`provider_project_photos\` (
          \`id\` VARCHAR(191) NOT NULL,
          \`projectId\` VARCHAR(191) NOT NULL,
          \`imageUrl\` VARCHAR(191) NOT NULL,
          \`caption\` TEXT NULL,
          \`width\` INTEGER NULL,
          \`height\` INTEGER NULL,
          \`orderIndex\` INTEGER NOT NULL DEFAULT 0,
          \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          PRIMARY KEY (\`id\`),
          INDEX \`provider_project_photos_projectId_orderIndex_idx\`(\`projectId\`, \`orderIndex\`),
          CONSTRAINT \`provider_project_photos_projectId_fkey\` FOREIGN KEY (\`projectId\`) REFERENCES \`provider_projects\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
        ) DEFAULT CHARACTER SET ${charset} COLLATE ${collation};
      `);

      const photoColRows = await this.$queryRawUnsafe<Array<{ COLUMN_NAME?: string }>>(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'scraped_reviews' AND COLUMN_NAME = 'photo_urls' LIMIT 1`
      );
      if (!photoColRows || photoColRows.length === 0) {
        await this.$executeRawUnsafe(
          `ALTER TABLE \`scraped_reviews\` ADD COLUMN \`photo_urls\` JSON NULL`
        );
        this.logger.log('Added photo_urls JSON column to scraped_reviews table');
      }
    } catch (err: any) {
      this.logger.warn(`ensureProjectTables warning: ${err.message}`);
    }
  }

  async onModuleDestroy() {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
    await this.$disconnect();
    this.logger.log('Prisma disconnected');
  }
}
