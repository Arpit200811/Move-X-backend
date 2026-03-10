import express from 'express';
import { getDrivers, updateLocation, getSurgeHeatmap, getDriverStats, getVRPBatches, acceptVRPBatch } from '../controllers/driverController';
import { auth, roleGuard } from '../config/authMiddleware';

const router = express.Router();

router.get('/', auth as any, roleGuard(['admin']), getDrivers);
router.get('/stats', auth as any, roleGuard(['driver']), getDriverStats);
router.get('/batches', auth as any, roleGuard(['driver']), getVRPBatches);
router.post('/batch-accept', auth as any, roleGuard(['driver']), acceptVRPBatch);
router.post('/location', auth as any, roleGuard(['driver', 'admin']), updateLocation);
router.patch('/location', auth as any, roleGuard(['driver', 'admin']), updateLocation);
router.get('/heatmap', auth as any, roleGuard(['driver', 'customer', 'admin']), getSurgeHeatmap);

export default router;
