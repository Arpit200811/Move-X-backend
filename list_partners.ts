import { AppDataSource } from './data-source';
import { Partner } from './models/Partner';
import { User } from './models/User';

async function listAllPartners() {
    await AppDataSource.initialize();
    const partnerRepository = AppDataSource.getRepository(Partner);
    const userRepository = AppDataSource.getRepository(User);
    
    const partners = await partnerRepository.find({ relations: ['owner'] });
    console.log('--- Current Partners in System ---');
    console.log(JSON.stringify(partners, null, 2));
    
    const partnerUsers = await userRepository.find({ where: { role: 'partner' } });
    console.log('--- Users with Partner Role ---');
    console.log(JSON.stringify(partnerUsers.map(u => ({ id: u._id, phone: u.phone })), null, 2));

    await AppDataSource.destroy();
}

listAllPartners().catch(console.error);
