/**
 * Security Settings Logic - Dashboard Module
 * Handles security configurations, 2FA, device management, and password changes
 */

export interface SecurityState {
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  success: boolean;
  twoFactorEnabled: boolean;
  showQRCode: boolean;
  showBackupCodes: boolean;
  verifying2FA: boolean;
  trustedDevices: TrustedDevice[];
  loginHistory: LoginHistoryItem[];
  securityScore: number;
  recommendations: SecurityRecommendation[];
}

export interface TrustedDevice {
  id: string;
  name: string;
  type: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  location: string;
  lastSeen: string;
  current: boolean;
  trusted: boolean;
}

export interface LoginHistoryItem {
  id: string;
  date: string;
  location: string;
  device: string;
  browser: string;
  ip: string;
  status: 'success' | 'failed' | 'blocked';
  suspicious: boolean;
}

export interface SecurityRecommendation {
  id: string;
  type: 'warning' | 'info' | 'success';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  action?: string;
  completed: boolean;
}

export interface TwoFactorSetup {
  qrCodeUrl: string;
  secret: string;
  backupCodes: string[];
  verificationCode?: string;
}

export interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface SecuritySettings {
  twoFactorAuth: {
    enabled: boolean;
    method: 'app' | 'sms' | 'email';
    backupCodes: number;
  };
  sessionManagement: {
    timeout: number; // minutes
    multipleLogins: boolean;
    logoutAllDevices: boolean;
  };
  loginAlerts: {
    newDevice: boolean;
    suspiciousActivity: boolean;
    passwordChanges: boolean;
    email: boolean;
    sms: boolean;
  };
  privacy: {
    activityLogging: boolean;
    shareUsageData: boolean;
    publicProfile: boolean;
  };
}

export class SecurityLogic {
  private state: SecurityState;

  constructor() {
    this.state = {
      isLoading: false,
      isSaving: false,
      error: null,
      success: false,
      twoFactorEnabled: false,
      showQRCode: false,
      showBackupCodes: false,
      verifying2FA: false,
      trustedDevices: [],
      loginHistory: [],
      securityScore: 0,
      recommendations: [],
    };
  }

  /**
   * Initialize security data
   */
  async initialize(userId: string): Promise<void> {
    this.state.isLoading = true;
    this.state.error = null;

    try {
      const [securityData, devicesData, historyData] = await Promise.all([
        this.fetchSecuritySettings(userId),
        this.fetchTrustedDevices(userId),
        this.fetchLoginHistory(userId),
      ]);

      this.state.twoFactorEnabled = securityData.twoFactor?.enabled || false;
      this.state.trustedDevices = devicesData || [];
      this.state.loginHistory = historyData || [];
      this.state.securityScore = this.calculateSecurityScore();
      this.state.recommendations = this.generateRecommendations();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load security data';
      this.state.error = message;
    } finally {
      this.state.isLoading = false;
    }
  }

  /**
   * Fetch security settings from API
   */
  private async fetchSecuritySettings(userId: string): Promise<any> {
    const response = await fetch(`/api/user/security/${userId}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to fetch security settings');
    }
    const data = await response.json();
    return data.user || {};
  }

  /**
   * Fetch trusted devices
   */
  private async fetchTrustedDevices(userId: string): Promise<TrustedDevice[]> {
    try {
      const response = await fetch(`/api/user/security/devices/${userId}`, {
        credentials: 'include',
      });
      if (!response.ok) return [];
      const data = await response.json();
      return data.devices || [];
    } catch (error) {
      console.error('Error fetching trusted devices:', error);
      return [];
    }
  }

  /**
   * Fetch login history
   */
  private async fetchLoginHistory(userId: string): Promise<LoginHistoryItem[]> {
    try {
      const response = await fetch(
        `/api/user/security/login-history/${userId}`,
        {
          credentials: 'include',
        }
      );
      if (!response.ok) return [];
      const data = await response.json();
      return data.loginHistory || [];
    } catch (error) {
      console.error('Error fetching login history:', error);
      return [];
    }
  }

  /**
   * Change password
   */
  async changePassword(
    userId: string,
    passwordData: PasswordChangeData
  ): Promise<void> {
    // Validate password data
    const validationError = this.validatePasswordChange(passwordData);
    if (validationError) {
      throw new Error(validationError);
    }

    this.state.isSaving = true;
    this.state.error = null;

    try {
      const response = await fetch('/api/user/security/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId,
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to change password');
      }

      this.state.success = true;
      this.trackSecurityEvent('password_changed');

      // Clear success message after 3 seconds
      setTimeout(() => {
        this.state.success = false;
      }, 3000);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to change password';
      this.state.error = message;
      this.trackSecurityEvent('password_change_failed', { error: message });
      throw new Error(message);
    } finally {
      this.state.isSaving = false;
    }
  }

  /**
   * Setup two-factor authentication
   */
  async setupTwoFactor(userId: string): Promise<TwoFactorSetup> {
    this.state.isSaving = true;
    this.state.error = null;

    try {
      const response = await fetch('/api/user/security/2fa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to setup 2FA');
      }

      this.state.showQRCode = true;
      this.trackSecurityEvent('2fa_setup_initiated');

      return {
        qrCodeUrl: data.qrCodeUrl,
        secret: data.secret,
        backupCodes: data.backupCodes || [],
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to setup 2FA';
      this.state.error = message;
      throw new Error(message);
    } finally {
      this.state.isSaving = false;
    }
  }

  /**
   * Verify and enable two-factor authentication
   */
  async verifyAndEnable2FA(
    userId: string,
    verificationCode: string,
    secret: string
  ): Promise<string[]> {
    this.state.verifying2FA = true;
    this.state.error = null;

    try {
      const response = await fetch('/api/user/security/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId,
          verificationCode,
          secret,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Invalid verification code');
      }

      this.state.twoFactorEnabled = true;
      this.state.showQRCode = false;
      this.state.showBackupCodes = true;
      this.state.success = true;

      this.trackSecurityEvent('2fa_enabled');
      this.updateSecurityScore();

      return data.backupCodes || [];
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to verify 2FA';
      this.state.error = message;
      throw new Error(message);
    } finally {
      this.state.verifying2FA = false;
    }
  }

  /**
   * Disable two-factor authentication
   */
  async disable2FA(userId: string, password: string): Promise<void> {
    this.state.isSaving = true;
    this.state.error = null;

    try {
      const response = await fetch('/api/user/security/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to disable 2FA');
      }

      this.state.twoFactorEnabled = false;
      this.state.success = true;

      this.trackSecurityEvent('2fa_disabled');
      this.updateSecurityScore();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to disable 2FA';
      this.state.error = message;
      throw new Error(message);
    } finally {
      this.state.isSaving = false;
    }
  }

  /**
   * Remove trusted device
   */
  async removeTrustedDevice(userId: string, deviceId: string): Promise<void> {
    this.state.isSaving = true;
    this.state.error = null;

    try {
      const response = await fetch(`/api/user/security/devices/${deviceId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to remove device');
      }

      // Remove device from local state
      this.state.trustedDevices = this.state.trustedDevices.filter(
        (device) => device.id !== deviceId
      );

      this.state.success = true;
      this.trackSecurityEvent('device_removed', { deviceId });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to remove device';
      this.state.error = message;
      throw new Error(message);
    } finally {
      this.state.isSaving = false;
    }
  }

  /**
   * Log out all other sessions
   */
  async logoutAllSessions(userId: string): Promise<void> {
    this.state.isSaving = true;
    this.state.error = null;

    try {
      const response = await fetch('/api/user/security/logout-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to logout all sessions');
      }

      this.state.success = true;
      this.trackSecurityEvent('logout_all_sessions');

      // Refresh trusted devices
      await this.fetchTrustedDevices(userId);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to logout all sessions';
      this.state.error = message;
      throw new Error(message);
    } finally {
      this.state.isSaving = false;
    }
  }

  /**
   * Generate new backup codes
   */
  async generateBackupCodes(
    userId: string,
    password: string
  ): Promise<string[]> {
    this.state.isSaving = true;
    this.state.error = null;

    try {
      const response = await fetch('/api/user/security/2fa/backup-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to generate backup codes');
      }

      this.state.success = true;
      this.trackSecurityEvent('backup_codes_generated');

      return data.backupCodes || [];
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to generate backup codes';
      this.state.error = message;
      throw new Error(message);
    } finally {
      this.state.isSaving = false;
    }
  }

  /**
   * Validate password change data
   */
  private validatePasswordChange(data: PasswordChangeData): string | null {
    if (!data.currentPassword) {
      return 'Current password is required';
    }

    if (!data.newPassword) {
      return 'New password is required';
    }

    if (data.newPassword.length < 8) {
      return 'New password must be at least 8 characters long';
    }

    if (data.newPassword === data.currentPassword) {
      return 'New password must be different from current password';
    }

    if (data.newPassword !== data.confirmPassword) {
      return 'Password confirmation does not match';
    }

    // Additional password strength checks
    if (!/(?=.*[a-z])/.test(data.newPassword)) {
      return 'Password must contain at least one lowercase letter';
    }

    if (!/(?=.*[A-Z])/.test(data.newPassword)) {
      return 'Password must contain at least one uppercase letter';
    }

    if (!/(?=.*\d)/.test(data.newPassword)) {
      return 'Password must contain at least one number';
    }

    return null;
  }

  /**
   * Calculate security score
   */
  private calculateSecurityScore(): number {
    let score = 0;

    // Base security measures
    score += 20; // Account exists

    // Two-factor authentication
    if (this.state.twoFactorEnabled) {
      score += 25;
    }

    // Recent login activity (not too old, not too frequent)
    const recentLogins = this.state.loginHistory.filter((login) => {
      const loginDate = new Date(login.date);
      const daysSinceLogin =
        (Date.now() - loginDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceLogin <= 30 && login.status === 'success';
    });

    if (recentLogins.length > 0 && recentLogins.length <= 10) {
      score += 15;
    }

    // Trusted devices (reasonable number)
    if (
      this.state.trustedDevices.length > 0 &&
      this.state.trustedDevices.length <= 5
    ) {
      score += 15;
    }

    // No failed login attempts recently
    const recentFailures = this.state.loginHistory.filter((login) => {
      const loginDate = new Date(login.date);
      const daysSinceLogin =
        (Date.now() - loginDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceLogin <= 7 && login.status === 'failed';
    });

    if (recentFailures.length === 0) {
      score += 10;
    }

    // No suspicious activity
    const suspiciousActivity = this.state.loginHistory.some(
      (login) => login.suspicious
    );
    if (!suspiciousActivity) {
      score += 15;
    }

    return Math.min(score, 100);
  }

  /**
   * Generate security recommendations
   */
  private generateRecommendations(): SecurityRecommendation[] {
    const recommendations: SecurityRecommendation[] = [];

    if (!this.state.twoFactorEnabled) {
      recommendations.push({
        id: 'enable-2fa',
        type: 'warning',
        title: 'Enable Two-Factor Authentication',
        description: 'Add an extra layer of security to your account with 2FA',
        priority: 'high',
        action: 'Enable 2FA',
        completed: false,
      });
    }

    // Check for suspicious login activity
    const suspiciousLogins = this.state.loginHistory.filter(
      (login) => login.suspicious
    );
    if (suspiciousLogins.length > 0) {
      recommendations.push({
        id: 'review-activity',
        type: 'warning',
        title: 'Review Suspicious Activity',
        description: 'We detected some unusual login activity on your account',
        priority: 'critical',
        action: 'Review Activity',
        completed: false,
      });
    }

    // Check for too many trusted devices
    if (this.state.trustedDevices.length > 10) {
      recommendations.push({
        id: 'cleanup-devices',
        type: 'info',
        title: 'Clean Up Trusted Devices',
        description:
          'You have many trusted devices. Consider removing unused ones',
        priority: 'medium',
        action: 'Manage Devices',
        completed: false,
      });
    }

    // Check password age (would need additional data from API)
    recommendations.push({
      id: 'change-password',
      type: 'info',
      title: 'Update Your Password',
      description:
        'Consider changing your password regularly for better security',
      priority: 'low',
      action: 'Change Password',
      completed: false,
    });

    return recommendations;
  }

  /**
   * Update security score
   */
  private updateSecurityScore(): void {
    this.state.securityScore = this.calculateSecurityScore();
    this.state.recommendations = this.generateRecommendations();
  }

  /**
   * Get password strength
   */
  getPasswordStrength(password: string): {
    score: number;
    label: string;
    color: string;
    suggestions: string[];
  } {
    let score = 0;
    const suggestions: string[] = [];

    if (password.length >= 8) score += 1;
    else suggestions.push('Use at least 8 characters');

    if (password.length >= 12) score += 1;
    else if (password.length >= 8)
      suggestions.push('Use 12+ characters for better security');

    if (/[a-z]/.test(password)) score += 1;
    else suggestions.push('Add lowercase letters');

    if (/[A-Z]/.test(password)) score += 1;
    else suggestions.push('Add uppercase letters');

    if (/\d/.test(password)) score += 1;
    else suggestions.push('Add numbers');

    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    else suggestions.push('Add special characters');

    const labels = [
      'Very Weak',
      'Weak',
      'Fair',
      'Good',
      'Strong',
      'Very Strong',
    ];
    const colors = [
      '#ef4444',
      '#f97316',
      '#eab308',
      '#22c55e',
      '#16a34a',
      '#15803d',
    ];

    return {
      score,
      label: labels[score] || 'Very Weak',
      color: colors[score] || '#ef4444',
      suggestions,
    };
  }

  /**
   * Format device info
   */
  formatDeviceInfo(device: TrustedDevice): string {
    return `${device.name} - ${device.browser} on ${device.os}`;
  }

  /**
   * Format login time
   */
  formatLoginTime(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (error) {
      return dateString;
    }
  }

  /**
   * Get login status color
   */
  getLoginStatusColor(status: string): string {
    const colors = {
      success: '#10B981',
      failed: '#EF4444',
      blocked: '#F59E0B',
    };
    return colors[status as keyof typeof colors] || '#6B7280';
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
  getState(): SecurityState {
    return { ...this.state };
  }

  /**
   * Track security events
   */
  private trackSecurityEvent(
    event: string,
    properties?: Record<string, any>
  ): void {
    try {
      if (typeof window !== 'undefined' && (window as any).analytics) {
        (window as any).analytics.track('Security', {
          event,
          timestamp: new Date().toISOString(),
          ...properties,
        });
      }
    } catch (error) {
      console.error('Error tracking security event:', error);
    }
  }

  /**
   * Export security report
   */
  exportSecurityReport(): void {
    const report = {
      generatedAt: new Date().toISOString(),
      securityScore: this.state.securityScore,
      twoFactorEnabled: this.state.twoFactorEnabled,
      trustedDevicesCount: this.state.trustedDevices.length,
      loginHistoryCount: this.state.loginHistory.length,
      recommendations: this.state.recommendations,
      recentSuspiciousActivity: this.state.loginHistory.filter(
        (login) => login.suspicious
      ).length,
    };

    const dataStr = JSON.stringify(report, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `security-report-${
      new Date().toISOString().split('T')[0]
    }.json`;
    link.click();

    this.trackSecurityEvent('security_report_exported');
  }

  /**
   * Show QR code modal
   */
  showQRCodeModal(): void {
    this.state.showQRCode = true;
  }

  /**
   * Hide QR code modal
   */
  hideQRCodeModal(): void {
    this.state.showQRCode = false;
  }

  /**
   * Show backup codes modal
   */
  showBackupCodesModal(): void {
    this.state.showBackupCodes = true;
  }

  /**
   * Hide backup codes modal
   */
  hideBackupCodesModal(): void {
    this.state.showBackupCodes = false;
  }
}

// Export singleton instance
export const securityLogic = new SecurityLogic();

// Export utility functions
export const securityUtils = {
  /**
   * Generate QR code URL for 2FA setup
   */
  generateQRCodeUrl(
    email: string,
    secret: string,
    issuer: string = 'MaulaAI'
  ): string {
    const otpauthUrl = `otpauth://totp/${issuer}:${email}?secret=${secret}&issuer=${issuer}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
      otpauthUrl
    )}`;
  },

  /**
   * Get security score color
   */
  getSecurityScoreColor(score: number): string {
    if (score >= 90) return '#10B981'; // Green
    if (score >= 70) return '#F59E0B'; // Yellow
    if (score >= 50) return '#F97316'; // Orange
    return '#EF4444'; // Red
  },

  /**
   * Get security score label
   */
  getSecurityScoreLabel(score: number): string {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Needs Improvement';
  },

  /**
   * Validate verification code format
   */
  isValidVerificationCode(code: string): boolean {
    return /^\d{6}$/.test(code);
  },
};
