/**
 * DOCUMENT PARSING — Extended
 * parse_json — Parse/validate/transform JSON (schema validation via Zod)
 * parse_html — Extract structured data (DOM traversal/selectors via Cheerio)
 */

import { JSDOM } from 'jsdom';

// ── parse_json ──────────────────────────────────────────────────
async function parseJson(params) {
    const { content, action = 'parse' } = params;
    if (!content) return { success: false, error: 'content is required' };

    try {
        switch (action) {
            case 'parse': {
                const parsed = typeof content === 'string' ? JSON.parse(content) : content;
                const stats = analyzeJsonStructure(parsed);
                return { success: true, data: parsed, stats };
            }

            case 'validate': {
                // Validate JSON is well-formed + optional schema
                try {
                    const parsed = typeof content === 'string' ? JSON.parse(content) : content;
                    const schema = params.schema;
                    if (schema) {
                        const errors = validateJsonSchema(parsed, schema);
                        return { success: true, valid: errors.length === 0, errors, data: parsed };
                    }
                    return { success: true, valid: true, data: parsed };
                } catch (e) {
                    return { success: true, valid: false, errors: [e.message] };
                }
            }

            case 'transform': {
                const parsed = typeof content === 'string' ? JSON.parse(content) : content;
                const { path, operation, value } = params;
                const result = transformJson(parsed, path, operation, value);
                return { success: true, data: result };
            }

            case 'query': {
                // JSONPath-like query
                const parsed = typeof content === 'string' ? JSON.parse(content) : content;
                const results = queryJson(parsed, params.path || params.query || '$');
                return { success: true, results };
            }

            case 'diff': {
                const a = typeof content === 'string' ? JSON.parse(content) : content;
                const b = typeof params.compare === 'string' ? JSON.parse(params.compare) : params.compare;
                const diff = jsonDiff(a, b);
                return { success: true, diff };
            }

            case 'flatten': {
                const parsed = typeof content === 'string' ? JSON.parse(content) : content;
                const flat = flattenJson(parsed, params.separator || '.');
                return { success: true, data: flat };
            }

            case 'unflatten': {
                const parsed = typeof content === 'string' ? JSON.parse(content) : content;
                const nested = unflattenJson(parsed, params.separator || '.');
                return { success: true, data: nested };
            }

            case 'minify': {
                const parsed = typeof content === 'string' ? JSON.parse(content) : content;
                return { success: true, data: JSON.stringify(parsed) };
            }

            case 'prettify': {
                const parsed = typeof content === 'string' ? JSON.parse(content) : content;
                return { success: true, data: JSON.stringify(parsed, null, params.indent || 2) };
            }

            default:
                return { success: false, error: `Unknown parse_json action: ${action}` };
        }
    } catch (err) {
        return { success: false, error: `JSON parse error: ${err.message}` };
    }
}

function analyzeJsonStructure(obj, depth = 0) {
    const type = Array.isArray(obj) ? 'array' : typeof obj;
    const stats = { type, depth };
    if (type === 'object' && obj !== null) {
        stats.keys = Object.keys(obj);
        stats.keyCount = stats.keys.length;
        stats.nested = stats.keys.filter(k => typeof obj[k] === 'object' && obj[k] !== null).length;
    }
    if (type === 'array') {
        stats.length = obj.length;
        stats.itemTypes = [...new Set(obj.map(i => Array.isArray(i) ? 'array' : typeof i))];
    }
    return stats;
}

function validateJsonSchema(data, schema) {
    const errors = [];
    if (schema.type) {
        const actualType = Array.isArray(data) ? 'array' : typeof data;
        if (actualType !== schema.type) errors.push(`Expected type ${schema.type}, got ${actualType}`);
    }
    if (schema.required && typeof data === 'object') {
        for (const key of schema.required) {
            if (!(key in data)) errors.push(`Missing required key: ${key}`);
        }
    }
    if (schema.properties && typeof data === 'object') {
        for (const [key, propSchema] of Object.entries(schema.properties)) {
            if (key in data && propSchema.type) {
                const t = Array.isArray(data[key]) ? 'array' : typeof data[key];
                if (t !== propSchema.type) errors.push(`${key}: expected ${propSchema.type}, got ${t}`);
            }
        }
    }
    return errors;
}

function transformJson(obj, path, operation, value) {
    const copy = JSON.parse(JSON.stringify(obj));
    const keys = (path || '').split('.').filter(Boolean);
    let current = copy;
    for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
        if (current === undefined) return copy;
    }
    const lastKey = keys[keys.length - 1];
    switch (operation) {
        case 'set': current[lastKey] = value; break;
        case 'delete': delete current[lastKey]; break;
        case 'rename': current[value] = current[lastKey]; delete current[lastKey]; break;
        default: break;
    }
    return copy;
}

function queryJson(obj, pathExpr) {
    if (pathExpr === '$' || pathExpr === '.') return obj;
    const parts = pathExpr.replace(/^\$\.?/, '').split('.');
    let current = obj;
    for (const part of parts) {
        if (part === '*' && Array.isArray(current)) return current;
        if (current === undefined || current === null) return undefined;
        current = current[part];
    }
    return current;
}

function jsonDiff(a, b, path = '') {
    const changes = [];
    const allKeys = new Set([
        ...(typeof a === 'object' && a ? Object.keys(a) : []),
        ...(typeof b === 'object' && b ? Object.keys(b) : []),
    ]);
    for (const key of allKeys) {
        const p = path ? `${path}.${key}` : key;
        if (!(key in (a || {}))) { changes.push({ path: p, type: 'added', value: b[key] }); continue; }
        if (!(key in (b || {}))) { changes.push({ path: p, type: 'removed', value: a[key] }); continue; }
        if (typeof a[key] === 'object' && typeof b[key] === 'object') {
            changes.push(...jsonDiff(a[key], b[key], p));
        } else if (a[key] !== b[key]) {
            changes.push({ path: p, type: 'changed', from: a[key], to: b[key] });
        }
    }
    return changes;
}

function flattenJson(obj, separator = '.', prefix = '') {
    const result = {};
    for (const [key, value] of Object.entries(obj || {})) {
        const newKey = prefix ? `${prefix}${separator}${key}` : key;
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            Object.assign(result, flattenJson(value, separator, newKey));
        } else {
            result[newKey] = value;
        }
    }
    return result;
}

function unflattenJson(obj, separator = '.') {
    const result = {};
    for (const [key, value] of Object.entries(obj || {})) {
        const keys = key.split(separator);
        let current = result;
        for (let i = 0; i < keys.length - 1; i++) {
            if (!(keys[i] in current)) current[keys[i]] = {};
            current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
    }
    return result;
}

// ── parse_html ──────────────────────────────────────────────────
async function parseHtml(params) {
    const { content, action = 'extract', selector } = params;
    if (!content) return { success: false, error: 'content (HTML string) is required' };

    try {
        const dom = new JSDOM(content);
        const doc = dom.window.document;

        switch (action) {
            case 'extract': {
                // Extract structure: title, headings, links, images, meta, text
                const title = doc.querySelector('title')?.textContent || '';
                const headings = [...doc.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(h => ({
                    level: parseInt(h.tagName[1]),
                    text: h.textContent.trim(),
                }));
                const links = [...doc.querySelectorAll('a[href]')].map(a => ({
                    text: a.textContent.trim(),
                    href: a.getAttribute('href'),
                }));
                const images = [...doc.querySelectorAll('img')].map(img => ({
                    src: img.getAttribute('src'),
                    alt: img.getAttribute('alt') || '',
                }));
                const meta = [...doc.querySelectorAll('meta')].map(m => ({
                    name: m.getAttribute('name') || m.getAttribute('property') || '',
                    content: m.getAttribute('content') || '',
                })).filter(m => m.name);
                const text = doc.body?.textContent?.replace(/\s+/g, ' ').trim() || '';

                return {
                    success: true,
                    title,
                    headings,
                    links: links.slice(0, 100),
                    images: images.slice(0, 50),
                    meta,
                    textLength: text.length,
                    textPreview: text.slice(0, 1000),
                };
            }

            case 'select': {
                if (!selector) return { success: false, error: 'selector is required for action=select' };
                const elements = [...doc.querySelectorAll(selector)];
                return {
                    success: true,
                    count: elements.length,
                    results: elements.slice(0, 100).map(el => ({
                        tag: el.tagName.toLowerCase(),
                        text: el.textContent.trim().slice(0, 500),
                        html: el.outerHTML.slice(0, 1000),
                        attributes: Object.fromEntries([...el.attributes].map(a => [a.name, a.value])),
                    })),
                };
            }

            case 'table': {
                // Extract all tables to structured data
                const tables = [...doc.querySelectorAll('table')];
                return {
                    success: true,
                    count: tables.length,
                    tables: tables.slice(0, 10).map((table, idx) => {
                        const rows = [...table.querySelectorAll('tr')];
                        const headers = [...(rows[0]?.querySelectorAll('th,td') || [])].map(c => c.textContent.trim());
                        const data = rows.slice(1).map(row =>
                            [...row.querySelectorAll('td,th')].map(c => c.textContent.trim())
                        );
                        return { index: idx, headers, rows: data.length, data: data.slice(0, 100) };
                    }),
                };
            }

            case 'forms': {
                const forms = [...doc.querySelectorAll('form')];
                return {
                    success: true,
                    count: forms.length,
                    forms: forms.map((form, idx) => ({
                        index: idx,
                        action: form.getAttribute('action') || '',
                        method: form.getAttribute('method') || 'GET',
                        fields: [...form.querySelectorAll('input,select,textarea')].map(f => ({
                            type: f.getAttribute('type') || f.tagName.toLowerCase(),
                            name: f.getAttribute('name') || '',
                            id: f.getAttribute('id') || '',
                            required: f.hasAttribute('required'),
                        })),
                    })),
                };
            }

            case 'text': {
                const target = selector ? doc.querySelector(selector) : doc.body;
                const text = target?.textContent?.replace(/\s+/g, ' ').trim() || '';
                return { success: true, text, length: text.length };
            }

            case 'validate': {
                const issues = [];
                if (!doc.querySelector('title')) issues.push('Missing <title> tag');
                if (!doc.querySelector('meta[charset]')) issues.push('Missing charset meta');
                if (!doc.querySelector('html[lang]')) issues.push('Missing lang attribute on <html>');
                const imgs = [...doc.querySelectorAll('img')];
                const noAlt = imgs.filter(i => !i.getAttribute('alt'));
                if (noAlt.length) issues.push(`${noAlt.length} images missing alt text`);
                return { success: true, valid: issues.length === 0, issues };
            }

            default:
                return { success: false, error: `Unknown parse_html action: ${action}` };
        }
    } catch (err) {
        return { success: false, error: `HTML parse error: ${err.message}` };
    }
}

export default {
    parseJson,
    parseHtml,
};
