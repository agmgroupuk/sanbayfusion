/**
 * ASSET CDN
 * Upload processed assets to S3 + CloudFront
 * Returns CDN URLs for optimized delivery
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

const ASSET_BUCKET = process.env.ASSET_S3_BUCKET || 'maula-assets';
const CDN_DOMAIN = process.env.ASSET_CDN_DOMAIN || 'cdn.maula.ai';

class AssetCDN {
  constructor() {
    this.s3 = null;
  }

  getClient() {
    if (!this.s3) {
      this.s3 = new S3Client({
        region: process.env.AWS_REGION || 'ap-southeast-1',
        credentials: process.env.AWS_ACCESS_KEY_ID
          ? {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            }
          : undefined,
      });
    }
    return this.s3;
  }

  /**
   * Upload an asset with all its variants to S3
   */
  async upload({ projectId, assetId, variants, originalName, mimeType }) {
    const s3 = this.getClient();
    const basePath = `assets/${projectId}/${assetId}`;
    const urls = {};

    for (const [variant, buffer] of Object.entries(variants)) {
      if (!buffer) continue;

      const ext = variant === 'avif' ? '.avif' : '.webp';
      const key = `${basePath}/${variant}${ext}`;

      await s3.send(new PutObjectCommand({
        Bucket: ASSET_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: variant === 'avif' ? 'image/avif' : `image/${ext.slice(1)}`,
        CacheControl: 'public, max-age=31536000, immutable',
        Metadata: {
          'original-name': originalName || 'unknown',
          'project-id': projectId,
        },
      }));

      urls[variant] = `https://${CDN_DOMAIN}/${key}`;
    }

    return {
      cdnUrl: urls.medium || urls.original || urls.large,
      thumbnailUrl: urls.thumbnail,
      urls,
      s3Key: basePath,
    };
  }

  /**
   * Upload a single file to S3
   */
  async uploadSingle({ projectId, buffer, filename, mimeType }) {
    const s3 = this.getClient();
    const assetId = crypto.randomUUID().slice(0, 8);
    const key = `assets/${projectId}/${assetId}/${filename}`;

    await s3.send(new PutObjectCommand({
      Bucket: ASSET_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType || 'application/octet-stream',
      CacheControl: 'public, max-age=86400',
    }));

    return {
      cdnUrl: `https://${CDN_DOMAIN}/${key}`,
      s3Key: key,
      assetId,
    };
  }

  /**
   * Delete an asset and all variants from S3
   */
  async remove(s3Key) {
    const s3 = this.getClient();

    // List and delete all files under this prefix
    const { Contents } = await s3.send(
      new (await import('@aws-sdk/client-s3')).ListObjectsV2Command({
        Bucket: ASSET_BUCKET,
        Prefix: s3Key,
      })
    );

    if (Contents?.length) {
      await Promise.all(
        Contents.map(obj =>
          s3.send(new DeleteObjectCommand({
            Bucket: ASSET_BUCKET,
            Key: obj.Key,
          }))
        )
      );
    }

    return { deleted: Contents?.length || 0 };
  }

  /**
   * Generate a pre-signed upload URL (for direct browser uploads)
   */
  async getUploadUrl({ projectId, filename, mimeType, expiresIn = 3600 }) {
    const s3 = this.getClient();
    const assetId = crypto.randomUUID().slice(0, 8);
    const key = `assets/${projectId}/${assetId}/${filename}`;

    const url = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: ASSET_BUCKET,
        Key: key,
        ContentType: mimeType,
      }),
      { expiresIn }
    );

    return {
      uploadUrl: url,
      cdnUrl: `https://${CDN_DOMAIN}/${key}`,
      s3Key: key,
      assetId,
    };
  }

  /**
   * Get a CDN URL for an asset
   */
  getCdnUrl(s3Key) {
    return `https://${CDN_DOMAIN}/${s3Key}`;
  }
}

const assetCDN = new AssetCDN();
export default assetCDN;
export { AssetCDN };
