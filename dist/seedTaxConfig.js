"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const data_source_1 = require("./data-source");
const TaxConfig_1 = require("./models/TaxConfig");
async function seed() {
    await data_source_1.AppDataSource.initialize();
    const repo = data_source_1.AppDataSource.getRepository(TaxConfig_1.TaxConfig);
    // Check if already seeded
    const existing = await repo.find();
    if (existing.length > 0) {
        console.log(`✅ TaxConfig already has ${existing.length} entries. Skipping.`);
        process.exit(0);
    }
    const configs = [
        {
            countryCode: 'IN',
            countryName: 'India',
            currency: 'INR',
            currencySymbol: '₹',
            baseFare: 30,
            perKmRate: 12,
            perMinuteRate: 2,
            taxRate: 5, // 5% GST on delivery
            taxName: 'GST',
            exchangeRateToUSD: 0.012,
            isActive: true,
            serviceClassSurcharge: { Economy: 0, Comfort: 30, Business: 100 }
        },
        {
            countryCode: 'US',
            countryName: 'United States',
            currency: 'USD',
            currencySymbol: '$',
            baseFare: 3.5,
            perKmRate: 1.8,
            perMinuteRate: 0.25,
            taxRate: 8.5,
            taxName: 'Sales Tax',
            exchangeRateToUSD: 1.0,
            isActive: false,
            serviceClassSurcharge: { Economy: 0, Comfort: 5, Business: 15 }
        },
        {
            countryCode: 'AE',
            countryName: 'United Arab Emirates',
            currency: 'AED',
            currencySymbol: 'د.إ',
            baseFare: 10,
            perKmRate: 3,
            perMinuteRate: 0.5,
            taxRate: 5,
            taxName: 'VAT',
            exchangeRateToUSD: 0.27,
            isActive: false,
            serviceClassSurcharge: { Economy: 0, Comfort: 10, Business: 25 }
        }
    ];
    for (const cfg of configs) {
        const entity = repo.create(cfg);
        await repo.save(entity);
        console.log(`✅ Seeded: ${cfg.countryCode} (${cfg.currency})`);
    }
    console.log('\n✅ TaxConfig seeded successfully!');
    process.exit(0);
}
seed().catch(err => {
    console.error('❌ TaxConfig Seeding Failed:', err.message);
    process.exit(1);
});
//# sourceMappingURL=seedTaxConfig.js.map