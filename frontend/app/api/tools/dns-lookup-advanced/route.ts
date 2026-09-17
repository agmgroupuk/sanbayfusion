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
    const { domain } = await request.json();

    if (!domain || typeof domain !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Domain name is required' },
        { status: 400 },
        {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    // Clean domain name
    const cleanDomain = domain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '');
    const apiKey = process.env.DNS_LOOKUP_API_KEY || process.env.WHOIS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'DNS Lookup API key not configured' },
        { status: 500 },
        {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    console.log(`Attempting DNS lookup for domain: ${cleanDomain}`);

    // Call WHOIS XML API DNS Lookup service
    const apiUrl = `https://www.whoisxmlapi.com/whoisserver/DNSService?apiKey=${encodeURIComponent(apiKey)}&domainName=${encodeURIComponent(cleanDomain)}&type=_all&outputFormat=JSON`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    console.log(
      'DNS Lookup API Response Status:',
      response.status,
      response.statusText
    );

    if (!response.ok) {
      // Check if it's a rate limit error
      if (response.status === 429) {
        return NextResponse.json(
          {
            success: false,
            error:
              'DNS Lookup service is currently experiencing high demand. Please try again in a few moments. 🙏',
          },
          { status: 429 },
          {
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
          }
        );
      }

      const errorText = await response.text();
      console.error('DNS Lookup API Error:', errorText);

      return NextResponse.json(
        {
          success: false,
          error:
            'DNS Lookup service is temporarily unavailable. Please try again later. 😊',
        },
        { status: 503 },
        {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    const responseText = await response.text();
    let data: any;

    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('DNS Lookup API returned invalid JSON');
      return NextResponse.json(
        {
          success: false,
          error:
            'Received invalid response from DNS service. Please try again. 🔄',
        },
        { status: 500 },
        {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    // Check for API errors
    if (data.ErrorMessage || data.error) {
      console.error('DNS Lookup API Error:', data.ErrorMessage || data.error);
      return NextResponse.json(
        {
          success: false,
          error:
            'Unable to retrieve DNS records at this time. Please verify the domain name and try again. 🌐',
        },
        { status: 400 },
        {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    // Parse DNS records
    const dnsRecords = data.DNSData?.dnsRecords || [];

    const result = {
      domain: cleanDomain,
      records: {
        A: dnsRecords
          .filter((r: any) => r.dnsType === 'A')
          .map((r: any) => ({
            type: 'A',
            name: r.name || cleanDomain,
            value: r.address || r.value,
            ttl: r.ttl,
          })),
        AAAA: dnsRecords
          .filter((r: any) => r.dnsType === 'AAAA')
          .map((r: any) => ({
            type: 'AAAA',
            name: r.name || cleanDomain,
            value: r.address || r.value,
            ttl: r.ttl,
          })),
        MX: dnsRecords
          .filter((r: any) => r.dnsType === 'MX')
          .map((r: any) => ({
            type: 'MX',
            name: r.name || cleanDomain,
            value: r.target || r.value,
            priority: r.priority,
            ttl: r.ttl,
          })),
        NS: dnsRecords
          .filter((r: any) => r.dnsType === 'NS')
          .map((r: any) => ({
            type: 'NS',
            name: r.name || cleanDomain,
            value: r.target || r.value,
            ttl: r.ttl,
          })),
        TXT: dnsRecords
          .filter((r: any) => r.dnsType === 'TXT')
          .map((r: any) => ({
            type: 'TXT',
            name: r.name || cleanDomain,
            value: r.strings?.join(' ') || r.value || '',
            ttl: r.ttl,
          })),
        CNAME: dnsRecords
          .filter((r: any) => r.dnsType === 'CNAME')
          .map((r: any) => ({
            type: 'CNAME',
            name: r.name || cleanDomain,
            value: r.target || r.value,
            ttl: r.ttl,
          })),
        SOA: dnsRecords
          .filter((r: any) => r.dnsType === 'SOA')
          .map((r: any) => ({
            type: 'SOA',
            name: r.name || cleanDomain,
            value: `${r.mname || ''} ${r.rname || ''}`.trim() || r.value,
            ttl: r.ttl,
          })),
      },
    };

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
    console.error('DNS Lookup Error:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          'An unexpected error occurred while looking up DNS records. Please try again later. 💫',
      },
      { status: 500 },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  }
}
