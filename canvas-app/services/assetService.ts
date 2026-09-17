/**
 * assetService — Asset (images, fonts, icons, docs, code, archives) management
 * Upload, list, delete, optimize assets
 */
const API_BASE = '/api/assets';

// ── Limits (match backend) ──
export const ASSET_LIMITS = {
  maxFileSize: 50 * 1024 * 1024,       // 50 MB
  maxFileSizeMB: 50,
  maxFilesPerUpload: 20,
  allowedExtensions: new Set([
    // Images
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif', 'ico', 'bmp', 'tiff', 'tif',
    // Video
    'mp4', 'webm', 'mov', 'avi', 'mkv',
    // Audio
    'mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a',
    // Documents
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'md', 'rtf',
    // Code
    'js', 'ts', 'jsx', 'tsx', 'json', 'html', 'css', 'scss', 'less', 'xml', 'yaml', 'yml', 'sh', 'py', 'rb', 'go', 'rs', 'wasm',
    // Fonts
    'woff', 'woff2', 'ttf', 'otf', 'eot',
    // Archives
    'zip', 'gz', 'tar', '7z', 'rar',
  ]),
};

export function validateFile(file: File): string | null {
  if (file.size > ASSET_LIMITS.maxFileSize) {
    return `File "${file.name}" is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum is ${ASSET_LIMITS.maxFileSizeMB} MB.`;
  }
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (ext && !ASSET_LIMITS.allowedExtensions.has(ext)) {
    return `File type ".${ext}" is not supported. Supported: images, videos, audio, documents, code, fonts, archives.`;
  }
  return null;
}

export interface Asset {
  id: string;
  name: string;
  originalName: string;
  url: string;
  cdnUrl: string;
  thumbnailUrl?: string;
  size: number;
  originalSize: number;
  optimizedSize?: number;
  type: 'image' | 'font' | 'icon' | 'video' | 'document' | 'other';
  mimeType: string;
  width?: number;
  height?: number;
  uploadedAt: string;
  createdAt: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

export const assetService = {
  async upload(
    file: File,
    projectId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<Asset> {
    // Client-side validation
    const validationError = validateFile(file);
    if (validationError) throw new Error(validationError);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', projectId);

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress({
            loaded: e.loaded,
            total: e.total,
            percent: Math.round((e.loaded / e.total) * 100),
          });
        }
      });

      xhr.addEventListener('load', () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300 && data.success) {
            resolve(data.asset || data);
          } else {
            reject(new Error(data.message || `Upload failed (${xhr.status})`));
          }
        } catch {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
      xhr.withCredentials = true;
      xhr.open('POST', `${API_BASE}/upload`);
      xhr.send(formData);
    });
  },

  async list(projectId?: string): Promise<Asset[]> {
    const url = projectId ? `${API_BASE}?projectId=${projectId}` : API_BASE;
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) throw new Error(`Failed to list assets: ${res.statusText}`);
    const data = await res.json();
    return Array.isArray(data) ? data : (data.assets || []);
  },

  async delete(assetId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/${assetId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`Failed to delete asset: ${res.statusText}`);
  },

  async optimize(assetId: string, options?: { quality?: number; maxWidth?: number }): Promise<Asset> {
    const res = await fetch(`${API_BASE}/${assetId}/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(options || {}),
    });
    if (!res.ok) throw new Error(`Failed to optimize asset: ${res.statusText}`);
    return res.json();
  },

  /** Get a file type classification */
  getFileType(mimeType: string): Asset['type'] {
    if (mimeType.startsWith('image/svg')) return 'icon';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'other';
    if (mimeType.includes('font')) return 'font';
    if (mimeType === 'application/pdf' || mimeType.startsWith('text/') || mimeType.includes('document') || mimeType.includes('spreadsheet')) return 'document';
    return 'other';
  },

  /** Format file size */
  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  },
};

export default assetService;
