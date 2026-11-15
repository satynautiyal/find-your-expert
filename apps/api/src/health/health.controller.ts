import { Controller, Get, Query } from '@nestjs/common';
import { ApiResponse } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(
    @Query('deep') deep?: string
  ): Promise<
    ApiResponse<{
      status: string;
      uptime: number;
      dbConnected: boolean;
    }>
  > {
    let dbConnected = this.prisma.isDbHealthy;

    if (deep === 'true' || !dbConnected) {
      try {
        await this.prisma.$queryRaw`SELECT 1`;
        this.prisma.isDbHealthy = true;
        dbConnected = true;
      } catch {
        this.prisma.isDbHealthy = false;
        dbConnected = false;
      }
    }

    return {
      success: true,
      message: 'Prosvetted API is running smoothly',
      data: {
        status: 'ok',
        uptime: process.uptime(),
        dbConnected,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
