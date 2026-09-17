/**
 * ============================================================================
 * CORE UTILITY TOOLS
 * ============================================================================
 * calculate, get_current_time, get_weather, fetch_url, execute_code, generate_video
 * ============================================================================
 */
import https from 'https';
import http from 'http';
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

const CORE_UTILITY_TOOL_DEFINITIONS = [
    {
        name: 'calculate',
        description: 'Evaluate math expressions safely. Supports: +, -, *, /, %, ^, sqrt, sin, cos, tan, log, ln, abs, round, ceil, floor, pi, e, min, max, factorial. Example: "sqrt(144) + 2^3"',
        input_schema: {
            type: 'object',
            properties: {
                expression: { type: 'string', description: 'Math expression to evaluate. E.g. "2 + 3 * 4", "sqrt(144)", "sin(pi/2)"' },
                precision: { type: 'number', description: 'Decimal precision (default: 10)' },
            },
            required: ['expression'],
        },
    },
    {
        name: 'get_current_time',
        description: 'Get the current date and time with optional timezone. Returns ISO string, formatted date, unix timestamp.',
        input_schema: {
            type: 'object',
            properties: {
                timezone: { type: 'string', description: 'IANA timezone (e.g. "America/New_York", "Europe/London", "Asia/Tokyo"). Default: UTC' },
                format: { type: 'string', enum: ['iso', 'readable', 'unix', 'all'], description: 'Output format. Default: all' },
            },
            required: [],
        },
    },
    {
        name: 'get_weather',
        description: 'Get current weather for a location. Returns temperature, conditions, humidity, wind, forecast.',
        input_schema: {
            type: 'object',
            properties: {
                location: { type: 'string', description: 'City name, zip code, or "lat,lon". E.g. "London", "10001", "51.5,-0.1"' },
                units: { type: 'string', enum: ['metric', 'imperial'], description: 'Temperature units. Default: metric' },
            },
            required: ['location'],
        },
    },
    {
        name: 'fetch_url',
        description: 'Fetch a URL and extract its content. Returns text, HTML, links, headings, or code blocks from any webpage. Use when the user asks to read a webpage, grab content from a link, or extract data from a URL.',
        input_schema: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'URL to fetch (e.g. "https://example.com")' },
                extract: { type: 'string', enum: ['text', 'html', 'links', 'headings', 'code'], description: 'What to extract: text (readable), html (raw), links, headings, or code blocks. Default: text' },
                max_length: { type: 'number', description: 'Max content length to return (default 10000)' },
            },
            required: ['url'],
        },
    },
    {
        name: 'execute_code',
        description: 'Execute code in a sandboxed environment and return stdout/stderr. Supports JavaScript, TypeScript, Python, and Bash. Use when the user asks to run, test, or execute a snippet of code.',
        input_schema: {
            type: 'object',
            properties: {
                code: { type: 'string', description: 'The code to execute' },
                language: { type: 'string', enum: ['javascript', 'typescript', 'python', 'bash'], description: 'Programming language (default: javascript)' },
                timeout: { type: 'number', description: 'Execution timeout in milliseconds (default 10000, max 30000)' },
            },
            required: ['code'],
        },
    },
    {
        name: 'generate_video',
        description: 'Generate a video from a text prompt using AI (fal.ai Minimax). Returns a request ID for async polling. Use when the user asks to create, make, or generate a video from a description.',
        input_schema: {
            type: 'object',
            properties: {
                prompt: { type: 'string', description: 'Detailed description of the video to generate. Be specific about scene, action, style, mood.' },
                duration: { type: 'number', description: 'Video duration in seconds (default 5)' },
                aspect_ratio: { type: 'string', enum: ['16:9', '9:16', '1:1'], description: 'Aspect ratio (default: 16:9)' },
            },
            required: ['prompt'],
        },
    },
];

// ============================================================================
// SAFE MATH EVALUATOR (NO eval())
// ============================================================================

function safeCalculate(expression, precision = 10) {
    // Tokenize and parse with operator precedence
    const CONSTANTS = {
        pi: Math.PI, PI: Math.PI, e: Math.E, E: Math.E,
        tau: Math.PI * 2, phi: (1 + Math.sqrt(5)) / 2,
        inf: Infinity, infinity: Infinity,
    };

    const FUNCTIONS = {
        sqrt: Math.sqrt, cbrt: Math.cbrt,
        sin: Math.sin, cos: Math.cos, tan: Math.tan,
        asin: Math.asin, acos: Math.acos, atan: Math.atan,
        sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
        log: Math.log10, log2: Math.log2, ln: Math.log, log10: Math.log10,
        abs: Math.abs, round: Math.round, ceil: Math.ceil, floor: Math.floor,
        sign: Math.sign, trunc: Math.trunc,
        exp: Math.exp, pow: Math.pow,
        min: (...args) => Math.min(...args),
        max: (...args) => Math.max(...args),
        factorial: (n) => {
            if (n < 0 || n > 170 || !Number.isInteger(n)) throw new Error('Factorial: integer 0-170 required');
            let r = 1; for (let i = 2; i <= n; i++) r *= i; return r;
        },
        rand: () => Math.random(),
        radians: (deg) => deg * Math.PI / 180,
        degrees: (rad) => rad * 180 / Math.PI,
    };

    let pos = 0;
    const expr = expression.replace(/\s+/g, '');

    function peek() { return expr[pos]; }
    function consume() { return expr[pos++]; }

    function parseNumber() {
        let num = '';
        while (pos < expr.length && (expr[pos] >= '0' && expr[pos] <= '9' || expr[pos] === '.')) {
            num += consume();
        }
        if (!num) throw new Error(`Expected number at position ${pos}`);
        return parseFloat(num);
    }

    function parseIdentifier() {
        let id = '';
        while (pos < expr.length && /[a-zA-Z0-9_]/.test(expr[pos])) {
            id += consume();
        }
        return id;
    }

    function parseAtom() {
        // Parenthesized expression
        if (peek() === '(') {
            consume(); // (
            const val = parseExpression();
            if (peek() !== ')') throw new Error(`Expected ) at position ${pos}`);
            consume(); // )
            return val;
        }

        // Unary minus
        if (peek() === '-') {
            consume();
            return -parseAtom();
        }

        // Unary plus
        if (peek() === '+') {
            consume();
            return parseAtom();
        }

        // Number
        if (peek() >= '0' && peek() <= '9' || peek() === '.') {
            return parseNumber();
        }

        // Identifier (constant or function)
        if (/[a-zA-Z_]/.test(peek())) {
            const id = parseIdentifier();

            // Function call
            if (peek() === '(') {
                consume(); // (
                const fn = FUNCTIONS[id];
                if (!fn) throw new Error(`Unknown function: ${id}`);

                const args = [];
                if (peek() !== ')') {
                    args.push(parseExpression());
                    while (peek() === ',') {
                        consume(); // ,
                        args.push(parseExpression());
                    }
                }
                if (peek() !== ')') throw new Error(`Expected ) at position ${pos}`);
                consume(); // )
                return fn(...args);
            }

            // Constant
            if (id in CONSTANTS) return CONSTANTS[id];
            throw new Error(`Unknown identifier: ${id}`);
        }

        throw new Error(`Unexpected character '${peek()}' at position ${pos}`);
    }

    function parsePower() {
        let base = parseAtom();
        while (peek() === '^' || (peek() === '*' && expr[pos + 1] === '*')) {
            if (peek() === '*') { consume(); consume(); } else { consume(); }
            base = Math.pow(base, parseAtom());
        }
        return base;
    }

    function parseTerm() {
        let left = parsePower();
        while (peek() === '*' || peek() === '/' || peek() === '%') {
            const op = consume();
            const right = parsePower();
            if (op === '*') left *= right;
            else if (op === '/') { if (right === 0) throw new Error('Division by zero'); left /= right; }
            else left %= right;
        }
        return left;
    }

    function parseExpression() {
        let left = parseTerm();
        while (peek() === '+' || peek() === '-') {
            const op = consume();
            const right = parseTerm();
            if (op === '+') left += right;
            else left -= right;
        }
        return left;
    }

    const result = parseExpression();
    if (pos < expr.length) throw new Error(`Unexpected character '${peek()}' at position ${pos}`);

    // Apply precision
    if (Number.isFinite(result)) {
        return parseFloat(result.toFixed(precision));
    }
    return result;
}

// ============================================================================
// EXECUTORS
// ============================================================================

async function executeCalculate(input) {
    const { expression, precision = 10 } = input;
    try {
        const result = safeCalculate(expression, precision);
        return JSON.stringify({
            status: 'success',
            expression,
            result,
            type: typeof result === 'number' && Number.isInteger(result) ? 'integer' : 'float',
        });
    } catch (error) {
        return JSON.stringify({ status: 'error', expression, error: error.message });
    }
}

async function executeGetCurrentTime(input) {
    const { timezone = 'UTC', format = 'all' } = input;
    try {
        const now = new Date();
        const options = { timeZone: timezone, year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, weekday: 'long' };
        const readable = new Intl.DateTimeFormat('en-US', options).format(now);
        const isoStr = now.toISOString();
        const unix = Math.floor(now.getTime() / 1000);

        // Get timezone offset
        const shortOptions = { timeZone: timezone, timeZoneName: 'short' };
        const tzName = new Intl.DateTimeFormat('en-US', shortOptions).formatToParts(now).find(p => p.type === 'timeZoneName')?.value || timezone;

        const data = { iso: isoStr, readable: `${readable} (${tzName})`, unix, timezone, tzAbbreviation: tzName };

        if (format === 'iso') return JSON.stringify({ status: 'success', result: isoStr });
        if (format === 'readable') return JSON.stringify({ status: 'success', result: readable });
        if (format === 'unix') return JSON.stringify({ status: 'success', result: unix });
        return JSON.stringify({ status: 'success', ...data });
    } catch (error) {
        return JSON.stringify({ status: 'error', error: error.message });
    }
}

async function executeGetWeather(input) {
    const { location, units = 'metric' } = input;
    try {
        // Use wttr.in (free, no API key required)
        const unitParam = units === 'imperial' ? 'u' : 'm';
        const url = `https://wttr.in/${encodeURIComponent(location)}?format=j1&${unitParam}`;

        const data = await new Promise((resolve, reject) => {
            https.get(url, { headers: { 'User-Agent': 'Onelastai/1.0' } }, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    try { resolve(JSON.parse(body)); }
                    catch { reject(new Error('Failed to parse weather data')); }
                });
            }).on('error', reject);
        });

        const current = data.current_condition?.[0] || {};
        const area = data.nearest_area?.[0] || {};
        const forecast = data.weather?.slice(0, 3) || [];

        const tempKey = units === 'imperial' ? 'temp_F' : 'temp_C';
        const feelsKey = units === 'imperial' ? 'FeelsLikeF' : 'FeelsLikeC';
        const tempUnit = units === 'imperial' ? '°F' : '°C';
        const windKey = units === 'imperial' ? 'windspeedMiles' : 'windspeedKmph';
        const windUnit = units === 'imperial' ? 'mph' : 'km/h';

        const result = {
            location: `${area.areaName?.[0]?.value || location}, ${area.country?.[0]?.value || ''}`.trim(),
            temperature: `${current[tempKey]}${tempUnit}`,
            feelsLike: `${current[feelsKey]}${tempUnit}`,
            condition: current.weatherDesc?.[0]?.value || 'Unknown',
            humidity: `${current.humidity}%`,
            wind: `${current[windKey]} ${windUnit} ${current.winddir16Point || ''}`.trim(),
            visibility: `${current.visibility} km`,
            uvIndex: current.uvIndex,
            forecast: forecast.map(d => ({
                date: d.date,
                maxTemp: `${units === 'imperial' ? d.maxtempF : d.maxtempC}${tempUnit}`,
                minTemp: `${units === 'imperial' ? d.mintempF : d.mintempC}${tempUnit}`,
                condition: d.hourly?.[4]?.weatherDesc?.[0]?.value || 'Unknown',
            })),
        };

        return JSON.stringify({ status: 'success', ...result });
    } catch (error) {
        return JSON.stringify({ status: 'error', error: `Weather fetch failed: ${error.message}` });
    }
}

// ============================================================================
// FETCH URL EXECUTOR
// ============================================================================

async function executeFetchUrl(input) {
    const { url, extract = 'text', max_length = 10000 } = input;
    try {
        if (!url || !url.startsWith('http')) {
            return JSON.stringify({ status: 'error', error: 'Invalid URL — must start with http:// or https://' });
        }

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);

        const res = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'OnelastAI/1.0 (Bot; +https://onelastai.co)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
            redirect: 'follow',
        });
        clearTimeout(timer);

        if (!res.ok) {
            return JSON.stringify({ status: 'error', error: `HTTP ${res.status}: ${res.statusText}`, url });
        }

        const html = await res.text();

        let content = '';
        switch (extract) {
            case 'html':
                content = html.slice(0, max_length);
                break;
            case 'links': {
                const linkRe = /href=["']([^"']+)["']/gi;
                const links = [];
                let m;
                while ((m = linkRe.exec(html)) !== null && links.length < 100) {
                    links.push(m[1]);
                }
                content = links.join('\n');
                break;
            }
            case 'headings': {
                const headingRe = /<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi;
                const headings = [];
                let m;
                while ((m = headingRe.exec(html)) !== null) {
                    headings.push(m[1].replace(/<[^>]+>/g, '').trim());
                }
                content = headings.join('\n');
                break;
            }
            case 'code': {
                const codeRe = /<code[^>]*>(.*?)<\/code>/gis;
                const blocks = [];
                let m;
                while ((m = codeRe.exec(html)) !== null) {
                    blocks.push(m[1].replace(/<[^>]+>/g, '').trim());
                }
                content = blocks.join('\n---\n');
                break;
            }
            default: {
                // Strip tags → readable text
                content = html
                    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/&nbsp;/g, ' ')
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .slice(0, max_length);
            }
        }

        return JSON.stringify({
            status: 'success',
            url,
            extract,
            length: content.length,
            content,
            truncated: content.length >= max_length,
        });
    } catch (error) {
        return JSON.stringify({ status: 'error', error: `Fetch failed: ${error.message}`, url });
    }
}

// ============================================================================
// EXECUTE CODE (sandboxed)
// ============================================================================

async function executeCode(input) {
    const { code, language = 'javascript', timeout: userTimeout = 10000 } = input;
    const timeout = Math.min(Math.max(userTimeout, 1000), 30000);

    // Map language to interpreter command
    const INTERPRETERS = {
        javascript: { cmd: 'node', ext: '.js' },
        typescript: { cmd: 'npx ts-node --transpile-only', ext: '.ts' },
        python: { cmd: 'python3', ext: '.py' },
        bash: { cmd: 'bash', ext: '.sh' },
    };

    const interp = INTERPRETERS[language];
    if (!interp) {
        return JSON.stringify({ status: 'error', error: `Unsupported language: ${language}. Supported: javascript, typescript, python, bash` });
    }

    // Block dangerous patterns
    const dangerous = ['rm -rf /', 'mkfs', ':(){:|:&};:', 'dd if=/dev/zero', 'process.exit', 'require("child_process")', "require('child_process')"];
    if (dangerous.some(d => code.includes(d))) {
        return JSON.stringify({ status: 'error', error: 'Code contains blocked patterns for safety' });
    }

    let tmpDir, tmpFile;
    try {
        tmpDir = mkdtempSync(join(tmpdir(), 'ola-exec-'));
        tmpFile = join(tmpDir, `code${interp.ext}`);
        writeFileSync(tmpFile, code, 'utf-8');

        const result = execSync(`${interp.cmd} "${tmpFile}"`, {
            timeout,
            maxBuffer: 1024 * 1024, // 1MB
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, NODE_ENV: 'sandbox', HOME: tmpDir },
            cwd: tmpDir,
        });

        return JSON.stringify({
            status: 'success',
            language,
            stdout: (result || '').slice(0, 50000),
            stderr: '',
            truncated: (result || '').length > 50000,
        });
    } catch (err) {
        return JSON.stringify({
            status: err.killed ? 'timeout' : 'error',
            language,
            stdout: (err.stdout || '').slice(0, 10000),
            stderr: (err.stderr || '').slice(0, 10000),
            exitCode: err.status,
            error: err.killed ? `Execution timed out after ${timeout}ms` : err.message?.split('\n')[0] || 'Execution failed',
        });
    } finally {
        try { if (tmpFile) unlinkSync(tmpFile); } catch { }
        try { if (tmpDir) { execSync(`rm -rf "${tmpDir}"`); } } catch { }
    }
}

// ============================================================================
// GENERATE VIDEO (fal.ai Minimax)
// ============================================================================

async function executeGenerateVideo(input, ctx = {}) {
    const { prompt, duration = 5, aspect_ratio = '16:9' } = input;

    if (!prompt || !prompt.trim()) {
        return JSON.stringify({ status: 'error', error: 'Prompt is required for video generation' });
    }

    const FAL_API_KEY = process.env.FAL_API_KEY || '';
    if (!FAL_API_KEY) {
        return JSON.stringify({ status: 'error', error: 'Video generation is not configured — FAL_API_KEY is missing' });
    }

    try {
        const FAL_API_BASE = 'https://queue.fal.run';

        // Submit to fal.ai queue — minimax video-01-live (fast text-to-video)
        const submitRes = await fetch(`${FAL_API_BASE}/fal-ai/minimax/video-01-live`, {
            method: 'POST',
            headers: {
                'Authorization': `Key ${FAL_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: prompt.trim(),
                prompt_optimizer: true,
            }),
        });

        if (!submitRes.ok) {
            const errData = await submitRes.text();
            return JSON.stringify({ status: 'error', error: `Video generation service error: ${submitRes.status}`, details: errData.slice(0, 500) });
        }

        const data = await submitRes.json();

        if (data.request_id) {
            return JSON.stringify({
                status: 'success',
                message: 'Video generation started. The video is being processed asynchronously.',
                requestId: data.request_id,
                pollUrl: `/api/video/status/${data.request_id}`,
                prompt: prompt.trim().slice(0, 100),
                provider: 'fal.ai (Minimax)',
            });
        }

        // Synchronous response (unlikely but handle it)
        if (data.video?.url || data.output?.video?.url) {
            return JSON.stringify({
                status: 'success',
                message: 'Video generated successfully',
                videoUrl: data.video?.url || data.output?.video?.url,
                prompt: prompt.trim().slice(0, 100),
                provider: 'fal.ai (Minimax)',
            });
        }

        return JSON.stringify({ status: 'success', message: 'Video generation submitted', data });
    } catch (error) {
        return JSON.stringify({ status: 'error', error: `Video generation failed: ${error.message}` });
    }
}

// ============================================================================
// MAIN EXECUTOR
// ============================================================================

async function executeCoreUtilityTool(toolName, input, ctx = {}) {
    switch (toolName) {
        case 'calculate': return { result: await executeCalculate(input), sideEffects: null };
        case 'get_current_time': return { result: await executeGetCurrentTime(input), sideEffects: null };
        case 'get_weather': return { result: await executeGetWeather(input), sideEffects: null };
        case 'fetch_url': return { result: await executeFetchUrl(input), sideEffects: null };
        case 'execute_code': return { result: await executeCode(input), sideEffects: null };
        case 'generate_video': return { result: await executeGenerateVideo(input, ctx), sideEffects: null };
        default: return { result: JSON.stringify({ status: 'error', error: `Unknown core utility tool: ${toolName}` }), sideEffects: null };
    }
}

const CORE_UTILITY_TOOL_NAMES = new Set(CORE_UTILITY_TOOL_DEFINITIONS.map(t => t.name));
function isCoreUtilityTool(toolName) { return CORE_UTILITY_TOOL_NAMES.has(toolName); }

export {
    CORE_UTILITY_TOOL_DEFINITIONS,
    executeCoreUtilityTool,
    isCoreUtilityTool,
};
