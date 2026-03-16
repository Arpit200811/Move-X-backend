import express from 'express';
import { 
  createOrder, 
  getAvailableOrders, 
  acceptMission, 
  declineMission,
  updateOrderStatus,
  getOrderById,
  cancelOrder,
  getMyOrders,
  rateOrder,
  sendOrderMessage,
  exportOrdersCSV,
  exportDriversCSV,
  getDriverEarnings,
  partnerAcceptOrder,
  updatePaymentMethod,
  getHistoricalHeatmap,
  gatePassCheck,
  getPriceQuote,
  raiseDispute
} from '../controllers/orderController';
import { auth, roleGuard } from '../config/authMiddleware';

const router = express.Router();

router.post('/', auth as any, roleGuard(['customer', 'admin']), createOrder);
router.post('/quote', auth as any, getPriceQuote);
router.get('/available', auth as any, roleGuard(['driver', 'admin', 'partner']), getAvailableOrders);
router.get('/historical-heatmap', auth as any, roleGuard(['admin']), getHistoricalHeatmap);
router.get('/my', auth as any, getMyOrders);
router.get('/export-csv', auth as any, roleGuard(['admin']), exportOrdersCSV);
router.get('/drivers/export-csv', auth as any, roleGuard(['admin']), exportDriversCSV);
router.get('/driver-earnings', auth as any, roleGuard(['driver', 'admin']), getDriverEarnings);
router.get('/gate-pass', auth as any, gatePassCheck);

router.get('/:id', auth as any, getOrderById);
router.put('/:orderId/accept', auth as any, roleGuard(['driver', 'admin']), acceptMission);
router.put('/:orderId/decline', auth as any, roleGuard(['driver', 'admin']), declineMission);
router.put('/:orderId/merchant-accept', auth as any, roleGuard(['partner', 'admin']), partnerAcceptOrder);
router.put('/:orderId/payment-method', auth as any, roleGuard(['customer']), updatePaymentMethod);
router.put('/:id/status', auth as any, roleGuard(['driver', 'admin', 'partner']), updateOrderStatus);
router.put('/:orderId/cancel', auth as any, cancelOrder);
router.put('/:id/rate', auth as any, roleGuard(['customer', 'admin']), rateOrder);
router.post('/:id/message', auth as any, sendOrderMessage);
router.post('/:id/dispute', auth as any, roleGuard(['customer']), raiseDispute);

export default router;
