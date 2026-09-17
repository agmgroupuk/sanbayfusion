import { createLogger } from '../lib/logger.js';
const log = createLogger('videoTools');
/**
 * VIDEO TOOLS — AI Video Processing Tool Definitions + Executor
 * ═══════════════════════════════════════════════════════════════════════════════
 * 11 Anthropic-format tool definitions + unified executor with S3 upload.
 * 
 * Architecture:
 *   1. VIDEO_TOOL_DEFINITIONS — LLM-readable tool schemas (input_schema)
 *   2. executeVideoTool()    — Routes to videoEngine, handles S3/dataUrl
 *   3. isVideoTool()         — Helper for canvas.js routing
 *
 * Follows identical pattern to imageTools.js:
 *   Backend defines tools → LLM decides → Backend executes
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  trimVideo,
  extractHighlights,
  resizeVideo,
  subtitleVideo,
  styleVideo,
  overlayVideo,
  audioVideo,
  facesVideo,
  moderateVideo,
  batchVideo,
  exportVideo,
  transformVideo,
  convertVideo,
  analyzeVideo,
  filterVideo,
  aiVideo,
  getCapabilities,
} from './videoEngine.js';

import {
  uploadImage as uploadToS3,
  uploadImages as uploadMultipleToS3,
  isConfigured as s3Configured,
} from './imageStorage.js';


// ═══════════════════════════════════════════════════════════════════════════════
// TOOL DEFINITIONS — Anthropic function-calling format
// ═══════════════════════════════════════════════════════════════════════════════

export const VIDEO_TOOL_DEFINITIONS = [

  // ─── 1. VIDEO TRIM ─────────────────────────────────────────────────────────
  {
    name: 'video_trim',
    description: `AI video trimming and cutting tool. Remove silence, dead frames, bad takes, or manually trim to specific timestamps.

Actions:
- trim: Cut video to specific start/end timestamps
- remove_silence: Automatically detect and remove silent segments
- scene_cut: Detect scene changes and return timestamps for editing
- auto_start_end: Auto-detect content start (skip black/silence intros) and end

USE THIS WHEN the user says: "cut this video", "remove silence", "trim the beginning", "clean up dead air", "detect scenes", "remove black frames"`,
    input_schema: {
      type: 'object',
      properties: {
        inputPath: {
          type: 'string',
          description: 'Absolute path to the input video file',
        },
        action: {
          type: 'string',
          enum: ['trim', 'remove_silence', 'scene_cut', 'auto_start_end'],
          description: 'Trimming method to apply',
        },
        startTime: {
          type: 'number',
          description: 'Start time in seconds (for manual trim)',
        },
        endTime: {
          type: 'number',
          description: 'End time in seconds (for manual trim)',
        },
        silenceThreshold: {
          type: 'number',
          description: 'dB threshold for silence detection (default: -30). Lower = more aggressive.',
        },
        silenceDuration: {
          type: 'number',
          description: 'Minimum silence duration in seconds to cut (default: 1.0)',
        },
        sceneThreshold: {
          type: 'number',
          description: 'Scene change sensitivity 0-1 (default: 0.3). Lower = more sensitive.',
        },
        outputFormat: {
          type: 'string',
          enum: ['mp4', 'webm', 'mov', 'mkv'],
          description: 'Output format (default: mp4)',
        },
      },
      required: ['inputPath', 'action'],
    },
  },

  // ─── 2. VIDEO HIGHLIGHTS ───────────────────────────────────────────────────
  {
    name: 'video_highlights',
    description: `Extract viral clips, best moments, and shorts from long videos. AI analyzes energy/audio to find the most engaging segments.

Actions:
- extract_clips: Evenly extract N clips across the video duration
- energy_based: Analyze audio energy to find high-energy peak moments

Platform targets: tiktok, reels, shorts, twitter, youtube — auto-sizes and formats.

USE THIS WHEN the user says: "make shorts from this", "extract highlights", "find best moments", "create reels", "make TikToks", "viral clips", "podcast to shorts"`,
    input_schema: {
      type: 'object',
      properties: {
        inputPath: {
          type: 'string',
          description: 'Absolute path to the input video file',
        },
        action: {
          type: 'string',
          enum: ['extract_clips', 'energy_based'],
          description: 'Highlight extraction method',
        },
        clipCount: {
          type: 'integer',
          description: 'Number of clips to extract (default: 5)',
        },
        clipDuration: {
          type: 'number',
          description: 'Target duration per clip in seconds (default: 30)',
        },
        targetPlatform: {
          type: 'string',
          enum: ['tiktok', 'reels', 'shorts', 'twitter', 'youtube'],
          description: 'Target platform — determines aspect ratio & max duration',
        },
      },
      required: ['inputPath'],
    },
  },

  // ─── 3. VIDEO RESIZE ──────────────────────────────────────────────────────
  {
    name: 'video_resize',
    description: `Smart resize video for different platforms. AI decides the best crop/pad strategy.

Aspect ratios: 16:9 (YouTube/landscape), 9:16 (Reels/TikTok/Shorts), 1:1 (Instagram feed), 4:5 (Instagram portrait), 4:3, 21:9 (ultrawide).

Crop modes:
- smart: Letterbox/pillarbox with black bars (safe, no content lost)
- center: Crop to center (may cut edges)
- top/bottom/left/right: Directional crop

USE THIS WHEN the user says: "resize for TikTok", "make it vertical", "square crop", "convert to 9:16", "make YouTube format"`,
    input_schema: {
      type: 'object',
      properties: {
        inputPath: {
          type: 'string',
          description: 'Absolute path to the input video file',
        },
        targetRatio: {
          type: 'string',
          enum: ['16:9', '9:16', '1:1', '4:5', '4:3', '21:9'],
          description: 'Target aspect ratio',
        },
        targetWidth: {
          type: 'integer',
          description: 'Override target width in pixels',
        },
        targetHeight: {
          type: 'integer',
          description: 'Override target height in pixels',
        },
        cropMode: {
          type: 'string',
          enum: ['smart', 'center', 'top', 'bottom', 'left', 'right'],
          description: 'How to handle aspect ratio mismatch (default: smart)',
        },
        quality: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'lossless'],
          description: 'Output quality preset (default: high)',
        },
        outputFormat: {
          type: 'string',
          enum: ['mp4', 'webm', 'mov', 'mkv'],
          description: 'Output format (default: mp4)',
        },
      },
      required: ['inputPath', 'targetRatio'],
    },
  },

  // ─── 4. VIDEO SUBTITLES ────────────────────────────────────────────────────
  {
    name: 'video_subtitles',
    description: `AI subtitles and captions. Extract audio for transcription, or burn existing subtitles into video.

Actions:
- generate: Extract audio track (WAV 16kHz mono) for speech-to-text transcription via Whisper
- burn: Burn .srt or .ass subtitle file into video with customizable styling

Styles: default, bold, emoji, highlighted, karaoke
Positions: top, center, bottom

USE THIS WHEN the user says: "add subtitles", "add captions", "burn captions", "transcribe video", "generate subtitles", "hardcode subs"`,
    input_schema: {
      type: 'object',
      properties: {
        inputPath: {
          type: 'string',
          description: 'Absolute path to the input video file',
        },
        action: {
          type: 'string',
          enum: ['generate', 'burn'],
          description: 'Subtitle action — generate extracts audio, burn hardcodes subs',
        },
        subtitleFile: {
          type: 'string',
          description: 'Path to .srt or .ass subtitle file (required for burn action)',
        },
        language: {
          type: 'string',
          description: 'Source language code (default: en)',
        },
        style: {
          type: 'string',
          enum: ['default', 'bold', 'emoji', 'highlighted', 'karaoke'],
          description: 'Caption styling (default: default)',
        },
        fontSize: {
          type: 'integer',
          description: 'Font size in pixels (default: 24)',
        },
        fontColor: {
          type: 'string',
          description: 'Font color name or hex (default: white)',
        },
        position: {
          type: 'string',
          enum: ['top', 'center', 'bottom'],
          description: 'Subtitle position (default: bottom)',
        },
        outputFormat: {
          type: 'string',
          enum: ['mp4', 'webm', 'mov', 'mkv'],
          description: 'Output format (default: mp4)',
        },
      },
      required: ['inputPath', 'action'],
    },
  },

  // ─── 5. VIDEO STYLE ───────────────────────────────────────────────────────
  {
    name: 'video_style',
    description: `AI color grading, style presets, and look adjustments. Make any video look cinematic, warm, vintage, etc.

Style presets: cinematic, vlog, podcast, dark, bright, warm, cool, vintage, noir
Manual controls: brightness, contrast, saturation, gamma, sharpen, vignette, speed

Also handles playback speed changes (slow-mo, timelapse).

USE THIS WHEN the user says: "make it cinematic", "color grade", "warm tones", "vintage look", "add vignette", "slow motion", "speed up", "noir style", "brighten it"`,
    input_schema: {
      type: 'object',
      properties: {
        inputPath: {
          type: 'string',
          description: 'Absolute path to the input video file',
        },
        style: {
          type: 'string',
          enum: ['cinematic', 'vlog', 'podcast', 'dark', 'bright', 'warm', 'cool', 'vintage', 'noir'],
          description: 'Style preset to apply',
        },
        lutFile: {
          type: 'string',
          description: 'Path to custom .cube LUT file (overrides style preset)',
        },
        brightness: {
          type: 'number',
          description: 'Brightness adjustment -1 to 1 (default: 0)',
        },
        contrast: {
          type: 'number',
          description: 'Contrast 0-2 (default: 1.0)',
        },
        saturation: {
          type: 'number',
          description: 'Saturation 0-3 (default: 1.0)',
        },
        gamma: {
          type: 'number',
          description: 'Gamma correction 0.1-10 (default: 1.0)',
        },
        sharpen: {
          type: 'number',
          description: 'Sharpening intensity 0-2 (default: 0)',
        },
        vignette: {
          type: 'number',
          description: 'Vignette intensity 0-1 (default: 0)',
        },
        speed: {
          type: 'number',
          description: 'Playback speed 0.25-4.0 (default: 1.0). <1 = slow-mo, >1 = fast.',
        },
        outputFormat: {
          type: 'string',
          enum: ['mp4', 'webm', 'mov', 'mkv'],
          description: 'Output format (default: mp4)',
        },
      },
      required: ['inputPath'],
    },
  },

  // ─── 6. VIDEO OVERLAY ─────────────────────────────────────────────────────
  {
    name: 'video_overlay',
    description: `Add AI-generated titles, hook text, lower thirds, watermarks, and text overlays to video.

Actions:
- title: Large centered title text with background box
- hook: Eye-catching hook text in first 3 seconds (yellow, large)
- lower_third: Professional name/title bar at bottom of frame
- watermark: Image watermark overlay with adjustable opacity
- text: Generic text overlay at any position

USE THIS WHEN the user says: "add title", "add hook text", "lower third", "add watermark", "overlay text", "name plate", "brand overlay"`,
    input_schema: {
      type: 'object',
      properties: {
        inputPath: {
          type: 'string',
          description: 'Absolute path to the input video file',
        },
        action: {
          type: 'string',
          enum: ['title', 'hook', 'lower_third', 'watermark', 'text'],
          description: 'Type of overlay to add',
        },
        text: {
          type: 'string',
          description: 'Text content for the overlay',
        },
        subtitle: {
          type: 'string',
          description: 'Secondary text (used for lower_third subtitle line)',
        },
        fontSize: {
          type: 'integer',
          description: 'Font size in pixels (default: 48)',
        },
        fontColor: {
          type: 'string',
          description: 'Font color (default: white)',
        },
        position: {
          type: 'string',
          enum: ['center', 'top', 'bottom', 'top_left', 'top_right', 'bottom_left', 'bottom_right'],
          description: 'Overlay position (default: center)',
        },
        duration: {
          type: 'number',
          description: 'How long overlay shows in seconds (null = entire video)',
        },
        startAt: {
          type: 'number',
          description: 'When overlay appears in seconds (default: 0)',
        },
        watermarkFile: {
          type: 'string',
          description: 'Path to watermark image file (required for watermark action)',
        },
        watermarkOpacity: {
          type: 'number',
          description: 'Watermark opacity 0-1 (default: 0.3)',
        },
        outputFormat: {
          type: 'string',
          enum: ['mp4', 'webm', 'mov', 'mkv'],
          description: 'Output format (default: mp4)',
        },
      },
      required: ['inputPath', 'action'],
    },
  },

  // ─── 7. VIDEO AUDIO ───────────────────────────────────────────────────────
  {
    name: 'video_audio',
    description: `AI audio processing for videos. Normalize levels, remove noise, mix background music, adjust volume, add fades.

Actions:
- normalize: Broadcast-standard loudness normalization (-14 LUFS)
- denoise: AI noise reduction (removes background hum, wind, etc.)
- mix_music: Mix background music track at specified volume level
- volume: Adjust master volume
- fade: Audio + video fade in/out transitions
- extract: Extract audio track only (AAC)
- replace: Replace audio track with a different audio file

USE THIS WHEN the user says: "remove noise", "add background music", "normalize audio", "fade out", "volume up", "extract audio", "replace audio", "balance sound"`,
    input_schema: {
      type: 'object',
      properties: {
        inputPath: {
          type: 'string',
          description: 'Absolute path to the input video file',
        },
        action: {
          type: 'string',
          enum: ['normalize', 'denoise', 'mix_music', 'volume', 'fade', 'extract', 'replace'],
          description: 'Audio processing action',
        },
        musicFile: {
          type: 'string',
          description: 'Path to background music or replacement audio file',
        },
        musicVolume: {
          type: 'number',
          description: 'Background music volume 0-1 relative to main audio (default: 0.15)',
        },
        volume: {
          type: 'number',
          description: 'Master volume multiplier (default: 1.0)',
        },
        fadeIn: {
          type: 'number',
          description: 'Fade in duration in seconds (default: 0)',
        },
        fadeOut: {
          type: 'number',
          description: 'Fade out duration in seconds (default: 0)',
        },
        noiseReduction: {
          type: 'number',
          description: 'Noise reduction strength 0-1 (default: 0.21)',
        },
        outputFormat: {
          type: 'string',
          enum: ['mp4', 'webm', 'mov', 'mkv'],
          description: 'Output format (default: mp4)',
        },
      },
      required: ['inputPath', 'action'],
    },
  },

  // ─── 8. VIDEO FACES ───────────────────────────────────────────────────────
  {
    name: 'video_faces',
    description: `AI face and object detection for video. Face tracking crop, blur faces, speaker focus, background blur.

Actions:
- detect: Detect face regions (returns metadata for further processing)
- blur: Apply full-frame blur effect (for privacy, pair with Azure CV for face-specific)
- bg_blur: Background/portrait blur — keeps center sharp, blurs edges
- focus_speaker: Crop and center on speaker, output 9:16 vertical format

USE THIS WHEN the user says: "blur faces", "focus on speaker", "background blur", "portrait mode", "detect faces", "auto crop face", "privacy blur"`,
    input_schema: {
      type: 'object',
      properties: {
        inputPath: {
          type: 'string',
          description: 'Absolute path to the input video file',
        },
        action: {
          type: 'string',
          enum: ['detect', 'blur', 'bg_blur', 'focus_speaker'],
          description: 'Face/object processing action',
        },
        blurStrength: {
          type: 'integer',
          description: 'Gaussian blur sigma (default: 20). Higher = more blur.',
        },
        outputFormat: {
          type: 'string',
          enum: ['mp4', 'webm', 'mov', 'mkv'],
          description: 'Output format (default: mp4)',
        },
      },
      required: ['inputPath', 'action'],
    },
  },

  // ─── 9. VIDEO MODERATE ────────────────────────────────────────────────────
  {
    name: 'video_moderate',
    description: `AI content moderation for videos. Check for NSFW content, profanity, copyright risks, and platform-specific safety rules.

Extracts keyframes for visual analysis and checks platform guidelines (max duration, community rules). For advanced NSFW/copyright detection, extracted frames should be passed to Azure Content Safety or Computer Vision API.

Checks: nsfw, profanity, copyright, platform_safety, or 'all'
Platforms: youtube, tiktok, instagram, twitter

USE THIS WHEN the user says: "check if safe for YouTube", "content moderation", "NSFW check", "platform safety", "copyright check", "is this TikTok-safe"`,
    input_schema: {
      type: 'object',
      properties: {
        inputPath: {
          type: 'string',
          description: 'Absolute path to the input video file',
        },
        checks: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['nsfw', 'profanity', 'copyright', 'platform_safety', 'all'],
          },
          description: 'Types of checks to perform (default: ["all"])',
        },
        platform: {
          type: 'string',
          enum: ['youtube', 'tiktok', 'instagram', 'twitter'],
          description: 'Platform to check safety rules against (default: youtube)',
        },
        extractFrames: {
          type: 'integer',
          description: 'Number of keyframes to extract for analysis (default: 10)',
        },
      },
      required: ['inputPath'],
    },
  },

  // ─── 10. VIDEO BATCH ──────────────────────────────────────────────────────
  {
    name: 'video_batch',
    description: `AI batch automation — run predefined or custom video processing pipelines.

Preset pipelines:
- podcast_shorts: Remove silence → extract energy-based highlights → podcast style
- course_lessons: Scene detection → resize 16:9 → audio normalize
- interview_highlights: Remove silence → energy-based highlights → speaker focus crop

Or build a custom pipeline with an array of steps [{tool, options}].

USE THIS WHEN the user says: "podcast to shorts", "process batch", "course to lessons", "interview highlights", "run pipeline", "automate editing"`,
    input_schema: {
      type: 'object',
      properties: {
        inputPath: {
          type: 'string',
          description: 'Absolute path to the input video file',
        },
        pipeline: {
          type: 'string',
          enum: ['podcast_shorts', 'course_lessons', 'interview_highlights', 'custom'],
          description: 'Preset pipeline name or "custom" for custom steps',
        },
        steps: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              tool: {
                type: 'string',
                enum: ['video_trim', 'video_highlights', 'video_resize', 'video_subtitles', 'video_style', 'video_overlay', 'video_audio', 'video_faces'],
                description: 'Tool to run in this step',
              },
              options: {
                type: 'object',
                description: 'Options to pass to the tool',
              },
            },
            required: ['tool'],
          },
          description: 'Custom pipeline steps (required when pipeline="custom")',
        },
        outputFormat: {
          type: 'string',
          enum: ['mp4', 'webm', 'mov', 'mkv'],
          description: 'Output format (default: mp4)',
        },
      },
      required: ['inputPath', 'pipeline'],
    },
  },

  // ─── 11. VIDEO EXPORT ─────────────────────────────────────────────────────
  {
    name: 'video_export',
    description: `Platform-ready video export with auto metadata, thumbnails, and encoding presets.

Platforms:
- youtube: High quality 16:9, 320k audio, slow preset
- tiktok: 9:16, max 600s, fast encode
- reels: 9:16, max 90min
- shorts: 9:16, max 60s
- twitter: 16:9, max 140s
- web: Optimized for web delivery (small file)
- archive: Lossless quality for archival

Auto-generates: thumbnails, platform-ready filenames, metadata (title, description, tags).

USE THIS WHEN the user says: "export for YouTube", "prepare for TikTok", "generate thumbnail", "export with metadata", "platform ready", "final export", "archive quality"`,
    input_schema: {
      type: 'object',
      properties: {
        inputPath: {
          type: 'string',
          description: 'Absolute path to the input video file',
        },
        platform: {
          type: 'string',
          enum: ['youtube', 'tiktok', 'reels', 'shorts', 'twitter', 'web', 'archive'],
          description: 'Target platform for encoding presets',
        },
        title: {
          type: 'string',
          description: 'Video title for metadata and filename',
        },
        description: {
          type: 'string',
          description: 'Video description for metadata',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags/keywords for metadata',
        },
        quality: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'lossless'],
          description: 'Override quality preset',
        },
        generateThumbnail: {
          type: 'boolean',
          description: 'Auto-generate thumbnail (default: true)',
        },
        thumbnailTime: {
          type: 'number',
          description: 'Timestamp in seconds for thumbnail frame',
        },
        format: {
          type: 'string',
          enum: ['mp4', 'webm', 'mov', 'mkv'],
          description: 'Output format (default: mp4)',
        },
      },
      required: ['inputPath', 'platform'],
    },
  },

  // ─── 12. VIDEO TRANSFORM ──────────────────────────────────────────────────
  {
    name: 'video_transform',
    description: `Trim, split, concatenate, speed change, resize, and crop videos — the core geometric/temporal transforms.

Actions:
- trim: Cut to start/end timestamps
- split: Split video into N equal segments or at specific timestamps
- concat: Join multiple video files in sequence
- speed: Change playback speed (slow-mo, timelapse)
- resize: Resize to specific dimensions or aspect ratio
- crop: Crop to a box region (x, y, width, height)

USE THIS WHEN the user says: "trim video", "split into parts", "join videos", "slow motion", "speed up", "resize", "crop video", "cut this clip", "merge clips", "make it 2x speed"`,
    input_schema: {
      type: 'object',
      properties: {
        inputPath: {
          type: 'string',
          description: 'Absolute path to the input video file',
        },
        action: {
          type: 'string',
          enum: ['trim', 'split', 'concat', 'speed', 'resize', 'crop'],
          description: 'Transform action to perform',
        },
        startTime: {
          type: 'number',
          description: 'Start time in seconds (for trim)',
        },
        endTime: {
          type: 'number',
          description: 'End time in seconds (for trim)',
        },
        segments: {
          type: 'integer',
          description: 'Number of equal segments to split into (for split)',
        },
        splitPoints: {
          type: 'array',
          items: { type: 'number' },
          description: 'Timestamps in seconds to split at (for split)',
        },
        inputFiles: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of file paths to concatenate in order (for concat)',
        },
        speed: {
          type: 'number',
          description: 'Playback speed 0.25-4.0 (1.0 = normal, <1 = slow-mo, >1 = fast)',
        },
        width: {
          type: 'integer',
          description: 'Target width in pixels (for resize)',
        },
        height: {
          type: 'integer',
          description: 'Target height in pixels (for resize)',
        },
        aspectRatio: {
          type: 'string',
          enum: ['16:9', '9:16', '1:1', '4:5', '4:3', '21:9'],
          description: 'Target aspect ratio (for resize, alternative to width/height)',
        },
        cropX: {
          type: 'integer',
          description: 'Crop region X offset in pixels',
        },
        cropY: {
          type: 'integer',
          description: 'Crop region Y offset in pixels',
        },
        cropWidth: {
          type: 'integer',
          description: 'Crop region width in pixels',
        },
        cropHeight: {
          type: 'integer',
          description: 'Crop region height in pixels',
        },
        outputFormat: {
          type: 'string',
          enum: ['mp4', 'webm', 'mov', 'mkv'],
          description: 'Output format (default: mp4)',
        },
      },
      required: ['inputPath', 'action'],
    },
  },

  // ─── 13. VIDEO CONVERT ────────────────────────────────────────────────────
  {
    name: 'video_convert',
    description: `Convert video format, compress, create GIFs, extract thumbnails, and generate responsive variants.

Actions:
- format: Convert between video formats (mp4, webm, mov, mkv, avi)
- compress: Reduce file size with quality control (CRF-based)
- gif: Convert video segment to animated GIF
- thumbnail: Extract thumbnail image(s) at specific timestamps
- responsive: Generate multiple resolution variants (360p, 480p, 720p, 1080p)

USE THIS WHEN the user says: "convert to mp4", "make it smaller", "compress video", "create gif", "make a GIF", "extract thumbnail", "generate preview image", "responsive video", "convert format"`,
    input_schema: {
      type: 'object',
      properties: {
        inputPath: {
          type: 'string',
          description: 'Absolute path to the input video file',
        },
        action: {
          type: 'string',
          enum: ['format', 'compress', 'gif', 'thumbnail', 'responsive'],
          description: 'Conversion action to perform',
        },
        targetFormat: {
          type: 'string',
          enum: ['mp4', 'webm', 'mov', 'mkv', 'avi'],
          description: 'Target video format (for format action)',
        },
        quality: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'lossless'],
          description: 'Quality preset for compression (default: medium)',
        },
        maxSizeMB: {
          type: 'number',
          description: 'Target maximum file size in MB (for compress)',
        },
        gifStart: {
          type: 'number',
          description: 'GIF start time in seconds',
        },
        gifDuration: {
          type: 'number',
          description: 'GIF duration in seconds (default: 5)',
        },
        gifWidth: {
          type: 'integer',
          description: 'GIF width in pixels (default: 480)',
        },
        gifFps: {
          type: 'integer',
          description: 'GIF frame rate (default: 10)',
        },
        thumbnailTimes: {
          type: 'array',
          items: { type: 'number' },
          description: 'Timestamps in seconds to extract thumbnails (for thumbnail)',
        },
        thumbnailCount: {
          type: 'integer',
          description: 'Number of evenly-spaced thumbnails to extract (default: 1)',
        },
        resolutions: {
          type: 'array',
          items: { type: 'string', enum: ['360p', '480p', '720p', '1080p', '1440p', '4k'] },
          description: 'Resolutions to generate (for responsive, default: ["360p","720p","1080p"])',
        },
        codec: {
          type: 'string',
          enum: ['h264', 'h265', 'vp8', 'vp9', 'av1'],
          description: 'Video codec (default: h264)',
        },
        outputFormat: {
          type: 'string',
          enum: ['mp4', 'webm', 'mov', 'mkv'],
          description: 'Output container format (default: mp4)',
        },
      },
      required: ['inputPath', 'action'],
    },
  },

  // ─── 14. VIDEO ANALYZE ────────────────────────────────────────────────────
  {
    name: 'video_analyze',
    description: `Extract metadata, detect scenes, find silence, and validate video files — non-destructive analysis.

Actions:
- metadata: Full technical metadata (duration, resolution, codec, bitrate, fps, audio info)
- scenes: Detect scene changes with timestamps and thumbnails
- silence: Detect silent segments with timestamps and durations
- validate: Check file integrity, encoding issues, and platform compatibility
- summary: Quick one-line summary (duration, resolution, size, format)

USE THIS WHEN the user says: "what's in this video", "video info", "detect scenes", "find silence", "is this valid", "video metadata", "how long is this video", "resolution?", "check video file", "scene detection"`,
    input_schema: {
      type: 'object',
      properties: {
        inputPath: {
          type: 'string',
          description: 'Absolute path to the input video file',
        },
        action: {
          type: 'string',
          enum: ['metadata', 'scenes', 'silence', 'validate', 'summary'],
          description: 'Analysis action to perform',
        },
        sceneThreshold: {
          type: 'number',
          description: 'Scene change sensitivity 0-1 (default: 0.3). Lower = more sensitive.',
        },
        silenceThreshold: {
          type: 'number',
          description: 'dB threshold for silence detection (default: -30). Lower = more aggressive.',
        },
        silenceDuration: {
          type: 'number',
          description: 'Minimum silence duration in seconds to report (default: 1.0)',
        },
        platform: {
          type: 'string',
          enum: ['youtube', 'tiktok', 'instagram', 'twitter', 'web'],
          description: 'Platform to validate compatibility against (for validate)',
        },
      },
      required: ['inputPath', 'action'],
    },
  },

  // ─── 15. VIDEO FILTER ────────────────────────────────────────────────────
  {
    name: 'video_filter',
    description: `Color correction, cinematic looks, background blur, and video stabilization — visual enhancement filters.

Actions:
- color_correct: Adjust brightness, contrast, saturation, gamma, hue
- cinematic: Apply cinematic LUT / color grade (warm, cool, teal_orange, film, noir, faded)
- blur_bg: Blur background while keeping foreground/subject sharp (portrait mode)
- stabilize: Stabilize shaky footage (software stabilization)
- denoise_video: Reduce visual noise/grain from dark or low-light footage
- sharpen: Enhance sharpness and edge detail

USE THIS WHEN the user says: "color correct", "make it cinematic", "blur background", "stabilize video", "fix shaky", "denoise", "sharpen", "color grade", "warm tones", "cool look", "film look", "remove grain"`,
    input_schema: {
      type: 'object',
      properties: {
        inputPath: {
          type: 'string',
          description: 'Absolute path to the input video file',
        },
        action: {
          type: 'string',
          enum: ['color_correct', 'cinematic', 'blur_bg', 'stabilize', 'denoise_video', 'sharpen'],
          description: 'Filter action to apply',
        },
        brightness: {
          type: 'number',
          description: 'Brightness adjustment -1 to 1 (default: 0)',
        },
        contrast: {
          type: 'number',
          description: 'Contrast 0-2 (default: 1.0)',
        },
        saturation: {
          type: 'number',
          description: 'Saturation 0-3 (default: 1.0)',
        },
        gamma: {
          type: 'number',
          description: 'Gamma correction 0.1-10 (default: 1.0)',
        },
        hue: {
          type: 'number',
          description: 'Hue rotation in degrees -180 to 180 (default: 0)',
        },
        cinematicStyle: {
          type: 'string',
          enum: ['warm', 'cool', 'teal_orange', 'film', 'noir', 'faded', 'vintage', 'bleach_bypass'],
          description: 'Cinematic color grade preset (for cinematic action)',
        },
        blurStrength: {
          type: 'integer',
          description: 'Background blur intensity 1-50 (default: 20)',
        },
        stabilizeStrength: {
          type: 'number',
          description: 'Stabilization smoothing 0-1 (default: 0.5). Higher = smoother.',
        },
        denoiseStrength: {
          type: 'number',
          description: 'Denoise strength 0-1 (default: 0.5)',
        },
        sharpenAmount: {
          type: 'number',
          description: 'Sharpen amount 0-2 (default: 0.5)',
        },
        lutFile: {
          type: 'string',
          description: 'Path to custom .cube LUT file (overrides cinematic preset)',
        },
        outputFormat: {
          type: 'string',
          enum: ['mp4', 'webm', 'mov', 'mkv'],
          description: 'Output format (default: mp4)',
        },
      },
      required: ['inputPath', 'action'],
    },
  },

  // ─── 16. VIDEO AI ─────────────────────────────────────────────────────────
  {
    name: 'video_ai',
    description: `AI-powered video intelligence — describe, transcribe, extract highlights, auto-caption, moderate, and smart crop using AI models.

Actions:
- describe: AI-generated description of video content (extracts keyframes → vision model)
- transcribe: Speech-to-text transcription (Whisper-based, outputs SRT/VTT/text)
- highlights: AI-detected highlights based on engagement, energy, and visual interest
- caption: Auto-generate and burn captions with AI transcription + styling
- moderate: AI content moderation — NSFW, violence, hate speech, copyright risk
- smart_crop: AI-detected subject tracking + auto-crop for vertical/square formats

USE THIS WHEN the user says: "describe this video", "transcribe", "speech to text", "find highlights", "auto captions", "AI captions", "content check", "smart crop", "auto-detect subject", "what happens in this video", "generate subtitles with AI"`,
    input_schema: {
      type: 'object',
      properties: {
        inputPath: {
          type: 'string',
          description: 'Absolute path to the input video file',
        },
        action: {
          type: 'string',
          enum: ['describe', 'transcribe', 'highlights', 'caption', 'moderate', 'smart_crop'],
          description: 'AI action to perform',
        },
        language: {
          type: 'string',
          description: 'Language code for transcription (default: en)',
        },
        outputSubFormat: {
          type: 'string',
          enum: ['srt', 'vtt', 'text', 'json'],
          description: 'Subtitle/transcript output format (for transcribe/caption, default: srt)',
        },
        captionStyle: {
          type: 'string',
          enum: ['default', 'bold', 'karaoke', 'highlighted', 'minimal'],
          description: 'Caption styling preset (for caption action)',
        },
        captionPosition: {
          type: 'string',
          enum: ['top', 'center', 'bottom'],
          description: 'Caption position (default: bottom)',
        },
        highlightCount: {
          type: 'integer',
          description: 'Number of highlights to extract (default: 5)',
        },
        highlightDuration: {
          type: 'number',
          description: 'Target duration per highlight in seconds (default: 30)',
        },
        targetRatio: {
          type: 'string',
          enum: ['16:9', '9:16', '1:1', '4:5'],
          description: 'Target aspect ratio for smart_crop (default: 9:16)',
        },
        moderateChecks: {
          type: 'array',
          items: { type: 'string', enum: ['nsfw', 'violence', 'hate_speech', 'copyright', 'all'] },
          description: 'Moderation checks to run (default: ["all"])',
        },
        extractFrames: {
          type: 'integer',
          description: 'Number of keyframes to extract for AI analysis (default: 10)',
        },
        outputFormat: {
          type: 'string',
          enum: ['mp4', 'webm', 'mov', 'mkv'],
          description: 'Output video format (default: mp4)',
        },
      },
      required: ['inputPath', 'action'],
    },
  },
];


// ═══════════════════════════════════════════════════════════════════════════════
// EXECUTOR — Routes tool calls to engine, handles S3 upload
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Execute a video tool call from the LLM.
 * Returns { result: string, sideEffects?: object } — same pattern as imageTools.
 *
 * @param {string} toolName — e.g. 'video_trim'
 * @param {object} input — from LLM tool_use block
 * @param {object} ctx — { userId, appId, tempDir }
 * @returns {{ result: string, sideEffects?: object }}
 */
export async function executeVideoTool(toolName, input, ctx = {}) {
  try {
    log.info(`[VideoTools] Executing ${toolName}`, JSON.stringify(input).slice(0, 200));

    let result;

    switch (toolName) {
      case 'video_trim':
        result = await trimVideo(input.inputPath, input);
        break;

      case 'video_highlights':
        result = await extractHighlights(input.inputPath, input);
        break;

      case 'video_resize':
        result = await resizeVideo(input.inputPath, input);
        break;

      case 'video_subtitles':
        result = await subtitleVideo(input.inputPath, input);
        break;

      case 'video_style':
        result = await styleVideo(input.inputPath, input);
        break;

      case 'video_overlay':
        result = await overlayVideo(input.inputPath, input);
        break;

      case 'video_audio':
        result = await audioVideo(input.inputPath, input);
        break;

      case 'video_faces':
        result = await facesVideo(input.inputPath, input);
        break;

      case 'video_moderate':
        result = await moderateVideo(input.inputPath, input);
        break;

      case 'video_batch':
        result = await batchVideo(input.inputPath, input);
        break;

      case 'video_export':
        result = await exportVideo(input.inputPath, input);
        break;

      case 'video_transform':
        result = await transformVideo(input.inputPath, input);
        break;

      case 'video_convert':
        result = await convertVideo(input.inputPath, input);
        break;

      case 'video_analyze':
        result = await analyzeVideo(input.inputPath, input);
        break;

      case 'video_filter':
        result = await filterVideo(input.inputPath, input);
        break;

      case 'video_ai':
        result = await aiVideo(input.inputPath, input);
        break;

      default:
        return { result: JSON.stringify({ error: `Unknown video tool: ${toolName}` }) };
    }

    // ── Upload to S3 + Signed URLs (production) or return metadata ──

    const useS3 = s3Configured();
    const sideEffects = {};

    if (useS3) {
      // ── S3 path: upload video buffer, return signed URL ──

      // Single result with buffer
      if (result && result.buffer && Buffer.isBuffer(result.buffer)) {
        const uploaded = await uploadToS3(result.buffer, {
          format: result.format || 'mp4',
          prefix: 'videos',
        });
        result = {
          ...result,
          buffer: undefined,
          hasBuffer: false,
          videoUrl: uploaded.url,
          s3Key: uploaded.key,
          expiresAt: uploaded.expiresAt,
        };

        sideEffects.type = 'video_processed';
        sideEffects.videoUrl = uploaded.url;
        sideEffects.s3Key = uploaded.key;
        sideEffects.expiresAt = uploaded.expiresAt;
        sideEffects.duration = result.duration;
        sideEffects.width = result.width;
        sideEffects.height = result.height;
        sideEffects.format = result.format;
      }

      // Thumbnail buffer (from video_export)
      if (result && result.thumbnail && result.thumbnail.buffer && Buffer.isBuffer(result.thumbnail.buffer)) {
        const thumbUploaded = await uploadToS3(result.thumbnail.buffer, {
          format: 'jpg',
          prefix: 'thumbnails',
        });
        result.thumbnail = {
          ...result.thumbnail,
          buffer: undefined,
          thumbnailUrl: thumbUploaded.url,
          s3Key: thumbUploaded.key,
        };
        sideEffects.thumbnailUrl = thumbUploaded.url;
      }

      // Batch results with buffers
      if (result && result.results && Array.isArray(result.results)) {
        const itemsToUpload = result.results.filter(r => r.buffer && Buffer.isBuffer(r.buffer));
        if (itemsToUpload.length > 0) {
          const uploaded = await uploadMultipleToS3(
            itemsToUpload.map(r => ({ buffer: r.buffer, format: r.format || 'mp4' }))
          );
          let uploadIdx = 0;
          result.results = result.results.map(r => {
            if (r.buffer && Buffer.isBuffer(r.buffer)) {
              const u = uploaded[uploadIdx++];
              return {
                ...r,
                buffer: undefined,
                hasBuffer: false,
                videoUrl: u.url,
                s3Key: u.key,
                expiresAt: u.expiresAt,
              };
            }
            return r;
          });
          sideEffects.type = 'video_batch';
          sideEffects.videoUrls = uploaded.map(u => u.url);
        }
      }

    } else {
      // ── Fallback: strip buffers, return file paths ──
      // Videos are too large for base64 data URIs — return file paths instead

      if (result && result.buffer && Buffer.isBuffer(result.buffer)) {
        const bufferSize = result.buffer.length;
        result = { ...result, buffer: `<Buffer: ${(bufferSize / 1024 / 1024).toFixed(1)} MB>`, hasBuffer: true };

        sideEffects.type = 'video_processed';
        sideEffects.outputPath = result.outputPath || null;
        sideEffects.duration = result.duration;
        sideEffects.width = result.width;
        sideEffects.height = result.height;
        sideEffects.format = result.format;
      }

      // Thumbnail — upload to S3 instead of base64
      if (result && result.thumbnail && result.thumbnail.buffer && Buffer.isBuffer(result.thumbnail.buffer)) {
        const thumbBuf = result.thumbnail.buffer;
        if (s3Configured()) {
          const uploaded = await uploadToS3(thumbBuf, { format: 'jpg', prefix: 'thumbnails' });
          result.thumbnail = {
            ...result.thumbnail,
            buffer: undefined,
            imageUrl: uploaded.url,
            s3Key: uploaded.key,
            expiresAt: uploaded.expiresAt,
          };
          sideEffects.thumbnailUrl = uploaded.url;
        } else {
          result.thumbnail = {
            ...result.thumbnail,
            buffer: undefined,
          };
        }
      }

      // Batch results
      if (result && result.results) {
        result.results = result.results.map(r => {
          if (r.buffer && Buffer.isBuffer(r.buffer)) {
            return { ...r, buffer: `<Buffer: ${(r.buffer.length / 1024 / 1024).toFixed(1)} MB>`, hasBuffer: true };
          }
          return r;
        });

        sideEffects.type = sideEffects.type || 'video_batch';
        sideEffects.outputPaths = result.results.map(r => r.outputPath).filter(Boolean);
      }
    }

    // Common side effects
    if (result.outputPath) {
      sideEffects.type = sideEffects.type || 'video_processed';
      sideEffects.outputPath = result.outputPath;
    }
    if (result.metadata) {
      sideEffects.metadata = result.metadata;
    }

    return {
      result: JSON.stringify(result, null, 2),
      sideEffects: Object.keys(sideEffects).length > 0 ? sideEffects : undefined,
    };
  } catch (err) {
    log.error(`[VideoTools] ${toolName} error:`, err.message);
    return {
      result: JSON.stringify({ error: err.message, tool: toolName }),
    };
  }
}

/**
 * Check if a tool name is a video tool.
 */
export function isVideoTool(name) {
  return name.startsWith('video_');
}

export default { VIDEO_TOOL_DEFINITIONS, executeVideoTool, isVideoTool };
