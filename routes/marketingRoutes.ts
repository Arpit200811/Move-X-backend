import express from 'express';
import { validateCoupon, applyReferralCode, getMyPromotions, createPromotion, togglePromotion, deletePromotion, getPartnerAnalytics, getPartnerReviews } from '../controllers/marketingController';
import { auth, roleGuard } from '../config/authMiddleware';

const router = express.Router();

// Public / Customer routes
router.post('/validate-coupon', auth as any, validateCoupon);
router.post('/apply-referral', auth as any, applyReferralCode);

// Partner Promotions (Zomato-style)
router.get('/promotions', auth as any, roleGuard(['partner', 'admin']), getMyPromotions);
router.post('/promotions', auth as any, roleGuard(['partner', 'admin']), createPromotion);
router.patch('/promotions/:id/toggle', auth as any, roleGuard(['partner', 'admin']), togglePromotion);
router.delete('/promotions/:id', auth as any, roleGuard(['partner', 'admin']), deletePromotion);

// Partner Analytics / Insights
router.get('/partner-analytics', auth as any, roleGuard(['partner', 'admin']), getPartnerAnalytics);

// Partner Reviews & Ratings
router.get('/partner-reviews', auth as any, roleGuard(['partner', 'admin']), getPartnerReviews);

export default router;
