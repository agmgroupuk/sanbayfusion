import { NextRequest, NextResponse } from 'next/server';

// GET /api/ipinfo?ip=1.2.3.4
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryIP = searchParams.get('ip')?.trim() || '';

    // Get client IP from headers (set by NGINX/proxy) or request
    const forwardedFor =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '';
    const realIP = request.headers.get('x-real-ip') || '';

    // Priority: query param > x-forwarded-for > x-real-ip
    const targetIP = queryIP || forwardedFor || realIP || '';

    // Use ip-api.com (free, no key needed) as primary
    const ipApiFields =
      'status,message,query,reverse,country,regionName,city,zip,lat,lon,timezone,isp,org,as,asname,mobile,proxy,hosting';
    const ipApiUrl = `http://ip-api.com/json/${encodeURIComponent(targetIP || '')}?fields=${ipApiFields}`;

    let raw = null;
    let source = 'ip-api.com';

    try {
      const response = await fetch(ipApiUrl, {
        headers: { Accept: 'application/json' },
      });
      raw = await response.json();

      if (!response.ok || raw?.status === 'fail') {
        throw new Error(raw?.message || 'ip-api.com lookup failed');
      }
    } catch (err) {
      // Fallback to ipapi.co
      console.log('[ipinfo] ip-api.com failed, trying ipapi.co:', err);

      const ipapiUrl = `https://ipapi.co/${encodeURIComponent(targetIP || '')}/json/`;
      const response2 = await fetch(ipapiUrl, {
        headers: { Accept: 'application/json' },
      });
      const json2 = await response2.json();

      if (!response2.ok || json2?.error) {
        return NextResponse.json(
          { success: false, error: json2?.reason || 'IP lookup failed' },
          { status: 502 }
        );
      }
      raw = json2;
      source = 'ipapi.co';
    }

    // Normalize into the shape expected by the frontend
    const isIpApi = source === 'ip-api.com';

    const ip = isIpApi ? raw.query || '' : raw.ip || '';
    const city = isIpApi ? raw.city : raw.city;
    const region = isIpApi ? raw.regionName : raw.region || raw.region_code;
    const country = isIpApi ? raw.country : raw.country_name || raw.country;
    const postal = isIpApi ? raw.zip : raw.postal;
    const timezone = isIpApi ? raw.timezone : raw.timezone;
    const lat = isIpApi ? raw.lat : raw.latitude;
    const lon = isIpApi ? raw.lon : raw.longitude;
    const isp = isIpApi ? raw.isp : raw.org || raw.org;
    const org = isIpApi ? raw.org : raw.org || raw.org;
    const asFull = isIpApi ? raw.as : raw.asn || '';
    const asName = isIpApi ? raw.asname : raw.asn_name || '';
    const reverse = isIpApi ? raw.reverse : raw.hostname || '';
    const proxy = isIpApi ? !!raw.proxy : !!raw.proxy;
    const hosting = isIpApi
      ? !!raw.hosting
      : raw.hosting === true ||
        /cloud|hosting|datacenter/i.test(org || isp || '');

    // Derive ASN number if embedded like "AS15169 Google LLC"
    let asn = '';
    if (asFull) {
      const m = String(asFull).match(/AS\d+/i);
      asn = m ? m[0].toUpperCase() : String(asFull);
    }

    // Build normalized response
    const data = {
      ip,
      location: {
        city,
        region,
        country,
        coordinates: lat && lon ? { lat, lng: lon } : undefined,
        postal,
        timezone,
      },
      network: {
        isp,
        organization: org,
        asn,
        asnName: asName,
        domain: reverse ? reverse.split('.').slice(-2).join('.') : undefined,
        type: hosting ? 'hosting' : proxy ? 'proxy' : 'residential',
      },
      security: {
        isVPN: proxy && !hosting,
        isProxy: proxy,
        isTor: false, // ip-api doesn't detect Tor specifically
        isHosting: hosting,
        threat: proxy || hosting ? 'medium' : 'low',
      },
      metadata: {
        hostname: reverse || undefined,
        lastUpdated: new Date().toISOString(),
        source,
      },
    };

    return NextResponse.json({
      success: true,
      data,
      raw,
    });
  } catch (error) {
    console.error('[ipinfo] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'IP lookup failed',
      },
      { status: 500 }
    );
  }
}
