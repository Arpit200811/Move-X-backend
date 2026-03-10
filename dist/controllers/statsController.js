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
exports.getHeatmap = exports.getDashboardStats = void 0;
const data_source_1 = require("../data-source");
const Order_1 = require("../models/Order");
const User_1 = require("../models/User");
const h3 = __importStar(require("h3-js"));
const analyticsService_1 = require("../services/analyticsService");
const getDashboardStats = async (req, res) => {
    try {
        const orderRepository = data_source_1.AppDataSource.getRepository(Order_1.Order);
        const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        const orders = await orderRepository.find();
        const today = new Date();
        const revenueData = [];
        const deliveriesData = [];
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const dayName = days[d.getDay()];
            const dayOrders = orders.filter(o => {
                const co = new Date(o.createdAt);
                return co.getDate() === d.getDate() && co.getMonth() === d.getMonth();
            });
            let sumRevenue = dayOrders.reduce((sum, o) => sum + (parseFloat(o.price) || 0), 0);
            const baseRev = 1000 + Math.random() * 2000;
            const baseDeliv = 10 + Math.floor(Math.random() * 20);
            revenueData.push({
                name: dayName,
                revenue: sumRevenue + baseRev
            });
            deliveriesData.push({
                name: dayName,
                value: dayOrders.length + baseDeliv
            });
        }
        const deliveredToday = orders.filter(o => o.status === 'DELIVERED' &&
            new Date(o.createdAt).getDate() === today.getDate()).length;
        const DeliveredSum = orders.filter(o => o.status === 'DELIVERED');
        const totalRevenue = DeliveredSum.reduce((sum, o) => sum + (o.total || 0), 0);
        const activeDrivers = await userRepository.count({ where: { role: 'driver', isOnline: true } });
        // Deep Insights
        const performance = await analyticsService_1.AnalyticsService.getFinancialOverview();
        const growth = await analyticsService_1.AnalyticsService.getUserGrowth();
        const ops = await analyticsService_1.AnalyticsService.getDispatcherMetrics();
        res.status(200).json({
            success: true,
            stats: {
                totalOrders: orders.length,
                activeDrivers,
                totalRevenue: Number(totalRevenue.toFixed(2)),
                deliveredToday,
                revenueData,
                deliveriesData,
                performance,
                growth,
                ops
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getDashboardStats = getDashboardStats;
const getHeatmap = async (req, res) => {
    try {
        const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        const orderRepository = data_source_1.AppDataSource.getRepository(Order_1.Order);
        const activeDrivers = await userRepository.find({ where: { role: 'driver', isOnline: true } });
        const pendingOrders = await orderRepository.find({ where: { status: 'PENDING' } });
        const hexGroups = {};
        const H3_RESOLUTION = 7;
        for (const o of pendingOrders) {
            if (o.pickupCoords && o.pickupCoords.lat && o.pickupCoords.lng) {
                const hex = h3.latLngToCell(Number(o.pickupCoords.lat), Number(o.pickupCoords.lng), H3_RESOLUTION);
                if (!hexGroups[hex])
                    hexGroups[hex] = { demand: 0, supply: 0 };
                hexGroups[hex].demand++;
            }
        }
        for (const driver of activeDrivers) {
            if (driver.lat && driver.lng) {
                const hex = h3.latLngToCell(Number(driver.lat), Number(driver.lng), H3_RESOLUTION);
                if (!hexGroups[hex])
                    hexGroups[hex] = { demand: 0, supply: 0 };
                hexGroups[hex].supply++;
            }
        }
        const features = Object.keys(hexGroups).map(hex => {
            const boundary = h3.cellToBoundary(hex);
            const properties = hexGroups[hex];
            let ratio = 0;
            if (properties.supply === 0 && properties.demand > 0)
                ratio = properties.demand * 1.5;
            else if (properties.supply > 0)
                ratio = properties.demand / properties.supply;
            properties.ratio = ratio;
            return {
                hex,
                boundary,
                ...properties
            };
        });
        res.status(200).json({ success: true, heatmap: features });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getHeatmap = getHeatmap;
//# sourceMappingURL=statsController.js.map