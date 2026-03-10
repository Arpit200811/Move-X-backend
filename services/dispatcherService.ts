import { AppDataSource } from '../data-source';
import { User } from '../models/User';
import { Order } from '../models/Order';
import { sendNotification } from './notificationService';
import { In } from 'typeorm';
import { Server } from 'socket.io';

export class DispatcherService {
    /**
     * Finds the best available driver and ASSIGNS them to the order.
     * Note: This does NOT mark as ACCEPTED. The driver must accept.
     */
    static async findBestDriver(order: Order, io?: Server) {
        const userRepository = AppDataSource.getRepository(User);
        const orderRepository = AppDataSource.getRepository(Order);

        // Core Dispatch configurations
        const configs: Record<string, { maxRadius: number, minRating: number }> = {
            'Economy': { maxRadius: 5, minRating: 0 },
            'Comfort': { maxRadius: 8, minRating: 4.0 },
            'Business': { maxRadius: 12, minRating: 4.5 }
        };

        const config = configs[order.serviceClass as string] || configs['Economy'];
        const logs: any[] = order.dispatchLogs || [];

        const log = (msg: string) => {
            const entry = { timestamp: new Date(), message: msg };
            logs.push(entry);
            if (io) io.emit('dispatch_log', { orderId: order._id, ...entry });
        };

        log(`AI Dispatcher [v2.5]: Protocol ${order.serviceClass} sweep initiated...`);
        
        const pLat = (order.pickupCoords as any)?.lat;
        const pLng = (order.pickupCoords as any)?.lng;

        if (!pLat || !pLng) {
            log('Mission Failed: Telemetry loss (no pickup coordinates).');
            return null;
        }

        const retryCount = (order as any).retryCount || 0;
        if (retryCount >= 5) {
            log('Mission Protocol Aborted: Failure Threshold Reached (5 Retries).');
            order.status = 'REJECTED';
            if (order.paymentStatus === 'paid' && order.paymentMethod === 'Wallet') {
                const userRepository = AppDataSource.getRepository(User);
                await userRepository.increment({ _id: (order.customerId as any)._id }, 'walletBalance', order.total);
            }
            await orderRepository.save(order);
            sendNotification(order.customerId?._id as string, 'Mission Aborted', 'No pilots available in sector. Refund processed.', { orderId: order._id });
            return null;
        }

        // ── Step 1: Search for candidates
        const radiusMeters = config.maxRadius * 1000;
        let candidates = [];
        try {
            candidates = await userRepository.query(`
                SELECT *,
                  ROUND((ST_DistanceSphere(ST_MakePoint(lng, lat), ST_MakePoint($2, $1)) / 1000)::numeric, 2) AS "distanceKm"
                FROM users
                WHERE role = 'driver'
                  AND "isOnline" = true
                  AND "isSuspended" = false
                  AND status = 'available'
                  AND lat IS NOT NULL
                  AND lng IS NOT NULL
                  AND ST_DistanceSphere(ST_MakePoint(lng, lat), ST_MakePoint($2, $1)) <= $3
                ORDER BY "distanceKm" ASC
            `, [pLat, pLng, radiusMeters]);
        } catch (e: any) {
            // Haversine Fallback if PostGIS fails
            const radiusKm = config.maxRadius;
            candidates = await userRepository.query(`
                SELECT *,
                  ROUND((6371 * acos(cos(radians($1)) * cos(radians(lat)) * cos(radians(lng) - radians($2)) + sin(radians($1)) * sin(radians(lat))))::numeric, 2) AS "distanceKm"
                FROM users
                WHERE role = 'driver'
                  AND "isOnline" = true
                  AND "isSuspended" = false
                  AND status = 'available'
                  AND lat IS NOT NULL
                  AND lng IS NOT NULL
                  AND (6371 * acos(cos(radians($1)) * cos(radians(lat)) * cos(radians(lng) - radians($2)) + sin(radians($1)) * sin(radians(lat)))) <= $3
                ORDER BY "distanceKm" ASC
            `, [pLat, pLng, radiusKm]);
        }

        // ── Step 2: Expand Search if no locals found
        if (candidates.length === 0) {
            const expRadiusKm = config.maxRadius * 2;
            log(`Expanding scanning radius to ${expRadiusKm}km...`);
            candidates = await userRepository.query(`
                SELECT *,
                  ROUND((6371 * acos(cos(radians($1)) * cos(radians(lat)) * cos(radians(lng) - radians($2)) + sin(radians($1)) * sin(radians(lat))))::numeric, 2) AS "distanceKm"
                FROM users
                WHERE role = 'driver' AND "isOnline" = true AND "isSuspended" = false
                  AND status = 'available' AND lat IS NOT NULL AND lng IS NOT NULL
                  AND (6371 * acos(cos(radians($1)) * cos(radians(lat)) * cos(radians(lng) - radians($2)) + sin(radians($1)) * sin(radians(lat)))) <= $3
                ORDER BY "distanceKm" ASC LIMIT 5
            `, [pLat, pLng, expRadiusKm]);
        }

        if (candidates.length === 0) {
            log('No nodes currently matches mission parameters.');
            order.dispatchLogs = logs;
            await orderRepository.save(order);
            return null;
        }

        // ── Step 3: Rank Candidates (AI Scoring)
        const scored = (await Promise.all(candidates.map(async (row: any) => {
            const driver = userRepository.create(row as User);
            let score = 100;

            // Distance Penalty
            score -= (row.distanceKm / (config.maxRadius * 2)) * 50; 
            // Rating Bonus
            score += (driver.rating - 3) * 10;
            // Balance Penalty (prefer low balance drivers to give them work)
            score -= (driver.walletBalance / 500) * 5;

            return { driver, score, distance: row.distanceKm };
        }))).sort((a, b) => b.score - a.score);

        const best = scored[0].driver;
        log(`Mission Assigned: Target ${best.name} (Dist: ${scored[0].distance}km, Score: ${scored[0].score.toFixed(0)})`);

        // ── Step 4: Update Order with Assignment
        order.driverId = { _id: best._id } as any;
        order.status = 'ASSIGNED'; // New critical state
        if (!order.timeline) order.timeline = [];
        order.timeline.push({ status: 'ASSIGNED', timestamp: new Date(), driverId: best._id });
        order.dispatchLogs = logs;

        await orderRepository.save(order);
        
        // Mark driver as 'busy-pending' effectively via status or lock
        // For now we keep them 'available' so they show up, but we notify them
        
        sendNotification(best._id, 'Mission Request', `New ${order.serviceClass} mission available. Accept now!`, { orderId: order._id, type: 'MISSION_ASSIGNED' });
        
        if (io) io.emit('order_updated', order);
        if (io) io.to(best._id).emit('mission_request', order);

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
