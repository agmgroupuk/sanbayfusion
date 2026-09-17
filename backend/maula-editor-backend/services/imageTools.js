import { createLogger } from '../lib/logger.js';
const log = createLogger('imageTools');
/**
 * IMAGE TOOL DEFINITIONS & EXECUTORS
 * ==============================================================
 * Agent-callable tools for image processing.
 * Backend defines tools → Model chooses → Backend executes
 *
 * 10 tools:
 *   image_create     — Create images from scratch (solid, gradient, pattern, placeholder, noise, sprite)
 *   image_transform  — Geometry ops (resize, crop, rotate, flip, extend, trim)
 *   image_optimize   — Format conversion, compression, responsive, thumbnails
 *   image_compose    — Text overlays, watermarks, image compositing, shapes
 *   image_filter     — Visual effects (blur, sharpen, grayscale, sepia, vintage, cinematic, duotone, etc.)
 *   image_background — Background remove/replace/flatten/shadow/mask
 *   image_analyze    — Metadata, stats, histogram, hash, validation, color extraction, similarity, EXIF + AI: caption, OCR, objects, tags, people, smart crop, moderation
 *   image_batch      — Batch process any of the above on multiple files
 *   image_merge      — Combine multiple images (horizontal, vertical, grid layouts)
 *   image_convert    — Convert to base64, data-url, ICO set, ASCII art
 */

import {
  createImage,
  transformImage,
  optimizeImage,
  composeImage,
  filterImage,
  backgroundImage,
  analyzeImage,
  batchProcess,
  convertImage,
  mergeImages,
} from './imageEngine.js';
import { uploadImage, uploadImages, isConfigured as s3Configured } from './imageStorage.js';

// ============================================================================
// TOOL DEFINITIONS (Anthropic format with input_schema)
// ============================================================================

export const IMAGE_TOOL_DEFINITIONS = [

  // ── 1. image_create ──────────────────────────────────────────────
  {
    name: 'image_create',
    description: `Create a new image from scratch (non-AI). Supports solid color, gradient, pattern, placeholder, noise, and sprite sheet.

Use cases: placeholder images, background textures, social media templates, design mockups, test images, color swatches, pattern fills, sprite sheets from multiple images.`,
    input_schema: {
      type: 'object',
      properties: {
        width: {
          type: 'integer',
          description: 'Image width in pixels (default: 800)',
        },
        height: {
          type: 'integer',
          description: 'Image height in pixels (default: 600)',
        },
        type: {
          type: 'string',
          enum: ['solid', 'gradient', 'pattern', 'placeholder', 'noise', 'sprite'],
          description: 'Type of image to create. solid=flat color, gradient=two-color blend, pattern=repeating pattern, placeholder=marked placeholder, noise=random pixels, sprite=sprite sheet from multiple images',
        },
        background: {
          type: 'string',
          description: 'Background color (hex, rgb, or named). Default: #ffffff',
        },
        format: {
          type: 'string',
          enum: ['png', 'jpg', 'webp', 'avif'],
          description: 'Output format (default: png)',
        },
        text: {
          type: 'string',
          description: 'Optional text to overlay on the created image',
        },
        gradientFrom: { type: 'string', description: 'Gradient start color (hex)' },
        gradientTo: { type: 'string', description: 'Gradient end color (hex)' },
        gradientAngle: { type: 'number', description: 'Gradient angle in degrees (0=top→bottom)' },
        patternType: {
          type: 'string',
          enum: ['grid', 'dots', 'stripes', 'checkerboard'],
          description: 'Pattern style',
        },
        patternSize: { type: 'integer', description: 'Pattern tile size in pixels' },
        patternColor: { type: 'string', description: 'Pattern foreground color' },
        placeholderLabel: { type: 'string', description: 'Custom placeholder label text' },
        spriteInputs: {
          type: 'array',
          items: { type: 'string' },
          description: '[sprite] Array of image paths to arrange into a sprite sheet',
        },
        spriteColumns: { type: 'integer', description: '[sprite] Columns in grid (auto = ceil(sqrt(n)))' },
        spritePadding: { type: 'integer', description: '[sprite] Padding between sprites in pixels (default: 0)' },
        outputPath: { type: 'string', description: 'File path to save the image' },
      },
      required: ['type'],
    },
  },

  // ── 2. image_transform ───────────────────────────────────────────
  {
    name: 'image_transform',
    description: `Apply geometry & spatial transformations to an image: resize, crop, rotate, flip, extend (add padding), and trim whitespace.

Resize supports: absolute dimensions, percentage scaling, aspect-locked, fit modes (cover/contain/fill/inside/outside).
Crop supports: fixed region (x,y,w,h), smart crop (attention/entropy for subject detection).
Rotate: any angle, auto-rotate by EXIF orientation.
Flip: horizontal, vertical, or both.
Extend: add padding/margins with custom color.
Trim: auto-remove border whitespace.`,
    input_schema: {
      type: 'object',
      properties: {
        inputPath: { type: 'string', description: 'Path to the source image' },
        resize: {
          type: 'object',
          description: 'Resize options',
          properties: {
            width: { type: 'integer', description: 'Target width in pixels' },
            height: { type: 'integer', description: 'Target height in pixels' },
            percentage: { type: 'number', description: 'Scale by percentage (e.g. 50 = half size)' },
            fit: {
              type: 'string',
              enum: ['cover', 'contain', 'fill', 'inside', 'outside'],
              description: 'How to fit the image. cover=crop to fit, contain=fit within, fill=stretch, inside=fit within preserving aspect, outside=cover minimum',
            },
            position: { type: 'string', description: 'Crop position when fit=cover: center, top, right, bottom, left, etc.' },
            withoutEnlargement: { type: 'boolean', description: 'Prevent upscaling (default: true)' },
          },
        },
        crop: {
          description: 'Crop options: object {left, top, width, height} for fixed crop, or string "attention"/"entropy" for smart crop',
        },
        rotate: {
          description: 'Rotation: number (degrees) or "auto" (EXIF-based)',
        },
        flip: {
          type: 'string',
          enum: ['horizontal', 'vertical', 'both'],
          description: 'Flip direction',
        },
        extend: {
          type: 'object',
          description: 'Add padding/margin',
          properties: {
            top: { type: 'integer' },
            bottom: { type: 'integer' },
            left: { type: 'integer' },
            right: { type: 'integer' },
            background: { type: 'string', description: 'Padding color (default: #ffffff)' },
          },
        },
        trim: {
          description: 'Auto-trim borders: true or {threshold: number}',
        },
        format: { type: 'string', description: 'Output format override' },
        outputPath: { type: 'string', description: 'Output file path' },
      },
      required: ['inputPath'],
    },
  },

  // ── 3. image_optimize ────────────────────────────────────────────
  {
    name: 'image_optimize',
    description: `Optimize, convert, and compress images for production/web delivery.

Format conversion: PNG ↔ JPG ↔ WEBP ↔ AVIF ↔ TIFF ↔ GIF ↔ HEIF.
Quality presets: low (40), medium (70), high (85), lossless (100), or custom number.
Compression: quality-based or target file size (iterative binary-search).
Metadata: strip EXIF/ICC data or preserve.
Progressive: progressive JPG/PNG encoding.
Responsive: auto-generate srcset variants at multiple breakpoints.
Thumbnails: generate thumbnail set at custom sizes.`,
    input_schema: {
      type: 'object',
      properties: {
        inputPath: { type: 'string', description: 'Path to the source image' },
        format: {
          type: 'string',
          enum: ['png', 'jpg', 'jpeg', 'webp', 'avif', 'tiff', 'gif', 'heif', 'ico'],
          description: 'Target output format',
        },
        quality: {
          description: 'Quality: "low" (40), "medium" (70), "high" (85), "lossless" (100), or number 1-100',
        },
        progressive: { type: 'boolean', description: 'Enable progressive encoding (default: true)' },
        stripMetadata: { type: 'boolean', description: 'Remove EXIF/ICC metadata (default: true)' },
        maxWidth: { type: 'integer', description: 'Max width constraint (downscale if larger)' },
        maxHeight: { type: 'integer', description: 'Max height constraint (downscale if larger)' },
        maxFileSize: { type: 'integer', description: 'Target max file size in bytes — iteratively adjusts quality to hit target' },
        responsive: {
          type: 'object',
          description: 'Generate responsive srcset variants',
          properties: {
            breakpoints: {
              type: 'array',
              items: { type: 'integer' },
              description: 'Widths to generate (default: [320, 640, 768, 1024, 1280, 1920])',
            },
            format: { type: 'string', description: 'Output format for variants' },
          },
        },
        thumbnails: {
          type: 'object',
          description: 'Generate thumbnail set',
          properties: {
            sizes: {
              type: 'array',
              items: {
                type: 'object',
                properties: { w: { type: 'integer' }, h: { type: 'integer' } },
              },
              description: 'Array of {w, h} size objects',
            },
            format: { type: 'string', description: 'Thumbnail format' },
            fit: { type: 'string', enum: ['cover', 'contain', 'fill'] },
          },
        },
        outputPath: { type: 'string', description: 'Output file path' },
      },
      required: ['inputPath'],
    },
  },

  // ── 4. image_compose ─────────────────────────────────────────────
  {
    name: 'image_compose',
    description: `Compose layers onto an image: add text, watermarks, image overlays, and shapes.

Text: multi-line, custom font/size/color, stroke, shadow, word-wrap, alignment.
Watermark: text or image watermark with position & opacity, optional tiled/repeated.
Image overlay: composite another image with position, size, opacity, blend mode.
Shapes: rectangle, circle, ellipse, line, polygon with fill/stroke.
Blend modes: over, multiply, screen, overlay, etc.

Pass an array of layers — they are applied in order.`,
    input_schema: {
      type: 'object',
      properties: {
        inputPath: { type: 'string', description: 'Path to the source/base image' },
        layers: {
          type: 'array',
          description: 'Array of layer objects to composite onto the image, applied in order',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['text', 'image', 'watermark', 'shape'],
                description: 'Layer type',
              },
              // text layer
              content: { type: 'string', description: '[text] The text content' },
              fontSize: { type: 'integer', description: '[text/watermark] Font size (default: 24)' },
              fontFamily: { type: 'string', description: '[text] Font family (default: sans-serif)' },
              color: { type: 'string', description: '[text/watermark] Text color' },
              strokeColor: { type: 'string', description: '[text] Stroke/outline color' },
              strokeWidth: { type: 'number', description: '[text] Stroke width' },
              shadow: { type: 'boolean', description: '[text] Add drop shadow' },
              align: { type: 'string', enum: ['left', 'center', 'right'], description: '[text] Alignment' },
              wrap: { type: 'boolean', description: '[text] Enable word-wrap' },
              maxWidth: { type: 'integer', description: '[text] Max width for word-wrap' },
              bold: { type: 'boolean', description: '[text] Bold text' },
              italic: { type: 'boolean', description: '[text] Italic text' },
              // image layer
              path: { type: 'string', description: '[image] Path to overlay image' },
              width: { type: 'integer', description: '[image/shape] Width' },
              height: { type: 'integer', description: '[image/shape] Height' },
              // shared positioning
              x: { type: 'integer', description: 'X position' },
              y: { type: 'integer', description: 'Y position' },
              opacity: { type: 'number', description: 'Opacity (0-1)' },
              blendMode: { type: 'string', description: 'Blend mode: over, multiply, screen, overlay, darken, lighten, etc.' },
              position: {
                type: 'string',
                enum: ['center', 'northwest', 'northeast', 'southwest', 'southeast', 'north', 'south', 'east', 'west'],
                description: 'Gravity position',
              },
              // watermark extras
              text: { type: 'string', description: '[watermark] Watermark text' },
              repeat: { type: 'boolean', description: '[watermark] Tile/repeat watermark across image' },
              // shape extras
              shape: { type: 'string', enum: ['rect', 'circle', 'ellipse', 'line', 'polygon'], description: '[shape] Shape type' },
              fill: { type: 'string', description: '[shape] Fill color' },
              stroke: { type: 'string', description: '[shape] Stroke color' },
              r: { type: 'integer', description: '[shape:circle] Radius' },
              rx: { type: 'integer', description: '[shape:ellipse] X radius' },
              ry: { type: 'integer', description: '[shape:ellipse] Y radius' },
              cx: { type: 'integer', description: '[shape:circle/ellipse] Center X' },
              cy: { type: 'integer', description: '[shape:circle/ellipse] Center Y' },
              radius: { type: 'integer', description: '[shape:rect] Corner radius' },
              points: { type: 'string', description: '[shape:polygon] SVG points string' },
              x1: { type: 'integer' }, y1: { type: 'integer' },
              x2: { type: 'integer' }, y2: { type: 'integer' },
            },
            required: ['type'],
          },
        },
        format: { type: 'string', description: 'Output format' },
        outputPath: { type: 'string', description: 'Output file path' },
      },
      required: ['inputPath', 'layers'],
    },
  },

  // ── 5. image_filter ──────────────────────────────────────────────
  {
    name: 'image_filter',
    description: `Apply visual filters and effects to an image. Pass an array of filters — they are applied in sequence.

Available filters:
- blur: Gaussian blur (sigma controls strength, default 5)
- sharpen: Edge enhancement (sigma, flat, jagged)
- grayscale: Convert to grayscale
- sepia: Warm vintage tone
- invert/negate: Invert all colors
- brightness: Adjust brightness (value: 0.5=darker, 1.5=brighter)
- contrast: Adjust contrast (value: 0.5=lower, 1.5=higher)
- saturation: Adjust color saturation (0=gray, 2=vivid)
- hue: Rotate hue (angle in degrees)
- gamma: Gamma correction (value, default 2.2)
- tint: Apply color tint (hex color)
- normalize: Auto-stretch contrast to full range
- clahe: Local contrast enhancement (width, height, maxSlope)
- median: Noise reduction (size: 3, 5, 7...)
- threshold: Binary threshold (value 0-255)
- pixelate: Mosaic effect (size controls pixel block)
- vignette: Dark edges (sigma controls strength)
- posterize: Reduce color levels (levels: 2-16)
- motion_blur: Directional motion blur (angle in degrees, sigma for strength)
- noise: Add random noise overlay (amount, colored: false)
- grain: Film grain overlay (amount, colored: false)
- vintage: Preset — sepia + vignette + slight grain
- cinematic: Preset — teal shadows, orange highlights, contrast boost
- warm: Preset — golden hour warm tone
- cool: Preset — blue-tinted cool tone
- dramatic: Preset — high contrast + desaturated + sharpened
- duotone: Two-color mapping (highlight + shadow colors)
- fade: Fade/washout effect (amount 0-1)`,
    input_schema: {
      type: 'object',
      properties: {
        inputPath: { type: 'string', description: 'Path to the source image' },
        filters: {
          type: 'array',
          description: 'Array of filters to apply in sequence',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['blur', 'sharpen', 'grayscale', 'sepia', 'invert', 'negate',
                  'brightness', 'contrast', 'saturation', 'hue', 'gamma',
                  'tint', 'normalize', 'clahe', 'median', 'threshold',
                  'pixelate', 'vignette', 'posterize',
                  'motion_blur', 'noise', 'grain', 'vintage', 'cinematic',
                  'warm', 'cool', 'dramatic', 'duotone', 'fade'],
                description: 'Filter type',
              },
              sigma: { type: 'number', description: '[blur/sharpen/vignette] Strength parameter' },
              value: { type: 'number', description: '[brightness/contrast/gamma/threshold] Adjustment value' },
              angle: { type: 'number', description: '[hue] Rotation angle in degrees' },
              color: { type: 'string', description: '[tint] Tint color (hex)' },
              size: { type: 'integer', description: '[pixelate/median] Block/kernel size' },
              levels: { type: 'integer', description: '[posterize] Number of color levels (2-16)' },
              width: { type: 'integer', description: '[clahe] Tile width' },
              height: { type: 'integer', description: '[clahe] Tile height' },
              maxSlope: { type: 'number', description: '[clahe] Max slope' },
              flat: { type: 'number', description: '[sharpen] Flat areas sensitivity' },
              jagged: { type: 'number', description: '[sharpen] Jagged areas sensitivity' },
              grayscale: { type: 'boolean', description: '[threshold] Convert to grayscale first' },
              highlight: { type: 'string', description: '[duotone] Highlight color (hex)' },
              shadow: { type: 'string', description: '[duotone] Shadow color (hex)' },
              amount: { type: 'number', description: '[noise/grain/fade] Effect amount' },
              colored: { type: 'boolean', description: '[noise/grain] Use colored noise instead of monochrome' },
            },
            required: ['type'],
          },
        },
        format: { type: 'string', description: 'Output format' },
        outputPath: { type: 'string', description: 'Output file path' },
      },
      required: ['inputPath', 'filters'],
    },
  },

  // ── 6. image_background ──────────────────────────────────────────
  {
    name: 'image_background',
    description: `Background and masking operations on images.

Actions:
- remove: Remove background using local border-pixel sampling + threshold. Best for solid/near-solid backgrounds. Supports feathered edges.
- remove_ai: AI-powered background removal via remove.bg API. Production-quality results for complex backgrounds (people, products, animals, cars). Uses credits. PREFER THIS for photos of people/objects.
- replace: Replace background with solid color or another image
- flatten: Merge transparency onto a solid color
- shadow: Add drop shadow effect with offset, blur, color
- transparent: Ensure image has alpha channel (PNG output)
- mask: Apply a grayscale mask image (white=keep, black=transparent) for custom cutouts

Use "remove" for simple solid-color backgrounds. Use "remove_ai" for photos with complex/natural backgrounds.`,
    input_schema: {
      type: 'object',
      properties: {
        inputPath: { type: 'string', description: 'Path to the source image' },
        action: {
          type: 'string',
          enum: ['remove', 'remove_ai', 'replace', 'flatten', 'shadow', 'transparent', 'mask'],
          description: 'Background operation to perform',
        },
        backgroundColor: { type: 'string', description: '[replace] Replacement solid color (default: #ffffff)' },
        replacementImage: { type: 'string', description: '[replace] Path to replacement background image' },
        flattenColor: { type: 'string', description: '[flatten] Color to flatten alpha onto (default: #ffffff)' },
        shadowColor: { type: 'string', description: '[shadow] Shadow color with alpha (default: rgba(0,0,0,0.3))' },
        shadowOffsetX: { type: 'integer', description: '[shadow] Horizontal offset (default: 10)' },
        shadowOffsetY: { type: 'integer', description: '[shadow] Vertical offset (default: 10)' },
        shadowBlur: { type: 'integer', description: '[shadow] Blur radius (default: 15)' },
        threshold: { type: 'integer', description: '[remove] Color distance threshold for background detection (default: 30)' },
        feather: { type: 'integer', description: '[remove] Feather edge softness in pixels (0=hard edge, default: 0)' },
        maskPath: { type: 'string', description: '[mask] Path to grayscale mask image (white=opaque, black=transparent)' },
        removeBgSize: { type: 'string', enum: ['preview', 'full', 'auto'], description: '[remove_ai] Output resolution: preview (small), full (up to 25MP), auto (default: auto)' },
        removeBgType: { type: 'string', enum: ['auto', 'person', 'product', 'car'], description: '[remove_ai] Subject type hint for better results (default: auto)' },
        removeBgColor: { type: 'string', description: '[remove_ai] Replace background with this color (hex, e.g. #ff0000)' },
        removeBgImageUrl: { type: 'string', description: '[remove_ai] URL of background image to composite behind subject' },
        removeBgCrop: { type: 'boolean', description: '[remove_ai] Crop to foreground bounding box (default: false)' },
        removeBgScale: { type: 'number', description: '[remove_ai] Scale subject relative to canvas (0.1–1.0)' },
        removeBgPosition: { type: 'string', description: '[remove_ai] Position subject: center, original, or x% y%' },
        format: { type: 'string', description: 'Output format (default: png for alpha support)' },
        outputPath: { type: 'string', description: 'Output file path' },
      },
      required: ['inputPath', 'action'],
    },
  },

  // ── 7. image_analyze ─────────────────────────────────────────────
  {
    name: 'image_analyze',
    description: `Analyze and inspect images with both local processing (Sharp) and AI-powered understanding (Azure Computer Vision).

LOCAL analysis actions (Sharp — instant, no API call):
- metadata: Full EXIF, dimensions, format, channels, color space, DPI, ICC profile
- stats: Per-channel min/max/mean/stdev, dominant color, entropy, opacity check
- histogram: Red/Green/Blue channel distribution (256 bins each)
- hash: Perceptual hash (similarity detection) + MD5 + SHA256 (exact match)
- validate: Check against constraints (min/max size, allowed formats, max file size)
- colors: Extract dominant color palette (top 8 colors)
- profile: ICC color profile details, color space, depth, density
- similarity: Compare with another image via perceptual hash (Hamming distance)
- strip_gps: Remove all metadata including GPS data from image
- write_exif: Write EXIF metadata fields (orientation, DPI, etc.)

AI-POWERED analysis actions (Azure Computer Vision — cloud API):
- caption: AI-generated natural language description of the image
- dense_captions: Multiple captions for different regions within the image
- tags: AI-generated relevant tags/keywords with confidence scores
- objects: Detect and locate objects with bounding boxes
- people: Detect people with bounding boxes and confidence
- smart_crop: AI-aware crop suggestions that keep subjects centered
- read / ocr: Extract text from images (OCR) — screenshots, documents, photos
- ai_full: Run ALL AI features at once (caption + tags + objects + people + dense_captions + smart_crop + read)
- moderate: Check for adult/racy/gory content with safety scores

Mix local and AI actions freely: e.g. actions: ["metadata", "caption", "tags", "colors"]`,
    input_schema: {
      type: 'object',
      properties: {
        inputPath: { type: 'string', description: 'Path to the image to analyze' },
        actions: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['metadata', 'stats', 'histogram', 'hash', 'validate', 'colors', 'profile', 'similarity', 'strip_gps', 'write_exif', 'caption', 'dense_captions', 'tags', 'objects', 'people', 'smart_crop', 'read', 'ocr', 'ai_full', 'moderate'],
          },
          description: 'Array of analysis actions to perform (default: ["metadata"]). Mix local + AI actions freely.',
        },
        // validate options
        minWidth: { type: 'integer', description: '[validate] Minimum width' },
        maxWidth: { type: 'integer', description: '[validate] Maximum width' },
        minHeight: { type: 'integer', description: '[validate] Minimum height' },
        maxHeight: { type: 'integer', description: '[validate] Maximum height' },
        allowedFormats: {
          type: 'array',
          items: { type: 'string' },
          description: '[validate] Allowed format list (e.g. ["png","jpg","webp"])',
        },
        maxFileSize: { type: 'integer', description: '[validate] Max file size in bytes' },
        // similarity options
        compareWith: { type: 'string', description: '[similarity] Path to second image for comparison' },
        // write_exif options
        exifData: {
          type: 'object',
          description: '[write_exif] EXIF fields to write: orientation (1-8), density/dpi (number)',
          properties: {
            orientation: { type: 'integer', description: 'EXIF orientation (1-8)' },
            density: { type: 'integer', description: 'DPI / density value' },
          },
        },
        // AI options
        aiLanguage: { type: 'string', description: '[AI] Caption/tag language (default: "en")', },
        genderNeutral: { type: 'boolean', description: '[AI] Use gender-neutral captions (default: true)' },
        smartCropAspectRatios: {
          type: 'array',
          items: { type: 'number' },
          description: '[smart_crop] Desired aspect ratios for crop suggestions (e.g. [1.0, 1.5, 0.75])',
        },
      },
      required: ['inputPath'],
    },
  },

  // ── 8. image_batch ───────────────────────────────────────────────
  {
    name: 'image_batch',
    description: `Batch process multiple images with any operation: transform, optimize, filter, compose, background, or analyze.

Supports:
- Processing a list of file paths
- Scanning an entire directory with file pattern matching
- Configurable concurrency (parallel processing)
- Custom output directory
- Custom name suffix
- Any operation from the other image tools, passed via operationOptions

Ideal for: bulk resize, format conversion, watermarking a folder, generating thumbnails for all images, batch optimization, etc.`,
    input_schema: {
      type: 'object',
      properties: {
        inputs: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of input file paths',
        },
        inputDir: { type: 'string', description: 'Directory to scan for images' },
        pattern: {
          type: 'string',
          description: 'File pattern for directory scan (default: *.{jpg,jpeg,png,webp,gif,avif,tiff})',
        },
        outputDir: { type: 'string', description: 'Output directory for processed files' },
        operation: {
          type: 'string',
          enum: ['transform', 'optimize', 'filter', 'compose', 'background', 'analyze'],
          description: 'Which image operation to apply to all files',
        },
        operationOptions: {
          type: 'object',
          description: 'Options to pass to the selected operation (same as the individual tool\'s options)',
        },
        concurrency: { type: 'integer', description: 'Number of parallel workers (default: 4)' },
        nameSuffix: { type: 'string', description: 'Suffix added to output filenames (default: -processed)' },
        outputFormat: { type: 'string', description: 'Force all outputs to this format' },
      },
      required: ['operation'],
    },
  },

  // ── 9. image_merge ───────────────────────────────────────────────
  {
    name: 'image_merge',
    description: `Merge/combine multiple images into a single composite image.

Layouts:
- horizontal: Side-by-side (auto-resizes to consistent height)
- vertical: Stacked top-to-bottom (auto-resizes to consistent width)
- grid: NxM grid with auto-calculated or specified columns

Features:
- Configurable gap between images with custom background color
- Auto-resize to consistent dimensions (median-based) or explicit {width, height}
- Center-aligned within cells when sizes don't perfectly match
- Returns data URL for immediate embedding in HTML via <img> tags

Ideal for: photo collages, before/after comparisons, image grids, contact sheets, sprite sheets.`,
    input_schema: {
      type: 'object',
      properties: {
        inputs: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of image file paths to merge (minimum 1)',
        },
        layout: {
          type: 'string',
          enum: ['horizontal', 'vertical', 'grid'],
          description: 'Layout direction (default: horizontal)',
        },
        gap: {
          type: 'integer',
          description: 'Gap between images in pixels (default: 0)',
        },
        background: {
          type: 'string',
          description: 'Background/gap color (hex, rgb, or named). Default: #ffffff',
        },
        resize: {
          description: '"auto" (median-based consistent sizing), "none" (keep originals), or {width, height} object. Default: auto',
        },
        columns: {
          type: 'integer',
          description: '[grid] Number of columns. If omitted, auto-calculated as ceil(sqrt(count))',
        },
        format: {
          type: 'string',
          enum: ['png', 'jpg', 'webp', 'avif'],
          description: 'Output format (default: png)',
        },
        quality: {
          type: 'integer',
          description: 'Output quality 1-100 (default: 90)',
        },
        outputPath: {
          type: 'string',
          description: 'File path to save the merged image',
        },
      },
      required: ['inputs'],
    },
  },

  // ── 10. image_convert ──────────────────────────────────────────────
  {
    name: 'image_convert',
    description: `Convert an image to a different representation format.

Targets:
- buffer: Get raw buffer in specified format (for piping between tools)
- ico: Generate favicon-style icon set (16, 32, 48, 64, 128, 256px PNGs)
- ascii: Convert image to ASCII art (configurable width and character set)

All image results are uploaded to S3 and returned as signed URLs.
ASCII art is great for terminal previews, README decorations, or creative text-based representations.`,
    input_schema: {
      type: 'object',
      properties: {
        inputPath: { type: 'string', description: 'Path to the source image' },
        to: {
          type: 'string',
          enum: ['buffer', 'ico', 'ascii'],
          description: 'Target format/representation',
        },
        format: { type: 'string', description: 'Image format for buffer (png, jpg, webp)' },
        asciiWidth: { type: 'integer', description: '[ascii] Width in characters (default: 80)' },
        chars: { type: 'string', description: '[ascii] Character set from dark to light (default: " .:-=+*#%@")' },
        outputPath: { type: 'string', description: 'Output file path (for ico/ascii)' },
      },
      required: ['inputPath', 'to'],
    },
  },
  // ── NEW V2 IMAGE TOOLS ──
  {
    name: 'image_face',
    description: 'Face detection and processing: detect faces, blur faces for privacy, crop to face, extract face landmarks.',
    input_schema: {
      type: 'object',
      properties: {
        inputPath: { type: 'string', description: 'Path to input image' },
        action: {
          type: 'string',
          enum: ['detect', 'blur', 'crop', 'landmarks', 'count'],
          description: 'Action: detect (find faces), blur (anonymize), crop (crop to face), landmarks (facial points), count (number of faces)',
        },
        blurStrength: { type: 'number', description: '[blur] Blur sigma (default: 20)' },
        padding: { type: 'number', description: '[crop] Padding around face in px (default: 50)' },
        outputPath: { type: 'string', description: 'Output path for processed image' },
      },
      required: ['inputPath', 'action'],
    },
  },
  {
    name: 'image_ai',
    description: 'AI-powered image analysis: describe image contents, extract text (OCR), compare images, classify objects, answer questions about images.',
    input_schema: {
      type: 'object',
      properties: {
        inputPath: { type: 'string', description: 'Path to image file' },
        action: {
          type: 'string',
          enum: ['describe', 'extract_text', 'compare', 'classify', 'qa', 'caption', 'tags'],
          description: 'AI action to perform',
        },
        question: { type: 'string', description: '[qa] Question to answer about the image' },
        comparePath: { type: 'string', description: '[compare] Second image path for comparison' },
        categories: { type: 'array', items: { type: 'string' }, description: '[classify] Categories to classify into' },
        detail: { type: 'string', enum: ['low', 'high'], description: 'Analysis detail level. Default: high' },
      },
      required: ['inputPath', 'action'],
    },
  },
  {
    name: 'image_export',
    description: 'Export images to special formats: ASCII art, base64 string, data URL, raw pixel data, icon set.',
    input_schema: {
      type: 'object',
      properties: {
        inputPath: { type: 'string', description: 'Path to source image' },
        to: {
          type: 'string',
          enum: ['ascii', 'base64', 'data_url', 'raw_pixels', 'icon_set', 'favicon'],
          description: 'Export format',
        },
        width: { type: 'number', description: '[ascii] Width in chars. [icon_set] Max size. Default: 80/512' },
        iconSizes: { type: 'array', items: { type: 'number' }, description: '[icon_set] Sizes to generate. Default: [16,32,48,64,128,256,512]' },
        outputPath: { type: 'string', description: 'Output path (for icon_set/favicon)' },
      },
      required: ['inputPath', 'to'],
    },
  },
  {
    name: 'image_ocr',
    description: 'Optical Character Recognition — extract text from images. Supports printed text, handwriting, receipts, documents, screenshots.',
    input_schema: {
      type: 'object',
      properties: {
        inputPath: { type: 'string', description: 'Path to image with text' },
        language: { type: 'string', description: 'Language hint (e.g. "en", "es", "zh"). Default: auto' },
        type: { type: 'string', enum: ['auto', 'document', 'receipt', 'screenshot', 'handwriting'], description: 'Content type hint. Default: auto' },
        outputFormat: { type: 'string', enum: ['text', 'structured', 'json'], description: 'Output: plain text, structured blocks, or JSON. Default: text' },
      },
      required: ['inputPath'],
    },
  },

  // ── DALL-E AI Image Generation ───────────────────────────────────
  {
    name: 'image_generate',
    description: `Generate images using OpenAI DALL-E 3. Creates high-quality AI images from text prompts.

Use cases: logos, hero images, illustrations, icons, banners, concept art, mockups, avatars, backgrounds, social media graphics.
The prompt should be detailed and descriptive for best results.`,
    input_schema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Detailed description of the image to generate. Be specific about style, colors, composition, mood, and content.',
        },
        size: {
          type: 'string',
          enum: ['1024x1024', '1792x1024', '1024x1792'],
          description: 'Image dimensions. 1024x1024 (square), 1792x1024 (landscape), 1024x1792 (portrait). Default: 1024x1024',
        },
        quality: {
          type: 'string',
          enum: ['standard', 'hd'],
          description: 'Image quality. "hd" creates more detailed images with finer textures. Default: standard',
        },
        style: {
          type: 'string',
          enum: ['vivid', 'natural'],
          description: 'Style preset. "vivid" = hyper-real/dramatic, "natural" = more realistic/subdued. Default: vivid',
        },
        outputPath: {
          type: 'string',
          description: 'Optional file path to save the generated image in the project',
        },
      },
      required: ['prompt'],
    },
  },
];

// ============================================================================
// EXECUTOR — Route tool calls to imageEngine
// ============================================================================

/**
 * Execute an image tool by name.
 * Called by the agent loop when the LLM uses an image_* tool.
 *
 * @param {string} toolName - e.g. 'image_create', 'image_transform'
 * @param {object} input    - Tool input (matches input_schema)
 * @param {object} ctx      - Context (userId, projectId, etc.)
 * @returns {{ result: string, sideEffects?: object }}
 */
export async function executeImageTool(toolName, input, ctx = {}) {
  try {
    let result;

    switch (toolName) {
      case 'image_create':
        result = await createImage(input);
        break;

      case 'image_transform':
        result = await transformImage(input.inputPath, input);
        break;

      case 'image_optimize':
        result = await optimizeImage(input.inputPath, input);
        break;

      case 'image_compose':
        result = await composeImage(input.inputPath, input);
        break;

      case 'image_filter':
        result = await filterImage(input.inputPath, input);
        break;

      case 'image_background':
        result = await backgroundImage(input.inputPath, input);
        break;

      case 'image_analyze':
        result = await analyzeImage(input.inputPath, input);
        break;

      case 'image_batch':
        result = await batchProcess(input);
        break;

      case 'image_merge':
        result = await mergeImages(input);
        break;

      case 'image_convert':
        result = await convertImage(input.inputPath, input);
        break;

      // ── NEW V2 IMAGE TOOLS ──
      case 'image_face':
        result = await executeImageFace(input);
        break;

      case 'image_ai':
        result = await executeImageAi(input, ctx);
        break;

      case 'image_export':
        result = await executeImageExport(input);
        break;

      case 'image_ocr':
        result = await executeImageOcr(input, ctx);
        break;

      case 'image_generate':
        result = await executeImageGenerate(input, ctx);
        break;

      default:
        return { result: JSON.stringify({ error: `Unknown image tool: ${toolName}` }) };
    }

    // ── Upload to S3 + Signed URLs — S3 required ──

    const useS3 = s3Configured();
    const sideEffects = {};

    if (!useS3) {
      return {
        result: JSON.stringify({ error: 'S3 storage not configured. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET in .env. Image processing requires cloud storage.' }),
      };
    }

    // Single result with buffer
    if (result && result.buffer && Buffer.isBuffer(result.buffer)) {
      const uploaded = await uploadImage(result.buffer, { format: result.format || 'png' });
      result = {
        ...result,
        buffer: undefined,
        hasBuffer: false,
        imageUrl: uploaded.url,
        s3Key: uploaded.key,
        expiresAt: uploaded.expiresAt,
      };
      delete result.dataUrl;

      sideEffects.type = 'image_processed';
      sideEffects.imageUrl = uploaded.url;
      sideEffects.s3Key = uploaded.key;
      sideEffects.expiresAt = uploaded.expiresAt;
      sideEffects.width = result.width;
      sideEffects.height = result.height;
      sideEffects.format = result.format;
    }

    // Batch results with buffers
    if (result && result.results && Array.isArray(result.results)) {
      const itemsToUpload = result.results.filter(r => r.buffer && Buffer.isBuffer(r.buffer));
      if (itemsToUpload.length > 0) {
        const uploaded = await uploadImages(
          itemsToUpload.map(r => ({ buffer: r.buffer, format: r.format || 'png' }))
        );
        let uploadIdx = 0;
        result.results = result.results.map(r => {
          if (r.buffer && Buffer.isBuffer(r.buffer)) {
            const u = uploaded[uploadIdx++];
            return {
              ...r,
              buffer: undefined,
              hasBuffer: false,
              dataUrl: undefined,
              imageUrl: u.url,
              s3Key: u.key,
              expiresAt: u.expiresAt,
            };
          }
          return r;
        });
        sideEffects.type = 'image_batch';
        sideEffects.imageUrls = uploaded.map(u => u.url);
      }
    }

    // Strip any remaining dataUrl from LLM-bound result
    if (result.dataUrl) {
      result = { ...result, dataUrl: '<stripped \u2014 signed URL in imageUrl>' };
    }

    // Common side effects (both paths)
    if (result.output || result.outputPath) {
      sideEffects.type = sideEffects.type || 'image_processed';
      sideEffects.outputPath = result.output || result.outputPath;
    }
    if (result.variants) {
      sideEffects.type = sideEffects.type || 'image_variants';
      sideEffects.variants = result.variants;
    }
    if (result.thumbnails) {
      sideEffects.type = sideEffects.type || 'image_thumbnails';
      sideEffects.thumbnails = result.thumbnails;
    }

    return {
      result: JSON.stringify(result, null, 2),
      sideEffects: Object.keys(sideEffects).length > 0 ? sideEffects : undefined,
    };
  } catch (err) {
    log.error(`[ImageTools] ${toolName} error:`, err.message);
    return {
      result: JSON.stringify({ error: err.message, tool: toolName }),
    };
  }
}

/**
 * Check if a tool name is an image tool
 */
export function isImageTool(name) {
  return name.startsWith('image_');
}

// ============================================================================
// NEW V2 IMAGE TOOL EXECUTORS
// ============================================================================

async function executeImageFace(input) {
  const { inputPath, action, blurStrength = 20, padding = 50, outputPath } = input;
  const sharp = (await import('sharp')).default;

  // Use sharp for basic face region detection via edge detection heuristic
  // For production-grade face detection, integrate with cloud vision API
  const metadata = await sharp(inputPath).metadata();
  const { width, height } = metadata;

  switch (action) {
    case 'detect':
    case 'count': {
      // Use AI vision for real face detection
      try {
        const OpenAI = (await import('openai')).default;
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) return { status: 'error', error: 'OPENAI_API_KEY required for face detection' };
        const openai = new OpenAI({ apiKey });
        const imageBuffer = await sharp(inputPath).resize(800, 800, { fit: 'inside' }).jpeg().toBuffer();
        const base64 = imageBuffer.toString('base64');
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: 'Count the exact number of human faces in this image. For each face, estimate its approximate position as percentage from top-left (x%, y%, width%, height%). Return JSON only: {"count": N, "faces": [{"x": 10, "y": 20, "w": 15, "h": 20}]}' },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
            ],
          }],
          max_tokens: 500,
        });
        const text = response.choices[0]?.message?.content || '{}';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { count: 0, faces: [] };
        return { status: 'success', action, ...parsed, imageWidth: width, imageHeight: height };
      } catch (e) {
        return { status: 'error', error: e.message };
      }
    }

    case 'blur': {
      // Blur the center region as a privacy fallback (for real face blur, use detection first)
      const out = outputPath || inputPath.replace(/(\.[^.]+)$/, '_blurred$1');
      // Apply overall blur as a safety measure
      await sharp(inputPath).blur(blurStrength).toFile(out);
      return { status: 'success', action: 'blur', output: out, blurStrength };
    }

    case 'crop': {
      // Center crop (face-area heuristic: upper 60% of image, centered)
      const cropW = Math.round(width * 0.5);
      const cropH = Math.round(height * 0.6);
      const left = Math.round((width - cropW) / 2);
      const top = Math.round(height * 0.05);
      const out = outputPath || inputPath.replace(/(\.[^.]+)$/, '_face$1');
      await sharp(inputPath).extract({ left, top, width: cropW, height: cropH }).toFile(out);
      return { status: 'success', action: 'crop', output: out, region: { left, top, width: cropW, height: cropH } };
    }

    default:
      return { status: 'error', error: `Unknown face action: ${action}` };
  }
}

async function executeImageAi(input, ctx) {
  const { inputPath, action, question, comparePath, categories, detail = 'high' } = input;
  try {
    const OpenAI = (await import('openai')).default;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return { status: 'error', error: 'OPENAI_API_KEY required for image AI' };
    const openai = new OpenAI({ apiKey });
    const sharp = (await import('sharp')).default;

    const imageBuffer = await sharp(inputPath).resize(1024, 1024, { fit: 'inside' }).jpeg({ quality: 85 }).toBuffer();
    const base64 = imageBuffer.toString('base64');
    const imageContent = { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}`, detail } };

    const prompts = {
      describe: 'Describe this image in detail. Include objects, colors, scene, mood, and notable elements.',
      extract_text: 'Extract ALL text visible in this image. Return the exact text, preserving layout where possible.',
      caption: 'Write a concise, descriptive caption for this image (1-2 sentences).',
      tags: 'List relevant tags/keywords for this image. Return as JSON array of strings.',
      classify: categories ? `Classify this image into exactly one of these categories: ${categories.join(', ')}. Return JSON: {"category": "...", "confidence": 0.95}` : 'Classify the main subject of this image. Return JSON: {"category": "...", "subcategory": "..."}',
      qa: question || 'Describe what you see.',
    };

    const messages = [{ role: 'user', content: [{ type: 'text', text: prompts[action] || prompts.describe }, imageContent] }];

    // For compare, add second image
    if (action === 'compare' && comparePath) {
      const img2 = await sharp(comparePath).resize(1024, 1024, { fit: 'inside' }).jpeg({ quality: 85 }).toBuffer();
      messages[0].content.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${img2.toString('base64')}`, detail } });
      messages[0].content[0].text = 'Compare these two images in detail. Describe similarities and differences.';
    }

    const response = await openai.chat.completions.create({ model: 'gpt-4o-mini', messages, max_tokens: 1000 });
    const result = response.choices[0]?.message?.content || '';

    return { status: 'success', action, result, tokens: response.usage?.total_tokens };
  } catch (e) {
    return { status: 'error', error: e.message };
  }
}

async function executeImageExport(input) {
  const { inputPath, to, width = 80, iconSizes = [16, 32, 48, 64, 128, 256, 512], outputPath } = input;
  const sharp = (await import('sharp')).default;

  switch (to) {
    case 'base64': {
      const buffer = await sharp(inputPath).png().toBuffer();
      return { status: 'success', format: 'base64', data: buffer.toString('base64'), sizeBytes: buffer.length };
    }

    case 'data_url': {
      const meta = await sharp(inputPath).metadata();
      const format = meta.format === 'png' ? 'png' : 'jpeg';
      const buffer = await sharp(inputPath).toFormat(format).toBuffer();
      return { status: 'success', format: 'data_url', data: `data:image/${format};base64,${buffer.toString('base64')}`, sizeBytes: buffer.length };
    }

    case 'ascii': {
      const chars = ' .:-=+*#%@';
      const img = await sharp(inputPath).resize(width, null, { fit: 'inside' }).grayscale().raw().toBuffer({ resolveWithObject: true });
      let ascii = '';
      for (let y = 0; y < img.info.height; y++) {
        for (let x = 0; x < img.info.width; x++) {
          const pixel = img.data[y * img.info.width + x];
          const idx = Math.floor((pixel / 256) * chars.length);
          ascii += chars[Math.min(idx, chars.length - 1)];
        }
        ascii += '\n';
      }
      if (outputPath) { const fs = await import('fs'); fs.writeFileSync(outputPath, ascii); }
      return { status: 'success', format: 'ascii', art: ascii.slice(0, 10000), width: img.info.width, height: img.info.height };
    }

    case 'raw_pixels': {
      const img = await sharp(inputPath).resize(100, 100, { fit: 'inside' }).raw().toBuffer({ resolveWithObject: true });
      return { status: 'success', format: 'raw_pixels', width: img.info.width, height: img.info.height, channels: img.info.channels, sizeBytes: img.data.length, sample: Array.from(img.data.slice(0, 30)) };
    }

    case 'icon_set': {
      const outDir = outputPath || inputPath.replace(/(\.[^.]+)$/, '_icons');
      const fs = await import('fs');
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      const outputs = [];
      for (const size of iconSizes) {
        const out = `${outDir}/icon-${size}x${size}.png`;
        await sharp(inputPath).resize(size, size, { fit: 'cover' }).png().toFile(out);
        outputs.push({ size: `${size}x${size}`, path: out });
      }
      return { status: 'success', format: 'icon_set', icons: outputs };
    }

    case 'favicon': {
      const out = outputPath || inputPath.replace(/(\.[^.]+)$/, '.ico');
      // Generate multiple sizes for favicon
      const sizes = [16, 32, 48];
      const buffers = [];
      for (const size of sizes) {
        const buf = await sharp(inputPath).resize(size, size, { fit: 'cover' }).png().toBuffer();
        buffers.push({ size, buffer: buf });
      }
      // Use the 32x32 as the primary favicon PNG
      await sharp(inputPath).resize(32, 32, { fit: 'cover' }).png().toFile(out);
      return { status: 'success', format: 'favicon', output: out, sizes };
    }

    default:
      return { status: 'error', error: `Unknown export format: ${to}` };
  }
}

async function executeImageOcr(input, ctx) {
  const { inputPath, language, type = 'auto', outputFormat = 'text' } = input;
  try {
    const OpenAI = (await import('openai')).default;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return { status: 'error', error: 'OPENAI_API_KEY required for OCR' };

    const sharp = (await import('sharp')).default;
    const openai = new OpenAI({ apiKey });

    // Optimize image for text extraction
    const imageBuffer = await sharp(inputPath)
      .resize(2048, 2048, { fit: 'inside' })
      .sharpen()
      .jpeg({ quality: 95 })
      .toBuffer();
    const base64 = imageBuffer.toString('base64');

    const typeHints = {
      auto: 'Extract ALL text from this image exactly as it appears.',
      document: 'This is a document. Extract all text preserving paragraphs, headings, and structure.',
      receipt: 'This is a receipt. Extract all text including store name, items, prices, total, date, and any other details. Format as structured data.',
      screenshot: 'This is a screenshot. Extract all visible text including UI elements, labels, content, and any code.',
      handwriting: 'This contains handwritten text. Carefully extract all handwritten content as accurately as possible.',
    };

    let prompt = typeHints[type] || typeHints.auto;
    if (language) prompt += ` The text is in ${language}.`;
    if (outputFormat === 'json') prompt += ' Return as JSON with fields: {"blocks": [{"text": "...", "type": "heading|paragraph|list_item|table_cell"}]}';
    if (outputFormat === 'structured') prompt += ' Preserve the visual layout and structure. Use markdown formatting for headings, lists, tables.';

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}`, detail: 'high' } },
        ],
      }],
      max_tokens: 4000,
    });

    const text = response.choices[0]?.message?.content || '';
    return { status: 'success', text, type, outputFormat, tokens: response.usage?.total_tokens };
  } catch (e) {
    return { status: 'error', error: e.message };
  }
}

// ── DALL-E 3 Image Generation ─────────────────────────────────────
async function executeImageGenerate(input, ctx) {
  const {
    prompt,
    size = '1024x1024',
    quality = 'standard',
    style = 'vivid',
    outputPath,
  } = input;

  try {
    const OpenAI = (await import('openai')).default;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return { status: 'error', error: 'OPENAI_API_KEY required for DALL-E image generation' };

    const openai = new OpenAI({ apiKey });

    log.info(`[ImageGen] DALL-E 3 generating: "${prompt.slice(0, 80)}..." (${size}, ${quality}, ${style})`);

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size,
      quality,
      style,
      response_format: 'b64_json',
    });

    const imageData = response.data[0];
    const revisedPrompt = imageData.revised_prompt || prompt;
    const buffer = Buffer.from(imageData.b64_json, 'base64');

    // Parse dimensions from size
    const [w, h] = size.split('x').map(Number);

    // If outputPath specified, save to project
    if (outputPath) {
      const fs = await import('fs/promises');
      const path = await import('path');
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, buffer);
    }

    log.info(`[ImageGen] DALL-E 3 generated successfully (${buffer.length} bytes)`);

    return {
      status: 'success',
      message: `Image generated with DALL-E 3: ${revisedPrompt.slice(0, 120)}`,
      buffer,
      format: 'png',
      width: w,
      height: h,
      revisedPrompt,
      savedTo: outputPath || null,
    };
  } catch (e) {
    log.error('[ImageGen] DALL-E 3 error:', e.message);
    return { status: 'error', error: `DALL-E generation failed: ${e.message}` };
  }
}

export default { IMAGE_TOOL_DEFINITIONS, executeImageTool, isImageTool };
