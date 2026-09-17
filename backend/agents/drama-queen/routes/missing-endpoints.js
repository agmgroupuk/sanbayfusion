/**
 * STUDIO & AI ENDPOINTS
 * ⚠️  SECURITY: All LLM API keys kept in backend only
 * Frontend routes proxy through Next.js API routes to these endpoints
 * 
 * Supports modes: Chat, Web Search, Deep Research, Thinking, Image Generation
 * Primary: xAI (Grok) | Fallback: Mistral, OpenAI
 */

import express from 'express';
import OpenAI from 'openai';
import agentToolsService from '../services/agent-tools-service.js';
import { prisma } from '../lib/prisma.js';
import { authPrisma } from '../lib/auth-prisma.js';
import memoryService from '../services/agent-memory-service.js';
import AgentMemory from '../models/AgentMemory.js';
import { STRICT_AGENT_PROMPTS, AGENT_TEMPERATURES, AGENT_PROVIDERS } from '../lib/agent-strict-prompts.js';
import { runWithContext } from '../lib/request-context.js';
import { routeRequest, recordToolUsage, getToolCounts } from '../services/tool-router.js';
import { AiQueue } from '../lib/ai-queue.js';

const router = express.Router();

// ============================================================================
// SUBSCRIPTION CHECK — Ensures user has active subscription for the agent
// Exempt: 'ai-studio' (free demo), requests without agentId (legacy)
// ============================================================================
const FREE_AGENTS = new Set(['ai-studio', 'default']);

async function checkSubscription(userId, agentId) {
    if (!agentId || FREE_AGENTS.has(agentId)) return { allowed: true };
    if (!userId) return { allowed: false, reason: 'Authentication required' };

    const subscription = await authPrisma.agentSubscription.findFirst({
        where: {
            userId,
            agentId,
            status: 'active',
            expiryDate: { gt: new Date() },
        },
        select: { id: true, plan: true, expiryDate: true },
    });

    if (subscription) return { allowed: true };
    return { allowed: false, reason: 'SUBSCRIPTION_REQUIRED', agentId };
}

// Initialize clients
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ============================================================================
// PROVIDER CONFIGURATION
// ============================================================================
const PROVIDER_CONFIGS = {
    openai: {
        baseURL: 'https://api.openai.com/v1',
        apiKey: process.env.OPENAI_API_KEY,
        defaultModel: 'gpt-4o',
    },
    xai: {
        baseURL: 'https://api.x.ai/v1',
        apiKey: process.env.XAI_API_KEY,
        defaultModel: 'grok-3-fast',
    },
    mistral: {
        baseURL: 'https://api.mistral.ai/v1',
        apiKey: process.env.MISTRAL_API_KEY,
        defaultModel: 'mistral-small-latest',
    },
    groq: {
        baseURL: 'https://api.groq.com/openai/v1',
        apiKey: process.env.GROQ_API_KEY,
        defaultModel: 'llama-3.3-70b-versatile',
    },
    cerebras: {
        baseURL: 'https://api.cerebras.ai/v1',
        apiKey: process.env.CEREBRAS_API_KEY,
        defaultModel: 'llama-3.3-70b',
    },
    gemini: {
        baseURL: 'https://generatimelanguage.googleapis.com/v1beta/openai',
        apiKey: process.env.GEMINI_API_KEY,
        defaultModel: 'gemini-2.0-flash',
    },
    anthropic: {
        baseURL: 'https://api.anthropic.com/v1',
        apiKey: process.env.ANTHROPIC_API_KEY,
        defaultModel: 'claude-3-5-sonnet-20241022',
    },
};

// ============================================================================
// MODE SYSTEM PROMPT ENHANCERS
// ============================================================================

// ============================================================================
// MODE → PROVIDER MAPPING
// 3 providers in use: openai, mistral, xai
//
//   Chat         → agent's own provider (personality-driven, each agent differs)
//   Web Search   → xAI grok-3-fast     (Grok has live web access natively)
//   Deep Research→ xAI grok-3          (live web + 131K context = best research)
//   Thinking     → OpenAI gpt-4o       (best step-by-step chain-of-thought)
//   Create Image → OpenAI dall-e-3     (hardcoded in image handler, not via this fn)
// ============================================================================
const MODE_BEST_PROVIDER = {
    web_search:    { provider: 'xai',    model: 'grok-3-fast' },
    deep_research: { provider: 'xai',    model: 'grok-3' },
    thinking:      { provider: 'openai', model: 'gpt-4o' },
};

/**
 * Resolve provider + model for a given agent + mode.
 * Specialized modes (web_search, deep_research, thinking) always use
 * the best-suited provider from the 3 available.
 * Chat mode (activeTool=none/undefined) uses the agent's own provider.
 */
function getModeProvider(agentConfig, activeTool) {
    // 1. Agent-specific mode override takes highest priority
    if (activeTool && agentConfig.modes?.[activeTool]) {
        return agentConfig.modes[activeTool];
    }
    // 2. Global MODE_BEST_PROVIDER for agents without per-agent mode config
    const modeConfig = MODE_BEST_PROVIDER[activeTool];
    if (modeConfig) return modeConfig;
    // 3. Chat and all other modes → agent's own provider + model
    return { provider: agentConfig.provider, model: agentConfig.model };
}

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
    { type: 'function', function: { name: 'run_code', description: 'Execute code in a sandboxed environment: JavaScript, Python, Shell, TypeScript', parameters: { type: 'object', properties: { code: { type: 'string', description: 'Code to execute' }, language: { type: 'string', enum: ['javascript', 'python', 'shell', 'typescript'], description: 'Programming language' }, timeout: { type: 'number', description: 'Execution timeout in ms (default 30000)' } }, required: ['code', 'language'] } } },
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
    // ── Dev Tools ────────────────────────────────────────────────
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
    // ── Web & Frontend Tools ────────────────────────────────────────
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
                    data: { type: 'array', items: { type: 'string' }, description: 'Data to import' },
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
                    endpoints: { type: 'array', items: { type: 'object' }, description: 'API endpoints to document' },
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
                    tests: { type: 'array', items: { type: 'string' }, description: 'Test suite with assertions' },
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
                    endpoints: { type: 'array', items: { type: 'object' }, description: 'REST endpoints to convert' },
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
            description: 'Multi-provider LLM chat (Mistral/xAI/OpenAI). Multi-turn conversations with system prompts.',
            parameters: {
                type: 'object',
                properties: {
                    provider: { type: 'string', enum: ['mistral', 'xai', 'openai'], description: 'LLM provider' },
                    model: { type: 'string', description: 'Model name (auto-selected if omitted)' },
                    prompt: { type: 'string', description: 'Simple prompt string' },
                    messages: { type: 'array', items: { type: 'object', properties: { role: { type: 'string' }, content: { type: 'string' } } }, description: 'Chat message array [{role, content}]' },
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
                    data: { type: 'array', items: { type: 'string' }, description: 'JSONL training data' },
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
                    data: { type: 'array', items: { type: 'object' }, description: 'Training data array of objects' },
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
    },    {
        type: 'function',
        function: {
            name: 'data_profile',
            description: 'Statistical profiling of datasets: types, distributions, outliers, correlations, quality scores.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['analyze', 'summary'], description: 'Profiling action' },
                    data: { type: 'array', items: { type: 'object' }, description: 'Data array of objects [{col1: val, col2: val}]' },
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
                    data: { type: 'array', items: { type: 'object' }, description: 'Data array of objects' },
                    column: { type: 'string', description: 'Target column (fill)' },
                    columns: { type: 'array', items: { type: 'string' }, description: 'Columns to normalize' },
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
                    data: { type: 'array', items: { type: 'string' }, description: 'Data array' },
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
                    data: { type: 'array', items: { type: 'object' }, description: 'Data array of objects' },
                    transforms: { type: 'array', items: { type: 'object' }, description: 'Transform specs [{type, column, bins?, lag?, window?}]' },
                },
                required: ['action', 'data'],
            },
        },
    },
    { type: 'function', function: { name: 'data_correlate', description: 'Compute correlation analysis between two datasets using Pearson, Spearman, or Kendall methods', parameters: { type: 'object', properties: { dataset_a: { type: 'array', items: { type: 'number' }, description: 'First dataset (array of numbers)' }, dataset_b: { type: 'array', items: { type: 'number' }, description: 'Second dataset (array of numbers)' }, method: { type: 'string', enum: ['pearson', 'spearman', 'kendall'], description: 'Correlation method' } }, required: ['dataset_a', 'dataset_b'] } } },
    { type: 'function', function: { name: 'data_sample', description: 'Sample rows from a dataset using random, stratified, or systematic methods', parameters: { type: 'object', properties: { dataset: { type: 'array', items: { type: 'string' }, description: 'Input dataset array' }, n: { type: 'number', description: 'Number of samples to draw (default 100)' }, method: { type: 'string', enum: ['random', 'stratified', 'systematic'], description: 'Sampling method' }, stratifyBy: { type: 'string', description: 'Column to stratify by (for stratified sampling)' } }, required: ['dataset'] } } },
    { type: 'function', function: { name: 'outlier_detect', description: 'Detect statistical outliers in data using z-score, IQR, or isolation forest methods', parameters: { type: 'object', properties: { data: { type: 'array', items: { type: 'number' }, description: 'Input numeric data array' }, method: { type: 'string', enum: ['zscore', 'iqr', 'isolation_forest', 'grubbs'], description: 'Detection method' }, threshold: { type: 'number', description: 'Detection threshold (e.g. 3 for z-score)' }, column: { type: 'string', description: 'Column to analyze (for array of objects)' } }, required: ['data'] } } },
    {
        type: 'function',
        function: {
            name: 'model_compare',
            description: 'Evaluate ML models: regression/classification metrics, cross-validation, multi-model ranking.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['evaluate', 'compare', 'cross_validate'], description: 'Comparison action' },
                    predictions: { type: 'array', items: { type: 'number' }, description: 'Predicted values' },
                    actuals: { type: 'array', items: { type: 'number' }, description: 'Actual values' },
                    taskType: { type: 'string', enum: ['regression', 'classification'], description: 'Task type' },
                    models: { type: 'array', items: { type: 'number' }, description: 'Multiple models [{name, predictions, actuals}]' },
                    data: { type: 'array', items: { type: 'string' }, description: 'Dataset for cross-validation' },
                    target: { type: 'string', description: 'Target column' },
                    folds: { type: 'number', description: 'K-fold count (default 5)' },
                },
                required: ['action'],
            },
        },
    },    // ── Geo & Location Tools (8) ─────────────────────────────────
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
                    addresses: { type: 'array', items: { type: 'string' }, description: 'Addresses to batch geocode' },
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
                    waypoints: { type: 'array', items: { type: 'object' }, description: 'Waypoints [{lat, lon}] for multi_stop' },
                    center: { type: 'object', description: 'Center point for isochrone' },
                    profile: { type: 'string', enum: ['driving', 'walking', 'cycling'], description: 'Travel mode' },
                    minutes: { type: 'array', items: { type: 'number' }, description: 'Isochrone minutes [5, 10, 15, 30]' },
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
                    points: { type: 'array', items: { type: 'object' }, description: 'Points array [{lat, lon, label?}]' },
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
                    coordinates: { type: 'array', items: { type: 'object' }, description: 'Polygon coordinates [{lat, lon}]' },
                    triggers: { type: 'array', items: { type: 'object' }, description: 'Trigger events [enter, exit]' },
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
    },    // ── Cloud Control Tools (9) ───────────────────────────────
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
    },    {
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
                    rules: { type: 'array', items: { type: 'object' }, description: 'Firewall rules' },
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
                    scanIds: { type: 'array', items: { type: 'object' }, description: 'Scan IDs to compare' },
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
                    rules: { type: 'array', items: { type: 'object' }, description: 'Policy rules [{check, severity, message}]' },
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
                    mitigations: { type: 'array', items: { type: 'string' }, description: 'Mitigation strategies' },
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
    },    // ── Agent Intelligence & Editor Tools (8) ────────────────────
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
    },    // ── File Management Tools (17) ────────────────────────────────
    {
        type: 'function',
        function: {
            name: 'create_file',
            description: 'Create a new downloadable file with specified content. After creating, show the download link from the result. NEVER invent preview URLs or mention localhost. For HTML/CSS/JS, also put the full code in a markdown code block so the chat UI shows a live preview automatically.',
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
                    entries: { type: 'array', items: { type: 'object' }, description: 'Changelog entries' },
                    endpoints: { type: 'array', items: { type: 'object' }, description: 'API endpoints' },
                    headers: { type: 'array', items: { type: 'string' }, description: 'Table headers' },
                    rows: { type: 'array', items: { type: 'string' }, description: 'Table rows' },
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
                    events: { type: 'array', items: { type: 'string' }, description: 'Batch events array' },
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
                    metrics: { type: 'array', items: { type: 'object' }, description: 'Batch metrics array' },
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
                    steps: { type: 'array', items: { type: 'object' }, description: 'Workflow steps [{id, tool, params, dependsOn?, condition?}]' },
                    tags: { type: 'array', items: { type: 'object' }, description: 'Tags for categorization' },
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
                    steps: { type: 'array', items: { type: 'object' }, description: 'Workflow steps (for reorder without workflowId)' },
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
                    entities: { type: 'array', items: { type: 'string' }, description: 'Batch entities [{name, type, properties}]' },
                    relations: { type: 'array', items: { type: 'string' }, description: 'Batch relations [{from, to, type}]' },
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
                    stages: { type: 'array', items: { type: 'object' }, description: 'Funnel stage names' },
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
                    plans: { type: 'array', items: { type: 'object' }, description: 'Pricing plans [{name, price, distribution}]' },
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
                    variants: { type: 'array', items: { type: 'object' }, description: 'Variants [{name, weight}]' },
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
                    leads: { type: 'array', items: { type: 'object' }, description: 'Batch leads [{email, domain}]' },
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
                    labels: { type: 'array', items: { type: 'string' }, description: 'Task labels' },
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
                    approvers: { type: 'array', items: { type: 'string' }, description: 'Approvers [{userId, required}]' },
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
                    recipients: { type: 'array', items: { type: 'string' }, description: 'Array of recipient user IDs' },
                    notificationId: { type: 'string', description: 'Notification ID (for mark_read)' },
                    since: { type: 'string', description: 'ISO date to filter from' },
                    limit: { type: 'number', description: 'Max results to return' },
                },
                required: ['action'],
            },
        },
    },

    // ── BUSINESS & FINANCE ──────────────────────────────────────────────────
    { type: 'function', function: { name: 'budget_plan', description: 'Create, update, list, or close budget plans with categories and allocations', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['create', 'update', 'list', 'get', 'close'], description: 'Action to perform' }, name: { type: 'string', description: 'Budget plan name' }, period: { type: 'string', description: 'Budget period (monthly, quarterly, annual)' }, total: { type: 'number', description: 'Total budget amount' }, currency: { type: 'string', description: 'Currency code (USD, EUR, etc.)' }, categories: { type: 'array', items: { type: 'object' }, description: 'Budget categories with amounts' }, planId: { type: 'string', description: 'Budget plan ID (for update/get/close)' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'expense_track', description: 'Add, update, list, or categorize business expenses', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['add', 'update', 'list', 'delete', 'categorize', 'report'], description: 'Action to perform' }, amount: { type: 'number', description: 'Expense amount' }, currency: { type: 'string', description: 'Currency code' }, category: { type: 'string', description: 'Expense category (travel, software, meals, etc.)' }, description: { type: 'string', description: 'Expense description' }, date: { type: 'string', description: 'Expense date (ISO format)' }, receipt: { type: 'string', description: 'Receipt URL or base64' }, expenseId: { type: 'string', description: 'Expense ID (for update/delete)' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'financial_report', description: 'Generate P&L, balance sheet, cash flow, or other financial reports', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['profit_loss', 'balance_sheet', 'cash_flow', 'revenue', 'expense_summary', 'custom'], description: 'Report type' }, period: { type: 'string', description: 'Reporting period (e.g. 2025-Q4, 2025-01)' }, startDate: { type: 'string', description: 'Start date for custom range' }, endDate: { type: 'string', description: 'End date for custom range' }, currency: { type: 'string', description: 'Currency to report in' }, format: { type: 'string', enum: ['pdf', 'csv', 'json', 'html'], description: 'Output format' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'invoice_generate', description: 'Generate a line-item invoice PDF/JSON for a client', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['create', 'update', 'send', 'list', 'get', 'void'], description: 'Action to perform' }, client: { type: 'string', description: 'Client name or business name' }, clientEmail: { type: 'string', description: 'Client email address' }, items: { type: 'array', items: { type: 'string' }, description: 'Invoice line items with description, quantity, price' }, dueDate: { type: 'string', description: 'Payment due date (ISO format)' }, currency: { type: 'string', description: 'Currency code' }, notes: { type: 'string', description: 'Additional notes or terms' }, invoiceId: { type: 'string', description: 'Invoice ID (for update/send/void)' }, format: { type: 'string', enum: ['pdf', 'json', 'html'], description: 'Output format' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'tax_calculate', description: 'Calculate tax liability for income, sales, VAT, or payroll', parameters: { type: 'object', properties: { type: { type: 'string', enum: ['income', 'sales', 'vat', 'payroll', 'corporate', 'capital_gains'], description: 'Tax type' }, amount: { type: 'number', description: 'Amount to calculate tax on' }, country: { type: 'string', description: 'Country code (US, UK, EU, etc.)' }, state: { type: 'string', description: 'State/region (for US sales tax)' }, year: { type: 'number', description: 'Tax year' }, deductions: { type: 'number', description: 'Total deductions to apply' }, filingStatus: { type: 'string', description: 'Filing status (single, married, etc.)' } }, required: ['type', 'amount'] } } },
    { type: 'function', function: { name: 'payroll_calculate', description: 'Calculate employee payroll, taxes, deductions, and net pay', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['calculate', 'run', 'list', 'history'], description: 'Action to perform' }, employeeId: { type: 'string', description: 'Employee ID' }, grossSalary: { type: 'number', description: 'Gross salary amount' }, period: { type: 'string', description: 'Pay period (weekly, biweekly, monthly, annual)' }, deductions: { type: 'array', items: { type: 'string' }, description: 'Array of deductions with type and amount' }, benefits: { type: 'array', items: { type: 'string' }, description: 'Employee benefits' }, country: { type: 'string', description: 'Country for tax calculation' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'currency_convert', description: 'Convert a monetary amount between currencies using live or historical rates', parameters: { type: 'object', properties: { amount: { type: 'number', description: 'Amount to convert' }, from: { type: 'string', description: 'Source currency code (e.g. USD)' }, to: { type: 'string', description: 'Target currency code (e.g. EUR)' }, date: { type: 'string', description: 'Historical date for rate lookup (ISO format, omit for live rate)' } }, required: ['amount', 'from', 'to'] } } },
    { type: 'function', function: { name: 'deal_forecast', description: 'Forecast sales deals and revenue based on pipeline stage and probability', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['forecast', 'create', 'update', 'list', 'close', 'won', 'lost'], description: 'Action to perform' }, dealName: { type: 'string', description: 'Deal name' }, value: { type: 'number', description: 'Deal value' }, probability: { type: 'number', description: 'Close probability (0-100)' }, stage: { type: 'string', description: 'Pipeline stage' }, closeDate: { type: 'string', description: 'Expected close date' }, period: { type: 'string', description: 'Forecast period (monthly, quarterly)' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'sales_report', description: 'Generate sales performance summaries, pipeline analysis, or rep-level reports', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['summary', 'pipeline', 'by_rep', 'by_product', 'forecast', 'conversion'], description: 'Report type' }, period: { type: 'string', description: 'Reporting period (e.g. 2025-Q4, last_30_days)' }, repId: { type: 'string', description: 'Sales rep ID (for by_rep report)' }, format: { type: 'string', enum: ['json', 'csv', 'pdf'], description: 'Output format' }, currency: { type: 'string', description: 'Currency for amounts' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'payment_process', description: 'Create or query payment transactions: charges, refunds, and subscriptions', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['create', 'charge', 'refund', 'list', 'get', 'subscribe', 'cancel'], description: 'Action to perform' }, amount: { type: 'number', description: 'Payment amount in smallest currency unit (cents)' }, currency: { type: 'string', description: 'Currency code' }, customerId: { type: 'string', description: 'Customer ID' }, paymentMethod: { type: 'string', description: 'Payment method ID or token' }, description: { type: 'string', description: 'Payment description' }, transactionId: { type: 'string', description: 'Transaction ID (for refund/get)' } }, required: ['action'] } } },

    // ── PROJECT MANAGEMENT ──────────────────────────────────────────────────
    { type: 'function', function: { name: 'project_create', description: 'Create, retrieve, update, or archive a project with name, description, and settings', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['create', 'get', 'update', 'list', 'archive', 'delete'], description: 'Action to perform' }, name: { type: 'string', description: 'Project name' }, description: { type: 'string', description: 'Project description' }, startDate: { type: 'string', description: 'Project start date' }, endDate: { type: 'string', description: 'Project end date' }, team: { type: 'array', items: { type: 'string' }, description: 'Team member IDs' }, tags: { type: 'array', items: { type: 'string' }, description: 'Project tags' }, projectId: { type: 'string', description: 'Project ID (for update/get/archive)' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'gantt_generate', description: 'Generate a Gantt chart from project tasks, durations, and dependencies', parameters: { type: 'object', properties: { title: { type: 'string', description: 'Chart title' }, tasks: { type: 'array', items: { type: 'string' }, description: 'Array of tasks with name, start, end, and optional dependencies' }, format: { type: 'string', enum: ['svg', 'png', 'html', 'json'], description: 'Output format' }, theme: { type: 'string', enum: ['default', 'dark', 'minimal'], description: 'Visual theme' } }, required: ['tasks'] } } },
    { type: 'function', function: { name: 'sprint_plan', description: 'Plan a sprint with backlog items, story points, and team capacity', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['create', 'update', 'start', 'close', 'list', 'get'], description: 'Action to perform' }, name: { type: 'string', description: 'Sprint name' }, goal: { type: 'string', description: 'Sprint goal statement' }, startDate: { type: 'string', description: 'Sprint start date' }, endDate: { type: 'string', description: 'Sprint end date' }, capacity: { type: 'number', description: 'Team capacity in story points' }, backlogItems: { type: 'array', items: { type: 'string' }, description: 'Array of backlog items to include' }, sprintId: { type: 'string', description: 'Sprint ID (for update/start/close)' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'milestone_track', description: 'Create, update, list, or complete project milestones', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['create', 'update', 'complete', 'list', 'get', 'delete'], description: 'Action to perform' }, title: { type: 'string', description: 'Milestone title' }, description: { type: 'string', description: 'Milestone description' }, dueDate: { type: 'string', description: 'Due date (ISO format)' }, projectId: { type: 'string', description: 'Project this milestone belongs to' }, milestoneId: { type: 'string', description: 'Milestone ID (for update/complete/get)' }, assignee: { type: 'string', description: 'Assignee user ID' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'deadline_track', description: 'Add, update, list, or alert on project and task deadlines', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['add', 'update', 'list', 'delete', 'alert', 'upcoming'], description: 'Action to perform' }, title: { type: 'string', description: 'Deadline title' }, dueDate: { type: 'string', description: 'Deadline date (ISO format)' }, projectId: { type: 'string', description: 'Associated project ID' }, priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], description: 'Priority level' }, alertBefore: { type: 'number', description: 'Alert N hours before deadline' }, deadlineId: { type: 'string', description: 'Deadline ID (for update/delete)' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'resource_allocate', description: 'Allocate or rebalance project resources: people, budget, and time', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['allocate', 'reallocate', 'list', 'get', 'release', 'report'], description: 'Action to perform' }, projectId: { type: 'string', description: 'Project to allocate resources for' }, resourceType: { type: 'string', enum: ['team', 'budget', 'time', 'equipment'], description: 'Type of resource' }, resources: { type: 'array', items: { type: 'object' }, description: 'Array of resource assignments' }, period: { type: 'string', description: 'Allocation period' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'task_manage', description: 'Create, list, update, or complete tasks in the project tracker', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['create', 'update', 'complete', 'delete', 'list', 'get', 'assign'], description: 'Action to perform' }, title: { type: 'string', description: 'Task title' }, description: { type: 'string', description: 'Task description' }, assignee: { type: 'string', description: 'Assignee user ID' }, dueDate: { type: 'string', description: 'Due date (ISO format)' }, priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], description: 'Priority level' }, status: { type: 'string', enum: ['todo', 'in_progress', 'review', 'done'], description: 'Task status' }, projectId: { type: 'string', description: 'Parent project ID' }, taskId: { type: 'string', description: 'Task ID (for update/complete/assign)' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'pipeline_manage', description: 'Manage CRM sales pipeline stages, deals, and stage transitions', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['create', 'update', 'list', 'move', 'get', 'delete'], description: 'Action to perform' }, pipelineName: { type: 'string', description: 'Pipeline name' }, stages: { type: 'array', items: { type: 'object' }, description: 'Array of stage definitions with name and order' }, dealId: { type: 'string', description: 'Deal ID to move between stages' }, fromStage: { type: 'string', description: 'Source stage for move action' }, toStage: { type: 'string', description: 'Target stage for move action' }, pipelineId: { type: 'string', description: 'Pipeline ID (for update/get/delete)' } }, required: ['action'] } } },

    // ── HR & PEOPLE ────────────────────────────────────────────────────────
    { type: 'function', function: { name: 'employee_onboard', description: 'Generate and manage employee onboarding checklists and workflows', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['create', 'get', 'update', 'complete_step', 'list'], description: 'Action to perform' }, employeeName: { type: 'string', description: 'New employee full name' }, role: { type: 'string', description: 'Job role/position' }, startDate: { type: 'string', description: 'Start date' }, department: { type: 'string', description: 'Department' }, managerId: { type: 'string', description: 'Manager user ID' }, template: { type: 'string', description: 'Onboarding template to use' }, onboardingId: { type: 'string', description: 'Onboarding record ID (for update/complete_step)' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'performance_review', description: 'Create, score, or retrieve employee performance reviews', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['create', 'update', 'submit', 'list', 'get', 'score'], description: 'Action to perform' }, employeeId: { type: 'string', description: 'Employee being reviewed' }, reviewerId: { type: 'string', description: 'Reviewer user ID' }, period: { type: 'string', description: 'Review period (Q1 2025, Annual 2025, etc.)' }, goals: { type: 'array', items: { type: 'object' }, description: 'Goals with completion status and scores' }, overallRating: { type: 'number', description: 'Overall rating (1-5)' }, comments: { type: 'string', description: 'Reviewer comments' }, reviewId: { type: 'string', description: 'Review ID (for update/get/submit)' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'interview_schedule', description: 'Schedule, reschedule, or cancel job interview appointments', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['schedule', 'reschedule', 'cancel', 'list', 'get', 'confirm'], description: 'Action to perform' }, candidateId: { type: 'string', description: 'Candidate ID' }, candidateName: { type: 'string', description: 'Candidate name' }, role: { type: 'string', description: 'Job role being interviewed for' }, interviewers: { type: 'array', items: { type: 'object' }, description: 'Array of interviewer user IDs' }, startTime: { type: 'string', description: 'Interview start time (ISO format)' }, duration: { type: 'number', description: 'Duration in minutes' }, format: { type: 'string', enum: ['video', 'phone', 'in_person'], description: 'Interview format' }, interviewId: { type: 'string', description: 'Interview ID (for reschedule/cancel/confirm)' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'job_post', description: 'Create, update, publish, or archive a job description/posting', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['create', 'update', 'publish', 'close', 'list', 'get'], description: 'Action to perform' }, title: { type: 'string', description: 'Job title' }, department: { type: 'string', description: 'Department' }, location: { type: 'string', description: 'Location (city, remote, hybrid)' }, type: { type: 'string', enum: ['full_time', 'part_time', 'contract', 'internship'], description: 'Employment type' }, description: { type: 'string', description: 'Job description content' }, requirements: { type: 'array', items: { type: 'string' }, description: 'List of requirements/qualifications' }, salary: { type: 'object', description: 'Salary range with min/max/currency' }, jobId: { type: 'string', description: 'Job posting ID (for update/publish/close)' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'resume_parse', description: 'Parse a resume/CV document and extract structured candidate data', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['parse', 'score', 'compare', 'list'], description: 'Action to perform' }, content: { type: 'string', description: 'Resume text or base64 PDF/DOCX content' }, format: { type: 'string', enum: ['text', 'pdf', 'docx', 'url'], description: 'Input format' }, jobId: { type: 'string', description: 'Job ID to score/compare against' }, url: { type: 'string', description: 'URL to resume document' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'org_chart', description: 'Retrieve or visualize an organization\'s reporting structure', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['get', 'create', 'update', 'add_member', 'remove_member', 'export'], description: 'Action to perform' }, department: { type: 'string', description: 'Department to get chart for (null for full org)' }, format: { type: 'string', enum: ['json', 'svg', 'png', 'html'], description: 'Output format' }, depth: { type: 'number', description: 'Depth of reporting levels to include' }, rootId: { type: 'string', description: 'Root node user ID' } }, required: ['action'] } } },

    // ── MARKETING & GROWTH ─────────────────────────────────────────────────
    { type: 'function', function: { name: 'social_post', description: 'Create, schedule, or publish a social media post across platforms', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['create', 'schedule', 'publish', 'list', 'delete', 'analytics'], description: 'Action to perform' }, content: { type: 'string', description: 'Post text content' }, platforms: { type: 'array', items: { type: 'string' }, description: 'Target platforms (twitter, linkedin, instagram, facebook)' }, scheduledTime: { type: 'string', description: 'Scheduled publish time (ISO format)' }, mediaUrls: { type: 'array', items: { type: 'string' }, description: 'Media attachment URLs' }, hashtags: { type: 'array', items: { type: 'string' }, description: 'Hashtags to include' }, postId: { type: 'string', description: 'Post ID (for list/delete/analytics)' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'campaign_track', description: 'Track a marketing campaign\'s performance and conversions', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['create', 'update', 'list', 'get', 'stats', 'archive'], description: 'Action to perform' }, name: { type: 'string', description: 'Campaign name' }, channel: { type: 'string', description: 'Campaign channel (email, social, paid, seo)' }, goal: { type: 'string', description: 'Campaign goal' }, budget: { type: 'number', description: 'Campaign budget' }, startDate: { type: 'string', description: 'Campaign start date' }, endDate: { type: 'string', description: 'Campaign end date' }, campaignId: { type: 'string', description: 'Campaign ID (for update/get/stats)' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'newsletter_create', description: 'Draft or publish a newsletter from content blocks and subscriber list', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['create', 'update', 'preview', 'send', 'schedule', 'list'], description: 'Action to perform' }, subject: { type: 'string', description: 'Newsletter subject line' }, content: { type: 'string', description: 'Newsletter body content (HTML or Markdown)' }, listId: { type: 'string', description: 'Subscriber list ID' }, scheduledTime: { type: 'string', description: 'Scheduled send time (ISO format)' }, fromName: { type: 'string', description: 'Sender display name' }, newsletterId: { type: 'string', description: 'Newsletter ID (for update/send/schedule)' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'content_calendar', description: 'Plan and manage a content publishing calendar', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['create', 'update', 'list', 'get', 'delete', 'schedule'], description: 'Action to perform' }, title: { type: 'string', description: 'Content title' }, type: { type: 'string', description: 'Content type (blog, social, email, video)' }, platform: { type: 'string', description: 'Target platform' }, publishDate: { type: 'string', description: 'Planned publish date' }, status: { type: 'string', enum: ['idea', 'draft', 'review', 'scheduled', 'published'], description: 'Content status' }, contentId: { type: 'string', description: 'Content ID (for update/get/delete)' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'keyword_research', description: 'Research SEO keywords for search volume, difficulty, and related terms', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['research', 'suggestions', 'competitors', 'gap_analysis'], description: 'Action to perform' }, keyword: { type: 'string', description: 'Primary keyword to research' }, country: { type: 'string', description: 'Target country code' }, language: { type: 'string', description: 'Target language' }, limit: { type: 'number', description: 'Max number of keyword suggestions' }, minVolume: { type: 'number', description: 'Minimum monthly search volume filter' } }, required: ['keyword'] } } },
    { type: 'function', function: { name: 'seo_audit', description: 'Audit a URL or content page for SEO issues (meta, headings, speed, links)', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['audit', 'on_page', 'technical', 'backlinks', 'competitors'], description: 'Audit type' }, url: { type: 'string', description: 'Page URL to audit' }, content: { type: 'string', description: 'Page content to audit (alternative to URL)' }, depth: { type: 'string', enum: ['basic', 'full', 'advanced'], description: 'Audit depth' }, focus: { type: 'array', items: { type: 'string' }, description: 'Areas to focus on (meta, performance, content, links)' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'brand_monitor', description: 'Monitor brand mentions, sentiment, and reputation across sources', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['monitor', 'alerts', 'sentiment', 'mentions', 'report', 'setup'], description: 'Action to perform' }, brand: { type: 'string', description: 'Brand name to monitor' }, sources: { type: 'array', items: { type: 'string' }, description: 'Sources to monitor (social, news, forums, reviews)' }, since: { type: 'string', description: 'Start date for monitoring period' }, limit: { type: 'number', description: 'Max results to return' } }, required: ['action', 'brand'] } } },
    { type: 'function', function: { name: 'email_draft', description: 'Draft a professional email from subject, recipient, intent, and tone', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['draft', 'send', 'schedule', 'reply', 'list', 'get'], description: 'Action to perform' }, to: { type: 'string', description: 'Recipient email address' }, subject: { type: 'string', description: 'Email subject' }, intent: { type: 'string', description: 'Email intent/purpose' }, tone: { type: 'string', enum: ['formal', 'friendly', 'urgent', 'persuasive', 'neutral'], description: 'Email tone' }, context: { type: 'string', description: 'Additional context for AI drafting' }, content: { type: 'string', description: 'Draft content (if providing manually)' }, scheduledTime: { type: 'string', description: 'Scheduled send time' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'email_template', description: 'Create, list, render, or manage reusable email templates', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['create', 'update', 'list', 'get', 'render', 'delete'], description: 'Action to perform' }, name: { type: 'string', description: 'Template name' }, subject: { type: 'string', description: 'Email subject template (supports {{variables}})' }, body: { type: 'string', description: 'Email body (HTML or plain text with {{variables}})' }, variables: { type: 'object', description: 'Variable values for render action' }, category: { type: 'string', description: 'Template category' }, templateId: { type: 'string', description: 'Template ID (for update/get/render/delete)' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'attribution_model', description: 'Build or query a multi-touch attribution model for marketing channels', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['build', 'query', 'compare', 'report', 'update'], description: 'Action to perform' }, model: { type: 'string', enum: ['first_touch', 'last_touch', 'linear', 'time_decay', 'position_based', 'data_driven'], description: 'Attribution model type' }, channel: { type: 'string', description: 'Filter by specific channel' }, period: { type: 'string', description: 'Analysis period' }, conversionEvent: { type: 'string', description: 'Conversion event to attribute' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'funnel_optimize', description: 'Analyze a conversion funnel and suggest or apply optimizations', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['analyze', 'optimize', 'compare', 'create', 'list'], description: 'Action to perform' }, funnelName: { type: 'string', description: 'Funnel name or ID' }, steps: { type: 'array', items: { type: 'object' }, description: 'Funnel steps with names and conversion rates' }, period: { type: 'string', description: 'Analysis period' }, goal: { type: 'string', description: 'Optimization goal (retention, conversion, revenue)' } }, required: ['action'] } } },

    // ── LEGAL & COMPLIANCE ─────────────────────────────────────────────────
    { type: 'function', function: { name: 'contract_analyze', description: 'Analyze a contract document for risks, clauses, obligations, and red flags', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['analyze', 'extract_clauses', 'risks', 'obligations', 'summary', 'compare'], description: 'Analysis type' }, content: { type: 'string', description: 'Contract text content' }, url: { type: 'string', description: 'URL to contract document' }, focus: { type: 'array', items: { type: 'object' }, description: 'Areas to focus on (liability, IP, termination, payment)' }, jurisdiction: { type: 'string', description: 'Legal jurisdiction' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'contract_draft', description: 'Draft a legal contract from templates and provided terms', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['create', 'update', 'list', 'get', 'sign', 'finalize'], description: 'Action to perform' }, type: { type: 'string', description: 'Contract type (SaaS, freelance, employment, NDA, service, license)' }, parties: { type: 'array', items: { type: 'object' }, description: 'Contract parties with names and roles' }, terms: { type: 'object', description: 'Key terms and conditions' }, jurisdiction: { type: 'string', description: 'Governing law jurisdiction' }, contractId: { type: 'string', description: 'Contract ID (for update/get/sign)' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'nda_generate', description: 'Generate a Non-Disclosure Agreement from party names and scope', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['generate', 'update', 'list', 'get'], description: 'Action to perform' }, disclosingParty: { type: 'string', description: 'Disclosing party name' }, receivingParty: { type: 'string', description: 'Receiving party name' }, purpose: { type: 'string', description: 'Purpose of disclosure' }, duration: { type: 'string', description: 'NDA duration (e.g. 2 years)' }, type: { type: 'string', enum: ['mutual', 'one_way'], description: 'NDA type' }, jurisdiction: { type: 'string', description: 'Governing law jurisdiction' }, format: { type: 'string', enum: ['pdf', 'docx', 'html'], description: 'Output format' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'terms_generate', description: 'Generate Terms of Service or Terms & Conditions document', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['generate', 'update', 'list', 'get'], description: 'Action to perform' }, businessName: { type: 'string', description: 'Business/company name' }, service: { type: 'string', description: 'Service or product description' }, type: { type: 'string', enum: ['terms_of_service', 'privacy_policy', 'cookie_policy', 'eula', 'refund_policy'], description: 'Document type' }, jurisdiction: { type: 'string', description: 'Governing law jurisdiction' }, contact: { type: 'string', description: 'Legal contact email' }, format: { type: 'string', enum: ['html', 'markdown', 'pdf'], description: 'Output format' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'regulatory_report', description: 'Generate a regulatory compliance or disclosure report', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['generate', 'list', 'get', 'submit'], description: 'Action to perform' }, framework: { type: 'string', description: 'Regulatory framework (GDPR, SOX, HIPAA, PCI-DSS, ISO27001)' }, period: { type: 'string', description: 'Reporting period' }, scope: { type: 'string', description: 'Report scope/description' }, format: { type: 'string', enum: ['pdf', 'json', 'html'], description: 'Output format' } }, required: ['action'] } } },

    // ── DEVELOPER UTILITIES ────────────────────────────────────────────────
    { type: 'function', function: { name: 'generate_code', description: 'Generate source code from a natural language description and style hint', parameters: { type: 'object', properties: { description: { type: 'string', description: 'Description of the code to generate' }, language: { type: 'string', description: 'Programming language (js, ts, python, go, rust, etc.)' }, style: { type: 'string', description: 'Code style hint (functional, OOP, minimal, documented, etc.)' }, framework: { type: 'string', description: 'Framework or library context (React, Next.js, Express, FastAPI, etc.)' } }, required: ['description'] } } },
    { type: 'function', function: { name: 'debug_code', description: 'Analyze a code snippet with its error message and suggest a fix', parameters: { type: 'object', properties: { code: { type: 'string', description: 'The code snippet with the bug' }, language: { type: 'string', description: 'Programming language' }, error_message: { type: 'string', description: 'The error or exception message' }, context: { type: 'string', description: 'Additional context about what the code should do' } }, required: ['code', 'language'] } } },
    { type: 'function', function: { name: 'run_command', description: 'Run a shell command and return stdout/stderr (use with caution)', parameters: { type: 'object', properties: { command: { type: 'string', description: 'Shell command to execute' }, timeout: { type: 'number', description: 'Timeout in milliseconds (default 30000)' } }, required: ['command'] } } },
    { type: 'function', function: { name: 'search_in_files', description: 'Search for a regex or string pattern across files in a directory', parameters: { type: 'object', properties: { pattern: { type: 'string', description: 'Search pattern (string or regex)' }, directory: { type: 'string', description: 'Directory path to search in' }, file_pattern: { type: 'string', description: 'Glob pattern to filter files (e.g. *.ts, *.py)' } }, required: ['pattern', 'directory'] } } },
    { type: 'function', function: { name: 'find_file_by_name', description: 'Search for files matching a name or glob pattern within a directory', parameters: { type: 'object', properties: { pattern: { type: 'string', description: 'Filename or glob pattern (e.g. index.ts, **/*.json)' }, directory: { type: 'string', description: 'Root directory to search from' } }, required: ['pattern', 'directory'] } } },
    { type: 'function', function: { name: 'get_symbols', description: 'Extract code symbols (classes, functions, variables) from a source file', parameters: { type: 'object', properties: { file: { type: 'string', description: 'Path to source file' } }, required: ['file'] } } },
    { type: 'function', function: { name: 'git_log', description: 'Return recent git commit history for a branch in a repository', parameters: { type: 'object', properties: { count: { type: 'number', description: 'Number of commits to return (default 10)' }, branch: { type: 'string', description: 'Branch name (default main)' }, directory: { type: 'string', description: 'Repository directory path' } }, required: [] } } },
    { type: 'function', function: { name: 'git_status', description: 'Return the working-tree status of a git repository', parameters: { type: 'object', properties: { directory: { type: 'string', description: 'Repository directory path' } }, required: [] } } },
    { type: 'function', function: { name: 'http_request', description: 'Make a raw HTTP request and return status code, headers, and body', parameters: { type: 'object', properties: { url: { type: 'string', description: 'Target URL' }, method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'], description: 'HTTP method' }, headers: { type: 'object', description: 'Request headers as key-value pairs' }, body: { type: 'string', description: 'Request body (JSON string or plain text)' } }, required: ['url'] } } },
    { type: 'function', function: { name: 'scan_dependency', description: 'Scan a dependency manifest for known CVEs filtered by ecosystem and severity', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['scan', 'list_vulns', 'fix_recommendations', 'sbom'], description: 'Action to perform' }, manifest: { type: 'string', description: 'Contents of package.json, requirements.txt, pom.xml, etc.' }, ecosystem: { type: 'string', enum: ['npm', 'pypi', 'maven', 'cargo', 'go', 'rubygems'], description: 'Package ecosystem' }, severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], description: 'Minimum severity to report' } }, required: ['action'] } } },

    // ── DATA & ANALYTICS ──────────────────────────────────────────────────
    { type: 'function', function: { name: 'data_export', description: 'Export a dataset to CSV, JSON, Excel, Parquet, or other formats', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['export', 'list', 'schedule', 'get'], description: 'Action to perform' }, dataSource: { type: 'string', description: 'Data source name or query' }, format: { type: 'string', enum: ['csv', 'json', 'xlsx', 'parquet', 'sql'], description: 'Output format' }, filters: { type: 'object', description: 'Filter conditions to apply before export' }, limit: { type: 'number', description: 'Max rows to export' }, destination: { type: 'string', description: 'Output file path or URL' } }, required: ['action', 'format'] } } },
    { type: 'function', function: { name: 'data_pipeline', description: 'Create, list, run, pause, and monitor data pipeline definitions', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['create', 'list', 'run', 'pause', 'get', 'delete', 'logs'], description: 'Action to perform' }, name: { type: 'string', description: 'Pipeline name' }, source: { type: 'string', description: 'Data source connection string or name' }, destination: { type: 'string', description: 'Data destination connection string or name' }, schedule: { type: 'string', description: 'Cron schedule expression' }, transforms: { type: 'array', items: { type: 'object' }, description: 'Array of transform steps' }, pipelineId: { type: 'string', description: 'Pipeline ID (for run/pause/get/delete)' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'data_transform', description: 'Apply sort, filter, join, aggregate, pivot, or other transforms to tabular data', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['sort', 'filter', 'join', 'aggregate', 'pivot', 'flatten', 'dedupe', 'rename_columns'], description: 'Transform type' }, data: { type: 'array', items: { type: 'object' }, description: 'Input data rows (array of objects)' }, column: { type: 'string', description: 'Column to operate on' }, conditions: { type: 'object', description: 'Filter conditions' }, groupBy: { type: 'array', items: { type: 'string' }, description: 'Columns to group by (for aggregate)' }, aggregations: { type: 'object', description: 'Aggregation operations (sum, avg, count, etc.)' }, joinWith: { type: 'array', items: { type: 'string' }, description: 'Secondary dataset to join with' }, joinKey: { type: 'string', description: 'Key column for join' } }, required: ['action', 'data'] } } },
    { type: 'function', function: { name: 'pivot_table', description: 'Create or update a pivot table from tabular data with row/column/value dimensions', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['create', 'update', 'list', 'get', 'export'], description: 'Action to perform' }, data: { type: 'array', items: { type: 'string' }, description: 'Input data rows' }, rows: { type: 'array', items: { type: 'string' }, description: 'Row dimension column names' }, columns: { type: 'array', items: { type: 'string' }, description: 'Column dimension column names' }, values: { type: 'array', items: { type: 'string' }, description: 'Value column names with aggregation function' }, filters: { type: 'object', description: 'Pre-filter conditions' }, format: { type: 'string', enum: ['json', 'html', 'csv', 'xlsx'], description: 'Output format' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'forecast_model', description: 'Build or apply a time-series forecasting model to provided data', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['forecast', 'train', 'evaluate', 'list'], description: 'Action to perform' }, data: { type: 'array', items: { type: 'object' }, description: 'Time-series data points (array of {date, value} objects)' }, horizon: { type: 'number', description: 'Number of periods to forecast ahead' }, method: { type: 'string', enum: ['arima', 'prophet', 'exponential_smoothing', 'linear', 'lstm', 'auto'], description: 'Forecasting method' }, seasonality: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'yearly', 'auto'], description: 'Seasonality pattern' }, modelId: { type: 'string', description: 'Trained model ID (for forecast/evaluate)' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'trend_analyze', description: 'Analyze time-series or categorical data for trends and patterns', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['analyze', 'detect', 'compare', 'seasonality', 'anomaly'], description: 'Analysis type' }, data: { type: 'array', items: { type: 'object' }, description: 'Data points to analyze' }, metric: { type: 'string', description: 'Metric name being analyzed' }, period: { type: 'string', description: 'Analysis period' }, granularity: { type: 'string', enum: ['hourly', 'daily', 'weekly', 'monthly'], description: 'Data granularity' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'report_generate', description: 'Generate a structured data or narrative report from provided content or data', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['create', 'update', 'list', 'get', 'export'], description: 'Action to perform' }, title: { type: 'string', description: 'Report title' }, type: { type: 'string', description: 'Report type (summary, detailed, executive, technical)' }, data: { type: 'object', description: 'Data to include in the report' }, sections: { type: 'array', items: { type: 'object' }, description: 'Report sections' }, format: { type: 'string', enum: ['pdf', 'html', 'markdown', 'json', 'docx'], description: 'Output format' }, reportId: { type: 'string', description: 'Report ID (for update/get/export)' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'proposal_generate', description: 'Generate a sales or project proposal document', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['create', 'update', 'list', 'get', 'send', 'finalize'], description: 'Action to perform' }, type: { type: 'string', enum: ['sales', 'project', 'technical', 'business'], description: 'Proposal type' }, clientName: { type: 'string', description: 'Client company name' }, projectName: { type: 'string', description: 'Project or deal name' }, scope: { type: 'string', description: 'Project scope description' }, budget: { type: 'number', description: 'Proposed budget' }, timeline: { type: 'string', description: 'Proposed timeline' }, proposalId: { type: 'string', description: 'Proposal ID (for update/get/send)' }, format: { type: 'string', enum: ['pdf', 'html', 'docx'], description: 'Output format' } }, required: ['action'] } } },

    // ── ARCHIVE UTILITIES ─────────────────────────────────────────────────
    { type: 'function', function: { name: 'create_zip', description: 'Create a ZIP archive from a list of files or in-memory entries', parameters: { type: 'object', properties: { output_name: { type: 'string', description: 'Name for the output ZIP file' }, files: { type: 'array', items: { type: 'object' }, description: 'Array of file paths to include' }, entries: { type: 'array', items: { type: 'object' }, description: 'In-memory entries as {name, content} objects' } }, required: ['output_name'] } } },
    { type: 'function', function: { name: 'extract_zip', description: 'Extract a ZIP archive to a destination with optional file-type filter', parameters: { type: 'object', properties: { file: { type: 'string', description: 'Path to the ZIP archive' }, destination: { type: 'string', description: 'Destination directory path' }, filter: { type: 'string', description: 'File extension filter (e.g. .json, .ts)' } }, required: ['file', 'destination'] } } },
    { type: 'function', function: { name: 'list_zip_contents', description: 'List all files and metadata inside a ZIP archive without extracting', parameters: { type: 'object', properties: { file: { type: 'string', description: 'Path to the ZIP archive' } }, required: ['file'] } } },

    // ── CLOUD INFRASTRUCTURE ───────────────────────────────────────────────
    { type: 'function', function: { name: 'cloud_dns', description: 'List and manage DNS records and zones in cloud providers', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['list', 'create', 'update', 'delete', 'get_zone', 'list_zones'], description: 'Action to perform' }, zone: { type: 'string', description: 'DNS zone name (e.g. example.com)' }, record: { type: 'object', description: 'DNS record object with type, name, value, ttl' }, recordId: { type: 'string', description: 'Record ID (for update/delete)' }, provider: { type: 'string', enum: ['route53', 'cloudflare', 'gcp', 'azure'], description: 'Cloud DNS provider' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'cloud_iam', description: 'Manage cloud IAM users, roles, policies, and permissions', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['user_list', 'user_create', 'role_list', 'role_create', 'policy_attach', 'policy_detach', 'permission_check'], description: 'Action to perform' }, username: { type: 'string', description: 'IAM username' }, role: { type: 'string', description: 'Role name or ARN' }, policy: { type: 'string', description: 'Policy name or ARN' }, provider: { type: 'string', enum: ['aws', 'gcp', 'azure'], description: 'Cloud provider' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'cloud_backup', description: 'Create and manage cloud storage snapshots and backups', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['snapshot_create', 'snapshot_list', 'restore', 'schedule', 'status'], description: 'Backup action' }, bucket: { type: 'string', description: 'Storage bucket name' }, key: { type: 'string', description: 'Object key or path' }, snapshotId: { type: 'string', description: 'Snapshot ID (for restore/status)' }, schedule: { type: 'string', description: 'Cron expression for scheduled backups' }, provider: { type: 'string', enum: ['aws', 'gcp', 'azure'], description: 'Cloud provider' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'cloud_domain', description: 'Manage cloud DNS domains, records, and zone configurations', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['list', 'create', 'update', 'delete', 'get_zone', 'list_zones', 'lookup'], description: 'Domain action' }, zone: { type: 'string', description: 'DNS zone name' }, record: { type: 'object', description: 'DNS record config' }, recordId: { type: 'string', description: 'Record ID' }, provider: { type: 'string', enum: ['route53', 'cloudflare', 'gcp', 'azure'], description: 'DNS provider' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'cloud_container', description: 'Manage cloud container clusters, services, workloads, and deployments', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['cluster_list', 'cluster_create', 'deploy', 'scale', 'list_services', 'logs', 'exec'], description: 'Action to perform' }, cluster: { type: 'string', description: 'Cluster name' }, service: { type: 'string', description: 'Service name' }, image: { type: 'string', description: 'Container image (for deploy)' }, replicas: { type: 'number', description: 'Number of replicas (for scale/deploy)' }, provider: { type: 'string', enum: ['eks', 'gke', 'aks', 'ecs', 'k8s'], description: 'Container platform' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'cloud_storage', description: 'List, upload, download, or manage cloud object storage buckets and files', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['list', 'upload', 'download', 'delete', 'copy', 'get_url', 'list_buckets', 'create_bucket'], description: 'Action to perform' }, bucket: { type: 'string', description: 'Bucket name' }, key: { type: 'string', description: 'Object key/path' }, content: { type: 'string', description: 'Content to upload' }, destination: { type: 'string', description: 'Destination key (for copy)' }, provider: { type: 'string', enum: ['s3', 'gcs', 'azure_blob', 'r2'], description: 'Cloud storage provider' }, prefix: { type: 'string', description: 'Path prefix for list operations' } }, required: ['action'] } } },

    // ── SECURITY & COMPLIANCE ─────────────────────────────────────────────
    { type: 'function', function: { name: 'password_audit', description: 'Audit password strength, reuse, breach exposure, or policy compliance', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['strength_check', 'breach_check', 'policy_audit', 'generate'], description: 'Action to perform' }, password: { type: 'string', description: 'Password to audit (never logged)' }, policy: { type: 'object', description: 'Password policy rules (minLength, requireUppercase, etc.)' }, count: { type: 'number', description: 'Number of passwords to generate (for generate action)' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'privacy_audit', description: 'Audit code, configurations, or data flows for privacy and PII risks', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['audit', 'pii_scan', 'data_flow', 'gdpr_check', 'report'], description: 'Action to perform' }, content: { type: 'string', description: 'Code or configuration content to audit' }, framework: { type: 'string', enum: ['GDPR', 'CCPA', 'HIPAA', 'general'], description: 'Privacy framework to check against' }, scanType: { type: 'string', enum: ['code', 'data', 'config', 'logs'], description: 'What to scan for PII' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'compliance_check', description: 'Check code, config, or data against compliance standards (GDPR, SOC2, PCI-DSS)', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['check', 'report', 'remediate', 'monitor'], description: 'Action to perform' }, standard: { type: 'string', description: 'Compliance standard (GDPR, SOC2, PCI-DSS, HIPAA, ISO27001)' }, content: { type: 'string', description: 'Content/code/config to check' }, scope: { type: 'string', description: 'Audit scope description' } }, required: ['action', 'standard'] } } },
    { type: 'function', function: { name: 'container_security', description: 'Scan container images and running workloads for vulnerabilities and misconfigurations', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['image_scan', 'config_audit', 'runtime_monitor', 'list_issues', 'sbom'], description: 'Action to perform' }, image: { type: 'string', description: 'Container image name:tag' }, severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], description: 'Minimum severity to report' }, cluster: { type: 'string', description: 'Kubernetes cluster to monitor (for runtime_monitor)' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'siem_query', description: 'Query a SIEM system for security events, alerts, and forensic timelines', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['dashboard', 'query', 'alerts', 'timeline', 'hunt', 'correlate'], description: 'Action to perform' }, query: { type: 'string', description: 'Search query (SIEM query language or natural language)' }, timeRange: { type: 'string', description: 'Time range (e.g. last_24h, last_7d, 2025-01-01/2025-01-31)' }, severity: { type: 'string', enum: ['info', 'low', 'medium', 'high', 'critical'], description: 'Alert severity filter' }, limit: { type: 'number', description: 'Max events to return' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'waf_manage', description: 'List, create, or update WAF rules and IP blocklists', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['rule_list', 'rule_create', 'rule_update', 'rule_delete', 'ip_block', 'ip_whitelist', 'stats'], description: 'Action to perform' }, ruleId: { type: 'string', description: 'WAF rule ID (for update/delete)' }, rule: { type: 'object', description: 'Rule definition with conditions and actions' }, ip: { type: 'string', description: 'IP address or CIDR for block/whitelist' }, provider: { type: 'string', enum: ['cloudflare', 'aws_waf', 'azure_waf', 'gcp_armor'], description: 'WAF provider' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'zero_trust', description: 'Enforce zero-trust policies: identity verify, device trust, least-privilege access', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['verify_identity', 'device_check', 'access_request', 'policy_list', 'policy_create', 'audit'], description: 'Action to perform' }, userId: { type: 'string', description: 'User ID to verify' }, deviceId: { type: 'string', description: 'Device ID to check trust level' }, resource: { type: 'string', description: 'Resource being accessed' }, policy: { type: 'object', description: 'Zero-trust policy definition' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'pentest_recon', description: 'Perform authorized penetration testing reconnaissance (port scan, DNS enum, OSINT)', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['port_scan', 'dns_enum', 'osint', 'subdomain_scan', 'service_detect', 'vuln_scan'], description: 'Recon type' }, target: { type: 'string', description: 'Target host, IP, or domain (must have authorization)' }, ports: { type: 'string', description: 'Port range to scan (e.g. 1-1000, 80,443)' }, depth: { type: 'string', enum: ['light', 'moderate', 'deep'], description: 'Scan depth' }, authorization: { type: 'string', description: 'Authorization token or confirmation' } }, required: ['action', 'target'] } } },
    { type: 'function', function: { name: 'ssl_inspect', description: 'Inspect an SSL/TLS certificate for validity, chain, expiry, and security issues', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['inspect', 'chain', 'expiry', 'ciphers', 'vulnerabilities'], description: 'Inspection type' }, host: { type: 'string', description: 'Hostname or IP to inspect' }, port: { type: 'number', description: 'Port number (default 443)' }, cert: { type: 'string', description: 'PEM-encoded certificate to inspect directly' } }, required: ['action'] } } },

    // ── AI / LLM UTILITIES ────────────────────────────────────────────────
    { type: 'function', function: { name: 'llm_analyze', description: 'Analyze text via LLM: summarize, classify, sentiment analysis, entity extraction, etc.', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['summarize', 'classify', 'sentiment', 'entities', 'intent', 'keywords', 'compare'], description: 'Analysis action' }, text: { type: 'string', description: 'Text to analyze' }, options: { type: 'object', description: 'Additional options (language, labels for classify, etc.)' } }, required: ['action', 'text'] } } },
    { type: 'function', function: { name: 'llm_moderate', description: 'Moderate text inputs for harmful, policy-violating, or unsafe content', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['moderate', 'batch', 'configure', 'stats'], description: 'Moderation action' }, text: { type: 'string', description: 'Text to moderate' }, texts: { type: 'array', items: { type: 'string' }, description: 'Array of texts for batch moderation' }, options: { type: 'object', description: 'Moderation options (categories, threshold, etc.)' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'llm_router', description: 'Route LLM requests to optimal model based on task type, benchmark, or list available models', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['route', 'benchmark', 'list_models', 'compare'], description: 'Router action' }, prompt: { type: 'string', description: 'Prompt to route to the best model' }, taskType: { type: 'string', description: 'Task type hint (reasoning, code, creative, etc.)' }, model: { type: 'string', description: 'Specific model to target' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'llm_cost_optimize', description: 'Estimate, track, and optimize LLM API costs: set budgets, get spending reports, get savings suggestions', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['estimate', 'cheapest', 'track', 'budget', 'report', 'suggest'], description: 'Cost action' }, prompt: { type: 'string', description: 'Prompt for cost estimation' }, model: { type: 'string', description: 'Model name' }, maxTokens: { type: 'number', description: 'Max tokens for estimate' }, cost: { type: 'number', description: 'Cost to track' }, budget: { type: 'number', description: 'Budget limit' }, period: { type: 'string', description: 'Budget period (monthly, weekly)' }, taskType: { type: 'string', description: 'Task type for cheapest model lookup' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'llm_guardrail', description: 'Detect prompt injection, validate input safety, enforce content policies, sanitize PII from LLM output', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['detect_injection', 'validate_input', 'enforce_policy', 'sanitize_output', 'log_violation', 'scan'], description: 'Guardrail action' }, text: { type: 'string', description: 'Text to scan or sanitize' }, policy: { type: 'string', enum: ['strict', 'moderate', 'permissive'], description: 'Policy level' }, rules: { type: 'array', items: { type: 'object' }, description: 'Custom rules to enforce' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'llm_evaluate', description: 'Grade, compare, and benchmark LLM responses: rubric scoring, A/B comparison, test suites', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['grade', 'compare', 'suite', 'benchmark', 'rubric', 'feedback'], description: 'Evaluation action' }, response: { type: 'string', description: 'LLM response to evaluate' }, responses: { type: 'array', items: { type: 'string' }, description: 'Multiple responses for comparison' }, prompt: { type: 'string', description: 'Original prompt' }, criteria: { type: 'array', items: { type: 'string' }, description: 'Evaluation criteria' }, reference: { type: 'string', description: 'Reference/gold answer' }, testCases: { type: 'array', items: { type: 'string' }, description: 'Test cases for suite action' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'llm_fallback', description: 'Create and manage LLM fallback chains: configure model sequences, execute with auto-fallback, track reliability', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['create_chain', 'execute', 'status', 'update', 'list', 'stats'], description: 'Fallback action' }, chainId: { type: 'string', description: 'Fallback chain ID' }, models: { type: 'array', items: { type: 'object' }, description: 'Ordered list of fallback models' }, retryCount: { type: 'number', description: 'Retries per model' }, timeout: { type: 'number', description: 'Timeout per model in ms' }, prompt: { type: 'string', description: 'Prompt to execute through fallback chain' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'llm_cache', description: 'Cache LLM responses to reduce costs and latency: get/set by key or prompt hash, stats, invalidate, policies', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['get', 'set', 'invalidate', 'stats', 'policy', 'clear'], description: 'Cache action' }, key: { type: 'string', description: 'Cache key' }, prompt: { type: 'string', description: 'Prompt to hash as cache key' }, response: { type: 'string', description: 'Response to cache (for set)' }, model: { type: 'string', description: 'Model name tag' }, ttl: { type: 'number', description: 'Time-to-live in seconds' }, maxSize: { type: 'number', description: 'Max cache entries (for policy)' } }, required: ['action'] } } },

    // ── KNOWLEDGE GRAPH UTILITIES ─────────────────────────────────────────
    { type: 'function', function: { name: 'kg_export', description: 'Export a knowledge graph to a serializable format (JSON-LD, Turtle, N-Triples)', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['export', 'list'], description: 'Action to perform' }, graphId: { type: 'string', description: 'Knowledge graph ID' }, format: { type: 'string', enum: ['json-ld', 'turtle', 'n-triples', 'json', 'cypher'], description: 'Export format' }, filter: { type: 'object', description: 'Entity/relation type filters' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'kg_import', description: 'Import triples or nodes into the knowledge graph from a file or payload', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['import', 'validate', 'merge'], description: 'Action to perform' }, graphId: { type: 'string', description: 'Target knowledge graph ID' }, data: { type: 'string', description: 'Serialized graph data to import' }, format: { type: 'string', enum: ['json-ld', 'turtle', 'n-triples', 'json', 'csv'], description: 'Input data format' }, strategy: { type: 'string', enum: ['merge', 'replace', 'append'], description: 'Import strategy' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'kg_stats', description: 'Return statistics about a knowledge graph (node/edge counts, density, top entities)', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['stats', 'summary', 'top_entities', 'top_relations'], description: 'Stats action' }, graphId: { type: 'string', description: 'Knowledge graph ID' } }, required: ['action'] } } },

    // ── GEO UTILITIES ─────────────────────────────────────────────────────
    { type: 'function', function: { name: 'geo_cluster', description: 'Cluster geographic coordinate sets using k-means or DBSCAN algorithms', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['kmeans', 'dbscan', 'hierarchical', 'visualize'], description: 'Clustering algorithm' }, coordinates: { type: 'array', items: { type: 'object' }, description: 'Array of {lat, lon} coordinate objects' }, k: { type: 'number', description: 'Number of clusters (for k-means)' }, epsilon: { type: 'number', description: 'DBSCAN epsilon (max distance in km)' }, minPoints: { type: 'number', description: 'DBSCAN min points per cluster' } }, required: ['action', 'coordinates'] } } },
    { type: 'function', function: { name: 'geo_elevation', description: 'Look up elevation (altitude) data for one or more geographic points', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['point', 'batch', 'profile'], description: 'Lookup type' }, lat: { type: 'number', description: 'Latitude (for point lookup)' }, lon: { type: 'number', description: 'Longitude (for point lookup)' }, points: { type: 'array', items: { type: 'string' }, description: 'Array of {lat, lon} for batch lookup' }, samples: { type: 'number', description: 'Number of samples for profile along path' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'geo_ip', description: 'Geo-locate an IP address to get country, region, city, lat/lon, and organization', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['lookup', 'batch', 'threat_check'], description: 'Lookup action' }, ip: { type: 'string', description: 'IP address to geolocate' }, ips: { type: 'array', items: { type: 'string' }, description: 'Array of IP addresses for batch lookup' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'geo_search', description: 'Search for places, addresses, or POIs by query term and optional bounding box', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['search', 'nearby', 'category', 'autocomplete'], description: 'Search type' }, query: { type: 'string', description: 'Search query' }, lat: { type: 'number', description: 'Center latitude for nearby search' }, lon: { type: 'number', description: 'Center longitude for nearby search' }, radius: { type: 'number', description: 'Search radius in km' }, category: { type: 'string', description: 'POI category filter' }, limit: { type: 'number', description: 'Max results' } }, required: ['action', 'query'] } } },
    { type: 'function', function: { name: 'geo_transform', description: 'Transform or re-project geographic coordinates between CRS formats (WGS84, UTM, etc.)', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['convert', 'reproject', 'format_geojson', 'kml_to_geojson', 'geojson_to_kml'], description: 'Transform action' }, data: { type: 'string', description: 'Input coordinate or feature data' }, fromCRS: { type: 'string', description: 'Source coordinate reference system (e.g. WGS84, EPSG:4326)' }, toCRS: { type: 'string', description: 'Target coordinate reference system (e.g. UTM, EPSG:3857)' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'geo_address_validate', description: 'Validate and standardize postal addresses, verify deliverability', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['validate', 'standardize', 'verify'], description: 'Validation action' }, address: { type: 'string', description: 'Full address string to validate' }, country: { type: 'string', description: 'Country code (ISO 3166-1 alpha-2)' } }, required: ['action', 'address'] } } },
    { type: 'function', function: { name: 'geo_ip_locate', description: 'Geolocate an IP address to get country, region, city, coordinates, timezone, and org', parameters: { type: 'object', properties: { ip: { type: 'string', description: 'IP address to geolocate' } }, required: ['ip'] } } },
    { type: 'function', function: { name: 'geo_poi', description: 'Search for points of interest near coordinates by category and radius', parameters: { type: 'object', properties: { lat: { type: 'number', description: 'Center latitude' }, lon: { type: 'number', description: 'Center longitude' }, category: { type: 'string', description: 'POI category (restaurant, hotel, atm, etc.)' }, radius: { type: 'number', description: 'Search radius in meters (default 1000)' } }, required: ['lat', 'lon'] } } },

    // ── COMMUNICATION ──────────────────────────────────────────────────────
    { type: 'function', function: { name: 'sms_send', description: 'Send an SMS message to a phone number via Twilio or configured provider', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['send', 'schedule', 'list', 'status'], description: 'Action to perform' }, to: { type: 'string', description: 'Recipient phone number in E.164 format (+1234567890)' }, message: { type: 'string', description: 'SMS message content (max 160 chars for standard SMS)' }, scheduledTime: { type: 'string', description: 'Scheduled send time (ISO format, for schedule action)' }, messageId: { type: 'string', description: 'Message ID (for status check)' } }, required: ['action', 'to', 'message'] } } },
    { type: 'function', function: { name: 'notification_send', description: 'Send in-app, email, push, or Slack notifications to users', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['send', 'batch', 'list', 'status'], description: 'Action to perform' }, channel: { type: 'string', enum: ['in_app', 'email', 'push', 'slack', 'webhook'], description: 'Notification channel' }, to: { type: 'string', description: 'Recipient user ID, email, or channel identifier' }, title: { type: 'string', description: 'Notification title' }, message: { type: 'string', description: 'Notification body content' }, data: { type: 'object', description: 'Additional payload data' } }, required: ['action', 'channel', 'message'] } } },

    // ── CRM & CUSTOMER ────────────────────────────────────────────────────
    { type: 'function', function: { name: 'customer_profile', description: 'Create, update, or query CRM customer profiles', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['create', 'update', 'get', 'list', 'delete', 'merge', 'search'], description: 'Action to perform' }, name: { type: 'string', description: 'Customer full name' }, email: { type: 'string', description: 'Customer email address' }, company: { type: 'string', description: 'Company name' }, phone: { type: 'string', description: 'Phone number' }, tags: { type: 'array', items: { type: 'string' }, description: 'Customer tags/segments' }, customFields: { type: 'object', description: 'Custom field values' }, customerId: { type: 'string', description: 'Customer ID (for update/get/delete)' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'lead_track', description: 'Create or update CRM lead records and track stage progression', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['create', 'update', 'qualify', 'disqualify', 'list', 'get', 'convert'], description: 'Action to perform' }, name: { type: 'string', description: 'Lead name' }, email: { type: 'string', description: 'Lead email' }, company: { type: 'string', description: 'Lead company' }, source: { type: 'string', description: 'Lead source (website, referral, ad, etc.)' }, stage: { type: 'string', description: 'Pipeline stage' }, score: { type: 'number', description: 'Lead score (0-100)' }, leadId: { type: 'string', description: 'Lead ID (for update/qualify/convert)' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'kpi_dashboard', description: 'Create or update a KPI dashboard with metric definitions and targets', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['create', 'update', 'get', 'list', 'refresh', 'delete'], description: 'Action to perform' }, name: { type: 'string', description: 'Dashboard name' }, kpis: { type: 'array', items: { type: 'object' }, description: 'Array of KPI definitions with name, metric, target, and unit' }, period: { type: 'string', description: 'Reporting period' }, dashboardId: { type: 'string', description: 'Dashboard ID (for update/get/refresh)' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'cohort_analyze', description: 'Perform cohort retention or behavioral analysis on user segments', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['retention', 'behavioral', 'ltv', 'churn', 'compare'], description: 'Analysis type' }, cohortBy: { type: 'string', description: 'Cohort definition field (signup_date, plan, country, etc.)' }, period: { type: 'string', description: 'Analysis period (monthly, weekly)' }, metric: { type: 'string', description: 'Metric to analyze (revenue, sessions, purchases, etc.)' }, segments: { type: 'array', items: { type: 'object' }, description: 'Specific cohort segments to compare' } }, required: ['action'] } } },

    // ── ANALYTICS UTILITIES ───────────────────────────────────────────────
    { type: 'function', function: { name: 'analytics_export', description: 'Export analytics event data with time range and filter options', parameters: { type: 'object', properties: { format: { type: 'string', enum: ['csv', 'json', 'xlsx', 'parquet'], description: 'Export format' }, hours: { type: 'number', description: 'Number of hours back to export (default 24)' }, eventFilter: { type: 'string', description: 'Filter to specific event type' }, limit: { type: 'number', description: 'Max events to export' } }, required: ['format'] } } },
    { type: 'function', function: { name: 'log_aggregate', description: 'Aggregate and group log lines by field, returning top-N summaries', parameters: { type: 'object', properties: { input: { type: 'string', description: 'Log content as text' }, groupBy: { type: 'string', description: 'Field to group by (level, service, status_code, etc.)' }, topN: { type: 'number', description: 'Number of top results to return (default 10)' } }, required: ['input'] } } },
    { type: 'function', function: { name: 'metrics_collect', description: 'Record or query named metrics with optional tag dimensions', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['record', 'query', 'list', 'delete'], description: 'Action to perform' }, name: { type: 'string', description: 'Metric name' }, value: { type: 'number', description: 'Metric value (for record action)' }, tags: { type: 'object', description: 'Tag dimensions as key-value pairs' }, period: { type: 'string', description: 'Query period (for query action)' } }, required: ['action'] } } },

    // ── AGENT SYSTEM ──────────────────────────────────────────────────────
    { type: 'function', function: { name: 'agent_metrics', description: 'Collect and report performance and usage metrics for agents', parameters: { type: 'object', properties: { agentId: { type: 'string', description: 'Agent ID to get metrics for (null for all)' }, period: { type: 'string', description: 'Metrics period (last_hour, last_24h, last_7d)' }, metrics: { type: 'array', items: { type: 'object' }, description: 'Specific metrics to retrieve (latency, cost, success_rate, tool_calls)' } }, required: [] } } },
    { type: 'function', function: { name: 'agent_spawn', description: 'Spawn sub-agents with specific goals, tools, and constraints; track progress and collect results', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['spawn', 'status', 'collect', 'terminate', 'list'], description: 'Spawn action' }, goal: { type: 'string', description: 'Goal for the sub-agent' }, model: { type: 'string', description: 'Model to use (default: gpt-4o-mini)' }, tools: { type: 'array', items: { type: 'string' }, description: 'Tools available to the sub-agent' }, maxSteps: { type: 'number', description: 'Max agent steps' }, timeout: { type: 'number', description: 'Timeout in seconds' }, agentId: { type: 'string', description: 'Agent ID (for status/collect/terminate)' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'agent_reflect', description: 'Self-assess, critique, and improve agent outputs with reflection scoring and improvement suggestions', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['reflect', 'critique', 'improve', 'score', 'history'], description: 'Reflection action' }, output: { type: 'string', description: 'Output to reflect on' }, task: { type: 'string', description: 'Original task description' }, criteria: { type: 'array', items: { type: 'string' }, description: 'Evaluation criteria' }, depth: { type: 'number', description: 'Reflection depth levels' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'agent_handoff', description: 'Transfer tasks between agents with context preservation, accept/reject, and rollback support', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['handoff', 'accept', 'reject', 'status', 'history', 'rollback'], description: 'Handoff action' }, toAgent: { type: 'string', description: 'Target agent for handoff' }, fromAgent: { type: 'string', description: 'Source agent' }, reason: { type: 'string', description: 'Reason for handoff' }, context: { type: 'object', description: 'Context to transfer' }, preserveHistory: { type: 'boolean', description: 'Preserve conversation history' }, handoffId: { type: 'string', description: 'Handoff ID (for accept/reject/status/rollback)' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'agent_memory_search', description: 'Search agent memory for relevant past interactions, facts, and stored context', parameters: { type: 'object', properties: { query: { type: 'string', description: 'Search query' }, limit: { type: 'number', description: 'Max results (default 10)' } }, required: ['query'] } } },
    { type: 'function', function: { name: 'prompt_template', description: 'Render prompt templates with variable substitution using {{variable}} syntax', parameters: { type: 'object', properties: { template: { type: 'string', description: 'Template string with {{variable}} placeholders' }, variables: { type: 'object', description: 'Key-value pairs for variable substitution' } }, required: ['template'] } } },
    { type: 'function', function: { name: 'agent_workflow', description: 'Create, run, and inspect multi-step agent workflows with state tracking', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['create', 'run', 'pause', 'resume', 'cancel', 'get', 'list'], description: 'Workflow action' }, name: { type: 'string', description: 'Workflow name' }, steps: { type: 'array', items: { type: 'object' }, description: 'Workflow steps with agent, input, and conditions' }, workflowId: { type: 'string', description: 'Workflow ID (for run/pause/resume/cancel/get)' }, input: { type: 'object', description: 'Initial input for the workflow run' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'ab_test', description: 'Create and manage A/B test experiments and retrieve statistical results', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['create', 'start', 'stop', 'results', 'list', 'get', 'winner'], description: 'Action to perform' }, name: { type: 'string', description: 'Experiment name' }, variants: { type: 'array', items: { type: 'object' }, description: 'List of variants with names and weights' }, metric: { type: 'string', description: 'Primary metric to optimize for' }, hypothesis: { type: 'string', description: 'Test hypothesis' }, sampleSize: { type: 'number', description: 'Required sample size per variant' }, testId: { type: 'string', description: 'Test ID (for start/stop/results/winner)' } }, required: ['action'] } } },

    // ── MARKDOWN UTILITIES ────────────────────────────────────────────────
    { type: 'function', function: { name: 'markdown_extract', description: 'Extract headers, links, code blocks, tables, or frontmatter from Markdown content', parameters: { type: 'object', properties: { input: { type: 'string', description: 'Markdown content to extract from' }, action: { type: 'string', enum: ['headers', 'links', 'code_blocks', 'tables', 'frontmatter', 'images'], description: 'What to extract' }, options: { type: 'object', description: 'Extraction options (depth limit for headers, etc.)' } }, required: ['input', 'action'] } } },
    { type: 'function', function: { name: 'markdown_merge', description: 'Concatenate multiple Markdown files into a single document', parameters: { type: 'object', properties: { files: { type: 'array', items: { type: 'object' }, description: 'Array of file paths to merge' }, separator: { type: 'string', description: 'Separator between documents (default: \\n\\n---\\n\\n)' }, addTitles: { type: 'boolean', description: 'Add filename as H2 title before each document' } }, required: ['files'] } } },
    { type: 'function', function: { name: 'markdown_slides', description: 'Convert Markdown content into a slide deck (Reveal.js, Marp, or PPTX)', parameters: { type: 'object', properties: { input: { type: 'string', description: 'Markdown content to convert to slides' }, format: { type: 'string', enum: ['revealjs', 'marp', 'pptx', 'html'], description: 'Output slide format' }, separator: { type: 'string', description: 'Slide separator (default: \\n---\\n)' }, theme: { type: 'string', description: 'Slide theme (dark, light, solarized, etc.)' } }, required: ['input'] } } },

    // ── WORKFLOW UTILITIES ────────────────────────────────────────────────
    { type: 'function', function: { name: 'workflow_history', description: 'Retrieve execution history, logs, and audit trail for a workflow', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['list', 'get', 'logs', 'replay'], description: 'Action to perform' }, workflowId: { type: 'string', description: 'Workflow ID to get history for' }, runId: { type: 'string', description: 'Specific run ID (for get/logs)' }, limit: { type: 'number', description: 'Max history entries to return' }, since: { type: 'string', description: 'Filter runs after this date' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'workflow_template', description: 'Create, list, clone, or apply a reusable workflow template', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['create', 'list', 'get', 'clone', 'apply', 'delete'], description: 'Action to perform' }, name: { type: 'string', description: 'Template name' }, description: { type: 'string', description: 'Template description' }, steps: { type: 'array', items: { type: 'object' }, description: 'Workflow step definitions' }, templateId: { type: 'string', description: 'Template ID (for get/clone/apply/delete)' }, variables: { type: 'object', description: 'Variable values for apply action' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'workflow_validate', description: 'Validate a workflow definition\'s structure, steps, dependencies, and conditions', parameters: { type: 'object', properties: { definition: { type: 'object', description: 'Workflow definition object to validate' }, strict: { type: 'boolean', description: 'Enable strict validation mode' } }, required: ['definition'] } } },

    // ── WEB & FILES ───────────────────────────────────────────────────────
    { type: 'function', function: { name: 'fetch_webpage', description: 'Fetch a webpage and optionally extract specific content (text, links, tables)', parameters: { type: 'object', properties: { url: { type: 'string', description: 'URL to fetch' }, extract: { type: 'string', enum: ['text', 'links', 'tables', 'images', 'headings', 'full_html'], description: 'What to extract from the page' } }, required: ['url'] } } },
    { type: 'function', function: { name: 'read_json', description: 'Read a JSON file and optionally extract a nested key path using dot notation', parameters: { type: 'object', properties: { file: { type: 'string', description: 'Path to the JSON file' }, key: { type: 'string', description: 'Dot-notation key path to extract (e.g. user.address.city)' } }, required: ['file'] } } },
    { type: 'function', function: { name: 'summarize_file', description: 'Read a file from the workspace and return an AI-generated summary of its contents', parameters: { type: 'object', properties: { file: { type: 'string', description: 'Path to the file to summarize' } }, required: ['file'] } } },

    // ── CONTEXT MANAGEMENT ────────────────────────────────────────────────
    { type: 'function', function: { name: 'save_context', description: 'Persist a key/value pair to agent context storage for later recall across turns', parameters: { type: 'object', properties: { key: { type: 'string', description: 'Context key name' }, value: { type: 'string', description: 'Value to store (string, JSON, or text)' }, agentId: { type: 'string', description: 'Agent ID scope (null for user-level)' } }, required: ['key', 'value'] } } },
    { type: 'function', function: { name: 'recall_context', description: 'Retrieve a previously saved context value by key for this agent/user', parameters: { type: 'object', properties: { key: { type: 'string', description: 'Context key to retrieve' }, agentId: { type: 'string', description: 'Agent ID scope (null for user-level)' } }, required: ['key'] } } },

    // ── REASONING & ML ────────────────────────────────────────────────────
    { type: 'function', function: { name: 'think_step_by_step', description: 'Decompose a topic or problem into a numbered chain-of-thought reasoning outline', parameters: { type: 'object', properties: { topic: { type: 'string', description: 'Topic or problem to reason through step by step' }, depth: { type: 'number', description: 'Number of reasoning depth levels (default 3)' } }, required: ['topic'] } } },
    { type: 'function', function: { name: 'ml_pipeline', description: 'Create, run, and inspect named ML pipeline steps (preprocessing, training, evaluation)', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['create', 'run', 'get', 'list', 'cancel', 'logs'], description: 'Action to perform' }, name: { type: 'string', description: 'Pipeline name' }, pipelineId: { type: 'string', description: 'Pipeline ID (for run/get/cancel/logs)' }, step: { type: 'string', description: 'Specific step to run (for run action)' }, data: { type: 'object', description: 'Input data or configuration for the step' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'model_explain', description: 'Generate SHAP/LIME-style explanations or feature importance summaries for ML model predictions', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['summary', 'feature_importance', 'shap', 'lime', 'partial_dependence'], description: 'Explanation type' }, modelId: { type: 'string', description: 'Model ID to explain' }, input: { type: 'object', description: 'Input features to explain predictions for' }, topN: { type: 'number', description: 'Top N features to show in explanation' } }, required: ['action', 'modelId'] } } },

    // ── API UTILITIES ─────────────────────────────────────────────────────
    { type: 'function', function: { name: 'api_diff', description: 'Compare two API specs or responses and surface structural differences', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['diff', 'breaking_changes', 'changelog'], description: 'Comparison type' }, before: { type: 'string', description: 'Original API spec or response (JSON/YAML)' }, after: { type: 'string', description: 'New API spec or response to compare against' }, options: { type: 'object', description: 'Comparison options (ignore_description, strict_mode, etc.)' } }, required: ['action', 'before', 'after'] } } },
    { type: 'function', function: { name: 'api_proxy', description: 'Proxy an HTTP request through a configured proxy with optional transforms', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['proxy', 'configure', 'list'], description: 'Action to perform' }, url: { type: 'string', description: 'Target URL to proxy' }, method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], description: 'HTTP method' }, headers: { type: 'object', description: 'Request headers to forward/override' }, body: { type: 'string', description: 'Request body' }, proxyConfig: { type: 'object', description: 'Proxy configuration (host, port, auth, transforms)' } }, required: ['action', 'url'] } } },
    { type: 'function', function: { name: 'api_security', description: 'Audit API authentication, authorization, and security posture', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['auth_audit', 'vuln_scan', 'rate_limit_check', 'cors_check', 'report'], description: 'Security check type' }, endpoint: { type: 'string', description: 'API endpoint URL to audit' }, spec: { type: 'string', description: 'OpenAPI/Swagger spec content' }, checks: { type: 'array', items: { type: 'object' }, description: 'Specific security checks to run' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'api_validate', description: 'Validate a request/response payload against a JSON Schema or OpenAPI spec', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['validate', 'coerce', 'explain'], description: 'Validation action' }, input: { type: 'string', description: 'JSON payload to validate' }, schema: { type: 'string', description: 'JSON Schema or OpenAPI component schema' }, options: { type: 'object', description: 'Validation options (strict, allowAdditional, etc.)' } }, required: ['action', 'input', 'schema'] } } },

    // ── SUPPLY CHAIN & CALENDAR ───────────────────────────────────────────
    { type: 'function', function: { name: 'supply_chain', description: 'Generate an SBOM (Software Bill of Materials) or audit software supply chain dependencies', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['sbom_generate', 'audit', 'risk_score', 'list_components', 'check_licenses'], description: 'Action to perform' }, source: { type: 'string', description: 'Project root path or package manifest content' }, format: { type: 'string', enum: ['spdx', 'cyclonedx', 'json', 'csv'], description: 'SBOM output format' }, level: { type: 'string', enum: ['shallow', 'deep', 'recursive'], description: 'Dependency analysis depth' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'security_audit', description: 'Run a comprehensive security audit: vulnerability scan, config review, dependency check', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['full_audit', 'quick_scan', 'config_review', 'dependency_check', 'report'], description: 'Audit action' }, target: { type: 'string', description: 'Target path, URL, or project to audit' }, scope: { type: 'string', enum: ['full', 'code', 'deps', 'config', 'network'], description: 'Audit scope' }, format: { type: 'string', enum: ['json', 'html', 'pdf', 'markdown'], description: 'Report format' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'security_compliance', description: 'Check compliance against security frameworks: SOC2, HIPAA, PCI-DSS, GDPR, ISO 27001', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['compliance_check', 'gap_analysis', 'report', 'remediate'], description: 'Compliance action' }, framework: { type: 'string', enum: ['soc2', 'hipaa', 'pci_dss', 'gdpr', 'iso27001', 'nist'], description: 'Compliance framework' }, scope: { type: 'string', description: 'Audit scope or project path' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'security_firewall', description: 'Manage WAF rules, IP blocklists, rate limits, and firewall policies', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['rule_list', 'rule_create', 'rule_update', 'rule_delete', 'ip_block', 'ip_whitelist', 'stats'], description: 'Firewall action' }, ruleId: { type: 'string', description: 'Rule ID' }, rule: { type: 'object', description: 'Rule definition' }, ip: { type: 'string', description: 'IP address or CIDR' }, provider: { type: 'string', enum: ['cloudflare', 'aws_waf', 'azure_waf'], description: 'WAF provider' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'security_forensics', description: 'Run forensic investigation: timeline analysis, log correlation, indicator search, evidence collection', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['forensic_timeline', 'ioc_search', 'correlate', 'evidence_collect', 'report'], description: 'Forensics action' }, query: { type: 'string', description: 'Search query or indicator' }, timeRange: { type: 'string', description: 'Time range for investigation' }, sources: { type: 'array', items: { type: 'string' }, description: 'Log sources to search' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'security_pentest', description: 'Run authorized penetration testing: port scanning, service detection, vulnerability scanning', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['full_scan', 'port_scan', 'service_detect', 'vuln_scan', 'osint', 'report'], description: 'Pentest action' }, target: { type: 'string', description: 'Target host or domain (must have authorization)' }, depth: { type: 'string', enum: ['light', 'moderate', 'deep'], description: 'Scan depth' }, authorization: { type: 'string', description: 'Authorization token' } }, required: ['action', 'target'] } } },
    { type: 'function', function: { name: 'security_rbac', description: 'Audit and manage role-based access control: check permissions, audit roles, review policies', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['rbac_audit', 'permission_check', 'role_list', 'policy_review', 'least_privilege'], description: 'RBAC action' }, userId: { type: 'string', description: 'User ID to audit' }, role: { type: 'string', description: 'Role name' }, resource: { type: 'string', description: 'Resource to check' }, provider: { type: 'string', enum: ['aws', 'gcp', 'azure'], description: 'Cloud provider' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'calendar_manage', description: 'Create, update, list, or delete calendar events', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['create', 'update', 'delete', 'list', 'get', 'find_availability'], description: 'Action to perform' }, title: { type: 'string', description: 'Event title' }, startTime: { type: 'string', description: 'Event start time (ISO format)' }, endTime: { type: 'string', description: 'Event end time (ISO format)' }, attendees: { type: 'array', items: { type: 'string' }, description: 'Array of attendee emails' }, description: { type: 'string', description: 'Event description/agenda' }, location: { type: 'string', description: 'Event location or video call URL' }, eventId: { type: 'string', description: 'Event ID (for update/delete/get)' }, calendarId: { type: 'string', description: 'Calendar ID (default: primary)' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'meeting_schedule', description: 'Schedule a meeting with attendees, agenda, and conferencing link', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['schedule', 'reschedule', 'cancel', 'list', 'get', 'send_invites'], description: 'Action to perform' }, title: { type: 'string', description: 'Meeting title' }, attendees: { type: 'array', items: { type: 'string' }, description: 'Array of attendee emails' }, startTime: { type: 'string', description: 'Meeting start time (ISO format)' }, duration: { type: 'number', description: 'Duration in minutes' }, agenda: { type: 'string', description: 'Meeting agenda' }, conferencing: { type: 'string', enum: ['zoom', 'google_meet', 'teams', 'phone', 'in_person'], description: 'Conferencing type' }, meetingId: { type: 'string', description: 'Meeting ID (for reschedule/cancel/get)' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'ip_search', description: 'Search intellectual property databases for trademarks, patents, and copyrights', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['search', 'status', 'similar', 'monitor'], description: 'Search action' }, query: { type: 'string', description: 'Term or description to search for' }, type: { type: 'string', enum: ['trademark', 'patent', 'copyright', 'all'], description: 'IP type to search' }, jurisdiction: { type: 'string', description: 'Jurisdiction to search (US, EU, WO, etc.)' }, class: { type: 'string', description: 'Nice class for trademark search (01-45)' } }, required: ['action', 'query'] } } },

    // ── IMAGE TOOLS (11 new) ──────────────────────────────────────────────
    { type: 'function', function: { name: 'image_create', description: 'Create images from scratch: generate blank canvas, gradient, pattern, placeholder, or AI-generated images', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['blank', 'gradient', 'pattern', 'placeholder', 'generate', 'noise', 'solid', 'checkerboard'], description: 'Creation action' }, width: { type: 'number', description: 'Image width in pixels' }, height: { type: 'number', description: 'Image height in pixels' }, color: { type: 'string', description: 'Primary color (hex or named)' }, format: { type: 'string', enum: ['png', 'jpg', 'webp', 'svg'], description: 'Output format' }, prompt: { type: 'string', description: 'AI generation prompt' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'image_transform', description: 'Transform images: resize, rotate, flip, crop, skew, perspective warp, and affine transforms', parameters: { type: 'object', properties: { file: { type: 'string', description: 'Input image file path or URL' }, action: { type: 'string', enum: ['resize', 'rotate', 'flip', 'crop', 'skew', 'perspective', 'affine', 'thumbnail'], description: 'Transform action' }, width: { type: 'number', description: 'Target width' }, height: { type: 'number', description: 'Target height' }, angle: { type: 'number', description: 'Rotation angle in degrees' }, direction: { type: 'string', enum: ['horizontal', 'vertical', 'both'], description: 'Flip direction' } }, required: ['file', 'action'] } } },
    { type: 'function', function: { name: 'image_convert', description: 'Convert images between formats: PNG, JPG, WebP, SVG, TIFF, BMP, GIF, AVIF, ICO', parameters: { type: 'object', properties: { file: { type: 'string', description: 'Input image file path or URL' }, action: { type: 'string', enum: ['convert', 'optimize', 'compress', 'strip_metadata'], description: 'Conversion action' }, format: { type: 'string', enum: ['png', 'jpg', 'webp', 'svg', 'tiff', 'bmp', 'gif', 'avif', 'ico'], description: 'Target format' }, quality: { type: 'number', description: 'Output quality (1-100)' } }, required: ['file', 'action'] } } },
    { type: 'function', function: { name: 'image_compose', description: 'Compose multiple images: overlay, collage, montage, watermark, stitch, blend', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['overlay', 'collage', 'montage', 'watermark', 'stitch', 'blend', 'tile', 'mosaic'], description: 'Composition action' }, images: { type: 'array', items: { type: 'object' }, description: 'Array of image file paths or URLs' }, layout: { type: 'string', description: 'Layout specification' }, opacity: { type: 'number', description: 'Overlay opacity (0-1)' }, position: { type: 'string', description: 'Position for overlay/watermark' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'image_filter', description: 'Apply filters to images: blur, sharpen, grayscale, sepia, emboss, edge detection, HDR', parameters: { type: 'object', properties: { file: { type: 'string', description: 'Input image file path or URL' }, filters: { type: 'array', items: { type: 'object' }, description: 'Array of filters to apply' }, intensity: { type: 'number', description: 'Filter intensity (0-100)' }, preset: { type: 'string', enum: ['vintage', 'dramatic', 'soft', 'vivid', 'cinematic', 'noir'], description: 'Filter preset' } }, required: ['file'] } } },
    { type: 'function', function: { name: 'image_analyze', description: 'Analyze images: histogram, color palette extraction, quality metrics, similarity comparison', parameters: { type: 'object', properties: { file: { type: 'string', description: 'Input image file path or URL' }, action: { type: 'string', enum: ['histogram', 'palette', 'quality', 'similarity', 'metadata', 'dominant_colors', 'dimensions', 'hash'], description: 'Analysis action' }, compareWith: { type: 'string', description: 'Second image for comparison' } }, required: ['file', 'action'] } } },
    { type: 'function', function: { name: 'image_batch', description: 'Batch process multiple images with the same operations: resize, convert, filter, rename', parameters: { type: 'object', properties: { files: { type: 'array', items: { type: 'object' }, description: 'Array of image file paths or URLs' }, operations: { type: 'array', items: { type: 'object' }, description: 'Operations to apply to each image' }, outputDir: { type: 'string', description: 'Output directory' }, namingPattern: { type: 'string', description: 'Output naming pattern (e.g. "{name}_thumb.{ext}")' } }, required: ['files', 'operations'] } } },
    { type: 'function', function: { name: 'image_background', description: 'Background operations: remove, replace, blur, make transparent, change color', parameters: { type: 'object', properties: { file: { type: 'string', description: 'Input image file path or URL' }, action: { type: 'string', enum: ['remove', 'replace', 'blur', 'transparent', 'change_color', 'gradient'], description: 'Background action' }, color: { type: 'string', description: 'Replacement color or background image' }, blurRadius: { type: 'number', description: 'Blur radius' } }, required: ['file', 'action'] } } },
    { type: 'function', function: { name: 'image_face', description: 'Face operations: detect faces, crop faces, blur faces, swap faces, apply masks', parameters: { type: 'object', properties: { file: { type: 'string', description: 'Input image file path or URL' }, action: { type: 'string', enum: ['detect', 'crop', 'blur', 'mask', 'landmarks', 'emotion', 'age_estimate'], description: 'Face action' }, outputFormat: { type: 'string', description: 'Output format' } }, required: ['file', 'action'] } } },

    // ── VIDEO TOOLS (8 new) ───────────────────────────────────────────────
    { type: 'function', function: { name: 'video_transform', description: 'Transform videos: resize, rotate, crop, trim, speed change, reverse', parameters: { type: 'object', properties: { file: { type: 'string', description: 'Input video file path or URL' }, action: { type: 'string', enum: ['resize', 'rotate', 'crop', 'trim', 'speed', 'reverse', 'stabilize', 'loop'], description: 'Transform action' }, width: { type: 'number', description: 'Target width' }, height: { type: 'number', description: 'Target height' }, startTime: { type: 'string', description: 'Start time for trim (HH:MM:SS)' }, endTime: { type: 'string', description: 'End time for trim (HH:MM:SS)' }, speed: { type: 'number', description: 'Speed multiplier' } }, required: ['file', 'action'] } } },
    { type: 'function', function: { name: 'video_convert', description: 'Convert videos between formats: MP4, WebM, AVI, MOV, MKV, GIF', parameters: { type: 'object', properties: { file: { type: 'string', description: 'Input video file path or URL' }, action: { type: 'string', enum: ['convert', 'compress', 'optimize', 'extract_frames', 'to_gif'], description: 'Conversion action' }, format: { type: 'string', enum: ['mp4', 'webm', 'avi', 'mov', 'mkv', 'gif'], description: 'Target format' }, quality: { type: 'string', enum: ['low', 'medium', 'high', 'lossless'], description: 'Output quality' }, codec: { type: 'string', description: 'Video codec (h264, h265, vp9, av1)' } }, required: ['file', 'action'] } } },
    { type: 'function', function: { name: 'video_analyze', description: 'Analyze videos: metadata, duration, bitrate, scene detection, motion analysis', parameters: { type: 'object', properties: { file: { type: 'string', description: 'Input video file path or URL' }, action: { type: 'string', enum: ['metadata', 'scenes', 'motion', 'quality', 'thumbnails', 'silence_detect', 'bitrate_stats'], description: 'Analysis action' }, interval: { type: 'number', description: 'Sampling interval in seconds' } }, required: ['file', 'action'] } } },
    { type: 'function', function: { name: 'video_overlay', description: 'Add overlays to video: text, image watermark, subtitles, picture-in-picture', parameters: { type: 'object', properties: { file: { type: 'string', description: 'Input video file path or URL' }, action: { type: 'string', enum: ['text', 'watermark', 'subtitles', 'pip', 'logo', 'timestamp', 'border'], description: 'Overlay action' }, content: { type: 'string', description: 'Overlay content (text or image path)' }, position: { type: 'string', description: 'Overlay position' }, startTime: { type: 'string', description: 'Overlay start time' }, endTime: { type: 'string', description: 'Overlay end time' } }, required: ['file', 'action'] } } },
    { type: 'function', function: { name: 'video_filter', description: 'Apply filters to video: color grading, blur, sharpen, denoise, stabilize', parameters: { type: 'object', properties: { file: { type: 'string', description: 'Input video file path or URL' }, action: { type: 'string', enum: ['color_grade', 'blur', 'sharpen', 'denoise', 'stabilize', 'vintage', 'slow_motion', 'timelapse'], description: 'Filter action' }, intensity: { type: 'number', description: 'Filter intensity (0-100)' }, preset: { type: 'string', description: 'Filter preset name' } }, required: ['file', 'action'] } } },
    { type: 'function', function: { name: 'video_audio', description: 'Video audio operations: extract audio, replace audio, mix, volume adjust, mute', parameters: { type: 'object', properties: { file: { type: 'string', description: 'Input video file path or URL' }, action: { type: 'string', enum: ['extract', 'replace', 'mix', 'volume', 'mute', 'fade', 'normalize'], description: 'Audio action' }, audioFile: { type: 'string', description: 'Audio file for replace/mix' }, volume: { type: 'number', description: 'Volume level (0-200)' }, format: { type: 'string', enum: ['mp3', 'wav', 'aac', 'ogg', 'flac'], description: 'Audio output format' } }, required: ['file', 'action'] } } },
    { type: 'function', function: { name: 'video_ai', description: 'AI-powered video operations: object detection, scene classification, content moderation, transcription', parameters: { type: 'object', properties: { file: { type: 'string', description: 'Input video file path or URL' }, action: { type: 'string', enum: ['object_detect', 'scene_classify', 'moderate', 'transcribe', 'summarize', 'tag', 'face_detect'], description: 'AI action' }, language: { type: 'string', description: 'Language for transcription' }, confidence: { type: 'number', description: 'Minimum confidence threshold' } }, required: ['file', 'action'] } } },
    { type: 'function', function: { name: 'video_batch', description: 'Batch process multiple videos with the same operations', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['convert', 'compress', 'thumbnail', 'metadata', 'watermark'], description: 'Batch action' }, files: { type: 'array', items: { type: 'object' }, description: 'Array of video file paths or URLs' }, operations: { type: 'array', items: { type: 'object' }, description: 'Operations to apply' }, outputDir: { type: 'string', description: 'Output directory' } }, required: ['action', 'files'] } } },

    // ── ARCHIVE TOOLS (8 new) ─────────────────────────────────────────────
    { type: 'function', function: { name: 'archive_core', description: 'Core archive operations: create, extract, list, test, info for ZIP/TAR/GZ/7Z/RAR', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['create', 'extract', 'list', 'test', 'info', 'update'], description: 'Archive action' }, files: { type: 'array', items: { type: 'object' }, description: 'Files to archive or paths' }, format: { type: 'string', enum: ['zip', 'tar', 'gz', 'bz2', '7z', 'rar', 'tar.gz', 'tar.bz2'], description: 'Archive format' }, destination: { type: 'string', description: 'Output path' }, compression: { type: 'string', enum: ['none', 'fast', 'normal', 'maximum', 'ultra'], description: 'Compression level' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'archive_edit', description: 'Edit archive contents: add, remove, rename, or move files within an archive', parameters: { type: 'object', properties: { file: { type: 'string', description: 'Archive file path' }, action: { type: 'string', enum: ['add', 'remove', 'rename', 'move', 'replace', 'update'], description: 'Edit action' }, entries: { type: 'array', items: { type: 'object' }, description: 'Files/entries to modify' }, destination: { type: 'string', description: 'Destination path within archive' } }, required: ['file', 'action'] } } },
    { type: 'function', function: { name: 'archive_structure', description: 'Analyze and manipulate archive structure: tree view, diff, merge, split', parameters: { type: 'object', properties: { file: { type: 'string', description: 'Archive file path' }, action: { type: 'string', enum: ['tree', 'diff', 'merge', 'split', 'flatten', 'reorganize'], description: 'Structure action' }, compareWith: { type: 'string', description: 'Second archive for diff/merge' }, maxSize: { type: 'number', description: 'Max size per split part (bytes)' } }, required: ['file', 'action'] } } },
    { type: 'function', function: { name: 'archive_security', description: 'Archive security: encrypt, decrypt, password protect, scan for malware, verify integrity', parameters: { type: 'object', properties: { file: { type: 'string', description: 'Archive file path' }, action: { type: 'string', enum: ['encrypt', 'decrypt', 'password', 'scan', 'verify', 'sign', 'checksum'], description: 'Security action' }, password: { type: 'string', description: 'Password for encryption/decryption' }, algorithm: { type: 'string', enum: ['aes256', 'zip_standard', 'zip_aes'], description: 'Encryption algorithm' } }, required: ['file', 'action'] } } },
    { type: 'function', function: { name: 'archive_bulk', description: 'Bulk archive operations: batch create, batch extract, find across archives', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['batch_create', 'batch_extract', 'find', 'deduplicate', 'report'], description: 'Bulk action' }, archives: { type: 'array', items: { type: 'object' }, description: 'Array of archive paths' }, pattern: { type: 'string', description: 'Search pattern for find' }, outputDir: { type: 'string', description: 'Output directory' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'archive_convert', description: 'Convert archives between formats: ZIP to TAR, RAR to 7Z, etc.', parameters: { type: 'object', properties: { file: { type: 'string', description: 'Source archive file path' }, action: { type: 'string', enum: ['convert', 'recompress', 'optimize'], description: 'Conversion action' }, format: { type: 'string', enum: ['zip', 'tar', 'gz', '7z', 'tar.gz', 'tar.bz2'], description: 'Target format' }, compression: { type: 'string', description: 'Compression level' } }, required: ['file', 'action'] } } },
    { type: 'function', function: { name: 'archive_intelligence', description: 'Smart archive analysis: content search, duplicate detection, size analysis, metadata extraction', parameters: { type: 'object', properties: { file: { type: 'string', description: 'Archive file path' }, action: { type: 'string', enum: ['search', 'duplicates', 'size_analysis', 'metadata', 'classify', 'preview'], description: 'Intelligence action' }, query: { type: 'string', description: 'Search query' }, recursive: { type: 'boolean', description: 'Search recursively in nested archives' } }, required: ['file', 'action'] } } },
    { type: 'function', function: { name: 'archive_deploy', description: 'Archive deployment: package for deployment, create release bundles, deploy to targets', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['package', 'release', 'deploy', 'rollback', 'verify'], description: 'Deploy action' }, source: { type: 'string', description: 'Source directory or files' }, target: { type: 'string', description: 'Deployment target' }, version: { type: 'string', description: 'Version tag' }, exclude: { type: 'array', items: { type: 'string' }, description: 'Patterns to exclude' } }, required: ['action'] } } },

    // ── DEV TOOLS (4 new) ─────────────────────────────────────────────────
    { type: 'function', function: { name: 'dev_filesystem', description: 'Advanced filesystem operations: watch, sync, compare directories, disk usage, permissions', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['watch', 'sync', 'compare', 'disk_usage', 'permissions', 'symlink', 'find_large', 'tree'], description: 'Filesystem action' }, path: { type: 'string', description: 'Target path' }, target: { type: 'string', description: 'Target path for sync/compare' }, pattern: { type: 'string', description: 'File pattern to match' }, recursive: { type: 'boolean', description: 'Recurse into subdirectories' } }, required: ['action', 'path'] } } },
    { type: 'function', function: { name: 'dev_search', description: 'Advanced code search: regex search, semantic search, symbol search, reference search', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['regex', 'semantic', 'symbol', 'references', 'definition', 'ripgrep', 'fuzzy'], description: 'Search action' }, query: { type: 'string', description: 'Search query or pattern' }, path: { type: 'string', description: 'Search scope path' }, language: { type: 'string', description: 'Filter by language' }, maxResults: { type: 'number', description: 'Max results to return' } }, required: ['action', 'query'] } } },
    { type: 'function', function: { name: 'dev_intelligence', description: 'Code intelligence: complexity analysis, dependency graph, tech debt score, code smells', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['complexity', 'dependencies', 'tech_debt', 'code_smells', 'coverage', 'metrics', 'hotspots'], description: 'Intelligence action' }, path: { type: 'string', description: 'Code path to analyze' }, language: { type: 'string', description: 'Programming language' }, threshold: { type: 'number', description: 'Severity threshold' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'dev_debug', description: 'Debugging utilities: stack trace analysis, memory profiling, performance profiling, log analysis', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['stack_trace', 'memory_profile', 'perf_profile', 'log_analyze', 'breakpoint', 'heap_snapshot', 'flame_graph'], description: 'Debug action' }, input: { type: 'string', description: 'Input data (stack trace, log content, etc.)' }, language: { type: 'string', description: 'Programming language context' }, options: { type: 'object', description: 'Debug options' } }, required: ['action'] } } },

    // ── WEB TOOLS (4 new) ─────────────────────────────────────────────────
    { type: 'function', function: { name: 'web_analyze', description: 'Web analysis: SEO audit, accessibility check, performance audit, broken links, security headers', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['seo', 'accessibility', 'performance', 'broken_links', 'security_headers', 'meta_tags', 'structured_data'], description: 'Analysis action' }, url: { type: 'string', description: 'URL to analyze' }, depth: { type: 'number', description: 'Crawl depth for link checking' } }, required: ['action', 'url'] } } },
    { type: 'function', function: { name: 'web_scaffold', description: 'Scaffold web projects: generate boilerplate, components, pages, API routes, configs', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['project', 'component', 'page', 'api_route', 'config', 'layout', 'form'], description: 'Scaffold action' }, framework: { type: 'string', enum: ['react', 'vue', 'svelte', 'next', 'nuxt', 'astro', 'vanilla'], description: 'Web framework' }, name: { type: 'string', description: 'Component/project name' }, template: { type: 'string', description: 'Template to use' }, typescript: { type: 'boolean', description: 'Use TypeScript' } }, required: ['action', 'name'] } } },
    { type: 'function', function: { name: 'web_optimize', description: 'Web optimization: minify, bundle, compress, lazy load, critical CSS, image optimization', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['minify', 'bundle', 'compress', 'lazy_load', 'critical_css', 'image_optimize', 'tree_shake', 'code_split'], description: 'Optimization action' }, input: { type: 'string', description: 'Input file or content' }, type: { type: 'string', enum: ['html', 'css', 'js', 'images', 'fonts'], description: 'Asset type' }, options: { type: 'object', description: 'Optimization options' } }, required: ['action'] } } },
    { type: 'function', function: { name: 'web_transform', description: 'Web content transforms: HTML to Markdown, CSS preprocessor compile, template rendering', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['html_to_md', 'md_to_html', 'sass_compile', 'less_compile', 'template_render', 'jsx_transform', 'prettify'], description: 'Transform action' }, input: { type: 'string', description: 'Input content' }, format: { type: 'string', description: 'Input/output format' }, options: { type: 'object', description: 'Transform options' } }, required: ['action', 'input'] } } },

    // ── AGENT DELEGATE (1 new) ────────────────────────────────────────────
    { type: 'function', function: { name: 'agent_delegate', description: 'Delegate tasks to specialized sub-agents: research, code review, data analysis, content generation', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['research', 'code_review', 'analyze', 'generate', 'translate', 'summarize', 'classify'], description: 'Delegation action' }, task: { type: 'string', description: 'Task description for the sub-agent' }, context: { type: 'string', description: 'Additional context for the task' }, model: { type: 'string', description: 'Preferred model for the sub-agent' }, maxTokens: { type: 'number', description: 'Max tokens for sub-agent response' } }, required: ['action', 'task'] } } },
];

// All agents get access to every tool (legacy — used as fallback / full list source)
function getToolsForAgent() {
    return STUDIO_CORE_TOOLS_OPENAI;
}



// ============================================================================
// HELPER: Execute a studio tool call — delegates to agent-tools-service.js
// ============================================================================
async function executeStudioTool(toolName, args, userId) {
    try {
        return await agentToolsService.executeTool(toolName, { ...args, userId });
    } catch (error) {
        console.error(`[executeStudioTool] Error executing ${toolName}:`, error.message);
        return { success: false, error: `Tool error (${toolName}): ${error.message}` };
    }
}

// ── OLD switch removed — all tools now handled by agent-tools-service.js ──

// ============================================================================
// HELPER: Call OpenAI with tool calling (non-streaming, for tool loop)
// ============================================================================
async function studioCallOpenAIWithTools(providerKey, model, systemPrompt, messages, agentId, routedTools = null) {
    const config = PROVIDER_CONFIGS[providerKey] || PROVIDER_CONFIGS.openai;
    const tools = routedTools || getToolsForAgent(agentId);
    const resp = await fetch(`${config.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
            model: model || config.defaultModel,
            max_tokens: 4096,
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages,
            ],
            tools,
            tool_choice: 'auto',
        }),
    });

    if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`${providerKey} tool call error ${resp.status}: ${errText}`);
    }

    const data = await resp.json();
    const choice = data.choices[0];
    const toolCalls = choice.message.tool_calls || [];

    return {
        text: choice.message.content || '',
        toolCalls: toolCalls.map(tc => ({
            id: tc.id,
            name: tc.function.name,
            arguments: JSON.parse(tc.function.arguments || '{}'),
        })),
        rawMessage: choice.message,
    };
}

// ============================================================================
// HELPER: Run tool-calling loop for OpenAI (streaming output)
// Returns final response text after executing any tool calls
// ============================================================================
async function runToolCallingLoop(res, provider, model, systemPrompt, chatMessages, userId, agentId, activeTool, routedTools = null, sessionId = null) {
    const MAX_ROUNDS = 3;
    let roundMessages = [...chatMessages];
    let finalText = '';

    for (let round = 0; round < MAX_ROUNDS; round++) {
        const isLastRound = round === MAX_ROUNDS - 1;

        const streamResult = await streamOpenAIWithTools(res, provider, model, systemPrompt, roundMessages, agentId, routedTools);

        // If pure text (no tools), we're done — tokens already streamed live
        if (streamResult.toolCalls.length === 0) {
            finalText = streamResult.text;
            break;
        }

        // Tools were called — execute them
        const { text, toolCalls } = streamResult;
        console.log(`[Studio/ToolCall] Round ${round + 1}: ${toolCalls.length} tool(s): ${toolCalls.map(tc => tc.name).join(', ')}`);

        // Execute each tool call
        const roundResults = [];
        for (const tc of toolCalls) {
            const toolLabel = { web_search: '🔍', fetch_url: '🌐', execute_code: '⚡', calculate: '🧮', get_current_time: '🕐', get_weather: '🌤️', generate_video: '🎬' };
            res.write(`data: ${JSON.stringify({ content: `\n\n${toolLabel[tc.name] || '🔧'} *Using ${tc.name}...*\n\n` })}\n\n`);

            let result;
            try {
                result = await executeStudioTool(tc.name, { ...tc.arguments, agentId }, userId);
            } catch (toolError) {
                console.error(`[Studio/ToolCall] Error: ${tc.name}:`, toolError.message);
                result = { success: false, error: toolError.message };
            }
            recordToolUsage(sessionId, tc.name);
            roundResults.push({ toolCallId: tc.id, name: tc.name, arguments: tc.arguments, result });
        }

        // Re-inject tool results for next round
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

        if (isLastRound) {
            finalText = text || 'I completed the task.';
        }
    }

    return finalText;
}

/**
 * Stream OpenAI response with tool support — true token-by-token streaming.
 * Streams text content to client immediately while accumulating tool_call deltas.
 * Returns { text, toolCalls } after the stream completes.
 */
async function streamOpenAIWithTools(res, providerKey, model, systemPrompt, messages, agentId, routedTools = null) {
    const config = PROVIDER_CONFIGS[providerKey] || PROVIDER_CONFIGS.openai;
    const tools = routedTools || getToolsForAgent(agentId);
    
    // Concurrency slot for provider
    const slot = await AiQueue.acquireSlot(providerKey || 'openai', true);
    try {

    // Add 60-second timeout for AI streaming
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    
    let response;
    try {
        response = await fetch(`${config.baseURL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify({
                model: model || 'gpt-4o',
                max_tokens: 4096,
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages,
                ],
                tools,
                tool_choice: 'auto',
                stream: true,
            }),
            signal: controller.signal,
        });
    } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
            throw new Error(`${providerKey} request timed out after 60 seconds`);
        }
        throw err;
    } finally {
        clearTimeout(timeoutId);
    }

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`${providerKey} stream error ${response.status}: ${errText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';
    // Accumulate tool_call deltas: { [index]: { id, name, arguments } }
    const toolCallAccum = {};

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
            if (data === '[DONE]') continue;

            try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta;
                if (!delta) continue;

                // Stream text content tokens immediately to client
                if (delta.content) {
                    // Strip hallucinated localhost URLs from AI output
                    let cleanContent = delta.content;
                    fullText += cleanContent;
                    res.write(`data: ${JSON.stringify({ content: cleanContent })}\n\n`);
                }

                // Accumulate tool_call deltas
                if (delta.tool_calls) {
                    for (const tc of delta.tool_calls) {
                        const idx = tc.index;
                        if (!toolCallAccum[idx]) {
                            toolCallAccum[idx] = { id: '', name: '', arguments: '' };
                        }
                        if (tc.id) toolCallAccum[idx].id = tc.id;
                        if (tc.function?.name) toolCallAccum[idx].name = tc.function.name;
                        if (tc.function?.arguments) toolCallAccum[idx].arguments += tc.function.arguments;
                    }
                }
            } catch { /* skip unparseable */ }
        }
    }

    // Parse accumulated tool calls
    const toolCalls = Object.values(toolCallAccum)
        .filter(tc => tc.id && tc.name)
        .map(tc => ({
            id: tc.id,
            name: tc.name,
            arguments: (() => { try { return JSON.parse(tc.arguments || '{}'); } catch { return {}; } })(),
        }));

    return { text: fullText, toolCalls };

    } finally {
        await AiQueue.releaseSlot(slot);
    }
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
    // systemPrompt is already fully resolved at the call site — no fallback needed here
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
// HELPER: Handle image generation mode
// ============================================================================
async function handleVideoGeneration(res, message, userId) {
    try {
        res.write(`data: ${JSON.stringify({ content: '🎬 **Generating video with RunwayML...**\n\n' })}\n\n`);

        const videoResult = await agentToolsService.generateVideo(message, 5, userId || 'default');

        if (!videoResult.success) {
            res.write(`data: ${JSON.stringify({ content: `❌ Video generation failed: ${videoResult.error}\n` })}\n\n`);
        } else {
            const videoUrl = videoResult.videoUrl;
            if (videoUrl) {
                res.write(`data: ${JSON.stringify({ content: `[▶️ Watch Video](${videoUrl})\n\n` })}\n\n`);
            } else {
                res.write(`data: ${JSON.stringify({ content: 'Video processing complete.\n\n' })}\n\n`);
            }
            res.write(`data: ${JSON.stringify({ content: `*Prompt: ${message}*\n` })}\n\n`);
        }

        res.write('data: [DONE]\n\n');
    } catch (error) {
        console.error('[VideoGen] Error:', error.message);
        res.write(`data: ${JSON.stringify({ content: `❌ Video generation error: ${error.message}\n` })}\n\n`);
        res.write('data: [DONE]\n\n');
    }
}

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
    const providerKey = (provider || 'mistral').toLowerCase();

    // All providers in PROVIDER_CONFIGS are known; fall back to mistral for concurrency tracking
    const effectiveProvider = PROVIDER_CONFIGS[providerKey] ? providerKey : 'mistral';
    const slot = await AiQueue.acquireSlot(effectiveProvider, true);
    try {

    const config = PROVIDER_CONFIGS[providerKey];
    if (config && config.apiKey) {
        await streamOpenAICompatible(res, config, model || config.defaultModel, messages, temperature, maxTokens);
    } else {
        // Fallback to Mistral if provider not configured or missing API key
        console.warn(`[Stream] Provider ${providerKey} not configured, falling back to Mistral`);
        await streamOpenAICompatible(res, PROVIDER_CONFIGS.mistral, model || 'mistral-small-latest', messages, temperature, maxTokens);
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

        // Helper: ensure Agent record exists for FK constraint (auto-create if missing)
        async function ensureAgentRecord(aid) {
            if (!aid) return null;
            let agentExists = await prisma.agent.findUnique({ where: { agentId: aid } });
            if (!agentExists) {
                try {
                    agentExists = await prisma.agent.create({
                        data: {
                            agentId: aid,
                            name: aid.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                            systemPrompt: STRICT_AGENT_PROMPTS[aid] || 'You are a helpful AI assistant.',
                            welcomeMessage: 'Hello! How can I help you today?',
                        },
                    });
                    console.log(`[DB] Auto-created agent record: ${aid}`);
                } catch (e) {
                    // Race condition: another request may have created it
                    agentExists = await prisma.agent.findUnique({ where: { agentId: aid } });
                }
            }
            return agentExists ? aid : null;
        }

        if (!session) {
            // Need a valid User record — check if user exists
            const userExists = await prisma.user.findUnique({ where: { id: finalUserId } });
            if (!userExists) {
                console.log(`[DB] User ${finalUserId} not found, skipping DB persistence`);
                return null;
            }

            const validAgentId = await ensureAgentRecord(agentId);

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
        } else if (session && agentId && !session.agentId) {
            // Fix existing sessions that have null agentId (from before this fix)
            const validAgentId = await ensureAgentRecord(agentId);
            if (validAgentId) {
                await prisma.chatSession.update({
                    where: { sessionId: finalSessionId },
                    data: { agentId: validAgentId },
                }).catch(() => { });
                session.agentId = validAgentId;
                console.log(`[DB] Patched session ${finalSessionId} with agentId: ${validAgentId}`);
            }
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

        const response = await openai.chat.completions.create({
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: message || 'Analyze this' },
                        ...(image ? [{ type: 'image_url', image_url: { url: image } }] : []),
                    ],
                },
            ],
            model: 'gpt-4o',
            max_tokens: 2000,
        });

        return res.json({ success: true, response: response.choices[0]?.message?.content || '' });
    } catch (error) {
        console.error('[agents/multimodal] Error:', error);
        return res.status(503).json({ error: 'Multimodal service unavailable' });
    }
});

// ============================================================================
// STUDIO - CHAT (Non-streaming, also handles vision)
// ============================================================================
router.post('/chat', async (req, res) => {
    try {
        const {
            message, query, code,
            conversationHistory = [],
            provider: _frontendProvider,
            model: _frontendModel,
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

        // SUBSCRIPTION CHECK — must have active plan for paid agents
        const subCheck = await checkSubscription(req.userId || userId, agentId);
        if (!subCheck.allowed) {
            return res.status(403).json({ error: subCheck.reason, agentId: subCheck.agentId });
        }

        // Per-user AI rate limit
        await AiQueue.checkUserRate(req.userId || userId);

        // AGENT_PROVIDERS is the single source of truth — backend decides provider + model from agentId
        const agentConfig = AGENT_PROVIDERS[agentId] || AGENT_PROVIDERS['default'];

        // Each mode uses the agent's own provider — deep_research/thinking upgrade to large model
        const { provider, model } = getModeProvider(agentConfig, activeTool);

        // STRICT_AGENT_PROMPTS is the single source of truth — agentId picks the prompt, 'default' is Maula AI
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

        // Handle image generation mode (non-streaming returns URL)
        if (activeTool === 'image_gen') {
            try {
                const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    },
                    body: JSON.stringify({
                        model: 'dall-e-3',
                        prompt: finalMessage,
                        n: 1,
                        size: '1024x1024',
                        quality: 'standard',
                    }),
                });
                const data = await imageResponse.json();
                const imageUrl = data.data?.[0]?.url;
                const revisedPrompt = data.data?.[0]?.revised_prompt || finalMessage;
                const imgResponse = `🎨 **Image Generated!**\n\n![Generated Image](${imageUrl})\n\n*${revisedPrompt}*`;
                // Save assistant image response
                if (dbSessionId) saveMessage(dbSessionId, 'assistant', imgResponse, { activeTool: 'image_gen', provider: 'openai' });
                return res.json({
                    success: true,
                    response: imgResponse,
                    provider: 'openai',
                    durationMs: 0,
                });
            } catch (imgErr) {
                return res.status(503).json({ error: `Image generation failed: ${imgErr.message}` });
            }
        }

        // Handle video generation mode (RunwayML)
        if (activeTool === 'video_generate') {
            try {
                const videoResult = await agentToolsService.generateVideo(finalMessage, 5, userId || 'default');
                if (!videoResult.success) {
                    const failResponse = `❌ Video generation failed: ${videoResult.error}`;
                    return res.json({ success: true, response: failResponse, provider: 'runwayml', durationMs: 0 });
                }
                const videoUrl = videoResult.videoUrl;
                const videoResponse = `🎬 **Video Generated!**\n\n${videoUrl ? `[▶️ Watch Video](${videoUrl})` : 'Video processing complete.'}\n\n*Prompt: ${finalMessage}*`;
                if (dbSessionId) saveMessage(dbSessionId, 'assistant', videoResponse, { activeTool: 'video_generate', provider: 'runwayml' });
                return res.json({ success: true, response: videoResponse, provider: 'runwayml', durationMs: 0 });
            } catch (vidErr) {
                return res.status(503).json({ error: `Video generation failed: ${vidErr.message}` });
            }
        }

        // Handle vision (image analysis) - always use OpenAI gpt-4o
        if (imageData?.base64) {
            const visionResponse = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: systemPrompt },
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: finalMessage },
                            { type: 'image_url', image_url: { url: `data:${imageData.mimeType};base64,${imageData.base64}` } },
                        ],
                    },
                ],
                max_tokens: maxTokens || 4096,
                temperature: temperature ?? 0.7,
            });

            const visionText = visionResponse.choices[0]?.message?.content || '';
            if (dbSessionId) saveMessage(dbSessionId, 'assistant', visionText, { activeTool: 'vision', provider: 'openai', model: 'gpt-4o' });
            return res.json({
                success: true,
                response: visionText,
                provider: 'openai',
                durationMs: 0,
            });
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

        // ── NATIVE TOOL CALLING for OpenAI-compatible providers (when not in a specific mode) ──
        const supportsToolCalling = ['openai', 'xai', 'mistral'].includes(providerKey);
        const isToolCallingMode = supportsToolCalling && (activeTool === 'none' || !activeTool);

        if (isToolCallingMode) {
            // ── MULTI-PROVIDER TOOL ROUTER — classify intent and route to best provider ──
            const allTools = getToolsForAgent(agentId);
            const route = routeRequest(finalMessage, agentId, allTools, {
                sessionId: dbSessionId,
                conversationHistory,
                agentConfig,
            });
            const routedProvider = route.provider;
            const routedModel = route.model;
            const routedTools = route.tools;
            const routedConfig = PROVIDER_CONFIGS[routedProvider] || PROVIDER_CONFIGS.mistral;

            const toolSystemPrompt = memoryEnhancedPrompt +
                '\n\nYou have access to tools. Key tools: web_search, fetch_url, execute_code, calculate, get_current_time, get_weather, generate_video, agent_memory (save/load/search user memories). Use them proactively. IMPORTANT: When the user shares personal info (name, preferences, goals), use agent_memory with action "save" to remember it. When asked what you know about the user, use agent_memory with action "load" to retrieve memories.' +
                '\n\nFILE & CODE RULES: When you create a file with create_file, show the download link from the tool result. NEVER invent preview URLs, NEVER mention localhost, NEVER say "Preview server running at". There is NO preview server. For HTML/CSS/JS, always show the full code in a markdown code block (```html) so the built-in live preview activates automatically in the chat UI. The user can preview code directly in the chat — no external URL needed.';
            const chatMessages = conversationHistory.map(m => ({
                role: m.role,
                content: m.content || m.text || '',
            }));
            chatMessages.push({ role: 'user', content: finalMessage });

            // Run tool loop (non-streaming) — wrapped with request context for agent-intelligence tools
            responseText = await runWithContext({ res: null, userId, agentId, sessionId: dbSessionId }, async () => {
                const MAX_ROUNDS = 3;
                let roundMessages = [...chatMessages];
                let text = '';

                for (let round = 0; round < MAX_ROUNDS; round++) {
                    const response = await studioCallOpenAIWithTools(routedProvider, routedModel, toolSystemPrompt, roundMessages, agentId, routedTools);

                    if (response.toolCalls.length === 0) {
                        text = response.text;
                        break;
                    }

                    console.log(`[studio/chat/ToolCall] Round ${round + 1}: ${response.toolCalls.map(tc => tc.name).join(', ')} | Router: ${routedProvider}`);

                    const roundResults = [];
                    for (const tc of response.toolCalls) {
                        let result;
                        try { result = await executeStudioTool(tc.name, { ...tc.arguments, agentId }, userId); }
                        catch (e) { result = { success: false, error: e.message }; }
                        recordToolUsage(dbSessionId, tc.name);
                        roundResults.push({ toolCallId: tc.id, name: tc.name, arguments: tc.arguments, result });
                    }

                    // Re-inject tool results
                    roundMessages.push({ role: 'assistant', content: response.text || null, tool_calls: response.toolCalls.map(tc => ({ id: tc.id, type: 'function', function: { name: tc.name, arguments: JSON.stringify(tc.arguments) } })) });
                    for (const r of roundResults) {
                        roundMessages.push({ role: 'tool', tool_call_id: r.toolCallId, content: JSON.stringify(r.result) });
                    }

                    if (round === MAX_ROUNDS - 1) text = response.text || 'Done.';
                }
                return text;
            });
        } else {
            // ── FALLBACK: Mode-based approach for specific modes (web_search, deep_research, thinking) ──
            const messages = await buildMessagesForMode(finalMessage, conversationHistory, memoryEnhancedPrompt, activeTool, projectFiles);

            // OpenAI-compatible providers (Mistral, xAI, OpenAI)
            const config = PROVIDER_CONFIGS[providerKey] || PROVIDER_CONFIGS.mistral;
            const resp = await fetch(`${config.baseURL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`,
                },
                body: JSON.stringify({
                    model: model || config.defaultModel,
                    messages,
                    temperature: temperature ?? 0.7,
                    max_tokens: maxTokens || 4096,
                }),
            });
            const data = await resp.json();
            responseText = data.choices?.[0]?.message?.content || '';
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
router.post('/chat/stream', async (req, res) => {
    const startTime = Date.now();
    try {
        const {
            message, query, code,
            conversationHistory = [],
            provider: _frontendProvider,
            model: _frontendModel,
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

        // SUBSCRIPTION CHECK — must have active plan for paid agents
        const subCheck = await checkSubscription(req.userId || userId, agentId);
        if (!subCheck.allowed) {
            return res.status(403).json({ error: subCheck.reason, agentId: subCheck.agentId });
        }

        // Per-user AI rate limit
        await AiQueue.checkUserRate(req.userId || userId);

        // AGENT_PROVIDERS is the single source of truth — backend decides provider + model from agentId
        const agentConfig = AGENT_PROVIDERS[agentId] || AGENT_PROVIDERS['default'];

        // Each mode uses the agent's own provider — deep_research/thinking upgrade to large model
        const { provider, model } = getModeProvider(agentConfig, activeTool);

        // STRICT_AGENT_PROMPTS is the single source of truth — agentId picks the prompt, 'default' is Maula AI
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
        res.setHeader('X-Provider', provider || 'openai');

        console.log(`[Studio/Stream] Mode: ${activeTool} | Provider: ${provider} | Model: ${model || 'default'} | Session: ${dbSessionId || 'none'}`);

        // Handle image generation mode separately
        if (activeTool === 'image_gen') {
            await handleImageGeneration(res, finalMessage);
            // Save AI response for image gen
            if (dbSessionId) saveMessage(dbSessionId, 'assistant', `[Image generated for: ${finalMessage}]`, { activeTool: 'image_gen' });
            return;
        }

        // Handle video generation mode separately (RunwayML)
        if (activeTool === 'video_generate') {
            await handleVideoGeneration(res, finalMessage, userId);
            if (dbSessionId) saveMessage(dbSessionId, 'assistant', `[Video generated for: ${finalMessage}]`, { activeTool: 'video_generate' });
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

        // ── NATIVE TOOL CALLING for OpenAI-compatible providers (when not in a specific mode) ──
        const providerKey = (provider || 'openai').toLowerCase();
        const supportsToolCalling = ['openai', 'xai', 'mistral'].includes(providerKey);
        const isToolCallingMode = supportsToolCalling && (activeTool === 'none' || !activeTool);

        if (isToolCallingMode) {
            // ── MULTI-PROVIDER TOOL ROUTER — classify intent and route to best provider ──
            const allTools = getToolsForAgent(agentId);
            const route = routeRequest(finalMessage, agentId, allTools, {
                sessionId: dbSessionId,
                conversationHistory,
                agentConfig: AGENT_PROVIDERS[agentId] || AGENT_PROVIDERS['default'],
            });
            const routedProvider = route.provider;
            const routedModel = route.model;
            const routedTools = route.tools;

            // Use native tool calling — LLM auto-decides which tools to use
            const toolSystemPrompt = streamMemoryPrompt +
                '\n\nYou have access to tools. Key tools: web_search, fetch_url, execute_code, calculate, get_current_time, get_weather, generate_video, agent_memory (save/load/search user memories). Use them proactively. IMPORTANT: When the user shares personal info (name, preferences, goals), use agent_memory with action "save" to remember it. When asked what you know about the user, use agent_memory with action "load" to retrieve memories.' +
                '\n\nFILE & CODE RULES: When you create a file with create_file, show the download link from the tool result. NEVER invent preview URLs, NEVER mention localhost, NEVER say "Preview server running at". There is NO preview server. For HTML/CSS/JS, always show the full code in a markdown code block (```html) so the built-in live preview activates automatically in the chat UI. The user can preview code directly in the chat — no external URL needed.';
            const chatMessages = conversationHistory.map(m => ({
                role: m.role,
                content: m.content || m.text || '',
            }));
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
            // runWithContext makes res, userId, agentId, sessionId available to agent-intelligence tools via AsyncLocalStorage
            const finalText = await runWithContext({ res, userId, agentId, sessionId: dbSessionId }, () =>
                runToolCallingLoop(res, routedProvider, routedModel, toolSystemPrompt, chatMessages, userId, agentId, activeTool, routedTools, dbSessionId)
            );

            res.write('data: [DONE]\n\n');
            res.end();

            const elapsed = Date.now() - startTime;
            console.log(`[Studio/Stream/ToolCall] Completed in ${elapsed}ms | Router: ${routedProvider} (${route.classification.confidence}) | Tools: ${routedTools.length}/${allTools.length}`);

            // Save AI response to DB (non-blocking)
            const savedText = fullResponseText || finalText;
            if (dbSessionId && savedText) {
                saveMessage(dbSessionId, 'assistant', savedText, { activeTool: 'tool_calling', provider: routedProvider, model: routedModel, latencyMs: elapsed, routerConfidence: route.classification.confidence });
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
    const config = PROVIDER_CONFIGS[providerKey] || PROVIDER_CONFIGS.mistral;
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
            callProviderSync('openai', [{ role: 'user', content: `${topic ? `Topic: ${topic}\n` : ''}${prompt1}` }], 'gpt-4o', 1000),
            callProviderSync('xai', [{ role: 'user', content: `${topic ? `Topic: ${topic}\n` : ''}${prompt2}` }], 'grok-3-fast', 1000),
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

        const response = await callProviderSync('openai', [
            { role: 'user', content: `Topic: ${topic}\nPosition 1: ${position1}\nPosition 2: ${position2}\nGenerate a thoughtful debate transcript.` },
        ], 'gpt-4o', 2000);
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

        const response = await callProviderSync('mistral', [
            { role: 'user', content: `Analyze this dream from psychological and symbolic perspectives:\n\n${dreamDescription}` },
        ], 'mistral-large-latest', 1500);
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

        const response = await callProviderSync('openai', [
            { role: 'system', content: 'You are an emotion analysis expert. Analyze the emotional content and return: emotion, intensity (0-100), sentiment, and reasoning.' },
            { role: 'user', content: text },
        ], 'gpt-4o', 500);
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

        const response = await callProviderSync('xai', [
            { role: 'user', content: `Based on current trends, predict the most likely outcomes for: ${scenario}${timeframe ? ` within ${timeframe}` : ''}. Be realistic but creative.` },
        ], 'grok-3', 2000);
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

        const response = await callProviderSync('openai', [
            { role: 'system', content: 'Analyze personality traits, strengths, weaknesses, and recommendations for growth.' },
            { role: 'user', content: text || description },
        ], 'gpt-4o', 1500);
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

        const response = await callProviderSync('xai', [
            { role: 'system', content: systemMsg },
            { role: 'user', content: userMsg },
        ], 'grok-3', 3000);
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

        const response = await callProviderSync('mistral', [
            { role: 'system', content: 'You are a helpful customer support agent. Provide clear, concise solutions.' },
            { role: 'user', content: issue },
        ], 'mistral-small-latest', 800);
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

export default router;
