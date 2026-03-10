"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const data_source_1 = require("../data-source");
const Order_1 = require("../models/Order");
const User_1 = require("../models/User");
const typeorm_1 = require("typeorm");
class AnalyticsService {
    /**
     * Aggregates deeply nested financial data for real-time dashboard.
     */
    static async getFinancialOverview() {
        const orderRepository = data_source_1.AppDataSource.getRepository(Order_1.Order);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const orders = await orderRepository.find({
            where: { status: 'DELIVERED', createdAt: (0, typeorm_1.Between)(thirtyDaysAgo, new Date()) },
            relations: ['partnerId']
        });
        const grossRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
        const deliveryFees = orders.reduce((sum, o) => sum + (o.deliveryFee || 0), 0);
        const platformCommission = deliveryFees * 0.10; // Platform takes 10% of delivery fee
        const driverEarnings = deliveryFees * 0.90;
        let merchantPayouts = 0;
        orders.forEach(o => {
            if (o.partnerId) {
                merchantPayouts += (o.itemsTotal || 0) * 0.90; // Mercahnt gets 90% of items
            }
        });
        const netProfit = platformCommission + (grossRevenue - deliveryFees - merchantPayouts * 1.11); // Simplified logic
        return {
            grossRevenue: grossRevenue.toFixed(2),
            netProfit: netProfit.toFixed(2),
            platformCommission: platformCommission.toFixed(2),
            driverEarnings: driverEarnings.toFixed(2),
            merchantPayouts: merchantPayouts.toFixed(2),
            transactionCount: orders.length
        };
    }
    /**
     * Calculates User Growth velocity.
     */
    static async getUserGrowth() {
        const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const totalUsers = await userRepository.count();
        const newUsers = await userRepository.count({
            where: { createdAt: (0, typeorm_1.Between)(sevenDaysAgo, new Date()) }
        });
        const growthRate = (newUsers / (totalUsers - newUsers || 1)) * 100;
        return {
            totalUsers,
            newUsersLast7Days: newUsers,
            growthRate: growthRate.toFixed(1) + '%'
        };
    }
    /**
     * Measures operational efficiency of the AI Dispatcher.
     */
    static async getDispatcherMetrics() {
        const orderRepository = data_source_1.AppDataSource.getRepository(Order_1.Order);
        const total = await orderRepository.count();
        const cancelled = await orderRepository.count({ where: { status: 'CANCELLED' } });
        const rejected = await orderRepository.count({ where: { status: 'REJECTED' } });
        const successRate = ((total - cancelled - rejected) / (total || 1)) * 100;
        return {
            totalMissions: total,
            cancellationRate: ((cancelled / (total || 1)) * 100).toFixed(1) + '%',
            abandonmentRate: ((rejected / (total || 1)) * 100).toFixed(1) + '%',
            successRate: successRate.toFixed(1) + '%'
        };
    }
}
exports.AnalyticsService = AnalyticsService;
//# sourceMappingURL=analyticsService.js.map