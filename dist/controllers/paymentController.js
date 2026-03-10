"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRefunds = exports.processRefund = exports.stripeWebhook = exports.requestPayout = exports.createPaymentIntent = void 0;
const data_source_1 = require("../data-source");
const Order_1 = require("../models/Order");
const User_1 = require("../models/User");
const Refund_1 = require("../models/Refund");
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_51MockKey12345');
const createPaymentIntent = async (req, res) => {
    try {
        const { orderId, amount, currency } = req.body;
        const orderRepository = data_source_1.AppDataSource.getRepository(Order_1.Order);
        const order = await orderRepository.findOne({ where: { _id: orderId } });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order reference not found' });
        }
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100),
            currency: currency || 'usd',
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                orderId: order._id,
                systemOrderId: order.orderId
            }
        });
        res.json({
            success: true,
            clientSecret: paymentIntent.client_secret,
            publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_MockKey12345'
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.createPaymentIntent = createPaymentIntent;
const requestPayout = async (req, res) => {
    try {
        const { amount } = req.body;
        const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        const driver = await userRepository.findOne({ where: { _id: req.user?.id } });
        if (!driver || driver.role !== 'driver') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }
        if (!driver.walletBalance || driver.walletBalance < amount) {
            return res.status(400).json({ success: false, message: 'Insufficient funds' });
        }
        driver.walletBalance -= amount;
        await userRepository.save(driver);
        res.status(200).json({ success: true, message: 'Payout initiated securely.', newBalance: driver.walletBalance });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.requestPayout = requestPayout;
/**
 * Stripe Webhook Handler
 * Stripe sends async events here (payment succeeded, failed, refunded)
 * Verifies the signature using STRIPE_WEBHOOK_SECRET from .env
 * Register at: https://dashboard.stripe.com/webhooks
 * Local dev testing: stripe listen --forward-to localhost:5000/api/payments/webhook
 */
const stripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
        console.warn('[STRIPE WEBHOOK] STRIPE_WEBHOOK_SECRET not set. Skipping verification.');
        return res.status(200).json({ received: true });
    }
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    }
    catch (err) {
        console.error('[STRIPE WEBHOOK] Signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    const orderRepository = data_source_1.AppDataSource.getRepository(Order_1.Order);
    switch (event.type) {
        case 'payment_intent.succeeded': {
            const intent = event.data.object;
            const orderId = intent.metadata?.orderId;
            if (orderId) {
                const order = await orderRepository.findOne({ where: { _id: orderId } });
                if (order) {
                    order.paymentStatus = 'paid';
                    await orderRepository.save(order);
                    console.log(`[STRIPE] Payment confirmed for Order ${orderId}`);
                }
            }
            break;
        }
        case 'payment_intent.payment_failed': {
            const intent = event.data.object;
            const orderId = intent.metadata?.orderId;
            if (orderId) {
                const order = await orderRepository.findOne({ where: { _id: orderId } });
                if (order) {
                    order.paymentStatus = 'failed';
                    await orderRepository.save(order);
                    console.log(`[STRIPE] Payment FAILED for Order ${orderId}`);
                }
            }
            break;
        }
        default:
            console.log(`[STRIPE WEBHOOK] Unhandled event type: ${event.type}`);
    }
    res.json({ received: true });
};
exports.stripeWebhook = stripeWebhook;
const processRefund = async (req, res) => {
    try {
        const { orderId, amount, type, reason, adminNote } = req.body;
        const refundRepository = data_source_1.AppDataSource.getRepository(Refund_1.Refund);
        const orderRepository = data_source_1.AppDataSource.getRepository(Order_1.Order);
        const order = await orderRepository.findOne({ where: { _id: orderId } });
        if (!order)
            return res.status(404).json({ success: false, message: 'Order not found' });
        const refund = refundRepository.create({
            orderId,
            customerId: order.customerId?._id || 'unknown',
            originalAmount: order.price || 0,
            refundAmount: amount || order.price,
            refundType: type || 'full',
            reason: reason || 'Customer request',
            adminNote: adminNote || '',
            processedBy: req.user?.id,
            status: 'processed'
        });
        if (type === 'coupon') {
            const coupon = `MOVEX-${Math.random().toString(36).substring(7).toUpperCase()}`;
            refund.couponCode = coupon;
            // logic to save coupon to user's wallet could go here
        }
        else if (order.paymentIntentId) {
            try {
                const stripeRefund = await stripe.refunds.create({
                    payment_intent: order.paymentIntentId,
                    amount: Math.round(refund.refundAmount * 100),
                });
                refund.stripeRefundId = stripeRefund.id;
            }
            catch (e) {
                console.error('Stripe refund failed:', e.message);
                return res.status(400).json({ success: false, message: `Stripe Error: ${e.message}` });
            }
        }
        await refundRepository.save(refund);
        order.paymentStatus = 'refunded';
        await orderRepository.save(order);
        res.status(200).json({ success: true, refund });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.processRefund = processRefund;
const getRefunds = async (req, res) => {
    try {
        const refundRepository = data_source_1.AppDataSource.getRepository(Refund_1.Refund);
        const refunds = await refundRepository.find({ order: { createdAt: 'DESC' } });
        res.status(200).json({ success: true, refunds });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getRefunds = getRefunds;
//# sourceMappingURL=paymentController.js.map