/**
 * VIDEO ROUTES — Real video generation via RunwayML + video editing pipeline
 */

import express from 'express';
import { generateVideo, executeTool } from '../lib/agent-tools-service.js';
import db from '../lib/db.js';

async function getAuthUserId(req) {
    const sessionId = req.cookies?.sessionId || req.cookies?.session_id;
    if (!sessionId) return req.session?.userId || req.user?.id || null;
    try {
        const user = await db.User.findBySessionId(sessionId);
        if (user && (!user.sessionExpiry || new Date(user.sessionExpiry) >= new Date())) {
            return user.id;
        }
    } catch (_) { }
    return req.session?.userId || req.user?.id || null;
}

const router = express.Router();

// ── Task tracking ──────────────────────────────────────────────────
// In-memory map of active generation tasks (RunwayML task_id → state)
// Evicts completed tasks after 30 minutes to reclaim memory.

const activeTasks = new Map();
const TASK_TTL_MS = 30 * 60 * 1000;

function registerTask(taskId, meta) {
    activeTasks.set(taskId, { ...meta, createdAt: Date.now() });
    // Evict stale tasks periodically
    if (activeTasks.size > 100) {
        const cutoff = Date.now() - TASK_TTL_MS;
        for (const [id, t] of activeTasks) {
            if (t.createdAt < cutoff) activeTasks.delete(id);
        }
    }
}

// RunwayML API helpers
const RUNWAY_API_BASE = process.env.RUNWAY_API_BASE || 'https://api.runwayml.com/v1';
function runwayHeaders() {
    return {
        'Authorization': `Bearer ${process.env.RUNWAYML_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Runway-Version': '2024-11-06',
    };
}

// Fallback models if RunwayML API is unreachable
const FALLBACK_MODELS = [
    { id: 'gen4.5', name: 'Gen-4.5', description: 'Latest RunwayML model — high quality', supportsTextToVideo: true, supportsImageToVideo: true },
    { id: 'gen3a_turbo', name: 'Gen-3α Turbo', description: 'Fast generation — good quality', supportsTextToVideo: true, supportsImageToVideo: true },
];
let cachedModels = null;
let cachedModelsAt = 0;
const MODEL_CACHE_TTL = 60 * 60 * 1000; // 1 hour

// GET /api/video/models — fetch available models from RunwayML with cache
router.get('/models', async (req, res) => {
    try {
        let models = FALLBACK_MODELS;

        // Try fetching from RunwayML if API key is set and cache expired
        if (process.env.RUNWAYML_API_KEY && (Date.now() - cachedModelsAt > MODEL_CACHE_TTL)) {
            try {
                const resp = await fetch(`${RUNWAY_API_BASE}/models`, {
                    headers: runwayHeaders(),
                    signal: AbortSignal.timeout(5000),
                });
                if (resp.ok) {
                    const data = await resp.json();
                    if (data?.models?.length || data?.data?.length) {
                        const remoteModels = (data.models || data.data || []).map(m => ({
                            id: m.id || m.name,
                            name: m.name || m.id,
                            description: m.description || '',
                            supportsTextToVideo: m.capabilities?.includes('text_to_video') ?? true,
                            supportsImageToVideo: m.capabilities?.includes('image_to_video') ?? true,
                        }));
                        if (remoteModels.length > 0) models = remoteModels;
                    }
                    cachedModels = models;
                    cachedModelsAt = Date.now();
                }
            } catch { /* use fallback */ }
        } else if (cachedModels) {
            models = cachedModels;
        }

        res.json({
            success: true,
            data: {
                models,
                textToVideoRatios: [
                    { label: '16:9 Landscape', value: '16:9' },
                    { label: '9:16 Portrait', value: '9:16' },
                    { label: '1:1 Square', value: '1:1' },
                ],
                imageToVideoRatios: [
                    { label: '16:9 Landscape', value: '16:9' },
                    { label: '9:16 Portrait', value: '9:16' },
                    { label: '1:1 Square', value: '1:1' },
                ],
                durations: [
                    { label: '5s', value: 5 },
                    { label: '10s', value: 10 },
                ],
            },
        });
    } catch (err) {
        console.error('[Video] Models fetch error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to fetch models' });
    }
});

// POST /api/video/generate — text-to-video via RunwayML (async start)
router.post('/generate', async (req, res) => {
    try {
        const { prompt, duration = 5, model = 'gen4.5', ratio = '16:9' } = req.body;
        if (!prompt) return res.status(400).json({ success: false, error: 'prompt is required' });

        const RUNWAYML_API_KEY = process.env.RUNWAYML_API_KEY;
        if (!RUNWAYML_API_KEY) {
            return res.status(503).json({ success: false, error: 'Video generation service not configured (RunwayML API key missing)' });
        }

        const userId = (await getAuthUserId(req)) || 'anonymous';
        const runwayDuration = duration <= 5 ? 5 : 10;

        // Map ratio string to RunwayML format
        const ratioMap = { '16:9': '1280:720', '9:16': '720:1280', '1:1': '720:720' };
        const runwayRatio = ratioMap[ratio] || '1280:720';

        console.log(`[Video] Starting generation: "${prompt.substring(0, 60)}..." | model=${model} | ratio=${runwayRatio} | ${runwayDuration}s`);

        const createResponse = await fetch(`${RUNWAY_API_BASE}/text_to_video`, {
            method: 'POST',
            headers: runwayHeaders(),
            body: JSON.stringify({
                model,
                promptText: prompt,
                ratio: runwayRatio,
                duration: runwayDuration,
            }),
        });

        if (!createResponse.ok) {
            const errData = await createResponse.json().catch(() => ({}));
            throw new Error(errData.error || errData.message || `RunwayML HTTP ${createResponse.status}`);
        }

        const task = await createResponse.json();
        console.log(`[Video] RunwayML task created: ${task.id}`);

        // Register for status polling
        registerTask(task.id, {
            status: 'PENDING',
            prompt,
            duration: runwayDuration,
            userId,
            progress: 0,
            videoUrl: null,
            error: null,
        });

        // Start background polling to keep task state fresh
        pollRunwayTask(task.id);

        res.json({
            success: true,
            taskId: task.id,
            status: 'PENDING',
            prompt,
            duration: `${runwayDuration}s`,
            message: 'Video generation started. Poll /api/video/status/:id for updates.',
        });
    } catch (err) {
        console.error('[Video] Generate error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/video/generate-from-image — image-to-video via RunwayML
router.post('/generate-from-image', async (req, res) => {
    try {
        const { prompt, imageUrl, duration = 5, model = 'gen4.5', ratio = '16:9' } = req.body;
        if (!prompt) return res.status(400).json({ success: false, error: 'prompt is required' });

        const RUNWAYML_API_KEY = process.env.RUNWAYML_API_KEY;
        if (!RUNWAYML_API_KEY) {
            return res.status(503).json({ success: false, error: 'Video generation service not configured' });
        }

        const userId = (await getAuthUserId(req)) || 'anonymous';
        const runwayDuration = duration <= 5 ? 5 : 10;
        const ratioMap = { '16:9': '1280:720', '9:16': '720:1280', '1:1': '720:720' };
        const runwayRatio = ratioMap[ratio] || '1280:720';

        console.log(`[Video] Starting image-to-video: "${prompt.substring(0, 60)}..." | imageUrl=${imageUrl ? 'yes' : 'no'}`);

        // If imageUrl is provided, use image_to_video; otherwise fall back to text_to_video
        const endpoint = imageUrl ? 'image_to_video' : 'text_to_video';
        const body = imageUrl
            ? { model, promptText: prompt, promptImage: imageUrl, ratio: runwayRatio, duration: runwayDuration }
            : { model, promptText: prompt, ratio: runwayRatio, duration: runwayDuration };

        const createResponse = await fetch(`${RUNWAY_API_BASE}/${endpoint}`, {
            method: 'POST',
            headers: runwayHeaders(),
            body: JSON.stringify(body),
        });

        if (!createResponse.ok) {
            const errData = await createResponse.json().catch(() => ({}));
            throw new Error(errData.error || errData.message || `RunwayML HTTP ${createResponse.status}`);
        }

        const task = await createResponse.json();
        console.log(`[Video] RunwayML task created: ${task.id}`);

        registerTask(task.id, {
            status: 'PENDING',
            prompt,
            duration: runwayDuration,
            userId,
            progress: 0,
            videoUrl: null,
            error: null,
        });

        pollRunwayTask(task.id);

        res.json({
            success: true,
            taskId: task.id,
            status: 'PENDING',
            prompt,
            duration: `${runwayDuration}s`,
            message: 'Video generation started.',
        });
    } catch (err) {
        console.error('[Video] Generate-from-image error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Background poller for a RunwayML task
async function pollRunwayTask(taskId) {
    const POLL_INTERVAL = 5000;
    const MAX_POLLS = 120; // 10 min max
    let polls = 0;

    const interval = setInterval(async () => {
        polls++;
        const tracked = activeTasks.get(taskId);
        if (!tracked || tracked.status === 'SUCCEEDED' || tracked.status === 'FAILED' || tracked.status === 'CANCELLED') {
            clearInterval(interval);
            return;
        }

        try {
            const resp = await fetch(`${RUNWAY_API_BASE}/tasks/${taskId}`, { headers: runwayHeaders() });
            if (!resp.ok) {
                if (polls >= MAX_POLLS) {
                    tracked.status = 'FAILED';
                    tracked.error = 'Generation timed out';
                    clearInterval(interval);
                }
                return;
            }
            const result = await resp.json();
            tracked.status = result.status || tracked.status;
            tracked.progress = result.progress != null ? Math.round(result.progress * 100) : tracked.progress;

            if (result.status === 'SUCCEEDED') {
                tracked.videoUrl = Array.isArray(result.output) ? result.output[0] : result.output;
                tracked.progress = 100;
                console.log(`[Video] Task ${taskId} completed: ${tracked.videoUrl}`);
                clearInterval(interval);
            } else if (result.status === 'FAILED') {
                tracked.error = result.failure || result.error || 'Generation failed';
                console.error(`[Video] Task ${taskId} failed: ${tracked.error}`);
                clearInterval(interval);
            } else if (result.status === 'CANCELLED') {
                tracked.error = 'Cancelled';
                clearInterval(interval);
            }
        } catch (e) {
            // Network error — will retry on next poll
            if (polls >= MAX_POLLS) {
                tracked.status = 'FAILED';
                tracked.error = 'Polling timed out';
                clearInterval(interval);
            }
        }
    }, POLL_INTERVAL);
}

// GET /api/video/status/:id — check real RunwayML task status
router.get('/status/:id', async (req, res) => {
    const { id } = req.params;
    const tracked = activeTasks.get(id);

    if (tracked) {
        return res.json({
            success: true,
            taskId: id,
            status: tracked.status,
            progress: tracked.progress || 0,
            videoUrl: tracked.videoUrl || null,
            error: tracked.error || null,
            prompt: tracked.prompt,
            duration: tracked.duration,
        });
    }

    // Not in memory — try fetching directly from RunwayML API
    const RUNWAYML_API_KEY = process.env.RUNWAYML_API_KEY;
    if (!RUNWAYML_API_KEY) {
        return res.json({ success: false, error: 'No active generation task found.' });
    }

    try {
        const resp = await fetch(`${RUNWAY_API_BASE}/tasks/${id}`, { headers: runwayHeaders() });
        if (!resp.ok) {
            return res.json({ success: false, error: 'Task not found.' });
        }
        const result = await resp.json();
        const videoUrl = result.status === 'SUCCEEDED'
            ? (Array.isArray(result.output) ? result.output[0] : result.output)
            : null;

        res.json({
            success: true,
            taskId: id,
            status: result.status,
            progress: result.progress != null ? Math.round(result.progress * 100) : 0,
            videoUrl,
            error: result.failure || null,
        });
    } catch (e) {
        res.json({ success: false, error: 'Failed to check task status.' });
    }
});

// DELETE /api/video/cancel/:id — cancel a RunwayML generation
router.delete('/cancel/:id', async (req, res) => {
    const { id } = req.params;
    const tracked = activeTasks.get(id);

    // Mark as cancelled in our tracking
    if (tracked) {
        tracked.status = 'CANCELLED';
        tracked.error = 'Cancelled by user';
    }

    // Attempt to cancel on RunwayML
    const RUNWAYML_API_KEY = process.env.RUNWAYML_API_KEY;
    if (RUNWAYML_API_KEY) {
        try {
            await fetch(`${RUNWAY_API_BASE}/tasks/${id}/cancel`, {
                method: 'POST',
                headers: runwayHeaders(),
            });
            console.log(`[Video] Cancelled task ${id} on RunwayML`);
        } catch (e) {
            console.warn(`[Video] Could not cancel task ${id} on RunwayML: ${e.message}`);
        }
    }

    res.json({ success: true, message: 'Task cancelled.' });
});

// ── Video editing pipeline ─────────────────────────────────────────

// POST /api/video/plan — use AI to generate a video editing plan from a prompt
router.post('/plan', async (req, res) => {
    try {
        const { prompt, sourceMetadata } = req.body;
        if (!prompt?.trim()) return res.status(400).json({ success: false, error: 'prompt is required' });

        // Map common editing requests to tool steps
        const steps = interpretVideoPrompt(prompt, sourceMetadata);

        res.json({
            success: true,
            interpretation: `Plan for: ${prompt}`,
            userPrompt: prompt,
            steps,
        });
    } catch (err) {
        console.error('[Video] Plan error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/video/execute-step — execute a single video tool step
router.post('/execute-step', async (req, res) => {
    try {
        const { tool, action, params = {} } = req.body;
        if (!tool || !action) return res.status(400).json({ success: false, error: 'tool and action are required' });

        const userId = (await getAuthUserId(req)) || 'anonymous';
        const toolArgs = { ...params, action, userId };

        console.log(`[Video] Executing step: ${tool}.${action}`);

        // Route to the appropriate tool handler
        const result = await executeTool(tool, toolArgs);

        res.json({
            success: result.success !== false,
            tool,
            action,
            result,
        });
    } catch (err) {
        console.error(`[Video] Execute step error:`, err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── Prompt interpretation ──────────────────────────────────────────
// Maps natural language editing requests to concrete video tool steps.

const EDIT_PATTERNS = [
    { keywords: ['trim', 'cut', 'shorten', 'clip'], tool: 'video_trim', action: 'trim', label: 'Trimming video' },
    { keywords: ['slow mo', 'slow motion', 'slower'], tool: 'video_style', action: 'slow_motion', label: 'Applying slow motion' },
    { keywords: ['speed up', 'faster', 'timelapse', 'time lapse'], tool: 'video_style', action: 'speed_up', label: 'Speeding up video' },
    { keywords: ['stabilize', 'shake', 'jitter', 'shaky'], tool: 'video_style', action: 'stabilize', label: 'Stabilizing footage' },
    { keywords: ['subtitle', 'caption', 'transcribe', 'text overlay'], tool: 'video_captions', action: 'transcribe', label: 'Generating captions' },
    { keywords: ['cinematic', 'film look', 'movie look'], tool: 'video_style', action: 'cinematic', label: 'Applying cinematic style' },
    { keywords: ['vintage', 'retro', 'old film', 'grain'], tool: 'video_style', action: 'vintage', label: 'Applying vintage look' },
    { keywords: ['color grade', 'color correct', 'color'], tool: 'video_style', action: 'color_correct', label: 'Color grading' },
    { keywords: ['bright', 'brighten', 'lighter'], tool: 'video_style', action: 'bright', label: 'Brightening video' },
    { keywords: ['dark', 'darken', 'moody'], tool: 'video_style', action: 'dark', label: 'Darkening video' },
    { keywords: ['warm', 'warmer', 'warm tone'], tool: 'video_style', action: 'warm', label: 'Warming tones' },
    { keywords: ['cool', 'cooler', 'blue tone'], tool: 'video_style', action: 'cool', label: 'Cooling tones' },
    { keywords: ['resize', 'scale', 'resolution'], tool: 'video_resize', action: 'custom', label: 'Resizing video' },
    { keywords: ['youtube', '1080p', 'landscape'], tool: 'video_resize', action: 'youtube', label: 'Formatting for YouTube' },
    { keywords: ['tiktok', 'vertical', 'portrait', 'reel', 'short'], tool: 'video_resize', action: 'tiktok', label: 'Formatting for TikTok/Reels' },
    { keywords: ['instagram', 'square', '1:1'], tool: 'video_resize', action: 'instagram', label: 'Formatting for Instagram' },
    { keywords: ['watermark', 'logo', 'brand'], tool: 'video_overlay', action: 'watermark', label: 'Adding watermark' },
    { keywords: ['title', 'intro', 'opening'], tool: 'video_overlay', action: 'title', label: 'Adding title card' },
    { keywords: ['lower third', 'name tag', 'name bar'], tool: 'video_overlay', action: 'lower_third', label: 'Adding lower third' },
    { keywords: ['music', 'background music', 'soundtrack', 'audio'], tool: 'video_audio', action: 'add_music', label: 'Adding background audio' },
    { keywords: ['denoise', 'noise', 'clean audio', 'remove noise'], tool: 'video_audio', action: 'denoise', label: 'Removing audio noise' },
    { keywords: ['fade', 'fade in', 'fade out', 'transition'], tool: 'video_audio', action: 'fade', label: 'Adding fade transitions' },
    { keywords: ['normalize', 'loudness', 'volume', 'balance'], tool: 'video_audio', action: 'balance', label: 'Normalizing audio' },
    { keywords: ['highlight', 'best moment', 'best part'], tool: 'video_highlights', action: 'best_moments', label: 'Extracting highlights' },
    { keywords: ['face', 'face detect', 'blur face'], tool: 'video_face', action: 'detect', label: 'Detecting faces' },
    { keywords: ['export', 'render', 'output', 'save'], tool: 'video_export', action: 'render', label: 'Exporting video' },
];

function interpretVideoPrompt(prompt, sourceMetadata) {
    const lower = prompt.toLowerCase();
    const matched = [];

    for (const pat of EDIT_PATTERNS) {
        if (pat.keywords.some(kw => lower.includes(kw))) {
            matched.push({
                id: String(matched.length + 1),
                tool: pat.tool,
                action: pat.action,
                status: 'pending',
                label: pat.label,
                params: {},
            });
        }
    }

    // If nothing matched, create a generic analysis step
    if (matched.length === 0) {
        matched.push({
            id: '1',
            tool: 'video_style',
            action: 'auto',
            status: 'pending',
            label: `Processing: ${prompt.slice(0, 60)}`,
            params: { prompt },
        });
    }

    return matched;
}

export default router;
