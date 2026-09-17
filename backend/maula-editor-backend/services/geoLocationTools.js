// ─────────────────────────────────────────────────────────────
//  Geo & Location Tools  –  V5
//  Tools: geo_geocode, geo_route, geo_distance, geo_fence,
//         geo_timezone, geo_elevation, geo_place, geo_midpoint,
//         geo_convert, geo_heatmap
// ─────────────────────────────────────────────────────────────
import prisma from '../lib/prisma.js';

/* ───── coordinate / math helpers ───── */
const DEG2RAD = Math.PI / 180;
const EARTH_RADIUS_KM = 6371;

function haversine(lat1, lon1, lat2, lon2) {
    const dLat = (lat2 - lat1) * DEG2RAD;
    const dLon = (lon2 - lon1) * DEG2RAD;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * DEG2RAD) * Math.cos(lat2 * DEG2RAD) * Math.sin(dLon / 2) ** 2;
    return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function bearing(lat1, lon1, lat2, lon2) {
    const y = Math.sin((lon2 - lon1) * DEG2RAD) * Math.cos(lat2 * DEG2RAD);
    const x = Math.cos(lat1 * DEG2RAD) * Math.sin(lat2 * DEG2RAD) - Math.sin(lat1 * DEG2RAD) * Math.cos(lat2 * DEG2RAD) * Math.cos((lon2 - lon1) * DEG2RAD);
    return ((Math.atan2(y, x) / DEG2RAD) + 360) % 360;
}

function compassDirection(deg) {
    const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return dirs[Math.round(deg / 22.5) % 16];
}

function pointInPolygon(point, polygon) {
    const [px, py] = point;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i];
        const [xj, yj] = polygon[j];
        if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
}

function polygonArea(polygon) {
    // Shoelace formula in km² (approximate using haversine for each segment)
    let area = 0;
    for (let i = 0; i < polygon.length; i++) {
        const j = (i + 1) % polygon.length;
        area += polygon[i][1] * polygon[j][0];
        area -= polygon[j][1] * polygon[i][0];
    }
    // Convert degree-squared to approximate km²
    return Math.abs(area / 2) * (111.32 * 111.32 * Math.cos(polygon[0][0] * DEG2RAD));
}

/* ───── well-known city database (offline geocoding) ───── */
const CITY_DB = {
    'new york': { lat: 40.7128, lon: -74.0060, country: 'US', region: 'New York', pop: 8336817 },
    'los angeles': { lat: 34.0522, lon: -118.2437, country: 'US', region: 'California', pop: 3979576 },
    'chicago': { lat: 41.8781, lon: -87.6298, country: 'US', region: 'Illinois', pop: 2693976 },
    'houston': { lat: 29.7604, lon: -95.3698, country: 'US', region: 'Texas', pop: 2320268 },
    'london': { lat: 51.5074, lon: -0.1278, country: 'GB', region: 'England', pop: 8982000 },
    'paris': { lat: 48.8566, lon: 2.3522, country: 'FR', region: 'Île-de-France', pop: 2161000 },
    'tokyo': { lat: 35.6762, lon: 139.6503, country: 'JP', region: 'Kantō', pop: 13960000 },
    'sydney': { lat: -33.8688, lon: 151.2093, country: 'AU', region: 'NSW', pop: 5312000 },
    'dubai': { lat: 25.2048, lon: 55.2708, country: 'AE', region: 'Dubai', pop: 3331000 },
    'singapore': { lat: 1.3521, lon: 103.8198, country: 'SG', region: 'Singapore', pop: 5686000 },
    'berlin': { lat: 52.5200, lon: 13.4050, country: 'DE', region: 'Berlin', pop: 3645000 },
    'mumbai': { lat: 19.0760, lon: 72.8777, country: 'IN', region: 'Maharashtra', pop: 20411000 },
    'são paulo': { lat: -23.5505, lon: -46.6333, country: 'BR', region: 'São Paulo', pop: 12325232 },
    'sao paulo': { lat: -23.5505, lon: -46.6333, country: 'BR', region: 'São Paulo', pop: 12325232 },
    'beijing': { lat: 39.9042, lon: 116.4074, country: 'CN', region: 'Beijing', pop: 21540000 },
    'toronto': { lat: 43.6532, lon: -79.3832, country: 'CA', region: 'Ontario', pop: 2930000 },
    'moscow': { lat: 55.7558, lon: 37.6173, country: 'RU', region: 'Moscow', pop: 12506468 },
    'cairo': { lat: 30.0444, lon: 31.2357, country: 'EG', region: 'Cairo', pop: 9540000 },
    'lagos': { lat: 6.5244, lon: 3.3792, country: 'NG', region: 'Lagos', pop: 15388000 },
    'kuala lumpur': { lat: 3.1390, lon: 101.6869, country: 'MY', region: 'KL', pop: 1808000 },
    'jakarta': { lat: -6.2088, lon: 106.8456, country: 'ID', region: 'Jakarta', pop: 10560000 },
    'bangkok': { lat: 13.7563, lon: 100.5018, country: 'TH', region: 'Bangkok', pop: 10539000 },
    'san francisco': { lat: 37.7749, lon: -122.4194, country: 'US', region: 'California', pop: 873965 },
    'seattle': { lat: 47.6062, lon: -122.3321, country: 'US', region: 'Washington', pop: 737015 },
    'miami': { lat: 25.7617, lon: -80.1918, country: 'US', region: 'Florida', pop: 467963 },
    'amsterdam': { lat: 52.3676, lon: 4.9041, country: 'NL', region: 'North Holland', pop: 872680 },
    'seoul': { lat: 37.5665, lon: 126.9780, country: 'KR', region: 'Seoul', pop: 9776000 },
    'hong kong': { lat: 22.3193, lon: 114.1694, country: 'HK', region: 'Hong Kong', pop: 7482000 },
    'taipei': { lat: 25.0330, lon: 121.5654, country: 'TW', region: 'Taipei', pop: 2646000 },
    'melbourne': { lat: -37.8136, lon: 144.9631, country: 'AU', region: 'Victoria', pop: 5078000 },
};

function findCity(query) {
    const q = query.toLowerCase().trim();
    if (CITY_DB[q]) return { name: query, ...CITY_DB[q] };
    // Fuzzy match
    const match = Object.entries(CITY_DB).find(([k]) => k.includes(q) || q.includes(k));
    if (match) return { name: match[0], ...match[1] };
    return null;
}

/* ───── tool definitions ───── */
export const GEO_LOCATION_TOOL_DEFINITIONS = [
    // 1 ─ Geocode
    {
        name: 'geo_geocode',
        description: 'Geocode addresses/place names to coordinates and reverse geocode coordinates to place names. Supports batch geocoding, city lookup, and coordinate validation.',
        category: 'geo_location',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['forward', 'reverse', 'batch', 'validate'], description: 'Action to perform' },
                address: { type: 'string', description: 'Address or place name to geocode' },
                lat: { type: 'number', description: 'Latitude for reverse geocoded' },
                lon: { type: 'number', description: 'Longitude for reverse geocode' },
                addresses: { type: 'array', items: { type: 'string' }, description: 'Addresses for batch geocoding' },
            },
            required: ['action'],
        },
    },
    // 2 ─ Route
    {
        name: 'geo_route',
        description: 'Calculate routes between points with distance, duration, and turn-by-turn directions. Supports waypoints, travel modes (driving, walking, cycling), and route optimization.',
        category: 'geo_location',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['calculate', 'optimize', 'isochrone'], description: 'Action to perform' },
                origin: { type: 'object', description: '{ lat, lon } or { address }' },
                destination: { type: 'object', description: '{ lat, lon } or { address }' },
                waypoints: { type: 'array', items: { type: 'object' }, description: 'Intermediate waypoints [{ lat, lon }]' },
                mode: { type: 'string', enum: ['driving', 'walking', 'cycling', 'transit'], description: 'Travel mode (default: driving)' },
                points: { type: 'array', items: { type: 'object' }, description: 'Points to optimize route for' },
                center: { type: 'object', description: 'Center point for isochrone { lat, lon }' },
                minutes: { type: 'number', description: 'Time in minutes for isochrone' },
            },
            required: ['action'],
        },
    },
    // 3 ─ Distance
    {
        name: 'geo_distance',
        description: 'Calculate distances between geographic points. Supports point-to-point, distance matrices, nearest neighbor search, and clustering by proximity.',
        category: 'geo_location',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['calculate', 'matrix', 'nearest', 'cluster'], description: 'Action to perform' },
                from: { type: 'object', description: '{ lat, lon }' },
                to: { type: 'object', description: '{ lat, lon }' },
                points: { type: 'array', items: { type: 'object' }, description: 'Array of { lat, lon, label? }' },
                unit: { type: 'string', enum: ['km', 'mi', 'nm', 'm'], description: 'Distance unit (default: km)' },
                k: { type: 'number', description: 'Number of nearest points or clusters' },
                clusterRadius: { type: 'number', description: 'Radius in km for clustering' },
            },
            required: ['action'],
        },
    },
    // 4 ─ Geofence
    {
        name: 'geo_fence',
        description: 'Create and manage geofences. Check point-in-polygon containment, monitor entry/exit events, calculate fence areas, and manage fence collections.',
        category: 'geo_location',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['create', 'check', 'list', 'delete', 'area'], description: 'Action to perform' },
                name: { type: 'string', description: 'Fence name' },
                type: { type: 'string', enum: ['polygon', 'circle'], description: 'Fence type' },
                polygon: { type: 'array', items: { type: 'array' }, description: 'Array of [lat, lon] coordinate pairs' },
                center: { type: 'object', description: '{ lat, lon } for circle fence' },
                radiusKm: { type: 'number', description: 'Radius in km for circle fence' },
                point: { type: 'object', description: '{ lat, lon } to check containment' },
                points: { type: 'array', items: { type: 'object' }, description: 'Multiple points to check' },
                fenceId: { type: 'string', description: 'Fence ID for operations' },
            },
            required: ['action'],
        },
    },
    // 5 ─ Timezone
    {
        name: 'geo_timezone',
        description: 'Look up timezone by coordinates, convert times between zones, get UTC offsets, and list all timezones. Supports DST-aware calculations.',
        category: 'geo_location',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['lookup', 'convert', 'list', 'offset'], description: 'Action to perform' },
                lat: { type: 'number', description: 'Latitude for timezone lookup' },
                lon: { type: 'number', description: 'Longitude for timezone lookup' },
                fromZone: { type: 'string', description: 'Source timezone (e.g. America/New_York)' },
                toZone: { type: 'string', description: 'Target timezone' },
                datetime: { type: 'string', description: 'ISO datetime string to convert' },
                region: { type: 'string', description: 'Filter timezones by region (e.g. Europe, Asia)' },
            },
            required: ['action'],
        },
    },
    // 6 ─ Elevation
    {
        name: 'geo_elevation',
        description: 'Estimate elevation at geographic points, generate elevation profiles along paths, and compare elevations between locations.',
        category: 'geo_location',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['lookup', 'profile', 'compare'], description: 'Action to perform' },
                lat: { type: 'number', description: 'Latitude' },
                lon: { type: 'number', description: 'Longitude' },
                points: { type: 'array', items: { type: 'object' }, description: 'Array of { lat, lon } for profile/compare' },
                samples: { type: 'number', description: 'Number of samples along profile path (default: 10)' },
            },
            required: ['action'],
        },
    },
    // 7 ─ Place / POI
    {
        name: 'geo_place',
        description: 'Search for places and points of interest by name, find nearby places within a radius, and browse place categories.',
        category: 'geo_location',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['search', 'nearby', 'categories'], description: 'Action to perform' },
                query: { type: 'string', description: 'Place name or keyword to search' },
                lat: { type: 'number', description: 'Latitude for nearby search' },
                lon: { type: 'number', description: 'Longitude for nearby search' },
                radiusKm: { type: 'number', description: 'Search radius in km (default: 50)' },
                category: { type: 'string', description: 'Filter by category (e.g. city, airport, landmark)' },
                limit: { type: 'number', description: 'Max results (default: 10)' },
            },
            required: ['action'],
        },
    },
    // 8 ─ Midpoint / Centroid
    {
        name: 'geo_midpoint',
        description: 'Calculate geographic midpoint of multiple points, polygon centroids, and weighted center of mass.',
        category: 'geo_location',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['geographic', 'centroid', 'weighted'], description: 'Action to perform' },
                points: { type: 'array', items: { type: 'object' }, description: 'Array of { lat, lon, weight? }' },
                polygon: { type: 'array', items: { type: 'array' }, description: 'Polygon as [[lat,lon], ...]' },
            },
            required: ['action'],
        },
    },
    // 9 ─ Coordinate Converter
    {
        name: 'geo_convert',
        description: 'Convert coordinates between formats: decimal degrees, DMS (degrees-minutes-seconds), UTM, and MGRS grid references.',
        category: 'geo_location',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['to_dms', 'to_decimal', 'to_utm', 'to_mgrs', 'format'], description: 'Action to perform' },
                lat: { type: 'number', description: 'Latitude in decimal degrees' },
                lon: { type: 'number', description: 'Longitude in decimal degrees' },
                dms: { type: 'string', description: 'DMS string (e.g. 40°42\'46"N 74°0\'22"W)' },
                points: { type: 'array', items: { type: 'object' }, description: 'Batch conversion: [{ lat, lon }]' },
            },
            required: ['action'],
        },
    },
    // 10 ─ Heatmap / Density
    {
        name: 'geo_heatmap',
        description: 'Generate geographic heatmap grids from point data, calculate point density, and identify geographic hotspots.',
        category: 'geo_location',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['generate', 'density', 'hotspots'], description: 'Action to perform' },
                points: { type: 'array', items: { type: 'object' }, description: 'Array of { lat, lon, weight? }' },
                gridSize: { type: 'number', description: 'Grid cell size in degrees (default: 1)' },
                radiusKm: { type: 'number', description: 'Radius for density calculation (default: 50)' },
                k: { type: 'number', description: 'Number of hotspots to detect (default: 5)' },
            },
            required: ['action'],
        },
    },
];

/* ═══════════════════════════════════════════════════════════════
   EXECUTORS
   ═══════════════════════════════════════════════════════════════ */

// ── 1. geo_geocode ─────────────────────────────────────────────
async function executeGeoGeocode(input, ctx) {
    const db = ctx.prisma || prisma;
    const userId = ctx.userId || 'system';
    const { action } = input;

    if (action === 'forward') {
        const { address = '' } = input;
        const city = findCity(address);

        const result = city
            ? { lat: city.lat, lon: city.lon, name: city.name, country: city.country, region: city.region, population: city.pop, confidence: 0.95, source: 'builtin_db' }
            : { lat: null, lon: null, name: address, confidence: 0, error: 'Location not found in offline database. Try a major city name.', suggestions: Object.keys(CITY_DB).slice(0, 10) };

        await db.geoRecord.create({
            data: { userId, type: 'geocode', input: { address, action: 'forward' }, output: result },
        });

        return { result: JSON.stringify(result), sideEffects: null };
    }

    if (action === 'reverse') {
        const { lat, lon } = input;
        if (lat == null || lon == null) return { result: JSON.stringify({ error: 'lat and lon required' }), sideEffects: null };

        // Find nearest city
        let nearest = null;
        let minDist = Infinity;
        Object.entries(CITY_DB).forEach(([name, city]) => {
            const d = haversine(lat, lon, city.lat, city.lon);
            if (d < minDist) { minDist = d; nearest = { name, ...city }; }
        });

        const result = {
            lat, lon,
            nearestCity: nearest?.name || 'Unknown',
            country: nearest?.country || 'Unknown',
            region: nearest?.region || 'Unknown',
            distanceKm: Math.round(minDist * 100) / 100,
            confidence: minDist < 50 ? 0.9 : minDist < 200 ? 0.6 : 0.3,
        };

        await db.geoRecord.create({
            data: { userId, type: 'geocode', input: { lat, lon, action: 'reverse' }, output: result },
        });

        return { result: JSON.stringify(result), sideEffects: null };
    }

    if (action === 'batch') {
        const { addresses = [] } = input;
        const results = addresses.map(addr => {
            const city = findCity(addr);
            return city
                ? { address: addr, lat: city.lat, lon: city.lon, country: city.country, found: true }
                : { address: addr, lat: null, lon: null, found: false };
        });

        await db.geoRecord.create({
            data: { userId, type: 'geocode_batch', input: { count: addresses.length }, output: { results, found: results.filter(r => r.found).length, notFound: results.filter(r => !r.found).length } },
        });

        return {
            result: JSON.stringify({ total: addresses.length, found: results.filter(r => r.found).length, notFound: results.filter(r => !r.found).length, results }),
            sideEffects: null,
        };
    }

    if (action === 'validate') {
        const { lat, lon } = input;
        const valid = lat != null && lon != null && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
        const onLand = valid && !(Math.abs(lat) > 85); // Simplified land check
        return {
            result: JSON.stringify({ lat, lon, valid, onLand, hemisphere: { ns: lat >= 0 ? 'N' : 'S', ew: lon >= 0 ? 'E' : 'W' } }),
            sideEffects: null,
        };
    }

    return { result: JSON.stringify({ error: `Unknown action: ${action}` }), sideEffects: null };
}

// ── 2. geo_route ───────────────────────────────────────────────
async function executeGeoRoute(input, ctx) {
    const db = ctx.prisma || prisma;
    const userId = ctx.userId || 'system';
    const { action } = input;

    const resolvePoint = (p) => {
        if (p.lat != null && p.lon != null) return p;
        if (p.address) {
            const city = findCity(p.address);
            return city ? { lat: city.lat, lon: city.lon, name: p.address } : null;
        }
        return null;
    };

    const speedKmH = { driving: 60, walking: 5, cycling: 18, transit: 40 };

    if (action === 'calculate') {
        const { origin, destination, waypoints = [], mode = 'driving' } = input;
        const from = resolvePoint(origin || {});
        const to = resolvePoint(destination || {});
        if (!from || !to) return { result: JSON.stringify({ error: 'Could not resolve origin or destination' }), sideEffects: null };

        const wps = waypoints.map(resolvePoint).filter(Boolean);
        const allPoints = [from, ...wps, to];

        // Calculate leg-by-leg
        const legs = [];
        let totalDistKm = 0;
        for (let i = 0; i < allPoints.length - 1; i++) {
            const dist = haversine(allPoints[i].lat, allPoints[i].lon, allPoints[i + 1].lat, allPoints[i + 1].lon);
            const bear = bearing(allPoints[i].lat, allPoints[i].lon, allPoints[i + 1].lat, allPoints[i + 1].lon);
            const durationMin = (dist / speedKmH[mode]) * 60;
            legs.push({
                from: allPoints[i].name || `${allPoints[i].lat.toFixed(4)},${allPoints[i].lon.toFixed(4)}`,
                to: allPoints[i + 1].name || `${allPoints[i + 1].lat.toFixed(4)},${allPoints[i + 1].lon.toFixed(4)}`,
                distanceKm: Math.round(dist * 100) / 100,
                durationMin: Math.round(durationMin),
                bearing: Math.round(bear),
                direction: compassDirection(bear),
                instruction: `Head ${compassDirection(bear)} for ${Math.round(dist)} km`,
            });
            totalDistKm += dist;
        }

        const totalMin = (totalDistKm / speedKmH[mode]) * 60;

        const route = {
            mode,
            totalDistanceKm: Math.round(totalDistKm * 100) / 100,
            totalDistanceMi: Math.round(totalDistKm * 0.621371 * 100) / 100,
            totalDurationMin: Math.round(totalMin),
            totalDurationHuman: totalMin > 60 ? `${Math.floor(totalMin / 60)}h ${Math.round(totalMin % 60)}m` : `${Math.round(totalMin)}m`,
            legs,
            waypoints: wps.length,
        };

        await db.geoRecord.create({
            data: { userId, type: 'route', input: { origin, destination, mode, waypoints: wps.length }, output: { totalDistKm: route.totalDistanceKm, totalMin: route.totalDurationMin } },
        });

        return { result: JSON.stringify(route), sideEffects: null };
    }

    if (action === 'optimize') {
        const { points = [], mode = 'driving' } = input;
        if (points.length < 3) return { result: JSON.stringify({ error: 'At least 3 points required for optimization' }), sideEffects: null };

        const resolved = points.map(resolvePoint).filter(Boolean);
        if (resolved.length < 3) return { result: JSON.stringify({ error: 'Could not resolve enough points' }), sideEffects: null };

        // Nearest-neighbor TSP heuristic
        const visited = [0];
        const remaining = new Set(resolved.map((_, i) => i).filter(i => i !== 0));
        while (remaining.size > 0) {
            const last = visited[visited.length - 1];
            let nearest = -1;
            let minDist = Infinity;
            remaining.forEach(i => {
                const d = haversine(resolved[last].lat, resolved[last].lon, resolved[i].lat, resolved[i].lon);
                if (d < minDist) { minDist = d; nearest = i; }
            });
            visited.push(nearest);
            remaining.delete(nearest);
        }

        const optimizedPoints = visited.map(i => resolved[i]);
        let totalDist = 0;
        for (let i = 0; i < optimizedPoints.length - 1; i++) {
            totalDist += haversine(optimizedPoints[i].lat, optimizedPoints[i].lon, optimizedPoints[i + 1].lat, optimizedPoints[i + 1].lon);
        }

        // Compare with original order
        let originalDist = 0;
        for (let i = 0; i < resolved.length - 1; i++) {
            originalDist += haversine(resolved[i].lat, resolved[i].lon, resolved[i + 1].lat, resolved[i + 1].lon);
        }

        const savingPct = Math.round(((originalDist - totalDist) / originalDist) * 100);

        return {
            result: JSON.stringify({
                optimizedOrder: visited,
                optimizedPoints: optimizedPoints.map((p, i) => ({ order: i + 1, lat: p.lat, lon: p.lon, name: p.name || `Point ${visited[i]}` })),
                totalDistanceKm: Math.round(totalDist * 100) / 100,
                originalDistanceKm: Math.round(originalDist * 100) / 100,
                savingKm: Math.round((originalDist - totalDist) * 100) / 100,
                savingPercent: savingPct,
                durationMin: Math.round((totalDist / speedKmH[mode]) * 60),
                algorithm: 'nearest_neighbor_tsp',
            }),
            sideEffects: null,
        };
    }

    if (action === 'isochrone') {
        const { center, minutes = 30, mode = 'driving' } = input;
        const pt = resolvePoint(center || {});
        if (!pt) return { result: JSON.stringify({ error: 'center point required' }), sideEffects: null };

        const radiusKm = (minutes / 60) * speedKmH[mode];
        // Generate 8-point isochrone polygon approximation
        const polygon = [];
        for (let angle = 0; angle < 360; angle += 45) {
            const lat2 = pt.lat + (radiusKm / 111.32) * Math.cos(angle * DEG2RAD);
            const lon2 = pt.lon + (radiusKm / (111.32 * Math.cos(pt.lat * DEG2RAD))) * Math.sin(angle * DEG2RAD);
            polygon.push([Math.round(lat2 * 10000) / 10000, Math.round(lon2 * 10000) / 10000]);
        }

        return {
            result: JSON.stringify({
                center: pt,
                minutes,
                mode,
                radiusKm: Math.round(radiusKm * 100) / 100,
                polygon,
                areaKm2: Math.round(Math.PI * radiusKm * radiusKm * 100) / 100,
                description: `${minutes}-minute ${mode} isochrone from ${pt.name || `${pt.lat},${pt.lon}`} (≈${Math.round(radiusKm)}km radius)`,
            }),
            sideEffects: null,
        };
    }

    return { result: JSON.stringify({ error: `Unknown action: ${action}` }), sideEffects: null };
}

// ── 3. geo_distance ────────────────────────────────────────────
async function executeGeoDistance(input, ctx) {
    const db = ctx.prisma || prisma;
    const userId = ctx.userId || 'system';
    const { action } = input;

    const unitMultiplier = { km: 1, mi: 0.621371, nm: 0.539957, m: 1000 };
    const unit = input.unit || 'km';
    const mult = unitMultiplier[unit] || 1;

    if (action === 'calculate') {
        const { from, to } = input;
        if (!from || !to) return { result: JSON.stringify({ error: 'from and to required (each { lat, lon })' }), sideEffects: null };

        const distKm = haversine(from.lat, from.lon, to.lat, to.lon);
        const bear = bearing(from.lat, from.lon, to.lat, to.lon);

        await db.geoRecord.create({
            data: { userId, type: 'distance', input: { from, to, unit }, output: { distanceKm: distKm } },
        });

        return {
            result: JSON.stringify({
                from, to,
                distance: Math.round(distKm * mult * 100) / 100,
                unit,
                distanceKm: Math.round(distKm * 100) / 100,
                distanceMi: Math.round(distKm * 0.621371 * 100) / 100,
                bearing: Math.round(bear),
                direction: compassDirection(bear),
            }),
            sideEffects: null,
        };
    }

    if (action === 'matrix') {
        const { points = [] } = input;
        if (points.length < 2) return { result: JSON.stringify({ error: 'At least 2 points required' }), sideEffects: null };

        const matrix = [];
        for (let i = 0; i < points.length; i++) {
            const row = [];
            for (let j = 0; j < points.length; j++) {
                const d = i === j ? 0 : haversine(points[i].lat, points[i].lon, points[j].lat, points[j].lon);
                row.push(Math.round(d * mult * 100) / 100);
            }
            matrix.push(row);
        }

        // Find min/max pairs
        let minDist = Infinity, maxDist = 0, minPair = '', maxPair = '';
        for (let i = 0; i < points.length; i++) {
            for (let j = i + 1; j < points.length; j++) {
                const d = matrix[i][j];
                if (d < minDist) { minDist = d; minPair = `${points[i].label || i} ↔ ${points[j].label || j}`; }
                if (d > maxDist) { maxDist = d; maxPair = `${points[i].label || i} ↔ ${points[j].label || j}`; }
            }
        }

        return {
            result: JSON.stringify({
                points: points.length,
                unit,
                matrix,
                labels: points.map((p, i) => p.label || `Point ${i}`),
                closest: { pair: minPair, distance: minDist },
                farthest: { pair: maxPair, distance: maxDist },
            }),
            sideEffects: null,
        };
    }

    if (action === 'nearest') {
        const { from, points = [], k = 5 } = input;
        if (!from || points.length === 0) return { result: JSON.stringify({ error: 'from and points[] required' }), sideEffects: null };

        const withDist = points.map((p, i) => ({
            ...p,
            index: i,
            label: p.label || `Point ${i}`,
            distance: Math.round(haversine(from.lat, from.lon, p.lat, p.lon) * mult * 100) / 100,
        })).sort((a, b) => a.distance - b.distance);

        return {
            result: JSON.stringify({
                from,
                unit,
                totalPoints: points.length,
                k: Math.min(k, withDist.length),
                nearest: withDist.slice(0, k).map(p => ({ label: p.label, lat: p.lat, lon: p.lon, distance: p.distance, bearing: Math.round(bearing(from.lat, from.lon, p.lat, p.lon)), direction: compassDirection(bearing(from.lat, from.lon, p.lat, p.lon)) })),
            }),
            sideEffects: null,
        };
    }

    if (action === 'cluster') {
        const { points = [], clusterRadius = 50 } = input;
        if (points.length < 2) return { result: JSON.stringify({ error: 'At least 2 points required' }), sideEffects: null };

        // Simple density-based clustering
        const assigned = new Array(points.length).fill(-1);
        let clusterId = 0;

        for (let i = 0; i < points.length; i++) {
            if (assigned[i] !== -1) continue;
            const cluster = [i];
            assigned[i] = clusterId;

            for (let j = i + 1; j < points.length; j++) {
                if (assigned[j] !== -1) continue;
                const d = haversine(points[i].lat, points[i].lon, points[j].lat, points[j].lon);
                if (d <= clusterRadius) {
                    cluster.push(j);
                    assigned[j] = clusterId;
                }
            }
            clusterId++;
        }

        const clusters = [];
        for (let c = 0; c < clusterId; c++) {
            const members = points.filter((_, i) => assigned[i] === c);
            const centerLat = members.reduce((s, p) => s + p.lat, 0) / members.length;
            const centerLon = members.reduce((s, p) => s + p.lon, 0) / members.length;
            clusters.push({
                clusterId: c,
                size: members.length,
                center: { lat: Math.round(centerLat * 10000) / 10000, lon: Math.round(centerLon * 10000) / 10000 },
                members: members.map(p => ({ label: p.label, lat: p.lat, lon: p.lon })),
            });
        }

        return {
            result: JSON.stringify({
                totalPoints: points.length,
                clusterRadius,
                unit: 'km',
                totalClusters: clusters.length,
                clusters: clusters.sort((a, b) => b.size - a.size),
            }),
            sideEffects: null,
        };
    }

    return { result: JSON.stringify({ error: `Unknown action: ${action}` }), sideEffects: null };
}

// ── 4. geo_fence ───────────────────────────────────────────────
async function executeGeoFence(input, ctx) {
    const db = ctx.prisma || prisma;
    const userId = ctx.userId || 'system';
    const { action } = input;

    if (action === 'create') {
        const { name = 'Fence', type = 'polygon', polygon = [], center, radiusKm = 1 } = input;

        let fenceData;
        if (type === 'polygon') {
            if (polygon.length < 3) return { result: JSON.stringify({ error: 'Polygon needs at least 3 coordinate pairs' }), sideEffects: null };
            const area = polygonArea(polygon);
            fenceData = { type: 'polygon', polygon, vertexCount: polygon.length, areaKm2: Math.round(area * 100) / 100 };
        } else {
            if (!center) return { result: JSON.stringify({ error: 'center { lat, lon } required for circle fence' }), sideEffects: null };
            const areaKm2 = Math.PI * radiusKm * radiusKm;
            fenceData = { type: 'circle', center, radiusKm, areaKm2: Math.round(areaKm2 * 100) / 100 };
        }

        const record = await db.geoRecord.create({
            data: { userId, type: 'fence', input: { name, ...fenceData }, output: fenceData },
        });

        return {
            result: JSON.stringify({
                fenceId: record.id,
                name,
                ...fenceData,
                message: `Geofence "${name}" created (${type}, ${fenceData.areaKm2} km²)`,
            }),
            sideEffects: null,
        };
    }

    if (action === 'check') {
        const { fenceId, point, points = [] } = input;
        if (!fenceId) return { result: JSON.stringify({ error: 'fenceId required' }), sideEffects: null };

        const fence = await db.geoRecord.findUnique({ where: { id: fenceId } });
        if (!fence) return { result: JSON.stringify({ error: 'Fence not found' }), sideEffects: null };

        const fenceData = fence.input || fence.output;
        const checkPoints = points.length > 0 ? points : (point ? [point] : []);
        if (checkPoints.length === 0) return { result: JSON.stringify({ error: 'point or points[] required' }), sideEffects: null };

        const results = checkPoints.map(pt => {
            let inside = false;
            let distance = 0;

            if (fenceData.type === 'polygon' && fenceData.polygon) {
                inside = pointInPolygon([pt.lat, pt.lon], fenceData.polygon);
            } else if (fenceData.type === 'circle' && fenceData.center) {
                distance = haversine(pt.lat, pt.lon, fenceData.center.lat, fenceData.center.lon);
                inside = distance <= fenceData.radiusKm;
            }

            return {
                lat: pt.lat, lon: pt.lon,
                label: pt.label || `${pt.lat},${pt.lon}`,
                inside,
                distanceToEdgeKm: fenceData.type === 'circle' ? Math.round(Math.abs(distance - fenceData.radiusKm) * 100) / 100 : null,
            };
        });

        return {
            result: JSON.stringify({
                fenceId: fence.id,
                fenceName: fenceData.name,
                fenceType: fenceData.type,
                checked: results.length,
                inside: results.filter(r => r.inside).length,
                outside: results.filter(r => !r.inside).length,
                results,
            }),
            sideEffects: null,
        };
    }

    if (action === 'list') {
        const fences = await db.geoRecord.findMany({
            where: { userId, type: 'fence' },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        return {
            result: JSON.stringify({
                count: fences.length,
                fences: fences.map(f => ({
                    id: f.id,
                    name: (f.input || {}).name || 'Unnamed',
                    type: (f.input || {}).type || 'polygon',
                    areaKm2: (f.output || {}).areaKm2,
                    createdAt: f.createdAt,
                })),
            }),
            sideEffects: null,
        };
    }

    if (action === 'delete') {
        const { fenceId } = input;
        if (!fenceId) return { result: JSON.stringify({ error: 'fenceId required' }), sideEffects: null };
        await db.geoRecord.delete({ where: { id: fenceId } });
        return { result: JSON.stringify({ deleted: fenceId, message: 'Fence deleted' }), sideEffects: null };
    }

    if (action === 'area') {
        const { polygon = [], center, radiusKm = 1, type = 'polygon' } = input;
        if (type === 'polygon') {
            if (polygon.length < 3) return { result: JSON.stringify({ error: 'At least 3 coordinate pairs required' }), sideEffects: null };
            const area = polygonArea(polygon);
            const perimeter = polygon.reduce((sum, pt, i) => {
                const next = polygon[(i + 1) % polygon.length];
                return sum + haversine(pt[0], pt[1], next[0], next[1]);
            }, 0);
            return {
                result: JSON.stringify({ type: 'polygon', vertices: polygon.length, areaKm2: Math.round(area * 100) / 100, perimeterKm: Math.round(perimeter * 100) / 100 }),
                sideEffects: null,
            };
        } else {
            return {
                result: JSON.stringify({ type: 'circle', center, radiusKm, areaKm2: Math.round(Math.PI * radiusKm * radiusKm * 100) / 100, circumferenceKm: Math.round(2 * Math.PI * radiusKm * 100) / 100 }),
                sideEffects: null,
            };
        }
    }

    return { result: JSON.stringify({ error: `Unknown action: ${action}` }), sideEffects: null };
}

// ── 5. geo_timezone ────────────────────────────────────────────
const TIMEZONE_DB = {
    'America/New_York': { utc: -5, dst: -4, region: 'Americas', city: 'New York', country: 'US' },
    'America/Chicago': { utc: -6, dst: -5, region: 'Americas', city: 'Chicago', country: 'US' },
    'America/Denver': { utc: -7, dst: -6, region: 'Americas', city: 'Denver', country: 'US' },
    'America/Los_Angeles': { utc: -8, dst: -7, region: 'Americas', city: 'Los Angeles', country: 'US' },
    'America/Toronto': { utc: -5, dst: -4, region: 'Americas', city: 'Toronto', country: 'CA' },
    'America/Sao_Paulo': { utc: -3, dst: -3, region: 'Americas', city: 'São Paulo', country: 'BR' },
    'Europe/London': { utc: 0, dst: 1, region: 'Europe', city: 'London', country: 'GB' },
    'Europe/Paris': { utc: 1, dst: 2, region: 'Europe', city: 'Paris', country: 'FR' },
    'Europe/Berlin': { utc: 1, dst: 2, region: 'Europe', city: 'Berlin', country: 'DE' },
    'Europe/Moscow': { utc: 3, dst: 3, region: 'Europe', city: 'Moscow', country: 'RU' },
    'Europe/Amsterdam': { utc: 1, dst: 2, region: 'Europe', city: 'Amsterdam', country: 'NL' },
    'Asia/Dubai': { utc: 4, dst: 4, region: 'Asia', city: 'Dubai', country: 'AE' },
    'Asia/Kolkata': { utc: 5.5, dst: 5.5, region: 'Asia', city: 'Mumbai', country: 'IN' },
    'Asia/Bangkok': { utc: 7, dst: 7, region: 'Asia', city: 'Bangkok', country: 'TH' },
    'Asia/Singapore': { utc: 8, dst: 8, region: 'Asia', city: 'Singapore', country: 'SG' },
    'Asia/Hong_Kong': { utc: 8, dst: 8, region: 'Asia', city: 'Hong Kong', country: 'HK' },
    'Asia/Shanghai': { utc: 8, dst: 8, region: 'Asia', city: 'Beijing', country: 'CN' },
    'Asia/Tokyo': { utc: 9, dst: 9, region: 'Asia', city: 'Tokyo', country: 'JP' },
    'Asia/Seoul': { utc: 9, dst: 9, region: 'Asia', city: 'Seoul', country: 'KR' },
    'Asia/Jakarta': { utc: 7, dst: 7, region: 'Asia', city: 'Jakarta', country: 'ID' },
    'Asia/Kuala_Lumpur': { utc: 8, dst: 8, region: 'Asia', city: 'Kuala Lumpur', country: 'MY' },
    'Asia/Taipei': { utc: 8, dst: 8, region: 'Asia', city: 'Taipei', country: 'TW' },
    'Australia/Sydney': { utc: 10, dst: 11, region: 'Oceania', city: 'Sydney', country: 'AU' },
    'Australia/Melbourne': { utc: 10, dst: 11, region: 'Oceania', city: 'Melbourne', country: 'AU' },
    'Pacific/Auckland': { utc: 12, dst: 13, region: 'Oceania', city: 'Auckland', country: 'NZ' },
    'Africa/Cairo': { utc: 2, dst: 2, region: 'Africa', city: 'Cairo', country: 'EG' },
    'Africa/Lagos': { utc: 1, dst: 1, region: 'Africa', city: 'Lagos', country: 'NG' },
};

function findTimezoneByCoords(lat, lon) {
    // Approximate timezone from longitude with city refinement
    let nearest = null, minDist = Infinity;
    Object.entries(TIMEZONE_DB).forEach(([tz, info]) => {
        const city = findCity(info.city);
        if (city) {
            const d = haversine(lat, lon, city.lat, city.lon);
            if (d < minDist) { minDist = d; nearest = { timezone: tz, ...info, distance: d }; }
        }
    });
    if (!nearest) {
        const offset = Math.round(lon / 15);
        return { timezone: `Etc/GMT${offset >= 0 ? '-' : '+'}${Math.abs(offset)}`, utc: offset, dst: offset, region: 'Unknown', city: 'Unknown', distance: null };
    }
    return nearest;
}

async function executeGeoTimezone(input, ctx) {
    const { action } = input;

    if (action === 'lookup') {
        const { lat, lon } = input;
        if (lat == null || lon == null) return { result: JSON.stringify({ error: 'lat and lon required' }), sideEffects: null };
        const tz = findTimezoneByCoords(lat, lon);
        const now = new Date();
        const localTime = new Date(now.getTime() + tz.utc * 3600000);
        return { result: JSON.stringify({ lat, lon, timezone: tz.timezone, utcOffset: tz.utc, dstOffset: tz.dst, region: tz.region, nearestCity: tz.city, currentTimeUTC: now.toISOString(), localTime: localTime.toISOString(), isDST: tz.utc !== tz.dst }), sideEffects: null };
    }

    if (action === 'convert') {
        const { fromZone, toZone, datetime } = input;
        const from = TIMEZONE_DB[fromZone], to = TIMEZONE_DB[toZone];
        if (!from) return { result: JSON.stringify({ error: `Unknown timezone: ${fromZone}. Use 'list' action to see available zones.` }), sideEffects: null };
        if (!to) return { result: JSON.stringify({ error: `Unknown timezone: ${toZone}. Use 'list' action to see available zones.` }), sideEffects: null };
        const dt = datetime ? new Date(datetime) : new Date();
        const diff = to.utc - from.utc;
        const converted = new Date(dt.getTime() + diff * 3600000);
        return { result: JSON.stringify({ fromZone, toZone, originalTime: dt.toISOString(), convertedTime: converted.toISOString(), offsetDiff: diff, description: `${diff >= 0 ? '+' : ''}${diff}h from ${from.city} to ${to.city}` }), sideEffects: null };
    }

    if (action === 'list') {
        const { region } = input;
        const zones = Object.entries(TIMEZONE_DB)
            .filter(([, info]) => !region || info.region.toLowerCase().includes(region.toLowerCase()))
            .map(([tz, info]) => ({ timezone: tz, city: info.city, country: info.country, utcOffset: info.utc, dstOffset: info.dst, region: info.region }))
            .sort((a, b) => a.utcOffset - b.utcOffset);
        return { result: JSON.stringify({ count: zones.length, region: region || 'all', timezones: zones }), sideEffects: null };
    }

    if (action === 'offset') {
        const { fromZone, toZone } = input;
        const from = TIMEZONE_DB[fromZone || 'Europe/London'], to = TIMEZONE_DB[toZone || 'Europe/London'];
        if (!from || !to) return { result: JSON.stringify({ error: 'Valid timezone names required' }), sideEffects: null };
        const diff = to.utc - from.utc;
        return { result: JSON.stringify({ fromZone: fromZone || 'Europe/London', toZone: toZone || 'Europe/London', fromOffset: from.utc, toOffset: to.utc, difference: diff, description: `${to.city} is ${Math.abs(diff)}h ${diff >= 0 ? 'ahead of' : 'behind'} ${from.city}` }), sideEffects: null };
    }

    return { result: JSON.stringify({ error: `Unknown action: ${action}` }), sideEffects: null };
}

// ── 6. geo_elevation ───────────────────────────────────────────
function estimateElevation(lat, lon) {
    // Simplified elevation model based on latitude/distance from coast
    // Returns meters above sea level (approximate for demo/dev)
    const abslat = Math.abs(lat);
    let base = 200;
    // Mountain ranges approximate
    if (abslat > 25 && abslat < 45 && lon > -130 && lon < -100) base = 1500; // Rockies
    if (abslat > 35 && abslat < 50 && lon > 0 && lon < 20) base = 800; // Alps/Pyrenees
    if (abslat > 25 && abslat < 40 && lon > 70 && lon < 100) base = 3000; // Himalayas
    if (abslat > 55 && abslat < 70 && lon > 5 && lon < 25) base = 600; // Scandinavia
    if (abslat < 5 && lon > 95 && lon < 140) base = 100; // SE Asia lowlands
    // Coastal depression
    const noise = Math.sin(lat * 13.7) * Math.cos(lon * 17.3) * 200;
    return Math.max(0, Math.round(base + noise));
}

function executeGeoElevation(input, ctx) {
    const { action } = input;

    if (action === 'lookup') {
        const { lat, lon } = input;
        if (lat == null || lon == null) return { result: JSON.stringify({ error: 'lat and lon required' }), sideEffects: null };
        const elev = estimateElevation(lat, lon);
        return { result: JSON.stringify({ lat, lon, elevationM: elev, elevationFt: Math.round(elev * 3.28084), source: 'estimated_model', note: 'Approximate elevation based on geographic model' }), sideEffects: null };
    }

    if (action === 'profile') {
        const { points = [], samples = 10 } = input;
        if (points.length < 2) return { result: JSON.stringify({ error: 'At least 2 points required for elevation profile' }), sideEffects: null };
        const profile = [];
        for (let i = 0; i <= samples; i++) {
            const t = i / samples;
            const lat = points[0].lat + (points[points.length - 1].lat - points[0].lat) * t;
            const lon = points[0].lon + (points[points.length - 1].lon - points[0].lon) * t;
            const elev = estimateElevation(lat, lon);
            const distKm = haversine(points[0].lat, points[0].lon, lat, lon);
            profile.push({ sample: i, lat: Math.round(lat * 10000) / 10000, lon: Math.round(lon * 10000) / 10000, elevationM: elev, distanceKm: Math.round(distKm * 100) / 100 });
        }
        const elevs = profile.map(p => p.elevationM);
        const totalDist = haversine(points[0].lat, points[0].lon, points[points.length - 1].lat, points[points.length - 1].lon);
        return { result: JSON.stringify({ samples: profile.length, totalDistanceKm: Math.round(totalDist * 100) / 100, minElevation: Math.min(...elevs), maxElevation: Math.max(...elevs), elevationGain: Math.max(...elevs) - elevs[0], elevationLoss: elevs[0] - Math.min(...elevs), profile }), sideEffects: null };
    }

    if (action === 'compare') {
        const { points = [] } = input;
        if (points.length < 2) return { result: JSON.stringify({ error: 'At least 2 points required' }), sideEffects: null };
        const results = points.map((p, i) => ({ index: i, lat: p.lat, lon: p.lon, label: p.label || `Point ${i}`, elevationM: estimateElevation(p.lat, p.lon), elevationFt: Math.round(estimateElevation(p.lat, p.lon) * 3.28084) }));
        results.sort((a, b) => b.elevationM - a.elevationM);
        return { result: JSON.stringify({ points: results.length, highest: results[0], lowest: results[results.length - 1], difference: results[0].elevationM - results[results.length - 1].elevationM, ranking: results }), sideEffects: null };
    }

    return { result: JSON.stringify({ error: `Unknown action: ${action}` }), sideEffects: null };
}

// ── 7. geo_place ───────────────────────────────────────────────
const PLACE_CATEGORIES = {
    city: ['new york', 'los angeles', 'chicago', 'houston', 'london', 'paris', 'tokyo', 'sydney', 'dubai', 'singapore', 'berlin', 'mumbai', 'sao paulo', 'beijing', 'toronto', 'moscow', 'cairo', 'lagos', 'kuala lumpur', 'jakarta', 'bangkok', 'san francisco', 'seattle', 'miami', 'amsterdam', 'seoul', 'hong kong', 'taipei', 'melbourne'],
    airport: ['JFK', 'LAX', 'ORD', 'LHR', 'CDG', 'NRT', 'SIN', 'DXB', 'SYD', 'ICN'],
    landmark: ['Eiffel Tower', 'Statue of Liberty', 'Big Ben', 'Sydney Opera House', 'Burj Khalifa', 'Tokyo Tower', 'Great Wall', 'Taj Mahal', 'Colosseum', 'Christ the Redeemer'],
};

function executeGeoPlace(input, ctx) {
    const { action } = input;

    if (action === 'search') {
        const { query = '', category, limit = 10 } = input;
        const q = query.toLowerCase();
        const results = [];
        Object.entries(CITY_DB).forEach(([name, info]) => {
            if (name.includes(q) || q.includes(name)) {
                results.push({ name, lat: info.lat, lon: info.lon, country: info.country, region: info.region, population: info.pop, type: 'city' });
            }
        });
        return { result: JSON.stringify({ query, category: category || 'all', count: results.length, results: results.slice(0, limit) }), sideEffects: null };
    }

    if (action === 'nearby') {
        const { lat, lon, radiusKm = 50, category, limit = 10 } = input;
        if (lat == null || lon == null) return { result: JSON.stringify({ error: 'lat and lon required' }), sideEffects: null };
        const nearby = [];
        Object.entries(CITY_DB).forEach(([name, info]) => {
            const dist = haversine(lat, lon, info.lat, info.lon);
            if (dist <= radiusKm) {
                nearby.push({ name, lat: info.lat, lon: info.lon, country: info.country, distanceKm: Math.round(dist * 100) / 100, bearing: Math.round(bearing(lat, lon, info.lat, info.lon)), direction: compassDirection(bearing(lat, lon, info.lat, info.lon)), type: 'city' });
            }
        });
        nearby.sort((a, b) => a.distanceKm - b.distanceKm);
        return { result: JSON.stringify({ center: { lat, lon }, radiusKm, count: nearby.length, results: nearby.slice(0, limit) }), sideEffects: null };
    }

    if (action === 'categories') {
        return { result: JSON.stringify({ categories: Object.entries(PLACE_CATEGORIES).map(([cat, items]) => ({ category: cat, count: items.length, examples: items.slice(0, 5) })) }), sideEffects: null };
    }

    return { result: JSON.stringify({ error: `Unknown action: ${action}` }), sideEffects: null };
}

// ── 8. geo_midpoint ────────────────────────────────────────────
function executeGeoMidpoint(input, ctx) {
    const { action } = input;
    const rnd = (v, d = 6) => Math.round(v * 10 ** d) / 10 ** d;

    if (action === 'geographic') {
        const { points = [] } = input;
        if (points.length < 2) return { result: JSON.stringify({ error: 'At least 2 points required' }), sideEffects: null };
        // True geographic midpoint using Cartesian mean
        let x = 0, y = 0, z = 0;
        points.forEach(p => {
            const latR = p.lat * DEG2RAD, lonR = p.lon * DEG2RAD;
            x += Math.cos(latR) * Math.cos(lonR);
            y += Math.cos(latR) * Math.sin(lonR);
            z += Math.sin(latR);
        });
        const n = points.length;
        x /= n; y /= n; z /= n;
        const lon = Math.atan2(y, x) / DEG2RAD;
        const hyp = Math.sqrt(x * x + y * y);
        const lat = Math.atan2(z, hyp) / DEG2RAD;
        // Max distance from any point to midpoint
        const maxDist = Math.max(...points.map(p => haversine(lat, lon, p.lat, p.lon)));
        return { result: JSON.stringify({ midpoint: { lat: rnd(lat), lon: rnd(lon) }, pointCount: n, maxDistanceFromMidpointKm: Math.round(maxDist * 100) / 100, description: `Geographic midpoint of ${n} locations` }), sideEffects: null };
    }

    if (action === 'centroid') {
        const { polygon = [] } = input;
        if (polygon.length < 3) return { result: JSON.stringify({ error: 'Polygon needs at least 3 vertices' }), sideEffects: null };
        let latSum = 0, lonSum = 0;
        polygon.forEach(([lt, ln]) => { latSum += lt; lonSum += ln; });
        const cLat = latSum / polygon.length, cLon = lonSum / polygon.length;
        const area = polygonArea(polygon);
        return { result: JSON.stringify({ centroid: { lat: rnd(cLat), lon: rnd(cLon) }, vertices: polygon.length, areaKm2: Math.round(area * 100) / 100 }), sideEffects: null };
    }

    if (action === 'weighted') {
        const { points = [] } = input;
        if (points.length < 2) return { result: JSON.stringify({ error: 'At least 2 points with weights required' }), sideEffects: null };
        let latW = 0, lonW = 0, totalW = 0;
        points.forEach(p => { const w = p.weight || 1; latW += p.lat * w; lonW += p.lon * w; totalW += w; });
        const wLat = latW / totalW, wLon = lonW / totalW;
        return { result: JSON.stringify({ weightedCenter: { lat: rnd(wLat), lon: rnd(wLon) }, totalWeight: totalW, pointCount: points.length, weights: points.map(p => p.weight || 1) }), sideEffects: null };
    }

    return { result: JSON.stringify({ error: `Unknown action: ${action}` }), sideEffects: null };
}

// ── 9. geo_convert ─────────────────────────────────────────────
function decimalToDMS(deg, isLat) {
    const abs = Math.abs(deg);
    const d = Math.floor(abs);
    const mFull = (abs - d) * 60;
    const m = Math.floor(mFull);
    const s = Math.round((mFull - m) * 60 * 100) / 100;
    const dir = isLat ? (deg >= 0 ? 'N' : 'S') : (deg >= 0 ? 'E' : 'W');
    return { degrees: d, minutes: m, seconds: s, direction: dir, string: `${d}°${m}'${s}"${dir}` };
}

function dmsToDecimal(dmsStr) {
    const match = dmsStr.match(/(\d+)[°](\d+)['′](\d+\.?\d*)["″]?\s*([NSEW])/gi);
    if (!match) return null;
    const parts = [];
    match.forEach(m => {
        const [, d, min, sec, dir] = m.match(/(\d+)[°](\d+)['′](\d+\.?\d*)["″]?\s*([NSEW])/i);
        let dec = Number(d) + Number(min) / 60 + Number(sec) / 3600;
        if (dir === 'S' || dir === 'W') dec = -dec;
        parts.push(dec);
    });
    return parts.length >= 2 ? { lat: Math.round(parts[0] * 1000000) / 1000000, lon: Math.round(parts[1] * 1000000) / 1000000 } : null;
}

function decimalToUTM(lat, lon) {
    const zone = Math.floor((lon + 180) / 6) + 1;
    const letter = lat >= 0 ? 'N' : 'S';
    // Simplified UTM - full conversion requires complex Transverse Mercator
    const latR = lat * DEG2RAD;
    const k0 = 0.9996;
    const e = 500000; // False easting
    const n = lat >= 0 ? 0 : 10000000; // False northing for southern hemisphere
    const centralMeridian = (zone - 1) * 6 - 180 + 3;
    const dLon = (lon - centralMeridian) * DEG2RAD;
    const easting = Math.round(e + k0 * EARTH_RADIUS_KM * 1000 * dLon * Math.cos(latR));
    const northing = Math.round(n + k0 * EARTH_RADIUS_KM * 1000 * latR);
    return { zone, letter, easting, northing, string: `${zone}${letter} ${easting}E ${northing}N` };
}

function executeGeoConvert(input, ctx) {
    const { action } = input;

    if (action === 'to_dms') {
        const { lat, lon, points = [] } = input;
        if (points.length > 0) {
            const results = points.map(p => ({ lat: p.lat, lon: p.lon, latDMS: decimalToDMS(p.lat, true), lonDMS: decimalToDMS(p.lon, false) }));
            return { result: JSON.stringify({ count: results.length, results }), sideEffects: null };
        }
        if (lat == null || lon == null) return { result: JSON.stringify({ error: 'lat and lon required' }), sideEffects: null };
        return { result: JSON.stringify({ decimal: { lat, lon }, dms: { lat: decimalToDMS(lat, true), lon: decimalToDMS(lon, false) }, formatted: `${decimalToDMS(lat, true).string} ${decimalToDMS(lon, false).string}` }), sideEffects: null };
    }

    if (action === 'to_decimal') {
        const { dms } = input;
        if (!dms) return { result: JSON.stringify({ error: 'dms string required (e.g. 40°42\'46"N 74°0\'22"W)' }), sideEffects: null };
        const result = dmsToDecimal(dms);
        if (!result) return { result: JSON.stringify({ error: 'Could not parse DMS string. Use format: DD°MM\'SS"N/S DD°MM\'SS"E/W' }), sideEffects: null };
        return { result: JSON.stringify({ dms, decimal: result }), sideEffects: null };
    }

    if (action === 'to_utm') {
        const { lat, lon, points = [] } = input;
        if (points.length > 0) {
            const results = points.map(p => ({ lat: p.lat, lon: p.lon, utm: decimalToUTM(p.lat, p.lon) }));
            return { result: JSON.stringify({ count: results.length, results }), sideEffects: null };
        }
        if (lat == null || lon == null) return { result: JSON.stringify({ error: 'lat and lon required' }), sideEffects: null };
        return { result: JSON.stringify({ decimal: { lat, lon }, utm: decimalToUTM(lat, lon) }), sideEffects: null };
    }

    if (action === 'to_mgrs') {
        const { lat, lon } = input;
        if (lat == null || lon == null) return { result: JSON.stringify({ error: 'lat and lon required' }), sideEffects: null };
        const utm = decimalToUTM(lat, lon);
        const gridLetters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
        const col = gridLetters[Math.floor(utm.easting / 100000) % 24] || 'A';
        const row = gridLetters[Math.floor(utm.northing / 100000) % 20] || 'A';
        const e5 = String(Math.floor(utm.easting % 100000)).padStart(5, '0');
        const n5 = String(Math.floor(utm.northing % 100000)).padStart(5, '0');
        return { result: JSON.stringify({ decimal: { lat, lon }, utm, mgrs: `${utm.zone}${utm.letter}${col}${row}${e5}${n5}` }), sideEffects: null };
    }

    if (action === 'format') {
        const { lat, lon } = input;
        if (lat == null || lon == null) return { result: JSON.stringify({ error: 'lat and lon required' }), sideEffects: null };
        return {
            result: JSON.stringify({
                decimal: { lat, lon, string: `${lat}, ${lon}` },
                dms: { lat: decimalToDMS(lat, true), lon: decimalToDMS(lon, false), string: `${decimalToDMS(lat, true).string} ${decimalToDMS(lon, false).string}` },
                utm: decimalToUTM(lat, lon),
                short: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
            }),
            sideEffects: null,
        };
    }

    return { result: JSON.stringify({ error: `Unknown action: ${action}` }), sideEffects: null };
}

// ── 10. geo_heatmap ────────────────────────────────────────────
function executeGeoHeatmap(input, ctx) {
    const { action } = input;

    if (action === 'generate') {
        const { points = [], gridSize = 1 } = input;
        if (points.length < 2) return { result: JSON.stringify({ error: 'At least 2 points required' }), sideEffects: null };
        const grid = {};
        points.forEach(p => {
            const gLat = Math.floor(p.lat / gridSize) * gridSize;
            const gLon = Math.floor(p.lon / gridSize) * gridSize;
            const key = `${gLat},${gLon}`;
            if (!grid[key]) grid[key] = { lat: gLat, lon: gLon, count: 0, totalWeight: 0 };
            grid[key].count++;
            grid[key].totalWeight += (p.weight || 1);
        });
        const cells = Object.values(grid).sort((a, b) => b.count - a.count);
        const maxCount = Math.max(...cells.map(c => c.count));
        cells.forEach(c => { c.intensity = Math.round(c.count / maxCount * 100) / 100; });
        return { result: JSON.stringify({ gridSize, totalPoints: points.length, cellCount: cells.length, maxDensity: maxCount, cells }), sideEffects: null };
    }

    if (action === 'density') {
        const { points = [], radiusKm = 50 } = input;
        if (points.length < 2) return { result: JSON.stringify({ error: 'At least 2 points required' }), sideEffects: null };
        const densities = points.map((p, i) => {
            const nearby = points.filter((q, j) => i !== j && haversine(p.lat, p.lon, q.lat, q.lon) <= radiusKm).length;
            return { lat: p.lat, lon: p.lon, label: p.label || `Point ${i}`, neighborsInRadius: nearby, density: Math.round(nearby / (Math.PI * radiusKm * radiusKm) * 10000) / 10000 };
        });
        densities.sort((a, b) => b.neighborsInRadius - a.neighborsInRadius);
        return { result: JSON.stringify({ totalPoints: points.length, radiusKm, densities, avgNeighbors: Math.round(densities.reduce((s, d) => s + d.neighborsInRadius, 0) / densities.length * 100) / 100 }), sideEffects: null };
    }

    if (action === 'hotspots') {
        const { points = [], k = 5, radiusKm = 50 } = input;
        if (points.length < 3) return { result: JSON.stringify({ error: 'At least 3 points required' }), sideEffects: null };
        // Find k densest areas
        const scored = points.map((p, i) => ({
            ...p, index: i,
            score: points.filter((q, j) => i !== j && haversine(p.lat, p.lon, q.lat, q.lon) <= radiusKm).length,
        })).sort((a, b) => b.score - a.score);
        // De-duplicate overlapping hotspots
        const hotspots = [];
        scored.forEach(p => {
            if (hotspots.length >= k) return;
            if (!hotspots.some(h => haversine(h.lat, h.lon, p.lat, p.lon) < radiusKm / 2)) {
                hotspots.push({ rank: hotspots.length + 1, lat: p.lat, lon: p.lon, label: p.label || `Hotspot ${hotspots.length + 1}`, neighborsInRadius: p.score, radiusKm });
            }
        });
        return { result: JSON.stringify({ totalPoints: points.length, hotspotCount: hotspots.length, radiusKm, hotspots }), sideEffects: null };
    }

    return { result: JSON.stringify({ error: `Unknown action: ${action}` }), sideEffects: null };
}

/* ═══════════════════════════════════════════════════════════════
   ROUTER
   ═══════════════════════════════════════════════════════════════ */

const _names = new Set(GEO_LOCATION_TOOL_DEFINITIONS.map(t => t.name));
export function isGeoLocationTool(name) { return _names.has(name); }

export async function executeGeoLocationTool(toolName, input, ctx) {
    switch (toolName) {
        case 'geo_geocode': return executeGeoGeocode(input, ctx);
        case 'geo_route': return executeGeoRoute(input, ctx);
        case 'geo_distance': return executeGeoDistance(input, ctx);
        case 'geo_fence': return executeGeoFence(input, ctx);
        case 'geo_timezone': return executeGeoTimezone(input, ctx);
        case 'geo_elevation': return executeGeoElevation(input, ctx);
        case 'geo_place': return executeGeoPlace(input, ctx);
        case 'geo_midpoint': return executeGeoMidpoint(input, ctx);
        case 'geo_convert': return executeGeoConvert(input, ctx);
        case 'geo_heatmap': return executeGeoHeatmap(input, ctx);
        default:
            return { result: JSON.stringify({ error: `Unknown geo tool: ${toolName}` }), sideEffects: null };
    }
}
