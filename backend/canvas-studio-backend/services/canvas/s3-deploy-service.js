/**
 * S3 DEPLOY SERVICE
 * Handles deploying canvas apps to S3 static hosting
 * Apps are accessible via {appSlug}.sanbayfusion.com
 */

import { S3Client, PutObjectCommand, DeleteObjectsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import crypto from 'crypto';

class S3DeployService {
  constructor() {
    this.s3Client = new S3Client({
      region: process.env.S3_REGION || 'ap-southeast-1',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    this.bucket = process.env.S3_BUCKET || 'victorykit';
    this.appsPrefix = 'canvas-apps/'; // Legacy prefix (backward compat)
    // Source-specific prefixes for full GenCraft Pro / Canvas Studio separation
    this.sourcePrefixes = {
      standalone: 'canvas-apps-standalone/',
      embedded: 'canvas-apps-embedded/',
    };
    this.domain = process.env.APP_DOMAIN || 'sanbayfusion.com';
  }

  /**
   * Get the source-aware prefix for deploy hosting.
   */
  getAppsPrefix(source) {
    return this.sourcePrefixes[source] || this.appsPrefix;
  }

  /**
   * Generate a unique slug for the app
   */
  generateSlug(projectName, userId) {
    const cleanName = (projectName || 'my-app')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 20);

    const uniqueId = crypto.randomBytes(3).toString('hex'); // 6 chars
    const userPrefix = userId ? userId.slice(0, 4) : 'app';

    return `${cleanName}-${userPrefix}-${uniqueId}`;
  }

  /**
   * Get content type from file path
   */
  getContentType(filePath) {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const types = {
      html: 'text/html',
      htm: 'text/html',
      css: 'text/css',
      js: 'application/javascript',
      mjs: 'application/javascript',
      json: 'application/json',
      svg: 'image/svg+xml',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      ico: 'image/x-icon',
      webp: 'image/webp',
      woff: 'font/woff',
      woff2: 'font/woff2',
      ttf: 'font/ttf',
      eot: 'application/vnd.ms-fontobject',
      xml: 'application/xml',
      txt: 'text/plain',
      md: 'text/markdown',
      ts: 'application/javascript',
      tsx: 'application/javascript',
      jsx: 'application/javascript',
    };
    return types[ext] || 'application/octet-stream';
  }

  /**
   * Deploy multi-file project to S3
   * files: Record<string, string> - path -> content map
   * @param {string} source - 'standalone' | 'embedded' for path separation
   */
  async deployFiles({ projectName, files, userId = 'anonymous', slug: existingSlug, source }) {
    try {
      const name = projectName || 'my-app';
      const slug = existingSlug || this.generateSlug(name, userId);
      const prefix = this.getAppsPrefix(source);
      const appPath = `${prefix}${slug}/`;

      console.log(`[S3Deploy] Deploying ${name} (${Object.keys(files).length} files) to ${appPath} [source=${source || 'unknown'}]`);

      // If redeploying to existing slug, clean old files first
      if (existingSlug) {
        await this.deleteAppFiles(slug, source);
      }

      // Upload all files to S3
      let uploaded = 0;
      for (const [filePath, content] of Object.entries(files)) {
        const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
        const key = `${appPath}${cleanPath}`;

        await this.s3Client.send(new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: content,
          ContentType: this.getContentType(cleanPath),
          CacheControl: cleanPath.endsWith('.html') ? 'public, max-age=300' : 'public, max-age=604800',
        }));

        uploaded++;
      }

      // Ensure index.html exists – if not, create a redirect to the first html file
      const hasIndex = Object.keys(files).some(f => {
        const clean = f.startsWith('/') ? f.slice(1) : f;
        return clean === 'index.html';
      });

      if (!hasIndex) {
        const firstHtml = Object.keys(files).find(f => f.endsWith('.html'));
        if (firstHtml) {
          const redirect = `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=/${firstHtml.replace(/^\//, '')}"></head></html>`;
          await this.s3Client.send(new PutObjectCommand({
            Bucket: this.bucket,
            Key: `${appPath}index.html`,
            Body: redirect,
            ContentType: 'text/html',
            CacheControl: 'public, max-age=300',
          }));
          uploaded++;
        }
      }

      const appUrl = `https://${slug}.${this.domain}`;
      console.log(`[S3Deploy] ✅ Deployed ${uploaded} files: ${appUrl}`);

      return {
        success: true,
        deploymentId: `deploy_${Date.now()}_${slug}`,
        slug,
        url: appUrl,
        s3Path: appPath,
        filesUploaded: uploaded,
        status: 'live',
        ssl: true,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[S3Deploy] Multi-file deploy error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Parse HTML/React code into deployable files
   */
  parseCodeToFiles(code, type = 'html') {
    const files = [];

    if (type === 'html') {
      // Single HTML file
      files.push({
        path: 'index.html',
        content: code,
        contentType: 'text/html',
      });
    } else if (type === 'react' || type === 'nextjs') {
      // For React, we need to wrap it in a proper HTML structure
      // Check if code is already full HTML
      if (code.includes('<!DOCTYPE html>') || code.includes('<html')) {
        files.push({
          path: 'index.html',
          content: code,
          contentType: 'text/html',
        });
      } else {
        // Wrap React component in HTML with React CDN
        const htmlWrapper = this.wrapReactInHtml(code);
        files.push({
          path: 'index.html',
          content: htmlWrapper,
          contentType: 'text/html',
        });
      }
    }

    return files;
  }

  /**
   * Wrap React JSX in standalone HTML with CDN React
   */
  wrapReactInHtml(reactCode) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Maula App</title>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script>/* Suppress Tailwind CDN dev warning */var _cw=console.warn;console.warn=function(){var m=[].slice.call(arguments).join(' ');if(m.indexOf('cdn.tailwindcss.com')!==-1)return;_cw.apply(console,arguments)};</script>
  <script src="https://cdn.tailwindcss.com/3.4.17"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { font-family: 'Inter', sans-serif; }
    body { margin: 0; padding: 0; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    ${reactCode}
    
    // Auto-render if App component exists
    if (typeof App !== 'undefined') {
      ReactDOM.createRoot(document.getElementById('root')).render(<App />);
    }
  </script>
</body>
</html>`;
  }

  /**
   * Deploy an app to S3
   * @param {string} source - 'standalone' | 'embedded'
   */
  async deploy({ projectId, projectName, code, type = 'html', userId = 'anonymous', source }) {
    try {
      const slug = this.generateSlug(projectName, userId);
      const prefix = this.getAppsPrefix(source);
      const appPath = `${prefix}${slug}/`;

      console.log(`[S3Deploy] Deploying ${projectName} to ${appPath} [source=${source || 'unknown'}]`);

      // Parse code into files
      const files = this.parseCodeToFiles(code, type);

      // Upload all files to S3
      for (const file of files) {
        const key = `${appPath}${file.path}`;

        await this.s3Client.send(new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.content,
          ContentType: file.contentType,
          CacheControl: 'public, max-age=3600', // 1 hour cache
        }));

        console.log(`[S3Deploy] Uploaded: ${key}`);
      }

      // Generate the app URL
      const appUrl = `https://${slug}.${this.domain}`;
      const s3Url = `https://${this.bucket}.s3.${process.env.S3_REGION || 'ap-southeast-1'}.amazonaws.com/${appPath}index.html`;

      console.log(`[S3Deploy] ✅ Deployed successfully: ${appUrl}`);

      return {
        success: true,
        deploymentId: `deploy_${Date.now()}_${slug}`,
        slug,
        url: appUrl,
        s3Url, // Direct S3 URL for testing
        s3Path: appPath,
        filesUploaded: files.length,
        status: 'live',
        ssl: true, // Cloudflare provides SSL
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[S3Deploy] Deploy error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Update an existing deployment
   * @param {string} source - 'standalone' | 'embedded'
   */
  async redeploy({ slug, code, type = 'html', source }) {
    try {
      const prefix = this.getAppsPrefix(source);
      const appPath = `${prefix}${slug}/`;

      console.log(`[S3Deploy] Redeploying ${slug} [source=${source || 'unknown'}]`);

      // Delete old files first
      await this.deleteAppFiles(slug, source);

      // Parse and upload new files
      const files = this.parseCodeToFiles(code, type);

      for (const file of files) {
        const key = `${appPath}${file.path}`;

        await this.s3Client.send(new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.content,
          ContentType: file.contentType,
          CacheControl: 'public, max-age=3600',
        }));
      }

      const appUrl = `https://${slug}.${this.domain}`;

      return {
        success: true,
        slug,
        url: appUrl,
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[S3Deploy] Redeploy error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Delete an app's files from S3
   * @param {string} source - 'standalone' | 'embedded'
   */
  async deleteAppFiles(slug, source) {
    try {
      const prefix = this.getAppsPrefix(source);
      const appPath = `${prefix}${slug}/`;

      // List all objects under the app path
      const listResponse = await this.s3Client.send(new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: appPath,
      }));

      if (!listResponse.Contents || listResponse.Contents.length === 0) {
        return { success: true, deleted: 0 };
      }

      // Delete all objects
      const deleteParams = {
        Bucket: this.bucket,
        Delete: {
          Objects: listResponse.Contents.map(obj => ({ Key: obj.Key })),
        },
      };

      await this.s3Client.send(new DeleteObjectsCommand(deleteParams));

      console.log(`[S3Deploy] Deleted ${listResponse.Contents.length} files from ${slug}`);

      return {
        success: true,
        deleted: listResponse.Contents.length,
      };
    } catch (error) {
      console.error('[S3Deploy] Delete error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Delete a deployment completely
   * @param {string} source - 'standalone' | 'embedded'
   */
  async deleteDeployment(slug, source) {
    try {
      await this.deleteAppFiles(slug, source);

      console.log(`[S3Deploy] ✅ Deployment ${slug} deleted`);

      return {
        success: true,
        message: `Deployment ${slug} has been deleted`,
      };
    } catch (error) {
      console.error('[S3Deploy] Delete deployment error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * List all deployed apps for a user (by scanning S3 prefix)
   * Returns enriched data: slug, url, fileCount, totalSize, lastModified
   * @param {string} source - 'standalone' | 'embedded'
   */
  async listDeployments(userId, source) {
    try {
      const prefix = this.getAppsPrefix(source);

      // First, get all app folders
      const response = await this.s3Client.send(new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        Delimiter: '/',
      }));

      const folders = (response.CommonPrefixes || [])
        .map(p => p.Prefix.replace(prefix, '').replace('/', ''))
        .filter(slug => {
          if (!userId) return true;
          return slug.includes(userId.slice(0, 4));
        });

      // For each folder, get file count and last modified
      const deployments = await Promise.all(
        folders.map(async (slug) => {
          try {
            const filesResponse = await this.s3Client.send(new ListObjectsV2Command({
              Bucket: this.bucket,
              Prefix: `${prefix}${slug}/`,
            }));

            const files = filesResponse.Contents || [];
            const totalSize = files.reduce((sum, f) => sum + (f.Size || 0), 0);
            const lastModified = files.length > 0
              ? files.reduce((latest, f) => {
                const d = f.LastModified ? new Date(f.LastModified) : new Date(0);
                return d > latest ? d : latest;
              }, new Date(0)).toISOString()
              : null;

            return {
              slug,
              url: `https://${slug}.${this.domain}`,
              fileCount: files.length,
              totalSize,
              lastModified,
              status: 'live',
            };
          } catch {
            return {
              slug,
              url: `https://${slug}.${this.domain}`,
              fileCount: 0,
              totalSize: 0,
              lastModified: null,
              status: 'live',
            };
          }
        })
      );

      return {
        success: true,
        deployments,
      };
    } catch (error) {
      console.error('[S3Deploy] List error:', error);
      return {
        success: false,
        error: error.message,
        deployments: [],
      };
    }
  }

  /**
   * Get S3 URL for an app (for Nginx proxy)
   * @param {string} source - 'standalone' | 'embedded'
   */
  getS3UrlForSlug(slug, source) {
    const region = process.env.S3_REGION || 'ap-southeast-1';
    const prefix = this.getAppsPrefix(source);
    return `https://${this.bucket}.s3.${region}.amazonaws.com/${prefix}${slug}/index.html`;
  }
}

// Export singleton instance
const s3DeployService = new S3DeployService();
export default s3DeployService;
export { S3DeployService };
