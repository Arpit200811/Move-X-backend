import { AppDataSource } from './data-source';
import { User } from './models/User';

async function checkUsers() {
    try {
        await AppDataSource.initialize();
        const userRepo = AppDataSource.getRepository(User);
        const users = await userRepo.find();
        console.log('Total Users:', users.length);
        users.forEach(u => {
            console.log(`- ID: ${u._id}, Name: ${u.name}, Role: ${u.role}, Phone: ${u.phone}`);
        });
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}
checkUsers();
