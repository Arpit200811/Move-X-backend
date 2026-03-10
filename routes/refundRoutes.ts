import express from 'express';
import { getRefunds, procesRefund } from '../controllers/refundController';
import { auth, roleGuard } from '../config/authMiddleware';

const router = express.Router();

router.get('/', auth as any, roleGuard(['admin']), getRefunds);
router.post('/process', auth as any, roleGuard(['admin']), procesRefund);

export default router;
