import express from 'express';
import { getNotifications, markRead } from '../controllers/notificationController';
import { auth } from '../config/authMiddleware';

const router = express.Router();

router.get('/', auth as any, getNotifications);
router.put('/:id/read', auth as any, markRead);

export default router;
