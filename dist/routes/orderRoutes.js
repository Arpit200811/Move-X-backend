"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const orderController_1 = require("../controllers/orderController");
const authMiddleware_1 = require("../config/authMiddleware");
const router = express_1.default.Router();
router.post('/', authMiddleware_1.auth, (0, authMiddleware_1.roleGuard)(['customer', 'admin']), orderController_1.createOrder);
router.post('/quote', authMiddleware_1.auth, orderController_1.getPriceQuote);
router.get('/available', authMiddleware_1.auth, (0, authMiddleware_1.roleGuard)(['driver', 'admin', 'partner']), orderController_1.getAvailableOrders);
router.get('/historical-heatmap', authMiddleware_1.auth, (0, authMiddleware_1.roleGuard)(['admin']), orderController_1.getHistoricalHeatmap);
router.get('/my', authMiddleware_1.auth, orderController_1.getMyOrders);
router.get('/export-csv', authMiddleware_1.auth, (0, authMiddleware_1.roleGuard)(['admin']), orderController_1.exportOrdersCSV);
router.get('/drivers/export-csv', authMiddleware_1.auth, (0, authMiddleware_1.roleGuard)(['admin']), orderController_1.exportDriversCSV);
router.get('/driver-earnings', authMiddleware_1.auth, (0, authMiddleware_1.roleGuard)(['driver', 'admin']), orderController_1.getDriverEarnings);
router.get('/gate-pass', authMiddleware_1.auth, orderController_1.gatePassCheck);
router.get('/:id', authMiddleware_1.auth, orderController_1.getOrderById);
router.put('/:orderId/accept', authMiddleware_1.auth, (0, authMiddleware_1.roleGuard)(['driver', 'admin']), orderController_1.acceptMission);
router.put('/:orderId/decline', authMiddleware_1.auth, (0, authMiddleware_1.roleGuard)(['driver', 'admin']), orderController_1.declineMission);
router.put('/:orderId/merchant-accept', authMiddleware_1.auth, (0, authMiddleware_1.roleGuard)(['partner', 'admin']), orderController_1.partnerAcceptOrder);
router.put('/:orderId/payment-method', authMiddleware_1.auth, (0, authMiddleware_1.roleGuard)(['customer']), orderController_1.updatePaymentMethod);
router.put('/:id/status', authMiddleware_1.auth, (0, authMiddleware_1.roleGuard)(['driver', 'admin']), orderController_1.updateOrderStatus);
router.put('/:orderId/cancel', authMiddleware_1.auth, orderController_1.cancelOrder);
router.put('/:id/rate', authMiddleware_1.auth, (0, authMiddleware_1.roleGuard)(['customer', 'admin']), orderController_1.rateOrder);
router.post('/:id/message', authMiddleware_1.auth, orderController_1.sendOrderMessage);
exports.default = router;
//# sourceMappingURL=orderRoutes.js.map