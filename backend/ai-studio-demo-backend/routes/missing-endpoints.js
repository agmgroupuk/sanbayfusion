/**
 * STUDIO & AI ENDPOINTS
 * ⚠️  SECURITY: All LLM API keys kept in backend only
 * Frontend routes proxy through Next.js API routes to these endpoints
 * 
 * Supports modes: Chat, Web Search, Deep Research, Thinking
 * Supports providers: Cerebras, Gemini, Groq (free tier only)
 */

import express from 'express';
// OpenAI SDK used for OpenAI-compatible APIs (Cerebras, Groq) — NOT for OpenAI itself
import OpenAI from 'openai';
import agentToolsService from '../lib/agent-tools-service.js';
import coreToolsV2 from '../lib/tools/core-tools.js';
import { prisma } from '../lib/prisma.js';
import memoryService from '../lib/agent-memory-service.js';
import { contentSafetyMiddleware } from '../lib/content-safety-service.js';
import { chatWithFallback } from '../lib/provider-fallback-service.js';
import { AiQueue } from '../../lib/ai-queue.js';

import { STRICT_AGENT_PROMPTS, AGENT_TEMPERATURES } from '../lib/agent-strict-prompts.js';

// Azure Content Safety — blocks medium+ severity across all categories
const checkContentSafety = contentSafetyMiddleware({ threshold: 4, checkImages: true });

const router = express.Router();

// ============================================================================
// PROVIDER CONFIGURATION — Only 3 free-tier providers
// ============================================================================
const PROVIDER_CONFIGS = {
    cerebras: {
        baseURL: 'https://api.cerebras.ai/v1',
        apiKey: process.env.CEREBRAS_API_KEY,
        defaultModel: 'llama3.1-8b',
    },
    gemini: {
        baseURL: 'https://generativelanguage.googleapis.com/v1beta',
        apiKey: process.env.GEMINI_API_KEY,
        defaultModel: 'gemini-2.5-flash',
    },
    groq: {
        baseURL: 'https://api.groq.com/openai/v1',
        apiKey: process.env.GROQ_API_KEY,
        defaultModel: 'llama-3.3-70b-versatile',
    },
};

// ============================================================================
// MODE SYSTEM PROMPT ENHANCERS
// ============================================================================
const MODE_SYSTEM_PROMPTS = {
    thinking: `You are an advanced reasoning AI. For EVERY response, you MUST:
1. Break your thinking into clear numbered steps
2. Show your reasoning process explicitly
3. Consider multiple angles before concluding
4. Identify assumptions and validate them
5. Provide a final synthesis

Format your response with:
## 🧠 Thinking Process
(Step-by-step reasoning here)

## 💡 Conclusion
(Your final answer)`,

    web_search: `You are an AI assistant with access to web search results. 
When web search results are provided in the context, you MUST:
1. Analyze and synthesize the search results
2. Cite sources when making claims
3. Distinguish between facts from search results and your own knowledge
4. If results are insufficient, clearly say so
5. Provide a comprehensive answer combining search data with your knowledge

Always be transparent about what comes from search vs. your training data.`,

    deep_research: `You are an advanced research AI conducting thorough, multi-faceted analysis.
When research data is provided, you MUST:
1. Synthesize information from ALL provided sources
2. Cross-reference claims between sources
3. Identify consensus, contradictions, and gaps
4. Present findings in a structured research format
5. Rate confidence levels for each finding

Format your response as:
## 📊 Research Summary
(Brief overview)

## 🔍 Detailed Findings
(In-depth analysis with source citations)

## 🔗 Cross-references & Verification
(How different sources align or conflict)

## 📌 Conclusion & Confidence
(Final synthesis with confidence rating)`,
};

// ============================================================================
// CORE TOOLS — Definitions for LLM native tool calling (OpenAI + Anthropic)
// These 7 tools are available in Universal Chat for agents to auto-decide
// ============================================================================
// ============================================================================
// ESSENTIAL DEMO TOOLS — Lightweight for fallback providers (Cerebras, Gemini, Groq)
// Max 128 tools allowed by these APIs — keep this under 20 for demo
// ============================================================================
const DEMO_CORE_TOOLS = [
    {
        type: 'function',
        function: {
            name: 'web_search',
            description: 'Search the web for current information using DuckDuckGo.',
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'The search query' },
                    num_results: { type: 'number', description: 'Number of results (1-10)', default: 5 },
                },
                required: ['query'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'fetch_url',
            description: 'Fetch and extract main content from a webpage URL.',
            parameters: {
                type: 'object',
                properties: {
                    url: { type: 'string', description: 'The URL to fetch' },
                },
                required: ['url'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'calculate',
            description: 'Evaluate a mathematical expression. Supports +, -, *, /, ^, sqrt, sin, cos, tan, log, abs, floor, ceil, round.',
            parameters: {
                type: 'object',
                properties: {
                    expression: { type: 'string', description: 'Math expression to evaluate' },
                },
                required: ['expression'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'get_current_time',
            description: 'Get the current date and time.',
            parameters: {
                type: 'object',
                properties: {
                    timezone: { type: 'string', description: 'IANA timezone e.g. "America/New_York", "UTC"' },
                },
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'execute_code',
            description: 'Execute JavaScript code in a sandboxed environment for calculations or logic.',
            parameters: {
                type: 'object',
                properties: {
                    code: { type: 'string', description: 'JavaScript code to execute' },
                },
                required: ['code'],
            },
        },
    },
];

// ============================================================================
// FULL STUDIO TOOLS — For OpenAI & Anthropic (have higher limits)
// ============================================================================
const STUDIO_CORE_TOOLS_OPENAI = [
    {
        type: 'function',
        function: {
            name: 'web_search',
            description: 'Search the web for current information using DuckDuckGo. Use when you need up-to-date info or facts.',
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'The search query' },
                    num_results: { type: 'number', description: 'Number of results (1-10)', default: 5 },
                },
                required: ['query'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'fetch_url',
            description: 'Fetch and extract main content from a webpage URL. Use when a user shares a link or asks about a specific webpage.',
            parameters: {
                type: 'object',
                properties: {
                    url: { type: 'string', description: 'The URL to fetch' },
                },
                required: ['url'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'execute_code',
            description: 'Execute JavaScript code in a sandboxed environment. Use for calculations, data processing, or testing logic.',
            parameters: {
                type: 'object',
                properties: {
                    code: { type: 'string', description: 'JavaScript code to execute' },
                    language: { type: 'string', description: 'Language (javascript)', default: 'javascript' },
                },
                required: ['code'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'calculate',
            description: 'Evaluate a mathematical expression. Supports +, -, *, /, ^, sqrt, sin, cos, tan, log, abs, floor, ceil, round, pow, min, max, pi, e.',
            parameters: {
                type: 'object',
                properties: {
                    expression: { type: 'string', description: 'Math expression to evaluate, e.g. "sqrt(144) + 2^3"' },
                },
                required: ['expression'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'get_current_time',
            description: 'Get the current date and time. Use when user asks about date, time, or you need temporal context.',
            parameters: {
                type: 'object',
                properties: {
                    timezone: { type: 'string', description: 'IANA timezone e.g. "America/New_York", "Asia/Tokyo", "UTC"' },
                },
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'get_weather',
            description: 'Get real-time weather data for any location. Returns current conditions + 3-day forecast.',
            parameters: {
                type: 'object',
                properties: {
                    location: { type: 'string', description: 'City name, e.g. "Tokyo" or "London"' },
                    units: { type: 'string', description: 'metric or imperial', default: 'metric' },
                },
                required: ['location'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'generate_video',
            description: 'Generate a short AI video from a text description using RunwayML. Takes a few minutes. Use when user asks to create or generate a video.',
            parameters: {
                type: 'object',
                properties: {
                    prompt: { type: 'string', description: 'Detailed description of the video to generate' },
                    duration: { type: 'number', description: 'Duration in seconds (5 or 10)', default: 5 },
                },
                required: ['prompt'],
            },
        },
    },
    // ── DOCUMENT PARSING ──────────────────────────────────────────
    {
        type: 'function',
        function: {
            name: 'parse_pdf',
            description: 'Extract text content from a PDF file. Use when user uploads or references a PDF document.',
            parameters: {
                type: 'object',
                properties: {
                    file: { type: 'string', description: 'Path to the PDF file' },
                },
                required: ['file'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'parse_docx',
            description: 'Extract text content from a Word document (.docx). Use when user uploads a Word file.',
            parameters: {
                type: 'object',
                properties: {
                    file: { type: 'string', description: 'Path to the DOCX file' },
                },
                required: ['file'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'parse_csv',
            description: 'Parse CSV data and return structured rows. Use for spreadsheet or data analysis.',
            parameters: {
                type: 'object',
                properties: {
                    file: { type: 'string', description: 'Path to the CSV file' },
                    limit: { type: 'number', description: 'Max rows to return (default 100)' },
                },
                required: ['file'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'parse_json',
            description: 'Parse, validate, transform, query, diff, flatten, or format JSON data.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['parse', 'validate', 'transform', 'query', 'diff', 'flatten', 'unflatten', 'minify', 'prettify'], description: 'Action to perform' },
                    content: { type: 'string', description: 'JSON string or content to process' },
                    schema: { type: 'object', description: 'JSON schema for validation (action=validate)' },
                    path: { type: 'string', description: 'JSONPath-like query path (action=query)' },
                },
                required: ['action', 'content'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'parse_markdown',
            description: 'Parse Markdown content — extract headers, links, code blocks, frontmatter.',
            parameters: {
                type: 'object',
                properties: {
                    content: { type: 'string', description: 'Markdown content or file path' },
                },
                required: ['content'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'parse_html',
            description: 'Extract structured data from HTML. Actions: extract (title/headings/links/images/meta), select (CSS selectors), table, forms, text, validate.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['extract', 'select', 'table', 'forms', 'text', 'validate'], description: 'Extraction action' },
                    content: { type: 'string', description: 'HTML content to parse' },
                    selector: { type: 'string', description: 'CSS selector (for action=select)' },
                },
                required: ['action', 'content'],
            },
        },
    },
    // ── IMAGE PROCESSING ───────────────────────────────────────────
    {
        type: 'function',
        function: {
            name: 'generate_image',
            description: 'Generate an AI image using DALL-E 3. Returns a URL. Use when user asks to create, draw, or generate an image.',
            parameters: {
                type: 'object',
                properties: {
                    prompt: { type: 'string', description: 'Detailed description of the image to generate' },
                    style: { type: 'string', enum: ['realistic', 'artistic', 'anime', 'digital-art', '3d-render', 'pixel-art'], description: 'Art style (default: realistic)' },
                    width: { type: 'number', description: 'Width in pixels (default: 1024)' },
                    height: { type: 'number', description: 'Height in pixels (default: 1024)' },
                },
                required: ['prompt'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'image_create',
            description: 'Create images from scratch: blank canvas, gradient, pattern (checkerboard/stripes/dots/grid), noise, SVG render, text-to-image, placeholder, sprite sheet, or drawing with shapes.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['blank', 'gradient', 'pattern', 'noise', 'from_svg', 'text_image', 'placeholder', 'sprite_sheet', 'drawing'], description: 'Creation action' },
                    width: { type: 'number', description: 'Width in pixels (default: 800)' },
                    height: { type: 'number', description: 'Height in pixels (default: 600)' },
                    color: { type: 'string', description: 'Fill color hex' },
                    from: { type: 'string', description: 'Gradient start color' },
                    to: { type: 'string', description: 'Gradient end color' },
                    direction: { type: 'string', enum: ['horizontal', 'vertical', 'diagonal', 'radial'], description: 'Gradient direction' },
                    type: { type: 'string', enum: ['checkerboard', 'stripes', 'dots', 'grid'], description: 'Pattern type' },
                    svg: { type: 'string', description: 'SVG markup (from_svg)' },
                    text: { type: 'string', description: 'Text content (text_image)' },
                    fontSize: { type: 'number', description: 'Font size (default: 64)' },
                    outputFormat: { type: 'string', enum: ['png', 'jpeg', 'webp', 'avif'], description: 'Output format' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'image_transform',
            description: 'Transform image geometry: resize, crop, rotate, flip, mirror, pad, trim, extend, shrink, skew, auto-orient, extract region, or flatten alpha.',
            parameters: {
                type: 'object',
                properties: {
                    source: { type: 'string', description: 'Image URL or data URL' },
                    action: { type: 'string', enum: ['resize', 'crop', 'rotate', 'flip', 'mirror', 'pad', 'trim', 'extend', 'shrink', 'skew', 'auto_orient', 'extract_region', 'flatten'], description: 'Transform action' },
                    width: { type: 'number', description: 'Target width' },
                    height: { type: 'number', description: 'Target height' },
                    fit: { type: 'string', enum: ['cover', 'contain', 'fill', 'inside', 'outside'], description: 'Resize fit mode' },
                    angle: { type: 'number', description: 'Rotation angle in degrees' },
                    direction: { type: 'string', enum: ['horizontal', 'vertical', 'both'], description: 'Flip direction' },
                    background: { type: 'string', description: 'Background color hex' },
                    outputFormat: { type: 'string', enum: ['png', 'jpeg', 'webp', 'avif'], description: 'Output format' },
                },
                required: ['source', 'action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'image_convert',
            description: 'Convert image between formats (JPEG, PNG, WebP, AVIF, TIFF, GIF) with quality control.',
            parameters: {
                type: 'object',
                properties: {
                    source: { type: 'string', description: 'Source image path or URL' },
                    format: { type: 'string', enum: ['jpeg', 'png', 'webp', 'avif', 'tiff', 'gif'], description: 'Target format' },
                    quality: { type: 'number', description: 'Output quality 1-100' },
                },
                required: ['source'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'image_compose',
            description: 'Compose images: text overlay, watermark (text/image, tiled), overlay with blend modes, merge multiple images, border, drop shadow, or decorative frame.',
            parameters: {
                type: 'object',
                properties: {
                    source: { type: 'string', description: 'Primary image URL or data URL' },
                    action: { type: 'string', enum: ['text_overlay', 'watermark', 'overlay', 'merge', 'border', 'shadow', 'frame'], description: 'Composition action' },
                    text: { type: 'string', description: 'Text content (text_overlay, watermark)' },
                    fontSize: { type: 'number', description: 'Font size in pixels' },
                    fontColor: { type: 'string', description: 'Text color hex' },
                    position: { type: 'string', enum: ['center', 'top-left', 'top-right', 'top-center', 'bottom-left', 'bottom-right', 'bottom-center'], description: 'Position' },
                    opacity: { type: 'number', description: 'Opacity 0-1' },
                    overlay: { type: 'string', description: 'Second image URL' },
                    blendMode: { type: 'string', enum: ['over', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'hard-light', 'soft-light', 'difference'], description: 'Blend mode' },
                    sources: { type: 'array', items: { type: 'string' }, description: 'Images for merge' },
                    layout: { type: 'string', enum: ['horizontal', 'vertical', 'grid'], description: 'Merge layout' },
                },
                required: ['source', 'action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'image_filter',
            description: 'Apply visual filters: grayscale, sepia, invert, brightness, contrast, blur, sharpen, tint, pixelate, vignette, emboss, edge detect, posterize, vintage, cinematic, and more (24 filters).',
            parameters: {
                type: 'object',
                properties: {
                    source: { type: 'string', description: 'Image URL or data URL' },
                    action: { type: 'string', enum: ['grayscale', 'sepia', 'invert', 'modulate', 'brightness', 'contrast', 'blur', 'sharpen', 'tint', 'pixelate', 'vignette', 'emboss', 'edge_detect', 'posterize', 'vintage', 'cinematic', 'lut'], description: 'Filter to apply' },
                    value: { type: 'number', description: 'Filter strength value' },
                    color: { type: 'string', description: 'Tint color hex' },
                    preset: { type: 'string', enum: ['warm', 'cool', 'noir', 'sunset', 'teal_orange', 'matte', 'forest', 'candy'], description: 'Color grading preset (lut)' },
                    outputFormat: { type: 'string', enum: ['png', 'jpeg', 'webp', 'avif'], description: 'Output format' },
                },
                required: ['source', 'action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'image_analyze',
            description: 'Analyze images: metadata, dominant colors, stats, histogram, perceptual hash, compare similarity, aspect check, EXIF data, corruption check, or convert to ASCII art.',
            parameters: {
                type: 'object',
                properties: {
                    source: { type: 'string', description: 'Image URL or data URL' },
                    action: { type: 'string', enum: ['metadata', 'validate', 'dominant_colors', 'stats', 'histogram', 'hash', 'compare', 'aspect_check', 'corruption_check', 'read_exif', 'to_ascii', 'to_base64'], description: 'Analysis action' },
                    target: { type: 'string', description: 'Second image URL for compare' },
                    count: { type: 'number', description: 'Number of dominant colors (default: 5)' },
                },
                required: ['source'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'image_batch',
            description: 'Process multiple images with the same operation. Bulk pipeline with partial-failure support.',
            parameters: {
                type: 'object',
                properties: {
                    sources: { type: 'array', items: { type: 'string' }, description: 'Array of image URLs' },
                    tool: { type: 'string', enum: ['create', 'transform', 'filter', 'optimize', 'compose', 'background', 'analyze'], description: 'Which image tool to use' },
                    action: { type: 'string', description: 'Action to perform' },
                    width: { type: 'number', description: 'Width parameter' },
                    height: { type: 'number', description: 'Height parameter' },
                    format: { type: 'string', description: 'Output format' },
                    quality: { type: 'number', description: 'Quality 1-100' },
                },
                required: ['sources', 'tool', 'action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'image_background',
            description: 'Background operations: auto-remove, replace with color/image, chroma key, blur background, gradient background, or AI-powered removal.',
            parameters: {
                type: 'object',
                properties: {
                    source: { type: 'string', description: 'Image URL or data URL' },
                    action: { type: 'string', enum: ['remove', 'replace', 'make_transparent', 'blur_background', 'gradient_background', 'ai_remove'], description: 'Background action' },
                    color: { type: 'string', description: 'Target color hex to make transparent' },
                    newBackground: { type: 'string', description: 'Replacement color or image URL' },
                    blur: { type: 'number', description: 'Blur sigma (default: 15)' },
                    threshold: { type: 'number', description: 'Color distance threshold (default: 30)' },
                },
                required: ['source', 'action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'image_face',
            description: 'Detect and analyze faces in images — face detection, blur faces, crop to face, landmarks.',
            parameters: {
                type: 'object',
                properties: {
                    source: { type: 'string', description: 'Image path or URL' },
                    action: { type: 'string', description: 'Analysis action (default: face)' },
                },
                required: ['source'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'image_ai',
            description: 'AI-powered image analysis (Azure CV): OCR text extraction, captions, auto-tag, object/people detection, NSFW check, smart crop, or full analysis.',
            parameters: {
                type: 'object',
                properties: {
                    source: { type: 'string', description: 'Image URL or data URL' },
                    action: { type: 'string', enum: ['ocr', 'describe', 'tags', 'objects', 'people', 'nsfw_check', 'smart_crop', 'full_analysis'], description: 'AI analysis action' },
                    language: { type: 'string', description: 'Language code for OCR (default: en)' },
                },
                required: ['source', 'action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'image_export',
            description: 'Export image to ASCII art, base64, data URL, or raw pixel data.',
            parameters: {
                type: 'object',
                properties: {
                    source: { type: 'string', description: 'Source image path or URL' },
                    action: { type: 'string', description: 'Export action' },
                    format: { type: 'string', description: 'Target format' },
                },
                required: ['source'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'image_ocr',
            description: 'Extract text from images using OCR (Tesseract.js). Use when user has an image with text they want to read.',
            parameters: {
                type: 'object',
                properties: {
                    source: { type: 'string', description: 'Image path or URL' },
                    language: { type: 'string', description: 'OCR language (default: eng)' },
                },
                required: ['source'],
            },
        },
    },
    // ── AUDIO ──────────────────────────────────────────────────────
    {
        type: 'function',
        function: {
            name: 'transcribe_audio',
            description: 'Convert speech to text using AI transcription (Whisper). Use when user uploads audio and wants a transcript.',
            parameters: {
                type: 'object',
                properties: {
                    file: { type: 'string', description: 'Path to the audio file' },
                    language: { type: 'string', description: 'Language code e.g. en, es, fr (default: en)' },
                },
                required: ['file'],
            },
        },
    },
    // ── VIDEO PROCESSING ───────────────────────────────────────────
    {
        type: 'function',
        function: {
            name: 'video_transform',
            description: 'Transform video: trim, split, concat, speed change, resize, or crop.',
            parameters: {
                type: 'object',
                properties: {
                    source: { type: 'string', description: 'Video source path or URL' },
                    action: { type: 'string', enum: ['trim', 'split', 'concat', 'speed', 'resize', 'crop'], description: 'Transform action' },
                    start: { type: 'number', description: 'Start time in seconds' },
                    end: { type: 'number', description: 'End time in seconds' },
                    width: { type: 'number', description: 'Target width' },
                    height: { type: 'number', description: 'Target height' },
                    speed: { type: 'number', description: 'Speed factor (0.5=slow, 2=fast)' },
                },
                required: ['source', 'action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'video_convert',
            description: 'Convert video format, compress, create GIF, generate thumbnail, or create responsive variants.',
            parameters: {
                type: 'object',
                properties: {
                    source: { type: 'string', description: 'Video source path or URL' },
                    action: { type: 'string', enum: ['convert', 'compress', 'gif', 'thumbnail', 'responsive'], description: 'Conversion action' },
                    format: { type: 'string', description: 'Target format (mp4, webm, avi, mkv)' },
                },
                required: ['source', 'action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'video_analyze',
            description: 'Analyze video: get metadata, detect scenes, find silence, or validate.',
            parameters: {
                type: 'object',
                properties: {
                    source: { type: 'string', description: 'Video source path or URL' },
                    action: { type: 'string', enum: ['metadata', 'scenes', 'silence', 'validate'], description: 'Analysis action' },
                },
                required: ['source', 'action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'video_overlay',
            description: 'Add overlays to video: title card, attention hook text, lower third (speaker name), watermark (text/image), or branded intro bar.',
            parameters: {
                type: 'object',
                properties: {
                    source: { type: 'string', description: 'Video source path or URL' },
                    action: { type: 'string', enum: ['title', 'hook', 'lower_third', 'watermark', 'brand'], description: 'Overlay type' },
                    text: { type: 'string', description: 'Text content' },
                    name: { type: 'string', description: 'Speaker name (lower_third)' },
                    title: { type: 'string', description: 'Speaker title (lower_third)' },
                    image: { type: 'string', description: 'Image URL for watermark' },
                    position: { type: 'string', enum: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'], description: 'Watermark position' },
                    opacity: { type: 'number', description: 'Opacity 0-1' },
                    start: { type: 'number', description: 'Start time in seconds' },
                    end: { type: 'number', description: 'End time in seconds' },
                },
                required: ['source', 'action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'video_filter',
            description: 'Apply video filters: color correction, cinematic look, blur background, or stabilize shaky footage.',
            parameters: {
                type: 'object',
                properties: {
                    source: { type: 'string', description: 'Video source path or URL' },
                    action: { type: 'string', enum: ['color_correct', 'cinematic', 'blur_bg', 'stabilize', 'filter'], description: 'Filter action' },
                },
                required: ['source', 'action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'video_audio',
            description: 'Video audio processing: loudness normalization (EBU R128), denoise (FFT), fade in/out, add background music with volume control, or beat sync.',
            parameters: {
                type: 'object',
                properties: {
                    source: { type: 'string', description: 'Video source path or URL' },
                    action: { type: 'string', enum: ['balance', 'denoise', 'fade', 'add_music', 'beat_sync'], description: 'Audio action' },
                    strength: { type: 'string', enum: ['light', 'medium', 'heavy'], description: 'Denoise strength' },
                    fadeIn: { type: 'number', description: 'Fade in duration in seconds' },
                    fadeOut: { type: 'number', description: 'Fade out duration in seconds' },
                    musicUrl: { type: 'string', description: 'Background music URL (add_music)' },
                    musicVolume: { type: 'number', description: 'Music volume 0-1 (default: 0.15)' },
                    voiceVolume: { type: 'number', description: 'Voice volume 0-2 (default: 1.0)' },
                },
                required: ['source', 'action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'video_ai',
            description: 'AI video analysis: describe content, transcribe speech, extract highlights, auto-caption, moderate content, or smart crop.',
            parameters: {
                type: 'object',
                properties: {
                    source: { type: 'string', description: 'Video source path or URL' },
                    action: { type: 'string', enum: ['describe', 'transcribe', 'highlights', 'caption', 'moderate', 'smart_crop'], description: 'AI action' },
                },
                required: ['source', 'action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'video_batch',
            description: 'Process multiple videos through a pipeline of operations. Each video goes through all steps sequentially.',
            parameters: {
                type: 'object',
                properties: {
                    sources: { type: 'array', items: { type: 'string' }, description: 'Array of video URLs to process' },
                    pipeline: { type: 'array', items: { type: 'object' }, description: 'Array of processing steps' },
                    maxVideos: { type: 'number', description: 'Max videos to process (default: 20)' },
                },
                required: ['sources', 'pipeline'],
            },
        },
    },
    // ── ARCHIVE PROCESSING ─────────────────────────────────────────
    {
        type: 'function',
        function: {
            name: 'archive_core',
            description: 'Create or extract archives (ZIP, TAR, GZIP). Actions: zip, tar, gzip, extract, extract_tar, repack, rename entries, compress, split, merge.',
            parameters: {
                type: 'object',
                properties: {
                    source: { type: 'string', description: 'Source path or archive file URL' },
                    action: { type: 'string', enum: ['zip', 'tar', 'gzip', 'extract', 'extract_tar'], description: 'Archive action' },
                    output: { type: 'string', description: 'Output path' },
                },
                required: ['source', 'action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'archive_edit',
            description: 'Edit archive contents in-place: add_file, remove_file, replace_file, edit_text (find/replace), patch_config (.env/.json patches), rename_file, or fix_paths (normalize separators).',
            parameters: {
                type: 'object',
                properties: {
                    source: { type: 'string', description: 'Archive URL' },
                    action: { type: 'string', enum: ['add_file', 'remove_file', 'replace_file', 'edit_text', 'patch_config', 'rename_file', 'fix_paths'], description: 'Edit action' },
                    path: { type: 'string', description: 'File path in archive' },
                    content: { type: 'string', description: 'New file content (add/replace)' },
                    find: { type: 'string', description: 'Text to find (edit_text)' },
                    replace: { type: 'string', description: 'Replacement text (edit_text)' },
                    patches: { type: 'object', description: 'Key-value patches (patch_config)' },
                },
                required: ['source', 'action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'archive_structure',
            description: 'Inspect and validate archive structure: list files, tree view, stats, validate layout, normalize, flatten, or nest.',
            parameters: {
                type: 'object',
                properties: {
                    source: { type: 'string', description: 'Archive file path or URL' },
                    action: { type: 'string', enum: ['list', 'tree', 'stats'], description: 'Inspection action' },
                },
                required: ['source'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'archive_security',
            description: 'Security analysis: zip bomb detection, symlink check, path traversal detection, password check, secret scanning (API keys/tokens), or size report.',
            parameters: {
                type: 'object',
                properties: {
                    source: { type: 'string', description: 'Archive URL' },
                    action: { type: 'string', enum: ['check_bomb', 'check_symlinks', 'check_paths', 'check_password', 'scan_secrets', 'size_report'], description: 'Security action' },
                },
                required: ['source', 'action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'archive_bulk',
            description: 'Batch process multiple archives: bulk extract, rezip, rename, deduplicate, or chunk.',
            parameters: {
                type: 'object',
                properties: {
                    sources: { type: 'array', items: { type: 'string' }, description: 'Array of archive paths or URLs' },
                    pipeline: { type: 'array', description: 'Processing pipeline steps' },
                },
                required: ['sources'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'archive_convert',
            description: 'Convert between archive formats: zip↔tar, zip↔targz, targz↔zip, or normalize line endings across all text files.',
            parameters: {
                type: 'object',
                properties: {
                    source: { type: 'string', description: 'Archive URL' },
                    action: { type: 'string', enum: ['zip_to_tar', 'tar_to_zip', 'zip_to_targz', 'targz_to_zip', 'normalize_endings'], description: 'Convert action' },
                    level: { type: 'number', description: 'Compression level 0-9 (default: 6)' },
                },
                required: ['source', 'action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'archive_intelligence',
            description: 'AI archive analysis: summarize contents, auto-generate README, detect project type, flag secrets, or dependency report.',
            parameters: {
                type: 'object',
                properties: {
                    source: { type: 'string', description: 'Archive URL' },
                    action: { type: 'string', enum: ['summarize', 'readme_generate', 'detect_project', 'flag_secrets', 'dependency_report'], description: 'Intelligence action' },
                    name: { type: 'string', description: 'Project name (readme_generate)' },
                },
                required: ['source', 'action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'archive_deploy',
            description: 'Dev packaging for deployment: package build artifacts, prepare for deploy platform (Vercel/Netlify/Cloudflare), inject env vars, version tag, or production_ready (full cleanup + validate).',
            parameters: {
                type: 'object',
                properties: {
                    source: { type: 'string', description: 'Archive URL' },
                    action: { type: 'string', enum: ['package_build', 'prepare_deploy', 'inject_env', 'version_tag', 'production_ready'], description: 'Deploy action' },
                    platform: { type: 'string', enum: ['generic', 'vercel', 'netlify', 'cloudflare'], description: 'Target platform' },
                    env: { type: 'object', description: 'Environment variables to inject' },
                    version: { type: 'string', description: 'Version string' },
                },
                required: ['source', 'action'],
            },
        },
    },
    // ── Dev Tools (8) ──────────────────────────────────────────────
    {
        type: 'function',
        function: {
            name: 'dev_filesystem',
            description: 'File system operations: tree view, file stats, diff, find duplicates, disk usage.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['tree', 'stats', 'diff', 'duplicates', 'disk_usage'], description: 'Action to perform' },
                    path: { type: 'string', description: 'Target path' },
                    path2: { type: 'string', description: 'Second path for diff' },
                    maxDepth: { type: 'number', description: 'Max depth for tree' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'dev_search',
            description: 'Search code: grep patterns, find files by name/content/regex, find and replace.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['grep', 'find', 'find_replace'], description: 'Search action' },
                    pattern: { type: 'string', description: 'Search pattern or regex' },
                    path: { type: 'string', description: 'Search path' },
                    replace: { type: 'string', description: 'Replacement string (for find_replace)' },
                    regex: { type: 'boolean', description: 'Use regex matching' },
                    caseSensitive: { type: 'boolean', description: 'Case sensitive search' },
                },
                required: ['action', 'pattern'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'dev_intelligence',
            description: 'Code intelligence: extract symbols, references, definitions, detect language/framework, analyze imports.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['symbols', 'imports', 'exports', 'language', 'framework'], description: 'Intelligence action' },
                    filePath: { type: 'string', description: 'File to analyze' },
                    content: { type: 'string', description: 'Code content to analyze' },
                    path: { type: 'string', description: 'Project path (for framework detection)' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'dev_debug',
            description: 'Debug tools: parse errors, analyze stack traces, lint, dependency audit, dead code detection, find TODOs.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['error_parse', 'stack_trace', 'todos', 'dead_code'], description: 'Debug action' },
                    error: { type: 'string', description: 'Error message to parse' },
                    stackTrace: { type: 'string', description: 'Stack trace to analyze' },
                    path: { type: 'string', description: 'Path to scan' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'dev_test',
            description: 'Run tests with Jest/Vitest/Pytest. Execute test suites, mocks, and get coverage reports.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['run', 'coverage'], description: 'Test action' },
                    path: { type: 'string', description: 'Test file or directory' },
                    runner: { type: 'string', enum: ['jest', 'vitest'], description: 'Test runner' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'dev_git',
            description: 'Git operations: clone, commit, push, PR, branch, merge, history, blame, status, log, diff.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['status', 'log', 'diff', 'branch', 'blame', 'commit', 'clone', 'history'], description: 'Git action' },
                    path: { type: 'string', description: 'Repository path' },
                    message: { type: 'string', description: 'Commit message' },
                    file: { type: 'string', description: 'File for blame/diff' },
                    url: { type: 'string', description: 'Repository URL for clone' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'dev_npm',
            description: 'NPM operations: install, update, audit, publish, version, run scripts, list packages, check outdated.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['list', 'install', 'update', 'audit', 'outdated', 'run'], description: 'NPM action' },
                    path: { type: 'string', description: 'Package directory' },
                    package: { type: 'string', description: 'Package name' },
                    script: { type: 'string', description: 'Script name to run' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'dev_docker',
            description: 'Docker operations: build, run, compose, push, registry, health check, list containers/images, logs.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['ps', 'images', 'build', 'run', 'compose', 'logs', 'health'], description: 'Docker action' },
                    image: { type: 'string', description: 'Docker image name' },
                    container: { type: 'string', description: 'Container name/ID' },
                    path: { type: 'string', description: 'Dockerfile/compose path' },
                },
                required: ['action'],
            },
        },
    },
    // ── Web & Frontend Tools (7) ──────────────────────────────────────
    {
        type: 'function',
        function: {
            name: 'web_analyze',
            description: 'Analyze HTML/CSS quality: validation, accessibility, responsive, SEO, performance audit.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['html', 'accessibility', 'seo', 'performance'], description: 'Analysis type' },
                    content: { type: 'string', description: 'HTML content to analyze' },
                    url: { type: 'string', description: 'URL to analyze (alternative to content)' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'web_scaffold',
            description: 'Generate React/Next.js components, routes, forms, hooks, stores from templates.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['component', 'hook', 'route', 'form', 'store'], description: 'Scaffold type' },
                    name: { type: 'string', description: 'Component/hook/route name' },
                    framework: { type: 'string', enum: ['react', 'next', 'express'], description: 'Target framework' },
                    props: { type: 'array', items: { type: 'string' }, description: 'Component props' },
                    fields: { type: 'array', description: 'Form fields' },
                },
                required: ['action', 'name'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'web_optimize',
            description: 'Generate SEO meta tags, sitemap, robots.txt, PWA manifest, service worker.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['meta', 'sitemap', 'robots', 'pwa_manifest', 'service_worker'], description: 'Optimization type' },
                    title: { type: 'string', description: 'Page/site title' },
                    description: { type: 'string', description: 'Description' },
                    url: { type: 'string', description: 'Base URL' },
                    pages: { type: 'array', items: { type: 'string' }, description: 'Pages for sitemap' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'web_transform',
            description: 'Generate Tailwind config, dark mode utility, PWA setup, responsive breakpoints, CSS animations.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['tailwind', 'dark_mode', 'responsive', 'animations'], description: 'Transform type' },
                    colors: { type: 'object', description: 'Custom colors for Tailwind' },
                    fonts: { type: 'object', description: 'Custom fonts' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'web_screenshot',
            description: 'Capture webpage screenshots: full page, responsive viewports, specific elements, or PDF export.',
            parameters: {
                type: 'object',
                properties: {
                    url: { type: 'string', description: 'URL to screenshot' },
                    width: { type: 'number', description: 'Viewport width' },
                    height: { type: 'number', description: 'Viewport height' },
                    fullPage: { type: 'boolean', description: 'Capture full page' },
                },
                required: ['url'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'web_lighthouse',
            description: 'Run performance audit on a URL: speed, accessibility, SEO, best practices scores.',
            parameters: {
                type: 'object',
                properties: {
                    url: { type: 'string', description: 'URL to audit' },
                    strategy: { type: 'string', enum: ['mobile', 'desktop'], description: 'Device strategy (default: mobile)' },
                },
                required: ['url'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'web_scrape',
            description: 'Extract structured data from web pages: tables, links, text, JSON-LD, CSS selectors.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['extract', 'links', 'tables', 'json_ld', 'select'], description: 'Scrape action' },
                    url: { type: 'string', description: 'URL to scrape' },
                    selector: { type: 'string', description: 'CSS selector (for action=select)' },
                },
                required: ['action', 'url'],
            },
        },
    },
    // ── Database Tools (6) ────────────────────────────────────────
    {
        type: 'function',
        function: {
            name: 'db_query',
            description: 'Execute SQL queries: SELECT, INSERT, UPDATE, DELETE, JOIN, count, findUnique.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['select', 'execute', 'count', 'findUnique', 'insert', 'update', 'delete'], description: 'Query action' },
                    table: { type: 'string', description: 'Table/model name' },
                    sql: { type: 'string', description: 'Raw SQL query (for action=select/execute)' },
                    where: { type: 'object', description: 'Filter conditions' },
                    data: { type: 'object', description: 'Data for insert/update' },
                    limit: { type: 'number', description: 'Row limit' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'db_schema',
            description: 'Inspect/create/alter database tables, indexes, constraints, relations, size info.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['tables', 'columns', 'indexes', 'constraints', 'size', 'relations'], description: 'Schema action' },
                    table: { type: 'string', description: 'Table name (for columns/indexes/constraints)' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'db_backup',
            description: 'Export/import database data, create snapshots, restore from backup.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['export', 'import', 'snapshot'], description: 'Backup action' },
                    table: { type: 'string', description: 'Table name' },
                    data: { type: 'array', description: 'Data to import' },
                    limit: { type: 'number', description: 'Export row limit' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'db_migrate',
            description: 'Run database migrations, check status, view version history.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['status', 'history'], description: 'Migration action' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'db_analyze',
            description: 'Query optimization: EXPLAIN plan, table statistics, slow queries, connections, health check.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['explain', 'stats', 'slow_queries', 'connections', 'health'], description: 'Analysis action' },
                    sql: { type: 'string', description: 'SQL query for EXPLAIN' },
                    table: { type: 'string', description: 'Table name for stats' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'db_connect',
            description: 'Connect to PostgreSQL/MySQL/SQLite/MongoDB: test connection, get info, save/list connections.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['test', 'info', 'save', 'list'], description: 'Connection action' },
                    userId: { type: 'string', description: 'User ID for saving connections' },
                    name: { type: 'string', description: 'Connection name' },
                    provider: { type: 'string', description: 'Database provider' },
                    host: { type: 'string', description: 'Database host' },
                    port: { type: 'number', description: 'Database port' },
                    database: { type: 'string', description: 'Database name' },
                },
                required: ['action'],
            },
        },
    },
    // ── API & Integrations Tools (7) ───────────────────────────────
    {
        type: 'function',
        function: {
            name: 'api_request',
            description: 'HTTP client: GET/POST/PUT/DELETE/PATCH with auth, headers, body. Returns status, headers, body, latency.',
            parameters: {
                type: 'object',
                properties: {
                    url: { type: 'string', description: 'Request URL' },
                    method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'], description: 'HTTP method' },
                    headers: { type: 'object', description: 'Request headers' },
                    body: { type: 'object', description: 'Request body (JSON)' },
                    auth: { type: 'object', description: 'Auth config: {type, token} or {type, username, password}' },
                    timeout: { type: 'number', description: 'Timeout in ms (default: 15000)' },
                },
                required: ['url'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'api_mock',
            description: 'Create mock API endpoints with custom responses, status codes, and delays.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['create', 'list', 'delete', 'hit'], description: 'Mock action' },
                    userId: { type: 'string', description: 'User ID' },
                    name: { type: 'string', description: 'Mock endpoint name' },
                    method: { type: 'string', description: 'HTTP method' },
                    path: { type: 'string', description: 'Mock endpoint path' },
                    statusCode: { type: 'number', description: 'Response status code' },
                    body: { type: 'object', description: 'Response body' },
                    delay: { type: 'number', description: 'Response delay in ms' },
                },
                required: ['action', 'userId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'api_document',
            description: 'Generate OpenAPI/Swagger docs from code, or validate existing specs.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['generate', 'validate'], description: 'Document action' },
                    title: { type: 'string', description: 'API title' },
                    version: { type: 'string', description: 'API version' },
                    endpoints: { type: 'array', description: 'API endpoints to document' },
                    spec: { type: 'object', description: 'OpenAPI spec to validate' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'api_test',
            description: 'Automated API testing: health checks, test suites with assertions, load testing.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['test', 'load'], description: 'Test action' },
                    url: { type: 'string', description: 'URL to test' },
                    tests: { type: 'array', description: 'Test suite with assertions' },
                    concurrent: { type: 'number', description: 'Concurrent requests for load test' },
                    duration: { type: 'number', description: 'Load test duration in ms' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'api_transform',
            description: 'GraphQL/REST conversion, schema validation, API schema transforms.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['rest_to_graphql', 'validate_schema'], description: 'Transform action' },
                    endpoints: { type: 'array', description: 'REST endpoints to convert' },
                    schema: { type: 'object', description: 'Schema to validate' },
                    data: { type: 'object', description: 'Data to validate against schema' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'webhook_listen',
            description: 'Listen for webhooks/events: create endpoints, view logs, manage traffic.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['create', 'list', 'logs', 'delete'], description: 'Webhook action' },
                    userId: { type: 'string', description: 'User ID' },
                    name: { type: 'string', description: 'Webhook name' },
                    events: { type: 'array', items: { type: 'string' }, description: 'Events to listen for' },
                    id: { type: 'string', description: 'Webhook ID (for logs/delete)' },
                },
                required: ['action', 'userId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'sdk_generate',
            description: 'Auto-generate client SDK from OpenAPI spec (JavaScript/TypeScript).',
            parameters: {
                type: 'object',
                properties: {
                    spec: { type: 'object', description: 'OpenAPI 3.0 specification' },
                    language: { type: 'string', enum: ['javascript', 'typescript'], description: 'Target language' },
                    baseUrl: { type: 'string', description: 'API base URL' },
                },
                required: ['spec'],
            },
        },
    },
    // ── AI & ML Tools (11) ───────────────────────────────────────
    {
        type: 'function',
        function: {
            name: 'llm_chat',
            description: 'Multi-provider LLM chat (OpenAI/Claude/Groq/Google). Multi-turn conversations with system prompts.',
            parameters: {
                type: 'object',
                properties: {
                    provider: { type: 'string', enum: ['openai', 'anthropic', 'groq', 'google'], description: 'LLM provider' },
                    model: { type: 'string', description: 'Model name (auto-selected if omitted)' },
                    prompt: { type: 'string', description: 'Simple prompt string' },
                    messages: { type: 'array', description: 'Chat message array [{role, content}]' },
                    system: { type: 'string', description: 'System prompt' },
                    temperature: { type: 'number', description: 'Sampling temperature 0-2' },
                    maxTokens: { type: 'number', description: 'Max response tokens' },
                    json: { type: 'boolean', description: 'Request JSON response format' },
                },
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'llm_embed',
            description: 'Generate text embeddings for semantic search, clustering, and similarity.',
            parameters: {
                type: 'object',
                properties: {
                    text: { type: 'string', description: 'Text to embed' },
                    texts: { type: 'array', items: { type: 'string' }, description: 'Multiple texts to embed' },
                    model: { type: 'string', description: 'Embedding model (default: text-embedding-3-small)' },
                },
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'llm_finetune',
            description: 'Fine-tune models on custom data: create jobs, upload training data, check status.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['create', 'list', 'status', 'cancel', 'upload'], description: 'Fine-tune action' },
                    trainingFile: { type: 'string', description: 'Training file ID' },
                    model: { type: 'string', description: 'Base model to fine-tune' },
                    jobId: { type: 'string', description: 'Fine-tuning job ID' },
                    data: { type: 'array', description: 'JSONL training data' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'ml_train',
            description: 'Train ML models: linear regression, KNN classification, K-means clustering, descriptive stats.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['regression', 'classification', 'cluster', 'stats'], description: 'Training action' },
                    data: { type: 'array', description: 'Training data array of objects' },
                    target: { type: 'string', description: 'Target variable name' },
                    features: { type: 'array', items: { type: 'string' }, description: 'Feature variable names' },
                    k: { type: 'number', description: 'K for KNN or K-means' },
                    clusters: { type: 'number', description: 'Number of clusters' },
                },
                required: ['action', 'data'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'ml_predict',
            description: 'Load and run pre-trained ML models for inference/prediction.',
            parameters: {
                type: 'object',
                properties: {
                    model: { type: 'object', description: 'Trained model object (from ml_train output)' },
                    input: { type: 'object', description: 'Input data for prediction' },
                },
                required: ['model', 'input'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'llm_router',
            description: 'Intelligently route queries to best LLM based on complexity, cost, and speed.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['route', 'models', 'compare'], description: 'Router action' },
                    query: { type: 'string', description: 'Query to route' },
                    task: { type: 'string', description: 'Task description' },
                    constraints: { type: 'object', description: 'Constraints {provider, maxCost, minQuality, preferCheap, preferFast}' },
                    models: { type: 'array', description: 'Models to compare (compare action)' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'llm_cost_optimize',
            description: 'Analyze LLM usage costs, suggest cheaper alternatives, generate budget plans.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['analyze', 'budget'], description: 'Cost optimization action' },
                    userId: { type: 'string', description: 'User ID' },
                    days: { type: 'number', description: 'Days to analyze (default 30)' },
                    monthlyBudget: { type: 'number', description: 'Monthly budget in USD (budget action)' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'llm_guardrail',
            description: 'Detect prompt injection, PII, and policy violations. Sanitize unsafe inputs.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['check', 'sanitize'], description: 'Guardrail action' },
                    input: { type: 'string', description: 'Input text to check/sanitize' },
                    checkPII: { type: 'boolean', description: 'Enable PII detection (default true)' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'llm_evaluate',
            description: 'Grade AI responses on relevance, completeness, accuracy. Compare multiple responses.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['grade', 'compare', 'factcheck'], description: 'Evaluation action' },
                    response: { type: 'string', description: 'Response to evaluate' },
                    query: { type: 'string', description: 'Original query for relevance scoring' },
                    criteria: { type: 'array', description: 'Evaluation criteria' },
                    responses: { type: 'array', description: 'Multiple responses to compare' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'data_profile',
            description: 'Statistical profiling of datasets: types, distributions, outliers, correlations, quality scores.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['analyze', 'summary'], description: 'Profiling action' },
                    data: { type: 'array', description: 'Data array of objects [{col1: val, col2: val}]' },
                },
                required: ['action', 'data'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'data_clean',
            description: 'Clean datasets: auto-clean, deduplicate, fill nulls, normalize, remove outliers.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['auto', 'deduplicate', 'fill', 'normalize'], description: 'Cleaning action' },
                    data: { type: 'array', description: 'Data array of objects' },
                    column: { type: 'string', description: 'Target column (fill)' },
                    columns: { type: 'array', description: 'Columns to normalize' },
                    strategy: { type: 'string', enum: ['median', 'mean', 'mode', 'value'], description: 'Fill strategy' },
                    method: { type: 'string', enum: ['minmax', 'zscore'], description: 'Normalization method' },
                    removeOutliers: { type: 'boolean', description: 'Remove IQR outliers (auto)' },
                    key: { type: 'string', description: 'Dedup key column' },
                },
                required: ['action', 'data'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'data_visualize',
            description: 'Generate text-based charts: bar, histogram, scatter, heatmap, line. Also Mermaid pie/xy charts.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['chart', 'mermaid'], description: 'Visualization action' },
                    type: { type: 'string', enum: ['bar', 'histogram', 'scatter', 'heatmap', 'line', 'pie', 'xy'], description: 'Chart type' },
                    data: { type: 'array', description: 'Data array' },
                    x: { type: 'string', description: 'X-axis column' },
                    y: { type: 'string', description: 'Y-axis column' },
                    column: { type: 'string', description: 'Column for histogram' },
                    bins: { type: 'number', description: 'Number of histogram bins' },
                    title: { type: 'string', description: 'Chart title' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'feature_engineer',
            description: 'Feature engineering: log, sqrt, interaction, ratio, binning, one-hot, lag, rolling mean transforms.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['transform', 'suggest'], description: 'Engineering action' },
                    data: { type: 'array', description: 'Data array of objects' },
                    transforms: { type: 'array', description: 'Transform specs [{type, column, bins?, lag?, window?}]' },
                },
                required: ['action', 'data'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'model_compare',
            description: 'Evaluate ML models: regression/classification metrics, cross-validation, multi-model ranking.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['evaluate', 'compare', 'cross_validate'], description: 'Comparison action' },
                    predictions: { type: 'array', description: 'Predicted values' },
                    actuals: { type: 'array', description: 'Actual values' },
                    taskType: { type: 'string', enum: ['regression', 'classification'], description: 'Task type' },
                    models: { type: 'array', description: 'Multiple models [{name, predictions, actuals}]' },
                    data: { type: 'array', description: 'Dataset for cross-validation' },
                    target: { type: 'string', description: 'Target column' },
                    folds: { type: 'number', description: 'K-fold count (default 5)' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'data_sample',
            description: 'Random/stratified sampling, train-test split, and bootstrap sampling from datasets.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['random', 'stratified', 'split', 'bootstrap'], description: 'Sampling action' },
                    data: { type: 'array', description: 'Data array of objects' },
                    size: { type: 'number', description: 'Sample size' },
                    ratio: { type: 'number', description: 'Sample ratio (0-1)' },
                    column: { type: 'string', description: 'Stratification column' },
                },
                required: ['action', 'data'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'outlier_detect',
            description: 'Detect outliers using IQR, Z-score, or modified Z-score. Remove outliers or scan multiple columns.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['detect', 'remove', 'multi_column'], description: 'Detection action' },
                    data: { type: 'array', description: 'Data array of objects' },
                    column: { type: 'string', description: 'Target column' },
                    columns: { type: 'array', description: 'Columns for multi-column scan' },
                    method: { type: 'string', enum: ['iqr', 'zscore', 'modified_zscore'], description: 'Detection method' },
                    threshold: { type: 'number', description: 'Detection threshold' },
                },
                required: ['action', 'data'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'data_correlate',
            description: 'Correlation analysis: full matrix, pairwise, top correlations, or feature importance vs target.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['matrix', 'pair', 'top', 'target'], description: 'Correlation action' },
                    data: { type: 'array', description: 'Data array of objects' },
                    columns: { type: 'array', description: 'Columns to include' },
                    column1: { type: 'string', description: 'First column (pair)' },
                    column2: { type: 'string', description: 'Second column (pair)' },
                    target: { type: 'string', description: 'Target column for feature importance' },
                    limit: { type: 'number', description: 'Max results (top action)' },
                },
                required: ['action', 'data'],
            },
        },
    },
    // ── Geo & Location Tools (8) ─────────────────────────────────
    {
        type: 'function',
        function: {
            name: 'geo_geocode',
            description: 'Geocode addresses to coordinates (forward), coordinates to addresses (reverse), or batch geocode.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['forward', 'reverse', 'batch'], description: 'Geocoding action' },
                    userId: { type: 'string', description: 'User ID' },
                    address: { type: 'string', description: 'Address to geocode (forward)' },
                    lat: { type: 'number', description: 'Latitude (reverse)' },
                    lon: { type: 'number', description: 'Longitude (reverse)' },
                    addresses: { type: 'array', description: 'Addresses to batch geocode' },
                    limit: { type: 'number', description: 'Max results per query' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'geo_route',
            description: 'Get driving/walking/cycling directions, multi-stop routes, and isochrone estimations.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['directions', 'multi_stop', 'isochrone'], description: 'Routing action' },
                    from: { type: 'object', description: 'Start point {lat, lon}' },
                    to: { type: 'object', description: 'End point {lat, lon}' },
                    waypoints: { type: 'array', description: 'Waypoints [{lat, lon}] for multi_stop' },
                    center: { type: 'object', description: 'Center point for isochrone' },
                    profile: { type: 'string', enum: ['driving', 'walking', 'cycling'], description: 'Travel mode' },
                    minutes: { type: 'array', description: 'Isochrone minutes [5, 10, 15, 30]' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'geo_distance',
            description: 'Calculate distances (haversine), distance matrices, radius queries, and midpoints.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['calculate', 'matrix', 'within_radius', 'midpoint'], description: 'Distance action' },
                    from: { type: 'object', description: 'Start point {lat, lon}' },
                    to: { type: 'object', description: 'End point {lat, lon}' },
                    points: { type: 'array', description: 'Points array [{lat, lon, label?}]' },
                    center: { type: 'object', description: 'Center point (within_radius)' },
                    radius: { type: 'number', description: 'Radius in km (default 10)' },
                    unit: { type: 'string', enum: ['km', 'mi', 'nm'], description: 'Distance unit' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'geo_fence',
            description: 'Create and manage geofences with enter/exit triggers, check point containment, visualize.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['create', 'check', 'list', 'update', 'delete', 'visualize'], description: 'Geofence action' },
                    userId: { type: 'string', description: 'User ID' },
                    name: { type: 'string', description: 'Fence name' },
                    center: { type: 'object', description: 'Center point {lat, lon}' },
                    radius: { type: 'number', description: 'Radius in km' },
                    type: { type: 'string', enum: ['circle', 'polygon'], description: 'Fence type' },
                    coordinates: { type: 'array', description: 'Polygon coordinates [{lat, lon}]' },
                    triggers: { type: 'array', description: 'Trigger events [enter, exit]' },
                    point: { type: 'object', description: 'Point to check {lat, lon}' },
                    fenceId: { type: 'string', description: 'Fence ID' },
                    active: { type: 'boolean', description: 'Fence active state' },
                    metadata: { type: 'object', description: 'Custom metadata for the fence' },
                    limit: { type: 'number', description: 'Max results (list)' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'geo_timezone',
            description: 'Timezone lookup by coordinates, convert between timezones, list major zones.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['lookup', 'convert', 'list'], description: 'Timezone action' },
                    lat: { type: 'number', description: 'Latitude (lookup)' },
                    lon: { type: 'number', description: 'Longitude (lookup)' },
                    time: { type: 'string', description: 'ISO time to convert' },
                    fromOffset: { type: 'number', description: 'Source UTC offset hours' },
                    toOffset: { type: 'number', description: 'Target UTC offset hours' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'geo_ip_locate',
            description: 'Geolocate IP addresses — single, batch, or distance between two IPs.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['locate', 'batch', 'distance'], description: 'IP location action' },
                    ip: { type: 'string', description: 'IP address (or self for current)' },
                    ips: { type: 'array', description: 'Array of IPs for batch lookup' },
                    ip1: { type: 'string', description: 'First IP (distance)' },
                    ip2: { type: 'string', description: 'Second IP (distance)' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'geo_poi',
            description: 'Search nearby points of interest (restaurants, ATMs, hospitals, etc.) via OpenStreetMap.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['search', 'categories', 'nearby_summary'], description: 'POI action' },
                    lat: { type: 'number', description: 'Latitude' },
                    lon: { type: 'number', description: 'Longitude' },
                    category: { type: 'string', description: 'POI category (restaurant, cafe, hotel, hospital, atm, bank, etc.)' },
                    radius: { type: 'number', description: 'Search radius in meters (default 1000)' },
                    limit: { type: 'number', description: 'Max results (default 10)' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'geo_address_validate',
            description: 'Validate, parse, and standardize addresses. Batch validation supported.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['validate', 'parse', 'batch_validate'], description: 'Validation action' },
                    address: { type: 'string', description: 'Address to validate or parse' },
                    addresses: { type: 'array', description: 'Addresses array for batch validation' },
                },
                required: ['action'],
            },
        },
    },
    // ── Cloud Control Tools (9) ───────────────────────────────
    {
        type: 'function',
        function: {
            name: 'cloud_deploy',
            description: 'Create and manage cloud deployments with health checks, rollback, multi-provider support.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['create', 'status', 'list', 'update', 'rollback', 'delete'], description: 'Deploy action' },
                    userId: { type: 'string', description: 'User ID' },
                    deploymentId: { type: 'string', description: 'Deployment ID' },
                    name: { type: 'string', description: 'Deployment name' },
                    provider: { type: 'string', enum: ['aws', 'gcp', 'azure', 'vercel', 'railway', 'fly', 'render', 'docker'], description: 'Cloud provider' },
                    service: { type: 'string', description: 'Service type' },
                    region: { type: 'string', description: 'Deployment region' },
                    image: { type: 'string', description: 'Container image' },
                    replicas: { type: 'number', description: 'Number of replicas' },
                    memory: { type: 'string', description: 'Memory allocation' },
                    cpu: { type: 'string', description: 'CPU allocation' },
                    env: { type: 'object', description: 'Environment variables' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'cloud_scale',
            description: 'Scale deployments: set replicas, configure auto-scaling, resize CPU/memory.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['set', 'auto', 'resize'], description: 'Scale action' },
                    deploymentId: { type: 'string', description: 'Deployment ID' },
                    replicas: { type: 'number', description: 'Target replicas' },
                    min: { type: 'number', description: 'Min replicas (auto)' },
                    max: { type: 'number', description: 'Max replicas (auto)' },
                    targetCPU: { type: 'number', description: 'Target CPU %' },
                    memory: { type: 'string', description: 'New memory (resize)' },
                    cpu: { type: 'string', description: 'New CPU (resize)' },
                },
                required: ['action', 'deploymentId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'cloud_logs',
            description: 'View, filter, search, and aggregate deployment logs across all environments.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['get', 'append', 'aggregate'], description: 'Log action' },
                    userId: { type: 'string', description: 'User ID' },
                    deploymentId: { type: 'string', description: 'Deployment ID' },
                    level: { type: 'string', enum: ['info', 'warn', 'error'], description: 'Log level filter' },
                    search: { type: 'string', description: 'Search pattern' },
                    limit: { type: 'number', description: 'Max logs to return' },
                    message: { type: 'string', description: 'Log message (append)' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'cloud_secrets',
            description: 'Manage encrypted secrets (AES-256-GCM): set, get, list, rotate, delete across vaults.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['set', 'get', 'list', 'rotate', 'delete'], description: 'Secret action' },
                    userId: { type: 'string', description: 'User ID' },
                    name: { type: 'string', description: 'Secret name' },
                    value: { type: 'string', description: 'Secret value (set)' },
                    newValue: { type: 'string', description: 'New value (rotate)' },
                    vault: { type: 'string', description: 'Vault name' },
                    raw: { type: 'boolean', description: 'Return unmasked value' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'cloud_cost',
            description: 'Estimate deployment costs, view spending summaries, and get optimization suggestions.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['estimate', 'summary', 'optimize'], description: 'Cost action' },
                    userId: { type: 'string', description: 'User ID' },
                    provider: { type: 'string', description: 'Cloud provider' },
                    memory: { type: 'string', description: 'Memory allocation' },
                    cpu: { type: 'string', description: 'CPU allocation' },
                    replicas: { type: 'number', description: 'Number of replicas' },
                    hours: { type: 'number', description: 'Hours to estimate (default 730)' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'cloud_domain',
            description: 'Manage domains: add custom domains, SSL certificates, DNS lookup, check SSL status.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['add', 'list', 'check_ssl', 'dns_lookup', 'delete'], description: 'Domain action' },
                    userId: { type: 'string', description: 'User ID' },
                    domain: { type: 'string', description: 'Domain name' },
                    domainId: { type: 'string', description: 'Domain record ID' },
                    type: { type: 'string', enum: ['A', 'CNAME', 'AAAA', 'MX', 'TXT'], description: 'DNS record type' },
                    target: { type: 'string', description: 'DNS target value' },
                    ssl: { type: 'boolean', description: 'Enable SSL' },
                    provider: { type: 'string', description: 'DNS provider' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'cloud_backup',
            description: 'Create, list, restore, schedule cloud backups. Full/incremental with encryption.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['create', 'list', 'restore', 'delete', 'schedule'], description: 'Backup action' },
                    userId: { type: 'string', description: 'User ID' },
                    name: { type: 'string', description: 'Backup name' },
                    backupId: { type: 'string', description: 'Backup ID' },
                    type: { type: 'string', enum: ['full', 'incremental', 'differential'], description: 'Backup type' },
                    source: { type: 'string', description: 'Source (database, files, config)' },
                    retentionDays: { type: 'number', description: 'Retention days' },
                    frequency: { type: 'string', enum: ['hourly', 'daily', 'weekly', 'monthly'], description: 'Schedule frequency' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'cloud_monitor',
            description: 'Monitor cloud services: health status, uptime checks, metrics, alert configuration.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['status', 'uptime_check', 'metrics', 'alerts'], description: 'Monitor action' },
                    userId: { type: 'string', description: 'User ID' },
                    url: { type: 'string', description: 'URL for uptime check' },
                    deploymentId: { type: 'string', description: 'Deployment ID for metrics' },
                    timeout: { type: 'number', description: 'Check timeout in ms' },
                    period: { type: 'string', enum: ['5m', '15m', '1h', '6h', '24h'], description: 'Metrics period' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'cloud_network',
            description: 'Manage cloud networking: VPCs, firewalls, load balancers, CDN distributions.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['vpc_create', 'firewall', 'load_balancer', 'cdn', 'list'], description: 'Network action' },
                    userId: { type: 'string', description: 'User ID' },
                    name: { type: 'string', description: 'Resource name' },
                    cidr: { type: 'string', description: 'CIDR block' },
                    region: { type: 'string', description: 'Cloud region' },
                    rules: { type: 'array', description: 'Firewall rules' },
                    type: { type: 'string', enum: ['application', 'network', 'gateway'], description: 'LB type' },
                    algorithm: { type: 'string', enum: ['round-robin', 'least-connections', 'ip-hash'], description: 'LB algorithm' },
                    origin: { type: 'string', description: 'CDN origin URL' },
                    ttl: { type: 'number', description: 'CDN cache TTL' },
                },
                required: ['action'],
            },
        },
    },
    // ── Security Tools (10) ──────────────────────────────────────
    {
        type: 'function',
        function: {
            name: 'crypto_hash',
            description: 'Hash data: SHA-256, MD5, SHA-512, bcrypt. Verify hashes, compute HMACs, file checksums.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['hash', 'verify', 'hmac', 'file', 'checksum'], description: 'Hash action' },
                    data: { type: 'string', description: 'Data to hash' },
                    algorithm: { type: 'string', enum: ['sha256', 'md5', 'sha512', 'sha1', 'bcrypt'], description: 'Hash algorithm' },
                    hash: { type: 'string', description: 'Hash to verify against' },
                    key: { type: 'string', description: 'HMAC secret key' },
                    filePath: { type: 'string', description: 'File path for file hashing' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'crypto_encrypt',
            description: 'Encrypt/decrypt data using AES-256-GCM or RSA. Generate encryption keys.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['encrypt', 'decrypt', 'generate_key', 'rsa_generate', 'rsa_encrypt', 'rsa_decrypt'], description: 'Encryption action' },
                    data: { type: 'string', description: 'Data to encrypt/decrypt' },
                    password: { type: 'string', description: 'Password for AES encryption' },
                    encrypted: { type: 'string', description: 'Encrypted data to decrypt' },
                    publicKey: { type: 'string', description: 'RSA public key' },
                    privateKey: { type: 'string', description: 'RSA private key' },
                    keySize: { type: 'number', description: 'RSA key size (default: 2048)' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'crypto_sign',
            description: 'Digitally sign and verify data using RSA or ECDSA.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['sign', 'verify'], description: 'Sign action' },
                    data: { type: 'string', description: 'Data to sign' },
                    privateKey: { type: 'string', description: 'Private key for signing' },
                    publicKey: { type: 'string', description: 'Public key for verification' },
                    signature: { type: 'string', description: 'Signature to verify' },
                    algorithm: { type: 'string', enum: ['RSA-SHA256', 'RSA-SHA512', 'ecdsa-with-SHA256'], description: 'Signing algorithm' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'scan_secrets',
            description: 'Detect exposed API keys, credentials, private keys, passwords in code/content.',
            parameters: {
                type: 'object',
                properties: {
                    content: { type: 'string', description: 'Content to scan' },
                    filePath: { type: 'string', description: 'File path to scan' },
                    scanType: { type: 'string', enum: ['content', 'file', 'directory'], description: 'Scan type' },
                },
                required: ['scanType'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'scan_malware',
            description: 'Scan code for suspicious patterns: eval injection, shell exec, obfuscation, SQL injection.',
            parameters: {
                type: 'object',
                properties: {
                    content: { type: 'string', description: 'Code content to scan' },
                    filePath: { type: 'string', description: 'File path to scan' },
                    scanType: { type: 'string', enum: ['content', 'file', 'directory'], description: 'Scan type' },
                },
                required: ['scanType'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'auth_generate',
            description: 'Generate JWTs, OAuth tokens, API keys, UUIDs, secure passwords. Verify/decode tokens.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['jwt', 'jwt_verify', 'jwt_decode', 'api_key', 'uuid', 'password', 'oauth_token'], description: 'Generation action' },
                    payload: { type: 'object', description: 'JWT payload data' },
                    secret: { type: 'string', description: 'JWT secret key' },
                    token: { type: 'string', description: 'Token to verify/decode' },
                    expiresIn: { type: 'string', description: 'Token expiration (e.g. "1h", "7d")' },
                    length: { type: 'number', description: 'Password/key length' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'scan_vulnerabilities',
            description: 'Scan URLs, code, or dependencies for security vulnerabilities with severity scoring.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['scan', 'history', 'compare'], description: 'Scan action' },
                    userId: { type: 'string', description: 'User ID' },
                    target: { type: 'string', description: 'URL, code, or JSON dependencies to scan' },
                    targetType: { type: 'string', enum: ['url', 'code', 'dependencies'], description: 'Target type' },
                    scanIds: { type: 'array', description: 'Scan IDs to compare' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'policy_enforce',
            description: 'Create/enforce security policies (OWASP, API security, data protection) with templates.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['create', 'check', 'list', 'update', 'delete', 'templates'], description: 'Policy action' },
                    userId: { type: 'string', description: 'User ID' },
                    policyId: { type: 'string', description: 'Policy ID' },
                    name: { type: 'string', description: 'Policy name' },
                    rules: { type: 'array', description: 'Policy rules [{check, severity, message}]' },
                    enforcement: { type: 'string', enum: ['warn', 'block', 'monitor'], description: 'Enforcement level' },
                    input: { type: 'object', description: 'Input to validate against policies' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'threat_model',
            description: 'STRIDE threat modeling: identify threats from architecture, attack trees, risk scoring.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['create', 'analyze', 'list', 'update'], description: 'Threat model action' },
                    userId: { type: 'string', description: 'User ID' },
                    modelId: { type: 'string', description: 'Threat model ID' },
                    name: { type: 'string', description: 'Model name' },
                    architecture: { type: 'object', description: 'Architecture {components, dataFlows, trustBoundaries}' },
                    methodology: { type: 'string', enum: ['STRIDE', 'PASTA', 'LINDDUN'], description: 'Methodology' },
                    mitigations: { type: 'array', description: 'Mitigation strategies' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'incident_response',
            description: 'Incident management: create, update, timeline tracking, runbooks, MTTR dashboard.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['create', 'update', 'timeline', 'list', 'dashboard'], description: 'Incident action' },
                    userId: { type: 'string', description: 'User ID' },
                    incidentId: { type: 'string', description: 'Incident ID' },
                    title: { type: 'string', description: 'Incident title' },
                    severity: { type: 'string', enum: ['p0', 'p1', 'p2', 'p3', 'p4'], description: 'Severity level' },
                    description: { type: 'string', description: 'Incident description' },
                    status: { type: 'string', enum: ['open', 'investigating', 'mitigating', 'resolved', 'closed'], description: 'Incident status' },
                    mitigation: { type: 'string', description: 'Mitigation action taken' },
                    rootCause: { type: 'string', description: 'Root cause analysis' },
                    note: { type: 'string', description: 'Timeline note' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'security_audit',
            description: 'Full security posture audit: OWASP Top 10, HTTP headers, SSL/TLS, scoring, and history.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['full', 'headers', 'history'], description: 'Audit action' },
                    userId: { type: 'string', description: 'User ID' },
                    url: { type: 'string', description: 'Target URL to audit' },
                    target: { type: 'string', description: 'Target name/identifier' },
                    limit: { type: 'number', description: 'Max history items' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'security_compliance',
            description: 'Compliance checking against SOC2, HIPAA, PCI-DSS, GDPR, ISO 27001 frameworks.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['check', 'frameworks', 'report'], description: 'Compliance action' },
                    userId: { type: 'string', description: 'User ID' },
                    framework: { type: 'string', enum: ['soc2', 'hipaa', 'pci_dss', 'gdpr', 'iso27001'], description: 'Compliance framework' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'security_pentest',
            description: 'Automated penetration testing: XSS, SQLi, CSRF, SSRF, auth bypass, command injection.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['run', 'xss', 'sqli', 'categories'], description: 'Pentest action' },
                    userId: { type: 'string', description: 'User ID' },
                    target: { type: 'string', description: 'Target URL' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'security_rbac',
            description: 'Role-based access control: create roles, assign, check permissions, audit assignments.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['create_role', 'list_roles', 'assign', 'check_permission', 'audit', 'revoke'], description: 'RBAC action' },
                    userId: { type: 'string', description: 'User ID' },
                    name: { type: 'string', description: 'Role name' },
                    description: { type: 'string', description: 'Role description' },
                    permissions: { type: 'array', items: { type: 'string' }, description: 'Permission list' },
                    level: { type: 'number', description: 'Role level' },
                    targetUserId: { type: 'string', description: 'User to assign/check' },
                    roleId: { type: 'string', description: 'Role ID' },
                    permission: { type: 'string', description: 'Permission to check' },
                    assignmentId: { type: 'string', description: 'Assignment ID to revoke' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'security_firewall',
            description: 'WAF & firewall management: IP blocking, rate limiting, geo-blocking, WAF rules.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['add_rule', 'list', 'check_ip', 'rate_limit_status', 'waf_status', 'delete', 'toggle'], description: 'Firewall action' },
                    userId: { type: 'string', description: 'User ID' },
                    type: { type: 'string', enum: ['ip_block', 'rate_limit', 'geo_block', 'waf'], description: 'Rule type' },
                    name: { type: 'string', description: 'Rule name' },
                    pattern: { type: 'string', description: 'Match pattern' },
                    ip: { type: 'string', description: 'IP address' },
                    ruleAction: { type: 'string', enum: ['block', 'allow', 'log', 'challenge'], description: 'Rule action' },
                    priority: { type: 'number', description: 'Rule priority' },
                    ruleId: { type: 'string', description: 'Rule ID' },
                    maxRequests: { type: 'number', description: 'Rate limit max requests' },
                    windowSeconds: { type: 'number', description: 'Rate limit window' },
                    countries: { type: 'array', items: { type: 'string' }, description: 'Country codes for geo-blocking' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'security_forensics',
            description: 'Digital forensics: IOC detection, log analysis, timeline, evidence preservation, hash checks.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['analyze', 'timeline', 'evidence', 'hash_check'], description: 'Forensics action' },
                    userId: { type: 'string', description: 'User ID' },
                    data: { type: 'string', description: 'Data to analyze or preserve' },
                    logs: { type: 'string', description: 'Log data to analyze' },
                    events: { type: 'array', description: 'Events for timeline analysis' },
                    name: { type: 'string', description: 'Evidence name' },
                    hash: { type: 'string', description: 'Hash to check' },
                    incidentId: { type: 'string', description: 'Related incident ID' },
                },
                required: ['action'],
            },
        },
    },
    // ── Agent Intelligence & Editor Tools (8) ────────────────────
    {
        type: 'function',
        function: {
            name: 'agent_memory',
            description: 'Save/get/clear/search persistent agent memory with tags and categorization.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['save', 'load', 'search'], description: 'Memory action' },
                    key: { type: 'string', description: 'Memory key' },
                    content: { type: 'string', description: 'Content to save' },
                    tags: { type: 'array', items: { type: 'string' }, description: 'Tags for categorization' },
                    query: { type: 'string', description: 'Search query' },
                    userId: { type: 'string', description: 'User ID' },
                    agentId: { type: 'string', description: 'Agent ID' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'agent_safety',
            description: 'Content safety checking, permission checks, approval flow, rate limiting.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['check', 'rate_limit'], description: 'Safety action' },
                    content: { type: 'string', description: 'Content to check' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'agent_ui',
            description: 'Show messages/warnings/errors/toasts/progress notifications to the user.',
            parameters: {
                type: 'object',
                properties: {
                    type: { type: 'string', enum: ['message', 'warning', 'error', 'success', 'progress'], description: 'Notification type' },
                    message: { type: 'string', description: 'Message content' },
                    title: { type: 'string', description: 'Notification title' },
                    severity: { type: 'string', enum: ['info', 'warning', 'error', 'success'], description: 'Severity level' },
                    duration: { type: 'number', description: 'Display duration in ms' },
                },
                required: ['message'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'agent_control',
            description: 'Switch modes, get agent state, cancel tasks, set context.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['status', 'set_mode', 'cancel'], description: 'Control action' },
                    mode: { type: 'string', description: 'Agent mode to set' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'editor_select',
            description: 'Get/insert/replace text selection, cursor position, select ranges in editor.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['get_selection', 'set_cursor', 'select_range'], description: 'Editor action' },
                    selection: { type: 'string', description: 'Text selection' },
                    cursor: { type: 'object', description: 'Cursor position {line, column}' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'agent_spawn',
            description: 'Create specialized sub-agents with specific goals, tools, and model configurations.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['create', 'list', 'delete'], description: 'Agent action' },
                    name: { type: 'string', description: 'Agent name' },
                    goal: { type: 'string', description: 'Agent goal/objective' },
                    personality: { type: 'string', description: 'Agent personality/specialty' },
                    systemPrompt: { type: 'string', description: 'Custom system prompt' },
                    model: { type: 'string', description: 'AI model to use' },
                    tools: { type: 'array', description: 'Tools available to this agent' },
                    agentId: { type: 'string', description: 'Agent ID (delete)' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'agent_delegate',
            description: 'Delegate tasks to sub-agents with tracking, status checks, and completion.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['assign', 'status', 'complete'], description: 'Delegation action' },
                    userId: { type: 'string', description: 'User ID' },
                    agentId: { type: 'string', description: 'Agent ID to delegate to' },
                    task: { type: 'string', description: 'Task description' },
                    instructions: { type: 'string', description: 'Detailed instructions' },
                    priority: { type: 'string', description: 'Task priority' },
                    taskId: { type: 'string', description: 'Task ID (status/complete)' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'agent_reflect',
            description: 'Self-evaluation: assess goal alignment, tool usage, reasoning quality. Store learnings.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['evaluate', 'learn', 'history'], description: 'Reflection action' },
                    userId: { type: 'string', description: 'User ID' },
                    conversation: { type: 'string', description: 'Conversation to evaluate' },
                    response: { type: 'string', description: 'Response to evaluate' },
                    goal: { type: 'string', description: 'Goal for alignment check' },
                    lesson: { type: 'string', description: 'Lesson learned' },
                    category: { type: 'string', description: 'Lesson category' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'prompt_template',
            description: 'Create, render, version, and manage parameterized prompt templates with {{variable}} placeholders.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['create', 'render', 'list', 'update', 'delete'], description: 'Template action' },
                    userId: { type: 'string', description: 'User ID' },
                    name: { type: 'string', description: 'Template name' },
                    templateId: { type: 'string', description: 'Template ID' },
                    template: { type: 'string', description: 'Template text with {{placeholders}}' },
                    description: { type: 'string', description: 'Template description' },
                    variables: { type: 'object', description: 'Variables to render into template' },
                    category: { type: 'string', description: 'Template category' },
                    limit: { type: 'number', description: 'Max results' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'llm_fallback',
            description: 'Configure and execute LLM fallback chains — auto-retry with next model on failure.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['configure', 'execute', 'list', 'delete'], description: 'Fallback action' },
                    userId: { type: 'string', description: 'User ID' },
                    name: { type: 'string', description: 'Fallback config name' },
                    configId: { type: 'string', description: 'Config ID' },
                    chain: { type: 'array', description: 'Array of model names in fallback order' },
                    maxRetries: { type: 'number', description: 'Max retry attempts' },
                    timeoutMs: { type: 'number', description: 'Timeout per model in ms' },
                    retryOn: { type: 'array', description: 'Conditions to retry on (timeout, rate_limit, 5xx, error)' },
                    limit: { type: 'number', description: 'Max results for list' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'agent_memory_search',
            description: 'Search across agent memory banks for relevant context, get memory stats, or clear memories.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['search', 'stats', 'clear'], description: 'Memory search action' },
                    userId: { type: 'string', description: 'User ID' },
                    agentId: { type: 'string', description: 'Agent ID (default: nova)' },
                    query: { type: 'string', description: 'Search query text' },
                    summary: { type: 'string', description: 'Filter by memory bank summary/category' },
                    confirm: { type: 'boolean', description: 'Confirm destructive clear action' },
                    limit: { type: 'number', description: 'Max results' },
                },
                required: ['action'],
            },
        },
    },
    // ── File Management Tools (17) ────────────────────────────────
    {
        type: 'function',
        function: {
            name: 'create_file',
            description: 'Create a new downloadable file with specified content.',
            parameters: {
                type: 'object',
                properties: {
                    filename: { type: 'string', description: 'Name of the file to create' },
                    content: { type: 'string', description: 'Content to write' },
                    folder: { type: 'string', description: 'Folder path (optional)' },
                },
                required: ['filename', 'content'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'read_file',
            description: 'Read and return the contents of a file.',
            parameters: {
                type: 'object',
                properties: {
                    filename: { type: 'string', description: 'Name or path of the file to read' },
                },
                required: ['filename'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'modify_file',
            description: 'Modify an existing file: replace content or append to it.',
            parameters: {
                type: 'object',
                properties: {
                    filename: { type: 'string', description: 'Name or path of the file to modify' },
                    content: { type: 'string', description: 'New content or content to append' },
                    mode: { type: 'string', enum: ['replace', 'append'], description: 'Operation mode (default: replace)' },
                },
                required: ['filename', 'content'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'write_file',
            description: 'Write content to a file with modes: write, append, prepend, insert at line.',
            parameters: {
                type: 'object',
                properties: {
                    filePath: { type: 'string', description: 'File path to write' },
                    content: { type: 'string', description: 'Content to write' },
                    mode: { type: 'string', enum: ['write', 'append', 'prepend', 'insert'], description: 'Write mode' },
                    encoding: { type: 'string', description: 'File encoding (default: utf-8)' },
                    line: { type: 'number', description: 'Line number for insert mode' },
                },
                required: ['filePath', 'content'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'list_files',
            description: 'List files and folders in a directory.',
            parameters: {
                type: 'object',
                properties: {
                    folder: { type: 'string', description: 'Folder path to list (defaults to root)' },
                },
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'delete_file',
            description: 'Delete a file from the workspace.',
            parameters: {
                type: 'object',
                properties: {
                    filename: { type: 'string', description: 'Name or path of the file to delete' },
                },
                required: ['filename'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'move_file',
            description: 'Move a file from one location to another.',
            parameters: {
                type: 'object',
                properties: {
                    source: { type: 'string', description: 'Current file path' },
                    destination: { type: 'string', description: 'New file path' },
                },
                required: ['source', 'destination'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'copy_file',
            description: 'Copy a file to a new location.',
            parameters: {
                type: 'object',
                properties: {
                    source: { type: 'string', description: 'Source file path' },
                    destination: { type: 'string', description: 'Destination file path' },
                },
                required: ['source', 'destination'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'rename_file',
            description: 'Rename a file.',
            parameters: {
                type: 'object',
                properties: {
                    old_name: { type: 'string', description: 'Current filename' },
                    new_name: { type: 'string', description: 'New filename' },
                },
                required: ['old_name', 'new_name'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'create_folder',
            description: 'Create a new folder/directory.',
            parameters: {
                type: 'object',
                properties: {
                    folder_path: { type: 'string', description: 'Path of the folder to create' },
                },
                required: ['folder_path'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'list_folders',
            description: 'List only folders/directories (not files).',
            parameters: {
                type: 'object',
                properties: {
                    folder: { type: 'string', description: 'Parent folder to list subfolders from' },
                },
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'zip_files',
            description: 'Compress files into a ZIP archive.',
            parameters: {
                type: 'object',
                properties: {
                    files: { type: 'array', items: { type: 'string' }, description: 'Array of file paths to compress' },
                    output_name: { type: 'string', description: 'Name of output ZIP file (default: archive.zip)' },
                },
                required: ['files'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'unzip_files',
            description: 'Extract files from a ZIP archive.',
            parameters: {
                type: 'object',
                properties: {
                    zip_file: { type: 'string', description: 'Path to the ZIP file' },
                    destination: { type: 'string', description: 'Folder to extract files to' },
                },
                required: ['zip_file'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'file_exists',
            description: 'Check if a file or path exists. Returns true/false.',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: 'File path to check' },
                },
                required: ['path'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'get_project_tree',
            description: 'Generate a directory tree view with file listing and sizes.',
            parameters: {
                type: 'object',
                properties: {
                    rootPath: { type: 'string', description: 'Root directory path (default: .)' },
                    maxDepth: { type: 'number', description: 'Maximum directory depth (default: 5)' },
                    includeFiles: { type: 'boolean', description: 'Include files (not just dirs)' },
                    showSize: { type: 'boolean', description: 'Show file sizes' },
                    excludePatterns: { type: 'array', items: { type: 'string' }, description: 'Patterns to exclude' },
                },
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'file_watch',
            description: 'Create/manage file watchers for change events.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['create', 'list', 'check', 'delete'], description: 'Watch action' },
                    watchPath: { type: 'string', description: 'Path to watch' },
                    pattern: { type: 'string', description: 'File pattern to match' },
                    events: { type: 'array', items: { type: 'string' }, description: 'Events to watch' },
                    id: { type: 'string', description: 'Watch ID (for delete)' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'sync_files',
            description: 'Sync/diff directories, create backups.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['diff', 'sync', 'backup'], description: 'Sync action' },
                    source: { type: 'string', description: 'Source directory' },
                    target: { type: 'string', description: 'Target directory' },
                    dryRun: { type: 'boolean', description: 'Preview without changes' },
                    deleteExtra: { type: 'boolean', description: 'Delete extra files in target' },
                },
                required: ['action'],
            },
        },
    },
    // ── Markdown/Content Tools (5) ────────────────────────────────
    {
        type: 'function',
        function: {
            name: 'markdown_convert',
            description: 'Convert markdown to/from HTML, plain text, JSON structure.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['to_html', 'to_text', 'from_html', 'to_json'], description: 'Conversion action' },
                    content: { type: 'string', description: 'Content to convert' },
                    title: { type: 'string', description: 'Page title (for to_html fullPage)' },
                    fullPage: { type: 'boolean', description: 'Generate complete HTML page' },
                    css: { type: 'string', description: 'Custom CSS for HTML output' },
                },
                required: ['action', 'content'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'markdown_validate',
            description: 'Lint and validate markdown documents.',
            parameters: {
                type: 'object',
                properties: {
                    content: { type: 'string', description: 'Markdown content to validate' },
                    rules: { type: 'object', description: 'Validation rules: {maxLineLength, noTabs}' },
                },
                required: ['content'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'markdown_generate',
            description: 'Generate markdown documents: README, changelog, API docs, tables.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['readme', 'changelog', 'api_docs', 'table'], description: 'Generation action' },
                    name: { type: 'string', description: 'Project name' },
                    description: { type: 'string', description: 'Description' },
                    features: { type: 'array', items: { type: 'string' }, description: 'Feature list' },
                    entries: { type: 'array', description: 'Changelog entries' },
                    endpoints: { type: 'array', description: 'API endpoints' },
                    headers: { type: 'array', items: { type: 'string' }, description: 'Table headers' },
                    rows: { type: 'array', description: 'Table rows' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'markdown_toc',
            description: 'Generate a table of contents from markdown headings.',
            parameters: {
                type: 'object',
                properties: {
                    content: { type: 'string', description: 'Markdown content' },
                    maxDepth: { type: 'number', description: 'Maximum heading depth (default: 4)' },
                    ordered: { type: 'boolean', description: 'Use ordered list' },
                },
                required: ['content'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'markdown_format',
            description: 'Format and beautify markdown documents.',
            parameters: {
                type: 'object',
                properties: {
                    content: { type: 'string', description: 'Markdown content to format' },
                    options: { type: 'object', description: 'Format options: {lineWidth, bulletChar, emphasisChar}' },
                },
                required: ['content'],
            },
        },
    },
    // ── Analytics & Monitoring Tools (5) ──────────────────────────
    {
        type: 'function',
        function: {
            name: 'analytics_track',
            description: 'Track analytics events: event, page_view, batch.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['event', 'page_view', 'batch'], description: 'Tracking action' },
                    eventName: { type: 'string', description: 'Event name' },
                    category: { type: 'string', description: 'Event category' },
                    properties: { type: 'object', description: 'Event properties' },
                    events: { type: 'array', description: 'Batch events array' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'analytics_dashboard',
            description: 'View analytics: overview, event list, funnel analysis.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['overview', 'events', 'funnel'], description: 'Dashboard action' },
                    eventName: { type: 'string', description: 'Filter by event name' },
                    from: { type: 'string', description: 'Start date (ISO string)' },
                    to: { type: 'string', description: 'End date (ISO string)' },
                    steps: { type: 'array', items: { type: 'string' }, description: 'Funnel step event names' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'log_parse',
            description: 'Parse, filter, and analyze log files.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['parse', 'filter', 'stats'], description: 'Parse action' },
                    content: { type: 'string', description: 'Log content to parse' },
                    level: { type: 'string', description: 'Filter by log level' },
                    contains: { type: 'string', description: 'Filter by text content' },
                    regex: { type: 'string', description: 'Filter by regex pattern' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'monitor_health',
            description: 'Health check endpoints: check, create, list, status, delete.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['check', 'create', 'list', 'status', 'delete'], description: 'Health action' },
                    url: { type: 'string', description: 'URL to check' },
                    name: { type: 'string', description: 'Check name' },
                    method: { type: 'string', description: 'HTTP method (default: GET)' },
                    expectedStatus: { type: 'number', description: 'Expected HTTP status code' },
                    id: { type: 'string', description: 'Health check ID (for delete)' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'telemetry_send',
            description: 'Send and query telemetry metrics.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['send', 'batch', 'query'], description: 'Telemetry action' },
                    metric: { type: 'string', description: 'Metric name' },
                    value: { type: 'number', description: 'Metric value' },
                    tags: { type: 'object', description: 'Metric tags' },
                    unit: { type: 'string', description: 'Metric unit' },
                    metrics: { type: 'array', description: 'Batch metrics array' },
                    from: { type: 'string', description: 'Query start date' },
                    to: { type: 'string', description: 'Query end date' },
                },
                required: ['action'],
            },
        },
    },
    // ── Workflow Engine Tools (5) ──────────────────────────────
    {
        type: 'function',
        function: {
            name: 'workflow_create',
            description: 'Create, update, clone, or manage reusable multi-step workflow pipelines with DAG validation.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['create', 'update', 'get', 'list', 'clone', 'delete'], description: 'Workflow action' },
                    name: { type: 'string', description: 'Workflow name' },
                    description: { type: 'string', description: 'Workflow description' },
                    steps: { type: 'array', description: 'Workflow steps [{id, tool, params, dependsOn?, condition?}]' },
                    tags: { type: 'array', description: 'Tags for categorization' },
                    id: { type: 'string', description: 'Workflow ID (get/update/clone/delete)' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'workflow_execute',
            description: 'Execute a workflow pipeline with topological ordering, variable interpolation, and state tracking.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['run', 'status', 'cancel', 'history'], description: 'Execution action' },
                    workflowId: { type: 'string', description: 'Workflow ID to execute' },
                    trigger: { type: 'string', description: 'Trigger source (manual/scheduled/api)' },
                    runId: { type: 'string', description: 'Run ID (status/cancel)' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'workflow_schedule',
            description: 'Schedule workflows with cron expressions. Set, remove, list, pause, resume.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['set', 'remove', 'list', 'pause', 'resume'], description: 'Schedule action' },
                    workflowId: { type: 'string', description: 'Workflow ID' },
                    schedule: { type: 'string', description: 'Cron expression (e.g. "0 9 * * 1-5")' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'workflow_visualize',
            description: 'Generate Mermaid DAG diagrams, execution timelines, and performance stats for workflows.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['dag', 'timeline', 'stats'], description: 'Visualization type' },
                    workflowId: { type: 'string', description: 'Workflow ID' },
                    runId: { type: 'string', description: 'Run ID (for timeline)' },
                },
                required: ['action', 'workflowId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'workflow_optimize',
            description: 'Analyze workflows for parallelization, bottlenecks, duplicates, and cost savings.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['analyze', 'reorder'], description: 'Optimization action' },
                    workflowId: { type: 'string', description: 'Workflow ID' },
                    steps: { type: 'array', description: 'Workflow steps (for reorder without workflowId)' },
                },
                required: ['action'],
            },
        },
    },
    // ── Knowledge Graph Tools (5) ──────────────────────────────
    {
        type: 'function',
        function: {
            name: 'kg_create',
            description: 'Create, update, or delete entities and relations in a persistent knowledge graph.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['entity', 'relation', 'batch', 'delete_entity', 'delete_relation'], description: 'KG create action' },
                    name: { type: 'string', description: 'Entity name' },
                    type: { type: 'string', description: 'Entity type (person, concept, tech, etc.)' },
                    properties: { type: 'object', description: 'Entity/relation properties' },
                    from: { type: 'string', description: 'Source entity ID/name (for relations)' },
                    to: { type: 'string', description: 'Target entity ID/name (for relations)' },
                    relationType: { type: 'string', description: 'Relation type (e.g. uses, knows, depends_on)' },
                    entities: { type: 'array', description: 'Batch entities [{name, type, properties}]' },
                    relations: { type: 'array', description: 'Batch relations [{from, to, type}]' },
                    id: { type: 'string', description: 'Entity or Relation ID (for delete)' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'kg_query',
            description: 'Search, traverse, and query the knowledge graph with BFS shortest path and statistics.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['search', 'get', 'traverse', 'shortest_path', 'neighbors', 'stats'], description: 'Query action' },
                    query: { type: 'string', description: 'Search query' },
                    id: { type: 'string', description: 'Entity ID (get/neighbors)' },
                    name: { type: 'string', description: 'Entity name' },
                    type: { type: 'string', description: 'Filter by entity type' },
                    from: { type: 'string', description: 'Start entity (shortest_path)' },
                    to: { type: 'string', description: 'End entity (shortest_path)' },
                    start: { type: 'string', description: 'Start entity name (traverse)' },
                    depth: { type: 'number', description: 'Traversal depth (default 3)' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'kg_visualize',
            description: 'Generate Mermaid graph diagrams, cluster views, and adjacency matrices.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['graph', 'cluster', 'matrix'], description: 'Visualization type' },
                    type: { type: 'string', description: 'Filter by entity type' },
                    limit: { type: 'number', description: 'Max entities to include' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'kg_merge',
            description: 'Find duplicate entities (Levenshtein similarity), merge them, or auto-merge above threshold.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['find_duplicates', 'merge', 'auto_merge'], description: 'Merge action' },
                    threshold: { type: 'number', description: 'Similarity threshold 0-1 (default 0.8)' },
                    keepId: { type: 'string', description: 'Entity to keep (merge)' },
                    mergeId: { type: 'string', description: 'Entity to merge into keepId' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'kg_reason',
            description: 'Infer new relations, detect patterns, identify hubs, and suggest connections.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['infer', 'find_patterns', 'suggest_connections'], description: 'Reasoning action' },
                    entityId: { type: 'string', description: 'Entity ID (for suggest_connections)' },
                },
                required: ['action'],
            },
        },
    },
    // ── Business & Growth Tools (6) ────────────────────────────
    {
        type: 'function',
        function: {
            name: 'growth_analyze',
            description: 'Analyze growth funnels, cohort retention, churn metrics, and key growth indicators.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['funnel', 'cohort', 'churn', 'metrics'], description: 'Analysis type' },
                    stages: { type: 'array', description: 'Funnel stage names' },
                    days: { type: 'number', description: 'Time range in days (default 30)' },
                    granularity: { type: 'string', enum: ['day', 'week', 'month'], description: 'Cohort grouping' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'pricing_simulate',
            description: 'Model revenue scenarios with pricing strategies, elasticity analysis, and LTV projections.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['model', 'elasticity', 'ltv'], description: 'Pricing action' },
                    plans: { type: 'array', description: 'Pricing plans [{name, price, distribution}]' },
                    totalUsers: { type: 'number', description: 'Total user base' },
                    basePrice: { type: 'number', description: 'Base price (elasticity)' },
                    baseConversions: { type: 'number', description: 'Base conversions count' },
                    elasticity: { type: 'number', description: 'Price elasticity (-2 to 0)' },
                    arpu: { type: 'number', description: 'Average revenue per user (LTV)' },
                    churnRate: { type: 'number', description: 'Monthly churn rate 0-1' },
                    discountRate: { type: 'number', description: 'Annual discount rate (LTV)' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'ab_test_run',
            description: 'Create and manage A/B tests with deterministic variant assignment and conversion tracking.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['create', 'start', 'record', 'assign', 'stop', 'list'], description: 'A/B test action' },
                    id: { type: 'string', description: 'Test ID' },
                    name: { type: 'string', description: 'Test name' },
                    hypothesis: { type: 'string', description: 'Test hypothesis' },
                    metric: { type: 'string', description: 'Primary metric' },
                    variants: { type: 'array', description: 'Variants [{name, weight}]' },
                    variantId: { type: 'string', description: 'Variant ID (record)' },
                    impressions: { type: 'number', description: 'Impressions to record' },
                    converted: { type: 'boolean', description: 'Whether conversion occurred' },
                    visitorId: { type: 'string', description: 'Visitor ID for assignment' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'ab_test_analyze',
            description: 'Analyze A/B test results with Z-test significance, confidence intervals, sample size.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['results', 'power'], description: 'Analysis action' },
                    id: { type: 'string', description: 'Test ID (results)' },
                    baselineRate: { type: 'number', description: 'Baseline conversion rate (power)' },
                    minimumDetectableEffect: { type: 'number', description: 'Minimum detectable effect' },
                    alpha: { type: 'number', description: 'Significance level (default 0.05)' },
                    power: { type: 'number', description: 'Statistical power (default 0.8)' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'lead_enrich',
            description: 'Enrich leads with DNS/MX checks, website analysis, and lead scoring.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['enrich', 'score', 'batch'], description: 'Enrichment action' },
                    email: { type: 'string', description: 'Email to enrich' },
                    domain: { type: 'string', description: 'Domain to analyze' },
                    company: { type: 'string', description: 'Company name' },
                    leads: { type: 'array', description: 'Batch leads [{email, domain}]' },
                    lead: { type: 'object', description: 'Lead object for scoring' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'campaign_generate',
            description: 'Generate marketing campaigns (email, ad, social, SMS, push) with tone variants and ROI.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['create', 'generate_variants', 'list', 'update', 'metrics'], description: 'Campaign action' },
                    type: { type: 'string', enum: ['email', 'ad', 'social', 'sms', 'push'], description: 'Campaign type' },
                    name: { type: 'string', description: 'Campaign name' },
                    product: { type: 'string', description: 'Product name' },
                    audience: { type: 'object', description: 'Target audience details' },
                    tone: { type: 'string', description: 'Tone (professional, casual, urgent, playful)' },
                    budget: { type: 'number', description: 'Campaign budget' },
                    id: { type: 'string', description: 'Campaign ID' },
                    metrics: { type: 'object', description: 'Campaign metrics to update' },
                },
                required: ['action'],
            },
        },
    },
    // ── Collaboration Tools (5) ───────────────────────────────
    {
        type: 'function',
        function: {
            name: 'team_invite',
            description: 'Invite team members, accept invitations, remove members, and list teams.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['invite', 'accept', 'remove', 'list', 'teams'], description: 'Team action' },
                    teamId: { type: 'string', description: 'Team ID' },
                    inviteeId: { type: 'string', description: 'User ID to invite' },
                    role: { type: 'string', enum: ['owner', 'admin', 'member', 'viewer'], description: 'Role' },
                    memberId: { type: 'string', description: 'Team member record ID' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'role_assign',
            description: 'Assign roles with hierarchical permissions, check access, and manage RBAC.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['assign', 'permissions', 'check', 'roles'], description: 'Role action' },
                    memberId: { type: 'string', description: 'Team member ID' },
                    role: { type: 'string', description: 'Role to assign' },
                    permissions: { type: 'object', description: 'Custom permissions' },
                    permission: { type: 'string', description: 'Permission to check' },
                    teamId: { type: 'string', description: 'Team ID' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'comment_thread',
            description: 'Create discussion threads, reply, resolve/reopen, and add emoji reactions.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['create', 'reply', 'list', 'resolve', 'reopen', 'react'], description: 'Comment action' },
                    threadId: { type: 'string', description: 'Thread ID' },
                    targetType: { type: 'string', description: 'Target type (file, task, deployment)' },
                    targetId: { type: 'string', description: 'Target ID' },
                    content: { type: 'string', description: 'Comment content' },
                    parentId: { type: 'string', description: 'Parent comment ID (nesting)' },
                    commentId: { type: 'string', description: 'Comment ID (for react)' },
                    emoji: { type: 'string', description: 'Emoji reaction' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'task_assign',
            description: 'Create tasks with priority, labels, due dates, dependencies. Kanban board view.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['create', 'update', 'assign', 'list', 'board', 'delete'], description: 'Task action' },
                    id: { type: 'string', description: 'Task ID' },
                    title: { type: 'string', description: 'Task title' },
                    description: { type: 'string', description: 'Task description' },
                    status: { type: 'string', enum: ['backlog', 'todo', 'in_progress', 'review', 'done'], description: 'Task status' },
                    priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'], description: 'Priority' },
                    assigneeId: { type: 'string', description: 'Assignee user ID' },
                    teamId: { type: 'string', description: 'Team ID' },
                    labels: { type: 'array', description: 'Task labels' },
                    dueDate: { type: 'string', description: 'Due date ISO string' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'approval_flow',
            description: 'Create multi-step approval workflows with required/optional approvers and decisions.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['create', 'decide', 'status', 'list', 'cancel'], description: 'Approval action' },
                    requestId: { type: 'string', description: 'Approval request ID' },
                    title: { type: 'string', description: 'Approval title' },
                    description: { type: 'string', description: 'Approval description' },
                    type: { type: 'string', description: 'Approval type (deploy, access, change, budget)' },
                    approvers: { type: 'array', description: 'Approvers [{userId, required}]' },
                    deadline: { type: 'string', description: 'Deadline ISO string' },
                    decision: { type: 'string', enum: ['approve', 'reject'], description: 'Decision' },
                    comment: { type: 'string', description: 'Decision comment' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'activity_log',
            description: 'Log, query, and get stats on project/user activity events (file changes, tool usage, deploys, etc.).',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['log', 'query', 'stats'], description: 'Activity log action' },
                    userId: { type: 'string', description: 'User ID' },
                    projectId: { type: 'string', description: 'Project ID' },
                    event: { type: 'string', description: 'Event type (e.g. file_created, tool_used, deploy_started)' },
                    details: { type: 'object', description: 'Event details object' },
                    metadata: { type: 'object', description: 'Additional metadata' },
                    source: { type: 'string', description: 'Event source (agent, user, system)' },
                    since: { type: 'string', description: 'ISO date to filter from' },
                    limit: { type: 'number', description: 'Max results to return' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'access_audit',
            description: 'Audit resource access: log access events, query audit trail, generate access reports.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['log', 'query', 'report'], description: 'Audit action' },
                    userId: { type: 'string', description: 'User ID' },
                    resource: { type: 'string', description: 'Resource type (project, file, api_key, etc.)' },
                    resourceId: { type: 'string', description: 'Specific resource ID' },
                    accessType: { type: 'string', enum: ['read', 'write', 'delete', 'execute', 'admin'], description: 'Access type' },
                    outcome: { type: 'string', enum: ['allowed', 'denied'], description: 'Access outcome' },
                    reason: { type: 'string', description: 'Reason for access or denial' },
                    since: { type: 'string', description: 'ISO date to filter from' },
                    limit: { type: 'number', description: 'Max results to return' },
                },
                required: ['action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'notify_team',
            description: 'Send team notifications, list recent notifications, and mark as read.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['send', 'list', 'mark_read'], description: 'Notification action' },
                    userId: { type: 'string', description: 'User/sender ID' },
                    projectId: { type: 'string', description: 'Project ID' },
                    message: { type: 'string', description: 'Notification message' },
                    channel: { type: 'string', description: 'Channel (general, alerts, updates)' },
                    priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'], description: 'Priority level' },
                    type: { type: 'string', enum: ['info', 'warning', 'error', 'success'], description: 'Notification type' },
                    recipients: { type: 'array', description: 'Array of recipient user IDs' },
                    notificationId: { type: 'string', description: 'Notification ID (for mark_read)' },
                    since: { type: 'string', description: 'ISO date to filter from' },
                    limit: { type: 'number', description: 'Max results to return' },
                },
                required: ['action'],
            },
        },
    },
];

const STUDIO_CORE_TOOLS_ANTHROPIC = STUDIO_CORE_TOOLS_OPENAI.map(t => ({
    name: t.function.name,
    description: t.function.description,
    input_schema: t.function.parameters,
}));

// ============================================================================
// HELPER: Execute a studio tool call
// ============================================================================
async function executeStudioTool(toolName, args, userId) {
    switch (toolName) {
        case 'web_search':
            return agentToolsService.executeTool('web_search', { query: args.query, num_results: args.num_results || 5 });
        case 'fetch_url':
            return agentToolsService.executeTool('fetch_url', { url: args.url });
        case 'execute_code':
            return agentToolsService.executeTool('run_code', { code: args.code, language: args.language || 'javascript', userId });
        case 'calculate':
            return agentToolsService.executeTool('calculate', { expression: args.expression });
        case 'get_current_time':
            return agentToolsService.executeTool('get_current_time', { timezone: args.timezone || 'UTC' });
        case 'get_weather':
            return coreToolsV2.getWeather({ location: args.location, units: args.units || 'metric' });
        case 'generate_video':
            return agentToolsService.executeTool('generate_video', { prompt: args.prompt, duration: args.duration || 5, userId });
        case 'parse_pdf':
            return agentToolsService.executeTool('parse_pdf', { file: args.file, path: args.file, userId });
        case 'parse_docx':
            return agentToolsService.executeTool('parse_docx', { file: args.file, path: args.file, userId });
        case 'parse_csv':
            return agentToolsService.executeTool('parse_csv', { file: args.file, path: args.file, limit: args.limit || 100, userId });
        case 'parse_json':
            return agentToolsService.executeTool('parse_json', { action: args.action, content: args.content, schema: args.schema, path: args.path, userId });
        case 'parse_markdown':
            return agentToolsService.executeTool('parse_markdown', { content: args.content, file: args.content, userId });
        case 'parse_html':
            return agentToolsService.executeTool('parse_html', { action: args.action, content: args.content, selector: args.selector, userId });
        case 'transcribe_audio':
            return agentToolsService.executeTool('transcribe_audio', { path: args.file, file: args.file, language: args.language || 'en', userId });
        // ── IMAGE TOOLS ──
        case 'generate_image':
            return agentToolsService.executeTool('generate_image', { prompt: args.prompt, style: args.style || 'realistic', width: args.width || 1024, height: args.height || 1024, userId });
        case 'image_create':
            return agentToolsService.executeTool('image_create', { ...args, userId });
        case 'image_transform':
            return agentToolsService.executeTool('image_transform', { ...args, userId });
        case 'image_convert':
            return agentToolsService.executeTool('image_convert', { ...args, userId });
        case 'image_compose':
            return agentToolsService.executeTool('image_compose', { ...args, userId });
        case 'image_filter':
            return agentToolsService.executeTool('image_filter', { ...args, userId });
        case 'image_analyze':
            return agentToolsService.executeTool('image_analyze', { ...args, userId });
        case 'image_batch':
            return agentToolsService.executeTool('image_batch', { ...args, userId });
        case 'image_background':
            return agentToolsService.executeTool('image_background', { ...args, userId });
        case 'image_face':
            return agentToolsService.executeTool('image_face', { ...args, userId });
        case 'image_ai':
            return agentToolsService.executeTool('image_ai', { ...args, userId });
        case 'image_export':
            return agentToolsService.executeTool('image_export', { ...args, userId });
        case 'image_ocr':
            return agentToolsService.executeTool('image_ocr', { ...args, userId });
        // ── VIDEO TOOLS ──
        case 'video_transform':
            return agentToolsService.executeTool('video_transform', { ...args, userId });
        case 'video_convert':
            return agentToolsService.executeTool('video_convert', { ...args, userId });
        case 'video_analyze':
            return agentToolsService.executeTool('video_analyze', { ...args, userId });
        case 'video_overlay':
            return agentToolsService.executeTool('video_overlay', { ...args, userId });
        case 'video_filter':
            return agentToolsService.executeTool('video_filter', { ...args, userId });
        case 'video_audio':
            return agentToolsService.executeTool('video_audio', { ...args, userId });
        case 'video_ai':
            return agentToolsService.executeTool('video_ai', { ...args, userId });
        case 'video_batch':
            return agentToolsService.executeTool('video_batch', { ...args, userId });
        // ── ARCHIVE TOOLS ──
        case 'archive_core':
            return agentToolsService.executeTool('archive_core', { ...args, userId });
        case 'archive_edit':
            return agentToolsService.executeTool('archive_edit', { ...args, userId });
        case 'archive_structure':
            return agentToolsService.executeTool('archive_structure', { ...args, userId });
        case 'archive_security':
            return agentToolsService.executeTool('archive_security', { ...args, userId });
        case 'archive_bulk':
            return agentToolsService.executeTool('archive_bulk', { ...args, userId });
        case 'archive_convert':
            return agentToolsService.executeTool('archive_convert', { ...args, userId });
        case 'archive_intelligence':
            return agentToolsService.executeTool('archive_intelligence', { ...args, userId });
        case 'archive_deploy':
            return agentToolsService.executeTool('archive_deploy', { ...args, userId });
        case 'dev_filesystem':
            return agentToolsService.executeTool('dev_filesystem', { ...args, userId });
        case 'dev_search':
            return agentToolsService.executeTool('dev_search', { ...args, userId });
        case 'dev_intelligence':
            return agentToolsService.executeTool('dev_intelligence', { ...args, userId });
        case 'dev_debug':
            return agentToolsService.executeTool('dev_debug', { ...args, userId });
        case 'dev_test':
            return agentToolsService.executeTool('dev_test', { ...args, userId });
        case 'dev_git':
            return agentToolsService.executeTool('dev_git', { ...args, userId });
        case 'dev_npm':
            return agentToolsService.executeTool('dev_npm', { ...args, userId });
        case 'dev_docker':
            return agentToolsService.executeTool('dev_docker', { ...args, userId });
        case 'web_analyze':
            return agentToolsService.executeTool('web_analyze', { ...args, userId });
        case 'web_scaffold':
            return agentToolsService.executeTool('web_scaffold', { ...args, userId });
        case 'web_optimize':
            return agentToolsService.executeTool('web_optimize', { ...args, userId });
        case 'web_transform':
            return agentToolsService.executeTool('web_transform', { ...args, userId });
        case 'web_screenshot':
            return agentToolsService.executeTool('web_screenshot', { ...args, userId });
        case 'web_lighthouse':
            return agentToolsService.executeTool('web_lighthouse', { ...args, userId });
        case 'web_scrape':
            return agentToolsService.executeTool('web_scrape', { ...args, userId });
        case 'db_query':
            return agentToolsService.executeTool('db_query', { ...args, userId });
        case 'db_schema':
            return agentToolsService.executeTool('db_schema', { ...args, userId });
        case 'db_backup':
            return agentToolsService.executeTool('db_backup', { ...args, userId });
        case 'db_migrate':
            return agentToolsService.executeTool('db_migrate', { ...args, userId });
        case 'db_analyze':
            return agentToolsService.executeTool('db_analyze', { ...args, userId });
        case 'db_connect':
            return agentToolsService.executeTool('db_connect', { ...args, userId });
        case 'api_request':
            return agentToolsService.executeTool('api_request', { ...args, userId });
        case 'api_mock':
            return agentToolsService.executeTool('api_mock', { ...args, userId });
        case 'api_document':
            return agentToolsService.executeTool('api_document', { ...args, userId });
        case 'api_test':
            return agentToolsService.executeTool('api_test', { ...args, userId });
        case 'api_transform':
            return agentToolsService.executeTool('api_transform', { ...args, userId });
        case 'webhook_listen':
            return agentToolsService.executeTool('webhook_listen', { ...args, userId });
        case 'sdk_generate':
            return agentToolsService.executeTool('sdk_generate', { ...args, userId });
        case 'llm_chat':
            return agentToolsService.executeTool('llm_chat', { ...args, userId });
        case 'llm_embed':
            return agentToolsService.executeTool('llm_embed', { ...args, userId });
        case 'llm_finetune':
            return agentToolsService.executeTool('llm_finetune', { ...args, userId });
        case 'ml_train':
            return agentToolsService.executeTool('ml_train', { ...args, userId });
        case 'ml_predict':
            return agentToolsService.executeTool('ml_predict', { ...args, userId });
        case 'llm_router':
            return agentToolsService.executeTool('llm_router', { ...args, userId });
        case 'llm_cost_optimize':
            return agentToolsService.executeTool('llm_cost_optimize', { ...args, userId });
        case 'llm_guardrail':
            return agentToolsService.executeTool('llm_guardrail', { ...args, userId });
        case 'llm_evaluate':
            return agentToolsService.executeTool('llm_evaluate', { ...args, userId });
        case 'data_profile':
            return agentToolsService.executeTool('data_profile', { ...args, userId });
        case 'data_clean':
            return agentToolsService.executeTool('data_clean', { ...args, userId });
        case 'data_visualize':
            return agentToolsService.executeTool('data_visualize', { ...args, userId });
        case 'feature_engineer':
            return agentToolsService.executeTool('feature_engineer', { ...args, userId });
        case 'model_compare':
            return agentToolsService.executeTool('model_compare', { ...args, userId });
        case 'data_sample':
            return agentToolsService.executeTool('data_sample', { ...args, userId });
        case 'outlier_detect':
            return agentToolsService.executeTool('outlier_detect', { ...args, userId });
        case 'data_correlate':
            return agentToolsService.executeTool('data_correlate', { ...args, userId });
        case 'geo_geocode':
            return agentToolsService.executeTool('geo_geocode', { ...args, userId });
        case 'geo_route':
            return agentToolsService.executeTool('geo_route', { ...args, userId });
        case 'geo_distance':
            return agentToolsService.executeTool('geo_distance', { ...args, userId });
        case 'geo_fence':
            return agentToolsService.executeTool('geo_fence', { ...args, userId });
        case 'geo_timezone':
            return agentToolsService.executeTool('geo_timezone', { ...args, userId });
        case 'geo_ip_locate':
            return agentToolsService.executeTool('geo_ip_locate', { ...args, userId });
        case 'geo_poi':
            return agentToolsService.executeTool('geo_poi', { ...args, userId });
        case 'geo_address_validate':
            return agentToolsService.executeTool('geo_address_validate', { ...args, userId });
        case 'cloud_deploy':
            return agentToolsService.executeTool('cloud_deploy', { ...args, userId });
        case 'cloud_scale':
            return agentToolsService.executeTool('cloud_scale', { ...args, userId });
        case 'cloud_logs':
            return agentToolsService.executeTool('cloud_logs', { ...args, userId });
        case 'cloud_secrets':
            return agentToolsService.executeTool('cloud_secrets', { ...args, userId });
        case 'cloud_cost':
            return agentToolsService.executeTool('cloud_cost', { ...args, userId });
        case 'cloud_domain':
            return agentToolsService.executeTool('cloud_domain', { ...args, userId });
        case 'cloud_backup':
            return agentToolsService.executeTool('cloud_backup', { ...args, userId });
        case 'cloud_monitor':
            return agentToolsService.executeTool('cloud_monitor', { ...args, userId });
        case 'cloud_network':
            return agentToolsService.executeTool('cloud_network', { ...args, userId });
        case 'crypto_hash':
            return agentToolsService.executeTool('crypto_hash', { ...args, userId });
        case 'crypto_encrypt':
            return agentToolsService.executeTool('crypto_encrypt', { ...args, userId });
        case 'crypto_sign':
            return agentToolsService.executeTool('crypto_sign', { ...args, userId });
        case 'scan_secrets':
            return agentToolsService.executeTool('scan_secrets', { ...args, userId });
        case 'scan_malware':
            return agentToolsService.executeTool('scan_malware', { ...args, userId });
        case 'auth_generate':
            return agentToolsService.executeTool('auth_generate', { ...args, userId });
        case 'scan_vulnerabilities':
            return agentToolsService.executeTool('scan_vulnerabilities', { ...args, userId });
        case 'policy_enforce':
            return agentToolsService.executeTool('policy_enforce', { ...args, userId });
        case 'threat_model':
            return agentToolsService.executeTool('threat_model', { ...args, userId });
        case 'incident_response':
            return agentToolsService.executeTool('incident_response', { ...args, userId });
        case 'security_audit':
            return agentToolsService.executeTool('security_audit', { ...args, userId });
        case 'security_compliance':
            return agentToolsService.executeTool('security_compliance', { ...args, userId });
        case 'security_pentest':
            return agentToolsService.executeTool('security_pentest', { ...args, userId });
        case 'security_rbac':
            return agentToolsService.executeTool('security_rbac', { ...args, userId });
        case 'security_firewall':
            return agentToolsService.executeTool('security_firewall', { ...args, userId });
        case 'security_forensics':
            return agentToolsService.executeTool('security_forensics', { ...args, userId });
        case 'agent_memory':
            return agentToolsService.executeTool('agent_memory', { ...args, userId });
        case 'agent_safety':
            return agentToolsService.executeTool('agent_safety', { ...args, userId });
        case 'agent_ui':
            return agentToolsService.executeTool('agent_ui', { ...args, userId });
        case 'agent_control':
            return agentToolsService.executeTool('agent_control', { ...args, userId });
        case 'editor_select':
            return agentToolsService.executeTool('editor_select', { ...args, userId });
        case 'agent_spawn':
            return agentToolsService.executeTool('agent_spawn', { ...args, userId });
        case 'agent_delegate':
            return agentToolsService.executeTool('agent_delegate', { ...args, userId });
        case 'agent_reflect':
            return agentToolsService.executeTool('agent_reflect', { ...args, userId });
        case 'prompt_template':
            return agentToolsService.executeTool('prompt_template', { ...args, userId });
        case 'llm_fallback':
            return agentToolsService.executeTool('llm_fallback', { ...args, userId });
        case 'agent_memory_search':
            return agentToolsService.executeTool('agent_memory_search', { ...args, userId });
        // ── File Management Tools (17) ────────────────────────────────
        case 'create_file':
            return agentToolsService.executeTool('create_file', { filename: args.filename, content: args.content, folder: args.folder, userId });
        case 'read_file':
            return agentToolsService.executeTool('read_file', { filename: args.filename, userId });
        case 'modify_file':
            return agentToolsService.executeTool('modify_file', { filename: args.filename, content: args.content, mode: args.mode || 'replace', userId });
        case 'write_file':
            return agentToolsService.executeTool('write_file', { ...args, userId });
        case 'list_files':
            return agentToolsService.executeTool('list_files', { folder: args.folder, userId });
        case 'delete_file':
            return agentToolsService.executeTool('delete_file', { filename: args.filename, userId });
        case 'move_file':
            return agentToolsService.executeTool('move_file', { source: args.source, destination: args.destination, userId });
        case 'copy_file':
            return agentToolsService.executeTool('copy_file', { source: args.source, destination: args.destination, userId });
        case 'rename_file':
            return agentToolsService.executeTool('rename_file', { old_name: args.old_name, new_name: args.new_name, userId });
        case 'create_folder':
            return agentToolsService.executeTool('create_folder', { path: args.folder_path, userId });
        case 'list_folders':
            return agentToolsService.executeTool('list_folders', { folder: args.folder, userId });
        case 'zip_files':
            return agentToolsService.executeTool('zip_files', { files: args.files, output: args.output_name || 'archive.zip', userId });
        case 'unzip_files':
            return agentToolsService.executeTool('unzip_files', { file: args.zip_file, destination: args.destination, userId });
        case 'file_exists':
            return agentToolsService.executeTool('file_exists', { ...args, userId });
        case 'get_project_tree':
            return agentToolsService.executeTool('get_project_tree', { ...args, userId });
        case 'file_watch':
            return agentToolsService.executeTool('file_watch', { ...args, userId });
        case 'sync_files':
            return agentToolsService.executeTool('sync_files', { ...args, userId });
        // ── Markdown/Content Tools (5) ────────────────────────────────
        case 'markdown_convert':
            return agentToolsService.executeTool('markdown_convert', { ...args, userId });
        case 'markdown_validate':
            return agentToolsService.executeTool('markdown_validate', { ...args, userId });
        case 'markdown_generate':
            return agentToolsService.executeTool('markdown_generate', { ...args, userId });
        case 'markdown_toc':
            return agentToolsService.executeTool('markdown_toc', { ...args, userId });
        case 'markdown_format':
            return agentToolsService.executeTool('markdown_format', { ...args, userId });
        // ── Analytics & Monitoring Tools (5) ──────────────────────────
        case 'analytics_track':
            return agentToolsService.executeTool('analytics_track', { ...args, userId });
        case 'analytics_dashboard':
            return agentToolsService.executeTool('analytics_dashboard', { ...args, userId });
        case 'log_parse':
            return agentToolsService.executeTool('log_parse', { ...args, userId });
        case 'monitor_health':
            return agentToolsService.executeTool('monitor_health', { ...args, userId });
        case 'telemetry_send':
            return agentToolsService.executeTool('telemetry_send', { ...args, userId });
        // ── Workflow Engine Tools (5) ──────────────────────────────
        case 'workflow_create':
            return agentToolsService.executeTool('workflow_create', { ...args, userId });
        case 'workflow_execute':
            return agentToolsService.executeTool('workflow_execute', { ...args, userId });
        case 'workflow_schedule':
            return agentToolsService.executeTool('workflow_schedule', { ...args, userId });
        case 'workflow_visualize':
            return agentToolsService.executeTool('workflow_visualize', { ...args, userId });
        case 'workflow_optimize':
            return agentToolsService.executeTool('workflow_optimize', { ...args, userId });
        // ── Knowledge Graph Tools (5) ──────────────────────────────
        case 'kg_create':
            return agentToolsService.executeTool('kg_create', { ...args, userId });
        case 'kg_query':
            return agentToolsService.executeTool('kg_query', { ...args, userId });
        case 'kg_visualize':
            return agentToolsService.executeTool('kg_visualize', { ...args, userId });
        case 'kg_merge':
            return agentToolsService.executeTool('kg_merge', { ...args, userId });
        case 'kg_reason':
            return agentToolsService.executeTool('kg_reason', { ...args, userId });
        // ── Business & Growth Tools (6) ────────────────────────────
        case 'growth_analyze':
            return agentToolsService.executeTool('growth_analyze', { ...args, userId });
        case 'pricing_simulate':
            return agentToolsService.executeTool('pricing_simulate', { ...args, userId });
        case 'ab_test_run':
            return agentToolsService.executeTool('ab_test_run', { ...args, userId });
        case 'ab_test_analyze':
            return agentToolsService.executeTool('ab_test_analyze', { ...args, userId });
        case 'lead_enrich':
            return agentToolsService.executeTool('lead_enrich', { ...args, userId });
        case 'campaign_generate':
            return agentToolsService.executeTool('campaign_generate', { ...args, userId });
        // ── Collaboration Tools (5) ───────────────────────────────
        case 'team_invite':
            return agentToolsService.executeTool('team_invite', { ...args, userId });
        case 'role_assign':
            return agentToolsService.executeTool('role_assign', { ...args, userId });
        case 'comment_thread':
            return agentToolsService.executeTool('comment_thread', { ...args, userId });
        case 'task_assign':
            return agentToolsService.executeTool('task_assign', { ...args, userId });
        case 'approval_flow':
            return agentToolsService.executeTool('approval_flow', { ...args, userId });
        case 'activity_log':
            return agentToolsService.executeTool('activity_log', { ...args, userId });
        case 'access_audit':
            return agentToolsService.executeTool('access_audit', { ...args, userId });
        case 'notify_team':
            return agentToolsService.executeTool('notify_team', { ...args, userId });
        default:
            return { success: false, error: `Unknown tool: ${toolName}` };
    }
}

// ============================================================================
// HELPER: Call OpenAI with tool calling — DISABLED in demo mode (no OpenAI key)
// ============================================================================
async function studioCallOpenAIWithTools(model, systemPrompt, messages) {
    throw new Error('Tool calling is disabled in demo mode (no OpenAI/Anthropic)');
}

// ============================================================================
// HELPER: Call Anthropic with tool calling — DISABLED in demo mode (no Anthropic key)
// ============================================================================
async function studioCallAnthropicWithTools(model, systemPrompt, messages) {
    throw new Error('Tool calling is disabled in demo mode (no OpenAI/Anthropic)');
}

// ============================================================================
// HELPER: Run tool-calling loop for OpenAI/Anthropic (streaming output)
// Returns final response text after executing any tool calls
// ============================================================================
async function runToolCallingLoop(res, provider, model, systemPrompt, chatMessages, userId, agentId, activeTool) {
    const MAX_ROUNDS = 3;
    let roundMessages = [...chatMessages];
    let finalText = '';

    for (let round = 0; round < MAX_ROUNDS; round++) {
        let response;
        if (provider === 'anthropic') {
            response = await studioCallAnthropicWithTools(model, systemPrompt, roundMessages);
        } else {
            response = await studioCallOpenAIWithTools(model, systemPrompt, roundMessages);
        }

        const { text, toolCalls } = response;

        // If no tool calls, stream the final text and stop
        if (toolCalls.length === 0) {
            finalText = text;
            // Stream the text token by token (simulated from non-streaming response)
            if (text) {
                // Send in chunks for fast display
                const chunkSize = 20;
                for (let i = 0; i < text.length; i += chunkSize) {
                    const chunk = text.slice(i, i + chunkSize);
                    res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
                }
            }
            break;
        }

        console.log(`[Studio/ToolCall] Round ${round + 1}: ${toolCalls.length} tool(s): ${toolCalls.map(tc => tc.name).join(', ')}`);

        // Stream intermediate text if any
        if (text) {
            const chunkSize = 20;
            for (let i = 0; i < text.length; i += chunkSize) {
                res.write(`data: ${JSON.stringify({ content: text.slice(i, i + chunkSize) })}\n\n`);
            }
        }

        // Execute each tool call
        const roundResults = [];
        for (const tc of toolCalls) {
            // Show tool activity to user
            const toolLabel = { web_search: '🔍', fetch_url: '🌐', execute_code: '⚡', calculate: '🧮', get_current_time: '🕐', get_weather: '🌤️', generate_video: '🎬' };
            res.write(`data: ${JSON.stringify({ content: `\n\n${toolLabel[tc.name] || '🔧'} *Using ${tc.name}...*\n\n` })}\n\n`);

            let result;
            try {
                result = await executeStudioTool(tc.name, tc.arguments, userId);
            } catch (toolError) {
                console.error(`[Studio/ToolCall] Error: ${tc.name}:`, toolError.message);
                result = { success: false, error: toolError.message };
            }

            roundResults.push({ toolCallId: tc.id, name: tc.name, arguments: tc.arguments, result });
        }

        // Re-inject tool results for next round
        if (provider === 'anthropic') {
            roundMessages.push({ role: 'assistant', content: response.rawContent });
            roundMessages.push({
                role: 'user',
                content: roundResults.map(r => ({
                    type: 'tool_result',
                    tool_use_id: r.toolCallId,
                    content: JSON.stringify(r.result),
                })),
            });
        } else {
            roundMessages.push({
                role: 'assistant',
                content: text || null,
                tool_calls: toolCalls.map(tc => ({
                    id: tc.id, type: 'function',
                    function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
                })),
            });
            for (const r of roundResults) {
                roundMessages.push({
                    role: 'tool',
                    tool_call_id: r.toolCallId,
                    content: JSON.stringify(r.result),
                });
            }
        }

        if (round === MAX_ROUNDS - 1) {
            finalText = text || 'I completed the task.';
        }
    }

    return finalText;
}

// ============================================================================
// HELPER: Perform web search and format results
// ============================================================================
async function performWebSearch(query, numResults = 5) {
    try {
        const result = await agentToolsService.executeTool('web_search', { query, num_results: numResults });
        if (result.success && result.results && result.results.length > 0) {
            return result.results.map((r, i) =>
                `[${i + 1}] ${r.title}\n${r.snippet}\nSource: ${r.url}`
            ).join('\n\n');
        }
        return null;
    } catch (error) {
        console.error('[WebSearch] Error:', error.message);
        return null;
    }
}

// ============================================================================
// HELPER: Build messages with mode context
// ============================================================================
async function buildMessagesForMode(message, conversationHistory, systemPrompt, activeTool, projectFiles) {
    const messages = [];
    // STRICT_AGENT_PROMPTS is the single source — systemPrompt is already fully resolved at the call site
    let enhancedSystemPrompt = systemPrompt;
    let modeContext = '';

    switch (activeTool) {
        case 'web_search': {
            // Single web search
            console.log('[Mode:WebSearch] Searching for:', message);
            const searchResults = await performWebSearch(message, 5);
            if (searchResults) {
                modeContext = `\n\n--- WEB SEARCH RESULTS ---\n${searchResults}\n--- END SEARCH RESULTS ---\n`;
            } else {
                modeContext = '\n\n[Web search returned no results. Answer from your knowledge.]\n';
            }
            enhancedSystemPrompt = MODE_SYSTEM_PROMPTS.web_search + '\n\n' + enhancedSystemPrompt;
            break;
        }

        case 'deep_research': {
            // Multiple searches for thorough research
            console.log('[Mode:DeepResearch] Starting research for:', message);
            const queries = [
                message,
                `${message} latest research findings`,
                `${message} expert analysis`,
            ];
            const allResults = [];
            for (const q of queries) {
                const results = await performWebSearch(q, 5);
                if (results) allResults.push(`### Search: "${q}"\n${results}`);
            }
            if (allResults.length > 0) {
                modeContext = `\n\n--- DEEP RESEARCH DATA ---\n${allResults.join('\n\n')}\n--- END RESEARCH DATA ---\n`;
            } else {
                modeContext = '\n\n[Research searches returned no results. Provide analysis from your knowledge.]\n';
            }
            enhancedSystemPrompt = MODE_SYSTEM_PROMPTS.deep_research + '\n\n' + enhancedSystemPrompt;
            break;
        }

        case 'thinking': {
            enhancedSystemPrompt = MODE_SYSTEM_PROMPTS.thinking + '\n\n' + enhancedSystemPrompt;
            break;
        }

        default:
            // Normal chat - no mode enhancement
            break;
    }

    // Build messages array
    messages.push({ role: 'system', content: enhancedSystemPrompt });

    // Add project files context if present
    if (projectFiles && Object.keys(projectFiles).length > 0) {
        const filesSummary = Object.entries(projectFiles)
            .map(([path, content]) => `--- ${path} ---\n${typeof content === 'string' ? content.substring(0, 2000) : ''}`)
            .join('\n\n');
        messages.push({ role: 'system', content: `Project files context:\n${filesSummary}` });
    }

    // Add conversation history
    if (conversationHistory && conversationHistory.length > 0) {
        for (const msg of conversationHistory) {
            messages.push({ role: msg.role, content: msg.content });
        }
    }

    // Add the current message with mode context
    messages.push({ role: 'user', content: modeContext ? `${message}\n${modeContext}` : message });

    return messages;
}

// ============================================================================
// HELPER: Stream from OpenAI-compatible API (OpenAI, Groq, Cerebras, XAI, Mistral)
// ============================================================================
async function streamOpenAICompatible(res, config, model, messages, temperature, maxTokens) {
    const response = await fetch(`${config.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
            model,
            messages,
            temperature: temperature ?? 0.7,
            max_tokens: maxTokens || 4096,
            stream: true,
        }),
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error(`[Stream] Provider error ${response.status}:`, errText);
        throw new Error(`Provider error: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            const data = trimmed.slice(6);
            if (data === '[DONE]') {
                res.write('data: [DONE]\n\n');
                return;
            }
            try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                    res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
                }
            } catch { /* skip unparseable */ }
        }
    }
    res.write('data: [DONE]\n\n');
}

// ============================================================================
// HELPER: Stream from Anthropic API
// ============================================================================
async function streamAnthropic(res, model, messages, temperature, maxTokens) {
    const config = PROVIDER_CONFIGS.anthropic;
    if (!config.apiKey) throw new Error('Anthropic not configured');

    // Extract system message and user/assistant messages
    const systemMsg = messages.find(m => m.role === 'system')?.content || 'You are a helpful AI assistant.';
    const chatMessages = messages.filter(m => m.role !== 'system');

    const response = await fetch(`${config.baseURL}/messages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': config.apiKey,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: model || config.defaultModel,
            system: systemMsg,
            messages: chatMessages,
            temperature: temperature ?? 0.7,
            max_tokens: maxTokens || 4096,
            stream: true,
        }),
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error(`[Stream:Anthropic] Error ${response.status}:`, errText);
        throw new Error(`Anthropic error: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            const data = trimmed.slice(6);
            try {
                const parsed = JSON.parse(data);
                if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                    res.write(`data: ${JSON.stringify({ content: parsed.delta.text })}\n\n`);
                }
                if (parsed.type === 'message_stop') {
                    res.write('data: [DONE]\n\n');
                    return;
                }
            } catch { /* skip */ }
        }
    }
    res.write('data: [DONE]\n\n');
}

// ============================================================================
// HELPER: Stream from Gemini API
// ============================================================================
async function streamGemini(res, model, messages, temperature, maxTokens) {
    const config = PROVIDER_CONFIGS.gemini;
    if (!config.apiKey) throw new Error('Gemini not configured');

    const geminiModel = model || config.defaultModel;

    // Convert messages to Gemini format
    const systemInstruction = messages.find(m => m.role === 'system')?.content || '';
    const contents = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
        }));

    const response = await fetch(
        `${config.baseURL}/models/${geminiModel}:streamGenerateContent?alt=sse&key=${config.apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents,
                systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
                generationConfig: {
                    temperature: temperature ?? 0.7,
                    maxOutputTokens: maxTokens || 4096,
                },
            }),
        }
    );

    if (!response.ok) {
        const errText = await response.text();
        console.error(`[Stream:Gemini] Error ${response.status}:`, errText);
        throw new Error(`Gemini error: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            const data = trimmed.slice(6);
            try {
                const parsed = JSON.parse(data);
                const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                    res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
                }
            } catch { /* skip */ }
        }
    }
    res.write('data: [DONE]\n\n');
}

// ============================================================================
// HELPER: Handle image generation mode
// ============================================================================
async function handleImageGeneration(res, message) {
    try {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('Image generation requires OpenAI API key');
        }

        res.write(`data: ${JSON.stringify({ content: '🎨 **Generating image...**\n\n' })}\n\n`);

        const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'dall-e-3',
                prompt: message,
                n: 1,
                size: '1024x1024',
                quality: 'standard',
            }),
        });

        if (!imageResponse.ok) {
            const err = await imageResponse.text();
            console.error('[ImageGen] DALL-E error:', err);
            throw new Error('Image generation failed');
        }

        const data = await imageResponse.json();
        const imageUrl = data.data[0]?.url;
        const revisedPrompt = data.data[0]?.revised_prompt || message;

        if (imageUrl) {
            res.write(`data: ${JSON.stringify({ content: `![Generated Image](${imageUrl})\n\n` })}\n\n`);
            res.write(`data: ${JSON.stringify({ content: `*Revised prompt: ${revisedPrompt}*\n` })}\n\n`);
        } else {
            throw new Error('No image URL in response');
        }

        res.write('data: [DONE]\n\n');
    } catch (error) {
        console.error('[ImageGen] Error:', error.message);
        res.write(`data: ${JSON.stringify({ content: `❌ **Image generation failed:** ${error.message}\n\nTry describing the image differently or switch to Chat mode.` })}\n\n`);
        res.write('data: [DONE]\n\n');
    }
}

// ============================================================================
// HELPER: Route streaming to correct provider
// ============================================================================
async function routeStreamToProvider(res, provider, model, messages, temperature, maxTokens) {
    const providerKey = (provider || 'cerebras').toLowerCase();

    // Known providers — set of valid provider keys
    const knownProviders = new Set(['cerebras', 'gemini', 'groq']);

    // If the requested provider is unknown, ignore the model (it's from another provider)
    const isForeignProvider = !knownProviders.has(providerKey);
    const safeModel = isForeignProvider ? null : model;

    // Resolve actual provider for concurrency slot
    const effectiveProvider = knownProviders.has(providerKey) ? providerKey : 'cerebras';
    const slot = await AiQueue.acquireSlot(effectiveProvider, true);
    try {

    switch (providerKey) {
        case 'gemini': {
            await streamGemini(res, safeModel, messages, temperature, maxTokens);
            break;
        }
        case 'groq':
        case 'cerebras': {
            const config = PROVIDER_CONFIGS[providerKey];
            if (!config || !config.apiKey) {
                // Fallback to cerebras, ignore foreign model name
                console.warn(`[Stream] Provider ${providerKey} not configured, falling back to cerebras`);
                await streamOpenAICompatible(res, PROVIDER_CONFIGS.cerebras, PROVIDER_CONFIGS.cerebras.defaultModel, messages, temperature, maxTokens);
            } else {
                await streamOpenAICompatible(res, config, safeModel || config.defaultModel, messages, temperature, maxTokens);
            }
            break;
        }
        default: {
            // Unknown provider (e.g. anthropic, openai) — use cerebras with its own default model
            console.warn(`[Stream] Unknown provider ${providerKey}, using cerebras`);
            const fallbackConfig = PROVIDER_CONFIGS.cerebras;
            await streamOpenAICompatible(res, fallbackConfig, fallbackConfig.defaultModel, messages, temperature, maxTokens);
        }
    }

    } finally {
        await AiQueue.releaseSlot(slot);
    }
}

// ============================================================================
// DB PERSISTENCE: Save chat messages to PostgreSQL
// ============================================================================
const generateSessionId = () => `sess-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

/**
 * Ensure a ChatSession exists (create if needed), then save messages.
 * Works for both authenticated and guest users.
 * sessionId: client-provided session ID (or auto-generated)
 * userId: authenticated user ID or 'guest'
 */
async function ensureSession(sessionId, userId, agentId, settings) {
    try {
        // If no userId, try guest but still save
        const finalUserId = userId || 'guest';
        const finalSessionId = sessionId || generateSessionId();

        // Check if session exists
        let session = await prisma.chatSession.findUnique({
            where: { sessionId: finalSessionId },
        });

        if (!session) {
            // Need a valid User record — check if user exists
            const userExists = await prisma.user.findUnique({ where: { id: finalUserId } });
            if (!userExists) {
                console.log(`[DB] User ${finalUserId} not found, skipping DB persistence`);
                return null;
            }

            // Validate agentId exists if provided
            let validAgentId = null;
            if (agentId) {
                const agentExists = await prisma.agent.findUnique({ where: { agentId } });
                if (agentExists) validAgentId = agentId;
            }

            session = await prisma.chatSession.create({
                data: {
                    sessionId: finalSessionId,
                    userId: finalUserId,
                    agentId: validAgentId,
                    name: 'Studio Chat',
                    settings: settings || {},
                },
            });
            console.log(`[DB] Created session: ${finalSessionId}`);
        }

        return session;
    } catch (error) {
        console.error('[DB] ensureSession error:', error.message);
        return null;
    }
}

/**
 * Save a message to the database (non-blocking, fire-and-forget)
 */
async function saveMessage(sessionId, role, content, metadata = {}) {
    if (!sessionId) return;
    try {
        await prisma.chatMessage.create({
            data: {
                sessionId,
                role: role.toLowerCase(), // user, assistant, system
                content: content.substring(0, 100000), // Limit content size
                metadata: metadata || {},
            },
        });

        // Update session timestamp + stats
        const session = await prisma.chatSession.findUnique({ where: { sessionId } });
        if (session) {
            const stats = (typeof session.stats === 'object' && session.stats) || {};
            await prisma.chatSession.update({
                where: { sessionId },
                data: {
                    updatedAt: new Date(),
                    stats: {
                        ...stats,
                        messageCount: (stats.messageCount || 0) + 1,
                    },
                },
            });
        }
    } catch (error) {
        console.error('[DB] saveMessage error:', error.message);
    }
}

// ============================================================================
// AGENTS - MULTIMODAL
// ============================================================================
router.post('/multimodal', async (req, res) => {
    try {
        const { message, image, audio, context = {} } = req.body;

        if (!message && !image && !audio) {
            return res.status(400).json({ error: 'Message, image, or audio required' });
        }

        // Use provider fallback for text (image/audio analysis not available without OpenAI)
        const fallbackResult = await chatWithFallback(message || 'Analyze this', []);
        return res.json({ success: true, response: fallbackResult.response || '' });
    } catch (error) {
        console.error('[agents/multimodal] Error:', error);
        return res.status(503).json({ error: 'Multimodal service unavailable' });
    }
});

// ============================================================================
// STUDIO - CHAT (Non-streaming, also handles vision)
// ============================================================================
router.post('/chat', checkContentSafety, async (req, res) => {
    try {
        const {
            message, query, code,
            conversationHistory = [],
            provider = 'cerebras',
            model,
            systemPrompt: _rawSystemPrompt,
            imageData,
            temperature: _rawTemperature = 0.7,
            maxTokens = 4096,
            activeTool = 'none',
            language = 'javascript',
            projectFiles,
            sessionId,
            userId,
            agentId,
        } = req.body;

        // Per-user AI rate limit
        await AiQueue.checkUserRate(userId);

        // STRICT_AGENT_PROMPTS is the single source of truth — agentId picks the prompt, 'default' is Sanbay Fusion
        const systemPrompt = STRICT_AGENT_PROMPTS[agentId] || STRICT_AGENT_PROMPTS['default'];
        const temperature = (agentId && AGENT_TEMPERATURES[agentId] !== undefined) ? AGENT_TEMPERATURES[agentId] : _rawTemperature;

        const userMessage = message || query || '';
        if (!userMessage && !code) {
            return res.status(400).json({ error: 'Message required' });
        }

        // Legacy code-query format support
        const finalMessage = code
            ? `Code:\n\`\`\`${language}\n${code}\n\`\`\`\n\nQuestion: ${userMessage}`
            : userMessage;

        // DB Persistence: ensure session + save user message
        let dbSessionId = sessionId || null;
        if (userId && sessionId) {
            const session = await ensureSession(sessionId, userId, agentId, {
                provider, model, temperature, maxTokens, activeTool,
            });
            if (session) {
                dbSessionId = session.sessionId;
                saveMessage(dbSessionId, 'user', finalMessage, { activeTool, provider, model });
            }
        }

        // Handle image generation mode — not available without OpenAI
        if (activeTool === 'image_gen') {
            return res.status(503).json({ error: 'Image generation is not available in demo mode (requires OpenAI DALL-E)' });
        }

        // Handle vision (image analysis) — not available without OpenAI
        if (imageData?.base64) {
            return res.status(503).json({ error: 'Vision/image analysis is not available in demo mode (requires OpenAI GPT-4o)' });
        }

        // Inject memory context into system prompt if user & agent are available
        let memoryEnhancedPrompt = systemPrompt;
        if (userId && agentId) {
            try {
                memoryEnhancedPrompt = await memoryService.buildEnhancedSystemPrompt(userId, agentId, systemPrompt || '');
            } catch (memErr) {
                console.warn('[studio/chat] Memory injection skipped:', memErr.message);
            }
        }

        // Non-streaming call
        const providerKey = (provider || 'openai').toLowerCase();
        let responseText = '';
        const callStart = Date.now();

        // ── DEMO MODE: Disable all tool calling (avoid API limits) ──
        // Just use simple text-to-text chat with provider fallback
        const isToolCallingMode = false;

        if (isToolCallingMode) {
            const toolSystemPrompt = memoryEnhancedPrompt +
                '\n\nYou have access to tools: web_search, fetch_url, execute_code, calculate, get_current_time, get_weather, generate_video. Use them proactively when the user\'s request would benefit from real-time data, calculations, code execution, or web content.';

            const chatMessages = [];
            if (conversationHistory?.length > 0) {
                for (const msg of conversationHistory.slice(-10)) {
                    chatMessages.push({ role: msg.role === 'model' ? 'assistant' : msg.role, content: msg.content });
                }
            }
            chatMessages.push({ role: 'user', content: finalMessage });

            // Run tool loop (non-streaming)
            const MAX_ROUNDS = 3;
            let roundMessages = [...chatMessages];

            for (let round = 0; round < MAX_ROUNDS; round++) {
                let response;
                if (providerKey === 'anthropic') {
                    response = await studioCallAnthropicWithTools(model, toolSystemPrompt, roundMessages);
                } else {
                    response = await studioCallOpenAIWithTools(model, toolSystemPrompt, roundMessages);
                }

                if (response.toolCalls.length === 0) {
                    responseText = response.text;
                    break;
                }

                console.log(`[studio/chat/ToolCall] Round ${round + 1}: ${response.toolCalls.map(tc => tc.name).join(', ')}`);

                const roundResults = [];
                for (const tc of response.toolCalls) {
                    let result;
                    try { result = await executeStudioTool(tc.name, tc.arguments, userId); }
                    catch (e) { result = { success: false, error: e.message }; }
                    roundResults.push({ toolCallId: tc.id, name: tc.name, arguments: tc.arguments, result });
                }

                // Re-inject tool results
                if (providerKey === 'anthropic') {
                    roundMessages.push({ role: 'assistant', content: response.rawContent });
                    roundMessages.push({ role: 'user', content: roundResults.map(r => ({ type: 'tool_result', tool_use_id: r.toolCallId, content: JSON.stringify(r.result) })) });
                } else {
                    roundMessages.push({ role: 'assistant', content: response.text || null, tool_calls: response.toolCalls.map(tc => ({ id: tc.id, type: 'function', function: { name: tc.name, arguments: JSON.stringify(tc.arguments) } })) });
                    for (const r of roundResults) {
                        roundMessages.push({ role: 'tool', tool_call_id: r.toolCallId, content: JSON.stringify(r.result) });
                    }
                }

                if (round === MAX_ROUNDS - 1) responseText = response.text || 'Done.';
            }
        } else {
            // ── DEMO MODE: Always use provider fallback (Cerebras → Gemini → Groq) ──
            const messages = await buildMessagesForMode(finalMessage, conversationHistory, memoryEnhancedPrompt, activeTool, projectFiles);

            console.log(`[studio/chat] Using provider fallback (requested: ${provider})`);
            const fallbackResult = await chatWithFallback(
                finalMessage,
                conversationHistory,
                {
                    systemPrompt: memoryEnhancedPrompt,
                    temperature: temperature ?? 0.7,
                    maxTokens: maxTokens || 4096,
                    requestedProvider: providerKey,
                }
            );

            if (!fallbackResult.success) {
                console.error('[studio/chat] Fallback failed:', fallbackResult.error);
                return res.status(503).json({
                    error: 'All AI providers unavailable',
                    details: fallbackResult.error,
                });
            }

            responseText = fallbackResult.response;
            const usedProvider = fallbackResult.provider;

            // Save with actual provider used
            if (dbSessionId && responseText) {
                saveMessage(dbSessionId, 'assistant', responseText, {
                    activeTool, provider: usedProvider, model: fallbackResult.model, latencyMs: Date.now() - callStart,
                });
            }

            return res.json({
                success: true,
                response: responseText,
                provider: usedProvider,
                model: fallbackResult.model,
                durationMs: Date.now() - callStart,
            });
        } // close else block for non-tool-calling providers

        const latencyMs = Date.now() - callStart;

        // Save assistant response to DB
        if (dbSessionId && responseText) {
            saveMessage(dbSessionId, 'assistant', responseText, {
                activeTool, provider: providerKey, model, latencyMs,
            });
        }

        // Process conversation for memory learning (non-blocking)
        if (userId && agentId && responseText) {
            memoryService.processConversation(userId, agentId, [
                { role: 'user', content: finalMessage },
                { role: 'assistant', content: responseText },
            ], dbSessionId).catch(err => console.warn('[Memory] Learning error:', err.message));
        }

        return res.json({
            success: true,
            response: responseText,
            provider: providerKey,
            durationMs: latencyMs,
        });
    } catch (error) {
        console.error('[studio/chat] Error:', error);
        return res.status(503).json({ error: 'Studio chat unavailable', details: error.message });
    }
});

// ============================================================================
// STUDIO - CHAT STREAM (Main streaming endpoint)
// ============================================================================
router.post('/chat/stream', checkContentSafety, async (req, res) => {
    const startTime = Date.now();
    try {
        const {
            message, query, code,
            conversationHistory = [],
            provider = 'cerebras',
            model,
            systemPrompt: _rawSystemPrompt,
            temperature: _rawTemperature = 0.7,
            maxTokens = 4096,
            activeTool = 'none',
            language = 'javascript',
            projectFiles,
            sessionId,
            userId,
            agentId,
        } = req.body;

        // Per-user AI rate limit
        await AiQueue.checkUserRate(userId);

        // STRICT_AGENT_PROMPTS is the single source of truth — agentId picks the prompt, 'default' is Sanbay Fusion
        const systemPrompt = STRICT_AGENT_PROMPTS[agentId] || STRICT_AGENT_PROMPTS['default'];
        const temperature = (agentId && AGENT_TEMPERATURES[agentId] !== undefined) ? AGENT_TEMPERATURES[agentId] : _rawTemperature;

        const userMessage = message || query || '';
        if (!userMessage && !code) {
            return res.status(400).json({ error: 'Message required' });
        }

        // Legacy code-query format support
        const finalMessage = code
            ? `Code:\n\`\`\`${language}\n${code}\n\`\`\`\n\nQuestion: ${userMessage}`
            : userMessage;

        // DB Persistence: ensure session + save user message (non-blocking)
        let dbSessionId = sessionId || null;
        if (userId && sessionId) {
            const session = await ensureSession(sessionId, userId, agentId, {
                provider, model, temperature, maxTokens, activeTool,
            });
            if (session) {
                dbSessionId = session.sessionId;
                // Save user message
                saveMessage(dbSessionId, 'user', finalMessage, { activeTool, provider, model });
            }
        }

        // Set up SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Provider', provider || 'cerebras');

        console.log(`[Studio/Stream] Mode: ${activeTool} | Provider: ${provider} | Model: ${model || 'default'} | Session: ${dbSessionId || 'none'}`);

        // Handle image generation mode — not available in demo
        if (activeTool === 'image_gen') {
            res.write(`data: ${JSON.stringify({ content: '❌ Image generation is not available in demo mode (requires OpenAI DALL-E).' })}\n\n`);
            res.write('data: [DONE]\n\n');
            if (dbSessionId) saveMessage(dbSessionId, 'assistant', '[Image generation unavailable in demo]', { activeTool: 'image_gen' });
            return;
        }

        // Build messages with mode context (includes web search for search/research modes)
        // Inject memory context into system prompt if user & agent are available
        let streamMemoryPrompt = systemPrompt;
        if (userId && agentId) {
            try {
                streamMemoryPrompt = await memoryService.buildEnhancedSystemPrompt(userId, agentId, systemPrompt || '');
            } catch (memErr) {
                console.warn('[studio/chat/stream] Memory injection skipped:', memErr.message);
            }
        }

        // ── DEMO MODE: Tool calling disabled (no OpenAI/Anthropic) ──
        const providerKey = (provider || 'cerebras').toLowerCase();
        const isToolCallingMode = false;

        if (isToolCallingMode) {
            // Use native tool calling — LLM auto-decides which tools to use
            const toolSystemPrompt = streamMemoryPrompt +
                '\n\nYou have access to tools: web_search, fetch_url, execute_code, calculate, get_current_time, get_weather, generate_video. Use them proactively when the user\'s request would benefit from real-time data, calculations, code execution, or web content.';

            // Build chat messages (without mode injection since tools handle it)
            const chatMessages = [];
            if (conversationHistory?.length > 0) {
                for (const msg of conversationHistory.slice(-10)) {
                    chatMessages.push({ role: msg.role === 'model' ? 'assistant' : msg.role, content: msg.content });
                }
            }
            chatMessages.push({ role: 'user', content: finalMessage });

            // Intercept streamed response to collect full text for DB
            const originalWrite = res.write.bind(res);
            let fullResponseText = '';
            res.write = function (chunk) {
                const str = typeof chunk === 'string' ? chunk : chunk.toString();
                const lines = str.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ') && line.slice(6) !== '[DONE]') {
                        try {
                            const parsed = JSON.parse(line.slice(6));
                            if (parsed.content) fullResponseText += parsed.content;
                        } catch { }
                    }
                }
                return originalWrite(chunk);
            };

            // Run tool-calling loop (handles multiple rounds, streams text)
            const finalText = await runToolCallingLoop(res, providerKey, model, toolSystemPrompt, chatMessages, userId, agentId, activeTool);

            res.write('data: [DONE]\n\n');
            res.end();

            const elapsed = Date.now() - startTime;
            console.log(`[Studio/Stream/ToolCall] Completed in ${elapsed}ms | Provider: ${providerKey}`);

            // Save AI response to DB (non-blocking)
            const savedText = fullResponseText || finalText;
            if (dbSessionId && savedText) {
                saveMessage(dbSessionId, 'assistant', savedText, { activeTool: 'tool_calling', provider: providerKey, model, latencyMs: elapsed });
            }
            if (userId && agentId && savedText) {
                memoryService.processConversation(userId, agentId, [
                    { role: 'user', content: finalMessage },
                    { role: 'assistant', content: savedText },
                ], dbSessionId).catch(err => console.warn('[Memory] Learning error:', err.message));
            }
            return;
        }

        // ── FALLBACK: Mode-based approach for other providers or specific modes ──
        const messages = await buildMessagesForMode(finalMessage, conversationHistory, streamMemoryPrompt, activeTool, projectFiles);

        // Intercept streamed response to collect full text for DB
        const originalWrite = res.write.bind(res);
        let fullResponseText = '';
        res.write = function (chunk) {
            // Parse SSE data to collect response text
            const str = typeof chunk === 'string' ? chunk : chunk.toString();
            const lines = str.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ') && line.slice(6) !== '[DONE]') {
                    try {
                        const parsed = JSON.parse(line.slice(6));
                        if (parsed.content) fullResponseText += parsed.content;
                    } catch { }
                }
            }
            return originalWrite(chunk);
        };

        // Route to correct provider for streaming
        await routeStreamToProvider(res, provider, model, messages, temperature, maxTokens);

        const elapsed = Date.now() - startTime;
        console.log(`[Studio/Stream] Completed in ${elapsed}ms | Response length: ${fullResponseText.length}`);

        // Save AI response to DB (non-blocking)
        if (dbSessionId && fullResponseText) {
            saveMessage(dbSessionId, 'assistant', fullResponseText, {
                activeTool,
                provider,
                model,
                latencyMs: elapsed,
            });
        }

        // Process conversation for memory learning (non-blocking)
        if (userId && agentId && fullResponseText) {
            memoryService.processConversation(userId, agentId, [
                { role: 'user', content: finalMessage },
                { role: 'assistant', content: fullResponseText },
            ], dbSessionId).catch(err => console.warn('[Memory] Learning error:', err.message));
        }
    } catch (error) {
        console.error('[studio/chat/stream] Error:', error);
        if (!res.headersSent) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
        }
        res.write(`data: ${JSON.stringify({ content: `❌ **Error:** ${error.message}\n\nTry switching to a different provider or mode.` })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
    }
});

// ============================================================================
// LAB - EXPERIMENTS
// ============================================================================

// Helper: call an OpenAI-compatible provider (non-streaming)
async function callProviderSync(providerKey, messages, model, maxTokens = 1000) {
    // Map old provider names to available ones
    const providerMap = { openai: 'cerebras', anthropic: 'groq', xai: 'cerebras', mistral: 'groq' };
    const resolvedKey = providerMap[providerKey] || providerKey;

    if (resolvedKey === 'gemini') {
        // Use Gemini native API
        const config = PROVIDER_CONFIGS.gemini;
        const geminiModel = model || config.defaultModel;
        const systemInstruction = messages.find(m => m.role === 'system')?.content;
        const contents = messages.filter(m => m.role !== 'system').map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
        }));
        const resp = await fetch(
            `${config.baseURL}/models/${geminiModel}:generateContent?key=${config.apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents,
                    systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
                    generationConfig: { maxOutputTokens: maxTokens },
                }),
            }
        );
        const data = await resp.json();
        return { content: data.candidates?.[0]?.content?.parts?.[0]?.text || '' };
    }

    const config = PROVIDER_CONFIGS[resolvedKey] || PROVIDER_CONFIGS.cerebras;
    const resp = await fetch(`${config.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({ model: model || config.defaultModel, messages, max_tokens: maxTokens }),
    });
    const data = await resp.json();
    return { content: data.choices?.[0]?.message?.content || '' };
}

// Battle Arena
router.post('/battle-arena', async (req, res) => {
    try {
        const { prompt1, prompt2, topic } = req.body;
        if (!prompt1 || !prompt2) return res.status(400).json({ error: 'Two prompts required' });

        const [response1, response2] = await Promise.all([
            callProviderSync('cerebras', [{ role: 'user', content: `${topic ? `Topic: ${topic}\n` : ''}${prompt1}` }], 'llama3.1-8b', 1000),
            callProviderSync('groq', [{ role: 'user', content: `${topic ? `Topic: ${topic}\n` : ''}${prompt2}` }], 'llama-3.3-70b-versatile', 1000),
        ]);
        return res.json({ success: true, response1: response1.content, response2: response2.content, winner: Math.random() > 0.5 ? 1 : 2 });
    } catch (error) {
        console.error('[lab/battle-arena] Error:', error);
        return res.status(503).json({ error: 'Battle arena unavailable' });
    }
});

// Debate Arena
router.post('/debate-arena', async (req, res) => {
    try {
        const { topic, position1, position2 } = req.body;
        if (!topic || !position1 || !position2) return res.status(400).json({ error: 'Topic and positions required' });

        const response = await callProviderSync('cerebras', [
            { role: 'user', content: `Topic: ${topic}\nPosition 1: ${position1}\nPosition 2: ${position2}\nGenerate a thoughtful debate transcript.` },
        ], 'llama3.1-8b', 2000);
        return res.json({ success: true, debate: response.content });
    } catch (error) {
        console.error('[lab/debate-arena] Error:', error);
        return res.status(503).json({ error: 'Debate arena unavailable' });
    }
});

// Debate Arena - Vote persistence (DB-backed via LabVote model)

router.post('/debate-arena/vote', async (req, res) => {
    try {
        const { topicId, position } = req.body;
        if (!topicId || !['for', 'against'].includes(position)) {
            return res.status(400).json({ error: 'topicId and position (for/against) required' });
        }
        const record = await prisma.labVote.upsert({
            where: { arena_voteKey_position: { arena: 'debate', voteKey: topicId, position } },
            update: { count: { increment: 1 } },
            create: { arena: 'debate', voteKey: topicId, position, count: 1 },
        });
        // Return both positions for this topic
        const allVotes = await prisma.labVote.findMany({
            where: { arena: 'debate', voteKey: topicId },
        });
        const votes = { for: 0, against: 0 };
        allVotes.forEach(v => { votes[v.position] = v.count; });
        return res.json({ success: true, votes });
    } catch (error) {
        console.error('[lab/debate-arena/vote] Error:', error);
        return res.status(500).json({ error: 'Failed to record vote' });
    }
});

router.get('/debate-arena/votes', async (req, res) => {
    try {
        const rows = await prisma.labVote.findMany({ where: { arena: 'debate' } });
        const votes = {};
        rows.forEach(r => {
            if (!votes[r.voteKey]) votes[r.voteKey] = { for: 0, against: 0 };
            votes[r.voteKey][r.position] = r.count;
        });
        return res.json({ success: true, votes });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch votes' });
    }
});

// Battle Arena - Vote persistence (DB-backed)
router.post('/battle-arena/vote', async (req, res) => {
    try {
        const { battleKey, winner } = req.body;
        if (!battleKey || !['model1', 'model2'].includes(winner)) {
            return res.status(400).json({ error: 'battleKey and winner (model1/model2) required' });
        }
        await prisma.labVote.upsert({
            where: { arena_voteKey_position: { arena: 'battle', voteKey: battleKey, position: winner } },
            update: { count: { increment: 1 } },
            create: { arena: 'battle', voteKey: battleKey, position: winner, count: 1 },
        });
        const allVotes = await prisma.labVote.findMany({
            where: { arena: 'battle', voteKey: battleKey },
        });
        const votes = { model1: 0, model2: 0 };
        allVotes.forEach(v => { votes[v.position] = v.count; });
        return res.json({ success: true, votes });
    } catch (error) {
        console.error('[lab/battle-arena/vote] Error:', error);
        return res.status(500).json({ error: 'Failed to record vote' });
    }
});

// Dream Analysis
router.post('/dream-analysis', async (req, res) => {
    try {
        const { dreamDescription } = req.body;
        if (!dreamDescription) return res.status(400).json({ error: 'Dream description required' });

        const response = await callProviderSync('groq', [
            { role: 'user', content: `Analyze this dream from psychological and symbolic perspectives:\n\n${dreamDescription}` },
        ], 'llama-3.3-70b-versatile', 1500);
        return res.json({ success: true, analysis: response.content });
    } catch (error) {
        console.error('[lab/dream-analysis] Error:', error);
        return res.status(503).json({ error: 'Dream analysis unavailable' });
    }
});

// Emotion Analysis
router.post('/emotion-analysis', async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ error: 'Text required' });

        const response = await callProviderSync('cerebras', [
            { role: 'system', content: 'You are an emotion analysis expert. Analyze the emotional content and return: emotion, intensity (0-100), sentiment, and reasoning.' },
            { role: 'user', content: text },
        ], 'llama3.1-8b', 500);
        return res.json({ success: true, analysis: response.content });
    } catch (error) {
        console.error('[lab/emotion-analysis] Error:', error);
        return res.status(503).json({ error: 'Emotion analysis unavailable' });
    }
});

// Future Prediction
router.post('/future-prediction', async (req, res) => {
    try {
        const { scenario, timeframe } = req.body;
        if (!scenario) return res.status(400).json({ error: 'Scenario required' });

        const response = await callProviderSync('groq', [
            { role: 'user', content: `Based on current trends, predict the most likely outcomes for: ${scenario}${timeframe ? ` within ${timeframe}` : ''}. Be realistic but creative.` },
        ], 'llama-3.3-70b-versatile', 2000);
        return res.json({ success: true, prediction: response.content });
    } catch (error) {
        console.error('[lab/future-prediction] Error:', error);
        return res.status(503).json({ error: 'Future prediction unavailable' });
    }
});

// Personality Analysis
router.post('/personality-analysis', async (req, res) => {
    try {
        const { text, description } = req.body;
        if (!text && !description) return res.status(400).json({ error: 'Text or description required' });

        const response = await callProviderSync('cerebras', [
            { role: 'system', content: 'Analyze personality traits, strengths, weaknesses, and recommendations for growth.' },
            { role: 'user', content: text || description },
        ], 'llama3.1-8b', 1500);
        return res.json({ success: true, analysis: response.content });
    } catch (error) {
        console.error('[lab/personality-analysis] Error:', error);
        return res.status(503).json({ error: 'Personality analysis unavailable' });
    }
});

// Story Generation
router.post('/story-generation', async (req, res) => {
    try {
        const { prompt, genre, continuation } = req.body;
        if (!prompt) return res.status(400).json({ error: 'Prompt required' });

        const systemMsg = `You are a master storyteller specializing in ${genre || 'fantasy'} fiction. Write vivid, engaging prose with compelling characters and plot twists.`;
        const userMsg = continuation
            ? `Continue the following story based on this premise: "${prompt}"\n\nStory so far:\n${continuation}\n\nWrite the next section (500-800 words).`
            : `Write a short story (800-1200 words) based on: "${prompt}". Genre: ${genre || 'fantasy'}. Include vivid descriptions, dialogue, and a satisfying arc.`;

        const response = await callProviderSync('groq', [
            { role: 'system', content: systemMsg },
            { role: 'user', content: userMsg },
        ], 'llama-3.3-70b-versatile', 3000);
        return res.json({ success: true, story: response.content });
    } catch (error) {
        console.error('[lab/story-generation] Error:', error);
        return res.status(503).json({ error: 'Story generation unavailable' });
    }
});

// ============================================================================
// LIVE SUPPORT
// ============================================================================
router.post('/', async (req, res) => {
    try {
        const { issue, context = {} } = req.body;
        if (!issue) return res.status(400).json({ error: 'Issue required' });

        const response = await callProviderSync('cerebras', [
            { role: 'system', content: 'You are a helpful customer support agent. Provide clear, concise solutions.' },
            { role: 'user', content: issue },
        ], 'llama3.1-8b', 800);
        return res.json({ success: true, response: response.content });
    } catch (error) {
        console.error('[live-support] Error:', error);
        return res.status(503).json({ error: 'Support service unavailable' });
    }
});



// ============================================================================
// MESSAGE FEEDBACK — Like / Dislike (stored in ChatFeedback table)
// ============================================================================

/**
 * POST /feedback — Create or update a like/dislike for a message
 * Body: { messageId, sessionId, userId, type: 'like'|'dislike'|'remove' }
 */
router.post('/feedback', async (req, res) => {
    try {
        const { messageId, sessionId, userId, type } = req.body;

        if (!messageId || !userId) {
            return res.status(400).json({ success: false, error: 'messageId and userId are required' });
        }

        // Validate userId exists
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Check for existing feedback on this message from this user
        const existing = await prisma.chatFeedback.findFirst({
            where: { messageId, userId },
        });

        // Handle remove action
        if (type === 'remove') {
            if (existing) {
                await prisma.chatFeedback.delete({ where: { id: existing.id } });
            }
            return res.json({ success: true, action: 'removed' });
        }

        // Map type to FeedbackType enum and rating
        const feedbackType = type === 'like' ? 'helpful' : 'not_helpful';
        const rating = type === 'like' ? 5 : 1;

        if (existing) {
            // Update existing feedback
            const updated = await prisma.chatFeedback.update({
                where: { id: existing.id },
                data: {
                    type: feedbackType,
                    rating,
                    feedback: type,
                },
            });
            return res.json({ success: true, action: 'updated', feedback: updated });
        }

        // Determine sessionId — use provided or try to find one for this user
        let resolvedSessionId = sessionId;
        if (!resolvedSessionId) {
            const latestSession = await prisma.chatSession.findFirst({
                where: { userId },
                orderBy: { updatedAt: 'desc' },
                select: { sessionId: true },
            });
            resolvedSessionId = latestSession?.sessionId || `feedback-${Date.now()}`;
        }

        // Ensure session exists (create minimal one if needed for FK)
        const sessionExists = await prisma.chatSession.findUnique({
            where: { sessionId: resolvedSessionId },
        });
        if (!sessionExists) {
            await prisma.chatSession.create({
                data: {
                    sessionId: resolvedSessionId,
                    userId,
                    name: 'Feedback Session',
                },
            });
        }

        // Create new feedback
        const feedback = await prisma.chatFeedback.create({
            data: {
                sessionId: resolvedSessionId,
                userId,
                messageId,
                type: feedbackType,
                rating,
                feedback: type,
            },
        });

        return res.json({ success: true, action: 'created', feedback });
    } catch (error) {
        console.error('[Feedback] Create error:', error);
        return res.status(500).json({ success: false, error: 'Failed to save feedback' });
    }
});

/**
 * GET /feedback — Get all feedback for a user
 * Query: ?userId=xxx&sessionId=xxx (optional)
 */
router.get('/feedback', async (req, res) => {
    try {
        const { userId, sessionId } = req.query;

        if (!userId) {
            return res.status(400).json({ success: false, error: 'userId is required' });
        }

        const where = { userId };
        if (sessionId) where.sessionId = sessionId;

        const feedbacks = await prisma.chatFeedback.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 1000,
        });

        // Build lookup maps for quick client-side use
        const liked = [];
        const disliked = [];
        for (const fb of feedbacks) {
            if (fb.type === 'helpful') liked.push(fb.messageId);
            else if (fb.type === 'not_helpful') disliked.push(fb.messageId);
        }

        return res.json({
            success: true,
            feedbacks,
            liked,
            disliked,
        });
    } catch (error) {
        console.error('[Feedback] Get error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch feedback' });
    }
});

/**
 * DELETE /feedback/:id — Remove specific feedback
 */
router.delete('/feedback/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.chatFeedback.delete({ where: { id } });
        return res.json({ success: true, action: 'deleted' });
    } catch (error) {
        console.error('[Feedback] Delete error:', error);
        return res.status(500).json({ success: false, error: 'Failed to delete feedback' });
    }
});

// ============================================================================
// AI QUEUE MONITORING — Concurrency + rate limit stats
// ============================================================================
router.get('/ai-queue/stats', async (req, res) => {
    try {
        const stats = await AiQueue.getStats();
        return res.json({ success: true, ...stats });
    } catch (error) {
        console.error('[AI Queue] Stats error:', error);
        return res.status(500).json({ success: false, error: 'Failed to get AI queue stats' });
    }
});

export default router;
