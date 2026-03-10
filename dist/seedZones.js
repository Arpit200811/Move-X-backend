"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const data_source_1 = require("./data-source");
const Zone_1 = require("./models/Zone");
async function seed() {
    await data_source_1.AppDataSource.initialize();
    const zoneRepo = data_source_1.AppDataSource.getRepository(Zone_1.Zone);
    // Create a Global Catch-all Zone
    const globalZone = zoneRepo.create({
        name: 'Master Service Area',
        isActive: true,
        baseMultipler: 1.0,
        description: 'Primary operational footprint covering major sectors.',
        boundary: {
            type: 'Polygon',
            coordinates: [[
                    [60.0, 0.0],
                    [100.0, 0.0],
                    [100.0, 40.0],
                    [60.0, 40.0],
                    [60.0, 0.0]
                ]]
        }
    });
    await zoneRepo.save(globalZone);
    console.log('✅ Master Service Zone Initialized.');
    process.exit(0);
}
seed().catch(err => {
    console.error('❌ Seeding Failed:', err);
    process.exit(1);
});
//# sourceMappingURL=seedZones.js.map