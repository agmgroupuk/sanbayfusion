import React, { useState, useMemo, useRef, useCallback } from 'react';
import { STUDIO_TEMPLATES, TEMPLATE_CATEGORIES, Template } from '../data/templateData';

interface TemplatesPanelProps {
  isDarkMode: boolean;
  onUseTemplate: (prompt: string) => void;
  className?: string;
}

const TemplatesPanel: React.FC<TemplatesPanelProps> = ({ isDarkMode, onUseTemplate, className }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [detailTab, setDetailTab] = useState<'preview' | 'code'>('preview');
  const [activeFileIdx, setActiveFileIdx] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const filteredTemplates = useMemo(() => {
    return STUDIO_TEMPLATES.filter(t => {
      const matchCat = selectedCategory === 'all' || t.category === selectedCategory;
      const q = searchQuery.toLowerCase();
      const matchSearch = !q || t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.tags.some(tag => tag.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [selectedCategory, searchQuery]);

  const buildPreviewHtml = useCallback((template: Template): string => {
    const htmlFile = template.files.find(f => f.path.endsWith('.html'));
    const cssFile = template.files.find(f => f.path.endsWith('.css'));
    const jsFile = template.files.find(f => f.path.endsWith('.js'));
    if (!htmlFile) return '<p>No preview available</p>';
    let html = htmlFile.content;
    if (cssFile) html = html.replace('</head>', `<style>${cssFile.content}</style></head>`);
    if (jsFile) html = html.replace('</body>', `<script>${jsFile.content}<\/script></body>`);
    // Remove external stylesheet link to bundled CSS since we inline it
    html = html.replace(/<link[^>]*href="\/styles\.css"[^>]*\/?>/g, '');
    html = html.replace(/<script[^>]*src="\/script\.js"[^>]*><\/script>/g, '');
    return html;
  }, []);

  // Detail view
  if (selectedTemplate) {
    const tpl = selectedTemplate;
    return (
      <div className={`h-full flex flex-col ${className || ''}`}>
        {/* Back + title */}
        <div className={`flex items-center gap-3 px-6 py-3 border-b shrink-0 ${isDarkMode ? 'border-canvas-border' : 'border-gray-200'}`}>
          <button
            onClick={() => { setSelectedTemplate(null); setDetailTab('preview'); setActiveFileIdx(0); }}
            className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-white/10 text-canvas-muted' : 'hover:bg-gray-100 text-canvas-muted-deep'}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span className="text-xl">{tpl.icon}</span>
          <div className="flex-1 min-w-0">
            <h3 className={`text-sm font-bold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{tpl.name}</h3>
            <p className={`text-[10px] ${isDarkMode ? 'text-canvas-muted-deep' : 'text-canvas-muted'}`}>{tpl.description}</p>
          </div>
          <div className="flex gap-2">
            {(['preview', 'code'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setDetailTab(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all border ${detailTab === tab
                  ? isDarkMode ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : 'bg-cyan-100 text-cyan-700 border-cyan-400'
                  : isDarkMode ? 'text-canvas-muted-deep border-gray-700 hover:text-canvas-text' : 'text-canvas-muted-deep border-gray-300 hover:text-gray-700'
                }`}
              >
                {tab === 'preview' ? '👁 Preview' : '< > Code'}
              </button>
            ))}
            <button
              onClick={() => { onUseTemplate(tpl.prompt); }}
              className="px-4 py-1.5 text-xs font-bold rounded-lg bg-cyan-500 text-white hover:bg-cyan-400 transition-colors"
            >
              Use Template
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0">
          {detailTab === 'preview' ? (
            <iframe
              ref={iframeRef}
              srcDoc={buildPreviewHtml(tpl)}
              className="w-full h-full border-0"
              sandbox="allow-scripts"
              title={`${tpl.name} preview`}
            />
          ) : (
            <div className="flex h-full">
              {/* File tabs */}
              <div className={`w-48 shrink-0 border-r overflow-y-auto ${isDarkMode ? 'border-canvas-border bg-canvas-card' : 'border-gray-200 bg-gray-50'}`}>
                {tpl.files.map((f, i) => (
                  <button
                    key={f.path}
                    onClick={() => setActiveFileIdx(i)}
                    className={`w-full text-left px-4 py-2.5 text-xs font-mono transition-colors border-b ${isDarkMode ? 'border-canvas-border' : 'border-gray-100'} ${activeFileIdx === i
                      ? isDarkMode ? 'bg-cyan-500/10 text-cyan-400' : 'bg-cyan-50 text-cyan-700'
                      : isDarkMode ? 'text-canvas-muted-deep hover:text-canvas-text hover:bg-white/5' : 'text-canvas-muted-deep hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {f.language === 'html' ? '📄' : f.language === 'css' ? '🎨' : '⚡'} {f.path}
                  </button>
                ))}
              </div>
              {/* Code content */}
              <div className="flex-1 min-w-0 overflow-auto p-4">
                <pre className={`text-xs font-mono leading-relaxed whitespace-pre-wrap break-words ${isDarkMode ? 'text-canvas-text' : 'text-gray-700'}`}>
                  {tpl.files[activeFileIdx]?.content || ''}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div className={`h-full flex flex-col ${className || ''}`}>
      {/* Search + filters */}
      <div className={`px-6 py-4 border-b shrink-0 ${isDarkMode ? 'border-canvas-border' : 'border-gray-200'}`}>
        <div className="flex items-center gap-3 mb-3">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className={`flex-1 px-4 py-2 text-sm rounded-lg border focus:outline-none ${isDarkMode
              ? 'bg-white/5 border-canvas-border text-white placeholder-gray-600 focus:border-cyan-500/50'
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-cyan-500'
            }`}
          />
          <span className={`text-xs ${isDarkMode ? 'text-canvas-muted-deep' : 'text-canvas-muted'}`}>
            {filteredTemplates.length} templates
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TEMPLATE_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 text-[11px] font-medium rounded-full transition-all border ${selectedCategory === cat.id
                ? isDarkMode
                  ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 shadow-[0_0_8px_rgba(34,211,238,0.15)]'
                  : 'bg-cyan-100 text-cyan-700 border-cyan-400'
                : isDarkMode
                  ? 'text-canvas-muted-deep border-gray-800 hover:text-canvas-text hover:border-gray-600 hover:bg-white/5'
                  : 'text-canvas-muted-deep border-gray-200 hover:text-gray-700 hover:border-gray-400 hover:bg-gray-50'
              }`}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Template grid */}
      <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: 'thin' }}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredTemplates.map(tpl => (
            <button
              key={tpl.name}
              onClick={() => { setSelectedTemplate(tpl); setDetailTab('preview'); setActiveFileIdx(0); }}
              className={`text-left rounded-xl overflow-hidden border transition-all group hover:scale-[1.02] ${isDarkMode
                ? 'bg-white/[0.03] border-canvas-border hover:border-cyan-500/30 hover:bg-cyan-500/5'
                : 'bg-white border-gray-200 hover:border-cyan-400 hover:shadow-lg'
              }`}
            >
              {/* Preview thumbnail placeholder */}
              <div className={`h-28 flex items-center justify-center text-4xl ${isDarkMode ? 'bg-white/[0.02]' : 'bg-gray-50'}`}>
                {tpl.icon}
              </div>
              <div className="p-3">
                <h4 className={`text-xs font-bold mb-1 truncate ${isDarkMode ? 'text-canvas-text group-hover:text-cyan-400' : 'text-gray-700 group-hover:text-cyan-600'} transition-colors`}>
                  {tpl.name}
                </h4>
                <p className={`text-[10px] line-clamp-2 leading-relaxed ${isDarkMode ? 'text-gray-600' : 'text-canvas-muted'}`}>
                  {tpl.description}
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {tpl.tags.slice(0, 3).map(tag => (
                    <span key={tag} className={`text-[9px] px-1.5 py-0.5 rounded ${isDarkMode ? 'bg-white/5 text-canvas-muted-deep' : 'bg-gray-100 text-canvas-muted-deep'}`}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>
        {filteredTemplates.length === 0 && (
          <div className={`text-center py-20 ${isDarkMode ? 'text-gray-600' : 'text-canvas-muted'}`}>
            <p className="text-3xl mb-3">🔍</p>
            <p className="text-sm">No templates match your search</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplatesPanel;
