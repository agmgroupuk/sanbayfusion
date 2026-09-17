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
    const baseDomain = domain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')
      .split('.')[0];
    const apiKey = process.env.WHOIS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Domain Availability API key not configured' },
        { status: 500 },
        {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    console.log(`Checking domain availability for: ${baseDomain}`);

    const extensions = ['.com', '.net', '.org', '.io', '.co', '.ai', '.dev'];
    const results: any[] = [];

    // Check each extension
    for (const ext of extensions) {
      const fullDomain = baseDomain + ext;

      try {
        const apiUrl = `https://domain-availability.whoisxmlapi.com/api/v1?apiKey=${encodeURIComponent(apiKey)}&domainName=${encodeURIComponent(fullDomain)}`;

        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        });

        if (response.status === 429) {
          // Rate limit hit - return friendly message
          return NextResponse.json(
            {
              success: false,
              error:
                'Domain availability service is currently experiencing high demand. Please try again in a few moments. 🙏',
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

        if (response.ok) {
          const data = await response.json();
          results.push({
            domain: fullDomain,
            available:
              data.DomainInfo?.domainAvailability === 'AVAILABLE' || false,
          });
        } else {
          // If API fails, mark as unknown
          results.push({
            domain: fullDomain,
            available: false,
          });
        }
      } catch (err) {
        console.error(`Error checking ${fullDomain}:`, err);
        results.push({
          domain: fullDomain,
          available: false,
        });
      }
    }

    if (results.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Unable to check domain availability at this time. Please try again later. 😊',
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

    return NextResponse.json(
      {
        success: true,
        data: results,
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  } catch (error: any) {
    console.error('Domain Availability Check Error:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          'An unexpected error occurred while checking domain availability. Please try again later. 💫',
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
