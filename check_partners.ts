import { AppDataSource } from './data-source';
import { Partner } from './models/Partner';

async function checkPartners() {
    try {
        await AppDataSource.initialize();
        const partnerRepo = AppDataSource.getRepository(Partner);
        const partners = await partnerRepo.find();
        console.log('Total Partners:', partners.length);
        partners.forEach(p => {
            console.log(`- ID: ${p._id}, Name: ${p.name}, Status: ${p.status}, Owner: ${p.owner ? 'Yes' : 'No'}`);
        });
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}
checkPartners();
