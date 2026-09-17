'use client';

import { useState, useEffect } from 'react';
import {
  XMarkIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  AdjustmentsHorizontalIcon,
  SparklesIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { AgentConfig } from '../types/agents';
import { PROVIDER_MODEL_OPTIONS } from '../lib/aiProviders';

interface AgentSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: AgentConfig;
  onSave: (updatedAgent: AgentConfig) => void;
}

export default function AgentSettingsModal({
  isOpen,
  onClose,
  agent,
  onSave,
}: AgentSettingsModalProps) {
  const [editedAgent, setEditedAgent] = useState<AgentConfig>(agent);
  const [activeTab, setActiveTab] = useState<
    'general' | 'personality' | 'prompts' | 'settings'
  >('general');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setEditedAgent(agent);
    setHasUnsavedChanges(false);
  }, [agent]);

  useEffect(() => {
    const hasChanges = JSON.stringify(editedAgent) !== JSON.stringify(agent);
    setHasUnsavedChanges(hasChanges);
  }, [editedAgent, agent]);

  const handleInputChange = (field: string, value: any, nested?: string) => {
    setEditedAgent((prev) => {
      if (nested) {
        const nestedObj = prev[nested as keyof AgentConfig] as any;
        return {
          ...prev,
          [nested]: {
            ...nestedObj,
            [field]: value,
          },
        };
      }
      return {
        ...prev,
        [field]: value,
      };
    });
  };

  const handleArrayChange = (
    field: string,
    index: number,
    value: string,
    nested?: string
  ) => {
    setEditedAgent((prev) => {
      if (nested) {
        const nestedObj = prev[nested as keyof AgentConfig] as any;
        const newArray = [...nestedObj[field]];
        newArray[index] = value;
        return {
          ...prev,
          [nested]: {
            ...nestedObj,
            [field]: newArray,
          },
        };
      }
      const newArray = [...(prev[field as keyof AgentConfig] as any)];
      newArray[index] = value;
      return {
        ...prev,
        [field]: newArray,
      };
    });
  };

  const addArrayItem = (field: string, nested?: string) => {
    setEditedAgent((prev) => {
      if (nested) {
        const nestedObj = prev[nested as keyof AgentConfig] as any;
        return {
          ...prev,
          [nested]: {
            ...nestedObj,
            [field]: [...nestedObj[field], ''],
          },
        };
      }
      return {
        ...prev,
        [field]: [...(prev[field as keyof AgentConfig] as any), ''],
      };
    });
  };

  const removeArrayItem = (field: string, index: number, nested?: string) => {
    setEditedAgent((prev) => {
      if (nested) {
        const nestedObj = prev[nested as keyof AgentConfig] as any;
        const newArray = nestedObj[field].filter(
          (_: any, i: number) => i !== index
        );
        return {
          ...prev,
          [nested]: {
            ...nestedObj,
            [field]: newArray,
          },
        };
      }
      const newArray = (prev[field as keyof AgentConfig] as any).filter(
        (_: any, i: number) => i !== index
      );
      return {
        ...prev,
        [field]: newArray,
      };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate API call
      onSave(editedAgent);
      setHasUnsavedChanges(false);
      onClose();
    } catch (error) {
      console.error('Failed to save agent settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      if (
        confirm('You have unsaved changes. Are you sure you want to close?')
      ) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Cog6ToothIcon },
    { id: 'personality', label: 'Personality', icon: SparklesIcon },
    { id: 'prompts', label: 'Prompts', icon: ChatBubbleLeftRightIcon },
    { id: 'settings', label: 'AI Settings', icon: AdjustmentsHorizontalIcon },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="modal-content relative w-full max-w-5xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all duration-300 scale-100">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                <Cog6ToothIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Agent Settings
                </h3>
                <p className="text-sm text-gray-600">{agent.name}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {hasUnsavedChanges && (
                <div className="flex items-center space-x-1 text-sm text-amber-600">
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                  <span>Unsaved changes</span>
                </div>
              )}
              <button
                onClick={handleClose}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex h-[600px]">
            {/* Sidebar Navigation */}
            <div className="w-64 border-r border-gray-200 bg-gray-50/50">
              <nav className="p-4 space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-all duration-200 ${activeTab === tab.id
                          ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6">
                {activeTab === 'general' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">
                        General Information
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Agent Name
                          </label>
                          <input
                            type="text"
                            value={editedAgent.name}
                            onChange={(e) =>
                              handleInputChange('name', e.target.value)
                            }
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Specialty
                          </label>
                          <input
                            type="text"
                            value={editedAgent.specialty}
                            onChange={(e) =>
                              handleInputChange('specialty', e.target.value)
                            }
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                          />
                        </div>
                      </div>

                      <div className="mt-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Category
                        </label>
                        <select
                          value={editedAgent.category}
                          onChange={(e) =>
                            handleInputChange('category', e.target.value)
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                        >
                          <option value="Companion">Companion</option>
                          <option value="Business">Business</option>
                          <option value="Entertainment">Entertainment</option>
                          <option value="Home & Lifestyle">
                            Home & Lifestyle
                          </option>
                          <option value="Education">Education</option>
                          <option value="Health & Wellness">
                            Health & Wellness
                          </option>
                          <option value="Creative">Creative</option>
                          <option value="Technology">Technology</option>
                        </select>
                      </div>

                      <div className="mt-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Description
                        </label>
                        <textarea
                          rows={4}
                          value={editedAgent.description}
                          onChange={(e) =>
                            handleInputChange('description', e.target.value)
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white resize-none"
                          placeholder="Describe what this agent does and its capabilities..."
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Avatar URL
                          </label>
                          <input
                            type="text"
                            value={editedAgent.avatarUrl}
                            onChange={(e) =>
                              handleInputChange('avatarUrl', e.target.value)
                            }
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                            placeholder="https://example.com/avatar.jpg"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Color Theme
                          </label>
                          <input
                            type="text"
                            value={editedAgent.color}
                            onChange={(e) =>
                              handleInputChange('color', e.target.value)
                            }
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                            placeholder="e.g., from-blue-500 to-purple-600"
                          />
                        </div>
                      </div>

                      <div className="mt-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tags
                        </label>
                        <div className="space-y-2">
                          {editedAgent.tags.map((tag, index) => (
                            <div
                              key={index}
                              className="flex items-center space-x-2"
                            >
                              <input
                                type="text"
                                value={tag}
                                onChange={(e) =>
                                  handleArrayChange(
                                    'tags',
                                    index,
                                    e.target.value
                                  )
                                }
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                                placeholder="Enter tag"
                              />
                              <button
                                onClick={() => removeArrayItem('tags', index)}
                                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => addArrayItem('tags')}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors duration-200"
                          >
                            + Add Tag
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'personality' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">
                        Personality Configuration
                      </h4>

                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Response Style
                          </label>
                          <textarea
                            rows={3}
                            value={editedAgent.personality.responseStyle}
                            onChange={(e) =>
                              handleInputChange(
                                'responseStyle',
                                e.target.value,
                                'personality'
                              )
                            }
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white resize-none"
                            placeholder="Describe how this agent should respond and communicate..."
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Greeting Message
                          </label>
                          <textarea
                            rows={4}
                            value={editedAgent.personality.greetingMessage}
                            onChange={(e) =>
                              handleInputChange(
                                'greetingMessage',
                                e.target.value,
                                'personality'
                              )
                            }
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white resize-none"
                            placeholder="The first message users see when they start chatting..."
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Personality Traits
                          </label>
                          <div className="space-y-2">
                            {editedAgent.personality.traits.map(
                              (trait, index) => (
                                <div
                                  key={index}
                                  className="flex items-center space-x-2"
                                >
                                  <input
                                    type="text"
                                    value={trait}
                                    onChange={(e) =>
                                      handleArrayChange(
                                        'traits',
                                        index,
                                        e.target.value,
                                        'personality'
                                      )
                                    }
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                                    placeholder="Enter personality trait"
                                  />
                                  <button
                                    onClick={() =>
                                      removeArrayItem(
                                        'traits',
                                        index,
                                        'personality'
                                      )
                                    }
                                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                                  >
                                    Remove
                                  </button>
                                </div>
                              )
                            )}
                            <button
                              onClick={() =>
                                addArrayItem('traits', 'personality')
                              }
                              className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors duration-200"
                            >
                              + Add Trait
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Specialties
                          </label>
                          <div className="space-y-2">
                            {editedAgent.personality.specialties.map(
                              (specialty, index) => (
                                <div
                                  key={index}
                                  className="flex items-center space-x-2"
                                >
                                  <input
                                    type="text"
                                    value={specialty}
                                    onChange={(e) =>
                                      handleArrayChange(
                                        'specialties',
                                        index,
                                        e.target.value,
                                        'personality'
                                      )
                                    }
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                                    placeholder="Enter specialty area"
                                  />
                                  <button
                                    onClick={() =>
                                      removeArrayItem(
                                        'specialties',
                                        index,
                                        'personality'
                                      )
                                    }
                                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                                  >
                                    Remove
                                  </button>
                                </div>
                              )
                            )}
                            <button
                              onClick={() =>
                                addArrayItem('specialties', 'personality')
                              }
                              className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors duration-200"
                            >
                              + Add Specialty
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'prompts' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">
                        AI Prompts Configuration
                      </h4>

                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            System Prompt
                          </label>
                          <textarea
                            rows={6}
                            value={editedAgent.prompts.systemPrompt}
                            onChange={(e) =>
                              handleInputChange(
                                'systemPrompt',
                                e.target.value,
                                'prompts'
                              )
                            }
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white resize-none font-mono text-sm"
                            placeholder="Define the agent's role and behavior instructions..."
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            This defines the core instructions for how the AI
                            should behave and respond.
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Context Prompt
                          </label>
                          <textarea
                            rows={4}
                            value={editedAgent.prompts.contextPrompt}
                            onChange={(e) =>
                              handleInputChange(
                                'contextPrompt',
                                e.target.value,
                                'prompts'
                              )
                            }
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white resize-none font-mono text-sm"
                            placeholder="Additional context and guidance for responses..."
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            Additional context that helps shape the agent's
                            responses.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'settings' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">
                        AI Model Settings
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            AI Model Provider
                          </label>
                          <select
                            value={editedAgent.aiProvider.primary}
                            onChange={(e) =>
                              handleInputChange(
                                'primary',
                                e.target.value,
                                'aiProvider'
                              )
                            }
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                          >
                            {PROVIDER_MODEL_OPTIONS.map((opt) => (
                              <option key={opt.provider} value={opt.provider}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            AI Model
                          </label>
                          <select
                            value={editedAgent.aiProvider.model}
                            onChange={(e) =>
                              handleInputChange(
                                'model',
                                e.target.value,
                                'aiProvider'
                              )
                            }
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                          >
                            {(
                              PROVIDER_MODEL_OPTIONS.find(
                                (opt) =>
                                  opt.provider ===
                                  editedAgent.aiProvider.primary
                              )?.models || []
                            ).map((model) => (
                              <option key={model.value} value={model.value}>
                                {model.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Max Tokens
                          </label>
                          <input
                            type="number"
                            min="100"
                            max="2000"
                            value={editedAgent.settings.maxTokens}
                            onChange={(e) =>
                              handleInputChange(
                                'maxTokens',
                                parseInt(e.target.value),
                                'settings'
                              )
                            }
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            Maximum length of responses (100-2000)
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Temperature ({editedAgent.settings.temperature})
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={editedAgent.settings.temperature}
                            onChange={(e) =>
                              handleInputChange(
                                'temperature',
                                parseFloat(e.target.value),
                                'settings'
                              )
                            }
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                          />
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>More focused</span>
                            <span>More creative</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-6 mt-6">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editedAgent.settings.enabled}
                            onChange={(e) =>
                              handleInputChange(
                                'enabled',
                                e.target.checked,
                                'settings'
                              )
                            }
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            Agent Enabled
                          </span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editedAgent.settings.premium}
                            onChange={(e) =>
                              handleInputChange(
                                'premium',
                                e.target.checked,
                                'settings'
                              )
                            }
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            Premium Only
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-4">
            <div className="text-sm text-gray-600">
              Last modified: {new Date().toLocaleDateString()}
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!hasUnsavedChanges || isSaving}
                className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${hasUnsavedChanges && !isSaving
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckIcon className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
