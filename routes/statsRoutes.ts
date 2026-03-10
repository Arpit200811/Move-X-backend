import express from 'express';
import { getDashboardStats, getHeatmap } from '../controllers/statsController';
import { auth } from '../config/authMiddleware';

const router = express.Router();

router.get('/dashboard', auth as any, getDashboardStats);
router.get('/heatmap', auth as any, getHeatmap);

export default router;
