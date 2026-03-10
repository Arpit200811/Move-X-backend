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
exports.calculateSurgeMultiplier = void 0;
const data_source_1 = require("../data-source");
const Order_1 = require("../models/Order");
const User_1 = require("../models/User");
const h3 = __importStar(require("h3-js"));
const geoFencingService_1 = require("./geoFencingService");
const calculateSurgeMultiplier = async (pickupLat, pickupLng) => {
    const reasons = [];
    try {
        const orderRepository = data_source_1.AppDataSource.getRepository(Order_1.Order);
        const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        if (!pickupLat || !pickupLng || isNaN(Number(pickupLat)) || isNaN(Number(pickupLng))) {
            return { multiplier: 1.0, reasons: [] };
        }
        let multiplier = 1.0;
        // 1. Time-based Surge (Night/Peak Rush)
        const hour = new Date().getHours();
        if (hour >= 23 || hour < 4) {
            multiplier += 0.4;
            reasons.push('LATE_NIGHT_SURCHARGE');
        }
        else if ((hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 20)) {
            multiplier += 0.2;
            reasons.push('PEAK_HOUR_TRAFFIC');
        }
        // 2. Zone-based Base Multiplier
        const zone = await geoFencingService_1.GeoFencingService.getZoneAtLocation(Number(pickupLat), Number(pickupLng));
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
            if (o.pickupCoords && o.pickupCoords.lat && o.pickupCoords.lng) {
                const orderHex = h3.latLngToCell(Number(o.pickupCoords.lat), Number(o.pickupCoords.lng), H3_RESOLUTION);
                if (orderHex === targetHex)
                    localDemand++;
            }
        }
        let localSupply = 0;
        for (const driver of availableDrivers) {
            if (driver.lat && driver.lng) {
                const driverHex = h3.latLngToCell(Number(driver.lat), Number(driver.lng), H3_RESOLUTION);
                const isNear = h3.gridDistance(targetHex, driverHex) <= 1;
                if (isNear)
                    localSupply++;
            }
        }
        if (localDemand > 0 && localSupply === 0) {
            multiplier += 0.6;
            reasons.push('ZERO_DRIVERS_IN_AREA');
        }
        else if (localSupply > 0) {
            const ratio = localDemand / localSupply;
            if (ratio > 3) {
                multiplier += 0.8;
                reasons.push('EXTREME_DEMAND');
            }
            else if (ratio > 2) {
                multiplier += 0.5;
                reasons.push('HIGH_DEMAND');
            }
            else if (ratio > 1) {
                multiplier += 0.2;
                reasons.push('MODERATE_DEMAND');
            }
        }
        if (multiplier > 3.5)
            multiplier = 3.5;
        if (multiplier < 1.0)
            multiplier = 1.0;
        console.log(`[SURGE ENGINE] Hex: ${targetHex} | Multiplier: ${multiplier}x | Reasons: ${reasons.join(', ')}`);
        return { multiplier: Number(multiplier.toFixed(2)), reasons };
    }
    catch (error) {
        console.error('[SURGE ENGINE ERROR]:', error.message);
        return { multiplier: 1.0, reasons: [] };
    }
};
exports.calculateSurgeMultiplier = calculateSurgeMultiplier;
//# sourceMappingURL=surgeService.js.map