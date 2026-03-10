import { AppDataSource } from './data-source';
import { Partner } from './models/Partner';

async function activatePartners() {
    await AppDataSource.initialize();
    const partnerRepo = AppDataSource.getRepository(Partner);
    const partners = await partnerRepo.find();
    
    for (const p of partners) {
        p.status = 'Active';
        await partnerRepo.save(p);
    }
    
    console.log(`Updated ${partners.length} partners to Active.`);
    await AppDataSource.destroy();
}

activatePartners().catch(console.error);
