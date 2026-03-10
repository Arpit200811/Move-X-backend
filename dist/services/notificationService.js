"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNotification = exports.NOTIFICATION_TEMPLATES = void 0;
const data_source_1 = require("../data-source");
const User_1 = require("../models/User");
const Notification_1 = require("../models/Notification");
const expo_server_sdk_1 = require("expo-server-sdk");
const expo = new expo_server_sdk_1.Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });
// ─── Complete Notification Templates ─────────────────────────────────────────
exports.NOTIFICATION_TEMPLATES = {
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
const sendNotification = async (userId, titleOrTemplate, bodyOrData = {}, extraData = {}) => {
    if (!userId)
        return;
    let title = titleOrTemplate;
    let body = typeof bodyOrData === 'string' ? bodyOrData : '';
    // Resolve template
    const template = exports.NOTIFICATION_TEMPLATES[titleOrTemplate];
    if (template) {
        title = template.title;
        body = template.body(bodyOrData);
    }
    console.log(`[PUSH] → userId:${userId} | "${title}"`);
    try {
        const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        const user = await userRepository.findOne({ where: { _id: userId } });
        // ── Save to DB always (for in-app notification bell) ──
        const notificationRepository = data_source_1.AppDataSource.getRepository(Notification_1.Notification);
        await notificationRepository.save(notificationRepository.create({ userId: { _id: userId }, title, message: body, isRead: false }));
        // ── Send Push if valid Expo token ──
        if (!user?.pushToken || !expo_server_sdk_1.Expo.isExpoPushToken(user.pushToken)) {
            console.log(`[PUSH SKIP] No valid push token for user ${userId}`);
            return;
        }
        const messages = [{
                to: user.pushToken,
                sound: 'default',
                title,
                body,
                priority: 'high',
                badge: 1,
                channelId: 'default', // Android channel
                data: { ...extraData, type: titleOrTemplate },
            }];
        const chunks = expo.chunkPushNotifications(messages);
        const tickets = [];
        for (const chunk of chunks) {
            try {
                const chunkTickets = await expo.sendPushNotificationsAsync(chunk);
                tickets.push(...chunkTickets);
            }
            catch (err) {
                console.error('[PUSH CHUNK ERROR]', err.message);
            }
        }
        // ── Check receipts async (non-blocking) ──
        setTimeout(async () => {
            try {
                const receiptIds = tickets
                    .filter((t) => t.status === 'ok' && !!t.id)
                    .map((t) => t.id);
                if (receiptIds.length === 0)
                    return;
                const receiptChunks = expo.chunkPushNotificationReceiptIds(receiptIds);
                for (const chunk of receiptChunks) {
                    const receipts = await expo.getPushNotificationReceiptsAsync(chunk);
                    for (const [receiptId, receipt] of Object.entries(receipts)) {
                        if (receipt.status === 'error') {
                            console.error(`[PUSH RECEIPT ERROR] id:${receiptId}`, receipt.message);
                            // DeviceNotRegistered = token expired → clear it
                            if (receipt.details?.error === 'DeviceNotRegistered') {
                                await userRepository.update(userId, { pushToken: '' });
                                console.log(`[PUSH] Cleared stale token for user ${userId}`);
                            }
                        }
                    }
                }
            }
            catch (e) {
                console.error('[PUSH RECEIPT CHECK FAIL]', e.message);
            }
        }, 5000); // Check after 5 seconds
    }
    catch (e) {
        console.error('[NOTIFICATION SERVICE ERROR]', e.message);
    }
};
exports.sendNotification = sendNotification;
//# sourceMappingURL=notificationService.js.map