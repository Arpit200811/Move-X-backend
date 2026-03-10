"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.acceptVRPBatch = exports.getVRPBatches = exports.getSurgeHeatmap = exports.getDriverStats = exports.updateLocationBatch = exports.updateLocation = exports.getDrivers = void 0;
const data_source_1 = require("../data-source");
const User_1 = require("../models/User");
const Order_1 = require("../models/Order");
const h3 = __importStar(require("h3-js"));
const getDrivers = async (req, res) => {
    try {
        const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        const drivers = await userRepository.find({ where: { role: 'driver' } });
        res.status(200).json({ success: true, drivers });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getDrivers = getDrivers;
const updateLocation = async (req, res) => {
    try {
        const { lat, lng } = req.body;
        const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        const driver = await userRepository.findOne({ where: { _id: req.user?.id } });
        if (!driver || driver.role !== 'driver') {
            return res.status(403).json({ success: false, message: 'Only drivers can update location' });
        }
        if (driver.isSuspended) {
            return res.status(403).json({ success: false, message: 'CRITICAL: Account suspended.' });
        }
        const now = new Date();
        if (driver.lat && driver.lng && driver.lastLocationTimestamp) {
            const timeDiffHours = (now.getTime() - new Date(driver.lastLocationTimestamp).getTime()) / (1000 * 60 * 60);
            if (timeDiffHours > 0 && timeDiffHours < 1) {
                const distKm = Math.sqrt(Math.pow(lat - driver.lat, 2) + Math.pow(lng - driver.lng, 2)) * 111;
                const speedKmh = distKm / timeDiffHours;
                if (speedKmh > 200) {
                    driver.isSuspended = true;
                    driver.isOnline = false;
                    driver.status = 'suspended';
                    await userRepository.save(driver);
                    req.io.emit('driver_status_changed', { driverId: driver._id, status: 'suspended' });
                    return res.status(403).json({ success: false, message: 'Teleportation anomaly detected. Account suspended.' });
                }
            }
        }
        driver.lat = lat;
        driver.lng = lng;
        driver.lastLocationTimestamp = now;
        await userRepository.save(driver);
        req.io.emit('driver_location_updated', { driverId: driver._id, lat, lng, timestamp: now.getTime() });
        res.status(200).json({ success: true, location: { lat, lng } });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateLocation = updateLocation;
const updateLocationBatch = async (req, res) => {
    try {
        const { batch } = req.body; // Array of { lat, lng, timestamp }
        if (!Array.isArray(batch) || batch.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid batch data' });
        }
        const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        const driver = await userRepository.findOne({ where: { _id: req.user?.id } });
        if (!driver || driver.role !== 'driver') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }
        // Process each point - in a real app we'd save historical tracks to a separate table
        // Here we just update the latest and do the anomaly check for the whole batch
        for (const point of batch) {
            const { lat, lng, timestamp } = point;
            const pointTime = new Date(timestamp);
            // Simple speed check for each jump in the offline batch
            if (driver.lat && driver.lng && driver.lastLocationTimestamp) {
                const hours = (pointTime.getTime() - new Date(driver.lastLocationTimestamp).getTime()) / 3600000;
                if (hours > 0 && hours < 0.5) { // Check jumps within 30 mins
                    const km = Math.sqrt(Math.pow(lat - driver.lat, 2) + Math.pow(lng - driver.lng, 2)) * 111;
                    if (km / hours > 220) {
                        driver.isSuspended = true;
                        await userRepository.save(driver);
                        return res.status(403).json({ success: false, message: 'Anomaly in offline sync data.' });
                    }
                }
            }
            driver.lat = lat;
            driver.lng = lng;
            driver.lastLocationTimestamp = pointTime;
        }
        await userRepository.save(driver);
        req.io.emit('driver_location_updated', { driverId: driver._id, lat: driver.lat, lng: driver.lng });
        res.status(200).json({ success: true, count: batch.length });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateLocationBatch = updateLocationBatch;
const getDriverStats = async (req, res) => {
    try {
        const userId = req.user?.id;
        const orderRepo = data_source_1.AppDataSource.getRepository(Order_1.Order);
        const userRepo = data_source_1.AppDataSource.getRepository(User_1.User);
        const driver = await userRepo.findOne({ where: { _id: userId } });
        if (!driver)
            return res.status(404).json({ success: false, message: 'Driver not found' });
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        // 1. Total Earnings & Completion
        const orders = await orderRepo.find({
            where: { driverId: { _id: userId }, status: 'DELIVERED' }
        });
        const totalEarnings = orders.reduce((sum, o) => sum + (o.total || 0), 0);
        const todayOrders = orders.filter(o => o.createdAt >= startOfToday);
        const todayEarnings = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        const monthOrders = orders.filter(o => o.createdAt >= startOfMonth);
        const monthEarnings = monthOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        // 2. Acceptance Rate (Conceptual logic using history)
        // In a real app we'd track ALL requests. Here we use finished vs total ever assigned.
        const totalAssigned = await orderRepo.count({ where: { driverId: { _id: userId } } });
        const acceptanceRate = totalAssigned > 0 ? (orders.length / totalAssigned) * 100 : 100;
        // 3. Tier Progression
        const tierPoints = driver.loyaltyPoints || 0;
        let nextTier = 'Silver';
        let pointsNeeded = 1000 - tierPoints;
        let progress = (tierPoints / 1000) * 100;
        if (driver.tier === 'silver') {
            nextTier = 'Gold';
            pointsNeeded = 5000 - tierPoints;
            progress = (tierPoints / 5000) * 100;
        }
        else if (driver.tier === 'gold') {
            nextTier = 'Platinum';
            pointsNeeded = 10000 - tierPoints;
            progress = (tierPoints / 10000) * 100;
        }
        res.status(200).json({
            success: true,
            stats: {
                today: { earnings: todayEarnings, trips: todayOrders.length },
                monthly: { earnings: monthEarnings, trips: monthOrders.length },
                lifetime: { earnings: totalEarnings, trips: orders.length },
                performance: {
                    rating: driver.rating || 5.0,
                    acceptanceRate: Math.round(acceptanceRate),
                    loyaltyPoints: tierPoints
                },
                tier: {
                    current: driver.tier || 'bronze',
                    next: nextTier,
                    pointsNeeded: Math.max(0, pointsNeeded),
                    progressPercentage: Math.min(100, progress)
                }
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getDriverStats = getDriverStats;
const getSurgeHeatmap = async (req, res) => {
    try {
        const orderRepository = data_source_1.AppDataSource.getRepository(Order_1.Order);
        const pendingOrders = await orderRepository.find({ where: { status: 'PENDING' } });
        const heatmap = {};
        const H3_RESOLUTION = 7;
        pendingOrders.forEach(order => {
            if (order.pickupCoords?.lat && order.pickupCoords?.lng) {
                const hex = h3.latLngToCell(Number(order.pickupCoords.lat), Number(order.pickupCoords.lng), H3_RESOLUTION);
                if (!heatmap[hex]) {
                    const [lat, lng] = h3.cellToLatLng(hex);
                    heatmap[hex] = { hex, count: 0, lat, lng };
                }
                heatmap[hex].count++;
            }
        });
        res.status(200).json({ success: true, heatmap: Object.values(heatmap) });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getSurgeHeatmap = getSurgeHeatmap;
const getVRPBatches = async (req, res) => {
    try {
        const { VRPService } = await Promise.resolve().then(() => __importStar(require('../services/vrpService')));
        const driverId = req.user?.id;
        const batches = await VRPService.generateOptimalBatch(driverId);
        res.status(200).json({ success: true, batches });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getVRPBatches = getVRPBatches;
const acceptVRPBatch = async (req, res) => {
    try {
        const { orderIds } = req.body;
        const { VRPService } = await Promise.resolve().then(() => __importStar(require('../services/vrpService')));
        const driverId = req.user?.id;
        const orders = await VRPService.deployBatch(driverId, orderIds, req.io);
        res.status(200).json({ success: true, orders });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.acceptVRPBatch = acceptVRPBatch;
//# sourceMappingURL=driverController.js.map