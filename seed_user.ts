import { AppDataSource } from './data-source';
import { User } from './models/User';
import { Partner } from './models/Partner';
import bcrypt from 'bcryptjs';

async function seedPartner() {
    try {
        await AppDataSource.initialize();
        console.log('Database connected.');

        const userRepo = AppDataSource.getRepository(User);
        const partnerRepo = AppDataSource.getRepository(Partner);

        const phone = '6387200811';
        const name = 'Admin Partner';
        const password = 'partner123';

        // 1. Check existing
        let user = await userRepo.findOne({ where: { phone } });
        if (user) {
            console.log('User already exists, updating to partner role.');
            user.role = 'partner';
            user.status = 'active';
        } else {
            console.log('Creating new partner user...');
            user = userRepo.create({
                phone,
                name,
                role: 'partner',
                passwordHash: await bcrypt.hash(password, 10),
                status: 'active',
                isOnline: true,
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`
            });
        }
        await userRepo.save(user);

        // 2. Clear existing partner profiles for this user to avoid duplication
        const existingPartner = await partnerRepo.findOne({ where: { owner: { _id: user._id } } });
        if (existingPartner) {
            console.log('Partner profile already exists. Updating...');
            existingPartner.status = 'Active';
            await partnerRepo.save(existingPartner);
        } else {
            console.log('Creating partner profile...');
            const partner = partnerRepo.create({
                name: 'MoveX HQ Store',
                category: 'Restaurant',
                email: 'partner@movex.com',
                status: 'Active',
                owner: user,
                revenue: 0,
                orders: 0,
                autoAccept: true,
                isAcceptingOrders: true,
                image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4'
            });
            await partnerRepo.save(partner);
        }

        // 3. Create Admin User
        const adminPhone = '9999999999';
        let admin = await userRepo.findOne({ where: { phone: adminPhone } });
        if (!admin) {
            console.log('Creating admin user...');
            admin = userRepo.create({
                phone: adminPhone,
                name: 'System Admin',
                role: 'admin',
                passwordHash: await bcrypt.hash('demo123', 10),
                status: 'active',
                isOnline: true,
                avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin'
            });
            await userRepo.save(admin);
        }

        console.log('--- SEED SUCCESSFUL ---');
        console.log(`Partner Phone: ${phone}, Pass: ${password}`);
        console.log(`Admin Phone: ${adminPhone}, Pass: demo123`);
        
        await AppDataSource.destroy();
        process.exit(0);
    } catch (e) {
        console.error('Seed failed:', e);
        process.exit(1);
    }
}

seedPartner();
