import express from 'express';
import { getPartners, addPartner, updatePartner, deletePartner, seedPartners, updatePartnerSettings } from '../controllers/partnerController';
import { auth, roleGuard } from '../config/authMiddleware';

const router = express.Router();

router.get('/', getPartners);
router.post('/', auth as any, roleGuard(['admin']), addPartner);
router.put('/settings', auth as any, roleGuard(['partner', 'admin']), updatePartnerSettings);
router.put('/:id', auth as any, roleGuard(['admin']), updatePartner);
router.delete('/:id', auth as any, roleGuard(['admin']), deletePartner);
router.post('/seed', seedPartners);

export default router;
