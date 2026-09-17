import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Device } from '../App';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons (Vite doesn't copy them automatically)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const trackingIcon = new L.DivIcon({
    html: `<div style="width:14px;height:14px;border-radius:50%;background:#ef4444;border:2px solid #fff;box-shadow:0 0 0 3px #ef444466;animation:pulse 1.5s infinite"></div>
           <style>@keyframes pulse{0%,100%{box-shadow:0 0 0 3px #ef444466}50%{box-shadow:0 0 0 7px #ef444400}}</style>`,
    className: '',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
});

const dormantIcon = new L.DivIcon({
    html: `<div style="width:10px;height:10px;border-radius:50%;background:#6366f1;border:2px solid #fff;opacity:0.7"></div>`,
    className: '',
    iconSize: [10, 10],
    iconAnchor: [5, 5],
});

function AutoFit({ devices }: { devices: Device[] }) {
    const map = useMap();
    const initialized = useRef(false);
    useEffect(() => {
        const withCoords = devices.filter(d => d.lastLat && d.lastLng);
        if (withCoords.length === 0 || initialized.current) return;
        const bounds = L.latLngBounds(withCoords.map(d => [d.lastLat!, d.lastLng!]));
        map.fitBounds(bounds, { padding: [40, 40] });
        initialized.current = true;
    }, [devices, map]);
    return null;
}

export default function DeviceMap({ devices }: { devices: Device[] }) {
    const withCoords = devices.filter(d => d.lastLat != null && d.lastLng != null);

    return (
        <div style={{ height: '100%', width: '100%' }}>
            <MapContainer
                center={[20, 0]}
                zoom={3}
                style={{ height: '100%', width: '100%' }}
                preferCanvas
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <AutoFit devices={withCoords} />
                {withCoords.map(device => (
                    <Marker
                        key={device.deviceId}
                        position={[device.lastLat!, device.lastLng!]}
                        icon={device.trackingActive ? trackingIcon : dormantIcon}
                    >
                        <Popup>
                            <div style={{ minWidth: 180 }}>
                                <strong>{device.deviceName}</strong>
                                <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>{device.model || device.os}</div>
                                <div style={{ fontSize: 12 }}>
                                    Status: <b style={{ color: device.trackingActive ? '#ef4444' : '#888' }}>
                                        {device.trackingActive ? 'TRACKING' : device.status}
                                    </b>
                                </div>
                                {device.lastBattery != null && (
                                    <div style={{ fontSize: 12 }}>Battery: {device.lastBattery}%</div>
                                )}
                                {device.lastSeenAt && (
                                    <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                                        Last seen: {new Date(device.lastSeenAt).toLocaleString()}
                                    </div>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
