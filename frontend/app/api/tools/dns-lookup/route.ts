import { NextRequest, NextResponse } from 'next/server';
import dns from 'dns';
import { promisify } from 'util';

const resolve4 = promisify(dns.resolve4);
const resolve6 = promisify(dns.resolve6);
const resolveMx = promisify(dns.resolveMx);
const resolveNs = promisify(dns.resolveNs);
const resolveTxt = promisify(dns.resolveTxt);
const resolveCname = promisify(dns.resolveCname);
const resolveSoa = promisify(dns.resolveSoa);

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

    const results: any = {
      domain: cleanDomain,
      records: {},
    };

    // Query A records (IPv4)
    try {
      const aRecords = await resolve4(cleanDomain, { ttl: true });
      results.records.A = aRecords.map((record: any) => ({
        type: 'A',
        value: record.address,
        ttl: record.ttl,
      }));
    } catch (err) {
      // A records not found
    }

    // Query AAAA records (IPv6)
    try {
      const aaaaRecords = await resolve6(cleanDomain, { ttl: true });
      results.records.AAAA = aaaaRecords.map((record: any) => ({
        type: 'AAAA',
        value: record.address,
        ttl: record.ttl,
      }));
    } catch (err) {
      // AAAA records not found
    }

    // Query MX records
    try {
      const mxRecords = await resolveMx(cleanDomain);
      results.records.MX = mxRecords.map((record: any) => ({
        type: 'MX',
        value: record.exchange,
        priority: record.priority,
      }));
    } catch (err) {
      // MX records not found
    }

    // Query NS records
    try {
      const nsRecords = await resolveNs(cleanDomain);
      results.records.NS = nsRecords.map((record: string) => ({
        type: 'NS',
        value: record,
      }));
    } catch (err) {
      // NS records not found
    }

    // Query TXT records
    try {
      const txtRecords = await resolveTxt(cleanDomain);
      results.records.TXT = txtRecords.map((record: string[]) => ({
        type: 'TXT',
        value: record.join(' '),
      }));
    } catch (err) {
      // TXT records not found
    }

    // Query CNAME records
    try {
      const cnameRecords = await resolveCname(cleanDomain);
      results.records.CNAME = cnameRecords.map((record: string) => ({
        type: 'CNAME',
        value: record,
      }));
    } catch (err) {
      // CNAME records not found
    }

    // Query SOA record
    try {
      const soaRecord = await resolveSoa(cleanDomain);
      results.records.SOA = {
        nsname: soaRecord.nsname,
        hostmaster: soaRecord.hostmaster,
        serial: soaRecord.serial,
        refresh: soaRecord.refresh,
        retry: soaRecord.retry,
        expire: soaRecord.expire,
        minttl: soaRecord.minttl,
      };
    } catch (err) {
      // SOA record not found
    }

    // Check if we got any records
    const hasRecords = Object.keys(results.records).length > 0;
    if (!hasRecords) {
      return NextResponse.json(
        { success: false, error: 'No DNS records found for this domain' },
        { status: 404 },
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
    console.error('DNS Lookup Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to perform DNS lookup',
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
