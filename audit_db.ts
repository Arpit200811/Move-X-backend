import { AppDataSource } from './data-source';
import { User } from './models/User';
import { Partner } from './models/Partner';
import { Product } from './models/Product';

async function audit() {
    try {
        await AppDataSource.initialize();
        const userRepo = AppDataSource.getRepository(User);
        const partnerRepo = AppDataSource.getRepository(Partner);
        const productRepo = AppDataSource.getRepository(Product);

        const usersCount = await userRepo.count();
        const partnersCount = await partnerRepo.count();
        const productsCount = await productRepo.count();

        console.log('--- DATABASE AUDIT ---');
        console.log('Total Users:', usersCount);
        console.log('Total Partners:', partnersCount);
        console.log('Total Products:', productsCount);

        const partners = await partnerRepo.find({ relations: ['owner'] });
        partners.forEach(p => {
            console.log(`Partner: ${p.name}, Type: ${p.category}, Status: ${p.status}, Owner: ${p.owner?.name || 'N/A'}`);
        });

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}
audit();
