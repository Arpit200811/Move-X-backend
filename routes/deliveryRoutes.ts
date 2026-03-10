import express from 'express';
import { adminAssignDriver, updateOrderStatus } from '../controllers/orderController';
import { auth } from '../config/authMiddleware';
import { upload } from '../config/multer';

const router = express.Router();

router.post('/assign-driver', auth as any, adminAssignDriver);

router.post('/complete', auth as any, upload.single('evidence'), (req: any, res: any) => {
    // Shim for mobile apps: map POST body to PUT logic
    const { orderId, otp } = req.body;
    req.params = { id: orderId as string }; // controller expects id in params
    req.body = { 
        id: orderId, // also some logic checks body.id
        status: 'DELIVERED', 
        otp,
        deliveryPhoto: req.file ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}` : undefined
    };
    return updateOrderStatus(req as any, res as any);
});

export default router;
