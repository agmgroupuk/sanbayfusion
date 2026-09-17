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

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { host } = await request.json();

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

    // Clean host
    const cleanHost = host
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')
      .split('/')[0];

    // Determine ping command based on platform
    const isWindows = process.platform === 'win32';
    const pingCommand = isWindows
      ? `ping -n 4 ${cleanHost}`
      : `ping -c 4 ${cleanHost}`;

    try {
      const { stdout } = await execAsync(pingCommand, { timeout: 10000 });

      // Parse ping results
      const lines = stdout.split('\n');

      let alive = true;
      let min = 0,
        max = 0,
        avg = 0;
      let packetLoss = 0;

      if (isWindows) {
        // Windows parsing
        for (const line of lines) {
          // Check for packet loss
          if (line.includes('Lost')) {
            const match = line.match(/\((\d+)%\s+loss\)/);
            if (match) {
              packetLoss = parseInt(match[1]);
            }
          }

          // Parse statistics
          if (line.includes('Minimum') || line.includes('Average')) {
            const parts = line.split(',');
            for (const part of parts) {
              if (part.includes('Minimum')) {
                const match = part.match(/(\d+)ms/);
                if (match) min = parseInt(match[1]);
              }
              if (part.includes('Maximum')) {
                const match = part.match(/(\d+)ms/);
                if (match) max = parseInt(match[1]);
              }
              if (part.includes('Average')) {
                const match = part.match(/(\d+)ms/);
                if (match) avg = parseInt(match[1]);
              }
            }
          }
        }
      } else {
        // Unix/Linux parsing
        for (const line of lines) {
          // Check for packet loss
          if (line.includes('packet loss')) {
            const match = line.match(/(\d+)%\s+packet\s+loss/);
            if (match) {
              packetLoss = parseInt(match[1]);
            }
          }

          // Parse statistics (min/avg/max/mdev)
          if (line.includes('min/avg/max')) {
            const match = line.match(/=\s+([\d.]+)\/([\d.]+)\/([\d.]+)/);
            if (match) {
              min = parseFloat(match[1]);
              avg = parseFloat(match[2]);
              max = parseFloat(match[3]);
            }
          }
        }
      }

      // If we have avg, the host is alive
      if (avg === 0 && packetLoss === 100) {
        alive = false;
      }

      return NextResponse.json(
        {
          success: true,
          data: {
            host: cleanHost,
            alive,
            min: alive ? min : undefined,
            max: alive ? max : undefined,
            avg: alive ? avg : undefined,
            packetLoss,
            packets: 4,
          },
        },
        {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    } catch (pingError: any) {
      // Ping failed - host is likely unreachable
      return NextResponse.json(
        {
          success: true,
          data: {
            host: cleanHost,
            alive: false,
            packetLoss: 100,
            packets: 4,
          },
        },
        {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }
  } catch (error: any) {
    console.error('Ping Test Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to perform ping test',
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
