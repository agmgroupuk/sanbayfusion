import React, { useState, useEffect, useCallback } from 'react';
import DeviceMap from './components/DeviceMap';
import ReportQueue from './components/ReportQueue';
import DeviceList from './components/DeviceList';

// ── API helpers ───────────────────────────────────────────────────────────────
let _token: string | null = localStorage.getItem('admin_token');

export function getToken() { return _token; }

export async function apiFetch(path: string, opts: RequestInit = {}) {
    const res = await fetch(`/api/admin${path}`, {
        ...opts,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(opts.headers || {}),
            ..._token ? { Authorization: `Bearer ${_token}` } : {},
        },
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface Device {
    id: string; deviceId: string; deviceName: string; model?: string;
    os: string; status: string; trackingActive: boolean;
    lastSeenAt?: string; lastLat?: number; lastLng?: number;
    lastBattery?: number; lastNetwork?: string; createdAt: string;
}

export interface Report {
    id: string; deviceId: string; ownerName: string; ownerEmail: string;
    ownerPhone?: string; purchaseProof?: string; description?: string;
    status: string; reviewNote?: string; createdAt: string;
    device: Device;
}

// ── Login Screen ──────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: (token: string) => void }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            if (!res.ok) { setError('Invalid credentials'); return; }
            const data = await res.json();
            _token = data.token;
            localStorage.setItem('admin_token', data.token);
            onLogin(data.token);
        } catch {
            setError('Network error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f0f14' }}>
            <form onSubmit={submit} style={{ background: '#16161f', border: '1px solid #222', borderRadius: 12, padding: 40, width: 360 }}>
                <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>🛡 Maula Security</div>
                <div style={{ color: '#666', marginBottom: 28, fontSize: 13 }}>Admin Panel</div>
                {error && <div style={{ background: '#ef444420', color: '#f87171', padding: '8px 12px', borderRadius: 6, marginBottom: 16, fontSize: 13 }}>{error}</div>}
                <label style={{ display: 'block', marginBottom: 16 }}>
                    <span style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Email</span>
                    <input value={email} onChange={e => setEmail(e.target.value)} type="email" required autoFocus
                        style={{ width: '100%', padding: '8px 12px', background: '#0f0f14', border: '1px solid #333', borderRadius: 6, color: '#fff', fontSize: 14 }} />
                </label>
                <label style={{ display: 'block', marginBottom: 24 }}>
                    <span style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Password</span>
                    <input value={password} onChange={e => setPassword(e.target.value)} type="password" required
                        style={{ width: '100%', padding: '8px 12px', background: '#0f0f14', border: '1px solid #333', borderRadius: 6, color: '#fff', fontSize: 14 }} />
                </label>
                <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', padding: '10px' }}>
                    {loading ? 'Signing in…' : 'Sign In'}
                </button>
            </form>
        </div>
    );
}

// ── Main App ──────────────────────────────────────────────────────────────────
type Tab = 'map' | 'reports' | 'devices';

export default function App() {
    const [token, setToken] = useState<string | null>(_token);
    const [tab, setTab] = useState<Tab>('reports');
    const [devices, setDevices] = useState<Device[]>([]);
    const [reports, setReports] = useState<Report[]>([]);
    const [pendingCount, setPendingCount] = useState(0);

    const refresh = useCallback(async () => {
        try {
            const [dRes, rRes] = await Promise.all([
                apiFetch('/devices'),
                apiFetch('/reports'),
            ]);
            setDevices(dRes.devices);
            setReports(rRes.reports);
            setPendingCount(rRes.reports.filter((r: Report) => r.status === 'pending').length);
        } catch { /* silently ignore refresh errors */ }
    }, []);

    useEffect(() => {
        if (token) { refresh(); const id = setInterval(refresh, 30_000); return () => clearInterval(id); }
    }, [token, refresh]);

    if (!token) return <LoginScreen onLogin={setToken} />;

    const logout = async () => {
        await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' }).catch(() => { });
        _token = null;
        localStorage.removeItem('admin_token');
        setToken(null);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            {/* Header */}
            <header style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '0 20px', height: 52, background: '#16161f', borderBottom: '1px solid #222', flexShrink: 0 }}>
                <span style={{ fontWeight: 700, fontSize: 16 }}>🛡 Maula Security</span>
                <nav style={{ display: 'flex', gap: 4, flex: 1 }}>
                    {(['reports', 'map', 'devices'] as Tab[]).map(t => (
                        <button key={t} onClick={() => setTab(t)} className={tab === t ? 'btn-primary' : 'btn-ghost'}
                            style={{ position: 'relative', textTransform: 'capitalize' }}>
                            {t}
                            {t === 'reports' && pendingCount > 0 && (
                                <span style={{ position: 'absolute', top: -4, right: -4, background: '#ef4444', color: '#fff', borderRadius: 10, fontSize: 10, padding: '1px 5px', fontWeight: 700 }}>
                                    {pendingCount}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>
                <button onClick={logout} className="btn-ghost" style={{ fontSize: 12 }}>Sign out</button>
            </header>

            {/* Content */}
            <main style={{ flex: 1, overflow: 'hidden' }}>
                {tab === 'map' && <DeviceMap devices={devices} />}
                {tab === 'reports' && <ReportQueue reports={reports} onRefresh={refresh} />}
                {tab === 'devices' && <DeviceList devices={devices} onRefresh={refresh} />}
            </main>
        </div>
    );
}
