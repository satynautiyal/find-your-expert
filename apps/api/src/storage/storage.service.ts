import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as fs from 'fs';
import * as path from 'path';

export interface PresignedUploadResult {
  uploadUrl: string;
  key: string;
  expiresIn: number;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private s3Client: S3Client | null = null;
  private readonly bucketName: string;
  private readonly isReady: boolean;

  /**
   * Default expiration duration for presigned URLs: 12 hours (43,200 seconds)
   */
  public static readonly DEFAULT_PRESIGNED_EXPIRATION = 12 * 60 * 60; // 43,200 seconds

  constructor(private readonly config: ConfigService) {
    const accountId =
      this.config.get<string>('R2_ACCOUNT_ID') || process.env.R2_ACCOUNT_ID || '';
    const accessKeyId =
      this.config.get<string>('R2_ACCESS_KEY_ID') || process.env.R2_ACCESS_KEY_ID || '';
    const secretAccessKey =
      this.config.get<string>('R2_SECRET_ACCESS_KEY') ||
      process.env.R2_SECRET_ACCESS_KEY ||
      '';
    this.bucketName =
      this.config.get<string>('R2_BUCKET_NAME') ||
      process.env.R2_BUCKET_NAME ||
      'findyourexperts-media';

    // Check if real credentials are provided
    if (
      accountId &&
      accessKeyId &&
      secretAccessKey &&
      !accountId.includes('your_') &&
      !accessKeyId.includes('your_')
    ) {
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      this.isReady = true;
      this.logger.log(`✅ Cloudflare R2 client connected (Bucket: ${this.bucketName})`);
    } else {
      this.isReady = false;
      this.logger.warn(
        '⚠️ Cloudflare R2 credentials not fully configured in .env. Falling back to local storage.'
      );
    }
  }

  /**
   * Check if Cloudflare R2 is configured and active
   */
  public isConfigured(): boolean {
    return this.isReady;
  }

  /**
   * Get the active bucket name
   */
  public getBucketName(): string {
    return this.bucketName;
  }

  /**
   * Helper: Extracts clean S3 object key from raw key, query URL, or presigned URL.
   * Returns external permanent URLs (e.g. Unsplash) untouched.
   */
  public extractCleanKey(keyOrUrl: string): string {
    if (!keyOrUrl) return '';
    const trimmed = keyOrUrl.trim();
    if (!trimmed) return '';

    // If external permanent URL (Unsplash, Cloudinary, etc.), keep as-is
    if (
      (trimmed.startsWith('http://') || trimmed.startsWith('https://')) &&
      !trimmed.includes('.r2.cloudflarestorage.com') &&
      !trimmed.includes('.amazonaws.com') &&
      !trimmed.includes('/api/storage/')
    ) {
      return trimmed;
    }

    // If it contains a `key=` parameter (e.g. /api/storage/file?key=... or full URL with key query)
    if (trimmed.includes('key=')) {
      const match = trimmed.match(/key=([^&]+)/);
      if (match && match[1]) {
        return decodeURIComponent(match[1]).replace(/^\/+/, '');
      }
    }

    // If it's a full S3/R2 URL, extract pathname
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      try {
        const parsed = new URL(trimmed);
        let pathname = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
        if (pathname.startsWith(`${this.bucketName}/`)) {
          pathname = pathname.substring(this.bucketName.length + 1);
        }
        return pathname;
      } catch {
        // Fallback
      }
    }

    return trimmed.replace(/^\/+/, '');
  }

  /**
   * Generates a presigned read (GET) URL for a stored object key.
   * Default validity is 12 hours (43,200 seconds).
   *
   * If the input is an external HTTP URL (e.g. Unsplash), it is returned as-is.
   * Otherwise, generates a fresh presigned GET URL for the object key.
   */
  async getPresignedUrl(
    keyOrUrl: string,
    expiresInSeconds: number = StorageService.DEFAULT_PRESIGNED_EXPIRATION
  ): Promise<string> {
    if (!keyOrUrl) return '';

    const cleanKey = this.extractCleanKey(keyOrUrl);
    if (!cleanKey) return '';

    // If external permanent URL (Unsplash), return directly as-is
    if (cleanKey.startsWith('http://') || cleanKey.startsWith('https://')) {
      return cleanKey;
    }

    if (this.isReady && this.s3Client) {
      try {
        const command = new GetObjectCommand({
          Bucket: this.bucketName,
          Key: cleanKey,
        });

        return await getSignedUrl(this.s3Client, command, {
          expiresIn: expiresInSeconds,
        });
      } catch (err: any) {
        this.logger.error(
          `Failed to generate presigned GET URL for key "${cleanKey}": ${err.message}`
        );
        return `/uploads/${cleanKey}`;
      }
    }

    // Local fallback
    return `/uploads/${cleanKey}`;
  }

  /**
   * Generates a presigned write (PUT) URL for direct client-side uploads.
   * Frontend can upload directly to Cloudflare R2 without routing large binaries through the API server.
   */
  async getPresignedUploadUrl(
    key: string,
    contentType = 'image/jpeg',
    expiresInSeconds = 3600 // 1 hour window for upload
  ): Promise<PresignedUploadResult> {
    const cleanKey = key.replace(/^\/+/, '');

    if (this.isReady && this.s3Client) {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: cleanKey,
        ContentType: contentType,
      });

      const uploadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: expiresInSeconds,
      });

      return {
        uploadUrl,
        key: cleanKey,
        expiresIn: expiresInSeconds,
      };
    }

    // Local fallback route
    return {
      uploadUrl: `/api/storage/upload?key=${encodeURIComponent(cleanKey)}`,
      key: cleanKey,
      expiresIn: expiresInSeconds,
    };
  }

  /**
   * Store a raw buffer under `key` (R2 when configured, otherwise local public/uploads).
   */
  async putObject(buffer: Buffer, key: string, contentType = 'image/jpeg'): Promise<void> {
    const cleanKey = key.replace(/^\/+/, '');

    if (this.isReady && this.s3Client) {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: cleanKey,
          Body: buffer,
          ContentType: contentType,
          CacheControl: 'public, max-age=31536000, immutable',
        })
      );
      this.logger.log(`⬆️ Uploaded to R2: ${cleanKey} (${buffer.length} bytes)`);
      return;
    }

    const localFilePath = path.resolve(process.cwd(), 'public/uploads', cleanKey);
    fs.mkdirSync(path.dirname(localFilePath), { recursive: true });
    fs.writeFileSync(localFilePath, buffer);
    this.logger.debug(`Saved image locally to: ${localFilePath}`);
  }

  /**
   * Resolve a key to a local fallback file path (only when R2 is not configured).
   * Returns null if the file doesn't exist or the key escapes the uploads dir.
   */
  getLocalFilePath(key: string): string | null {
    const root = path.resolve(process.cwd(), 'public/uploads');
    const filePath = path.resolve(root, key.replace(/^\/+/, ''));
    if (!filePath.startsWith(root + path.sep)) return null;
    return fs.existsSync(filePath) ? filePath : null;
  }

  /**
   * Upload raw buffer to Cloudflare R2 and return a 12-hour presigned URL.
   */
  async uploadBuffer(
    buffer: Buffer,
    key: string,
    contentType = 'image/jpeg',
    expiresInSeconds: number = StorageService.DEFAULT_PRESIGNED_EXPIRATION
  ): Promise<string> {
    const cleanKey = key.replace(/^\/+/, '');

    if (this.isReady && this.s3Client) {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: cleanKey,
        Body: buffer,
        ContentType: contentType,
      });

      await this.s3Client.send(command);
      return await this.getPresignedUrl(cleanKey, expiresInSeconds);
    }

    // Local fallback: save to public/uploads
    const localDir = path.resolve(process.cwd(), 'public/uploads', path.dirname(cleanKey));
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    const localFilePath = path.resolve(process.cwd(), 'public/uploads', cleanKey);
    fs.writeFileSync(localFilePath, buffer);

    this.logger.debug(`Saved image locally to: ${localFilePath}`);
    return `/uploads/${cleanKey}`;
  }

  /**
   * Download image from remote URL and upload directly into Cloudflare R2.
   * Returns a 12-hour presigned URL upon successful upload.
   */
  async uploadFromUrl(
    remoteUrl: string,
    destinationKey: string,
    expiresInSeconds: number = StorageService.DEFAULT_PRESIGNED_EXPIRATION
  ): Promise<string> {
    if (!remoteUrl || !remoteUrl.startsWith('http')) {
      return remoteUrl;
    }

    try {
      const res = await fetch(remoteUrl);
      if (!res.ok) {
        this.logger.warn(`Could not fetch remote image from ${remoteUrl} (status: ${res.status})`);
        return remoteUrl;
      }

      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const contentType = res.headers.get('content-type') || 'image/jpeg';

      return await this.uploadBuffer(buffer, destinationKey, contentType, expiresInSeconds);
    } catch (err: any) {
      this.logger.error(`Failed to transfer image from ${remoteUrl} to R2: ${err.message}`);
      return remoteUrl;
    }
  }

  /**
   * Delete object from R2 bucket
   */
  async deleteObject(key: string): Promise<void> {
    const cleanKey = key.replace(/^\/+/, '');
    if (this.isReady && this.s3Client) {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: cleanKey,
      });
      await this.s3Client.send(command);
      this.logger.log(`🗑️ Deleted R2 object: ${cleanKey}`);
    } else {
      // Local fallback
      const localFilePath = path.resolve(process.cwd(), 'public/uploads', cleanKey);
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
      }
    }
  }
}
