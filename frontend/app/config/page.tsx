/**
 * Configuration Setup Page
 * Helps users understand and configure their environment variables
 */

'use client'

import React from 'react'
import Link from 'next/link'
import { ChevronLeftIcon, Cog6ToothIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline'
import ConfigValidator from '../../components/ConfigValidator'

export default function ConfigSetupPage() {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const envVarSections = [
    {
      title: 'AI Service Providers',
      description: 'Configure AI models for agent responses',
      vars: [
        {
          name: 'NEXT_PUBLIC_OPENAI_API_KEY',
          description: 'OpenAI API key for GPT models',
          example: 'sk-...',
          required: false,
          link: 'https://platform.openai.com/api-keys'
        },
        {
          name: 'NEXT_PUBLIC_ANTHROPIC_API_KEY',
          description: 'Anthropic API key for Claude models',
          example: 'sk-ant-...',
          required: false,
          link: 'https://console.anthropic.com/keys'
        },
        {
          name: 'NEXT_PUBLIC_GEMINI_API_KEY',
          description: 'Google Gemini API key',
          example: 'AIza...',
          required: false,
          link: 'https://aistudio.google.com/app/apikey'
        },
        {
          name: 'NEXT_PUBLIC_COHERE_API_KEY',
          description: 'Cohere API key for Command models',
          example: 'co_...',
          required: false,
          link: 'https://dashboard.cohere.ai/api-keys'
        }
      ]
    },
    {
      title: 'Voice Services',
      description: 'Configure text-to-speech and speech recognition',
      vars: [
        {
          name: 'NEXT_PUBLIC_ELEVENLABS_API_KEY',
          description: 'ElevenLabs API key for high-quality voice synthesis',
          example: 'el_...',
          required: false,
          link: 'https://elevenlabs.io/app/subscription'
        },
        {
          name: 'NEXT_PUBLIC_ELEVENLABS_VOICE_ID',
          description: 'Default voice ID for ElevenLabs',
          example: 'pNInz6obpgDQGcFmaJgB',
          required: false
        },
        {
          name: 'NEXT_PUBLIC_AZURE_SPEECH_KEY',
          description: 'Azure Cognitive Services Speech key',
          example: 'abc123...',
          required: false,
          link: 'https://portal.azure.com/'
        },
        {
          name: 'NEXT_PUBLIC_AZURE_SPEECH_REGION',
          description: 'Azure Speech service region',
          example: 'eastus',
          required: false
        }
      ]
    },
    {
      title: 'Translation Services',
      description: 'Configure language translation providers',
      vars: [
        {
          name: 'NEXT_PUBLIC_GOOGLE_TRANSLATE_API_KEY',
          description: 'Google Cloud Translation API key',
          example: 'AIza...',
          required: false,
          link: 'https://console.cloud.google.com/apis/credentials'
        },
        {
          name: 'NEXT_PUBLIC_DEEPL_API_KEY',
          description: 'DeepL API key for high-quality translation',
          example: 'abc123:fx',
          required: false,
          link: 'https://www.deepl.com/pro-api'
        },
        {
          name: 'NEXT_PUBLIC_AZURE_TRANSLATOR_KEY',
          description: 'Azure Translator service key',
          example: 'abc123...',
          required: false
        }
      ]
    },
    {
      title: 'Application Settings',
      description: 'Configure general application behavior',
      vars: [
        {
          name: 'NEXT_PUBLIC_API_URL',
          description: 'Backend API URL',
          example: 'http://localhost:3002',
          required: true
        },
        {
          name: 'NEXT_PUBLIC_ENABLE_MULTILINGUAL',
          description: 'Enable multilingual features',
          example: 'true',
          required: false
        },
        {
          name: 'NEXT_PUBLIC_DEFAULT_LANGUAGE',
          description: 'Default language code',
          example: 'en',
          required: false
        },
        {
          name: 'NEXT_PUBLIC_ENABLE_VOICE',
          description: 'Enable voice features',
          example: 'true',
          required: false
        },
        {
          name: 'NEXT_PUBLIC_ENABLE_TRANSLATION',
          description: 'Enable translation features',
          example: 'true',
          required: false
        }
      ]
    }
  ]

  const generateEnvTemplate = () => {
    const lines = ['# Multilingual AI Agent System - Environment Variables', '']
    
    envVarSections.forEach(section => {
      lines.push(`# ${section.title}`)
      lines.push(`# ${section.description}`)
      lines.push('')
      
      section.vars.forEach(envVar => {
        lines.push(`# ${envVar.description}`)
        if (envVar.link) {
          lines.push(`# Get your key at: ${envVar.link}`)
        }
        lines.push(`${envVar.name}=${envVar.example}`)
        lines.push('')
      })
      
      lines.push('')
    })
    
    return lines.join('\n')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neural-900 via-neural-800 to-neural-900">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-brand-500/10 rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent-500/10 rounded-full filter blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-brand-500/5 to-accent-500/5 rounded-full filter blur-3xl"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 bg-neural-800/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link 
                href="/home"
                className="flex items-center space-x-2 text-neural-300 hover:text-white transition-colors"
              >
                <ChevronLeftIcon className="h-5 w-5" />
                <span>Back to Home</span>
              </Link>
              <div className="text-neural-600">|</div>
              <div className="flex items-center space-x-2">
                <Cog6ToothIcon className="h-6 w-6 text-brand-400" />
                <h1 className="text-xl text-5xl md:text-7xl font-bold mb-4 leading-tight"><span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Environment Configuration</span></h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Configuration Validator */}
        <div className="mb-8">
          <ConfigValidator />
        </div>

        {/* Setup Instructions */}
        <div className="bg-neural-800/60 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-white/10 bg-gradient-to-r from-brand-500/10 to-accent-500/10">
            <h2 className="text-lg font-semibold text-white">Environment Variable Setup</h2>
            <p className="mt-2 text-neural-300">
              Configure your environment variables to enable all features of the multilingual AI agent system.
              You don't need all services - the system will work with whatever you configure.
            </p>
          </div>

          <div className="p-6">
            {/* Quick Setup */}
            <div className="mb-8 bg-gradient-to-br from-brand-500/20 to-brand-600/10 border border-brand-500/30 rounded-xl p-5">
              <h3 className="font-medium text-brand-300 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Quick Setup
              </h3>
              <p className="text-sm text-neural-300 mt-1 mb-3">
                Copy this template to your <code className="bg-neural-700/50 px-2 py-0.5 rounded text-brand-300">.env.local</code> file and fill in your API keys:
              </p>
              <div className="relative">
                <pre className="bg-neural-900 text-neural-100 p-4 rounded-lg text-sm overflow-x-auto border border-white/5">
                  <code>{generateEnvTemplate()}</code>
                </pre>
                <button
                  onClick={() => copyToClipboard(generateEnvTemplate())}
                  className="absolute top-2 right-2 p-2 bg-neural-700 hover:bg-neural-600 rounded-lg text-neural-300 hover:text-white transition-colors"
                  title="Copy to clipboard"
                >
                  <DocumentDuplicateIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Detailed Configuration */}
            <div className="space-y-8">
              {envVarSections.map((section, sectionIndex) => (
                <div key={sectionIndex}>
                  <h3 className="text-lg font-medium text-white mb-2">{section.title}</h3>
                  <p className="text-neural-400 mb-4">{section.description}</p>
                  
                  <div className="grid gap-4">
                    {section.vars.map((envVar, varIndex) => (
                      <div key={varIndex} className="bg-neural-700/40 backdrop-blur rounded-xl p-4 border border-white/5 hover:border-brand-500/30 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                              <code className="text-sm font-mono bg-neural-900/60 text-brand-300 px-3 py-1 rounded-lg">
                                {envVar.name}
                              </code>
                              {envVar.required && (
                                <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full border border-red-500/30">
                                  Required
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-neural-300 mt-2">{envVar.description}</p>
                            <div className="mt-2 text-xs text-neural-500">
                              Example: <code className="bg-neural-900/60 text-neural-300 px-2 py-0.5 rounded">{envVar.example}</code>
                            </div>
                            {envVar.link && (
                              <div className="mt-2">
                                <a
                                  href={envVar.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-brand-400 hover:text-brand-300 transition-colors inline-flex items-center gap-1"
                                >
                                  Get your API key 
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => copyToClipboard(`${envVar.name}=${envVar.example}`)}
                            className="ml-4 p-2 text-neural-500 hover:text-brand-400 hover:bg-neural-700/50 rounded-lg transition-colors"
                            title="Copy to clipboard"
                          >
                            <DocumentDuplicateIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Usage Notes */}
            <div className="mt-8 bg-gradient-to-br from-amber-500/20 to-orange-600/10 border border-amber-500/30 rounded-xl p-5">
              <h3 className="font-medium text-amber-300 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Important Notes
              </h3>
              <ul className="text-sm text-neural-300 mt-3 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 mt-1">•</span>
                  <span>Environment variables with <code className="bg-neural-700/50 px-2 py-0.5 rounded text-amber-300">NEXT_PUBLIC_</code> prefix are exposed to the browser</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 mt-1">•</span>
                  <span>Keep your API keys secure and never commit them to version control</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 mt-1">•</span>
                  <span>You only need to configure the services you want to use</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 mt-1">•</span>
                  <span>The system will automatically fall back to available services</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 mt-1">•</span>
                  <span>Restart your development server after changing environment variables</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 mt-1">•</span>
                  <span>For production, use your hosting platform's environment variable settings</span>
                </li>
              </ul>
            </div>

            {/* File Structure */}
            <div className="mt-8 bg-neural-700/40 border border-white/10 rounded-xl p-5">
              <h3 className="font-medium text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                File Structure
              </h3>
              <div className="mt-3 text-sm text-neural-300">
                <p>Create these files in your project root:</p>
                <div className="mt-3 font-mono text-xs bg-neural-900 text-neural-100 p-4 rounded-lg border border-white/5 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-brand-400">📁</span>
                    <span className="text-white">/frontend/</span>
                  </div>
                  <div className="flex items-center gap-2 pl-4">
                    <span className="text-emerald-400">📄</span>
                    <span>.env.local</span>
                    <span className="text-neural-500 ml-2"># Your actual API keys (DO NOT COMMIT)</span>
                  </div>
                  <div className="flex items-center gap-2 pl-4">
                    <span className="text-blue-400">📄</span>
                    <span>.env.example</span>
                    <span className="text-neural-500 ml-2"># Template file (safe to commit)</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-brand-400">📁</span>
                    <span className="text-white">/backend/</span>
                  </div>
                  <div className="flex items-center gap-2 pl-4">
                    <span className="text-emerald-400">📄</span>
                    <span>.env.local</span>
                    <span className="text-neural-500 ml-2"># Backend environment variables</span>
                  </div>
                  <div className="flex items-center gap-2 pl-4">
                    <span className="text-blue-400">📄</span>
                    <span>.env.example</span>
                    <span className="text-neural-500 ml-2"># Backend template file</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}