import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3005';

/**
 * Proxy job application submission to backend
 */
export async function POST(req: NextRequest) {
  try {
    // Handle FormData (multipart form)
    const formData = await req.formData();
    
    // Extract basic fields
    const position = formData.get('position') as string;
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const email = formData.get('email') as string;
    const contactNumber = formData.get('contactNumber') as string;
    const currentPosition = formData.get('currentPosition') as string;
    const yearsExperience = formData.get('yearsExperience') as string;
    const portfolioUrl = formData.get('portfolioUrl') as string;
    const additionalInfo = formData.get('additionalInfo') as string;
    const expectations = formData.get('expectations') as string;

    // For now, save to backend without file uploads
    // TODO: Handle file uploads to S3 and include URLs
    const applicationData = {
      position: { id: position, title: position },
      applicant: {
        firstName,
        lastName,
        email,
        phone: contactNumber,
      },
      experience: yearsExperience,
      coverLetter: additionalInfo || expectations,
      linkedinUrl: portfolioUrl,
      source: 'careers-page',
    };

    const response = await fetch(`${BACKEND_URL}/api/careers/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(applicationData),
    });

    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error submitting job application:', error);
    return NextResponse.json(
      { error: 'Failed to submit application' },
      { status: 500 }
    );
  }
}

/**
 * Get user's applications
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const response = await fetch(`${BACKEND_URL}/api/careers/applications/user/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error fetching applications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}
