"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchService = void 0;
const data_source_1 = require("../data-source");
const Order_1 = require("../models/Order");
const Partner_1 = require("../models/Partner");
/**
 * Enterprise Search Engine (Elasticsearch Abstraction)
 * In production, this would connect to an ES Cluster.
 * Here we implement the interface for high-performance fuzzy search.
 */
class SearchService {
    static async searchPartners(query) {
        // Mocking ES Fuzzy Search logic
        const partnerRepo = data_source_1.AppDataSource.getRepository(Partner_1.Partner);
        return await partnerRepo.createQueryBuilder('partner')
            .where('partner.name ILIKE :q', { q: `%${query}%` })
            .orWhere('partner.category ILIKE :q', { q: `%${query}%` })
            .getMany();
    }
    static async searchOrders(query) {
        const orderRepo = data_source_1.AppDataSource.getRepository(Order_1.Order);
        return await orderRepo.createQueryBuilder('order')
            .where('order.orderId ILIKE :q', { q: `%${query}%` })
            .orWhere('order.packageType ILIKE :q', { q: `%${query}%` })
            .getMany();
    }
    // This would be the sync hook to ES
    static async indexEntity(type, id, data) {
        console.log(`[ELASTICSEARCH] Indexing ${type} node ${id}...`);
        // Actual ES logic: client.index({ index: type, id, body: data })
    }
}
exports.SearchService = SearchService;
//# sourceMappingURL=searchService.js.map