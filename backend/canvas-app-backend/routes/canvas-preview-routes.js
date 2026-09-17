/**
 * CANVAS PREVIEW ROUTES
 * Serves generated apps directly as full HTML pages at:
 *   GET /p/app-{language}-{id}
 *
 * Used by preview.sanbayfusion.com domain (nginx rewrites /app-* → /p/app-*)
 * No auth required — public preview links.
 * URL format: https://preview.sanbayfusion.com/app-html-clx123abc
 *             https://preview.sanbayfusion.com/app-react-clx456def
 *             https://preview.sanbayfusion.com/app-python-clx789ghi
 */

import express from 'express';
import { prisma } from '../lib/prisma.js';

const router = express.Router();

// CDN scripts injected into every preview (Tailwind + Lucide)
const CDN_SCRIPTS = `<script src="https://cdn.tailwindcss.com/3.4.17"></script>
<script src="https://unpkg.com/lucide@latest"></script>`;

// Navigation guard — comprehensive prevention of ALL navigation away from preview
// Intercepts: <a> clicks, form submissions, window.location, window.open, meta refresh
const NAV_GUARD = `<script>
(function(){
  // 1. Intercept link clicks
  document.addEventListener('click', function(e){
    var el = e.target && e.target.closest ? e.target.closest('a') : null;
    if (!el) return;
    var href = el.getAttribute('href') || '';
    if (href.startsWith('#') || href.startsWith('javascript:')) return;
    e.preventDefault();
    e.stopPropagation();
  }, true);
  // 2. Intercept form submissions
  document.addEventListener('submit', function(e){
    var form = e.target;
    if (form && form.tagName === 'FORM') {
      var action = form.getAttribute('action') || '';
      if (!action.startsWith('#') && !action.startsWith('javascript:')) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  }, true);
  // 3. Override location methods
  try { window.location.assign = function(){}; } catch(e){}
  try { window.location.replace = function(){}; } catch(e){}
  // 4. Override window.open
  window.open = function(){ return null; };
  // 5. Override location.href setter
  try {
    var desc = Object.getOwnPropertyDescriptor(Location.prototype, 'href');
    if (desc && desc.set) {
      Object.defineProperty(Location.prototype, 'href', {
        get: desc.get,
        set: function(v){ if (typeof v==='string' && v.startsWith('#')) desc.set.call(this,v); },
        configurable: true
      });
    }
  } catch(e){}
  // 6. Remove meta refresh tags
  var observer = new MutationObserver(function(mutations){
    mutations.forEach(function(m){
      m.addedNodes.forEach(function(n){
        if (n.tagName==='META' && n.httpEquiv && n.httpEquiv.toLowerCase()==='refresh') n.remove();
      });
    });
  });
  observer.observe(document.documentElement, {childList:true, subtree:true});
  document.querySelectorAll('meta[http-equiv="refresh"]').forEach(function(m){m.remove();});
})();
</script>`;

// Prepare the raw HTML code for browser rendering
function prepareHtml(code) {
    let html = (code || '').trim();
    if (!html) {
        return `<!DOCTYPE html><html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0a0a0f;color:#666"><p>No preview available</p></body></html>`;
    }

    // Inject Tailwind CDN if not already present
    if (!html.includes('cdn.tailwindcss.com')) {
        if (html.includes('</head>')) {
            html = html.replace('</head>', `${CDN_SCRIPTS}\n</head>`);
        } else if (html.includes('<head>')) {
            html = html.replace('<head>', `<head>\n${CDN_SCRIPTS}`);
        } else if (html.includes('<html')) {
            html = html.replace(/<html[^>]*>/, `$&\n<head>${CDN_SCRIPTS}</head>`);
        } else {
            html = `<head>${CDN_SCRIPTS}</head>\n${html}`;
        }
    }

    // Auto-init Lucide icons if referenced
    if (html.includes('lucide') && !html.includes('lucide.createIcons')) {
        if (html.includes('</body>')) {
            html = html.replace('</body>', `<script>if(window.lucide)lucide.createIcons();</script>\n</body>`);
        }
    }

    // Inject nav guard to prevent navigation away from single-page preview
    if (html.includes('</head>')) {
        html = html.replace('</head>', `${NAV_GUARD}\n</head>`);
    } else if (html.includes('<head>')) {
        html = html.replace('<head>', `<head>\n${NAV_GUARD}`);
    } else {
        html = `${NAV_GUARD}\n${html}`;
    }

    return html;
}

/**
 * GET /p/app-{language}-{appId}
 * e.g. /p/app-html-clx1234567890abc
 *      /p/app-react-clx9876543210xyz
 */
router.get('/app-:slug', async (req, res) => {
    try {
        const slug = req.params.slug; // e.g. "html-clx1234567890abc"

        // Extract appId: everything after the first hyphen (language-appId format)
        const hyphenIdx = slug.indexOf('-');
        if (hyphenIdx === -1) {
            return res.status(404).send(`<!DOCTYPE html><html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0a0a0f;color:#888"><p>Invalid preview URL</p></body></html>`);
        }
        const appId = slug.slice(hyphenIdx + 1);

        // Validate appId to prevent injection
        if (!appId || !/^[a-z0-9_-]{5,50}$/i.test(appId)) {
            return res.status(400).send(`<!DOCTYPE html><html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0a0a0f;color:#888"><p>Invalid app ID</p></body></html>`);
        }

        const app = await prisma.canvasApp.findUnique({
            where: { id: appId },
            select: { id: true, code: true, language: true, name: true },
        });

        if (!app || !app.code) {
            return res.status(404).send(`<!DOCTYPE html><html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0a0a0f;color:#888"><div style="text-align:center"><h2 style="color:#ef4444;margin-bottom:8px">App not found</h2><p style="margin-bottom:16px">This preview link may have expired or been deleted.</p><a href="https://canvas.sanbayfusion.com" style="color:#ef4444;text-decoration:none;font-size:14px">← Back to Canvas</a></div></body></html>`);
        }

        const html = prepareHtml(app.code);

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=60'); // short cache — code can change
        // Allow embedding from canvas.sanbayfusion.com and anywhere else (shareable)
        res.removeHeader('X-Frame-Options');
        res.send(html);
    } catch (error) {
        console.error('[preview] Error serving app:', error.message);
        res.status(500).send(`<!DOCTYPE html><html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0a0a0f;color:#888"><p>Preview temporarily unavailable</p></body></html>`);
    }
});

// Root — landing page for preview.sanbayfusion.com
router.get('/', (_req, res) => {
    res.send(`<!DOCTYPE html><html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0a0a0f;color:#888"><div style="text-align:center"><h2 style="color:#ef4444;margin-bottom:8px">Maula AI Preview</h2><p>Build apps at <a href="https://canvas.sanbayfusion.com" style="color:#ef4444;text-decoration:none">canvas.sanbayfusion.com</a></p><p style="font-size:12px;margin-top:8px;opacity:0.5">Preview URLs: preview.sanbayfusion.com/app-html-abc123</p></div></body></html>`);
});

export default router;
