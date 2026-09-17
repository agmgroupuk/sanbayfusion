import { NextRequest, NextResponse } from 'next/server';
import { checkEnvironmentVariables } from '@/lib/environment-checker';

/**
 * GET /api/debug/environment
 * Diagnostic endpoint to check environment status in production
 *
 * IMPORTANT: This should be removed or secured in production
 */
export async function GET(request: NextRequest) {
  try {
    const envStatus = checkEnvironmentVariables();

    // Don't expose actual values, just status
    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      rscRequest: request.nextUrl.searchParams.has('_rsc'),
      environmentStatus: {
        isValid: envStatus.isValid,
        missingCount: envStatus.missing.length,
        warningCount: envStatus.warnings.length,
        // Only expose missing variable names, not values
        missingVars: envStatus.missing,
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasJwtSecret: !!process.env.JWT_SECRET,
        databaseUrlFormat: process.env.DATABASE_URL
          ? process.env.DATABASE_URL.startsWith('postgres')
            ? 'valid'
            : 'invalid'
          : 'missing',
      },
      serverInfo: {
        platform: process.platform,
        nodeVersion: process.version,
        pid: process.pid,
      },
    };

    return NextResponse.json({
      success: true,
      diagnostics,
    });
  } catch (error) {
    console.error('❌ Environment diagnostic failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
