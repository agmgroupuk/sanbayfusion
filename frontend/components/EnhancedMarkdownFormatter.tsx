/**
 * ========================================
 * ENHANCED MARKDOWN FORMATTER COMPONENT
 * ========================================
 * 
 * Advanced React component for rendering AI responses with:
 * - Syntax-highlighted code blocks
 * - Proper markdown rendering
 * - Interactive elements
 * - Copy-to-clipboard functionality
 */

'use client';

import React, { useState } from 'react';
import { ClipboardIcon, CheckIcon } from '@heroicons/react/24/outline';

interface CodeBlockProps {
  code: string;
  language: string;
  filename?: string;
}

interface MarkdownFormatterProps {
  content: string;
  className?: string;
  enableCopy?: boolean;
  enableSyntaxHighlighting?: boolean;
}

// Simple syntax highlighting for common languages
const SyntaxHighlighter: React.FC<CodeBlockProps> = ({ 
  code, 
  language, 
  filename 
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple regex-based syntax highlighting
  const highlightCode = (code: string, lang: string) => {
    switch (lang.toLowerCase()) {
      case 'javascript':
      case 'js':
      case 'typescript':
      case 'ts':
        return highlightJavaScript(code);
      case 'python':
      case 'py':
        return highlightPython(code);
      case 'html':
        return highlightHTML(code);
      case 'css':
        return highlightCSS(code);
      case 'json':
        return highlightJSON(code);
      default:
        return code;
    }
  };

  const highlightJavaScript = (code: string) => {
    return code
      // Keywords
      .replace(/\b(function|const|let|var|if|else|for|while|return|class|import|export|async|await|try|catch)\b/g, 
        '<span class="text-purple-600 font-semibold">$1</span>')
      // Strings
      .replace(/(["'`])((?:(?!\1)[^\\]|\\.)*)(\1)/g, 
        '<span class="text-green-600">$1$2$3</span>')
      // Comments
      .replace(/(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, 
        '<span class="text-gray-500 italic">$1</span>')
      // Numbers
      .replace(/\b(\d+\.?\d*)\b/g, 
        '<span class="text-blue-600">$1</span>')
      // Functions
      .replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g, 
        '<span class="text-indigo-600">$1</span>(');
  };

  const highlightPython = (code: string) => {
    return code
      // Keywords
      .replace(/\b(def|class|if|elif|else|for|while|return|import|from|try|except|with|as|lambda|pass|break|continue)\b/g, 
        '<span class="text-purple-600 font-semibold">$1</span>')
      // Strings
      .replace(/(["'`])((?:(?!\1)[^\\]|\\.)*)(\1)/g, 
        '<span class="text-green-600">$1$2$3</span>')
      // Comments
      .replace(/(#.*$)/gm, 
        '<span class="text-gray-500 italic">$1</span>')
      // Numbers
      .replace(/\b(\d+\.?\d*)\b/g, 
        '<span class="text-blue-600">$1</span>');
  };

  const highlightHTML = (code: string) => {
    return code
      // Tags
      .replace(/(&lt;\/?)([\w-]+)([^&]*?)(&gt;)/g, 
        '<span class="text-blue-600">$1</span><span class="text-indigo-600 font-semibold">$2</span><span class="text-purple-600">$3</span><span class="text-blue-600">$4</span>')
      // Attributes
      .replace(/(\w+)=(["'])(.*?)\2/g, 
        '<span class="text-red-600">$1</span>=<span class="text-green-600">$2$3$2</span>');
  };

  const highlightCSS = (code: string) => {
    return code
      // Selectors
      .replace(/^(\s*)([\w\-#.:\[\](),>\s]+)(\s*{)/gm, 
        '$1<span class="text-indigo-600 font-semibold">$2</span>$3')
      // Properties
      .replace(/(\w[\w-]*)\s*:/g, 
        '<span class="text-purple-600">$1</span>:')
      // Values
      .replace(/:(\s*)(.*?)(;|$)/g, 
        ': <span class="text-green-600">$2</span>$3')
      // Comments
      .replace(/(\/\*[\s\S]*?\*\/)/g, 
        '<span class="text-gray-500 italic">$1</span>');
  };

  const highlightJSON = (code: string) => {
    return code
      // Keys
      .replace(/"([^"]+)":/g, 
        '<span class="text-blue-600">"$1"</span>:')
      // String values
      .replace(/:\s*"([^"]*)"/g, 
        ': <span class="text-green-600">"$1"</span>')
      // Numbers
      .replace(/:\s*(\d+\.?\d*)/g, 
        ': <span class="text-purple-600">$1</span>')
      // Booleans
      .replace(/:\s*(true|false|null)/g, 
        ': <span class="text-red-600">$1</span>');
  };

  const highlightedCode = highlightCode(code, language);

  return (
    <div className="relative group bg-gray-900 rounded-lg overflow-hidden">
      {/* Code block header */}
      <div className="bg-gray-800 px-4 py-2 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
          {filename && (
            <span className="text-gray-300 text-sm font-mono">{filename}</span>
          )}
          <span className="text-gray-400 text-xs uppercase tracking-wide font-mono">
            {language}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 
                     flex items-center space-x-1 px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300"
        >
          {copied ? (
            <CheckIcon className="w-4 h-4 text-green-400" />
          ) : (
            <ClipboardIcon className="w-4 h-4" />
          )}
          <span className="text-xs">{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>

      {/* Code content */}
      <div className="p-4 overflow-x-auto">
        <pre className="text-sm text-gray-100 font-mono leading-relaxed">
          <code 
            dangerouslySetInnerHTML={{ __html: highlightedCode }}
            className="whitespace-pre"
          />
        </pre>
      </div>
    </div>
  );
};

// Enhanced Markdown Formatter Component
const EnhancedMarkdownFormatter: React.FC<MarkdownFormatterProps> = ({ 
  content, 
  className = "",
  enableCopy = true,
  enableSyntaxHighlighting = true
}) => {
  const renderContent = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Code blocks
      if (line.startsWith('```')) {
        const language = line.slice(3).trim() || 'text';
        const codeLines = [];
        i++;
        
        while (i < lines.length && !lines[i].startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        
        const code = codeLines.join('\n');
        elements.push(
          <div key={i} className="my-4">
            {enableSyntaxHighlighting ? (
              <SyntaxHighlighter code={code} language={language} />
            ) : (
              <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto">
                <code className="text-sm font-mono">{code}</code>
              </pre>
            )}
          </div>
        );
        i++;
        continue;
      }

      // Headings
      if (line.startsWith('#')) {
        const level = line.match(/^#+/)?.[0].length || 1;
        const text = line.replace(/^#+\s*/, '');
        const HeadingTag = `h${Math.min(level, 6)}` as keyof JSX.IntrinsicElements;
        
        const headingClasses = {
          1: 'text-3xl font-bold text-gray-900 mb-4 mt-6',
          2: 'text-2xl font-bold text-gray-800 mb-3 mt-5',
          3: 'text-xl font-semibold text-gray-800 mb-2 mt-4',
          4: 'text-lg font-semibold text-gray-700 mb-2 mt-3',
          5: 'text-base font-semibold text-gray-700 mb-1 mt-2',
          6: 'text-sm font-semibold text-gray-600 mb-1 mt-2'
        };
        
        elements.push(
          <HeadingTag key={i} className={headingClasses[level as keyof typeof headingClasses] || headingClasses[6]}>
            {renderInlineElements(text)}
          </HeadingTag>
        );
        i++;
        continue;
      }

      // Lists
      if (line.match(/^(\d+\.|\-|\*)\s/)) {
        const listItems: string[] = [];
        const isOrdered = /^\d+\./.test(line);
        
        while (i < lines.length && lines[i].match(/^(\d+\.|\-|\*)\s/)) {
          const item = lines[i].replace(/^(\d+\.|\-|\*)\s/, '');
          listItems.push(item);
          i++;
        }
        
        const ListTag = isOrdered ? 'ol' : 'ul';
        const listClass = isOrdered 
          ? 'list-decimal list-inside space-y-1 my-3 ml-4' 
          : 'list-disc list-inside space-y-1 my-3 ml-4';
        
        elements.push(
          <ListTag key={i} className={listClass}>
            {listItems.map((item, idx) => (
              <li key={idx} className="text-gray-700">
                {renderInlineElements(item)}
              </li>
            ))}
          </ListTag>
        );
        continue;
      }

      // Block quotes
      if (line.startsWith('>')) {
        const quoteLines = [];
        while (i < lines.length && lines[i].startsWith('>')) {
          quoteLines.push(lines[i].replace(/^>\s?/, ''));
          i++;
        }
        
        elements.push(
          <blockquote key={i} className="border-l-4 border-blue-500 pl-4 my-4 bg-blue-50 py-2">
            <p className="text-gray-700 italic">
              {renderInlineElements(quoteLines.join('\n'))}
            </p>
          </blockquote>
        );
        continue;
      }

      // Horizontal rules
      if (line.trim() === '---' || line.trim() === '***') {
        elements.push(
          <hr key={i} className="my-6 border-t-2 border-gray-300" />
        );
        i++;
        continue;
      }

      // Regular paragraphs
      if (line.trim()) {
        elements.push(
          <p key={i} className="text-gray-700 mb-3 leading-relaxed">
            {renderInlineElements(line)}
          </p>
        );
      } else {
        // Empty line
        elements.push(<br key={i} />);
      }
      
      i++;
    }

    return elements;
  };

  const renderInlineElements = (text: string) => {
    // Handle inline code first
    text = text.replace(/`([^`]+)`/g, '<code class="bg-gray-200 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800">$1</code>');
    
    // Bold text
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>');
    
    // Italic text
    text = text.replace(/\*([^*]+)\*/g, '<em class="italic text-gray-700">$1</em>');
    
    // Links
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">$1</a>');
    
    // Auto-link URLs
    text = text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" class="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">$1</a>');
    
    return <span dangerouslySetInnerHTML={{ __html: text }} />;
  };

  return (
    <div className={`prose prose-gray max-w-none ${className}`}>
      {renderContent(content)}
    </div>
  );
};

export default EnhancedMarkdownFormatter;

// Export individual components for use elsewhere
export { SyntaxHighlighter };
export type { MarkdownFormatterProps, CodeBlockProps };