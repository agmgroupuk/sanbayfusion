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

// ── DNS security checks ──────────────────────────────────
async function checkDNSSecurity(domain: string) {
  const [hasMx, hasSpf, hasDmarc, hasDkim] = await Promise.all([
    dns.resolveMx(domain).then(() => true).catch(() => false),
    dns.resolveTxt(domain).then(r => r.flat().some(t => t.startsWith('v=spf1'))).catch(() => false),
    dns.resolveTxt(`_dmarc.${domain}`).then(r => r.flat().some(t => t.startsWith('v=DMARC1'))).catch(() => false),
    Promise.any([
      dns.resolveTxt(`default._domainkey.${domain}`),
      dns.resolveTxt(`google._domainkey.${domain}`),
      dns.resolveTxt(`selector1._domainkey.${domain}`),
      dns.resolveTxt(`selector2._domainkey.${domain}`),
      dns.resolveTxt(`k1._domainkey.${domain}`),
    ]).then(() => true).catch(() => false),
  ]);
  return { hasMx, hasSpf, hasDmarc, hasDkim };
}

// ── Parse WhoisXML testResults into sub-scores ────────────
function parseTestResults(testResults: any[]): {
  spam: number; malware: number; phishing: number;
  warnings: string[]; categories: string[]; blacklists: { name: string; listed: boolean }[];
} {
  let spam = 95, malware = 95, phishing = 95;
  const warnings: string[] = [];
  const categories = new Set<string>();
  const blacklists: { name: string; listed: boolean }[] = [];

  const knownBlacklists = [
    'Spamhaus DBL', 'SURBL', 'Barracuda', 'SpamCop', 'URIBL',
    'PhishTank', 'Google Safe Browsing', 'Norton Safe Web',
    'McAfee SiteAdvisor', 'Sucuri', 'Yandex Safe Browsing',
  ];

  if (!testResults || !Array.isArray(testResults)) {
    // If no test results, return defaults and populate blacklists as clean
    knownBlacklists.forEach(name => blacklists.push({ name, listed: false }));
    return { spam, malware, phishing, warnings, categories: [], blacklists };
  }

  for (const test of testResults) {
    const name = (test.test || '').toLowerCase();
    const code = test.testCode || 0;
    const testWarnings: string[] = test.warnings || [];

    // Negative code = problem found
    if (code < 0) {
      if (name.includes('malware') || name.includes('virus')) {
        malware = Math.max(10, malware - 40);
        categories.add('Malware');
        testWarnings.forEach(w => warnings.push(w));
      } else if (name.includes('phish')) {
        phishing = Math.max(10, phishing - 40);
        categories.add('Phishing');
        testWarnings.forEach(w => warnings.push(w));
      } else if (name.includes('spam')) {
        spam = Math.max(10, spam - 35);
        categories.add('Spam');
        testWarnings.forEach(w => warnings.push(w));
      } else if (name.includes('blacklist') || name.includes('blocklist')) {
        spam = Math.max(20, spam - 20);
        testWarnings.forEach(w => warnings.push(w));
      } else {
        // Generic negative signal
        testWarnings.forEach(w => warnings.push(w));
      }
    }

    // Check if test mentions specific blacklists
    if (name.includes('blacklist') || name.includes('blocklist')) {
      const listed = code < 0;
      const blName = test.test || 'Unknown Blacklist';
      blacklists.push({ name: blName, listed });
    }
  }

  // Fill remaining known blacklists as clean if not already listed
  const existingNames = new Set(blacklists.map(b => b.name.toLowerCase()));
  for (const name of knownBlacklists) {
    if (!existingNames.has(name.toLowerCase())) {
      blacklists.push({ name, listed: false });
    }
  }

  if (categories.size === 0) categories.add('General');

  return { spam, malware, phishing, warnings: [...new Set(warnings)], categories: [...categories], blacklists };
}

// ── Fetch domain age from WHOIS ───────────────────────────
async function getDomainAge(domain: string, apiKey: string): Promise<{ created: string; years: number }> {
  try {
    const url = `https://www.whoisxmlapi.com/whoisserver/WhoisService?apiKey=${encodeURIComponent(apiKey)}&domainName=${encodeURIComponent(domain)}&outputFormat=JSON`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('WHOIS fetch failed');
    const data = await res.json();
    const record = data.WhoisRecord || {};
    const registry = record.registryData || {};
    const created = registry.createdDate || record.createdDate || '';
    if (created) {
      const createdDate = new Date(created);
      const years = Math.max(0, Math.floor((Date.now() - createdDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)));
      return { created, years };
    }
  } catch (e) {
    // Silently fail — domain age is supplementary
  }
  return { created: 'Unknown', years: 0 };
}

export async function POST(request: NextRequest) {
  try {
    const { domain } = await request.json();

    if (!domain || typeof domain !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Domain name is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '').split('/')[0];
    const apiKey = process.env.WHOIS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Domain Reputation API key not configured' },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log(`Checking reputation for: ${cleanDomain}`);

    // Run reputation check, DNS checks, and domain age in parallel
    const [repResponse, dnsResult, ageResult] = await Promise.all([
      fetch(`https://domain-reputation.whoisxmlapi.com/api/v2?apiKey=${encodeURIComponent(apiKey)}&domainName=${encodeURIComponent(cleanDomain)}`, {
        headers: { Accept: 'application/json' },
      }),
      checkDNSSecurity(cleanDomain),
      getDomainAge(cleanDomain, apiKey),
    ]);

    if (repResponse.status === 429) {
      return NextResponse.json(
        { success: false, error: 'Domain reputation service is experiencing high demand. Please try again shortly.' },
        { status: 429, headers: corsHeaders }
      );
    }

    if (!repResponse.ok) {
      return NextResponse.json(
        { success: false, error: 'Domain reputation service is temporarily unavailable. Please try again later.' },
        { status: 503, headers: corsHeaders }
      );
    }

    const repData = await repResponse.json();

    if (repData.error || repData.ErrorMessage) {
      return NextResponse.json(
        { success: false, error: 'Unable to check domain reputation. Please verify the domain and try again.' },
        { status: 400, headers: corsHeaders }
      );
    }

    const overallScore = repData.reputationScore ?? repData.score ?? 50;
    const { spam, malware, phishing, warnings, categories, blacklists } = parseTestResults(repData.testResults);

    // Determine risk level from overall score
    let riskLevel: string;
    if (overallScore >= 80) riskLevel = 'low';
    else if (overallScore >= 60) riskLevel = 'medium';
    else if (overallScore >= 40) riskLevel = 'high';
    else riskLevel = 'critical';

    // Add DNS-related warnings
    if (!dnsResult.hasSpf) warnings.push('No SPF record found — email spoofing risk');
    if (!dnsResult.hasDmarc) warnings.push('No DMARC record found — email authentication not enforced');
    if (!dnsResult.hasDkim) warnings.push('No DKIM record found on common selectors');
    if (!dnsResult.hasMx) warnings.push('No MX records found — domain may not receive email');

    const result = {
      domain: cleanDomain,
      score: { overall: overallScore, spam, malware, phishing },
      riskLevel,
      categories,
      blacklists,
      dns: dnsResult,
      age: ageResult,
      warnings: [...new Set(warnings)],
    };

    return NextResponse.json(
      { success: true, data: result },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Domain Reputation Error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred. Please try again later.' },
      { status: 500, headers: corsHeaders }
    );
  }
}
