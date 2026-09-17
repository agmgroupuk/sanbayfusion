import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import {
  getNoreplyTransporter,
  getPasswordResetTemplate,
} from '@/lib/email';
import { verifyTurnstileToken } from '@/lib/turnstile';

// Re-use shared transporter
function getTransporter() {
  return getNoreplyTransporter();
}

// Use shared password reset template
function getPasswordResetEmailTemplate(userName: string, resetUrl: string): string {
  return getPasswordResetTemplate(userName, resetUrl);
}

/**
 * POST /api/auth/reset-password
 * Request a password reset email
 */
export async function POST(request: NextRequest) {
  try {
    const { email, token, newPassword, turnstileToken } = await request.json();

    // If token and newPassword are provided, this is the actual password reset
    if (token && newPassword) {
      // Verify Turnstile for password reset confirmation
      if (turnstileToken) {
        const turnstileResult = await verifyTurnstileToken(turnstileToken);
        if (!turnstileResult.success) {
          return NextResponse.json(
            { message: 'Security verification failed. Please try again.' },
            { status: 403 }
          );
        }
      }
      // Hash the token to compare with stored hash
      const tokenHash = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

      // Find user with valid reset token using Prisma
      const user = await prisma.user.findFirst({
        where: {
          resetPasswordToken: tokenHash,
          resetPasswordExpires: { gt: new Date() }
        }
      });

      if (!user) {
        return NextResponse.json(
          { message: 'Invalid or expired reset token' },
          { status: 400 }
        );
      }

      // Validate new password
      if (newPassword.length < 8) {
        return NextResponse.json(
          { message: 'Password must be at least 8 characters' },
          { status: 400 }
        );
      }

      // Import bcrypt dynamically
      const bcrypt = await import('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      // Update password and clear reset token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetPasswordToken: null,
          resetPasswordExpires: null
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Password has been reset successfully',
      });
    }

    // Otherwise, this is a request for a reset email
    // Verify Turnstile for reset email request
    if (turnstileToken) {
      const turnstileResult = await verifyTurnstileToken(turnstileToken);
      if (!turnstileResult.success) {
        return NextResponse.json(
          { message: 'Security verification failed. Please try again.' },
          { status: 403 }
        );
      }
    }

    if (!email) {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link.',
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Save token to user (expires in 1 hour)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetTokenHash,
        resetPasswordExpires: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
      }
    });

    // Build reset URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/auth/reset-password/confirm?token=${resetToken}`;

    // Send email
    const transporter = getTransporter();
    if (transporter) {
      try {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || `Sanbay Fusion <${process.env.SMTP_USER}>`,
          to: user.email,
          subject: 'Reset your Sanbay Fusion password',
          html: getPasswordResetEmailTemplate(user.name || 'User', resetUrl),
        });
        console.log(`✅ Password reset email sent to ${user.email}`);
      } catch (emailError: any) {
        console.error('❌ Failed to send password reset email:', emailError.message);
        // Don't fail the request - token is saved, user can try again
      }
    } else {
      console.log('[PASSWORD RESET] SMTP not configured. Reset URL:', resetUrl);
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link.',
    });
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { message: 'Failed to process request' },
      { status: 500 }
    );
  }
}
