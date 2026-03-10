import { Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { Partner } from '../models/Partner';
import { Product } from '../models/Product';

export const getVendors = async (req: Request, res: Response) => {
    try {
        let type = (req.query.type as string || '').toUpperCase(); // 'FOOD', 'PHARMACY', 'GROCERY'
        
        const partnerRepo = AppDataSource.getRepository(Partner);
        
        let query = partnerRepo.createQueryBuilder('partner')
            .leftJoinAndSelect('partner.products', 'product')
            .where('partner.status = :status', { status: 'Active' });

        if (type) {
            let categoryToFetch = type;
            if (type === 'FOOD') categoryToFetch = 'Restaurant';
            if (type === 'GROCERY') categoryToFetch = 'Supermarket';
            
            // Case-insensitive comparison using ILIKE or UPPER
            query = query.andWhere('UPPER(partner.category) = UPPER(:category)', { category: categoryToFetch });
        }

        const vendors = await query.getMany();
        
        return res.json({ vendors });
    } catch (error) {
        console.error('getVendors error:', error);
        return res.status(500).json({ error: 'Failed to fetch vendors' });
    }
};

export const getMyProducts = async (req: any, res: Response) => {
    try {
        const partnerRepo = AppDataSource.getRepository(Partner);
        const userId = req.user.id;
        const partner = await partnerRepo.findOne({ 
            where: { owner: { _id: userId } }, 
            relations: ['products'] 
        });
        
        if (!partner) return res.status(404).json({ error: 'Partner not found for this node.' });
        return res.json({ products: partner.products });
    } catch (error) {
        console.error('getMyProducts error:', error);
        return res.status(500).json({ error: 'Failed' });
    }
};

export const addProduct = async (req: any, res: Response) => {
    try {
        const { name, price, description, category, image } = req.body;
        const partnerRepo = AppDataSource.getRepository(Partner);
        const productRepo = AppDataSource.getRepository(Product);
        
        const userId = req.user.id;
        const partner = await partnerRepo.findOne({ where: { owner: { _id: userId } } });
        
        if (!partner) {
            console.error(`[VENDOR_ERROR] Partner not found for User ID: ${userId}`);
            return res.status(404).json({ error: 'Merchant Identity Not Found. Please link your store first.' });
        }

        const product = productRepo.create({
            name,
            price: parseFloat(price) || 0,
            description: description || '',
            category: category || 'General',
            image: image || null,
            vendor: partner
        });
        
        await productRepo.save(product);
        console.log(`[CATALOG_SYNC] Successfully added "${name}" for partner "${partner.name}"`);
        
        return res.json({ success: true, product });
    } catch (error: any) {
        console.error('addProduct error:', error);
        return res.status(500).json({ error: 'System processing failure: Failed to sync product node.' });
    }
};

export const updateProduct = async (req: any, res: Response) => {
    try {
        const { productId } = req.params;
        const { name, price, description, category, image, isAvailable, outOfStockForToday, customizationOptions } = req.body;
        const productRepo = AppDataSource.getRepository(Product);
        
        const product = await productRepo.findOne({ 
            where: { _id: productId }, 
            relations: ['vendor', 'vendor.owner'] 
        });

        if (!product || product.vendor.owner._id !== req.user.id) {
            return res.status(403).json({ error: 'Permission Denied: Identity mismatch for this merchandise node.' });
        }

        if (name !== undefined) product.name = name;
        if (price !== undefined) product.price = parseFloat(price) || 0;
        if (description !== undefined) product.description = description;
        if (category !== undefined) product.category = category;
        if (image !== undefined) product.image = image;
        if (isAvailable !== undefined) product.isAvailable = isAvailable;
        if (outOfStockForToday !== undefined) product.outOfStockForToday = outOfStockForToday;
        if (customizationOptions !== undefined) product.customizationOptions = customizationOptions;

        await productRepo.save(product);
        console.log(`[CATALOG_SYNC] Successfully updated "${product.name}"`);
        
        return res.json({ success: true, product });
    } catch (error: any) {
        console.error('updateProduct error:', error);
        return res.status(500).json({ error: 'Failed to sync product updates.' });
    }
};

export const deleteProduct = async (req: any, res: Response) => {
    try {
        const { productId } = req.params;
        const productRepo = AppDataSource.getRepository(Product);
        
        const product = await productRepo.findOne({ 
            where: { _id: productId }, 
            relations: ['vendor', 'vendor.owner'] 
        });

        if (!product || product.vendor.owner._id !== req.user.id) {
            return res.status(403).json({ error: 'Termination Rejected: Unauthorized access to this merchandise node.' });
        }

        await productRepo.remove(product);
        console.log(`[CATALOG_SYNC] Product purged: ${productId}`);
        
        return res.json({ success: true, message: 'Node deleted successfully.' });
    } catch (error: any) {
        console.error('deleteProduct error:', error);
        return res.status(500).json({ error: 'Purge operation failed.' });
    }
};
