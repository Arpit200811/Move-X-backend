import { AppDataSource } from '../data-source';
import { AuditLog } from '../models/AuditLog';

export class MissionAuditService {
    /**
     * Records a secure entry in the mission blackbox
     */
    static async record(params: {
        entityType: 'order' | 'user' | 'payout' | 'refund' | 'system';
        entityId: string;
        event: string;
        previousState?: any;
        newState?: any;
        metadata?: any;
        actorId?: string;
        actorRole?: string;
        ipAddress?: string;
    }) {
        try {
            const auditRepo = AppDataSource.getRepository(AuditLog);
            const log = auditRepo.create({
                ...params,
                createdAt: new Date()
            });
            await auditRepo.save(log);
            console.log(`[AUDIT] Persistence Secured for Mission: ${params.entityId} [${params.event}]`);
        } catch (err: any) {
            console.error('[AUDIT FAILURE] Non-critical mission telemetry lost:', err.message);
        }
    }

    /**
     * Summarizes transaction history for a specific mission
     */
    static async getMissionHistory(entityId: string) {
        const auditRepo = AppDataSource.getRepository(AuditLog);
        return await auditRepo.find({
            where: { entityId },
            order: { createdAt: 'DESC' }
        });
    }
}
