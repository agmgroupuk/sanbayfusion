'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Globe,
  RefreshCw,
  Smartphone,
  Monitor,
  Tablet,
  Cpu,
} from 'lucide-react';

const API_BASE = '/api/admin/dashboard';

interface GeoData {
  countries: Array<{ country: string; count: number }>;
  cities: Array<{ city: string; country: string; count: number }>;
}

interface DeviceData {
  devices: Array<{ deviceType: string; count: number }>;
  browsers: Array<{ browser: string; count: number }>;
  os: Array<{ os: string; count: number }>;
}

export default function GeoPage() {
  const [geoData, setGeoData] = useState<GeoData | null>(null);
  const [deviceData, setDeviceData] = useState<DeviceData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [geoRes, devRes] = await Promise.all([
        fetch(`${API_BASE}/geo`, { credentials: 'include' }),
        fetch(`${API_BASE}/devices`, { credentials: 'include' }),
      ]);
      const [geoJson, devJson] = await Promise.all([
        geoRes.json(),
        devRes.json(),
      ]);
      if (geoJson.success) setGeoData(geoJson.data);
      if (devJson.success) setDeviceData(devJson.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const deviceIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="w-4 h-4" />;
      case 'tablet':
        return <Tablet className="w-4 h-4" />;
      case 'desktop':
        return <Monitor className="w-4 h-4" />;
      default:
        return <Cpu className="w-4 h-4" />;
    }
  };

  const BarList = ({
    items,
    label,
  }: {
    items: Array<{ name: string; value: number }>;
    label: string;
  }) => {
    const max = Math.max(...items.map((i) => i.value), 1);
    const total = items.reduce((s, i) => s + i.value, 0);
    return (
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.name}>
            <div className="flex items-center justify-between text-xs mb-0.5">
              <span className="text-gray-300">{item.name || 'Unknown'}</span>
              <span className="text-gray-500 tabular-nums">
                {item.value.toLocaleString()} (
                {((item.value / total) * 100).toFixed(1)}%)
              </span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full transition-all"
                style={{ width: `${(item.value / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Geographic & Devices
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Where visitors come from & what they use
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="p-1.5 rounded-lg bg-white/5 text-gray-400 border border-white/[0.06]"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
          />
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Countries */}
        {geoData && (
          <div className="bg-[#111113] border border-white/[0.06] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-400" /> Countries
              </h3>
            </div>
            <div className="p-4">
              <BarList
                items={geoData.countries.map((c) => ({
                  name: c.country,
                  value: c.count,
                }))}
                label="Country"
              />
            </div>
          </div>
        )}

        {/* Cities */}
        {geoData && (
          <div className="bg-[#111113] border border-white/[0.06] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <h3 className="text-sm font-medium text-white">Top Cities</h3>
            </div>
            <div className="p-4">
              <BarList
                items={geoData.cities.map((c) => ({
                  name: `${c.city}, ${c.country}`,
                  value: c.count,
                }))}
                label="City"
              />
            </div>
          </div>
        )}

        {/* Device Types */}
        {deviceData && (
          <div className="bg-[#111113] border border-white/[0.06] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-pink-400" /> Device Types
              </h3>
            </div>
            <div className="p-4 space-y-3">
              {deviceData.devices.map((d) => {
                const total = deviceData.devices.reduce(
                  (s, x) => s + x.count,
                  0
                );
                const pct = ((d.count / total) * 100).toFixed(1);
                return (
                  <div key={d.deviceType} className="flex items-center gap-3">
                    <div className="text-gray-400">
                      {deviceIcon(d.deviceType)}
                    </div>
                    <span className="text-xs text-white capitalize flex-1">
                      {d.deviceType || 'Unknown'}
                    </span>
                    <span className="text-xs text-gray-500 tabular-nums">
                      {d.count.toLocaleString()} ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Browsers */}
        {deviceData && (
          <div className="bg-[#111113] border border-white/[0.06] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <h3 className="text-sm font-medium text-white">Browsers</h3>
            </div>
            <div className="p-4">
              <BarList
                items={deviceData.browsers.map((b) => ({
                  name: b.browser,
                  value: b.count,
                }))}
                label="Browser"
              />
            </div>
          </div>
        )}
      </div>

      {/* OS */}
      {deviceData && (
        <div className="bg-[#111113] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <h3 className="text-sm font-medium text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-yellow-400" /> Operating Systems
            </h3>
          </div>
          <div className="p-4">
            <BarList
              items={deviceData.os.map((o) => ({ name: o.os, value: o.count }))}
              label="OS"
            />
          </div>
        </div>
      )}
    </div>
  );
}
