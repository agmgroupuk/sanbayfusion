/**
 * Dashboard Preferences Logic - User Settings Module
 * Handles user preferences, settings management, and configuration updates
 */

export interface PreferencesState {
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  success: boolean;
  hasUnsavedChanges: boolean;
  preferences: UserPreferences;
  originalPreferences: UserPreferences;
}

export interface UserPreferences {
  theme: ThemePreferences;
  notifications: NotificationPreferences;
  language: LanguagePreferences;
  accessibility: AccessibilityPreferences;
  privacy: PrivacyPreferences;
  advanced: AdvancedPreferences;
}

export interface ThemePreferences {
  mode: 'light' | 'dark' | 'system';
  primaryColor: 'brand' | 'blue' | 'green' | 'purple' | 'orange' | 'red';
  fontSize: 'small' | 'medium' | 'large' | 'xl';
  compactMode: boolean;
  animations: boolean;
  borderRadius: 'none' | 'small' | 'medium' | 'large';
}

export interface NotificationPreferences {
  email: {
    enabled: boolean;
    frequency: 'immediate' | 'daily' | 'weekly' | 'monthly';
    types: {
      system: boolean;
      security: boolean;
      updates: boolean;
      marketing: boolean;
      community: boolean;
      agents: boolean;
    };
  };
  push: {
    enabled: boolean;
    quiet: {
      enabled: boolean;
      start: string;
      end: string;
    };
    types: {
      messages: boolean;
      reminders: boolean;
      updates: boolean;
    };
  };
  desktop: {
    enabled: boolean;
    sound: boolean;
    badge: boolean;
  };
}

export interface LanguagePreferences {
  primary: string;
  secondary?: string;
  autoDetect: boolean;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  timezone: string;
  currency: string;
  numberFormat: string;
}

export interface AccessibilityPreferences {
  highContrast: boolean;
  reduceMotion: boolean;
  screenReader: boolean;
  keyboardNavigation: boolean;
  fontSize: number;
  colorBlindSupport: boolean;
  focusIndicators: boolean;
}

export interface PrivacyPreferences {
  profileVisibility: 'public' | 'private' | 'friends';
  activityTracking: boolean;
  analytics: boolean;
  dataSharing: boolean;
  cookieConsent: boolean;
  telemetry: boolean;
}

export interface AdvancedPreferences {
  autoSave: boolean;
  autoBackup: boolean;
  debugMode: boolean;
  betaFeatures: boolean;
  apiAccess: boolean;
  dataExport: boolean;
}

export interface PreferenceUpdate {
  path: string;
  value: any;
  category: keyof UserPreferences;
}

export class PreferencesLogic {
  private state: PreferencesState;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.state = {
      isLoading: false,
      isSaving: false,
      error: null,
      success: false,
      hasUnsavedChanges: false,
      preferences: this.getDefaultPreferences(),
      originalPreferences: this.getDefaultPreferences(),
    };
  }

  /**
   * Get default preferences
   */
  private getDefaultPreferences(): UserPreferences {
    return {
      theme: {
        mode: 'system',
        primaryColor: 'brand',
        fontSize: 'medium',
        compactMode: false,
        animations: true,
        borderRadius: 'medium',
      },
      notifications: {
        email: {
          enabled: true,
          frequency: 'immediate',
          types: {
            system: true,
            security: true,
            updates: true,
            marketing: false,
            community: true,
            agents: true,
          },
        },
        push: {
          enabled: true,
          quiet: {
            enabled: false,
            start: '22:00',
            end: '08:00',
          },
          types: {
            messages: true,
            reminders: true,
            updates: false,
          },
        },
        desktop: {
          enabled: false,
          sound: true,
          badge: true,
        },
      },
      language: {
        primary: 'en',
        autoDetect: true,
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        currency: 'USD',
        numberFormat: 'en-US',
      },
      accessibility: {
        highContrast: false,
        reduceMotion: false,
        screenReader: false,
        keyboardNavigation: true,
        fontSize: 16,
        colorBlindSupport: false,
        focusIndicators: true,
      },
      privacy: {
        profileVisibility: 'public',
        activityTracking: true,
        analytics: true,
        dataSharing: false,
        cookieConsent: true,
        telemetry: false,
      },
      advanced: {
        autoSave: true,
        autoBackup: true,
        debugMode: false,
        betaFeatures: false,
        apiAccess: false,
        dataExport: true,
      },
    };
  }

  /**
   * Initialize preferences from API
   */
  async initialize(userId: string): Promise<void> {
    this.state.isLoading = true;
    this.state.error = null;

    try {
      const response = await fetch(`/api/user/preferences/${userId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        this.state.preferences = {
          ...this.getDefaultPreferences(),
          ...data.preferences,
        };
        this.state.originalPreferences = { ...this.state.preferences };
      } else {
        // Use default preferences if API call fails
        console.warn('Failed to load user preferences, using defaults');
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      this.state.error = 'Failed to load preferences';
    } finally {
      this.state.isLoading = false;
    }
  }

  /**
   * Update a specific preference
   */
  updatePreference(path: string, value: any): void {
    const keys = path.split('.');
    const newPreferences = { ...this.state.preferences };

    let current: any = newPreferences;
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;

    this.state.preferences = newPreferences;
    this.state.hasUnsavedChanges = !this.arePreferencesEqual(
      this.state.preferences,
      this.state.originalPreferences
    );

    // Auto-save after 2 seconds of inactivity
    this.scheduleAutoSave();

    // Apply changes immediately for certain preferences
    this.applyImmediateChanges(path, value);
  }

  /**
   * Update multiple preferences at once
   */
  updateMultiplePreferences(updates: PreferenceUpdate[]): void {
    let newPreferences = { ...this.state.preferences };

    updates.forEach((update) => {
      const keys = update.path.split('.');
      let current: any = newPreferences;

      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = update.value;
    });

    this.state.preferences = newPreferences;
    this.state.hasUnsavedChanges = !this.arePreferencesEqual(
      this.state.preferences,
      this.state.originalPreferences
    );

    this.scheduleAutoSave();
  }

  /**
   * Save preferences to server
   */
  async savePreferences(userId: string): Promise<void> {
    if (!this.state.hasUnsavedChanges) return;

    this.state.isSaving = true;
    this.state.error = null;

    try {
      const response = await fetch(`/api/user/preferences/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ preferences: this.state.preferences }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to save preferences');
      }

      this.state.originalPreferences = { ...this.state.preferences };
      this.state.hasUnsavedChanges = false;
      this.state.success = true;

      this.trackPreferencesEvent('preferences_saved', {
        categories: this.getChangedCategories(),
      });

      // Clear success message after 3 seconds
      setTimeout(() => {
        this.state.success = false;
      }, 3000);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save preferences';
      this.state.error = message;
      throw new Error(message);
    } finally {
      this.state.isSaving = false;
    }
  }

  /**
   * Reset preferences to defaults
   */
  async resetToDefaults(userId: string): Promise<void> {
    const defaultPrefs = this.getDefaultPreferences();

    this.state.preferences = defaultPrefs;
    this.state.hasUnsavedChanges = true;

    await this.savePreferences(userId);

    this.trackPreferencesEvent('preferences_reset');
  }

  /**
   * Reset specific category to defaults
   */
  resetCategoryToDefaults(category: keyof UserPreferences): void {
    const defaultPrefs = this.getDefaultPreferences();
    this.state.preferences[category] = defaultPrefs[category];
    this.state.hasUnsavedChanges = true;
    this.scheduleAutoSave();
  }

  /**
   * Import preferences from file
   */
  async importPreferences(file: File, userId: string): Promise<void> {
    try {
      const text = await file.text();
      const importedPrefs = JSON.parse(text);

      // Validate imported preferences
      if (!this.validatePreferences(importedPrefs)) {
        throw new Error('Invalid preferences file format');
      }

      this.state.preferences = {
        ...this.getDefaultPreferences(),
        ...importedPrefs,
      };
      this.state.hasUnsavedChanges = true;

      await this.savePreferences(userId);

      this.trackPreferencesEvent('preferences_imported');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to import preferences';
      this.state.error = message;
      throw new Error(message);
    }
  }

  /**
   * Export preferences to file
   */
  exportPreferences(): void {
    try {
      const dataStr = JSON.stringify(this.state.preferences, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });

      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `maula-ai-preferences-${
        new Date().toISOString().split('T')[0]
      }.json`;
      link.click();

      this.trackPreferencesEvent('preferences_exported');
    } catch (error) {
      this.state.error = 'Failed to export preferences';
      throw new Error('Failed to export preferences');
    }
  }

  /**
   * Apply theme changes immediately
   */
  private applyImmediateChanges(path: string, value: any): void {
    if (path.startsWith('theme.')) {
      this.applyThemeChanges();
    } else if (path.startsWith('accessibility.')) {
      this.applyAccessibilityChanges();
    }
  }

  /**
   * Apply theme changes to document
   */
  private applyThemeChanges(): void {
    if (typeof window === 'undefined') return;

    const { theme } = this.state.preferences;
    const root = document.documentElement;

    // Apply theme mode
    if (theme.mode === 'dark') {
      root.classList.add('dark');
    } else if (theme.mode === 'light') {
      root.classList.remove('dark');
    } else {
      // System preference
      const prefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches;
      root.classList.toggle('dark', prefersDark);
    }

    // Apply primary color
    root.setAttribute('data-theme-color', theme.primaryColor);

    // Apply font size
    const fontSizeMap = {
      small: '14px',
      medium: '16px',
      large: '18px',
      xl: '20px',
    };
    root.style.fontSize = fontSizeMap[theme.fontSize];

    // Apply compact mode
    root.classList.toggle('compact', theme.compactMode);

    // Apply animations
    root.classList.toggle('no-animations', !theme.animations);

    // Apply border radius
    const radiusMap = { none: '0', small: '4px', medium: '8px', large: '12px' };
    root.style.setProperty('--border-radius', radiusMap[theme.borderRadius]);
  }

  /**
   * Apply accessibility changes
   */
  private applyAccessibilityChanges(): void {
    if (typeof window === 'undefined') return;

    const { accessibility } = this.state.preferences;
    const root = document.documentElement;

    root.classList.toggle('high-contrast', accessibility.highContrast);
    root.classList.toggle('reduce-motion', accessibility.reduceMotion);
    root.classList.toggle('focus-indicators', accessibility.focusIndicators);

    if (accessibility.fontSize !== 16) {
      root.style.fontSize = `${accessibility.fontSize}px`;
    }
  }

  /**
   * Schedule auto-save
   */
  private scheduleAutoSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(() => {
      if (
        this.state.hasUnsavedChanges &&
        this.state.preferences.advanced.autoSave
      ) {
        // Auto-save would need userId - this is just a placeholder
        console.log('Auto-save triggered');
      }
    }, 2000);
  }

  /**
   * Check if two preference objects are equal
   */
  private arePreferencesEqual(
    prefs1: UserPreferences,
    prefs2: UserPreferences
  ): boolean {
    return JSON.stringify(prefs1) === JSON.stringify(prefs2);
  }

  /**
   * Get categories that have changed
   */
  private getChangedCategories(): string[] {
    const categories: string[] = [];
    const keys = Object.keys(
      this.state.preferences
    ) as (keyof UserPreferences)[];

    keys.forEach((key) => {
      if (
        JSON.stringify(this.state.preferences[key]) !==
        JSON.stringify(this.state.originalPreferences[key])
      ) {
        categories.push(key);
      }
    });

    return categories;
  }

  /**
   * Validate preferences structure
   */
  private validatePreferences(prefs: any): boolean {
    const defaultStructure = this.getDefaultPreferences();

    try {
      // Basic structure validation
      const requiredKeys = Object.keys(defaultStructure);
      return requiredKeys.every((key) => prefs.hasOwnProperty(key));
    } catch (error) {
      return false;
    }
  }

  /**
   * Get preference by path
   */
  getPreferenceByPath(path: string): any {
    const keys = path.split('.');
    let current: any = this.state.preferences;

    for (const key of keys) {
      current = current?.[key];
    }

    return current;
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.state.error = null;
  }

  /**
   * Get current state
   */
  getState(): PreferencesState {
    return { ...this.state };
  }

  /**
   * Track preferences events
   */
  private trackPreferencesEvent(
    event: string,
    properties?: Record<string, any>
  ): void {
    try {
      if (typeof window !== 'undefined' && (window as any).analytics) {
        (window as any).analytics.track('Preferences', {
          event,
          timestamp: new Date().toISOString(),
          ...properties,
        });
      }
    } catch (error) {
      console.error('Error tracking preferences event:', error);
    }
  }

  /**
   * Get available theme options
   */
  getThemeOptions(): Array<{
    id: string;
    name: string;
    description: string;
    colors: string[];
  }> {
    return [
      {
        id: 'brand',
        name: 'Maula AI',
        description: 'Our signature brand colors',
        colors: ['#3B82F6', '#8B5CF6', '#06B6D4'],
      },
      {
        id: 'blue',
        name: 'Ocean Blue',
        description: 'Calming blue tones',
        colors: ['#3B82F6', '#1E40AF', '#1E3A8A'],
      },
      {
        id: 'green',
        name: 'Forest Green',
        description: 'Natural green palette',
        colors: ['#10B981', '#047857', '#064E3B'],
      },
      {
        id: 'purple',
        name: 'Royal Purple',
        description: 'Elegant purple shades',
        colors: ['#8B5CF6', '#7C3AED', '#5B21B6'],
      },
      {
        id: 'orange',
        name: 'Sunset Orange',
        description: 'Warm orange gradient',
        colors: ['#F97316', '#EA580C', '#C2410C'],
      },
      {
        id: 'red',
        name: 'Ruby Red',
        description: 'Bold red accents',
        colors: ['#EF4444', '#DC2626', '#B91C1C'],
      },
    ];
  }

  /**
   * Get available languages
   */
  getLanguageOptions(): Array<{
    code: string;
    name: string;
    nativeName: string;
    flag: string;
  }> {
    return [
      { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
      { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
      { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
      { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
      { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
      { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
      { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
      { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
      { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
      { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
    ];
  }

  /**
   * Cleanup on unmount
   */
  cleanup(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
  }
}

// Export singleton instance
export const preferencesLogic = new PreferencesLogic();

// Export utility functions
export const preferencesUtils = {
  /**
   * Format notification frequency
   */
  formatFrequency(frequency: string): string {
    const map = {
      immediate: 'Immediately',
      daily: 'Daily digest',
      weekly: 'Weekly summary',
      monthly: 'Monthly report',
    };
    return map[frequency as keyof typeof map] || frequency;
  },

  /**
   * Get timezone display name
   */
  getTimezoneDisplay(timezone: string): string {
    try {
      return new Intl.DateTimeFormat('en', {
        timeZone: timezone,
        timeZoneName: 'long',
      }).formatToParts()[0].value;
    } catch {
      return timezone;
    }
  },

  /**
   * Validate color hex code
   */
  isValidColor(color: string): boolean {
    return /^#([0-9A-F]{3}){1,2}$/i.test(color);
  },
};
