import React, { useState } from 'react';
import type { Report } from '../App';
import { apiFetch } from '../App';
import DeviceDetail from './DeviceDetail';

interface Props {
    reports: Report[];
    onRefresh: () => void;
}

export default function ReportQueue({ reports, onRefresh }: Props) {
    const [selected, setSelected] = useState<Report | null>(null);
    const [filter, setFilter] = useState<string>('pending');
    const [loading, setLoading] = useState<string | null>(null);
    const [note, setNote] = useState('');
    const [showDetail, setShowDetail] = useState<string | null>(null);

    const filtered = filter === 'all' ? reports : reports.filter(r => r.status === filter);

    const handleApprove = async (report: Report) => {
        if (!confirm(`Approve report for "${report.ownerName}"? This will ACTIVATE TRACKING on their device.`)) return;
        setLoading(report.id);
        try {
            await apiFetch(`/report/${report.id}/approve`, { method: 'POST', body: JSON.stringify({ note }) });
            onRefresh();
            setSelected(null);
            setNote('');
        } catch (e: any) {
            alert('Error: ' + e.message);
        } finally {
            setLoading(null);
        }
    };

    const handleReject = async (report: Report) => {
        const reason = prompt('Rejection reason (sent to owner):');
        if (!reason) return;
        setLoading(report.id);
        try {
            await apiFetch(`/report/${report.id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) });
            onRefresh();
            setSelected(null);
        } catch (e: any) {
            alert('Error: ' + e.message);
        } finally {
            setLoading(null);
        }
    };

    const handleGenerateReport = async (report: Report) => {
        if (!confirm('Generate report and send payment link to owner?')) return;
        setLoading(report.id);
        try {
            const data = await apiFetch(`/report/${report.id}/generate-report`, { method: 'POST' });
            alert(`Payment link sent to ${report.ownerEmail}\n\n${data.paymentUrl}`);
            onRefresh();
        } catch (e: any) {
            alert('Error: ' + e.message);
        } finally {
            setLoading(null);
        }
    };

    if (showDetail) return <DeviceDetail deviceId={showDetail} onBack={() => setShowDetail(null)} />;

    const STATUS_COLORS: Record<string, string> = {
        pending: '#a78bfa', approved: '#4ade80', rejected: '#f87171', resolved: '#38bdf8', closed: '#888'
    };

    return (
        <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
            {/* List */}
            <div style={{ width: selected ? '40%' : '100%', overflowY: 'auto', borderRight: '1px solid #222', transition: 'width 0.2s' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #222', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: 14, marginRight: 8 }}>Reports</span>
                    {(['pending', 'approved', 'rejected', 'resolved', 'all']).map(s => (
                        <button key={s} onClick={() => setFilter(s)}
                            className={filter === s ? 'btn-primary' : 'btn-ghost'}
                            style={{ fontSize: 11, padding: '3px 10px', textTransform: 'capitalize' }}>
                            {s}
                            {s === 'pending' &&
                                <span style={{ marginLeft: 5 }}>({reports.filter(r => r.status === 'pending').length})</span>
                            }
                        </button>
                    ))}
                </div>
                {filtered.length === 0 && (
                    <div style={{ padding: 40, textAlign: 'center', color: '#555', fontSize: 14 }}>
                        No {filter} reports
                    </div>
                )}
                {filtered.map(r => (
                    <div key={r.id} onClick={() => setSelected(r)}
                        style={{ padding: '14px 16px', borderBottom: '1px solid #1a1a22', cursor: 'pointer', background: selected?.id === r.id ? '#1e1e2a' : 'transparent', transition: 'background 0.1s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontWeight: 600, fontSize: 13 }}>{r.ownerName}</span>
                            <span className={`badge badge-${r.status}`}>{r.status}</span>
                            {r.device.trackingActive && <span className="badge badge-tracking">tracking</span>}
                        </div>
                        <div style={{ fontSize: 12, color: '#888' }}>{r.ownerEmail}</div>
                        <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{r.device.deviceName} · {r.device.model}</div>
                        <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>{new Date(r.createdAt).toLocaleString()}</div>
                    </div>
                ))}
            </div>

            {/* Detail panel */}
            {selected && (
                <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                        <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setSelected(null)}>← Back</button>
                        <span style={{ fontWeight: 700, fontSize: 16 }}>Report Detail</span>
                    </div>

                    <Section title="Owner Information">
                        <Row label="Name" value={selected.ownerName} />
                        <Row label="Email" value={selected.ownerEmail} />
                        <Row label="Phone" value={selected.ownerPhone || '—'} />
                        {selected.purchaseProof && (
                            <Row label="Proof" value={<a href={selected.purchaseProof} target="_blank" rel="noreferrer" style={{ color: '#6366f1' }}>View document</a>} />
                        )}
                        {selected.description && (
                            <Row label="Description" value={selected.description} />
                        )}
                    </Section>

                    <Section title="Device">
                        <Row label="Name" value={selected.device.deviceName} />
                        <Row label="Model" value={selected.device.model || '—'} />
                        <Row label="Status" value={<span style={{ color: STATUS_COLORS[selected.device.status] }}>{selected.device.status}</span>} />
                        <Row label="Tracking" value={selected.device.trackingActive ? <span style={{ color: '#ef4444', fontWeight: 700 }}>ACTIVE</span> : 'Dormant'} />
                        {selected.device.lastSeenAt && <Row label="Last seen" value={new Date(selected.device.lastSeenAt).toLocaleString()} />}
                        {selected.device.lastBattery != null && <Row label="Battery" value={`${selected.device.lastBattery}%`} />}
                        <div style={{ marginTop: 8 }}>
                            <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setShowDetail(selected.deviceId)}>
                                View location history & photos →
                            </button>
                        </div>
                    </Section>

                    {selected.status === 'pending' && (
                        <Section title="Verification Decision">
                            <div style={{ marginBottom: 10 }}>
                                <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Internal note (optional)</label>
                                <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
                                    placeholder="Identity verified via receipt + phone call…"
                                    style={{ width: '100%', background: '#0f0f14', border: '1px solid #333', borderRadius: 6, color: '#e5e5e5', padding: '8px 10px', fontSize: 13, resize: 'vertical' }} />
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button className="btn-success" disabled={loading === selected.id} onClick={() => handleApprove(selected)}>
                                    ✓ Approve &amp; Activate Tracking
                                </button>
                                <button className="btn-danger" disabled={loading === selected.id} onClick={() => handleReject(selected)}>
                                    ✗ Reject
                                </button>
                            </div>
                        </Section>
                    )}

                    {(selected.status === 'approved') && !selected.device.trackingActive && (
                        <Section title="Report Generation">
                            <p style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>
                                Generate the report ZIP and send payment link to owner.
                            </p>
                            <button className="btn-primary" disabled={loading === selected.id} onClick={() => handleGenerateReport(selected)}>
                                Generate Report &amp; Send Payment Link
                            </button>
                        </Section>
                    )}

                    {selected.reviewNote && (
                        <Section title="Review Note">
                            <p style={{ fontSize: 13, color: '#a3a3a3', fontStyle: 'italic' }}>{selected.reviewNote}</p>
                        </Section>
                    )}
                </div>
            )}
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div style={{ background: '#16161f', border: '1px solid #222', borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>{title}</div>
            {children}
        </div>
    );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: '#666', width: 90, flexShrink: 0 }}>{label}</span>
            <span style={{ fontSize: 13 }}>{value}</span>
        </div>
    );
}
