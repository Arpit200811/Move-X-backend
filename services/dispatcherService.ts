import * as h3 from 'h3-js';
import { AppDataSource } from '../data-source';
import { User } from '../models/User';
import { Order } from '../models/Order';
import { sendNotification } from './notificationService';
import { In } from 'typeorm';
import { Server } from 'socket.io';

const H3_RESOLUTION = 7;

export class DispatcherService {
    /**
     * Finds the best available driver and ASSIGNS them to the order.
     */
    static async findBestDriver(order: Order, io?: Server) {
        const userRepository = AppDataSource.getRepository(User);
        const orderRepository = AppDataSource.getRepository(Order);

        // Advanced Configs
        const configs: Record<string, { maxRadius: number, minRating: number }> = {
            'Economy': { maxRadius: 6, minRating: 0 },
            'Comfort': { maxRadius: 10, minRating: 4.2 },
            'Business': { maxRadius: 15, minRating: 4.6 }
        };

        const config = configs[order.serviceClass as string] || configs['Economy'];
        const logs: any[] = order.dispatchLogs || [];

        const log = (msg: string) => {
            const entry = { timestamp: new Date(), message: msg };
            logs.push(entry);
            if (io) io.emit('dispatch_log', { orderId: order._id, ...entry });
        };

        log(`AI Dispatcher [v3.0 - H3 Hybrid]: Protocol ${order.serviceClass} initiated...`);
        
        const pLat = (order.pickupCoords as any)?.lat;
        const pLng = (order.pickupCoords as any)?.lng;

        if (!pLat || !pLng) {
            log('Mission Failed: Telemetry loss (no pickup coordinates).');
            return null;
        }

        const retryCount = (order as any).retryCount || 0;
        if (retryCount >= 5) {
            log('Mission Protocol Aborted: Failure Threshold Reached.');
            order.status = 'REJECTED';
            if (order.paymentStatus === 'paid' && order.paymentMethod === 'Wallet') {
                const userRepository = AppDataSource.getRepository(User);
                await userRepository.increment({ _id: (order.customerId as any)._id }, 'walletBalance', order.total);
            }
            await orderRepository.save(order);
            sendNotification(order.customerId?._id as string, 'Mission Failed', 'We couldn\'t find a driver for your request. Refund initiated.', { orderId: order._id });
            return null;
        }

        // ── Step 1: Global Demand Analysis (H3) ──
        const pendingOrders = await orderRepository.find({ where: { status: 'PENDING' } });
        const demandMap: Record<string, number> = {};
        pendingOrders.forEach(o => {
            if (o.pickupCoords?.lat) {
                const h = h3.latLngToCell(Number(o.pickupCoords.lat), Number(o.pickupCoords.lng), H3_RESOLUTION);
                demandMap[h] = (demandMap[h] || 0) + 1;
            }
        });

        // ── Step 2: Geo-Spatial Sweep ──
        const radiusMeters = config.maxRadius * 1000;
        let candidates = [];
        try {
            // PostGIS Optimized Query
            candidates = await userRepository.query(`
                SELECT *,
                  ROUND((ST_DistanceSphere(ST_MakePoint(lng, lat), ST_MakePoint($2, $1)) / 1000)::numeric, 2) AS "distanceKm"
                FROM users
                WHERE role = 'driver' AND "isOnline" = true AND "isSuspended" = false AND status = 'available'
                  AND lat IS NOT NULL AND lng IS NOT NULL
                  AND ST_DistanceSphere(ST_MakePoint(lng, lat), ST_MakePoint($2, $1)) <= $3
                ORDER BY "distanceKm" ASC LIMIT 15
            `, [pLat, pLng, radiusMeters]);
        } catch (e) {
            // Haversine Fallback
            candidates = await userRepository.query(`
                SELECT *,
                  ROUND((6371 * acos(cos(radians($1)) * cos(radians(lat)) * cos(radians(lng) - radians($2)) + sin(radians($1)) * sin(radians(lat))))::numeric, 2) AS "distanceKm"
                FROM users
                WHERE role = 'driver' AND "isOnline" = true AND "isSuspended" = false AND status = 'available'
                  AND lat IS NOT NULL AND lng IS NOT NULL
                  AND (6371 * acos(cos(radians($1)) * cos(radians(lat)) * cos(radians(lng) - radians($2)) + sin(radians($1)) * sin(radians(lat)))) <= $3
                ORDER BY "distanceKm" ASC LIMIT 15
            `, [pLat, pLng, config.maxRadius]);
        }

        if (candidates.length === 0) {
            log('No nodes currently matches mission parameters. Retrying soon...');
            order.dispatchLogs = logs;
            await orderRepository.save(order);
            return null;
        }

        // ── Step 3: Heatmap-Based Scoring (H3) ──
        const orderHex = h3.latLngToCell(pLat, pLng, H3_RESOLUTION);

        const scored = candidates.map((row: any) => {
            const driver = row;
            let score = 100;

            // Factor 1: Proximity (Up to -60 points)
            score -= (row.distanceKm / config.maxRadius) * 60;

            // Factor 2: Quality (Rating bonus/penalty)
            score += (driver.rating - 4) * 10;

            // Factor 3: Asset Status (Tier priority)
            const tierBonus = { 'platinum': 20, 'gold': 15, 'silver': 10, 'bronze': 0 };
            score += tierBonus[driver.tier as keyof typeof tierBonus] || 0;

            // Factor 4: Demand-Balancing (H3 Logic)
            // If the driver is in a high-demand hexagon, give them priority for THIS order 
            // to clear hotspots faster.
            const driverHex = h3.latLngToCell(driver.lat, driver.lng, H3_RESOLUTION);
            const demandDensity = demandMap[driverHex] || 0;
            
            if (driverHex === orderHex) {
                score += 25; // Same-Hexagon Bonus
                log(`Driver ${driver.name} is in the same Sector (${driverHex}). Affinity +25.`);
            } else if (demandDensity > 3) {
                score += 15; // Hot-Zone Bonus (Prioritize clearing busy areas)
                log(`Driver ${driver.name} is in Hot Zone. Priority increased.`);
            }

            return { driver, score, distance: row.distanceKm };
        }).sort((a, b) => b.score - a.score);

        const best = scored[0].driver;
        log(`Mission Assigned: Node ${best.name} (Score: ${scored[0].score.toFixed(1)}, Dist: ${scored[0].distance}km)`);

        // ── Step 4: Finalize Assignment ──
        order.driverId = { _id: best._id } as any;
        order.status = 'ASSIGNED';
        if (!order.timeline) order.timeline = [];
        order.timeline.push({ status: 'ASSIGNED', timestamp: new Date(), driverId: best._id });
        order.dispatchLogs = logs;

        await orderRepository.save(order);
        
        sendNotification(best._id, 'Mission Request', `NEW MISSION: ${order.serviceClass} protocol. Accept now!`, { orderId: order._id, type: 'MISSION_ASSIGNED' });
        
        if (io) {
            io.emit('order_updated', order);
            io.to(best._id).emit('mission_request', order);
        }

        return best;
    }

    /**
     * Heartbeat processor: Retries mission dispatching and handles timeouts
     */
    static async processQueuedMissions(io: Server) {
        const orderRepository = AppDataSource.getRepository(Order);
        
        // 1. Re-dispatch PENDING/ASSIGNED orders
        const pending = await orderRepository.find({ where: { status: 'PENDING' }, relations: ['customerId'] });
        for (const order of pending) {
            (order as any).retryCount = ((order as any).retryCount || 0) + 1;
            await this.findBestDriver(order, io);
        }

        // 2. Handle Timeouts for ASSIGNED orders (Driver didn't accept in 45s)
        const assigned = await orderRepository.find({ 
            where: { status: 'ASSIGNED' },
            relations: ['driverId'] 
        });

        for (const order of assigned) {
            const lastEvent = order.timeline?.[order.timeline.length - 1];
            if (lastEvent && lastEvent.status === 'ASSIGNED') {
                const diffSec = (new Date().getTime() - new Date(lastEvent.timestamp).getTime()) / 1000;
                if (diffSec > 45) {
                    const logs = order.dispatchLogs || [];
                    logs.push({ timestamp: new Date(), message: `Driver ${order.driverId?.name || 'Unknown'} timed out. Re-queuing.` });
                    
                    order.driverId = null as any;
                    order.status = 'PENDING';
                    order.dispatchLogs = logs;
                    await orderRepository.save(order);
                    
                    if (io) io.emit('order_updated', order);
                }
            }
        }
    }
}
