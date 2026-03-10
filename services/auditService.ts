import { AppDataSource } from '../data-source';
import { AuditLog } from '../models/AuditLog';

/**
 * AuditService — Event Sourcing Logger
 * Logs every significant state change for blackbox replay and dispute resolution.
 * Usage: AuditService.log('order', orderId, 'ORDER_CREATED', null, newOrder, { actorId: user._id })
 */
export class AuditService {
    static async log(
        entityType: string,
        entityId: string,
        event: string,
        previousState: any = null,
        newState: any = null,
        context: { actorId?: string; actorRole?: string; ipAddress?: string; metadata?: any } = {}
    ) {
        try {
            const repo = AppDataSource.getRepository(AuditLog);
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
            } as any);
            await repo.save(log);
        } catch (e: any) {
            // Audit log MUST NOT crash the main flow
            console.error('[AUDIT LOG ERROR]', e.message);
        }
    }

    /**
     * Replay history for an entity (for dispute resolution)
     */
    static async getHistory(entityType: string, entityId: string) {
        const repo = AppDataSource.getRepository(AuditLog);
        return repo.find({
            where: { entityType, entityId },
            order: { createdAt: 'ASC' },
        });
    }
}
