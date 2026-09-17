import { createLogger } from '../lib/logger.js';
const log = createLogger('emailService');
/**
 * EMAIL SERVICE — One Last AI
 * Handles all transactional emails via Namecheap Private Email SMTP
 * 
 * Emails sent from: noreply@sanbayfusion.com
 * Support contact: support@sanbayfusion.com
 */

import nodemailer from 'nodemailer';

// ============================================================================
// SMTP TRANSPORTER
// ============================================================================

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'mail.privateemail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true', // false for port 587 (STARTTLS)
  auth: {
    user: process.env.SMTP_USER || 'noreply@sanbayfusion.com',
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: true, // Validate SMTP TLS certificates
  },
});

const FROM = process.env.SMTP_FROM || '"One Last AI" <noreply@sanbayfusion.com>';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@sanbayfusion.com';
const BRAND_URL = 'https://editor.sanbayfusion.com';
const BRAND_NAME = 'One Last AI';

// ============================================================================
// BASE HTML TEMPLATE
// ============================================================================

function baseTemplate(title, bodyContent) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e0e0e0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:48px;height:48px;border-radius:14px;overflow:hidden;">
                    <img src="https://editor.sanbayfusion.com/one-last-ai-logo.png" alt="One Last AI" width="48" height="48" style="display:block;width:48px;height:48px;border-radius:14px;object-fit:contain;" />
                  </td>
                  <td style="padding-left:14px;">
                    <span style="font-size:20px;font-weight:700;color:#ffffff;">${BRAND_NAME}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background-color:#111111;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:40px 32px;">
              ${bodyContent}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding-top:32px;text-align:center;">
              <!-- Social Icons -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 16px;">
                <tr>
                  <td style="padding:0 3px;"><a href="https://github.com/aidigitalfriend" target="_blank" rel="noopener" style="display:inline-block;width:30px;height:30px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:8px;text-align:center;line-height:30px;text-decoration:none;" title="GitHub"><!--[if !mso]>--><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="#888" style="vertical-align:middle;"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg><!--<![endif]--></a></td>
                  <td style="padding:0 3px;"><a href="https://x.com/onelastai" target="_blank" rel="noopener" style="display:inline-block;width:30px;height:30px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:8px;text-align:center;line-height:30px;text-decoration:none;" title="X"><!--[if !mso]>--><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="#888" style="vertical-align:middle;"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg><!--<![endif]--></a></td>
                  <td style="padding:0 3px;"><a href="https://facebook.com/onelastai" target="_blank" rel="noopener" style="display:inline-block;width:30px;height:30px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:8px;text-align:center;line-height:30px;text-decoration:none;" title="Facebook"><!--[if !mso]>--><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="#888" style="vertical-align:middle;"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg><!--<![endif]--></a></td>
                  <td style="padding:0 3px;"><a href="https://instagram.com/onelastai" target="_blank" rel="noopener" style="display:inline-block;width:30px;height:30px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:8px;text-align:center;line-height:30px;text-decoration:none;" title="Instagram"><!--[if !mso]>--><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="#888" style="vertical-align:middle;"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg><!--<![endif]--></a></td>
                  <td style="padding:0 3px;"><a href="https://tiktok.com/@onelastai" target="_blank" rel="noopener" style="display:inline-block;width:30px;height:30px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:8px;text-align:center;line-height:30px;text-decoration:none;" title="TikTok"><!--[if !mso]>--><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="#888" style="vertical-align:middle;"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg><!--<![endif]--></a></td>
                  <td style="padding:0 3px;"><a href="https://t.me/onelastai" target="_blank" rel="noopener" style="display:inline-block;width:30px;height:30px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:8px;text-align:center;line-height:30px;text-decoration:none;" title="Telegram"><!--[if !mso]>--><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="#888" style="vertical-align:middle;"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg><!--<![endif]--></a></td>
                  <td style="padding:0 3px;"><a href="https://line.me/ti/p/@onelastai" target="_blank" rel="noopener" style="display:inline-block;width:30px;height:30px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:8px;text-align:center;line-height:30px;text-decoration:none;" title="LINE"><!--[if !mso]>--><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="#888" style="vertical-align:middle;"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg><!--<![endif]--></a></td>
                  <td style="padding:0 3px;"><a href="https://threads.net/@onelastai" target="_blank" rel="noopener" style="display:inline-block;width:30px;height:30px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:8px;text-align:center;line-height:30px;text-decoration:none;" title="Threads"><!--[if !mso]>--><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="#888" style="vertical-align:middle;"><path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01c-.028-3.582.825-6.442 2.537-8.505C5.867 1.448 8.644.264 12.213.237h.007c2.096.014 3.928.455 5.446 1.31a8.42 8.42 0 013.16 3.382c.73 1.36 1.148 2.897 1.244 4.574.01.172.015.345.015.52 0 .175-.005.35-.015.523-.096 1.677-.514 3.213-1.244 4.574a8.42 8.42 0 01-3.16 3.382c-1.518.855-3.35 1.296-5.446 1.31h-.034z"/></svg><!--<![endif]--></a></td>
                </tr>
              </table>
              <p style="color:#666;font-size:12px;line-height:20px;margin:0;">
                &copy; ${new Date().getFullYear()} ${BRAND_NAME}. All rights reserved.
              </p>
              <p style="color:#666;font-size:12px;line-height:20px;margin:8px 0 0 0;">
                Need help? Contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color:#22c55e;text-decoration:none;">${SUPPORT_EMAIL}</a>
              </p>
              <p style="color:#555;font-size:11px;line-height:18px;margin:16px 0 0 0;">
                <a href="${BRAND_URL}" style="color:#555;text-decoration:none;">${BRAND_URL}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function greenButton(text, url) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto;">
    <tr>
      <td style="background:linear-gradient(135deg,#22c55e,#06b6d4);border-radius:12px;padding:14px 36px;">
        <a href="${url}" style="color:#000;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">${text}</a>
      </td>
    </tr>
  </table>`;
}

function infoRow(label, value) {
  return `<tr>
    <td style="padding:6px 12px;color:#888;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.05);">${label}</td>
    <td style="padding:6px 12px;color:#e0e0e0;font-size:13px;font-weight:500;border-bottom:1px solid rgba(255,255,255,0.05);">${value}</td>
  </tr>`;
}

// ============================================================================
// SEND HELPER
// ============================================================================

async function sendEmail(to, subject, html) {
  try {
    const info = await transporter.sendMail({
      from: FROM,
      to,
      subject,
      html,
    });
    log.info(`[Email] Sent "${subject}" to ${to} — messageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    log.error(`[Email] Failed to send "${subject}" to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 1. EMAIL VERIFICATION (6-digit code)
// ============================================================================

async function sendVerificationCode(to, name, code) {
  const subject = `${code} is your One Last AI verification code`;
  const html = baseTemplate('Verify Your Email', `
    <h1 style="color:#fff;font-size:24px;font-weight:700;margin:0 0 8px 0;">Verify Your Email</h1>
    <p style="color:#999;font-size:14px;line-height:22px;margin:0 0 28px 0;">
      Hi${name ? ' ' + name : ''},<br>
      Enter this 6-digit code to verify your email and complete your registration:
    </p>
    <div style="text-align:center;margin:32px 0;">
      <div style="display:inline-block;background:#1a1a1a;border:2px solid rgba(34,197,94,0.3);border-radius:16px;padding:20px 40px;letter-spacing:12px;font-size:36px;font-weight:800;color:#22c55e;font-family:'Courier New',monospace;">
        ${code}
      </div>
    </div>
    <p style="color:#888;font-size:13px;line-height:20px;margin:0;">
      This code expires in <strong style="color:#e0e0e0;">10 minutes</strong>. If you didn't request this, you can safely ignore this email.
    </p>
  `);
  return sendEmail(to, subject, html);
}

// ============================================================================
// 1b. LOGIN OTP (6-digit code for login verification)
// ============================================================================

async function sendLoginOTP(to, name, code) {
  const subject = `${code} — Your One Last AI login verification code`;
  const html = baseTemplate('Login Verification', `
    <h1 style="color:#fff;font-size:24px;font-weight:700;margin:0 0 8px 0;">Login Verification</h1>
    <p style="color:#999;font-size:14px;line-height:22px;margin:0 0 28px 0;">
      Hi${name ? ' ' + name : ''},<br>
      We detected a sign-in attempt to your account. Enter this code to complete your login:
    </p>
    <div style="text-align:center;margin:32px 0;">
      <div style="display:inline-block;background:#1a1a1a;border:2px solid rgba(34,197,94,0.3);border-radius:16px;padding:20px 40px;letter-spacing:12px;font-size:36px;font-weight:800;color:#22c55e;font-family:'Courier New',monospace;">
        ${code}
      </div>
    </div>
    <p style="color:#888;font-size:13px;line-height:20px;margin:0 0 16px 0;">
      This code expires in <strong style="color:#e0e0e0;">10 minutes</strong>. If you didn't attempt to sign in, someone may have your password — 
      <a href="${BRAND_URL}/forgot-password" style="color:#ef4444;text-decoration:none;font-weight:600;">reset it immediately</a>.
    </p>
    <p style="color:#666;font-size:12px;line-height:18px;margin:0;padding-top:16px;border-top:1px solid rgba(255,255,255,0.06);">
      For security, we require email verification on every login unless you enable two-factor authentication (2FA) in your account settings.
    </p>
  `);
  return sendEmail(to, subject, html);
}

// ============================================================================
// 2. WELCOME EMAIL (after verification)
// ============================================================================

async function sendWelcomeEmail(to, name) {
  const subject = `Welcome to One Last AI!`;
  const html = baseTemplate('Welcome', `
    <h1 style="color:#fff;font-size:24px;font-weight:700;margin:0 0 8px 0;">Welcome to ${BRAND_NAME}!</h1>
    <p style="color:#999;font-size:14px;line-height:24px;margin:0 0 20px 0;">
      Hi${name ? ' ' + name : ''},<br>
      Your account is ready! We've given you <strong style="color:#22c55e;">5 free credits</strong> for each of our apps to get started.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background:#1a1a1a;border:1px solid rgba(255,255,255,0.06);border-radius:12px;overflow:hidden;">
      <tr>
        <td style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.06);">
          <strong style="color:#06b6d4;">Neural Chat</strong>
          <span style="color:#888;font-size:13px;"> — AI conversations, audio & image generation</span>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.06);">
          <strong style="color:#a855f7;">Canvas Studio</strong>
          <span style="color:#888;font-size:13px;"> — Visual AI canvas & design</span>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.06);">
          <strong style="color:#f59e0b;">Maula Editor</strong>
          <span style="color:#888;font-size:13px;"> — AI-powered code editor</span>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 20px;">
          <strong style="color:#ec4899;">GenCraft Pro</strong>
          <span style="color:#888;font-size:13px;"> — Full-stack app generator</span>
        </td>
      </tr>
    </table>
    ${greenButton('Go to Dashboard', BRAND_URL + '/dashboard')}
    <p style="color:#888;font-size:13px;line-height:20px;margin:0;text-align:center;">
      If you have questions, reach out to <a href="mailto:${SUPPORT_EMAIL}" style="color:#22c55e;text-decoration:none;">${SUPPORT_EMAIL}</a>
    </p>
  `);
  return sendEmail(to, subject, html);
}

// ============================================================================
// 3. LOGIN ALERT
// ============================================================================

async function sendLoginAlert(to, name, details) {
  const { ip, userAgent, time, location } = details;
  const browserInfo = parseUserAgent(userAgent);
  const subject = `New sign-in to your One Last AI account`;
  const html = baseTemplate('Login Alert', `
    <h1 style="color:#fff;font-size:24px;font-weight:700;margin:0 0 8px 0;">New Sign-In Detected</h1>
    <p style="color:#999;font-size:14px;line-height:22px;margin:0 0 24px 0;">
      Hi${name ? ' ' + name : ''},<br>
      We detected a new sign-in to your ${BRAND_NAME} account.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border:1px solid rgba(255,255,255,0.06);border-radius:12px;overflow:hidden;">
      ${infoRow('Date & Time', time || new Date().toUTCString())}
      ${infoRow('IP Address', ip || 'Unknown')}
      ${infoRow('Browser', browserInfo.browser || 'Unknown')}
      ${infoRow('Operating System', browserInfo.os || 'Unknown')}
      ${infoRow('Device', browserInfo.device || 'Unknown')}
      ${location ? infoRow('Location', location) : ''}
    </table>
    <p style="color:#888;font-size:13px;line-height:22px;margin:24px 0 0 0;">
      If this was you, no action is needed. If you don't recognize this activity, 
      <a href="${BRAND_URL}/forgot-password" style="color:#ef4444;text-decoration:none;font-weight:600;">reset your password immediately</a> and contact 
      <a href="mailto:${SUPPORT_EMAIL}" style="color:#22c55e;text-decoration:none;">${SUPPORT_EMAIL}</a>.
    </p>
  `);
  return sendEmail(to, subject, html);
}

// ============================================================================
// 4. PASSWORD RESET LINK
// ============================================================================

async function sendPasswordResetEmail(to, name, resetUrl) {
  const subject = `Reset your One Last AI password`;
  const html = baseTemplate('Password Reset', `
    <h1 style="color:#fff;font-size:24px;font-weight:700;margin:0 0 8px 0;">Reset Your Password</h1>
    <p style="color:#999;font-size:14px;line-height:22px;margin:0 0 8px 0;">
      Hi${name ? ' ' + name : ''},<br>
      We received a request to reset the password for your ${BRAND_NAME} account.
    </p>
    <p style="color:#999;font-size:14px;line-height:22px;margin:0 0 4px 0;">
      Click the button below to create a new password:
    </p>
    ${greenButton('Reset Password', resetUrl)}
    <p style="color:#888;font-size:13px;line-height:20px;margin:0 0 12px 0;">
      This link expires in <strong style="color:#e0e0e0;">1 hour</strong>. If you didn't request a password reset, you can safely ignore this email.
    </p>
    <p style="color:#666;font-size:12px;line-height:18px;margin:16px 0 0 0;padding-top:16px;border-top:1px solid rgba(255,255,255,0.06);">
      If the button doesn't work, copy and paste this URL:<br>
      <a href="${resetUrl}" style="color:#22c55e;word-break:break-all;text-decoration:none;font-size:11px;">${resetUrl}</a>
    </p>
  `);
  return sendEmail(to, subject, html);
}

// ============================================================================
// 5. PASSWORD CHANGED ALERT
// ============================================================================

async function sendPasswordChangedAlert(to, name, details = {}) {
  const { ip, userAgent, time } = details;
  const browserInfo = parseUserAgent(userAgent);
  const subject = `Your One Last AI password was changed`;
  const html = baseTemplate('Password Changed', `
    <h1 style="color:#fff;font-size:24px;font-weight:700;margin:0 0 8px 0;">Password Changed Successfully</h1>
    <p style="color:#999;font-size:14px;line-height:22px;margin:0 0 24px 0;">
      Hi${name ? ' ' + name : ''},<br>
      Your ${BRAND_NAME} password was just changed.
    </p>
    ${(ip || userAgent) ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border:1px solid rgba(255,255,255,0.06);border-radius:12px;overflow:hidden;margin-bottom:24px;">
      ${infoRow('Date & Time', time || new Date().toUTCString())}
      ${ip ? infoRow('IP Address', ip) : ''}
      ${browserInfo.browser ? infoRow('Browser', browserInfo.browser) : ''}
      ${browserInfo.os ? infoRow('Operating System', browserInfo.os) : ''}
    </table>` : ''}
    <p style="color:#888;font-size:13px;line-height:22px;margin:0;">
      If you made this change, no further action is needed. If you didn't change your password, 
      <a href="${BRAND_URL}/forgot-password" style="color:#ef4444;text-decoration:none;font-weight:600;">reset it immediately</a> and contact 
      <a href="mailto:${SUPPORT_EMAIL}" style="color:#22c55e;text-decoration:none;">${SUPPORT_EMAIL}</a>.
    </p>
  `);
  return sendEmail(to, subject, html);
}

// ============================================================================
// 6. PURCHASE CONFIRMATION
// ============================================================================

async function sendPurchaseConfirmation(to, name, purchaseDetails) {
  const { credits, amount, currency, appName, packageId, transactionId } = purchaseDetails;
  const formattedAmount = new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'usd' }).format(amount || 0);
  const subject = `Payment confirmed — ${credits} credits added to ${appName}`;
  const html = baseTemplate('Purchase Confirmation', `
    <h1 style="color:#fff;font-size:24px;font-weight:700;margin:0 0 8px 0;">Payment Confirmed!</h1>
    <p style="color:#999;font-size:14px;line-height:22px;margin:0 0 24px 0;">
      Hi${name ? ' ' + name : ''},<br>
      Your credit purchase was successful. Here are the details:
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border:1px solid rgba(255,255,255,0.06);border-radius:12px;overflow:hidden;">
      ${infoRow('App', appName || 'Neural Chat')}
      ${infoRow('Credits Added', `<strong style="color:#22c55e;">${credits}</strong>`)}
      ${infoRow('Amount Paid', `<strong style="color:#e0e0e0;">${formattedAmount}</strong>`)}
      ${infoRow('Package', packageId || '—')}
      ${infoRow('Transaction ID', transactionId || '—')}
      ${infoRow('Date', new Date().toUTCString())}
    </table>
    ${greenButton('Go to Dashboard', BRAND_URL + '/dashboard')}
    <p style="color:#888;font-size:13px;line-height:20px;margin:0;text-align:center;">
      Need a refund or have questions? Contact <a href="mailto:${SUPPORT_EMAIL}" style="color:#22c55e;text-decoration:none;">${SUPPORT_EMAIL}</a>
    </p>
  `);
  return sendEmail(to, subject, html);
}

// ============================================================================
// 7. CONTACT AUTO-REPLY
// ============================================================================

async function sendContactAutoReply(to, name, originalMessage) {
  const subject = `We received your message — One Last AI Support`;
  const html = baseTemplate('Message Received', `
    <h1 style="color:#fff;font-size:24px;font-weight:700;margin:0 0 8px 0;">We Got Your Message!</h1>
    <p style="color:#999;font-size:14px;line-height:22px;margin:0 0 20px 0;">
      Hi${name ? ' ' + name : ''},<br>
      Thank you for reaching out to ${BRAND_NAME}. We've received your message and our support team will get back to you within <strong style="color:#e0e0e0;">24 hours</strong>.
    </p>
    ${originalMessage ? `
    <div style="background:#1a1a1a;border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:20px;margin:20px 0;">
      <p style="color:#666;font-size:12px;margin:0 0 8px 0;text-transform:uppercase;letter-spacing:1px;">Your Message</p>
      <p style="color:#ccc;font-size:14px;line-height:22px;margin:0;white-space:pre-wrap;">${escapeHtml(originalMessage)}</p>
    </div>` : ''}
    <p style="color:#888;font-size:13px;line-height:22px;margin:0;">
      In the meantime, you can reply directly to this email or contact our support team at 
      <a href="mailto:${SUPPORT_EMAIL}" style="color:#22c55e;text-decoration:none;">${SUPPORT_EMAIL}</a>.
    </p>
    <p style="color:#666;font-size:12px;margin:20px 0 0 0;">
      Reference: #${Date.now().toString(36).toUpperCase()}
    </p>
  `);
  return sendEmail(to, subject, html);
}

// Forward the contact message to support team
async function forwardContactToSupport(from, name, subject, message) {
  const html = baseTemplate('New Contact Message', `
    <h1 style="color:#fff;font-size:24px;font-weight:700;margin:0 0 8px 0;">New Contact Message</h1>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border:1px solid rgba(255,255,255,0.06);border-radius:12px;overflow:hidden;margin:20px 0;">
      ${infoRow('From', `${name || 'Unknown'} &lt;${from}&gt;`)}
      ${infoRow('Subject', subject || 'No subject')}
      ${infoRow('Date', new Date().toUTCString())}
    </table>
    <div style="background:#1a1a1a;border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:20px;margin:20px 0;">
      <p style="color:#666;font-size:12px;margin:0 0 8px 0;text-transform:uppercase;letter-spacing:1px;">Message</p>
      <p style="color:#ccc;font-size:14px;line-height:22px;margin:0;white-space:pre-wrap;">${escapeHtml(message)}</p>
    </div>
    <p style="color:#888;font-size:13px;">Reply to: <a href="mailto:${from}" style="color:#22c55e;">${from}</a></p>
  `);
  return sendEmail(SUPPORT_EMAIL, `[Contact] ${subject || 'New message'} — ${from}`, html);
}

// ============================================================================
// 8. TICKET REPLY
// ============================================================================

async function sendTicketReply(to, name, ticketDetails) {
  const { ticketId, subject: ticketSubject, message, agentName } = ticketDetails;
  const subject = `Re: ${ticketSubject || 'Your support ticket'} [#${ticketId || 'N/A'}]`;
  const html = baseTemplate('Ticket Update', `
    <h1 style="color:#fff;font-size:24px;font-weight:700;margin:0 0 8px 0;">Support Ticket Update</h1>
    <p style="color:#999;font-size:14px;line-height:22px;margin:0 0 20px 0;">
      Hi${name ? ' ' + name : ''},<br>
      There's an update on your support ticket.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border:1px solid rgba(255,255,255,0.06);border-radius:12px;overflow:hidden;margin:0 0 20px 0;">
      ${infoRow('Ticket ID', `#${ticketId || 'N/A'}`)}
      ${infoRow('Subject', ticketSubject || '—')}
      ${infoRow('Responded by', agentName || 'Support Team')}
    </table>
    <div style="background:#1a1a1a;border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:20px;margin:0 0 24px 0;">
      <p style="color:#666;font-size:12px;margin:0 0 8px 0;text-transform:uppercase;letter-spacing:1px;">Response</p>
      <p style="color:#ccc;font-size:14px;line-height:22px;margin:0;white-space:pre-wrap;">${escapeHtml(message)}</p>
    </div>
    <p style="color:#888;font-size:13px;line-height:22px;margin:0;">
      You can reply to this email or contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color:#22c55e;text-decoration:none;">${SUPPORT_EMAIL}</a>.
    </p>
  `);
  return sendEmail(to, subject, html);
}

// ============================================================================
// 9. CONSULTATION REPLY
// ============================================================================

async function sendConsultationReply(to, name, consultationDetails) {
  const { consultationId, topic, message, consultantName, scheduledDate } = consultationDetails;
  const subject = `Consultation Update: ${topic || 'Your consultation'} [#${consultationId || 'N/A'}]`;
  const html = baseTemplate('Consultation Update', `
    <h1 style="color:#fff;font-size:24px;font-weight:700;margin:0 0 8px 0;">Consultation Update</h1>
    <p style="color:#999;font-size:14px;line-height:22px;margin:0 0 20px 0;">
      Hi${name ? ' ' + name : ''},<br>
      Here's an update regarding your consultation request.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border:1px solid rgba(255,255,255,0.06);border-radius:12px;overflow:hidden;margin:0 0 20px 0;">
      ${infoRow('Reference', `#${consultationId || 'N/A'}`)}
      ${infoRow('Topic', topic || '—')}
      ${infoRow('Consultant', consultantName || 'One Last AI Team')}
      ${scheduledDate ? infoRow('Scheduled', scheduledDate) : ''}
    </table>
    <div style="background:#1a1a1a;border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:20px;margin:0 0 24px 0;">
      <p style="color:#666;font-size:12px;margin:0 0 8px 0;text-transform:uppercase;letter-spacing:1px;">Message</p>
      <p style="color:#ccc;font-size:14px;line-height:22px;margin:0;white-space:pre-wrap;">${escapeHtml(message)}</p>
    </div>
    ${scheduledDate ? greenButton('View Consultation', BRAND_URL + '/dashboard') : ''}
    <p style="color:#888;font-size:13px;line-height:22px;margin:0;">
      Questions? Reach out to <a href="mailto:${SUPPORT_EMAIL}" style="color:#22c55e;text-decoration:none;">${SUPPORT_EMAIL}</a>.
    </p>
  `);
  return sendEmail(to, subject, html);
}

// ============================================================================
// HELPERS
// ============================================================================

function parseUserAgent(ua) {
  if (!ua || ua === 'unknown') return { browser: 'Unknown', os: 'Unknown', device: 'Unknown' };

  let browser = 'Unknown', os = 'Unknown', device = 'Desktop';

  // Browser
  if (/Edg/i.test(ua)) browser = 'Microsoft Edge';
  else if (/OPR|Opera/i.test(ua)) browser = 'Opera';
  else if (/Chrome/i.test(ua)) browser = 'Google Chrome';
  else if (/Firefox/i.test(ua)) browser = 'Mozilla Firefox';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Apple Safari';
  else if (/MSIE|Trident/i.test(ua)) browser = 'Internet Explorer';

  // OS
  if (/Windows NT 10/i.test(ua)) os = 'Windows 10/11';
  else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad/i.test(ua)) os = 'iOS';

  // Device
  if (/Mobile|Android|iPhone/i.test(ua)) device = 'Mobile';
  else if (/iPad|Tablet/i.test(ua)) device = 'Tablet';

  return { browser, os, device };
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ============================================================================
// VERIFY SMTP CONNECTION ON STARTUP
// ============================================================================

async function verifyConnection() {
  try {
    await transporter.verify();
    log.info('[Email] ✅ SMTP connection verified — ready to send emails');
    return true;
  } catch (error) {
    log.error('[Email] ❌ SMTP connection failed:', error.message);
    return false;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const emailService = {
  sendVerificationCode,
  sendLoginOTP,
  sendWelcomeEmail,
  sendLoginAlert,
  sendPasswordResetEmail,
  sendPasswordChangedAlert,
  sendPurchaseConfirmation,
  sendContactAutoReply,
  forwardContactToSupport,
  sendTicketReply,
  sendConsultationReply,
  verifyConnection,
  sendEmail,
};

export default emailService;
