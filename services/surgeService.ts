import { AppDataSource } from '../data-source';
import { Order } from '../models/Order';
import { User } from '../models/User';
import { Zone } from '../models/Zone';
import * as h3 from 'h3-js';
import { GeoFencingService } from './geoFencingService';

export const calculateSurgeMultiplier = async (pickupLat: any, pickupLng: any): Promise<{ multiplier: number, reasons: string[] }> => {
    const reasons: string[] = [];
    try {
        const orderRepository = AppDataSource.getRepository(Order);
        const userRepository = AppDataSource.getRepository(User);
        
        if (!pickupLat || !pickupLng || isNaN(Number(pickupLat)) || isNaN(Number(pickupLng))) {
           return { multiplier: 1.0, reasons: [] }; 
        }

        let multiplier = 1.0;

        // 1. Time-based Surge (Night/Peak Rush)
        const hour = new Date().getHours();
        if (hour >= 23 || hour < 4) {
            multiplier += 0.4;
            reasons.push('LATE_NIGHT_SURCHARGE');
        } else if ((hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 20)) {
            multiplier += 0.2;
            reasons.push('PEAK_HOUR_TRAFFIC');
        }

        // 2. Zone-based Base Multiplier
        const zone = await GeoFencingService.getZoneAtLocation(Number(pickupLat), Number(pickupLng));
        if (zone && zone.baseMultipler > 1.0) {
            multiplier *= zone.baseMultipler;
            reasons.push(`ZONE_PREMIUM_${zone.name.toUpperCase()}`);
        }

        // 3. H3 Real-time Demand/Supply
        const H3_RESOLUTION = 7; 
        const targetHex = h3.latLngToCell(Number(pickupLat), Number(pickupLng), H3_RESOLUTION);

        const pendingOrders = await orderRepository.find({ where: { status: 'PENDING' } });
        const availableDrivers = await userRepository.find({ where: { role: 'driver', isOnline: true, status: 'available' } });

        let localDemand = 0;
        for (const o of pendingOrders) {
             if (o.pickupCoords && (o.pickupCoords as any).lat && (o.pickupCoords as any).lng) {
                 const orderHex = h3.latLngToCell(Number((o.pickupCoords as any).lat), Number((o.pickupCoords as any).lng), H3_RESOLUTION);
                 if (orderHex === targetHex) localDemand++;
             }
        }

        let localSupply = 0;
        for (const driver of availableDrivers) {
            if (driver.lat && driver.lng) {
                 const driverHex = h3.latLngToCell(Number(driver.lat), Number(driver.lng), H3_RESOLUTION);
                 const isNear = h3.gridDistance(targetHex, driverHex) <= 1; 
                 if (isNear) localSupply++;
            }
        }

        if (localDemand > 0 && localSupply === 0) {
            multiplier += 0.6;
            reasons.push('ZERO_DRIVERS_IN_AREA');
        } else if (localSupply > 0) {
            const ratio = localDemand / localSupply;
            if (ratio > 3) { multiplier += 0.8; reasons.push('EXTREME_DEMAND'); }
            else if (ratio > 2) { multiplier += 0.5; reasons.push('HIGH_DEMAND'); }
            else if (ratio > 1) { multiplier += 0.2; reasons.push('MODERATE_DEMAND'); }
        }

        if (multiplier > 3.5) multiplier = 3.5;
        if (multiplier < 1.0) multiplier = 1.0;

        console.log(`[SURGE ENGINE] Hex: ${targetHex} | Multiplier: ${multiplier}x | Reasons: ${reasons.join(', ')}`);

        return { multiplier: Number(multiplier.toFixed(2)), reasons };
    } catch (error: any) {
        console.error('[SURGE ENGINE ERROR]:', error.message);
        return { multiplier: 1.0, reasons: [] }; 
    }
};
