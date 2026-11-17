import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHash } from 'crypto';
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
  private readonly presignedUrlCache = new Map<string, { url: string; expiresAt: number }>();

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
      const cacheKey = `${cleanKey}:${expiresInSeconds}`;
      const now = Date.now();
      const cached = this.presignedUrlCache.get(cacheKey);
      if (cached && now < cached.expiresAt) {
        return cached.url;
      }

      try {
        const command = new GetObjectCommand({
          Bucket: this.bucketName,
          Key: cleanKey,
        });

        const signedUrl = await getSignedUrl(this.s3Client, command, {
          expiresIn: expiresInSeconds,
        });

        // Cache for half of expiration window (e.g. 6h for 12h URLs) so browser HTTP cache also reuses stable URLs
        const ttlMs = Math.max(60_000, Math.floor(expiresInSeconds * 500));
        if (this.presignedUrlCache.size >= 1000) {
          const oldest = this.presignedUrlCache.keys().next().value;
          if (oldest !== undefined) this.presignedUrlCache.delete(oldest);
        }
        this.presignedUrlCache.set(cacheKey, {
          url: signedUrl,
          expiresAt: now + ttlMs,
        });

        return signedUrl;
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
    this.invalidatePresignedCache(cleanKey);

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

  private invalidatePresignedCache(cleanKey: string): void {
    for (const k of this.presignedUrlCache.keys()) {
      if (k.startsWith(`${cleanKey}:`)) {
        this.presignedUrlCache.delete(k);
      }
    }
  }

  /**
   * Store a raw buffer under `key` (R2 when configured, otherwise local public/uploads).
   */
  async putObject(buffer: Buffer, key: string, contentType = 'image/jpeg'): Promise<void> {
    const cleanKey = key.replace(/^\/+/, '');
    this.invalidatePresignedCache(cleanKey);

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
   * Read raw object bytes + contentType from Cloudflare R2 (or local fallback).
   */
  async getObjectBuffer(
    keyOrUrl: string
  ): Promise<{ buffer: Buffer; contentType: string } | null> {
    const cleanKey = this.extractCleanKey(keyOrUrl);
    if (!cleanKey || cleanKey.startsWith('http')) return null;

    if (this.isReady && this.s3Client) {
      try {
        const out = await this.s3Client.send(
          new GetObjectCommand({
            Bucket: this.bucketName,
            Key: cleanKey,
          })
        );
        if (!out.Body) return null;
        const bytes = await out.Body.transformToByteArray();
        return {
          buffer: Buffer.from(bytes),
          contentType: out.ContentType || 'image/png',
        };
      } catch (err: any) {
        this.logger.warn(`getObjectBuffer failed for ${cleanKey}: ${err.message}`);
        return null;
      }
    }

    const localPath = this.getLocalFilePath(cleanKey);
    if (!localPath) return null;
    return {
      buffer: fs.readFileSync(localPath),
      contentType: localPath.endsWith('.webp')
        ? 'image/webp'
        : localPath.endsWith('.jpg') || localPath.endsWith('.jpeg')
        ? 'image/jpeg'
        : 'image/png',
    };
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
    this.invalidatePresignedCache(cleanKey);

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
   * Detect image MIME type and file extension from buffer magic bytes + HTTP Content-Type.
   * Returns null if buffer is HTML, empty, or not a valid image.
   */
  public detectImageFormat(
    buffer: Buffer,
    headerContentType?: string | null
  ): { contentType: string; ext: string } | null {
    if (!buffer || buffer.length < 150) return null;

    // Magic bytes check
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return { contentType: 'image/jpeg', ext: 'jpg' };
    }
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      return { contentType: 'image/png', ext: 'png' };
    }
    if (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    ) {
      return { contentType: 'image/webp', ext: 'webp' };
    }
    if (buffer.subarray(0, 4).toString('ascii') === 'GIF8') {
      return { contentType: 'image/gif', ext: 'gif' };
    }
    if (buffer.length >= 12 && buffer.subarray(4, 12).toString('ascii').startsWith('ftypav')) {
      return { contentType: 'image/avif', ext: 'avif' };
    }

    const headText = buffer.subarray(0, 256).toString('utf8').trimStart();
    if (/^<!doctype\s+html|^<html/i.test(headText)) {
      return null;
    }
    if (headText.startsWith('<svg') || (headText.startsWith('<?xml') && headText.includes('<svg'))) {
      return { contentType: 'image/svg+xml', ext: 'svg' };
    }

    const ct = (headerContentType || '').split(';')[0].trim().toLowerCase();
    if (ct === 'image/jpeg' || ct === 'image/jpg') return { contentType: 'image/jpeg', ext: 'jpg' };
    if (ct === 'image/png') return { contentType: 'image/png', ext: 'png' };
    if (ct === 'image/webp') return { contentType: 'image/webp', ext: 'webp' };
    if (ct === 'image/gif') return { contentType: 'image/gif', ext: 'gif' };
    if (ct === 'image/avif') return { contentType: 'image/avif', ext: 'avif' };
    if (ct === 'image/svg+xml') return { contentType: 'image/svg+xml', ext: 'svg' };

    return null;
  }

  /**
   * Build ordered candidate download URLs for an external image (upgrading thumbnails,
   * stripping JXL query params, and adding direct origin fallbacks for /_next/image).
   */
  private buildRemoteFetchCandidates(rawUrl: string): string[] {
    let url = rawUrl.trim();
    if (url.startsWith('//')) url = `https:${url}`;

    // Strip Duda JPEG-XL negotiation params so standard PNG/JPG is returned
    url = url
      .replace(/\?jxl(&v=jxl)?$/i, '')
      .replace(/&jxl(&v=jxl)?/gi, '');

    const candidates: string[] = [];

    // Upgrade Houzz simgs avatar/logo to sharp 500x500 (_10-) first, fallback to original
    if (url.includes('st.hzcdn.com/simgs/') && /_(?:0|1|2|3|4)-(\d+)/.test(url)) {
      candidates.push(url.replace(/_(?:0|1|2|3|4)-(\d+)/, '_10-$1'));
    }

    // Upgrade Houzz fimgs project photo from small grid size to sharp 990x660 first, fallback to original
    if (url.includes('st.hzcdn.com/fimgs/') && /-w(?:390|585)-h(?:260|390)-/.test(url)) {
      candidates.push(url.replace(/-w(?:390|585)-h(?:260|390)-b0-p0--?-?\.jpg/i, '-w990-h660-b0-p0---.jpg'));
    }

    // WordPress uploaded thumbnails (-300x200.jpg / -768x512.webp): try uncropped full-res original FIRST, keep thumb fallback
    if (/\/wp-content\/uploads\/.+-\d{2,4}x\d{2,4}\.(?:jpe?g|png|webp)(\?.*)?$/i.test(url)) {
      candidates.push(
        url.replace(/-\d{2,4}x\d{2,4}(?=\.(?:jpe?g|png|webp)(?:\?.*)?$)/i, '')
      );
    }

    // Squarespace CDN: try crisp 1500w first, fallback to original
    if (url.includes('squarespace-cdn.com') && /[?&]format=\d+w/i.test(url)) {
      candidates.push(url.replace(/([?&]format=)\d+w/i, '$11500w'));
    }

    candidates.push(url);

    // Google Maps signed review photos (googleusercontent.com/geougc-cs or /gps-cs-s or /p/):
    // if =w1200-h900-no or =s1200 fails on a signed URL, fallback to =s800 and =w600-h450-p
    if (url.includes('googleusercontent.com')) {
      if (/=(?:w\d+-h\d+[^&"'\s)]*|s\d+[^&"'\s)]*)/i.test(url)) {
        candidates.push(url.replace(/=(?:w\d+-h\d+[^&"'\s)]*|s\d+[^&"'\s)]*)/i, '=s800'));
        candidates.push(url.replace(/=(?:w\d+-h\d+[^&"'\s)]*|s\d+[^&"'\s)]*)/i, '=w600-h450-p'));
      }
    }

    // If Next.js /_next/image wrapper, add direct underlying asset URL as fallback
    if (url.includes('/_next/image')) {
      try {
        const parsed = new URL(url);
        const inner = parsed.searchParams.get('url');
        if (inner) {
          const resolved = inner.startsWith('http')
            ? inner
            : `${parsed.origin}${inner.startsWith('/') ? '' : '/'}${inner}`;
          candidates.push(resolved);
        }
      } catch {
        // Ignore URL parse error
      }
    }

    return [...new Set(candidates)];
  }

  /**
   * Downloads an external image URL, validates its image bytes, uploads it into Cloudflare R2,
   * and returns the clean R2 object key (e.g. "providers/logos/nykb.jpg") for DB storage.
   *
   * - If `remoteUrl` is already an R2 object key or R2 bucket URL, returns the clean key without re-uploading.
   * - Never returns an external hotlink URL: returns `null` if download/validation fails.
   */
  async ingestRemoteImage(remoteUrl: string | null | undefined, keyBase: string): Promise<string | null> {
    if (!remoteUrl) return null;
    const trimmed = remoteUrl.trim();
    if (!trimmed) return null;

    // Skip generic blank silhouette avatars
    if (
      trimmed.includes('user_0.png') ||
      trimmed.includes('user_60_square.png') ||
      trimmed.includes('user_medium_square.png') ||
      trimmed.includes('default_avatar')
    ) {
      return null;
    }

    // Already stored in our bucket or as a clean R2 object key
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('//')) {
      return this.extractCleanKey(trimmed) || null;
    }
    if (
      trimmed.includes('.r2.cloudflarestorage.com') ||
      trimmed.includes('.amazonaws.com') ||
      trimmed.includes('/api/storage/')
    ) {
      return this.extractCleanKey(trimmed) || null;
    }

    const candidates = this.buildRemoteFetchCandidates(trimmed);
    const strippedBase = keyBase.replace(/^\/+/, '').replace(/\.(jpg|jpeg|png|webp|gif|avif|svg)$/i, '');

    for (const candidateUrl of candidates) {
      let timer: ReturnType<typeof setTimeout> | null = null;
      try {
        const controller = new AbortController();
        timer = setTimeout(() => controller.abort(), 15000);
        let originReferer = '';
        try {
          originReferer = `${new URL(candidateUrl).origin}/`;
        } catch {
          originReferer = '';
        }

        const res = await fetch(candidateUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            Accept: 'image/webp,image/png,image/jpeg,image/avif,image/*;q=0.9,*/*;q=0.5',
            ...(originReferer ? { Referer: originReferer } : {}),
          },
        });
        clearTimeout(timer);
        timer = null;

        if (!res.ok) continue;

        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const detected = this.detectImageFormat(buffer, res.headers.get('content-type'));
        if (!detected) continue;

        const finalKey = `${strippedBase}.${detected.ext}`;
        await this.putObject(buffer, finalKey, detected.contentType);
        return finalKey;
      } catch (err: any) {
        if (timer) clearTimeout(timer);
        this.logger.warn(`⚠️ ingestRemoteImage candidate failed (${candidateUrl}): ${err.message}`);
      }
    }

    this.logger.warn(`❌ Could not ingest external image into R2 (all candidates failed): ${trimmed}`);
    return null;
  }

  /**
   * Deterministic short SHA-1 hash helper for deduplicating asset keys
   */
  public hashUrl(url: string): string {
    return createHash('sha1').update(url.trim()).digest('hex').slice(0, 12);
  }

  /**
   * List all stored object keys matching a prefix in Cloudflare R2.
   */
  async listObjectKeys(prefix: string): Promise<string[]> {
    const cleanPrefix = prefix.replace(/^\/+/, '');
    if (!this.isReady || !this.s3Client) return [];

    const keys: string[] = [];
    let continuationToken: string | undefined;
    do {
      const res = await this.s3Client.send(
        new ListObjectsV2Command({
          Bucket: this.bucketName,
          Prefix: cleanPrefix,
          ContinuationToken: continuationToken,
        })
      );
      for (const obj of res.Contents || []) {
        if (obj.Key) keys.push(obj.Key);
      }
      continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (continuationToken);

    return keys.sort();
  }

  /**
   * Delete object from R2 bucket
   */
  async deleteObject(key: string): Promise<void> {
    const cleanKey = key.replace(/^\/+/, '');
    this.invalidatePresignedCache(cleanKey);
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
