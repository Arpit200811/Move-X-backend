"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedPartners = exports.updatePartnerSettings = exports.deletePartner = exports.updatePartner = exports.addPartner = exports.getPartners = void 0;
const data_source_1 = require("../data-source");
const Partner_1 = require("../models/Partner");
const User_1 = require("../models/User");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const getPartners = async (req, res) => {
    try {
        const partnerRepository = data_source_1.AppDataSource.getRepository(Partner_1.Partner);
        const partners = await partnerRepository.find({ relations: ['owner'] });
        res.status(200).json({ success: true, partners });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getPartners = getPartners;
const addPartner = async (req, res) => {
    try {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Clearance Denied: Admin Authorization Required.' });
        }
        const { name, category, email, phone, password } = req.body;
        const partnerRepository = data_source_1.AppDataSource.getRepository(Partner_1.Partner);
        const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        // 1. Check if user already exists
        const existingUser = await userRepository.findOne({ where: { phone } });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Identity Conflict: Phone number already linked to a node.' });
        }
        // 2. Create Login Identity (User)
        const passwordHash = await bcryptjs_1.default.hash(password || 'partner123', 10);
        const user = userRepository.create({
            phone,
            name,
            role: 'partner',
            passwordHash,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
            status: 'active',
            isOnline: false
        });
        await userRepository.save(user);
        // 3. Create Partner Profile linked to User
        const partner = partnerRepository.create({
            name,
            category,
            email,
            status: 'Active',
            revenue: 0,
            orders: 0,
            owner: user
        });
        await partnerRepository.save(partner);
        res.status(201).json({ success: true, partner, user: { phone, role: 'partner' } });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.addPartner = addPartner;
const updatePartner = async (req, res) => {
    try {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }
        const partnerRepository = data_source_1.AppDataSource.getRepository(Partner_1.Partner);
        const partner = await partnerRepository.findOne({ where: { _id: req.params.id } });
        if (!partner)
            return res.status(404).json({ success: false, message: 'Partner not found' });
        Object.assign(partner, req.body);
        await partnerRepository.save(partner);
        res.status(200).json({ success: true, partner });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updatePartner = updatePartner;
const deletePartner = async (req, res) => {
    try {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }
        const partnerRepository = data_source_1.AppDataSource.getRepository(Partner_1.Partner);
        const partner = await partnerRepository.findOne({ where: { _id: req.params.id } });
        if (!partner)
            return res.status(404).json({ success: false, message: 'Partner not found' });
        await partnerRepository.remove(partner);
        res.status(200).json({ success: true, message: 'Partner removed' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.deletePartner = deletePartner;
const updatePartnerSettings = async (req, res) => {
    try {
        const partnerRepository = data_source_1.AppDataSource.getRepository(Partner_1.Partner);
        const partner = await partnerRepository.findOne({ where: { owner: { _id: req.user?.id } } });
        if (!partner)
            return res.status(404).json({ success: false, message: 'Partner node not found.' });
        const { autoAccept, isAcceptingOrders } = req.body;
        if (autoAccept !== undefined)
            partner.autoAccept = autoAccept;
        if (isAcceptingOrders !== undefined)
            partner.isAcceptingOrders = isAcceptingOrders;
        await partnerRepository.save(partner);
        res.status(200).json({ success: true, partner });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updatePartnerSettings = updatePartnerSettings;
const seedPartners = async (req, res) => {
    try {
        const partnerRepository = data_source_1.AppDataSource.getRepository(Partner_1.Partner);
        const existing = await partnerRepository.count();
        if (existing > 0)
            return res.status(400).json({ success: false, message: 'Database already has partners seeded.' });
        const seedData = [
            { name: 'Global Eats', category: 'Restaurant', email: 'hello@globaleats.com', revenue: 14500, orders: 420 },
            { name: 'EuroMed Pharmacy', category: 'Pharmacy', email: 'rx@euromed.eu', revenue: 8900, orders: 156 },
            { name: 'Safari Groceries', category: 'Supermarket', email: 'inventory@safari.com', revenue: 22000, orders: 890 },
            { name: 'Amharic Delights', category: 'Restaurant', email: 'chef@amharic.et', revenue: 3400, orders: 112 },
            { name: 'Mumbai Spice', category: 'Restaurant', email: 'orders@mumbaispice.in', revenue: 12100, orders: 345 },
            { name: 'Swahili Bites', category: 'Restaurant', email: 'karibu@swahilibites.ke', revenue: 5600, orders: 280 },
            { name: 'Berlin Apotheke', category: 'Pharmacy', email: 'service@berlinapo.de', revenue: 15700, orders: 310 },
            { name: 'Parisian Bistro', category: 'Restaurant', email: 'contact@bistro.fr', revenue: 9800, orders: 190 },
            { name: 'Lagos Fresh Market', category: 'Supermarket', email: 'sales@lagosfresh.ng', revenue: 31000, orders: 1100 },
            { name: 'Cairo Corner Shoppe', category: 'Supermarket', email: 'yalla@cairoshop.eg', revenue: 7200, orders: 240 },
            { name: 'Johannesburg Health', category: 'Pharmacy', email: 'support@jhbhealth.za', revenue: 6400, orders: 95 },
            { name: 'Dubai Luxury Foods', category: 'Restaurant', email: 'vip@dubailux.ae', revenue: 45000, orders: 120 }
        ];
        const partners = partnerRepository.create(seedData);
        await partnerRepository.save(partners);
        res.status(200).json({ success: true, message: 'Partners seeded successfully', count: partners.length });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.seedPartners = seedPartners;
//# sourceMappingURL=partnerController.js.map