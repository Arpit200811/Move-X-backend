import express from 'express';
import { createPaymentIntent, requestPayout, stripeWebhook, processRefund, getRefunds } from '../controllers/paymentController';
import { auth, roleGuard } from '../config/authMiddleware';

const router = express.Router();

router.get('/refunds', auth as any, roleGuard(['admin']), getRefunds);
router.post('/refund', auth as any, roleGuard(['admin']), processRefund);
router.post('/create-intent', auth as any, createPaymentIntent);
router.post('/request-payout', auth as any, requestPayout);
router.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

export default router;
