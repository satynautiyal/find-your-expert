import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { StorageModule } from './storage';
import { ProvidersModule } from './providers';
import { ScrapersModule } from './scrapers/scrapers.module';
import { BlogsModule } from './blogs';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    PrismaModule,
    HealthModule,
    StorageModule,
    ProvidersModule,
    ScrapersModule,
    BlogsModule,
  ],
})
export class AppModule {}
