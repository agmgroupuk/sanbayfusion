'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  MapPin,
  Smartphone,
  AlertTriangle,
  CheckCircle,
  Clock,
  Battery,
  Wifi,
  RefreshCw,
  Eye,
  Trash2,
  Lock,
  Unlock,
  X,
  ChevronDown,
  ChevronUp,
  Signal,
} from 'lucide-react';

const API_BASE = '/api/admin/tracking';

interface Device {
  id: string;
  deviceName: string | null;
  deviceModel: string | null;
  deviceOS: string | null;
  deviceOSVersion: string | null;
  ownerEmail: string | null;
  ownerPhone: string | null;
  registeredIp: string | null;
  isLost: boolean;
  isActive: boolean;
  lastSeenAt: string | null;
  lastLat: number | null;
  lastLng: number | null;
  lastAccuracy: number | null;
  lastBattery: number | null;
  lastNetwork: string | null;
  locationUnlocked: boolean;
  paymentRef: string | null;
  notes: string | null;
  appVersion: string | null;
  createdAt: string;
}

interface Ping {
  id: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  battery: number | null;
  network: string | null;
  ipAddress: string | null;
  timestamp: string;
}

interface DeviceDetail extends Device {
  pings: Ping[];
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function batteryColor(pct: number | null): string {
  if (pct == null) return 'text-gray-500';
  if (pct > 50) return 'text-green-400';
  if (pct > 20) return 'text-yellow-400';
  return 'text-red-400';
}

function statusDot(device: Device): string {
  if (!device.isActive) return 'bg-gray-500';
  if (device.isLost) return 'bg-red-500 animate-pulse';
  if (!device.lastSeenAt) return 'bg-gray-400';
  const mins = (Date.now() - new Date(device.lastSeenAt).getTime()) / 60000;
  if (mins < 10) return 'bg-green-400 animate-pulse';
  if (mins < 60) return 'bg-green-600';
  return 'bg-yellow-500';
}

const GMAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

// Google Maps rendered as srcdoc iframe
function DeviceMap({ devices, selectedId }: { devices: Device[]; selectedId: string | null }) {
  const mapDevices = devices.filter(d => d.lastLat != null && d.lastLng != null);

  const center = (() => {
    const target = selectedId ? mapDevices.find(d => d.id === selectedId) : mapDevices[0];
    if (target) return { lat: target.lastLat!, lng: target.lastLng! };
    return { lat: 20, lng: 0 };
  })();

  const markers = mapDevices.map(d => ({
    lat: d.lastLat!,
    lng: d.lastLng!,
    label: (d.deviceName || d.deviceModel || d.id.slice(0, 8)).replace(/'/g, "\\'"),
    lost: d.isLost,
    selected: d.id === selectedId,
  }));

  const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>html,body,#map{height:100%;margin:0;padding:0;}</style>
</head><body>
<div id="map"></div>
<script>
function initMap() {
  const map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: ${center.lat}, lng: ${center.lng} },
    zoom: ${markers.length === 1 ? 14 : 3},
    mapTypeId: 'roadmap',
    styles: [
      {elementType:'geometry',stylers:[{color:'#1a1a2e'}]},
      {elementType:'labels.text.fill',stylers:[{color:'#8ec3b9'}]},
      {elementType:'labels.text.stroke',stylers:[{color:'#1a1a2e'}]},
      {featureType:'road',elementType:'geometry',stylers:[{color:'#16213e'}]},
      {featureType:'road',elementType:'geometry.stroke',stylers:[{color:'#212a37'}]},
      {featureType:'water',elementType:'geometry',stylers:[{color:'#0d1b2a'}]},
      {featureType:'poi',stylers:[{visibility:'off'}]},
    ],
  });
  ${markers.map(m => `
  new google.maps.Marker({
    position: { lat: ${m.lat}, lng: ${m.lng} },
    map,
    title: '${m.label}',
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: ${m.selected ? 12 : 8},
      fillColor: '${m.lost ? '#ef4444' : m.selected ? '#22d3ee' : '#10b981'}',
      fillOpacity: ${m.selected ? 0.95 : 0.75},
      strokeColor: '${m.lost ? '#ff0000' : m.selected ? '#67e8f9' : '#34d399'}',
      strokeWeight: ${m.selected ? 3 : 1.5},
    },
  }).addListener('click', function() {
    new google.maps.InfoWindow({ content: '<b style="color:#111">${m.label}</b>${m.lost ? '<br><span style="color:red;font-weight:bold">LOST</span>' : ''}' }).open(map, this);
  });
  `).join('')}
}
<\/script>
<script src="https://maps.googleapis.com/maps/api/js?key=${GMAPS_KEY}&callback=initMap" async defer><\/script>
</body></html>`;

  return (
    <iframe
      srcDoc={html}
      className="w-full h-full border-0 rounded-sm"
      sandbox="allow-scripts allow-same-origin"
      title="Device tracking map"
    />
  );
}

export default function TrackingAdminPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DeviceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  const loadDevices = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/devices`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setDevices(data.devices);
      else setError(data.message || 'Failed to load devices');
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDevices();
    const interval = setInterval(loadDevices, 30000); // auto-refresh every 30s
    return () => clearInterval(interval);
  }, [loadDevices]);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`${API_BASE}/devices/${id}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setDetail(data.device);
        setNotes(data.device.notes || '');
      }
    } catch {
      // ignore
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const selectDevice = (id: string) => {
    setSelectedId(id);
    setShowHistory(false);
    loadDetail(id);
  };

  const markLost = async (id: string, isLost: boolean) => {
    const res = await fetch(`${API_BASE}/devices/${id}/lost`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ isLost }),
    });
    const data = await res.json();
    if (data.success) {
      setDevices(prev => prev.map(d => d.id === id ? { ...d, isLost } : d));
      if (detail?.id === id) setDetail(prev => prev ? { ...prev, isLost } : null);
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    const res = await fetch(`${API_BASE}/devices/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ isActive }),
    });
    const data = await res.json();
    if (data.success) {
      setDevices(prev => prev.map(d => d.id === id ? { ...d, isActive } : d));
    }
  };

  const unlockLocation = async (id: string) => {
    const res = await fetch(`${API_BASE}/devices/${id}/unlock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ paymentRef: 'manual-admin-unlock' }),
    });
    const data = await res.json();
    if (data.success) {
      setDevices(prev => prev.map(d => d.id === id ? { ...d, locationUnlocked: true } : d));
      if (detail?.id === id) setDetail(prev => prev ? { ...prev, locationUnlocked: true } : null);
    }
  };

  const saveNotes = async () => {
    if (!detail) return;
    setSavingNotes(true);
    await fetch(`${API_BASE}/devices/${detail.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ notes }),
    });
    setSavingNotes(false);
  };

  const deleteDevice = async (id: string) => {
    if (!confirm('Delete this device and all its location history? This cannot be undone.')) return;
    const res = await fetch(`${API_BASE}/devices/${id}`, { method: 'DELETE', credentials: 'include' });
    const data = await res.json();
    if (data.success) {
      setDevices(prev => prev.filter(d => d.id !== id));
      if (selectedId === id) { setSelectedId(null); setDetail(null); }
    }
  };

  const lostCount = devices.filter(d => d.isLost).length;
  const activeCount = devices.filter(d => d.isActive && d.lastSeenAt && (Date.now() - new Date(d.lastSeenAt).getTime()) < 600000).length;

  return (
    <div className="h-screen flex flex-col bg-[#080808] text-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MapPin className="w-5 h-5 text-cyan-400" />
          <h1 className="text-lg font-bold tracking-tight text-white">SecureTrace — Device Tracker</h1>
          <span className="text-xs text-gray-500 font-mono">{devices.length} devices</span>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            <span className="text-green-400">{activeCount} online</span>
          </span>
          {lostCount > 0 && (
            <span className="flex items-center gap-1.5 text-red-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              {lostCount} LOST
            </span>
          )}
          <button
            onClick={() => { setLoading(true); loadDevices(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex-shrink-0 mx-6 mt-3 px-4 py-2 bg-red-900/30 border border-red-700 rounded text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        {/* Device List */}
        <div className="w-80 flex-shrink-0 border-r border-gray-800 flex flex-col overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-800 bg-gray-900/30">
            <p className="text-xs text-gray-500 font-mono uppercase tracking-widest">Registered Devices</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32 text-gray-500 text-sm">Loading...</div>
            ) : devices.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2 text-gray-600">
                <Smartphone className="w-8 h-8" />
                <p className="text-sm">No devices registered yet</p>
              </div>
            ) : (
              devices.map(device => (
                <div
                  key={device.id}
                  onClick={() => selectDevice(device.id)}
                  className={`px-4 py-3 border-b border-gray-800/50 cursor-pointer hover:bg-gray-800/40 transition-colors ${selectedId === device.id ? 'bg-cyan-950/30 border-l-2 border-l-cyan-500' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 flex-shrink-0 rounded-full ${statusDot(device)}`}></span>
                      <span className="text-sm font-medium text-white truncate">
                        {device.deviceName || device.deviceModel || `Device ${device.id.slice(0, 8)}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {device.isLost && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-red-900/60 text-red-400 rounded font-mono uppercase">LOST</span>
                      )}
                      {!device.isActive && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-gray-800 text-gray-500 rounded font-mono">OFF</span>
                      )}
                    </div>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-[10px] text-gray-500 font-mono">
                    <span>{device.deviceOS || '—'}</span>
                    <span className="flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {timeAgo(device.lastSeenAt)}
                    </span>
                    {device.lastBattery != null && (
                      <span className={`flex items-center gap-0.5 ${batteryColor(device.lastBattery)}`}>
                        <Battery className="w-2.5 h-2.5" />
                        {device.lastBattery}%
                      </span>
                    )}
                  </div>
                  {device.lastLat != null && (
                    <div className="mt-0.5 text-[10px] text-cyan-700 font-mono">
                      {device.lastLat.toFixed(5)}, {device.lastLng!.toFixed(5)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative min-w-0">
          {devices.some(d => d.lastLat != null) ? (
            <DeviceMap devices={devices} selectedId={selectedId} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-600">
              <MapPin className="w-12 h-12" />
              <p className="text-sm">No location data yet</p>
              <p className="text-xs">Devices will appear on the map once they start pinging</p>
            </div>
          )}

          {/* Stats overlay top-right */}
          <div className="absolute top-3 right-3 flex gap-2">
            <div className="px-3 py-2 bg-black/70 backdrop-blur border border-gray-700 rounded text-xs font-mono">
              <div className="text-gray-400">Total</div>
              <div className="text-white font-bold text-lg leading-none">{devices.length}</div>
            </div>
            <div className="px-3 py-2 bg-black/70 backdrop-blur border border-green-800 rounded text-xs font-mono">
              <div className="text-gray-400">Online</div>
              <div className="text-green-400 font-bold text-lg leading-none">{activeCount}</div>
            </div>
            {lostCount > 0 && (
              <div className="px-3 py-2 bg-black/70 backdrop-blur border border-red-800 rounded text-xs font-mono animate-pulse">
                <div className="text-gray-400">Lost</div>
                <div className="text-red-400 font-bold text-lg leading-none">{lostCount}</div>
              </div>
            )}
          </div>
        </div>

        {/* Detail Panel */}
        {selectedId && (
          <div className="w-80 flex-shrink-0 border-l border-gray-800 flex flex-col overflow-hidden bg-gray-900/20">
            <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
              <p className="text-xs text-gray-400 font-mono uppercase tracking-widest">Device Detail</p>
              <button onClick={() => { setSelectedId(null); setDetail(null); }} className="text-gray-600 hover:text-gray-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center h-32 text-gray-500 text-sm">Loading...</div>
            ) : detail ? (
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 text-xs">
                {/* Device info */}
                <div className="space-y-1.5">
                  <p className="text-gray-500 uppercase tracking-widest text-[10px] font-mono">Device Info</p>
                  <Row label="Name" value={detail.deviceName} />
                  <Row label="Model" value={detail.deviceModel} />
                  <Row label="OS" value={`${detail.deviceOS || '—'} ${detail.deviceOSVersion || ''}`} />
                  <Row label="App Ver" value={detail.appVersion} />
                  <Row label="Reg. IP" value={detail.registeredIp} />
                  <Row label="Registered" value={new Date(detail.createdAt).toLocaleDateString()} />
                </div>

                {/* Owner info */}
                <div className="space-y-1.5">
                  <p className="text-gray-500 uppercase tracking-widest text-[10px] font-mono">Owner</p>
                  <Row label="Email" value={detail.ownerEmail} />
                  <Row label="Phone" value={detail.ownerPhone} />
                </div>

                {/* Last location */}
                <div className="space-y-1.5">
                  <p className="text-gray-500 uppercase tracking-widest text-[10px] font-mono">Last Location</p>
                  {detail.lastLat != null ? (
                    <>
                      <Row label="Lat/Lng" value={`${detail.lastLat.toFixed(6)}, ${detail.lastLng!.toFixed(6)}`} />
                      <Row label="Accuracy" value={detail.lastAccuracy != null ? `±${detail.lastAccuracy.toFixed(0)}m` : null} />
                      <Row label="Battery" value={detail.lastBattery != null ? `${detail.lastBattery}%` : null} />
                      <Row label="Network" value={detail.lastNetwork} />
                      <Row label="Last Seen" value={timeAgo(detail.lastSeenAt)} />
                      <a
                        href={`https://www.google.com/maps?q=${detail.lastLat},${detail.lastLng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-1 px-3 py-1.5 bg-cyan-900/40 border border-cyan-700 text-cyan-400 rounded hover:bg-cyan-900/60 transition-colors text-[11px]"
                      >
                        <MapPin className="w-3 h-3" />
                        Open in Google Maps
                      </a>
                    </>
                  ) : (
                    <p className="text-gray-600 italic">No location data yet</p>
                  )}
                </div>

                {/* Status */}
                <div className="space-y-1.5">
                  <p className="text-gray-500 uppercase tracking-widest text-[10px] font-mono">Status</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono ${detail.isActive ? 'bg-green-900/40 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                      {detail.isActive ? <CheckCircle className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      {detail.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono ${detail.isLost ? 'bg-red-900/40 text-red-400 animate-pulse' : 'bg-gray-800 text-gray-500'}`}>
                      <AlertTriangle className="w-3 h-3" />
                      {detail.isLost ? 'LOST' : 'OK'}
                    </span>
                    <span className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono ${detail.locationUnlocked ? 'bg-emerald-900/40 text-emerald-400' : 'bg-gray-800 text-gray-500'}`}>
                      {detail.locationUnlocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                      {detail.locationUnlocked ? 'Paid' : 'Locked'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-1.5">
                  <p className="text-gray-500 uppercase tracking-widest text-[10px] font-mono">Actions</p>
                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={() => markLost(detail.id, !detail.isLost)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded text-[11px] font-mono transition-colors ${detail.isLost ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-red-900/40 hover:bg-red-900/60 text-red-400 border border-red-800'}`}
                    >
                      <AlertTriangle className="w-3 h-3" />
                      {detail.isLost ? 'Mark as Found' : 'Mark as LOST'}
                    </button>
                    {!detail.locationUnlocked && (
                      <button
                        onClick={() => unlockLocation(detail.id)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded text-[11px] font-mono bg-emerald-900/40 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-800 transition-colors"
                      >
                        <Unlock className="w-3 h-3" />
                        Unlock Location (Admin)
                      </button>
                    )}
                    <button
                      onClick={() => toggleActive(detail.id, !detail.isActive)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded text-[11px] font-mono bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
                    >
                      {detail.isActive ? <X className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                      {detail.isActive ? 'Deactivate Device' : 'Activate Device'}
                    </button>
                    <button
                      onClick={() => deleteDevice(detail.id)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded text-[11px] font-mono bg-red-950 hover:bg-red-900 text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete Device
                    </button>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <p className="text-gray-500 uppercase tracking-widest text-[10px] font-mono">Admin Notes</p>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={3}
                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-xs text-gray-300 focus:border-cyan-600 focus:outline-none resize-none"
                    placeholder="Internal notes about this device..."
                  />
                  <button
                    onClick={saveNotes}
                    disabled={savingNotes}
                    className="px-3 py-1.5 bg-cyan-900/40 border border-cyan-700 text-cyan-400 rounded text-[11px] hover:bg-cyan-900/60 transition-colors disabled:opacity-50"
                  >
                    {savingNotes ? 'Saving...' : 'Save Notes'}
                  </button>
                </div>

                {/* Location History */}
                <div className="space-y-1.5">
                  <button
                    onClick={() => setShowHistory(h => !h)}
                    className="flex items-center gap-1.5 text-gray-500 uppercase tracking-widest text-[10px] font-mono hover:text-gray-300 transition-colors"
                  >
                    <Signal className="w-3 h-3" />
                    Location History ({detail.pings.length})
                    {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  {showHistory && (
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {detail.pings.length === 0 ? (
                        <p className="text-gray-600 italic">No pings yet</p>
                      ) : (
                        detail.pings.map(ping => (
                          <div key={ping.id} className="px-2 py-1.5 bg-gray-900 rounded border border-gray-800 font-mono text-[10px]">
                            <div className="text-cyan-700">{ping.lat.toFixed(5)}, {ping.lng.toFixed(5)}</div>
                            <div className="flex gap-2 text-gray-600 mt-0.5">
                              <span>{new Date(ping.timestamp).toLocaleString()}</span>
                              {ping.battery != null && <span className={batteryColor(ping.battery)}>{ping.battery}%</span>}
                              {ping.network && <span>{ping.network}</span>}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-gray-600 flex-shrink-0">{label}</span>
      <span className="text-gray-300 text-right truncate">{value || '—'}</span>
    </div>
  );
}
