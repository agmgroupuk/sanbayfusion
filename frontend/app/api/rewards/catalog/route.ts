import { NextRequest, NextResponse } from 'next/server';
import { REWARDS_CATALOG } from '@/lib/rewards-engine';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      rewards: REWARDS_CATALOG,
      total: REWARDS_CATALOG.length,
    });
  } catch (error) {
    console.error('Error fetching rewards catalog:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch rewards catalog' },
      { status: 500 }
    );
  }
}
