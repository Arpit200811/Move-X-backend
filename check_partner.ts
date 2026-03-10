import { AppDataSource } from './data-source';
import { User } from './models/User';
import { Partner } from './models/Partner';

async function checkPartnerUser() {
    await AppDataSource.initialize();
    const userRepository = AppDataSource.getRepository(User);
    const partnerRepository = AppDataSource.getRepository(Partner);
    const user = await userRepository.findOne({ where: { phone: '6387200811' } });
    
    if (user) {
        console.log('--- Partner User Details ---');
        console.log(JSON.stringify(user, null, 2));
        
        const partner = await partnerRepository.findOne({ 
            where: { owner: { _id: user._id } },
            relations: ['owner']
        });
        
        if (partner) {
            console.log('--- Linked Partner ---');
            console.log(JSON.stringify(partner, null, 2));
        } else {
            console.log('!!! NO PARTNER RECORD FOUND FOR THIS USER !!!');
        }
    } else {
        console.log('User not found.');
    }
    
    await AppDataSource.destroy();
}

checkPartnerUser().catch(console.error);
