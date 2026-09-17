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

export async function POST(request: NextRequest) {
    try {
        const { domain, recordType } = await request.json();

        if (!domain || typeof domain !== 'string') {
            return NextResponse.json(
                { success: false, error: 'Domain name is required' },
                { status: 400, headers: corsHeaders }
            );
        }

        const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '').split('/')[0];

        const records: { type: string; name: string; value: string; ttl?: number; priority?: number }[] = [];

        // Helper to safely resolve records
        const resolve = async (type: string, fn: () => Promise<any>) => {
            try {
                const result = await fn();
                return result;
            } catch {
                return null;
            }
        };

        // If a specific record type is requested, only fetch that
        const types = recordType ? [recordType.toUpperCase()] : ['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME', 'SOA'];

        const promises: Promise<void>[] = [];

        if (types.includes('A')) {
            promises.push(
                resolve('A', () => dns.resolve4(cleanDomain)).then(result => {
                    if (result) result.forEach((ip: string) => records.push({ type: 'A', name: cleanDomain, value: ip }));
                })
            );
        }

        if (types.includes('AAAA')) {
            promises.push(
                resolve('AAAA', () => dns.resolve6(cleanDomain)).then(result => {
                    if (result) result.forEach((ip: string) => records.push({ type: 'AAAA', name: cleanDomain, value: ip }));
                })
            );
        }

        if (types.includes('MX')) {
            promises.push(
                resolve('MX', () => dns.resolveMx(cleanDomain)).then(result => {
                    if (result) result.forEach((mx: any) => records.push({ type: 'MX', name: cleanDomain, value: mx.exchange, priority: mx.priority }));
                })
            );
        }

        if (types.includes('NS')) {
            promises.push(
                resolve('NS', () => dns.resolveNs(cleanDomain)).then(result => {
                    if (result) result.forEach((ns: string) => records.push({ type: 'NS', name: cleanDomain, value: ns }));
                })
            );
        }

        if (types.includes('TXT')) {
            promises.push(
                resolve('TXT', () => dns.resolveTxt(cleanDomain)).then(result => {
                    if (result) result.forEach((txt: string[]) => records.push({ type: 'TXT', name: cleanDomain, value: txt.join('') }));
                })
            );
        }

        if (types.includes('CNAME')) {
            promises.push(
                resolve('CNAME', () => dns.resolveCname(cleanDomain)).then(result => {
                    if (result) result.forEach((cname: string) => records.push({ type: 'CNAME', name: cleanDomain, value: cname }));
                })
            );
        }

        if (types.includes('SOA')) {
            promises.push(
                resolve('SOA', () => dns.resolveSoa(cleanDomain)).then(result => {
                    if (result) {
                        records.push({
                            type: 'SOA',
                            name: cleanDomain,
                            value: `${result.nsname} ${result.hostmaster} (serial: ${result.serial}, refresh: ${result.refresh}, retry: ${result.retry}, expire: ${result.expire}, minttl: ${result.minttl})`,
                        });
                    }
                })
            );
        }

        await Promise.all(promises);

        // Also check common email security records
        const securityRecords: { spf: string | null; dmarc: string | null; dkim: string[] } = {
            spf: null,
            dmarc: null,
            dkim: [],
        };

        const txtRecords = records.filter(r => r.type === 'TXT');
        for (const txt of txtRecords) {
            if (txt.value.startsWith('v=spf1')) securityRecords.spf = txt.value;
        }

        // Check DMARC
        try {
            const dmarcRecords = await dns.resolveTxt(`_dmarc.${cleanDomain}`);
            for (const rec of dmarcRecords) {
                const val = rec.join('');
                if (val.startsWith('v=DMARC1')) {
                    securityRecords.dmarc = val;
                    records.push({ type: 'TXT', name: `_dmarc.${cleanDomain}`, value: val });
                }
            }
        } catch { /* no DMARC */ }

        // Check DKIM on common selectors
        for (const selector of ['default', 'google', 'selector1', 'selector2', 'k1']) {
            try {
                const dkimRecords = await dns.resolveTxt(`${selector}._domainkey.${cleanDomain}`);
                for (const rec of dkimRecords) {
                    const val = rec.join('');
                    securityRecords.dkim.push(`${selector}: ${val.substring(0, 80)}...`);
                    records.push({ type: 'TXT', name: `${selector}._domainkey.${cleanDomain}`, value: val });
                }
            } catch { /* no DKIM for this selector */ }
        }

        // Get nameservers
        let nameservers: string[] = [];
        try {
            nameservers = await dns.resolveNs(cleanDomain);
        } catch { /* ignore */ }

        return NextResponse.json({
            success: true,
            data: {
                domain: cleanDomain,
                records,
                nameservers,
                security: securityRecords,
                totalRecords: records.length,
                timestamp: new Date().toISOString(),
            },
        }, { headers: corsHeaders });
    } catch (error: any) {
        console.error('DNS Lookup Error:', error);
        return NextResponse.json(
            { success: false, error: 'DNS lookup failed. Please check the domain and try again.' },
            { status: 500, headers: corsHeaders }
        );
    }
}
