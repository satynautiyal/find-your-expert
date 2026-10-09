import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Res,
  BadRequestException,
  NotFoundException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import type { Response } from 'express';
import { randomUUID } from 'crypto';
import { StorageService } from './storage.service';

// NOTE: The global ValidationPipe uses `whitelist + forbidNonWhitelisted`,
// so every DTO property MUST carry a class-validator decorator or the request is rejected (400).
export class PresignedUploadDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsOptional()
  @IsString()
  contentType?: string;

  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(7 * 24 * 60 * 60)
  expiresIn?: number;
}

export class UploadFileDto {
  @IsOptional()
  @IsString()
  folder?: string;
}

/** Minimal shape of a multer in-memory file (avoids needing @types/multer) */
interface UploadedImageFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/svg+xml'];
const SAFE_FOLDER = /^[a-z0-9][a-z0-9-]{0,40}$/;
const SAFE_KEY = /^[a-z0-9][a-z0-9\-/._]*$/i;

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  /**
   * POST /api/storage/upload  (multipart/form-data: file, folder?)
   * Uploads an image to Cloudflare R2 through the API (no bucket CORS needed)
   * and returns a STABLE url (`/api/storage/file?key=...`) that never expires.
   */
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_IMAGE_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
          return cb(new BadRequestException(`Unsupported file type "${file.mimetype}". Upload JPG, PNG, WebP, GIF, AVIF or SVG.`), false);
        }
        cb(null, true);
      },
    })
  )
  async uploadFile(@UploadedFile() file: UploadedImageFile, @Body() body: UploadFileDto) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('No file received. Send the image as multipart field "file".');
    }

    const folder = (body?.folder || 'uploads').toLowerCase();
    if (!SAFE_FOLDER.test(folder)) {
      throw new BadRequestException('Invalid folder name');
    }

    const ext = (file.originalname.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const baseName =
      file.originalname
        .replace(/\.[^.]+$/, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'image';
    const now = new Date();
    const key = `${folder}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${randomUUID().slice(0, 8)}-${baseName}.${ext}`;

    await this.storageService.putObject(file.buffer, key, file.mimetype);

    const presignedUrl = await this.storageService.getPresignedUrl(key);

    return {
      success: true,
      data: {
        key,
        url: presignedUrl,
        stableUrl: `/api/storage/file?key=${encodeURIComponent(key)}`,
        size: file.size,
        contentType: file.mimetype,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /api/storage/file?key=blog-covers/2026/10/abc-photo.jpg
   * Stable image URL: redirects to fresh presigned S3/R2 URL.
   */
  @Get('file')
  async getFile(@Query('key') key: string, @Res() res: Response) {
    if (!key) {
      throw new BadRequestException('Query parameter "key" is required');
    }

    const cleanKey = key.trim().replace(/^\/+/, '');
    if (!cleanKey || cleanKey.includes('..')) {
      throw new BadRequestException('Invalid "key"');
    }

    if (!this.storageService.isConfigured()) {
      const localPath = this.storageService.getLocalFilePath(cleanKey);
      if (!localPath) throw new NotFoundException('File not found');
      return res.sendFile(localPath);
    }

    const signedUrl = await this.storageService.getPresignedUrl(cleanKey, StorageService.DEFAULT_PRESIGNED_EXPIRATION);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.redirect(302, signedUrl);
  }

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

    const cleanKey = key.trim().replace(/^\/+/, '');
    const parsedExpiresIn = expiresIn
      ? parseInt(expiresIn, 10)
      : StorageService.DEFAULT_PRESIGNED_EXPIRATION;

    const url = await this.storageService.getPresignedUrl(cleanKey, parsedExpiresIn);

    return {
      success: true,
      data: {
        key: cleanKey,
        url,
        expiresInSeconds: parsedExpiresIn,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /api/storage/presigned-upload
   * Returns a presigned PUT URL for client-side uploads directly to R2
   * (requires CORS to be configured on the R2 bucket for browser uploads).
   */
  @Post('presigned-upload')
  async getPresignedUploadUrl(@Body() body: PresignedUploadDto) {
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
