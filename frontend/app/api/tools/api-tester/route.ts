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
    const { method, url, headers, body } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 },
        {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    if (!method || typeof method !== 'string') {
      return NextResponse.json(
        { success: false, error: 'HTTP method is required' },
        { status: 400 },
        {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid URL format' },
        { status: 400 },
        {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    // Prepare fetch options
    const fetchOptions: RequestInit = {
      method: method.toUpperCase(),
      headers: headers || {},
    };

    // Add body for methods that support it
    if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase()) && body) {
      fetchOptions.body = body;
    }

    try {
      // Make the API request
      const apiResponse = await fetch(url, fetchOptions);

      // Get response headers
      const responseHeaders: Record<string, string> = {};
      apiResponse.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      // Parse response body
      let responseData: any;
      const contentType = apiResponse.headers.get('content-type') || '';

      try {
        if (contentType.includes('application/json')) {
          responseData = await apiResponse.json();
        } else if (contentType.includes('text/')) {
          responseData = await apiResponse.text();
        } else {
          // For binary or other content types, get as text
          responseData = await apiResponse.text();
        }
      } catch (parseError) {
        // If parsing fails, return raw text
        responseData = await apiResponse.text();
      }

      return NextResponse.json(
        {
          success: true,
          data: {
            status: apiResponse.status,
            statusText: apiResponse.statusText,
            headers: responseHeaders,
            data: responseData,
          },
        },
        {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    } catch (fetchError: any) {
      // Handle network errors
      let errorMessage = 'Failed to fetch the API';

      if (fetchError.message) {
        errorMessage = fetchError.message;
      }

      if (fetchError.code === 'ENOTFOUND') {
        errorMessage = 'Host not found';
      } else if (fetchError.code === 'ECONNREFUSED') {
        errorMessage = 'Connection refused';
      } else if (fetchError.code === 'ETIMEDOUT') {
        errorMessage = 'Request timed out';
      }

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
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
  } catch (error: any) {
    console.error('API Tester Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
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
