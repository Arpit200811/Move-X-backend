import { AppDataSource } from './data-source';
import { User } from './models/User';
import { Partner } from './models/Partner';
import { Product } from './models/Product';
import bcrypt from 'bcryptjs';

async function seed() {
    try {
        await AppDataSource.initialize();
        const userRepo = AppDataSource.getRepository(User);
        const partnerRepo = AppDataSource.getRepository(Partner);
        const productRepo = AppDataSource.getRepository(Product);

        const adminPass = await bcrypt.hash('admin123', 10);
        const admin: any = new User();
        admin.name = 'System Admin';
        admin.phone = '1234567890';
        admin.role = 'admin';
        admin.passwordHash = adminPass;
        admin.phoneVerified = true;
        await userRepo.save(admin);

        const partnerPass = await bcrypt.hash('partner123', 10);
        const partnerUser: any = new User();
        partnerUser.name = 'Demo Partner';
        partnerUser.phone = '9876543210';
        partnerUser.role = 'partner';
        partnerUser.passwordHash = partnerPass;
        partnerUser.phoneVerified = true;
        await userRepo.save(partnerUser);

        const partner: any = new Partner();
        partner.name = 'Premium Dining Hub';
        partner.email = 'partner@movex.com';
        partner.category = 'Restaurant';
        partner.status = 'Active';
        partner.owner = partnerUser;
        partner.address = 'Cyber Hub, Sector 24, Gurugram';
        partner.rating = 4.8;
        partner.image = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800';
        await partnerRepo.save(partner);

        const products = [
            { name: 'Truffle Pasta', price: 12.99, category: 'Main', description: 'Handcrafted pasta with Italian black truffles.' },
            { name: 'Artisanal Pizza', price: 15.50, category: 'Main', description: 'Wood-fired oven pizza with fresh mozzarella.' }
        ];

        for (const p of products) {
            const product: any = new Product();
            product.name = p.name;
            product.price = p.price;
            product.category = p.category;
            product.description = p.description;
            product.vendor = partner;
            product.isAvailable = true;
            await productRepo.save(product);
        }

        console.log('Seed Success');
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}
seed();
