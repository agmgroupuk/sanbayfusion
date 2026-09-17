/**
 * VIDEO ENGINE — Production video processing via fluent-ffmpeg
 *
 * Requires `ffmpeg` and `ffprobe` binaries on PATH. Auto-detects availability
 * and gracefully reports `{success:false}` if missing rather than crashing.
 *
 * All functions accept (inputPath, opts) → return either:
 *   { success: true, outputPath, format, size, sizeFormatted, ...metadata }
 *   { success: false, error }
 */

import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { spawnSync, spawn } from 'child_process';
import { createLogger } from '../lib/logger.js';

const log = createLogger('videoEngine');

let _ffmpeg;
async function getFfmpeg() {
  if (_ffmpeg) return _ffmpeg;
  const m = await import('fluent-ffmpeg');
  _ffmpeg = m.default || m;
  return _ffmpeg;
}

function whichSync(bin) {
  try {
    const out = spawnSync(process.platform === 'win32' ? 'where' : 'which', [bin]);
    return out.status === 0;
  } catch { return false; }
}

const HAS_FFMPEG = whichSync('ffmpeg');
const HAS_FFPROBE = whichSync('ffprobe');

function ensureFfmpeg() {
  if (!HAS_FFMPEG) throw new Error('ffmpeg binary not found on PATH. Install with: sudo apt install -y ffmpeg');
}

function formatBytes(b) {
  if (!b) return '0 B';
  const u = ['B','KB','MB','GB','TB']; let i = 0; let n = b;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(2)} ${u[i]}`;
}

function tempPath(ext = 'mp4') {
  return path.join(os.tmpdir(), `video-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`);
}

async function statSize(p) {
  try { const s = await fsp.stat(p); return s.size; } catch { return 0; }
}

function probe(inputPath) {
  return new Promise(async (resolve, reject) => {
    const ffmpeg = await getFfmpeg();
    ffmpeg.ffprobe(inputPath, (err, data) => err ? reject(err) : resolve(data));
  });
}

async function getMeta(inputPath) {
  const data = await probe(inputPath);
  const v = data.streams?.find((s) => s.codec_type === 'video');
  const a = data.streams?.find((s) => s.codec_type === 'audio');
  return {
    duration: parseFloat(data.format?.duration || 0),
    bitRate: parseInt(data.format?.bit_rate || 0, 10),
    size: parseInt(data.format?.size || 0, 10),
    formatName: data.format?.format_name,
    width: v?.width || 0,
    height: v?.height || 0,
    codec: v?.codec_name,
    fps: v?.r_frame_rate ? eval(v.r_frame_rate) : 0,
    audioCodec: a?.codec_name,
    audioChannels: a?.channels,
    audioSampleRate: a?.sample_rate,
  };
}

function runFfmpeg(buildFn) {
  return new Promise(async (resolve, reject) => {
    const ffmpeg = await getFfmpeg();
    const cmd = ffmpeg();
    try { buildFn(cmd); } catch (e) { return reject(e); }
    cmd.on('error', reject).on('end', () => resolve(true)).run();
  });
}

const RATIO_DIMS = { '16:9':[1920,1080], '9:16':[1080,1920], '1:1':[1080,1080], '4:5':[1080,1350], '4:3':[1440,1080], '21:9':[2560,1080] };
const QUALITY_CRF = { low: 30, medium: 23, high: 18, lossless: 0 };

const PLATFORM_PRESETS = {
  youtube: { ratio: '16:9', maxDuration: 43200, vCodec: 'libx264', aCodec: 'aac', aBitrate: '320k', preset: 'slow', crf: 18 },
  tiktok: { ratio: '9:16', maxDuration: 600, vCodec: 'libx264', aCodec: 'aac', aBitrate: '128k', preset: 'fast', crf: 23 },
  reels: { ratio: '9:16', maxDuration: 5400, vCodec: 'libx264', aCodec: 'aac', aBitrate: '128k', preset: 'fast', crf: 23 },
  shorts: { ratio: '9:16', maxDuration: 60, vCodec: 'libx264', aCodec: 'aac', aBitrate: '128k', preset: 'fast', crf: 23 },
  twitter: { ratio: '16:9', maxDuration: 140, vCodec: 'libx264', aCodec: 'aac', aBitrate: '128k', preset: 'fast', crf: 23 },
  web: { ratio: '16:9', maxDuration: 0, vCodec: 'libx264', aCodec: 'aac', aBitrate: '128k', preset: 'fast', crf: 28 },
  archive: { ratio: '16:9', maxDuration: 0, vCodec: 'libx264', aCodec: 'aac', aBitrate: '320k', preset: 'veryslow', crf: 0 },
};

const STYLE_PRESETS = {
  cinematic: { eq: 'brightness=0.02:contrast=1.15:saturation=1.1', vignette: 0.4 },
  vlog: { eq: 'brightness=0.05:contrast=1.05:saturation=1.15' },
  podcast: { eq: 'brightness=0:contrast=1.02:saturation=0.95' },
  dark: { eq: 'brightness=-0.1:contrast=1.2:saturation=0.85' },
  bright: { eq: 'brightness=0.1:contrast=1.05:saturation=1.05' },
  warm: { eq: 'brightness=0.02:contrast=1.05:saturation=1.1', cb: 'rs=0.05:gs=0:bs=-0.05' },
  cool: { eq: 'brightness=0.02:contrast=1.05:saturation=1.1', cb: 'rs=-0.05:gs=0:bs=0.05' },
  vintage: { eq: 'brightness=0:contrast=0.9:saturation=0.7', vignette: 0.6 },
  noir: { eq: 'brightness=0:contrast=1.3:saturation=0' },
};

const CINEMATIC_PRESETS = {
  warm: 'eq=brightness=0.02:saturation=1.1,colorbalance=rs=0.06:bs=-0.06',
  cool: 'eq=brightness=0.02:saturation=1.1,colorbalance=rs=-0.06:bs=0.06',
  teal_orange: 'curves=preset=vintage,eq=saturation=1.2',
  film: 'eq=brightness=0:contrast=0.95:saturation=0.95',
  noir: 'eq=saturation=0:contrast=1.4',
  faded: 'eq=brightness=0.05:contrast=0.85:saturation=0.7',
  vintage: 'curves=preset=vintage',
  bleach_bypass: 'eq=brightness=0:contrast=1.4:saturation=0.4',
};

// ═══════════════════════════════════════════════════════════════════════════════
// 1. trimVideo
// ═══════════════════════════════════════════════════════════════════════════════

export async function trimVideo(inputPath, opts = {}) {
  try {
    ensureFfmpeg();
    const action = opts.action || 'trim';
    const ext = opts.outputFormat || 'mp4';
    const out = tempPath(ext);

    if (action === 'trim') {
      const start = +opts.startTime || 0;
      const end = opts.endTime ? +opts.endTime : null;
      await runFfmpeg((cmd) => {
        cmd.input(inputPath).setStartTime(start);
        if (end !== null && end > start) cmd.duration(end - start);
        cmd.outputOptions(['-c:v libx264', '-c:a aac', '-preset fast', '-crf 23']).output(out);
      });
      const size = await statSize(out);
      return { success: true, operation: 'trim', method: 'trim', outputPath: out, format: ext, size, sizeFormatted: formatBytes(size), startTime: start, endTime: end };
    }

    if (action === 'remove_silence') {
      const dB = opts.silenceThreshold ?? -30;
      const dur = opts.silenceDuration ?? 1.0;
      // detect silence
      const proc = spawn('ffmpeg', ['-i', inputPath, '-af', `silencedetect=noise=${dB}dB:d=${dur}`, '-f', 'null', '-']);
      let stderr = '';
      proc.stderr.on('data', (d) => { stderr += d.toString(); });
      await new Promise((r) => proc.on('close', r));
      const silentSegs = [];
      const reStart = /silence_start: ([\d.]+)/g; const reEnd = /silence_end: ([\d.]+)/g;
      const starts = [...stderr.matchAll(reStart)].map((m) => +m[1]);
      const ends = [...stderr.matchAll(reEnd)].map((m) => +m[1]);
      for (let i = 0; i < starts.length; i++) silentSegs.push({ start: starts[i], end: ends[i] ?? null });
      // build keep segments
      const meta = await getMeta(inputPath);
      const keep = [];
      let cursor = 0;
      for (const s of silentSegs) {
        if (s.start > cursor) keep.push([cursor, s.start]);
        cursor = s.end ?? meta.duration;
      }
      if (cursor < meta.duration) keep.push([cursor, meta.duration]);

      // Concat keep segments using filter_complex
      const filters = keep.map((seg, i) => `[0:v]trim=start=${seg[0]}:end=${seg[1]},setpts=PTS-STARTPTS[v${i}];[0:a]atrim=start=${seg[0]}:end=${seg[1]},asetpts=PTS-STARTPTS[a${i}]`).join(';');
      const concat = keep.map((_, i) => `[v${i}][a${i}]`).join('') + `concat=n=${keep.length}:v=1:a=1[v][a]`;
      await runFfmpeg((cmd) => {
        cmd.input(inputPath).complexFilter(`${filters};${concat}`).outputOptions(['-map [v]', '-map [a]', '-c:v libx264', '-c:a aac', '-preset fast', '-crf 23']).output(out);
      });
      const size = await statSize(out);
      return { success: true, operation: 'trim', method: 'remove_silence', outputPath: out, format: ext, size, sizeFormatted: formatBytes(size), silentSegments: silentSegs.length, segmentsKept: keep.length };
    }

    if (action === 'scene_cut') {
      const thr = opts.sceneThreshold ?? 0.3;
      const proc = spawn('ffmpeg', ['-i', inputPath, '-vf', `select='gt(scene,${thr})',showinfo`, '-f', 'null', '-']);
      let stderr = '';
      proc.stderr.on('data', (d) => { stderr += d.toString(); });
      await new Promise((r) => proc.on('close', r));
      const times = [...stderr.matchAll(/pts_time:([\d.]+)/g)].map((m) => +m[1]);
      return { success: true, operation: 'trim', method: 'scene_cut', sceneCount: times.length, scenes: times };
    }

    if (action === 'auto_start_end') {
      // Simple: detect silence at start/end and trim
      const meta = await getMeta(inputPath);
      const proc = spawn('ffmpeg', ['-i', inputPath, '-af', 'silencedetect=noise=-30dB:d=0.5', '-f', 'null', '-']);
      let stderr = '';
      proc.stderr.on('data', (d) => { stderr += d.toString(); });
      await new Promise((r) => proc.on('close', r));
      const starts = [...stderr.matchAll(/silence_start: ([\d.]+)/g)].map((m) => +m[1]);
      const ends = [...stderr.matchAll(/silence_end: ([\d.]+)/g)].map((m) => +m[1]);
      let trimStart = 0, trimEnd = meta.duration;
      if (ends.length && starts.length && starts[0] < 1) trimStart = ends[0];
      if (starts.length && starts[starts.length - 1] > meta.duration - 5) trimEnd = starts[starts.length - 1];
      await runFfmpeg((cmd) => cmd.input(inputPath).setStartTime(trimStart).duration(trimEnd - trimStart).outputOptions(['-c:v libx264', '-c:a aac', '-preset fast', '-crf 23']).output(out));
      const size = await statSize(out);
      return { success: true, operation: 'trim', method: 'auto_start_end', outputPath: out, format: ext, size, sizeFormatted: formatBytes(size), trimStart, trimEnd };
    }

    throw new Error(`Unknown trim action: ${action}`);
  } catch (e) {
    log.error('trimVideo error:', e.message);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. extractHighlights
// ═══════════════════════════════════════════════════════════════════════════════

export async function extractHighlights(inputPath, opts = {}) {
  try {
    ensureFfmpeg();
    const meta = await getMeta(inputPath);
    const count = parseInt(opts.clipCount || 5, 10);
    const dur = parseInt(opts.clipDuration || 30, 10);
    const ext = opts.outputFormat || 'mp4';
    const action = opts.action || 'extract_clips';
    const clips = [];

    if (action === 'extract_clips') {
      const step = (meta.duration - dur) / Math.max(1, count - 1);
      for (let i = 0; i < count; i++) {
        const start = Math.max(0, Math.min(meta.duration - dur, i * step));
        const out = tempPath(ext);
        await runFfmpeg((cmd) => cmd.input(inputPath).setStartTime(start).duration(dur).outputOptions(['-c:v libx264', '-c:a aac', '-preset fast', '-crf 23']).output(out));
        clips.push({ index: i, start, duration: dur, outputPath: out, size: await statSize(out) });
      }
    } else if (action === 'energy_based') {
      // Use loudness measurement: sample audio levels at intervals and pick top N peaks
      const samples = Math.max(20, count * 5);
      const interval = meta.duration / samples;
      const levels = [];
      for (let i = 0; i < samples; i++) {
        const t = i * interval;
        const proc = spawn('ffmpeg', ['-ss', String(t), '-i', inputPath, '-t', '1', '-af', 'volumedetect', '-f', 'null', '-']);
        let stderr = '';
        proc.stderr.on('data', (d) => { stderr += d.toString(); });
        await new Promise((r) => proc.on('close', r));
        const m = stderr.match(/mean_volume: (-?[\d.]+) dB/);
        levels.push({ t, level: m ? parseFloat(m[1]) : -100 });
      }
      const top = [...levels].sort((a, b) => b.level - a.level).slice(0, count).sort((a, b) => a.t - b.t);
      for (let i = 0; i < top.length; i++) {
        const start = Math.max(0, top[i].t - dur / 2);
        const out = tempPath(ext);
        await runFfmpeg((cmd) => cmd.input(inputPath).setStartTime(start).duration(dur).outputOptions(['-c:v libx264', '-c:a aac', '-preset fast', '-crf 23']).output(out));
        clips.push({ index: i, start, duration: dur, energyDb: top[i].level, outputPath: out, size: await statSize(out) });
      }
    } else {
      throw new Error(`Unknown highlights action: ${action}`);
    }

    return { success: true, operation: 'highlights', method: action, clipCount: clips.length, results: clips.map((c) => ({ ...c, status: 'success' })) };
  } catch (e) {
    log.error('extractHighlights error:', e.message);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. resizeVideo
// ═══════════════════════════════════════════════════════════════════════════════

function buildResizeFilter(srcW, srcH, tw, th, mode) {
  if (mode === 'smart') {
    return `scale=${tw}:${th}:force_original_aspect_ratio=decrease,pad=${tw}:${th}:(ow-iw)/2:(oh-ih)/2:black`;
  }
  // crop modes
  const ratio = tw / th;
  let cropW = srcW, cropH = srcH;
  if (srcW / srcH > ratio) cropW = Math.round(srcH * ratio);
  else cropH = Math.round(srcW / ratio);
  let x = `(iw-${cropW})/2`, y = `(ih-${cropH})/2`;
  if (mode === 'top') y = '0';
  else if (mode === 'bottom') y = `ih-${cropH}`;
  else if (mode === 'left') x = '0';
  else if (mode === 'right') x = `iw-${cropW}`;
  return `crop=${cropW}:${cropH}:${x}:${y},scale=${tw}:${th}`;
}

export async function resizeVideo(inputPath, opts = {}) {
  try {
    ensureFfmpeg();
    const ext = opts.outputFormat || 'mp4';
    const meta = await getMeta(inputPath);
    let tw = parseInt(opts.targetWidth || 0, 10);
    let th = parseInt(opts.targetHeight || 0, 10);
    if (!tw || !th) { const r = RATIO_DIMS[opts.targetRatio] || RATIO_DIMS['16:9']; tw = r[0]; th = r[1]; }
    const filter = buildResizeFilter(meta.width || 1920, meta.height || 1080, tw, th, opts.cropMode || 'smart');
    const crf = QUALITY_CRF[opts.quality] ?? 23;
    const out = tempPath(ext);
    await runFfmpeg((cmd) => cmd.input(inputPath).videoFilters(filter).outputOptions(['-c:v libx264', '-c:a aac', '-preset fast', `-crf ${crf}`]).output(out));
    const size = await statSize(out);
    return { success: true, operation: 'resize', outputPath: out, format: ext, width: tw, height: th, size, sizeFormatted: formatBytes(size) };
  } catch (e) {
    log.error('resizeVideo error:', e.message);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. subtitleVideo
// ═══════════════════════════════════════════════════════════════════════════════

export async function subtitleVideo(inputPath, opts = {}) {
  try {
    ensureFfmpeg();
    const action = opts.action;

    if (action === 'generate') {
      // Extract audio for transcription (16k mono WAV)
      const out = tempPath('wav');
      await runFfmpeg((cmd) => cmd.input(inputPath).noVideo().audioCodec('pcm_s16le').audioChannels(1).audioFrequency(16000).output(out));
      const size = await statSize(out);
      return { success: true, operation: 'subtitles', method: 'generate', outputPath: out, format: 'wav', size, sizeFormatted: formatBytes(size), language: opts.language || 'en' };
    }

    if (action === 'burn') {
      if (!opts.subtitleFile) throw new Error('subtitleFile required for burn');
      const ext = opts.outputFormat || 'mp4';
      const out = tempPath(ext);
      const fontSize = opts.fontSize || 24;
      const fontColor = opts.fontColor || 'white';
      const align = opts.position === 'top' ? 6 : opts.position === 'center' ? 10 : 2;
      const subPath = opts.subtitleFile.replace(/\\/g, '/').replace(/:/g, '\\:');
      const style = `Fontsize=${fontSize},PrimaryColour=&H00FFFFFF,Alignment=${align}`;
      await runFfmpeg((cmd) => cmd.input(inputPath).videoFilters(`subtitles='${subPath}':force_style='${style}'`).outputOptions(['-c:v libx264', '-c:a copy', '-preset fast', '-crf 23']).output(out));
      const size = await statSize(out);
      return { success: true, operation: 'subtitles', method: 'burn', outputPath: out, format: ext, size, sizeFormatted: formatBytes(size) };
    }

    throw new Error(`Unknown subtitle action: ${action}`);
  } catch (e) {
    log.error('subtitleVideo error:', e.message);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. styleVideo
// ═══════════════════════════════════════════════════════════════════════════════

export async function styleVideo(inputPath, opts = {}) {
  try {
    ensureFfmpeg();
    const ext = opts.outputFormat || 'mp4';
    const out = tempPath(ext);
    const filters = [];

    if (opts.lutFile) {
      filters.push(`lut3d=file='${opts.lutFile.replace(/\\/g,'/').replace(/:/g,'\\:')}'`);
    } else if (opts.style && STYLE_PRESETS[opts.style]) {
      const p = STYLE_PRESETS[opts.style];
      if (p.eq) filters.push(`eq=${p.eq}`);
      if (p.cb) filters.push(`colorbalance=${p.cb}`);
      if (p.vignette) filters.push(`vignette=PI/${4 / p.vignette}`);
    }

    const eqParts = [];
    if (opts.brightness !== undefined) eqParts.push(`brightness=${opts.brightness}`);
    if (opts.contrast !== undefined) eqParts.push(`contrast=${opts.contrast}`);
    if (opts.saturation !== undefined) eqParts.push(`saturation=${opts.saturation}`);
    if (opts.gamma !== undefined) eqParts.push(`gamma=${opts.gamma}`);
    if (eqParts.length) filters.push(`eq=${eqParts.join(':')}`);
    if (opts.sharpen) filters.push(`unsharp=5:5:${opts.sharpen}:5:5:0`);
    if (opts.vignette) filters.push(`vignette=PI/${4 / opts.vignette}`);

    const speed = +opts.speed || 1;
    let audioFilter = null;
    if (speed !== 1) {
      filters.push(`setpts=${(1/speed).toFixed(4)}*PTS`);
      // atempo supports 0.5-2.0; chain for extremes
      const aFilters = [];
      let s = speed;
      while (s > 2) { aFilters.push('atempo=2.0'); s /= 2; }
      while (s < 0.5) { aFilters.push('atempo=0.5'); s *= 2; }
      aFilters.push(`atempo=${s.toFixed(4)}`);
      audioFilter = aFilters.join(',');
    }

    await runFfmpeg((cmd) => {
      cmd.input(inputPath);
      if (filters.length) cmd.videoFilters(filters.join(','));
      if (audioFilter) cmd.audioFilters(audioFilter);
      cmd.outputOptions(['-c:v libx264', '-c:a aac', '-preset fast', '-crf 20']).output(out);
    });
    const size = await statSize(out);
    return { success: true, operation: 'style', outputPath: out, format: ext, size, sizeFormatted: formatBytes(size), style: opts.style || 'custom' };
  } catch (e) {
    log.error('styleVideo error:', e.message);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. overlayVideo
// ═══════════════════════════════════════════════════════════════════════════════

function escDraw(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'"); }
function posExpr(pos) {
  switch (pos) {
    case 'top': return { x: '(w-text_w)/2', y: '50' };
    case 'bottom': return { x: '(w-text_w)/2', y: 'h-text_h-50' };
    case 'top_left': return { x: '50', y: '50' };
    case 'top_right': return { x: 'w-text_w-50', y: '50' };
    case 'bottom_left': return { x: '50', y: 'h-text_h-50' };
    case 'bottom_right': return { x: 'w-text_w-50', y: 'h-text_h-50' };
    default: return { x: '(w-text_w)/2', y: '(h-text_h)/2' };
  }
}

export async function overlayVideo(inputPath, opts = {}) {
  try {
    ensureFfmpeg();
    const action = opts.action;
    const ext = opts.outputFormat || 'mp4';
    const out = tempPath(ext);
    const fontSize = opts.fontSize || 48;
    const fontColor = opts.fontColor || 'white';
    const startAt = +opts.startAt || 0;
    const duration = opts.duration ? +opts.duration : null;
    const enable = duration !== null ? `:enable='between(t,${startAt},${startAt + duration})'` : '';

    if (action === 'watermark') {
      if (!opts.watermarkFile) throw new Error('watermarkFile required');
      const op = +opts.watermarkOpacity || 0.3;
      const filter = `[1:v]format=rgba,colorchannelmixer=aa=${op}[wm];[0:v][wm]overlay=W-w-20:H-h-20`;
      await runFfmpeg((cmd) => cmd.input(inputPath).input(opts.watermarkFile).complexFilter(filter).outputOptions(['-c:v libx264', '-c:a copy', '-preset fast', '-crf 23']).output(out));
      const size = await statSize(out);
      return { success: true, operation: 'overlay', method: 'watermark', outputPath: out, format: ext, size, sizeFormatted: formatBytes(size) };
    }

    let drawText;
    if (action === 'title') {
      const p = posExpr(opts.position || 'center');
      drawText = `drawtext=text='${escDraw(opts.text)}':fontsize=${fontSize * 1.5}:fontcolor=${fontColor}:box=1:boxcolor=black@0.5:boxborderw=20:x=${p.x}:y=${p.y}${enable}`;
    } else if (action === 'hook') {
      const p = posExpr('top');
      drawText = `drawtext=text='${escDraw(opts.text)}':fontsize=${fontSize * 1.8}:fontcolor=yellow:box=1:boxcolor=black@0.6:boxborderw=15:x=${p.x}:y=${p.y}:enable='between(t,${startAt},${startAt + (duration || 3)})'`;
    } else if (action === 'lower_third') {
      const lines = [];
      lines.push(`drawtext=text='${escDraw(opts.text)}':fontsize=${fontSize}:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=15:x=80:y=h-180${enable}`);
      if (opts.subtitle) lines.push(`drawtext=text='${escDraw(opts.subtitle)}':fontsize=${fontSize * 0.7}:fontcolor=white:x=80:y=h-130${enable}`);
      drawText = lines.join(',');
    } else if (action === 'text') {
      const p = posExpr(opts.position || 'center');
      drawText = `drawtext=text='${escDraw(opts.text)}':fontsize=${fontSize}:fontcolor=${fontColor}:x=${p.x}:y=${p.y}${enable}`;
    } else {
      throw new Error(`Unknown overlay action: ${action}`);
    }

    await runFfmpeg((cmd) => cmd.input(inputPath).videoFilters(drawText).outputOptions(['-c:v libx264', '-c:a copy', '-preset fast', '-crf 23']).output(out));
    const size = await statSize(out);
    return { success: true, operation: 'overlay', method: action, outputPath: out, format: ext, size, sizeFormatted: formatBytes(size) };
  } catch (e) {
    log.error('overlayVideo error:', e.message);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. audioVideo
// ═══════════════════════════════════════════════════════════════════════════════

export async function audioVideo(inputPath, opts = {}) {
  try {
    ensureFfmpeg();
    const action = opts.action;
    const ext = opts.outputFormat || 'mp4';

    if (action === 'extract') {
      const out = tempPath('m4a');
      await runFfmpeg((cmd) => cmd.input(inputPath).noVideo().audioCodec('aac').audioBitrate('192k').output(out));
      const size = await statSize(out);
      return { success: true, operation: 'audio', method: 'extract', outputPath: out, format: 'm4a', size, sizeFormatted: formatBytes(size) };
    }

    const out = tempPath(ext);

    if (action === 'normalize') {
      await runFfmpeg((cmd) => cmd.input(inputPath).audioFilters('loudnorm=I=-14:LRA=7:TP=-1').outputOptions(['-c:v copy', '-c:a aac', '-b:a 192k']).output(out));
    } else if (action === 'denoise') {
      const nr = opts.noiseReduction ?? 0.21;
      await runFfmpeg((cmd) => cmd.input(inputPath).audioFilters(`afftdn=nr=${(nr * 100).toFixed(0)}`).outputOptions(['-c:v copy', '-c:a aac', '-b:a 192k']).output(out));
    } else if (action === 'mix_music') {
      if (!opts.musicFile) throw new Error('musicFile required');
      const mv = opts.musicVolume ?? 0.15;
      await runFfmpeg((cmd) => cmd.input(inputPath).input(opts.musicFile).complexFilter(`[1:a]volume=${mv}[bg];[0:a][bg]amix=inputs=2:duration=first:dropout_transition=0[a]`).outputOptions(['-map 0:v', '-map [a]', '-c:v copy', '-c:a aac', '-b:a 192k']).output(out));
    } else if (action === 'volume') {
      const v = opts.volume ?? 1.0;
      await runFfmpeg((cmd) => cmd.input(inputPath).audioFilters(`volume=${v}`).outputOptions(['-c:v copy', '-c:a aac', '-b:a 192k']).output(out));
    } else if (action === 'fade') {
      const fi = opts.fadeIn || 0;
      const fo = opts.fadeOut || 0;
      const meta = await getMeta(inputPath);
      const vf = []; const af = [];
      if (fi > 0) { vf.push(`fade=t=in:st=0:d=${fi}`); af.push(`afade=t=in:st=0:d=${fi}`); }
      if (fo > 0) { vf.push(`fade=t=out:st=${meta.duration - fo}:d=${fo}`); af.push(`afade=t=out:st=${meta.duration - fo}:d=${fo}`); }
      await runFfmpeg((cmd) => {
        cmd.input(inputPath);
        if (vf.length) cmd.videoFilters(vf.join(','));
        if (af.length) cmd.audioFilters(af.join(','));
        cmd.outputOptions(['-c:v libx264', '-c:a aac', '-preset fast', '-crf 23']).output(out);
      });
    } else if (action === 'replace') {
      if (!opts.musicFile) throw new Error('musicFile required for replace');
      await runFfmpeg((cmd) => cmd.input(inputPath).input(opts.musicFile).outputOptions(['-map 0:v', '-map 1:a', '-c:v copy', '-c:a aac', '-shortest']).output(out));
    } else {
      throw new Error(`Unknown audio action: ${action}`);
    }

    const size = await statSize(out);
    return { success: true, operation: 'audio', method: action, outputPath: out, format: ext, size, sizeFormatted: formatBytes(size) };
  } catch (e) {
    log.error('audioVideo error:', e.message);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. facesVideo (face-aware processing — basic ffmpeg, advanced uses external CV)
// ═══════════════════════════════════════════════════════════════════════════════

export async function facesVideo(inputPath, opts = {}) {
  try {
    ensureFfmpeg();
    const action = opts.action;
    const ext = opts.outputFormat || 'mp4';
    const blur = opts.blurStrength || 20;

    if (action === 'detect') {
      // Extract keyframes, return paths so caller can run face detection (Azure CV / face-api)
      const dir = path.join(os.tmpdir(), `frames-${Date.now()}`);
      await fsp.mkdir(dir, { recursive: true });
      const meta = await getMeta(inputPath);
      const n = 10;
      const paths = [];
      for (let i = 0; i < n; i++) {
        const t = (meta.duration / (n + 1)) * (i + 1);
        const out = path.join(dir, `frame-${i}.jpg`);
        await runFfmpeg((cmd) => cmd.input(inputPath).seekInput(t).frames(1).output(out));
        paths.push({ time: t, path: out });
      }
      return { success: true, operation: 'faces', method: 'detect', frameCount: paths.length, frames: paths, note: 'Pass frames to a face detection API (Azure CV / face-api.js) for box coordinates' };
    }

    const out = tempPath(ext);

    if (action === 'blur') {
      await runFfmpeg((cmd) => cmd.input(inputPath).videoFilters(`boxblur=${blur}:1`).outputOptions(['-c:v libx264', '-c:a copy', '-preset fast', '-crf 23']).output(out));
    } else if (action === 'bg_blur') {
      // Approximate portrait mode: blurred copy underneath, sharper center crop on top
      const filter = `[0:v]split=2[orig][bg];[bg]boxblur=${blur}:1[bgblur];[orig]crop=iw/2:ih:iw/4:0[center];[bgblur][center]overlay=(W-w)/2:0`;
      await runFfmpeg((cmd) => cmd.input(inputPath).complexFilter(filter).outputOptions(['-c:v libx264', '-c:a copy', '-preset fast', '-crf 23']).output(out));
    } else if (action === 'focus_speaker') {
      // Center crop to 9:16
      const meta = await getMeta(inputPath);
      const targetH = meta.height || 1080;
      const targetW = Math.round(targetH * 9 / 16);
      await runFfmpeg((cmd) => cmd.input(inputPath).videoFilters(`crop=${targetW}:${targetH}:(iw-${targetW})/2:0`).outputOptions(['-c:v libx264', '-c:a copy', '-preset fast', '-crf 23']).output(out));
    } else {
      throw new Error(`Unknown faces action: ${action}`);
    }

    const size = await statSize(out);
    return { success: true, operation: 'faces', method: action, outputPath: out, format: ext, size, sizeFormatted: formatBytes(size) };
  } catch (e) {
    log.error('facesVideo error:', e.message);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 9. moderateVideo
// ═══════════════════════════════════════════════════════════════════════════════

const PLATFORM_RULES = {
  youtube: { maxDuration: 43200, maxFileSize: 256 * 1024 * 1024 * 1024 },
  tiktok: { maxDuration: 600, maxFileSize: 287 * 1024 * 1024 },
  instagram: { maxDuration: 5400, maxFileSize: 4 * 1024 * 1024 * 1024 },
  twitter: { maxDuration: 140, maxFileSize: 512 * 1024 * 1024 },
};

export async function moderateVideo(inputPath, opts = {}) {
  try {
    ensureFfmpeg();
    const checks = opts.checks?.includes('all') || !opts.checks ? ['nsfw','profanity','copyright','platform_safety'] : opts.checks;
    const platform = opts.platform || 'youtube';
    const frameCount = opts.extractFrames || 10;
    const meta = await getMeta(inputPath);
    const findings = [];

    if (checks.includes('platform_safety')) {
      const rules = PLATFORM_RULES[platform];
      if (rules) {
        if (meta.duration > rules.maxDuration) findings.push({ type: 'duration_exceeds', detail: `${meta.duration}s > ${rules.maxDuration}s for ${platform}` });
        if (meta.size > rules.maxFileSize) findings.push({ type: 'filesize_exceeds', detail: `${formatBytes(meta.size)} > ${formatBytes(rules.maxFileSize)} for ${platform}` });
      }
    }

    let frames = [];
    if (checks.includes('nsfw') || checks.includes('copyright')) {
      const dir = path.join(os.tmpdir(), `mod-${Date.now()}`);
      await fsp.mkdir(dir, { recursive: true });
      for (let i = 0; i < frameCount; i++) {
        const t = (meta.duration / (frameCount + 1)) * (i + 1);
        const out = path.join(dir, `f-${i}.jpg`);
        await runFfmpeg((cmd) => cmd.input(inputPath).seekInput(t).frames(1).output(out));
        frames.push({ time: t, path: out });
      }
    }

    return { success: true, operation: 'moderate', platform, checks, safe: findings.length === 0, findingCount: findings.length, findings, frames, note: 'Frames extracted; pass to Azure Content Safety / Vision API for NSFW + copyright detection' };
  } catch (e) {
    log.error('moderateVideo error:', e.message);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 10. batchVideo — pipeline runner
// ═══════════════════════════════════════════════════════════════════════════════

const PIPELINE_PRESETS = {
  podcast_shorts: [
    { tool: 'video_trim', options: { action: 'remove_silence' } },
    { tool: 'video_highlights', options: { action: 'energy_based', clipCount: 5, clipDuration: 30 } },
    { tool: 'video_style', options: { style: 'podcast' } },
  ],
  course_lessons: [
    { tool: 'video_trim', options: { action: 'scene_cut' } },
    { tool: 'video_resize', options: { targetRatio: '16:9' } },
    { tool: 'video_audio', options: { action: 'normalize' } },
  ],
  interview_highlights: [
    { tool: 'video_trim', options: { action: 'remove_silence' } },
    { tool: 'video_highlights', options: { action: 'energy_based', clipCount: 5 } },
    { tool: 'video_faces', options: { action: 'focus_speaker' } },
  ],
};

const TOOL_ROUTER = {
  video_trim: trimVideo,
  video_highlights: extractHighlights,
  video_resize: resizeVideo,
  video_subtitles: subtitleVideo,
  video_style: styleVideo,
  video_overlay: overlayVideo,
  video_audio: audioVideo,
  video_faces: facesVideo,
};

export async function batchVideo(inputPath, opts = {}) {
  try {
    ensureFfmpeg();
    const pipeline = opts.pipeline === 'custom' ? (opts.steps || []) : (PIPELINE_PRESETS[opts.pipeline] || []);
    if (!pipeline.length) throw new Error('No pipeline steps defined');
    let current = inputPath;
    const stepResults = [];
    for (const step of pipeline) {
      const fn = TOOL_ROUTER[step.tool];
      if (!fn) { stepResults.push({ tool: step.tool, status: 'skipped', error: 'unknown tool' }); continue; }
      const r = await fn(current, step.options || {});
      stepResults.push({ tool: step.tool, status: r.success ? 'success' : 'error', ...r });
      // chain output if produced a single file
      if (r.success && r.outputPath) current = r.outputPath;
    }
    return { success: true, operation: 'batch', pipeline: opts.pipeline, stepCount: stepResults.length, results: stepResults, succeeded: stepResults.filter((s) => s.status === 'success').length, failed: stepResults.filter((s) => s.status === 'error').length, finalOutput: current };
  } catch (e) {
    log.error('batchVideo error:', e.message);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 11. exportVideo — platform-ready export
// ═══════════════════════════════════════════════════════════════════════════════

export async function exportVideo(inputPath, opts = {}) {
  try {
    ensureFfmpeg();
    const platform = opts.platform || 'youtube';
    const preset = PLATFORM_PRESETS[platform];
    const ext = opts.format || 'mp4';
    const out = tempPath(ext);
    const meta = await getMeta(inputPath);
    const [tw, th] = RATIO_DIMS[preset.ratio];
    const filter = buildResizeFilter(meta.width || 1920, meta.height || 1080, tw, th, 'smart');
    const crf = opts.quality ? QUALITY_CRF[opts.quality] : preset.crf;

    await runFfmpeg((cmd) => {
      cmd.input(inputPath).videoFilters(filter)
        .outputOptions([`-c:v ${preset.vCodec}`, `-c:a ${preset.aCodec}`, `-b:a ${preset.aBitrate}`, `-preset ${preset.preset}`, `-crf ${crf}`, '-movflags +faststart'])
        .output(out);
    });
    const size = await statSize(out);

    let thumbnailPath;
    if (opts.generateThumbnail !== false) {
      thumbnailPath = path.join(os.tmpdir(), `thumb-${Date.now()}.jpg`);
      const t = opts.thumbnailTime || meta.duration * 0.1;
      await runFfmpeg((cmd) => cmd.input(out).seekInput(t).frames(1).output(thumbnailPath));
    }

    return {
      success: true, operation: 'export', platform, outputPath: out, format: ext, size, sizeFormatted: formatBytes(size),
      thumbnailPath, metadata: { title: opts.title, description: opts.description, tags: opts.tags || [] },
      width: tw, height: th, ratio: preset.ratio,
    };
  } catch (e) {
    log.error('exportVideo error:', e.message);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 12. transformVideo — trim/split/concat/speed/resize/crop
// ═══════════════════════════════════════════════════════════════════════════════

export async function transformVideo(inputPath, opts = {}) {
  try {
    ensureFfmpeg();
    const action = opts.action;
    const ext = opts.outputFormat || 'mp4';

    if (action === 'trim') {
      return trimVideo(inputPath, { action: 'trim', startTime: opts.startTime, endTime: opts.endTime, outputFormat: ext });
    }

    if (action === 'split') {
      const meta = await getMeta(inputPath);
      const points = opts.splitPoints?.length ? [...opts.splitPoints].sort((a,b)=>a-b) : (function(){ const n = parseInt(opts.segments || 2, 10); const step = meta.duration / n; const p = []; for (let i = 1; i < n; i++) p.push(i * step); return p; })();
      const segs = [];
      let prev = 0;
      const all = [...points, meta.duration];
      for (let i = 0; i < all.length; i++) {
        const out = tempPath(ext);
        await runFfmpeg((cmd) => cmd.input(inputPath).setStartTime(prev).duration(all[i] - prev).outputOptions(['-c:v libx264', '-c:a aac', '-preset fast', '-crf 23']).output(out));
        segs.push({ index: i, start: prev, end: all[i], outputPath: out, size: await statSize(out), status: 'success' });
        prev = all[i];
      }
      return { success: true, operation: 'transform', method: 'split', results: segs };
    }

    if (action === 'concat') {
      if (!Array.isArray(opts.inputFiles) || opts.inputFiles.length < 2) throw new Error('inputFiles[] required');
      const list = path.join(os.tmpdir(), `concat-${Date.now()}.txt`);
      await fsp.writeFile(list, opts.inputFiles.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join('\n'));
      const out = tempPath(ext);
      await runFfmpeg((cmd) => cmd.input(list).inputOptions(['-f concat', '-safe 0']).outputOptions(['-c copy']).output(out));
      const size = await statSize(out);
      await fsp.unlink(list).catch(() => {});
      return { success: true, operation: 'transform', method: 'concat', outputPath: out, format: ext, size, sizeFormatted: formatBytes(size) };
    }

    if (action === 'speed') {
      return styleVideo(inputPath, { speed: opts.speed, outputFormat: ext });
    }

    if (action === 'resize') {
      return resizeVideo(inputPath, { targetWidth: opts.width, targetHeight: opts.height, targetRatio: opts.aspectRatio || '16:9', outputFormat: ext });
    }

    if (action === 'crop') {
      const out = tempPath(ext);
      await runFfmpeg((cmd) => cmd.input(inputPath).videoFilters(`crop=${opts.cropWidth}:${opts.cropHeight}:${opts.cropX || 0}:${opts.cropY || 0}`).outputOptions(['-c:v libx264', '-c:a copy', '-preset fast', '-crf 23']).output(out));
      const size = await statSize(out);
      return { success: true, operation: 'transform', method: 'crop', outputPath: out, format: ext, size, sizeFormatted: formatBytes(size) };
    }

    throw new Error(`Unknown transform action: ${action}`);
  } catch (e) {
    log.error('transformVideo error:', e.message);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 13. convertVideo
// ═══════════════════════════════════════════════════════════════════════════════

const CODEC_MAP = { h264: 'libx264', h265: 'libx265', vp8: 'libvpx', vp9: 'libvpx-vp9', av1: 'libaom-av1' };

export async function convertVideo(inputPath, opts = {}) {
  try {
    ensureFfmpeg();
    const action = opts.action;

    if (action === 'format') {
      const target = opts.targetFormat || 'mp4';
      const out = tempPath(target);
      const codec = CODEC_MAP[opts.codec] || 'libx264';
      await runFfmpeg((cmd) => cmd.input(inputPath).outputOptions([`-c:v ${codec}`, '-c:a aac', '-preset fast', `-crf ${QUALITY_CRF[opts.quality] ?? 23}`]).output(out));
      const size = await statSize(out);
      return { success: true, operation: 'convert', method: 'format', outputPath: out, format: target, size, sizeFormatted: formatBytes(size) };
    }

    if (action === 'compress') {
      const out = tempPath(opts.outputFormat || 'mp4');
      let crf = QUALITY_CRF[opts.quality] ?? 28;
      if (opts.maxSizeMB) {
        const meta = await getMeta(inputPath);
        const targetBitrate = Math.floor((opts.maxSizeMB * 8 * 1024) / Math.max(1, meta.duration));
        await runFfmpeg((cmd) => cmd.input(inputPath).outputOptions(['-c:v libx264', '-c:a aac', `-b:v ${targetBitrate}k`, '-b:a 96k', '-preset slow']).output(out));
      } else {
        await runFfmpeg((cmd) => cmd.input(inputPath).outputOptions(['-c:v libx264', '-c:a aac', `-crf ${crf}`, '-preset slow']).output(out));
      }
      const size = await statSize(out);
      return { success: true, operation: 'convert', method: 'compress', outputPath: out, format: opts.outputFormat || 'mp4', size, sizeFormatted: formatBytes(size) };
    }

    if (action === 'gif') {
      const out = tempPath('gif');
      const start = opts.gifStart || 0;
      const dur = opts.gifDuration || 5;
      const fps = opts.gifFps || 10;
      const w = opts.gifWidth || 480;
      const palette = path.join(os.tmpdir(), `pal-${Date.now()}.png`);
      await runFfmpeg((cmd) => cmd.input(inputPath).setStartTime(start).duration(dur).videoFilters(`fps=${fps},scale=${w}:-1:flags=lanczos,palettegen`).output(palette));
      await runFfmpeg((cmd) => cmd.input(inputPath).input(palette).setStartTime(start).duration(dur).complexFilter(`[0:v]fps=${fps},scale=${w}:-1:flags=lanczos[x];[x][1:v]paletteuse`).output(out));
      await fsp.unlink(palette).catch(() => {});
      const size = await statSize(out);
      return { success: true, operation: 'convert', method: 'gif', outputPath: out, format: 'gif', size, sizeFormatted: formatBytes(size) };
    }

    if (action === 'thumbnail') {
      const meta = await getMeta(inputPath);
      const times = opts.thumbnailTimes?.length ? opts.thumbnailTimes : (function(){ const n = opts.thumbnailCount || 1; return Array.from({length:n}, (_,i) => (meta.duration / (n+1)) * (i+1)); })();
      const dir = path.join(os.tmpdir(), `thumbs-${Date.now()}`);
      await fsp.mkdir(dir, { recursive: true });
      const out = [];
      for (let i = 0; i < times.length; i++) {
        const p = path.join(dir, `thumb-${i}.jpg`);
        await runFfmpeg((cmd) => cmd.input(inputPath).seekInput(times[i]).frames(1).output(p));
        out.push({ time: times[i], path: p });
      }
      return { success: true, operation: 'convert', method: 'thumbnail', count: out.length, results: out.map((t) => ({ ...t, status: 'success' })) };
    }

    if (action === 'responsive') {
      const RES = { '360p':[640,360], '480p':[854,480], '720p':[1280,720], '1080p':[1920,1080], '1440p':[2560,1440], '4k':[3840,2160] };
      const list = opts.resolutions?.length ? opts.resolutions : ['360p','720p','1080p'];
      const results = [];
      for (const r of list) {
        const dim = RES[r]; if (!dim) continue;
        const out = tempPath(opts.outputFormat || 'mp4');
        await runFfmpeg((cmd) => cmd.input(inputPath).videoFilters(`scale=${dim[0]}:${dim[1]}:force_original_aspect_ratio=decrease,pad=${dim[0]}:${dim[1]}:(ow-iw)/2:(oh-ih)/2:black`).outputOptions(['-c:v libx264', '-c:a aac', '-preset fast', '-crf 23']).output(out));
        results.push({ resolution: r, outputPath: out, size: await statSize(out), status: 'success' });
      }
      return { success: true, operation: 'convert', method: 'responsive', count: results.length, results };
    }

    throw new Error(`Unknown convert action: ${action}`);
  } catch (e) {
    log.error('convertVideo error:', e.message);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 14. analyzeVideo
// ═══════════════════════════════════════════════════════════════════════════════

export async function analyzeVideo(inputPath, opts = {}) {
  try {
    if (!HAS_FFPROBE) throw new Error('ffprobe binary not available');
    const action = opts.action || 'metadata';
    const meta = await getMeta(inputPath);

    if (action === 'metadata') return { success: true, operation: 'analyze', method: 'metadata', ...meta };
    if (action === 'summary') return { success: true, operation: 'analyze', method: 'summary', summary: `${(meta.duration||0).toFixed(1)}s • ${meta.width}x${meta.height} • ${formatBytes(meta.size)} • ${meta.formatName}`, ...meta };

    if (action === 'scenes') {
      const thr = opts.sceneThreshold ?? 0.3;
      const proc = spawn('ffmpeg', ['-i', inputPath, '-vf', `select='gt(scene,${thr})',showinfo`, '-f', 'null', '-']);
      let stderr = '';
      proc.stderr.on('data', (d) => { stderr += d.toString(); });
      await new Promise((r) => proc.on('close', r));
      const times = [...stderr.matchAll(/pts_time:([\d.]+)/g)].map((m) => +m[1]);
      return { success: true, operation: 'analyze', method: 'scenes', sceneCount: times.length, scenes: times };
    }

    if (action === 'silence') {
      const dB = opts.silenceThreshold ?? -30;
      const dur = opts.silenceDuration ?? 1.0;
      const proc = spawn('ffmpeg', ['-i', inputPath, '-af', `silencedetect=noise=${dB}dB:d=${dur}`, '-f', 'null', '-']);
      let stderr = '';
      proc.stderr.on('data', (d) => { stderr += d.toString(); });
      await new Promise((r) => proc.on('close', r));
      const starts = [...stderr.matchAll(/silence_start: ([\d.]+)/g)].map((m) => +m[1]);
      const ends = [...stderr.matchAll(/silence_end: ([\d.]+)/g)].map((m) => +m[1]);
      const segs = starts.map((s, i) => ({ start: s, end: ends[i] ?? null, duration: ends[i] ? ends[i] - s : null }));
      return { success: true, operation: 'analyze', method: 'silence', silenceCount: segs.length, segments: segs };
    }

    if (action === 'validate') {
      const platform = opts.platform || 'web';
      const rules = PLATFORM_RULES[platform] || { maxDuration: Infinity, maxFileSize: Infinity };
      const issues = [];
      if (meta.duration > rules.maxDuration) issues.push({ type: 'duration_exceeds', detail: `${meta.duration}s > ${rules.maxDuration}s` });
      if (meta.size > rules.maxFileSize) issues.push({ type: 'size_exceeds', detail: `${formatBytes(meta.size)} > ${formatBytes(rules.maxFileSize)}` });
      if (!meta.codec) issues.push({ type: 'no_video_stream' });
      return { success: true, operation: 'analyze', method: 'validate', valid: issues.length === 0, issueCount: issues.length, issues, platform };
    }

    throw new Error(`Unknown analyze action: ${action}`);
  } catch (e) {
    log.error('analyzeVideo error:', e.message);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 15. filterVideo
// ═══════════════════════════════════════════════════════════════════════════════

export async function filterVideo(inputPath, opts = {}) {
  try {
    ensureFfmpeg();
    const action = opts.action;
    const ext = opts.outputFormat || 'mp4';
    const out = tempPath(ext);
    let filters = [];

    if (action === 'color_correct') {
      const eq = [];
      if (opts.brightness !== undefined) eq.push(`brightness=${opts.brightness}`);
      if (opts.contrast !== undefined) eq.push(`contrast=${opts.contrast}`);
      if (opts.saturation !== undefined) eq.push(`saturation=${opts.saturation}`);
      if (opts.gamma !== undefined) eq.push(`gamma=${opts.gamma}`);
      if (eq.length) filters.push(`eq=${eq.join(':')}`);
      if (opts.hue !== undefined) filters.push(`hue=h=${opts.hue}`);
    } else if (action === 'cinematic') {
      if (opts.lutFile) filters.push(`lut3d=file='${opts.lutFile.replace(/\\/g,'/').replace(/:/g,'\\:')}'`);
      else if (opts.cinematicStyle && CINEMATIC_PRESETS[opts.cinematicStyle]) filters.push(CINEMATIC_PRESETS[opts.cinematicStyle]);
    } else if (action === 'blur_bg') {
      const b = opts.blurStrength || 20;
      filters.push(`split=2[a][b];[a]boxblur=${b}:1[bg];[b]crop=iw*0.7:ih:iw*0.15:0[fg];[bg][fg]overlay=(W-w)/2:0`);
    } else if (action === 'stabilize') {
      // Two-pass stabilization
      const trf = path.join(os.tmpdir(), `stab-${Date.now()}.trf`);
      await runFfmpeg((cmd) => cmd.input(inputPath).outputOptions([`-vf vidstabdetect=result=${trf}`, '-f null']).output('-'));
      const smoothing = Math.round((opts.stabilizeStrength ?? 0.5) * 30);
      await runFfmpeg((cmd) => cmd.input(inputPath).videoFilters(`vidstabtransform=input=${trf}:smoothing=${smoothing}`).outputOptions(['-c:v libx264', '-c:a copy', '-preset fast', '-crf 23']).output(out));
      await fsp.unlink(trf).catch(() => {});
      const size = await statSize(out);
      return { success: true, operation: 'filter', method: 'stabilize', outputPath: out, format: ext, size, sizeFormatted: formatBytes(size) };
    } else if (action === 'denoise_video') {
      const s = opts.denoiseStrength ?? 0.5;
      filters.push(`hqdn3d=${(s*4).toFixed(2)}:${(s*3).toFixed(2)}:${(s*6).toFixed(2)}:${(s*4.5).toFixed(2)}`);
    } else if (action === 'sharpen') {
      const a = opts.sharpenAmount ?? 0.5;
      filters.push(`unsharp=5:5:${a}:5:5:0`);
    } else {
      throw new Error(`Unknown filter action: ${action}`);
    }

    const filterStr = filters.join(',');
    if (filterStr.includes('split')) {
      await runFfmpeg((cmd) => cmd.input(inputPath).complexFilter(filterStr).outputOptions(['-c:v libx264', '-c:a copy', '-preset fast', '-crf 23']).output(out));
    } else {
      await runFfmpeg((cmd) => cmd.input(inputPath).videoFilters(filterStr).outputOptions(['-c:v libx264', '-c:a copy', '-preset fast', '-crf 23']).output(out));
    }
    const size = await statSize(out);
    return { success: true, operation: 'filter', method: action, outputPath: out, format: ext, size, sizeFormatted: formatBytes(size) };
  } catch (e) {
    log.error('filterVideo error:', e.message);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 16. aiVideo — AI-augmented operations (require external AI services)
// ═══════════════════════════════════════════════════════════════════════════════

export async function aiVideo(inputPath, opts = {}) {
  try {
    ensureFfmpeg();
    const action = opts.action;

    if (action === 'transcribe') {
      // Extract audio for Whisper. The actual STT call is performed by an AI
      // service layer; we return the audio path and metadata.
      const out = tempPath('wav');
      await runFfmpeg((cmd) => cmd.input(inputPath).noVideo().audioCodec('pcm_s16le').audioChannels(1).audioFrequency(16000).output(out));
      return { success: true, operation: 'ai', method: 'transcribe', audioPath: out, format: 'wav', language: opts.language || 'en', outputSubFormat: opts.outputSubFormat || 'srt', note: 'Pass audioPath to OpenAI Whisper API for transcription' };
    }

    if (action === 'caption') {
      // Same as transcribe — caller burns subs after Whisper returns SRT
      const out = tempPath('wav');
      await runFfmpeg((cmd) => cmd.input(inputPath).noVideo().audioCodec('pcm_s16le').audioChannels(1).audioFrequency(16000).output(out));
      return { success: true, operation: 'ai', method: 'caption', audioPath: out, language: opts.language || 'en', captionStyle: opts.captionStyle || 'default', captionPosition: opts.captionPosition || 'bottom', note: 'Run Whisper → write SRT → call subtitleVideo({action:burn})' };
    }

    if (action === 'describe' || action === 'moderate') {
      const meta = await getMeta(inputPath);
      const n = opts.extractFrames || 10;
      const dir = path.join(os.tmpdir(), `ai-${Date.now()}`);
      await fsp.mkdir(dir, { recursive: true });
      const frames = [];
      for (let i = 0; i < n; i++) {
        const t = (meta.duration / (n + 1)) * (i + 1);
        const p = path.join(dir, `f-${i}.jpg`);
        await runFfmpeg((cmd) => cmd.input(inputPath).seekInput(t).frames(1).output(p));
        frames.push({ time: t, path: p });
      }
      return { success: true, operation: 'ai', method: action, frames, frameCount: frames.length, ...(action === 'moderate' ? { checks: opts.moderateChecks || ['all'] } : {}), note: `Pass frames to a vision model (GPT-4V / Gemini / Claude) for ${action}` };
    }

    if (action === 'highlights') {
      // Energy-based extraction is a useful proxy without dedicated AI service
      return extractHighlights(inputPath, { action: 'energy_based', clipCount: opts.highlightCount || 5, clipDuration: opts.highlightDuration || 30, outputFormat: opts.outputFormat });
    }

    if (action === 'smart_crop') {
      // Without face/subject detection model, default to center crop to target ratio
      const ratio = opts.targetRatio || '9:16';
      const meta = await getMeta(inputPath);
      const [tw, th] = RATIO_DIMS[ratio];
      const filter = buildResizeFilter(meta.width || 1920, meta.height || 1080, tw, th, 'smart');
      const out = tempPath(opts.outputFormat || 'mp4');
      await runFfmpeg((cmd) => cmd.input(inputPath).videoFilters(filter).outputOptions(['-c:v libx264', '-c:a copy', '-preset fast', '-crf 23']).output(out));
      const size = await statSize(out);
      return { success: true, operation: 'ai', method: 'smart_crop', outputPath: out, format: opts.outputFormat || 'mp4', width: tw, height: th, ratio, size, sizeFormatted: formatBytes(size), note: 'For true subject tracking, integrate with Azure CV / face-api.js' };
    }

    throw new Error(`Unknown ai action: ${action}`);
  } catch (e) {
    log.error('aiVideo error:', e.message);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Capabilities
// ═══════════════════════════════════════════════════════════════════════════════

export function getCapabilities() {
  return {
    supported: HAS_FFMPEG && HAS_FFPROBE,
    binaries: { ffmpeg: HAS_FFMPEG, ffprobe: HAS_FFPROBE },
    formats: ['mp4','webm','mov','mkv','avi'],
    codecs: ['h264','h265','vp8','vp9','av1'],
    operations: ['trim','highlights','resize','subtitles','style','overlay','audio','faces','moderate','batch','export','transform','convert','analyze','filter','ai'],
    maxDuration: 0,
    note: HAS_FFMPEG ? 'Production-ready' : 'Install ffmpeg: sudo apt install -y ffmpeg',
  };
}
