"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPartnerReviews = exports.getPartnerAnalytics = exports.deletePromotion = exports.togglePromotion = exports.createPromotion = exports.getMyPromotions = exports.applyReferralCode = exports.validateCoupon = void 0;
const data_source_1 = require("../data-source");
const Coupon_1 = require("../models/Coupon");
const Order_1 = require("../models/Order");
const Partner_1 = require("../models/Partner");
const Product_1 = require("../models/Product");
const validateCoupon = async (req, res) => {
    try {
        const { code, cartAmount, serviceType } = req.body;
        const couponRepository = data_source_1.AppDataSource.getRepository(Coupon_1.Coupon);
        const orderRepository = data_source_1.AppDataSource.getRepository(Order_1.Order);
        const coupon = await couponRepository.findOne({ where: { code, isActive: true }, relations: ['vendor'] });
        if (!coupon)
            return res.status(404).json({ success: false, message: 'COUPON_INVALID_OR_EXPIRED' });
        if (coupon.usageCount >= coupon.usageLimit)
            return res.status(400).json({ success: false, message: 'COUPON_LIMIT_REACHED' });
        if (coupon.expiryDate && new Date() > new Date(coupon.expiryDate))
            return res.status(400).json({ success: false, message: 'COUPON_EXPIRED' });
        if (cartAmount < coupon.minOrderAmount)
            return res.status(400).json({ success: false, message: `MINIMUM_PURCHASE_REQUIRED: ${coupon.minOrderAmount}` });
        if (coupon.scope !== 'ALL' && coupon.scope !== serviceType)
            return res.status(400).json({ success: false, message: `COUPON_VALID_ONLY_FOR_${coupon.scope}` });
        if (coupon.isFirstOrderOnly) {
            const hasPastOrders = await orderRepository.count({ where: { customerId: { _id: req.user?.id } } });
            if (hasPastOrders > 0)
                return res.status(400).json({ success: false, message: 'VALID_FOR_FIRST_ORDER_ONLY' });
        }
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
    res.json({ success: true, message: 'REFERRAL_APPLIED. Bonus tokens will be credited after first ride.' });
};
exports.applyReferralCode = applyReferralCode;
// ─── Vendor Promotions (Zomato-style) ──────────────────────────────────────
const getMyPromotions = async (req, res) => {
    try {
        const partnerRepo = data_source_1.AppDataSource.getRepository(Partner_1.Partner);
        const couponRepo = data_source_1.AppDataSource.getRepository(Coupon_1.Coupon);
        const partner = await partnerRepo.findOne({ where: { owner: { _id: req.user?.id } } });
        if (!partner)
            return res.status(404).json({ success: false, message: 'Partner not found' });
        const promos = await couponRepo.find({ where: { vendor: { _id: partner._id } }, order: { createdAt: 'DESC' } });
        res.json({ success: true, promotions: promos });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.getMyPromotions = getMyPromotions;
const createPromotion = async (req, res) => {
    try {
        const partnerRepo = data_source_1.AppDataSource.getRepository(Partner_1.Partner);
        const couponRepo = data_source_1.AppDataSource.getRepository(Coupon_1.Coupon);
        const partner = await partnerRepo.findOne({ where: { owner: { _id: req.user?.id } } });
        if (!partner)
            return res.status(404).json({ success: false, message: 'Partner not found' });
        const { code, type, value, minOrderAmount, maxDiscountAmount, expiryDate, usageLimit, scope } = req.body;
        // Check if code already exists
        const existing = await couponRepo.findOne({ where: { code: code.toUpperCase() } });
        if (existing)
            return res.status(400).json({ success: false, message: 'Coupon code already exists. Use a unique code.' });
        const coupon = couponRepo.create({
            code: code.toUpperCase(),
            type: type || 'percentage',
            value: parseFloat(value),
            minOrderAmount: parseFloat(minOrderAmount) || 0,
            maxDiscountAmount: maxDiscountAmount ? parseFloat(maxDiscountAmount) : undefined,
            expiryDate: expiryDate ? new Date(expiryDate) : undefined,
            usageLimit: parseInt(usageLimit) || 100,
            scope: scope || 'ALL',
            isActive: true,
            vendor: partner
        });
        await couponRepo.save(coupon);
        res.status(201).json({ success: true, promotion: coupon });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.createPromotion = createPromotion;
const togglePromotion = async (req, res) => {
    try {
        const couponRepo = data_source_1.AppDataSource.getRepository(Coupon_1.Coupon);
        const coupon = await couponRepo.findOne({ where: { _id: req.params.id }, relations: ['vendor', 'vendor.owner'] });
        if (!coupon || coupon.vendor?.owner?._id !== req.user?.id)
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        coupon.isActive = !coupon.isActive;
        await couponRepo.save(coupon);
        res.json({ success: true, promotion: coupon });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.togglePromotion = togglePromotion;
const deletePromotion = async (req, res) => {
    try {
        const couponRepo = data_source_1.AppDataSource.getRepository(Coupon_1.Coupon);
        const coupon = await couponRepo.findOne({ where: { _id: req.params.id }, relations: ['vendor', 'vendor.owner'] });
        if (!coupon || coupon.vendor?.owner?._id !== req.user?.id)
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        await couponRepo.remove(coupon);
        res.json({ success: true, message: 'Promotion deleted.' });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.deletePromotion = deletePromotion;
// ─── Partner Analytics (Insights Hub) ─────────────────────────────────────
const getPartnerAnalytics = async (req, res) => {
    try {
        const partnerRepo = data_source_1.AppDataSource.getRepository(Partner_1.Partner);
        const orderRepo = data_source_1.AppDataSource.getRepository(Order_1.Order);
        const productRepo = data_source_1.AppDataSource.getRepository(Product_1.Product);
        const partner = await partnerRepo.findOne({ where: { owner: { _id: req.user?.id } } });
        if (!partner)
            return res.status(404).json({ success: false, message: 'Partner not found' });
        const allOrders = await orderRepo.find({
            where: { partnerId: { _id: partner._id } },
            relations: ['items']
        });
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const today = new Date();
        // 30-day revenue graph
        const revenueData = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const dayOrders = allOrders.filter(o => {
                const co = new Date(o.createdAt);
                return co.toDateString() === d.toDateString() && o.status === 'DELIVERED';
            });
            revenueData.push({
                date: `${d.getDate()}/${d.getMonth() + 1}`,
                revenue: dayOrders.reduce((s, o) => s + (o.total || 0), 0),
                orders: dayOrders.length
            });
        }
        // Hourly heatmap (orders per hour)
        const hourlyHeatmap = Array.from({ length: 24 }, (_, h) => ({
            hour: h,
            label: `${h}:00`,
            count: allOrders.filter(o => new Date(o.createdAt).getHours() === h).length
        }));
        // Top selling products
        const productSales = {};
        for (const order of allOrders.filter(o => o.status === 'DELIVERED')) {
            if (order.items && Array.isArray(order.items)) {
                for (const item of order.items) {
                    if (!productSales[item.productId || item.name]) {
                        productSales[item.productId || item.name] = { name: item.name, count: 0, revenue: 0 };
                    }
                    productSales[item.productId || item.name].count += item.quantity || 1;
                    productSales[item.productId || item.name].revenue += (item.price || 0) * (item.quantity || 1);
                }
            }
        }
        const topProducts = Object.values(productSales).sort((a, b) => b.count - a.count).slice(0, 5);
        const totalRevenue = allOrders.filter(o => o.status === 'DELIVERED').reduce((s, o) => s + (o.total || 0), 0);
        const totalOrders = allOrders.length;
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        const cancelledOrders = allOrders.filter(o => o.status === 'CANCELLED').length;
        res.json({
            success: true,
            analytics: {
                summary: { totalRevenue, totalOrders, avgOrderValue: Number(avgOrderValue.toFixed(2)), cancelledOrders, cancelRate: totalOrders > 0 ? ((cancelledOrders / totalOrders) * 100).toFixed(1) : '0' },
                revenueData,
                hourlyHeatmap,
                topProducts
            }
        });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.getPartnerAnalytics = getPartnerAnalytics;
// ─── Ratings & Dispute (Reviews Hub) ──────────────────────────────────────
const getPartnerReviews = async (req, res) => {
    try {
        const partnerRepo = data_source_1.AppDataSource.getRepository(Partner_1.Partner);
        const orderRepo = data_source_1.AppDataSource.getRepository(Order_1.Order);
        const partner = await partnerRepo.findOne({ where: { owner: { _id: req.user?.id } } });
        if (!partner)
            return res.status(404).json({ success: false, message: 'Partner not found' });
        // Fetch orders that have ratings/reviews
        const reviewedOrders = await orderRepo.find({
            where: { partnerId: { _id: partner._id } },
            relations: ['customerId'],
            order: { createdAt: 'DESC' }
        });
        const reviews = reviewedOrders
            .filter((o) => o.partnerRating || o.partnerReview)
            .map((o) => ({
            orderId: o._id,
            rating: o.partnerRating || 0,
            review: o.partnerReview || '',
            customerName: o.customerId?.name || 'Anonymous',
            date: o.createdAt
        }));
        res.json({ success: true, reviews, partnerRating: partner.rating, ratingCount: partner.ratingCount });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.getPartnerReviews = getPartnerReviews;
//# sourceMappingURL=marketingController.js.map