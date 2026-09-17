/**
 * API & INTEGRATIONS TOOLS (7 tools)
 * api_request, api_mock, api_document, api_test,
 * api_transform, webhook_listen, sdk_generate
 * 
 * All state persisted in PostgreSQL — NO localStorage
 */

import fetch from 'node-fetch';
import { prisma } from '../prisma.js';
import crypto from 'crypto';

// ── api_request ─────────────────────────────────────────────────
async function apiRequest(params) {
    const { url, method = 'GET', headers = {}, body, auth, timeout = 15000, ...opts } = params;
    if (!url) return { success: false, error: 'url is required' };

    try {
        const reqHeaders = { ...headers };

        // Auth handling
        if (auth) {
            if (auth.type === 'bearer') reqHeaders['Authorization'] = `Bearer ${auth.token}`;
            else if (auth.type === 'basic') reqHeaders['Authorization'] = `Basic ${Buffer.from(`${auth.username}:${auth.password}`).toString('base64')}`;
            else if (auth.type === 'api-key') reqHeaders[auth.header || 'X-API-Key'] = auth.key;
        }

        if (body && !reqHeaders['Content-Type']) reqHeaders['Content-Type'] = 'application/json';

        const start = Date.now();
        const res = await fetch(url, {
            method: method.toUpperCase(),
            headers: reqHeaders,
            body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
            timeout,
        });
        const elapsed = Date.now() - start;

        const contentType = res.headers.get('content-type') || '';
        let responseBody;
        if (contentType.includes('json')) {
            responseBody = await res.json();
        } else {
            responseBody = await res.text();
            if (responseBody.length > 10000) responseBody = responseBody.slice(0, 10000) + '...(truncated)';
        }

        return {
            success: true,
            status: res.status,
            statusText: res.statusText,
            headers: Object.fromEntries(res.headers.entries()),
            body: responseBody,
            latencyMs: elapsed,
            method: method.toUpperCase(),
            url,
        };
    } catch (err) {
        return { success: false, error: err.message, url, method };
    }
}

// ── api_mock ────────────────────────────────────────────────────
async function apiMock(params) {
    const { action = 'create', userId, ...opts } = params;
    if (!userId) return { success: false, error: 'userId is required' };

    try {
        switch (action) {
            case 'create': {
                const { name, method = 'GET', path, statusCode = 200, headers = {}, body, delay = 0 } = opts;
                if (!name || !path) return { success: false, error: 'name and path are required' };
                const mock = await prisma.apiMock.upsert({
                    where: { userId_method_path: { userId, method: method.toUpperCase(), path } },
                    update: { name, statusCode, headers, body: body || {}, delay, active: true },
                    create: { userId, name, method: method.toUpperCase(), path, statusCode, headers, body: body || {}, delay },
                });
                return { success: true, mock: { id: mock.id, name: mock.name, method: mock.method, path: mock.path } };
            }

            case 'list': {
                const mocks = await prisma.apiMock.findMany({
                    where: { userId, active: true },
                    orderBy: { createdAt: 'desc' },
                });
                return { success: true, mocks };
            }

            case 'delete': {
                if (!opts.id) return { success: false, error: 'id is required' };
                await prisma.apiMock.delete({ where: { id: opts.id } });
                return { success: true, deleted: true };
            }

            case 'hit': {
                // Record a hit to a mock endpoint
                if (!opts.id) return { success: false, error: 'id is required' };
                const mock = await prisma.apiMock.update({
                    where: { id: opts.id },
                    data: { hitCount: { increment: 1 } },
                });
                if (mock.delay > 0) await new Promise(r => setTimeout(r, mock.delay));
                return { success: true, statusCode: mock.statusCode, headers: mock.headers, body: mock.body };
            }

            default:
                return { success: false, error: `Unknown api_mock action: ${action}` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── api_document ────────────────────────────────────────────────
async function apiDocument(params) {
    const { action = 'generate', ...opts } = params;

    try {
        switch (action) {
            case 'generate': {
                const { title = 'API Documentation', version = '1.0.0', description = '', endpoints = [] } = opts;
                const paths = {};
                for (const ep of endpoints) {
                    const pathKey = ep.path || '/';
                    if (!paths[pathKey]) paths[pathKey] = {};
                    paths[pathKey][(ep.method || 'get').toLowerCase()] = {
                        summary: ep.summary || '',
                        description: ep.description || '',
                        parameters: (ep.params || []).map(p => ({
                            name: p.name,
                            in: p.in || 'query',
                            required: p.required || false,
                            schema: { type: p.type || 'string' },
                        })),
                        responses: {
                            200: { description: ep.response || 'Success' },
                            400: { description: 'Bad request' },
                            500: { description: 'Server error' },
                        },
                    };
                }
                const openapi = {
                    openapi: '3.0.3',
                    info: { title, version, description },
                    paths,
                };
                return { success: true, openapi, json: JSON.stringify(openapi, null, 2) };
            }

            case 'validate': {
                const { spec } = opts;
                if (!spec) return { success: false, error: 'spec is required' };
                const parsed = typeof spec === 'string' ? JSON.parse(spec) : spec;
                const issues = [];
                if (!parsed.openapi) issues.push('Missing openapi version');
                if (!parsed.info?.title) issues.push('Missing info.title');
                if (!parsed.paths || Object.keys(parsed.paths).length === 0) issues.push('No paths defined');
                return { success: true, valid: issues.length === 0, issues };
            }

            default:
                return { success: false, error: `Unknown api_document action: ${action}` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── api_test ────────────────────────────────────────────────────
async function apiTest(params) {
    const { action = 'test', url, tests = [], ...opts } = params;

    try {
        switch (action) {
            case 'test': {
                if (!url && tests.length === 0) return { success: false, error: 'url or tests array required' };
                if (url && tests.length === 0) {
                    // Simple health check
                    const start = Date.now();
                    const res = await fetch(url, { timeout: 10000 });
                    return {
                        success: true,
                        url,
                        status: res.status,
                        latencyMs: Date.now() - start,
                        passed: res.ok,
                    };
                }
                // Run test suite
                const results = [];
                for (const test of tests) {
                    const start = Date.now();
                    try {
                        const res = await fetch(test.url || url, {
                            method: test.method || 'GET',
                            headers: test.headers || {},
                            body: test.body ? JSON.stringify(test.body) : undefined,
                            timeout: 10000,
                        });
                        const body = await res.json().catch(() => null);
                        const elapsed = Date.now() - start;
                        // Check assertions
                        let passed = true;
                        const failReasons = [];
                        if (test.expectStatus && res.status !== test.expectStatus) {
                            passed = false;
                            failReasons.push(`Expected status ${test.expectStatus}, got ${res.status}`);
                        }
                        if (test.expectBody) {
                            for (const [key, val] of Object.entries(test.expectBody)) {
                                if (body?.[key] !== val) {
                                    passed = false;
                                    failReasons.push(`Expected body.${key} = ${val}, got ${body?.[key]}`);
                                }
                            }
                        }
                        results.push({ name: test.name || test.url, passed, status: res.status, latencyMs: elapsed, failReasons });
                    } catch (e) {
                        results.push({ name: test.name || test.url, passed: false, error: e.message, latencyMs: Date.now() - start });
                    }
                }
                const passCount = results.filter(r => r.passed).length;
                return { success: true, results, passed: passCount, failed: results.length - passCount, total: results.length };
            }

            case 'load': {
                if (!url) return { success: false, error: 'url required' };
                const concurrent = opts.concurrent || 10;
                const duration = opts.duration || 5000;
                const results = { total: 0, success: 0, failed: 0, latencies: [] };
                const end = Date.now() + duration;
                const batch = async () => {
                    while (Date.now() < end) {
                        const start = Date.now();
                        try {
                            const res = await fetch(url, { timeout: 5000 });
                            results.total++;
                            if (res.ok) results.success++;
                            else results.failed++;
                            results.latencies.push(Date.now() - start);
                        } catch {
                            results.total++;
                            results.failed++;
                            results.latencies.push(Date.now() - start);
                        }
                    }
                };
                await Promise.all(Array(concurrent).fill(null).map(() => batch()));
                results.latencies.sort((a, b) => a - b);
                return {
                    success: true,
                    url,
                    totalRequests: results.total,
                    successCount: results.success,
                    failCount: results.failed,
                    avgLatencyMs: Math.round(results.latencies.reduce((a, b) => a + b, 0) / results.latencies.length),
                    p50Ms: results.latencies[Math.floor(results.latencies.length * 0.5)] || 0,
                    p95Ms: results.latencies[Math.floor(results.latencies.length * 0.95)] || 0,
                    p99Ms: results.latencies[Math.floor(results.latencies.length * 0.99)] || 0,
                    requestsPerSecond: Math.round(results.total / (duration / 1000)),
                };
            }

            default:
                return { success: false, error: `Unknown api_test action: ${action}` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── api_transform ───────────────────────────────────────────────
async function apiTransform(params) {
    const { action = 'rest_to_graphql', ...opts } = params;

    try {
        switch (action) {
            case 'rest_to_graphql': {
                const { endpoints = [] } = opts;
                const types = [];
                const queries = [];
                const mutations = [];
                for (const ep of endpoints) {
                    const name = ep.name || ep.path?.replace(/\//g, '_').replace(/^_/, '') || 'unknown';
                    const method = (ep.method || 'GET').toUpperCase();
                    if (method === 'GET') {
                        queries.push(`  ${name}(${(ep.params || []).map(p => `${p.name}: ${mapToGraphQLType(p.type)}`).join(', ')}): ${name}Response`);
                    } else {
                        mutations.push(`  ${name}(input: ${name}Input!): ${name}Response`);
                    }
                    types.push(`type ${name}Response {\n  success: Boolean!\n  data: JSON\n}`);
                }
                const schema = `${types.join('\n\n')}\n\ntype Query {\n${queries.join('\n')}\n}\n\ntype Mutation {\n${mutations.join('\n')}\n}`;
                return { success: true, schema };
            }

            case 'validate_schema': {
                const { schema, data } = opts;
                if (!schema) return { success: false, error: 'schema required' };
                // Basic JSON Schema validation
                const errors = [];
                if (schema.type && typeof data !== schema.type) errors.push(`Expected type ${schema.type}`);
                if (schema.required && Array.isArray(schema.required)) {
                    for (const key of schema.required) {
                        if (data === null || data === undefined || !(key in data)) errors.push(`Missing required field: ${key}`);
                    }
                }
                return { success: true, valid: errors.length === 0, errors };
            }

            default:
                return { success: false, error: `Unknown api_transform action: ${action}` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── webhook_listen ──────────────────────────────────────────────
async function webhookListen(params) {
    const { action = 'create', userId, ...opts } = params;
    if (!userId) return { success: false, error: 'userId is required' };

    try {
        switch (action) {
            case 'create': {
                const { name, events = [] } = opts;
                if (!name) return { success: false, error: 'name is required' };
                const webhookPath = `/webhooks/${userId.slice(0, 8)}/${crypto.randomBytes(8).toString('hex')}`;
                const secret = crypto.randomBytes(32).toString('hex');
                const webhook = await prisma.webhookEndpoint.create({
                    data: { userId, name, path: webhookPath, secret, events, active: true },
                });
                return { success: true, webhook: { id: webhook.id, name: webhook.name, path: webhook.path, secret } };
            }

            case 'list': {
                const webhooks = await prisma.webhookEndpoint.findMany({
                    where: { userId },
                    orderBy: { createdAt: 'desc' },
                });
                return { success: true, webhooks };
            }

            case 'logs': {
                if (!opts.id) return { success: false, error: 'webhook id required' };
                const webhook = await prisma.webhookEndpoint.findUnique({ where: { id: opts.id } });
                if (!webhook) return { success: false, error: 'Webhook not found' };
                return { success: true, logs: webhook.logs, hitCount: webhook.hitCount };
            }

            case 'delete': {
                if (!opts.id) return { success: false, error: 'webhook id required' };
                await prisma.webhookEndpoint.delete({ where: { id: opts.id } });
                return { success: true, deleted: true };
            }

            default:
                return { success: false, error: `Unknown webhook_listen action: ${action}` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── sdk_generate ────────────────────────────────────────────────
async function sdkGenerate(params) {
    const { action = 'generate', spec, language = 'javascript', ...opts } = params;

    try {
        if (!spec) return { success: false, error: 'OpenAPI spec required' };
        const parsed = typeof spec === 'string' ? JSON.parse(spec) : spec;
        const paths = parsed.paths || {};

        if (language === 'javascript' || language === 'typescript') {
            const ts = language === 'typescript';
            let code = `// Auto-generated SDK for ${parsed.info?.title || 'API'}\n`;
            code += `// Version: ${parsed.info?.version || '1.0.0'}\n\n`;
            code += `const BASE_URL = '${opts.baseUrl || 'https://api.example.com'}';\n\n`;
            code += `class ApiClient {\n  constructor(${ts ? 'private ' : ''}apiKey${ts ? ': string' : ''}) {\n    ${ts ? '' : 'this.apiKey = apiKey;\n  '}}\n\n`;
            code += `  async request(method${ts ? ': string' : ''}, path${ts ? ': string' : ''}, body${ts ? '?: any' : ''})${ts ? ': Promise<any>' : ''} {\n    const res = await fetch(BASE_URL + path, {\n      method,\n      headers: { 'Authorization': \`Bearer \${this.apiKey}\`, 'Content-Type': 'application/json' },\n      body: body ? JSON.stringify(body) : undefined,\n    });\n    return res.json();\n  }\n\n`;

            for (const [pathKey, methods] of Object.entries(paths)) {
                for (const [method, details] of Object.entries(methods)) {
                    const fnName = (details.operationId || `${method}_${pathKey}`).replace(/[^a-zA-Z0-9]/g, '_');
                    const params = (details.parameters || []).map(p => p.name);
                    const hasBody = ['post', 'put', 'patch'].includes(method);
                    code += `  async ${fnName}(${params.map(p => `${p}${ts ? ': string' : ''}`).join(', ')}${hasBody ? `${params.length ? ', ' : ''}body${ts ? ': any' : ''}` : ''}) {\n`;
                    let path = `'${pathKey}'`;
                    for (const p of params) path = path.replace(`{${p}}`, `\${${p}}`);
                    code += `    return this.request('${method.toUpperCase()}', \`${pathKey}\`${hasBody ? ', body' : ''});\n  }\n\n`;
                }
            }
            code += `}\n\nexport default ApiClient;\n`;
            return { success: true, code, language };
        }

        return { success: false, error: `Language ${language} not yet supported. Use javascript or typescript.` };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

function mapToGraphQLType(type) {
    const map = { string: 'String', number: 'Float', integer: 'Int', boolean: 'Boolean' };
    return map[type] || 'String';
}

export default {
    apiRequest,
    apiMock,
    apiDocument,
    apiTest,
    apiTransform,
    webhookListen,
    sdkGenerate,
};
