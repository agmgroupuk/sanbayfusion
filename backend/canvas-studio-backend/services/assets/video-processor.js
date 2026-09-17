/**
 * Video Processor — FFmpeg-based video transcoding, thumbnails, and HLS streaming
 *
 * Pipeline: Upload → Probe → Transcode → Thumbnail → HLS → S3 → CDN URL
 */

import { exec as execCb } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

const exec = promisify(execCb);

// ── Config ─────────────────────────────────────────────────────────

const TEMP_DIR = path.join(os.tmpdir(), 'maula-video');
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

const TRANSCODE_PRESETS = {
  '360p': { width: 640, height: 360, bitrate: '800k', audioBitrate: '96k' },
  '480p': { width: 854, height: 480, bitrate: '1500k', audioBitrate: '128k' },
  '720p': { width: 1280, height: 720, bitrate: '3000k', audioBitrate: '128k' },
  '1080p': { width: 1920, height: 1080, bitrate: '5000k', audioBitrate: '192k' },
};

const SUPPORTED_FORMATS = ['mp4', 'mov', 'webm', 'avi', 'mkv', 'flv', 'wmv', 'm4v'];

// ── Video Processor ────────────────────────────────────────────────

class VideoProcessor {
  constructor() {
    this._ffmpegAvailable = null;
    this._s3 = null;
  }

  /**
   * Check if FFmpeg is installed
   */
  async _checkFfmpeg() {
    if (this._ffmpegAvailable !== null) return this._ffmpegAvailable;

    try {
      await exec('ffmpeg -version');
      this._ffmpegAvailable = true;
    } catch {
      console.warn('[VideoProcessor] FFmpeg not found — video processing disabled');
      this._ffmpegAvailable = false;
    }
    return this._ffmpegAvailable;
  }

  /**
   * Lazy-load S3 client
   */
  async _getS3() {
    if (this._s3) return this._s3;
    try {
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
      this._s3 = {
        client: new S3Client({ region: process.env.AWS_REGION || 'ap-southeast-1' }),
        PutObjectCommand,
      };
    } catch {
      console.warn('[VideoProcessor] AWS SDK not available');
    }
    return this._s3;
  }

  /**
   * Ensure temp directory exists
   */
  async _ensureTempDir() {
    await fs.mkdir(TEMP_DIR, { recursive: true });
  }

  /**
   * Probe video metadata using ffprobe
   * @param {string} inputPath — path to video file
   */
  async probe(inputPath) {
    if (!(await this._checkFfmpeg())) {
      throw new Error('FFmpeg not available');
    }

    const cmd = `ffprobe -v quiet -print_format json -show_format -show_streams "${inputPath}"`;

    try {
      const { stdout } = await exec(cmd);
      const data = JSON.parse(stdout);

      const videoStream = data.streams?.find(s => s.codec_type === 'video');
      const audioStream = data.streams?.find(s => s.codec_type === 'audio');

      return {
        duration: parseFloat(data.format?.duration || '0'),
        size: parseInt(data.format?.size || '0', 10),
        bitrate: parseInt(data.format?.bit_rate || '0', 10),
        format: data.format?.format_name || 'unknown',
        video: videoStream ? {
          codec: videoStream.codec_name,
          width: videoStream.width,
          height: videoStream.height,
          fps: (() => { const r = videoStream.r_frame_rate || '0'; const parts = r.split('/'); return parts.length === 2 ? (parseFloat(parts[0]) / parseFloat(parts[1])) : parseFloat(r); })(), // e.g., "30/1"
          profile: videoStream.profile,
        } : null,
        audio: audioStream ? {
          codec: audioStream.codec_name,
          sampleRate: parseInt(audioStream.sample_rate || '0', 10),
          channels: audioStream.channels,
        } : null,
      };
    } catch (err) {
      throw new Error(`FFprobe failed: ${err.message}`);
    }
  }

  /**
   * Generate thumbnail from video
   * @param {string} inputPath
   * @param {object} options
   */
  async generateThumbnail(inputPath, options = {}) {
    if (!(await this._checkFfmpeg())) {
      throw new Error('FFmpeg not available');
    }

    const { timestamp = '00:00:02', width = 640, height = -1 } = options;
    await this._ensureTempDir();

    const id = crypto.randomBytes(8).toString('hex');
    const outputPath = path.join(TEMP_DIR, `thumb_${id}.jpg`);

    const cmd = [
      'ffmpeg -y',
      `-ss ${timestamp}`,
      `-i "${inputPath}"`,
      '-vframes 1',
      `-vf "scale=${width}:${height}"`,
      '-q:v 3',
      `"${outputPath}"`,
    ].join(' ');

    try {
      await exec(cmd);
      const data = await fs.readFile(outputPath);
      await fs.unlink(outputPath).catch(() => {});

      return {
        buffer: data,
        contentType: 'image/jpeg',
        width,
      };
    } catch (err) {
      throw new Error(`Thumbnail generation failed: ${err.message}`);
    }
  }

  /**
   * Transcode video to a specific resolution
   * @param {string} inputPath
   * @param {string} preset — '360p', '480p', '720p', '1080p'
   */
  async transcode(inputPath, preset = '720p') {
    if (!(await this._checkFfmpeg())) {
      throw new Error('FFmpeg not available');
    }

    const config = TRANSCODE_PRESETS[preset];
    if (!config) throw new Error(`Invalid preset: ${preset}`);

    await this._ensureTempDir();
    const id = crypto.randomBytes(8).toString('hex');
    const outputPath = path.join(TEMP_DIR, `transcode_${id}_${preset}.mp4`);

    const cmd = [
      'ffmpeg -y',
      `-i "${inputPath}"`,
      `-vf "scale=${config.width}:${config.height}:force_original_aspect_ratio=decrease,pad=${config.width}:${config.height}:(ow-iw)/2:(oh-ih)/2"`,
      `-c:v libx264 -preset medium -b:v ${config.bitrate}`,
      `-c:a aac -b:a ${config.audioBitrate}`,
      '-movflags +faststart',
      '-pix_fmt yuv420p',
      `"${outputPath}"`,
    ].join(' ');

    try {
      await exec(cmd, { timeout: 300000 }); // 5 min timeout
      const stat = await fs.stat(outputPath);

      return {
        path: outputPath,
        size: stat.size,
        preset,
        resolution: `${config.width}x${config.height}`,
        contentType: 'video/mp4',
      };
    } catch (err) {
      await fs.unlink(outputPath).catch(() => {});
      throw new Error(`Transcode failed: ${err.message}`);
    }
  }

  /**
   * Generate HLS (HTTP Live Streaming) output with multiple bitrates
   * @param {string} inputPath
   * @param {string[]} presets — array of preset names
   */
  async generateHLS(inputPath, presets = ['360p', '720p']) {
    if (!(await this._checkFfmpeg())) {
      throw new Error('FFmpeg not available');
    }

    await this._ensureTempDir();
    const id = crypto.randomBytes(8).toString('hex');
    const hlsDir = path.join(TEMP_DIR, `hls_${id}`);
    await fs.mkdir(hlsDir, { recursive: true });

    const streams = [];

    // Transcode each preset into HLS segments
    for (const preset of presets) {
      const config = TRANSCODE_PRESETS[preset];
      if (!config) continue;

      const presetDir = path.join(hlsDir, preset);
      await fs.mkdir(presetDir, { recursive: true });

      const cmd = [
        'ffmpeg -y',
        `-i "${inputPath}"`,
        `-vf "scale=${config.width}:${config.height}:force_original_aspect_ratio=decrease"`,
        `-c:v libx264 -preset fast -b:v ${config.bitrate}`,
        `-c:a aac -b:a ${config.audioBitrate}`,
        '-hls_time 6',
        '-hls_list_size 0',
        '-hls_segment_filename',
        `"${path.join(presetDir, 'segment_%03d.ts')}"`,
        `"${path.join(presetDir, 'index.m3u8')}"`,
      ].join(' ');

      try {
        await exec(cmd, { timeout: 300000 });
        streams.push({
          preset,
          bandwidth: parseInt(config.bitrate) * 1000,
          resolution: `${config.width}x${config.height}`,
          playlistPath: path.join(presetDir, 'index.m3u8'),
        });
      } catch (err) {
        console.error(`[VideoProcessor] HLS ${preset} failed:`, err.message);
      }
    }

    if (streams.length === 0) {
      throw new Error('All HLS transcodes failed');
    }

    // Generate master playlist
    const masterLines = ['#EXTM3U'];
    for (const stream of streams) {
      masterLines.push(
        `#EXT-X-STREAM-INF:BANDWIDTH=${stream.bandwidth},RESOLUTION=${stream.resolution}`,
        `${stream.preset}/index.m3u8`
      );
    }

    const masterPath = path.join(hlsDir, 'master.m3u8');
    await fs.writeFile(masterPath, masterLines.join('\n'));

    return {
      directory: hlsDir,
      masterPlaylist: masterPath,
      streams,
    };
  }

  /**
   * Full video processing pipeline: probe → thumbnail → transcode → upload to S3
   * @param {string} inputPath
   * @param {string} projectId
   * @param {string} assetId
   */
  async processAndUpload(inputPath, projectId, assetId) {
    const results = {
      metadata: null,
      thumbnail: null,
      variants: [],
      hlsUrl: null,
    };

    // 1. Probe metadata
    try {
      results.metadata = await this.probe(inputPath);
    } catch (err) {
      console.error('[VideoProcessor] Probe failed:', err.message);
    }

    // 2. Generate thumbnail
    try {
      const thumb = await this.generateThumbnail(inputPath);
      const thumbKey = `videos/${projectId}/${assetId}/thumb.jpg`;
      await this._uploadToS3(thumbKey, thumb.buffer, 'image/jpeg');
      results.thumbnail = `https://cdn.sanbayfusion.com/${thumbKey}`;
    } catch (err) {
      console.error('[VideoProcessor] Thumbnail failed:', err.message);
    }

    // 3. Determine which presets to generate based on source resolution
    const sourceHeight = results.metadata?.video?.height || 720;
    const presets = [];
    if (sourceHeight >= 360) presets.push('360p');
    if (sourceHeight >= 480) presets.push('480p');
    if (sourceHeight >= 720) presets.push('720p');
    if (sourceHeight >= 1080) presets.push('1080p');

    // 4. Transcode variants
    for (const preset of presets) {
      try {
        const variant = await this.transcode(inputPath, preset);
        const variantKey = `videos/${projectId}/${assetId}/${preset}.mp4`;
        const data = await fs.readFile(variant.path);
        await this._uploadToS3(variantKey, data, 'video/mp4');
        await fs.unlink(variant.path).catch(() => {});

        results.variants.push({
          preset,
          resolution: variant.resolution,
          size: variant.size,
          url: `https://cdn.sanbayfusion.com/${variantKey}`,
        });
      } catch (err) {
        console.error(`[VideoProcessor] Transcode ${preset} failed:`, err.message);
      }
    }

    // 5. Generate HLS for streaming
    try {
      const hls = await this.generateHLS(inputPath, presets.length > 1 ? [presets[0], presets[presets.length - 1]] : presets);

      // Upload all HLS files to S3
      const hlsBase = `videos/${projectId}/${assetId}/hls`;
      await this._uploadHlsDirectory(hls.directory, hlsBase);
      results.hlsUrl = `https://cdn.sanbayfusion.com/${hlsBase}/master.m3u8`;

      // Cleanup temp HLS dir
      await fs.rm(hls.directory, { recursive: true, force: true }).catch(() => {});
    } catch (err) {
      console.error('[VideoProcessor] HLS generation failed:', err.message);
    }

    return results;
  }

  /**
   * Upload a single buffer to S3
   */
  async _uploadToS3(key, buffer, contentType) {
    const s3 = await this._getS3();
    if (!s3) return;

    const bucket = process.env.S3_ASSETS_BUCKET || 'maula-assets';

    try {
      await s3.client.send(new s3.PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      }));
    } catch (err) {
      console.error(`[VideoProcessor] S3 upload failed for ${key}:`, err.message);
    }
  }

  /**
   * Recursively upload HLS directory to S3
   */
  async _uploadHlsDirectory(directory, s3Base) {
    const entries = await fs.readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      const s3Key = `${s3Base}/${entry.name}`;

      if (entry.isDirectory()) {
        await this._uploadHlsDirectory(fullPath, s3Key);
      } else {
        const data = await fs.readFile(fullPath);
        const contentType = entry.name.endsWith('.m3u8')
          ? 'application/vnd.apple.mpegurl'
          : entry.name.endsWith('.ts')
            ? 'video/mp2t'
            : 'application/octet-stream';

        await this._uploadToS3(s3Key, data, contentType);
      }
    }
  }

  /**
   * Extract audio track from video
   */
  async extractAudio(inputPath, format = 'mp3') {
    if (!(await this._checkFfmpeg())) {
      throw new Error('FFmpeg not available');
    }

    await this._ensureTempDir();
    const id = crypto.randomBytes(8).toString('hex');
    const outputPath = path.join(TEMP_DIR, `audio_${id}.${format}`);

    const codecMap = { mp3: 'libmp3lame', aac: 'aac', opus: 'libopus' };
    const codec = codecMap[format] || 'libmp3lame';

    const cmd = `ffmpeg -y -i "${inputPath}" -vn -c:a ${codec} -b:a 192k "${outputPath}"`;

    try {
      await exec(cmd, { timeout: 120000 });
      const data = await fs.readFile(outputPath);
      await fs.unlink(outputPath).catch(() => {});

      return {
        buffer: data,
        format,
        contentType: `audio/${format === 'mp3' ? 'mpeg' : format}`,
      };
    } catch (err) {
      throw new Error(`Audio extraction failed: ${err.message}`);
    }
  }

  /**
   * Generate a GIF preview from video
   */
  async generateGifPreview(inputPath, options = {}) {
    if (!(await this._checkFfmpeg())) {
      throw new Error('FFmpeg not available');
    }

    const { start = '00:00:00', duration = 5, width = 320, fps = 10 } = options;
    await this._ensureTempDir();

    const id = crypto.randomBytes(8).toString('hex');
    const outputPath = path.join(TEMP_DIR, `preview_${id}.gif`);

    const cmd = [
      'ffmpeg -y',
      `-ss ${start}`,
      `-t ${duration}`,
      `-i "${inputPath}"`,
      `-vf "fps=${fps},scale=${width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse"`,
      `"${outputPath}"`,
    ].join(' ');

    try {
      await exec(cmd, { timeout: 60000 });
      const data = await fs.readFile(outputPath);
      await fs.unlink(outputPath).catch(() => {});

      return {
        buffer: data,
        contentType: 'image/gif',
        width,
        duration,
      };
    } catch (err) {
      throw new Error(`GIF preview failed: ${err.message}`);
    }
  }

  /**
   * Validate that a file is a supported video format
   */
  isSupported(filename) {
    const ext = path.extname(filename).toLowerCase().replace('.', '');
    return SUPPORTED_FORMATS.includes(ext);
  }

  /**
   * Cleanup temp files older than 1 hour
   */
  async cleanup() {
    try {
      const entries = await fs.readdir(TEMP_DIR);
      const oneHourAgo = Date.now() - 60 * 60 * 1000;

      for (const entry of entries) {
        const fullPath = path.join(TEMP_DIR, entry);
        const stat = await fs.stat(fullPath);
        if (stat.mtimeMs < oneHourAgo) {
          await fs.rm(fullPath, { recursive: true, force: true });
        }
      }
    } catch {}
  }
}

export const videoProcessor = new VideoProcessor();
export default videoProcessor;
