import { Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { Zone } from '../models/Zone';

export const getSurgeConfig = async (req: Request, res: Response) => {
    try {
        const repo = AppDataSource.getRepository(Zone);
        const zones = await repo.find();
        // Extract multipliers
        const surge = zones.map(z => ({
            zoneId: z._id,
            name: z.name,
            multiplier: z.baseMultiplier || 1.0,
            status: (z.baseMultiplier || 1.0) > 1.0 ? 'ACTIVE' : 'NORMAL'
        }));
        res.json({ success: true, surge });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const updateSurge = async (req: Request, res: Response) => {
    try {
        const { zoneId, multiplier } = req.body;
        const repo = AppDataSource.getRepository(Zone);
        await repo.update(zoneId, { baseMultiplier: multiplier });
        res.json({ success: true, message: `Surge set to ${multiplier}x for zone` });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const updateGlobalSurge = async (req: Request, res: Response) => {
    try {
        const { multiplier } = req.body;
        const repo = AppDataSource.getRepository(Zone);
        await repo.createQueryBuilder()
            .update(Zone)
            .set({ baseMultiplier: multiplier })
            .execute();
        res.json({ success: true, message: `Global surge set to ${multiplier}x` });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};
