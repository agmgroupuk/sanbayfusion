'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  ShieldCheckIcon,
  KeyIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowDownTrayIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';
import Image from 'next/image';

type Recommendation = {
  id: string | number;
  type?: string;
  title: string;
  description?: string;
  priority?: 'high' | 'medium' | 'low';
};

type TrustedDevice = {
  id: string;
  name: string;
  type: string;
  lastSeen: string;
  location: string;
  browser: string;
  current: boolean;
  ipAddress?: string;
};

type ActiveSession = {
  id: string;
  createdAt: string;
  lastActivity: string;
  ipAddress: string;
  userAgent: string;
  isCurrent: boolean;
  browser?: string;
  device?: string;
  location?: string;
};

type LoginHistoryEntry = {
  id: string;
  date: string;
  device: string;
  location: string;
  status: string;
  ip: string;
};

type SecurityOverview = {
  securityScore: number;
  recommendations: Recommendation[];
  lastPasswordChange: string;
  twoFactorSecret?: string;
};

export default function SecuritySettingsPage() {
  const { state } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [fetchState, setFetchState] = useState({ loading: true, error: '' });

  // Password change fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 2FA data
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifying2FA, setVerifying2FA] = useState(false);
  const [setting2FA, setSetting2FA] = useState(false);

  // Device, session, and history data
  const [trustedDevices, setTrustedDevices] = useState<TrustedDevice[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([]);
  const [securityOverview, setSecurityOverview] =
    useState<SecurityOverview | null>(null);
  const [showLoginHistory, setShowLoginHistory] = useState(false);

  const defaultRecommendations: Recommendation[] = [
    {
      id: 'enable-2fa',
      type: 'warning',
      title: 'Enable Two-Factor Authentication',
      description: 'Secure your account with 2FA for better protection',
      priority: 'high',
    },
  ];

  const normalizeDevices = useCallback((devices: any): TrustedDevice[] => {
    const arr = Array.isArray(devices) ? devices : [];
    return arr.map((device, index) => ({
      id: String(device.id ?? device._id ?? index),
      name:
        device.name || device.deviceName || device.model || 'Unknown Device',
      type: device.type || device.deviceType || 'desktop',
      lastSeen: device.lastSeen || device.updatedAt || new Date().toISOString(),
      location: device.location || device.geoLocation || 'Unknown location',
      browser: device.browser || device.userAgent || 'Unknown browser',
      current: Boolean(device.current ?? device.isCurrent ?? false),
      ipAddress: device.ipAddress || device.ip || '',
    }));
  }, []);

  const normalizeSessions = useCallback((sessions: any): ActiveSession[] => {
    const arr = Array.isArray(sessions) ? sessions : [];
    return arr.map((session, index) => ({
      id: String(session.id ?? session._id ?? index),
      createdAt: session.createdAt || new Date().toISOString(),
      lastActivity:
        session.lastActivity || session.updatedAt || new Date().toISOString(),
      ipAddress: session.ipAddress || session.ip || 'Unknown',
      userAgent: session.userAgent || 'Unknown',
      isCurrent: Boolean(session.isCurrent ?? false),
      browser: detectBrowser(session.userAgent || ''),
      device: detectDevice(session.userAgent || ''),
      location: session.location || 'Current Session',
    }));
  }, []);

  const normalizeLoginHistory = useCallback((history: any): LoginHistoryEntry[] => {
    const arr = Array.isArray(history) ? history : [];
    return arr.map((entry, index) => ({
      id: String(entry.id ?? entry._id ?? index),
      date: entry.date || entry.timestamp || new Date().toISOString(),
      device: entry.device || entry.deviceName || 'Unknown Device',
      location: entry.location || 'Unknown location',
      status: entry.status || (entry.success === false ? 'blocked' : 'success'),
      ip: entry.ip || entry.ipAddress || '—',
    }));
  }, []);

  function detectBrowser(userAgent: string): string {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome'))
      return 'Safari';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown Browser';
  }

  function detectDevice(userAgent: string): string {
    if (userAgent.includes('iPhone')) return 'iPhone';
    if (userAgent.includes('iPad')) return 'iPad';
    if (userAgent.includes('Android')) return 'Android Device';
    if (userAgent.includes('Macintosh')) return 'Mac';
    if (userAgent.includes('Windows')) return 'Windows PC';
    if (userAgent.includes('Linux')) return 'Linux Computer';
    return 'Computer';
  }

  const fetchSecurityData = useCallback(
    async (options?: { signal?: AbortSignal; silent?: boolean }) => {
      if (!state.user?.id) return;

      if (!options?.silent) {
        setFetchState({ loading: true, error: '' });
      }

      try {
        const res = await fetch(`/api/user/security/${state.user.id}`, {
          credentials: 'include',
          signal: options?.signal,
        });

        if (!res.ok) {
          throw new Error('Unable to load security settings at the moment');
        }

        const payload = await res.json();
        const data = payload.data || payload.security || payload;

        setSecurityOverview({
          securityScore: data?.securityScore ?? 0,
          recommendations: data?.recommendations ?? [],
          lastPasswordChange:
            data?.passwordLastChanged ||
            data?.lastPasswordChange ||
            new Date().toISOString(),
          twoFactorSecret: data?.twoFactorSecret || '',
        });

        setTwoFactorEnabled(Boolean(data?.twoFactorEnabled));
        setBackupCodes(data?.backupCodes ?? []);
        setTrustedDevices(normalizeDevices(data?.trustedDevices));
        setActiveSessions(normalizeSessions(data?.activeSessions));
        setLoginHistory(normalizeLoginHistory(data?.loginHistory));
        setFetchState({ loading: false, error: '' });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError')
          return;
        console.error('Error fetching security data:', error);
        setFetchState({
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : 'Unable to load security settings',
        });
      }
    },
    [state.user?.id, normalizeDevices, normalizeSessions, normalizeLoginHistory]
  );

  useEffect(() => {
    if (!state.user?.id) return;
    const controller = new AbortController();
    fetchSecurityData({ signal: controller.signal });
    return () => controller.abort();
  }, [state.user?.id, fetchSecurityData]);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage({ type: 'error', text: 'Please fill in all password fields' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    if (newPassword.length < 8) {
      setMessage({
        type: 'error',
        text: 'Password must be at least 8 characters',
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/user/security/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Password changed successfully' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        fetchSecurityData({ silent: true });
      } else {
        setMessage({
          type: 'error',
          text: data.message || 'Failed to change password',
        });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error changing password' });
    }
    setLoading(false);
  };

  const handleSetup2FA = async () => {
    setSetting2FA(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/user/security/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      const data = await res.json();

      if (data.success || data.qrCode) {
        setQrCodeUrl(data.qrCode);
        setBackupCodes(data.backupCodes || []);
        setShowQRCode(true);
        setVerifying2FA(true);
        setMessage({
          type: 'info',
          text: 'Scan the QR code with your authenticator app, then enter the 6-digit code below',
        });
      } else {
        setMessage({
          type: 'error',
          text: data.message || 'Failed to setup 2FA',
        });
        setSetting2FA(false);
      }
    } catch (error) {
      console.error('Error setting up 2FA:', error);
      setMessage({ type: 'error', text: 'Error setting up 2FA' });
      setSetting2FA(false);
    }
  };

  const handleToggle2FA = async (enabled: boolean) => {
    if (enabled) {
      handleSetup2FA();
    } else {
      const password = prompt('Please enter your password to disable 2FA:');
      if (!password) {
        setMessage({ type: 'error', text: 'Password required to disable 2FA' });
        return;
      }

      try {
        const res = await fetch('/api/user/security/2fa/disable', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ password }),
        });

        const data = await res.json();

        if (data.success) {
          setTwoFactorEnabled(false);
          setShowQRCode(false);
          setShowBackupCodes(false);
          setQrCodeUrl('');
          setBackupCodes([]);
          setVerifying2FA(false);
          setSetting2FA(false);
          setVerificationCode('');
          setMessage({ type: 'success', text: '2FA has been disabled' });
          fetchSecurityData({ silent: true });
        } else {
          setMessage({
            type: 'error',
            text: data.message || 'Failed to disable 2FA',
          });
        }
      } catch (error) {
        console.error('Error disabling 2FA:', error);
        setMessage({ type: 'error', text: 'Error disabling 2FA' });
      }
    }
  };

  const handleVerify2FACode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setMessage({ type: 'error', text: 'Please enter a valid 6-digit code' });
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/user/security/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: verificationCode }),
      });

      const data = await res.json();

      if (data.success) {
        setTwoFactorEnabled(true);
        setVerifying2FA(false);
        setSetting2FA(false);
        setShowBackupCodes(true);
        if (data.backupCodes) {
          setBackupCodes(data.backupCodes);
        }
        setMessage({
          type: 'success',
          text: '2FA has been enabled successfully!',
        });
        setVerificationCode('');
        fetchSecurityData({ silent: true });
      } else {
        setMessage({
          type: 'error',
          text: data.message || 'Invalid verification code',
        });
      }
    } catch (error) {
      console.error('Error verifying 2FA code:', error);
      setMessage({ type: 'error', text: 'Error verifying code' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel2FASetup = () => {
    setVerifying2FA(false);
    setSetting2FA(false);
    setShowQRCode(false);
    setQrCodeUrl('');
    setVerificationCode('');
    setMessage({ type: '', text: '' });
  };

  const handleDownloadBackupCodes = () => {
    if (backupCodes.length === 0) return;

    const content = `Maula AI - Two-Factor Authentication Backup Codes
================================================
Generated: ${new Date().toLocaleString()}
Account: ${state.user?.email || 'Unknown'}

IMPORTANT: Store these codes in a safe place.
Each code can only be used once.

Your Backup Codes:
------------------
${backupCodes.map((code, i) => `${i + 1}. ${code}`).join('\n')}

------------------
If you lose access to your authenticator app,
use one of these codes to sign in.
`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maula-ai-backup-codes-${
      new Date().toISOString().split('T')[0]
    }.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setMessage({ type: 'success', text: 'Backup codes downloaded!' });
  };

  const handleCopyBackupCodes = async () => {
    if (backupCodes.length === 0) return;

    const codesText = backupCodes.join('\n');
    try {
      await navigator.clipboard.writeText(codesText);
      setMessage({
        type: 'success',
        text: 'Backup codes copied to clipboard!',
      });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to copy codes' });
    }
  };

  const handleRegenerateBackupCodes = async () => {
    const password = prompt('Enter your password to regenerate backup codes:');
    if (!password) {
      setMessage({ type: 'error', text: 'Password is required' });
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/user/security/2fa/backup-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (data.success && data.backupCodes) {
        setBackupCodes(data.backupCodes);
        setMessage({
          type: 'success',
          text: 'Backup codes regenerated! Please save them in a safe place.',
        });
      } else {
        setMessage({
          type: 'error',
          text: data.message || 'Failed to regenerate backup codes',
        });
      }
    } catch (error) {
      console.error('Error regenerating backup codes:', error);
      setMessage({ type: 'error', text: 'Error regenerating backup codes' });
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (
      sessionId === 'current' ||
      activeSessions.find((s) => s.id === sessionId)?.isCurrent
    ) {
      setMessage({ type: 'error', text: 'Cannot revoke current session' });
      return;
    }

    if (!confirm('Are you sure you want to end this session?')) return;

    try {
      const res = await fetch(`/api/user/security/${state.user?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          activeSessions: activeSessions.filter((s) => s.id !== sessionId),
        }),
      });

      if (res.ok) {
        setActiveSessions((prev) => prev.filter((s) => s.id !== sessionId));
        setMessage({ type: 'success', text: 'Session ended successfully' });
      } else {
        setMessage({ type: 'error', text: 'Failed to end session' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error ending session' });
    }
  };

  const handleRevokeAllSessions = async () => {
    if (!confirm('This will log you out from all other devices. Continue?'))
      return;

    try {
      const currentSession = activeSessions.find((s) => s.isCurrent);
      const res = await fetch(`/api/user/security/${state.user?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          activeSessions: currentSession ? [currentSession] : [],
        }),
      });

      if (res.ok) {
        setActiveSessions(currentSession ? [currentSession] : []);
        setMessage({
          type: 'success',
          text: 'All other sessions have been ended',
        });
      } else {
        setMessage({ type: 'error', text: 'Failed to end sessions' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error ending sessions' });
    }
  };

  const handleRemoveDevice = async (deviceId: string) => {
    if (!state.user?.id) return;
    if (!confirm('Are you sure you want to remove this device?')) return;

    try {
      const updatedDevices = trustedDevices.filter((d) => d.id !== deviceId);
      const res = await fetch(`/api/user/security/${state.user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ trustedDevices: updatedDevices }),
      });

      if (res.ok) {
        setTrustedDevices(updatedDevices);
        setMessage({ type: 'success', text: 'Device removed successfully' });
      } else {
        setMessage({ type: 'error', text: 'Failed to remove device' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error removing device' });
    }
  };

  const handleRemoveAllDevices = async () => {
    if (!state.user?.id) return;
    if (
      !confirm(
        'Remove all trusted devices? This will require re-trusting each device.'
      )
    )
      return;

    try {
      const res = await fetch(`/api/user/security/${state.user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ trustedDevices: [] }),
      });

      if (res.ok) {
        setTrustedDevices([]);
        setMessage({ type: 'success', text: 'All trusted devices removed' });
      } else {
        setMessage({ type: 'error', text: 'Unable to remove devices' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error removing devices' });
    }
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '—';
    const parsed = new Date(dateString);
    if (Number.isNaN(parsed.getTime())) return '—';
    return parsed.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    const parsed = new Date(dateString);
    if (Number.isNaN(parsed.getTime())) return '—';
    return parsed.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile':
      case 'tablet':
        return <DevicePhoneMobileIcon className="w-5 h-5" />;
      default:
        return <ComputerDesktopIcon className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-900/20';
      case 'blocked':
        return 'text-red-600 bg-red-900/20';
      default:
        return 'text-yellow-600 bg-yellow-900/20';
    }
  };

  const securityScore = securityOverview?.securityScore ?? 0;
  const recommendations = securityOverview?.recommendations?.length
    ? securityOverview.recommendations
    : defaultRecommendations;
  const lastPasswordChange = securityOverview?.lastPasswordChange;

  return (
    <div className="min-h-screen bg-[#030304]">
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
            <ShieldCheckIcon className="w-10 h-10 text-cyan-400" />
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
            <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Security Settings</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed mb-8">
            Manage your account security and privacy settings
          </p>
          <div className="flex justify-center gap-3 flex-wrap mb-8">
            <span className="px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm font-mono">SECURITY</span>
            <span className="px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-sm font-mono">PROTECTED</span>
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

      {/* Security Content */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-16">
          {fetchState.error && (
            <div className="mb-6 rounded-xl border border-red-500/30 bg-red-900/20 px-4 py-3 text-red-300">
              <div className="flex items-center justify-between">
                <p>{fetchState.error}</p>
                <button
                  className="text-sm font-medium underline"
                  onClick={() => fetchSecurityData()}
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {fetchState.loading && !fetchState.error && (
            <div className="mb-6 rounded-xl border border-purple-500/30 bg-purple-900/20/70 px-4 py-3 text-purple-300">
              Syncing your latest security activity...
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Security Score */}
            <div className="lg:col-span-1">
              <div className="relative rounded-2xl p-6 bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm text-center overflow-hidden">
                {/* Corner Accents */}
                <div className="absolute top-3 right-3 w-6 h-6 border-t border-r border-white/[0.06] rounded-tr-lg" />
                <div className="absolute bottom-3 left-3 w-6 h-6 border-b border-l border-white/[0.06] rounded-bl-lg" />
                <div className="relative w-24 h-24 mx-auto mb-4">
                  <svg className="w-24 h-24 transform -rotate-90">
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className="text-gray-200"
                    />
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={`${2 * Math.PI * 40}`}
                      strokeDashoffset={`${
                        2 * Math.PI * 40 * (1 - securityScore / 100)
                      }`}
                      className="text-purple-400"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">
                      {securityScore}%
                    </span>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-white mb-2">
                  Security Score
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  Your account security rating
                </p>

                <div className="space-y-2 text-left">
                  {recommendations.map((rec) => (
                    <div
                      key={rec.id}
                      className={`p-3 rounded-lg ${
                        rec.priority === 'high' ? 'bg-red-900/20' : 'bg-yellow-900/20'
                      }`}
                    >
                      <div className="flex items-center">
                        <ExclamationTriangleIcon
                          className={`w-4 h-4 mr-2 flex-shrink-0 ${
                            rec.priority === 'high'
                              ? 'text-red-500'
                              : 'text-yellow-500'
                          }`}
                        />
                        <div>
                          <p className="text-xs font-medium text-white">
                            {rec.title}
                          </p>
                          <p className="text-xs text-gray-400">
                            {rec.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Security Settings */}
            <div className="lg:col-span-3">
              <div className="space-y-6">
                {/* Password & Authentication */}
                <div className="relative rounded-2xl p-8 bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden">
                  {/* Corner Accents */}
                  <div className="absolute top-3 right-3 w-6 h-6 border-t border-r border-white/[0.06] rounded-tr-lg" />
                  <div className="absolute bottom-3 left-3 w-6 h-6 border-b border-l border-white/[0.06] rounded-bl-lg" />
                  <div className="flex items-center mb-6">
                    <KeyIcon className="w-6 h-6 text-purple-400 mr-3" />
                    <h3 className="text-xl font-semibold text-white">
                      Password & Authentication
                    </h3>
                  </div>

                  <div className="space-y-6">
                    {/* Change Password */}
                    <div className="border border-white/10 rounded-lg p-6">
                      {message.text && (
                        <div
                          className={`mb-4 p-3 rounded-lg ${
                            message.type === 'success'
                              ? 'bg-green-900/20 text-green-300'
                              : message.type === 'info'
                              ? 'bg-blue-900/20 text-blue-300'
                              : 'bg-red-900/20 text-red-300'
                          }`}
                        >
                          {message.text}
                        </div>
                      )}

                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-medium text-white">
                            Password
                          </h4>
                          <p className="text-sm text-gray-400">
                            Last changed on {formatDate(lastPasswordChange)}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Current Password
                          </label>
                          <div className="relative">
                            <input
                              type={showPassword ? 'text' : 'password'}
                              placeholder="Enter current password"
                              value={currentPassword}
                              onChange={(e) =>
                                setCurrentPassword(e.target.value)
                              }
                              className="w-full p-3 pr-12 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            >
                              {showPassword ? (
                                <EyeSlashIcon className="w-5 h-5 text-gray-400" />
                              ) : (
                                <EyeIcon className="w-5 h-5 text-gray-400" />
                              )}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            New Password
                          </label>
                          <input
                            type="password"
                            placeholder="Enter new password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full p-3 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Confirm Password
                          </label>
                          <input
                            type="password"
                            placeholder="Confirm new password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full p-3 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      <button
                        onClick={handleChangePassword}
                        disabled={loading}
                        className="btn-primary"
                      >
                        {loading ? 'Changing...' : 'Change Password'}
                      </button>
                    </div>

                    {/* Two-Factor Authentication */}
                    <div className="border border-white/10 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-medium text-white">
                            Two-Factor Authentication
                          </h4>
                          <p className="text-sm text-gray-400">
                            Add an extra layer of security to your account
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={twoFactorEnabled}
                            onChange={(e) => handleToggle2FA(e.target.checked)}
                            disabled={verifying2FA || setting2FA}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-[#13131a]200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white/5 after:border-neural-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 peer-disabled:opacity-50"></div>
                        </label>
                      </div>

                      {/* Show QR code when setting up */}
                      {verifying2FA && showQRCode && qrCodeUrl && (
                        <div className="space-y-4 mt-4">
                          <div className="p-6 bg-white/5 border-2 border-purple-200 rounded-lg">
                            <div className="text-center">
                              <div className="bg-white/5 p-4 rounded-lg inline-block mb-4 border border-white/10">
                                <Image
                                  src={qrCodeUrl}
                                  alt="2FA QR Code"
                                  width={256}
                                  height={256}
                                  className="w-64 h-64"
                                />
                              </div>
                              <p className="text-sm text-gray-400 mb-2">
                                Scan this QR code with your authenticator app
                              </p>
                              <p className="text-xs text-gray-500">
                                (Google Authenticator, Authy, Microsoft
                                Authenticator, etc.)
                              </p>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                Enter 6-Digit Verification Code
                              </label>
                              <input
                                type="text"
                                value={verificationCode}
                                onChange={(e) =>
                                  setVerificationCode(
                                    e.target.value
                                      .replace(/\D/g, '')
                                      .slice(0, 6)
                                  )
                                }
                                placeholder="000000"
                                maxLength={6}
                                className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest bg-white/5 border-2 border-white/10 rounded-lg focus:border-purple-primary focus:ring-2 focus:ring-purple-primary/20"
                              />
                            </div>
                            <button
                              onClick={handleVerify2FACode}
                              disabled={
                                loading || verificationCode.length !== 6
                              }
                              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {loading ? 'Verifying...' : 'Verify & Enable 2FA'}
                            </button>
                            <button
                              onClick={handleCancel2FASetup}
                              className="btn-ghost w-full"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Show status when 2FA is enabled */}
                      {twoFactorEnabled && !verifying2FA && (
                        <div className="space-y-4 mt-4">
                          <div className="flex items-center justify-between p-4 bg-green-900/20 rounded-lg">
                            <div className="flex items-center">
                              <CheckCircleIcon className="w-5 h-5 text-green-500 mr-3" />
                              <div>
                                <p className="font-medium text-green-900">
                                  Authenticator App Active
                                </p>
                                <p className="text-sm text-green-400">
                                  {backupCodes.length} backup codes available
                                </p>
                              </div>
                            </div>
                          </div>

                          {backupCodes.length > 0 && (
                            <button
                              onClick={() =>
                                setShowBackupCodes(!showBackupCodes)
                              }
                              className="btn-secondary w-full"
                            >
                              {showBackupCodes ? 'Hide' : 'View'} Backup Codes
                            </button>
                          )}

                          {showBackupCodes && backupCodes.length > 0 && (
                            <div className="p-6 bg-yellow-900/20 rounded-lg">
                              <div className="flex items-start mb-4">
                                <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="font-medium text-yellow-900">
                                    Save these backup codes
                                  </p>
                                  <p className="text-sm text-yellow-400">
                                    Store them in a safe place. Each code can
                                    only be used once.
                                  </p>
                                </div>
                              </div>

                              {/* Backup codes grid with clear visibility */}
                              <div className="grid grid-cols-2 gap-3 bg-white/5 p-4 rounded-lg border border-white/10 mb-4">
                                {backupCodes.map((code, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center justify-between p-3 bg-[#030304] rounded-lg border border-white/10"
                                  >
                                    <span className="text-xs text-gray-500 mr-2">
                                      {index + 1}.
                                    </span>
                                    <code className="text-sm font-mono font-bold text-white tracking-wider select-all">
                                      {code}
                                    </code>
                                  </div>
                                ))}
                              </div>

                              {/* Download and Copy buttons */}
                              <div className="flex gap-3 mb-3">
                                <button
                                  onClick={handleDownloadBackupCodes}
                                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                                >
                                  <ArrowDownTrayIcon className="w-5 h-5" />
                                  Download Codes
                                </button>
                                <button
                                  onClick={handleCopyBackupCodes}
                                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#13131a]100 text-gray-300 rounded-lg hover:bg-[#13131a]200 transition-colors font-medium"
                                >
                                  <DocumentDuplicateIcon className="w-5 h-5" />
                                  Copy All
                                </button>
                              </div>
                              {/* Regenerate Codes Button */}
                              <button
                                onClick={handleRegenerateBackupCodes}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600/20 text-yellow-400 rounded-lg hover:bg-yellow-600/30 transition-colors text-sm"
                              >
                                🔄 Regenerate Backup Codes
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Trusted Devices */}
                <div className="relative rounded-2xl p-8 bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden">
                  {/* Corner Accents */}
                  <div className="absolute top-3 right-3 w-6 h-6 border-t border-r border-white/[0.06] rounded-tr-lg" />
                  <div className="absolute bottom-3 left-3 w-6 h-6 border-b border-l border-white/[0.06] rounded-bl-lg" />
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <ShieldCheckIcon className="w-6 h-6 text-purple-400 mr-3" />
                      <h3 className="text-xl font-semibold text-white">
                        Trusted Devices
                      </h3>
                    </div>
                    {trustedDevices.length > 0 && (
                      <button
                        className="btn-ghost text-red-600"
                        onClick={handleRemoveAllDevices}
                      >
                        Remove All
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    {trustedDevices.length === 0 ? (
                      <div className="text-center py-12">
                        <ShieldCheckIcon className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                        <p className="text-neutral-500">
                          No trusted devices found
                        </p>
                        <p className="text-sm text-neutral-400 mt-1">
                          Devices will appear here after you log in
                        </p>
                      </div>
                    ) : (
                      trustedDevices.map((device) => (
                        <div
                          key={device.id}
                          className={`p-4 border rounded-lg ${
                            device.current
                              ? 'border-purple-200 bg-purple-900/20'
                              : 'border-white/10'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="p-2 bg-[#13131a]100 rounded-lg mr-4">
                                {getDeviceIcon(device.type)}
                              </div>
                              <div>
                                <div className="flex items-center">
                                  <h4 className="font-medium text-white">
                                    {device.name}
                                  </h4>
                                  {device.current && (
                                    <span className="ml-2 px-2 py-1 text-xs bg-purple-900/30 text-purple-400 rounded-full">
                                      Current
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-400">
                                  {device.browser} • {device.location}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Last seen {formatDateTime(device.lastSeen)}
                                </p>
                              </div>
                            </div>
                            {!device.current && (
                              <button
                                onClick={() => handleRemoveDevice(device.id)}
                                className="btn-ghost text-red-600 text-sm"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Active Sessions */}
                <div className="relative rounded-2xl p-8 bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden">
                  {/* Corner Accents */}
                  <div className="absolute top-3 right-3 w-6 h-6 border-t border-r border-white/[0.06] rounded-tr-lg" />
                  <div className="absolute bottom-3 left-3 w-6 h-6 border-b border-l border-white/[0.06] rounded-bl-lg" />
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <ComputerDesktopIcon className="w-6 h-6 text-purple-400 mr-3" />
                      <h3 className="text-xl font-semibold text-white">
                        Active Sessions
                      </h3>
                    </div>
                    {activeSessions.filter((s) => !s.isCurrent).length > 0 && (
                      <button
                        className="btn-ghost text-red-600"
                        onClick={handleRevokeAllSessions}
                      >
                        End All Others
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    {activeSessions.length === 0 ? (
                      <div className="text-center py-12">
                        <ComputerDesktopIcon className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                        <p className="text-neutral-500">No active sessions</p>
                      </div>
                    ) : (
                      activeSessions.map((session) => (
                        <div
                          key={session.id}
                          className={`p-4 border rounded-lg ${
                            session.isCurrent
                              ? 'border-purple-200 bg-purple-900/20'
                              : 'border-white/10'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="p-2 bg-[#13131a]100 rounded-lg mr-4">
                                <ComputerDesktopIcon className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="flex items-center">
                                  <h4 className="font-medium text-white">
                                    {session.browser} • {session.device}
                                  </h4>
                                  {session.isCurrent && (
                                    <span className="ml-2 px-2 py-1 text-xs bg-purple-900/30 text-purple-400 rounded-full">
                                      Current
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-400">
                                  IP: {session.ipAddress}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Last active:{' '}
                                  {formatDateTime(session.lastActivity)}
                                </p>
                              </div>
                            </div>
                            {!session.isCurrent && (
                              <button
                                onClick={() => handleRevokeSession(session.id)}
                                className="btn-ghost text-red-600 text-sm"
                              >
                                End Session
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Login History */}
                <div className="relative rounded-2xl p-8 bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden">
                  {/* Corner Accents */}
                  <div className="absolute top-3 right-3 w-6 h-6 border-t border-r border-white/[0.06] rounded-tr-lg" />
                  <div className="absolute bottom-3 left-3 w-6 h-6 border-b border-l border-white/[0.06] rounded-bl-lg" />
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <ClockIcon className="w-6 h-6 text-purple-400 mr-3" />
                      <h3 className="text-xl font-semibold text-white">
                        Login History
                      </h3>
                    </div>
                    <button
                      onClick={() => setShowLoginHistory(!showLoginHistory)}
                      className="btn-ghost"
                    >
                      {showLoginHistory ? 'Hide' : 'View All'}
                    </button>
                  </div>

                  {showLoginHistory && (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/10">
                            <th className="text-left py-3 text-sm font-medium text-gray-300">
                              Date & Time
                            </th>
                            <th className="text-left py-3 text-sm font-medium text-gray-300">
                              Device
                            </th>
                            <th className="text-left py-3 text-sm font-medium text-gray-300">
                              Location
                            </th>
                            <th className="text-left py-3 text-sm font-medium text-gray-300">
                              Status
                            </th>
                            <th className="text-left py-3 text-sm font-medium text-gray-300">
                              IP Address
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {loginHistory.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-12 text-center">
                                <ClockIcon className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                                <p className="text-neutral-500">
                                  No login history found
                                </p>
                              </td>
                            </tr>
                          ) : (
                            loginHistory.map((login) => (
                              <tr
                                key={login.id}
                                className="border-b border-neural-50"
                              >
                                <td className="py-4 text-sm text-white">
                                  {formatDateTime(login.date)}
                                </td>
                                <td className="py-4 text-sm text-gray-400">
                                  {login.device}
                                </td>
                                <td className="py-4 text-sm text-gray-400">
                                  {login.location}
                                </td>
                                <td className="py-4">
                                  <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                      login.status
                                    )}`}
                                  >
                                    {login.status === 'success' && (
                                      <CheckCircleIcon className="w-3 h-3 mr-1" />
                                    )}
                                    {login.status === 'blocked' && (
                                      <XCircleIcon className="w-3 h-3 mr-1" />
                                    )}
                                    {login.status.charAt(0).toUpperCase() +
                                      login.status.slice(1)}
                                  </span>
                                </td>
                                <td className="py-4 text-sm text-gray-400 font-mono">
                                  {login.ip}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {!showLoginHistory && loginHistory.length > 0 && (
                    <p className="text-sm text-gray-500">
                      {loginHistory.length} login records • Click &quot;View
                      All&quot; to see history
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
      </section>
    </div>
  );
}
