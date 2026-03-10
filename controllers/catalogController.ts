import { Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { Product } from '../models/Product';

export const getAllProducts = async (req: Request, res: Response) => {
    try {
        const repo = AppDataSource.getRepository(Product);
        const products = await repo.find({
            relations: ['vendor'],
            order: { createdAt: 'DESC' }
        });
        res.json({ success: true, products });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const updateProductAdmin = async (req: Request, res: Response) => {
    try {
        const repo = AppDataSource.getRepository(Product);
        await repo.update(req.params.id, req.body);
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const deleteProductAdmin = async (req: Request, res: Response) => {
    try {
        const repo = AppDataSource.getRepository(Product);
        await repo.delete(req.params.id);
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};
