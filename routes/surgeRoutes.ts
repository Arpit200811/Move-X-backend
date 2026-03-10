import { Router } from 'express';
import { getSurgeConfig, updateSurge, updateGlobalSurge } from '../controllers/surgeController';
import { auth, roleGuard } from '../config/authMiddleware';

const router = Router();

router.get('/', auth, roleGuard(['admin']), getSurgeConfig);
router.post('/update', auth, roleGuard(['admin']), updateSurge);
router.post('/global', auth, roleGuard(['admin']), updateGlobalSurge);

export default router;
