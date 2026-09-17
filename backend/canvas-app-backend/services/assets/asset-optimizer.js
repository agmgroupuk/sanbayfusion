/**
 * ASSET OPTIMIZER
 * Auto-optimize assets on upload
 * Coordinates image processing + CDN upload + DB record creation
 */

import { prisma } from '../../lib/prisma.js';
import imageProcessor from './image-processor.js';
import assetCDN from './asset-cdn.js';

class AssetOptimizer {
  /**
   * Process and upload an asset (full pipeline)
   */
  async processAndUpload({ projectId, userId, buffer, originalName, mimeType }) {
    const isImage = mimeType?.startsWith('image/');
    let result;

    if (isImage) {
      // Process image — generate variants
      const processed = await imageProcessor.process(buffer);

      // Upload all variants to CDN
      const uploaded = await assetCDN.upload({
        projectId,
        assetId: this.generateId(),
        variants: {
          original: processed.original,
          thumbnail: processed.thumbnail,
          medium: processed.medium,
          large: processed.large,
          avif: processed.avif,
        },
        originalName,
        mimeType,
      });

      result = {
        ...uploaded,
        metadata: processed.metadata,
        optimizedSize: processed.original.length,
        type: 'image',
        width: processed.metadata.width,
        height: processed.metadata.height,
      };
    } else {
      // Non-image file — upload directly
      const uploaded = await assetCDN.uploadSingle({
        projectId,
        buffer,
        filename: originalName,
        mimeType,
      });

      result = {
        ...uploaded,
        thumbnailUrl: null,
        metadata: {},
        optimizedSize: buffer.length,
        type: this.getAssetType(mimeType),
        width: null,
        height: null,
      };
    }

    // Save to database
    const asset = await prisma.asset.create({
      data: {
        projectId,
        userId,
        type: result.type,
        originalName,
        originalSize: buffer.length,
        optimizedSize: result.optimizedSize,
        s3Key: result.s3Key,
        cdnUrl: result.cdnUrl,
        thumbnailUrl: result.thumbnailUrl,
        mimeType,
        width: result.width,
        height: result.height,
        metadata: result.metadata ? JSON.stringify(result.metadata) : '{}',
      },
    });

    console.log(`[AssetOptimizer] Processed ${originalName} (${this.formatSize(buffer.length)} → ${this.formatSize(result.optimizedSize)})`);

    return {
      id: asset.id,
      originalName,
      originalSize: buffer.length,
      optimizedSize: result.optimizedSize,
      savings: Math.round((1 - result.optimizedSize / buffer.length) * 100),
      cdnUrl: result.cdnUrl,
      thumbnailUrl: result.thumbnailUrl,
      type: result.type,
      width: result.width,
      height: result.height,
    };
  }

  /**
   * List assets for a project
   */
  async listAssets(projectId, { type, limit = 50, offset = 0 } = {}) {
    const where = { projectId };
    if (type) where.type = type;

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.asset.count({ where }),
    ]);

    return { assets, total };
  }

  /**
   * Delete an asset
   */
  async deleteAsset(assetId) {
    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) throw new Error('Asset not found');

    // Remove from S3
    await assetCDN.remove(asset.s3Key);

    // Remove from DB
    await prisma.asset.delete({ where: { id: assetId } });

    return { success: true };
  }

  /**
   * Get asset type from mime type
   */
  getAssetType(mimeType) {
    if (!mimeType) return 'file';
    if (mimeType.startsWith('image/svg')) return 'icon';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('font/') || mimeType.includes('font')) return 'font';
    if (mimeType === 'application/pdf'
      || mimeType.includes('document')
      || mimeType.includes('spreadsheet')
      || mimeType.includes('presentation')
      || mimeType.startsWith('text/')
      || mimeType === 'application/json'
      || mimeType === 'application/xml'
    ) return 'document';
    if (mimeType === 'application/zip'
      || mimeType === 'application/gzip'
      || mimeType.includes('tar')
      || mimeType.includes('7z')
      || mimeType.includes('rar')
    ) return 'archive';
    return 'file';
  }

  /**
   * Generate a short unique ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /**
   * Format bytes to human-readable
   */
  formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }
}

const assetOptimizer = new AssetOptimizer();
export default assetOptimizer;
export { AssetOptimizer };
