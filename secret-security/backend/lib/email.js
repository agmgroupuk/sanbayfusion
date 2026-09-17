import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const FROM = process.env.SMTP_FROM || '"Maula Security" <security@sanbayfusion.com>';

export async function sendReportReadyEmail(ownerEmail, ownerName, paymentUrl) {
    await transporter.sendMail({
        from: FROM,
        to: ownerEmail,
        subject: '🔍 Your Device Report is Ready — Maula Security',
        html: `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#0a0a0f;color:#e5e7eb;border-radius:12px;">
  <h2 style="color:#06b6d4;margin-bottom:8px;">Your Device Report is Ready</h2>
  <p>Hi ${ownerName},</p>
  <p>Our security team has verified your identity and collected location data and photos from your reported lost device.</p>
  <p>To download your full report (location history + front camera images), please complete the secure payment below:</p>
  <a href="${paymentUrl}" style="display:inline-block;margin:24px 0;padding:14px 28px;background:linear-gradient(135deg,#06b6d4,#3b82f6);color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">
    Download My Report
  </a>
  <p style="color:#6b7280;font-size:13px;">This link expires in 48 hours. If your device has been recovered, please contact security@sanbayfusion.com to close the case.</p>
  <p style="color:#6b7280;font-size:13px;">Report ID: ${paymentUrl.split('report=')[1] || 'see link'}</p>
</div>`,
    });
}

export async function sendReportConfirmedEmail(ownerEmail, ownerName, downloadUrl) {
    await transporter.sendMail({
        from: FROM,
        to: ownerEmail,
        subject: '✅ Payment Confirmed — Download Your Device Report',
        html: `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#0a0a0f;color:#e5e7eb;border-radius:12px;">
  <h2 style="color:#22c55e;margin-bottom:8px;">Payment Confirmed</h2>
  <p>Hi ${ownerName},</p>
  <p>Your payment has been received. Click below to download your device report:</p>
  <a href="${downloadUrl}" style="display:inline-block;margin:24px 0;padding:14px 28px;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">
    Download Report (ZIP)
  </a>
  <p style="color:#6b7280;font-size:13px;">This download link expires in 48 hours and can only be used once.</p>
  <p style="color:#6b7280;font-size:13px;">The report contains: GPS location history, timestamped front camera photos, network and battery data.</p>
</div>`,
    });
}

export async function sendReportRejectedEmail(ownerEmail, ownerName, reason) {
    await transporter.sendMail({
        from: FROM,
        to: ownerEmail,
        subject: '❌ Identity Verification Failed — Maula Security',
        html: `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#0a0a0f;color:#e5e7eb;border-radius:12px;">
  <h2 style="color:#ef4444;margin-bottom:8px;">Identity Verification Failed</h2>
  <p>Hi ${ownerName},</p>
  <p>Unfortunately our security team was unable to verify your ownership of the reported device.</p>
  ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
  <p>If you believe this is an error, please reply to this email with additional proof of ownership (purchase receipt, IMEI, etc.).</p>
  <p style="color:#6b7280;font-size:13px;">Contact: security@sanbayfusion.com</p>
</div>`,
    });
}

export async function sendAdminNewReportEmail(report) {
    if (!process.env.ADMIN_ALERT_EMAIL) return;
    await transporter.sendMail({
        from: FROM,
        to: process.env.ADMIN_ALERT_EMAIL,
        subject: `🚨 New Lost Device Report — ${report.deviceId}`,
        html: `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#1a1a2e;color:#e5e7eb;border-radius:12px;">
  <h2 style="color:#f59e0b;">New Lost Device Report</h2>
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="padding:6px 0;color:#9ca3af;">Report ID</td><td><strong>${report.id}</strong></td></tr>
    <tr><td style="padding:6px 0;color:#9ca3af;">Device ID</td><td><strong>${report.deviceId}</strong></td></tr>
    <tr><td style="padding:6px 0;color:#9ca3af;">Owner Name</td><td>${report.ownerName}</td></tr>
    <tr><td style="padding:6px 0;color:#9ca3af;">Owner Email</td><td>${report.ownerEmail}</td></tr>
    <tr><td style="padding:6px 0;color:#9ca3af;">Description</td><td>${report.description || 'N/A'}</td></tr>
  </table>
  <p style="margin-top:24px;"><a href="${process.env.ADMIN_URL || 'https://security-admin.sanbayfusion.com'}/report/${report.id}" style="padding:10px 20px;background:#f59e0b;color:#000;border-radius:6px;text-decoration:none;font-weight:600;">Review Report →</a></p>
</div>`,
    });
}
