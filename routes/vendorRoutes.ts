import { Router } from 'express';
import { getVendors, getMyProducts, addProduct, deleteProduct, updateProduct } from '../controllers/vendorController';
import { auth, roleGuard } from '../config/authMiddleware';

const router = Router();

// Zomato and Apollo unified vendors endpoint
router.get('/', auth, getVendors);

// Partner product management
router.get('/my-products', auth as any, roleGuard(['partner', 'admin']), getMyProducts);
router.post('/products', auth as any, roleGuard(['partner', 'admin']), addProduct);
router.put('/products/:productId', auth as any, roleGuard(['partner', 'admin']), updateProduct);
router.delete('/products/:productId', auth as any, roleGuard(['partner', 'admin']), deleteProduct);

export default router;
