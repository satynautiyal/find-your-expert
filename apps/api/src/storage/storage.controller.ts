import { Controller, Get, Post, Query, Body, BadRequestException } from '@nestjs/common';
import { StorageService } from './storage.service';

export class PresignedUploadDto {
  key: string;
  contentType?: string;
  expiresIn?: number;
}

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  /**
   * GET /api/storage/presigned-url?key=logos/my-logo.jpg&expiresIn=43200
   * Returns a temporary secure presigned URL (default 12 hours)
   */
  @Get('presigned-url')
  async getPresignedUrl(
    @Query('key') key: string,
    @Query('expiresIn') expiresIn?: string
  ) {
    if (!key) {
      throw new BadRequestException('Query parameter "key" is required');
    }

    const parsedExpiresIn = expiresIn
      ? parseInt(expiresIn, 10)
      : StorageService.DEFAULT_PRESIGNED_EXPIRATION;

    const url = await this.storageService.getPresignedUrl(key, parsedExpiresIn);

    return {
      success: true,
      data: {
        key,
        url,
        expiresInSeconds: parsedExpiresIn,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /api/storage/presigned-upload
   * Returns a presigned PUT URL for client-side uploads directly to R2
   */
  @Post('presigned-upload')
  async getPresignedUploadUrl(@Body() body: PresignedUploadDto) {
    if (!body?.key) {
      throw new BadRequestException('Property "key" is required in request body');
    }

    const result = await this.storageService.getPresignedUploadUrl(
      body.key,
      body.contentType || 'image/jpeg',
      body.expiresIn || 3600
    );

    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }
}
