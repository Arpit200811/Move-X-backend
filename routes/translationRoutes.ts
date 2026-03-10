import express from 'express';
import { getTranslations, seedTranslations, updateTranslation, getLanguages } from '../controllers/translationController';
import { auth, roleGuard } from '../config/authMiddleware';

const router = express.Router();

router.get('/languages', getLanguages);
router.get('/:lang', getTranslations);
router.post('/seed', seedTranslations);
router.put('/update', auth as any, roleGuard(['admin']), updateTranslation);

export default router;
