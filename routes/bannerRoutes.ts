import express from 'express';
import { getBanners, createBanner, deleteBanner } from '../controllers/bannerController';
import { auth, roleGuard } from '../config/authMiddleware';

const router = express.Router();

router.get('/', getBanners);
router.post('/', auth as any, roleGuard(['admin']), createBanner);
router.delete('/:id', auth as any, roleGuard(['admin']), deleteBanner);

export default router;
