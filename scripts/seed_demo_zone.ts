import { AppDataSource } from '../data-source';
import { Zone } from '../models/Zone';

async function seed() {
    try {
        await AppDataSource.initialize();
        console.log('Database Connected ✅');

        const repo = AppDataSource.getRepository(Zone);
        
        // Check if zones already exist
        const count = await repo.count();
        if (count > 0) {
            console.log(`Found ${count} zones. Skipping seed.`);
            process.exit(0);
        }

        console.log('Seeding Demo Zone (NCR Region)...');

        const demoZone = repo.create({
            name: 'NCR Core Sector',
            description: 'Major service area covering Delhi and Gurgaon',
            isActive: true,
            boundary: {
                type: 'Polygon',
                coordinates: [[
                    [76.8, 28.3],
                    [77.5, 28.3],
                    [77.5, 28.9],
                    [76.8, 28.9],
                    [76.8, 28.3]
                ]]
            },
            baseMultiplier: 1.0
        });

        await repo.save(demoZone);
        console.log('Demo Zone seeded successfully! 🚀');
        process.exit(0);
    } catch (error) {
        console.error('Seed failure:', error);
        process.exit(1);
    }
}

seed();
