"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProduct = exports.addProduct = exports.getMyProducts = exports.getVendors = void 0;
const data_source_1 = require("../data-source");
const Partner_1 = require("../models/Partner");
const Product_1 = require("../models/Product");
const getVendors = async (req, res) => {
    try {
        const type = req.query.type; // 'FOOD', 'PHARMACY'
        const partnerRepo = data_source_1.AppDataSource.getRepository(Partner_1.Partner);
        let query = partnerRepo.createQueryBuilder('partner')
            .leftJoinAndSelect('partner.products', 'product')
            .where('partner.status = :status', { status: 'Active' });
        if (type) {
            query = query.andWhere('partner.category = :category', { category: type });
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
        const partner = await partnerRepo.findOne({ where: { owner: { _id: req.user.id } }, relations: ['products'] });
        if (!partner)
            return res.status(404).json({ error: 'Partner not found' });
        return res.json({ products: partner.products });
    }
    catch (error) {
        return res.status(500).json({ error: 'Failed' });
    }
};
exports.getMyProducts = getMyProducts;
const addProduct = async (req, res) => {
    try {
        const { name, price, description, category, image } = req.body;
        const partnerRepo = data_source_1.AppDataSource.getRepository(Partner_1.Partner);
        const productRepo = data_source_1.AppDataSource.getRepository(Product_1.Product);
        const partner = await partnerRepo.findOne({ where: { owner: { _id: req.user.id } } });
        if (!partner)
            return res.status(404).json({ error: 'Partner not found' });
        const product = productRepo.create({
            name,
            price: parseFloat(price),
            description,
            category,
            image,
            vendor: partner
        });
        await productRepo.save(product);
        return res.json({ success: true, product });
    }
    catch (error) {
        return res.status(500).json({ error: 'Failed to add product' });
    }
};
exports.addProduct = addProduct;
const deleteProduct = async (req, res) => {
    try {
        const productRepo = data_source_1.AppDataSource.getRepository(Product_1.Product);
        const product = await productRepo.findOne({ where: { _id: req.params.productId }, relations: ['vendor', 'vendor.owner'] });
        if (!product || product.vendor.owner._id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        await productRepo.remove(product);
        return res.json({ success: true });
    }
    catch (error) {
        return res.status(500).json({ error: 'Failed to delete' });
    }
};
exports.deleteProduct = deleteProduct;
//# sourceMappingURL=vendorController.js.map