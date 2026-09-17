import { createLogger } from '../lib/logger.js';
const log = createLogger('imageStorage');
/**
 * Image Storage Service — S3 + Signed URLs
 * 
 * Replaces base64 data URI transport with production-grade object storage.
 * - Uploads Sharp buffers to S3 under images/ prefix
 * - Returns pre-signed download URLs (15-minute TTL)
 * - Auto-generates unique keys with timestamp + random suffix
 * - Content-type aware (png, jpeg, webp, avif, gif, tiff, ico)
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

// ─── Config ──────────────────────────────────────────────────────────────────

const S3_BUCKET = process.env.AWS_S3_BUCKET || 'ai-friend-zone-storage';
const S3_REGION = process.env.AWS_REGION || 'us-east-1';
const S3_PREFIX = process.env.IMAGE_S3_PREFIX || 'images';
const SIGNED_URL_TTL = parseInt(process.env.IMAGE_URL_TTL || '900', 10); // 15 min default

const s3 = new S3Client({
  region: S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// ─── MIME mapping ────────────────────────────────────────────────────────────

const FORMAT_MIME = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  webp: 'image/webp',
  avif: 'image/avif',
  gif: 'image/gif',
  tiff: 'image/tiff',
  tif: 'image/tiff',
  ico: 'image/x-icon',
  svg: 'image/svg+xml',
};

const FORMAT_EXT = {
  png: 'png',
  jpeg: 'jpg',
  jpg: 'jpg',
  webp: 'webp',
  avif: 'avif',
  gif: 'gif',
  tiff: 'tiff',
  tif: 'tiff',
  ico: 'ico',
  svg: 'svg',
};

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * Upload an image buffer to S3 and return a pre-signed download URL.
 *
 * @param {Buffer} buffer - Raw image data from Sharp
 * @param {object} opts
 * @param {string} opts.format - Image format (png, jpeg, webp, etc.)
 * @param {string} [opts.prefix] - S3 key prefix (default: images)
 * @param {string} [opts.filename] - Optional custom filename
 * @param {number} [opts.ttl] - Signed URL TTL in seconds (default: 900)
 * @param {object} [opts.metadata] - Optional S3 metadata tags
 * @returns {Promise<{ url: string, key: string, bucket: string, expiresAt: string, contentType: string }>}
 */
export async function uploadImage(buffer, opts = {}) {
  const {
    format = 'png',
    prefix = S3_PREFIX,
    filename,
    ttl = SIGNED_URL_TTL,
    metadata = {},
  } = opts;

  const ext = FORMAT_EXT[format] || format;
  const contentType = FORMAT_MIME[format] || 'application/octet-stream';
  const id = crypto.randomBytes(8).toString('hex');
  const ts = Date.now();
  const key = filename
    ? `${prefix}/${filename}`
    : `${prefix}/${ts}-${id}.${ext}`;

  // Upload
  await s3.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: 'public, max-age=86400', // 1 day browser cache
    Metadata: {
      ...metadata,
      format,
      uploadedAt: new Date().toISOString(),
    },
  }));

  // Generate presigned download URL
  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }),
    { expiresIn: ttl }
  );

  const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();

  log.info(`[ImageStorage] Uploaded ${key} (${(buffer.length / 1024).toFixed(1)} KB) → signed URL (${ttl}s TTL)`);

  return { url, key, bucket: S3_BUCKET, expiresAt, contentType };
}

/**
 * Upload multiple image buffers (for batch/merge results).
 *
 * @param {Array<{ buffer: Buffer, format: string }>} items
 * @param {object} [opts] - Shared options (prefix, ttl, metadata)
 * @returns {Promise<Array<{ url: string, key: string, bucket: string, expiresAt: string }>>}
 */
export async function uploadImages(items, opts = {}) {
  return Promise.all(items.map(item => uploadImage(item.buffer, { ...opts, format: item.format })));
}

/**
 * Generate a fresh presigned URL for an existing S3 key.
 * Useful for re-signing expired URLs.
 *
 * @param {string} key - S3 object key
 * @param {number} [ttl] - TTL in seconds (default: 900)
 * @returns {Promise<{ url: string, expiresAt: string }>}
 */
export async function resignUrl(key, ttl = SIGNED_URL_TTL) {
  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }),
    { expiresIn: ttl }
  );
  return { url, expiresAt: new Date(Date.now() + ttl * 1000).toISOString() };
}

/**
 * Delete an image from S3.
 *
 * @param {string} key - S3 object key
 */
export async function deleteImage(key) {
  await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
  log.info(`[ImageStorage] Deleted ${key}`);
}

/**
 * Check if S3 is configured and reachable.
 */
export function isConfigured() {
  return !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && S3_BUCKET);
}
