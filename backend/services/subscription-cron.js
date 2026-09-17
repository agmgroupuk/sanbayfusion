/**
 * Subscription Cron Jobs
 *
 * Handles:
 * - Automatic expiration of subscriptions
 * - Renewal reminder emails (3 days, 1 day before expiry)
 * - Expiration notification emails
 */

import cron from 'node-cron';
import { prisma } from '../lib/prisma.js';
import {
  sendSubscriptionRenewalReminderEmail,
  sendSubscriptionExpiredEmail,
} from './email.js';

/**
 * Start the subscription expiration cron job
 * Runs every hour at minute 0 (e.g., 1:00, 2:00, 3:00, etc.)
 */
export function startSubscriptionExpirationCron() {
  // Expiration check: runs every hour
  cron.schedule('0 * * * *', async () => {
    try {
      console.log('🕐 [Cron] Running subscription expiration check...');
      await expireOldSubscriptions();
    } catch (error) {
      console.error('❌ [Cron] Error in expiration check:', error);
    }
  });

  // Renewal reminders: runs daily at 9 AM
  cron.schedule('0 9 * * *', async () => {
    try {
      console.log('🕐 [Cron] Running subscription renewal reminders...');
      await sendRenewalReminders();
    } catch (error) {
      console.error('❌ [Cron] Error sending renewal reminders:', error);
    }
  });

  console.log('✅ Subscription cron jobs started:');
  console.log('   - Expiration check: hourly at minute 0');
  console.log('   - Renewal reminders: daily at 9 AM');
}

/**
 * Expire old subscriptions and send notification emails
 */
export async function expireOldSubscriptions() {
  try {
    console.log('🔄 Expiring old subscriptions...');

    const now = new Date();

    // First, find all subscriptions that will be expired (to send emails)
    const expiringSubscriptions = await prisma.agentSubscription.findMany({
      where: {
        status: 'active',
        expiryDate: { lt: now },
      },
      include: {
        user: {
          select: { email: true, name: true },
        },
        agent: {
          select: { agentId: true, name: true },
        },
      },
    });

    // Update status to expired
    const result = await prisma.agentSubscription.updateMany({
      where: {
        status: 'active',
        expiryDate: { lt: now },
      },
      data: {
        status: 'expired',
      },
    });

    // Send expiration emails
    for (const sub of expiringSubscriptions) {
      try {
        await sendSubscriptionExpiredEmail(sub.user.email, {
          userName: sub.user.name || 'there',
          agentName: sub.agent.name,
          agentId: sub.agent.agentId,
          expiryDate: sub.expiryDate,
        });
      } catch (emailError) {
        console.error(`Failed to send expiration email to ${sub.user.email}:`, emailError.message);
      }
    }

    console.log(`✅ Marked ${result.count} subscription(s) as expired`);
    return result;
  } catch (error) {
    console.error('❌ Error expiring subscriptions:', error);
    throw error;
  }
}

/**
 * Send renewal reminder emails for subscriptions expiring soon
 * Sends reminders at 3 days and 1 day before expiry
 */
export async function sendRenewalReminders() {
  try {
    const now = new Date();
    
    // Calculate reminder dates
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    
    const oneDayFromNow = new Date(now);
    oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);
    
    // Find subscriptions expiring in ~3 days (within a 2-hour window to avoid duplicates)
    const threeDayReminders = await prisma.agentSubscription.findMany({
      where: {
        status: 'active',
        autoRenew: false, // Only remind users who haven't enabled auto-renew
        expiryDate: {
          gte: new Date(threeDaysFromNow.getTime() - 60 * 60 * 1000), // -1 hour
          lte: new Date(threeDaysFromNow.getTime() + 60 * 60 * 1000), // +1 hour
        },
      },
      include: {
        user: { select: { email: true, name: true } },
        agent: { select: { agentId: true, name: true } },
      },
    });
    
    // Find subscriptions expiring in ~1 day
    const oneDayReminders = await prisma.agentSubscription.findMany({
      where: {
        status: 'active',
        autoRenew: false,
        expiryDate: {
          gte: new Date(oneDayFromNow.getTime() - 60 * 60 * 1000),
          lte: new Date(oneDayFromNow.getTime() + 60 * 60 * 1000),
        },
      },
      include: {
        user: { select: { email: true, name: true } },
        agent: { select: { agentId: true, name: true } },
      },
    });
    
    // Send 3-day reminders
    for (const sub of threeDayReminders) {
      try {
        await sendSubscriptionRenewalReminderEmail(sub.user.email, {
          userName: sub.user.name || 'there',
          agentName: sub.agent.name,
          agentId: sub.agent.agentId,
          expiryDate: sub.expiryDate,
          daysRemaining: 3,
        });
        console.log(`📧 Sent 3-day renewal reminder to ${sub.user.email}`);
      } catch (emailError) {
        console.error(`Failed to send 3-day reminder to ${sub.user.email}:`, emailError.message);
      }
    }
    
    // Send 1-day reminders
    for (const sub of oneDayReminders) {
      try {
        await sendSubscriptionRenewalReminderEmail(sub.user.email, {
          userName: sub.user.name || 'there',
          agentName: sub.agent.name,
          agentId: sub.agent.agentId,
          expiryDate: sub.expiryDate,
          daysRemaining: 1,
        });
        console.log(`📧 Sent 1-day renewal reminder to ${sub.user.email}`);
      } catch (emailError) {
        console.error(`Failed to send 1-day reminder to ${sub.user.email}:`, emailError.message);
      }
    }
    
    console.log(`✅ Sent ${threeDayReminders.length} 3-day reminders, ${oneDayReminders.length} 1-day reminders`);
    return {
      threeDayReminders: threeDayReminders.length,
      oneDayReminders: oneDayReminders.length,
    };
  } catch (error) {
    console.error('❌ Error sending renewal reminders:', error);
    throw error;
  }
}

export default { 
  startSubscriptionExpirationCron, 
  expireOldSubscriptions,
  sendRenewalReminders,
};
