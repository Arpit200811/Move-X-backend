import { AppDataSource } from './data-source';
import { Partner } from './models/Partner';
import { Product } from './models/Product';

async function seedProducts() {
    try {
        await AppDataSource.initialize();
        console.log('Data Source initialized');

        const partnerRepo = AppDataSource.getRepository(Partner);
        const productRepo = AppDataSource.getRepository(Product);

        const partners = await partnerRepo.find({ where: { status: 'Active' } });
        console.log(`Found ${partners.length} active partners.`);

        for (const partner of partners) {
            const existingProducts = await productRepo.count({ where: { vendor: { _id: partner._id } } });
            if (existingProducts === 0) {
                console.log(`Seeding products for partner: ${partner.name}`);
                
                const dummyProducts = [
                    { name: 'Signature Item', price: 299, category: 'Main', description: 'Our chef special premium item.' },
                    { name: 'Combo Deluxe', price: 499, category: 'Main', description: 'Full meal experience with sides.' },
                    { name: 'Cold Beverage', price: 99, category: 'Beverages', description: 'Ice cold refreshing drink.' }
                ];

                for (const p of dummyProducts) {
                    const product = productRepo.create({
                        ...p,
                        vendor: partner,
                        isAvailable: true
                    });
                    await productRepo.save(product);
                }
            }
        }

        console.log('Seeding completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding products:', error);
        process.exit(1);
    }
}

seedProducts();
