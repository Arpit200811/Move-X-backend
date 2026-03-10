"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const marketingController_1 = require("../controllers/marketingController");
const authMiddleware_1 = require("../config/authMiddleware");
const router = express_1.default.Router();
router.post('/validate-coupon', authMiddleware_1.auth, marketingController_1.validateCoupon);
router.post('/apply-referral', authMiddleware_1.auth, marketingController_1.applyReferralCode);
exports.default = router;
//# sourceMappingURL=marketingRoutes.js.map