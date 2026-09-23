/**
 * GEO & LOCATION TOOLS (8 tools)
 * geo_geocode, geo_route, geo_distance, geo_fence,
 * geo_timezone, geo_ip_locate, geo_poi, geo_address_validate
 *
 * Geocoding, routing, distance calculations, geofencing,
 * timezone lookup, IP geolocation, POI search, address validation
 * with persistent fences in PostgreSQL via Prisma.
 * NO localStorage — ALL database storage.
 */

import { prisma } from '../prisma.js';

// Earth radius in km
const EARTH_RADIUS_KM = 6371;
const EARTH_RADIUS_MI = 3959;

// ── geo_geocode ─────────────────────────────────────────────────
async function geoGeocode(params) {
    const { action = 'forward', userId, ...opts } = params;

    try {
        switch (action) {
            case 'forward': {
                if (!opts.address) return { success: false, error: 'address required' };
                // Use Nominatim (OpenStreetMap) free geocoding API
                const encoded = encodeURIComponent(opts.address);
                const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=${opts.limit || 5}&addressdetails=1`;

                const resp = await fetch(url, {
                    headers: { 'User-Agent': 'SanbayFusion/3.0 (contact@sanbayfusion.com)' },
                });
                if (!resp.ok) return { success: false, error: `Geocoding failed: ${resp.status}` };
                const results = await resp.json();

                if (results.length === 0) return { success: true, results: [], message: 'No results found' };

                const formatted = results.map(r => ({
                    lat: parseFloat(r.lat),
                    lon: parseFloat(r.lon),
                    displayName: r.display_name,
                    type: r.type,
                    importance: r.importance,
                    address: r.address ? {
                        road: r.address.road,
                        city: r.address.city || r.address.town || r.address.village,
                        state: r.address.state,
                        country: r.address.country,
                        postcode: r.address.postcode,
                    } : undefined,
                    boundingBox: r.boundingbox ? {
                        south: parseFloat(r.boundingbox[0]),
                        north: parseFloat(r.boundingbox[1]),
                        west: parseFloat(r.boundingbox[2]),
                        east: parseFloat(r.boundingbox[3]),
                    } : undefined,
                }));

                return { success: true, query: opts.address, results: formatted };
            }

            case 'reverse': {
                if (opts.lat === undefined || opts.lon === undefined) return { success: false, error: 'lat and lon required' };
                const url = `https://nominatim.openstreetmap.org/reverse?lat=${opts.lat}&lon=${opts.lon}&format=json&addressdetails=1`;

                const resp = await fetch(url, {
                    headers: { 'User-Agent': 'SanbayFusion/3.0 (contact@sanbayfusion.com)' },
                });
                if (!resp.ok) return { success: false, error: `Reverse geocoding failed: ${resp.status}` };
                const result = await resp.json();

                if (result.error) return { success: true, results: [], message: result.error };

                return {
                    success: true,
                    coordinates: { lat: opts.lat, lon: opts.lon },
                    result: {
                        displayName: result.display_name,
                        address: result.address ? {
                            road: result.address.road,
                            houseNumber: result.address.house_number,
                            city: result.address.city || result.address.town || result.address.village,
                            state: result.address.state,
                            country: result.address.country,
                            postcode: result.address.postcode,
                        } : undefined,
                    },
                };
            }

            case 'batch': {
                if (!opts.addresses || !Array.isArray(opts.addresses)) return { success: false, error: 'addresses array required' };
                const results = [];
                for (const addr of opts.addresses.slice(0, 10)) {
                    // Rate limit: 1 req/sec for Nominatim
                    if (results.length > 0) await sleep(1100);
                    const encoded = encodeURIComponent(addr);
                    const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`;
                    try {
                        const resp = await fetch(url, {
                            headers: { 'User-Agent': 'SanbayFusion/3.0 (contact@sanbayfusion.com)' },
                        });
                        const data = await resp.json();
                        if (data.length > 0) {
                            results.push({ address: addr, lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), displayName: data[0].display_name });
                        } else {
                            results.push({ address: addr, error: 'Not found' });
                        }
                    } catch (e) {
                        results.push({ address: addr, error: e.message });
                    }
                }
                return { success: true, results, processed: results.length };
            }

            default:
                return { success: false, error: `Unknown action: ${action}. Use forward, reverse, batch.` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── geo_route ───────────────────────────────────────────────────
async function geoRoute(params) {
    const { action = 'directions', ...opts } = params;

    try {
        switch (action) {
            case 'directions': {
                if (!opts.from || !opts.to) return { success: false, error: 'from and to coordinates required ({lat, lon})' };
                const from = opts.from;
                const to = opts.to;

                // Use OSRM (Open Source Routing Machine) free API
                const profile = opts.profile || 'driving'; // driving, walking, cycling
                const url = `https://router.project-osrm.org/route/v1/${profile}/${from.lon},${from.lat};${to.lon},${to.lat}?overview=full&steps=true&geometries=geojson`;

                const resp = await fetch(url);
                if (!resp.ok) return { success: false, error: `Routing failed: ${resp.status}` };
                const data = await resp.json();

                if (data.code !== 'Ok' || !data.routes?.length) {
                    return { success: false, error: data.message || 'No route found' };
                }

                const route = data.routes[0];
                const steps = route.legs[0]?.steps?.map(s => ({
                    instruction: s.maneuver?.type ? `${s.maneuver.type}${s.maneuver.modifier ? ` ${s.maneuver.modifier}` : ''}` : 'continue',
                    name: s.name || 'unnamed',
                    distance: `${(s.distance / 1000).toFixed(2)} km`,
                    duration: formatDuration(s.duration),
                })) || [];

                return {
                    success: true,
                    route: {
                        distance: `${(route.distance / 1000).toFixed(2)} km`,
                        distanceMi: `${(route.distance / 1609.344).toFixed(2)} mi`,
                        duration: formatDuration(route.duration),
                        profile,
                    },
                    steps: steps.slice(0, 30),
                    from: { lat: from.lat, lon: from.lon },
                    to: { lat: to.lat, lon: to.lon },
                };
            }

            case 'multi_stop': {
                if (!opts.waypoints || !Array.isArray(opts.waypoints) || opts.waypoints.length < 2) {
                    return { success: false, error: 'waypoints array required (min 2 points with lat/lon)' };
                }
                const coords = opts.waypoints.map(w => `${w.lon},${w.lat}`).join(';');
                const profile = opts.profile || 'driving';
                const url = `https://router.project-osrm.org/route/v1/${profile}/${coords}?overview=full&steps=true&geometries=geojson`;

                const resp = await fetch(url);
                if (!resp.ok) return { success: false, error: `Routing failed: ${resp.status}` };
                const data = await resp.json();
                if (data.code !== 'Ok') return { success: false, error: data.message || 'No route' };

                const route = data.routes[0];
                const legs = route.legs.map((leg, i) => ({
                    from: opts.waypoints[i],
                    to: opts.waypoints[i + 1],
                    distance: `${(leg.distance / 1000).toFixed(2)} km`,
                    duration: formatDuration(leg.duration),
                }));

                return {
                    success: true,
                    totalDistance: `${(route.distance / 1000).toFixed(2)} km`,
                    totalDuration: formatDuration(route.duration),
                    legs,
                    stops: opts.waypoints.length,
                };
            }

            case 'isochrone': {
                // Estimate reachable area using distance rings
                if (!opts.center) return { success: false, error: 'center {lat, lon} required' };
                const minutes = opts.minutes || [5, 10, 15, 30];
                const speedKmh = opts.profile === 'walking' ? 5 : opts.profile === 'cycling' ? 15 : 40;

                const rings = minutes.map(m => {
                    const radiusKm = speedKmh * m / 60;
                    const points = 8;
                    const polygon = [];
                    for (let i = 0; i < points; i++) {
                        const bearing = (360 / points) * i;
                        const pt = destinationPoint(opts.center.lat, opts.center.lon, radiusKm, bearing);
                        polygon.push(pt);
                    }
                    return { minutes: m, radiusKm: Math.round(radiusKm * 100) / 100, polygon };
                });

                return { success: true, center: opts.center, rings, speedKmh, note: 'Estimated circles — actual isochrones depend on road network' };
            }

            default:
                return { success: false, error: `Unknown action: ${action}. Use directions, multi_stop, isochrone.` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── geo_distance ────────────────────────────────────────────────
async function geoDistance(params) {
    const { action = 'calculate', ...opts } = params;

    try {
        switch (action) {
            case 'calculate': {
                if (!opts.from || !opts.to) return { success: false, error: 'from and to required ({lat, lon})' };
                // Accept both lon and lng for resilience
                const fromLon = opts.from.lon ?? opts.from.lng;
                const toLon = opts.to.lon ?? opts.to.lng;
                const km = haversine(opts.from.lat, fromLon, opts.to.lat, toLon);
                const mi = km * 0.621371;
                const nm = km * 0.539957;

                return {
                    success: true,
                    distance: { km: round(km, 3), miles: round(mi, 3), nauticalMiles: round(nm, 3), meters: round(km * 1000, 1) },
                    from: opts.from,
                    to: opts.to,
                    bearing: round(bearing(opts.from.lat, fromLon, opts.to.lat, toLon), 1),
                };
            }

            case 'matrix': {
                if (!opts.points || !Array.isArray(opts.points) || opts.points.length < 2) {
                    return { success: false, error: 'points array required (min 2)' };
                }
                const points = opts.points.slice(0, 20);
                const matrix = [];
                for (let i = 0; i < points.length; i++) {
                    const row = [];
                    for (let j = 0; j < points.length; j++) {
                        if (i === j) {
                            row.push(0);
                        } else {
                            row.push(round(haversine(points[i].lat, points[i].lon, points[j].lat, points[j].lon), 3));
                        }
                    }
                    matrix.push(row);
                }

                // Find nearest neighbors
                const nearest = points.map((p, i) => {
                    const distances = matrix[i].map((d, j) => ({ index: j, distance: d, label: points[j].label || `P${j}` }))
                        .filter(d => d.index !== i)
                        .sort((a, b) => a.distance - b.distance);
                    return { point: p.label || `P${i}`, nearest: distances[0] };
                });

                return {
                    success: true,
                    matrix,
                    labels: points.map((p, i) => p.label || `P${i}`),
                    unit: 'km',
                    nearest,
                    totalPairs: points.length * (points.length - 1) / 2,
                };
            }

            case 'within_radius': {
                if (!opts.center || !opts.points) return { success: false, error: 'center and points required' };
                const radius = opts.radius || 10; // km
                const unit = opts.unit || 'km';
                const radiusKm = unit === 'mi' ? radius * 1.60934 : unit === 'nm' ? radius * 1.852 : radius;

                const results = opts.points.map((p, i) => {
                    const dist = haversine(opts.center.lat, opts.center.lon, p.lat, p.lon);
                    return { ...p, index: i, distance: round(dist, 3), within: dist <= radiusKm };
                });

                const within = results.filter(r => r.within);
                const outside = results.filter(r => !r.within);

                return { success: true, within: within.length, outside: outside.length, radius: `${radius} ${unit}`, results: within.sort((a, b) => a.distance - b.distance) };
            }

            case 'midpoint': {
                if (!opts.from || !opts.to) return { success: false, error: 'from and to required' };
                const lat1 = toRad(opts.from.lat);
                const lon1 = toRad(opts.from.lon);
                const lat2 = toRad(opts.to.lat);
                const dLon = toRad(opts.to.lon - opts.from.lon);

                const Bx = Math.cos(lat2) * Math.cos(dLon);
                const By = Math.cos(lat2) * Math.sin(dLon);
                const lat3 = Math.atan2(Math.sin(lat1) + Math.sin(lat2), Math.sqrt((Math.cos(lat1) + Bx) ** 2 + By ** 2));
                const lon3 = lon1 + Math.atan2(By, Math.cos(lat1) + Bx);

                return {
                    success: true,
                    midpoint: { lat: round(toDeg(lat3), 6), lon: round(toDeg(lon3), 6) },
                    from: opts.from,
                    to: opts.to,
                    totalDistance: `${round(haversine(opts.from.lat, opts.from.lon, opts.to.lat, opts.to.lon), 3)} km`,
                };
            }

            default:
                return { success: false, error: `Unknown action: ${action}. Use calculate, matrix, within_radius, midpoint.` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── geo_fence ───────────────────────────────────────────────────
async function geoFence(params) {
    const { action = 'create', userId, ...opts } = params;

    try {
        switch (action) {
            case 'create': {
                if (!opts.name || !opts.center) return { success: false, error: 'name and center {lat, lon} required' };
                const fence = await prisma.geoFence.create({
                    data: {
                        userId: userId || 'system',
                        name: opts.name,
                        type: opts.type || 'circle',
                        center: opts.center,
                        coordinates: opts.coordinates || null,
                        radius: opts.radius || 1.0,
                        active: true,
                        triggers: opts.triggers || ['enter', 'exit'],
                        metadata: opts.metadata || {},
                    },
                });
                return { success: true, fence: { id: fence.id, name: fence.name, type: fence.type, radius: fence.radius, center: fence.center, active: true } };
            }

            case 'check': {
                if (!opts.point) return { success: false, error: 'point {lat, lon} required' };
                const fences = await prisma.geoFence.findMany({
                    where: { userId: userId || undefined, active: true },
                });

                const results = fences.map(fence => {
                    let inside = false;
                    if (fence.type === 'circle') {
                        const dist = haversine(opts.point.lat, opts.point.lon, fence.center.lat, fence.center.lon);
                        inside = dist <= fence.radius;
                    } else if (fence.type === 'polygon' && fence.coordinates) {
                        inside = pointInPolygon(opts.point, fence.coordinates);
                    }

                    return {
                        fenceId: fence.id,
                        name: fence.name,
                        inside,
                        distance: round(haversine(opts.point.lat, opts.point.lon, fence.center.lat, fence.center.lon), 3),
                        triggers: fence.triggers,
                    };
                });

                // Update hit counts for triggered fences
                const triggered = results.filter(r => r.inside);
                for (const t of triggered) {
                    await prisma.geoFence.update({
                        where: { id: t.fenceId },
                        data: { hitCount: { increment: 1 }, lastTriggered: new Date() },
                    });
                }

                return { success: true, point: opts.point, results, triggered: triggered.length, fencesChecked: fences.length };
            }

            case 'list': {
                const fences = await prisma.geoFence.findMany({
                    where: { userId: userId || undefined, ...(opts.active !== undefined ? { active: opts.active } : {}) },
                    orderBy: { createdAt: 'desc' },
                    take: opts.limit || 20,
                });
                return {
                    success: true,
                    fences: fences.map(f => ({
                        id: f.id, name: f.name, type: f.type, center: f.center, radius: f.radius,
                        active: f.active, hitCount: f.hitCount, lastTriggered: f.lastTriggered,
                    })),
                    count: fences.length,
                };
            }

            case 'update': {
                if (!opts.fenceId) return { success: false, error: 'fenceId required' };
                const updates = {};
                if (opts.name) updates.name = opts.name;
                if (opts.radius) updates.radius = opts.radius;
                if (opts.center) updates.center = opts.center;
                if (opts.active !== undefined) updates.active = opts.active;
                if (opts.triggers) updates.triggers = opts.triggers;
                if (opts.metadata) updates.metadata = opts.metadata;

                const fence = await prisma.geoFence.update({
                    where: { id: opts.fenceId },
                    data: updates,
                });
                return { success: true, fence: { id: fence.id, name: fence.name, active: fence.active, radius: fence.radius } };
            }

            case 'delete': {
                if (!opts.fenceId) return { success: false, error: 'fenceId required' };
                await prisma.geoFence.delete({ where: { id: opts.fenceId } });
                return { success: true, deleted: opts.fenceId };
            }

            case 'visualize': {
                const fences = await prisma.geoFence.findMany({
                    where: { userId: userId || undefined, active: true },
                    take: 20,
                });

                if (fences.length === 0) return { success: true, message: 'No active fences' };

                // Generate text representation
                let viz = '## Active Geofences\n\n';
                viz += '| # | Name | Type | Center | Radius (km) | Hits |\n';
                viz += '|---|------|------|--------|-------------|------|\n';
                fences.forEach((f, i) => {
                    const c = f.center;
                    viz += `| ${i + 1} | ${f.name} | ${f.type} | ${c.lat?.toFixed(4)}, ${c.lon?.toFixed(4)} | ${f.radius} | ${f.hitCount} |\n`;
                });

                return { success: true, visualization: viz, count: fences.length };
            }

            default:
                return { success: false, error: `Unknown action: ${action}. Use create, check, list, update, delete, visualize.` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── geo_timezone ────────────────────────────────────────────────
async function geoTimezone(params) {
    const { action = 'lookup', ...opts } = params;

    try {
        switch (action) {
            case 'lookup': {
                if (opts.lat === undefined || opts.lon === undefined) return { success: false, error: 'lat and lon required' };
                // Calculate timezone from longitude (rough but free, no API needed)
                const offsetHours = Math.round(opts.lon / 15);
                const sign = offsetHours >= 0 ? '+' : '';
                const tzName = getApproxTimezone(opts.lat, opts.lon);
                const now = new Date();
                const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
                const localTime = new Date(utcMs + offsetHours * 3600000);

                return {
                    success: true,
                    coordinates: { lat: opts.lat, lon: opts.lon },
                    timezone: tzName,
                    utcOffset: `UTC${sign}${offsetHours}`,
                    offsetHours,
                    currentTimeLocal: localTime.toISOString().replace('Z', ''),
                    currentTimeUTC: now.toISOString(),
                    isDST: false,
                    note: 'Approximate timezone from longitude — use a timezone API for exact boundaries',
                };
            }

            case 'convert': {
                if (!opts.time) return { success: false, error: 'time required (ISO string)' };
                const fromOffset = opts.fromOffset || 0;
                const toOffset = opts.toOffset || 0;
                const inputDate = new Date(opts.time);
                if (isNaN(inputDate.getTime())) return { success: false, error: 'Invalid time format — use ISO 8601' };

                const utcMs = inputDate.getTime() - fromOffset * 3600000;
                const converted = new Date(utcMs + toOffset * 3600000);

                return {
                    success: true,
                    original: { time: opts.time, utcOffset: `UTC${fromOffset >= 0 ? '+' : ''}${fromOffset}` },
                    converted: { time: converted.toISOString().replace('Z', ''), utcOffset: `UTC${toOffset >= 0 ? '+' : ''}${toOffset}` },
                    difference: `${Math.abs(toOffset - fromOffset)} hours`,
                };
            }

            case 'list': {
                // Return major timezone reference
                const zones = [
                    { name: 'UTC', offset: 0, cities: 'London (winter), Reykjavik' },
                    { name: 'EST', offset: -5, cities: 'New York, Toronto' },
                    { name: 'CST', offset: -6, cities: 'Chicago, Mexico City' },
                    { name: 'MST', offset: -7, cities: 'Denver, Phoenix' },
                    { name: 'PST', offset: -8, cities: 'Los Angeles, Vancouver' },
                    { name: 'CET', offset: 1, cities: 'Paris, Berlin, Rome' },
                    { name: 'EET', offset: 2, cities: 'Athens, Helsinki, Cairo' },
                    { name: 'IST', offset: 5.5, cities: 'Mumbai, Delhi, Kolkata' },
                    { name: 'CST (China)', offset: 8, cities: 'Beijing, Shanghai, Singapore' },
                    { name: 'JST', offset: 9, cities: 'Tokyo, Seoul' },
                    { name: 'AEST', offset: 10, cities: 'Sydney, Melbourne' },
                    { name: 'NZST', offset: 12, cities: 'Auckland, Wellington' },
                ];
                return { success: true, timezones: zones, count: zones.length };
            }

            default:
                return { success: false, error: `Unknown action: ${action}. Use lookup, convert, list.` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── geo_ip_locate ───────────────────────────────────────────────
async function geoIpLocate(params) {
    const { action = 'locate', ...opts } = params;

    try {
        switch (action) {
            case 'locate': {
                const ip = opts.ip || 'self';
                // Use free ip-api.com service
                const url = ip === 'self'
                    ? 'http://ip-api.com/json/?fields=66846719'
                    : `http://ip-api.com/json/${ip}?fields=66846719`;

                const resp = await fetch(url);
                if (!resp.ok) return { success: false, error: `IP lookup failed: ${resp.status}` };
                const data = await resp.json();

                if (data.status === 'fail') return { success: false, error: data.message || 'IP lookup failed' };

                return {
                    success: true,
                    ip: data.query,
                    location: {
                        country: data.country,
                        countryCode: data.countryCode,
                        region: data.regionName,
                        city: data.city,
                        zip: data.zip,
                        lat: data.lat,
                        lon: data.lon,
                        timezone: data.timezone,
                    },
                    network: {
                        isp: data.isp,
                        org: data.org,
                        as: data.as,
                        asname: data.asname,
                    },
                    flags: {
                        mobile: data.mobile,
                        proxy: data.proxy,
                        hosting: data.hosting,
                    },
                };
            }

            case 'batch': {
                if (!opts.ips || !Array.isArray(opts.ips)) return { success: false, error: 'ips array required' };
                const batch = opts.ips.slice(0, 20);
                // ip-api.com supports batch POST (up to 100)
                const resp = await fetch('http://ip-api.com/batch?fields=66846719', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(batch.map(ip => ({ query: ip }))),
                });
                if (!resp.ok) return { success: false, error: `Batch lookup failed: ${resp.status}` };
                const results = await resp.json();

                return {
                    success: true,
                    results: results.map(r => ({
                        ip: r.query,
                        country: r.country,
                        city: r.city,
                        lat: r.lat,
                        lon: r.lon,
                        isp: r.isp,
                        proxy: r.proxy,
                        status: r.status,
                    })),
                    count: results.length,
                };
            }

            case 'distance': {
                // Distance between two IPs
                if (!opts.ip1 || !opts.ip2) return { success: false, error: 'ip1 and ip2 required' };
                const urls = [
                    `http://ip-api.com/json/${opts.ip1}?fields=16600`,
                    `http://ip-api.com/json/${opts.ip2}?fields=16600`,
                ];
                const [r1, r2] = await Promise.all(urls.map(u => fetch(u).then(r => r.json())));
                if (r1.status === 'fail' || r2.status === 'fail') return { success: false, error: 'One or both IPs could not be located' };

                const distKm = haversine(r1.lat, r1.lon, r2.lat, r2.lon);
                return {
                    success: true,
                    ip1: { ip: opts.ip1, city: r1.city, country: r1.country, lat: r1.lat, lon: r1.lon },
                    ip2: { ip: opts.ip2, city: r2.city, country: r2.country, lat: r2.lat, lon: r2.lon },
                    distance: { km: round(distKm, 2), miles: round(distKm * 0.621371, 2) },
                };
            }

            default:
                return { success: false, error: `Unknown action: ${action}. Use locate, batch, distance.` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── geo_poi ─────────────────────────────────────────────────────
async function geoPoi(params) {
    const { action = 'search', ...opts } = params;

    try {
        switch (action) {
            case 'search': {
                if (opts.lat === undefined || opts.lon === undefined) return { success: false, error: 'lat and lon required' };
                const category = opts.category || '';
                const radius = opts.radius || 1000; // meters
                const limit = opts.limit || 10;

                // Use Overpass API (OpenStreetMap) for POI search
                let query;
                const categoryMap = {
                    restaurant: 'amenity=restaurant',
                    cafe: 'amenity=cafe',
                    hotel: 'tourism=hotel',
                    hospital: 'amenity=hospital',
                    pharmacy: 'amenity=pharmacy',
                    atm: 'amenity=atm',
                    bank: 'amenity=bank',
                    parking: 'amenity=parking',
                    fuel: 'amenity=fuel',
                    supermarket: 'shop=supermarket',
                    school: 'amenity=school',
                    university: 'amenity=university',
                    museum: 'tourism=museum',
                    park: 'leisure=park',
                    gym: 'leisure=fitness_centre',
                    cinema: 'amenity=cinema',
                    library: 'amenity=library',
                    police: 'amenity=police',
                    post_office: 'amenity=post_office',
                    bus_stop: 'highway=bus_stop',
                };

                const osmTag = categoryMap[category?.toLowerCase()] || (category ? `amenity=${category}` : 'amenity');
                const [key, val] = osmTag.split('=');

                if (val) {
                    query = `[out:json][timeout:10];node["${key}"="${val}"](around:${radius},${opts.lat},${opts.lon});out body ${limit};`;
                } else {
                    query = `[out:json][timeout:10];node["${key}"](around:${radius},${opts.lat},${opts.lon});out body ${limit};`;
                }

                const resp = await fetch('https://overpass-api.de/api/interpreter', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: `data=${encodeURIComponent(query)}`,
                });

                if (!resp.ok) return { success: false, error: `POI search failed: ${resp.status}` };
                const data = await resp.json();

                const pois = (data.elements || []).map((el, i) => ({
                    index: i + 1,
                    name: el.tags?.name || 'Unnamed',
                    category: el.tags?.amenity || el.tags?.shop || el.tags?.tourism || el.tags?.leisure || el.tags?.highway || 'unknown',
                    lat: el.lat,
                    lon: el.lon,
                    distance: `${round(haversine(opts.lat, opts.lon, el.lat, el.lon) * 1000, 0)}m`,
                    address: [el.tags?.['addr:street'], el.tags?.['addr:housenumber'], el.tags?.['addr:city']].filter(Boolean).join(', ') || undefined,
                    phone: el.tags?.phone || el.tags?.['contact:phone'] || undefined,
                    website: el.tags?.website || el.tags?.['contact:website'] || undefined,
                    openingHours: el.tags?.opening_hours || undefined,
                }));

                return {
                    success: true,
                    center: { lat: opts.lat, lon: opts.lon },
                    category: category || 'all amenities',
                    radius: `${radius}m`,
                    results: pois,
                    count: pois.length,
                    categories: Object.keys(categoryMap),
                };
            }

            case 'categories': {
                return {
                    success: true,
                    categories: [
                        { key: 'restaurant', label: 'Restaurants' },
                        { key: 'cafe', label: 'Cafés' },
                        { key: 'hotel', label: 'Hotels' },
                        { key: 'hospital', label: 'Hospitals' },
                        { key: 'pharmacy', label: 'Pharmacies' },
                        { key: 'atm', label: 'ATMs' },
                        { key: 'bank', label: 'Banks' },
                        { key: 'parking', label: 'Parking' },
                        { key: 'fuel', label: 'Gas Stations' },
                        { key: 'supermarket', label: 'Supermarkets' },
                        { key: 'school', label: 'Schools' },
                        { key: 'university', label: 'Universities' },
                        { key: 'museum', label: 'Museums' },
                        { key: 'park', label: 'Parks' },
                        { key: 'gym', label: 'Gyms' },
                        { key: 'cinema', label: 'Cinemas' },
                        { key: 'library', label: 'Libraries' },
                        { key: 'police', label: 'Police Stations' },
                        { key: 'post_office', label: 'Post Offices' },
                        { key: 'bus_stop', label: 'Bus Stops' },
                    ],
                    note: 'Pass category to search action. Omit for all amenities.',
                };
            }

            case 'nearby_summary': {
                if (opts.lat === undefined || opts.lon === undefined) return { success: false, error: 'lat and lon required' };
                const radius = opts.radius || 500;
                const query = `[out:json][timeout:15];(node["amenity"](around:${radius},${opts.lat},${opts.lon});node["shop"](around:${radius},${opts.lat},${opts.lon}););out body 50;`;

                const resp = await fetch('https://overpass-api.de/api/interpreter', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: `data=${encodeURIComponent(query)}`,
                });
                if (!resp.ok) return { success: false, error: `Summary search failed: ${resp.status}` };
                const data = await resp.json();

                const summary = {};
                (data.elements || []).forEach(el => {
                    const cat = el.tags?.amenity || el.tags?.shop || 'other';
                    summary[cat] = (summary[cat] || 0) + 1;
                });

                const sorted = Object.entries(summary).sort((a, b) => b[1] - a[1]).map(([cat, count]) => ({ category: cat, count }));

                return {
                    success: true,
                    center: { lat: opts.lat, lon: opts.lon },
                    radius: `${radius}m`,
                    summary: sorted,
                    totalPOIs: sorted.reduce((s, c) => s + c.count, 0),
                    uniqueCategories: sorted.length,
                };
            }

            default:
                return { success: false, error: `Unknown action: ${action}. Use search, categories, nearby_summary.` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── geo_address_validate ────────────────────────────────────────
async function geoAddressValidate(params) {
    const { action = 'validate', ...opts } = params;

    try {
        switch (action) {
            case 'validate': {
                if (!opts.address) return { success: false, error: 'address required' };
                // Geocode to verify the address exists and get structured result
                const encoded = encodeURIComponent(opts.address);
                const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&addressdetails=1`;
                const resp = await fetch(url, {
                    headers: { 'User-Agent': 'SanbayFusion/3.0 (contact@sanbayfusion.com)' },
                });
                if (!resp.ok) return { success: false, error: `Validation failed: ${resp.status}` };
                const results = await resp.json();

                if (results.length === 0) {
                    return { success: true, valid: false, input: opts.address, message: 'Address could not be verified — no geocoding match found' };
                }

                const r = results[0];
                const addr = r.address || {};
                const standardized = [
                    addr.house_number,
                    addr.road,
                    addr.city || addr.town || addr.village,
                    addr.state,
                    addr.postcode,
                    addr.country,
                ].filter(Boolean).join(', ');

                return {
                    success: true,
                    valid: true,
                    input: opts.address,
                    standardized,
                    confidence: r.importance ? round(r.importance * 100, 1) : undefined,
                    components: {
                        houseNumber: addr.house_number || null,
                        street: addr.road || null,
                        city: addr.city || addr.town || addr.village || null,
                        county: addr.county || null,
                        state: addr.state || null,
                        postcode: addr.postcode || null,
                        country: addr.country || null,
                        countryCode: addr.country_code || null,
                    },
                    coordinates: { lat: parseFloat(r.lat), lon: parseFloat(r.lon) },
                    type: r.type,
                    displayName: r.display_name,
                };
            }

            case 'parse': {
                if (!opts.address) return { success: false, error: 'address required' };
                // Simple regex-based address parser
                const addr = opts.address.trim();
                const parts = {};

                // Try to extract ZIP/postal code
                const zipMatch = addr.match(/\b(\d{5}(-\d{4})?)\b/);
                if (zipMatch) parts.postcode = zipMatch[1];

                // Country codes at end
                const countryMatch = addr.match(/,?\s*(US|USA|UK|CA|AU|DE|FR|JP|IN|SG|NZ|BR)\s*$/i);
                if (countryMatch) parts.countryCode = countryMatch[1].toUpperCase();

                // Comma-separated parts
                const segments = addr.split(',').map(s => s.trim());
                if (segments.length >= 3) {
                    parts.street = segments[0];
                    parts.city = segments[1];
                    const stateZip = segments[2].trim();
                    const szMatch = stateZip.match(/^([A-Za-z\s]+)\s*(\d{5}(-\d{4})?)?$/);
                    if (szMatch) {
                        parts.state = szMatch[1].trim();
                        if (szMatch[2]) parts.postcode = szMatch[2];
                    }
                    if (segments[3]) parts.country = segments[3].trim();
                } else if (segments.length === 2) {
                    parts.street = segments[0];
                    parts.cityState = segments[1];
                } else {
                    parts.raw = addr;
                }

                return {
                    success: true,
                    input: opts.address,
                    parsed: parts,
                    segments: segments.length,
                    note: 'Regex-based parsing — use validate action for verified structured results',
                };
            }

            case 'batch_validate': {
                if (!opts.addresses || !Array.isArray(opts.addresses)) return { success: false, error: 'addresses array required' };
                const results = [];
                for (const addr of opts.addresses.slice(0, 10)) {
                    if (results.length > 0) await sleep(1100); // Rate limit for Nominatim
                    const encoded = encodeURIComponent(addr);
                    const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&addressdetails=1`;
                    try {
                        const resp = await fetch(url, {
                            headers: { 'User-Agent': 'SanbayFusion/3.0 (contact@sanbayfusion.com)' },
                        });
                        const data = await resp.json();
                        if (data.length > 0) {
                            const a = data[0].address || {};
                            results.push({
                                input: addr,
                                valid: true,
                                standardized: [a.house_number, a.road, a.city || a.town, a.state, a.postcode, a.country].filter(Boolean).join(', '),
                                lat: parseFloat(data[0].lat),
                                lon: parseFloat(data[0].lon),
                            });
                        } else {
                            results.push({ input: addr, valid: false });
                        }
                    } catch (e) {
                        results.push({ input: addr, valid: false, error: e.message });
                    }
                }

                const validCount = results.filter(r => r.valid).length;
                return { success: true, results, total: results.length, valid: validCount, invalid: results.length - validCount };
            }

            default:
                return { success: false, error: `Unknown action: ${action}. Use validate, parse, batch_validate.` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}


// ═══════════════════════════════════════════════════════════════
// GEO HELPERS
// ═══════════════════════════════════════════════════════════════

function toRad(deg) { return deg * Math.PI / 180; }
function toDeg(rad) { return rad * 180 / Math.PI; }
function round(v, d) { return Math.round(v * 10 ** d) / 10 ** d; }

function haversine(lat1, lon1, lat2, lon2) {
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function bearing(lat1, lon1, lat2, lon2) {
    const dLon = toRad(lon2 - lon1);
    const y = Math.sin(dLon) * Math.cos(toRad(lat2));
    const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function destinationPoint(lat, lon, distKm, bearingDeg) {
    const d = distKm / EARTH_RADIUS_KM;
    const brng = toRad(bearingDeg);
    const lat1 = toRad(lat);
    const lon1 = toRad(lon);
    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng));
    const lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
    return { lat: round(toDeg(lat2), 6), lon: round(toDeg(lon2), 6) };
}

function pointInPolygon(point, polygon) {
    // Ray casting algorithm
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].lat, yi = polygon[i].lon;
        const xj = polygon[j].lat, yj = polygon[j].lon;
        const intersect = ((yi > point.lon) !== (yj > point.lon)) &&
            (point.lat < (xj - xi) * (point.lon - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

function formatDuration(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Approximate timezone name from coordinates
function getApproxTimezone(lat, lon) {
    // Simple heuristic based on major timezone regions
    const offset = Math.round(lon / 15);
    const tzMap = {
        '-12': 'IDLW', '-11': 'SST', '-10': 'HST', '-9': 'AKST', '-8': 'PST',
        '-7': 'MST', '-6': 'CST', '-5': 'EST', '-4': 'AST', '-3': 'ART',
        '-2': 'GST', '-1': 'AZOT', '0': 'UTC', '1': 'CET', '2': 'EET',
        '3': 'MSK', '4': 'GST', '5': 'PKT', '6': 'BST', '7': 'ICT',
        '8': 'CST', '9': 'JST', '10': 'AEST', '11': 'SBT', '12': 'NZST',
    };
    return tzMap[String(offset)] || `UTC${offset >= 0 ? '+' : ''}${offset}`;
}

export default {
    geoGeocode,
    geoRoute,
    geoDistance,
    geoFence,
    geoTimezone,
    geoIpLocate,
    geoPoi,
    geoAddressValidate,
};
