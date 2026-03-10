import * as dotenv from 'dotenv';
import { AppDataSource } from './data-source';
import { User } from './models/User';

dotenv.config();

const ADMIN_PHONE  = '9999999999';
const ADMIN_NAME   = 'Super Admin';

async function seedAdmin() {
  try {
    await AppDataSource.initialize();
    const userRepository = AppDataSource.getRepository(User);

    const existing = await userRepository.findOne({ where: { phone: ADMIN_PHONE } });

    if (existing) {
      if (existing.role === 'admin') {
        console.log(`✅ Admin already exists: ${existing.name} (${existing.phone})`);
      } else {
        existing.role  = 'admin';
        existing.name  = ADMIN_NAME;
        existing.status = 'online';
        await userRepository.save(existing);
        console.log(`✅ Existing user upgraded to admin: ${ADMIN_PHONE}`);
      }
    } else {
      const admin = userRepository.create({
        phone:   ADMIN_PHONE,
        name:    ADMIN_NAME,
        role:    'admin',
        avatar:  `https://api.dicebear.com/7.x/avataaars/svg?seed=admin`,
        status:  'online',
        isOnline: false,
      });
      await userRepository.save(admin);
      console.log(`✅ Admin created successfully!`);
      console.log(`   Phone : ${ADMIN_PHONE}`);
      console.log(`   Name  : ${ADMIN_NAME}`);
    }

    console.log('\n🔐 Admin can now login at: http://localhost:5173/login');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
}

seedAdmin();
