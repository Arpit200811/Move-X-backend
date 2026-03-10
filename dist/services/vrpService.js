"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VRPService = void 0;
const data_source_1 = require("../data-source");
const Order_1 = require("../models/Order");
const User_1 = require("../models/User");
const typeorm_1 = require("typeorm");
/**
 * Enterprise VRP (Vehicle Routing Problem) Service
 * Optimizes multi-stop routes for single drivers to maximize efficiency.
 * Algorithm: Greedy Proximity Batching with Volume Constraints.
 */
class VRPService {
    static async generateOptimalBatch(driverId, maxStops = 3) {
        const orderRepository = data_source_1.AppDataSource.getRepository(Order_1.Order);
        const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        const driver = await userRepository.findOne({ where: { _id: driverId } });
        if (!driver || !driver.lat || !driver.lng)
            return null;
        // Find available orders near the driver
        // In a real VRP, we'd use a more complex savings algorithm
        const pendingOrders = await orderRepository.find({
            where: { status: 'PENDING' },
            relations: ['customerId']
        });
        if (pendingOrders.length === 0)
            return [];
        // Simple Greedy Approach:
        // 1. Sort by distance to driver
        // 2. Cluster orders that are within 2km of each other
        const scoredOrders = pendingOrders.map(order => {
            const dist = this.calculateDistance(driver.lat, driver.lng, order.pickupCoords?.lat, order.pickupCoords?.lng);
            return { order, dist };
        });
        scoredOrders.sort((a, b) => a.dist - b.dist);
        const batch = [];
        const first = scoredOrders[0];
        if (first.dist > 10)
            return []; // Too far
        batch.push(first.order);
        for (let i = 1; i < scoredOrders.length && batch.length < maxStops; i++) {
            const candidate = scoredOrders[i];
            const distToLast = this.calculateDistance(batch[batch.length - 1].pickupCoords?.lat, batch[batch.length - 1].pickupCoords?.lng, candidate.order.pickupCoords?.lat, candidate.order.pickupCoords?.lng);
            if (distToLast < 3) { // Cluster threshold: 3km
                batch.push(candidate.order);
            }
        }
        return batch;
    }
    static calculateDistance(lat1, lng1, lat2, lng2) {
        if (!lat1 || !lng1 || !lat2 || !lng2)
            return 999;
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    static async deployBatch(driverId, orderIds, io) {
        const orderRepository = data_source_1.AppDataSource.getRepository(Order_1.Order);
        const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        const orders = await orderRepository.find({ where: { _id: (0, typeorm_1.In)(orderIds) } });
        for (const order of orders) {
            order.driverId = { _id: driverId };
            order.status = 'ACCEPTED';
            if (!order.timeline)
                order.timeline = [];
            order.timeline.push({ status: 'ACCEPTED', timestamp: new Date(), note: 'Batched via VRP' });
            await orderRepository.save(order);
        }
        await userRepository.update(driverId, { status: 'busy' });
        if (io) {
            io.emit('batch_deployed', { driverId, orderIds });
            orders.forEach(o => io.emit('order_updated', o));
        }
        return orders;
    }
}
exports.VRPService = VRPService;
//# sourceMappingURL=vrpService.js.map