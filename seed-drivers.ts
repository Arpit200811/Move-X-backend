
import { AppDataSource } from './data-source';
import { User } from './models/User';

async function seedDrivers() {
  try {
    await AppDataSource.initialize();
    const userRepository = AppDataSource.getRepository(User);

    const drivers = [
      { phone: '1234567890', name: 'James Logan', role: 'driver', vehicle: 'Toyota Prius (Gold)', licenseNumber: 'LP-992-X', kycLicenseUrl: 'https://placehold.co/600x400/png' },
      { phone: '0987654321', name: 'Sarah Connor', role: 'driver', vehicle: 'Ford Transit', licenseNumber: 'TX-111-B', kycLicenseUrl: 'https://placehold.co/600x400/png' }
    ];

    for (const d of drivers) {
      const existing = await userRepository.findOne({ where: { phone: d.phone } });
      if (!existing) {
        const u = userRepository.create({
            ...d,
            status: 'offline', // Pending/offline
            isOnline: false,
            rating: 4.8,
            walletBalance: 150.00
        });
        await userRepository.save(u);
        console.log(`✅ Mock Driver Created: ${d.name}`);
      }
    }

    process.exit(0);
  } catch (err: any) {
    console.error('Seed error:', err.message);
    process.exit(1);
  }
}

seedDrivers();
