"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const financialController_1 = require("../controllers/financialController");
const authMiddleware_1 = require("../config/authMiddleware");
const router = express_1.default.Router();
router.get('/transactions', authMiddleware_1.auth, (0, authMiddleware_1.roleGuard)(['driver', 'customer', 'admin']), financialController_1.getTransactions);
router.post('/payout-request', authMiddleware_1.auth, (0, authMiddleware_1.roleGuard)(['driver', 'admin', 'partner']), financialController_1.requestPayout);
router.post('/top-up', authMiddleware_1.auth, financialController_1.topUpWallet);
exports.default = router;
//# sourceMappingURL=walletRoutes.js.map