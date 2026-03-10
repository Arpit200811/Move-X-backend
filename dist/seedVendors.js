"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const data_source_1 = require("./data-source");
const Partner_1 = require("./models/Partner");
const Product_1 = require("./models/Product");
const seedVendors = async () => {
    try {
        await data_source_1.AppDataSource.initialize();
        console.log('DB Connected for Seeding...');
        const partnerRepo = data_source_1.AppDataSource.getRepository(Partner_1.Partner);
        const productRepo = data_source_1.AppDataSource.getRepository(Product_1.Product);
        // Clear existing vendors
        await data_source_1.AppDataSource.query('TRUNCATE TABLE products CASCADE;');
        await data_source_1.AppDataSource.query('TRUNCATE TABLE partners CASCADE;');
        console.log('Cleared existing catalog.');
        // FOOD VENDORS
        const truffles = partnerRepo.create({
            name: 'Truffles',
            category: 'FOOD',
            email: 'truffles@test.com',
            image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=600&auto=format&fit=crop',
            rating: 4.8,
            deliveryTime: '25 min',
            tags: ['Burger', 'American'],
            isAcceptingOrders: true
        });
        const meghana = partnerRepo.create({
            name: 'Meghana Foods',
            category: 'FOOD',
            email: 'meghana@test.com',
            image: 'https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?q=80&w=600&auto=format&fit=crop',
            rating: 4.6,
            deliveryTime: '35 min',
            tags: ['Biryani', 'South Indian'],
            isAcceptingOrders: true
        });
        const leon = partnerRepo.create({
            name: 'Leon Grill',
            category: 'FOOD',
            email: 'leon@test.com',
            image: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?q=80&w=600&auto=format&fit=crop',
            rating: 4.3,
            deliveryTime: '40 min',
            tags: ['Fast Food', 'Snacks'],
            isAcceptingOrders: true
        });
        // PHARMACY VENDORS
        const apollo = partnerRepo.create({
            name: 'Apollo Pharmacy',
            category: 'PHARMACY',
            email: 'apollo@test.com',
            image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=600&auto=format&fit=crop',
            rating: 4.7,
            deliveryTime: '15 min',
            tags: ['Medicines', 'Health'],
            isAcceptingOrders: true
        });
        const mg1 = partnerRepo.create({
            name: '1mg Labs & Pharmacy',
            category: 'PHARMACY',
            email: '1mg@test.com',
            image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=600&auto=format&fit=crop',
            rating: 4.5,
            deliveryTime: '30 min',
            tags: ['Lab Tests', 'Devices'],
            isAcceptingOrders: true
        });
        await partnerRepo.save([truffles, meghana, leon, apollo, mg1]);
        console.log('Vendors created.');
        // ADD PRODUCTS
        const products = [
            productRepo.create({ name: 'All American Cheese Burger', price: 8.99, image: '🍔', category: 'Burger', description: 'Juicy beef patty', vendor: truffles }),
            productRepo.create({ name: 'Peri Peri Fries', price: 4.50, image: '🍟', category: 'Snacks', description: 'Spicy fries', vendor: truffles }),
            productRepo.create({ name: 'Chicken Dum Biryani', price: 12.50, image: '🥘', category: 'Biryani', description: 'Authentic Hyderabadi', vendor: meghana }),
            productRepo.create({ name: 'Mutton Royal', price: 15.00, image: '🥩', category: 'Biryani', description: 'Special cut', vendor: meghana }),
            productRepo.create({ name: 'Leon Jumbo Bucket', price: 18.99, image: '🍗', category: 'Fast Food', description: '12 pcs chicken', vendor: leon }),
            productRepo.create({ name: 'Paracetamol 500mg', price: 2.00, image: '💊', category: 'Medicines', description: 'Pain relief', vendor: apollo }),
            productRepo.create({ name: 'Himalaya Ashwagandha', price: 6.50, image: '🌿', category: 'Ayurveda', description: 'Immunity booster', vendor: apollo }),
            productRepo.create({ name: 'Complete Blood Count (CBC)', price: 19.99, image: '🧪', category: 'Lab Tests', description: 'Home collection', vendor: mg1 }),
            productRepo.create({ name: 'Digital Thermometer', price: 14.00, image: '🌡️', category: 'Devices', description: 'Quick read', vendor: mg1 }),
        ];
        await productRepo.save(products);
        console.log('Products created.');
        process.exit(0);
    }
    catch (e) {
        console.error(e);
        process.exit(1);
    }
};
seedVendors();
//# sourceMappingURL=seedVendors.js.map