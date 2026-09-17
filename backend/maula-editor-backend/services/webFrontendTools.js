import { createLogger } from '../lib/logger.js';
const log = createLogger('webFrontendTools');
/**
 * ============================================================================
 * WEB & FRONTEND TOOLS V2
 * ============================================================================
 * web_analyze, web_scaffold, web_optimize, web_transform,
 * web_screenshot, web_lighthouse, web_scrape
 * ============================================================================
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import https from 'https';
import http from 'http';

const MAX_OUTPUT = 50000;

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

const WEB_FRONTEND_TOOL_DEFINITIONS = [
    {
        name: 'web_analyze',
        description: 'Analyze web projects: bundle size, accessibility audit, SEO checks, performance hints, dependency tree, component hierarchy.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['bundle_size', 'accessibility', 'seo', 'performance', 'component_tree', 'route_map', 'css_stats'],
                    description: 'Analysis action',
                },
                path: { type: 'string', description: 'Project directory or file path' },
                url: { type: 'string', description: '[accessibility/seo/performance] Target URL to analyze' },
            },
            required: ['action'],
        },
    },
    {
        name: 'web_scaffold',
        description: 'Scaffold web components/pages/layouts: React, Vue, Svelte, HTML templates with Tailwind/CSS.',
        input_schema: {
            type: 'object',
            properties: {
                type: {
                    type: 'string',
                    enum: ['component', 'page', 'layout', 'form', 'table', 'modal', 'navbar', 'sidebar', 'card', 'auth_page', 'dashboard', 'landing'],
                    description: 'Type of scaffold to generate',
                },
                name: { type: 'string', description: 'Component/page name' },
                framework: { type: 'string', enum: ['react', 'react-ts', 'vue', 'svelte', 'html'], description: 'Target framework. Default: react-ts' },
                styling: { type: 'string', enum: ['tailwind', 'css-modules', 'styled-components', 'css', 'none'], description: 'Styling approach. Default: tailwind' },
                features: { type: 'array', items: { type: 'string' }, description: 'Extra features: "responsive", "dark-mode", "animation", "state", "api-integration"' },
                outputPath: { type: 'string', description: 'Where to write the generated file(s)' },
            },
            required: ['type', 'name'],
        },
    },
    {
        name: 'web_optimize',
        description: 'Optimize web assets: minify CSS/JS/HTML, compress images, tree-shake, inline critical CSS, generate responsive images.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['minify_css', 'minify_js', 'minify_html', 'compress_images', 'critical_css', 'responsive_images', 'tree_shake_report'],
                    description: 'Optimization action',
                },
                path: { type: 'string', description: 'File or directory to optimize' },
                outputPath: { type: 'string', description: 'Output path (default: overwrites in place for minify)' },
                quality: { type: 'number', description: '[compress_images] Quality 1-100. Default: 80' },
            },
            required: ['action', 'path'],
        },
    },
    {
        name: 'web_transform',
        description: 'Transform web code: convert CSS to Tailwind, HTML to JSX, SCSS to CSS, JSON to TypeScript interfaces, colors between formats.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['css_to_tailwind', 'html_to_jsx', 'scss_to_css', 'json_to_typescript', 'color_convert', 'svg_optimize', 'markdown_to_html'],
                    description: 'Transform action',
                },
                input: { type: 'string', description: 'Input content or file path' },
                isFile: { type: 'boolean', description: 'If true, input is treated as file path. Default: false' },
                outputPath: { type: 'string', description: 'Optional output file path' },
                options: { type: 'object', description: 'Action-specific options' },
            },
            required: ['action', 'input'],
        },
    },
    {
        name: 'web_screenshot',
        description: 'Take screenshots of web pages or local HTML files using headless browser (requires Puppeteer).',
        input_schema: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'URL or local HTML file path to capture' },
                outputPath: { type: 'string', description: 'Where to save screenshot' },
                width: { type: 'number', description: 'Viewport width. Default: 1280' },
                height: { type: 'number', description: 'Viewport height. Default: 720' },
                fullPage: { type: 'boolean', description: 'Capture full scrollable page. Default: false' },
                format: { type: 'string', enum: ['png', 'jpeg', 'webp'], description: 'Image format. Default: png' },
                delay: { type: 'number', description: 'Wait ms before capture. Default: 0' },
            },
            required: ['url', 'outputPath'],
        },
    },
    {
        name: 'web_lighthouse',
        description: 'Run Lighthouse audits on URLs: performance, accessibility, best-practices, SEO scores.',
        input_schema: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'URL to audit' },
                categories: { type: 'array', items: { type: 'string' }, description: 'Categories: performance, accessibility, best-practices, seo. Default: all' },
                format: { type: 'string', enum: ['json', 'html', 'summary'], description: 'Output format. Default: summary' },
                outputPath: { type: 'string', description: 'Save report to file' },
            },
            required: ['url'],
        },
    },
    {
        name: 'web_scrape',
        description: 'Scrape web pages: extract text, links, images, meta data, structured data, or custom selectors.',
        input_schema: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'URL to scrape' },
                action: {
                    type: 'string',
                    enum: ['text', 'links', 'images', 'meta', 'headings', 'tables', 'structured_data', 'full'],
                    description: 'What to extract. Default: full',
                },
                selector: { type: 'string', description: 'CSS-like selector to extract specific elements' },
                maxDepth: { type: 'number', description: 'For crawling: max depth of links to follow. Default: 0 (no crawling)' },
                timeout: { type: 'number', description: 'Request timeout in ms. Default: 10000' },
            },
            required: ['url'],
        },
    },
];

// ============================================================================
// EXECUTORS
// ============================================================================

function safeExec(cmd, cwd, timeout = 30000) {
    try {
        const result = execSync(cmd, { cwd, timeout, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] });
        return { success: true, output: result.slice(0, MAX_OUTPUT) };
    } catch (e) {
        return { success: false, output: (e.stdout || '').slice(0, MAX_OUTPUT), error: (e.stderr || e.message || '').slice(0, 5000) };
    }
}

function fetchUrl(url, timeout = 10000) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        const req = client.get(url, { timeout, headers: { 'User-Agent': 'Onelastai-WebTools/1.0' } }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return fetchUrl(res.headers.location, timeout).then(resolve).catch(reject);
            }
            let data = '';
            res.on('data', c => { data += c; if (data.length > 500000) res.destroy(); });
            res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    });
}

async function executeWebAnalyze(input) {
    const { action, path: targetPath, url } = input;

    switch (action) {
        case 'bundle_size': {
            const distDirs = ['dist', 'build', '.next', 'out'];
            const dir = targetPath || '.';
            for (const d of distDirs) {
                const fp = path.join(dir, d);
                if (fs.existsSync(fp)) {
                    const result = safeExec(`du -sh "${fp}" && find "${fp}" -type f -name "*.js" -o -name "*.css" | head -50 | xargs ls -lh 2>/dev/null`, dir);
                    return JSON.stringify({ status: 'success', buildDir: d, output: result.output });
                }
            }
            const pkgPath = path.join(dir, 'package.json');
            if (fs.existsSync(pkgPath)) {
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
                const deps = Object.keys(pkg.dependencies || {});
                return JSON.stringify({ status: 'success', note: 'No build directory found. Run build first.', dependencies: deps.length, topDeps: deps.slice(0, 20) });
            }
            return JSON.stringify({ status: 'error', error: 'No build output or package.json found' });
        }
        case 'accessibility': {
            if (!url && !targetPath) return JSON.stringify({ status: 'error', error: 'url or path required' });
            const content = url ? (await fetchUrl(url)).body : fs.readFileSync(targetPath, 'utf-8');
            const issues = [];
            if (!content.includes('lang=')) issues.push({ severity: 'error', rule: 'html-has-lang', message: 'Missing lang attribute on <html>' });
            if (!content.includes('<title>') && !content.includes('<title ')) issues.push({ severity: 'error', rule: 'document-title', message: 'Missing <title> element' });
            const imgs = [...content.matchAll(/<img[^>]*>/gi)];
            const noAlt = imgs.filter(i => !i[0].includes('alt='));
            if (noAlt.length) issues.push({ severity: 'error', rule: 'image-alt', message: `${noAlt.length} images missing alt text` });
            if (!content.includes('<main') && !content.includes('role="main"')) issues.push({ severity: 'warning', rule: 'landmark-main', message: 'No <main> landmark' });
            const inputs = [...content.matchAll(/<input[^>]*>/gi)];
            inputs.forEach((inp, i) => {
                if (!inp[0].includes('aria-label') && !inp[0].includes('id=')) {
                    issues.push({ severity: 'warning', rule: 'label', message: `Input #${i + 1} may be missing label` });
                }
            });
            return JSON.stringify({ status: 'success', issues: issues.length, details: issues });
        }
        case 'seo': {
            if (!url && !targetPath) return JSON.stringify({ status: 'error', error: 'url or path required' });
            const content = url ? (await fetchUrl(url)).body : fs.readFileSync(targetPath, 'utf-8');
            const checks = {};
            checks.title = !!content.match(/<title[^>]*>.+<\/title>/is);
            checks.metaDescription = !!content.match(/<meta[^>]*name=["']description["'][^>]*>/i);
            checks.h1 = (content.match(/<h1/gi) || []).length;
            checks.canonicalLink = !!content.match(/<link[^>]*rel=["']canonical["']/i);
            checks.ogTags = (content.match(/<meta[^>]*property=["']og:/gi) || []).length;
            checks.twitterCards = !!content.match(/<meta[^>]*name=["']twitter:/i);
            checks.structuredData = !!content.match(/application\/ld\+json/i);
            checks.viewport = !!content.match(/<meta[^>]*name=["']viewport["']/i);
            checks.robotsMeta = !!content.match(/<meta[^>]*name=["']robots["']/i);
            const score = Object.values(checks).filter(v => v === true || v >= 1).length;
            return JSON.stringify({ status: 'success', score: `${score}/${Object.keys(checks).length}`, checks });
        }
        case 'performance': {
            if (!url && !targetPath) return JSON.stringify({ status: 'error', error: 'url or path required' });
            const content = url ? (await fetchUrl(url)).body : fs.readFileSync(targetPath, 'utf-8');
            const hints = [];
            const scripts = [...content.matchAll(/<script[^>]*src=["']([^"']+)["'][^>]*>/gi)];
            const renderBlocking = scripts.filter(s => !s[0].includes('async') && !s[0].includes('defer') && !s[0].includes('type="module"'));
            if (renderBlocking.length) hints.push({ type: 'warning', message: `${renderBlocking.length} render-blocking scripts. Add async/defer.` });
            const inlineStyles = (content.match(/<style/gi) || []).length;
            if (inlineStyles > 3) hints.push({ type: 'info', message: `${inlineStyles} inline style blocks. Consider consolidating.` });
            const largeInlineScripts = [...content.matchAll(/<script[^>]*>([^<]{10000,})<\/script>/gi)];
            if (largeInlineScripts.length) hints.push({ type: 'warning', message: `${largeInlineScripts.length} large inline scripts (>10KB). Move to external files.` });
            const unoptimizedImages = [...content.matchAll(/<img[^>]*>/gi)].filter(i => !i[0].includes('loading='));
            if (unoptimizedImages.length) hints.push({ type: 'info', message: `${unoptimizedImages.length} images without lazy loading.` });
            return JSON.stringify({ status: 'success', totalScripts: scripts.length, hints });
        }
        case 'component_tree': {
            const dir = targetPath || '.';
            const components = [];
            const walk = (d) => {
                if (!fs.existsSync(d)) return;
                const entries = fs.readdirSync(d);
                for (const e of entries) {
                    if (e === 'node_modules' || e === '.git') continue;
                    const fp = path.join(d, e);
                    const stat = fs.statSync(fp);
                    if (stat.isDirectory()) walk(fp);
                    else if (/\.(tsx|jsx|vue|svelte)$/.test(e)) {
                        const content = fs.readFileSync(fp, 'utf-8');
                        const imports = [...content.matchAll(/import\s+(\w+)/g)].map(m => m[1]);
                        components.push({ file: fp.replace(dir + '/', ''), component: e.replace(/\.\w+$/, ''), imports: imports.slice(0, 20) });
                    }
                }
            };
            walk(dir);
            return JSON.stringify({ status: 'success', totalComponents: components.length, components: components.slice(0, 100) });
        }
        case 'route_map': {
            const dir = targetPath || '.';
            const pagesDir = ['pages', 'app', 'routes', 'views', 'src/pages', 'src/routes', 'src/app'];
            let routeDir = null;
            for (const p of pagesDir) {
                if (fs.existsSync(path.join(dir, p))) { routeDir = path.join(dir, p); break; }
            }
            if (!routeDir) return JSON.stringify({ status: 'success', note: 'No standard route directory found', hint: 'Check for router config file instead' });
            const routes = [];
            const walk = (d, prefix = '') => {
                const entries = fs.readdirSync(d).sort();
                for (const e of entries) {
                    const fp = path.join(d, e);
                    const stat = fs.statSync(fp);
                    if (stat.isDirectory()) walk(fp, prefix + '/' + e);
                    else if (/\.(tsx?|jsx?|vue|svelte)$/.test(e)) {
                        const route = prefix + '/' + e.replace(/\.(tsx?|jsx?|vue|svelte)$/, '').replace('index', '');
                        routes.push({ route: route || '/', file: fp.replace(dir + '/', '') });
                    }
                }
            };
            walk(routeDir);
            return JSON.stringify({ status: 'success', routeDir: routeDir.replace(dir + '/', ''), routes });
        }
        case 'css_stats': {
            const dir = targetPath || '.';
            let totalSize = 0, fileCount = 0;
            const allClasses = new Set();
            const walk = (d) => {
                if (!fs.existsSync(d)) return;
                const entries = fs.readdirSync(d);
                for (const e of entries) {
                    if (e === 'node_modules' || e === '.git') continue;
                    const fp = path.join(d, e);
                    const stat = fs.statSync(fp);
                    if (stat.isDirectory()) walk(fp);
                    else if (/\.(css|scss|less)$/.test(e)) {
                        const content = fs.readFileSync(fp, 'utf-8');
                        totalSize += stat.size;
                        fileCount++;
                        const classes = [...content.matchAll(/\.([a-zA-Z][\w-]*)/g)].map(m => m[1]);
                        classes.forEach(c => allClasses.add(c));
                    }
                }
            };
            walk(dir);
            return JSON.stringify({ status: 'success', files: fileCount, totalSize: `${(totalSize / 1024).toFixed(1)} KB`, uniqueClasses: allClasses.size });
        }
        default:
            return JSON.stringify({ status: 'error', error: `Unknown analyze action: ${action}` });
    }
}

async function executeWebScaffold(input) {
    const { type, name, framework = 'react-ts', styling = 'tailwind', features = [], outputPath } = input;
    const isTS = framework.includes('ts');
    const ext = isTS ? 'tsx' : 'jsx';

    const templates = {
        component: generateComponent(name, framework, styling, features),
        page: generatePage(name, framework, styling, features),
        layout: generateLayout(name, framework, styling),
        form: generateForm(name, framework, styling, features),
        table: generateTable(name, framework, styling),
        modal: generateModal(name, framework, styling),
        navbar: generateNavbar(name, framework, styling, features),
        sidebar: generateSidebar(name, framework, styling),
        card: generateCard(name, framework, styling),
        auth_page: generateAuthPage(name, framework, styling),
        dashboard: generateDashboard(name, framework, styling),
        landing: generateLanding(name, framework, styling, features),
    };

    const code = templates[type] || `// Scaffold type '${type}' not recognized`;

    if (outputPath) {
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(outputPath, code);
        return JSON.stringify({ status: 'success', type, name, file: outputPath, size: code.length });
    }

    return JSON.stringify({ status: 'success', type, name, framework, styling, code });
}

async function executeWebOptimize(input) {
    const { action, path: targetPath, outputPath, quality = 80 } = input;

    switch (action) {
        case 'minify_css': {
            const content = fs.readFileSync(targetPath, 'utf-8');
            const minified = content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/\s*([{}:;,>~+])\s*/g, '$1').replace(/;}/g, '}').trim();
            const out = outputPath || targetPath;
            fs.writeFileSync(out, minified);
            return JSON.stringify({ status: 'success', original: content.length, minified: minified.length, savings: `${((1 - minified.length / content.length) * 100).toFixed(1)}%`, output: out });
        }
        case 'minify_js': {
            const content = fs.readFileSync(targetPath, 'utf-8');
            let minified = content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/\n\s*\n/g, '\n').replace(/^\s+/gm, '').trim();
            const out = outputPath || targetPath;
            fs.writeFileSync(out, minified);
            return JSON.stringify({ status: 'success', original: content.length, minified: minified.length, savings: `${((1 - minified.length / content.length) * 100).toFixed(1)}%`, output: out });
        }
        case 'minify_html': {
            const content = fs.readFileSync(targetPath, 'utf-8');
            const minified = content.replace(/<!--[\s\S]*?-->/g, '').replace(/\n\s+/g, '\n').replace(/\s{2,}/g, ' ').trim();
            const out = outputPath || targetPath;
            fs.writeFileSync(out, minified);
            return JSON.stringify({ status: 'success', original: content.length, minified: minified.length, savings: `${((1 - minified.length / content.length) * 100).toFixed(1)}%`, output: out });
        }
        case 'compress_images': {
            try {
                const sharp = (await import('sharp')).default;
                const stat = fs.statSync(targetPath);
                if (stat.isFile()) {
                    const out = outputPath || targetPath;
                    const ext = path.extname(targetPath).toLowerCase();
                    let pipeline = sharp(targetPath);
                    if (['.jpg', '.jpeg'].includes(ext)) pipeline = pipeline.jpeg({ quality });
                    else if (ext === '.png') pipeline = pipeline.png({ quality });
                    else if (ext === '.webp') pipeline = pipeline.webp({ quality });
                    await pipeline.toFile(out === targetPath ? out + '.tmp' : out);
                    if (out === targetPath) { fs.renameSync(out + '.tmp', out); }
                    const newStat = fs.statSync(out);
                    return JSON.stringify({ status: 'success', original: stat.size, compressed: newStat.size, savings: `${((1 - newStat.size / stat.size) * 100).toFixed(1)}%` });
                }
                return JSON.stringify({ status: 'error', error: 'Provide a single image file path' });
            } catch (e) {
                return JSON.stringify({ status: 'error', error: e.message });
            }
        }
        case 'tree_shake_report': {
            const pkgPath = path.join(targetPath, 'package.json');
            if (!fs.existsSync(pkgPath)) return JSON.stringify({ status: 'error', error: 'package.json not found' });
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
            const deps = Object.keys(pkg.dependencies || {});
            const usedImports = new Set();
            const walk = (d) => {
                if (!fs.existsSync(d)) return;
                fs.readdirSync(d).forEach(e => {
                    if (e === 'node_modules' || e === '.git' || e === 'dist') return;
                    const fp = path.join(d, e);
                    if (fs.statSync(fp).isDirectory()) walk(fp);
                    else if (/\.(tsx?|jsx?|mjs)$/.test(e)) {
                        const content = fs.readFileSync(fp, 'utf-8');
                        deps.forEach(dep => { if (content.includes(`'${dep}'`) || content.includes(`"${dep}"`)) usedImports.add(dep); });
                    }
                });
            };
            walk(targetPath);
            const unused = deps.filter(d => !usedImports.has(d));
            return JSON.stringify({ status: 'success', totalDeps: deps.length, used: usedImports.size, unused: unused.length, unusedPackages: unused });
        }
        default:
            return JSON.stringify({ status: 'error', error: `Unknown optimize action: ${action}` });
    }
}

async function executeWebTransform(input) {
    const { action, input: rawInput, isFile = false, outputPath, options = {} } = input;
    const content = isFile ? fs.readFileSync(rawInput, 'utf-8') : rawInput;

    switch (action) {
        case 'html_to_jsx': {
            let jsx = content
                .replace(/\bclass=/g, 'className=')
                .replace(/\bfor=/g, 'htmlFor=')
                .replace(/\bstroke-width=/g, 'strokeWidth=')
                .replace(/\bstroke-linecap=/g, 'strokeLinecap=')
                .replace(/\bfill-rule=/g, 'fillRule=')
                .replace(/\bclip-rule=/g, 'clipRule=')
                .replace(/\btabindex=/g, 'tabIndex=')
                .replace(/\bautocomplete=/g, 'autoComplete=')
                .replace(/\bautofocus/g, 'autoFocus')
                .replace(/\breadonly/g, 'readOnly')
                .replace(/<!--[\s\S]*?-->/g, '{/* comment */}')
                .replace(/style="([^"]+)"/g, (_, s) => {
                    const obj = s.split(';').filter(Boolean).map(p => {
                        const [k, v] = p.split(':').map(s => s.trim());
                        const camel = k.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
                        return `${camel}: '${v}'`;
                    }).join(', ');
                    return `style={{${obj}}}`;
                });
            if (outputPath) fs.writeFileSync(outputPath, jsx);
            return JSON.stringify({ status: 'success', output: jsx.slice(0, MAX_OUTPUT) });
        }
        case 'json_to_typescript': {
            const json = JSON.parse(content);
            const tsInterface = jsonToTsInterface(json, options.name || 'Root');
            if (outputPath) fs.writeFileSync(outputPath, tsInterface);
            return JSON.stringify({ status: 'success', output: tsInterface });
        }
        case 'color_convert': {
            const color = content.trim();
            const result = convertColor(color);
            return JSON.stringify({ status: 'success', input: color, ...result });
        }
        case 'svg_optimize': {
            let svg = content
                .replace(/<!--[\s\S]*?-->/g, '')
                .replace(/\s+/g, ' ')
                .replace(/>\s+</g, '><')
                .replace(/\s*\/>/g, '/>')
                .trim();
            if (outputPath) fs.writeFileSync(outputPath, svg);
            return JSON.stringify({ status: 'success', original: content.length, optimized: svg.length, output: svg.slice(0, MAX_OUTPUT) });
        }
        case 'markdown_to_html': {
            const html = simpleMarkdownToHtml(content);
            if (outputPath) fs.writeFileSync(outputPath, html);
            return JSON.stringify({ status: 'success', output: html.slice(0, MAX_OUTPUT) });
        }
        case 'css_to_tailwind': {
            const mappings = cssToTailwindMap(content);
            if (outputPath) fs.writeFileSync(outputPath, JSON.stringify(mappings, null, 2));
            return JSON.stringify({ status: 'success', mappings });
        }
        case 'scss_to_css': {
            const result = safeExec(`echo '${content.replace(/'/g, "\\'")}' | npx sass --stdin --no-source-map 2>/dev/null`, '.');
            if (result.success) {
                if (outputPath) fs.writeFileSync(outputPath, result.output);
                return JSON.stringify({ status: 'success', output: result.output.slice(0, MAX_OUTPUT) });
            }
            return JSON.stringify({ status: 'error', error: 'SCSS compilation failed. Ensure sass is installed.' });
        }
        default:
            return JSON.stringify({ status: 'error', error: `Unknown transform action: ${action}` });
    }
}

async function executeWebScreenshot(input) {
    const { url, outputPath, width = 1280, height = 720, fullPage = false, format = 'png', delay = 0 } = input;
    try {
        const puppeteer = await import('puppeteer');
        const browser = await puppeteer.default.launch({ headless: 'new', args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.setViewport({ width, height });
        if (url.startsWith('http')) await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        else await page.goto(`file://${path.resolve(url)}`, { waitUntil: 'load' });
        if (delay) await new Promise(r => setTimeout(r, delay));
        await page.screenshot({ path: outputPath, fullPage, type: format });
        await browser.close();
        return JSON.stringify({ status: 'success', file: outputPath, width, height, fullPage, format });
    } catch (e) {
        return JSON.stringify({ status: 'error', error: `Screenshot failed: ${e.message}. Puppeteer may not be installed.` });
    }
}

async function executeWebLighthouse(input) {
    const { url, categories = ['performance', 'accessibility', 'best-practices', 'seo'], format = 'summary', outputPath } = input;
    const catFlags = categories.map(c => `--only-categories=${c}`).join(' ');
    const result = safeExec(`npx lighthouse "${url}" ${catFlags} --output=json --chrome-flags="--headless --no-sandbox" 2>/dev/null`, '.', 60000);
    if (!result.success) return JSON.stringify({ status: 'error', error: 'Lighthouse failed. Ensure lighthouse and Chrome are available.', detail: result.error });
    try {
        const report = JSON.parse(result.output);
        if (format === 'summary') {
            const scores = {};
            for (const [key, cat] of Object.entries(report.categories || {})) {
                scores[key] = Math.round((cat.score || 0) * 100);
            }
            return JSON.stringify({ status: 'success', url, scores });
        }
        if (outputPath) fs.writeFileSync(outputPath, result.output);
        return JSON.stringify({ status: 'success', url, saved: outputPath || false, size: result.output.length });
    } catch {
        return JSON.stringify({ status: 'success', raw: result.output.slice(0, 10000) });
    }
}

async function executeWebScrape(input) {
    const { url, action = 'full', selector, timeout = 10000 } = input;
    try {
        const { body, statusCode } = await fetchUrl(url, timeout);
        const result = { status: 'success', url, statusCode };

        if (action === 'text' || action === 'full') {
            result.text = body.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 20000);
        }
        if (action === 'links' || action === 'full') {
            result.links = [...body.matchAll(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map(m => ({ href: m[1], text: m[2].replace(/<[^>]+>/g, '').trim() })).slice(0, 100);
        }
        if (action === 'images' || action === 'full') {
            result.images = [...body.matchAll(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi)].map(m => ({ src: m[1], alt: (m[0].match(/alt=["']([^"']*)/i) || [])[1] || '' })).slice(0, 100);
        }
        if (action === 'meta' || action === 'full') {
            result.meta = {};
            result.meta.title = (body.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]?.trim() || '';
            const metas = [...body.matchAll(/<meta[^>]*>/gi)];
            metas.forEach(m => {
                const name = (m[0].match(/(?:name|property)=["']([^"']+)/i) || [])[1];
                const content = (m[0].match(/content=["']([^"']+)/i) || [])[1];
                if (name && content) result.meta[name] = content;
            });
        }
        if (action === 'headings') {
            result.headings = [...body.matchAll(/<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi)].map(m => ({ level: m[1], text: m[2].replace(/<[^>]+>/g, '').trim() }));
        }
        if (action === 'tables') {
            const tables = [...body.matchAll(/<table[\s\S]*?<\/table>/gi)];
            result.tables = tables.slice(0, 10).map((t, i) => {
                const rows = [...t[0].matchAll(/<tr[\s\S]*?<\/tr>/gi)];
                const data = rows.map(r => [...r[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(c => c[1].replace(/<[^>]+>/g, '').trim()));
                return { tableIndex: i, rows: data.length, data: data.slice(0, 50) };
            });
        }
        return JSON.stringify(result);
    } catch (e) {
        return JSON.stringify({ status: 'error', error: e.message });
    }
}

// ============================================================================
// SCAFFOLD GENERATORS
// ============================================================================

function generateComponent(name, fw, styling, features) {
    const hasState = features.includes('state');
    const hasDarkMode = features.includes('dark-mode');
    const cn = hasDarkMode ? 'dark:bg-gray-800 dark:text-white' : '';
    return `import React${hasState ? ', { useState }' : ''} from 'react';

interface ${name}Props {
  title?: string;
  children?: React.ReactNode;
}

export default function ${name}({ title = '${name}', children }: ${name}Props) {
  ${hasState ? `const [isActive, setIsActive] = useState(false);` : ''}

  return (
    <div className="p-4 rounded-lg bg-white shadow-sm ${cn}">
      <h2 className="text-lg font-semibold mb-2">{title}</h2>
      ${hasState ? `<button onClick={() => setIsActive(!isActive)} className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">
        {isActive ? 'Active' : 'Inactive'}
      </button>` : ''}
      <div className="mt-2">{children}</div>
    </div>
  );
}
`;
}

function generatePage(name, fw, styling, features) {
    return `import React from 'react';

export default function ${name}Page() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">${name}</h1>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-gray-600">Content goes here</p>
        </div>
      </div>
    </div>
  );
}
`;
}

function generateLayout(name, fw, styling) {
    return `import React from 'react';

interface ${name}LayoutProps {
  children: React.ReactNode;
}

export default function ${name}Layout({ children }: ${name}LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white shadow-sm border-b px-6 py-4">
        <h1 className="text-xl font-semibold">${name}</h1>
      </header>
      <main className="flex-1 p-6">{children}</main>
      <footer className="bg-gray-50 border-t px-6 py-3 text-sm text-gray-500 text-center">
        &copy; ${new Date().getFullYear()} ${name}
      </footer>
    </div>
  );
}
`;
}

function generateForm(name, fw, styling, features) {
    return `import React, { useState } from 'react';

interface ${name}FormData {
  name: string;
  email: string;
  message: string;
}

export default function ${name}Form() {
  const [formData, setFormData] = useState<${name}FormData>({ name: '', email: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // API call here
      log.info('Submitted:', formData);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
        <textarea value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" rows={4} required />
      </div>
      <button type="submit" disabled={submitting}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
        {submitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}
`;
}

function generateTable(name, fw, styling) {
    return `import React, { useState } from 'react';

interface Column { key: string; label: string; sortable?: boolean; }
interface ${name}TableProps { data: Record<string, any>[]; columns: Column[]; }

export default function ${name}Table({ data, columns }: ${name}TableProps) {
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('asc');

  const sorted = [...data].sort((a, b) => {
    if (!sortKey) return 0;
    const cmp = String(a[sortKey]).localeCompare(String(b[sortKey]));
    return sortDir === 'asc' ? cmp : -cmp;
  });

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>{columns.map(col => (
            <th key={col.key} onClick={() => col.sortable && (setSortKey(col.key), setSortDir(d => d === 'asc' ? 'desc' : 'asc'))}
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100">
              {col.label} {sortKey === col.key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
            </th>
          ))}</tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sorted.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50">
              {columns.map(col => <td key={col.key} className="px-4 py-3 text-sm text-gray-700">{row[col.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
`;
}

function generateModal(name, fw, styling) {
    return `import React from 'react';

interface ${name}ModalProps { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; }

export default function ${name}Modal({ isOpen, onClose, title, children }: ${name}ModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
`;
}

function generateNavbar(name, fw, styling, features) {
    return `import React, { useState } from 'react';

export default function ${name}Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const links = ['Home', 'About', 'Services', 'Contact'];

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        <a href="/" className="text-xl font-bold text-blue-600">${name}</a>
        <div className="hidden md:flex space-x-6">
          {links.map(l => <a key={l} href={\`#\${l.toLowerCase()}\`} className="text-gray-600 hover:text-blue-600">{l}</a>)}
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2">☰</button>
      </div>
      {mobileOpen && (
        <div className="md:hidden px-4 pb-4 space-y-2">
          {links.map(l => <a key={l} href={\`#\${l.toLowerCase()}\`} className="block py-2 text-gray-600">{l}</a>)}
        </div>
      )}
    </nav>
  );
}
`;
}

function generateSidebar(name, fw, styling) {
    return `import React, { useState } from 'react';

interface MenuItem { label: string; icon?: string; href: string; }
const items: MenuItem[] = [
  { label: 'Dashboard', icon: '📊', href: '/dashboard' },
  { label: 'Projects', icon: '📁', href: '/projects' },
  { label: 'Settings', icon: '⚙️', href: '/settings' },
];

export default function ${name}Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={\`\${collapsed ? 'w-16' : 'w-64'} h-screen bg-gray-900 text-white transition-all duration-300 flex flex-col\`}>
      <div className="p-4 flex items-center justify-between">
        {!collapsed && <span className="font-bold text-lg">${name}</span>}
        <button onClick={() => setCollapsed(!collapsed)} className="text-gray-400 hover:text-white">
          {collapsed ? '→' : '←'}
        </button>
      </div>
      <nav className="flex-1 px-2 space-y-1">
        {items.map(item => (
          <a key={item.label} href={item.href}
            className="flex items-center px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white">
            <span className="text-lg">{item.icon}</span>
            {!collapsed && <span className="ml-3">{item.label}</span>}
          </a>
        ))}
      </nav>
    </aside>
  );
}
`;
}

function generateCard(name, fw, styling) {
    return `import React from 'react';

interface ${name}CardProps { title: string; description?: string; image?: string; actions?: React.ReactNode; }

export default function ${name}Card({ title, description, image, actions }: ${name}CardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
      {image && <img src={image} alt={title} className="w-full h-48 object-cover" />}
      <div className="p-4">
        <h3 className="font-semibold text-lg">{title}</h3>
        {description && <p className="mt-1 text-gray-600 text-sm">{description}</p>}
        {actions && <div className="mt-3 flex gap-2">{actions}</div>}
      </div>
    </div>
  );
}
`;
}

function generateAuthPage(name, fw, styling) {
    return `import React, { useState } from 'react';

export default function ${name}Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    log.info(isLogin ? 'Login' : 'Register', { email, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center mb-6">{isLogin ? 'Sign In' : 'Create Account'}</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500" required />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500" required />
          <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
            {isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button onClick={() => setIsLogin(!isLogin)} className="text-blue-600 font-semibold">{isLogin ? 'Sign Up' : 'Sign In'}</button>
        </p>
      </div>
    </div>
  );
}
`;
}

function generateDashboard(name, fw, styling) {
    return `import React from 'react';

const stats = [
  { label: 'Total Users', value: '2,847', change: '+12%' },
  { label: 'Revenue', value: '$48,295', change: '+8.5%' },
  { label: 'Active Projects', value: '142', change: '+3' },
  { label: 'Conversion Rate', value: '3.2%', change: '+0.4%' },
];

export default function ${name}Dashboard() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">${name} Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-xl p-5 shadow-sm border">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="text-2xl font-bold mt-1">{s.value}</p>
            <span className="text-green-600 text-sm font-medium">{s.change}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h2 className="font-semibold mb-4">Recent Activity</h2>
          <p className="text-gray-500">Chart/list goes here</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h2 className="font-semibold mb-4">Overview</h2>
          <p className="text-gray-500">Summary content</p>
        </div>
      </div>
    </div>
  );
}
`;
}

function generateLanding(name, fw, styling, features) {
    return `import React from 'react';

export default function ${name}Landing() {
  return (
    <div className="min-h-screen">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-2xl font-bold text-blue-600">${name}</span>
          <nav className="hidden md:flex space-x-6">
            <a href="#features" className="text-gray-600 hover:text-blue-600">Features</a>
            <a href="#pricing" className="text-gray-600 hover:text-blue-600">Pricing</a>
            <a href="#contact" className="text-gray-600 hover:text-blue-600">Contact</a>
          </nav>
          <a href="/signup" className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">Get Started</a>
        </div>
      </header>
      <section className="py-20 bg-gradient-to-b from-blue-50 to-white text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">Welcome to ${name}</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">The modern platform for building amazing digital experiences.</p>
        <div className="flex justify-center gap-4">
          <a href="/signup" className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700">Start Free</a>
          <a href="#features" className="px-8 py-3 border border-gray-300 rounded-lg font-semibold text-lg hover:border-blue-600">Learn More</a>
        </div>
      </section>
      <section id="features" className="py-16 max-w-7xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-center mb-12">Features</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {['Fast', 'Secure', 'Scalable'].map(f => (
            <div key={f} className="bg-white rounded-xl p-6 shadow-sm border text-center">
              <h3 className="text-xl font-semibold mb-2">{f}</h3>
              <p className="text-gray-600">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
`;
}

// ============================================================================
// TRANSFORM HELPERS
// ============================================================================

function jsonToTsInterface(obj, name, depth = 0) {
    if (depth > 5) return 'any';
    const lines = [`export interface ${name} {`];
    for (const [key, value] of Object.entries(obj)) {
        const type = getTsType(value, key, depth);
        lines.push(`  ${key}: ${type};`);
    }
    lines.push('}');
    return lines.join('\n');
}

function getTsType(value, key, depth) {
    if (value === null) return 'null';
    if (Array.isArray(value)) {
        if (value.length === 0) return 'any[]';
        return `${getTsType(value[0], key, depth)}[]`;
    }
    switch (typeof value) {
        case 'string': return 'string';
        case 'number': return 'number';
        case 'boolean': return 'boolean';
        case 'object': {
            const subName = key.charAt(0).toUpperCase() + key.slice(1);
            return subName;
        }
        default: return 'any';
    }
}

function convertColor(color) {
    if (color.startsWith('#')) {
        const hex = color.replace('#', '');
        const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
        return { hex: color, rgb: `rgb(${r}, ${g}, ${b})`, hsl: rgbToHsl(r, g, b) };
    }
    const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
        const [, r, g, b] = rgbMatch.map(Number);
        const hex = `#${[r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')}`;
        return { hex, rgb: color, hsl: rgbToHsl(r, g, b) };
    }
    return { original: color, note: 'Could not parse color format' };
}

function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            default: h = ((r - g) / d + 4) / 6;
        }
    }
    return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

function simpleMarkdownToHtml(md) {
    return md
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code>$1</code>')
        .replace(/^\- (.+)$/gm, '<li>$1</li>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/^(.+)$/gm, (m) => m.startsWith('<') ? m : `<p>${m}</p>`);
}

function cssToTailwindMap(css) {
    const rules = [...css.matchAll(/([^{]+)\{([^}]+)\}/g)];
    const map = {};
    const propertyMap = {
        'display: flex': 'flex', 'display: grid': 'grid', 'display: block': 'block', 'display: none': 'hidden',
        'text-align: center': 'text-center', 'text-align: left': 'text-left', 'text-align: right': 'text-right',
        'font-weight: bold': 'font-bold', 'font-weight: 600': 'font-semibold',
        'position: relative': 'relative', 'position: absolute': 'absolute', 'position: fixed': 'fixed',
        'overflow: hidden': 'overflow-hidden', 'overflow: auto': 'overflow-auto',
    };
    rules.forEach(([, selector, body]) => {
        const sel = selector.trim();
        const classes = [];
        const decls = body.split(';').map(d => d.trim()).filter(Boolean);
        decls.forEach(decl => {
            if (propertyMap[decl]) classes.push(propertyMap[decl]);
            else classes.push(`/* ${decl} */`);
        });
        map[sel] = classes;
    });
    return map;
}

// ============================================================================
// MAIN EXECUTOR
// ============================================================================

async function executeWebFrontendTool(toolName, input, ctx = {}) {
    switch (toolName) {
        case 'web_analyze': return { result: await executeWebAnalyze(input), sideEffects: null };
        case 'web_scaffold': return { result: await executeWebScaffold(input), sideEffects: null };
        case 'web_optimize': return { result: await executeWebOptimize(input), sideEffects: null };
        case 'web_transform': return { result: await executeWebTransform(input), sideEffects: null };
        case 'web_screenshot': return { result: await executeWebScreenshot(input), sideEffects: null };
        case 'web_lighthouse': return { result: await executeWebLighthouse(input), sideEffects: null };
        case 'web_scrape': return { result: await executeWebScrape(input), sideEffects: null };
        default: return { result: JSON.stringify({ status: 'error', error: `Unknown web tool: ${toolName}` }), sideEffects: null };
    }
}

const WEB_TOOL_NAMES = new Set(WEB_FRONTEND_TOOL_DEFINITIONS.map(t => t.name));
function isWebFrontendTool(toolName) { return WEB_TOOL_NAMES.has(toolName); }

export { WEB_FRONTEND_TOOL_DEFINITIONS, executeWebFrontendTool, isWebFrontendTool };
