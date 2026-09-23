// =====================================================
// BACKEND EMAIL SERVICE — Thin wrapper around @maula/email
// =====================================================

import {
    // Transport
    getNoreplyTransporter,
    getWelcomeTransporter,
    getNoreplySmtpConfig,
    getWelcomeSmtpConfig,
    sendEmail,
    sendAdminEmail,
    logEmailSend,
    logEmailFailed,

    // Layout (for backward compat / in case any other file used these)
    ADMIN_EMAIL,

    // Auth templates
    getVerificationCodeTemplate,
    getLoginOTPTemplate,
    getLoginAlertTemplate,
    getPasswordResetTemplate,
    getPasswordChangedTemplate,

    // Welcome
    getWelcomeTemplate,

    // Subscription templates
    getSubscriptionConfirmationTemplate,
    getSubscriptionCancelledTemplate,
    getSubscriptionExpiredTemplate,
    getSubscriptionRenewalReminderTemplate,
    getPaymentReceiptTemplate,

    // Admin templates
    getAdminNewUserTemplate,
    getAdminNewTicketTemplate,
    getAdminContactFormTemplate,
    getAdminJobApplicationTemplate,
    getAdminEarlyAccessTemplate,
    getAdminConsultationTemplate,

    // Misc templates
    getNewsletterConfirmationTemplate,
    getEarlyAccessConfirmationTemplate,
    getContactFormAutoReplyTemplate,
} from '../../packages/email/index.js';

// =====================================================
// TEMPLATE RE-EXPORTS (backward compat for anything
// that imported getXxxTemplate directly)
// =====================================================

export function getWelcomeEmailTemplate(userName, couponCode) {
    return getWelcomeTemplate(userName, couponCode);
}

export function getLoginAlertEmailTemplate(userName, loginData) {
    return getLoginAlertTemplate(userName, loginData);
}

export function getPasswordResetEmailTemplate(userName, resetUrl) {
    return getPasswordResetTemplate(userName, resetUrl);
}

export function getEmailVerificationTemplate(userName, code) {
    return getVerificationCodeTemplate(userName, code);
}

export function getPasswordChangedAlertTemplate(userName, changeData) {
    return getPasswordChangedTemplate(userName, changeData);
}

export { getLoginOTPTemplate };

// ── Helper: inject tracking pixel into email HTML ────
function injectTrackingPixel(html, trackingId) {
    if (!trackingId || !html) return html;
    return html.replace('</body>', `<img src="https://sanbayfusion.com/api/email/track/${trackingId}.png" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;" />\n</body>`);
}

// =====================================================
// SEND FUNCTIONS
// =====================================================

/** Welcome Email — from hello@sanbayfusion.com */
export async function sendWelcomeEmail(email, name, couponCode) {
    const transporter = getWelcomeTransporter() || getNoreplyTransporter();
    if (!transporter) { console.log('[WELCOME EMAIL] SMTP not configured. Would send to:', email); return; }
    try {
        const cfg = getWelcomeSmtpConfig();
        const trackingId = await logEmailSend(email, '🎉 Welcome to Sanbay Fusion — Let\'s Get Started!', 'welcome');
        await transporter.sendMail({
            from: cfg.from,
            to: email,
            subject: '🎉 Welcome to Sanbay Fusion — Let\'s Get Started!',
            html: injectTrackingPixel(getWelcomeTemplate(name, couponCode), trackingId),
        });
        console.log(`✅ Welcome email sent to ${email} from hello@sanbayfusion.com${couponCode ? ` (with coupon: ${couponCode})` : ''}`);
    } catch (error) {
        console.error('❌ Failed to send welcome email:', error.message);
        await logEmailFailed(email, 'Welcome Email', 'welcome', error.message);
    }
}

/** Login Alert Email — from hello@sanbayfusion.com */
export async function sendLoginAlertEmail(email, name, loginData) {
    const transporter = getNoreplyTransporter();
    if (!transporter) { console.log('[LOGIN ALERT] SMTP not configured. Would send to:', email); return; }
    try {
        const cfg = getNoreplySmtpConfig();
        const trackingId = await logEmailSend(email, '🔐 New Login to Your Sanbay Fusion Account', 'login_alert');
        await transporter.sendMail({
            from: cfg.from,
            to: email,
            subject: '🔐 New Login to Your Sanbay Fusion Account',
            html: injectTrackingPixel(getLoginAlertTemplate(name, loginData), trackingId),
        });
        console.log(`✅ Login alert email sent to ${email}`);
    } catch (error) {
        console.error('❌ Failed to send login alert email:', error.message);
        await logEmailFailed(email, 'Login Alert', 'login_alert', error.message);
    }
}

/** Password Reset Email — from hello@sanbayfusion.com */
export async function sendPasswordResetEmail(email, name, resetUrl) {
    const transporter = getNoreplyTransporter();
    if (!transporter) { console.log('[PASSWORD RESET] SMTP not configured. Would send to:', email); return; }
    try {
        const cfg = getNoreplySmtpConfig();
        const trackingId = await logEmailSend(email, '🔐 Reset Your Password — Sanbay Fusion', 'password_reset');
        await transporter.sendMail({
            from: cfg.from,
            to: email,
            subject: '🔐 Reset Your Password — Sanbay Fusion',
            html: injectTrackingPixel(getPasswordResetTemplate(name, resetUrl), trackingId),
        });
        console.log(`✅ Password reset email sent to ${email}`);
    } catch (error) {
        console.error('❌ Failed to send password reset email:', error.message);
        await logEmailFailed(email, 'Password Reset', 'password_reset', error.message);
    }
}

/** Subscription Confirmation */
async function _sendSubscriptionConfirmationEmailInternal(email, data) {
    const transporter = getNoreplyTransporter();
    if (!transporter) { console.log('[SUBSCRIPTION EMAIL] SMTP not configured. Would send to:', email); return; }
    try {
        const cfg = getNoreplySmtpConfig();
        const subject = `🎉 Subscription Confirmed: ${data.agentName} (${data.plan})`;
        const trackingId = await logEmailSend(email, subject, 'subscription_confirmed');
        await transporter.sendMail({
            from: cfg.from,
            to: email,
            subject,
            html: injectTrackingPixel(getSubscriptionConfirmationTemplate(data), trackingId),
        });
        console.log(`✅ Subscription confirmation email sent to ${email}`);
    } catch (error) {
        console.error('❌ Failed to send subscription confirmation email:', error.message);
        await logEmailFailed(email, 'Subscription Confirmed', 'subscription_confirmed', error.message);
    }
}

/** Public wrapper — accepts { email, ...data } */
export async function sendSubscriptionConfirmationEmail(data) {
    return await _sendSubscriptionConfirmationEmailInternal(data.email, data);
}

/** Subscription Cancelled */
export async function sendSubscriptionCancelledEmail(email, data) {
    const transporter = getNoreplyTransporter();
    if (!transporter) { console.log('[SUBSCRIPTION CANCELLED] SMTP not configured. Would send to:', email); return; }
    try {
        const cfg = getNoreplySmtpConfig();
        const subject = `Subscription Cancelled: ${data.agentName}`;
        const trackingId = await logEmailSend(email, subject, 'subscription_cancelled');
        await transporter.sendMail({
            from: cfg.from,
            to: email,
            subject,
            html: injectTrackingPixel(getSubscriptionCancelledTemplate(data), trackingId),
        });
        console.log(`✅ Subscription cancelled email sent to ${email}`);
    } catch (error) {
        console.error('❌ Failed to send subscription cancelled email:', error.message);
        await logEmailFailed(email, 'Subscription Cancelled', 'subscription_cancelled', error.message);
    }
}

/** Subscription Expired */
export async function sendSubscriptionExpiredEmail(email, data) {
    const transporter = getNoreplyTransporter();
    if (!transporter) { console.log('[SUBSCRIPTION EXPIRED] SMTP not configured. Would send to:', email); return; }
    try {
        const cfg = getNoreplySmtpConfig();
        const subject = `😢 Your ${data.agentName} subscription has expired`;
        const trackingId = await logEmailSend(email, subject, 'subscription_expired');
        await transporter.sendMail({
            from: cfg.from,
            to: email,
            subject,
            html: injectTrackingPixel(getSubscriptionExpiredTemplate(data), trackingId),
        });
        console.log(`✅ Subscription expired email sent to ${email}`);
    } catch (error) {
        console.error('❌ Failed to send subscription expired email:', error.message);
        await logEmailFailed(email, 'Subscription Expired', 'subscription_expired', error.message);
    }
}

/** Subscription Renewal Reminder */
export async function sendSubscriptionRenewalReminderEmail(email, data) {
    const transporter = getNoreplyTransporter();
    if (!transporter) { console.log('[RENEWAL REMINDER] SMTP not configured. Would send to:', email); return; }
    try {
        const cfg = getNoreplySmtpConfig();
        const subject = `⏰ ${data.daysRemaining} days left: ${data.agentName} subscription expiring`;
        const trackingId = await logEmailSend(email, subject, 'renewal_reminder');
        await transporter.sendMail({
            from: cfg.from,
            to: email,
            subject,
            html: injectTrackingPixel(getSubscriptionRenewalReminderTemplate(data), trackingId),
        });
        console.log(`✅ Renewal reminder email sent to ${email}`);
    } catch (error) {
        console.error('❌ Failed to send renewal reminder email:', error.message);
        await logEmailFailed(email, 'Renewal Reminder', 'renewal_reminder', error.message);
    }
}

/** Payment Receipt */
export async function sendPaymentReceiptEmail(email, data) {
    const transporter = getNoreplyTransporter();
    if (!transporter) { console.log('[PAYMENT RECEIPT] SMTP not configured. Would send to:', email); return; }
    try {
        const cfg = getNoreplySmtpConfig();
        const subject = `✅ Payment Receipt — $${typeof data.amount === 'number' ? data.amount.toFixed(2) : data.amount} for ${data.agentName}`;
        const trackingId = await logEmailSend(email, subject, 'payment_receipt');
        await transporter.sendMail({
            from: cfg.from,
            to: email,
            subject,
            html: injectTrackingPixel(getPaymentReceiptTemplate(data), trackingId),
        });
        console.log(`✅ Payment receipt email sent to ${email}`);
    } catch (error) {
        console.error('❌ Failed to send payment receipt email:', error.message);
        await logEmailFailed(email, 'Payment Receipt', 'payment_receipt', error.message);
    }
}

// =====================================================
// NEWSLETTER & MISC
// =====================================================

export async function sendNewsletterConfirmationEmail(email, name) {
    const tpl = getNewsletterConfirmationTemplate(name, email);
    return sendEmail(email, tpl.subject, tpl.html, tpl.text, { type: 'newsletter' });
}

export async function sendEarlyAccessConfirmationEmail(email, data) {
    const tpl = getEarlyAccessConfirmationTemplate(data);
    return sendEmail(email, tpl.subject, tpl.html, tpl.text, { type: 'early_access' });
}

export async function sendContactFormAutoReply(email, data) {
    const tpl = getContactFormAutoReplyTemplate(data);
    return sendEmail(email, tpl.subject, tpl.html, tpl.text, { type: 'contact_reply' });
}

/** Email Verification Code */
export async function sendVerificationCodeEmail(email, name, code) {
    const transporter = getNoreplyTransporter();
    if (!transporter) { console.log('[VERIFY EMAIL] SMTP not configured. Would send to:', email); return; }
    try {
        const cfg = getNoreplySmtpConfig();
        const trackingId = await logEmailSend(email, '🔑 Sanbay Fusion — Your Email Verification Code', 'verification_code');
        await transporter.sendMail({
            from: cfg.from,
            to: email,
            subject: '🔑 Sanbay Fusion — Your Email Verification Code',
            html: injectTrackingPixel(getVerificationCodeTemplate(name, code), trackingId),
        });
        console.log(`✅ Verification code email sent to ${email}`);
    } catch (error) {
        console.error('❌ Failed to send verification code email:', error.message);
        await logEmailFailed(email, 'Verification Code', 'verification_code', error.message);
    }
}

/** Login OTP Email */
export async function sendLoginOTPEmail(email, name, code) {
    const transporter = getNoreplyTransporter();
    if (!transporter) { console.log('[LOGIN OTP] SMTP not configured. Would send to:', email); return; }
    try {
        const cfg = getNoreplySmtpConfig();
        const trackingId = await logEmailSend(email, '🔑 Sanbay Fusion — Your Login Verification Code', 'login_otp');
        await transporter.sendMail({
            from: cfg.from,
            to: email,
            subject: '🔑 Sanbay Fusion — Your Login Verification Code',
            html: injectTrackingPixel(getLoginOTPTemplate(name, code), trackingId),
        });
        console.log(`✅ Login OTP email sent to ${email}`);
    } catch (error) {
        console.error('❌ Failed to send login OTP email:', error.message);
        await logEmailFailed(email, 'Login OTP', 'login_otp', error.message);
    }
}

/** Password Changed Alert */
export async function sendPasswordChangedAlert(email, name, changeData) {
    const transporter = getNoreplyTransporter();
    if (!transporter) { console.log('[PASSWORD CHANGED] SMTP not configured. Would send to:', email); return; }
    try {
        const cfg = getNoreplySmtpConfig();
        const trackingId = await logEmailSend(email, '🔒 Your Sanbay Fusion Password Was Changed', 'password_changed');
        await transporter.sendMail({
            from: cfg.from,
            to: email,
            subject: '🔒 Your Sanbay Fusion Password Was Changed',
            html: injectTrackingPixel(getPasswordChangedTemplate(name, changeData), trackingId),
        });
        console.log(`✅ Password changed alert sent to ${email}`);
    } catch (error) {
        console.error('❌ Failed to send password changed alert:', error.message);
        await logEmailFailed(email, 'Password Changed', 'password_changed', error.message);
    }
}

// =====================================================
// ADMIN NOTIFICATION EMAILS
// =====================================================

export async function notifyAdminContactForm(data) {
    const tpl = getAdminContactFormTemplate(data);
    return sendAdminEmail(tpl.subject, tpl.html, tpl.text);
}

export async function notifyAdminNewUser(data) {
    const tpl = getAdminNewUserTemplate(data);
    return sendAdminEmail(tpl.subject, tpl.html, tpl.text);
}

export async function notifyAdminSupportTicket(data) {
    const tpl = getAdminNewTicketTemplate(data);
    return sendAdminEmail(tpl.subject, tpl.html, tpl.text);
}

export async function notifyAdminJobApplication(data) {
    const tpl = getAdminJobApplicationTemplate({
        ...data,
        applicantName: data.applicantName || data.name,
        applicantEmail: data.applicantEmail || data.email,
        applicationNumber: data.applicationNumber || `APP-${Date.now()}`,
    });
    return sendAdminEmail(tpl.subject, tpl.html, tpl.text);
}

export async function notifyAdminConsultation(data) {
    const tpl = getAdminConsultationTemplate(data);
    return sendAdminEmail(tpl.subject, tpl.html, tpl.text);
}

export async function notifyAdminEarlyAccess(data) {
    const tpl = getAdminEarlyAccessTemplate(data);
    return sendAdminEmail(tpl.subject, tpl.html, tpl.text);
}
