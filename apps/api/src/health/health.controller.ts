import { Controller, Get } from '@nestjs/common';
import { ApiResponse } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(): Promise<ApiResponse<{
    status: string;
    uptime: number;
    dbConnected: boolean;
  }>> {
    let dbConnected = false;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbConnected = true;
    } catch {
      dbConnected = false;
    }

    return {
      success: true,
      message: 'FindYourExperts API is running smoothly',
      data: {
        status: 'ok',
        uptime: process.uptime(),
        dbConnected,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
