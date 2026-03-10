import { Response } from 'express';
import { AppDataSource } from '../data-source';
import { Coupon } from '../models/Coupon';
import { Order } from '../models/Order';
import { Partner } from '../models/Partner';
import { Product } from '../models/Product';
import { AuthenticatedRequest } from '../config/authMiddleware';

export const validateCoupon = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { code, cartAmount, serviceType } = req.body;
        const couponRepository = AppDataSource.getRepository(Coupon);
        const orderRepository = AppDataSource.getRepository(Order);

        const coupon = await couponRepository.findOne({ where: { code, isActive: true }, relations: ['vendor'] });

        if (!coupon) return res.status(404).json({ success: false, message: 'COUPON_INVALID_OR_EXPIRED' });

        if (coupon.usageCount >= coupon.usageLimit)
            return res.status(400).json({ success: false, message: 'COUPON_LIMIT_REACHED' });

        if (coupon.expiryDate && new Date() > new Date(coupon.expiryDate))
            return res.status(400).json({ success: false, message: 'COUPON_EXPIRED' });

        if (cartAmount < coupon.minOrderAmount)
            return res.status(400).json({ success: false, message: `MINIMUM_PURCHASE_REQUIRED: ${coupon.minOrderAmount}` });

        if (coupon.scope !== 'ALL' && coupon.scope !== serviceType)
            return res.status(400).json({ success: false, message: `COUPON_VALID_ONLY_FOR_${coupon.scope}` });

        if (coupon.isFirstOrderOnly) {
            const hasPastOrders = await orderRepository.count({ where: { customerId: { _id: req.user?.id } as any } });
            if (hasPastOrders > 0) return res.status(400).json({ success: false, message: 'VALID_FOR_FIRST_ORDER_ONLY' });
        }

        let discount = 0;
        if (coupon.type === 'percentage') {
            discount = (cartAmount * coupon.value) / 100;
            if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) discount = coupon.maxDiscountAmount;
        } else {
            discount = coupon.value;
        }

        res.status(200).json({ 
            success: true, 
            discount: Number(discount.toFixed(2)),
            finalAmount: Number((cartAmount - discount).toFixed(2))
        });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
};

export const applyReferralCode = async (req: AuthenticatedRequest, res: Response) => {
    res.json({ success: true, message: 'REFERRAL_APPLIED. Bonus tokens will be credited after first ride.' });
};

// ─── Vendor Promotions (Zomato-style) ──────────────────────────────────────

export const getMyPromotions = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const partnerRepo = AppDataSource.getRepository(Partner);
        const couponRepo = AppDataSource.getRepository(Coupon);
        const partner = await partnerRepo.findOne({ where: { owner: { _id: req.user?.id } } });
        if (!partner) return res.status(404).json({ success: false, message: 'Partner not found' });
        const promos = await couponRepo.find({ where: { vendor: { _id: partner._id } }, order: { createdAt: 'DESC' } });
        res.json({ success: true, promotions: promos });
    } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

export const createPromotion = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const partnerRepo = AppDataSource.getRepository(Partner);
        const couponRepo = AppDataSource.getRepository(Coupon);
        const partner = await partnerRepo.findOne({ where: { owner: { _id: req.user?.id } } });
        if (!partner) return res.status(404).json({ success: false, message: 'Partner not found' });

        const { code, type, value, minOrderAmount, maxDiscountAmount, expiryDate, usageLimit, scope } = req.body;

        // Check if code already exists
        const existing = await couponRepo.findOne({ where: { code: code.toUpperCase() } });
        if (existing) return res.status(400).json({ success: false, message: 'Coupon code already exists. Use a unique code.' });

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
    } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

export const togglePromotion = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const couponRepo = AppDataSource.getRepository(Coupon);
        const coupon = await couponRepo.findOne({ where: { _id: (req.params.id as string) }, relations: ['vendor', 'vendor.owner'] });
        if (!coupon || coupon.vendor?.owner?._id !== req.user?.id)
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        coupon.isActive = !coupon.isActive;
        await couponRepo.save(coupon);
        res.json({ success: true, promotion: coupon });
    } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

export const deletePromotion = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const couponRepo = AppDataSource.getRepository(Coupon);
        const coupon = await couponRepo.findOne({ where: { _id: (req.params.id as string) }, relations: ['vendor', 'vendor.owner'] });
        if (!coupon || coupon.vendor?.owner?._id !== req.user?.id)
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        await couponRepo.remove(coupon);
        res.json({ success: true, message: 'Promotion deleted.' });
    } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// ─── Partner Analytics (Insights Hub) ─────────────────────────────────────

export const getPartnerAnalytics = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const partnerRepo = AppDataSource.getRepository(Partner);
        const orderRepo = AppDataSource.getRepository(Order);
        const productRepo = AppDataSource.getRepository(Product);

        const partner = await partnerRepo.findOne({ where: { owner: { _id: req.user?.id } } });
        if (!partner) return res.status(404).json({ success: false, message: 'Partner not found' });

        const allOrders = await orderRepo.find({
            where: { partnerId: { _id: partner._id } as any },
            relations: ['items']
        });

        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const today = new Date();

        // 30-day revenue graph
        const revenueData: any[] = [];
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
        const productSales: Record<string, { name: string; count: number; revenue: number }> = {};
        for (const order of allOrders.filter(o => o.status === 'DELIVERED')) {
            if (order.items && Array.isArray(order.items)) {
                for (const item of order.items as any[]) {
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
    } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// ─── Ratings & Dispute (Reviews Hub) ──────────────────────────────────────

export const getPartnerReviews = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const partnerRepo = AppDataSource.getRepository(Partner);
        const orderRepo = AppDataSource.getRepository(Order);
        const partner = await partnerRepo.findOne({ where: { owner: { _id: req.user?.id } } });
        if (!partner) return res.status(404).json({ success: false, message: 'Partner not found' });

        // Fetch orders that have ratings/reviews
        const reviewedOrders = await orderRepo.find({
            where: { partnerId: { _id: partner._id } as any },
            relations: ['customerId'],
            order: { createdAt: 'DESC' }
        });

        const reviews = reviewedOrders
            .filter((o: any) => o.partnerRating || o.partnerReview)
            .map((o: any) => ({
                orderId: o._id,
                rating: o.partnerRating || 0,
                review: o.partnerReview || '',
                customerName: o.customerId?.name || 'Anonymous',
                date: o.createdAt
            }));

        res.json({ success: true, reviews, partnerRating: partner.rating, ratingCount: partner.ratingCount });
    } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};
