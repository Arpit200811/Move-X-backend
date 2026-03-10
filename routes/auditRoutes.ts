import express from 'express';
import { getAuditLogs } from '../controllers/auditController';
import { auth, roleGuard } from '../config/authMiddleware';

const router = express.Router();

router.get('/', auth as any, roleGuard(['admin']), getAuditLogs);

export default router;
