// =====================================================
// LIVE SUPPORT BACKEND — EMAIL SERVICE
// Thin wrapper around @maula/email shared package
// =====================================================

import {
    getNoreplyTransporter,
    getNoreplySmtpConfig,
    sendAdminEmail,
    ADMIN_EMAIL,
    PLATFORM_URL,

    // Admin templates
    getAdminContactFormTemplate,
    getAdminNewTicketTemplate,
    getAdminConsultationTemplate,

    // Misc templates
    getContactFormAutoReplyTemplate,
} from '../../../packages/email/index.js';

// ── Notify admin of contact form submission ──────────
export async function notifyAdminContactForm({ name, email, subject, message, ticketId }) {
    const tpl = getAdminContactFormTemplate({ name, email, subject, message, ticketId });
    return sendAdminEmail(tpl.subject, tpl.html, tpl.text);
}

// ── Notify admin of new support ticket ───────────────
export async function notifyAdminSupportTicket({ ticketId, ticketNumber, subject, userName, userEmail, category, priority }) {
    const tpl = getAdminNewTicketTemplate({ ticketId, ticketNumber, subject, userName, userEmail, category, priority });
    return sendAdminEmail(tpl.subject, tpl.html, tpl.text);
}

// ── Notify admin of consultation request ─────────────
export async function notifyAdminConsultation({ consultationId, consultationNumber, userName, userEmail, userPhone, consultationType, projectDescription }) {
    const tpl = getAdminConsultationTemplate({
        consultationId,
        consultationNumber,
        userName,
        userEmail,
        userPhone,
        consultationType,
        projectDescription,
    });
    return sendAdminEmail(tpl.subject, tpl.html, tpl.text);
}

// ── Send auto-reply to contact form submitter ────────
export async function sendContactFormAutoReply(toEmail, { name, subject, message, ticketId }) {
    const transporter = getNoreplyTransporter();
    if (!transporter) { console.log('[email] SMTP not configured, skipping auto-reply'); return; }

    const tpl = getContactFormAutoReplyTemplate({ name, email: toEmail, subject, message, ticketId });
    try {
        const cfg = getNoreplySmtpConfig();
        await transporter.sendMail({
            from: cfg.from,
            to: toEmail,
            subject: tpl.subject,
            html: tpl.html,
            text: tpl.text,
        });
        console.log('[email] Auto-reply sent to', toEmail);
    } catch (error) {
        console.error('[email] Failed to send auto-reply:', error);
    }
}
