import { AppDataSource } from './data-source';
import { User } from './models/User';
import { Partner } from './models/Partner';
import { Product } from './models/Product';

async function checkSystem() {
    await AppDataSource.initialize();
    
    const userRepository = AppDataSource.getRepository(User);
    const partnerRepository = AppDataSource.getRepository(Partner);
    const productRepository = AppDataSource.getRepository(Product);

    const users = await userRepository.find();
    console.log('--- Users Count: ' + users.length);
    users.forEach(u => console.log(`U: ${u.phone} [${u.role}] ID: ${u._id}`));

    const partners = await partnerRepository.find({ relations: ['owner'] });
    console.log('\n--- Partners Count: ' + partners.length);
    partners.forEach(p => console.log(`PV: ${p.name} [Status: ${p.status}] Owner: ${p.owner?.phone || 'NONE'}`));

    const products = await productRepository.find({ relations: ['vendor'] });
    console.log('\n--- Products Count: ' + products.length);
    products.forEach(pr => console.log(`PR: ${pr.name} [$${pr.price}] Vendor: ${pr.vendor?.name || 'NONE'}`));

    await AppDataSource.destroy();
}

checkSystem().catch(console.error);
