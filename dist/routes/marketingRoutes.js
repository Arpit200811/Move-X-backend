"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const marketingController_1 = require("../controllers/marketingController");
const authMiddleware_1 = require("../config/authMiddleware");
const router = express_1.default.Router();
// Public / Customer routes
router.post('/validate-coupon', authMiddleware_1.auth, marketingController_1.validateCoupon);
router.post('/apply-referral', authMiddleware_1.auth, marketingController_1.applyReferralCode);
// Partner Promotions (Zomato-style)
router.get('/promotions', authMiddleware_1.auth, (0, authMiddleware_1.roleGuard)(['partner', 'admin']), marketingController_1.getMyPromotions);
router.post('/promotions', authMiddleware_1.auth, (0, authMiddleware_1.roleGuard)(['partner', 'admin']), marketingController_1.createPromotion);
router.patch('/promotions/:id/toggle', authMiddleware_1.auth, (0, authMiddleware_1.roleGuard)(['partner', 'admin']), marketingController_1.togglePromotion);
router.delete('/promotions/:id', authMiddleware_1.auth, (0, authMiddleware_1.roleGuard)(['partner', 'admin']), marketingController_1.deletePromotion);
// Partner Analytics / Insights
router.get('/partner-analytics', authMiddleware_1.auth, (0, authMiddleware_1.roleGuard)(['partner', 'admin']), marketingController_1.getPartnerAnalytics);
// Partner Reviews & Ratings
router.get('/partner-reviews', authMiddleware_1.auth, (0, authMiddleware_1.roleGuard)(['partner', 'admin']), marketingController_1.getPartnerReviews);
exports.default = router;
//# sourceMappingURL=marketingRoutes.js.map