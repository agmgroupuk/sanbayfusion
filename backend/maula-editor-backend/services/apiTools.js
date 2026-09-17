import { createLogger } from '../lib/logger.js';
const log = createLogger('apiTools');
/**
 * ============================================================================
 * API & INTEGRATION TOOLS V2
 * ============================================================================
 * api_request, api_mock, api_document, api_test,
 * api_transform, api_monitor, api_rate_limit, api_auth,
 * webhook_listen, sdk_generate
 * ============================================================================
 */
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

const MAX_OUTPUT = 50000;

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

const API_TOOL_DEFINITIONS = [
    {
        name: 'api_request',
        description: 'Make HTTP requests: GET, POST, PUT, DELETE, PATCH with headers, body, auth, query params. Supports JSON/form/multipart.',
        input_schema: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'Request URL' },
                method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'], description: 'HTTP method. Default: GET' },
                headers: { type: 'object', description: 'Request headers object' },
                body: { type: 'object', description: 'Request body (auto-serialized as JSON)' },
                queryParams: { type: 'object', description: 'URL query parameters' },
                auth: { type: 'object', description: 'Auth: { type: "bearer"|"basic", token?, username?, password? }' },
                timeout: { type: 'number', description: 'Timeout in ms. Default: 30000' },
                followRedirects: { type: 'boolean', description: 'Follow redirects. Default: true' },
                responseType: { type: 'string', enum: ['json', 'text', 'headers_only'], description: 'Response parse type. Default: json' },
            },
            required: ['url'],
        },
    },
    {
        name: 'api_mock',
        description: 'Generate mock API data: fake users, products, addresses, orders, lorem ipsum, random data with schema constraints.',
        input_schema: {
            type: 'object',
            properties: {
                type: {
                    type: 'string',
                    enum: ['user', 'product', 'address', 'order', 'post', 'comment', 'company', 'custom'],
                    description: 'Data type to generate',
                },
                count: { type: 'number', description: 'Number of records. Default: 5' },
                schema: { type: 'object', description: '[custom] Field definitions: { name: "string", age: "number", active: "boolean" }' },
                locale: { type: 'string', description: 'Locale for data. Default: en' },
                seed: { type: 'number', description: 'Seed for reproducible data' },
            },
            required: ['type'],
        },
    },
    {
        name: 'api_document',
        description: 'Generate API documentation: OpenAPI/Swagger spec from routes, markdown docs, endpoint inventory.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['generate_openapi', 'generate_markdown', 'endpoint_inventory', 'validate_spec', 'parse_spec'],
                    description: 'Documentation action',
                },
                path: { type: 'string', description: 'Directory with route files, or OpenAPI spec file' },
                title: { type: 'string', description: 'API title for docs. Default: "API Documentation"' },
                basePath: { type: 'string', description: 'Base URL path. Default: /api' },
                outputPath: { type: 'string', description: 'Where to write output' },
            },
            required: ['action'],
        },
    },
    {
        name: 'api_test',
        description: 'Test API endpoints: health checks, response validation, load testing, sequential scenario testing.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['health_check', 'validate_response', 'load_test', 'scenario', 'status_check'],
                    description: 'Test action',
                },
                url: { type: 'string', description: 'Endpoint URL' },
                method: { type: 'string', description: 'HTTP method. Default: GET' },
                expectedStatus: { type: 'number', description: '[validate_response] Expected HTTP status code' },
                expectedBody: { type: 'object', description: '[validate_response] Expected response body properties' },
                requests: { type: 'number', description: '[load_test] Number of requests. Default: 10' },
                concurrency: { type: 'number', description: '[load_test] Concurrent requests. Default: 5' },
                steps: { type: 'array', items: { type: 'object' }, description: '[scenario] Array of { url, method, body, headers, assert }' },
            },
            required: ['action'],
        },
    },
    {
        name: 'api_transform',
        description: 'Transform API data: JSON to XML, XML to JSON, CSV to JSON, flatten/unflatten, schema conversion.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['json_to_xml', 'xml_to_json', 'csv_to_json', 'json_to_csv', 'flatten', 'unflatten', 'json_to_yaml', 'yaml_to_json'],
                    description: 'Transform action',
                },
                input: { type: 'string', description: 'Input data (string or file path)' },
                isFile: { type: 'boolean', description: 'If true, input is a file path. Default: false' },
                outputPath: { type: 'string', description: 'Optional output file' },
            },
            required: ['action', 'input'],
        },
    },
    {
        name: 'webhook_listen',
        description: 'Inspect webhook configs: list registered hooks, test webhook delivery, generate webhook handler code.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['generate_handler', 'test_delivery', 'list_hooks', 'generate_payload'],
                    description: 'Webhook action',
                },
                url: { type: 'string', description: '[test_delivery] Webhook URL to test' },
                event: { type: 'string', description: 'Event type. E.g. "order.created", "user.signup"' },
                payload: { type: 'object', description: '[test_delivery] Custom payload' },
                framework: { type: 'string', enum: ['express', 'fastify', 'nextjs', 'generic'], description: '[generate_handler] Framework. Default: express' },
                secret: { type: 'string', description: 'Webhook signing secret' },
            },
            required: ['action'],
        },
    },
    {
        name: 'sdk_generate',
        description: 'Generate API client SDK code: TypeScript fetch wrapper, axios client, with types from OpenAPI spec or endpoint list.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['from_openapi', 'from_endpoints', 'typescript_client', 'fetch_wrapper'],
                    description: 'Generation action',
                },
                specPath: { type: 'string', description: '[from_openapi] Path to OpenAPI spec' },
                endpoints: { type: 'array', items: { type: 'object' }, description: '[from_endpoints] Array of { method, path, description, params, body, response }' },
                outputPath: { type: 'string', description: 'Output directory' },
                clientName: { type: 'string', description: 'SDK client class name. Default: "ApiClient"' },
                baseUrl: { type: 'string', description: 'Base API URL' },
            },
            required: ['action'],
        },
    },
    {
        name: 'api_monitor',
        description: `API uptime monitoring and health tracking. Check endpoint availability, measure response times, detect outages, and generate status pages.

Actions:
- ping: Quick availability check with response time measurement
- health_report: Multi-endpoint health report (status, latency, success rate)
- uptime_check: Periodic ping simulation with success/failure stats
- status_page: Generate a status page JSON/HTML from endpoint list
- latency_benchmark: Measure P50/P95/P99 latency over N requests

USE THIS WHEN the user says: "is the API up", "check endpoint health", "monitor API", "generate status page", "latency check", "uptime report", "is the server responding"`,
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['ping', 'health_report', 'uptime_check', 'status_page', 'latency_benchmark'],
                    description: 'Monitoring action',
                },
                url: { type: 'string', description: 'Endpoint URL to monitor' },
                urls: { type: 'array', items: { type: 'string' }, description: 'Multiple URLs for health_report/status_page' },
                count: { type: 'number', description: 'Number of pings/requests for uptime_check/latency_benchmark. Default: 10' },
                interval: { type: 'number', description: 'Interval between pings in ms. Default: 1000' },
                timeout: { type: 'number', description: 'Request timeout in ms. Default: 5000' },
                headers: { type: 'object', description: 'Custom headers for requests' },
                expectedStatus: { type: 'number', description: 'Expected HTTP status code. Default: 200' },
            },
            required: ['action'],
        },
    },
    {
        name: 'api_rate_limit',
        description: `API rate limit testing and throttle simulation. Test how endpoints behave under rate limiting, simulate burst traffic, check rate limit headers.

Actions:
- test_limit: Send rapid requests to detect rate limit threshold (429 detection)
- burst_test: Send N concurrent requests and report success/rejection ratio
- header_check: Inspect rate limit headers (X-RateLimit-Limit, Retry-After, etc.)
- simulate_throttle: Generate rate limiter middleware code (Express, Fastify, generic)
- quota_report: Summarize rate limit behavior from a series of test requests

USE THIS WHEN the user says: "test rate limit", "how many requests can I send", "burst test", "check throttling", "rate limit headers", "generate rate limiter", "quota check"`,
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['test_limit', 'burst_test', 'header_check', 'simulate_throttle', 'quota_report'],
                    description: 'Rate limit action',
                },
                url: { type: 'string', description: 'Endpoint URL to test' },
                method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'], description: 'HTTP method. Default: GET' },
                requests: { type: 'number', description: 'Number of requests to send. Default: 20' },
                concurrency: { type: 'number', description: 'Concurrent requests for burst_test. Default: 10' },
                delay: { type: 'number', description: 'Delay between requests in ms. Default: 100' },
                headers: { type: 'object', description: 'Custom headers (include auth tokens if needed)' },
                framework: { type: 'string', enum: ['express', 'fastify', 'nextjs', 'generic'], description: '[simulate_throttle] Framework for generated code. Default: express' },
                windowMs: { type: 'number', description: '[simulate_throttle] Rate limit window in ms. Default: 60000' },
                maxRequests: { type: 'number', description: '[simulate_throttle] Max requests per window. Default: 100' },
            },
            required: ['action'],
        },
    },
    {
        name: 'api_auth',
        description: `API authentication generation and testing. Generate auth middleware, create JWT tokens, test OAuth flows, validate API keys.

Actions:
- generate_jwt: Create a JWT token with custom payload and expiry
- validate_jwt: Decode and validate a JWT token (check expiry, signature format)
- generate_middleware: Generate auth middleware code (JWT, API key, OAuth2, basic auth)
- generate_oauth_flow: Generate OAuth2 authorization code flow boilerplate
- generate_api_key: Generate secure random API keys with optional prefix
- test_auth: Test an endpoint with various auth methods (bearer, basic, API key)

USE THIS WHEN the user says: "generate JWT", "create auth middleware", "test authentication", "OAuth setup", "generate API key", "validate token", "auth flow", "secure this endpoint"`,
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['generate_jwt', 'validate_jwt', 'generate_middleware', 'generate_oauth_flow', 'generate_api_key', 'test_auth'],
                    description: 'Auth action',
                },
                payload: { type: 'object', description: '[generate_jwt] JWT payload (claims)' },
                secret: { type: 'string', description: '[generate_jwt/validate_jwt] JWT secret' },
                expiresIn: { type: 'string', description: '[generate_jwt] Expiry: "1h", "7d", "30m". Default: "1h"' },
                token: { type: 'string', description: '[validate_jwt] JWT token to validate' },
                authType: { type: 'string', enum: ['jwt', 'api_key', 'oauth2', 'basic'], description: '[generate_middleware] Auth type. Default: jwt' },
                framework: { type: 'string', enum: ['express', 'fastify', 'nextjs', 'generic'], description: '[generate_middleware/oauth_flow] Framework. Default: express' },
                prefix: { type: 'string', description: '[generate_api_key] Key prefix. E.g. "sk_live_"' },
                keyCount: { type: 'number', description: '[generate_api_key] Number of keys to generate. Default: 1' },
                url: { type: 'string', description: '[test_auth] Endpoint URL to test' },
                method: { type: 'string', description: '[test_auth] HTTP method. Default: GET' },
                auth: { type: 'object', description: '[test_auth] Auth config: { type: "bearer"|"basic"|"api_key", token?, username?, password?, key?, header? }' },
            },
            required: ['action'],
        },
    },
];

// ============================================================================
// EXECUTORS
// ============================================================================

function httpRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const client = parsedUrl.protocol === 'https:' ? https : http;
        const reqOptions = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port,
            path: parsedUrl.pathname + parsedUrl.search,
            method: options.method || 'GET',
            headers: options.headers || {},
            timeout: options.timeout || 30000,
        };

        const req = client.request(reqOptions, (res) => {
            let body = '';
            res.on('data', (chunk) => { body += chunk; if (body.length > 500000) res.destroy(); });
            res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body }));
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
        if (options.body) req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
        req.end();
    });
}

async function executeApiRequest(input) {
    const { url, method = 'GET', headers = {}, body, queryParams, auth, timeout = 30000, followRedirects = true, responseType = 'json' } = input;

    let fullUrl = url;
    if (queryParams) {
        const params = new URLSearchParams(queryParams);
        fullUrl += (fullUrl.includes('?') ? '&' : '?') + params.toString();
    }

    const reqHeaders = { ...headers };
    if (body && !reqHeaders['Content-Type']) reqHeaders['Content-Type'] = 'application/json';
    if (auth) {
        if (auth.type === 'bearer' && auth.token) reqHeaders.Authorization = `Bearer ${auth.token}`;
        if (auth.type === 'basic' && auth.username) reqHeaders.Authorization = `Basic ${Buffer.from(`${auth.username}:${auth.password || ''}`).toString('base64')}`;
    }

    try {
        const start = Date.now();
        const response = await httpRequest(fullUrl, { method, headers: reqHeaders, body, timeout });
        const elapsed = Date.now() - start;

        const result = { status: 'success', statusCode: response.statusCode, timeMs: elapsed, headers: response.headers };
        if (responseType === 'headers_only') return JSON.stringify(result);
        if (responseType === 'json') {
            try { result.body = JSON.parse(response.body); } catch { result.body = response.body.slice(0, MAX_OUTPUT); }
        } else {
            result.body = response.body.slice(0, MAX_OUTPUT);
        }
        return JSON.stringify(result);
    } catch (e) {
        return JSON.stringify({ status: 'error', error: e.message });
    }
}

async function executeApiMock(input) {
    const { type, count = 5, schema, seed } = input;
    const rng = seed ? seedRng(seed) : Math.random;

    const generators = {
        user: () => ({ id: randId(rng), name: randName(rng), email: randEmail(rng), role: pick(['admin', 'user', 'editor'], rng), createdAt: randDate(rng), active: rng() > 0.2 }),
        product: () => ({ id: randId(rng), name: `Product ${randWord(rng)}`, price: +(rng() * 200 + 5).toFixed(2), category: pick(['Electronics', 'Books', 'Clothing', 'Food', 'Sports'], rng), inStock: rng() > 0.3, rating: +(rng() * 4 + 1).toFixed(1) }),
        address: () => ({ id: randId(rng), street: `${Math.floor(rng() * 9999) + 1} ${randWord(rng)} St`, city: pick(['New York', 'London', 'Tokyo', 'Berlin', 'Sydney', 'Paris'], rng), state: pick(['NY', 'CA', 'TX', 'FL', 'WA'], rng), zip: String(Math.floor(rng() * 90000) + 10000), country: 'US' }),
        order: () => ({ id: randId(rng), userId: randId(rng), items: randInt(1, 5, rng), total: +(rng() * 500 + 10).toFixed(2), status: pick(['pending', 'processing', 'shipped', 'delivered', 'cancelled'], rng), createdAt: randDate(rng) }),
        post: () => ({ id: randId(rng), title: `${randWord(rng)} ${randWord(rng)} ${randWord(rng)}`, body: lorem(rng), author: randName(rng), tags: [randWord(rng), randWord(rng)], publishedAt: randDate(rng) }),
        comment: () => ({ id: randId(rng), postId: randId(rng), author: randName(rng), body: lorem(rng, 1), createdAt: randDate(rng) }),
        company: () => ({ id: randId(rng), name: `${randWord(rng)} ${pick(['Inc', 'LLC', 'Corp', 'Ltd', 'Co'], rng)}`, industry: pick(['Technology', 'Healthcare', 'Finance', 'Education', 'Retail'], rng), employees: randInt(5, 10000, rng), founded: randInt(1950, 2023, rng), revenue: `$${randInt(1, 500, rng)}M` }),
        custom: () => {
            if (!schema) return { error: 'schema required for custom type' };
            const obj = {};
            for (const [key, type] of Object.entries(schema)) {
                if (type === 'string') obj[key] = randWord(rng);
                else if (type === 'number') obj[key] = +(rng() * 1000).toFixed(2);
                else if (type === 'boolean') obj[key] = rng() > 0.5;
                else if (type === 'date') obj[key] = randDate(rng);
                else if (type === 'email') obj[key] = randEmail(rng);
                else if (type === 'id') obj[key] = randId(rng);
                else obj[key] = randWord(rng);
            }
            return obj;
        },
    };

    const gen = generators[type];
    if (!gen) return JSON.stringify({ status: 'error', error: `Unknown mock type: ${type}` });
    const data = Array.from({ length: Math.min(count, 1000) }, gen);
    return JSON.stringify({ status: 'success', type, count: data.length, data });
}

async function executeApiDocument(input) {
    const { action, path: targetPath, title = 'API Documentation', basePath = '/api', outputPath } = input;

    switch (action) {
        case 'endpoint_inventory':
        case 'generate_openapi':
        case 'generate_markdown': {
            if (!targetPath) return JSON.stringify({ status: 'error', error: 'path required' });
            const routeFiles = [];
            const walk = (dir) => {
                if (!fs.existsSync(dir)) return;
                fs.readdirSync(dir).forEach(f => {
                    const fp = path.join(dir, f);
                    if (fs.statSync(fp).isDirectory()) walk(fp);
                    else if (/\.(js|ts)$/.test(f)) routeFiles.push(fp);
                });
            };
            if (fs.statSync(targetPath).isDirectory()) walk(targetPath);
            else routeFiles.push(targetPath);

            const endpoints = [];
            for (const fp of routeFiles) {
                const content = fs.readFileSync(fp, 'utf-8');
                const methods = [...content.matchAll(/router\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/gi)];
                const appMethods = [...content.matchAll(/app\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/gi)];
                [...methods, ...appMethods].forEach(m => {
                    endpoints.push({ method: m[1].toUpperCase(), path: m[2], file: path.basename(fp) });
                });
            }

            if (action === 'endpoint_inventory') {
                return JSON.stringify({ status: 'success', totalEndpoints: endpoints.length, endpoints });
            }

            if (action === 'generate_openapi') {
                const spec = {
                    openapi: '3.0.0',
                    info: { title, version: '1.0.0' },
                    servers: [{ url: basePath }],
                    paths: {},
                };
                endpoints.forEach(ep => {
                    const p = ep.path;
                    if (!spec.paths[p]) spec.paths[p] = {};
                    spec.paths[p][ep.method.toLowerCase()] = {
                        summary: `${ep.method} ${ep.path}`,
                        tags: [ep.file.replace(/\.\w+$/, '')],
                        responses: { 200: { description: 'Success' } },
                    };
                });
                const out = outputPath || 'openapi.json';
                fs.writeFileSync(out, JSON.stringify(spec, null, 2));
                return JSON.stringify({ status: 'success', file: out, endpoints: endpoints.length });
            }

            if (action === 'generate_markdown') {
                const md = [`# ${title}\n\n`];
                const byFile = {};
                endpoints.forEach(ep => {
                    if (!byFile[ep.file]) byFile[ep.file] = [];
                    byFile[ep.file].push(ep);
                });
                for (const [file, eps] of Object.entries(byFile)) {
                    md.push(`## ${file}\n\n`);
                    eps.forEach(ep => md.push(`- **${ep.method}** \`${ep.path}\`\n`));
                    md.push('\n');
                }
                const doc = md.join('');
                if (outputPath) fs.writeFileSync(outputPath, doc);
                return JSON.stringify({ status: 'success', output: doc.slice(0, MAX_OUTPUT) });
            }
            break;
        }
        default:
            return JSON.stringify({ status: 'error', error: `Unknown document action: ${action}` });
    }
}

async function executeApiTest(input) {
    const { action, url, method = 'GET', expectedStatus, expectedBody, requests = 10, concurrency = 5, steps } = input;

    switch (action) {
        case 'health_check':
        case 'status_check': {
            if (!url) return JSON.stringify({ status: 'error', error: 'url required' });
            try {
                const start = Date.now();
                const res = await httpRequest(url, { method: 'GET', timeout: 10000 });
                return JSON.stringify({ status: 'success', url, statusCode: res.statusCode, timeMs: Date.now() - start, healthy: res.statusCode < 400 });
            } catch (e) {
                return JSON.stringify({ status: 'error', url, healthy: false, error: e.message });
            }
        }
        case 'validate_response': {
            if (!url) return JSON.stringify({ status: 'error', error: 'url required' });
            const res = await httpRequest(url, { method, timeout: 15000 });
            const checks = [];
            if (expectedStatus) checks.push({ check: 'status', expected: expectedStatus, actual: res.statusCode, pass: res.statusCode === expectedStatus });
            if (expectedBody) {
                try {
                    const body = JSON.parse(res.body);
                    for (const [key, val] of Object.entries(expectedBody)) {
                        checks.push({ check: `body.${key}`, expected: val, actual: body[key], pass: body[key] == val });
                    }
                } catch { checks.push({ check: 'json_parse', pass: false, error: 'Response is not valid JSON' }); }
            }
            const allPassed = checks.every(c => c.pass);
            return JSON.stringify({ status: allPassed ? 'success' : 'error', passed: allPassed, checks });
        }
        case 'load_test': {
            if (!url) return JSON.stringify({ status: 'error', error: 'url required' });
            const times = [];
            const errors = [];
            const statusCodes = {};

            const batch = async (batchUrls) => {
                return Promise.all(batchUrls.map(async () => {
                    const start = Date.now();
                    try {
                        const res = await httpRequest(url, { method, timeout: 30000 });
                        times.push(Date.now() - start);
                        statusCodes[res.statusCode] = (statusCodes[res.statusCode] || 0) + 1;
                    } catch (e) { errors.push(e.message); }
                }));
            };

            for (let i = 0; i < requests; i += concurrency) {
                const batchSize = Math.min(concurrency, requests - i);
                await batch(Array(batchSize).fill(null));
            }

            times.sort((a, b) => a - b);
            return JSON.stringify({
                status: 'success', totalRequests: requests, successful: times.length, failed: errors.length,
                avgMs: times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0,
                minMs: times[0] || 0, maxMs: times[times.length - 1] || 0,
                p50Ms: times[Math.floor(times.length * 0.5)] || 0,
                p95Ms: times[Math.floor(times.length * 0.95)] || 0,
                statusCodes,
            });
        }
        case 'scenario': {
            if (!steps || steps.length === 0) return JSON.stringify({ status: 'error', error: 'steps array required' });
            const results = [];
            for (const step of steps) {
                try {
                    const start = Date.now();
                    const res = await httpRequest(step.url, { method: step.method || 'GET', headers: step.headers, body: step.body, timeout: 15000 });
                    const elapsed = Date.now() - start;
                    let passed = true;
                    if (step.assert?.status && res.statusCode !== step.assert.status) passed = false;
                    results.push({ url: step.url, method: step.method || 'GET', statusCode: res.statusCode, timeMs: elapsed, passed });
                } catch (e) {
                    results.push({ url: step.url, method: step.method || 'GET', error: e.message, passed: false });
                }
            }
            return JSON.stringify({ status: 'success', steps: results.length, allPassed: results.every(r => r.passed), results });
        }
        default:
            return JSON.stringify({ status: 'error', error: `Unknown test action: ${action}` });
    }
}

async function executeApiTransform(input) {
    const { action, input: rawInput, isFile = false, outputPath } = input;
    const content = isFile ? fs.readFileSync(rawInput, 'utf-8') : rawInput;

    switch (action) {
        case 'json_to_xml': {
            const json = JSON.parse(content);
            const xml = jsonToXml(json, 'root');
            if (outputPath) fs.writeFileSync(outputPath, xml);
            return JSON.stringify({ status: 'success', output: xml.slice(0, MAX_OUTPUT) });
        }
        case 'xml_to_json': {
            const json = simpleXmlToJson(content);
            if (outputPath) fs.writeFileSync(outputPath, JSON.stringify(json, null, 2));
            return JSON.stringify({ status: 'success', output: json });
        }
        case 'csv_to_json': {
            const lines = content.split('\n').filter(l => l.trim());
            const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
            const data = lines.slice(1).map(line => {
                const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
                const obj = {};
                headers.forEach((h, i) => { obj[h] = vals[i]; });
                return obj;
            });
            if (outputPath) fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
            return JSON.stringify({ status: 'success', rows: data.length, data: data.slice(0, 100) });
        }
        case 'json_to_csv': {
            const data = JSON.parse(content);
            if (!Array.isArray(data) || data.length === 0) return JSON.stringify({ status: 'error', error: 'Input must be a non-empty JSON array' });
            const headers = Object.keys(data[0]);
            const csv = [headers.join(','), ...data.map(row => headers.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(','))].join('\n');
            if (outputPath) fs.writeFileSync(outputPath, csv);
            return JSON.stringify({ status: 'success', rows: data.length, output: csv.slice(0, MAX_OUTPUT) });
        }
        case 'flatten': {
            const json = JSON.parse(content);
            const flat = flattenObject(json);
            if (outputPath) fs.writeFileSync(outputPath, JSON.stringify(flat, null, 2));
            return JSON.stringify({ status: 'success', keys: Object.keys(flat).length, output: flat });
        }
        case 'unflatten': {
            const flat = JSON.parse(content);
            const nested = unflattenObject(flat);
            if (outputPath) fs.writeFileSync(outputPath, JSON.stringify(nested, null, 2));
            return JSON.stringify({ status: 'success', output: nested });
        }
        default:
            return JSON.stringify({ status: 'error', error: `Unknown transform action: ${action}` });
    }
}

async function executeWebhook(input) {
    const { action, url, event = 'generic.event', payload, framework = 'express', secret } = input;

    switch (action) {
        case 'generate_handler': {
            const handlers = {
                express: `
import express from 'express';
import crypto from 'crypto';

const router = express.Router();

function verifySignature(req, secret) {
  const sig = req.headers['x-webhook-signature'];
  const hash = crypto.createHmac('sha256', secret).update(JSON.stringify(req.body)).digest('hex');
  return sig === hash;
}

router.post('/webhook/${event.replace('.', '/')}', express.json(), (req, res) => {
  ${secret ? `if (!verifySignature(req, '${secret}')) return res.status(401).json({ error: 'Invalid signature' });` : '// Add signature verification'}
  
  const { type, data } = req.body;
  log.info(\`Webhook received: \${type}\`, data);
  
  // Handle the event
  switch(type) {
    case '${event}':
      // Process event
      break;
    default:
      log.info(\`Unhandled event: \${type}\`);
  }
  
  res.status(200).json({ received: true });
});

export default router;
`.trim(),
                nextjs: `
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request) {
  const body = await request.json();
  ${secret ? `const sig = request.headers.get('x-webhook-signature');
  const hash = crypto.createHmac('sha256', '${secret}').update(JSON.stringify(body)).digest('hex');
  if (sig !== hash) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });` : '// Add signature verification'}
  
  log.info('Webhook:', body);
  return NextResponse.json({ received: true });
}
`.trim(),
            };
            return JSON.stringify({ status: 'success', framework, event, code: handlers[framework] || handlers.express });
        }
        case 'test_delivery': {
            if (!url) return JSON.stringify({ status: 'error', error: 'url required' });
            const testPayload = payload || { type: event, data: { id: `test_${Date.now()}`, timestamp: new Date().toISOString() } };
            const headers = { 'Content-Type': 'application/json' };
            if (secret) {
                const crypto = await import('crypto');
                headers['x-webhook-signature'] = crypto.createHmac('sha256', secret).update(JSON.stringify(testPayload)).digest('hex');
            }
            try {
                const res = await httpRequest(url, { method: 'POST', headers, body: testPayload, timeout: 10000 });
                return JSON.stringify({ status: 'success', delivered: true, statusCode: res.statusCode, response: res.body.slice(0, 5000) });
            } catch (e) {
                return JSON.stringify({ status: 'error', delivered: false, error: e.message });
            }
        }
        case 'generate_payload': {
            const payloads = {
                'order.created': { type: 'order.created', data: { orderId: `ord_${Date.now()}`, total: 99.99, currency: 'USD', items: 3, customer: { email: 'test@example.com' } } },
                'user.signup': { type: 'user.signup', data: { userId: `usr_${Date.now()}`, email: 'new@example.com', plan: 'free', createdAt: new Date().toISOString() } },
                'payment.success': { type: 'payment.success', data: { paymentId: `pay_${Date.now()}`, amount: 49.99, currency: 'USD', method: 'card' } },
            };
            const p = payloads[event] || { type: event, data: { id: `evt_${Date.now()}`, timestamp: new Date().toISOString() }, metadata: {} };
            return JSON.stringify({ status: 'success', event, payload: p });
        }
        default:
            return JSON.stringify({ status: 'error', error: `Unknown webhook action: ${action}` });
    }
}

async function executeSdkGenerate(input) {
    const { action, endpoints = [], outputPath, clientName = 'ApiClient', baseUrl = '/api' } = input;

    const code = `/**
 * Auto-generated API Client
 * Generated at: ${new Date().toISOString()}
 */

export class ${clientName} {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(baseUrl = '${baseUrl}', token?: string) {
    this.baseUrl = baseUrl;
    this.headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: \`Bearer \${token}\` } : {}),
    };
  }

  private async request<T>(method: string, path: string, body?: any, params?: Record<string, string>): Promise<T> {
    const url = new URL(path, this.baseUrl);
    if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString(), {
      method,
      headers: this.headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(\`HTTP \${res.status}: \${await res.text()}\`);
    return res.json();
  }

${endpoints.map(ep => `  /** ${ep.description || `${ep.method || 'GET'} ${ep.path}`} */
  async ${methodName(ep)}(${methodParams(ep)}): Promise<any> {
    return this.request('${(ep.method || 'GET').toUpperCase()}', '${ep.path}'${ep.body ? ', body' : ', undefined'}${ep.params ? ', params' : ''});
  }`).join('\n\n')}
}

export default ${clientName};
`;

    if (outputPath) {
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(outputPath, code);
        return JSON.stringify({ status: 'success', file: outputPath, endpoints: endpoints.length });
    }
    return JSON.stringify({ status: 'success', code: code.slice(0, MAX_OUTPUT) });
}

// ============================================================================
// EXECUTOR: api_monitor
// ============================================================================

async function executeApiMonitor(input) {
    const { action, url, urls = [], count = 10, interval = 1000, timeout = 5000, headers = {}, expectedStatus = 200 } = input;

    switch (action) {
        case 'ping': {
            if (!url) return JSON.stringify({ status: 'error', error: 'url required' });
            const start = Date.now();
            try {
                const res = await httpRequest(url, { method: 'GET', headers, timeout });
                const latency = Date.now() - start;
                const ok = res.statusCode === expectedStatus;
                return JSON.stringify({ status: 'success', url, available: ok, statusCode: res.statusCode, latencyMs: latency, expectedStatus, timestamp: new Date().toISOString() });
            } catch (e) {
                return JSON.stringify({ status: 'success', url, available: false, error: e.message, latencyMs: Date.now() - start, timestamp: new Date().toISOString() });
            }
        }
        case 'health_report': {
            const targets = urls.length ? urls : (url ? [url] : []);
            if (!targets.length) return JSON.stringify({ status: 'error', error: 'url or urls required' });
            const results = [];
            for (const u of targets) {
                const start = Date.now();
                try {
                    const res = await httpRequest(u, { method: 'GET', headers, timeout });
                    results.push({ url: u, status: res.statusCode === expectedStatus ? 'healthy' : 'degraded', statusCode: res.statusCode, latencyMs: Date.now() - start });
                } catch (e) {
                    results.push({ url: u, status: 'down', error: e.message, latencyMs: Date.now() - start });
                }
            }
            const healthy = results.filter(r => r.status === 'healthy').length;
            return JSON.stringify({ status: 'success', summary: { total: results.length, healthy, degraded: results.filter(r => r.status === 'degraded').length, down: results.filter(r => r.status === 'down').length }, endpoints: results, timestamp: new Date().toISOString() });
        }
        case 'uptime_check': {
            if (!url) return JSON.stringify({ status: 'error', error: 'url required' });
            let successes = 0, failures = 0;
            const latencies = [];
            for (let i = 0; i < Math.min(count, 50); i++) {
                const start = Date.now();
                try {
                    const res = await httpRequest(url, { method: 'GET', headers, timeout });
                    const lat = Date.now() - start;
                    latencies.push(lat);
                    if (res.statusCode === expectedStatus) successes++;
                    else failures++;
                } catch (e) {
                    failures++;
                    latencies.push(timeout);
                }
                if (i < count - 1) await new Promise(r => setTimeout(r, Math.min(interval, 2000)));
            }
            const sorted = [...latencies].sort((a, b) => a - b);
            return JSON.stringify({
                status: 'success', url, pings: count, successes, failures,
                uptimePercent: ((successes / count) * 100).toFixed(2),
                latency: { avg: Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length), min: sorted[0], max: sorted[sorted.length - 1], p50: sorted[Math.floor(sorted.length * 0.5)], p95: sorted[Math.floor(sorted.length * 0.95)] },
                timestamp: new Date().toISOString(),
            });
        }
        case 'status_page': {
            const targets = urls.length ? urls : (url ? [url] : []);
            if (!targets.length) return JSON.stringify({ status: 'error', error: 'url or urls required' });
            const services = [];
            for (const u of targets) {
                const start = Date.now();
                try {
                    const res = await httpRequest(u, { method: 'GET', headers, timeout });
                    services.push({ name: new URL(u).hostname + new URL(u).pathname, url: u, status: res.statusCode === expectedStatus ? 'operational' : 'degraded', responseTime: Date.now() - start });
                } catch (e) {
                    services.push({ name: u, url: u, status: 'outage', responseTime: null, error: e.message });
                }
            }
            const allOk = services.every(s => s.status === 'operational');
            const pageJson = { title: 'API Status', overallStatus: allOk ? 'All Systems Operational' : 'Some Issues Detected', generatedAt: new Date().toISOString(), services };
            return JSON.stringify({ status: 'success', statusPage: pageJson });
        }
        case 'latency_benchmark': {
            if (!url) return JSON.stringify({ status: 'error', error: 'url required' });
            const latencies = [];
            const n = Math.min(count, 100);
            for (let i = 0; i < n; i++) {
                const start = Date.now();
                try {
                    await httpRequest(url, { method: 'GET', headers, timeout });
                    latencies.push(Date.now() - start);
                } catch (e) {
                    latencies.push(-1);
                }
            }
            const valid = latencies.filter(l => l >= 0).sort((a, b) => a - b);
            const pct = (p) => valid[Math.floor(valid.length * p)] || null;
            return JSON.stringify({
                status: 'success', url, totalRequests: n, successful: valid.length, failed: n - valid.length,
                latency: { avg: valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : null, min: valid[0] || null, max: valid[valid.length - 1] || null, p50: pct(0.5), p95: pct(0.95), p99: pct(0.99) },
                timestamp: new Date().toISOString(),
            });
        }
        default:
            return JSON.stringify({ status: 'error', error: `Unknown monitor action: ${action}` });
    }
}

// ============================================================================
// EXECUTOR: api_rate_limit
// ============================================================================

async function executeApiRateLimit(input) {
    const { action, url, method = 'GET', requests = 20, concurrency = 10, delay = 100, headers = {}, framework = 'express', windowMs = 60000, maxRequests = 100 } = input;

    switch (action) {
        case 'test_limit': {
            if (!url) return JSON.stringify({ status: 'error', error: 'url required' });
            const results = [];
            const n = Math.min(requests, 100);
            for (let i = 0; i < n; i++) {
                try {
                    const res = await httpRequest(url, { method, headers, timeout: 10000 });
                    const rlHeaders = {};
                    if (res.headers['x-ratelimit-limit']) rlHeaders.limit = res.headers['x-ratelimit-limit'];
                    if (res.headers['x-ratelimit-remaining']) rlHeaders.remaining = res.headers['x-ratelimit-remaining'];
                    if (res.headers['retry-after']) rlHeaders.retryAfter = res.headers['retry-after'];
                    results.push({ request: i + 1, statusCode: res.statusCode, rateLimited: res.statusCode === 429, rateLimitHeaders: rlHeaders });
                    if (res.statusCode === 429) break;
                } catch (e) {
                    results.push({ request: i + 1, error: e.message });
                }
                if (delay > 0 && i < n - 1) await new Promise(r => setTimeout(r, Math.min(delay, 500)));
            }
            const limited = results.find(r => r.rateLimited);
            return JSON.stringify({ status: 'success', url, sentRequests: results.length, rateLimitHit: !!limited, hitAtRequest: limited ? limited.request : null, results: results.slice(-10) });
        }
        case 'burst_test': {
            if (!url) return JSON.stringify({ status: 'error', error: 'url required' });
            const c = Math.min(concurrency, 50);
            const promises = Array.from({ length: c }, (_, i) =>
                httpRequest(url, { method, headers, timeout: 10000 }).then(res => ({ request: i + 1, statusCode: res.statusCode, rateLimited: res.statusCode === 429 })).catch(e => ({ request: i + 1, error: e.message }))
            );
            const results = await Promise.all(promises);
            const accepted = results.filter(r => r.statusCode && r.statusCode < 400).length;
            const rejected = results.filter(r => r.rateLimited).length;
            const errors = results.filter(r => r.error).length;
            return JSON.stringify({ status: 'success', url, concurrentRequests: c, accepted, rejected, errors, acceptRate: ((accepted / c) * 100).toFixed(1) + '%', results });
        }
        case 'header_check': {
            if (!url) return JSON.stringify({ status: 'error', error: 'url required' });
            try {
                const res = await httpRequest(url, { method, headers, timeout: 10000 });
                const rl = {};
                const headerMap = { 'x-ratelimit-limit': 'limit', 'x-ratelimit-remaining': 'remaining', 'x-ratelimit-reset': 'reset', 'retry-after': 'retryAfter', 'x-ratelimit-policy': 'policy', 'ratelimit-limit': 'limit2', 'ratelimit-remaining': 'remaining2', 'ratelimit-reset': 'reset2' };
                for (const [h, key] of Object.entries(headerMap)) {
                    if (res.headers[h]) rl[key] = res.headers[h];
                }
                return JSON.stringify({ status: 'success', url, statusCode: res.statusCode, rateLimitHeaders: rl, hasRateLimiting: Object.keys(rl).length > 0 });
            } catch (e) {
                return JSON.stringify({ status: 'error', error: e.message });
            }
        }
        case 'simulate_throttle': {
            const code = {
                express: `import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: ${windowMs}, // ${windowMs / 1000}s window
  max: ${maxRequests},
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  keyGenerator: (req) => req.ip,
});

// Apply to all routes: app.use(limiter)
// Apply to specific route: app.use('/api', limiter)
export default limiter;`,
                fastify: `import fastifyRateLimit from '@fastify/rate-limit';

await fastify.register(fastifyRateLimit, {
  max: ${maxRequests},
  timeWindow: ${windowMs},
  errorResponseBuilder: (req, context) => ({
    error: 'Too many requests',
    retryAfter: context.after,
  }),
});`,
                nextjs: `// middleware.ts
import { NextResponse } from 'next/server';

const rateLimit = new Map();

export function middleware(req) {
  const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown';
  const now = Date.now();
  const record = rateLimit.get(ip) || { count: 0, start: now };
  
  if (now - record.start > ${windowMs}) {
    record.count = 1; record.start = now;
  } else {
    record.count++;
  }
  rateLimit.set(ip, record);
  
  if (record.count > ${maxRequests}) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }
  
  const res = NextResponse.next();
  res.headers.set('X-RateLimit-Limit', '${maxRequests}');
  res.headers.set('X-RateLimit-Remaining', String(${maxRequests} - record.count));
  return res;
}`,
                generic: `class RateLimiter {
  constructor(maxRequests = ${maxRequests}, windowMs = ${windowMs}) {
    this.max = maxRequests;
    this.window = windowMs;
    this.clients = new Map();
  }
  
  isAllowed(clientId) {
    const now = Date.now();
    const record = this.clients.get(clientId) || { count: 0, start: now };
    if (now - record.start > this.window) { record.count = 1; record.start = now; }
    else { record.count++; }
    this.clients.set(clientId, record);
    return record.count <= this.max;
  }
  
  getHeaders(clientId) {
    const r = this.clients.get(clientId) || { count: 0, start: Date.now() };
    return { 'X-RateLimit-Limit': this.max, 'X-RateLimit-Remaining': Math.max(0, this.max - r.count), 'X-RateLimit-Reset': new Date(r.start + this.window).toISOString() };
  }
}`,
            };
            return JSON.stringify({ status: 'success', framework, windowMs, maxRequests, code: code[framework] || code.express });
        }
        case 'quota_report': {
            if (!url) return JSON.stringify({ status: 'error', error: 'url required' });
            const n = Math.min(requests, 50);
            const data = [];
            for (let i = 0; i < n; i++) {
                try {
                    const res = await httpRequest(url, { method, headers, timeout: 10000 });
                    data.push({ statusCode: res.statusCode, remaining: res.headers['x-ratelimit-remaining'] || null, limit: res.headers['x-ratelimit-limit'] || null });
                } catch (e) {
                    data.push({ error: e.message });
                }
                if (i < n - 1) await new Promise(r => setTimeout(r, Math.min(delay, 300)));
            }
            const limited = data.filter(d => d.statusCode === 429).length;
            return JSON.stringify({ status: 'success', url, totalRequests: n, rateLimitedCount: limited, rateLimitDetected: limited > 0, lastSample: data[data.length - 1], summary: data.slice(-5) });
        }
        default:
            return JSON.stringify({ status: 'error', error: `Unknown rate_limit action: ${action}` });
    }
}

// ============================================================================
// EXECUTOR: api_auth
// ============================================================================

async function executeApiAuth(input) {
    const { action, payload = {}, secret = 'default-secret-change-me', expiresIn = '1h', token, authType = 'jwt', framework = 'express', prefix = 'sk_', keyCount = 1, url, method = 'GET', auth = {} } = input;
    const crypto = await import('crypto');

    switch (action) {
        case 'generate_jwt': {
            const header = { alg: 'HS256', typ: 'JWT' };
            const expMap = { '1h': 3600, '2h': 7200, '6h': 21600, '12h': 43200, '1d': 86400, '7d': 604800, '30d': 2592000, '30m': 1800, '15m': 900 };
            const expSeconds = expMap[expiresIn] || 3600;
            const now = Math.floor(Date.now() / 1000);
            const claims = { ...payload, iat: now, exp: now + expSeconds };

            const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
            const headerEnc = b64url(header);
            const payloadEnc = b64url(claims);
            const signature = crypto.createHmac('sha256', secret).update(`${headerEnc}.${payloadEnc}`).digest('base64url');
            const jwt = `${headerEnc}.${payloadEnc}.${signature}`;

            return JSON.stringify({ status: 'success', token: jwt, header, payload: claims, expiresIn, expiresAt: new Date((now + expSeconds) * 1000).toISOString() });
        }
        case 'validate_jwt': {
            if (!token) return JSON.stringify({ status: 'error', error: 'token required' });
            try {
                const parts = token.split('.');
                if (parts.length !== 3) return JSON.stringify({ status: 'error', error: 'Invalid JWT format: expected 3 parts' });
                const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
                const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

                const expectedSig = crypto.createHmac('sha256', secret).update(`${parts[0]}.${parts[1]}`).digest('base64url');
                const signatureValid = expectedSig === parts[2];

                const now = Math.floor(Date.now() / 1000);
                const expired = claims.exp ? claims.exp < now : false;

                return JSON.stringify({ status: 'success', valid: signatureValid && !expired, signatureValid, expired, header, payload: claims, expiresAt: claims.exp ? new Date(claims.exp * 1000).toISOString() : null });
            } catch (e) {
                return JSON.stringify({ status: 'error', error: `JWT decode error: ${e.message}` });
            }
        }
        case 'generate_middleware': {
            const middlewares = {
                jwt: {
                    express: `import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || '${secret}';

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  try {
    const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}`,
                    fastify: `import fp from 'fastify-plugin';
import jwt from 'jsonwebtoken';

export default fp(async function authPlugin(fastify) {
  fastify.decorate('authenticate', async (request, reply) => {
    const auth = request.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      reply.code(401).send({ error: 'Unauthorized' });
      return;
    }
    try {
      request.user = jwt.verify(auth.slice(7), '${secret}');
    } catch (err) {
      reply.code(401).send({ error: 'Invalid token' });
    }
  });
});`,
                },
                api_key: {
                    express: `const VALID_API_KEYS = new Set([
  process.env.API_KEY || '${prefix}${crypto.randomBytes(24).toString('hex')}',
]);

export function apiKeyMiddleware(req, res, next) {
  const key = req.headers['x-api-key'] || req.query.api_key;
  if (!key || !VALID_API_KEYS.has(key)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  next();
}`,
                },
                basic: {
                    express: `export function basicAuthMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="API"');
    return res.status(401).json({ error: 'Authentication required' });
  }
  const [username, password] = Buffer.from(auth.slice(6), 'base64').toString().split(':');
  // Replace with your user validation logic
  if (username === 'admin' && password === process.env.ADMIN_PASSWORD) {
    req.user = { username };
    next();
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
}`,
                },
                oauth2: {
                    express: `// OAuth2 Bearer Token Validation Middleware
export function oauth2Middleware(tokenIntrospectionUrl) {
  return async (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Bearer token required' });
    }
    try {
      const introspect = await fetch(tokenIntrospectionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: auth.slice(7) }),
      });
      const result = await introspect.json();
      if (!result.active) return res.status(401).json({ error: 'Token inactive' });
      req.user = result;
      next();
    } catch (err) {
      res.status(500).json({ error: 'Token validation failed' });
    }
  };
}`,
                },
            };
            const code = middlewares[authType]?.[framework] || middlewares[authType]?.express || middlewares.jwt.express;
            return JSON.stringify({ status: 'success', authType, framework, code });
        }
        case 'generate_oauth_flow': {
            const oauthCode = {
                express: `import express from 'express';
import crypto from 'crypto';

const router = express.Router();
const CLIENT_ID = process.env.OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;
const REDIRECT_URI = process.env.OAUTH_REDIRECT_URI || 'http://localhost:3000/auth/callback';
const AUTH_URL = 'https://accounts.provider.com/authorize';
const TOKEN_URL = 'https://accounts.provider.com/token';

// Step 1: Redirect to provider
router.get('/auth/login', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  req.session.oauthState = state;
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'openid profile email',
    state,
  });
  res.redirect(\`\${AUTH_URL}?\${params}\`);
});

// Step 2: Handle callback
router.get('/auth/callback', async (req, res) => {
  const { code, state } = req.query;
  if (state !== req.session.oauthState) return res.status(403).json({ error: 'State mismatch' });
  
  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI, client_id: CLIENT_ID, client_secret: CLIENT_SECRET }),
  });
  const tokens = await tokenRes.json();
  req.session.accessToken = tokens.access_token;
  res.redirect('/dashboard');
});

// Step 3: Refresh token
router.post('/auth/refresh', async (req, res) => {
  const { refresh_token } = req.body;
  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token, client_id: CLIENT_ID, client_secret: CLIENT_SECRET }),
  });
  res.json(await tokenRes.json());
});

export default router;`,
            };
            return JSON.stringify({ status: 'success', framework, code: oauthCode[framework] || oauthCode.express });
        }
        case 'generate_api_key': {
            const keys = [];
            for (let i = 0; i < Math.min(keyCount, 20); i++) {
                const key = `${prefix}${crypto.randomBytes(32).toString('hex')}`;
                const hash = crypto.createHash('sha256').update(key).digest('hex');
                keys.push({ key, hash, prefix, createdAt: new Date().toISOString() });
            }
            return JSON.stringify({ status: 'success', keys, note: 'Store hashes in your database. Never store raw keys. Show the key to the user only once.' });
        }
        case 'test_auth': {
            if (!url) return JSON.stringify({ status: 'error', error: 'url required' });
            const reqHeaders = { ...headers };
            if (auth.type === 'bearer' && auth.token) reqHeaders['Authorization'] = `Bearer ${auth.token}`;
            else if (auth.type === 'basic' && auth.username) reqHeaders['Authorization'] = `Basic ${Buffer.from(`${auth.username}:${auth.password || ''}`).toString('base64')}`;
            else if (auth.type === 'api_key' && auth.key) reqHeaders[auth.header || 'x-api-key'] = auth.key;

            const tests = [
                { name: 'with_auth', headers: reqHeaders },
                { name: 'no_auth', headers: {} },
                { name: 'invalid_auth', headers: { Authorization: 'Bearer invalid-token-12345' } },
            ];

            const results = [];
            for (const test of tests) {
                try {
                    const res = await httpRequest(url, { method, headers: { ...test.headers }, timeout: 10000 });
                    results.push({ test: test.name, statusCode: res.statusCode, authenticated: res.statusCode < 400 });
                } catch (e) {
                    results.push({ test: test.name, error: e.message });
                }
            }
            return JSON.stringify({ status: 'success', url, results, authConfigured: results[0]?.authenticated && !results[1]?.authenticated });
        }
        default:
            return JSON.stringify({ status: 'error', error: `Unknown auth action: ${action}` });
    }
}

// ============================================================================
// HELPERS
// ============================================================================

function seedRng(seed) {
    let s = seed;
    return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

const FIRST_NAMES = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Hank', 'Ivy', 'Jack', 'Kate', 'Leo', 'Mia', 'Nick', 'Olivia'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
const WORDS = ['alpha', 'beta', 'gamma', 'delta', 'echo', 'foxtrot', 'nova', 'stellar', 'quantum', 'nexus', 'prime', 'omega', 'zenith', 'apex', 'vertex'];

function pick(arr, rng) { return arr[Math.floor((rng || Math.random)() * arr.length)]; }
function randId(rng) { return `id_${Math.floor((rng || Math.random)() * 999999)}`; }
function randName(rng) { return `${pick(FIRST_NAMES, rng)} ${pick(LAST_NAMES, rng)}`; }
function randEmail(rng) { return `${pick(WORDS, rng)}.${pick(WORDS, rng)}@example.com`; }
function randWord(rng) { return pick(WORDS, rng); }
function randInt(min, max, rng) { return Math.floor((rng || Math.random)() * (max - min + 1)) + min; }
function randDate(rng) { return new Date(Date.now() - Math.floor((rng || Math.random)() * 365 * 24 * 60 * 60 * 1000)).toISOString(); }
function lorem(rng, sentences = 3) {
    const words = Array.from({ length: sentences * 10 }, () => randWord(rng));
    return words.join(' ') + '.';
}

function jsonToXml(obj, tag) {
    if (typeof obj !== 'object' || obj === null) return `<${tag}>${obj}</${tag}>`;
    if (Array.isArray(obj)) return obj.map((item, i) => jsonToXml(item, 'item')).join('\n');
    const children = Object.entries(obj).map(([k, v]) => jsonToXml(v, k)).join('\n');
    return `<${tag}>\n${children}\n</${tag}>`;
}

function simpleXmlToJson(xml) {
    const result = {};
    const tagMatches = [...xml.matchAll(/<(\w+)>([\s\S]*?)<\/\1>/g)];
    tagMatches.forEach(([, tag, content]) => {
        if (content.includes('<')) result[tag] = simpleXmlToJson(content);
        else result[tag] = content.trim();
    });
    return result;
}

function flattenObject(obj, prefix = '') {
    const flat = {};
    for (const [k, v] of Object.entries(obj)) {
        const key = prefix ? `${prefix}.${k}` : k;
        if (typeof v === 'object' && v !== null && !Array.isArray(v)) Object.assign(flat, flattenObject(v, key));
        else flat[key] = v;
    }
    return flat;
}

function unflattenObject(flat) {
    const result = {};
    for (const [key, value] of Object.entries(flat)) {
        const parts = key.split('.');
        let current = result;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!current[parts[i]]) current[parts[i]] = {};
            current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = value;
    }
    return result;
}

function methodName(ep) {
    const parts = (ep.path || '').split('/').filter(Boolean).map(p => p.replace(/[^a-zA-Z]/g, ''));
    const method = (ep.method || 'get').toLowerCase();
    return method + parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
}

function methodParams(ep) {
    const params = [];
    if (ep.params) params.push('params: Record<string, string>');
    if (ep.body) params.push('body: any');
    return params.join(', ');
}

// ============================================================================
// MAIN EXECUTOR
// ============================================================================

async function executeApiTool(toolName, input, ctx = {}) {
    switch (toolName) {
        case 'api_request': return { result: await executeApiRequest(input), sideEffects: null };
        case 'api_mock': return { result: await executeApiMock(input), sideEffects: null };
        case 'api_document': return { result: await executeApiDocument(input), sideEffects: null };
        case 'api_test': return { result: await executeApiTest(input), sideEffects: null };
        case 'api_transform': return { result: await executeApiTransform(input), sideEffects: null };
        case 'webhook_listen': return { result: await executeWebhook(input), sideEffects: null };
        case 'sdk_generate': return { result: await executeSdkGenerate(input), sideEffects: null };
        case 'api_monitor': return { result: await executeApiMonitor(input), sideEffects: null };
        case 'api_rate_limit': return { result: await executeApiRateLimit(input), sideEffects: null };
        case 'api_auth': return { result: await executeApiAuth(input), sideEffects: null };
        default: return { result: JSON.stringify({ status: 'error', error: `Unknown API tool: ${toolName}` }), sideEffects: null };
    }
}

const API_TOOL_NAMES = new Set(API_TOOL_DEFINITIONS.map(t => t.name));
function isApiTool(toolName) { return API_TOOL_NAMES.has(toolName); }

export { API_TOOL_DEFINITIONS, executeApiTool, isApiTool };
