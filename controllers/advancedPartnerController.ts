import { Response } from 'express';
import { AppDataSource } from '../data-source';
import { Partner } from '../models/Partner';
import { Product } from '../models/Product';
import { Order } from '../models/Order';
import { User } from '../models/User';
import { AuthenticatedRequest } from '../config/authMiddleware';
import bcrypt from 'bcryptjs';

// ─── Helper: get partner by logged-in user ───────────────────────────────────
const getPartnerByUser = async (userId: string) => {
    const repo = AppDataSource.getRepository(Partner);
    return repo.findOne({ where: { owner: { _id: userId } }, relations: ['owner'] });
};

// ══════════════════════════════════════════════════════════════════
// 1. ORDER PREP TIMER — Set custom prep time per order
// ══════════════════════════════════════════════════════════════════
export const setOrderPrepTime = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const orderRepo = AppDataSource.getRepository(Order);
        const { orderId } = req.params;
        const { prepMinutes } = req.body;
        const order = await orderRepo.findOne({ where: { _id: String(orderId) } });
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
        (order as any).prepTime = parseInt(prepMinutes);
        (order as any).prepStartedAt = new Date();
        (order as any).prepDeadline = new Date(Date.now() + parseInt(prepMinutes) * 60 * 1000);
        await orderRepo.save(order);
        res.json({ success: true, order, prepDeadline: (order as any).prepDeadline });
    } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// ══════════════════════════════════════════════════════════════════
// 2. MENU SCHEDULING — Set days/hours when item is available
// ══════════════════════════════════════════════════════════════════
export const updateMenuSchedule = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const productRepo = AppDataSource.getRepository(Product);
        const { productId } = req.params;
        const { scheduledDays, availableFrom, availableTill } = req.body;
        const product = await productRepo.findOne({ where: { _id: String(productId) } });
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
        (product as any).scheduledDays = scheduledDays;        // e.g. ['Mon','Tue','Sat']
        (product as any).availableFrom = availableFrom;        // e.g. "11:00"
        (product as any).availableTill = availableTill;        // e.g. "23:00"
        await productRepo.save(product);
        res.json({ success: true, product });
    } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// ══════════════════════════════════════════════════════════════════
// 3. INVENTORY / STOCK — Update stock quantity + low stock alerts
// ══════════════════════════════════════════════════════════════════
export const updateStock = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const productRepo = AppDataSource.getRepository(Product);
        const { productId } = req.params;
        const { stockQuantity, lowStockThreshold, expiryDate, batchNumber, hsnCode, isScheduleH } = req.body;
        const product = await productRepo.findOne({ where: { _id: String(productId) } });
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
        if (stockQuantity !== undefined) (product as any).stockQuantity = parseInt(stockQuantity);
        if (lowStockThreshold !== undefined) (product as any).lowStockThreshold = parseInt(lowStockThreshold);
        if (expiryDate !== undefined) (product as any).expiryDate = expiryDate;
        if (batchNumber !== undefined) (product as any).batchNumber = batchNumber;
        if (hsnCode !== undefined) (product as any).hsnCode = hsnCode;
        if (isScheduleH !== undefined) (product as any).isScheduleH = isScheduleH;
        await productRepo.save(product);
        const isLowStock = (product as any).stockQuantity <= ((product as any).lowStockThreshold || 5);
        res.json({ success: true, product, isLowStock });
    } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

export const getLowStockAlerts = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const productRepo = AppDataSource.getRepository(Product);
        const partner = await getPartnerByUser(req.user!.id);
        if (!partner) return res.status(404).json({ success: false, message: 'Partner not found' });
        const products = await productRepo.find({ where: { vendor: { _id: partner._id } } });
        const alerts = products.filter((p: any) => 
            p.stockQuantity !== undefined && p.stockQuantity <= (p.lowStockThreshold || 5)
        );
        res.json({ success: true, alerts, count: alerts.length });
    } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// ══════════════════════════════════════════════════════════════════
// 4. SURGE PRICING — Set hourly multiplier per day of week
// ══════════════════════════════════════════════════════════════════
export const updateSurgePricing = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const partnerRepo = AppDataSource.getRepository(Partner);
        const partner = await getPartnerByUser(req.user!.id);
        if (!partner) return res.status(404).json({ success: false, message: 'Partner not found' });
        const { surgeRules } = req.body;
        // surgeRules: [{ day: 'Fri', fromHour: 19, toHour: 22, multiplier: 1.2 }]
        (partner as any).surgeRules = surgeRules;
        await partnerRepo.save(partner);
        res.json({ success: true, partner });
    } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// ══════════════════════════════════════════════════════════════════
// 5. GST INVOICE GENERATION
// ══════════════════════════════════════════════════════════════════
export const generateGSTInvoice = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const orderRepo = AppDataSource.getRepository(Order);
        const { orderId } = req.params;
        const partner = await getPartnerByUser(req.user!.id);
        if (!partner) return res.status(404).json({ success: false, message: 'Partner not found' });
        const order = await orderRepo.findOne({ where: { _id: String(orderId) }, relations: ['customerId'] });
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

        const subtotal = (order as any).total || order.price || 0;
        const gstRate = (partner as any).gstRate || 5;   // Default 5% CGST+SGST
        const cgst = Number(((subtotal * gstRate) / 200).toFixed(2));
        const sgst = Number(((subtotal * gstRate) / 200).toFixed(2));
        const grandTotal = Number((subtotal + cgst + sgst).toFixed(2));
        const invoiceNo = `INV-${Date.now().toString(36).toUpperCase()}`;

        const invoice = {
            invoiceNo,
            date: new Date().toISOString(),
            seller: {
                name: partner.name,
                gstIn: (partner as any).gstNumber || 'PENDING',
                address: partner.address || 'N/A',
            },
            buyer: {
                name: (order as any).customerName || (order as any).customerId?.name || 'Customer',
            },
            items: (order as any).items || [],
            subtotal,
            cgst,
            sgst,
            grandTotal,
            gstRate
        };
        res.json({ success: true, invoice });
    } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

export const updateGSTSettings = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const partnerRepo = AppDataSource.getRepository(Partner);
        const partner = await getPartnerByUser(req.user!.id);
        if (!partner) return res.status(404).json({ success: false, message: 'Partner not found' });
        const { gstNumber, gstRate, businessName, businessAddress } = req.body;
        if (gstNumber !== undefined) (partner as any).gstNumber = gstNumber;
        if (gstRate !== undefined) (partner as any).gstRate = parseFloat(gstRate);
        if (businessName !== undefined) partner.name = businessName;
        if (businessAddress !== undefined) partner.address = businessAddress;
        await partnerRepo.save(partner);
        res.json({ success: true, partner });
    } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// ══════════════════════════════════════════════════════════════════
// 6. STAFF ACCOUNT MANAGEMENT — Sub-logins for vendors
// ══════════════════════════════════════════════════════════════════
export const getStaffAccounts = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const partner = await getPartnerByUser(req.user!.id);
        if (!partner) return res.status(404).json({ success: false, message: 'Partner not found' });
        // Return staff linked to this partner
        const userRepo = AppDataSource.getRepository(User);
        const staff = await userRepo.find({ where: { role: 'partner_staff', staffPartnerId: partner._id } as any });
        res.json({ success: true, staff });
    } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

export const addStaffAccount = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const partner = await getPartnerByUser(req.user!.id);
        if (!partner) return res.status(404).json({ success: false, message: 'Partner not found' });
        const { name, phone, role: staffRole, password } = req.body;
        const userRepo = AppDataSource.getRepository(User);
        const exists = await userRepo.findOne({ where: { phone } });
        if (exists) return res.status(400).json({ success: false, message: 'Phone already registered' });
        const passwordHash = await bcrypt.hash(password || 'staff123', 10);
        const staff = userRepo.create({
            name, phone, role: 'partner_staff', passwordHash,
            status: 'active', isOnline: false,
            staffPartnerId: partner._id
        } as any);
        await userRepo.save(staff);
        res.status(201).json({ success: true, staff: { ...staff, passwordHash: undefined } });
    } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

export const removeStaffAccount = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userRepo = AppDataSource.getRepository(User);
        const staff = await userRepo.findOne({ where: { _id: String(req.params.staffId) } });
        if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });
        await userRepo.remove(staff);
        res.json({ success: true, message: 'Staff account removed' });
    } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// ══════════════════════════════════════════════════════════════════
// 7. CANCELLATION REASON ANALYTICS
// ══════════════════════════════════════════════════════════════════
export const getCancellationAnalytics = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const orderRepo = AppDataSource.getRepository(Order);
        const partner = await getPartnerByUser(req.user!.id);
        if (!partner) return res.status(404).json({ success: false, message: 'Partner not found' });
        const cancelled = await orderRepo.find({
            where: { partnerId: { _id: partner._id } as any, status: 'CANCELLED' }
        });
        const reasonCounts: Record<string, number> = {};
        for (const o of cancelled) {
            const reason = (o as any).cancellationReason || 'No reason provided';
            reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
        }
        const breakdown = Object.entries(reasonCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([reason, count]) => ({ reason, count, pct: Number(((count / cancelled.length) * 100).toFixed(1)) }));
        res.json({ success: true, total: cancelled.length, breakdown });
    } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// ══════════════════════════════════════════════════════════════════
// 8. BOOST / SPONSORED LISTING
// ══════════════════════════════════════════════════════════════════
export const getBoostStatus = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const partner = await getPartnerByUser(req.user!.id);
        if (!partner) return res.status(404).json({ success: false, message: 'Partner not found' });
        const now = new Date();
        const boostExpiry = (partner as any).boostExpiresAt ? new Date((partner as any).boostExpiresAt) : null;
        const isActive = boostExpiry ? boostExpiry > now : false;
        res.json({ success: true, isActive, expiresAt: boostExpiry, boostTier: (partner as any).boostTier || null });
    } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

export const activateBoost = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const partnerRepo = AppDataSource.getRepository(Partner);
        const partner = await getPartnerByUser(req.user!.id);
        if (!partner) return res.status(404).json({ success: false, message: 'Partner not found' });
        const { tier, days } = req.body;   // tier: 'basic'|'premium'|'elite', days: 7|14|30
        const tiers: Record<string, { multiplier: number; color: string }> = {
            basic:   { multiplier: 1.2, color: '#10b981' },
            premium: { multiplier: 1.5, color: '#6366f1' },
            elite:   { multiplier: 2.0, color: '#f59e0b' }
        };
        const selectedTier = tiers[tier] || tiers.basic;
        (partner as any).boostTier = tier;
        (partner as any).boostMultiplier = selectedTier.multiplier;
        (partner as any).boostExpiresAt = new Date(Date.now() + (days || 7) * 24 * 60 * 60 * 1000);
        await partnerRepo.save(partner);
        res.json({ success: true, partner, message: `Boost activated! Your store will rank ${selectedTier.multiplier}x higher for ${days} days.` });
    } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// ══════════════════════════════════════════════════════════════════
// 9. REFUND/RETURN MANAGEMENT
// ══════════════════════════════════════════════════════════════════
export const getRefundRequests = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const orderRepo = AppDataSource.getRepository(Order);
        const partner = await getPartnerByUser(req.user!.id);
        if (!partner) return res.status(404).json({ success: false, message: 'Partner not found' });
        const orders = await orderRepo.find({ where: { partnerId: { _id: partner._id } as any } });
        const refunds = orders.filter((o: any) => o.refundStatus && o.refundStatus !== 'NONE');
        res.json({ success: true, refunds });
    } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

export const respondToRefund = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const orderRepo = AppDataSource.getRepository(Order);
        const { orderId } = req.params;
        const { action, reason } = req.body;  // action: 'APPROVE' | 'REJECT'
        const order = await orderRepo.findOne({ where: { _id: String(orderId) } });
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
        (order as any).refundStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
        (order as any).refundResolutionNote = reason;
        (order as any).refundRespondedAt = new Date();
        await orderRepo.save(order);
        res.json({ success: true, order });
    } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};
