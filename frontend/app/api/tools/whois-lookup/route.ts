import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

function extractContact(data: any): {
  name: string; organization: string; email: string;
  country: string; state: string; city: string;
} {
  return {
    name: data?.name || data?.contact?.name || '',
    organization: data?.organization || data?.contact?.organization || '',
    email: data?.email || data?.contact?.email || '',
    country: data?.country || data?.countryCode || data?.contact?.country || '',
    state: data?.state || data?.contact?.state || '',
    city: data?.city || data?.contact?.city || '',
  };
}

function buildResult(cleanDomain: string, whoisRecord: any, rawText: string) {
  const registry = whoisRecord.registryData || {};
  const registrant = registry.registrant || whoisRecord.registrant || {};
  const admin = registry.administrativeContact || whoisRecord.administrativeContact || {};
  const tech = registry.technicalContact || whoisRecord.technicalContact || {};

  // Registrar info
  const registrarName = registry.registrarName || whoisRecord.registrarName || 'N/A';
  const registrarUrl = whoisRecord.registrarIANAID
    ? `https://www.internic.net/whois.html`
    : (whoisRecord.contactEmail ? '' : '');

  // Nameservers — ensure array
  let nameservers: string[] = [];
  const nsSource = registry.nameServers || whoisRecord.nameServers;
  if (nsSource?.hostNames && Array.isArray(nsSource.hostNames)) {
    nameservers = nsSource.hostNames;
  } else if (nsSource?.rawText) {
    nameservers = nsSource.rawText.split('\n').map((s: string) => s.trim()).filter(Boolean);
  }

  // Status — ensure array
  let status = registry.status || whoisRecord.status || [];
  if (!Array.isArray(status)) {
    status = status ? [status] : [];
  }

  return {
    domain: cleanDomain,
    registrar: {
      name: registrarName,
      url: registrarUrl || '',
      whoisServer: registry.whoisServer || whoisRecord.registrarName || '',
      abuseContact: whoisRecord.contactEmail || '',
    },
    dates: {
      created: registry.createdDate || whoisRecord.createdDate || '',
      updated: registry.updatedDate || whoisRecord.updatedDate || '',
      expires: registry.expiresDate || whoisRecord.expiresDate || '',
    },
    registrant: extractContact(registrant),
    admin: {
      name: admin.name || admin.contact?.name || '',
      email: admin.email || admin.contact?.email || '',
    },
    tech: {
      name: tech.name || tech.contact?.name || '',
      email: tech.email || tech.contact?.email || '',
    },
    nameservers,
    status,
    dnssec: !!(registry.dnssec || whoisRecord.dnssec || '').toString().match(/signed|yes|true/i),
    rawData: rawText,
  };
}

export async function POST(request: NextRequest) {
  let cleanDomain = '';

  try {
    const { domain } = await request.json();

    if (!domain || typeof domain !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Domain name is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');

    const whoisApiKey = process.env.WHOIS_API_KEY;

    if (!whoisApiKey) {
      return NextResponse.json(
        { success: false, error: 'WHOIS API key not configured' },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log(`Attempting WHOIS lookup for domain: ${cleanDomain}`);

    const apiUrl = `https://www.whoisxmlapi.com/whoisserver/WhoisService?apiKey=${encodeURIComponent(whoisApiKey)}&domainName=${encodeURIComponent(cleanDomain)}&outputFormat=JSON`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`WHOIS API request failed: ${response.status}`);
    }

    const data = await response.json();

    if (data.ErrorMessage) {
      const errorMsg = data.ErrorMessage.msg || 'WHOIS lookup failed';
      const errorCode = data.ErrorMessage.errorCode || '';

      if (errorCode.includes('API_KEY') || errorMsg.includes('authenticate failed')) {
        return NextResponse.json(
          { success: false, error: 'WHOIS API service is currently unavailable. Please try again later.' },
          { status: 503, headers: corsHeaders }
        );
      }

      return NextResponse.json(
        { success: false, error: errorMsg },
        { status: 400, headers: corsHeaders }
      );
    }

    const whoisRecord = data.WhoisRecord || {};
    const rawText = whoisRecord.strippedText || whoisRecord.rawText || '';
    const result = buildResult(cleanDomain, whoisRecord, rawText);

    return NextResponse.json(
      { success: true, data: result },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('WHOIS Lookup Error (trying fallback):', error);

    // Fallback: system whois command
    try {
      const { stdout } = await execAsync(`whois ${cleanDomain}`, { timeout: 30000 });

      const lines = stdout.split('\n');
      const result: any = {
        domain: cleanDomain,
        registrar: { name: 'N/A', url: '', whoisServer: '', abuseContact: '' },
        dates: { created: '', updated: '', expires: '' },
        registrant: { name: '', organization: '', email: '', country: '', state: '', city: '' },
        admin: { name: '', email: '' },
        tech: { name: '', email: '' },
        nameservers: [] as string[],
        status: [] as string[],
        dnssec: false,
        rawData: stdout,
      };

      for (const line of lines) {
        const lower = line.toLowerCase();
        const value = line.split(':').slice(1).join(':').trim();
        if (lower.includes('registrar:') && result.registrar.name === 'N/A') {
          result.registrar.name = value || 'N/A';
        }
        if (lower.includes('creation date:') || lower.includes('created:')) {
          result.dates.created = value;
        }
        if (lower.includes('expiry date:') || lower.includes('expiration date:')) {
          result.dates.expires = value;
        }
        if (lower.includes('updated date:') || lower.includes('last updated:')) {
          result.dates.updated = value;
        }
        if (lower.includes('name server:') || lower.includes('nserver:')) {
          result.nameservers.push(value);
        }
        if (lower.includes('registrant name:')) result.registrant.name = value;
        if (lower.includes('registrant organization:')) result.registrant.organization = value;
        if (lower.includes('registrant country:')) result.registrant.country = value;
        if (lower.includes('registrant state')) result.registrant.state = value;
        if (lower.includes('registrant email:')) result.registrant.email = value;
        if (lower.includes('dnssec:') && lower.includes('signed')) result.dnssec = true;
      }

      return NextResponse.json(
        { success: true, data: result, fallback: true },
        { headers: corsHeaders }
      );
    } catch (fallbackError: any) {
      console.error('Fallback WHOIS Error:', fallbackError);
      return NextResponse.json(
        { success: false, error: 'WHOIS service is currently unavailable.' },
        { status: 503, headers: corsHeaders }
      );
    }
  }
}
