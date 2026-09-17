import { NextRequest, NextResponse } from 'next/server';

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const { ip } = await request.json();

    if (!ip || typeof ip !== 'string') {
      return NextResponse.json(
        { success: false, error: 'IP address is required' },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    // Clean IP address
    const cleanIP = ip.trim();

    // Get API keys
    const ipgeoApiKey = process.env.IPGEOLOCATION_API_KEY;
    const whoisApiKey = process.env.IP_GEOLOCATION_API_KEY || process.env.WHOIS_API_KEY;

    if (!ipgeoApiKey && !whoisApiKey) {
      return NextResponse.json(
        { success: false, error: 'IP Geolocation API key not configured' },
        {
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    console.log(`Attempting IP Geolocation lookup for: ${cleanIP}`);

    let result: any = null;

    // Try ipgeolocation.io first (more complete ASN data)
    if (ipgeoApiKey) {
      try {
        const ipgeoUrl = `https://api.ipgeolocation.io/ipgeo?apiKey=${encodeURIComponent(ipgeoApiKey)}&ip=${encodeURIComponent(cleanIP)}`;
        const ipgeoResponse = await fetch(ipgeoUrl, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });

        if (ipgeoResponse.ok) {
          const data = await ipgeoResponse.json();
          if (!data.message) {
            // ipgeolocation.io success - format the response
            console.log('Using ipgeolocation.io data:', JSON.stringify(data, null, 2));
            result = {
              ip: data.ip || cleanIP,
              location: {
                country: data.country_name || 'Unknown',
                countryCode: data.country_code2 || '',
                region: data.state_prov || '',
                city: data.city || '',
                lat: parseFloat(data.latitude) || 0,
                lng: parseFloat(data.longitude) || 0,
                postalCode: data.zipcode || '',
                timezone: data.time_zone?.name || '',
              },
              isp: data.isp || 'Unknown',
              connectionType: data.connection_type || 'broadband',
              organization: data.organization || data.isp || '',
              asn: {
                asn: data.asn || '',
                name: data.as || data.isp || '',
                route: data.asn ? `AS${data.asn}` : '',
                domain: data.isp || '',
              },
              currency: {
                code: data.currency?.code || '',
                name: data.currency?.name || '',
                symbol: data.currency?.symbol || '',
              },
              timezone: {
                name: data.time_zone?.name || '',
                offset: data.time_zone?.offset || 0,
                currentTime: data.time_zone?.current_time || '',
              },
            };
          }
        } else {
          console.log('ipgeolocation.io returned status:', ipgeoResponse.status);
        }
      } catch (e) {
        console.log('ipgeolocation.io failed:', e);
      }
    }

    // Fallback to WHOIS XML API if ipgeolocation.io didn't work
    if (!result && whoisApiKey) {
      try {
        const apiUrl = `https://ip-geolocation.whoisxmlapi.com/api/v1?apiKey=${encodeURIComponent(whoisApiKey)}&ipAddress=${encodeURIComponent(cleanIP)}`;

        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });

        console.log('WHOIS API Response Status:', response.status);

        if (response.ok) {
          const data = await response.json();
          
          if (!data.error) {
            console.log('Using WHOIS XML API data');
            result = {
              ip: data.ip || cleanIP,
              location: {
                country: data.location?.country || 'Unknown',
                countryCode: data.location?.countryCode || '',
                region: data.location?.region || '',
                city: data.location?.city || '',
                lat: data.location?.lat || 0,
                lng: data.location?.lng || 0,
                postalCode: data.location?.postalCode || '',
                timezone: data.location?.timezone || '',
              },
              isp: data.isp || 'Unknown',
              connectionType: data.connection_type || data.connectionType || 'Unknown',
              organization: data.organization || data.org || '',
              asn: {
                asn: data.as?.asn || data.asn || '',
                name: data.as?.name || data.as_name || '',
                route: data.as?.route || data.as_route || '',
                domain: data.as?.domain || '',
              },
            };
          }
        }
      } catch (e) {
        console.log('WHOIS API failed:', e);
      }
    }

    // If both APIs failed, return error
    if (!result) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unable to retrieve geolocation data. Please verify the IP address and try again.',
        },
        {
          status: 503,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  } catch (error: any) {
    console.error('IP Geolocation Lookup Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred while looking up the IP address. Please try again later.',
      },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  }
}
