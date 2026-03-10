import express from 'express';
import { getTransactions, requestPayout, topUpWallet } from '../controllers/financialController';
import { auth, roleGuard } from '../config/authMiddleware';

const router = express.Router();

router.get('/transactions', auth as any, roleGuard(['driver', 'customer', 'admin', 'partner']), getTransactions);
router.post('/payout-request', auth as any, roleGuard(['driver', 'admin', 'partner']), requestPayout);
router.post('/top-up', auth as any, topUpWallet);

export default router;
