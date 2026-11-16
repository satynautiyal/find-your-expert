import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { createHash } from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config();

const r2AccountId = process.env.R2_ACCOUNT_ID || '';
const r2AccessKey = process.env.R2_ACCESS_KEY_ID || '';
const r2SecretKey = process.env.R2_SECRET_ACCESS_KEY || '';
const r2BucketName = process.env.R2_BUCKET_NAME || 'findyourexperts-media';

export const isR2Configured = Boolean(
  r2AccountId &&
    r2AccessKey &&
    r2SecretKey &&
    !r2AccountId.includes('your_') &&
    !r2AccessKey.includes('your_')
);

const r2Client = isR2Configured
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: r2AccessKey,
        secretAccessKey: r2SecretKey,
      },
    })
  : null;

export function hashAssetUrl(url: string): string {
  return createHash('sha1').update(url.trim()).digest('hex').slice(0, 12);
}

function detectImageFormat(
  buffer: Buffer,
  headerContentType?: string | null
): { contentType: string; ext: string } | null {
  if (!buffer || buffer.length < 150) return null;

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

function buildFetchCandidates(rawUrl: string): string[] {
  let url = rawUrl.trim();
  if (url.startsWith('//')) url = `https:${url}`;

  url = url
    .replace(/\?jxl(&v=jxl)?$/i, '')
    .replace(/&jxl(&v=jxl)?/gi, '');

  const candidates: string[] = [];

  if (url.includes('st.hzcdn.com/simgs/') && /_(?:0|1|2|3|4)-(\d+)/.test(url)) {
    candidates.push(url.replace(/_(?:0|1|2|3|4)-(\d+)/, '_10-$1'));
  }

  if (url.includes('st.hzcdn.com/fimgs/') && /-w(?:390|585)-h(?:260|390)-/.test(url)) {
    candidates.push(url.replace(/-w(?:390|585)-h(?:260|390)-b0-p0--?-?\.jpg/i, '-w990-h660-b0-p0---.jpg'));
  }

  candidates.push(url);

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
    } catch {}
  }

  return [...new Set(candidates)];
}

/**
 * Downloads an external image URL, validates its image bytes, uploads it to Cloudflare R2
 * (or local `public/uploads` when R2 is not configured), and returns the clean object key.
 *
 * NEVER returns a raw external hotlink URL — returns `null` if download/validation fails.
 */
export async function ingestImageToR2(
  remoteUrl: string | null | undefined,
  keyBase: string
): Promise<string | null> {
  if (!remoteUrl) return null;
  const trimmed = remoteUrl.trim();
  if (!trimmed) return null;

  if (
    trimmed.includes('user_0.png') ||
    trimmed.includes('user_60_square.png') ||
    trimmed.includes('user_medium_square.png') ||
    trimmed.includes('default_avatar')
  ) {
    return null;
  }

  // Already a clean bucket key
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('//')) {
    return trimmed.replace(/^\/+/, '');
  }

  // Already an R2 presigned URL
  if (trimmed.includes('.r2.cloudflarestorage.com') || trimmed.includes('.amazonaws.com')) {
    try {
      const parsed = new URL(trimmed);
      let pathname = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
      if (pathname.startsWith(`${r2BucketName}/`)) {
        pathname = pathname.substring(r2BucketName.length + 1);
      }
      return pathname;
    } catch {
      return null;
    }
  }

  const candidates = buildFetchCandidates(trimmed);
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

      const buffer = Buffer.from(await res.arrayBuffer());
      const detected = detectImageFormat(buffer, res.headers.get('content-type'));
      if (!detected) continue;

      const finalKey = `${strippedBase}.${detected.ext}`;

      if (isR2Configured && r2Client) {
        await r2Client.send(
          new PutObjectCommand({
            Bucket: r2BucketName,
            Key: finalKey,
            Body: buffer,
            ContentType: detected.contentType,
            CacheControl: 'public, max-age=31536000, immutable',
          })
        );
      } else {
        const localFile = path.resolve(__dirname, '../../public/uploads', finalKey);
        fs.mkdirSync(path.dirname(localFile), { recursive: true });
        fs.writeFileSync(localFile, buffer);
      }

      return finalKey;
    } catch {
      if (timer) clearTimeout(timer);
    }
  }

  return null;
}

/**
 * Uploads an in-memory image Buffer (e.g. 2x retina PNG brand logo rendered from a contractor's website)
 * directly to Cloudflare R2 and returns the clean object key.
 */
export async function uploadBufferToR2(
  buffer: Buffer | null | undefined,
  finalKey: string,
  contentType = 'image/png'
): Promise<string | null> {
  if (!buffer || buffer.length < 150) return null;
  const cleanKey = finalKey.replace(/^\/+/, '');
  try {
    if (isR2Configured && r2Client) {
      await r2Client.send(
        new PutObjectCommand({
          Bucket: r2BucketName,
          Key: cleanKey,
          Body: buffer,
          ContentType: contentType,
          CacheControl: 'public, max-age=31536000, immutable',
        })
      );
    } else {
      const localFile = path.resolve(__dirname, '../../public/uploads', cleanKey);
      fs.mkdirSync(path.dirname(localFile), { recursive: true });
      fs.writeFileSync(localFile, buffer);
    }
    return cleanKey;
  } catch {
    return null;
  }
}


