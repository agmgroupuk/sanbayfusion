'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteAccountPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (confirmText !== 'DELETE MY ACCOUNT') {
      setError('Please type DELETE MY ACCOUNT exactly to confirm.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to submit deletion request');
      }
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ maxWidth: '480px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#38bdf8' }}>Deletion Request Submitted</h1>
          <p style={{ marginBottom: '1rem', lineHeight: 1.6 }}>
            Your account deletion request has been received. We will process it within <strong>30 days</strong>.
          </p>
          <p style={{ marginBottom: '1.5rem', lineHeight: 1.6, color: '#94a3b8' }}>
            The following data will be permanently deleted:
          </p>
          <ul style={{ textAlign: 'left', marginBottom: '1.5rem', color: '#cbd5e1', lineHeight: 2 }}>
            <li>• Account information (name, email, profile)</li>
            <li>• Chat conversations and history</li>
            <li>• AI agent memories</li>
            <li>• Projects and files</li>
            <li>• Stored credentials and API keys</li>
          </ul>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            Billing records may be retained for up to 7 years as required by law.
          </p>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
            Questions? Contact <a href="mailto:privacy@maula.ai" style={{ color: '#38bdf8' }}>privacy@maula.ai</a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ maxWidth: '480px', width: '100%' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: '#f87171' }}>Delete Your Account</h1>
        <p style={{ color: '#94a3b8', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          This action is <strong>permanent and irreversible</strong>. All your data will be deleted within 30 days.
        </p>

        <div style={{ background: '#1e293b', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', border: '1px solid #334155' }}>
          <h2 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', color: '#f8fafc' }}>Data that will be deleted:</h2>
          <ul style={{ color: '#cbd5e1', fontSize: '0.875rem', lineHeight: 2 }}>
            <li>• Account information (name, email, profile)</li>
            <li>• All chat conversations and history</li>
            <li>• AI agent memories and preferences</li>
            <li>• Projects, files, and canvas creations</li>
            <li>• Stored credentials and deploy keys</li>
          </ul>
          <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.75rem' }}>
            Billing/transaction records retained up to 7 years per legal requirements.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>
            Your email address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{ width: '100%', padding: '0.625rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#e2e8f0', marginBottom: '1rem', fontSize: '0.875rem' }}
          />

          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>
            Type <strong style={{ color: '#f87171' }}>DELETE MY ACCOUNT</strong> to confirm
          </label>
          <input
            type="text"
            required
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE MY ACCOUNT"
            style={{ width: '100%', padding: '0.625rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#e2e8f0', marginBottom: '1rem', fontSize: '0.875rem' }}
          />

          {error && (
            <p style={{ color: '#f87171', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || confirmText !== 'DELETE MY ACCOUNT'}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: confirmText === 'DELETE MY ACCOUNT' ? '#dc2626' : '#374151',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              cursor: confirmText === 'DELETE MY ACCOUNT' ? 'pointer' : 'not-allowed',
              opacity: loading ? 0.6 : 1,
              fontSize: '0.875rem',
            }}
          >
            {loading ? 'Submitting...' : 'Permanently Delete My Account'}
          </button>
        </form>

        <p style={{ marginTop: '1.5rem', color: '#64748b', fontSize: '0.75rem', textAlign: 'center' }}>
          Need help? Contact <a href="mailto:privacy@maula.ai" style={{ color: '#38bdf8' }}>privacy@maula.ai</a>
        </p>
      </div>
    </div>
  );
}
