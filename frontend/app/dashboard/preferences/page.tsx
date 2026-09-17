'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  Cog6ToothIcon,
  PaintBrushIcon,
  BellIcon,
  GlobeAltIcon,
  EyeIcon,
  SpeakerWaveIcon,
  ComputerDesktopIcon,
  MoonIcon,
  SunIcon,
} from '@heroicons/react/24/outline';

const defaultPreferences = {
  theme: 'system',
  // Store language as structured preferences for advanced settings
  language: {
    primary: 'en',
    secondary: '',
    autoDetect: false,
  },
  timezone: 'UTC',
  dateFormat: 'MM/DD/YYYY',
  timeFormat: '12h',
  currency: 'USD',
  notifications: {
    email: {
      enabled: true,
      frequency: 'immediate',
      types: ['security', 'billing', 'updates'],
    },
    push: {
      enabled: true,
      types: ['messages', 'reminders'],
      // Ensure quiet hours object always exists to avoid runtime errors
      quiet: {
        enabled: false,
        start: '22:00',
        end: '07:00',
      },
    },
    sms: {
      enabled: false,
      types: [],
    },
  },
  dashboard: {
    defaultView: 'overview',
    widgets: ['profile', 'security', 'rewards', 'analytics'],
    layout: 'grid',
  },
  accessibility: {
    highContrast: false,
    largeText: false,
    reduceMotion: false,
    screenReader: false,
    keyboardNavigation: false,
  },
  privacy: {
    showOnlineStatus: true,
    allowDataCollection: true,
    shareUsageStats: false,
  },
  integrations: {},
} as const;

function normalizePreferences(raw: any) {
  const merged: any = {
    ...defaultPreferences,
    ...(raw || {}),
  };

  // Deep-merge notifications with safe defaults
  merged.notifications = {
    ...defaultPreferences.notifications,
    ...(raw?.notifications || {}),
    email: {
      ...defaultPreferences.notifications.email,
      ...(raw?.notifications?.email || {}),
    },
    push: {
      ...defaultPreferences.notifications.push,
      ...(raw?.notifications?.push || {}),
      quiet: {
        ...defaultPreferences.notifications.push.quiet,
        ...(raw?.notifications?.push?.quiet || {}),
      },
    },
    sms: {
      ...defaultPreferences.notifications.sms,
      ...(raw?.notifications?.sms || {}),
    },
  };

  // Merge nested objects that are read as flags
  merged.accessibility = {
    ...defaultPreferences.accessibility,
    ...(raw?.accessibility || {}),
  };

  merged.privacy = {
    ...defaultPreferences.privacy,
    ...(raw?.privacy || {}),
  };

  // Normalize language: accept legacy string or structured object
  const lang = raw?.language ?? defaultPreferences.language;
  if (typeof lang === 'string') {
    merged.language = {
      primary: lang || 'en',
      secondary: '',
      autoDetect: false,
    };
  } else {
    merged.language = {
      primary: lang?.primary || 'en',
      secondary: lang?.secondary || '',
      autoDetect: !!lang?.autoDetect,
    };
  }

  return merged;
}

export default function PreferencesPage() {
  const { state } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [preferences, setPreferences] = useState(() =>
    normalizePreferences(defaultPreferences)
  );

  const fetchPreferences = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/user/preferences/${state.user.id}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        setPreferences(normalizePreferences(result.data));
      } else {
        setMessage({ type: 'error', text: 'Failed to load preferences' });
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
      setMessage({ type: 'error', text: 'Error loading preferences' });
    } finally {
      setLoading(false);
    }
  }, [state.user?.id, setLoading, setPreferences, setMessage]);

  // Fetch preferences on mount
  useEffect(() => {
    if (state.user?.id) {
      fetchPreferences();
    }
  }, [state.user, fetchPreferences]);

  const savePreferences = async (updatedPrefs) => {
    try {
      setSaving(true);
      const response = await fetch(`/api/user/preferences/${state.user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updatedPrefs),
      });

      if (response.ok) {
        const result = await response.json();
        setPreferences(normalizePreferences(result.data));
        setMessage({
          type: 'success',
          text: 'Preferences saved successfully!',
        });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      } else {
        setMessage({ type: 'error', text: 'Failed to save preferences' });
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      setMessage({ type: 'error', text: 'Error saving preferences' });
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (path, value) => {
    const newPrefs = { ...preferences };
    const keys = path.split('.');
    let current = newPrefs;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
    setPreferences(newPrefs);

    // Auto-save preferences after a short delay
    clearTimeout(updatePreference.timeoutId);
    updatePreference.timeoutId = setTimeout(() => {
      savePreferences(newPrefs);
    }, 500);
  };

  const themes = [
    {
      id: 'light',
      name: 'Light',
      icon: SunIcon,
      description: 'Clean and bright interface',
    },
    { id: 'dark', name: 'Dark', icon: MoonIcon, description: 'Easy on the eyes in low light' },
    {
      id: 'system',
      name: 'System',
      icon: ComputerDesktopIcon,
      description: 'Matches your device settings',
    },
  ];

  const languages = [
    { code: 'en', name: 'English', native: 'English' },
    { code: 'es', name: 'Spanish', native: 'Español' },
    { code: 'fr', name: 'French', native: 'Français' },
    { code: 'de', name: 'German', native: 'Deutsch' },
    { code: 'ja', name: 'Japanese', native: '日本語' },
    { code: 'zh', name: 'Chinese', native: '中文' },
  ];

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#030304] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030304] text-white overflow-hidden">
        {/* Animated Background - Agents Page Theme */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-violet-500/[0.03] blur-[150px]" />
          <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] rounded-full bg-cyan-500/[0.03] blur-[120px]" />
          <div className="absolute top-2/3 left-1/2 w-[400px] h-[400px] rounded-full bg-fuchsia-500/[0.02] blur-[100px]" />
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
          {[...Array(15)].map((_, i) => (
            <div key={i} className="absolute w-1.5 h-1.5 bg-white/20 rounded-full" style={{ left: `${5 + i * 6}%`, top: `${10 + (i % 5) * 18}%` }} />
          ))}
        </div>

      {/* Hero Section */}
      <section className="relative min-h-[50vh] flex items-center justify-center overflow-hidden">
        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto py-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] rounded-2xl mb-6">
            <Cog6ToothIcon className="w-10 h-10 text-cyan-400" />
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
            <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Preferences</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed mb-8">
            Customize your experience and interface settings
          </p>
          <div className="flex justify-center gap-3 flex-wrap mb-8">
            <span className="px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm font-mono">SETTINGS</span>
            <span className="px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-sm font-mono">CUSTOMIZE</span>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-8 py-4 bg-white/5 backdrop-blur-sm text-white font-bold rounded-xl border border-white/[0.06] hover:bg-white/10 transition-all"
          >
            ← Back to Dashboard
          </Link>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a0a0f] to-transparent" />
      </section>

      {/* Status Section */}
      <section className="relative z-10 py-6 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-end space-x-4">
            {saving && (
              <div className="flex items-center text-cyan-400">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-500 mr-2"></div>
                <span className="text-sm">Saving...</span>
              </div>
            )}
          </div>

          {/* Status Message */}
          {message.text && (
            <div
              className={`p-4 rounded-lg mb-4 ${
                message.type === 'success'
                  ? 'bg-green-900/200/10 text-green-400 border border-green-500/30'
                  : message.type === 'error'
                  ? 'bg-red-900/200/10 text-red-400 border border-red-500/30'
                  : 'bg-blue-900/200/10 text-blue-400 border border-blue-500/30'
              }`}
            >
              {message.text}
            </div>
          )}
        </div>
      </section>

      {/* Preferences Content */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 py-16">
        <div className="space-y-8">
            {/* Appearance Settings */}
            <div className="relative rounded-2xl p-8 bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden">
              {/* Corner Accents */}
              <div className="absolute top-3 right-3 w-6 h-6 border-t border-r border-white/[0.06] rounded-tr-lg" />
              <div className="absolute bottom-3 left-3 w-6 h-6 border-b border-l border-white/[0.06] rounded-bl-lg" />
              <div className="flex items-center mb-6">
                <PaintBrushIcon className="w-6 h-6 text-purple-400 mr-3" />
                <h3 className="text-xl font-semibold text-white">
                  Appearance
                </h3>
              </div>

              <div className="space-y-6">
                {/* Theme Mode */}
                <div>
                  <h4 className="font-medium text-white mb-3">
                    Theme Mode
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {themes.map((theme) => (
                      <div
                        key={theme.id}
                        onClick={() => updatePreference('theme', theme.id)}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                          preferences.theme === theme.id
                            ? 'border-purple-500 bg-purple-900/200/10'
                            : 'border-white/10 hover:border-white/20 bg-white/[0.02]'
                        }`}
                      >
                        <div className="flex items-center mb-2">
                          {theme.icon && (
                            <theme.icon className="w-5 h-5 mr-2 text-purple-400" />
                          )}
                          <h5 className="font-medium text-white">
                            {theme.name}
                          </h5>
                        </div>
                        <p className="text-sm text-gray-400">
                          {theme.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Language Selection */}
                <div>
                  <h4 className="font-medium text-white mb-3">Language</h4>
                  <select
                    value={(preferences.language as any)?.primary || 'en'}
                    onChange={(e) =>
                      updatePreference('language.primary', e.target.value)
                    }
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                  >
                    {languages.map((lang) => (
                      <option key={lang.code} value={lang.code} className="bg-[#13131a]">
                        {lang.native} ({lang.name})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Timezone */}
                <div>
                  <h4 className="font-medium text-white mb-3">Timezone</h4>
                  <select
                    value={preferences.timezone || 'UTC'}
                    onChange={(e) =>
                      updatePreference('timezone', e.target.value)
                    }
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                  >
                    <option value="UTC" className="bg-[#13131a]">UTC</option>
                    <option value="America/New_York" className="bg-[#13131a]">Eastern Time</option>
                    <option value="America/Chicago" className="bg-[#13131a]">Central Time</option>
                    <option value="America/Denver" className="bg-[#13131a]">Mountain Time</option>
                    <option value="America/Los_Angeles" className="bg-[#13131a]">Pacific Time</option>
                    <option value="Europe/London" className="bg-[#13131a]">London</option>
                    <option value="Europe/Paris">Paris</option>
                    <option value="Asia/Tokyo">Tokyo</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Notification Settings */}
            <div className="relative rounded-2xl p-8 bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden">
              {/* Corner Accents */}
              <div className="absolute top-3 right-3 w-6 h-6 border-t border-r border-white/[0.06] rounded-tr-lg" />
              <div className="absolute bottom-3 left-3 w-6 h-6 border-b border-l border-white/[0.06] rounded-bl-lg" />
              <div className="flex items-center mb-6">
                <BellIcon className="w-6 h-6 text-purple-400 mr-3" />
                <h3 className="text-xl font-semibold text-white">
                  Notifications
                </h3>
              </div>

              <div className="space-y-6">
                {/* Email Notifications */}
                <div className="border border-white/10 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-medium text-white">
                        Email Notifications
                      </h4>
                      <p className="text-sm text-gray-400">
                        Receive updates and alerts via email
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.notifications.email.enabled}
                        onChange={(e) =>
                          updatePreference(
                            'notifications.email.enabled',
                            e.target.checked
                          )
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-[#13131a]200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white/5 after:border-neural-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>

                  {preferences.notifications.email.enabled && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Frequency
                        </label>
                        <select
                          value={preferences.notifications.email.frequency}
                          onChange={(e) =>
                            updatePreference(
                              'notifications.email.frequency',
                              e.target.value
                            )
                          }
                          className="w-full p-3 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          <option value="immediate">Immediate</option>
                          <option value="daily">Daily Digest</option>
                          <option value="weekly">Weekly Summary</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-3">
                          Notification Types
                        </label>
                        <div className="space-y-3">
                          {Object.entries(
                            preferences.notifications.email.types
                          ).map(([type, enabled]) => (
                            <div
                              key={type}
                              className="flex items-center justify-between"
                            >
                              <span className="text-sm text-gray-300 capitalize">
                                {type === 'system' && 'System Updates'}
                                {type === 'security' && 'Security Alerts'}
                                {type === 'updates' && 'Product Updates'}
                                {type === 'marketing' &&
                                  'Marketing & Promotions'}
                                {type === 'community' && 'Community Activity'}
                              </span>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={enabled}
                                  onChange={(e) =>
                                    updatePreference(
                                      `notifications.email.types.${type}`,
                                      e.target.checked
                                    )
                                  }
                                  className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-[#13131a]200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white/5 after:border-neural-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Push Notifications */}
                <div className="border border-white/10 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-medium text-white">
                        Push Notifications
                      </h4>
                      <p className="text-sm text-gray-400">
                        Receive instant notifications on your device
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.notifications.push.enabled}
                        onChange={(e) =>
                          updatePreference(
                            'notifications.push.enabled',
                            e.target.checked
                          )
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-[#13131a]200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white/5 after:border-neural-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>

                  {preferences.notifications.push.enabled && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-medium text-white">
                            Quiet Hours
                          </h5>
                          <p className="text-sm text-gray-400">
                            Disable notifications during specified hours
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={
                              preferences.notifications.push.quiet.enabled
                            }
                            onChange={(e) =>
                              updatePreference(
                                'notifications.push.quiet.enabled',
                                e.target.checked
                              )
                            }
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-[#13131a]200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white/5 after:border-neural-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>

                      {preferences.notifications.push.quiet.enabled && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              From
                            </label>
                            <input
                              type="time"
                              value={preferences.notifications.push.quiet.start}
                              onChange={(e) =>
                                updatePreference(
                                  'notifications.push.quiet.start',
                                  e.target.value
                                )
                              }
                              className="w-full p-3 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              To
                            </label>
                            <input
                              type="time"
                              value={preferences.notifications.push.quiet.end}
                              onChange={(e) =>
                                updatePreference(
                                  'notifications.push.quiet.end',
                                  e.target.value
                                )
                              }
                              className="w-full p-3 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Language & Region */}
            <div className="relative rounded-2xl p-8 bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden">
              {/* Corner Accents */}
              <div className="absolute top-3 right-3 w-6 h-6 border-t border-r border-white/[0.06] rounded-tr-lg" />
              <div className="absolute bottom-3 left-3 w-6 h-6 border-b border-l border-white/[0.06] rounded-bl-lg" />
              <div className="flex items-center mb-6">
                <GlobeAltIcon className="w-6 h-6 text-purple-400 mr-3" />
                <h3 className="text-xl font-semibold text-white">
                  Language & Region
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Primary Language
                  </label>
                  <select
                    value={preferences.language.primary}
                    onChange={(e) =>
                      updatePreference('language.primary', e.target.value)
                    }
                    className="w-full p-3 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    {languages.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name} ({lang.native})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Secondary Language
                  </label>
                  <select
                    value={preferences.language.secondary}
                    onChange={(e) =>
                      updatePreference('language.secondary', e.target.value)
                    }
                    className="w-full p-3 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">None</option>
                    {languages.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name} ({lang.native})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-white">
                      Auto-detect Language
                    </h4>
                    <p className="text-sm text-gray-400">
                      Automatically detect content language
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.language.autoDetect}
                      onChange={(e) =>
                        updatePreference(
                          'language.autoDetect',
                          e.target.checked
                        )
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#13131a]200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white/5 after:border-neural-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Accessibility */}
            <div className="relative rounded-2xl p-8 bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden">
              {/* Corner Accents */}
              <div className="absolute top-3 right-3 w-6 h-6 border-t border-r border-white/[0.06] rounded-tr-lg" />
              <div className="absolute bottom-3 left-3 w-6 h-6 border-b border-l border-white/[0.06] rounded-bl-lg" />
              <div className="flex items-center mb-6">
                <EyeIcon className="w-6 h-6 text-purple-400 mr-3" />
                <h3 className="text-xl font-semibold text-white">
                  Accessibility
                </h3>
              </div>

              <div className="space-y-6">
                {Object.entries({
                  highContrast: {
                    title: 'High Contrast',
                    description:
                      'Increase color contrast for better visibility',
                  },
                  reduceMotion: {
                    title: 'Reduce Motion',
                    description: 'Minimize animations and transitions',
                  },
                  screenReader: {
                    title: 'Screen Reader Support',
                    description: 'Enhanced compatibility with screen readers',
                  },
                  keyboardNavigation: {
                    title: 'Keyboard Navigation',
                    description: 'Enable keyboard shortcuts and navigation',
                  },
                }).map(([key, { title, description }]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-white">{title}</h4>
                      <p className="text-sm text-gray-400">{description}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.accessibility[key]}
                        onChange={(e) =>
                          updatePreference(
                            `accessibility.${key}`,
                            e.target.checked
                          )
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-[#13131a]200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white/5 after:border-neural-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end space-x-4">
              <button className="btn-secondary" onClick={() => { setPreferences(normalizePreferences(defaultPreferences)); savePreferences(normalizePreferences(defaultPreferences)); }}>Reset to Default</button>
              <button className="btn-primary" onClick={() => savePreferences(preferences)}>Save Preferences</button>
            </div>
          </div>
      </section>
    </div>
  );
}
