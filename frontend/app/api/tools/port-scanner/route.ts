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

import net from 'net';

// Common port services mapping
const PORT_SERVICES: { [key: number]: string } = {
  20: 'FTP Data',
  21: 'FTP Control',
  22: 'SSH',
  23: 'Telnet',
  25: 'SMTP',
  53: 'DNS',
  80: 'HTTP',
  110: 'POP3',
  143: 'IMAP',
  443: 'HTTPS',
  445: 'SMB',
  465: 'SMTPS',
  587: 'SMTP (Submission)',
  993: 'IMAPS',
  995: 'POP3S',
  3306: 'MySQL',
  3389: 'RDP',
  5432: 'PostgreSQL',
  5900: 'VNC',
  6379: 'Redis',
  8000: 'HTTP Alt',
  8080: 'HTTP Proxy',
  8443: 'HTTPS Alt',
  8888: 'HTTP Alt',
};

function parsePortRange(portRange: string): number[] {
  const ports: number[] = [];
  const parts = portRange.split(',');

  for (const part of parts) {
    const trimmed = part.trim();

    if (trimmed.includes('-')) {
      // Range like "80-100"
      const [start, end] = trimmed.split('-').map((p) => parseInt(p.trim()));
      if (start && end && start <= end) {
        for (let port = start; port <= Math.min(end, 65535); port++) {
          if (ports.length < 100) ports.push(port); // Limit to 100 ports
        }
      }
    } else {
      // Single port
      const port = parseInt(trimmed);
      if (port && port > 0 && port <= 65535 && ports.length < 100) {
        ports.push(port);
      }
    }
  }

  return Array.from(new Set(ports)).sort((a, b) => a - b);
}

function scanPort(
  host: string,
  port: number,
  timeout: number = 2000
): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let connected = false;

    socket.setTimeout(timeout);

    socket.on('connect', () => {
      connected = true;
      socket.destroy();
      resolve(true);
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });

    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });

    socket.connect(port, host);
  });
}

export async function POST(request: NextRequest) {
  try {
    const { host, portRange } = await request.json();

    if (!host || typeof host !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Host is required' },
        { status: 400 },
        {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    if (!portRange || typeof portRange !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Port range is required' },
        { status: 400 },
        {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    // Clean host
    const cleanHost = host
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')
      .split('/')[0];

    // Parse ports
    const ports = parsePortRange(portRange);

    if (ports.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid port range' },
        { status: 400 },
        {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    if (ports.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Maximum 100 ports can be scanned at once' },
        { status: 400 },
        {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    const startTime = Date.now();

    // Scan ports (with limited concurrency)
    const results = [];
    const batchSize = 10;

    for (let i = 0; i < ports.length; i += batchSize) {
      const batch = ports.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (port) => {
          const isOpen = await scanPort(cleanHost, port, 3000);
          return {
            port,
            status: isOpen ? 'open' : 'closed',
            service: PORT_SERVICES[port] || undefined,
          };
        })
      );
      results.push(...batchResults);
    }

    const scanTime = (Date.now() - startTime) / 1000;

    return NextResponse.json(
      {
        success: true,
        data: {
          host: cleanHost,
          ports: results,
          scanTime,
        },
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  } catch (error: any) {
    console.error('Port Scanner Error:', error);

    let errorMessage = 'Failed to scan ports';

    if (error.code === 'ENOTFOUND') {
      errorMessage = 'Host not found';
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
