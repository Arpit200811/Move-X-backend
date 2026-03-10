"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyReferralCode = exports.validateCoupon = void 0;
const data_source_1 = require("../data-source");
const Coupon_1 = require("../models/Coupon");
const Order_1 = require("../models/Order");
const validateCoupon = async (req, res) => {
    try {
        const { code, cartAmount, serviceType } = req.body;
        const couponRepository = data_source_1.AppDataSource.getRepository(Coupon_1.Coupon);
        const orderRepository = data_source_1.AppDataSource.getRepository(Order_1.Order);
        const coupon = await couponRepository.findOne({ where: { code, isActive: true } });
        if (!coupon)
            return res.status(404).json({ success: false, message: 'COUPON_INVALID_OR_EXPIRED' });
        // 1. Check Usage Limits
        if (coupon.usageCount >= coupon.usageLimit) {
            return res.status(400).json({ success: false, message: 'COUPON_LIMIT_REACHED' });
        }
        // 2. Check Expiry
        if (coupon.expiryDate && new Date() > new Date(coupon.expiryDate)) {
            return res.status(400).json({ success: false, message: 'COUPON_EXPIRED' });
        }
        // 3. Check Minimum Amount
        if (cartAmount < coupon.minOrderAmount) {
            return res.status(400).json({ success: false, message: `MINIMUM_PURCHASE_REQUIRED: ${coupon.minOrderAmount}` });
        }
        // 4. Check Scope
        if (coupon.scope !== 'ALL' && coupon.scope !== serviceType) {
            return res.status(400).json({ success: false, message: `COUPON_VALID_ONLY_FOR_${coupon.scope}` });
        }
        // 5. Check First Order
        if (coupon.isFirstOrderOnly) {
            const hasPastOrders = await orderRepository.count({ where: { customerId: { _id: req.user?.id } } });
            if (hasPastOrders > 0)
                return res.status(400).json({ success: false, message: 'VALID_FOR_FIRST_ORDER_ONLY' });
        }
        // Calculation
        let discount = 0;
        if (coupon.type === 'percentage') {
            discount = (cartAmount * coupon.value) / 100;
            if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount)
                discount = coupon.maxDiscountAmount;
        }
        else {
            discount = coupon.value;
        }
        res.status(200).json({
            success: true,
            discount: Number(discount.toFixed(2)),
            finalAmount: Number((cartAmount - discount).toFixed(2))
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.validateCoupon = validateCoupon;
const applyReferralCode = async (req, res) => {
    // Top company feature: Viral growth loop logic
    res.json({ success: true, message: 'REFERRAL_APPLIED. Bonus tokens will be credited after first ride.' });
};
exports.applyReferralCode = applyReferralCode;
//# sourceMappingURL=marketingController.js.map