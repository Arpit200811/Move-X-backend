"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProduct = exports.updateProduct = exports.addProduct = exports.getMyProducts = exports.getVendors = void 0;
const data_source_1 = require("../data-source");
const Partner_1 = require("../models/Partner");
const Product_1 = require("../models/Product");
const getVendors = async (req, res) => {
    try {
        let type = (req.query.type || '').toUpperCase(); // 'FOOD', 'PHARMACY', 'GROCERY'
        const partnerRepo = data_source_1.AppDataSource.getRepository(Partner_1.Partner);
        let query = partnerRepo.createQueryBuilder('partner')
            .leftJoinAndSelect('partner.products', 'product')
            .where('partner.status = :status', { status: 'Active' });
        if (type) {
            let categoryToFetch = type;
            if (type === 'FOOD')
                categoryToFetch = 'Restaurant';
            if (type === 'GROCERY')
                categoryToFetch = 'Supermarket';
            // Case-insensitive comparison using ILIKE or UPPER
            query = query.andWhere('UPPER(partner.category) = UPPER(:category)', { category: categoryToFetch });
        }
        const vendors = await query.getMany();
        return res.json({ vendors });
    }
    catch (error) {
        console.error('getVendors error:', error);
        return res.status(500).json({ error: 'Failed to fetch vendors' });
    }
};
exports.getVendors = getVendors;
const getMyProducts = async (req, res) => {
    try {
        const partnerRepo = data_source_1.AppDataSource.getRepository(Partner_1.Partner);
        const userId = req.user.id;
        const partner = await partnerRepo.findOne({
            where: { owner: { _id: userId } },
            relations: ['products']
        });
        if (!partner)
            return res.status(404).json({ error: 'Partner not found for this node.' });
        return res.json({ products: partner.products });
    }
    catch (error) {
        console.error('getMyProducts error:', error);
        return res.status(500).json({ error: 'Failed' });
    }
};
exports.getMyProducts = getMyProducts;
const addProduct = async (req, res) => {
    try {
        const { name, price, description, category, image } = req.body;
        const partnerRepo = data_source_1.AppDataSource.getRepository(Partner_1.Partner);
        const productRepo = data_source_1.AppDataSource.getRepository(Product_1.Product);
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
    }
    catch (error) {
        console.error('addProduct error:', error);
        return res.status(500).json({ error: 'System processing failure: Failed to sync product node.' });
    }
};
exports.addProduct = addProduct;
const updateProduct = async (req, res) => {
    try {
        const { productId } = req.params;
        const { name, price, description, category, image, isAvailable, outOfStockForToday, customizationOptions } = req.body;
        const productRepo = data_source_1.AppDataSource.getRepository(Product_1.Product);
        const product = await productRepo.findOne({
            where: { _id: productId },
            relations: ['vendor', 'vendor.owner']
        });
        if (!product || product.vendor.owner._id !== req.user.id) {
            return res.status(403).json({ error: 'Permission Denied: Identity mismatch for this merchandise node.' });
        }
        if (name !== undefined)
            product.name = name;
        if (price !== undefined)
            product.price = parseFloat(price) || 0;
        if (description !== undefined)
            product.description = description;
        if (category !== undefined)
            product.category = category;
        if (image !== undefined)
            product.image = image;
        if (isAvailable !== undefined)
            product.isAvailable = isAvailable;
        if (outOfStockForToday !== undefined)
            product.outOfStockForToday = outOfStockForToday;
        if (customizationOptions !== undefined)
            product.customizationOptions = customizationOptions;
        await productRepo.save(product);
        console.log(`[CATALOG_SYNC] Successfully updated "${product.name}"`);
        return res.json({ success: true, product });
    }
    catch (error) {
        console.error('updateProduct error:', error);
        return res.status(500).json({ error: 'Failed to sync product updates.' });
    }
};
exports.updateProduct = updateProduct;
const deleteProduct = async (req, res) => {
    try {
        const { productId } = req.params;
        const productRepo = data_source_1.AppDataSource.getRepository(Product_1.Product);
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
    }
    catch (error) {
        console.error('deleteProduct error:', error);
        return res.status(500).json({ error: 'Purge operation failed.' });
    }
};
exports.deleteProduct = deleteProduct;
//# sourceMappingURL=vendorController.js.map