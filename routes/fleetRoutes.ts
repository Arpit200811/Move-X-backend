import { Router } from 'express';
import { getVehicleTypes, createVehicleType, updateVehicleType, deleteVehicleType } from '../controllers/fleetController';
import { auth, roleGuard } from '../config/authMiddleware';

const router = Router();

router.get('/', getVehicleTypes);
router.post('/', auth, roleGuard(['admin']), createVehicleType);
router.patch('/:id', auth, roleGuard(['admin']), updateVehicleType);
router.delete('/:id', auth, roleGuard(['admin']), deleteVehicleType);

export default router;
