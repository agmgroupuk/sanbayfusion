import { memoryStorage } from '../services/memoryStorage';
/**
 * AI Agent Extension Settings Panel
 * 
 * Provides a UI for configuring the AI Agent extension:
 * - Select AI provider (OpenAI, Gemini, Claude, etc.)
 * - Configure API keys
 * - Choose models
 * - Adjust behavior settings
 */

import React, { useState, useEffect } from 'react';
import {
  aiAgentExtension,
  AIAgentConfig,
  AIProvider,
  AI_PROVIDERS,
  AIProviderInfo
} from '../services/aiAgentExtension';
import { extensionEvents } from '../services/extensions';

interface AIAgentExtensionSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AIAgentExtensionSettings: React.FC<AIAgentExtensionSettingsProps> = ({
  isOpen,
  onClose
}) => {
  const [config, setConfig] = useState<AIAgentConfig>(aiAgentExtension.getConfig());
  const [activeTab, setActiveTab] = useState<'provider' | 'settings' | 'advanced'>('provider');

  useEffect(() => {
    // Listen for config changes from the extension
    const unsubscribe = aiAgentExtension.onConfigChange(setConfig);
    return unsubscribe;
  }, []);

  useEffect(() => {
    // Listen for open settings event
    const handleOpenSettings = () => {
      // This would be handled by parent component
    };
    extensionEvents.on('aiAgent:openSettings', handleOpenSettings);
    return () => extensionEvents.off('aiAgent:openSettings', handleOpenSettings);
  }, []);

  const handleProviderChange = (providerId: AIProvider) => {
    aiAgentExtension.setProvider(providerId);
    // Load the API key for this provider
    const apiKey = aiAgentExtension.getApiKey(providerId);
    setConfig(prev => ({
      ...prev,
      provider: providerId,
      apiKey: apiKey,
    }));
  };

  const handleModelChange = (model: string) => {
    aiAgentExtension.setModel(model);
    setConfig(prev => ({ ...prev, model }));
  };

  const handleSettingChange = (key: keyof AIAgentConfig, value: any) => {
    aiAgentExtension.updateConfig({ [key]: value });
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const currentProvider = AI_PROVIDERS.find(p => p.id === config.provider);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[9999]" style={{ backdropFilter: 'blur(8px)' }}>
      <div className="bg-[#0d0d0d] border border-[#252525] rounded-lg w-[700px] max-h-[80vh] overflow-hidden shadow-2xl" style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.95), 0 0 0 1px rgba(0, 200, 224, 0.1)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1c1c1c] bg-[#0a0a0a]">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🤖</span>
            <div>
              <h2 className="text-lg font-semibold text-[#c0c0c0]">
                AI Agent Extension
              </h2>
              <p className="text-sm text-[#707070]">
                Configure AI provider and settings
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors text-[#606060] hover:text-[#a0a0a0]"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#1c1c1c] bg-[#0a0a0a]">
          {[
            { id: 'provider', label: 'Provider', icon: '🔌' },
            { id: 'settings', label: 'Settings', icon: '⚙️' },
            { id: 'advanced', label: 'Advanced', icon: '🛠️' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === tab.id
                  ? 'text-[#00c8e0] border-b-2 border-[#00c8e0] bg-[#0d0d0d]'
                  : 'text-[#505050] hover:text-[#808080] hover:bg-[#141414]'
                }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-180px)] bg-[#0d0d0d]">
          {/* Provider Tab */}
          {activeTab === 'provider' && (
            <div className="space-y-6">
              {/* Service Info */}
              <div className="p-4 bg-[#0a1520] rounded-lg border border-[#00c8e0]/20">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-green-400">✓</span>
                  <span className="text-sm font-medium text-[#c0c0c0]">AI Service Active</span>
                </div>
                <p className="text-xs text-[#707070]">
                  AI is provided by Maula's cloud service. Select your preferred provider and model below.
                </p>
              </div>

              {/* Provider Selection */}
              <div>
                <label className="block text-sm font-medium text-[#c0c0c0] mb-3">
                  Select AI Provider
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {AI_PROVIDERS.map(provider => (
                    <ProviderCard
                      key={provider.id}
                      provider={provider}
                      isSelected={config.provider === provider.id}
                      hasApiKey={true}
                      onSelect={() => handleProviderChange(provider.id)}
                    />
                  ))}
                </div>
              </div>

              {/* Model Selection */}
              {currentProvider && (
                <div>
                  <label className="block text-sm font-medium text-[#c0c0c0] mb-2">
                    Model
                  </label>
                  <select
                    value={config.model}
                    onChange={e => handleModelChange(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-[#252525] rounded-lg text-[#c0c0c0] focus:outline-none focus:border-[#00c8e0]"
                  >
                    {currentProvider.models.map(model => (
                      <option key={model} value={model}>
                        {{ 'claude-sonnet-4-20250514': 'Expert v4', 'claude-opus-4-20250514': 'Expert Pro', 'claude-3-5-haiku-20241022': 'Expert Lite', 'gpt-4o': 'Smart v4', 'gpt-4o-mini': 'Smart Mini', 'mistral-large-2501': 'Logic Pro', 'codestral-latest': 'Code Specialist', 'mistral-small-latest': 'Logic Lite', 'grok-3': 'Reasoning v3', 'grok-3-fast': 'Reasoning Fast', 'grok-3-mini': 'Reasoning Lite', 'llama-3.3-70b': 'Turbo 70B', 'llama-3.1-8b': 'Turbo 8B', 'llama-3.3-70b-versatile': 'Speed 70B', 'llama-3.1-8b-instant': 'Speed 8B', 'gemini-2.5-pro-preview-06-05': 'Vision Pro', 'gemini-2.5-flash-preview-05-20': 'Vision Flash', 'gemini-2.0-flash': 'Vision Standard', 'llama3.2': 'Local Alpha', 'codellama': 'Local Code', 'deepseek-coder': 'Local Deep', 'qwen2.5-coder': 'Local Qwen' }[model] || model}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Streaming */}
              <SettingToggle
                label="Enable Streaming"
                description="Show AI responses in real-time as they're generated"
                value={config.streamingEnabled}
                onChange={v => handleSettingChange('streamingEnabled', v)}
              />

              {/* Auto Apply */}
              <SettingToggle
                label="Auto-Apply Changes"
                description="Automatically apply file changes without confirmation"
                value={config.autoApplyChanges}
                onChange={v => handleSettingChange('autoApplyChanges', v)}
              />

              {/* Confirmation Dialogs */}
              <SettingToggle
                label="Show Confirmation Dialogs"
                description="Ask for confirmation before making changes"
                value={config.showConfirmationDialogs}
                onChange={v => handleSettingChange('showConfirmationDialogs', v)}
              />

              {/* Temperature */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-[#c0c0c0]">
                    Temperature
                  </label>
                  <span className="text-sm text-[#707070]">
                    {config.temperature.toFixed(1)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={config.temperature}
                  onChange={e => handleSettingChange('temperature', parseFloat(e.target.value))}
                  className="w-full accent-[#00c8e0]"
                />
                <p className="text-xs text-[#505050] mt-1">
                  Lower = more focused, Higher = more creative
                </p>
              </div>

              {/* Max Tokens */}
              <div>
                <label className="block text-sm font-medium text-[#c0c0c0] mb-2">
                  Max Tokens
                </label>
                <input
                  type="number"
                  min="256"
                  max="32768"
                  step="256"
                  value={config.maxTokens}
                  onChange={e => handleSettingChange('maxTokens', parseInt(e.target.value))}
                  className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-[#252525] rounded-lg text-[#c0c0c0] focus:outline-none focus:border-[#00c8e0]"
                />
                <p className="text-xs text-[#505050] mt-1">
                  Maximum length of AI response
                </p>
              </div>
            </div>
          )}

          {/* Advanced Tab */}
          {activeTab === 'advanced' && (
            <div className="space-y-6">
              {/* Extension Info */}
              <div className="p-4 bg-[#0a0a0a] rounded-lg border border-[#252525]">
                <h3 className="text-sm font-medium text-[#c0c0c0] mb-2">
                  Extension Information
                </h3>
                <div className="space-y-1 text-sm text-[#707070]">
                  <p>ID: <code className="text-[#00c8e0]">ai-agent</code></p>
                  <p>Version: <code className="text-[#00c8e0]">2.0.0</code></p>
                  <p>Status: {config.enabled ? '🟢 Enabled' : '🔴 Disabled'}</p>
                </div>
              </div>

              {/* Keyboard Shortcuts */}
              <div>
                <h3 className="text-sm font-medium text-[#c0c0c0] mb-3">
                  Keyboard Shortcuts
                </h3>
                <div className="space-y-2">
                  {[
                    { shortcut: 'Ctrl+Shift+A', action: 'Open AI Agent Settings' },
                    { shortcut: 'Ctrl+Shift+I', action: 'Open AI Chat' },
                  ].map(({ shortcut, action }) => (
                    <div key={shortcut} className="flex items-center justify-between p-2 bg-[#0a0a0a] rounded">
                      <span className="text-sm text-[#707070]">{action}</span>
                      <kbd className="px-2 py-1 bg-[#0d0d0d] border border-[#252525] rounded text-xs font-mono text-[#808080]">
                        {shortcut}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reset Preferences */}
              <div className="pt-4 border-t border-[#252525]">
                <button
                  onClick={() => {
                    if (confirm('Reset all AI settings to defaults?')) {
                      memoryStorage.removeItem('aiAgentExtension:config');
                      window.location.reload();
                    }
                  }}
                  className="px-4 py-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
                >
                  Reset to Defaults
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#1c1c1c] bg-[#0a0a0a]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[#707070] hover:text-[#c0c0c0] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-[#00c8e0] text-black font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// Sub-components
// =============================================================================

interface ProviderCardProps {
  provider: AIProviderInfo;
  isSelected: boolean;
  hasApiKey: boolean;
  onSelect: () => void;
}

const ProviderCard: React.FC<ProviderCardProps> = ({
  provider,
  isSelected,
  hasApiKey,
  onSelect
}) => (
  <button
    onClick={onSelect}
    className={`p-4 rounded-lg border-2 transition-all text-left ${isSelected
        ? 'border-[#00c8e0] bg-[#0a1520]'
        : 'border-[#252525] hover:border-[#353535] bg-[#0a0a0a]'
      }`}
  >
    <div className="flex items-center justify-between mb-2">
      <span className="text-2xl">{provider.icon}</span>
      {!isSelected && (
        <span className="text-xs text-[#00c878]">✓ Available</span>
      )}
      {isSelected && (
        <span className="text-xs px-2 py-0.5 bg-[#00c8e0] text-black font-semibold rounded-full">
          Active
        </span>
      )}
    </div>
    <h4 className="font-medium text-[#c0c0c0]">{provider.name}</h4>
    <p className="text-xs text-[#606060] mt-1 line-clamp-2">
      {provider.description}
    </p>
  </button>
);

interface SettingToggleProps {
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

const SettingToggle: React.FC<SettingToggleProps> = ({
  label,
  description,
  value,
  onChange
}) => (
  <div className="flex items-center justify-between">
    <div>
      <h4 className="text-sm font-medium text-[#c0c0c0]">{label}</h4>
      <p className="text-xs text-[#606060]">{description}</p>
    </div>
    <button
      onClick={() => onChange(!value)}
      className={`w-12 h-6 rounded-full transition-colors relative ${value ? 'bg-[#00c8e0]' : 'bg-[#252525]'
        }`}
    >
      <span
        className={`absolute w-5 h-5 bg-[#0d0d0d] border border-[#404040] rounded-full top-0.5 transition-transform ${value ? 'translate-x-6' : 'translate-x-0.5'
          }`}
      />
    </button>
  </div>
);

export default AIAgentExtensionSettings;
