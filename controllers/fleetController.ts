import { Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { VehicleType } from '../models/VehicleType';

export const getVehicleTypes = async (req: Request, res: Response) => {
    try {
        const repo = AppDataSource.getRepository(VehicleType);
        const types = await repo.find();
        res.json({ success: true, types });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const createVehicleType = async (req: Request, res: Response) => {
    try {
        const repo = AppDataSource.getRepository(VehicleType);
        const type = repo.create(req.body);
        await repo.save(type);
        res.json({ success: true, type });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const updateVehicleType = async (req: Request, res: Response) => {
    try {
        const repo = AppDataSource.getRepository(VehicleType);
        await repo.update(req.params.id, req.body);
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const deleteVehicleType = async (req: Request, res: Response) => {
    try {
        const repo = AppDataSource.getRepository(VehicleType);
        await repo.delete(req.params.id);
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};
