import { Response } from 'express';
import { AppDataSource } from '../data-source';
import { User } from '../models/User';
import { Order } from '../models/Order';
import * as h3 from 'h3-js';
import { AuthenticatedRequest } from '../config/authMiddleware';

export const getDrivers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const drivers = await userRepository.find({ where: { role: 'driver' } });
    res.status(200).json({ success: true, drivers });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateLocation = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { lat, lng } = req.body;
    const userRepository = AppDataSource.getRepository(User);
    const driver = await userRepository.findOne({ where: { _id: req.user?.id as string } });
    
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
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateLocationBatch = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { batch } = req.body; // Array of { lat, lng, timestamp }
        if (!Array.isArray(batch) || batch.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid batch data' });
        }

        const userRepository = AppDataSource.getRepository(User);
        const driver = await userRepository.findOne({ where: { _id: req.user?.id as string } });
        
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
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getDriverStats = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.id as string;
        const orderRepo = AppDataSource.getRepository(Order);
        const userRepo = AppDataSource.getRepository(User);
        
        const driver = await userRepo.findOne({ where: { _id: userId } });
        if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // 1. Total Earnings & Completion
        const orders = await orderRepo.find({ 
            where: { driverId: { _id: userId } as any, status: 'DELIVERED' } 
        });

        const totalEarnings = orders.reduce((sum, o) => sum + (o.total || 0), 0);
        const todayOrders = orders.filter(o => o.createdAt >= startOfToday);
        const todayEarnings = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        
        const monthOrders = orders.filter(o => o.createdAt >= startOfMonth);
        const monthEarnings = monthOrders.reduce((sum, o) => sum + (o.total || 0), 0);

        // 2. Acceptance Rate (Conceptual logic using history)
        // In a real app we'd track ALL requests. Here we use finished vs total ever assigned.
        const totalAssigned = await orderRepo.count({ where: { driverId: { _id: userId } as any } });
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
        } else if (driver.tier === 'gold') {
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
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getSurgeHeatmap = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const orderRepository = AppDataSource.getRepository(Order);
        const pendingOrders = await orderRepository.find({ where: { status: 'PENDING' } });

        const heatmap: Record<string, any> = {};
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
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getVRPBatches = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { VRPService } = await import('../services/vrpService');
        const driverId = req.user?.id as string;
        const batches = await VRPService.generateOptimalBatch(driverId);
        res.status(200).json({ success: true, batches });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const acceptVRPBatch = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { orderIds } = req.body;
        const { VRPService } = await import('../services/vrpService');
        const driverId = req.user?.id as string;
        const orders = await VRPService.deployBatch(driverId, orderIds, req.io);
        res.status(200).json({ success: true, orders });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
