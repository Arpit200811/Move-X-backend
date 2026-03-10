"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const paymentController_1 = require("../controllers/paymentController");
const authMiddleware_1 = require("../config/authMiddleware");
const router = express_1.default.Router();
router.get('/refunds', authMiddleware_1.auth, (0, authMiddleware_1.roleGuard)(['admin']), paymentController_1.getRefunds);
router.post('/refund', authMiddleware_1.auth, (0, authMiddleware_1.roleGuard)(['admin']), paymentController_1.processRefund);
router.post('/create-intent', authMiddleware_1.auth, paymentController_1.createPaymentIntent);
router.post('/request-payout', authMiddleware_1.auth, paymentController_1.requestPayout);
router.post('/webhook', express_1.default.raw({ type: 'application/json' }), paymentController_1.stripeWebhook);
exports.default = router;
//# sourceMappingURL=paymentRoutes.js.map