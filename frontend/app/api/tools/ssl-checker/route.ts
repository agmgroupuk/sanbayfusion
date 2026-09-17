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

import https from 'https';
import tls from 'tls';

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
      .replace(/\/$/, '')
      .split('/')[0];

    // Check SSL certificate
    const certInfo = await new Promise<any>((resolve, reject) => {
      const options = {
        host: cleanDomain,
        port: 443,
        method: 'GET',
        rejectUnauthorized: false,
        agent: false,
      };

      const req = https.request(options, (res) => {
        const cert = (res.socket as tls.TLSSocket).getPeerCertificate();

        if (!cert || Object.keys(cert).length === 0) {
          reject(new Error('No certificate found'));
          return;
        }

        resolve(cert);
        req.abort();
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.end();
    });

    // Parse certificate data
    const validFrom = new Date(certInfo.valid_from);
    const validTo = new Date(certInfo.valid_to);
    const now = new Date();
    const daysRemaining = Math.floor(
      (validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    const isValid = now >= validFrom && now <= validTo;

    let warning = '';
    if (!isValid) {
      if (now < validFrom) {
        warning = 'Certificate is not yet valid';
      } else {
        warning = 'Certificate has expired';
      }
    } else if (daysRemaining < 30) {
      warning = `Certificate expires in ${daysRemaining} days`;
    }

    const result = {
      domain: cleanDomain,
      valid: isValid,
      issuer: certInfo.issuer?.O || certInfo.issuer?.CN || 'Unknown',
      subject: certInfo.subject?.CN || cleanDomain,
      validFrom: certInfo.valid_from,
      validTo: certInfo.valid_to,
      daysRemaining,
      serialNumber: certInfo.serialNumber,
      signatureAlgorithm: certInfo.sigalg,
      keySize: certInfo.bits,
      subjectAltNames: certInfo.subjectaltname
        ? certInfo.subjectaltname
            .split(', ')
            .map((n: string) => n.replace('DNS:', ''))
        : [],
      warning: warning || undefined,
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
    console.error('SSL Checker Error:', error);

    let errorMessage = 'Failed to check SSL certificate';

    if (error.code === 'ENOTFOUND') {
      errorMessage = 'Domain not found';
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Connection refused - domain may not support HTTPS';
    } else if (error.code === 'CERT_HAS_EXPIRED') {
      errorMessage = 'Certificate has expired';
    } else if (error.message) {
      errorMessage = error.message;
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
}
