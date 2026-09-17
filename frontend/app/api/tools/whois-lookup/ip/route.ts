import { NextRequest, NextResponse } from 'next/server';
import dns from 'dns/promises';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
    return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
    try {
        const { ip } = await request.json();

        if (!ip || typeof ip !== 'string') {
            return NextResponse.json(
                { success: false, error: 'IP address is required' },
                { status: 400, headers: corsHeaders }
            );
        }

        const cleanIP = ip.trim();

        // Validate IP format
        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
        const ipv6Regex = /^[0-9a-fA-F:]+$/;

        if (!ipv4Regex.test(cleanIP) && !ipv6Regex.test(cleanIP)) {
            return NextResponse.json(
                { success: false, error: 'Invalid IP address format' },
                { status: 400, headers: corsHeaders }
            );
        }

        // Use ip-api.com (free, no key required, 45 req/min)
        const geoResponse = await fetch(`http://ip-api.com/json/${cleanIP}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,asname,reverse,mobile,proxy,hosting,query`);

        if (!geoResponse.ok) {
            throw new Error('IP geolocation API failed');
        }

        const geoData = await geoResponse.json();

        if (geoData.status === 'fail') {
            return NextResponse.json(
                { success: false, error: geoData.message || 'IP lookup failed' },
                { status: 400, headers: corsHeaders }
            );
        }

        // Reverse DNS lookup
        let hostname = geoData.reverse || '';
        if (!hostname) {
            try {
                const hostnames = await dns.reverse(cleanIP);
                hostname = hostnames[0] || '';
            } catch { /* no reverse DNS */ }
        }

        const result = {
            ip: cleanIP,
            hostname,
            location: {
                country: geoData.country || '',
                countryCode: geoData.countryCode || '',
                region: geoData.regionName || '',
                city: geoData.city || '',
                zip: geoData.zip || '',
                latitude: geoData.lat,
                longitude: geoData.lon,
                timezone: geoData.timezone || '',
            },
            isp: {
                name: geoData.isp || '',
                organization: geoData.org || '',
                as: geoData.as || '',
                asName: geoData.asname || '',
            },
            security: {
                isProxy: geoData.proxy || false,
                isMobile: geoData.mobile || false,
                isHosting: geoData.hosting || false,
            },
            timestamp: new Date().toISOString(),
        };

        return NextResponse.json(
            { success: true, data: result },
            { headers: corsHeaders }
        );
    } catch (error: any) {
        console.error('IP Lookup Error:', error);
        return NextResponse.json(
            { success: false, error: 'IP lookup failed. Please try again.' },
            { status: 500, headers: corsHeaders }
        );
    }
}
