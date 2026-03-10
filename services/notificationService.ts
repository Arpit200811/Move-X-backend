import { AppDataSource } from '../data-source';
import { User } from '../models/User';
import { Notification } from '../models/Notification';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

const expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });

// ─── Complete Notification Templates ─────────────────────────────────────────
export const NOTIFICATION_TEMPLATES: Record<string, { title: string; body: (d: any) => string }> = {
  NEW_MISSION: {
    title: '🚀 New Mission Available',
    body: (d) => `New ${d.packageType || 'delivery'} order near you. Earn ₹${d.price || '?'}. Accept now!`
  },
  MISSION_ACCEPTED: {
    title: '🛰️ Driver En Route',
    body: (d) => `Your MoveX agent ${d.agentName || 'Driver'} is heading to pickup location.`
  },
  MISSION_PICKED_UP: {
    title: '📦 Package Picked Up',
    body: () => `Your package is secured and in transit. Track it live now.`
  },
  MISSION_DELIVERED: {
    title: '✅ Delivery Complete!',
    body: () => `Your order has been delivered. Please rate your experience.`
  },
  WALLET_CREDIT: {
    title: '💰 Earnings Received',
    body: (d) => `₹${d.amount} has been added to your MoveX wallet.`
  },
  MERCHANT_ACCEPTED: {
    title: '🏪 Order Confirmed by Merchant',
    body: (d) => `${d.merchantName || 'Your merchant'} has accepted your order. Preparing now!`
  },
  MERCHANT_PREPARING: {
    title: '👨‍🍳 Merchant Preparing Order',
    body: (d) => `${d.merchantName || 'Merchant'} is preparing your order.`
  },
  NEW_INCOMING_MISSION: {
    title: '🔔 New Order Incoming!',
    body: (d) => `New delivery request for ${d.itemName || 'an item'}. Check your dashboard.`
  },
  ORDER_CANCELLED: {
    title: '❌ Order Cancelled',
    body: (d) => `Order ${d.orderId || ''} has been cancelled. Any payment will be refunded.`
  },
  PAYOUT_APPROVED: {
    title: '✅ Payout Approved',
    body: (d) => `Your payout of ₹${d.amount} has been approved and is being processed.`
  },
  PAYOUT_REJECTED: {
    title: '❌ Payout Rejected',
    body: (d) => `Your payout request was rejected. Reason: ${d.reason || 'Contact support'}.`
  },
  KYC_APPROVED: {
    title: '🎉 Account Verified!',
    body: () => `Your KYC documents have been verified. You can now accept orders!`
  },
  KYC_REJECTED: {
    title: '⚠️ Verification Failed',
    body: (d) => `Your documents were rejected. Reason: ${d.reason || 'Please resubmit clear images'}.`
  }
};

// ─── Main sendNotification Function ──────────────────────────────────────────
export const sendNotification = async (
  userId: string,
  titleOrTemplate: string,
  bodyOrData: any = {},
  extraData: any = {}
) => {
  if (!userId) return;

  let title = titleOrTemplate;
  let body = typeof bodyOrData === 'string' ? bodyOrData : '';

  // Resolve template
  const template = NOTIFICATION_TEMPLATES[titleOrTemplate];
  if (template) {
    title = template.title;
    body = template.body(bodyOrData);
  }

  console.log(`[PUSH] → userId:${userId} | "${title}"`);

  try {
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { _id: userId } });

    // ── Save to DB always (for in-app notification bell) ──
    const notificationRepository = AppDataSource.getRepository(Notification);
    await notificationRepository.save(
      notificationRepository.create({ userId: { _id: userId } as any, title, message: body, isRead: false })
    );

    // ── Send Push if valid Expo token ──
    if (!user?.pushToken || !Expo.isExpoPushToken(user.pushToken)) {
      console.log(`[PUSH SKIP] No valid push token for user ${userId}`);
      return;
    }

    const messages: ExpoPushMessage[] = [{
      to: user.pushToken,
      sound: 'default',
      title,
      body,
      priority: 'high',
      badge: 1,
      channelId: 'default',   // Android channel
      data: { ...extraData, type: titleOrTemplate },
    }];

    const chunks = expo.chunkPushNotifications(messages);
    const tickets: ExpoPushTicket[] = [];

    for (const chunk of chunks) {
      try {
        const chunkTickets = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...chunkTickets);
      } catch (err: any) {
        console.error('[PUSH CHUNK ERROR]', err.message);
      }
    }

    // ── Check receipts async (non-blocking) ──
    setTimeout(async () => {
      try {
        const receiptIds = tickets
          .filter((t): t is any => t.status === 'ok' && !!t.id)
          .map((t) => t.id);

        if (receiptIds.length === 0) return;

        const receiptChunks = expo.chunkPushNotificationReceiptIds(receiptIds);
        for (const chunk of receiptChunks) {
          const receipts = await expo.getPushNotificationReceiptsAsync(chunk);
          for (const [receiptId, receipt] of Object.entries(receipts)) {
            if (receipt.status === 'error') {
              console.error(`[PUSH RECEIPT ERROR] id:${receiptId}`, receipt.message);
              // DeviceNotRegistered = token expired → clear it
              if ((receipt as any).details?.error === 'DeviceNotRegistered') {
                await userRepository.update(userId, { pushToken: '' });
                console.log(`[PUSH] Cleared stale token for user ${userId}`);
              }
            }
          }
        }
      } catch (e: any) {
        console.error('[PUSH RECEIPT CHECK FAIL]', e.message);
      }
    }, 5000); // Check after 5 seconds

  } catch (e: any) {
    console.error('[NOTIFICATION SERVICE ERROR]', e.message);
  }
};

