import { AppDataSource } from '../data-source';
import { User } from '../models/User';
import { Order } from '../models/Order';
import { Partner } from '../models/Partner';

/**
 * Enterprise Search Engine (Elasticsearch Abstraction)
 * In production, this would connect to an ES Cluster.
 * Here we implement the interface for high-performance fuzzy search.
 */
export class SearchService {
    static async searchPartners(query: string) {
        // Mocking ES Fuzzy Search logic
        const partnerRepo = AppDataSource.getRepository(Partner);
        return await partnerRepo.createQueryBuilder('partner')
            .where('partner.name ILIKE :q', { q: `%${query}%` })
            .orWhere('partner.category ILIKE :q', { q: `%${query}%` })
            .getMany();
    }

    static async searchOrders(query: string) {
        const orderRepo = AppDataSource.getRepository(Order);
        return await orderRepo.createQueryBuilder('order')
            .where('order.orderId ILIKE :q', { q: `%${query}%` })
            .orWhere('order.packageType ILIKE :q', { q: `%${query}%` })
            .getMany();
    }

    // This would be the sync hook to ES
    static async indexEntity(type: 'order' | 'partner' | 'user', id: string, data: any) {
        console.log(`[ELASTICSEARCH] Indexing ${type} node ${id}...`);
        // Actual ES logic: client.index({ index: type, id, body: data })
    }
}
