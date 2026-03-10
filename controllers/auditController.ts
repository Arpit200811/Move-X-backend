import { Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { AuditLog } from '../models/AuditLog';

export const getAuditLogs = async (req: Request, res: Response) => {
    try {
        const repo = AppDataSource.getRepository(AuditLog);
        const logs = await repo.find({
            order: { createdAt: 'DESC' },
            take: 200,
            relations: ['user']
        });
        res.status(200).json({ success: true, logs });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createAuditLog = async (actorId: string, action: string, metadata: any) => {
    try {
        const repo = AppDataSource.getRepository(AuditLog);
        const log = repo.create({
            actorId,
            event: action,
            metadata,
            entityType: metadata.entityType || 'system',
            entityId: metadata.entityId || '0'
        });
        await repo.save(log);
    } catch (error) {
        console.error("Audit log failed to save", error);
    }
};
