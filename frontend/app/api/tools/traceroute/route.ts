import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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

    // Determine traceroute command based on platform
    const isWindows = process.platform === 'win32';
    const tracerouteCommand = isWindows
      ? `tracert -h 30 ${cleanHost}`
      : `traceroute -m 30 ${cleanHost}`;

    try {
      const { stdout } = await execAsync(tracerouteCommand, { timeout: 60000 });

      const lines = stdout.split('\n').filter((line) => line.trim());
      const hops: any[] = [];
      let completed = false;

      if (isWindows) {
        // Windows tracert parsing
        for (const line of lines) {
          // Skip header lines
          if (line.includes('Tracing route') || line.includes('over a maximum'))
            continue;

          // Check if completed
          if (line.includes('Trace complete')) {
            completed = true;
            continue;
          }

          // Parse hop line: "  1    <1 ms    <1 ms    <1 ms  192.168.1.1"
          const match = line.match(/^\s*(\d+)\s+(.+)/);
          if (match) {
            const hopNum = parseInt(match[1]);
            const rest = match[2].trim();

            // Check for timeout
            if (rest.includes('*')) {
              hops.push({
                hop: hopNum,
                ip: undefined,
                hostname: undefined,
              });
              continue;
            }

            // Parse RTTs and IP
            const rttMatches = rest.match(/<?\s*(\d+)\s*ms/g);
            const ipMatch = rest.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
            const hostnameMatch = rest.match(
              /\[(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\]/
            );

            if (ipMatch) {
              const rtts: number[] = [];
              if (rttMatches) {
                for (const rttMatch of rttMatches) {
                  const rtt = parseInt(rttMatch.match(/(\d+)/)?.[1] || '0');
                  if (rtt > 0) rtts.push(rtt);
                }
              }

              const avgRtt =
                rtts.length > 0
                  ? rtts.reduce((a, b) => a + b, 0) / rtts.length
                  : undefined;

              hops.push({
                hop: hopNum,
                ip: ipMatch[1],
                hostname: hostnameMatch ? undefined : rest.split(/\s+/).pop(),
                rtt1: rtts[0],
                rtt2: rtts[1],
                rtt3: rtts[2],
                avgRtt,
              });
            }
          }
        }
      } else {
        // Unix/Linux traceroute parsing
        for (const line of lines) {
          // Parse hop line: " 1  192.168.1.1 (192.168.1.1)  0.345 ms  0.289 ms  0.276 ms"
          const match = line.match(/^\s*(\d+)\s+(.+)/);
          if (match) {
            const hopNum = parseInt(match[1]);
            const rest = match[2].trim();

            // Check for timeout
            if (rest.includes('*')) {
              hops.push({
                hop: hopNum,
                ip: undefined,
                hostname: undefined,
              });
              continue;
            }

            // Parse hostname, IP, and RTTs
            const hostnameMatch = rest.match(/^([^\s(]+)/);
            const ipMatch = rest.match(
              /\((\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\)/
            );
            const rttMatches = rest.match(/(\d+\.?\d*)\s*ms/g);

            if (ipMatch) {
              const rtts: number[] = [];
              if (rttMatches) {
                for (const rttMatch of rttMatches) {
                  const rtt = parseFloat(
                    rttMatch.match(/([\d.]+)/)?.[1] || '0'
                  );
                  if (rtt > 0) rtts.push(rtt);
                }
              }

              const avgRtt =
                rtts.length > 0
                  ? rtts.reduce((a, b) => a + b, 0) / rtts.length
                  : undefined;
              const hostname = hostnameMatch ? hostnameMatch[1] : undefined;

              hops.push({
                hop: hopNum,
                ip: ipMatch[1],
                hostname: hostname !== ipMatch[1] ? hostname : undefined,
                rtt1: rtts[0],
                rtt2: rtts[1],
                rtt3: rtts[2],
                avgRtt,
              });

              // Check if this is the destination
              if (hostname === cleanHost || ipMatch[1] === cleanHost) {
                completed = true;
              }
            }
          }
        }
      }

      return NextResponse.json(
        {
          success: true,
          data: {
            destination: cleanHost,
            hops,
            completed,
          },
        },
        {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    } catch (tracerouteError: any) {
      // Traceroute failed but might have partial results
      console.error('Traceroute execution error:', tracerouteError);

      return NextResponse.json(
        {
          success: false,
          error: 'Traceroute failed or timed out',
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
    console.error('Traceroute Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to perform traceroute',
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
