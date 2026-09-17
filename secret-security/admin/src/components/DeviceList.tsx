import React, { useState } from 'react';
import type { Device } from '../App';
import { apiFetch } from '../App';
import DeviceDetail from './DeviceDetail';

interface Props {
    devices: Device[];
    onRefresh: () => void;
}

export default function DeviceList({ devices, onRefresh }: Props) {
    const [selected, setSelected] = useState<string | null>(null);
    const [filter, setFilter] = useState<string>('all');

    const filtered = filter === 'all' ? devices : devices.filter(d =>
        filter === 'tracking' ? d.trackingActive : d.status === filter
    );

    if (selected) return <DeviceDetail deviceId={selected} onBack={() => setSelected(null)} />;

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #222', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600, fontSize: 14, marginRight: 4 }}>Devices</span>
                <span style={{ fontSize: 12, color: '#555', marginRight: 12 }}>({devices.length} total)</span>
                {(['all', 'tracking', 'registered', 'found', 'disabled']).map(f => (
                    <button key={f} onClick={() => setFilter(f)} className={filter === f ? 'btn-primary' : 'btn-ghost'} style={{ fontSize: 11, padding: '3px 10px', textTransform: 'capitalize' }}>
                        {f}
                    </button>
                ))}
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
                {filtered.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#555', fontSize: 14 }}>No devices</div>}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #222', background: '#16161f' }}>
                            {['Device', 'Model', 'Status', 'Battery', 'Last Seen', 'Actions'].map(h => (
                                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(d => (
                            <tr key={d.deviceId} style={{ borderBottom: '1px solid #1a1a22' }}>
                                <td style={{ padding: '10px 12px' }}>
                                    <div style={{ fontWeight: 500 }}>{d.deviceName}</div>
                                    <div style={{ fontSize: 11, color: '#555', fontFamily: 'monospace' }}>{d.deviceId.slice(0, 12)}…</div>
                                </td>
                                <td style={{ padding: '10px 12px', color: '#888' }}>{d.model || d.os}</td>
                                <td style={{ padding: '10px 12px' }}>
                                    <span className={`badge badge-${d.trackingActive ? 'tracking' : d.status}`}>
                                        {d.trackingActive ? 'tracking' : d.status}
                                    </span>
                                </td>
                                <td style={{ padding: '10px 12px', color: d.lastBattery != null && d.lastBattery < 20 ? '#ef4444' : '#888' }}>
                                    {d.lastBattery != null ? `${d.lastBattery}%` : '—'}
                                </td>
                                <td style={{ padding: '10px 12px', color: '#666', fontSize: 12 }}>
                                    {d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleString() : 'Never'}
                                </td>
                                <td style={{ padding: '10px 12px' }}>
                                    <button className="btn-ghost" style={{ fontSize: 11 }} onClick={() => setSelected(d.deviceId)}>
                                        Detail →
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
