/**
 * ============================================================================
 * DOCUMENT PARSING TOOLS
 * ============================================================================
 * parse_pdf, parse_docx, parse_csv, parse_json, parse_markdown, parse_html,
 * transcribe_audio
 * ============================================================================
 */
import fs from 'fs';
import path from 'path';
import https from 'https';

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

const DOCUMENT_PARSING_TOOL_DEFINITIONS = [
    {
        name: 'parse_pdf',
        description: 'Extract text, metadata, and page info from PDF files. Supports multi-page extraction, page range selection.',
        input_schema: {
            type: 'object',
            properties: {
                filePath: { type: 'string', description: 'Path to PDF file' },
                pages: { type: 'string', description: 'Page range: "all", "1-5", "1,3,5". Default: all' },
                extractImages: { type: 'boolean', description: 'Whether to extract image descriptions. Default: false' },
            },
            required: ['filePath'],
        },
    },
    {
        name: 'parse_docx',
        description: 'Extract text, headings, tables, lists, and styles from Word documents (.docx).',
        input_schema: {
            type: 'object',
            properties: {
                filePath: { type: 'string', description: 'Path to .docx file' },
                format: { type: 'string', enum: ['text', 'html', 'markdown'], description: 'Output format. Default: text' },
                includeStyles: { type: 'boolean', description: 'Include style info (bold, italic). Default: false' },
            },
            required: ['filePath'],
        },
    },
    {
        name: 'parse_csv',
        description: 'Parse CSV/TSV files into structured rows. Supports custom delimiters, headers, filtering, aggregation.',
        input_schema: {
            type: 'object',
            properties: {
                filePath: { type: 'string', description: 'Path to CSV/TSV file' },
                content: { type: 'string', description: 'Raw CSV content string (alternative to filePath)' },
                delimiter: { type: 'string', description: 'Column delimiter. Default: "," (auto-detects tabs)' },
                hasHeaders: { type: 'boolean', description: 'First row is headers. Default: true' },
                maxRows: { type: 'number', description: 'Max rows to return. Default: 1000' },
                columns: { type: 'array', items: { type: 'string' }, description: 'Filter to specific columns by name' },
                filter: { type: 'string', description: 'Filter expression: "column=value" or "column>10"' },
                sortBy: { type: 'string', description: 'Column name to sort by' },
                sortOrder: { type: 'string', enum: ['asc', 'desc'], description: 'Sort order. Default: asc' },
            },
            required: [],
        },
    },
    {
        name: 'parse_json',
        description: 'Parse, validate, transform, and query JSON data. Supports JSONPath queries, schema validation, flattening.',
        input_schema: {
            type: 'object',
            properties: {
                filePath: { type: 'string', description: 'Path to JSON file' },
                content: { type: 'string', description: 'Raw JSON string (alternative to filePath)' },
                action: {
                    type: 'string',
                    enum: ['parse', 'validate', 'query', 'flatten', 'unflatten', 'diff', 'merge', 'stats'],
                    description: 'Action to perform. Default: parse',
                },
                query: { type: 'string', description: 'Dot-notation path to extract. E.g. "data.users[0].name"' },
                schema: { type: 'object', description: 'JSON schema to validate against (for action=validate)' },
                mergeWith: { type: 'string', description: 'Second JSON to merge/diff with (path or content)' },
            },
            required: [],
        },
    },
    {
        name: 'parse_markdown',
        description: 'Parse Markdown into structured data: headings, links, code blocks, images, frontmatter, TOC.',
        input_schema: {
            type: 'object',
            properties: {
                filePath: { type: 'string', description: 'Path to .md file' },
                content: { type: 'string', description: 'Raw markdown string' },
                extract: {
                    type: 'array',
                    items: { type: 'string', enum: ['headings', 'links', 'codeBlocks', 'images', 'frontmatter', 'toc', 'tables', 'todos', 'all'] },
                    description: 'What to extract. Default: ["all"]',
                },
            },
            required: [],
        },
    },
    {
        name: 'parse_html',
        description: 'Extract structured data from HTML using CSS selectors. DOM traversal, text/attr extraction, table parsing.',
        input_schema: {
            type: 'object',
            properties: {
                filePath: { type: 'string', description: 'Path to HTML file' },
                content: { type: 'string', description: 'Raw HTML string' },
                url: { type: 'string', description: 'URL to fetch HTML from' },
                selectors: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            name: { type: 'string', description: 'Label for this extraction' },
                            selector: { type: 'string', description: 'CSS selector. E.g. "h1", ".class", "#id", "table tr"' },
                            attribute: { type: 'string', description: 'Attribute to extract (e.g. "href", "src"). Default: text content' },
                        },
                        required: ['selector'],
                    },
                    description: 'CSS selectors to query',
                },
                action: { type: 'string', enum: ['extract', 'tables', 'links', 'images', 'meta', 'text', 'structure'], description: 'Default: extract' },
            },
            required: [],
        },
    },
    {
        name: 'transcribe_audio',
        description: 'Transcribe audio/video to text using OpenAI Whisper. Supports mp3, wav, m4a, mp4, webm.',
        input_schema: {
            type: 'object',
            properties: {
                filePath: { type: 'string', description: 'Path to audio/video file' },
                language: { type: 'string', description: 'Language hint (ISO 639-1). E.g. "en", "es", "fr". Default: auto-detect' },
                format: { type: 'string', enum: ['text', 'srt', 'vtt', 'json'], description: 'Output format. Default: text' },
                timestamps: { type: 'boolean', description: 'Include word-level timestamps. Default: false' },
            },
            required: ['filePath'],
        },
    },
];

// ============================================================================
// EXECUTORS
// ============================================================================

async function executeParsePdf(input, ctx) {
    const { filePath, pages = 'all' } = input;
    try {
        const pdfParse = (await import('pdf-parse')).default;
        const buffer = fs.readFileSync(filePath);
        const options = {};

        // Page range filtering
        if (pages !== 'all') {
            const pageNums = parsePageRange(pages);
            options.pagerender = function (pageData) {
                if (pageNums && !pageNums.includes(pageData.pageIndex + 1)) return '';
                return pageData.getTextContent().then(tc => tc.items.map(i => i.str).join(' '));
            };
        }

        const data = await pdfParse(buffer, options);

        return JSON.stringify({
            status: 'success',
            fileName: path.basename(filePath),
            pages: data.numpages,
            text: data.text.slice(0, 50000), // Cap at 50K chars
            textLength: data.text.length,
            metadata: data.info || {},
            version: data.version,
        });
    } catch (error) {
        return JSON.stringify({ status: 'error', error: error.message });
    }
}

async function executeParseDocx(input, ctx) {
    const { filePath, format = 'text', includeStyles = false } = input;
    try {
        const mammoth = await import('mammoth');
        const buffer = fs.readFileSync(filePath);

        let result;
        if (format === 'html') {
            result = await mammoth.convertToHtml({ buffer });
        } else if (format === 'markdown') {
            result = await mammoth.convertToHtml({ buffer });
            // Basic HTML to markdown conversion
            result.value = htmlToBasicMarkdown(result.value);
        } else {
            result = await mammoth.extractRawText({ buffer });
        }

        return JSON.stringify({
            status: 'success',
            fileName: path.basename(filePath),
            content: result.value.slice(0, 50000),
            contentLength: result.value.length,
            format,
            warnings: result.messages?.filter(m => m.type === 'warning').map(m => m.message).slice(0, 10) || [],
        });
    } catch (error) {
        return JSON.stringify({ status: 'error', error: error.message });
    }
}

async function executeParseCsv(input, ctx) {
    const { filePath, content, delimiter, hasHeaders = true, maxRows = 1000, columns, filter, sortBy, sortOrder = 'asc' } = input;
    try {
        let raw = content || fs.readFileSync(filePath, 'utf-8');

        // Auto-detect delimiter
        const delim = delimiter || (raw.includes('\t') ? '\t' : ',');

        const lines = raw.split(/\r?\n/).filter(l => l.trim());
        if (lines.length === 0) return JSON.stringify({ status: 'error', error: 'Empty CSV' });

        let headers = [];
        let startIdx = 0;

        if (hasHeaders) {
            headers = parseCsvLine(lines[0], delim);
            startIdx = 1;
        }

        let rows = [];
        for (let i = startIdx; i < lines.length && rows.length < maxRows; i++) {
            const values = parseCsvLine(lines[i], delim);
            if (hasHeaders) {
                const row = {};
                headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
                rows.push(row);
            } else {
                rows.push(values);
            }
        }

        // Filter
        if (filter && hasHeaders) {
            const match = filter.match(/^(\w+)\s*(=|!=|>|<|>=|<=|contains)\s*(.+)$/);
            if (match) {
                const [, col, op, val] = match;
                rows = rows.filter(r => {
                    const v = r[col];
                    if (op === '=') return v == val;
                    if (op === '!=') return v != val;
                    if (op === '>') return parseFloat(v) > parseFloat(val);
                    if (op === '<') return parseFloat(v) < parseFloat(val);
                    if (op === '>=') return parseFloat(v) >= parseFloat(val);
                    if (op === '<=') return parseFloat(v) <= parseFloat(val);
                    if (op === 'contains') return String(v).toLowerCase().includes(val.toLowerCase());
                    return true;
                });
            }
        }

        // Column filter
        if (columns && hasHeaders) {
            rows = rows.map(r => {
                const filtered = {};
                columns.forEach(c => { if (c in r) filtered[c] = r[c]; });
                return filtered;
            });
        }

        // Sort
        if (sortBy && hasHeaders) {
            rows.sort((a, b) => {
                const va = a[sortBy], vb = b[sortBy];
                const numA = parseFloat(va), numB = parseFloat(vb);
                if (!isNaN(numA) && !isNaN(numB)) return sortOrder === 'asc' ? numA - numB : numB - numA;
                return sortOrder === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
            });
        }

        return JSON.stringify({
            status: 'success',
            totalRows: lines.length - (hasHeaders ? 1 : 0),
            returnedRows: rows.length,
            headers: hasHeaders ? (columns || headers) : null,
            rows,
        });
    } catch (error) {
        return JSON.stringify({ status: 'error', error: error.message });
    }
}

async function executeParseJson(input, ctx) {
    const { filePath, content, action = 'parse', query, schema, mergeWith } = input;
    try {
        let data;
        const raw = content || (filePath ? fs.readFileSync(filePath, 'utf-8') : null);
        if (!raw) return JSON.stringify({ status: 'error', error: 'Provide filePath or content' });

        try { data = JSON.parse(raw); }
        catch (e) { return JSON.stringify({ status: 'error', error: `Invalid JSON: ${e.message}` }); }

        switch (action) {
            case 'parse':
                return JSON.stringify({ status: 'success', data, type: Array.isArray(data) ? 'array' : typeof data, size: raw.length });

            case 'query':
                if (!query) return JSON.stringify({ status: 'error', error: 'query required for action=query' });
                const result = dotGet(data, query);
                return JSON.stringify({ status: 'success', query, result });

            case 'validate':
                if (!schema) return JSON.stringify({ status: 'success', valid: true, message: 'No schema provided — JSON is syntactically valid' });
                const errors = simpleSchemaValidate(data, schema);
                return JSON.stringify({ status: 'success', valid: errors.length === 0, errors });

            case 'flatten':
                return JSON.stringify({ status: 'success', data: flattenObject(data) });

            case 'unflatten':
                return JSON.stringify({ status: 'success', data: unflattenObject(data) });

            case 'stats':
                return JSON.stringify({ status: 'success', stats: jsonStats(data) });

            case 'diff':
            case 'merge': {
                if (!mergeWith) return JSON.stringify({ status: 'error', error: 'mergeWith required' });
                let other;
                try { other = JSON.parse(mergeWith); } catch { other = JSON.parse(fs.readFileSync(mergeWith, 'utf-8')); }
                if (action === 'merge') return JSON.stringify({ status: 'success', data: deepMerge(data, other) });
                return JSON.stringify({ status: 'success', diff: jsonDiff(data, other) });
            }

            default:
                return JSON.stringify({ status: 'error', error: `Unknown action: ${action}` });
        }
    } catch (error) {
        return JSON.stringify({ status: 'error', error: error.message });
    }
}

async function executeParseMarkdown(input, ctx) {
    const { filePath, content, extract = ['all'] } = input;
    try {
        const md = content || (filePath ? fs.readFileSync(filePath, 'utf-8') : null);
        if (!md) return JSON.stringify({ status: 'error', error: 'Provide filePath or content' });

        const wantAll = extract.includes('all');
        const result = {};

        // Frontmatter
        if (wantAll || extract.includes('frontmatter')) {
            const fmMatch = md.match(/^---\n([\s\S]*?)\n---/);
            if (fmMatch) {
                const fm = {};
                fmMatch[1].split('\n').forEach(line => {
                    const [key, ...val] = line.split(':');
                    if (key) fm[key.trim()] = val.join(':').trim();
                });
                result.frontmatter = fm;
            }
        }

        // Headings
        if (wantAll || extract.includes('headings')) {
            result.headings = [...md.matchAll(/^(#{1,6})\s+(.+)$/gm)].map(m => ({
                level: m[1].length, text: m[2].trim(),
            }));
        }

        // Links
        if (wantAll || extract.includes('links')) {
            result.links = [...md.matchAll(/\[([^\]]*)\]\(([^)]+)\)/g)].map(m => ({
                text: m[1], url: m[2],
            }));
        }

        // Code blocks
        if (wantAll || extract.includes('codeBlocks')) {
            result.codeBlocks = [...md.matchAll(/```(\w*)\n([\s\S]*?)```/g)].map(m => ({
                language: m[1] || 'plain', code: m[2].trim(), lines: m[2].trim().split('\n').length,
            }));
        }

        // Images
        if (wantAll || extract.includes('images')) {
            result.images = [...md.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)].map(m => ({
                alt: m[1], src: m[2],
            }));
        }

        // TOC
        if (wantAll || extract.includes('toc')) {
            const headings = [...md.matchAll(/^(#{1,6})\s+(.+)$/gm)];
            result.toc = headings.map(m => ({
                level: m[1].length,
                text: m[2].trim(),
                anchor: m[2].trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
            }));
        }

        // Tables
        if (wantAll || extract.includes('tables')) {
            const tableBlocks = md.match(/(\|.+\|(\r?\n)?)+/g) || [];
            result.tables = tableBlocks.map(block => {
                const lines = block.trim().split(/\r?\n/).filter(l => l.includes('|') && !l.match(/^\|[\s-:|]+\|$/));
                if (lines.length === 0) return null;
                const headers = lines[0].split('|').filter(c => c.trim()).map(c => c.trim());
                const rows = lines.slice(1).map(l => l.split('|').filter(c => c.trim()).map(c => c.trim()));
                return { headers, rows };
            }).filter(Boolean);
        }

        // Todos
        if (wantAll || extract.includes('todos')) {
            result.todos = [...md.matchAll(/^[-*]\s+\[([ xX])\]\s+(.+)$/gm)].map(m => ({
                done: m[1] !== ' ', text: m[2].trim(),
            }));
        }

        result.totalLines = md.split('\n').length;
        result.totalChars = md.length;

        return JSON.stringify({ status: 'success', ...result });
    } catch (error) {
        return JSON.stringify({ status: 'error', error: error.message });
    }
}

async function executeParseHtml(input, ctx) {
    const { filePath, content, url, selectors, action = 'extract' } = input;
    try {
        let html = content;
        if (!html && filePath) html = fs.readFileSync(filePath, 'utf-8');
        if (!html && url) {
            html = await fetchUrl(url);
        }
        if (!html) return JSON.stringify({ status: 'error', error: 'Provide filePath, content, or url' });

        // Simple regex-based HTML parser (no external deps needed)
        switch (action) {
            case 'text':
                return JSON.stringify({ status: 'success', text: stripHtml(html).slice(0, 50000) });

            case 'links':
                const links = [...html.matchAll(/<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
                    .map(m => ({ url: m[1], text: stripHtml(m[2]).trim() }));
                return JSON.stringify({ status: 'success', count: links.length, links: links.slice(0, 500) });

            case 'images':
                const images = [...html.matchAll(/<img\s[^>]*src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?[^>]*>/gi)]
                    .map(m => ({ src: m[1], alt: m[2] || '' }));
                return JSON.stringify({ status: 'success', count: images.length, images: images.slice(0, 200) });

            case 'meta':
                const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || '';
                const metas = [...html.matchAll(/<meta\s[^>]*(?:name|property)=["']([^"']+)["']\s[^>]*content=["']([^"']+)["'][^>]*>/gi)]
                    .map(m => ({ name: m[1], content: m[2] }));
                return JSON.stringify({ status: 'success', title, meta: metas });

            case 'tables': {
                const tables = [];
                const tableMatches = html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi);
                for (const tm of tableMatches) {
                    const rows = [...tm[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
                    const parsed = rows.map(r => {
                        const cells = [...r[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)];
                        return cells.map(c => stripHtml(c[1]).trim());
                    });
                    if (parsed.length > 0) tables.push({ headers: parsed[0], rows: parsed.slice(1) });
                }
                return JSON.stringify({ status: 'success', count: tables.length, tables: tables.slice(0, 20) });
            }

            case 'structure': {
                const headings = [...html.matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi)]
                    .map(m => ({ level: parseInt(m[1]), text: stripHtml(m[2]).trim() }));
                const scripts = (html.match(/<script/gi) || []).length;
                const styles = (html.match(/<style/gi) || []).length;
                const forms = (html.match(/<form/gi) || []).length;
                return JSON.stringify({ status: 'success', headings, scripts, styles, forms, totalLength: html.length });
            }

            case 'extract':
            default:
                if (!selectors || selectors.length === 0) {
                    // Return everything
                    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || '';
                    return JSON.stringify({ status: 'success', title, text: stripHtml(html).slice(0, 30000), length: html.length });
                }

                const results = {};
                for (const sel of selectors) {
                    const { name, selector, attribute } = sel;
                    const label = name || selector;
                    // Basic CSS selector to regex (handles tag, .class, #id)
                    const matches = querySelectorAll(html, selector);
                    results[label] = matches.map(m => attribute ? extractAttribute(m, attribute) : stripHtml(m).trim()).filter(Boolean);
                }
                return JSON.stringify({ status: 'success', results });
        }
    } catch (error) {
        return JSON.stringify({ status: 'error', error: error.message });
    }
}

async function executeTranscribeAudio(input, ctx) {
    const { filePath, language, format = 'text', timestamps = false } = input;
    try {
        const OpenAI = (await import('openai')).default;
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) return JSON.stringify({ status: 'error', error: 'OPENAI_API_KEY not configured for Whisper transcription' });

        const openai = new OpenAI({ apiKey });
        const fileStream = fs.createReadStream(filePath);

        const params = {
            file: fileStream,
            model: 'whisper-1',
            response_format: format === 'json' ? 'verbose_json' : format === 'srt' ? 'srt' : format === 'vtt' ? 'vtt' : 'text',
        };
        if (language) params.language = language;
        if (timestamps && format === 'json') params.timestamp_granularities = ['word', 'segment'];

        const transcription = await openai.audio.transcriptions.create(params);

        if (format === 'json' || typeof transcription === 'object') {
            return JSON.stringify({
                status: 'success',
                text: transcription.text || transcription,
                language: transcription.language,
                duration: transcription.duration,
                segments: transcription.segments?.slice(0, 500),
                words: timestamps ? transcription.words?.slice(0, 2000) : undefined,
            });
        }

        return JSON.stringify({ status: 'success', text: String(transcription).slice(0, 50000), format });
    } catch (error) {
        return JSON.stringify({ status: 'error', error: error.message });
    }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function parsePageRange(range) {
    const pages = new Set();
    for (const part of range.split(',')) {
        const trimmed = part.trim();
        if (trimmed.includes('-')) {
            const [start, end] = trimmed.split('-').map(Number);
            for (let i = start; i <= end; i++) pages.add(i);
        } else {
            pages.add(parseInt(trimmed));
        }
    }
    return [...pages];
}

function htmlToBasicMarkdown(html) {
    return html
        .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n')
        .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n')
        .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n')
        .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n')
        .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<b>(.*?)<\/b>/gi, '**$1**')
        .replace(/<em>(.*?)<\/em>/gi, '*$1*')
        .replace(/<i>(.*?)<\/i>/gi, '*$1*')
        .replace(/<code>(.*?)<\/code>/gi, '`$1`')
        .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
        .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
        .replace(/<[^>]+>/g, '')
        .trim();
}

function parseCsvLine(line, delim) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
            else inQuotes = !inQuotes;
        } else if (ch === delim && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += ch;
        }
    }
    result.push(current.trim());
    return result;
}

function dotGet(obj, path) {
    const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
    let current = obj;
    for (const p of parts) {
        if (current == null) return undefined;
        current = current[p];
    }
    return current;
}

function simpleSchemaValidate(data, schema, path = '') {
    const errors = [];
    if (schema.type) {
        const actualType = Array.isArray(data) ? 'array' : typeof data;
        if (schema.type !== actualType) errors.push(`${path || 'root'}: expected ${schema.type}, got ${actualType}`);
    }
    if (schema.required && typeof data === 'object' && !Array.isArray(data)) {
        for (const key of schema.required) {
            if (!(key in data)) errors.push(`${path}.${key}: required field missing`);
        }
    }
    if (schema.properties && typeof data === 'object') {
        for (const [key, propSchema] of Object.entries(schema.properties)) {
            if (key in data) errors.push(...simpleSchemaValidate(data[key], propSchema, `${path}.${key}`));
        }
    }
    return errors;
}

function flattenObject(obj, prefix = '') {
    const result = {};
    for (const [key, val] of Object.entries(obj)) {
        const newKey = prefix ? `${prefix}.${key}` : key;
        if (val && typeof val === 'object' && !Array.isArray(val)) {
            Object.assign(result, flattenObject(val, newKey));
        } else {
            result[newKey] = val;
        }
    }
    return result;
}

function unflattenObject(obj) {
    const result = {};
    for (const [key, val] of Object.entries(obj)) {
        const parts = key.split('.');
        let current = result;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!current[parts[i]]) current[parts[i]] = {};
            current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = val;
    }
    return result;
}

function jsonStats(data) {
    const stats = { type: Array.isArray(data) ? 'array' : typeof data };
    if (Array.isArray(data)) {
        stats.length = data.length;
        if (data.length > 0 && typeof data[0] === 'object') {
            stats.keys = Object.keys(data[0]);
        }
    } else if (typeof data === 'object' && data !== null) {
        stats.keys = Object.keys(data);
        stats.keyCount = stats.keys.length;
        stats.depth = getDepth(data);
    }
    stats.sizeBytes = JSON.stringify(data).length;
    return stats;
}

function getDepth(obj, depth = 0) {
    if (typeof obj !== 'object' || obj === null) return depth;
    return Math.max(...Object.values(obj).map(v => getDepth(v, depth + 1)));
}

function deepMerge(target, source) {
    const result = { ...target };
    for (const [key, val] of Object.entries(source)) {
        if (val && typeof val === 'object' && !Array.isArray(val) && typeof result[key] === 'object') {
            result[key] = deepMerge(result[key], val);
        } else {
            result[key] = val;
        }
    }
    return result;
}

function jsonDiff(a, b, path = '') {
    const diffs = [];
    const allKeys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
    for (const key of allKeys) {
        const p = path ? `${path}.${key}` : key;
        if (!(key in (a || {}))) diffs.push({ path: p, type: 'added', value: b[key] });
        else if (!(key in (b || {}))) diffs.push({ path: p, type: 'removed', value: a[key] });
        else if (typeof a[key] === 'object' && typeof b[key] === 'object') diffs.push(...jsonDiff(a[key], b[key], p));
        else if (a[key] !== b[key]) diffs.push({ path: p, type: 'changed', from: a[key], to: b[key] });
    }
    return diffs;
}

function stripHtml(html) {
    return html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractAttribute(html, attr) {
    const match = html.match(new RegExp(`${attr}=["']([^"']+)["']`, 'i'));
    return match ? match[1] : null;
}

function querySelectorAll(html, selector) {
    // Simple CSS selector matching via regex
    let pattern;
    if (selector.startsWith('#')) {
        const id = selector.slice(1);
        pattern = new RegExp(`<[^>]+id=["']${id}["'][^>]*>[\\s\\S]*?<\\/\\w+>`, 'gi');
    } else if (selector.startsWith('.')) {
        const cls = selector.slice(1);
        pattern = new RegExp(`<[^>]+class=["'][^"']*\\b${cls}\\b[^"']*["'][^>]*>[\\s\\S]*?<\\/\\w+>`, 'gi');
    } else {
        pattern = new RegExp(`<${selector}[^>]*>[\\s\\S]*?<\\/${selector}>`, 'gi');
    }
    return [...html.matchAll(pattern)].map(m => m[0]);
}

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        const lib = url.startsWith('https') ? https : http;
        lib.get(url, { headers: { 'User-Agent': 'Onelastai/1.0' } }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return fetchUrl(res.headers.location).then(resolve).catch(reject);
            }
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve(body));
        }).on('error', reject);
    });
}

// ============================================================================
// MAIN EXECUTOR
// ============================================================================

async function executeDocumentParsingTool(toolName, input, ctx = {}) {
    switch (toolName) {
        case 'parse_pdf': return { result: await executeParsePdf(input, ctx), sideEffects: null };
        case 'parse_docx': return { result: await executeParseDocx(input, ctx), sideEffects: null };
        case 'parse_csv': return { result: await executeParseCsv(input, ctx), sideEffects: null };
        case 'parse_json': return { result: await executeParseJson(input, ctx), sideEffects: null };
        case 'parse_markdown': return { result: await executeParseMarkdown(input, ctx), sideEffects: null };
        case 'parse_html': return { result: await executeParseHtml(input, ctx), sideEffects: null };
        case 'transcribe_audio': return { result: await executeTranscribeAudio(input, ctx), sideEffects: null };
        default: return { result: JSON.stringify({ status: 'error', error: `Unknown document parsing tool: ${toolName}` }), sideEffects: null };
    }
}

const DOCUMENT_PARSING_TOOL_NAMES = new Set(DOCUMENT_PARSING_TOOL_DEFINITIONS.map(t => t.name));
function isDocumentParsingTool(toolName) { return DOCUMENT_PARSING_TOOL_NAMES.has(toolName); }

export {
    DOCUMENT_PARSING_TOOL_DEFINITIONS,
    executeDocumentParsingTool,
    isDocumentParsingTool,
};
