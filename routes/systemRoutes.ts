import express from 'express';
import { getSystemStatus, toggleMaintenance, getSystemStats, getSystemLogs, getSupportTickets, updateSystemConfig } from '../controllers/systemController';
import { auth, roleGuard } from '../config/authMiddleware';

const router = express.Router();

router.get('/status', auth as any, getSystemStatus);
router.get('/stats', auth as any, roleGuard(['admin']), getSystemStats);
router.get('/logs', auth as any, roleGuard(['admin']), getSystemLogs);
router.get('/support-tickets', auth as any, roleGuard(['admin']), getSupportTickets);
router.post('/toggle-maintenance', auth as any, roleGuard(['admin']), toggleMaintenance);
router.put('/config', auth as any, roleGuard(['admin']), updateSystemConfig);

export default router;
