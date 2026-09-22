import React, { useState, useEffect } from 'react';
import { apiFetch } from '../App';
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import L from 'leaflet';

interface Ping { id: string; lat: number; lng: number; accuracy?: number; battery?: number; network?: string; timestamp: string; }
interface Photo { id: string; storageKey: string; url?: string; camera: string; takenAt: string; sizeBytes?: number; }
interface DeviceData {
    deviceId: string; deviceName: string; model?: string; os: string;
    status: string; trackingActive: boolean; lastBattery?: number; lastNetwork?: string;
    createdAt: string; lastSeenAt?: string; pingIntervalSecs: number;
    pings: Ping[]; reports: any[];
    _count: { photos: number; pings: number };
}

const pingIcon = new L.DivIcon({
    html: `<div style="width:8px;height:8px;border-radius:50%;background:#6366f1;border:1px solid #fff;opacity:0.8"></div>`,
    className: '', iconSize: [8, 8], iconAnchor: [4, 4],
});

const latestIcon = new L.DivIcon({
    html: `<div style="width:12px;height:12px;border-radius:50%;background:#ef4444;border:2px solid #fff;box-shadow:0 0 6px #ef444488"></div>`,
    className: '', iconSize: [12, 12], iconAnchor: [6, 6],
});

export default function DeviceDetail({ deviceId, onBack }: { deviceId: string; onBack: () => void }) {
    const [device, setDevice] = useState<DeviceData | null>(null);
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [view, setView] = useState<'map' | 'photos'>('map');
    const [lightbox, setLightbox] = useState<Photo | null>(null);
    const [cmdLoading, setCmdLoading] = useState(false);

    useEffect(() => {
        apiFetch(`/device/${deviceId}`).then(d => setDevice(d.device)).catch(console.error);
        apiFetch(`/device/${deviceId}/photos`).then(d => setPhotos(d.photos)).catch(console.error);
    }, [deviceId]);

    const sendCommand = async (command: string, payload?: any) => {
        setCmdLoading(true);
        try {
            await apiFetch(`/device/${deviceId}/command`, { method: 'POST', body: JSON.stringify({ command, payload }) });
            alert(`Command "${command}" queued.`);
        } catch (e: any) { alert('Error: ' + e.message); }
        finally { setCmdLoading(false); }
    };

    if (!device) return <div style={{ padding: 40, color: '#555' }}>Loading…</div>;

    const pingsWithCoords = device.pings.filter(p => p.lat && p.lng);
    const positions = pingsWithCoords.map(p => [p.lat, p.lng] as [number, number]);
    const latest = pingsWithCoords[0];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid #222', flexShrink: 0 }}>
                <button className="btn-ghost" style={{ fontSize: 12 }} onClick={onBack}>← Back</button>
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>{device.deviceName}</div>
                    <div style={{ fontSize: 11, color: '#666' }}>{device.model} · {device.os} · {device._count.pings} pings · {device._count.photos} photos</div>
                </div>
                <span className={`badge badge-${device.trackingActive ? 'tracking' : device.status}`}>
                    {device.trackingActive ? 'tracking' : device.status}
                </span>
                {device.lastBattery != null && <span style={{ fontSize: 12, color: '#888' }}>🔋 {device.lastBattery}%</span>}
            </div>

            {/* Commands bar */}
            <div style={{ display: 'flex', gap: 8, padding: '8px 16px', background: '#16161f', borderBottom: '1px solid #222', flexShrink: 0, flexWrap: 'wrap' }}>
                <button className="btn-ghost" style={{ fontSize: 11 }} disabled={cmdLoading} onClick={() => sendCommand('TAKE_PHOTO')}>📸 Take Photo</button>
                <button className="btn-ghost" style={{ fontSize: 11 }} disabled={cmdLoading} onClick={() => sendCommand('TRIGGER_ALARM')}>🔔 Trigger Alarm</button>
                <button className="btn-ghost" style={{ fontSize: 11 }} disabled={cmdLoading} onClick={() => sendCommand('SET_PING_INTERVAL', { intervalSecs: 30 })}>⚡ Ping 30s</button>
                {device.trackingActive && (
                    <button className="btn-danger" style={{ fontSize: 11 }} disabled={cmdLoading} onClick={() => sendCommand('STOP_TRACKING')}>Stop Tracking</button>
                )}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, padding: '8px 16px', borderBottom: '1px solid #222', flexShrink: 0 }}>
                <button className={view === 'map' ? 'btn-primary' : 'btn-ghost'} style={{ fontSize: 12 }} onClick={() => setView('map')}>Location History ({device._count.pings})</button>
                <button className={view === 'photos' ? 'btn-primary' : 'btn-ghost'} style={{ fontSize: 12 }} onClick={() => setView('photos')}>Photos ({device._count.photos})</button>
            </div>

            {/* Map or Photos */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
                {view === 'map' && (
                    <MapContainer
                        center={latest ? [latest.lat, latest.lng] : [20, 0]}
                        zoom={latest ? 14 : 3}
                        style={{ height: '100%', width: '100%' }}
                        preferCanvas
                    >
                        <TileLayer
                            attribution='&copy; OpenStreetMap contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        {positions.length > 1 && <Polyline positions={positions} color="#6366f1" opacity={0.6} weight={2} />}
                        {pingsWithCoords.slice(1).map(p => (
                            <Marker key={p.id} position={[p.lat, p.lng]} icon={pingIcon}>
                                <Popup>
                                    <div style={{ fontSize: 12 }}>
                                        <div>{new Date(p.timestamp).toLocaleString()}</div>
                                        {p.battery != null && <div>🔋 {p.battery}%</div>}
                                        {p.network && <div>📶 {p.network}</div>}
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                        {latest && (
                            <Marker position={[latest.lat, latest.lng]} icon={latestIcon}>
                                <Popup>
                                    <div style={{ fontSize: 12 }}>
                                        <strong>Latest location</strong>
                                        <div>{new Date(latest.timestamp).toLocaleString()}</div>
                                        {latest.battery != null && <div>🔋 {latest.battery}%</div>}
                                    </div>
                                </Popup>
                            </Marker>
                        )}
                    </MapContainer>
                )}

                {view === 'photos' && (
                    <div style={{ overflowY: 'auto', height: '100%', padding: 16 }}>
                        {photos.length === 0 && <div style={{ color: '#555', textAlign: 'center', padding: 40 }}>No photos yet</div>}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                            {photos.map(p => (
                                <div key={p.id} onClick={() => setLightbox(p)}
                                    style={{ borderRadius: 8, overflow: 'hidden', background: '#16161f', cursor: 'pointer', aspectRatio: '3/4', position: 'relative' }}>
                                    {p.url ? (
                                        <img src={p.url} alt="Device photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>No URL</div>
                                    )}
                                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, #000a)', padding: '20px 8px 6px', fontSize: 10, color: '#ccc' }}>
                                        {new Date(p.takenAt).toLocaleString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Lightbox */}
            {lightbox && (
                <div onClick={() => setLightbox(null)}
                    style={{ position: 'fixed', inset: 0, background: '#000c', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh', position: 'relative' }}>
                        <button onClick={() => setLightbox(null)}
                            style={{ position: 'absolute', top: -36, right: 0, background: 'none', color: '#fff', fontSize: 20 }}>✕</button>
                        {lightbox.url && <img src={lightbox.url} alt="Device photo" style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: 8 }} />}
                        <div style={{ color: '#ccc', fontSize: 12, textAlign: 'center', marginTop: 8 }}>
                            {lightbox.camera} camera · {new Date(lightbox.takenAt).toLocaleString()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
