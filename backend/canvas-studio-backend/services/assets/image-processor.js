/**
 * IMAGE PROCESSOR
 * Process uploaded images using Sharp
 * Resize, compress, convert to WebP/AVIF, generate thumbnails
 */

class ImageProcessor {
  constructor() {
    this.sharp = null;
  }

  /**
   * Lazy-load Sharp (it's a native module that may not be available)
   */
  async getSharp() {
    if (!this.sharp) {
      try {
        const sharpModule = await import('sharp');
        this.sharp = sharpModule.default;
      } catch {
        console.warn('[ImageProcessor] Sharp not installed — using passthrough mode');
        return null;
      }
    }
    return this.sharp;
  }

  /**
   * Process an uploaded image — resize + optimize + generate variants
   */
  async process(buffer, options = {}) {
    const sharp = await this.getSharp();
    if (!sharp) {
      return {
        original: buffer,
        thumbnail: buffer,
        medium: buffer,
        large: buffer,
        metadata: { width: 0, height: 0, format: 'unknown' },
      };
    }

    const image = sharp(buffer);
    const metadata = await image.metadata();

    const results = {
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: buffer.length,
        hasAlpha: metadata.hasAlpha,
      },
    };

    // Generate thumbnail (200px wide)
    results.thumbnail = await sharp(buffer)
      .resize(200, null, { withoutEnlargement: true })
      .webp({ quality: 70 })
      .toBuffer();

    // Generate medium (800px wide)
    results.medium = await sharp(buffer)
      .resize(800, null, { withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    // Generate large (1920px wide)
    results.large = await sharp(buffer)
      .resize(1920, null, { withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    // Original as WebP (optimized)
    results.original = await sharp(buffer)
      .webp({ quality: options.quality || 85 })
      .toBuffer();

    // AVIF variant (if supported)
    try {
      results.avif = await sharp(buffer)
        .resize(1920, null, { withoutEnlargement: true })
        .avif({ quality: 60 })
        .toBuffer();
    } catch {
      results.avif = null;
    }

    return results;
  }

  /**
   * Resize an image to specific dimensions
   */
  async resize(buffer, width, height, options = {}) {
    const sharp = await this.getSharp();
    if (!sharp) return buffer;

    return sharp(buffer)
      .resize(width, height, {
        fit: options.fit || 'cover',
        position: options.position || 'center',
        withoutEnlargement: options.withoutEnlargement !== false,
      })
      .toBuffer();
  }

  /**
   * Convert image to a specific format
   */
  async convert(buffer, format, quality = 80) {
    const sharp = await this.getSharp();
    if (!sharp) return buffer;

    const formatMap = {
      webp: (img) => img.webp({ quality }),
      avif: (img) => img.avif({ quality }),
      png: (img) => img.png({ compressionLevel: 9 }),
      jpeg: (img) => img.jpeg({ quality, mozjpeg: true }),
      jpg: (img) => img.jpeg({ quality, mozjpeg: true }),
    };

    const converter = formatMap[format];
    if (!converter) throw new Error(`Unsupported format: ${format}`);

    return converter(sharp(buffer)).toBuffer();
  }

  /**
   * Get image metadata without processing
   */
  async getMetadata(buffer) {
    const sharp = await this.getSharp();
    if (!sharp) return { width: 0, height: 0, format: 'unknown' };

    const meta = await sharp(buffer).metadata();
    return {
      width: meta.width,
      height: meta.height,
      format: meta.format,
      channels: meta.channels,
      hasAlpha: meta.hasAlpha,
      orientation: meta.orientation,
      size: buffer.length,
    };
  }

  /**
   * Generate a placeholder blur hash (low-quality image placeholder)
   */
  async generatePlaceholder(buffer, width = 20) {
    const sharp = await this.getSharp();
    if (!sharp) return null;

    const placeholder = await sharp(buffer)
      .resize(width, null, { withoutEnlargement: true })
      .blur(2)
      .webp({ quality: 20 })
      .toBuffer();

    return `data:image/webp;base64,${placeholder.toString('base64')}`;
  }
}

const imageProcessor = new ImageProcessor();
export default imageProcessor;
export { ImageProcessor };
