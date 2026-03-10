"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportDriversCSV = exports.getHistoricalHeatmap = exports.sendOrderMessage = exports.rateOrder = exports.adminAssignDriver = exports.getAvailableOrders = exports.gatePassCheck = exports.updatePaymentMethod = exports.updateOrderStatus = exports.getOrderById = exports.exportOrdersCSV = exports.getDriverEarnings = exports.partnerAcceptOrder = exports.declineMission = exports.acceptMission = exports.cancelOrder = exports.getMyOrders = exports.getPriceQuote = exports.createOrder = void 0;
const data_source_1 = require("../data-source");
const Order_1 = require("../models/Order");
const User_1 = require("../models/User");
const Partner_1 = require("../models/Partner");
const notificationService_1 = require("../services/notificationService");
const dispatcherService_1 = require("../services/dispatcherService");
const auditService_1 = require("../services/auditService");
const surgeService_1 = require("../services/surgeService");
const geoFencingService_1 = require("../services/geoFencingService");
const TaxConfig_1 = require("../models/TaxConfig");
// Haversine Distance Helper
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};
const createOrder = async (req, res) => {
    try {
        const orderRepository = data_source_1.AppDataSource.getRepository(Order_1.Order);
        const { pickup, destination, serviceClass, packageType, paymentMethod, promoCode, partnerId, items, itemsTotal, deliveryFee: clientDeliveryFee, taxData, pickupCoords, destCoords } = req.body;
        // Universal Coord Extraction (handles all payload shapes from different screens)
        const pLat = Number(pickup?.lat ?? pickup?.coords?.lat ?? pickupCoords?.lat ?? 28.6139);
        const pLng = Number(pickup?.lng ?? pickup?.coords?.lng ?? pickupCoords?.lng ?? 77.2090);
        const dLat = Number(destination?.lat ?? destination?.coords?.lat ?? destCoords?.lat ?? 28.7041);
        const dLng = Number(destination?.lng ?? destination?.coords?.lng ?? destCoords?.lng ?? 77.1025);
        // 1. SERVER-SIDE PRICE & SERVICE AREA VALIDATION (Anti-Hack)
        // Only validate geo-fence if we have real coords
        const hasValidCoords = !isNaN(pLat) && !isNaN(pLng) && !isNaN(dLat) && !isNaN(dLng) && pLat !== 0 && dLat !== 0;
        if (hasValidCoords) {
            await geoFencingService_1.GeoFencingService.validateServiceArea({ lat: pLat, lng: pLng }, { lat: dLat, lng: dLng });
        }
        const distance = calculateDistance(pLat, pLng, dLat, dLng) || 0;
        const taxRepo = data_source_1.AppDataSource.getRepository(TaxConfig_1.TaxConfig);
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
        const { multiplier } = await (0, surgeService_1.calculateSurgeMultiplier)(pLat, pLng);
        const calculatedBase = (config.baseFare || 30) + (distance * (config.perKmRate || 12));
        const finalDeliveryFee = Number((calculatedBase * multiplier).toFixed(2)) || 0;
        const calculatedTax = Number((finalDeliveryFee * (config.taxRate || 0) / 100).toFixed(2)) || 0;
        let verifiedTotal = (itemsTotal || 0) + finalDeliveryFee + calculatedTax;
        if (isNaN(verifiedTotal))
            verifiedTotal = 0;
        // 2. WALLET PRE-AUTHENTICATION & DEBIT
        const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        const customer = await userRepository.findOne({ where: { _id: req.user?.id } });
        if (!customer)
            throw new Error('CUSTOMER_NOT_FOUND');
        if (paymentMethod === 'Wallet') {
            if (customer.walletBalance < verifiedTotal) {
                return res.status(400).json({ success: false, message: 'INSUFFICIENT_FUNDS_IN_WALLET' });
            }
            // Deduct immediately (Transaction integrity)
            await userRepository.decrement({ _id: customer._id }, 'walletBalance', verifiedTotal);
            auditService_1.AuditService.log('wallet', customer._id, 'ORDER_PAYMENT', null, { amount: verifiedTotal, orderId: `TEMP-${Date.now()}` });
        }
        const timestamp = Date.now().toString().slice(-4);
        const orderId = `MVX-${timestamp}${Math.floor(1000 + Math.random() * 9000)}`;
        const paymentStatus = paymentMethod === 'Wallet' ? 'paid' : 'pending';
        const otp = Math.floor(1000 + Math.random() * 9000).toString(); // Secure Mission PIN
        const order = orderRepository.create({
            ...req.body,
            orderId,
            otp,
            customerId: { _id: req.user?.id },
            status: 'PENDING',
            paymentStatus,
            pickup,
            destination,
            pickupCoords: { lat: pLat, lng: pLng },
            destCoords: { lat: dLat, lng: dLng },
            serviceClass: serviceClass || 'Economy',
            price: finalDeliveryFee,
            deliveryFee: finalDeliveryFee,
            itemsTotal,
            tax: calculatedTax,
            currency: config.currency || 'INR',
            total: verifiedTotal,
            promoCode,
            discount: 0,
            partnerId: (partnerId && partnerId.length > 30) ? { _id: partnerId } : undefined,
            timeline: [{ status: 'PENDING', timestamp: new Date() }]
        });
        await orderRepository.save(order);
        // 3. Hydrate with base relations first
        const hydratedOrder = await orderRepository.findOne({
            where: { _id: order._id },
            relations: ['partnerId', 'customerId', 'driverId']
        });
        if (!hydratedOrder) {
            return res.status(500).json({ success: false, message: 'CRITICAL_HYDRATION_FAILURE' });
        }
        // Explicitly handle nested partner owner if needed
        let partner = null;
        if (hydratedOrder.partnerId) {
            const partnerRepository = data_source_1.AppDataSource.getRepository(Partner_1.Partner);
            partner = await partnerRepository.findOne({
                where: { _id: hydratedOrder.partnerId._id },
                relations: ['owner']
            });
        }
        auditService_1.AuditService.log('order', hydratedOrder._id, 'ORDER_CREATED', null, hydratedOrder, {
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
                if (!hydratedOrder.timeline)
                    hydratedOrder.timeline = [];
                hydratedOrder.timeline.push({ status: 'PARTNER_ACCEPTED', timestamp: new Date() });
                await orderRepository.save(hydratedOrder);
                (0, notificationService_1.sendNotification)(hydratedOrder.customerId?._id, 'MERCHANT_ACCEPTED', { merchantName: partner.name }, { orderId: hydratedOrder._id });
                await dispatcherService_1.DispatcherService.findBestDriver(hydratedOrder, req.io);
            }
            else {
                if (partner && partner.owner) {
                    (0, notificationService_1.sendNotification)(partner.owner._id, 'NEW_INCOMING_MISSION', { itemName: hydratedOrder.packageType });
                }
            }
        }
        else {
            await dispatcherService_1.DispatcherService.findBestDriver(hydratedOrder, req.io);
        }
        res.status(201).json({ success: true, order });
    }
    catch (error) {
        console.error('❌ [ORDER CREATION CRASH]:', error.message, error.stack);
        res.status(500).json({
            success: false,
            message: 'Neural interface rejection: ' + error.message,
            trace: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};
exports.createOrder = createOrder;
const getPriceQuote = async (req, res) => {
    try {
        const { pickup, destination, serviceClass = 'Economy' } = req.body;
        if (!pickup || !destination)
            return res.status(400).json({ success: false, message: 'Pickup and destination required' });
        const pLat = Number(pickup.lat);
        const pLng = Number(pickup.lng);
        const dLat = Number(destination.lat);
        const dLng = Number(destination.lng);
        // 1. Geo-fencing Validation
        await geoFencingService_1.GeoFencingService.validateServiceArea({ lat: pLat, lng: pLng }, { lat: dLat, lng: dLng });
        // 2. Distance Calculation
        const distance = calculateDistance(pLat, pLng, dLat, dLng);
        // 3. Tax / Rate Rules
        const taxRepo = data_source_1.AppDataSource.getRepository(TaxConfig_1.TaxConfig);
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
        const { multiplier, reasons } = await (0, surgeService_1.calculateSurgeMultiplier)(pLat, pLng);
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
    }
    catch (error) {
        let status = 500;
        if (error.message.includes('SERVICE_NOT_AVAILABLE'))
            status = 403;
        res.status(status).json({ success: false, message: error.message });
    }
};
exports.getPriceQuote = getPriceQuote;
const getMyOrders = async (req, res) => {
    try {
        const orderRepository = data_source_1.AppDataSource.getRepository(Order_1.Order);
        const userId = req.user?.id;
        const role = req.user?.role;
        let whereClause = {};
        if (role === 'customer')
            whereClause = { customerId: { _id: userId } };
        else if (role === 'driver')
            whereClause = { driverId: { _id: userId } };
        else if (role === 'partner')
            whereClause = { partnerId: { owner: { _id: userId } } };
        const orders = await orderRepository.find({
            where: whereClause,
            relations: ['customerId', 'driverId', 'partnerId'],
            order: { createdAt: 'DESC' }
        });
        res.status(200).json({ success: true, orders });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getMyOrders = getMyOrders;
const cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const orderRepository = data_source_1.AppDataSource.getRepository(Order_1.Order);
        const order = await orderRepository.findOne({
            where: { _id: orderId },
            relations: ['customerId']
        });
        if (!order)
            return res.status(404).json({ success: false, message: 'Order reference lost.' });
        // Allowed to cancel only if not already picked up
        const restricted = ['PICKED_UP', 'DELIVERED', 'CANCELLED'];
        if (restricted.includes(order.status)) {
            return res.status(400).json({ success: false, message: 'Order cannot be cancelled in current state.' });
        }
        // 🟢 REFUND PROTOCOL: If paid via wallet, return funds
        if (order.paymentStatus === 'paid' && order.paymentMethod === 'Wallet') {
            const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
            await userRepository.increment({ _id: order.customerId._id }, 'walletBalance', order.total);
            auditService_1.AuditService.log('wallet', order.customerId._id, 'ORDER_CANCEL_REFUND', null, { amount: order.total, orderId: order._id });
        }
        order.status = 'CANCELLED';
        if (!order.timeline)
            order.timeline = [];
        order.timeline.push({ status: 'CANCELLED', timestamp: new Date(), reason: req.body.reason || 'User cancelled' });
        await orderRepository.save(order);
        if (req.io)
            req.io.emit('order_updated', order);
        res.status(200).json({ success: true, message: 'Mission Aborted.' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.cancelOrder = cancelOrder;
const acceptMission = async (req, res) => {
    try {
        const { orderId } = req.params;
        const driverId = req.user?.id;
        const orderRepository = data_source_1.AppDataSource.getRepository(Order_1.Order);
        const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        const order = await orderRepository.findOne({
            where: { _id: orderId },
            relations: ['customerId', 'driverId']
        });
        if (!order)
            return res.status(404).json({ success: false, message: 'Mission reference lost.' });
        // CONSISTENCY CHECK: Must be ASSIGNED to this driver
        if (order.status !== 'ASSIGNED' || order.driverId?._id !== driverId) {
            return res.status(400).json({ success: false, message: 'Mission no longer available or assigned elsewhere.' });
        }
        order.status = 'ACCEPTED';
        if (!order.timeline)
            order.timeline = [];
        order.timeline.push({ status: 'ACCEPTED', timestamp: new Date() });
        await orderRepository.save(order);
        await userRepository.update(driverId, { status: 'busy' });
        (0, notificationService_1.sendNotification)(order.customerId?._id, 'Rider En-Route', 'Our agent has accepted the mission.', { orderId: order._id });
        if (req.io) {
            req.io.emit('order_updated', order);
            req.io.to(order._id).emit('mission_accepted', { driverId });
        }
        res.status(200).json({ success: true, message: 'Mission Synchronized.', order });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.acceptMission = acceptMission;
const declineMission = async (req, res) => {
    try {
        const { orderId } = req.params;
        const orderRepository = data_source_1.AppDataSource.getRepository(Order_1.Order);
        const order = await orderRepository.findOne({ where: { _id: orderId } });
        if (!order)
            return res.status(404).json({ success: false, message: 'Mission reference lost.' });
        const logs = order.dispatchLogs || [];
        logs.push({ timestamp: new Date(), message: `Driver ${req.user?.id} declined mission.` });
        order.driverId = null;
        order.status = 'PENDING';
        order.dispatchLogs = logs;
        await orderRepository.save(order);
        if (req.io)
            req.io.emit('order_updated', order);
        await dispatcherService_1.DispatcherService.findBestDriver(order, req.io);
        res.status(200).json({ success: true, message: 'Mission declined.' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.declineMission = declineMission;
const partnerAcceptOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const orderRepository = data_source_1.AppDataSource.getRepository(Order_1.Order);
        const order = await orderRepository.findOne({ where: { _id: orderId }, relations: ['partnerId'] });
        if (!order)
            return res.status(404).json({ success: false, message: 'Order reference lost.' });
        order.status = 'PARTNER_ACCEPTED';
        if (!order.timeline)
            order.timeline = [];
        order.timeline.push({ status: 'PARTNER_ACCEPTED', timestamp: new Date() });
        await orderRepository.save(order);
        await dispatcherService_1.DispatcherService.findBestDriver(order, req.io);
        res.status(200).json({ success: true, message: 'Partner accepted. Dispatching.' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.partnerAcceptOrder = partnerAcceptOrder;
const getDriverEarnings = async (req, res) => {
    try {
        const orderRepository = data_source_1.AppDataSource.getRepository(Order_1.Order);
        const driverId = req.user?.id;
        const orders = await orderRepository.find({
            where: { driverId: { _id: driverId }, status: 'DELIVERED' }
        });
        const today = new Date();
        today.setHours(0, 0, 0, 0);
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
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getDriverEarnings = getDriverEarnings;
const exportOrdersCSV = async (req, res) => {
    try {
        const orderRepository = data_source_1.AppDataSource.getRepository(Order_1.Order);
        const orders = await orderRepository.find({ relations: ['customerId', 'driverId'] });
        const headers = ['OrderID', 'Customer', 'Driver', 'Status', 'Total', 'Date'];
        const rows = orders.map(o => [
            o.orderId, o.customerId?.name || 'N/A', o.driverId?.name || 'Unassigned', o.status, o.total, o.createdAt?.toISOString()
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.send(csv);
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.exportOrdersCSV = exportOrdersCSV;
const getOrderById = async (req, res) => {
    try {
        const orderRepository = data_source_1.AppDataSource.getRepository(Order_1.Order);
        const order = await orderRepository.findOne({ where: { _id: req.params.id }, relations: ['customerId', 'driverId', 'partnerId'] });
        if (!order)
            return res.status(404).json({ success: false, message: 'Lost signal.' });
        res.status(200).json({ success: true, order });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getOrderById = getOrderById;
const updateOrderStatus = async (req, res) => {
    try {
        const { status, otp, deliveryPhoto } = req.body;
        const orderRepository = data_source_1.AppDataSource.getRepository(Order_1.Order);
        const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        const order = await orderRepository.findOne({
            where: { _id: req.params.id },
            relations: ['customerId', 'driverId', 'partnerId', 'partnerId.owner']
        });
        if (!order)
            return res.status(404).json({ success: false, message: 'Order reference lost' });
        // SECURITY: If marking as delivered, verify OTP
        if (status === 'DELIVERED') {
            if (order.otp && otp !== order.otp) {
                return res.status(400).json({ success: false, message: 'Invalid Mission PIN. Verification failed.' });
            }
        }
        order.status = status;
        if (deliveryPhoto)
            order.deliveryPhoto = deliveryPhoto;
        if (!order.timeline)
            order.timeline = [];
        order.timeline.push({ status, timestamp: new Date() });
        // ── FINANCIAL SETTLEMENT PROTOCOL ──────────────────────────────
        if (status === 'DELIVERED') {
            const platformCommissionRate = 0.15; // 15% Platform Fee
            const totalAmount = order.total || 0;
            const deliveryFee = order.deliveryFee || 0;
            // 1. Merchant Payout (if applicable)
            if (order.partnerId) {
                const partner = order.partnerId;
                const itemsTotal = order.itemsTotal || 0;
                const merchantShare = itemsTotal * 0.90;
                if (partner.owner) {
                    await userRepository.increment({ _id: partner.owner._id }, 'walletBalance', merchantShare);
                    auditService_1.AuditService.log('wallet', partner.owner._id, 'MERCHANT_CREDIT', null, { amount: merchantShare, orderId: order._id });
                }
            }
            // 2. Driver Payout
            if (order.driverId) {
                const driverPay = deliveryFee * 0.90;
                await userRepository.increment({ _id: order.driverId._id }, 'walletBalance', driverPay);
                await userRepository.update(order.driverId._id, { status: 'available' }); // Back to pool
                auditService_1.AuditService.log('wallet', order.driverId._id, 'DRIVER_EARNING', null, { amount: driverPay, orderId: order._id });
            }
            order.paymentStatus = 'paid';
        }
        await orderRepository.save(order);
        req.io.emit('order_updated', order);
        // Notify customer
        (0, notificationService_1.sendNotification)(order.customerId?._id, `Mission ${status}`, `Protocol updated to ${status}.`, { orderId: order._id });
        res.status(200).json({ success: true, order });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateOrderStatus = updateOrderStatus;
const updatePaymentMethod = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { paymentMethod } = req.body;
        const orderRepository = data_source_1.AppDataSource.getRepository(Order_1.Order);
        const order = await orderRepository.findOne({ where: { _id: orderId } });
        if (!order)
            return res.status(404).json({ success: false, message: 'Order not found' });
        order.paymentMethod = paymentMethod || order.paymentMethod;
        await orderRepository.save(order);
        res.status(200).json({ success: true, order });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updatePaymentMethod = updatePaymentMethod;
const gatePassCheck = async (req, res) => {
    // Top company feature: Digital gate pass for gated communities
    res.json({ success: true, code: Math.floor(1000 + Math.random() * 9000), expiry: 3600 });
};
exports.gatePassCheck = gatePassCheck;
const getAvailableOrders = async (req, res) => {
    const orders = await data_source_1.AppDataSource.getRepository(Order_1.Order).find({ where: { status: 'PENDING' }, relations: ['customerId'] });
    res.json({ success: true, orders });
};
exports.getAvailableOrders = getAvailableOrders;
const adminAssignDriver = async (req, res) => {
    try {
        const { orderId, driverId } = req.body;
        const orderRepository = data_source_1.AppDataSource.getRepository(Order_1.Order);
        const order = await orderRepository.findOne({ where: { _id: orderId }, relations: ['customerId'] });
        if (!order)
            return res.status(404).json({ success: false, message: 'Order reference lost.' });
        order.driverId = { _id: driverId };
        order.status = 'ASSIGNED';
        if (!order.timeline)
            order.timeline = [];
        order.timeline.push({ status: 'ASSIGNED_BY_ADMIN', timestamp: new Date(), driverId });
        await orderRepository.save(order);
        res.status(200).json({ success: true, message: 'Admin override successful. Driver assigned.' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.adminAssignDriver = adminAssignDriver;
const rateOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, review } = req.body;
        const orderRepository = data_source_1.AppDataSource.getRepository(Order_1.Order);
        const order = await orderRepository.findOne({ where: { _id: id }, relations: ['partnerId', 'driverId'] });
        if (!order)
            return res.status(404).json({ success: false, message: 'Order not found' });
        order.rating = rating;
        order.review = review;
        await orderRepository.save(order);
        // Update Partner Rating if applicable
        if (order.partnerId) {
            const partnerRepo = data_source_1.AppDataSource.getRepository(Partner_1.Partner);
            const partner = await partnerRepo.findOne({ where: { _id: order.partnerId._id } });
            if (partner) {
                const newCount = (partner.ratingCount || 0) + 1;
                const newRating = ((partner.rating || 0) * (partner.ratingCount || 0) + rating) / newCount;
                await partnerRepo.update(partner._id, { rating: newRating, ratingCount: newCount });
            }
        }
        // Update Driver Rating if applicable
        if (order.driverId) {
            const userRepo = data_source_1.AppDataSource.getRepository(User_1.User);
            const driver = await userRepo.findOne({ where: { _id: order.driverId._id } });
            if (driver) {
                // Assuming User model has rating/ratingCount fields similar to Partner
                // If not, we could log it in an audit log or separate metadata
                auditService_1.AuditService.log('user', driver._id, 'RATING_RECEIVED', null, { rating, orderId: order._id });
            }
        }
        res.json({ success: true, message: 'Rating synchronized.' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.rateOrder = rateOrder;
const sendOrderMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const { text, senderRole } = req.body;
        const orderRepository = data_source_1.AppDataSource.getRepository(Order_1.Order);
        const order = await orderRepository.findOne({ where: { _id: id } });
        if (!order)
            return res.status(404).json({ success: false, message: 'Order reference lost.' });
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
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.sendOrderMessage = sendOrderMessage;
const getHistoricalHeatmap = async (req, res) => {
    try {
        const orderRepository = data_source_1.AppDataSource.getRepository(Order_1.Order);
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
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getHistoricalHeatmap = getHistoricalHeatmap;
const exportDriversCSV = async (req, res) => {
    try {
        const userRepo = data_source_1.AppDataSource.getRepository(User_1.User);
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
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.exportDriversCSV = exportDriversCSV;
//# sourceMappingURL=orderController.js.map