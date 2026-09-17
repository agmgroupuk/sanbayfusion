/**
 * CONTENT & MARKDOWN TOOLS (5 tools)
 * markdown_convert, markdown_validate, markdown_generate,
 * markdown_toc, markdown_format
 * 
 * Uses markdown-it for parsing/rendering
 * All output returned as structured data
 */

import markdownIt from 'markdown-it';

const md = markdownIt({ html: true, linkify: true, typographer: true });

// ── markdown_convert ────────────────────────────────────────────
async function markdownConvert(params) {
    const { action = 'to_html', content, ...opts } = params;
    if (!content) return { success: false, error: 'content is required' };

    try {
        switch (action) {
            case 'to_html': {
                const html = md.render(content);
                const wrapped = opts.fullPage
                    ? `<!DOCTYPE html>\n<html><head><meta charset="utf-8"><title>${opts.title || 'Document'}</title>${opts.css ? `<style>${opts.css}</style>` : ''}</head><body>${html}</body></html>`
                    : html;
                return { success: true, html: wrapped };
            }

            case 'to_text': {
                // Strip markdown syntax to plain text
                let text = content
                    .replace(/#{1,6}\s+/g, '')           // headers
                    .replace(/\*\*(.+?)\*\*/g, '$1')     // bold
                    .replace(/\*(.+?)\*/g, '$1')          // italic
                    .replace(/__(.+?)__/g, '$1')          // bold
                    .replace(/_(.+?)_/g, '$1')            // italic
                    .replace(/~~(.+?)~~/g, '$1')          // strikethrough
                    .replace(/`{3}[\s\S]*?`{3}/g, '')    // code blocks
                    .replace(/`(.+?)`/g, '$1')            // inline code
                    .replace(/\[(.+?)\]\(.+?\)/g, '$1')  // links
                    .replace(/!\[.*?\]\(.+?\)/g, '')      // images
                    .replace(/^[-*+]\s+/gm, '')           // unordered lists
                    .replace(/^\d+\.\s+/gm, '')           // ordered lists
                    .replace(/^>\s+/gm, '')               // blockquotes
                    .replace(/---+/g, '')                 // horizontal rules
                    .replace(/\n{3,}/g, '\n\n')           // collapse whitespace
                    .trim();
                return { success: true, text, charCount: text.length, wordCount: text.split(/\s+/).length };
            }

            case 'from_html': {
                const { JSDOM } = await import('jsdom');
                const dom = new JSDOM(content);
                const doc = dom.window.document;
                let markdown = '';
                function walk(node, depth = 0) {
                    if (node.nodeType === 3) { // text
                        markdown += node.textContent;
                        return;
                    }
                    const tag = node.tagName?.toLowerCase();
                    if (tag === 'h1') markdown += `\n# `;
                    else if (tag === 'h2') markdown += `\n## `;
                    else if (tag === 'h3') markdown += `\n### `;
                    else if (tag === 'h4') markdown += `\n#### `;
                    else if (tag === 'h5') markdown += `\n##### `;
                    else if (tag === 'h6') markdown += `\n###### `;
                    else if (tag === 'p') markdown += '\n\n';
                    else if (tag === 'br') markdown += '\n';
                    else if (tag === 'strong' || tag === 'b') markdown += '**';
                    else if (tag === 'em' || tag === 'i') markdown += '*';
                    else if (tag === 'code') markdown += '`';
                    else if (tag === 'a') markdown += '[';
                    else if (tag === 'img') {
                        markdown += `![${node.alt || ''}](${node.src || ''})`;
                        return;
                    }
                    else if (tag === 'li') markdown += `\n- `;
                    else if (tag === 'blockquote') markdown += '\n> ';
                    else if (tag === 'pre') markdown += '\n```\n';
                    else if (tag === 'hr') { markdown += '\n---\n'; return; }
                    for (const child of node.childNodes) walk(child, depth + 1);
                    if (tag === 'strong' || tag === 'b') markdown += '**';
                    else if (tag === 'em' || tag === 'i') markdown += '*';
                    else if (tag === 'code' && node.parentElement?.tagName?.toLowerCase() !== 'pre') markdown += '`';
                    else if (tag === 'a') markdown += `](${node.href || ''})`;
                    else if (tag === 'pre') markdown += '\n```\n';
                    else if (tag?.match(/^h[1-6]$/)) markdown += '\n';
                }
                walk(doc.body);
                return { success: true, markdown: markdown.trim() };
            }

            case 'to_json': {
                // Extract structured content from markdown
                const tokens = md.parse(content, {});
                const structure = [];
                let currentSection = null;
                for (const token of tokens) {
                    if (token.type === 'heading_open') {
                        const level = parseInt(token.tag.slice(1));
                        currentSection = { type: 'heading', level, content: '' };
                    } else if (token.type === 'heading_close') {
                        if (currentSection) structure.push(currentSection);
                        currentSection = null;
                    } else if (token.type === 'inline' && currentSection) {
                        currentSection.content = token.content;
                    } else if (token.type === 'paragraph_open') {
                        currentSection = { type: 'paragraph', content: '' };
                    } else if (token.type === 'paragraph_close') {
                        if (currentSection) structure.push(currentSection);
                        currentSection = null;
                    } else if (token.type === 'inline' && currentSection) {
                        currentSection.content = token.content;
                    } else if (token.type === 'fence') {
                        structure.push({ type: 'code_block', language: token.info, content: token.content });
                    } else if (token.type === 'bullet_list_open' || token.type === 'ordered_list_open') {
                        currentSection = { type: token.type.includes('bullet') ? 'unordered_list' : 'ordered_list', items: [] };
                    } else if (token.type === 'list_item_open') {
                        // items collected
                    } else if (token.type === 'inline' && currentSection?.items) {
                        currentSection.items.push(token.content);
                    } else if (token.type === 'bullet_list_close' || token.type === 'ordered_list_close') {
                        if (currentSection) structure.push(currentSection);
                        currentSection = null;
                    }
                }
                return { success: true, structure, tokenCount: tokens.length };
            }

            default:
                return { success: false, error: `Unknown markdown_convert action: ${action}` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── markdown_validate ───────────────────────────────────────────
async function markdownValidate(params) {
    const { content, rules = {} } = params;
    if (!content) return { success: false, error: 'content is required' };

    try {
        const issues = [];
        const lines = content.split('\n');
        const maxLineLength = rules.maxLineLength || 120;

        // Check for common issues
        lines.forEach((line, i) => {
            const num = i + 1;
            // Line length
            if (line.length > maxLineLength) {
                issues.push({ line: num, rule: 'line-length', severity: 'warning', message: `Line exceeds ${maxLineLength} characters (${line.length})` });
            }
            // Trailing whitespace
            if (line.match(/\s+$/) && !line.match(/\s{2}$/)) {
                issues.push({ line: num, rule: 'no-trailing-spaces', severity: 'warning', message: 'Trailing whitespace' });
            }
            // Hard tabs
            if (line.includes('\t') && rules.noTabs !== false) {
                issues.push({ line: num, rule: 'no-hard-tabs', severity: 'warning', message: 'Hard tab found' });
            }
            // Multiple blank lines
            if (i > 0 && line === '' && lines[i - 1] === '' && (i < 2 || lines[i - 2] === '')) {
                issues.push({ line: num, rule: 'no-multiple-blanks', severity: 'warning', message: 'Multiple consecutive blank lines' });
            }
            // ATX heading style (no space after #)
            if (line.match(/^#{1,6}[^#\s]/)) {
                issues.push({ line: num, rule: 'heading-space', severity: 'error', message: 'No space after heading marker (#)' });
            }
        });

        // Check for heading hierarchy
        const headings = [];
        lines.forEach((line, i) => {
            const match = line.match(/^(#{1,6})\s+(.+)/);
            if (match) headings.push({ level: match[1].length, text: match[2], line: i + 1 });
        });

        // Check heading increments
        for (let i = 1; i < headings.length; i++) {
            if (headings[i].level > headings[i - 1].level + 1) {
                issues.push({
                    line: headings[i].line,
                    rule: 'heading-increment',
                    severity: 'warning',
                    message: `Heading level jumps from h${headings[i - 1].level} to h${headings[i].level}`,
                });
            }
        }

        // Check for broken links
        const linkRegex = /\[([^\]]*)\]\(([^)]*)\)/g;
        let match;
        lines.forEach((line, i) => {
            while ((match = linkRegex.exec(line)) !== null) {
                const [, text, href] = match;
                if (!href || href === '#') {
                    issues.push({ line: i + 1, rule: 'valid-links', severity: 'error', message: `Empty or invalid link: [${text}]` });
                }
            }
        });

        const errors = issues.filter(i => i.severity === 'error').length;
        const warnings = issues.filter(i => i.severity === 'warning').length;

        return {
            success: true,
            valid: errors === 0,
            errors,
            warnings,
            issues,
            stats: {
                lines: lines.length,
                headings: headings.length,
                words: content.split(/\s+/).filter(w => w).length,
                chars: content.length,
            },
        };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── markdown_generate ───────────────────────────────────────────
async function markdownGenerate(params) {
    const { action = 'readme', ...opts } = params;

    try {
        switch (action) {
            case 'readme': {
                const { name = 'Project', description = '', features = [], installation = '', usage = '', license = 'MIT', badges = [] } = opts;
                let md = '';
                if (badges.length > 0) md += badges.map(b => `![${b.label}](${b.url})`).join(' ') + '\n\n';
                md += `# ${name}\n\n`;
                if (description) md += `${description}\n\n`;
                if (features.length > 0) {
                    md += `## Features\n\n`;
                    features.forEach(f => md += `- ${f}\n`);
                    md += '\n';
                }
                if (installation) md += `## Installation\n\n\`\`\`bash\n${installation}\n\`\`\`\n\n`;
                if (usage) md += `## Usage\n\n${usage}\n\n`;
                md += `## License\n\n${license}\n`;
                return { success: true, markdown: md };
            }

            case 'changelog': {
                const { entries = [] } = opts;
                let md = '# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n';
                for (const entry of entries) {
                    md += `## [${entry.version || 'Unreleased'}] - ${entry.date || new Date().toISOString().split('T')[0]}\n\n`;
                    if (entry.added?.length) { md += '### Added\n\n'; entry.added.forEach(i => md += `- ${i}\n`); md += '\n'; }
                    if (entry.changed?.length) { md += '### Changed\n\n'; entry.changed.forEach(i => md += `- ${i}\n`); md += '\n'; }
                    if (entry.fixed?.length) { md += '### Fixed\n\n'; entry.fixed.forEach(i => md += `- ${i}\n`); md += '\n'; }
                    if (entry.removed?.length) { md += '### Removed\n\n'; entry.removed.forEach(i => md += `- ${i}\n`); md += '\n'; }
                }
                return { success: true, markdown: md };
            }

            case 'api_docs': {
                const { endpoints = [] } = opts;
                let md = '# API Documentation\n\n';
                for (const ep of endpoints) {
                    md += `## ${ep.method || 'GET'} ${ep.path || '/'}\n\n`;
                    if (ep.description) md += `${ep.description}\n\n`;
                    if (ep.params?.length) {
                        md += '### Parameters\n\n| Name | Type | Required | Description |\n|------|------|----------|-------------|\n';
                        ep.params.forEach(p => md += `| ${p.name} | ${p.type || 'string'} | ${p.required ? 'Yes' : 'No'} | ${p.description || ''} |\n`);
                        md += '\n';
                    }
                    if (ep.example) {
                        md += '### Example\n\n```json\n' + JSON.stringify(ep.example, null, 2) + '\n```\n\n';
                    }
                }
                return { success: true, markdown: md };
            }

            case 'table': {
                const { headers = [], rows = [], alignment = [] } = opts;
                if (headers.length === 0) return { success: false, error: 'headers required' };
                let md = '| ' + headers.join(' | ') + ' |\n';
                md += '|' + headers.map((_, i) => {
                    const align = alignment[i] || 'left';
                    if (align === 'center') return ' :---: ';
                    if (align === 'right') return ' ---: ';
                    return ' --- ';
                }).join('|') + '|\n';
                for (const row of rows) {
                    md += '| ' + (Array.isArray(row) ? row : headers.map(h => row[h] || '')).join(' | ') + ' |\n';
                }
                return { success: true, markdown: md };
            }

            default:
                return { success: false, error: `Unknown markdown_generate action: ${action}` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── markdown_toc ────────────────────────────────────────────────
async function markdownToc(params) {
    const { content, maxDepth = 4, ordered = false } = params;
    if (!content) return { success: false, error: 'content is required' };

    try {
        const lines = content.split('\n');
        const headings = [];

        for (const line of lines) {
            const match = line.match(/^(#{1,6})\s+(.+)/);
            if (match) {
                const level = match[1].length;
                if (level <= maxDepth) {
                    const text = match[2].replace(/\*\*|__|`/g, ''); // strip formatting
                    const slug = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
                    headings.push({ level, text, slug });
                }
            }
        }

        const minLevel = Math.min(...headings.map(h => h.level));
        let toc = '## Table of Contents\n\n';
        headings.forEach((h, i) => {
            const indent = '  '.repeat(h.level - minLevel);
            const bullet = ordered ? `${i + 1}.` : '-';
            toc += `${indent}${bullet} [${h.text}](#${h.slug})\n`;
        });

        return { success: true, toc, headings, count: headings.length };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── markdown_format ─────────────────────────────────────────────
async function markdownFormat(params) {
    const { content, options = {} } = params;
    if (!content) return { success: false, error: 'content is required' };

    try {
        const { lineWidth = 80, bulletChar = '-', emphasisChar = '*', codeBlockStyle = 'fenced' } = options;
        let formatted = content;

        // Normalize line endings
        formatted = formatted.replace(/\r\n/g, '\n');

        // Remove trailing whitespace
        formatted = formatted.split('\n').map(line => line.trimEnd()).join('\n');

        // Normalize blank lines (max 2 consecutive)
        formatted = formatted.replace(/\n{3,}/g, '\n\n');

        // Normalize bullet characters
        formatted = formatted.replace(/^[*+]\s/gm, `${bulletChar} `);

        // Normalize emphasis (convert __ to ** or vice versa)
        if (emphasisChar === '*') {
            formatted = formatted.replace(/__(.+?)__/g, '**$1**');
            formatted = formatted.replace(/(?<!\*)_(.+?)_(?!\*)/g, '*$1*');
        }

        // Ensure heading space
        formatted = formatted.replace(/^(#{1,6})([^#\s])/gm, '$1 $2');

        // Ensure single blank line before headings
        formatted = formatted.replace(/([^\n])\n(#{1,6}\s)/g, '$1\n\n$2');

        // Ensure file ends with newline
        if (!formatted.endsWith('\n')) formatted += '\n';

        return {
            success: true,
            formatted,
            changes: formatted !== content ? 'Formatting applied' : 'No changes needed',
            stats: {
                lines: formatted.split('\n').length,
                chars: formatted.length,
            },
        };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

export default {
    markdownConvert,
    markdownValidate,
    markdownGenerate,
    markdownToc,
    markdownFormat,
};
