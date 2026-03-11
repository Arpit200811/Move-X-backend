import express from 'express';
import { getZones, createZone, deleteZone, getTaxConfigs, updateTaxConfig, checkServiceability } from '../controllers/zoneController';
import { auth, roleGuard } from '../config/authMiddleware';

const router = express.Router();

router.get('/', getZones);
router.get('/check', checkServiceability);
router.post('/', auth as any, roleGuard(['admin']), createZone);
router.delete('/:id', auth as any, roleGuard(['admin']), deleteZone);
router.get('/tax', auth as any, roleGuard(['admin']), getTaxConfigs);
router.put('/tax', auth as any, roleGuard(['admin']), updateTaxConfig);

export default router;
