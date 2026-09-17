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
        { success: false, error: 'Domain or URL is required' },
        { status: 400 },
        {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    const cleanDomain = domain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')
      .split('/')[0];
    const apiKey = process.env.WHOIS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Website Categorization API key not configured',
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

    console.log(`Categorizing website: ${cleanDomain}`);

    const apiUrl = `https://website-categorization.whoisxmlapi.com/api/v2?apiKey=${encodeURIComponent(apiKey)}&domainName=${encodeURIComponent(cleanDomain)}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (response.status === 429) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Website categorization service is experiencing high demand. Please try again shortly. 🙏',
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

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Website categorization service is temporarily unavailable. Please try again later. 😊',
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

    const data = await response.json();

    if (data.error || data.ErrorMessage) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Unable to categorize website. Please verify the domain and try again. 🌐',
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

    const categories = data.categories || [];
    const result = {
      domain: cleanDomain,
      categories: categories.map((c: any) => c.name || c).filter(Boolean),
      tier1:
        categories[0]?.tier1?.name || categories[0]?.name || 'Uncategorized',
      tier2:
        categories[0]?.tier2?.map((t: any) => t.name || t).filter(Boolean) ||
        [],
      description: data.website?.description || '',
    };

    return NextResponse.json(
      { success: true, data: result },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  } catch (error: any) {
    console.error('Website Categorization Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred. Please try again later. 💫',
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
