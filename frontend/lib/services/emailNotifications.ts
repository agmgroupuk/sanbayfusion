// =====================================================
// FRONTEND EMAIL NOTIFICATIONS
// Thin wrapper around the local email service.
// =====================================================

import {
  // Transport
  sendEmail,
  sendWelcomeEmail as sendWelcomeEmailShared,
  sendAdminEmail as _sendAdminEmail,

  // Layout
  ADMIN_EMAIL,

  // Auth templates
  getVerificationCodeTemplate,
  getLoginOTPTemplate,
  getLoginAlertTemplate,

  // Welcome
  getWelcomeTemplate,

  // Support ticket templates
  getTicketCreatedTemplate,
  getNewReplyTemplate,
  getStatusChangeTemplate,
  getSlaBreachTemplate,

  // Admin templates
  getAdminNewUserTemplate,
  getAdminNewTicketTemplate,
  getAdminContactFormTemplate,
  getAdminJobApplicationTemplate,
  getAdminEarlyAccessTemplate,
} from '@/lib/email';

// Note: Email logging is handled by the shared @maula/email sendEmail() function.
// It creates EmailLog records and injects tracking pixels automatically.
// Do NOT add duplicate logEmail() calls in this file.

// =====================================================
// Auth Emails — sent from frontend auth routes
// =====================================================

export async function sendVerificationCodeEmail(email: string, name: string, code: string): Promise<void> {
  // sendEmail() from shared package already creates EmailLog + injects tracking pixel
  const result = await sendEmail(email, 'Your Sanbay Fusion email verification code', getVerificationCodeTemplate(name, code));
  if (!result.success) {
    throw new Error(result.error || 'Email sending failed');
  }
  console.log(`✅ Verification code email sent to ${email}`);
}

export async function sendLoginOTPEmail(email: string, name: string, code: string): Promise<void> {
  // sendEmail() from shared package already creates EmailLog + injects tracking pixel
  const result = await sendEmail(email, 'Your Sanbay Fusion login verification code', getLoginOTPTemplate(name, code));
  if (!result.success) {
    throw new Error(result.error || 'Email sending failed');
  }
  console.log(`✅ Login OTP email sent to ${email}`);
}

export async function sendLoginAlertEmail(email: string, name: string, loginData: { ip?: string; userAgent?: string; timestamp?: string }): Promise<void> {
  // sendEmail() from shared package already creates EmailLog + injects tracking pixel
  const result = await sendEmail(email, 'New sign-in to your Sanbay Fusion account', getLoginAlertTemplate(name, loginData));
  if (!result.success) {
    console.error('❌ Failed to send login alert email:', result.error);
  } else {
    console.log(`✅ Login alert email sent to ${email}`);
  }
}

export async function sendWelcomeEmailDark(email: string, name: string, couponCode?: string): Promise<void> {
  // sendWelcomeEmailShared() from shared package already creates EmailLog + injects tracking pixel
  const result = await sendWelcomeEmailShared(
    email,
    'Welcome to Sanbay Fusion',
    getWelcomeTemplate(name, couponCode),
    '',
    { type: 'welcome' }
  );
  if (result?.success) {
    console.log(`✅ Welcome email sent to ${email}${couponCode ? ` (with coupon: ${couponCode})` : ''}`);
  } else {
    console.error('❌ Failed to send welcome email:', result?.error);
  }
}

// =====================================================
// Support Ticket Emails
// =====================================================

interface TicketEmailData {
  ticketNumber: number;
  ticketId: string;
  subject: string;
  userName: string;
  userEmail: string;
  status?: string;
  message?: string;
  priority?: string;
}

export function getTicketCreatedEmail(data: TicketEmailData) {
  return getTicketCreatedTemplate(data);
}

export function getNewReplyEmail(data: TicketEmailData) {
  return getNewReplyTemplate(data);
}

export function getStatusChangeEmail(data: TicketEmailData) {
  return getStatusChangeTemplate(data);
}

export function getSlaBreachEmail(data: TicketEmailData) {
  return getSlaBreachTemplate(data);
}

// =====================================================
// Send Email Function (for support tickets)
// =====================================================

export async function sendSupportEmail(
  to: string,
  template: { subject: string; html: string; text: string }
): Promise<{ success: boolean; error?: string }> {
  return sendEmail(to, template.subject, template.html, template.text);
}

// =====================================================
// Convenience Functions
// =====================================================

export async function notifyTicketCreated(data: TicketEmailData) {
  const template = getTicketCreatedTemplate(data);
  await sendSupportEmail(data.userEmail, template);
  await notifyAdminNewTicket(data);
  return { success: true };
}

export async function notifyNewReply(data: TicketEmailData) {
  const template = getNewReplyTemplate(data);
  return sendSupportEmail(data.userEmail, template);
}

export async function notifyStatusChange(data: TicketEmailData) {
  const template = getStatusChangeTemplate(data);
  return sendSupportEmail(data.userEmail, template);
}

export async function notifySlaBreach(data: TicketEmailData, adminEmail: string = ADMIN_EMAIL) {
  const template = getSlaBreachTemplate(data);
  return sendSupportEmail(adminEmail, template);
}

// =====================================================
// Admin Notification Functions
// =====================================================

export async function notifyAdminNewTicket(data: TicketEmailData) {
  const tpl = getAdminNewTicketTemplate(data);
  return sendSupportEmail(ADMIN_EMAIL, tpl);
}

export async function notifyAdminContactForm(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  const tpl = getAdminContactFormTemplate(data);
  return sendSupportEmail(ADMIN_EMAIL, tpl);
}

export async function notifyAdminJobApplication(data: {
  name: string;
  email: string;
  position: string;
  phone?: string;
  resumeUrl?: string;
  coverLetter?: string;
}) {
  const tpl = getAdminJobApplicationTemplate({
    ...data,
    applicantName: data.name,
    applicantEmail: data.email,
    applicationNumber: `APP-${Date.now()}`,
  });
  return sendSupportEmail(ADMIN_EMAIL, tpl);
}

export async function notifyAdminEarlyAccess(data: {
  email: string;
  name?: string;
  source?: string;
}) {
  const tpl = getAdminEarlyAccessTemplate(data);
  return sendSupportEmail(ADMIN_EMAIL, tpl);
}

export async function notifyAdminNewUser(data: {
  email: string;
  name: string;
}) {
  const tpl = getAdminNewUserTemplate(data);
  return sendSupportEmail(ADMIN_EMAIL, tpl);
}

/**
 * Legacy light-themed welcome email (kept for backward compat)
 */
export async function sendWelcomeEmail(data: {
  email: string;
  name: string;
}) {
  // Use the dark-themed welcome template now
  return sendWelcomeEmailDark(data.email, data.name);
}

// Re-export types & constants for consumers
export { ADMIN_EMAIL };
