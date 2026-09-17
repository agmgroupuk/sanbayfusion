import { NextRequest, NextResponse } from 'next/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

// Convert numeric IP to string format (for display purposes)
function numericToIP(num: number): string {
  if (!num || num > 4294967295) return ''; // Only valid for IPv4
  return [
    (num >>> 24) & 255,
    (num >>> 16) & 255,
    (num >>> 8) & 255,
    num & 255,
  ].join('.');
}

// Calculate CIDR from IP range
function calculateCIDR(start: string, end: string): string {
  try {
    const startParts = start.split('.').map(Number);
    const endParts = end.split('.').map(Number);
    
    const startNum = (startParts[0] << 24) + (startParts[1] << 16) + (startParts[2] << 8) + startParts[3];
    const endNum = (endParts[0] << 24) + (endParts[1] << 16) + (endParts[2] << 8) + endParts[3];
    
    const size = (endNum - startNum + 1) >>> 0;
    const prefix = 32 - Math.log2(size);
    
    if (Number.isInteger(prefix) && prefix >= 0 && prefix <= 32) {
      return `${start}/${prefix}`;
    }
    return 'N/A';
  } catch {
    return 'N/A';
  }
}

// Calculate range size from IP range string
function calculateRangeSize(rangeStr: string): number {
  try {
    const parts = rangeStr.split(' - ');
    if (parts.length !== 2) return 0;
    
    const startParts = parts[0].trim().split('.').map(Number);
    const endParts = parts[1].trim().split('.').map(Number);
    
    const startNum = (startParts[0] << 24) + (startParts[1] << 16) + (startParts[2] << 8) + startParts[3];
    const endNum = (endParts[0] << 24) + (endParts[1] << 16) + (endParts[2] << 8) + endParts[3];
    
    return (endNum - startNum + 1) >>> 0;
  } catch {
    return 0;
  }
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
    const apiKey = process.env.WHOIS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API key not configured' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Use WHOIS XML API IP Netblocks endpoint
    const apiUrl = `https://ip-netblocks.whoisxmlapi.com/api/v2?apiKey=${encodeURIComponent(apiKey)}&ip=${encodeURIComponent(cleanIP)}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (response.status === 429) {
      return NextResponse.json(
        { success: false, error: 'Service experiencing high demand. Please try again shortly. 🙏' },
        { status: 429, headers: corsHeaders }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: 'Service temporarily unavailable. Please try again later. 😊' },
        { status: 503, headers: corsHeaders }
      );
    }

    const data = await response.json();
    
    // The API returns data under result.inetnums
    const inetnums = data.result?.inetnums || data.inetnums || [];
    const netblock = inetnums[0] || {};
    
    // Get the human-readable IP range (inetnum field has the proper format)
    const ipRange = netblock.inetnum || 'N/A';
    const rangeStart = ipRange !== 'N/A' ? ipRange.split(' - ')[0]?.trim() : 'N/A';
    const rangeEnd = ipRange !== 'N/A' ? ipRange.split(' - ')[1]?.trim() : 'N/A';
    
    // Calculate CIDR from the AS route or from the range
    const cidr = netblock.as?.route || (rangeStart !== 'N/A' && rangeEnd !== 'N/A' ? calculateCIDR(rangeStart, rangeEnd) : 'N/A');
    
    // Calculate range size
    const rangeSize = ipRange !== 'N/A' ? calculateRangeSize(ipRange) : 0;
    
    // Organization is in the description array
    const description = Array.isArray(netblock.description) ? netblock.description.join(', ') : (netblock.description || 'N/A');
    
    // Extract all available fields based on actual API response
    const result = {
      // Basic info
      ip: cleanIP,
      range: ipRange,
      rangeStart,
      rangeEnd,
      rangeSize,
      
      // Network info
      netname: netblock.netname || 'N/A',
      nethandle: netblock.nethandle || 'N/A',
      nettype: netblock.as?.type || 'N/A',
      cidr,
      parent: netblock.parent || 'N/A',
      
      // Organization info (from description array in this API)
      organization: description,
      orgId: netblock.mntBy?.[0]?.mntner || 'N/A',
      
      // Location
      country: netblock.country || 'N/A',
      city: netblock.city || 'N/A',
      
      // Dates
      updated: netblock.modified || 'N/A',
      created: 'N/A', // Not provided by this API
      
      // Additional info
      description,
      source: netblock.source || 'N/A',
      status: 'ALLOCATED', // APNIC typically has allocated blocks
      
      // ASN info
      as: {
        asn: netblock.as?.asn ? `AS${netblock.as.asn}` : 'N/A',
        name: netblock.as?.name || 'N/A',
        route: netblock.as?.route || 'N/A',
        domain: netblock.as?.domain || 'N/A',
        type: netblock.as?.type || 'N/A',
      },
      
      // Abuse contact
      abuseContact: netblock.abuseContact?.[0] ? {
        email: netblock.abuseContact[0].email || 'N/A',
        phone: netblock.abuseContact[0].phone || 'N/A',
        role: netblock.abuseContact[0].role || 'N/A',
      } : null,
      
      // Admin contact
      adminContact: netblock.adminContact?.[0] ? {
        email: netblock.adminContact[0].email || 'N/A',
        role: netblock.adminContact[0].role || 'N/A',
      } : null,
      
      // All netblocks if multiple
      totalNetblocks: inetnums.length,
      allNetblocks: inetnums.slice(0, 5).map((nb: any) => {
        const nbRange = nb.inetnum || 'N/A';
        const nbDesc = Array.isArray(nb.description) ? nb.description.join(', ') : (nb.description || 'N/A');
        return {
          range: nbRange,
          netname: nb.netname || 'N/A',
          organization: nbDesc,
          cidr: nb.as?.route || 'N/A',
          size: nbRange !== 'N/A' ? calculateRangeSize(nbRange) : 0,
          asn: nb.as?.asn ? `AS${nb.as.asn}` : 'N/A',
          asnName: nb.as?.name || 'N/A',
        };
      }),
    };

    return NextResponse.json(
      { success: true, data: result },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('[IP Netblocks] Error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred. 💫' },
      { status: 500, headers: corsHeaders }
    );
  }
}
