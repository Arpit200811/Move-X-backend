"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const data_source_1 = require("../data-source");
const AuditLog_1 = require("../models/AuditLog");
/**
 * AuditService — Event Sourcing Logger
 * Logs every significant state change for blackbox replay and dispute resolution.
 * Usage: AuditService.log('order', orderId, 'ORDER_CREATED', null, newOrder, { actorId: user._id })
 */
class AuditService {
    static async log(entityType, entityId, event, previousState = null, newState = null, context = {}) {
        try {
            const repo = data_source_1.AppDataSource.getRepository(AuditLog_1.AuditLog);
            const log = repo.create({
                entityType,
                entityId,
                event,
                previousState: previousState ? JSON.parse(JSON.stringify(previousState)) : undefined,
                newState: newState ? JSON.parse(JSON.stringify(newState)) : undefined,
                actorId: context.actorId || 'system',
                actorRole: context.actorRole || 'system',
                ipAddress: context.ipAddress || undefined,
                metadata: context.metadata || undefined,
            });
            await repo.save(log);
        }
        catch (e) {
            // Audit log MUST NOT crash the main flow
            console.error('[AUDIT LOG ERROR]', e.message);
        }
    }
    /**
     * Replay history for an entity (for dispute resolution)
     */
    static async getHistory(entityType, entityId) {
        const repo = data_source_1.AppDataSource.getRepository(AuditLog_1.AuditLog);
        return repo.find({
            where: { entityType, entityId },
            order: { createdAt: 'ASC' },
        });
    }
}
exports.AuditService = AuditService;
//# sourceMappingURL=auditService.js.map