'use client'

import { useState } from 'react'

interface CodeBlockProps {
  code: string
  language?: string
  title?: string
  showLineNumbers?: boolean
}

export default function CodeBlock({ 
  code, 
  language = 'javascript', 
  title,
  showLineNumbers = false 
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Language badge colors
  const languageColors: Record<string, string> = {
    javascript: 'bg-yellow-500/20 text-yellow-400',
    typescript: 'bg-blue-500/20 text-blue-400',
    python: 'bg-green-500/20 text-green-400',
    go: 'bg-cyan-500/20 text-cyan-400',
    php: 'bg-purple-500/20 text-purple-400',
    ruby: 'bg-red-500/20 text-red-400',
    java: 'bg-orange-500/20 text-orange-400',
    bash: 'bg-gray-500/20 text-gray-400',
    shell: 'bg-gray-500/20 text-gray-400',
    xml: 'bg-orange-500/20 text-orange-400',
  }

  const lines = code.split('\n')

  return (
    <div className="relative group rounded-lg overflow-hidden border border-gray-700 bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800/80 border-b border-gray-700">
        <div className="flex items-center gap-3">
          {/* Terminal dots */}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
          </div>
          {/* Title or language badge */}
          {title ? (
            <span className="text-gray-400 text-xs font-mono">{title}</span>
          ) : language ? (
            <span className={`text-xs font-medium px-2 py-0.5 rounded ${languageColors[language] || 'bg-gray-500/20 text-gray-400'}`}>
              {language}
            </span>
          ) : null}
        </div>
        {/* Copy button */}
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-400 hover:text-white bg-gray-700/50 hover:bg-gray-700 rounded transition-all duration-200"
          title="Copy to clipboard"
        >
          {copied ? (
            <>
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-green-400">Copied!</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      
      {/* Code content */}
      <div className="overflow-x-auto">
        <pre className="p-4 text-sm font-mono leading-relaxed">
          {showLineNumbers ? (
            <table className="w-full">
              <tbody>
                {lines.map((line, index) => (
                  <tr key={index} className="hover:bg-gray-800/50">
                    <td className="pr-4 text-right text-gray-600 select-none w-8 align-top">
                      {index + 1}
                    </td>
                    <td className="text-gray-200 whitespace-pre">{line}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <code className="text-gray-200 whitespace-pre">{code}</code>
          )}
        </pre>
      </div>
    </div>
  )
}
