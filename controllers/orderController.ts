import { Response } from 'express';
import { AppDataSource } from '../data-source';
import { Order } from '../models/Order';
import { User } from '../models/User';
import { Partner } from '../models/Partner';
import { Transaction } from '../models/Transaction';
import { AuthenticatedRequest } from '../config/authMiddleware';
import { sendNotification } from '../services/notificationService';
import { DispatcherService } from '../services/dispatcherService';
import { Between, In } from 'typeorm';
import { AuditService } from '../services/auditService';
import { calculateSurgeMultiplier } from '../services/surgeService';
import { GeoFencingService } from '../services/geoFencingService';
import { TaxConfig } from '../models/TaxConfig';

// Haversine Distance Helper
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

export const createOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderRepository = AppDataSource.getRepository(Order);
    const { 
        pickup, 
        destination, 
        serviceClass, 
        packageType, 
        paymentMethod, 
        promoCode, 
        partnerId, 
        items, 
        itemsTotal, 
        deliveryFee: clientDeliveryFee, 
        taxData,
        pickupCoords,
        destCoords
    } = req.body;

    // Universal Coord Extraction (handles all payload shapes from different screens)
    const pLat = Number(pickup?.lat ?? pickup?.coords?.lat ?? pickupCoords?.lat ?? 28.6139);
    const pLng = Number(pickup?.lng ?? pickup?.coords?.lng ?? pickupCoords?.lng ?? 77.2090);
    const dLat = Number(destination?.lat ?? destination?.coords?.lat ?? destCoords?.lat ?? 28.7041);
    const dLng = Number(destination?.lng ?? destination?.coords?.lng ?? destCoords?.lng ?? 77.1025);

    // 1. SERVER-SIDE PRICE & SERVICE AREA VALIDATION (Anti-Hack)
    // Only validate geo-fence if we have real coords
    const hasValidCoords = !isNaN(pLat) && !isNaN(pLng) && !isNaN(dLat) && !isNaN(dLng) && pLat !== 0 && dLat !== 0;
    if (hasValidCoords) {
        await GeoFencingService.validateServiceArea({ lat: pLat, lng: pLng }, { lat: dLat, lng: dLng });
    }
    
    const distance = calculateDistance(pLat, pLng, dLat, dLng) || 0;
    const taxRepo = AppDataSource.getRepository(TaxConfig);
    const dbConfig = await taxRepo.findOne({ where: { isActive: true } });
    // Safe fallback — avoids empty entity crashes when TaxConfig is not seeded
    const config = dbConfig || {
        baseFare: 30,
        perKmRate: 12,
        taxRate: 0,
        taxName: 'GST',
        currency: 'INR',
        currencySymbol: '₹',
        serviceClassSurcharge: {}
    };
    const { multiplier } = await calculateSurgeMultiplier(pLat, pLng);

    const calculatedBase = (config.baseFare || 30) + (distance * (config.perKmRate || 12));
    const finalDeliveryFee = Number((calculatedBase * multiplier).toFixed(2)) || 0;
    const calculatedTax = Number((finalDeliveryFee * (config.taxRate || 0) / 100).toFixed(2)) || 0;
    let verifiedTotal = (itemsTotal || 0) + finalDeliveryFee + calculatedTax;

    if (isNaN(verifiedTotal)) verifiedTotal = 0;

    // 2. WALLET PRE-AUTHENTICATION & DEBIT
    const userRepository = AppDataSource.getRepository(User);
    const customer = await userRepository.findOne({ where: { _id: req.user?.id } });
    if (!customer) throw new Error('CUSTOMER_NOT_FOUND');

    if (paymentMethod === 'Wallet') {
        if (customer.walletBalance < verifiedTotal) {
            return res.status(400).json({ success: false, message: 'INSUFFICIENT_FUNDS_IN_WALLET' });
        }
        // Deduct immediately (Transaction integrity)
        await userRepository.decrement({ _id: customer._id }, 'walletBalance', verifiedTotal);
        AuditService.log('wallet', customer._id, 'ORDER_PAYMENT', null, { amount: verifiedTotal, orderId: `TEMP-${Date.now()}` });
    }

    const timestamp = Date.now().toString().slice(-4);
    const orderId = `MVX-${timestamp}${Math.floor(1000 + Math.random() * 9000)}`;
    const paymentStatus = paymentMethod === 'Wallet' ? 'paid' : 'pending';
    const otp = Math.floor(1000 + Math.random() * 9000).toString(); // Secure Mission PIN

    const order = orderRepository.create({
      ...req.body,
      orderId,
      otp,
      customerId: { _id: req.user?.id } as any,
      status: 'PENDING',
      paymentStatus,
      pickup,
      destination,
      pickupCoords: { lat: pLat, lng: pLng },
      destCoords: { lat: dLat, lng: dLng },
      serviceClass: (serviceClass as string) || 'Economy',
      price: finalDeliveryFee,
      deliveryFee: finalDeliveryFee,
      itemsTotal,
      tax: calculatedTax,
      currency: config.currency || 'INR',
      total: verifiedTotal,
      promoCode,
      discount: 0,
      partnerId: (partnerId && partnerId.length > 30) ? ({ _id: partnerId } as any) : undefined,
      timeline: [{ status: 'PENDING', timestamp: new Date() }]
    }) as unknown as Order;

    await orderRepository.save(order);
    
    // 3. Hydrate with base relations first
    const hydratedOrder = await orderRepository.findOne({ 
        where: { _id: order._id } as any, 
        relations: ['partnerId', 'customerId', 'driverId'] 
    });
    
    if (!hydratedOrder) {
        return res.status(500).json({ success: false, message: 'CRITICAL_HYDRATION_FAILURE' });
    }

    // Explicitly handle nested partner owner if needed
    let partner: any = null;
    if (hydratedOrder.partnerId) {
        const partnerRepository = AppDataSource.getRepository(Partner);
        partner = await partnerRepository.findOne({ 
            where: { _id: (hydratedOrder.partnerId as any)._id }, 
            relations: ['owner'] 
        });
    }

    AuditService.log('order', hydratedOrder._id, 'ORDER_CREATED', null, hydratedOrder, { 
        actorId: req.user?.id, 
        actorRole: req.user?.role,
        ipAddress: req.ip
    });

    if (req.io) {
      req.io.emit('new_order', hydratedOrder);
    }

    if (partner) {
      if (partner.isAcceptingOrders && partner.autoAccept) {
        hydratedOrder.status = 'PARTNER_ACCEPTED';
        if (!hydratedOrder.timeline) hydratedOrder.timeline = [];
        hydratedOrder.timeline.push({ status: 'PARTNER_ACCEPTED', timestamp: new Date() });
        await orderRepository.save(hydratedOrder);
        
        sendNotification(hydratedOrder.customerId?._id as string, 'MERCHANT_ACCEPTED', { merchantName: partner.name }, { orderId: hydratedOrder._id });
        await DispatcherService.findBestDriver(hydratedOrder, req.io);
      } else {
        if (partner && partner.owner) {
          sendNotification(partner.owner._id, 'NEW_INCOMING_MISSION', { itemName: hydratedOrder.packageType });
        }
      }
    } else {
      await DispatcherService.findBestDriver(hydratedOrder, req.io);
    }

    res.status(201).json({ success: true, order });
  } catch (error: any) {
    console.error('❌ [ORDER CREATION CRASH]:', error.message, error.stack);
    res.status(500).json({ 
        success: false, 
        message: 'Neural interface rejection: ' + error.message,
        trace: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

export const getPriceQuote = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { pickup, destination, serviceClass = 'Economy' } = req.body;
        if (!pickup || !destination) return res.status(400).json({ success: false, message: 'Pickup and destination required' });

        const pLat = Number(pickup.lat);
        const pLng = Number(pickup.lng);
        const dLat = Number(destination.lat);
        const dLng = Number(destination.lng);

        // 1. Geo-fencing Validation
        await GeoFencingService.validateServiceArea({ lat: pLat, lng: pLng }, { lat: dLat, lng: dLng });

        // 2. Distance Calculation
        const distance = calculateDistance(pLat, pLng, dLat, dLng);
        
        // 3. Tax / Rate Rules
        const taxRepo = AppDataSource.getRepository(TaxConfig);
        const dbConfig = await taxRepo.findOne({ where: { isActive: true } });
        const config = dbConfig || {
            baseFare: 30,
            perKmRate: 12,
            taxRate: 0,
            taxName: 'GST',
            currency: 'INR',
            currencySymbol: '₹',
            serviceClassSurcharge: {}
        };

        // 4. Dynamic Surge
        const { multiplier, reasons } = await calculateSurgeMultiplier(pLat, pLng);

        // Core Math
        let base = config.baseFare || 30;
        let distCharge = distance * (config.perKmRate || 12);
        
        // Service Class Surcharge
        const surchargeConfig = config.serviceClassSurcharge || {};
        const surchargePct = surchargeConfig[serviceClass] || 0;
        let subtotal = (base + distCharge) * (1 + surchargePct / 100);

        // Apply Surge
        const finalPriceBeforeTax = subtotal * multiplier;
        const taxAmount = (finalPriceBeforeTax * (config.taxRate || 0)) / 100;
        const deliveryFee = Number(finalPriceBeforeTax.toFixed(2));
        const total = finalPriceBeforeTax + taxAmount;

        res.status(200).json({
            success: true,
            quote: {
                distance: distance.toFixed(2),
                baseFare: base.toFixed(2),
                distanceCharge: distCharge.toFixed(2),
                deliveryFee: deliveryFee.toFixed(2),
                surgeMultiplier: multiplier,
                surgeReasons: reasons,
                tax: taxAmount.toFixed(2),
                total: total.toFixed(2),
                currency: config.currency || 'INR',
                currencySymbol: config.currencySymbol || '₹',
                expiresIn: 300 // 5 minutes validity
            }
        });
    } catch (error: any) {
        let status = 500;
        if (error.message.includes('SERVICE_NOT_AVAILABLE')) status = 403;
        res.status(status).json({ success: false, message: error.message });
    }
};

export const getMyOrders = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const orderRepository = AppDataSource.getRepository(Order);
        const userId = req.user?.id;
        const role = req.user?.role;

        let whereClause: any = {};
        if (role === 'customer') whereClause = { customerId: { _id: userId } as any };
        else if (role === 'driver') whereClause = { driverId: { _id: userId } as any };
        else if (role === 'partner') whereClause = { partnerId: { owner: { _id: userId } } as any };

        const orders = await orderRepository.find({
            where: whereClause,
            relations: ['customerId', 'driverId', 'partnerId'],
            order: { createdAt: 'DESC' }
        });

        res.status(200).json({ success: true, orders });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const cancelOrder = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { orderId } = req.params;
        const orderRepository = AppDataSource.getRepository(Order);
        const userRepository = AppDataSource.getRepository(User);

        console.log('📡 [CANCEL_ATTEMPT]', { orderId, userId: req.user?.id, role: req.user?.role });

        const order = await orderRepository.findOne({ 
            where: { _id: orderId as string },
            relations: ['customerId', 'driverId']
        });
        
        if (!order) {
            console.log('❌ [CANCEL_FAILED] Order not found:', orderId);
            return res.status(404).json({ success: false, message: 'Order reference lost.' });
        }

        console.log('📦 [ORDER_DETAILS]', { status: order.status, customerId: order.customerId?._id });

        // 🔐 SECURITY CHECK: Only owner or admin can cancel
        if (order.customerId?._id !== req.user?.id && req.user?.role !== 'admin') {
            console.log('🚫 [CANCEL_DENIED] Unauthorized:', { owner: order.customerId?._id, requester: req.user?.id });
            return res.status(403).json({ success: false, message: 'Unauthorized abortion attempt.' });
        }

        // Allowed to cancel only if not already delivered/picked up
        const restricted = ['PICKED_UP', 'DELIVERED', 'CANCELLED'];
        if (restricted.includes(order.status)) {
            return res.status(400).json({ success: false, message: `Mission cannot be aborted while in state: ${order.status}` });
        }

        // 🟢 REFUND PROTOCOL
        if (order.paymentStatus === 'paid' && (order.paymentMethod === 'Wallet' || order.paymentMethod === 'Card') && order.customerId) {
            await userRepository.increment({ _id: order.customerId._id }, 'walletBalance', order.total || 0);
            await AuditService.log('wallet', order.customerId._id, 'ORDER_CANCEL_REFUND', null, { amount: order.total, orderId: order._id });
            console.log('💰 [REFUND_ISSUED]', { userId: order.customerId._id, amount: order.total });
        }

        // 🔓 DRIVER RELEASE
        if (order.driverId) {
            const dId = (order.driverId as any)._id;
            await userRepository.update(dId, { status: 'available' });
            await AuditService.log('user', dId, 'MISSION_CANCELLED_BY_USER', null, { orderId: order._id });
            sendNotification(dId, 'Mission Cancelled', 'The customer has aborted the mission.', { orderId: order._id });
            console.log('🔓 [DRIVER_RELEASED]', dId);
        }

        order.status = 'CANCELLED';
        if (!order.timeline) order.timeline = [];
        order.timeline.push({ 
            status: 'CANCELLED', 
            timestamp: new Date(), 
            reason: req.body?.reason || 'User cancelled',
            cancelledBy: req.user?.id
        });
        
        await orderRepository.save(order);
        if (req.io) {
            req.io.emit('order_updated', order);
            req.io.to(order._id).emit('order_cancelled', { reason: 'User cancelled' });
        }

        console.log('✅ [CANCEL_SUCCESS]', order.orderId);
        res.status(200).json({ success: true, message: 'Mission Aborted Successfully.' });
    } catch (error: any) {
        console.error('❌ [CANCEL_CRASH]:', error.message);
        res.status(500).json({ success: false, message: 'Neural link failure: ' + error.message });
    }
};

export const acceptMission = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { orderId } = req.params;
        const driverId = req.user?.id;
        const orderRepository = AppDataSource.getRepository(Order);
        const userRepository = AppDataSource.getRepository(User);

        const order = await orderRepository.findOne({ 
            where: { _id: orderId as string },
            relations: ['customerId', 'driverId']
        });

        if (!order) return res.status(404).json({ success: false, message: 'Mission reference lost.' });
        
        // CONSISTENCY CHECK: Must be ASSIGNED to this driver
        if (order.status !== 'ASSIGNED' || (order.driverId as any)?._id !== driverId) {
            return res.status(400).json({ success: false, message: 'Mission no longer available or assigned elsewhere.' });
        }

        order.status = 'ACCEPTED';
        if (!order.timeline) order.timeline = [];
        order.timeline.push({ status: 'ACCEPTED', timestamp: new Date() });
        
        await orderRepository.save(order);
        await userRepository.update(driverId as string, { status: 'busy' });

        sendNotification(order.customerId?._id as string, 'Rider En-Route', 'Our agent has accepted the mission.', { orderId: order._id });

        if (req.io) {
            req.io.emit('order_updated', order);
            req.io.to(order._id).emit('mission_accepted', { driverId });
        }

        res.status(200).json({ success: true, message: 'Mission Synchronized.', order });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
};

export const declineMission = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { orderId } = req.params;
        const orderRepository = AppDataSource.getRepository(Order);
        const order = await orderRepository.findOne({ where: { _id: orderId as string } });
        if (!order) return res.status(404).json({ success: false, message: 'Mission reference lost.' });

        const logs = order.dispatchLogs || [];
        logs.push({ timestamp: new Date(), message: `Driver ${req.user?.id} declined mission.` });
        order.driverId = null as any;
        order.status = 'PENDING';
        order.dispatchLogs = logs;
        await orderRepository.save(order);

        if (req.io) req.io.emit('order_updated', order);
        await DispatcherService.findBestDriver(order, req.io);
        res.status(200).json({ success: true, message: 'Mission declined.' });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
};

export const partnerAcceptOrder = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { orderId } = req.params;
        const orderRepository = AppDataSource.getRepository(Order);
        const order = await orderRepository.findOne({ where: { _id: orderId as string }, relations: ['partnerId'] });
        if (!order) return res.status(404).json({ success: false, message: 'Order reference lost.' });

        order.status = 'PARTNER_ACCEPTED';
        if (!order.timeline) order.timeline = [];
        order.timeline.push({ status: 'PARTNER_ACCEPTED', timestamp: new Date() });
        
        await orderRepository.save(order);
        await DispatcherService.findBestDriver(order, req.io);
        
        res.status(200).json({ success: true, message: 'Partner accepted. Dispatching.' });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
};

export const getDriverEarnings = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const orderRepository = AppDataSource.getRepository(Order);
        const driverId = req.user?.id;
        
        const orders = await orderRepository.find({
            where: { driverId: { _id: driverId } as any, status: 'DELIVERED' }
        });

        const today = new Date();
        today.setHours(0,0,0,0);

        const totalReal = orders.reduce((sum, o) => sum + (o.deliveryFee || 0) * 0.90, 0); // Net
        const todayYield = orders
            .filter(o => new Date(o.createdAt) >= today)
            .reduce((sum, o) => sum + (o.deliveryFee || 0) * 0.90, 0);

        res.status(200).json({ 
            success: true, 
            earnings: { 
                total: totalReal.toFixed(2), 
                today: todayYield.toFixed(2),
                currency: 'INR', 
                count: orders.length 
            } 
        });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
};

export const exportOrdersCSV = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderRepository = AppDataSource.getRepository(Order);
    const orders = await orderRepository.find({ relations: ['customerId', 'driverId'] });
    const headers = ['OrderID','Customer','Driver','Status','Total','Date'];
    const rows = orders.map(o => [
        o.orderId, o.customerId?.name || 'N/A', o.driverId?.name || 'Unassigned', o.status, o.total, o.createdAt?.toISOString()
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.send(csv);
  } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
};

export const getOrderById = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const orderRepository = AppDataSource.getRepository(Order);
        const order = await orderRepository.findOne({ where: { _id: req.params.id as string }, relations: ['customerId', 'driverId', 'partnerId'] });
        if (!order) return res.status(404).json({ success: false, message: 'Lost signal.' });
        res.status(200).json({ success: true, order });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
};

export const updateOrderStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, otp, deliveryPhoto } = req.body;
    const orderRepository = AppDataSource.getRepository(Order);
    const userRepository = AppDataSource.getRepository(User);
    
    const order = await orderRepository.findOne({ 
        where: { _id: req.params.id as string },
        relations: ['customerId', 'driverId', 'partnerId', 'partnerId.owner'] 
    });
    if (!order) return res.status(404).json({ success: false, message: 'Order reference lost' });
    
    // SECURITY: If marking as delivered, verify OTP
    if (status === 'DELIVERED') {
        if (order.otp && otp !== order.otp) {
            return res.status(400).json({ success: false, message: 'Invalid Mission PIN. Verification failed.' });
        }
    }

    order.status = status;
    if (deliveryPhoto) order.deliveryPhoto = deliveryPhoto;
    if (!order.timeline) order.timeline = [];
    order.timeline.push({ status, timestamp: new Date() });
    
    // ── FINANCIAL SETTLEMENT PROTOCOL ──────────────────────────────
    if (status === 'DELIVERED') {
        const transactionRepository = AppDataSource.getRepository(Transaction);
        const totalAmount = order.total || 0;
        const deliveryFee = order.deliveryFee || 0;

        // 1. Merchant Payout (if applicable)
        if (order.partnerId) {
            const partner = order.partnerId;
            const itemsTotal = order.itemsTotal || 0;
            const merchantShare = itemsTotal * 0.90;
            if (partner.owner) {
                await userRepository.increment({ _id: partner.owner._id }, 'walletBalance', merchantShare);
                
                // CREATE TRANSACTION RECORD
                const merchantTx = transactionRepository.create({
                    userId: partner.owner._id,
                    orderId: order._id,
                    type: 'EARNING',
                    amount: merchantShare,
                    status: 'COMPLETED',
                    description: `Sale Revenue for Mission #${order.orderId || order._id.slice(-6)}`
                });
                await transactionRepository.save(merchantTx);
                
                AuditService.log('wallet', partner.owner._id, 'MERCHANT_CREDIT', null, { amount: merchantShare, orderId: order._id });
            }
        }

        // 2. Driver Payout
        if (order.driverId) {
            const driverPay = deliveryFee * 0.90; 
            const driverId = (order.driverId as any)._id || order.driverId;
            
            await userRepository.increment({ _id: driverId }, 'walletBalance', driverPay);
            await userRepository.update(driverId, { status: 'available' }); // Back to pool
            
            // CREATE TRANSACTION RECORD
            const driverTx = transactionRepository.create({
                userId: driverId,
                orderId: order._id,
                type: 'EARNING',
                amount: driverPay,
                status: 'COMPLETED',
                description: `Pilot Commission for Mission #${order.orderId || order._id.slice(-6)}`
            });
            await transactionRepository.save(driverTx);

            AuditService.log('wallet', driverId, 'DRIVER_EARNING', null, { amount: driverPay, orderId: order._id });
        }

        order.paymentStatus = 'paid';
    }

    await orderRepository.save(order);
    req.io.emit('order_updated', order);
    
    // Notify customer
    sendNotification(order.customerId?._id as string, `Mission ${status}`, `Protocol updated to ${status}.`, { orderId: order._id });

    res.status(200).json({ success: true, order });
  } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
};

export const updatePaymentMethod = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { orderId } = req.params;
        const { paymentMethod } = req.body;
        const orderRepository = AppDataSource.getRepository(Order);
        const order = await orderRepository.findOne({ where: { _id: orderId as string } });
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
        order.paymentMethod = paymentMethod || order.paymentMethod;
        await orderRepository.save(order);
        res.status(200).json({ success: true, order });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
};

export const gatePassCheck = async (req: AuthenticatedRequest, res: Response) => {
    // Top company feature: Digital gate pass for gated communities
    res.json({ success: true, code: Math.floor(1000 + Math.random() * 9000), expiry: 3600 });
};

export const getAvailableOrders = async (req: AuthenticatedRequest, res: Response) => {
    const orders = await AppDataSource.getRepository(Order).find({ where: { status: 'PENDING' }, relations: ['customerId'] });
    res.json({ success: true, orders });
};

export const adminAssignDriver = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { orderId, driverId } = req.body;
        const orderRepository = AppDataSource.getRepository(Order);
        const order = await orderRepository.findOne({ where: { _id: orderId as string }, relations: ['customerId'] });
        if (!order) return res.status(404).json({ success: false, message: 'Order reference lost.' });

        order.driverId = { _id: driverId } as any;
        order.status = 'ASSIGNED';
        if (!order.timeline) order.timeline = [];
        order.timeline.push({ status: 'ASSIGNED_BY_ADMIN', timestamp: new Date(), driverId });

        await orderRepository.save(order);
        res.status(200).json({ success: true, message: 'Admin override successful. Driver assigned.' });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
};

export const rateOrder = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { rating, review } = req.body;
        const orderRepository = AppDataSource.getRepository(Order);
        const order = await orderRepository.findOne({ where: { _id: id as string }, relations: ['partnerId', 'driverId'] });
        
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
        
        order.rating = rating;
        order.review = review;
        await orderRepository.save(order);

        // Update Partner Rating if applicable
        if (order.partnerId) {
            const partnerRepo = AppDataSource.getRepository(Partner);
            const partner = await partnerRepo.findOne({ where: { _id: order.partnerId._id } });
            if (partner) {
                const newCount = (partner.ratingCount || 0) + 1;
                const newRating = ((partner.rating || 0) * (partner.ratingCount || 0) + rating) / newCount;
                await partnerRepo.update(partner._id, { rating: newRating, ratingCount: newCount });
            }
        }

        // Update Driver Rating if applicable
        if (order.driverId) {
            const userRepo = AppDataSource.getRepository(User);
            const driver = await userRepo.findOne({ where: { _id: (order.driverId as any)._id } });
            if (driver) {
                // Assuming User model has rating/ratingCount fields similar to Partner
                // If not, we could log it in an audit log or separate metadata
                AuditService.log('user', driver._id, 'RATING_RECEIVED', null, { rating, orderId: order._id });
            }
        }

        res.json({ success: true, message: 'Rating synchronized.' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const sendOrderMessage = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { text, senderRole } = req.body;
        const orderRepository = AppDataSource.getRepository(Order);
        const order = await orderRepository.findOne({ where: { _id: id as string } });
        
        if (!order) return res.status(404).json({ success: false, message: 'Order reference lost.' });
        
        const messages = order.messages || [];
        const newMessage = {
            text,
            senderId: req.user?.id,
            senderRole: senderRole || req.user?.role,
            timestamp: new Date()
        };
        messages.push(newMessage);
        order.messages = messages;
        
        await orderRepository.save(order);
        
        if (req.io) {
            req.io.to(order._id).emit('new_message', newMessage);
        }
        
        res.json({ success: true, message: 'Message encrypted and sent.' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getHistoricalHeatmap = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const orderRepository = AppDataSource.getRepository(Order);
        // Get last 500 delivered orders to generate a heatmap of demand
        const orders = await orderRepository.find({
            where: { status: 'DELIVERED' },
            select: ['pickupCoords'],
            take: 500
        });

        const points = orders
            .filter(o => o.pickupCoords && o.pickupCoords.lat)
            .map(o => ({
                lat: o.pickupCoords.lat,
                lng: o.pickupCoords.lng,
                weight: 1
            }));

        res.json({ success: true, points });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const exportDriversCSV = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userRepo = AppDataSource.getRepository(User);
        const drivers = await userRepo.find({ where: { role: 'driver' } });
        
        const headers = ['ID', 'Name', 'Phone', 'Status', 'Wallet', 'Joined'];
        const rows = drivers.map(d => [
            d._id, 
            d.name, 
            d.phone, 
            d.status, 
            d.walletBalance, 
            d.createdAt?.toISOString()
        ]);
        
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=drivers_report.csv');
        res.send(csv);
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
