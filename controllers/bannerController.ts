import { Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { Banner } from '../models/Banner';

export const getBanners = async (req: Request, res: Response) => {
    try {
        const repo = AppDataSource.getRepository(Banner);
        const banners = await repo.find({ order: { priority: 'DESC' } });
        res.status(200).json({ success: true, banners });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createBanner = async (req: Request, res: Response) => {
    try {
        const repo = AppDataSource.getRepository(Banner);
        const banner = repo.create(req.body);
        await repo.save(banner);
        res.status(201).json({ success: true, banner });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteBanner = async (req: Request, res: Response) => {
    try {
        const repo = AppDataSource.getRepository(Banner);
        await repo.delete(req.params.id);
        res.status(200).json({ success: true });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
