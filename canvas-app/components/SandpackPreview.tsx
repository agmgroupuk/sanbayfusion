/**
 * SandpackPreview - Live Code Preview
 * Uses native iframe srcdoc for HTML (no external dependencies)
 * Falls back to Sandpack only for React/JS that needs npm bundling
 * Supports multiple view modes: Desktop, Tablet, Mobile, Split
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useEditorStore } from '../services/editorBridge';
import {
  SandpackProvider,
  SandpackPreview as SandpackPreviewPane,
  SandpackCodeEditor,
  SandpackLayout,
  useSandpack,
} from '@codesandbox/sandpack-react';
import { atomDark } from '@codesandbox/sandpack-themes';
import {
  RefreshCw,
  ExternalLink,
  Download,
  Copy,
  Check,
  Maximize2,
  Sparkles,
  Play,
  Square,
  Terminal,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export type ViewMode = 'desktop' | 'tablet' | 'mobile' | 'code' | 'split';

// Languages that run in-browser via Sandpack / iframe
const FRONTEND_LANGS = new Set(['html', 'css', 'javascript', 'typescript', 'react', 'nextjs', 'vue', 'svelte', 'angular', 'vanilla']);
// Languages that need a server process for live preview (web servers → iframe)
const BACKEND_LANGS = new Set(['express', 'fastify', 'flask', 'fastapi', 'django', 'go', 'php', 'laravel', 'ruby', 'rails']);

export function isBackendLanguage(lang?: string) {
  return lang ? BACKEND_LANGS.has(lang.toLowerCase()) : false;
}

interface SandpackPreviewProps {
  code: string;
  language?: 'html' | 'react' | 'nextjs' | 'vanilla';
  /** The actual programming language chosen by the user (full ProgrammingLanguage value) */
  currentLanguage?: string;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  onCodeChange?: (code: string) => void;
  /** Auto-start the backend server preview immediately (set after agent builds a backend app) */
  autoRun?: boolean;
  /** Called once the auto-run kicks off, so parent can reset the trigger */
  onAutoRunStarted?: () => void;
  /** Called with the live cloud preview URL (or null when stopped) */
  onSessionUrl?: (url: string | null) => void;
}

// Device dimensions
const DEVICE_SIZES = {
  desktop: { width: '100%', height: '100%' },
  tablet: { width: '768px', height: '1024px' },
  mobile: { width: '375px', height: '812px' },
};

// Refresh button component that uses Sandpack context
const RefreshButton: React.FC = () => {
  const { dispatch } = useSandpack();

  return (
    <button
      onClick={() => dispatch({ type: 'refresh' })}
      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
      title="Refresh preview"
    >
      <RefreshCw className="w-4 h-4" />
    </button>
  );
};

// CDN scripts to inject into previewed HTML
const CDN_SCRIPTS = [
  '<script src="https://cdn.tailwindcss.com/3.4.17"></script>',
  '<script src="https://unpkg.com/lucide@latest"></script>',
].join('\n');

// Convert HTML to Sandpack-compatible format
function htmlToSandpackFiles(code: string) {
  // Inject CDN scripts if not already present
  let html = code;
  if (!html.includes('cdn.tailwindcss.com')) {
    // Insert before </head> or at start of <head>, or prepend to document
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

  // Extract CSS from style tags
  const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
  const styles = styleMatch
    ? styleMatch.map(s => s.replace(/<\/?style[^>]*>/gi, '')).join('\n')
    : '';

  // Extract JS from script tags (excluding CDN scripts)
  const scriptMatch = html.match(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi);
  const scripts = scriptMatch
    ? scriptMatch.map(s => s.replace(/<\/?script[^>]*>/gi, '')).join('\n')
    : '';

  return {
    '/index.html': html,
    '/styles.css': styles || '/* No embedded styles */',
    '/index.js': scripts || '// No embedded scripts',
  };
}

// Prepare HTML for native iframe preview (inject CDN scripts if missing)
function prepareHtmlForIframe(code: string, resolveFile?: (path: string) => string | undefined): string {
  let html = code;

  // ── Step 1: Inline local <link rel="stylesheet"> from editorStore, or replace with CDN ──
  if (resolveFile) {
    html = html.replace(
      /<link\s+[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*\/?>/gi,
      (match, href) => {
        if (/^https?:\/\//.test(href)) return match; // keep CDN links
        const normalized = href.startsWith('/') ? href : `/${href}`;
        const css = resolveFile(normalized);
        if (css) return `<style>/* inlined: ${href} */\n${css}</style>`;
        // File not found — if it's a tailwind reference, replace with CDN
        if (/tailwind/i.test(href)) return '<script src="https://cdn.tailwindcss.com"></script>';
        // Other missing local CSS: drop the broken link silently
        return `<!-- removed missing local stylesheet: ${href} -->`;
      }
    );
  } else {
    // No resolveFile — replace any local tailwind link with CDN, drop other local links
    html = html.replace(
      /<link\s+[^>]*rel=["']stylesheet["'][^>]*href=["'](?!https?:\/\/)([^"']+)["'][^>]*\/?>/gi,
      (match, href) => {
        if (/tailwind/i.test(href)) return '<script src="https://cdn.tailwindcss.com"></script>';
        return `<!-- removed missing local stylesheet: ${href} -->`;
      }
    );
  }

  // ── Step 2: Inline local <script src="..."> or replace/drop broken ones ──
  html = html.replace(
    /<script\s+([^>]*)src=["']([^"']+)["']([^>]*)><\/script>/gi,
    (match, before, src, after) => {
      if (/^https?:\/\//.test(src)) return match; // keep CDN scripts
      const normalized = src.startsWith('/') ? src : `/${src}`;
      const js = resolveFile ? resolveFile(normalized) : undefined;
      if (js) return `<script>/* inlined: ${src} */\n${js}</script>`;
      // Missing local file: drop broken script tags (main.jsx, script.js, etc.)
      return `<!-- removed missing local script: ${src} -->`;
    }
  );

  // ── Step 3: Replace local image paths in src= attributes with picsum placeholders ──
  html = html.replace(
    /(<img\s[^>]*src=["'])(?!https?:\/\/|data:)([^"']+)(["'][^>]*>)/gi,
    (match, before, src, after) => {
      // Try to resolveFile first
      const normalized = src.startsWith('/') ? src : `/${src}`;
      if (resolveFile) {
        const data = resolveFile(normalized);
        if (data) return match; // found in editor, keep as-is (will load from srcdoc)
      }
      // Replace broken local image with a picsum placeholder (preserve dimensions if possible)
      return `${before}https://picsum.photos/400/300${after}`;
    }
  );

  // ── Step 4: Inject Tailwind CDN if not present ──
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
  // Inject Lucide auto-init if lucide is referenced but createIcons isn't called
  if (html.includes('lucide') && !html.includes('lucide.createIcons')) {
    html = html.replace('</body>', `<script>if(window.lucide)lucide.createIcons();</script>\n</body>`);
  }

  // Inject console hook and network interceptor for DevTools panels
  const devToolsHook = `<script>
(function(){
  // Console hook — capture log/warn/error/info/debug
  var _origConsole = {};
  ['log','warn','error','info','debug'].forEach(function(level){
    _origConsole[level] = console[level];
    console[level] = function(){
      _origConsole[level].apply(console, arguments);
      try {
        var args = Array.prototype.slice.call(arguments).map(function(a){
          if (typeof a === 'object') try { return JSON.stringify(a); } catch(e) { return String(a); }
          return String(a);
        }).join(' ');
        parent.postMessage({type:'console-entry',level:level,args:args},'*');
      } catch(e){}
    };
  });
  // Capture uncaught errors
  window.addEventListener('error',function(e){
    parent.postMessage({type:'console-entry',level:'error',args:e.message,source:e.filename,line:e.lineno},'*');
  });

  // Startup ping — confirms the devtools bridge is connected
  document.addEventListener('DOMContentLoaded', function() {
    parent.postMessage({type:'console-entry',level:'info',args:'[Canvas] Preview connected — console & network are active'},'*');
    // Post a network init entry so the network panel shows the monitor is active
    var _initId = 'canvas-init-' + Date.now();
    parent.postMessage({type:'network-entry',action:'start',id:_initId,method:'GET',url:'canvas://devtools/monitor-ready'},'*');
    parent.postMessage({type:'network-entry',action:'end',id:_initId,status:200,time:0,size:0},'*');
  });

  // Network hook — intercept fetch
  var _origFetch = window.fetch;
  window.fetch = function(){
    var id = 'net-'+Date.now()+'-'+Math.random().toString(36).slice(2,6);
    var url = typeof arguments[0] === 'string' ? arguments[0] : (arguments[0] && arguments[0].url) || '';
    var method = (arguments[1] && arguments[1].method) || 'GET';
    var start = performance.now();
    parent.postMessage({type:'network-entry',action:'start',id:id,method:method.toUpperCase(),url:url},'*');
    return _origFetch.apply(this, arguments).then(function(res){
      var time = performance.now() - start;
      var clone = res.clone();
      clone.text().then(function(body){ parent.postMessage({type:'network-entry',action:'end',id:id,status:res.status,time:Math.round(time),size:body.length},'*'); }).catch(function(){ parent.postMessage({type:'network-entry',action:'end',id:id,status:res.status,time:Math.round(time),size:null},'*'); });
      return res;
    }).catch(function(err){
      parent.postMessage({type:'network-entry',action:'end',id:id,status:0,time:Math.round(performance.now()-start),size:null},'*');
      throw err;
    });
  };

  // Network hook — intercept XMLHttpRequest
  var _origXHROpen = XMLHttpRequest.prototype.open;
  var _origXHRSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function(method, url){
    this._devtools = { id:'net-'+Date.now()+'-'+Math.random().toString(36).slice(2,6), method:(method||'GET').toUpperCase(), url:url||'' };
    return _origXHROpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function(){
    var dt = this._devtools;
    if (dt) {
      var start = performance.now();
      parent.postMessage({type:'network-entry',action:'start',id:dt.id,method:dt.method,url:dt.url},'*');
      this.addEventListener('loadend', function(){
        parent.postMessage({type:'network-entry',action:'end',id:dt.id,status:this.status,time:Math.round(performance.now()-start),size:this.responseText?this.responseText.length:null},'*');
      });
    }
    return _origXHRSend.apply(this, arguments);
  };
})();
</script>`;

  // Navigation guard — intercept link clicks for multi-page navigation within preview
  // Local .html links (e.g. href="categories.html") are sent to parent via postMessage
  // so the parent can load the file from the editor store. External URLs are blocked.
  const navGuard = `<script>
(function(){
  // Intercept all link clicks — handle local page navigation, block external
  document.addEventListener('click', function(e){
    var el = e.target && e.target.closest ? e.target.closest('a') : null;
    if (!el) return;
    var href = el.getAttribute('href') || '';
    // Allow same-page anchors (#section) — let the browser handle them
    if (href.startsWith('#')) return;
    // Allow javascript: links
    if (href.startsWith('javascript:')) return;
    // Block external URLs
    if (/^https?:\\/\\//.test(href)) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    // Local file navigation (e.g. "categories.html", "./watches.html", "/contact.html")
    e.preventDefault();
    e.stopPropagation();
    // Normalize the path: strip leading ./ and ensure leading /
    var target = href.replace(/^\\.?\\//, '');
    if (!target.startsWith('/')) target = '/' + target;
    // Default to /index.html for bare directory paths
    if (target === '/' || target.endsWith('/')) target += 'index.html';
    parent.postMessage({ type: 'canvas-navigate-page', path: target }, '*');
  }, true);
  // Intercept form submissions that would navigate
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
  // Override location methods to prevent programmatic navigation
  try { window.location.assign = function(u){ if(typeof u==='string'&&!(/^https?:\\/\\//.test(u))) parent.postMessage({type:'canvas-navigate-page',path:u.startsWith('/')?u:'/'+u},'*'); }; } catch(e){}
  try { window.location.replace = function(u){ if(typeof u==='string'&&!(/^https?:\\/\\//.test(u))) parent.postMessage({type:'canvas-navigate-page',path:u.startsWith('/')?u:'/'+u},'*'); }; } catch(e){}
  window.open = function(){ return null; };
  // Override location.href setter — redirect to multi-page navigation
  try {
    var desc = Object.getOwnPropertyDescriptor(Location.prototype, 'href');
    if (desc && desc.set) {
      Object.defineProperty(Location.prototype, 'href', {
        get: desc.get,
        set: function(v){
          if (typeof v==='string' && v.startsWith('#')) { desc.set.call(this,v); return; }
          if (typeof v==='string' && !(/^https?:\\/\\//.test(v))) {
            var p = v.startsWith('/') ? v : '/' + v;
            if (p==='/' || p.endsWith('/')) p += 'index.html';
            parent.postMessage({type:'canvas-navigate-page',path:p},'*');
          }
        },
        configurable: true
      });
    }
  } catch(e){}
  // Remove meta refresh tags
  document.querySelectorAll('meta[http-equiv="refresh"]').forEach(function(m){m.remove();});
  // Rewrite all link hrefs on hover to show correct preview URL in status bar
  document.addEventListener('mouseover', function(e){
    var el = e.target && e.target.closest ? e.target.closest('a') : null;
    if (!el || el._hrefPatched) return;
    var href = el.getAttribute('href') || '';
    if (href.startsWith('#') || href.startsWith('javascript:') || /^https?:\\/\\//.test(href)) return;
    // Store original href and patch for status bar display
    el._origHref = href;
    el._hrefPatched = true;
    el.setAttribute('href', '#navigate:' + href);
  }, true);
})();
</script>`;

  // Inject both devtools hook and nav guard before </head> or at top
  const injections = `${devToolsHook}\n${navGuard}`;
  if (html.includes('</head>')) {
    html = html.replace('</head>', `${injections}\n</head>`);
  } else if (html.includes('<head>')) {
    html = html.replace('<head>', `<head>\n${injections}`);
  } else {
    html = `${injections}\n${html}`;
  }

  return html;
}

// Native HTML iframe preview — no external dependencies
// Supports multi-page navigation: clicking local .html links loads the target file
// from the editor store (files like /index.html, /categories.html, /watches.html).
const HtmlIframePreview: React.FC<{ code: string; style?: React.CSSProperties }> = ({ code, style }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const files = useEditorStore((s) => s.files);
  const [currentPage, setCurrentPage] = useState<string | null>(null);
  const resolveFile = useCallback((path: string) => files[path], [files]);

  // Determine which content to show: navigated page or the passed code (active file)
  const displayCode = currentPage && files[currentPage] ? files[currentPage] : code;
  const preparedHtml = useMemo(() => prepareHtmlForIframe(displayCode, resolveFile), [displayCode, resolveFile]);

  useEffect(() => {
    if (iframeRef.current) {
      iframeRef.current.srcdoc = preparedHtml;
    }
  }, [preparedHtml]);

  // Reset to main page when the code prop changes (new app loaded, code regenerated)
  useEffect(() => {
    setCurrentPage(null);
  }, [code]);

  // Listen for multi-page navigation messages from the iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'canvas-navigate-page') {
        const targetPath = e.data.path as string;
        // Check if the file exists in the editor store
        const storeFiles = useEditorStore.getState().files;
        if (storeFiles[targetPath]) {
          setCurrentPage(targetPath);
        } else {
          // Try without leading slash
          const altPath = targetPath.startsWith('/') ? targetPath.slice(1) : `/${targetPath}`;
          if (storeFiles[altPath]) {
            setCurrentPage(altPath);
          }
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <iframe
      ref={iframeRef}
      sandbox="allow-scripts allow-popups allow-forms allow-modals"
      title="Preview"
      style={{ width: '100%', height: '100%', border: 'none', background: '#fff', ...style }}
    />
  );
};

// Languages that just run as scripts (stdout/stderr output, no HTTP server)
const SCRIPT_LANGS = new Set(['python', 'nodejs', 'typescript', 'r']);

export function isScriptLanguage(lang?: string) {
  return lang ? SCRIPT_LANGS.has(lang.toLowerCase()) : false;
}

// ── ScriptPreview — run a script and show stdout/stderr output ──────────────
type ExecStatus = 'idle' | 'running' | 'done' | 'error';

const ScriptPreview: React.FC<{
  language: string;
  style?: React.CSSProperties;
  autoRun?: boolean;
  onAutoRunStarted?: () => void;
}> = ({ language, style, autoRun, onAutoRunStarted }) => {
  const files = useEditorStore((s) => s.files);
  const [status, setStatus] = useState<ExecStatus>('idle');
  const [stdout, setStdout] = useState('');
  const [stderr, setStderr] = useState('');
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const autoRunFiredRef = useRef(false);
  const outputEndRef = useRef<HTMLDivElement>(null);

  const LANG_LABEL: Record<string, string> = {
    python: 'Python', nodejs: 'Node.js', typescript: 'TypeScript', r: 'R',
  };

  useEffect(() => {
    outputEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [stdout, stderr]);

  // Auto-run when parent triggers it
  useEffect(() => {
    if (autoRun && !autoRunFiredRef.current && status === 'idle') {
      autoRunFiredRef.current = true;
      onAutoRunStarted?.();
      handleRun();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun]);

  const handleRun = async () => {
    setStatus('running');
    setStdout('');
    setStderr('');
    setExitCode(null);
    setTimedOut(false);

    try {
      const res = await fetch('/api/canvas/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files, language }),
      });
      const data = await res.json();
      if (data.success) {
        setStdout(data.stdout || '');
        setStderr(data.stderr || '');
        setExitCode(data.exitCode);
        setTimedOut(!!data.timedOut);
        setStatus(data.exitCode === 0 ? 'done' : 'error');
      } else {
        setStderr(data.message || 'Execution failed');
        setStatus('error');
      }
    } catch (err: unknown) {
      setStderr(err instanceof Error ? err.message : 'Network error');
      setStatus('error');
    }
  };

  const succeeded = status === 'done' && exitCode === 0;
  const failed = status === 'error' || (status === 'done' && exitCode !== 0);
  const hasOutput = stdout.trim() || stderr.trim();

  return (
    <div className="flex flex-col h-full bg-canvas-main" style={style}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-canvas-card border-b border-canvas-border shrink-0">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.03] border border-canvas-border">
          <Terminal className="w-3 h-3 text-emerald-400/60" />
          <span className="text-[11px] text-canvas-muted font-medium">{LANG_LABEL[language] ?? language}</span>
        </div>

        {(status === 'idle' || status === 'done' || status === 'error') && (
          <button
            onClick={handleRun}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-xs font-medium transition-colors"
          >
            <Play className="w-3 h-3" />
            {status === 'idle' ? 'Run Script' : 'Re-run'}
          </button>
        )}
        {status === 'running' && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 text-yellow-400 rounded-lg text-xs font-medium">
            <Loader2 className="w-3 h-3 animate-spin" />
            Running…
          </div>
        )}

        {/* Status badge */}
        {succeeded && (
          <span className="ml-auto text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-medium">
            ✓ exit 0
          </span>
        )}
        {failed && (
          <span className="ml-auto text-[10px] text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded-full font-medium">
            exit {exitCode ?? '?'}
          </span>
        )}
        {timedOut && (
          <span className="text-[10px] text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full font-medium">
            timed out (30s)
          </span>
        )}
      </div>

      {/* Output terminal */}
      <div className="flex-1 min-h-0 overflow-auto p-4 font-mono text-[12px] leading-relaxed bg-canvas-main">
        {status === 'idle' && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-600">
            <Terminal className="w-10 h-10 text-gray-700" />
            <div className="text-center">
              <p className="text-sm text-canvas-muted-deep font-medium mb-1">{LANG_LABEL[language] ?? language} Script</p>
              <p className="text-xs text-gray-700">Click "Run Script" to execute and see the output</p>
            </div>
          </div>
        )}
        {status === 'running' && !hasOutput && (
          <div className="flex items-center gap-2 text-yellow-400/60">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Executing…</span>
          </div>
        )}
        {/* stdout */}
        {stdout && (
          <pre className="whitespace-pre-wrap break-words text-gray-200">{stdout}</pre>
        )}
        {/* stderr */}
        {stderr && (
          <pre className={`whitespace-pre-wrap break-words mt-2 ${exitCode !== 0 ? 'text-primary-400' : 'text-yellow-400/80'}`}>
            {stderr}
          </pre>
        )}
        {/* Done but no output */}
        {(status === 'done' || status === 'error') && !hasOutput && (
          <span className="text-gray-600 italic text-xs">(no output)</span>
        )}
        <div ref={outputEndRef} />
      </div>
    </div>
  );
};

// ── BackendPreview — server-side language preview via /api/canvas/run ──────
type RunStatus = 'idle' | 'installing' | 'starting' | 'running' | 'error' | 'stopped';

interface LogLine { stream: string; text: string; }

const LANG_LABELS: Record<string, string> = {
  express: 'Express.js', fastify: 'Fastify', nodejs: 'Node.js',
  typescript: 'TypeScript', python: 'Python', flask: 'Flask',
  fastapi: 'FastAPI', django: 'Django', go: 'Go', php: 'PHP',
  laravel: 'Laravel', ruby: 'Ruby', rails: 'Ruby on Rails',
};

const BackendPreview: React.FC<{
  language: string;
  style?: React.CSSProperties;
  autoRun?: boolean;
  onAutoRunStarted?: () => void;
  onSessionUrl?: (url: string | null) => void;
}> = ({ language, style, autoRun, onAutoRunStarted, onSessionUrl }) => {
  const files = useEditorStore((s) => s.files);
  const [status, setStatus] = useState<RunStatus>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const autoRunFiredRef = useRef(false);

  // Scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Auto-start when parent signals autoRun (e.g. agent just built a backend app)
  useEffect(() => {
    if (autoRun && !autoRunFiredRef.current && status === 'idle') {
      autoRunFiredRef.current = true;
      onAutoRunStarted?.();
      handleStart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun]);

  // Poll status while starting/installing
  useEffect(() => {
    if (!sessionId || (status !== 'installing' && status !== 'starting')) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/canvas/run/${sessionId}/status`);
        const data = await r.json();
        if (data.success) {
          setStatus(data.status as RunStatus);
          setLogs(data.logs || []);
          if (data.status === 'running') {
            setIframeKey(k => k + 1);
          } else if (data.status === 'error' || data.status === 'stopped') {
            setError(data.error || `Server stopped (exit ${data.exitCode ?? '?'})`);
          }
        }
      } catch { /* ignore network errors during polling */ }
    }, 1500);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [sessionId, status]);

  const handleStart = async () => {
    setStatus('installing');
    setError(null);
    setLogs([{ stream: 'system', text: `Starting ${LANG_LABELS[language] ?? language} server…\n` }]);

    try {
      const res = await fetch('/api/canvas/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files, language }),
      });
      const data = await res.json();
      if (data.success) {
        setSessionId(data.sessionId);
        setStatus(data.status as RunStatus);
        if (data.status === 'running') setIframeKey(k => k + 1);
      } else {
        setStatus('error');
        setError(data.message || 'Failed to start preview');
      }
    } catch (err: unknown) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Network error');
    }
  };

  const handleStop = async () => {
    if (sessionId) {
      await fetch(`/api/canvas/run/${sessionId}`, { method: 'DELETE' }).catch(() => { });
      setSessionId(null);
    }
    setStatus('idle');
    setLogs([]);
  };

  const handleRestart = () => { handleStop().then(handleStart); };

  const previewUrl = sessionId ? `/api/canvas/preview/${sessionId}/` : null;
  const publicUrl = sessionId ? `${window.location.origin}/api/canvas/preview/${sessionId}/` : null;
  const isRunning = status === 'running';
  const isBusy = status === 'installing' || status === 'starting';

  // Notify parent when URL changes
  useEffect(() => {
    onSessionUrl?.(publicUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicUrl]);

  return (
    <div className="flex flex-col h-full bg-canvas-main" style={style}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-canvas-card border-b border-canvas-border shrink-0">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.03] border border-canvas-border">
          <div className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-emerald-400' :
            isBusy ? 'bg-yellow-400 animate-pulse' :
              status === 'error' ? 'bg-primary-400' : 'bg-gray-600'
            }`} />
          <span className="text-[11px] text-canvas-muted font-medium">
            {LANG_LABELS[language] ?? language}
          </span>
        </div>

        {/* URL bar — shows the real cloud sandbox URL when running */}
        {isRunning && publicUrl && (
          <div className="flex-1 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.03] border border-canvas-border min-w-0">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-canvas-muted truncate hover:text-gray-200 transition-colors font-mono"
              title={publicUrl}
            >
              {publicUrl}
            </a>
          </div>
        )}

        {!isRunning && !isBusy && (
          <button
            onClick={handleStart}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-xs font-medium transition-colors"
          >
            <Play className="w-3 h-3" />
            Run Server
          </button>
        )}
        {isBusy && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 text-yellow-400 rounded-lg text-xs font-medium">
            <Loader2 className="w-3 h-3 animate-spin" />
            {status === 'installing' ? 'Installing deps…' : 'Starting server…'}
          </div>
        )}
        {isRunning && (
          <>
            <button
              onClick={handleRestart}
              className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-white/[0.08] text-canvas-muted rounded-lg text-xs transition-colors"
              title="Restart"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
            <button
              onClick={handleStop}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 rounded-lg text-xs transition-colors"
              title="Stop server"
            >
              <Square className="w-3 h-3" />
              Stop
            </button>
            {previewUrl && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-white/[0.08] text-canvas-muted rounded-lg text-xs transition-colors"
                title="Open in new tab"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </>
        )}
        {(status === 'error' || status === 'stopped') && (
          <button
            onClick={handleStart}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 rounded-lg text-xs font-medium transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        )}

        <button
          onClick={() => setShowLogs(v => !v)}
          className="ml-auto flex items-center gap-1.5 px-2 py-1.5 hover:bg-white/[0.08] text-canvas-muted-deep hover:text-canvas-text rounded-lg text-xs transition-colors"
          title={showLogs ? 'Hide logs' : 'Show logs'}
        >
          <Terminal className="w-3 h-3" />
          Logs
          {showLogs ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
        </button>
      </div>

      {/* Preview iframe / idle state */}
      <div className="flex-1 min-h-0 flex flex-col">
        {status === 'idle' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-canvas-muted-deep bg-canvas-main">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-canvas-border flex items-center justify-center">
              <Play className="w-6 h-6 text-emerald-400/60" />
            </div>
            <div className="text-center">
              <p className="text-sm text-canvas-muted font-medium mb-1">
                {LANG_LABELS[language] ?? language} Server Preview
              </p>
              <p className="text-xs text-gray-600">Click "Run Server" to start the server and see a live preview</p>
            </div>
          </div>
        )}

        {(isBusy) && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-canvas-muted-deep bg-canvas-main">
            <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
            <p className="text-sm text-canvas-muted">
              {status === 'installing' ? 'Installing dependencies…' : 'Waiting for server to start…'}
            </p>
            {logs.length > 0 && (
              <pre className="text-[11px] text-gray-600 bg-canvas-card rounded-lg p-3 max-w-lg max-h-40 overflow-auto w-full font-mono">
                {logs.slice(-10).map(l => l.text).join('')}
              </pre>
            )}
          </div>
        )}

        {status === 'error' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-canvas-muted-deep bg-canvas-main p-4">
            <AlertCircle className="w-8 h-8 text-primary-400" />
            <p className="text-sm text-primary-400 font-medium">Server failed to start</p>
            <p className="text-xs text-canvas-muted-deep text-center max-w-sm">{error}</p>
            {logs.length > 0 && (
              <pre className="text-[11px] text-gray-600 bg-canvas-card rounded-lg p-3 max-w-lg max-h-40 overflow-auto w-full font-mono">
                {logs.slice(-15).map(l => l.text).join('')}
              </pre>
            )}
          </div>
        )}

        {isRunning && previewUrl && (
          <iframe
            key={iframeKey}
            src={previewUrl}
            className="flex-1 w-full border-0 bg-white"
            title="Server Preview"
            sandbox="allow-scripts allow-forms allow-popups allow-modals"
          />
        )}
      </div>

      {/* Collapsible logs panel */}
      {showLogs && logs.length > 0 && (
        <div className="shrink-0 h-40 border-t border-canvas-border bg-canvas-card flex flex-col">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-canvas-border">
            <span className="text-[10px] font-semibold text-canvas-muted-deep uppercase tracking-wider">Server Logs</span>
            <button onClick={() => setLogs([])} className="text-[10px] text-gray-600 hover:text-canvas-muted">Clear</button>
          </div>
          <div className="flex-1 overflow-auto p-2 font-mono text-[11px] leading-relaxed">
            {logs.map((l, i) => (
              <span
                key={i}
                className={l.stream === 'stderr' ? 'text-primary-400/80' : l.stream === 'system' ? 'text-yellow-400/60' : 'text-canvas-muted'}
              >
                {l.text}
              </span>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}
    </div>
  );
};

// Convert React code to Sandpack format
function reactToSandpackFiles(code: string) {
  return {
    '/App.tsx': code,
    '/index.tsx': `
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
    `.trim(),
  };
}

const SandpackPreviewComponent: React.FC<SandpackPreviewProps> = ({
  code,
  language = 'html',
  currentLanguage,
  viewMode = 'desktop',
  onViewModeChange,
  onCodeChange,
  autoRun,
  onAutoRunStarted,
  onSessionUrl,
}) => {
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Clear the session URL whenever we switch away from a backend language
  useEffect(() => {
    if (!isBackendLanguage(currentLanguage)) {
      onSessionUrl?.(null);
    }
  }, [currentLanguage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Determine template and files based on language
  // NOTE: must be declared before any early returns to obey Rules of Hooks
  const getTemplateConfig = useCallback(() => {
    switch (language) {
      case 'react':
      case 'nextjs':
        return {
          template: 'react-ts' as const,
          files: reactToSandpackFiles(code),
        };
      case 'vanilla':
        return {
          template: 'vanilla' as const,
          files: { '/index.js': code, '/index.html': '<div id="app"></div>' },
        };
      case 'html':
      default:
        return {
          template: 'static' as const,
          files: htmlToSandpackFiles(code),
        };
    }
  }, [code, language]);

  const { template, files } = getTemplateConfig();

  // Script languages — show terminal output, not an iframe
  if (isScriptLanguage(currentLanguage)) {
    return (
      <div className={`flex flex-col h-full ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
        <ScriptPreview
          language={currentLanguage!}
          style={{ height: '100%' }}
          autoRun={autoRun}
          onAutoRunStarted={onAutoRunStarted}
        />
      </div>
    );
  }

  // Backend web-server languages — spawn a server and proxy into an iframe
  if (isBackendLanguage(currentLanguage)) {
    return (
      <div className={`flex flex-col h-full ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
        <BackendPreview
          language={currentLanguage!}
          style={{ height: '100%' }}
          autoRun={autoRun}
          onAutoRunStarted={onAutoRunStarted}
          onSessionUrl={onSessionUrl}
        />
      </div>
    );
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    // Export to CodeSandbox
    const parameters = btoa(JSON.stringify({ files }));
    window.open(`https://codesandbox.io/api/v1/sandboxes/define?parameters=${parameters}`, '_blank');
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = language === 'html' ? 'index.html' : 'App.tsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Empty state
  if (!code) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-canvas-main text-canvas-muted relative overflow-hidden">
        {/* Subtle animated background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full empty-state-pulse" style={{
            background: 'radial-gradient(circle, var(--glow-primary) 0%, transparent 70%)',
          }} />
        </div>

        {/* Orbiting dots around logo */}
        <div className="relative w-24 h-24 mb-8">
          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-500 flex items-center justify-center p-3">
              <img src="/logo.png" alt="Maula AI" className="w-full h-full object-contain brightness-0 invert" />
            </div>
          </div>
          {/* Orbiting dots */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="orbit-dot">
              <div className="w-1.5 h-1.5 rounded-full bg-primary-400/40" />
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center" style={{ animationDelay: '2s' }}>
            <div className="orbit-dot" style={{ animationDelay: '-2s', animationDuration: '8s' }}>
              <div className="w-1 h-1 rounded-full bg-orange-400/30" />
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="orbit-dot" style={{ animationDelay: '-4s', animationDuration: '10s' }}>
              <div className="w-1.5 h-1.5 rounded-full bg-primary-300/20" />
            </div>
          </div>
        </div>

        {/* Brand text */}
        <h2 className="text-xl font-bold text-white/80 mb-2 tracking-tight">
          <span className="text-primary-500" style={{ textShadow: '0 0 20px var(--glow-primary)' }}>One Last</span>
          <span className="text-primary-400 ml-2">AI</span>
        </h2>
        <p className="text-sm text-canvas-muted-deep mb-1">AI App Builder</p>
        <p className="text-xs text-gray-600">Describe what you want to build and watch it come alive</p>

        {/* Animated prompt hint */}
        <div className="mt-8 px-5 py-2.5 rounded-xl border border-primary-500/[0.08] bg-primary-500/[0.02]">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="text-primary-500/40">✦</span>
            <span>Click</span>
            <span className="text-primary-400/60 font-semibold">⬆</span>
            <span>to open the workspace panel</span>
          </div>
        </div>

        {/* Decorative grid dots */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle, var(--glow-primary) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }} />
      </div>
    );
  }

  const deviceStyle = DEVICE_SIZES[viewMode as keyof typeof DEVICE_SIZES] || DEVICE_SIZES.desktop;

  const isHtmlMode = language === 'html' || language === 'vanilla';

  // ── Toolbar removed — PreviewToolbar in App.tsx handles view/device modes ──
  // Keep only a minimal action bar for copy/download/export when in fullscreen
  const toolbar = isFullscreen ? (
    <div className="flex items-center justify-end px-4 py-2 bg-canvas-card border-b border-canvas-border">
      <div className="flex items-center gap-2 text-canvas-muted">
        {isHtmlMode && (
          <button
            onClick={() => {
              const iframe = document.querySelector('iframe[title="Preview"]') as HTMLIFrameElement;
              if (iframe) iframe.srcdoc = prepareHtmlForIframe(code, (p) => useEditorStore.getState().files[p]);
            }}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Refresh preview"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
        {!isHtmlMode && <RefreshButton />}
        <button onClick={handleCopy} className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Copy code">
          {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
        </button>
        <button onClick={handleDownload} className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Download">
          <Download className="w-4 h-4" />
        </button>
        <button onClick={handleExport} className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Open in CodeSandbox">
          <ExternalLink className="w-4 h-4" />
        </button>
        <button onClick={() => setIsFullscreen(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Exit Fullscreen">
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  ) : null;

  // ── Device frame wrapper ──
  const deviceFrame = (preview: React.ReactNode) => (
    <div className="h-full flex items-center justify-center p-4 bg-canvas-card">
      <div
        className={`bg-white rounded-lg overflow-hidden shadow-2xl transition-all duration-300 ${viewMode === 'mobile' ? 'rounded-[2rem] border-8 border-gray-800' : ''
          } ${viewMode === 'tablet' ? 'rounded-2xl border-4 border-gray-700' : ''}`}
        style={{
          width: deviceStyle.width,
          height: deviceStyle.height,
          maxWidth: '100%',
          maxHeight: '100%',
        }}
      >
        {viewMode === 'mobile' && (
          <div className="h-6 bg-gray-800 flex items-center justify-center">
            <div className="w-20 h-4 bg-black rounded-full" />
          </div>
        )}
        {preview}
      </div>
    </div>
  );

  // ── HTML mode: native iframe, no external Sandpack server ──
  if (isHtmlMode) {
    return (
      <div className={`flex flex-col h-full bg-canvas-darker ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
        {toolbar}
        <div className="flex-1 overflow-hidden">
          {deviceFrame(
            <HtmlIframePreview
              code={code}
              style={{ height: viewMode === 'mobile' ? 'calc(100% - 24px)' : '100%' }}
            />
          )}
        </div>
      </div>
    );
  }

  // ── React/JS mode: Sandpack for npm bundling ──
  return (
    <SandpackProvider
      template={template}
      files={files}
      theme={atomDark}
      options={{}}
    >
      <div className={`flex flex-col h-full bg-canvas-darker ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
        {toolbar}
        <div className="flex-1 overflow-hidden">
          {viewMode === 'code' ? (
            <SandpackCodeEditor
              style={{ height: '100%' }}
              showLineNumbers
              showInlineErrors
              wrapContent
            />
          ) : viewMode === 'split' ? (
            <SandpackLayout>
              <SandpackCodeEditor
                style={{ height: '100%', minWidth: '50%' }}
                showLineNumbers
                showInlineErrors
              />
              <SandpackPreviewPane
                style={{ height: '100%' }}
                showOpenInCodeSandbox={false}
                showRefreshButton={false}
              />
            </SandpackLayout>
          ) : (
            deviceFrame(
              <SandpackPreviewPane
                style={{ height: viewMode === 'mobile' ? 'calc(100% - 24px)' : '100%' }}
                showOpenInCodeSandbox={false}
                showRefreshButton={false}
              />
            )
          )}
        </div>
      </div>
    </SandpackProvider>
  );
};

export default SandpackPreviewComponent;
