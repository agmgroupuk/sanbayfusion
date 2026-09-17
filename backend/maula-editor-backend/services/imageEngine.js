import { createLogger } from '../lib/logger.js';
const log = createLogger('imageEngine');
/**
 * IMAGE ENGINE — Core Image Processing Service
 * ==============================================================
 * Production-grade image processing using Sharp + canvas fallbacks.
 * Handles geometry, optimization, composition, filters, analysis,
 * background ops, batch processing & image creation from scratch.
 *
 * Dependencies: sharp (required), @napi-rs/canvas (optional for text)
 */

import path from 'path';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import crypto from 'crypto';

// ── Sharp (required) ──────────────────────────────────────────────
let sharp = null;
try {
  sharp = (await import('sharp')).default;
  log.info('[ImageEngine] Sharp loaded ✓');
} catch {
  log.warn('[ImageEngine] Sharp not installed — image processing unavailable. Run: npm i sharp');
}

// ============================================================================
// 1. IMAGE CREATION (non-AI, from-scratch)
// ============================================================================

export async function createImage(options = {}) {
  _requireSharp();
  const {
    width = 800,
    height = 600,
    background = '#ffffff',
    type = 'solid',          // solid | gradient | pattern | placeholder | noise | sprite
    format = 'png',
    text = null,              // optional text overlay on created image
    outputPath = null,
    // gradient options
    gradientFrom = '#000000',
    gradientTo = '#ffffff',
    gradientAngle = 0,       // degrees (0=top→bottom)
    // pattern options
    patternType = 'grid',    // grid | dots | stripes | checkerboard
    patternSize = 40,
    patternColor = '#cccccc',
    // placeholder options
    placeholderLabel = `${width}×${height}`,
    // sprite sheet options
    spriteInputs = [],       // array of image paths for sprite sheet
    spriteColumns = null,    // columns in sprite grid (auto = ceil(sqrt(n)))
    spritePadding = 0,       // padding between sprites
  } = options;

  let pipeline;

  switch (type) {
    case 'gradient': {
      const svg = _gradientSVG(width, height, gradientFrom, gradientTo, gradientAngle);
      pipeline = sharp(Buffer.from(svg));
      break;
    }
    case 'pattern': {
      const svg = _patternSVG(width, height, patternType, patternSize, patternColor, background);
      pipeline = sharp(Buffer.from(svg));
      break;
    }
    case 'placeholder': {
      const svg = _placeholderSVG(width, height, background, placeholderLabel);
      pipeline = sharp(Buffer.from(svg));
      break;
    }
    case 'noise': {
      // Create random pixel noise
      const channels = 4;
      const pixels = Buffer.alloc(width * height * channels);
      for (let i = 0; i < pixels.length; i += channels) {
        const v = Math.floor(Math.random() * 256);
        pixels[i] = v;
        pixels[i + 1] = v;
        pixels[i + 2] = v;
        pixels[i + 3] = 255;
      }
      pipeline = sharp(pixels, { raw: { width, height, channels } });
      break;
    }
    case 'sprite': {
      // Sprite sheet: arrange multiple images in a grid
      if (spriteInputs.length === 0) throw new Error('sprite type requires spriteInputs array');
      const cols = spriteColumns || Math.ceil(Math.sqrt(spriteInputs.length));
      const rows = Math.ceil(spriteInputs.length / cols);
      // Load all and resize to uniform cell
      const cellW = width;
      const cellH = height;
      const sheetW = cols * cellW + (cols - 1) * spritePadding;
      const sheetH = rows * cellH + (rows - 1) * spritePadding;
      const composites = [];
      for (let i = 0; i < spriteInputs.length; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const buf = await sharp(spriteInputs[i])
          .resize(cellW, cellH, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .ensureAlpha()
          .toBuffer();
        composites.push({
          input: buf,
          left: col * (cellW + spritePadding),
          top: row * (cellH + spritePadding),
        });
      }
      pipeline = sharp({
        create: { width: sheetW, height: sheetH, channels: 4, background: _parseColor(background) }
      }).composite(composites);
      // Override dimensions for return
      options._sheetW = sheetW;
      options._sheetH = sheetH;
      log.info(`[ImageEngine] Sprite sheet: ${spriteInputs.length} sprites in ${cols}x${rows} grid, ${sheetW}x${sheetH}`);
      break;
    }
    case 'solid':
    default: {
      pipeline = sharp({
        create: {
          width,
          height,
          channels: 4,
          background: _parseColor(background),
        },
      });
      break;
    }
  }

  // Optional text overlay on created image
  if (text) {
    const textSvg = _textSVG(width, height, text, '#000000', 32);
    pipeline = pipeline.composite([{ input: Buffer.from(textSvg), gravity: 'center' }]);
  }

  pipeline = _applyFormat(pipeline, format, { quality: 90 });

  if (outputPath) {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await pipeline.toFile(outputPath);
    const stat = await fs.stat(outputPath);
    const outBuffer = await fs.readFile(outputPath);
    return { output: outputPath, buffer: outBuffer, width, height, format, size: stat.size, type };
  }

  const buffer = await pipeline.toBuffer();
  return { buffer, width, height, format, size: buffer.length, type };
}

// ============================================================================
// 2. GEOMETRY & TRANSFORMATIONS
// ============================================================================

export async function transformImage(inputPath, options = {}) {
  _requireSharp();
  const {
    resize = null,        // { width, height, fit, position, withoutEnlargement, percentage }
    crop = null,          // { left, top, width, height } | 'center' | 'attention' | 'entropy'
    rotate = null,        // angle in degrees, or 'auto' (EXIF)
    flip = null,          // 'horizontal' | 'vertical' | 'both'
    extend = null,        // { top, bottom, left, right, background }
    trim = null,          // true or { threshold }
    format = null,        // output format override
    outputPath = null,
  } = options;

  let pipeline = sharp(inputPath);
  const metadata = await sharp(inputPath).metadata();

  // ── Rotate ──
  if (rotate !== null) {
    if (rotate === 'auto') {
      pipeline = pipeline.rotate(); // auto-rotate by EXIF
    } else {
      pipeline = pipeline.rotate(Number(rotate), { background: { r: 0, g: 0, b: 0, alpha: 0 } });
    }
  }

  // ── Flip ──
  if (flip) {
    if (flip === 'vertical' || flip === 'both') pipeline = pipeline.flip();
    if (flip === 'horizontal' || flip === 'both') pipeline = pipeline.flop();
  }

  // ── Resize ──
  if (resize) {
    let w = resize.width;
    let h = resize.height;
    if (resize.percentage) {
      w = Math.round((metadata.width || 800) * resize.percentage / 100);
      h = Math.round((metadata.height || 600) * resize.percentage / 100);
    }
    pipeline = pipeline.resize({
      width: w || undefined,
      height: h || undefined,
      fit: resize.fit || 'cover',               // cover, contain, fill, inside, outside
      position: resize.position || 'center',     // center, top, left, etc.
      withoutEnlargement: resize.withoutEnlargement !== false,
    });
  }

  // ── Crop (extract) ──
  if (crop) {
    if (typeof crop === 'object' && crop.left !== undefined) {
      pipeline = pipeline.extract({
        left: crop.left,
        top: crop.top,
        width: crop.width,
        height: crop.height,
      });
    } else if (crop === 'attention' || crop === 'entropy') {
      // Smart crop — resize with attention strategy
      pipeline = pipeline.resize({
        width: resize?.width || Math.round((metadata.width || 800) * 0.8),
        height: resize?.height || Math.round((metadata.height || 600) * 0.8),
        fit: 'cover',
        position: crop,
      });
    }
  }

  // ── Extend (add padding/margin) ──
  if (extend) {
    pipeline = pipeline.extend({
      top: extend.top || 0,
      bottom: extend.bottom || 0,
      left: extend.left || 0,
      right: extend.right || 0,
      background: _parseColor(extend.background || '#ffffff'),
    });
  }

  // ── Trim ──
  if (trim) {
    const threshold = typeof trim === 'object' ? trim.threshold : 10;
    pipeline = pipeline.trim({ threshold });
  }

  // ── Output ──
  const outFormat = format || path.extname(inputPath).slice(1).toLowerCase() || 'png';
  pipeline = _applyFormat(pipeline, outFormat, { quality: 90 });

  return _finalize(pipeline, inputPath, outputPath, outFormat, 'transform');
}

// ============================================================================
// 3. FORMAT, ENCODING & OPTIMIZATION
// ============================================================================

export async function optimizeImage(inputPath, options = {}) {
  _requireSharp();
  const {
    format = null,           // target format (png, jpg, webp, avif, tiff, gif)
    quality = 'medium',      // low | medium | high | lossless | number (1-100)
    progressive = true,      // progressive JPG/PNG
    stripMetadata = true,    // remove EXIF, ICC, etc.
    maxWidth = null,
    maxHeight = null,
    maxFileSize = null,      // target file size in bytes (iterative)
    responsive = null,       // { breakpoints: [320,640,...], format, quality }
    thumbnails = null,       // { sizes: [{w,h},...], format, fit }
    outputPath = null,
  } = options;

  const qualityPresets = {
    low: 40,
    medium: 70,
    high: 85,
    lossless: 100,
  };
  const q = typeof quality === 'number' ? quality : (qualityPresets[quality] || 70);

  // If responsive variants requested — generate set
  if (responsive) {
    return _generateResponsive(inputPath, responsive, q, format);
  }

  // If thumbnails requested — generate set
  if (thumbnails) {
    return _generateThumbnails(inputPath, thumbnails, q, format);
  }

  let pipeline = sharp(inputPath);

  // Strip metadata
  if (stripMetadata) pipeline = pipeline.withMetadata(false);
  else pipeline = pipeline.withMetadata();

  // Resize if max dimensions
  if (maxWidth || maxHeight) {
    pipeline = pipeline.resize({
      width: maxWidth || undefined,
      height: maxHeight || undefined,
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  const outFormat = format || path.extname(inputPath).slice(1).toLowerCase() || 'webp';
  pipeline = _applyFormat(pipeline, outFormat, { quality: q, progressive });

  // Target file size — iterative quality reduction
  if (maxFileSize) {
    return _targetFileSize(inputPath, outFormat, maxFileSize, q, outputPath, {
      maxWidth, maxHeight, stripMetadata
    });
  }

  return _finalize(pipeline, inputPath, outputPath, outFormat, 'optimize');
}

// ============================================================================
// 4. TEXT, OVERLAYS & COMPOSITION
// ============================================================================

export async function composeImage(inputPath, options = {}) {
  _requireSharp();
  const {
    layers = [],       // [{ type, ...opts }]
    // layer types:
    //   text: { type:'text', content, x, y, fontSize, fontFamily, color, strokeColor, strokeWidth, shadow, align, wrap, maxWidth }
    //   image: { type:'image', path, x, y, width, height, opacity, blendMode }
    //   watermark: { type:'watermark', text, position, opacity, fontSize, color, repeat }
    //   shape: { type:'shape', shape:'rect'|'circle'|'line', ... }
    outputPath = null,
    format = null,
  } = options;

  let pipeline = sharp(inputPath);
  const metadata = await sharp(inputPath).metadata();
  const imgW = metadata.width || 800;
  const imgH = metadata.height || 600;

  const composites = [];

  for (const layer of layers) {
    switch (layer.type) {
      case 'text': {
        const svg = _textSVG(
          imgW, imgH,
          layer.content || 'Text',
          layer.color || '#ffffff',
          layer.fontSize || 24,
          {
            fontFamily: layer.fontFamily || 'sans-serif',
            strokeColor: layer.strokeColor,
            strokeWidth: layer.strokeWidth,
            shadow: layer.shadow,
            align: layer.align || 'center',
            x: layer.x,
            y: layer.y,
            maxWidth: layer.maxWidth,
            wrap: layer.wrap,
            bold: layer.bold,
            italic: layer.italic,
          }
        );
        composites.push({
          input: Buffer.from(svg),
          gravity: layer.position || 'center',
          blend: layer.blendMode || 'over',
        });
        break;
      }

      case 'image': {
        let overlayPipeline = sharp(layer.path);
        if (layer.width || layer.height) {
          overlayPipeline = overlayPipeline.resize({
            width: layer.width || undefined,
            height: layer.height || undefined,
            fit: 'inside',
          });
        }
        let overlayBuf = await overlayPipeline.ensureAlpha().toBuffer();
        // Apply opacity
        if (layer.opacity !== undefined && layer.opacity < 1) {
          overlayBuf = await sharp(overlayBuf)
            .ensureAlpha()
            .composite([{
              input: Buffer.from([0, 0, 0, Math.round(layer.opacity * 255)]),
              raw: { width: 1, height: 1, channels: 4 },
              tile: true,
              blend: 'dest-in',
            }])
            .toBuffer();
        }
        composites.push({
          input: overlayBuf,
          left: layer.x || 0,
          top: layer.y || 0,
          blend: layer.blendMode || 'over',
        });
        break;
      }

      case 'watermark': {
        if (layer.imagePath) {
          // ── Image watermark ──
          const wmOpacity = layer.opacity !== undefined ? layer.opacity : 0.4;
          const wmWidth = layer.width || Math.round(imgW * 0.2);
          const wmHeight = layer.height || null;

          if (layer.repeat) {
            // Tiled image watermark — resize, apply opacity, tile across canvas
            let wmBuf = await sharp(layer.imagePath)
              .resize({ width: wmWidth, height: wmHeight || undefined, fit: 'inside' })
              .ensureAlpha()
              .toBuffer({ resolveWithObject: true });
            // Apply opacity
            if (wmOpacity < 1) {
              wmBuf.data = await sharp(wmBuf.data)
                .ensureAlpha()
                .composite([{
                  input: Buffer.from([0, 0, 0, Math.round(wmOpacity * 255)]),
                  raw: { width: 1, height: 1, channels: 4 },
                  tile: true,
                  blend: 'dest-in',
                }])
                .toBuffer();
              wmBuf.info = await sharp(wmBuf.data).metadata();
            }
            // Tile: create full-size canvas with repeated watermark
            const tileW = (wmBuf.info.width || wmWidth) + (layer.gap || 40);
            const tileH = (wmBuf.info.height || wmWidth) + (layer.gap || 40);
            // Create tiled composite by repeating across canvas
            const tiles = [];
            for (let ty = 0; ty < imgH; ty += tileH) {
              for (let tx = 0; tx < imgW; tx += tileW) {
                tiles.push({ input: wmBuf.data, left: tx, top: ty, blend: 'over' });
              }
            }
            // Build watermark layer as separate image, then composite
            const wmCanvas = await sharp({
              create: { width: imgW, height: imgH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
            }).composite(tiles).png().toBuffer();
            composites.push({ input: wmCanvas, gravity: 'northwest', blend: 'over' });
          } else {
            // Single-position image watermark
            let overlayPipeline = sharp(layer.imagePath)
              .resize({ width: wmWidth, height: wmHeight || undefined, fit: 'inside' })
              .ensureAlpha();
            let overlayBuf = await overlayPipeline.toBuffer();
            if (wmOpacity < 1) {
              overlayBuf = await sharp(overlayBuf)
                .ensureAlpha()
                .composite([{
                  input: Buffer.from([0, 0, 0, Math.round(wmOpacity * 255)]),
                  raw: { width: 1, height: 1, channels: 4 },
                  tile: true,
                  blend: 'dest-in',
                }])
                .toBuffer();
            }
            composites.push({
              input: overlayBuf,
              gravity: layer.position || 'southeast',
              blend: layer.blendMode || 'over',
            });
          }
        } else {
          // ── Text watermark (SVG) ──
          const wmText = layer.text || '© Watermark';
          const wmFontSize = layer.fontSize || 20;
          const wmColor = layer.color || 'rgba(255,255,255,0.4)';
          const wmOpacity = layer.opacity || 0.4;

          if (layer.repeat) {
            const tileSvg = _tiledWatermarkSVG(imgW, imgH, wmText, wmFontSize, wmColor, wmOpacity);
            composites.push({
              input: Buffer.from(tileSvg),
              gravity: 'northwest',
              blend: 'over',
            });
          } else {
            const posSvg = _watermarkSVG(imgW, imgH, wmText, wmFontSize, wmColor, wmOpacity, layer.position || 'southeast');
            composites.push({
              input: Buffer.from(posSvg),
              gravity: 'northwest',
              blend: 'over',
            });
          }
        }
        break;
      }

      case 'shape': {
        const shapeSvg = _shapeSVG(imgW, imgH, layer);
        composites.push({
          input: Buffer.from(shapeSvg),
          gravity: 'northwest',
          blend: layer.blendMode || 'over',
        });
        break;
      }
    }
  }

  if (composites.length > 0) {
    pipeline = pipeline.composite(composites);
  }

  const outFormat = format || path.extname(inputPath).slice(1).toLowerCase() || 'png';
  pipeline = _applyFormat(pipeline, outFormat, { quality: 90 });

  return _finalize(pipeline, inputPath, outputPath, outFormat, 'compose');
}

// ============================================================================
// 5. FILTERS & EFFECTS
// ============================================================================

export async function filterImage(inputPath, options = {}) {
  _requireSharp();
  const {
    filters = [],         // [{ type, ...opts }]
    // filter types:
    //   blur: { type:'blur', sigma: 5 }
    //   sharpen: { type:'sharpen', sigma: 1, flat: 1, jagged: 2 }
    //   grayscale: { type:'grayscale' }
    //   sepia: { type:'sepia' }
    //   invert: { type:'invert' } (negate)
    //   brightness: { type:'brightness', value: 1.2 }
    //   contrast: { type:'contrast', value: 1.5 }
    //   saturation: { type:'saturation', value: 0.5 }
    //   hue: { type:'hue', angle: 90 }
    //   gamma: { type:'gamma', value: 2.2 }
    //   tint: { type:'tint', color: '#ff0000' }
    //   normalize: { type:'normalize' }
    //   clahe: { type:'clahe', width: 3, height: 3, maxSlope: 3 }
    //   median: { type:'median', size: 3 }
    //   threshold: { type:'threshold', value: 128, grayscale: true }
    //   pixelate: { type:'pixelate', size: 10 }
    //   vignette: { type:'vignette', sigma: 5 }
    //   posterize: { type:'posterize', levels: 4 }
    //   motion_blur: { type:'motion_blur', angle: 0, sigma: 10 }
    //   noise: { type:'noise', amount: 30 }
    //   vintage: { type:'vintage' }
    //   cinematic: { type:'cinematic' }
    //   warm: { type:'warm' }
    //   cool: { type:'cool' }
    //   dramatic: { type:'dramatic' }
    //   duotone: { type:'duotone', highlight: '#ff0000', shadow: '#0000ff' }
    //   fade: { type:'fade', amount: 0.3 }
    //   grain: { type:'grain', amount: 30, colored: false }
    outputPath = null,
    format = null,
  } = options;

  let pipeline = sharp(inputPath);
  const metadata = await sharp(inputPath).metadata();
  const imgW = metadata.width || 800;
  const imgH = metadata.height || 600;

  for (const filter of filters) {
    switch (filter.type) {
      case 'blur':
        pipeline = pipeline.blur(filter.sigma || 5);
        break;

      case 'sharpen':
        pipeline = pipeline.sharpen({
          sigma: filter.sigma || 1,
          m1: filter.flat || 1.0,
          m2: filter.jagged || 2.0,
        });
        break;

      case 'grayscale':
      case 'greyscale':
        pipeline = pipeline.grayscale();
        break;

      case 'sepia': {
        // Sepia via recomb matrix
        pipeline = pipeline.recomb([
          [0.393, 0.769, 0.189],
          [0.349, 0.686, 0.168],
          [0.272, 0.534, 0.131],
        ]);
        break;
      }

      case 'invert':
      case 'negate':
        pipeline = pipeline.negate({ alpha: false });
        break;

      case 'brightness': {
        // brightness via linear: a * pixel + b
        const b = filter.value || 1.0;
        pipeline = pipeline.linear(b, 0);
        break;
      }

      case 'contrast': {
        // contrast via linear
        const c = filter.value || 1.0;
        const intercept = 128 * (1 - c);
        pipeline = pipeline.linear(c, intercept);
        break;
      }

      case 'saturation': {
        // Approximate saturation adjust via modulate
        pipeline = pipeline.modulate({ saturation: filter.value || 1.0 });
        break;
      }

      case 'hue': {
        pipeline = pipeline.modulate({ hue: filter.angle || 0 });
        break;
      }

      case 'gamma':
        pipeline = pipeline.gamma(filter.value || 2.2);
        break;

      case 'tint':
        pipeline = pipeline.tint(_parseColor(filter.color || '#ff0000'));
        break;

      case 'normalize':
        pipeline = pipeline.normalize();
        break;

      case 'clahe':
        pipeline = pipeline.clahe({
          width: filter.width || 3,
          height: filter.height || 3,
          maxSlope: filter.maxSlope || 3,
        });
        break;

      case 'median':
        pipeline = pipeline.median(filter.size || 3);
        break;

      case 'threshold':
        pipeline = pipeline.threshold(filter.value || 128, {
          grayscale: filter.grayscale !== false,
        });
        break;

      case 'pixelate': {
        const pxSize = filter.size || 10;
        const smallW = Math.max(1, Math.round(imgW / pxSize));
        const smallH = Math.max(1, Math.round(imgH / pxSize));
        pipeline = pipeline
          .resize(smallW, smallH, { kernel: 'nearest' })
          .resize(imgW, imgH, { kernel: 'nearest' });
        break;
      }

      case 'vignette': {
        // Dark oval overlay
        const sigma = filter.sigma || 5;
        const svg = `<svg width="${imgW}" height="${imgH}">
          <defs>
            <radialGradient id="v" cx="50%" cy="50%" r="60%">
              <stop offset="60%" stop-color="rgba(0,0,0,0)"/>
              <stop offset="100%" stop-color="rgba(0,0,0,${Math.min(sigma / 10, 0.8)})"/>
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#v)"/>
        </svg>`;
        pipeline = pipeline.composite([{ input: Buffer.from(svg), blend: 'multiply' }]);
        break;
      }

      case 'posterize': {
        const levels = filter.levels || 4;
        const step = 256 / levels;
        // Use a LUT approach via threshold at each level
        // Sharp doesn't have native posterize — use convolve + threshold combination
        // Simplest: convert to limited palette via quantization hint
        pipeline = pipeline.png({ palette: true, colours: levels * levels * levels, dither: 0 });
        break;
      }

      case 'motion_blur': {
        // Simulate motion blur using a directional kernel
        const angle = filter.angle || 0;
        const sigma = filter.sigma || 10;
        // For simplicity: first apply regular blur, then sharpen in perpendicular direction
        // More accurate: create a 1D kernel rotated by angle
        const kSize = Math.max(3, Math.min(25, Math.round(sigma) * 2 + 1));
        // Build linear kernel along angle
        const rad = (angle * Math.PI) / 180;
        const kernel = new Array(kSize * kSize).fill(0);
        const center = Math.floor(kSize / 2);
        for (let i = 0; i < kSize; i++) {
          const dx = Math.round((i - center) * Math.cos(rad));
          const dy = Math.round((i - center) * Math.sin(rad));
          const kx = center + dx;
          const ky = center + dy;
          if (kx >= 0 && kx < kSize && ky >= 0 && ky < kSize) {
            kernel[ky * kSize + kx] = 1;
          }
        }
        const sum = kernel.reduce((s, v) => s + v, 0) || 1;
        const scale = 1 / sum;
        pipeline = pipeline.convolve({
          width: kSize, height: kSize,
          kernel: kernel.map(v => v * scale),
          scale: 1, offset: 0,
        });
        break;
      }

      case 'noise': {
        // Add random noise as an overlay
        const amount = filter.amount || 30;
        const colored = filter.colored || false;
        const noiseChannels = 4;
        const noisePixels = Buffer.alloc(imgW * imgH * noiseChannels);
        for (let i = 0; i < noisePixels.length; i += noiseChannels) {
          const n = Math.floor((Math.random() - 0.5) * amount * 2);
          if (colored) {
            noisePixels[i] = 128 + Math.floor((Math.random() - 0.5) * amount * 2);
            noisePixels[i + 1] = 128 + Math.floor((Math.random() - 0.5) * amount * 2);
            noisePixels[i + 2] = 128 + Math.floor((Math.random() - 0.5) * amount * 2);
          } else {
            const v = 128 + n;
            noisePixels[i] = v;
            noisePixels[i + 1] = v;
            noisePixels[i + 2] = v;
          }
          noisePixels[i + 3] = Math.min(255, Math.abs(n) * 4); // visible noise
        }
        const noiseBuf = await sharp(noisePixels, { raw: { width: imgW, height: imgH, channels: noiseChannels } })
          .png().toBuffer();
        pipeline = pipeline.composite([{ input: noiseBuf, blend: 'over' }]);
        break;
      }

      case 'grain': {
        // Film grain overlay (monochrome or colored)
        const grainAmount = filter.amount || 30;
        const grainColored = filter.colored || false;
        const gch = 4;
        const grainPx = Buffer.alloc(imgW * imgH * gch);
        for (let i = 0; i < grainPx.length; i += gch) {
          const g = Math.floor((Math.random() - 0.5) * grainAmount * 2);
          if (grainColored) {
            grainPx[i] = 128 + Math.floor((Math.random() - 0.5) * grainAmount * 2);
            grainPx[i + 1] = 128 + Math.floor((Math.random() - 0.5) * grainAmount * 2);
            grainPx[i + 2] = 128 + Math.floor((Math.random() - 0.5) * grainAmount * 2);
          } else {
            const v = 128 + g;
            grainPx[i] = v; grainPx[i + 1] = v; grainPx[i + 2] = v;
          }
          grainPx[i + 3] = Math.min(80, Math.abs(g) * 3); // subtle
        }
        const grainBuf = await sharp(grainPx, { raw: { width: imgW, height: imgH, channels: gch } })
          .png().toBuffer();
        pipeline = pipeline.composite([{ input: grainBuf, blend: 'overlay' }]);
        break;
      }

      case 'vintage': {
        // Vintage preset: sepia + slight contrast boost + vignette + grain
        pipeline = pipeline
          .recomb([[0.393, 0.769, 0.189], [0.349, 0.686, 0.168], [0.272, 0.534, 0.131]])
          .linear(1.1, -10)
          .modulate({ saturation: 0.8 });
        // Add vignette
        const vSvg = `<svg width="${imgW}" height="${imgH}"><defs><radialGradient id="v" cx="50%" cy="50%" r="60%"><stop offset="50%" stop-color="rgba(0,0,0,0)"/><stop offset="100%" stop-color="rgba(0,0,0,0.5)"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#v)"/></svg>`;
        pipeline = pipeline.composite([{ input: Buffer.from(vSvg), blend: 'multiply' }]);
        break;
      }

      case 'cinematic': {
        // Cinematic: teal shadows + orange highlights, contrast boost, letterbox feel
        pipeline = pipeline
          .linear(1.2, -15)
          .modulate({ saturation: 0.9, brightness: 0.95 })
          .recomb([[1.1, 0, 0.05], [0, 0.9, 0.1], [0, 0.1, 1.1]]);
        break;
      }

      case 'warm': {
        // Warm tone (golden hour)
        pipeline = pipeline
          .modulate({ saturation: 1.2 })
          .tint({ r: 255, g: 200, b: 150 })
          .linear(1.05, 5);
        break;
      }

      case 'cool': {
        // Cool/blue tone
        pipeline = pipeline
          .modulate({ saturation: 0.9 })
          .tint({ r: 150, g: 200, b: 255 })
          .linear(1.05, -5);
        break;
      }

      case 'dramatic': {
        // High contrast + desaturated
        pipeline = pipeline
          .linear(1.5, -40)
          .modulate({ saturation: 0.7 })
          .sharpen({ sigma: 1.5, m1: 1, m2: 3 });
        break;
      }

      case 'duotone': {
        // Two-color map: shadow_color → highlight_color
        const highlight = _parseColor(filter.highlight || '#ff6600');
        const shadow = _parseColor(filter.shadow || '#330066');
        // Grayscale first, then map range
        pipeline = pipeline.grayscale()
          .linear(
            [(highlight.r - shadow.r) / 255, (highlight.g - shadow.g) / 255, (highlight.b - shadow.b) / 255],
            [shadow.r, shadow.g, shadow.b]
          );
        break;
      }

      case 'fade': {
        // Fade/washout effect — lift blacks, reduce contrast
        const fadeAmount = filter.amount || 0.3;
        const liftValue = Math.round(fadeAmount * 80);
        pipeline = pipeline
          .linear(1 - fadeAmount * 0.3, liftValue)
          .modulate({ saturation: 1 - fadeAmount * 0.4 });
        break;
      }

      default:
        log.warn(`[ImageEngine] Unknown filter: ${filter.type}`);
    }
  }

  const outFormat = format || path.extname(inputPath).slice(1).toLowerCase() || 'png';
  pipeline = _applyFormat(pipeline, outFormat, { quality: 90 });

  return _finalize(pipeline, inputPath, outputPath, outFormat, 'filter');
}

// ============================================================================
// 6. BACKGROUND & MASKING
// ============================================================================

export async function backgroundImage(inputPath, options = {}) {
  _requireSharp();
  const {
    action = 'remove',       // remove | remove_ai | replace | flatten | shadow | mask
    backgroundColor = '#ffffff',
    replacementImage = null,  // path to replacement background
    // shadow options
    shadowColor = 'rgba(0,0,0,0.3)',
    shadowOffsetX = 10,
    shadowOffsetY = 10,
    shadowBlur = 15,
    // flatten: merge alpha onto solid color
    flattenColor = '#ffffff',
    // feather edge on bg removal
    feather = 0,
    // mask: path to a grayscale mask image (white=keep, black=transparent)
    maskPath = null,
    outputPath = null,
    format = null,
  } = options;

  let pipeline = sharp(inputPath);
  const metadata = await sharp(inputPath).metadata();
  const imgW = metadata.width || 800;
  const imgH = metadata.height || 600;

  switch (action) {
    case 'remove': {
      // Background removal via border-pixel sampling + threshold
      // Samples pixels from all 4 edges to determine background color,
      // then removes pixels within threshold distance of that color.
      // Works well for solid/near-solid backgrounds — not AI-based.
      const removeThreshold = options.threshold || 30;
      const rawBuf = await sharp(inputPath)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const { data: rawPixels, info: rawInfo } = rawBuf;
      const rw = rawInfo.width;
      const rh = rawInfo.height;
      const rch = rawInfo.channels;

      // Sample border pixels (top row, bottom row, left col, right col)
      const borderSamples = [];
      for (let x = 0; x < rw; x++) {
        // top row
        const tIdx = x * rch;
        borderSamples.push([rawPixels[tIdx], rawPixels[tIdx + 1], rawPixels[tIdx + 2]]);
        // bottom row
        const bIdx = ((rh - 1) * rw + x) * rch;
        borderSamples.push([rawPixels[bIdx], rawPixels[bIdx + 1], rawPixels[bIdx + 2]]);
      }
      for (let y = 1; y < rh - 1; y++) {
        // left col
        const lIdx = (y * rw) * rch;
        borderSamples.push([rawPixels[lIdx], rawPixels[lIdx + 1], rawPixels[lIdx + 2]]);
        // right col
        const rIdx = (y * rw + rw - 1) * rch;
        borderSamples.push([rawPixels[rIdx], rawPixels[rIdx + 1], rawPixels[rIdx + 2]]);
      }

      // Find median border color (more robust than mean)
      const sorted = (ch) => borderSamples.map(s => s[ch]).sort((a, b) => a - b);
      const mid = Math.floor(borderSamples.length / 2);
      const bgR = sorted(0)[mid];
      const bgG = sorted(1)[mid];
      const bgB = sorted(2)[mid];

      // Zero out alpha for pixels within threshold of detected background
      const outPixels = Buffer.from(rawPixels);
      for (let i = 0; i < outPixels.length; i += rch) {
        const dr = outPixels[i] - bgR;
        const dg = outPixels[i + 1] - bgG;
        const db = outPixels[i + 2] - bgB;
        const dist = Math.sqrt(dr * dr + dg * dg + db * db);
        if (dist < removeThreshold) {
          outPixels[i + 3] = 0; // transparent
        }
      }

      pipeline = sharp(outPixels, { raw: { width: rw, height: rh, channels: rch } });
      // Feathered edges: blur the alpha channel for soft transitions
      if (feather > 0) {
        const { data: alphaRaw, info: alphaInfo } = await sharp(outPixels, { raw: { width: rw, height: rh, channels: rch } })
          .extractChannel(3).raw().toBuffer({ resolveWithObject: true });
        const blurredAlpha = await sharp(alphaRaw, { raw: { width: rw, height: rh, channels: 1 } })
          .blur(feather).raw().toBuffer();
        for (let i = 0; i < outPixels.length; i += rch) {
          outPixels[i + 3] = blurredAlpha[i / rch];
        }
        pipeline = sharp(outPixels, { raw: { width: rw, height: rh, channels: rch } });
      }

      log.info(`[ImageEngine] Background removed — border-sampled bg rgb(${bgR},${bgG},${bgB}), threshold=${removeThreshold}${feather > 0 ? `, feather=${feather}` : ''}`);
      break;
    }

    case 'remove_ai': {
      // AI-powered background removal via remove.bg API
      // Works for complex backgrounds: people, products, animals, cars, etc.
      let removeBg;
      try {
        removeBg = (await import('./removeBg.js')).default;
      } catch (err) {
        throw new Error('remove.bg service not available: ' + err.message);
      }

      if (!removeBg.isConfigured()) {
        throw new Error('REMOVE_BG_API_KEY not configured. Set it in .env to use AI background removal.');
      }

      const removeBgResult = await removeBg.removeBackground(inputPath, {
        size: options.removeBgSize || 'auto',
        type: options.removeBgType || 'auto',
        format: format || 'png',
        bgColor: options.removeBgColor || null,
        bgImageUrl: options.removeBgImageUrl || null,
        crop: options.removeBgCrop || false,
        cropMargin: options.removeBgCropMargin || null,
        scale: options.removeBgScale || null,
        position: options.removeBgPosition || null,
        outputPath,
      });

      // Return in _finalize-compatible shape
      return {
        input: inputPath,
        output: outputPath || null,
        buffer: removeBgResult.buffer,
        format: removeBgResult.format,
        operation: 'background',
        method: 'remove.bg',
        originalSize: removeBgResult.originalSize,
        outputSize: removeBgResult.outputSize,
        width: removeBgResult.width,
        height: removeBgResult.height,
        removeBgMeta: removeBgResult.removeBgMeta,
      };
    }

    case 'replace': {
      if (replacementImage) {
        // Composite: replacement bg (resized) + foreground
        const bgBuffer = await sharp(replacementImage)
          .resize(imgW, imgH, { fit: 'cover' })
          .toBuffer();

        const fgBuffer = await sharp(inputPath).ensureAlpha().toBuffer();

        pipeline = sharp(bgBuffer)
          .composite([{ input: fgBuffer, blend: 'over' }]);
      } else {
        // Replace with solid color
        pipeline = pipeline.flatten({ background: _parseColor(backgroundColor) });
      }
      break;
    }

    case 'flatten': {
      pipeline = pipeline.flatten({ background: _parseColor(flattenColor) });
      break;
    }

    case 'shadow': {
      // Create drop shadow effect
      const shadow = `<svg width="${imgW + 40}" height="${imgH + 40}">
        <defs>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="${shadowOffsetX}" dy="${shadowOffsetY}" stdDeviation="${shadowBlur}" flood-color="${shadowColor}"/>
          </filter>
        </defs>
        <rect x="20" y="20" width="${imgW}" height="${imgH}" fill="transparent" filter="url(#shadow)"/>
      </svg>`;

      const shadowBuf = await sharp(Buffer.from(shadow))
        .resize(imgW + 40, imgH + 40)
        .toBuffer();

      const originalBuf = await sharp(inputPath).ensureAlpha().toBuffer();

      pipeline = sharp(shadowBuf)
        .composite([{ input: originalBuf, left: 20, top: 20, blend: 'over' }]);
      break;
    }

    case 'transparent': {
      // Ensure output has alpha channel
      pipeline = pipeline.ensureAlpha();
      break;
    }

    case 'mask': {
      // Apply a grayscale mask image: white=opaque, black=transparent
      if (!maskPath) throw new Error('mask action requires maskPath');
      // Resize mask to match source, extract as single channel, use as alpha
      const maskBuf = await sharp(maskPath)
        .resize(imgW, imgH, { fit: 'fill' })
        .grayscale()
        .raw()
        .toBuffer();
      // Get source as raw RGBA
      const srcRaw = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const src = srcRaw.data;
      const sch = srcRaw.info.channels;
      for (let y = 0; y < imgH; y++) {
        for (let x = 0; x < imgW; x++) {
          const srcIdx = (y * imgW + x) * sch;
          const maskIdx = y * imgW + x;
          src[srcIdx + 3] = maskBuf[maskIdx]; // replace alpha with mask value
        }
      }
      pipeline = sharp(src, { raw: { width: imgW, height: imgH, channels: sch } });
      log.info(`[ImageEngine] Mask applied from ${maskPath}`);
      break;
    }
  }

  const outFormat = format || 'png'; // default PNG for alpha
  pipeline = _applyFormat(pipeline, outFormat, { quality: 90 });

  return _finalize(pipeline, inputPath, outputPath, outFormat, 'background');
}

// ============================================================================
// 7. METADATA & ANALYSIS
// ============================================================================

export async function analyzeImage(inputPath, options = {}) {
  _requireSharp();
  const {
    actions = ['metadata'],
    // action types:
    //   metadata — EXIF, dimensions, format, channels, color space
    //   stats — pixel statistics, dominant colors
    //   histogram — color distribution
    //   hash — perceptual hash for similarity
    //   validate — integrity, aspect ratio, min/max size checks
    //   profile — ICC color profile info
    //   similarity — compare with another image (compareWith path required)
    //   strip_gps — remove GPS data, return cleaned image
    //   write_exif — write EXIF fields (exifData object required)
    // validate options
    minWidth = null,
    maxWidth = null,
    minHeight = null,
    maxHeight = null,
    allowedFormats = null,
    maxFileSize = null,
    // similarity options
    compareWith = null,
    // write_exif options
    exifData = null,
  } = options;

  const results = {};

  for (const action of actions) {
    switch (action) {
      case 'metadata': {
        const meta = await sharp(inputPath).metadata();
        const stat = await fs.stat(inputPath);
        results.metadata = {
          format: meta.format,
          width: meta.width,
          height: meta.height,
          channels: meta.channels,
          space: meta.space,                  // srgb, adobergb, etc.
          depth: meta.depth,                  // bit depth
          density: meta.density,              // DPI
          hasAlpha: meta.hasAlpha,
          isAnimated: (meta.pages || 1) > 1,
          pages: meta.pages || 1,
          orientation: meta.orientation,
          chromaSubsampling: meta.chromaSubsampling,
          size: stat.size,
          aspectRatio: meta.width && meta.height ? +(meta.width / meta.height).toFixed(4) : null,
        };
        // EXIF data
        if (meta.exif) {
          try {
            results.metadata.exif = {
              present: true,
              raw: `${meta.exif.length} bytes`,
            };
          } catch { results.metadata.exif = { present: true }; }
        }
        // ICC profile
        if (meta.icc) {
          results.metadata.icc = { present: true, size: meta.icc.length };
        }
        break;
      }

      case 'stats': {
        const stats = await sharp(inputPath).stats();
        results.stats = {
          channels: stats.channels.map((ch, i) => ({
            channel: ['red', 'green', 'blue', 'alpha'][i] || `ch${i}`,
            min: ch.min,
            max: ch.max,
            sum: ch.sum,
            mean: +ch.mean.toFixed(2),
            stdev: +ch.stdev.toFixed(2),
            squaresSum: ch.squaresSum,
            minX: ch.minX,
            minY: ch.minY,
            maxX: ch.maxX,
            maxY: ch.maxY,
          })),
          isOpaque: stats.isOpaque,
          dominant: stats.dominant,
          entropy: stats.entropy,
        };
        break;
      }

      case 'histogram': {
        // Generate histogram by sampling
        const raw = await sharp(inputPath)
          .resize(256, 256, { fit: 'inside' })
          .raw()
          .toBuffer({ resolveWithObject: true });

        const hist = { red: new Array(256).fill(0), green: new Array(256).fill(0), blue: new Array(256).fill(0) };
        const pixels = raw.data;
        const channels = raw.info.channels;
        for (let i = 0; i < pixels.length; i += channels) {
          hist.red[pixels[i]]++;
          hist.green[pixels[i + 1]]++;
          hist.blue[pixels[i + 2]]++;
        }
        results.histogram = hist;
        break;
      }

      case 'hash': {
        // Perceptual hash (pHash-style: resize to 8x8 grayscale, DCT)
        const tiny = await sharp(inputPath)
          .resize(8, 8, { fit: 'fill' })
          .grayscale()
          .raw()
          .toBuffer();

        const avg = tiny.reduce((s, v) => s + v, 0) / tiny.length;
        let hash = '';
        for (const v of tiny) hash += v >= avg ? '1' : '0';

        // Also compute MD5 of file for exact match
        const fileBuffer = await fs.readFile(inputPath);
        const md5 = crypto.createHash('md5').update(fileBuffer).digest('hex');
        const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');

        results.hash = {
          perceptual: hash,
          perceptualHex: parseInt(hash, 2).toString(16).padStart(16, '0'),
          md5,
          sha256,
        };
        break;
      }

      case 'validate': {
        const meta = await sharp(inputPath).metadata();
        const stat = await fs.stat(inputPath);
        const issues = [];

        if (minWidth && meta.width < minWidth) issues.push(`Width ${meta.width} < min ${minWidth}`);
        if (maxWidth && meta.width > maxWidth) issues.push(`Width ${meta.width} > max ${maxWidth}`);
        if (minHeight && meta.height < minHeight) issues.push(`Height ${meta.height} < min ${minHeight}`);
        if (maxHeight && meta.height > maxHeight) issues.push(`Height ${meta.height} > max ${maxHeight}`);
        if (allowedFormats && !allowedFormats.includes(meta.format)) {
          issues.push(`Format ${meta.format} not in allowed: ${allowedFormats.join(', ')}`);
        }
        if (maxFileSize && stat.size > maxFileSize) {
          issues.push(`File size ${stat.size} > max ${maxFileSize}`);
        }

        results.validate = {
          valid: issues.length === 0,
          issues,
          width: meta.width,
          height: meta.height,
          format: meta.format,
          size: stat.size,
        };
        break;
      }

      case 'colors': {
        // Extract dominant colors by sampling
        const { dominant } = await sharp(inputPath).stats();

        // Sample palette by resizing to small and extracting unique colors
        const smallBuf = await sharp(inputPath)
          .resize(16, 16, { fit: 'cover' })
          .raw()
          .toBuffer({ resolveWithObject: true });

        const colorMap = {};
        const px = smallBuf.data;
        const ch = smallBuf.info.channels;
        for (let i = 0; i < px.length; i += ch) {
          const key = `${px[i]},${px[i + 1]},${px[i + 2]}`;
          colorMap[key] = (colorMap[key] || 0) + 1;
        }

        const palette = Object.entries(colorMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([rgb, count]) => {
            const [r, g, b] = rgb.split(',').map(Number);
            return {
              hex: `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`,
              rgb: { r, g, b },
              frequency: count,
            };
          });

        results.colors = { dominant, palette };
        break;
      }

      case 'profile': {
        const meta = await sharp(inputPath).metadata();
        results.profile = {
          colorSpace: meta.space || 'unknown',
          depth: meta.depth || 'unknown',
          density: meta.density || null,
          hasICC: !!meta.icc,
          iccSize: meta.icc ? meta.icc.length : 0,
          chromaSubsampling: meta.chromaSubsampling || null,
          isProgressive: meta.isProgressive || false,
          hasAlpha: !!meta.hasAlpha,
          channels: meta.channels,
        };
        break;
      }

      case 'similarity': {
        if (!compareWith) throw new Error('similarity action requires compareWith path');
        // Compute pHash for both images and calculate Hamming distance
        const getHash = async (p) => {
          const tiny = await sharp(p).resize(8, 8, { fit: 'fill' }).grayscale().raw().toBuffer();
          const avg = tiny.reduce((s, v) => s + v, 0) / tiny.length;
          let hash = '';
          for (const v of tiny) hash += v >= avg ? '1' : '0';
          return hash;
        };
        const hashA = await getHash(inputPath);
        const hashB = await getHash(compareWith);
        let hamming = 0;
        for (let i = 0; i < hashA.length; i++) {
          if (hashA[i] !== hashB[i]) hamming++;
        }
        const similarity = +((1 - hamming / hashA.length) * 100).toFixed(2);
        results.similarity = {
          imageA: inputPath,
          imageB: compareWith,
          hashA: parseInt(hashA, 2).toString(16).padStart(16, '0'),
          hashB: parseInt(hashB, 2).toString(16).padStart(16, '0'),
          hammingDistance: hamming,
          similarityPercent: similarity,
          verdict: similarity > 95 ? 'near-identical' : similarity > 80 ? 'similar' : similarity > 50 ? 'somewhat-similar' : 'different',
        };
        break;
      }

      case 'strip_gps': {
        // Re-save the image without EXIF orientation issues, stripping all metadata
        const stripped = await sharp(inputPath).withMetadata({ orientation: undefined }).rotate().toBuffer();
        results.strip_gps = {
          input: inputPath,
          size: stripped.length,
          message: 'All metadata including GPS stripped. Image re-saved without EXIF.',
        };
        // If outputPath requested, save;
        if (options.outputPath) {
          const outFmt = options.format || path.extname(inputPath).slice(1).toLowerCase() || 'jpg';
          let p = sharp(inputPath).rotate().withMetadata(false);
          p = _applyFormat(p, outFmt, { quality: 95 });
          await p.toFile(options.outputPath);
          results.strip_gps.output = options.outputPath;
        }
        break;
      }

      case 'write_exif': {
        // Sharp's withMetadata can write limited EXIF fields
        if (!exifData) throw new Error('write_exif action requires exifData object');
        const outFmt = options.format || path.extname(inputPath).slice(1).toLowerCase() || 'jpg';
        const metaOpts = {};
        if (exifData.orientation) metaOpts.orientation = exifData.orientation;
        if (exifData.density || exifData.dpi) metaOpts.density = exifData.density || exifData.dpi;
        // Pass through any EXIF the user provides
        if (exifData.exif) metaOpts.exif = exifData.exif;
        let p = sharp(inputPath).withMetadata(metaOpts);
        p = _applyFormat(p, outFmt, { quality: 95 });
        const outPath = options.outputPath || inputPath.replace(/(\.[^.]+)$/, '-exif$1');
        await p.toFile(outPath);
        results.write_exif = {
          input: inputPath,
          output: outPath,
          fieldsWritten: Object.keys(metaOpts),
          message: 'EXIF metadata written successfully.',
        };
        break;
      }

      // ── AI-POWERED ACTIONS (Azure Computer Vision) ──────────────────

      case 'caption':
      case 'dense_captions':
      case 'tags':
      case 'objects':
      case 'people':
      case 'smart_crop':
      case 'read':
      case 'ocr': {
        const azureVision = await _loadAzureVision();
        if (!azureVision) {
          results[action] = { error: 'Azure Computer Vision not configured. Set AZURE_CV_ENDPOINT + AZURE_CV_KEY in .env' };
          break;
        }
        const feature = action === 'ocr' ? 'read' : action;
        const aiResult = await azureVision.analyzeImage(inputPath, {
          features: [feature],
          language: options.aiLanguage || 'en',
          genderNeutral: options.genderNeutral !== false,
          smartCropAspectRatios: options.smartCropAspectRatios || [1.0],
        });
        // Merge AI results
        Object.assign(results, aiResult);
        break;
      }

      case 'ai_full': {
        // Run all AI features at once (caption + tags + objects + people + dense_captions + smart_crop + read)
        const azureVision = await _loadAzureVision();
        if (!azureVision) {
          results.ai_full = { error: 'Azure Computer Vision not configured.' };
          break;
        }
        const aiResult = await azureVision.analyzeImage(inputPath, {
          features: ['caption', 'dense_captions', 'tags', 'objects', 'people', 'smart_crop', 'read'],
          language: options.aiLanguage || 'en',
          genderNeutral: options.genderNeutral !== false,
          smartCropAspectRatios: options.smartCropAspectRatios || [1.0, 1.5, 0.75],
        });
        Object.assign(results, aiResult);
        break;
      }

      case 'moderate': {
        const azureVision = await _loadAzureVision();
        if (!azureVision) {
          results.moderate = { error: 'Azure Computer Vision not configured.' };
          break;
        }
        results.moderate = await azureVision.moderateImage(inputPath);
        break;
      }
    }
  }

  return { input: inputPath, ...results };
}

// ============================================================================
// 8. BATCH PROCESSING
// ============================================================================

export async function batchProcess(options = {}) {
  _requireSharp();
  const {
    inputs = [],           // array of file paths
    inputDir = null,       // directory to scan
    pattern = '*.{jpg,jpeg,png,webp,gif,avif,tiff}',
    outputDir = null,      // output directory (default: same dir with suffix)
    operation = 'optimize', // transform | optimize | filter | compose | analyze
    operationOptions = {},  // options passed to the operation
    concurrency = 4,
    nameSuffix = '-processed',
    preserveStructure = true,
    outputFormat = null,     // force output format
    onProgress = null,       // callback(current, total, result)
  } = options;

  // Gather input files
  let files = [...inputs];
  if (inputDir) {
    const dirFiles = await _globDir(inputDir, pattern);
    files = files.concat(dirFiles);
  }

  if (files.length === 0) {
    return { processed: 0, failed: 0, results: [], errors: [], message: 'No files to process' };
  }

  const results = [];
  const errors = [];
  let completed = 0;

  // Process in concurrent batches
  const opFn = {
    transform: transformImage,
    optimize: optimizeImage,
    filter: filterImage,
    compose: composeImage,
    background: backgroundImage,
    analyze: analyzeImage,
  }[operation] || optimizeImage;

  for (let i = 0; i < files.length; i += concurrency) {
    const batch = files.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map(async (filePath) => {
        const ext = path.extname(filePath);
        const baseName = path.basename(filePath, ext);
        const outExt = outputFormat ? `.${outputFormat}` : ext;
        const outPath = outputDir
          ? path.join(outputDir, `${baseName}${nameSuffix}${outExt}`)
          : filePath.replace(ext, `${nameSuffix}${outExt}`);

        if (outputDir) {
          await fs.mkdir(outputDir, { recursive: true });
        }

        const opts = {
          ...operationOptions,
          outputPath: operation !== 'analyze' ? outPath : undefined,
          format: outputFormat || operationOptions.format,
        };

        return await opFn(filePath, opts);
      })
    );

    for (const result of batchResults) {
      completed++;
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        errors.push({ file: batch[results.length + errors.length - completed + batch.length], error: result.reason?.message || 'Unknown error' });
      }
      if (onProgress) onProgress(completed, files.length, result);
    }
  }

  // Summary
  const totalOriginal = results.reduce((s, r) => s + (r.originalSize || 0), 0);
  const totalOutput = results.reduce((s, r) => s + (r.outputSize || r.size || 0), 0);

  return {
    processed: results.length,
    failed: errors.length,
    total: files.length,
    totalOriginalSize: totalOriginal,
    totalOutputSize: totalOutput,
    savings: totalOriginal > 0 ? `${((1 - totalOutput / totalOriginal) * 100).toFixed(1)}%` : '0%',
    results,
    errors,
  };
}

// ============================================================================
// 9. IMAGE CONVERSION (Image → Other formats)
// ============================================================================

export async function convertImage(inputPath, options = {}) {
  _requireSharp();
  const {
    to = 'buffer',           // buffer | ico | ascii
    format = null,            // target format for buffer conversion
    outputPath = null,
  } = options;

  switch (to) {
    case 'base64':
    case 'data-url':
      // base64/data-url removed — use S3 URLs instead. Redirect to buffer.
      log.warn(`[ImageEngine] convertImage to=${to} is deprecated — use buffer + S3 upload`);
    // fall through to buffer
    case 'buffer': {
      const fmt = format || path.extname(inputPath).slice(1).toLowerCase() || 'png';
      let pipeline = sharp(inputPath);
      pipeline = _applyFormat(pipeline, fmt, { quality: 90 });
      const buffer = await pipeline.toBuffer();
      return { input: inputPath, buffer, format: fmt, size: buffer.length };
    }

    case 'ico': {
      // Generate ICO-style by creating multiple sizes
      const sizes = [16, 32, 48, 64, 128, 256];
      const variants = [];
      for (const s of sizes) {
        const buf = await sharp(inputPath).resize(s, s, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
        variants.push({ size: s, buffer: buf });
        if (outputPath) {
          const icoPath = outputPath.replace(/\.[^.]+$/, `-${s}.png`);
          await fs.writeFile(icoPath, buf);
        }
      }
      return { input: inputPath, variants: variants.map(v => ({ size: v.size, bytes: v.buffer.length })), format: 'ico-set' };
    }

    case 'ascii': {
      // Convert image to ASCII art
      const asciiWidth = options.asciiWidth || 80;
      const asciiHeight = options.asciiHeight || null;
      const chars = options.chars || ' .:-=+*#%@';
      const raw = await sharp(inputPath)
        .resize(asciiWidth, asciiHeight || undefined, { fit: 'inside' })
        .grayscale()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const px = raw.data;
      const w = raw.info.width;
      const h = raw.info.height;
      let ascii = '';
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const brightness = px[y * w + x];
          const charIdx = Math.floor((brightness / 256) * chars.length);
          ascii += chars[Math.min(charIdx, chars.length - 1)];
        }
        ascii += '\n';
      }
      if (outputPath) {
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        await fs.writeFile(outputPath, ascii);
      }
      return { input: inputPath, ascii, width: w, height: h, format: 'ascii', size: ascii.length };
    }

    default:
      throw new Error(`Unsupported conversion target: ${to}`);
  }
}


// ============================================================================
// PRIVATE HELPERS
// ============================================================================

function _requireSharp() {
  if (!sharp) throw new Error('Sharp is not installed. Run: npm install sharp');
}

// Lazy-load Azure Vision (only when AI actions are requested)
let _azureVisionModule = null;
async function _loadAzureVision() {
  if (_azureVisionModule !== null) return _azureVisionModule;
  try {
    const mod = await import('./azureVision.js');
    if (mod.isConfigured()) {
      _azureVisionModule = mod;
      log.info('[ImageEngine] Azure Computer Vision loaded ✓');
      return mod;
    }
    _azureVisionModule = false;
    log.warn('[ImageEngine] Azure CV keys not set — AI image analysis unavailable');
    return null;
  } catch (err) {
    _azureVisionModule = false;
    log.warn('[ImageEngine] Azure Vision module not found:', err.message);
    return null;
  }
}

function _parseColor(color) {
  if (typeof color === 'object') return color;
  if (typeof color === 'string') {
    if (color.startsWith('rgba')) {
      const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]*)\)/);
      if (m) return { r: +m[1], g: +m[2], b: +m[3], alpha: m[4] ? +m[4] : 1 };
    }
    if (color.startsWith('rgb')) {
      const m = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (m) return { r: +m[1], g: +m[2], b: +m[3], alpha: 1 };
    }
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      if (hex.length === 3) {
        return { r: parseInt(hex[0] + hex[0], 16), g: parseInt(hex[1] + hex[1], 16), b: parseInt(hex[2] + hex[2], 16), alpha: 1 };
      }
      if (hex.length >= 6) {
        return { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16), alpha: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1 };
      }
    }
    // Named colors — common ones
    const namedColors = {
      white: { r: 255, g: 255, b: 255, alpha: 1 },
      black: { r: 0, g: 0, b: 0, alpha: 1 },
      red: { r: 255, g: 0, b: 0, alpha: 1 },
      green: { r: 0, g: 128, b: 0, alpha: 1 },
      blue: { r: 0, g: 0, b: 255, alpha: 1 },
      transparent: { r: 0, g: 0, b: 0, alpha: 0 },
    };
    if (namedColors[color.toLowerCase()]) return namedColors[color.toLowerCase()];
  }
  return { r: 255, g: 255, b: 255, alpha: 1 };
}

function _applyFormat(pipeline, format, opts = {}) {
  const q = opts.quality || 80;
  const progressive = opts.progressive !== false;

  switch (format) {
    case 'jpg': case 'jpeg':
      return pipeline.jpeg({ quality: q, progressive, mozjpeg: true });
    case 'png':
      return pipeline.png({ quality: q, progressive, compressionLevel: 6 });
    case 'webp':
      return pipeline.webp({ quality: q, effort: 4 });
    case 'avif':
      return pipeline.avif({ quality: q, effort: 4 });
    case 'tiff':
      return pipeline.tiff({ quality: q });
    case 'gif':
      return pipeline.gif();
    case 'heif':
      return pipeline.heif({ quality: q });
    default:
      return pipeline.png({ quality: q });
  }
}

async function _finalize(pipeline, inputPath, outputPath, format, operation) {
  const originalStat = await fs.stat(inputPath).catch(() => ({ size: 0 }));

  if (outputPath) {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    const info = await pipeline.toFile(outputPath);
    const outStat = await fs.stat(outputPath);
    // Read file back as buffer for S3 upload or dataUrl generation downstream
    const outBuffer = await fs.readFile(outputPath);
    return {
      input: inputPath,
      output: outputPath,
      buffer: outBuffer,
      format,
      operation,
      originalSize: originalStat.size,
      outputSize: outStat.size,
      width: info.width,
      height: info.height,
      savings: originalStat.size > 0 ? `${((1 - outStat.size / originalStat.size) * 100).toFixed(1)}%` : '0%',
    };
  }

  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
  return {
    input: inputPath,
    buffer: data,
    format,
    operation,
    originalSize: originalStat.size,
    outputSize: data.length,
    size: data.length,
    width: info.width,
    height: info.height,
  };
}

async function _generateResponsive(inputPath, responsive, quality, defaultFormat) {
  const breakpoints = responsive.breakpoints || [320, 640, 768, 1024, 1280, 1920];
  const format = responsive.format || defaultFormat || 'webp';
  const results = [];

  for (const width of breakpoints) {
    try {
      const outPath = inputPath.replace(/\.[^.]+$/, `-${width}w.${format}`);
      let pipeline = sharp(inputPath)
        .resize({ width, withoutEnlargement: true })
        .withMetadata(false);
      pipeline = _applyFormat(pipeline, format, { quality });
      const info = await pipeline.toFile(outPath);
      const stat = await fs.stat(outPath);
      results.push({
        width, output: outPath, size: stat.size,
        height: info.height, srcset: `${outPath} ${width}w`,
      });
    } catch (e) {
      log.warn(`[ImageEngine] Responsive ${width}w failed: ${e.message}`);
    }
  }

  return {
    input: inputPath,
    operation: 'responsive',
    format,
    variants: results,
    srcsetString: results.map(r => r.srcset).join(', '),
  };
}

async function _generateThumbnails(inputPath, thumbnails, quality, defaultFormat) {
  const sizes = thumbnails.sizes || [{ w: 150, h: 150 }, { w: 300, h: 300 }, { w: 600, h: 600 }];
  const format = thumbnails.format || defaultFormat || 'webp';
  const fit = thumbnails.fit || 'cover';
  const results = [];

  for (const sz of sizes) {
    try {
      const label = `${sz.w}x${sz.h}`;
      const outPath = inputPath.replace(/\.[^.]+$/, `-thumb-${label}.${format}`);
      let pipeline = sharp(inputPath)
        .resize({ width: sz.w, height: sz.h, fit, withoutEnlargement: true })
        .withMetadata(false);
      pipeline = _applyFormat(pipeline, format, { quality });
      await pipeline.toFile(outPath);
      const stat = await fs.stat(outPath);
      results.push({ label, width: sz.w, height: sz.h, output: outPath, size: stat.size });
    } catch (e) {
      log.warn(`[ImageEngine] Thumb ${sz.w}x${sz.h} failed: ${e.message}`);
    }
  }

  return { input: inputPath, operation: 'thumbnails', format, thumbnails: results };
}

async function _targetFileSize(inputPath, format, targetBytes, startQuality, outputPath, opts = {}) {
  let lo = 10, hi = startQuality;
  let bestBuffer = null;
  let bestQ = startQuality;

  for (let iter = 0; iter < 8; iter++) {
    const q = Math.round((lo + hi) / 2);
    let pipeline = sharp(inputPath);
    if (opts.stripMetadata !== false) pipeline = pipeline.withMetadata(false);
    if (opts.maxWidth || opts.maxHeight) {
      pipeline = pipeline.resize({
        width: opts.maxWidth || undefined,
        height: opts.maxHeight || undefined,
        fit: 'inside',
        withoutEnlargement: true,
      });
    }
    pipeline = _applyFormat(pipeline, format, { quality: q });
    const buf = await pipeline.toBuffer();

    if (buf.length <= targetBytes) {
      bestBuffer = buf;
      bestQ = q;
      lo = q + 1;
    } else {
      hi = q - 1;
    }
  }

  if (!bestBuffer) {
    // Even at lowest quality couldn't hit target — return lowest
    let pipeline = sharp(inputPath).withMetadata(false);
    pipeline = _applyFormat(pipeline, format, { quality: 10 });
    bestBuffer = await pipeline.toBuffer();
    bestQ = 10;
  }

  const originalStat = await fs.stat(inputPath);
  if (outputPath) {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, bestBuffer);
    return {
      input: inputPath, output: outputPath, format,
      originalSize: originalStat.size, outputSize: bestBuffer.length,
      quality: bestQ, targetSize: targetBytes,
      hitTarget: bestBuffer.length <= targetBytes,
      savings: `${((1 - bestBuffer.length / originalStat.size) * 100).toFixed(1)}%`,
    };
  }

  return {
    input: inputPath, buffer: bestBuffer, format,
    originalSize: originalStat.size, outputSize: bestBuffer.length,
    quality: bestQ, targetSize: targetBytes,
    hitTarget: bestBuffer.length <= targetBytes,
  };
}

async function _globDir(dir, pattern) {
  const files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const exts = (pattern.match(/\{([^}]+)\}/) || [, 'jpg,jpeg,png,webp,gif,avif,tiff'])[1]
    .split(',').map(e => `.${e.trim()}`);

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isFile() && exts.some(e => entry.name.toLowerCase().endsWith(e))) {
      files.push(fullPath);
    } else if (entry.isDirectory()) {
      const sub = await _globDir(fullPath, pattern);
      files.push(...sub);
    }
  }
  return files;
}

// ── SVG Generators ──────────────────────────────────────────────────

function _gradientSVG(w, h, from, to, angle) {
  const rad = (angle * Math.PI) / 180;
  const x2 = 50 + 50 * Math.sin(rad);
  const y2 = 50 - 50 * Math.cos(rad);
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="50%" y1="0%" x2="${x2}%" y2="${y2 + 100}%">
        <stop offset="0%" stop-color="${from}"/>
        <stop offset="100%" stop-color="${to}"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
  </svg>`;
}

function _patternSVG(w, h, type, size, color, bg) {
  let patternContent = '';
  switch (type) {
    case 'grid':
      patternContent = `<line x1="0" y1="0" x2="${size}" y2="0" stroke="${color}" stroke-width="1"/>
        <line x1="0" y1="0" x2="0" y2="${size}" stroke="${color}" stroke-width="1"/>`;
      break;
    case 'dots':
      patternContent = `<circle cx="${size / 2}" cy="${size / 2}" r="2" fill="${color}"/>`;
      break;
    case 'stripes':
      patternContent = `<line x1="0" y1="0" x2="${size}" y2="${size}" stroke="${color}" stroke-width="2"/>`;
      break;
    case 'checkerboard':
      patternContent = `<rect x="0" y="0" width="${size / 2}" height="${size / 2}" fill="${color}"/>
        <rect x="${size / 2}" y="${size / 2}" width="${size / 2}" height="${size / 2}" fill="${color}"/>`;
      break;
  }
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="p" width="${size}" height="${size}" patternUnits="userSpaceOnUse">
        ${patternContent}
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="${bg}"/>
    <rect width="100%" height="100%" fill="url(#p)"/>
  </svg>`;
}

function _placeholderSVG(w, h, bg, label) {
  const fontSize = Math.min(w, h) / 8;
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="${bg}"/>
    <line x1="0" y1="0" x2="${w}" y2="${h}" stroke="#ccc" stroke-width="2"/>
    <line x1="${w}" y1="0" x2="0" y2="${h}" stroke="#ccc" stroke-width="2"/>
    <text x="50%" y="50%" fill="#999" font-size="${fontSize}" font-family="sans-serif" text-anchor="middle" dominant-baseline="middle">${label}</text>
  </svg>`;
}

function _textSVG(canvasW, canvasH, text, color, fontSize, opts = {}) {
  const {
    fontFamily = 'sans-serif',
    strokeColor, strokeWidth,
    shadow, align = 'center',
    x, y, maxWidth, wrap,
    bold, italic,
  } = opts;

  const ax = x !== undefined ? x : canvasW / 2;
  const ay = y !== undefined ? y : canvasH / 2;
  const anchor = align === 'left' ? 'start' : align === 'right' ? 'end' : 'middle';
  const fontWeight = bold ? 'bold' : 'normal';
  const fontStyle = italic ? 'italic' : 'normal';

  let textEls = '';
  const lines = wrap && maxWidth ? _wrapText(text, maxWidth, fontSize) : [text];

  lines.forEach((line, i) => {
    const ly = ay + (i - (lines.length - 1) / 2) * (fontSize * 1.3);
    const escaped = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    if (shadow) {
      textEls += `<text x="${ax + 2}" y="${ly + 2}" fill="rgba(0,0,0,0.5)" font-size="${fontSize}" font-family="${fontFamily}" font-weight="${fontWeight}" font-style="${fontStyle}" text-anchor="${anchor}" dominant-baseline="middle">${escaped}</text>`;
    }
    if (strokeColor) {
      textEls += `<text x="${ax}" y="${ly}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth || 2}" font-size="${fontSize}" font-family="${fontFamily}" font-weight="${fontWeight}" font-style="${fontStyle}" text-anchor="${anchor}" dominant-baseline="middle">${escaped}</text>`;
    }
    textEls += `<text x="${ax}" y="${ly}" fill="${color}" font-size="${fontSize}" font-family="${fontFamily}" font-weight="${fontWeight}" font-style="${fontStyle}" text-anchor="${anchor}" dominant-baseline="middle">${escaped}</text>`;
  });

  return `<svg width="${canvasW}" height="${canvasH}" xmlns="http://www.w3.org/2000/svg">${textEls}</svg>`;
}

function _watermarkSVG(w, h, text, fontSize, color, opacity, position) {
  const posMap = {
    northwest: { x: fontSize, y: fontSize * 1.5 },
    northeast: { x: w - fontSize, y: fontSize * 1.5 },
    southwest: { x: fontSize, y: h - fontSize * 0.5 },
    southeast: { x: w - fontSize, y: h - fontSize * 0.5 },
    center: { x: w / 2, y: h / 2 },
    north: { x: w / 2, y: fontSize * 1.5 },
    south: { x: w / 2, y: h - fontSize * 0.5 },
  };
  const pos = posMap[position] || posMap.southeast;
  const anchor = position.includes('east') ? 'end' : position.includes('west') ? 'start' : 'middle';
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;');

  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <text x="${pos.x}" y="${pos.y}" fill="${color}" opacity="${opacity}" font-size="${fontSize}" font-family="sans-serif" text-anchor="${anchor}" dominant-baseline="middle">${escaped}</text>
  </svg>`;
}

function _tiledWatermarkSVG(w, h, text, fontSize, color, opacity) {
  const tileW = text.length * fontSize * 0.7 + 60;
  const tileH = fontSize * 3;
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;');

  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="wm" width="${tileW}" height="${tileH}" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)">
        <text x="${tileW / 2}" y="${tileH / 2}" fill="${color}" opacity="${opacity}" font-size="${fontSize}" font-family="sans-serif" text-anchor="middle" dominant-baseline="middle">${escaped}</text>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#wm)"/>
  </svg>`;
}

function _shapeSVG(w, h, layer) {
  const fill = layer.fill || 'transparent';
  const stroke = layer.stroke || '#000000';
  const strokeWidth = layer.strokeWidth || 2;
  let shape = '';

  switch (layer.shape) {
    case 'rect':
      shape = `<rect x="${layer.x || 0}" y="${layer.y || 0}" width="${layer.width || 100}" height="${layer.height || 100}" rx="${layer.radius || 0}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
      break;
    case 'circle':
      shape = `<circle cx="${layer.cx || w / 2}" cy="${layer.cy || h / 2}" r="${layer.r || 50}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
      break;
    case 'ellipse':
      shape = `<ellipse cx="${layer.cx || w / 2}" cy="${layer.cy || h / 2}" rx="${layer.rx || 80}" ry="${layer.ry || 50}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
      break;
    case 'line':
      shape = `<line x1="${layer.x1 || 0}" y1="${layer.y1 || 0}" x2="${layer.x2 || 100}" y2="${layer.y2 || 100}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
      break;
    case 'polygon':
      shape = `<polygon points="${layer.points || '50,5 100,100 0,100'}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
      break;
  }

  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${shape}</svg>`;
}

function _wrapText(text, maxWidth, fontSize) {
  const charWidth = fontSize * 0.6;
  const maxChars = Math.floor(maxWidth / charWidth);
  const words = text.split(' ');
  const lines = [];
  let current = '';

  for (const word of words) {
    if ((current + ' ' + word).length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = current ? current + ' ' + word : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// ============================================================================
// 10. IMAGE MERGING (Collage / Combine multiple images)
// ============================================================================

export async function mergeImages(options = {}) {
  _requireSharp();
  const {
    inputs = [],            // array of file paths
    layout = 'horizontal',  // horizontal | vertical | grid
    gap = 0,                // gap between images in pixels
    background = '#ffffff', // gap/background color
    resize = 'auto',        // auto | none | { width, height }
    // auto: resize all to consistent dimension
    // none: keep original sizes (may be uneven)
    columns = null,         // grid: number of columns (auto-calculated if null)
    format = 'png',
    quality = 90,
    outputPath = null,
  } = options;

  if (inputs.length === 0) {
    throw new Error('mergeImages requires at least 1 input image');
  }

  // Load metadata for all images
  const metas = await Promise.all(
    inputs.map(async (p) => {
      const m = await sharp(p).metadata();
      return { path: p, width: m.width, height: m.height };
    })
  );

  // Determine target dimensions for each image
  let targetW, targetH;
  if (resize === 'auto') {
    if (layout === 'horizontal') {
      // Match heights — use median height
      const heights = metas.map(m => m.height).sort((a, b) => a - b);
      targetH = heights[Math.floor(heights.length / 2)];
      targetW = null; // proportional
    } else if (layout === 'vertical') {
      // Match widths — use median width
      const widths = metas.map(m => m.width).sort((a, b) => a - b);
      targetW = widths[Math.floor(widths.length / 2)];
      targetH = null; // proportional
    } else {
      // Grid — uniform cell size (median of both)
      const widths = metas.map(m => m.width).sort((a, b) => a - b);
      const heights = metas.map(m => m.height).sort((a, b) => a - b);
      targetW = widths[Math.floor(widths.length / 2)];
      targetH = heights[Math.floor(heights.length / 2)];
    }
  } else if (typeof resize === 'object') {
    targetW = resize.width || null;
    targetH = resize.height || null;
  }
  // resize === 'none' → targetW = targetH = undefined

  // Resize all images
  const resizedBuffers = [];
  const resizedMetas = [];
  for (const m of metas) {
    let pipeline = sharp(m.path);
    if (targetW || targetH) {
      pipeline = pipeline.resize({
        width: targetW || undefined,
        height: targetH || undefined,
        fit: 'cover',
        withoutEnlargement: false,
      });
    }
    const { data, info } = await pipeline.ensureAlpha().toBuffer({ resolveWithObject: true });
    resizedBuffers.push(data);
    resizedMetas.push({ width: info.width, height: info.height });
  }

  // Calculate canvas dimensions and positions
  const bgColor = _parseColor(background);
  let canvasW, canvasH;
  const positions = [];

  if (layout === 'horizontal') {
    canvasW = resizedMetas.reduce((s, m) => s + m.width, 0) + gap * (resizedMetas.length - 1);
    canvasH = Math.max(...resizedMetas.map(m => m.height));
    let x = 0;
    for (const m of resizedMetas) {
      positions.push({ left: x, top: Math.round((canvasH - m.height) / 2) });
      x += m.width + gap;
    }
  } else if (layout === 'vertical') {
    canvasW = Math.max(...resizedMetas.map(m => m.width));
    canvasH = resizedMetas.reduce((s, m) => s + m.height, 0) + gap * (resizedMetas.length - 1);
    let y = 0;
    for (const m of resizedMetas) {
      positions.push({ left: Math.round((canvasW - m.width) / 2), top: y });
      y += m.height + gap;
    }
  } else {
    // Grid layout
    const cols = columns || Math.ceil(Math.sqrt(resizedMetas.length));
    const rows = Math.ceil(resizedMetas.length / cols);
    const cellW = Math.max(...resizedMetas.map(m => m.width));
    const cellH = Math.max(...resizedMetas.map(m => m.height));
    canvasW = cols * cellW + (cols - 1) * gap;
    canvasH = rows * cellH + (rows - 1) * gap;
    for (let i = 0; i < resizedMetas.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const m = resizedMetas[i];
      positions.push({
        left: col * (cellW + gap) + Math.round((cellW - m.width) / 2),
        top: row * (cellH + gap) + Math.round((cellH - m.height) / 2),
      });
    }
  }

  // Create canvas and composite
  const composites = resizedBuffers.map((buf, i) => ({
    input: buf,
    left: positions[i].left,
    top: positions[i].top,
    blend: 'over',
  }));

  let pipeline = sharp({
    create: { width: canvasW, height: canvasH, channels: 4, background: bgColor }
  }).composite(composites);

  pipeline = _applyFormat(pipeline, format, { quality });

  // Generate result buffer (S3 upload handled by imageTools)
  const { data: outData, info: outInfo } = await pipeline.toBuffer({ resolveWithObject: true });

  const result = {
    operation: 'merge',
    layout,
    inputCount: inputs.length,
    width: outInfo.width,
    height: outInfo.height,
    format,
    size: outData.length,
    buffer: outData,
  };

  if (outputPath) {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, outData);
    result.output = outputPath;
    result.outputSize = outData.length;
    delete result.buffer;
  }

  return result;
}

// ── Export everything ──────────────────────────────────────────────

export default {
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
};
