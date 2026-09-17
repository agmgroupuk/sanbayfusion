/**
 * ============================================================================
 * CONTENT & MARKDOWN TOOLS V2
 * ============================================================================
 * markdown_convert, markdown_validate, markdown_generate,
 * markdown_toc, markdown_format, markdown_merge, markdown_extract,
 * markdown_template, markdown_transform
 * ============================================================================
 */
import fs from 'fs';
import path from 'path';

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

const CONTENT_MARKDOWN_TOOL_DEFINITIONS = [
  {
    name: 'markdown_convert',
    description: 'Convert markdown to/from other formats: HTML, plain text, JSON AST, MDX, or convert HTML/text back to markdown.',
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['md_to_html', 'md_to_text', 'md_to_json', 'html_to_md', 'text_to_md', 'md_to_mdx'],
          description: 'Conversion direction',
        },
        content: { type: 'string', description: 'Content to convert' },
        filePath: { type: 'string', description: 'Read content from file instead' },
        options: {
          type: 'object',
          properties: {
            gfm: { type: 'boolean', description: 'Enable GitHub Flavored Markdown. Default: true' },
            sanitize: { type: 'boolean', description: 'Sanitize HTML output. Default: true' },
            preserveWhitespace: { type: 'boolean', description: 'Preserve whitespace in text conversion' },
          },
        },
      },
      required: ['action'],
    },
  },
  {
    name: 'markdown_validate',
    description: 'Validate markdown: check for broken links, missing images, invalid syntax, heading hierarchy, accessibility issues.',
    input_schema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Markdown content to validate' },
        filePath: { type: 'string', description: 'Read from file' },
        checks: {
          type: 'array',
          items: { type: 'string', enum: ['links', 'images', 'headings', 'syntax', 'accessibility', 'spelling', 'all'] },
          description: 'Checks to run. Default: ["all"]',
        },
      },
      required: [],
    },
  },
  {
    name: 'markdown_generate',
    description: 'Generate markdown content: tables, badges, code blocks, collapsible sections, checklists, Mermaid diagrams, comparison tables.',
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['table', 'badge', 'code_block', 'collapsible', 'checklist', 'mermaid', 'comparison', 'link_list', 'image_gallery', 'footnotes'],
          description: 'Content type to generate',
        },
        data: { type: 'object', description: 'Action-specific data (see below)' },
      },
      required: ['action', 'data'],
    },
  },
  {
    name: 'markdown_toc',
    description: 'Generate or update table of contents from markdown headings. Supports depth limits, numbering, linking.',
    input_schema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Markdown content' },
        filePath: { type: 'string', description: 'Read from file' },
        maxDepth: { type: 'number', description: 'Max heading depth (1-6). Default: 3' },
        numbered: { type: 'boolean', description: 'Use numbered list. Default: false' },
        includeLinks: { type: 'boolean', description: 'Make TOC entries link to headings. Default: true' },
        title: { type: 'string', description: 'TOC title. Default: "Table of Contents"' },
        updateInPlace: { type: 'boolean', description: 'Update existing TOC markers in file. Default: false' },
      },
      required: [],
    },
  },
  {
    name: 'markdown_format',
    description: 'Format and beautify markdown: fix spacing, normalize lists, wrap lines, standardize headings, sort sections.',
    input_schema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Markdown content to format' },
        filePath: { type: 'string', description: 'Read from file' },
        rules: {
          type: 'object',
          properties: {
            lineWidth: { type: 'number', description: 'Wrap lines at width. Default: 80' },
            listStyle: { type: 'string', enum: ['dash', 'asterisk', 'plus'], description: 'List marker. Default: dash' },
            headingStyle: { type: 'string', enum: ['atx', 'setext'], description: 'Heading style. Default: atx' },
            emphasisStyle: { type: 'string', enum: ['underscore', 'asterisk'], description: 'Emphasis. Default: asterisk' },
            trailingNewline: { type: 'boolean', description: 'Ensure trailing newline. Default: true' },
            compactLists: { type: 'boolean', description: 'Remove blank lines between list items. Default: false' },
          },
        },
        outputPath: { type: 'string', description: 'Write formatted output to file' },
      },
      required: [],
    },
  },
  {
    name: 'markdown_merge',
    description: 'Merge multiple markdown files into one. Order by filename, custom order, or heading hierarchy. Deduplicate headings, resolve link conflicts, add separators.',
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['merge_files', 'merge_content', 'append', 'interleave'],
          description: 'Merge strategy'
        },
        files: { type: 'array', items: { type: 'string' }, description: '[merge_files] File paths to merge in order' },
        contents: { type: 'array', items: { type: 'string' }, description: '[merge_content] Markdown strings to merge' },
        target: { type: 'string', description: 'Target file path for merged output' },
        separator: { type: 'string', description: 'Separator between merged sections. Default: "---"' },
        deduplicateHeadings: { type: 'boolean', description: 'Remove duplicate headings. Default: true' },
        adjustHeadingLevels: { type: 'boolean', description: 'Auto-adjust heading levels to avoid conflicts. Default: true' },
        addSourceComments: { type: 'boolean', description: 'Add HTML comments marking source files. Default: false' },
      },
      required: ['action'],
    },
  },
  {
    name: 'markdown_extract',
    description: 'Extract specific elements from markdown: code blocks, links, images, headings, frontmatter, tables, todos, metadata.',
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['code_blocks', 'links', 'images', 'headings', 'frontmatter', 'tables', 'todos', 'metadata', 'sections'],
          description: 'Element type to extract'
        },
        content: { type: 'string', description: 'Markdown content' },
        filePath: { type: 'string', description: 'Read from file' },
        language: { type: 'string', description: '[code_blocks] Filter by language (e.g. "javascript", "python")' },
        headingLevel: { type: 'number', description: '[headings/sections] Filter by level (1-6)' },
        includeContext: { type: 'boolean', description: 'Include surrounding context with extractions. Default: false' },
      },
      required: ['action'],
    },
  },
  {
    name: 'markdown_template',
    description: 'Apply or create reusable markdown templates for README, CHANGELOG, API docs, project setup, release notes, contributing guides.',
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['apply', 'list', 'create', 'preview'],
          description: 'Template action'
        },
        template: {
          type: 'string',
          enum: ['readme', 'changelog', 'api_docs', 'contributing', 'release_notes', 'license', 'issue_template', 'pr_template', 'custom'],
          description: 'Template type to use'
        },
        variables: {
          type: 'object',
          description: 'Template variables (projectName, description, author, version, license, etc.)'
        },
        outputPath: { type: 'string', description: 'Output file path' },
        customTemplate: { type: 'string', description: '[create/custom] Custom template content with {{variable}} placeholders' },
      },
      required: ['action'],
    },
  },
  {
    name: 'markdown_transform',
    description: 'Transform markdown content: rewrite heading levels, renumber lists, add/strip anchors, inject badges, strip HTML, shift sections, slug generation.',
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['shift_headings', 'renumber_lists', 'add_anchors', 'strip_html', 'inject_badges', 'slugify', 'wrap_codeblocks', 'add_line_numbers'],
          description: 'Transform to apply'
        },
        content: { type: 'string', description: 'Markdown content' },
        filePath: { type: 'string', description: 'Read from file' },
        shift: { type: 'number', description: '[shift_headings] Amount to shift heading levels (+/-)' },
        badges: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string' },
              message: { type: 'string' },
              color: { type: 'string' },
              url: { type: 'string' }
            }
          },
          description: '[inject_badges] Badges to inject at top of document'
        },
        outputPath: { type: 'string', description: 'Write result to file' },
      },
      required: ['action'],
    },
  },
];

// ============================================================================
// EXECUTORS
// ============================================================================

async function executeMarkdownConvert(input) {
  const { action, content: rawContent, filePath, options = {} } = input;
  const content = rawContent || (filePath ? fs.readFileSync(filePath, 'utf-8') : '');
  if (!content) return JSON.stringify({ status: 'error', error: 'content or filePath required' });

  const { gfm = true, sanitize = true } = options;

  switch (action) {
    case 'md_to_html': {
      let html = content;
      // Headings
      html = html.replace(/^#{6}\s+(.+)$/gm, '<h6>$1</h6>');
      html = html.replace(/^#{5}\s+(.+)$/gm, '<h5>$1</h5>');
      html = html.replace(/^#{4}\s+(.+)$/gm, '<h4>$1</h4>');
      html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
      html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
      html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');
      // Bold & italic
      html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
      html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
      // Code
      html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');
      html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
      // Links & images
      html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');
      html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
      // Lists
      html = html.replace(/^\s*[-*+]\s+(.+)$/gm, '<li>$1</li>');
      html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>\n$&</ul>\n');
      html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
      // Blockquotes
      html = html.replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>');
      // Horizontal rules
      html = html.replace(/^---+$/gm, '<hr />');
      // Paragraphs (simple)
      html = html.replace(/^(?!<[a-z])((?!^\s*$).+)$/gm, '<p>$1</p>');
      // GFM: strikethrough, task lists
      if (gfm) {
        html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
        html = html.replace(/<li>\[x\]\s*/gi, '<li class="task-done">☑ ');
        html = html.replace(/<li>\[ \]\s*/gi, '<li class="task">☐ ');
      }
      if (sanitize) {
        html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
        html = html.replace(/on\w+\s*=/gi, '');
      }
      return JSON.stringify({ status: 'success', html, inputLength: content.length, outputLength: html.length });
    }
    case 'md_to_text': {
      let text = content;
      text = text.replace(/^#+\s+/gm, '');
      text = text.replace(/\*\*(.+?)\*\*/g, '$1');
      text = text.replace(/\*(.+?)\*/g, '$1');
      text = text.replace(/`{1,3}[^`]*`{1,3}/g, m => m.replace(/`/g, ''));
      text = text.replace(/```[\s\S]*?```/g, m => m.replace(/```\w*\n?/g, ''));
      text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '[$1]');
      text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
      text = text.replace(/^[-*+]\s+/gm, '• ');
      text = text.replace(/^>\s+/gm, '');
      text = text.replace(/^---+$/gm, '');
      text = text.replace(/~~(.+?)~~/g, '$1');
      text = text.replace(/\n{3,}/g, '\n\n');
      return JSON.stringify({ status: 'success', text: text.trim(), inputLength: content.length });
    }
    case 'md_to_json': {
      const blocks = [];
      const lines = content.split('\n');
      let codeBlock = null;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('```')) {
          if (codeBlock) { codeBlock.content = codeBlock.lines.join('\n'); delete codeBlock.lines; blocks.push(codeBlock); codeBlock = null; }
          else { codeBlock = { type: 'code', language: line.slice(3).trim(), lines: [], line: i + 1 }; }
          continue;
        }
        if (codeBlock) { codeBlock.lines.push(line); continue; }
        const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
        if (headingMatch) { blocks.push({ type: 'heading', level: headingMatch[1].length, content: headingMatch[2], line: i + 1 }); continue; }
        if (line.match(/^[-*+]\s+/)) { blocks.push({ type: 'list_item', content: line.replace(/^[-*+]\s+/, ''), ordered: false, line: i + 1 }); continue; }
        if (line.match(/^\d+\.\s+/)) { blocks.push({ type: 'list_item', content: line.replace(/^\d+\.\s+/, ''), ordered: true, line: i + 1 }); continue; }
        if (line.match(/^>\s+/)) { blocks.push({ type: 'blockquote', content: line.replace(/^>\s+/, ''), line: i + 1 }); continue; }
        if (line.match(/^---+$/)) { blocks.push({ type: 'hr', line: i + 1 }); continue; }
        if (line.trim()) { blocks.push({ type: 'paragraph', content: line.trim(), line: i + 1 }); }
      }
      return JSON.stringify({ status: 'success', ast: blocks, blockCount: blocks.length });
    }
    case 'html_to_md': {
      let md = content;
      md = md.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, l, t) => '#'.repeat(parseInt(l)) + ' ' + t.trim());
      md = md.replace(/<strong>([\s\S]*?)<\/strong>/gi, '**$1**');
      md = md.replace(/<b>([\s\S]*?)<\/b>/gi, '**$1**');
      md = md.replace(/<em>([\s\S]*?)<\/em>/gi, '*$1*');
      md = md.replace(/<i>([\s\S]*?)<\/i>/gi, '*$1*');
      md = md.replace(/<code>([\s\S]*?)<\/code>/gi, '`$1`');
      md = md.replace(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '```\n$1\n```');
      md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');
      md = md.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)');
      md = md.replace(/<li>([\s\S]*?)<\/li>/gi, '- $1');
      md = md.replace(/<\/?(ul|ol|div|span|p|br|hr|table|thead|tbody|tr|td|th|blockquote|section|article|header|footer|nav|main)[^>]*>/gi, '\n');
      md = md.replace(/<[^>]+>/g, '');
      md = md.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
      md = md.replace(/\n{3,}/g, '\n\n').trim();
      return JSON.stringify({ status: 'success', markdown: md });
    }
    case 'text_to_md': {
      let md = content;
      // Detect and convert common patterns
      md = md.replace(/^(\S.+)\n={3,}$/gm, '# $1');  // setext h1
      md = md.replace(/^(\S.+)\n-{3,}$/gm, '## $1');  // setext h2
      const lines = md.split('\n');
      const result = lines.map(line => {
        if (line.match(/^\s*[-•]\s/)) return line.replace(/^\s*[-•]\s/, '- ');
        if (line.match(/^\s*\d+[.)]\s/)) return line;
        return line;
      });
      return JSON.stringify({ status: 'success', markdown: result.join('\n') });
    }
    case 'md_to_mdx': {
      let mdx = content;
      mdx = `import { Component } from 'react';\n\nexport const meta = {\n  title: 'Document',\n  date: '${new Date().toISOString().split('T')[0]}',\n};\n\n${mdx}`;
      return JSON.stringify({ status: 'success', mdx });
    }
    default:
      return JSON.stringify({ status: 'error', error: `Unknown convert action: ${action}` });
  }
}

async function executeMarkdownValidate(input) {
  const { content: rawContent, filePath, checks = ['all'] } = input;
  const content = rawContent || (filePath ? fs.readFileSync(filePath, 'utf-8') : '');
  if (!content) return JSON.stringify({ status: 'error', error: 'content or filePath required' });

  const runAll = checks.includes('all');
  const issues = [];
  const lines = content.split('\n');

  // Heading checks
  if (runAll || checks.includes('headings')) {
    let lastLevel = 0;
    let h1Count = 0;
    lines.forEach((line, i) => {
      const match = line.match(/^(#{1,6})\s/);
      if (match) {
        const level = match[1].length;
        if (level === 1) h1Count++;
        if (h1Count > 1) issues.push({ line: i + 1, type: 'heading', severity: 'warning', message: 'Multiple H1 headings found' });
        if (level > lastLevel + 1 && lastLevel > 0) issues.push({ line: i + 1, type: 'heading', severity: 'warning', message: `Heading level jumped from H${lastLevel} to H${level}` });
        lastLevel = level;
        if (!line.match(/^#{1,6}\s+\S/)) issues.push({ line: i + 1, type: 'heading', severity: 'error', message: 'Missing space after heading marker or empty heading' });
      }
    });
  }

  // Link checks
  if (runAll || checks.includes('links')) {
    const linkRegex = /\[([^\]]*)\]\(([^)]*)\)/g;
    let match;
    while ((match = linkRegex.exec(content)) !== null) {
      const lineNum = content.slice(0, match.index).split('\n').length;
      const url = match[2];
      if (!url) issues.push({ line: lineNum, type: 'link', severity: 'error', message: `Empty link URL for "${match[1]}"` });
      else if (!url.startsWith('http') && !url.startsWith('#') && !url.startsWith('/') && !url.startsWith('mailto:')) {
        if (filePath) {
          const resolved = path.resolve(path.dirname(filePath), url);
          if (!fs.existsSync(resolved)) issues.push({ line: lineNum, type: 'link', severity: 'error', message: `Broken relative link: ${url}` });
        }
      }
    }
  }

  // Image checks
  if (runAll || checks.includes('images')) {
    const imgRegex = /!\[([^\]]*)\]\(([^)]*)\)/g;
    let match;
    while ((match = imgRegex.exec(content)) !== null) {
      const lineNum = content.slice(0, match.index).split('\n').length;
      if (!match[1]) issues.push({ line: lineNum, type: 'image', severity: 'warning', message: `Image missing alt text: ${match[2]}` });
      if (!match[2]) issues.push({ line: lineNum, type: 'image', severity: 'error', message: 'Image missing URL' });
    }
  }

  // Syntax checks
  if (runAll || checks.includes('syntax')) {
    let codeBlockOpen = false;
    lines.forEach((line, i) => {
      if (line.startsWith('```')) codeBlockOpen = !codeBlockOpen;
      if (!codeBlockOpen) {
        // Unclosed bold/italic
        const boldCount = (line.match(/\*\*/g) || []).length;
        if (boldCount % 2 !== 0) issues.push({ line: i + 1, type: 'syntax', severity: 'warning', message: 'Unclosed bold marker (**)' });
        // Check for trailing spaces (not line break)
        if (line.endsWith(' ') && !line.endsWith('  ')) issues.push({ line: i + 1, type: 'syntax', severity: 'info', message: 'Trailing single space (use two for line break)' });
      }
    });
    if (codeBlockOpen) issues.push({ type: 'syntax', severity: 'error', message: 'Unclosed code block (```)' });
  }

  // Accessibility checks
  if (runAll || checks.includes('accessibility')) {
    const imgRegex = /!\[([^\]]*)\]\(/g;
    let match;
    while ((match = imgRegex.exec(content)) !== null) {
      if (!match[1] || match[1].length < 3) {
        const lineNum = content.slice(0, match.index).split('\n').length;
        issues.push({ line: lineNum, type: 'accessibility', severity: 'warning', message: 'Image alt text is missing or too short (< 3 chars)' });
      }
    }
    if (!content.match(/^#\s+/m)) issues.push({ type: 'accessibility', severity: 'info', message: 'Document has no H1 heading' });
  }

  const byType = {};
  issues.forEach(i => { byType[i.type] = (byType[i.type] || 0) + 1; });
  const bySeverity = {};
  issues.forEach(i => { bySeverity[i.severity] = (bySeverity[i.severity] || 0) + 1; });

  return JSON.stringify({
    status: 'success',
    valid: issues.filter(i => i.severity === 'error').length === 0,
    totalIssues: issues.length,
    byType, bySeverity,
    issues: issues.slice(0, 50),
    wordCount: content.split(/\s+/).filter(Boolean).length,
    lineCount: lines.length,
  });
}

async function executeMarkdownGenerate(input) {
  const { action, data } = input;

  switch (action) {
    case 'table': {
      const { headers = [], rows = [], alignment = [] } = data;
      if (!headers.length) return JSON.stringify({ status: 'error', error: 'headers required' });
      const widths = headers.map((h, i) => Math.max(h.length, ...rows.map(r => String(r[i] || '').length)));
      const headerRow = '| ' + headers.map((h, i) => h.padEnd(widths[i])).join(' | ') + ' |';
      const sepRow = '| ' + widths.map((w, i) => {
        const a = alignment[i] || 'left';
        if (a === 'center') return ':' + '-'.repeat(w - 2) + ':';
        if (a === 'right') return '-'.repeat(w - 1) + ':';
        return '-'.repeat(w);
      }).join(' | ') + ' |';
      const dataRows = rows.map(r => '| ' + headers.map((_, i) => String(r[i] || '').padEnd(widths[i])).join(' | ') + ' |');
      const table = [headerRow, sepRow, ...dataRows].join('\n');
      return JSON.stringify({ status: 'success', markdown: table });
    }
    case 'badge': {
      const { label, value, color = 'blue', style = 'flat', url } = data;
      const badge = `![${label}](https://img.shields.io/badge/${encodeURIComponent(label)}-${encodeURIComponent(value)}-${color}?style=${style})`;
      const md = url ? `[${badge}](${url})` : badge;
      return JSON.stringify({ status: 'success', markdown: md });
    }
    case 'code_block': {
      const { language = '', code, title } = data;
      let md = '';
      if (title) md += `**${title}**\n\n`;
      md += `\`\`\`${language}\n${code}\n\`\`\``;
      return JSON.stringify({ status: 'success', markdown: md });
    }
    case 'collapsible': {
      const { summary, content } = data;
      const md = `<details>\n<summary>${summary}</summary>\n\n${content}\n\n</details>`;
      return JSON.stringify({ status: 'success', markdown: md });
    }
    case 'checklist': {
      const { items = [] } = data;
      const md = items.map(i => {
        const checked = i.checked || i.done ? 'x' : ' ';
        return `- [${checked}] ${i.text || i}`;
      }).join('\n');
      return JSON.stringify({ status: 'success', markdown: md });
    }
    case 'mermaid': {
      const { type = 'flowchart', direction = 'TD', nodes = [], edges = [] } = data;
      let md = `\`\`\`mermaid\n${type} ${direction}\n`;
      nodes.forEach(n => {
        if (typeof n === 'string') md += `  ${n}\n`;
        else md += `  ${n.id}[${n.label}]\n`;
      });
      edges.forEach(e => {
        if (typeof e === 'string') md += `  ${e}\n`;
        else md += `  ${e.from} --> ${e.label ? `|${e.label}|` : ''} ${e.to}\n`;
      });
      md += '```';
      return JSON.stringify({ status: 'success', markdown: md });
    }
    case 'comparison': {
      const { items = [], features = [] } = data;
      const headers = ['Feature', ...items.map(i => i.name || i)];
      const rows = features.map(f => {
        return [f.name || f, ...items.map(item => {
          const val = (item.features || {})[f.name || f];
          if (val === true) return '✅';
          if (val === false) return '❌';
          return val || '-';
        })];
      });
      const widths = headers.map((h, i) => Math.max(h.length, ...rows.map(r => String(r[i] || '').length)));
      const headerRow = '| ' + headers.map((h, i) => h.padEnd(widths[i])).join(' | ') + ' |';
      const sep = '| ' + widths.map(w => '-'.repeat(w)).join(' | ') + ' |';
      const dataRows = rows.map(r => '| ' + r.map((c, i) => String(c).padEnd(widths[i])).join(' | ') + ' |');
      return JSON.stringify({ status: 'success', markdown: [headerRow, sep, ...dataRows].join('\n') });
    }
    case 'link_list': {
      const { links = [], numbered = false } = data;
      const md = links.map((l, i) => {
        const prefix = numbered ? `${i + 1}.` : '-';
        const desc = l.description ? ` - ${l.description}` : '';
        return `${prefix} [${l.text || l.url}](${l.url})${desc}`;
      }).join('\n');
      return JSON.stringify({ status: 'success', markdown: md });
    }
    case 'image_gallery': {
      const { images = [], columns = 3 } = data;
      const rows = [];
      for (let i = 0; i < images.length; i += columns) {
        const chunk = images.slice(i, i + columns);
        const headerRow = '| ' + chunk.map(img => img.caption || img.alt || '').join(' | ') + ' |';
        const sep = '| ' + chunk.map(() => '---').join(' | ') + ' |';
        const imgRow = '| ' + chunk.map(img => `![${img.alt || ''}](${img.url})`).join(' | ') + ' |';
        rows.push(imgRow, sep);
      }
      return JSON.stringify({ status: 'success', markdown: rows.join('\n') });
    }
    case 'footnotes': {
      const { notes = [] } = data;
      const refs = notes.map((n, i) => `[^${i + 1}]`).join(' ');
      const defs = notes.map((n, i) => `[^${i + 1}]: ${n.text || n}`).join('\n');
      return JSON.stringify({ status: 'success', markdown: `${refs}\n\n${defs}` });
    }
    default:
      return JSON.stringify({ status: 'error', error: `Unknown generate action: ${action}` });
  }
}

async function executeMarkdownToc(input) {
  const { content: rawContent, filePath, maxDepth = 3, numbered = false, includeLinks = true, title = 'Table of Contents', updateInPlace = false } = input;
  const content = rawContent || (filePath ? fs.readFileSync(filePath, 'utf-8') : '');
  if (!content) return JSON.stringify({ status: 'error', error: 'content or filePath required' });

  const headings = [];
  const lines = content.split('\n');
  let inCodeBlock = false;

  lines.forEach((line, i) => {
    if (line.startsWith('```')) inCodeBlock = !inCodeBlock;
    if (inCodeBlock) return;
    const match = line.match(/^(#{1,6})\s+(.+)/);
    if (match && match[1].length <= maxDepth) {
      const text = match[2].replace(/\*\*/g, '').replace(/\*/g, '').replace(/`/g, '');
      const slug = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
      headings.push({ level: match[1].length, text, slug, line: i + 1 });
    }
  });

  const counters = Array(7).fill(0);
  const tocLines = headings.map(h => {
    const indent = '  '.repeat(h.level - 1);
    let prefix;
    if (numbered) {
      counters[h.level]++;
      for (let i = h.level + 1; i <= 6; i++) counters[i] = 0;
      prefix = `${counters[h.level]}.`;
    } else {
      prefix = '-';
    }
    const entry = includeLinks ? `[${h.text}](#${h.slug})` : h.text;
    return `${indent}${prefix} ${entry}`;
  });

  const toc = `## ${title}\n\n${tocLines.join('\n')}`;

  if (updateInPlace && filePath) {
    const tocMarkerStart = '<!-- TOC -->';
    const tocMarkerEnd = '<!-- /TOC -->';
    let updated;
    if (content.includes(tocMarkerStart) && content.includes(tocMarkerEnd)) {
      updated = content.replace(
        new RegExp(`${tocMarkerStart}[\\s\\S]*?${tocMarkerEnd}`),
        `${tocMarkerStart}\n${toc}\n${tocMarkerEnd}`
      );
    } else {
      updated = `${tocMarkerStart}\n${toc}\n${tocMarkerEnd}\n\n${content}`;
    }
    fs.writeFileSync(filePath, updated, 'utf-8');
    return JSON.stringify({ status: 'success', toc, headingCount: headings.length, fileUpdated: true });
  }

  return JSON.stringify({ status: 'success', toc, headingCount: headings.length, headings });
}

async function executeMarkdownFormat(input) {
  const { content: rawContent, filePath, rules = {}, outputPath } = input;
  let content = rawContent || (filePath ? fs.readFileSync(filePath, 'utf-8') : '');
  if (!content) return JSON.stringify({ status: 'error', error: 'content or filePath required' });

  const {
    listStyle = 'dash',
    headingStyle = 'atx',
    trailingNewline = true,
    compactLists = false,
  } = rules;

  const listMarker = listStyle === 'asterisk' ? '*' : listStyle === 'plus' ? '+' : '-';

  // Normalize list markers
  content = content.replace(/^(\s*)[-*+]\s+/gm, `$1${listMarker} `);

  // Normalize headings to ATX
  if (headingStyle === 'atx') {
    content = content.replace(/^(.+)\n={3,}$/gm, '# $1');
    content = content.replace(/^(.+)\n-{3,}$/gm, '## $1');
  }

  // Ensure blank line before headings
  content = content.replace(/([^\n])\n(#{1,6}\s)/g, '$1\n\n$2');

  // Ensure blank line after headings
  content = content.replace(/(^#{1,6}\s.+)\n(?!\n)/gm, '$1\n');

  // Remove extra blank lines (3+ → 2)
  content = content.replace(/\n{3,}/g, '\n\n');

  // Compact lists if requested
  if (compactLists) {
    content = content.replace(/^([-*+]\s.+)\n\n(?=[-*+]\s)/gm, '$1\n');
    content = content.replace(/^(\d+\.\s.+)\n\n(?=\d+\.\s)/gm, '$1\n');
  }

  // Trailing newline
  if (trailingNewline && !content.endsWith('\n')) content += '\n';

  // Remove trailing whitespace from lines
  content = content.replace(/[^\S\n]+$/gm, '');

  if (outputPath) {
    fs.writeFileSync(outputPath, content, 'utf-8');
    return JSON.stringify({ status: 'success', file: outputPath, formatted: true });
  }
  if (filePath && !rawContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    return JSON.stringify({ status: 'success', file: filePath, formatted: true, lineCount: content.split('\n').length });
  }

  return JSON.stringify({ status: 'success', content, formatted: true, lineCount: content.split('\n').length });
}

// ============================================================================
// MARKDOWN MERGE EXECUTOR
// ============================================================================
async function executeMarkdownMerge(input) {
  const { action, files = [], contents = [], target, separator = '---', deduplicateHeadings = true, adjustHeadingLevels = true, addSourceComments = false } = input;

  function readContent(filePath) {
    const abs = path.resolve(filePath);
    if (!fs.existsSync(abs)) return { error: `File not found: ${abs}`, content: '' };
    return { content: fs.readFileSync(abs, 'utf-8'), source: abs };
  }

  switch (action) {
    case 'merge_files': {
      if (files.length === 0) return JSON.stringify({ status: 'error', error: 'files array required' });
      const sections = files.map(f => {
        const { content, error, source } = readContent(f);
        if (error) return { content: `<!-- Error: ${error} -->`, source: f };
        return { content, source: source || f };
      });
      return mergeSections(sections, { separator, deduplicateHeadings, adjustHeadingLevels, addSourceComments, target });
    }

    case 'merge_content': {
      if (contents.length === 0) return JSON.stringify({ status: 'error', error: 'contents array required' });
      const sections = contents.map((c, i) => ({ content: c, source: `section_${i + 1}` }));
      return mergeSections(sections, { separator, deduplicateHeadings, adjustHeadingLevels, addSourceComments, target });
    }

    case 'append': {
      if (files.length < 2) return JSON.stringify({ status: 'error', error: 'Need at least 2 files (base + append)' });
      const base = readContent(files[0]);
      const appends = files.slice(1).map(f => readContent(f));
      let merged = base.content;
      for (const a of appends) {
        merged += `\n\n${separator}\n\n${a.content}`;
      }
      if (target) fs.writeFileSync(path.resolve(target), merged, 'utf-8');
      return JSON.stringify({ status: 'success', mergedLength: merged.length, lineCount: merged.split('\n').length, outputPath: target || null });
    }

    case 'interleave': {
      if (files.length < 2) return JSON.stringify({ status: 'error', error: 'Need at least 2 files' });
      const allSections = files.map(f => {
        const { content } = readContent(f);
        return extractSectionsByHeading(content);
      });
      // Interleave by heading match
      const headingMap = new Map();
      allSections.forEach((sections, fileIdx) => {
        sections.forEach(s => {
          const key = s.heading.toLowerCase().trim();
          if (!headingMap.has(key)) headingMap.set(key, []);
          headingMap.get(key).push({ ...s, fileIdx });
        });
      });
      let merged = '';
      for (const [, entries] of headingMap) {
        entries.forEach(e => { merged += e.content + '\n\n'; });
      }
      if (target) fs.writeFileSync(path.resolve(target), merged.trim(), 'utf-8');
      return JSON.stringify({ status: 'success', mergedHeadings: headingMap.size, outputPath: target || null });
    }

    default:
      return JSON.stringify({ status: 'error', error: `Unknown merge action: ${action}` });
  }
}

function mergeSections(sections, opts) {
  const seenHeadings = new Set();
  let merged = '';

  sections.forEach((section, i) => {
    let content = section.content;

    if (opts.adjustHeadingLevels && i > 0) {
      // Shift headings in non-first sections to avoid conflicts
      content = content.replace(/^(#{1,6})\s/gm, (match, hashes) => {
        const level = Math.min(hashes.length + 1, 6);
        return '#'.repeat(level) + ' ';
      });
    }

    if (opts.deduplicateHeadings) {
      const lines = content.split('\n');
      content = lines.filter(line => {
        const headingMatch = line.match(/^#{1,6}\s+(.+)/);
        if (!headingMatch) return true;
        const heading = headingMatch[1].toLowerCase().trim();
        if (seenHeadings.has(heading)) return false;
        seenHeadings.add(heading);
        return true;
      }).join('\n');
    }

    if (opts.addSourceComments) {
      content = `<!-- Source: ${section.source} -->\n${content}`;
    }

    merged += (i > 0 ? `\n\n${opts.separator}\n\n` : '') + content;
  });

  if (opts.target) fs.writeFileSync(path.resolve(opts.target), merged, 'utf-8');
  return JSON.stringify({
    status: 'success',
    mergedSections: sections.length,
    totalLength: merged.length,
    lineCount: merged.split('\n').length,
    outputPath: opts.target || null,
    content: opts.target ? undefined : merged.substring(0, 5000)
  });
}

function extractSectionsByHeading(content) {
  const lines = content.split('\n');
  const sections = [];
  let current = { heading: 'preamble', content: '' };

  lines.forEach(line => {
    const match = line.match(/^(#{1,6})\s+(.+)/);
    if (match) {
      if (current.content.trim()) sections.push(current);
      current = { heading: match[2], level: match[1].length, content: line + '\n' };
    } else {
      current.content += line + '\n';
    }
  });
  if (current.content.trim()) sections.push(current);
  return sections;
}

// ============================================================================
// MARKDOWN EXTRACT EXECUTOR
// ============================================================================
async function executeMarkdownExtract(input) {
  const { action, content: rawContent, filePath, language, headingLevel, includeContext = false } = input;
  const content = rawContent || (filePath ? fs.readFileSync(path.resolve(filePath), 'utf-8') : '');
  if (!content) return JSON.stringify({ status: 'error', error: 'content or filePath required' });

  const lines = content.split('\n');

  switch (action) {
    case 'code_blocks': {
      const blocks = [];
      let inBlock = false, blockLang = '', blockContent = '', startLine = 0;
      lines.forEach((line, i) => {
        if (line.startsWith('```') && !inBlock) {
          inBlock = true;
          blockLang = line.slice(3).trim();
          blockContent = '';
          startLine = i + 1;
        } else if (line.startsWith('```') && inBlock) {
          if (!language || blockLang.toLowerCase() === language.toLowerCase()) {
            blocks.push({ language: blockLang || 'text', content: blockContent.trimEnd(), startLine, endLine: i + 1 });
          }
          inBlock = false;
        } else if (inBlock) {
          blockContent += line + '\n';
        }
      });
      return JSON.stringify({ status: 'success', count: blocks.length, blocks });
    }

    case 'links': {
      const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
      const links = [];
      lines.forEach((line, i) => {
        let match;
        while ((match = linkRegex.exec(line)) !== null) {
          links.push({ text: match[1], url: match[2], line: i + 1 });
        }
      });
      return JSON.stringify({ status: 'success', count: links.length, links });
    }

    case 'images': {
      const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
      const images = [];
      lines.forEach((line, i) => {
        let match;
        while ((match = imgRegex.exec(line)) !== null) {
          images.push({ alt: match[1], src: match[2], line: i + 1 });
        }
      });
      return JSON.stringify({ status: 'success', count: images.length, images });
    }

    case 'headings': {
      const headings = [];
      let inCode = false;
      lines.forEach((line, i) => {
        if (line.startsWith('```')) inCode = !inCode;
        if (inCode) return;
        const match = line.match(/^(#{1,6})\s+(.+)/);
        if (match) {
          const level = match[1].length;
          if (!headingLevel || level === headingLevel) {
            headings.push({ level, text: match[2], line: i + 1 });
          }
        }
      });
      return JSON.stringify({ status: 'success', count: headings.length, headings });
    }

    case 'frontmatter': {
      if (!content.startsWith('---')) return JSON.stringify({ status: 'success', hasFrontmatter: false });
      const endIdx = content.indexOf('---', 3);
      if (endIdx === -1) return JSON.stringify({ status: 'success', hasFrontmatter: false });
      const frontmatter = content.substring(3, endIdx).trim();
      const fields = {};
      frontmatter.split('\n').forEach(line => {
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0) {
          fields[line.substring(0, colonIdx).trim()] = line.substring(colonIdx + 1).trim();
        }
      });
      return JSON.stringify({ status: 'success', hasFrontmatter: true, raw: frontmatter, fields });
    }

    case 'tables': {
      const tables = [];
      let tableLines = [], inTable = false;
      lines.forEach((line, i) => {
        if (line.includes('|') && line.trim().startsWith('|')) {
          if (!inTable) inTable = true;
          tableLines.push({ text: line, line: i + 1 });
        } else {
          if (inTable && tableLines.length > 0) {
            tables.push({ startLine: tableLines[0].line, rows: tableLines.length, content: tableLines.map(t => t.text).join('\n') });
            tableLines = [];
          }
          inTable = false;
        }
      });
      if (tableLines.length > 0) {
        tables.push({ startLine: tableLines[0].line, rows: tableLines.length, content: tableLines.map(t => t.text).join('\n') });
      }
      return JSON.stringify({ status: 'success', count: tables.length, tables });
    }

    case 'todos': {
      const todos = [];
      lines.forEach((line, i) => {
        const match = line.match(/^(\s*)-\s+\[([ xX])\]\s+(.+)/);
        if (match) {
          todos.push({ text: match[3], completed: match[2] !== ' ', line: i + 1, indent: match[1].length });
        }
      });
      const completed = todos.filter(t => t.completed).length;
      return JSON.stringify({ status: 'success', count: todos.length, completed, pending: todos.length - completed, todos });
    }

    case 'metadata': {
      const headingCount = (content.match(/^#{1,6}\s/gm) || []).length;
      const codeBlockCount = (content.match(/^```/gm) || []).length / 2;
      const linkCount = (content.match(/\[([^\]]*)\]\(([^)]+)\)/g) || []).length;
      const imageCount = (content.match(/!\[([^\]]*)\]\(([^)]+)\)/g) || []).length;
      const wordCount = content.replace(/```[\s\S]*?```/g, '').split(/\s+/).filter(w => w.length > 0).length;
      return JSON.stringify({
        status: 'success',
        lineCount: lines.length, wordCount, charCount: content.length,
        headings: headingCount, codeBlocks: Math.floor(codeBlockCount),
        links: linkCount, images: imageCount,
        hasFrontmatter: content.startsWith('---'),
        readingTimeMinutes: Math.ceil(wordCount / 200)
      });
    }

    case 'sections': {
      const sections = extractSectionsByHeading(content);
      const filtered = headingLevel ? sections.filter(s => s.level === headingLevel) : sections;
      return JSON.stringify({ status: 'success', count: filtered.length, sections: filtered.map(s => ({ heading: s.heading, level: s.level || 0, lineCount: s.content.split('\n').length })) });
    }

    default:
      return JSON.stringify({ status: 'error', error: `Unknown extract action: ${action}` });
  }
}

// ============================================================================
// MARKDOWN TEMPLATE EXECUTOR
// ============================================================================
const TEMPLATES = {
  readme: `# {{projectName}}

{{badges}}

> {{description}}

## Features

{{features}}

## Installation

\`\`\`bash
npm install {{packageName}}
\`\`\`

## Usage

\`\`\`javascript
import { {{mainExport}} } from '{{packageName}}';
\`\`\`

## API

{{apiDocs}}

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## License

{{license}} - see [LICENSE](LICENSE)
`,

  changelog: `# Changelog

All notable changes to this project will be documented in this file.

## [{{version}}] - {{date}}

### Added
- {{addedItems}}

### Changed
- {{changedItems}}

### Fixed
- {{fixedItems}}

### Removed
- {{removedItems}}
`,

  api_docs: `# {{apiName}} API Documentation

## Base URL

\`{{baseUrl}}\`

## Authentication

{{authMethod}}

## Endpoints

### {{method}} {{endpoint}}

{{endpointDescription}}

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
{{parameters}}

**Response:**

\`\`\`json
{{responseExample}}
\`\`\`
`,

  contributing: `# Contributing to {{projectName}}

Thank you for your interest in contributing!

## Getting Started

1. Fork the repository
2. Clone your fork: \`git clone {{repoUrl}}\`
3. Create a branch: \`git checkout -b feature/your-feature\`
4. Make changes and commit: \`git commit -m "Add feature"\`
5. Push and open a PR

## Development Setup

\`\`\`bash
{{setupCommands}}
\`\`\`

## Code Style

{{codeStyle}}

## Reporting Bugs

Please use the [issue tracker]({{issuesUrl}}) with the bug template.

## License

By contributing, you agree that your contributions will be licensed under the {{license}} license.
`,

  release_notes: `# {{projectName}} v{{version}} Release Notes

**Release Date:** {{date}}

## Highlights

{{highlights}}

## What's New

{{newFeatures}}

## Bug Fixes

{{bugFixes}}

## Breaking Changes

{{breakingChanges}}

## Upgrade Guide

{{upgradeGuide}}
`,

  license: `MIT License

Copyright (c) {{year}} {{author}}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.
`,

  issue_template: `---
name: Bug Report
about: Report a bug in {{projectName}}
labels: bug
---

## Description

A clear description of the bug.

## Steps to Reproduce

1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior

What you expected to happen.

## Actual Behavior

What actually happened.

## Environment

- OS: 
- Version: {{version}}
- Browser: 
`,

  pr_template: `## Description

Brief description of changes.

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

Describe tests you ran.

## Checklist

- [ ] Code follows project style
- [ ] Self-reviewed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] Tests pass locally
`
};

async function executeMarkdownTemplate(input) {
  const { action, template = 'readme', variables = {}, outputPath, customTemplate } = input;

  switch (action) {
    case 'list': {
      const available = Object.keys(TEMPLATES).map(name => ({
        name,
        description: `${name.replace(/_/g, ' ')} template`,
        variables: (TEMPLATES[name].match(/\{\{(\w+)\}\}/g) || []).map(v => v.replace(/\{\{|\}\}/g, ''))
      }));
      return JSON.stringify({ status: 'success', templates: available });
    }

    case 'apply':
    case 'preview': {
      let tmpl = template === 'custom' ? (customTemplate || '') : (TEMPLATES[template] || '');
      if (!tmpl) return JSON.stringify({ status: 'error', error: `Unknown template: ${template}` });

      // Fill defaults
      const defaults = {
        date: new Date().toISOString().split('T')[0],
        year: new Date().getFullYear().toString(),
        version: '1.0.0',
        projectName: 'My Project',
        packageName: 'my-project',
        description: 'A project description',
        license: 'MIT',
        badges: '',
        features: '- Feature 1\\n- Feature 2',
        ...variables
      };

      // Replace {{variables}}
      let result = tmpl.replace(/\{\{(\w+)\}\}/g, (match, key) => defaults[key] || match);

      if (action === 'apply' && outputPath) {
        fs.writeFileSync(path.resolve(outputPath), result, 'utf-8');
        return JSON.stringify({ status: 'success', template, outputPath, length: result.length });
      }

      return JSON.stringify({ status: 'success', template, content: result, length: result.length });
    }

    case 'create': {
      if (!customTemplate) return JSON.stringify({ status: 'error', error: 'customTemplate required for create' });
      const vars = (customTemplate.match(/\{\{(\w+)\}\}/g) || []).map(v => v.replace(/\{\{|\}\}/g, ''));
      return JSON.stringify({ status: 'success', action: 'create', variablesFound: vars, templateLength: customTemplate.length });
    }

    default:
      return JSON.stringify({ status: 'error', error: `Unknown template action: ${action}` });
  }
}

// ============================================================================
// MARKDOWN TRANSFORM EXECUTOR
// ============================================================================
async function executeMarkdownTransform(input) {
  const { action, content: rawContent, filePath, shift = 1, badges = [], outputPath } = input;
  const content = rawContent || (filePath ? fs.readFileSync(path.resolve(filePath), 'utf-8') : '');
  if (!content) return JSON.stringify({ status: 'error', error: 'content or filePath required' });

  let result = content;

  switch (action) {
    case 'shift_headings': {
      result = content.replace(/^(#{1,6})\s/gm, (match, hashes) => {
        const newLevel = Math.max(1, Math.min(6, hashes.length + shift));
        return '#'.repeat(newLevel) + ' ';
      });
      break;
    }

    case 'renumber_lists': {
      let counter = 0;
      result = content.replace(/^(\s*)\d+\.\s/gm, (match, indent) => {
        if (indent.length === 0) counter++;
        else counter = 1;
        return `${indent}${counter}. `;
      });
      break;
    }

    case 'add_anchors': {
      result = content.replace(/^(#{1,6})\s+(.+)/gm, (match, hashes, text) => {
        const slug = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        return `${hashes} ${text} {#${slug}}`;
      });
      break;
    }

    case 'strip_html': {
      result = content.replace(/<[^>]+>/g, '');
      break;
    }

    case 'inject_badges': {
      if (!badges || badges.length === 0) return JSON.stringify({ status: 'error', error: 'badges array required' });
      const badgesMd = badges.map(b => {
        const img = `![${b.label}](https://img.shields.io/badge/${encodeURIComponent(b.label)}-${encodeURIComponent(b.message || '')}-${b.color || 'blue'})`;
        return b.url ? `[${img}](${b.url})` : img;
      }).join(' ');

      // Inject after first heading or at top
      const firstHeadingEnd = content.indexOf('\n');
      if (content.startsWith('#') && firstHeadingEnd > 0) {
        result = content.substring(0, firstHeadingEnd) + '\n\n' + badgesMd + '\n' + content.substring(firstHeadingEnd);
      } else {
        result = badgesMd + '\n\n' + content;
      }
      break;
    }

    case 'slugify': {
      const headings = [];
      content.replace(/^(#{1,6})\s+(.+)/gm, (match, hashes, text) => {
        const slug = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        headings.push({ text, slug, level: hashes.length });
      });
      return JSON.stringify({ status: 'success', headings });
    }

    case 'wrap_codeblocks': {
      // Wrap bare code (indented 4 spaces) in fenced blocks
      const lines = content.split('\n');
      const newLines = [];
      let inIndented = false;
      lines.forEach(line => {
        if (line.startsWith('    ') && !line.startsWith('    -') && !line.startsWith('    *')) {
          if (!inIndented) {
            newLines.push('```');
            inIndented = true;
          }
          newLines.push(line.substring(4));
        } else {
          if (inIndented) {
            newLines.push('```');
            inIndented = false;
          }
          newLines.push(line);
        }
      });
      if (inIndented) newLines.push('```');
      result = newLines.join('\n');
      break;
    }

    case 'add_line_numbers': {
      const lines = content.split('\n');
      let inCode = false;
      const numbered = lines.map((line, i) => {
        if (line.startsWith('```')) {
          inCode = !inCode;
          return line;
        }
        if (inCode) return line;
        return `${String(i + 1).padStart(4)} | ${line}`;
      });
      result = numbered.join('\n');
      break;
    }

    default:
      return JSON.stringify({ status: 'error', error: `Unknown transform action: ${action}` });
  }

  if (outputPath) fs.writeFileSync(path.resolve(outputPath), result, 'utf-8');

  return JSON.stringify({
    status: 'success',
    action,
    originalLength: content.length,
    resultLength: result.length,
    lineCount: result.split('\n').length,
    outputPath: outputPath || null,
    content: outputPath ? undefined : result.substring(0, 5000)
  });
}

// ============================================================================
// MAIN EXECUTOR
// ============================================================================

async function executeContentMarkdownTool(toolName, input, ctx = {}) {
  switch (toolName) {
    case 'markdown_convert': return { result: await executeMarkdownConvert(input), sideEffects: null };
    case 'markdown_validate': return { result: await executeMarkdownValidate(input), sideEffects: null };
    case 'markdown_generate': return { result: await executeMarkdownGenerate(input), sideEffects: null };
    case 'markdown_toc': return { result: await executeMarkdownToc(input), sideEffects: null };
    case 'markdown_format': return { result: await executeMarkdownFormat(input), sideEffects: null };
    case 'markdown_merge': return { result: await executeMarkdownMerge(input), sideEffects: null };
    case 'markdown_extract': return { result: await executeMarkdownExtract(input), sideEffects: null };
    case 'markdown_template': return { result: await executeMarkdownTemplate(input), sideEffects: null };
    case 'markdown_transform': return { result: await executeMarkdownTransform(input), sideEffects: null };
    default: return { result: JSON.stringify({ status: 'error', error: `Unknown content/markdown tool: ${toolName}` }), sideEffects: null };
  }
}

const CONTENT_MARKDOWN_TOOL_NAMES = new Set(CONTENT_MARKDOWN_TOOL_DEFINITIONS.map(t => t.name));
function isContentMarkdownTool(toolName) { return CONTENT_MARKDOWN_TOOL_NAMES.has(toolName); }

export { CONTENT_MARKDOWN_TOOL_DEFINITIONS, executeContentMarkdownTool, isContentMarkdownTool };
