import nodemailer from 'nodemailer';

type EmailResult = { success: boolean; error?: string };
type EmailTemplate = { subject: string; html: string; text: string };

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  if (!host || !user || !pass) return null;
  return {
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
  };
}

export function getNoreplyTransporter() {
  const config = getSmtpConfig();
  return config ? nodemailer.createTransport(config) : null;
}

export function getNoreplySmtpConfig() {
  return getSmtpConfig();
}

function layout(title: string, body: string) {
  return `<main style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h1>${title}</h1>${body}</main>`;
}

function template(subject: string, body: string): EmailTemplate {
  return { subject, html: layout(subject, body), text: body.replace(/<[^>]+>/g, '') };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>\"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' })[character] || character);
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text = '',
): Promise<EmailResult> {
  const transporter = getNoreplyTransporter();
  if (!transporter) return { success: false, error: 'SMTP is not configured' };
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || `Sanbay Fusion <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      text,
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Email sending failed' };
  }
}

export async function sendWelcomeEmail(to: string, subject: string, html: string, text = '') {
  return sendEmail(to, subject, html, text);
}

export async function sendAdminEmail(to: string, subject: string, html: string, text = '') {
  return sendEmail(to, subject, html, text);
}

export function getVerificationCodeTemplate(name: string, code: string) {
  return layout('Verify your email', `<p>Hello ${escapeHtml(name)},</p><p>Your verification code is <strong>${escapeHtml(code)}</strong>.</p>`);
}

export function getLoginOTPTemplate(name: string, code: string) {
  return layout('Your login code', `<p>Hello ${escapeHtml(name)},</p><p>Your login code is <strong>${escapeHtml(code)}</strong>.</p>`);
}

export function getLoginAlertTemplate(name: string, data: { ip?: string; userAgent?: string; timestamp?: string }) {
  return layout('New sign-in detected', `<p>Hello ${escapeHtml(name)},</p><p>A sign-in was detected${data.ip ? ` from ${escapeHtml(data.ip)}` : ''}.</p>`);
}

export function getWelcomeTemplate(name: string, couponCode?: string) {
  return layout('Welcome to Sanbay Fusion', `<p>Hello ${escapeHtml(name)},</p><p>Your account is ready.</p>${couponCode ? `<p>Your welcome code: <strong>${escapeHtml(couponCode)}</strong></p>` : ''}`);
}

export function getPasswordResetTemplate(name: string, resetUrl: string) {
  return layout('Reset your password', `<p>Hello ${escapeHtml(name)},</p><p><a href="${escapeHtml(resetUrl)}">Reset your password</a></p>`);
}

function ticketTemplate(title: string, data: Record<string, unknown>): EmailTemplate {
  return template(title, `<p>${escapeHtml(String(data.message || data.subject || 'There is an update to your support ticket.'))}</p>`);
}

export const getTicketCreatedTemplate = (data: Record<string, unknown>) => ticketTemplate('Support ticket created', data);
export const getNewReplyTemplate = (data: Record<string, unknown>) => ticketTemplate('New support ticket reply', data);
export const getStatusChangeTemplate = (data: Record<string, unknown>) => ticketTemplate('Support ticket status updated', data);
export const getSlaBreachTemplate = (data: Record<string, unknown>) => ticketTemplate('Support ticket requires attention', data);
export const getAdminNewUserTemplate = (data: Record<string, unknown>) => ticketTemplate('New user registration', data);
export const getAdminNewTicketTemplate = (data: Record<string, unknown>) => ticketTemplate('New support ticket', data);
export const getAdminContactFormTemplate = (data: Record<string, unknown>) => ticketTemplate('New contact request', data);
export const getAdminJobApplicationTemplate = (data: Record<string, unknown>) => ticketTemplate('New job application', data);
export const getAdminEarlyAccessTemplate = (data: Record<string, unknown>) => ticketTemplate('New early access request', data);

export function getDemoRequestAdminTemplate(data: Record<string, unknown>) {
  return ticketTemplate('New demo request', data);
}

export function getDemoRequestUserTemplate(data: { name: string; date: string; time: string }) {
  return ticketTemplate('Demo request received', data);
}