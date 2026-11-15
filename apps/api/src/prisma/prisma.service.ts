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

  async onModuleDestroy() {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
    await this.$disconnect();
    this.logger.log('Prisma disconnected');
  }
}
