/**
 * WEB & FRONTEND TOOLS (7 tools)
 * web_analyze, web_scaffold, web_optimize, web_transform,
 * web_screenshot, web_lighthouse, web_scrape
 */

import { JSDOM } from 'jsdom';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// ── web_analyze ─────────────────────────────────────────────────
async function webAnalyze(params) {
    const { action = 'html', content, url, ...opts } = params;

    try {
        let html = content;
        if (!html && url) {
            const res = await fetch(url, { timeout: 10000 });
            html = await res.text();
        }
        if (!html) return { success: false, error: 'content or url is required' };

        const dom = new JSDOM(html);
        const doc = dom.window.document;

        switch (action) {
            case 'html': {
                const issues = [];
                if (!doc.querySelector('title')) issues.push({ severity: 'high', message: 'Missing <title>' });
                if (!doc.querySelector('meta[name="description"]')) issues.push({ severity: 'medium', message: 'Missing meta description' });
                if (!doc.querySelector('meta[name="viewport"]')) issues.push({ severity: 'high', message: 'Missing viewport meta' });
                if (!doc.querySelector('html[lang]')) issues.push({ severity: 'medium', message: 'Missing lang attribute' });
                if (!doc.querySelector('h1')) issues.push({ severity: 'medium', message: 'Missing <h1> heading' });
                const imgs = [...doc.querySelectorAll('img')];
                const noAlt = imgs.filter(i => !i.getAttribute('alt'));
                if (noAlt.length) issues.push({ severity: 'medium', message: `${noAlt.length} images without alt text` });
                const links = [...doc.querySelectorAll('a')];
                const noHref = links.filter(a => !a.getAttribute('href') || a.getAttribute('href') === '#');
                if (noHref.length) issues.push({ severity: 'low', message: `${noHref.length} links without proper href` });
                return { success: true, issues, score: Math.max(0, 100 - issues.length * 12) };
            }

            case 'accessibility': {
                const issues = [];
                const imgs = [...doc.querySelectorAll('img')];
                imgs.filter(i => !i.getAttribute('alt')).forEach(i => issues.push({ rule: 'img-alt', element: i.outerHTML.slice(0, 80), severity: 'serious' }));
                const inputs = [...doc.querySelectorAll('input:not([type="hidden"])')];
                inputs.filter(i => !i.getAttribute('aria-label') && !doc.querySelector(`label[for="${i.id}"]`)).forEach(i => issues.push({ rule: 'label-missing', element: i.outerHTML.slice(0, 80), severity: 'serious' }));
                const btns = [...doc.querySelectorAll('button, [role="button"]')];
                btns.filter(b => !b.textContent.trim() && !b.getAttribute('aria-label')).forEach(b => issues.push({ rule: 'button-name', element: b.outerHTML.slice(0, 80), severity: 'serious' }));
                if (html && !html.includes('skip-to-content') && !html.includes('skip-link') && !html.includes('skipnav')) {
                    issues.push({ rule: 'skip-navigation', severity: 'moderate', message: 'No skip navigation link found' });
                }
                return { success: true, issues, total: issues.length, score: Math.max(0, 100 - issues.length * 8) };
            }

            case 'seo': {
                const title = doc.querySelector('title')?.textContent || '';
                const desc = doc.querySelector('meta[name="description"]')?.getAttribute('content') || '';
                const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute('href') || '';
                const ogTags = [...doc.querySelectorAll('meta[property^="og:"]')].map(m => ({ property: m.getAttribute('property'), content: m.getAttribute('content') }));
                const h1s = [...doc.querySelectorAll('h1')].map(h => h.textContent.trim());
                return {
                    success: true,
                    title: { text: title, length: title.length, optimal: title.length >= 30 && title.length <= 60 },
                    description: { text: desc, length: desc.length, optimal: desc.length >= 120 && desc.length <= 160 },
                    canonical,
                    openGraph: ogTags,
                    headings: { h1: h1s, h1Count: h1s.length },
                    score: calculateSeoScore(title, desc, canonical, ogTags, h1s),
                };
            }

            case 'performance': {
                const scripts = [...doc.querySelectorAll('script')].length;
                const styles = [...doc.querySelectorAll('link[rel="stylesheet"]')].length;
                const inlineStyles = [...doc.querySelectorAll('[style]')].length;
                const imgs = [...doc.querySelectorAll('img')].length;
                const lazyImgs = [...doc.querySelectorAll('img[loading="lazy"]')].length;
                const preloads = [...doc.querySelectorAll('link[rel="preload"]')].length;
                const issues = [];
                if (scripts > 10) issues.push(`Too many scripts (${scripts})`);
                if (styles > 5) issues.push(`Too many stylesheets (${styles})`);
                if (imgs > 0 && lazyImgs === 0) issues.push('No lazy-loaded images');
                if (inlineStyles > 10) issues.push(`Too many inline styles (${inlineStyles})`);
                return { success: true, metrics: { scripts, styles, inlineStyles, images: imgs, lazyImages: lazyImgs, preloads }, issues };
            }

            default:
                return { success: false, error: `Unknown web_analyze action: ${action}` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── web_scaffold ────────────────────────────────────────────────
async function webScaffold(params) {
    const { action = 'component', ...opts } = params;

    try {
        switch (action) {
            case 'component': {
                const { name, framework = 'react', typescript = true, style = 'tailwind' } = opts;
                if (!name) return { success: false, error: 'name is required' };
                const ext = typescript ? 'tsx' : 'jsx';
                const code = generateReactComponent(name, typescript, style);
                return { success: true, file: `${name}.${ext}`, code, framework };
            }

            case 'hook': {
                const { name, typescript = true } = opts;
                if (!name) return { success: false, error: 'name is required' };
                const hookName = name.startsWith('use') ? name : `use${name.charAt(0).toUpperCase() + name.slice(1)}`;
                const ext = typescript ? 'ts' : 'js';
                const code = generateHook(hookName, typescript);
                return { success: true, file: `${hookName}.${ext}`, code };
            }

            case 'route': {
                const { path: routePath, method = 'GET', framework = 'express' } = opts;
                if (!routePath) return { success: false, error: 'path is required' };
                const code = generateRoute(routePath, method, framework);
                return { success: true, code };
            }

            case 'form': {
                const { fields, name = 'Form', validation = true } = opts;
                if (!fields || !Array.isArray(fields)) return { success: false, error: 'fields array is required' };
                const code = generateForm(name, fields, validation);
                return { success: true, code };
            }

            case 'store': {
                const { name, fields = [], framework = 'zustand' } = opts;
                if (!name) return { success: false, error: 'name is required' };
                const code = generateStore(name, fields, framework);
                return { success: true, code };
            }

            default:
                return { success: false, error: `Unknown web_scaffold action: ${action}` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── web_optimize ────────────────────────────────────────────────
async function webOptimize(params) {
    const { action = 'meta', ...opts } = params;

    try {
        switch (action) {
            case 'meta': {
                const { title, description, url, image, type = 'website' } = opts;
                const tags = [
                    `<meta charset="UTF-8">`,
                    `<meta name="viewport" content="width=device-width, initial-scale=1.0">`,
                    title ? `<title>${title}</title>` : '',
                    description ? `<meta name="description" content="${description}">` : '',
                    // Open Graph
                    title ? `<meta property="og:title" content="${title}">` : '',
                    description ? `<meta property="og:description" content="${description}">` : '',
                    url ? `<meta property="og:url" content="${url}">` : '',
                    image ? `<meta property="og:image" content="${image}">` : '',
                    `<meta property="og:type" content="${type}">`,
                    // Twitter
                    `<meta name="twitter:card" content="summary_large_image">`,
                    title ? `<meta name="twitter:title" content="${title}">` : '',
                    description ? `<meta name="twitter:description" content="${description}">` : '',
                    image ? `<meta name="twitter:image" content="${image}">` : '',
                ].filter(Boolean).join('\n');
                return { success: true, tags };
            }

            case 'sitemap': {
                const { urls = [], baseUrl = '' } = opts;
                const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => {
                    const loc = u.url || u;
                    const priority = u.priority || '0.8';
                    const changefreq = u.changefreq || 'weekly';
                    return `  <url>\n    <loc>${baseUrl}${loc}</loc>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
                }).join('\n')}\n</urlset>`;
                return { success: true, xml };
            }

            case 'robots': {
                const { disallow = [], allow = [], sitemapUrl } = opts;
                let txt = 'User-agent: *\n';
                for (const p of allow) txt += `Allow: ${p}\n`;
                for (const p of disallow) txt += `Disallow: ${p}\n`;
                if (sitemapUrl) txt += `\nSitemap: ${sitemapUrl}`;
                return { success: true, content: txt };
            }

            case 'pwa_manifest': {
                const manifest = {
                    name: opts.name || 'My App',
                    short_name: opts.shortName || opts.name || 'App',
                    description: opts.description || '',
                    start_url: opts.startUrl || '/',
                    display: opts.display || 'standalone',
                    background_color: opts.backgroundColor || '#ffffff',
                    theme_color: opts.themeColor || '#000000',
                    icons: opts.icons || [
                        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
                        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
                    ],
                };
                return { success: true, manifest: JSON.stringify(manifest, null, 2) };
            }

            case 'service_worker': {
                const { cacheName = 'v1', precache = [] } = opts;
                const sw = `const CACHE_NAME = '${cacheName}';\nconst PRECACHE_URLS = ${JSON.stringify(precache)};\n\nself.addEventListener('install', (event) => {\n  event.waitUntil(\n    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))\n  );\n});\n\nself.addEventListener('fetch', (event) => {\n  event.respondWith(\n    caches.match(event.request).then((response) => {\n      return response || fetch(event.request).then((fetchResponse) => {\n        return caches.open(CACHE_NAME).then((cache) => {\n          cache.put(event.request, fetchResponse.clone());\n          return fetchResponse;\n        });\n      });\n    })\n  );\n});`;
                return { success: true, code: sw };
            }

            default:
                return { success: false, error: `Unknown web_optimize action: ${action}` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── web_transform ───────────────────────────────────────────────
async function webTransform(params) {
    const { action = 'tailwind', ...opts } = params;

    try {
        switch (action) {
            case 'tailwind': {
                const { colors, fonts, spacing } = opts;
                const config = {
                    content: ['./src/**/*.{js,jsx,ts,tsx}', './pages/**/*.{js,jsx,ts,tsx}'],
                    theme: { extend: {} },
                    plugins: [],
                };
                if (colors) config.theme.extend.colors = colors;
                if (fonts) config.theme.extend.fontFamily = fonts;
                if (spacing) config.theme.extend.spacing = spacing;
                return { success: true, config: `/** @type {import('tailwindcss').Config} */\nexport default ${JSON.stringify(config, null, 2)}` };
            }

            case 'dark_mode': {
                const { selector = 'class' } = opts;
                const code = `// Dark mode utility\nexport function toggleDarkMode() {\n  document.documentElement.classList.toggle('dark');\n  const isDark = document.documentElement.classList.contains('dark');\n  localStorage.setItem('theme', isDark ? 'dark' : 'light');\n  return isDark;\n}\n\nexport function initDarkMode() {\n  const saved = localStorage.getItem('theme');\n  if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {\n    document.documentElement.classList.add('dark');\n  }\n}`;
                return { success: true, code, selector };
            }

            case 'responsive': {
                const { component = 'div', breakpoints } = opts;
                const bp = breakpoints || { sm: '640px', md: '768px', lg: '1024px', xl: '1280px' };
                const css = Object.entries(bp).map(([name, size]) => `@media (min-width: ${size}) { /* ${name} */ }`).join('\n');
                return { success: true, css, breakpoints: bp };
            }

            case 'animations': {
                const { name = 'fade-in', duration = '0.3s', easing = 'ease-out' } = opts;
                const animations = {
                    'fade-in': `@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }\n.fade-in { animation: fadeIn ${duration} ${easing}; }`,
                    'slide-up': `@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }\n.slide-up { animation: slideUp ${duration} ${easing}; }`,
                    'scale-in': `@keyframes scaleIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }\n.scale-in { animation: scaleIn ${duration} ${easing}; }`,
                    'bounce': `@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }\n.bounce { animation: bounce 0.6s ease infinite; }`,
                };
                return { success: true, css: animations[name] || animations['fade-in'] };
            }

            default:
                return { success: false, error: `Unknown web_transform action: ${action}` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── web_screenshot ──────────────────────────────────────────────
async function webScreenshot(params) {
    const { url, action = 'capture', ...opts } = params;
    // Note: Requires puppeteer or playwright on the server
    try {
        return {
            success: false,
            error: 'web_screenshot requires Puppeteer/Playwright. Use web_scrape for content extraction.',
            suggestion: 'Install puppeteer: npm install puppeteer',
        };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── web_lighthouse ──────────────────────────────────────────────
async function webLighthouse(params) {
    const { url, action = 'audit', ...opts } = params;
    if (!url) return { success: false, error: 'url is required' };

    try {
        // Use Google PageSpeed Insights API (free, no key needed for basic)
        const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${opts.strategy || 'mobile'}`;
        const res = await fetch(apiUrl, { timeout: 60000 });
        if (!res.ok) return { success: false, error: `PageSpeed API returned ${res.status}` };
        const data = await res.json();

        const categories = data.lighthouseResult?.categories || {};
        return {
            success: true,
            url,
            scores: {
                performance: Math.round((categories.performance?.score || 0) * 100),
                accessibility: Math.round((categories.accessibility?.score || 0) * 100),
                bestPractices: Math.round((categories['best-practices']?.score || 0) * 100),
                seo: Math.round((categories.seo?.score || 0) * 100),
            },
            metrics: {
                firstContentfulPaint: data.lighthouseResult?.audits?.['first-contentful-paint']?.displayValue || 'N/A',
                largestContentfulPaint: data.lighthouseResult?.audits?.['largest-contentful-paint']?.displayValue || 'N/A',
                totalBlockingTime: data.lighthouseResult?.audits?.['total-blocking-time']?.displayValue || 'N/A',
                cumulativeLayoutShift: data.lighthouseResult?.audits?.['cumulative-layout-shift']?.displayValue || 'N/A',
                speedIndex: data.lighthouseResult?.audits?.['speed-index']?.displayValue || 'N/A',
            },
            strategy: opts.strategy || 'mobile',
        };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── web_scrape ──────────────────────────────────────────────────
async function webScrape(params) {
    const { url, action = 'extract', selector, ...opts } = params;
    if (!url) return { success: false, error: 'url is required' };

    try {
        const res = await fetch(url, {
            timeout: 15000,
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MaulaBot/1.0)' },
        });
        if (!res.ok) return { success: false, error: `Failed to fetch: ${res.status}` };
        const html = await res.text();
        const dom = new JSDOM(html);
        const doc = dom.window.document;

        switch (action) {
            case 'extract': {
                const title = doc.querySelector('title')?.textContent || '';
                const text = doc.body?.textContent?.replace(/\s+/g, ' ').trim() || '';
                return {
                    success: true,
                    url,
                    title,
                    textLength: text.length,
                    text: text.slice(0, opts.maxLength || 5000),
                };
            }

            case 'links': {
                const links = [...doc.querySelectorAll('a[href]')].map(a => ({
                    text: a.textContent.trim().slice(0, 100),
                    href: a.getAttribute('href'),
                })).filter(l => l.href && !l.href.startsWith('#'));
                return { success: true, url, links: links.slice(0, opts.maxResults || 100), total: links.length };
            }

            case 'tables': {
                const tables = [...doc.querySelectorAll('table')];
                return {
                    success: true,
                    url,
                    tables: tables.slice(0, 10).map((table, idx) => {
                        const rows = [...table.querySelectorAll('tr')];
                        const headers = [...(rows[0]?.querySelectorAll('th,td') || [])].map(c => c.textContent.trim());
                        const data = rows.slice(1).map(row => [...row.querySelectorAll('td,th')].map(c => c.textContent.trim()));
                        return { index: idx, headers, data: data.slice(0, 100) };
                    }),
                };
            }

            case 'json_ld': {
                const scripts = [...doc.querySelectorAll('script[type="application/ld+json"]')];
                const data = scripts.map(s => { try { return JSON.parse(s.textContent); } catch { return null; } }).filter(Boolean);
                return { success: true, url, jsonLd: data };
            }

            case 'select': {
                if (!selector) return { success: false, error: 'selector required' };
                const elements = [...doc.querySelectorAll(selector)];
                return {
                    success: true,
                    url,
                    results: elements.slice(0, 50).map(el => ({
                        text: el.textContent.trim().slice(0, 500),
                        html: el.outerHTML.slice(0, 1000),
                    })),
                };
            }

            default:
                return { success: false, error: `Unknown web_scrape action: ${action}` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function calculateSeoScore(title, desc, canonical, ogTags, h1s) {
    let score = 100;
    if (!title) score -= 20;
    else if (title.length < 30 || title.length > 60) score -= 10;
    if (!desc) score -= 15;
    else if (desc.length < 120 || desc.length > 160) score -= 5;
    if (!canonical) score -= 10;
    if (ogTags.length === 0) score -= 10;
    if (h1s.length === 0) score -= 15;
    if (h1s.length > 1) score -= 5;
    return Math.max(0, score);
}

function generateReactComponent(name, ts, style) {
    const propsType = ts ? `\ninterface ${name}Props {\n  className?: string;\n  children?: React.ReactNode;\n}\n` : '';
    const propsArg = ts ? `{ className, children }: ${name}Props` : '{ className, children }';
    return `${ts ? "'use client';\n\nimport React from 'react';" : "'use client';\n\nimport React from 'react';"}${propsType}\nexport default function ${name}(${propsArg}) {\n  return (\n    <div className={className ?? ''}>\n      {children}\n    </div>\n  );\n}`;
}

function generateHook(name, ts) {
    return `import { useState, useEffect${ts ? '' : ''} } from 'react';\n\nexport function ${name}() {\n  const [data, setData] = useState${ts ? '<unknown>' : ''}(null);\n  const [loading, setLoading] = useState(true);\n  const [error, setError] = useState${ts ? '<Error | null>' : ''}(null);\n\n  useEffect(() => {\n    // TODO: implement\n    setLoading(false);\n  }, []);\n\n  return { data, loading, error };\n}`;
}

function generateRoute(routePath, method, framework) {
    return `router.${method.toLowerCase()}('${routePath}', async (req, res) => {\n  try {\n    // TODO: implement\n    res.json({ success: true });\n  } catch (err) {\n    console.error('[${routePath}] Error:', err);\n    res.status(500).json({ success: false, error: err.message });\n  }\n});`;
}

function generateForm(name, fields, validation) {
    const fieldInputs = fields.map(f => `      <div>\n        <label htmlFor="${f.name}">${f.label || f.name}</label>\n        <input id="${f.name}" name="${f.name}" type="${f.type || 'text'}" ${f.required ? 'required' : ''} />\n      </div>`).join('\n');
    return `export default function ${name}() {\n  const handleSubmit = (e) => {\n    e.preventDefault();\n    const formData = new FormData(e.target);\n    // TODO: submit\n  };\n\n  return (\n    <form onSubmit={handleSubmit}>\n${fieldInputs}\n      <button type="submit">Submit</button>\n    </form>\n  );\n}`;
}

function generateStore(name, fields, framework) {
    if (framework === 'zustand') {
        const stateFields = fields.map(f => `  ${f.name}: ${f.default || 'null'},`).join('\n');
        const setters = fields.map(f => `  set${f.name.charAt(0).toUpperCase() + f.name.slice(1)}: (val) => set({ ${f.name}: val }),`).join('\n');
        return `import { create } from 'zustand';\n\nexport const use${name}Store = create((set) => ({\n${stateFields}\n${setters}\n}));`;
    }
    return `// TODO: implement ${framework} store for ${name}`;
}

export default {
    webAnalyze,
    webScaffold,
    webOptimize,
    webTransform,
    webScreenshot,
    webLighthouse,
    webScrape,
};
