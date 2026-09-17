/**
 * CANVAS S3 FILE SERVICE
 * Handles storing canvas project files in S3 for persistence and larger projects
 * 
 * Features:
 * - Individual file storage (not just JSON blobs)
 * - Presigned URLs for direct upload/download
 * - File versioning support
 * - Efficient partial updates
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

class CanvasS3FileService {
  constructor() {
    this.s3Client = new S3Client({
      region: process.env.S3_REGION || 'ap-southeast-1',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    this.bucket = process.env.S3_BUCKET || 'victorykit';
    this.filesPrefix = 'canvas-files/'; // Legacy prefix (backward compat)
    // Source-specific prefixes for full separation
    this.sourcePrefixes = {
      standalone: 'canvas-files-standalone/',
      embedded: 'canvas-files-embedded/',
    };
  }

  /**
   * Get the source-aware prefix.
   * New files use source-prefixed paths for full GenCraft Pro / Canvas Studio separation.
   * Validates source to prevent fallback to shared legacy prefix.
   */
  getPrefix(source) {
    const validSource = (source === 'standalone' || source === 'embedded') ? source : 'standalone';
    return this.sourcePrefixes[validSource];
  }

  /**
   * Get the S3 key for a project file
   * @param {string} source - 'standalone' | 'embedded'
   */
  getFileKey(userId, projectId, filePath, source) {
    // Normalize file path (remove leading slash)
    const normalizedPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
    const prefix = this.getPrefix(source);
    return `${prefix}${userId}/${projectId}/${normalizedPath}`;
  }

  /**
   * Get the S3 key prefix for a project
   * @param {string} source - 'standalone' | 'embedded'
   */
  getProjectPrefix(userId, projectId, source) {
    const prefix = this.getPrefix(source);
    return `${prefix}${userId}/${projectId}/`;
  }

  /**
   * Get content type for a file based on extension
   */
  getContentType(filePath) {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const contentTypes = {
      html: 'text/html',
      htm: 'text/html',
      css: 'text/css',
      js: 'application/javascript',
      jsx: 'application/javascript',
      ts: 'application/typescript',
      tsx: 'application/typescript',
      json: 'application/json',
      md: 'text/markdown',
      txt: 'text/plain',
      svg: 'image/svg+xml',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
      ico: 'image/x-icon',
      woff: 'font/woff',
      woff2: 'font/woff2',
      ttf: 'font/ttf',
      eot: 'application/vnd.ms-fontobject',
    };
    return contentTypes[ext] || 'application/octet-stream';
  }

  /**
   * Save a single file to S3
   * @param {string} source - 'standalone' | 'embedded'
   */
  async saveFile(userId, projectId, filePath, content, source) {
    try {
      const key = this.getFileKey(userId, projectId, filePath, source);
      const contentType = this.getContentType(filePath);

      // Convert string content to Buffer if needed
      const body = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;

      await this.s3Client.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        Metadata: {
          'x-canvas-project': projectId,
          'x-canvas-user': userId,
          'x-canvas-updated': new Date().toISOString(),
        },
      }));

      console.log(`[CanvasS3] Saved file: ${key}`);

      return {
        success: true,
        key,
        size: body.length,
      };
    } catch (error) {
      console.error(`[CanvasS3] Failed to save file ${filePath}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Save multiple files to S3 (batch operation)
   * @param {string} source - 'standalone' | 'embedded'
   */
  async saveFiles(userId, projectId, files, source) {
    const results = [];
    const errors = [];

    // Process files in parallel (with concurrency limit)
    const BATCH_SIZE = 10;
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(file => this.saveFile(userId, projectId, file.path, file.content, source))
      );

      batchResults.forEach((result, idx) => {
        if (result.success) {
          results.push({ path: batch[idx].path, ...result });
        } else {
          errors.push({ path: batch[idx].path, error: result.error });
        }
      });
    }

    return {
      success: errors.length === 0,
      saved: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }

  /**
   * Load a single file from S3
   * @param {string} source - 'standalone' | 'embedded'
   */
  async loadFile(userId, projectId, filePath, source) {
    try {
      const key = this.getFileKey(userId, projectId, filePath, source);

      const response = await this.s3Client.send(new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }));

      // Read stream to string/buffer
      const chunks = [];
      for await (const chunk of response.Body) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      // Return as string for text files, buffer for binary
      const contentType = response.ContentType || this.getContentType(filePath);
      const isText = contentType.startsWith('text/') ||
        contentType.includes('json') ||
        contentType.includes('javascript') ||
        contentType.includes('typescript');

      return {
        success: true,
        content: isText ? buffer.toString('utf-8') : buffer,
        contentType,
        size: buffer.length,
        lastModified: response.LastModified,
      };
    } catch (error) {
      if (error.name === 'NoSuchKey') {
        return {
          success: false,
          error: 'File not found',
          notFound: true,
        };
      }
      console.error(`[CanvasS3] Failed to load file ${filePath}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Load all files for a project from S3
   * @param {string} source - 'standalone' | 'embedded'
   */
  async loadProject(userId, projectId, source) {
    try {
      const prefix = this.getProjectPrefix(userId, projectId, source);
      const files = [];
      let continuationToken;

      // List all files in project
      do {
        const listResponse = await this.s3Client.send(new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }));

        if (listResponse.Contents) {
          for (const object of listResponse.Contents) {
            // Extract file path from key
            const filePath = '/' + object.Key.slice(prefix.length);

            // Load file content
            const fileResult = await this.loadFile(userId, projectId, filePath, source);
            if (fileResult.success) {
              files.push({
                path: filePath,
                content: fileResult.content,
                size: fileResult.size,
                lastModified: fileResult.lastModified,
              });
            }
          }
        }

        continuationToken = listResponse.NextContinuationToken;
      } while (continuationToken);

      return {
        success: true,
        files,
        fileCount: files.length,
      };
    } catch (error) {
      console.error(`[CanvasS3] Failed to load project ${projectId}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * List files in a project (without content, just metadata)
   * @param {string} source - 'standalone' | 'embedded'
   */
  async listProjectFiles(userId, projectId, source) {
    try {
      const prefix = this.getProjectPrefix(userId, projectId, source);
      const files = [];
      let continuationToken;

      do {
        const listResponse = await this.s3Client.send(new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }));

        if (listResponse.Contents) {
          for (const object of listResponse.Contents) {
            const filePath = '/' + object.Key.slice(prefix.length);
            files.push({
              path: filePath,
              size: object.Size,
              lastModified: object.LastModified,
              key: object.Key,
            });
          }
        }

        continuationToken = listResponse.NextContinuationToken;
      } while (continuationToken);

      return {
        success: true,
        files,
        fileCount: files.length,
      };
    } catch (error) {
      console.error(`[CanvasS3] Failed to list project files ${projectId}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Delete a single file from S3
   * @param {string} source - 'standalone' | 'embedded'
   */
  async deleteFile(userId, projectId, filePath, source) {
    try {
      const key = this.getFileKey(userId, projectId, filePath, source);

      await this.s3Client.send(new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }));

      console.log(`[CanvasS3] Deleted file: ${key}`);

      return { success: true };
    } catch (error) {
      console.error(`[CanvasS3] Failed to delete file ${filePath}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Delete all files for a project
   * @param {string} source - 'standalone' | 'embedded'
   */
  async deleteProject(userId, projectId, source) {
    try {
      const prefix = this.getProjectPrefix(userId, projectId, source);
      let deleted = 0;
      let continuationToken;

      do {
        // List objects to delete
        const listResponse = await this.s3Client.send(new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }));

        if (listResponse.Contents && listResponse.Contents.length > 0) {
          // Delete batch
          await this.s3Client.send(new DeleteObjectsCommand({
            Bucket: this.bucket,
            Delete: {
              Objects: listResponse.Contents.map(obj => ({ Key: obj.Key })),
              Quiet: true,
            },
          }));

          deleted += listResponse.Contents.length;
        }

        continuationToken = listResponse.NextContinuationToken;
      } while (continuationToken);

      console.log(`[CanvasS3] Deleted project ${projectId} (${deleted} files)`);

      return {
        success: true,
        deletedCount: deleted,
      };
    } catch (error) {
      console.error(`[CanvasS3] Failed to delete project ${projectId}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get presigned URL for direct file upload (useful for large files/images)
   * @param {string} source - 'standalone' | 'embedded'
   */
  async getUploadUrl(userId, projectId, filePath, expiresIn = 3600, source) {
    try {
      const key = this.getFileKey(userId, projectId, filePath, source);
      const contentType = this.getContentType(filePath);

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });

      return {
        success: true,
        url,
        key,
        expiresIn,
      };
    } catch (error) {
      console.error(`[CanvasS3] Failed to generate upload URL:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get presigned URL for direct file download
   * @param {string} source - 'standalone' | 'embedded'
   */
  async getDownloadUrl(userId, projectId, filePath, expiresIn = 3600, source) {
    try {
      const key = this.getFileKey(userId, projectId, filePath, source);

      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });

      return {
        success: true,
        url,
        key,
        expiresIn,
      };
    } catch (error) {
      console.error(`[CanvasS3] Failed to generate download URL:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Check if a file exists
   * @param {string} source - 'standalone' | 'embedded'
   */
  async fileExists(userId, projectId, filePath, source) {
    try {
      const key = this.getFileKey(userId, projectId, filePath, source);

      await this.s3Client.send(new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }));

      return { exists: true };
    } catch (error) {
      if (error.name === 'NotFound' || error.name === 'NoSuchKey') {
        return { exists: false };
      }
      throw error;
    }
  }

  /**
   * Copy a project (for forking/duplicating)
   * @param {string} source - 'standalone' | 'embedded'
   */
  async copyProject(userId, sourceProjectId, targetProjectId, source) {
    try {
      // Load all files from source
      const loadResult = await this.loadProject(userId, sourceProjectId, source);
      if (!loadResult.success) {
        return loadResult;
      }

      // Save to target
      const saveResult = await this.saveFiles(userId, targetProjectId, loadResult.files, source);

      return {
        success: saveResult.success,
        copiedFiles: saveResult.saved,
        errors: saveResult.errors,
      };
    } catch (error) {
      console.error(`[CanvasS3] Failed to copy project:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get total storage used by a user
   * @param {string} source - 'standalone' | 'embedded' (if provided, scopes to that source only)
   */
  async getUserStorageUsage(userId, source) {
    try {
      const pfx = this.getPrefix(source);
      const prefix = `${pfx}${userId}/`;
      let totalSize = 0;
      let fileCount = 0;
      let continuationToken;

      do {
        const listResponse = await this.s3Client.send(new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }));

        if (listResponse.Contents) {
          for (const object of listResponse.Contents) {
            totalSize += object.Size;
            fileCount++;
          }
        }

        continuationToken = listResponse.NextContinuationToken;
      } while (continuationToken);

      return {
        success: true,
        totalBytes: totalSize,
        totalMB: (totalSize / (1024 * 1024)).toFixed(2),
        fileCount,
      };
    } catch (error) {
      console.error(`[CanvasS3] Failed to get storage usage:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export default CanvasS3FileService;
export const canvasS3FileService = new CanvasS3FileService();
