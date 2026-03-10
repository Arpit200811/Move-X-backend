import { Router } from 'express';
import { getAllProducts, updateProductAdmin, deleteProductAdmin } from '../controllers/catalogController';
import { auth, roleGuard } from '../config/authMiddleware';

const router = Router();

router.get('/', auth, roleGuard(['admin']), getAllProducts);
router.patch('/:id', auth, roleGuard(['admin']), updateProductAdmin);
router.delete('/:id', auth, roleGuard(['admin']), deleteProductAdmin);

export default router;
