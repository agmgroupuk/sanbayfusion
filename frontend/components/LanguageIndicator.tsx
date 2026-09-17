'use client'

import { useState } from 'react'
import { ChevronDownIcon, XMarkIcon, LanguageIcon } from '@heroicons/react/24/outline'
import { DetectedLanguage, getPopularLanguages, getLanguageInfo } from '../utils/languageDetection'

interface LanguageIndicatorProps {
  detectedLanguage: DetectedLanguage | null
  isDetecting: boolean
  onLanguageOverride: (language: DetectedLanguage) => void
  onClearOverride: () => void
  hasOverride: boolean
}

export default function LanguageIndicator({
  detectedLanguage,
  isDetecting,
  onLanguageOverride,
  onClearOverride,
  hasOverride
}: LanguageIndicatorProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const popularLanguages = getPopularLanguages()

  if (isDetecting) {
    return (
      <div className="flex items-center space-x-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-lg text-sm">
        <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-500 border-t-transparent"></div>
        <span className="text-blue-700">Detecting language...</span>
      </div>
    )
  }

  if (!detectedLanguage) {
    return (
      <div className="flex items-center space-x-2 px-3 py-1 bg-gray-50 border border-gray-200 rounded-lg text-sm">
        <LanguageIcon className="w-4 h-4 text-gray-400" />
        <span className="text-gray-500">Auto-detect</span>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-sm transition-colors ${
          hasOverride 
            ? 'bg-orange-50 border border-orange-200 text-orange-700 hover:bg-orange-100'
            : 'bg-green-50 border border-green-200 text-green-700 hover:bg-green-100'
        }`}
        title={hasOverride ? 'Language manually set' : `Auto-detected: ${detectedLanguage.name}`}
      >
        <span className="text-base">{detectedLanguage.flag}</span>
        <span className="font-medium">{detectedLanguage.nativeName}</span>
        {detectedLanguage.confidence < 0.8 && (
          <span className="text-xs opacity-60">({Math.round(detectedLanguage.confidence * 100)}%)</span>
        )}
        {hasOverride && (
          <span className="text-xs bg-orange-200 text-orange-800 px-1 rounded">Manual</span>
        )}
        <ChevronDownIcon className={`w-3 h-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
      </button>

      {isDropdownOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsDropdownOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto">
            <div className="p-2">
              <div className="text-xs font-medium text-gray-500 px-2 py-1 border-b border-gray-100 mb-1">
                Language Selection
              </div>
              
              {hasOverride && (
                <button
                  onClick={() => {
                    onClearOverride()
                    setIsDropdownOpen(false)
                  }}
                  className="w-full flex items-center space-x-2 px-2 py-2 hover:bg-blue-50 rounded text-sm text-blue-600"
                >
                  <LanguageIcon className="w-4 h-4" />
                  <span>🔄 Return to Auto-detect</span>
                </button>
              )}
              
              <div className="text-xs font-medium text-gray-500 px-2 py-1 mt-2 mb-1">
                Popular Languages
              </div>
              
              {popularLanguages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => {
                    onLanguageOverride(language)
                    setIsDropdownOpen(false)
                  }}
                  className={`w-full flex items-center space-x-2 px-2 py-2 hover:bg-gray-50 rounded text-sm transition-colors ${
                    detectedLanguage.code === language.code ? 'bg-green-50 text-green-700' : 'text-gray-700'
                  }`}
                >
                  <span className="text-base">{language.flag}</span>
                  <div className="flex-1 text-left">
                    <div className="font-medium">{language.name}</div>
                    <div className="text-xs text-gray-500">{language.nativeName}</div>
                  </div>
                  {detectedLanguage.code === language.code && (
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}