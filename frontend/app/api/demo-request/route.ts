import { NextRequest, NextResponse } from 'next/server';
import {
  getNoreplyTransporter,
  getNoreplySmtpConfig,
  ADMIN_EMAIL,
  getDemoRequestAdminTemplate,
  getDemoRequestUserTemplate,
} from '@/lib/email';

// Re-use shared transporter
function getTransporter() {
  return getNoreplyTransporter();
}

// Use shared demo templates
function getDemoRequestAdminEmail(data: any): string {
  const tpl = getDemoRequestAdminTemplate(data);
  return tpl.html;
}

function getDemoRequestUserEmail(data: { name: string; date: string; time: string }): string {
  const tpl = getDemoRequestUserTemplate(data);
  return tpl.html;
}

/**
 * POST /api/demo-request
 * Handle demo booking requests
 */
export async function POST(request: NextRequest) {
  try {
    const { name, email, company, phone, interest, date, time, message } = await request.json();

    // Validation
    if (!name || !email || !interest || !date || !time) {
      return NextResponse.json(
        { success: false, message: 'Please fill in all required fields' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    const transporter = getTransporter();

    // Send notification to admin
    if (transporter) {
      try {
        // Admin notification
        await transporter.sendMail({
          from: process.env.SMTP_FROM || `Sanbay Fusion <${process.env.SMTP_USER}>`,
          to: ADMIN_EMAIL,
          replyTo: email,
          subject: `🎯 New Demo Request from ${name}${company ? ` (${company})` : ''}`,
          html: getDemoRequestAdminEmail({ name, email, company, phone, interest, date, time, message }),
        });
        console.log(`✅ Demo request admin notification sent for ${email}`);

        // User confirmation
        await transporter.sendMail({
          from: process.env.SMTP_FROM || `Sanbay Fusion <${process.env.SMTP_USER}>`,
          to: email,
          subject: 'Sanbay Fusion demo request received',
          html: getDemoRequestUserEmail({ name, date, time }),
        });
        console.log(`✅ Demo request confirmation sent to ${email}`);
      } catch (emailError: any) {
        console.error('❌ Failed to send demo request emails:', emailError.message);
        // Don't fail the request - form submission is still valid
      }
    } else {
      console.log('[DEMO REQUEST] SMTP not configured. Demo request from:', email);
    }

    return NextResponse.json({
      success: true,
      message: 'Demo request submitted successfully!',
    });
  } catch (error) {
    console.error('Demo request error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to submit request. Please try again.' },
      { status: 500 }
    );
  }
}
