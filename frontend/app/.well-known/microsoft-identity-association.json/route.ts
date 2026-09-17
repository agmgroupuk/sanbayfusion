import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        associatedApplications: [
            {
                applicationId: '70f585cf-cd30-481c-b7d8-b530d1b3a583',
            },
        ],
    });
}
