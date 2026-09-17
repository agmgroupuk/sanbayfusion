/**
 * Environment Configuration Validator Component
 * Helps users validate their environment variable setup
 */

'use client'

import React, { useState, useEffect } from 'react'
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  XCircleIcon,
  Cog6ToothIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline'
import { 
  getAIConfig,
  getVoiceConfig, 
  getTranslationConfig,
  getAppConfig,
  validateConfig,
  getEnvironmentInfo,
  getPreferredAIProvider,
  getPreferredVoiceProvider,
  getPreferredTranslationProvider
} from '../utils/config'

interface ConfigValidatorProps {
  className?: string
  showDetails?: boolean
}

export default function ConfigValidator({ className = '', showDetails = true }: ConfigValidatorProps) {
  const [config, setConfig] = useState<any>(null)
  const [validation, setValidation] = useState<any>(null)
  const [envInfo, setEnvInfo] = useState<any>(null)
  const [showSecrets, setShowSecrets] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    // Load configuration on component mount
    const loadConfig = () => {
      try {
        const aiConfig = getAIConfig()
        const voiceConfig = getVoiceConfig()
        const translationConfig = getTranslationConfig()
        const appConfig = getAppConfig()
        const validationResult = validateConfig()
        const envInfo = getEnvironmentInfo()

        setConfig({
          ai: aiConfig,
          voice: voiceConfig,
          translation: translationConfig,
          app: appConfig,
          providers: {
            ai: getPreferredAIProvider(),
            voice: getPreferredVoiceProvider(),
            translation: getPreferredTranslationProvider()
          }
        })
        
        setValidation(validationResult)
        setEnvInfo(envInfo)
      } catch (error) {
        console.error('Failed to load configuration:', error)
      }
    }

    loadConfig()
  }, [])

  const maskSecret = (secret: string | undefined) => {
    if (!secret) return 'Not set'
    if (!showSecrets) {
      return '*'.repeat(Math.min(secret.length, 20))
    }
    return secret
  }

  const getStatusIcon = (enabled: boolean, hasKey: boolean) => {
    if (enabled && hasKey) {
      return <CheckCircleIcon className="h-5 w-5 text-green-500" />
    } else if (enabled && !hasKey) {
      return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
    } else {
      return <XCircleIcon className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusText = (enabled: boolean, hasKey: boolean) => {
    if (enabled && hasKey) return 'Active'
    if (enabled && !hasKey) return 'Enabled but not configured'
    return 'Disabled'
  }

  if (!config || !validation || !envInfo) {
    return (
      <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2">
          <Cog6ToothIcon className="h-5 w-5 text-gray-400 animate-spin" />
          <span className="text-gray-600">Loading configuration...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Cog6ToothIcon className="h-5 w-5 text-gray-500" />
            <h3 className="text-lg font-medium text-gray-900">Environment Configuration</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSecrets(!showSecrets)}
              className="p-1 rounded-md hover:bg-gray-100"
              title={showSecrets ? 'Hide secrets' : 'Show secrets'}
            >
              {showSecrets ? (
                <EyeSlashIcon className="h-4 w-4 text-gray-500" />
              ) : (
                <EyeIcon className="h-4 w-4 text-gray-500" />
              )}
            </button>
            {showDetails && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {isExpanded ? 'Hide Details' : 'Show Details'}
              </button>
            )}
          </div>
        </div>
        
        {/* Environment Info */}
        <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
          <span>Environment: <strong>{envInfo.nextEnv}</strong></span>
          <span>Version: <strong>{envInfo.version}</strong></span>
          <span>Node: <strong>{envInfo.nodeEnv}</strong></span>
        </div>
      </div>

      {/* Validation Summary */}
      <div className="p-4">
        <div className="space-y-3">
          {/* Overall Status */}
          <div className="flex items-center space-x-2">
            {validation.valid ? (
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
            ) : (
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
            )}
            <span className="font-medium">
              {validation.valid ? 'Configuration Valid' : 'Configuration Issues Found'}
            </span>
          </div>

          {/* Warnings */}
          {validation.warnings.length > 0 && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-yellow-800">Configuration Warnings</h4>
                  <ul className="mt-1 text-sm text-yellow-700 list-disc list-inside">
                    {validation.warnings.map((warning: string, index: number) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Active Providers */}
          <div className="bg-blue-50 border-l-4 border-blue-400 p-3">
            <h4 className="text-sm font-medium text-blue-800">Active Providers</h4>
            <div className="mt-1 space-y-1 text-sm text-blue-700">
              <div>🤖 AI: <strong>{config.providers.ai}</strong></div>
              <div>🎤 Voice: <strong>{config.providers.voice}</strong></div>
              <div>🌐 Translation: <strong>{config.providers.translation}</strong></div>
            </div>
          </div>
        </div>

        {/* Detailed Configuration */}
        {isExpanded && showDetails && (
          <div className="mt-6 space-y-6">
            {/* AI Services */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">AI Services</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(config.ai).map(([service, serviceConfig]: [string, any]) => (
                  <div key={service} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium capitalize">{service}</span>
                      {getStatusIcon(serviceConfig.enabled, !!serviceConfig.apiKey)}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>Status: {getStatusText(serviceConfig.enabled, !!serviceConfig.apiKey)}</div>
                      <div>Model: {serviceConfig.model}</div>
                      <div>API Key: {maskSecret(serviceConfig.apiKey)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Voice Services */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Voice Services</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">ElevenLabs</span>
                    {getStatusIcon(config.voice.elevenlabs.enabled, !!config.voice.elevenlabs.apiKey)}
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>Status: {getStatusText(config.voice.elevenlabs.enabled, !!config.voice.elevenlabs.apiKey)}</div>
                    <div>Voice ID: {config.voice.elevenlabs.voiceId}</div>
                    <div>API Key: {maskSecret(config.voice.elevenlabs.apiKey)}</div>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Azure Speech</span>
                    {getStatusIcon(config.voice.azure.enabled, !!config.voice.azure.speechKey)}
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>Status: {getStatusText(config.voice.azure.enabled, !!config.voice.azure.speechKey)}</div>
                    <div>Region: {config.voice.azure.speechRegion}</div>
                    <div>API Key: {maskSecret(config.voice.azure.speechKey)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Translation Services */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Translation Services</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(config.translation).map(([service, serviceConfig]: [string, any]) => (
                  <div key={service} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium capitalize">{service.replace(/([A-Z])/g, ' $1')}</span>
                      {getStatusIcon(serviceConfig.enabled, !!(serviceConfig.apiKey || serviceConfig.translatorKey))}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>Status: {getStatusText(serviceConfig.enabled, !!(serviceConfig.apiKey || serviceConfig.translatorKey))}</div>
                      {serviceConfig.region && <div>Region: {serviceConfig.region}</div>}
                      <div>API Key: {maskSecret(serviceConfig.apiKey || serviceConfig.translatorKey)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Feature Settings */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Feature Settings</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Multilingual:</span>
                    <div className={config.app.multilingual.enabled ? 'text-green-600' : 'text-red-600'}>
                      {config.app.multilingual.enabled ? 'Enabled' : 'Disabled'}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Voice:</span>
                    <div className={config.app.features.voiceEnabled ? 'text-green-600' : 'text-red-600'}>
                      {config.app.features.voiceEnabled ? 'Enabled' : 'Disabled'}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Translation:</span>
                    <div className={config.app.features.translationEnabled ? 'text-green-600' : 'text-red-600'}>
                      {config.app.features.translationEnabled ? 'Enabled' : 'Disabled'}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Language Indicator:</span>
                    <div className={config.app.features.languageIndicator ? 'text-green-600' : 'text-red-600'}>
                      {config.app.features.languageIndicator ? 'Enabled' : 'Disabled'}
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Default Language:</span>
                    <div className="text-gray-600">{config.app.multilingual.defaultLanguage}</div>
                  </div>
                  <div>
                    <span className="font-medium">Confidence Threshold:</span>
                    <div className="text-gray-600">{config.app.multilingual.confidenceThreshold}</div>
                  </div>
                  <div>
                    <span className="font-medium">API URL:</span>
                    <div className="text-gray-600 truncate">{config.app.api.url}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}