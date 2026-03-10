import { AppDataSource } from './data-source';
import { User } from './models/User';
import { Partner } from './models/Partner';

async function provisionPartner() {
    await AppDataSource.initialize();
    const userRepository = AppDataSource.getRepository(User);
    const partnerRepository = AppDataSource.getRepository(Partner);
    
    const user = await userRepository.findOne({ where: { phone: '6386373577' } });
    
    if (user) {
        if (user.role !== 'partner') {
            user.role = 'partner';
            await userRepository.save(user);
            console.log(`User role updated to partner for ${user.phone}`);
        }
        
        const existingPartner = await partnerRepository.findOne({ where: { owner: { _id: user._id } } });
        
        if (!existingPartner) {
            const partner = partnerRepository.create({
                name: "The Royal Kitchen (Partner)",
                category: "Restaurant",
                email: user.phone + "@movex.com",
                status: "Active",
                isAcceptingOrders: true,
                autoAccept: false,
                owner: user
            });
            await partnerRepository.save(partner);
            console.log('✅ Partner record created successfully!');
            console.log(JSON.stringify(partner, null, 2));
        } else {
            console.log('Partner record already exists.');
            console.log(JSON.stringify(existingPartner, null, 2));
        }
    } else {
        console.log('User 6386373577 not found.');
    }
    
    await AppDataSource.destroy();
}

provisionPartner().catch(console.error);
